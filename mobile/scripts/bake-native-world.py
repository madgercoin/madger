"""Bake existing, credited CC0 glTF scans into a bounded native instancing pack.
Offline authoring only: Python 3, NumPy, Pillow. The app needs no glTF loader.
UVs and alpha masks stay attached to true 3D geometry; never billboard trees.
"""
import io, json, math, pathlib, struct, hashlib
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=ROOT/'public/blackroot/assets'; OUT=ROOT/'assets/expedition-world'; OUT.mkdir(exist_ok=True)
TILE=512; PAD=4; atlas=Image.new('RGBA',(2048,2048)); slots=[]; meshes=[]; sources={}
def tile(image,label):
    i=len(slots); assert i<16
    im=image.convert('RGBA').resize((TILE-2*PAD,TILE-2*PAD),Image.Resampling.LANCZOS)
    x=(i%4)*TILE; y=(i//4)*TILE
    atlas.paste(im,(x+PAD,y+PAD))
    # Extrude the borders to stop neighboring atlas tiles bleeding at a distance.
    atlas.paste(im.crop((0,0,1,im.height)).resize((PAD,im.height)),(x,y+PAD))
    atlas.paste(im.crop((im.width-1,0,im.width,im.height)).resize((PAD,im.height)),(x+TILE-PAD,y+PAD))
    atlas.paste(im.crop((0,0,im.width,1)).resize((TILE-2*PAD,PAD)),(x+PAD,y))
    atlas.paste(im.crop((0,im.height-1,im.width,im.height)).resize((TILE-2*PAD,PAD)),(x+PAD,y+TILE-PAD))
    slots.append(label);return i
for folder in ['forest_ground_04','bark_brown_02','aerial_grass_rock']:
    p=SRC/folder/(folder+'_diff_1k.jpg');Image.open(p).convert('RGB').resize((512,512),Image.Resampling.LANCZOS).save(OUT/(folder+'.jpg'),quality=90);tile(Image.open(p),folder);sources[str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
def load(id):
    p=next((SRC/id).glob('*.gl*')); b=p.read_bytes(); sources[str(p.relative_to(ROOT))]=hashlib.sha256(b).hexdigest()
    if p.suffix=='.glb':
        size=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+size]);off=20+size;buffers=[b[off+8:off+8+struct.unpack_from('<I',b,off)[0]]]
    else:
        g=json.loads(b);buffers=[(p.parent/z['uri']).read_bytes() for z in g['buffers']]
    def accessor(i):
        a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
        return np.ndarray((a['count'],size),dtype=dtype,buffer=buffers[v.get('buffer',0)],offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dtype).itemsize*size),np.dtype(dtype).itemsize)).copy()
    def image(i):
        z=g['images'][i]
        if 'uri' in z:return Image.open(p.parent/z['uri'])
        v=g['bufferViews'][z['bufferView']];return Image.open(io.BytesIO(buffers[v.get('buffer',0)][v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]))
    return g,accessor,image

def add(id,names,node=0,cell=0,leaf_stride=1,normalize='height'):
    g,a,img=load(id);n=g['nodes'][node];m=g['meshes'][n['mesh']]
    # These pinned assets use their baked mesh geometry (no skeletal transforms).
    # Normalize each selected model at its own ground contact and centre.
    parts=[]
    for p in m['primitives']:
        pos=a(p['attributes']['POSITION']).astype(float);normal=a(p['attributes']['NORMAL']).astype(float);uv=a(p['attributes']['TEXCOORD_0']).astype(float)
        if 'matrix' in n: mat=np.array(n['matrix']).reshape(4,4).T
        else:
            x,y,z,w=n.get('rotation',[0,0,0,1]); mat=np.eye(4);mat[:3,:3]=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])@np.diag(n.get('scale',[1,1,1]));mat[:3,3]=n.get('translation',[0,0,0])
        pos=pos@mat[:3,:3].T+mat[:3,3];normal=normal@np.linalg.inv(mat[:3,:3]);normal/=np.maximum(1e-8,np.linalg.norm(normal,axis=1))[:,None]
        parts.append((p,pos,normal,uv,a(p['indices']).reshape(-1,3)))
    allpos=np.concatenate([p[1] for p in parts]);lo=allpos.min(0);hi=allpos.max(0);scale=(hi-lo).max() if normalize=='longest' else (hi-lo)[1];centre=(hi+lo)/2;centre[1]=lo[1]
    for part,(p,pos,normal,uv,idx) in enumerate(parts):
        if part>=len(names) or not names[part]:continue
        pos=(pos-centre)/scale
        material=g['materials'][p['material']];tex=material['pbrMetallicRoughness']['baseColorTexture'];transform=tex.get('extensions',{}).get('KHR_texture_transform',{})
        uv=uv*np.array(transform.get('scale',[1,1]))+np.array(transform.get('offset',[0,0]))
        texture=tile(img(g['textures'][tex['index']]['source']),id+':'+str(part))
        if cell:
            # Cluster only connected surface samples with comparable UVs;
            # preserve seams instead of averaging unrelated atlas islands.
            keys=np.column_stack([np.round(pos/cell),np.floor(uv*24)])
            _,first,remap=np.unique(keys,axis=0,return_index=True,return_inverse=True)
            pos=pos[first];normal=normal[first];uv=uv[first];idx=remap[idx]
            idx=idx[(idx[:,0]!=idx[:,1])&(idx[:,1]!=idx[:,2])&(idx[:,0]!=idx[:,2])]
        if leaf_stride>1 and part>0:
            # Keep whole connected leaves rather than clipping triangles out of
            # the crown. Enlarge retained leaves to preserve canopy coverage
            # with bounded mobile geometry. All leaves retain 3D orientation.
            if part==1:
                _,inv=np.unique(pos.round(5),axis=0,return_inverse=True)
                tri=inv[idx]; edges=np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[0,2]]])
                _,labels=connected_components(coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(int(inv.max())+1,)*2),directed=False)
                groups=labels[tri[:,0]]; chosen=np.unique(groups)[::leaf_stride]
                kept=[]
                for group in chosen:
                    faces=idx[groups==group]; verts=np.unique(faces); centre=pos[verts].mean(0)
                    pos[verts]=centre+(pos[verts]-centre)*4.8;kept.append(faces)
                idx=np.concatenate(kept)
            else:
                # Twigs are thin tubular pieces; retain the full structure at
                # a spatially clustered LOD rather than disjoint triangles.
                keys=np.round(pos/.045)
                _,first,remap=np.unique(keys,axis=0,return_index=True,return_inverse=True)
                pos=pos[first];normal=normal[first];uv=uv[first];idx=remap[idx]
                idx=idx[(idx[:,0]!=idx[:,1])&(idx[:,1]!=idx[:,2])&(idx[:,0]!=idx[:,2])]

        used,remap=np.unique(idx,return_inverse=True);idx=remap.reshape(-1)
        vertices=np.column_stack([pos[used],normal[used],uv[used]]).round(5).reshape(-1).tolist()
        assert len(used)<65535
        meshes.append(dict(name=names[part],tile=texture,wind=1 if 'Crown' in names[part] or 'Twigs' in names[part] else 0,vertices=vertices,indices=idx.tolist()))
        print(names[part],len(used),'vertices',len(idx)//3,'triangles')
add('island_tree_02',['scanTreeTrunk','scanTreeCrown','scanTreeTwigs'],leaf_stride=14)
add('rock_moss_set_01',['scanRock'],node=2,cell=.055,normalize='longest')
add('fern_02',['scanFern'],node=2)
add('dead_tree_trunk',['scanLog'],cell=.055,normalize='longest')
add('root_cluster_01',['scanRoots'],cell=.055,normalize='longest')
add('rock_face_02',['scanCliff'],cell=.065,normalize='longest')
atlas.quantize(colors=256,method=Image.Quantize.FASTOCTREE).save(OUT/'forest-atlas.png',optimize=True)
(OUT/'meshes.json').write_text(json.dumps({'version':1,'meshes':meshes},separators=(',',':'))+'\n')
(OUT/'PROVENANCE.json').write_text(json.dumps({'license':'CC0-1.0','source':'Existing project assets, mobile/public/blackroot/ASSET_PROVENANCE.json','authoring':'scripts/bake-native-world.py','atlasTiles':slots,'sourceSha256':sources,'triangles':{m['name']:len(m['indices'])//3 for m in meshes}},indent=2)+'\n')
