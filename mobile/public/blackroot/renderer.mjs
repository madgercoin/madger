/* Overgrown Burrow: physically lit presentation of the existing deterministic game.
 * All scanned assets and the pinned Three renderer are served from this deployment.
 */
import * as T from './vendor/build/three.module.js';
import { GLTFLoader } from './vendor/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from './vendor/examples/jsm/loaders/RGBELoader.js';
import { legacyCharacters } from './characters.mjs?v=chambers-20261019-2';
import { mergeGeometries } from './vendor/examples/jsm/utils/BufferGeometryUtils.js';
import { adjustedSceneScale } from './quality.mjs';
import { terrainBiome, terrainProfile, terrainSurfaceHeight, sceneryProfile } from './terrain.mjs';
import { MadgerHero } from './madger-hero.mjs';
import { CavernVault } from './cavern-vault.mjs';

const ASSETS = '/blackroot/assets/';
async function loadForestPack(){
 let response;
 for(let attempt=0;attempt<3;attempt++){
  response=await fetch('/blackroot/forest.pack?v=madger-hero-cavern-20261020-1');
  if(response.ok)break;
  if(![429,502,503,504].includes(response.status)||attempt===2)throw Error('Forest asset download: '+response.status);
  await new Promise(resolve=>setTimeout(resolve,Math.min(5000,Number(response.headers.get('Retry-After'))*1000||1000*(attempt+1))));
 }
 const buffer=await response.arrayBuffer(),header=new DataView(buffer).getUint32(0,true);
 if(header>1000000||header+4>buffer.byteLength)throw Error('Forest asset index is invalid');
 const entries=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,header))),urls=new Map();
 const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gltf:'model/gltf+json',glb:'model/gltf-binary',bin:'application/octet-stream',hdr:'application/octet-stream'};
 for(const entry of entries){
  if(typeof entry.path!=='string'||entry.path.includes('..')||entry.offset<0||entry.length<0||4+header+entry.offset+entry.length>buffer.byteLength)throw Error('Forest asset entry is invalid');
  const blob=new Blob([new Uint8Array(buffer,4+header+entry.offset,entry.length)],{type:types[entry.path.split('.').pop()]||'application/octet-stream'});
  urls.set(ASSETS+entry.path,URL.createObjectURL(blob));
 }
 return urls;
}
const hash = n => { const x = Math.sin(n * 127.13 + 91.7) * 43758.5453; return x - Math.floor(x); };
const curve = d => Math.sin(d / 76) * .8 + Math.sin(d / 185) * 1.1;
const smooth = v => { const x = Math.max(0, Math.min(1, v)); return x*x*(3-2*x); };
function road(s, d) {
  if(s.route==='main') return 0;
  return (s.routeSide || 0)*8.5*smooth((d-s.routeStart)/24)*smooth((s.routeEnd-d)/24);
}
function matrix(x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0) {
  const a=Math.cos(rx),b=Math.sin(rx),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rz),f=Math.sin(rz);
  return new T.Matrix4().fromArray([(c*e+d*b*f)*sx,a*f*sx,(-d*e+c*b*f)*sx,0,(-c*f+d*b*e)*sy,a*e*sy,(d*f+c*b*e)*sy,0,d*a*sz,-b*sz,c*a*sz,0,x,y,z,1]);
}
/** Cluster dense scans at centimetre-scale in their normalized local space.
 * Retain authored UVs and normal maps; avoid drawing 100k triangles per stump.
 */
function clusterScan(source,cell) {
  const positions=source.attributes.position,normals=source.attributes.normal,uvs=source.attributes.uv;
  const cells=new Map(),remap=[],p=[],n=[],uv=[];
  for(let i=0;i<positions.count;i++){
    const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v/cell)).join(',');
    if(!cells.has(key)){cells.set(key,p.length/3);p.push(positions.getX(i),positions.getY(i),positions.getZ(i));n.push(normals.getX(i),normals.getY(i),normals.getZ(i));uv.push(uvs?.getX(i)||0,uvs?.getY(i)||0);}
    remap[i]=cells.get(key);
  }
  const indices=[],index=source.index,count=index?index.count:positions.count;
  for(let i=0;i<count;i+=3){const a=remap[index?index.getX(i):i],b=remap[index?index.getX(i+1):i+1],c=remap[index?index.getX(i+2):i+2];if(a!==b&&a!==c&&b!==c)indices.push(a,b,c);}
  const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(p,3));result.setAttribute('normal',new T.Float32BufferAttribute(n,3));result.setAttribute('uv',new T.Float32BufferAttribute(uv,2));result.setIndex(indices);source.dispose();return result;
}
let bridge;
class ForestRenderer {
  constructor(gl) {
    this.gl=gl; this.scene=new T.Scene(); this.scene.background=new T.Color('#7b9387');
    this.scene.fog=new T.FogExp2('#7b9387',.017);
    this.camera=new T.PerspectiveCamera(60,1,.1,145);
    this.gpu=new T.WebGLRenderer({canvas:gl.canvas,context:gl,antialias:false,alpha:false});
    this.gpu.setPixelRatio(1); this.gpu.toneMapping=T.ACESFilmicToneMapping;
    this.gpu.toneMappingExposure=1.22; this.gpu.outputColorSpace=T.SRGBColorSpace;
    this.gpu.shadowMap.enabled=true; this.gpu.shadowMap.type=T.PCFShadowMap;
    this.hemi=new T.HemisphereLight('#c8e2e5','#343d22',2);this.scene.add(this.hemi);
    this.sun=new T.DirectionalLight('#ffe1a3',3.2);
    this.sun.position.set(-12,19,8); this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(768,768);
    Object.assign(this.sun.shadow.camera,{left:-18,right:18,top:30,bottom:-22,near:1,far:85});
    this.sun.shadow.bias=-.0005;this.sun.shadow.normalBias=.035;
    this.scene.add(this.sun,this.sun.target);
    this.fill=new T.PointLight('#ffb257',13,15,2);this.fill.position.set(0,3,1);this.scene.add(this.fill);
    this.batches=new Map();this.geometries=new Map();this.materials=new Map();this.scanBatches=[];
    this.travel={value:0};this.temp=new T.Matrix4();this.tint=new T.Color();this.stats={};
    this.run=null;this.dead=false;this.textures=[];this.quality=1;this.frameSamples=[];this.stableFrames=0;this.renderedFrames=0;
  }
  async init() {
    const worldRequest=fetch('/blackroot/world-presets.json?v=grounded-scenery-20261020-1',{cache:'force-cache'}).then(async response=>{
      if(!response.ok)throw Error('World presets: HTTP '+response.status);
      const presets=await response.json();
      if(presets?.schemaVersion!==1||!presets.routes||!presets.terrainProfiles)throw Error('Invalid world presets');
      return presets;
    }).catch(error=>{console.warn('MADGER_WORLD_PRESETS_FALLBACK',String(error));return null;});
    this.assetUrls=await loadForestPack();
    this.worldPresets=await worldRequest;
    const manager=new T.LoadingManager();manager.setURLModifier(url=>this.assetUrls.get(new URL(url,location.href).pathname)||url);
    const loader=new T.TextureLoader(manager);
    const materialSet=async (folder,name,scale)=> {
      const files=['diff','nor_gl','rough'];
      const textures=await Promise.all(files.map(key=>loader.loadAsync(ASSETS+folder+'/'+name+'_'+key+'_1k.jpg')));
      textures.forEach((t,i)=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(4,this.gpu.capabilities.getMaxAnisotropy());if(i===0)t.colorSpace=T.SRGBColorSpace;this.textures.push(t);});
      return {map:textures[0],normalMap:textures[1],roughnessMap:textures[2],normalScale:new T.Vector2(scale,scale)};
    };
    [this.ground,this.stone,this.bark]=await Promise.all([
      materialSet('forest_ground_04','forest_ground_04',.7),
      materialSet('aerial_grass_rock','aerial_grass_rock',.8),
      materialSet('bark_brown_02','bark_brown_02',.65),
    ]);
    const hdr=await new RGBELoader(manager).loadAsync(ASSETS+'sunrise.hdr');
    const pmrem=new T.PMREMGenerator(this.gpu);this.environment=pmrem.fromEquirectangular(hdr);
    this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.32;hdr.dispose();pmrem.dispose();
    const gltf=new GLTFLoader(manager);
    const models=await Promise.all(['fern_02','rock_face_02','dead_tree_trunk','rock_moss_set_01','island_tree_02','root_cluster_01','grass_medium_02'].map(async id=>({id,model:(await gltf.loadAsync(['island_tree_02','root_cluster_01','grass_medium_02'].includes(id)?ASSETS+id+'/'+id+'_mobile.glb':ASSETS+id+'/'+id+'.gltf')).scene})));
    for(const {id,model} of models) {
      model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3());
      const longest=Math.max(size.x,size.y,size.z);
      // Logs and rock faces are far wider than tall; height-based normalization
      // produced a canyon-sized backdrop and obscured the playable forest.
      const unit=['dead_tree_trunk','rock_face_02','rock_moss_set_01','root_cluster_01'].includes(id)?longest:size.y;
      const normalizer=new T.Matrix4().makeScale(1/unit,1/unit,1/unit);
      normalizer.multiply(new T.Matrix4().makeTranslation(-centre.x,-bounds.min.y,-centre.z));
      let rockVariant=0;
      model.traverse(node=>{if(!node.isMesh)return;
        if(id==='rock_moss_set_01'&&rockVariant++>=2)return;
        let geometry=node.geometry.clone();geometry.applyMatrix4(node.matrixWorld);geometry.applyMatrix4(normalizer);
        if(!['fern_02','island_tree_02','root_cluster_01','grass_medium_02'].includes(id))geometry=clusterScan(geometry,id==='dead_tree_trunk'?.025:id==='rock_face_02'?.045:.04);
        const material=id==='fern_02'?new T.MeshLambertMaterial({map:node.material.map,color:'#a6b987',side:T.DoubleSide}):node.material.clone();
        const foliageCutout=['island_tree_02','grass_medium_02'].includes(id)&&material.transparent;
        if(foliageCutout){material.alphaTest=.16;material.transparent=false;material.depthWrite=true;material.alphaToCoverage=true;}
        material.envMapIntensity=.4;material.side=['fern_02','island_tree_02','grass_medium_02'].includes(id)?T.DoubleSide:T.FrontSide;
        const mesh=new T.InstancedMesh(geometry,material,['fern_02','grass_medium_02'].includes(id)?96:32);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
        mesh.castShadow=id==='island_tree_02'&&!foliageCutout;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.count=0;
        this.scene.add(mesh);this.scanBatches.push({id,mesh});
      });
    }
    // Project unchanged, approved MADGER facial pixels onto the 3D head.
    // The original mascot image is included in the same prepacked asset request.
    this.approvedFace=await loader.loadAsync(ASSETS+'madger-official-face.webp');
    this.approvedFace.colorSpace=T.SRGBColorSpace;this.textures.push(this.approvedFace);
    this.buildLandscape();
    // Compile materials before countdown: expensive shader setup must not pause a run.
    this.stats.assetsReady=true;
    return this;
  }
  buildLandscape() {
    const ground=new T.PlaneGeometry(100,205,56,96);ground.rotateX(-Math.PI/2);
    ground.setAttribute('color',new T.BufferAttribute(new Float32Array(ground.attributes.position.count*3),3));
    this.trailTint=new T.Color('#B3A68F');this.mossTint=new T.Color('#526747');this.soilTint=new T.Color();
    this.terrain=new T.Mesh(ground,new T.MeshStandardMaterial({...this.ground,vertexColors:true,color:'#E8DFCD',roughness:1}));
    this.terrain.receiveShadow=true;this.terrain.frustumCulled=false;this.scene.add(this.terrain);
    const tubes=[];
    const limb=(points,r)=>tubes.push(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),9,r,7,false));
    limb([[0,0,0],[.2,2,0],[-.1,5,.3],[.65,8,.1]],.32);
    for(let j=0;j<5;j++) {const a=j/5*Math.PI*2;
      limb([[Math.cos(a)*1.8,-.1,Math.sin(a)*1.8],[Math.cos(a)*.6,.3,Math.sin(a)*.6],[0,1.4,0]],.13);
      limb([[0,4.7,0],[Math.cos(a)*1.2,6.5,Math.sin(a)*1.2],[Math.cos(a)*3,7.7,Math.sin(a)*3]],.13);
    }
    this.treeGeometry=mergeGeometries(tubes);tubes.forEach(g=>g.dispose());
    this.trees=new T.InstancedMesh(this.treeGeometry,new T.MeshStandardMaterial({...this.bark,color:'#ada48c',roughness:.95}),28);
    this.trees.castShadow=true;this.trees.receiveShadow=true;this.trees.frustumCulled=false;this.scene.add(this.trees);
    const shaftMaterial=new T.MeshBasicMaterial({color:'#ffdda1',transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
    this.shafts=new T.InstancedMesh(new T.ConeGeometry(1,13,12,1,true),shaftMaterial,4);this.shafts.frustumCulled=false;this.scene.add(this.shafts);
    this.cavernVault=new CavernVault(this.scene,this.stone);
  }
  category(shape,c) {
    if(shape==='halo'||shape==='shadow')return shape;
    if(c[3]===-1)return 'ground';if(c[3]===-8)return 'stone';if(c[3]===-7)return 'bark';
    if(c[3]===-2)return 'water';if(c[3]===-5)return 'tail';if(c[3]===-4)return 'fur';
    if(c[3]>.1)return c[3]>.8?'glow':'luminous';
    // Existing tree and ruin pieces predate the authored material tags.
    if(c[3]===0&&c[0]>c[1]*1.5&&c[1]>c[2]*1.4&&c[0]<.4)return 'bark';
    return 'plain';
  }
  material(category) {
    if(this.materials.has(category))return this.materials.get(category);
    let m;
    if(category==='halo'||category==='shadow') {
      const n=32,data=new Uint8Array(n*n*4);
      for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,a=Math.max(0,1-((x+ .5)/n*2-1)**2-((y+.5)/n*2-1)**2);data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(a*a*110);}
      const map=new T.DataTexture(data,n,n);map.needsUpdate=true;this.textures.push(map);
      m=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,opacity:category==='halo'?.52:.7,blending:category==='halo'?T.AdditiveBlending:T.NormalBlending,side:T.DoubleSide});
    } else {
      const maps=this[category]||{};
      m=new T.MeshStandardMaterial({color:0xffffff,roughness:category==='water'?.15:category==='fur'||category==='tail'?.95:.82,metalness:category==='water'?.35:0,...maps});
      if(category==='glow'||category==='luminous'){m.emissive.set('#d6b47b');m.emissiveIntensity=category==='glow'?1.3:.35;}
      if(['ground','stone','bark'].includes(category)) {
        m.onBeforeCompile=shader=>{
          shader.uniforms.uTravel=this.travel;shader.vertexShader='uniform float uTravel;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
            vec4 materialPoint=vec4(position,1.0);
            #ifdef USE_INSTANCING
              materialPoint=instanceMatrix*materialPoint;
            #endif
            materialPoint=modelMatrix*materialPoint;
            materialPoint.z=uTravel-materialPoint.z;
            vec3 materialNormal=normal;
            #ifdef USE_INSTANCING
              materialNormal=mat3(instanceMatrix)*materialNormal;
            #endif
            materialNormal=abs(normalize(mat3(modelMatrix)*materialNormal));
            vec2 projectedUv=materialNormal.y>=max(materialNormal.x,materialNormal.z)?materialPoint.xz:(materialNormal.x>materialNormal.z?materialPoint.zy:materialPoint.xy);
            vec2 surfaceUv=${category==='bark'?'vec2(materialPoint.x+materialPoint.z,materialPoint.y)*.42':'projectedUv*.27'};
            vMapUv=surfaceUv;vNormalMapUv=surfaceUv;vRoughnessMapUv=surfaceUv;
          `);
        };
        m.customProgramCacheKey=()=>category;
      }
      if(category==='tail') {
        m.onBeforeCompile=shader=>{
          shader.vertexShader='varying vec3 vFurLocal;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFurLocal=position;');
          shader.fragmentShader='varying vec3 vFurLocal;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
            float t=clamp(vFurLocal.z/1.26,0.0,1.0);
            float centre=.14*sin(t*3.14159265)+.26*t*t;
            float dorsal=smoothstep(-.03,.10,vFurLocal.y-centre);
            float chevron=sin(vFurLocal.z*18.0+abs(vFurLocal.x)*7.5);
            diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.43,.16),smoothstep(.17,.35,chevron)*.91*dorsal);
          `);
        };
      }
    }
    this.materials.set(category,m);return m;
  }
  geometry(shape) {
    if(this.geometries.has(shape))return this.geometries.get(shape);
    const raw=bridge.geometry(shape),p=[],n=[],uv=[];
    for(let i=0;i<raw.length;i+=6){p.push(raw[i],raw[i+1],raw[i+2]);n.push(raw[i+3],raw[i+4],raw[i+5]);
      uv.push((shape==='halo'?raw[i]:raw[i])*.5+.5,(shape==='halo'?raw[i+1]:raw[i+2])*.5+.5);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeBoundingSphere();
    this.geometries.set(shape,g);return g;
  }
  reset(){for(const b of this.batches.values())b.count=0;this.stats.instances=0;}
  add(shape,values,c) {
    const category=this.category(shape,c),key=shape+':'+category;
    // The PBR terrain and scanned foliage now replace repeated straight
    // walkway tiles, flat fake leaves and faceted synthetic green shrubs.
    // Collision logic is renderer-independent and remains unchanged.
    if(this.run?.board==='overgrown'){
      if(shape==='box'&&c[3]===-1)return;
      if(shape==='leaf'&&c[3]===0)return;
      if(shape==='rock'&&c[3]===0&&c[1]>c[0]*1.27&&c[1]>c[2]*1.09)return;
      if(shape==='rock'&&c[3]===-8&&['main','rootway','mosswalk','root-arch','log-crossing'].includes(this.run.route))return; // Forest rocks are scanned meshes, not large procedural cliff slabs.
    }
    let b=this.batches.get(key);
    if(!b){const mesh=new T.InstancedMesh(this.geometry(shape),this.material(category),64);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=!['halo','shadow','leaf'].includes(shape);mesh.receiveShadow=!['halo','shadow'].includes(shape);this.scene.add(mesh);b={mesh,count:0,capacity:64};this.batches.set(key,b);}
    if(b.count>=4096)return;
    if(b.count>=b.capacity){
      const old=b.mesh,capacity=Math.min(4096,b.capacity*2),mesh=new T.InstancedMesh(old.geometry,old.material,capacity);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.instanceMatrix.array.set(old.instanceMatrix.array);
      mesh.setColorAt(0,this.tint);if(old.instanceColor)mesh.instanceColor.array.set(old.instanceColor.array);
      mesh.frustumCulled=false;mesh.castShadow=old.castShadow;mesh.receiveShadow=old.receiveShadow;
      this.scene.remove(old);old.dispose();this.scene.add(mesh);b.mesh=mesh;b.capacity=capacity;
    }
    this.temp.fromArray(values);b.mesh.setMatrixAt(b.count,this.temp);
    // Scanned diffuse maps already contain surface color. Tint lightly to retain route identity.
    this.tint.setRGB(...(['ground','stone','bark'].includes(category)?[.86,.91,.84]:c.slice(0,3)));
    b.mesh.setColorAt(b.count,this.tint);b.count++;
  }
  shape(shape,c,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,parent){const m=matrix(x,y,z,sx,sy,sz,rx,ry,rz);if(parent)m.premultiply(this.temp.fromArray(parent));this.add(shape,m.elements,c);}
  updateTail(time,bank){const g=this.geometry('tail'),raw=bridge.tailGeometry(time,bank),p=g.attributes.position,n=g.attributes.normal;
    for(let i=0,j=0;i<raw.length;i+=6,j+=3){p.array[j]=raw[i];p.array[j+1]=raw[i+1];p.array[j+2]=raw[i+2];n.array[j]=raw[i+3];n.array[j+1]=raw[i+4];n.array[j+2]=raw[i+5];}p.needsUpdate=n.needsUpdate=true;}
  scans(travel) {
    const s=this.run;if(!s)return;
    const biome=terrainBiome(this.worldPresets,s.route),profile=terrainProfile(this.worldPresets,s.route);
    const scenery=sceneryProfile(this.worldPresets,s.route);
    let anchored=0;
    const surface=(x,d)=>{anchored++;return terrainSurfaceHeight(profile,x,d,road(s,d)+curve(d)-curve(travel));};
    const underground=biome==='cavern',ruins=biome==='ruins';
    this.stats.biome=biome;this.stats.route=s.route;
    this.stats.terrainProfileLoaded=Boolean(this.worldPresets?.terrainProfiles?.[s.route]);
    this.stats.sceneryProfileLoaded=Boolean(this.worldPresets?.sceneryProfiles?.[s.route]);
    if(this.terrainBiome!==biome){
      const material=this.terrain.material,source=biome==='forest'?this.ground:this.stone;
      material.map=source.map;material.normalMap=source.normalMap;material.roughnessMap=source.roughnessMap;
      material.normalScale.copy(source.normalScale);material.needsUpdate=true;this.terrainBiome=biome;
    }
    this.stats.terrainMaterial=this.terrainBiome;
    this.terrain.visible=s.mode!=='chamber';
    this.cavernVault.update(s,travel,road,curve);
    if(s.mode==='chamber'){
      for(const {mesh} of this.scanBatches)mesh.count=0;this.trees.count=0;this.shafts.count=0;
      const x=s.x+road(s,travel),accent=s.chamber==='guardian-nest'?'#ffd8a0':s.chamber==='moonwell'?'#b8a7ff':'#79d9e6';
      this.scene.fog.color.set('#16252a');this.scene.background.set('#16252a');this.sun.intensity=.3;this.hemi.intensity=1.05;
      this.fill.position.set(x,2.8,-4);this.fill.color.set(accent);this.fill.intensity=65;this.scene.environmentIntensity=.25;return;
    }
    this.hemi.intensity=underground?1.4:2;
    const start=Math.floor(travel/12)*12;
    for(const {id,mesh} of this.scanBatches){let count=0;
      for(let i=1;i<=8;i++)for(const side of [-1,1]){
        const d=start+i*12,z=travel-d,n=Math.floor(d/12),r=hash(n*19+side+scenery.seed*7);
        if(z>-8)continue;
        if(id==='grass_medium_02'){
          if(underground&&n%2===0)continue;
          for(let j=0;j<3;j++){
            if(this.quality<1&&j===2)continue;
            const lateral=3.95+r*1.3+j*.52,scale=(.34+.18*hash(n*13+side*3+j))*scenery.understory;
            const x=road(s,d)+curve(d)-curve(travel)+side*lateral;
            mesh.setMatrixAt(count++,matrix(x,surface(x,d+j*2.1)+.07,z-j*2.1,scale,scale,scale,0,r*6.28+j*.8,0));
          }
          continue;
        }
        if(id==='root_cluster_01'){
          if(n%3!==0)continue;
          const lateral=5.0+r*1.6,scale=(1.25+r*.55)*scenery.rootScale;
          const x=road(s,d)+curve(d)-curve(travel)+side*lateral;
          mesh.setMatrixAt(count++,matrix(x,surface(x,d)-.06,z,scale,scale,scale,0,r*6.28,side*.13));
          continue;
        }
        if(id==='island_tree_02'){
          const near=i<=2&&side===(i%2===0?1:-1);
          const distant=i>2&&n%2===0&&this.quality===1;
          if(underground||(!near&&!distant))continue;
          const spread=6.6+r*1.9,scale=(6.5+r*2.2)*scenery.treeScale;
          const x=road(s,d)+curve(d)-curve(travel)+side*spread;
          mesh.setMatrixAt(count++,matrix(x,surface(x,d)-.02,z,scale,scale,scale,0,r*6.28,side*.035));
          continue;
        }
        if(id==='fern_02'&&underground)continue;if(id==='dead_tree_trunk'&&(underground||n%3!==0))continue;
        if(id==='rock_face_02'&&!underground&&!ruins)continue; // Scanned masonry belongs to ruins and caverns.
        if(id==='rock_face_02'&&ruins&&n%2!==0)continue;
        if(id==='rock_moss_set_01'&&n%2===0)continue;
        // Tall scanned stumps and boulders sit on the outer banks, not over
        // the gameplay sightline or the three flat collision lanes.
        const bankOffset=id==='rock_face_02'?(ruins?12:9)
          :id==='dead_tree_trunk'?8.4+r*1.4
          :id==='rock_moss_set_01'?6.7+r*1.7:5.4+r*1.8;
        const x=road(s,d)+curve(d)-curve(travel)+side*bankOffset;
        const height=id==='fern_02'?1.1+r*.9:id==='dead_tree_trunk'?7+r*3:id==='rock_face_02'?(underground?7:4)+r*3:1.4+r*1.4;
        mesh.setMatrixAt(count++,matrix(x,surface(x,d)-.04,z,height,height,height,0,r*6.28,0));
        if(id==='rock_face_02'&&underground&&side===1&&n%2===0){
          const centre=road(s,d)+curve(d)-curve(travel);
          mesh.setMatrixAt(count++,matrix(centre+5,8,z,1.8,10,6,0,0,Math.PI/2));
        }
        if(id==='fern_02'&&!underground){
          // Layer scanned fronds on the ground, not suspended above the player.
          const cx=road(s,d)+curve(d)-curve(travel)+side*(4.0+r),scale=(.7+r*.85)*scenery.understory;
          for(let j=0;j<3;j++){const spread=.65*j,sz=z-j*2.3,plantX=cx+side*spread;
            const flowerScale=scale*(1-j*.13);
            mesh.setMatrixAt(count++,matrix(plantX,surface(plantX,d+j*2.3)+.07,sz,flowerScale,flowerScale,flowerScale,0,r*6.28+j,0));}
        }
      }
      mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
    }
    let trees=0;
    if(!underground)for(let i=8;i<=12;i++)for(const side of [-1,1]){ // distant silhouettes only; real scanned trees lead foreground
      const d=start+i*9,z=travel-d,n=Math.floor(d/9),r=hash(n*3+side+scenery.seed*7),scale=(.88+r*.42)*scenery.treeScale;
      if(z>-8)continue;
      const x=road(s,d)+curve(d)-curve(travel)+side*(5.3+r*2);
      this.trees.setMatrixAt(trees++,matrix(x,surface(x,d)-.12,z,scale,scale,scale,0,r*6.28,side*.06));
    }
    this.trees.count=trees;this.trees.instanceMatrix.needsUpdate=true;
    this.stats.groundedSceneryInstances=anchored;
    if(this.terrainRoute!==s.route||Math.abs(travel-(this.terrainD??-100))>1.8){
    this.terrainRoute=s.route;this.terrainD=travel;
    const vertices=this.terrain.geometry.attributes.position,uv=this.terrain.geometry.attributes.uv,tint=this.terrain.geometry.attributes.color;
    this.trailTint.set(underground?'#80746D':ruins?'#A19782':'#B5A184');
    this.mossTint.set(underground?'#52605D':ruins?'#6A7967':'#4C6648');
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i),z=vertices.getZ(i)-84,d=travel-z,centre=road(s,d)+curve(d)-curve(travel),lateral=Math.abs(x-centre);
      const inGap=this.course?.some(o=>o.route===s.route&&o.kind==='gap'&&Math.abs(o.d-d)<2.8&&Math.abs(x-centre-o.lane*2.15)<1.55);
      // Authored profiles shape each route while preserving the three flat
      // gameplay lanes and original collision gap depth.
      const landform=terrainSurfaceHeight(profile,x,d,centre,Boolean(inGap));
      vertices.setY(i,landform);
      uv.setXY(i,x*.18,d*.18);
      this.soilTint.copy(this.trailTint).lerp(this.mossTint,smooth((lateral-2.9)/4.6));
      this.soilTint.multiplyScalar(.87+.11*Math.sin(d*.63+x*.55)+.07*Math.cos(x*.36-d*.29));
      tint.setXYZ(i,this.soilTint.r,this.soilTint.g,this.soilTint.b);
    }
    this.terrain.position.z=-84;vertices.needsUpdate=uv.needsUpdate=tint.needsUpdate=true;this.terrain.geometry.computeVertexNormals();
    }
    this.shafts.count=underground?0:3;
    for(let i=0;i<3;i++){const d=start+30+i*27;this.shafts.setMatrixAt(i,matrix(road(s,d)+curve(d)-curve(travel)-1,7,travel-d,1.2,1,1.2,0,0,-.35));}this.shafts.instanceMatrix.needsUpdate=true;
    const biomeSettings=this.worldPresets?.biomes?.[biome];
    const fog=biomeSettings?.fog||(underground?'#1e343a':ruins?'#73837d':'#7b9387');
    this.scene.fog.color.set(fog);this.scene.background.set(fog);
    this.sun.intensity=Number.isFinite(biomeSettings?.sun)?biomeSettings.sun:(underground?.65:3.2);
    this.scene.environmentIntensity=underground?.16:.32;
    const x=road(s,travel);this.sun.position.set(x-12,19,8);this.sun.target.position.set(x,0,-18);
    this.fill.position.set(x,2.8,-3);this.fill.color.set(underground?'#83c9e4':'#ffb257');this.fill.intensity=underground?23:13;
  }
  render(eye,target,time,zone,travel=0) {
    if(this.dead)return;
    const now=performance.now();
    // Software graphics and older phones may miss the 400ms frame safety gate.
    // Include lobby/countdown frames so adaptation acts before a run begins.
    // Ignore background-tab gaps and initial shader warmup, not persistent
    // 500-1000ms frames (the old <350ms filter never adapted to those).
    if(['ready','countdown','running'].includes(this.run?.mode)&&this.renderedFrames>3
      &&(typeof document==='undefined'||document.visibilityState==='visible')){
      const elapsed=now-(this.previousFrame??now);
      if(elapsed>0&&elapsed<1800)this.frameSamples.push(elapsed);
      if(this.frameSamples.length>=3){
        const next=adjustedSceneScale(this.quality,this.frameSamples);
        const rapid=this.frameSamples.every(ms=>ms<24);
        this.stableFrames=rapid?this.stableFrames+3:0;
        // Restore visual quality only after sustained fast rendering.
        const restored=this.stableFrames>=90&&next===this.quality&&next<1
          ?Math.min(1,Math.round((next+.07)*100)/100):next;
        if(restored!==this.quality){
          this.quality=restored;
          this.sun.castShadow=this.quality>.53;
          this.stableFrames=0;
          console.info('MADGER_FOREST_QUALITY',JSON.stringify({
            resolutionScale:this.quality, dynamicShadows:this.sun.castShadow,
            recentFrameMs:this.frameSamples.map(v=>Math.round(v))
          }));
        }
        this.frameSamples.length=0;
      }
    }
    this.previousFrame=now;this.renderedFrames++;
    // UI remains at native resolution; lower only the 3D buffer on slow devices.
    const w=Math.round((this.gl.canvas.clientWidth||this.gl.drawingBufferWidth)*this.quality),h=Math.round((this.gl.canvas.clientHeight||this.gl.drawingBufferHeight)*this.quality);if(w<2||h<2)return;
    if(this.width!==w||this.height!==h){this.width=w;this.height=h;this.gpu.setSize(w,h,false);this.camera.aspect=w/h;this.camera.fov=T.MathUtils.radToDeg(2*Math.atan(Math.max(Math.tan(33*Math.PI/180),Math.tan(17*Math.PI/180)/(w/h))));this.camera.updateProjectionMatrix();}
    this.travel.value=travel;this.camera.position.fromArray(eye);this.camera.lookAt(new T.Vector3().fromArray(target));this.scans(travel);
    for(const {mesh,count} of this.batches.values()){
      mesh.count=count;
      if(count){mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,count*16);mesh.instanceMatrix.needsUpdate=true;
        if(mesh.instanceColor){mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.addUpdateRange(0,count*3);mesh.instanceColor.needsUpdate=true;}}
      this.stats.instances+=count;
    }
    this.gpu.render(this.scene,this.camera);this.stats.resolutionScale=this.quality;this.stats.drawCalls=this.gpu.info.render.calls;this.stats.triangles=this.gpu.info.render.triangles;
    const instancesFor=id=>Math.max(0,...this.scanBatches.filter(b=>b.id===id).map(b=>b.mesh.count));
    this.stats.photoscannedTrees=instancesFor('island_tree_02');
    this.stats.photoscannedRoots=instancesFor('root_cluster_01');
    this.stats.photoscannedGrasses=instancesFor('grass_medium_02');
    this.stats.terrainVertices=this.terrain.geometry.attributes.position.count;
    this.stats.cavernVaultTriangles=this.cavernVault.mesh.visible?this.cavernVault.triangles:0;
    if(typeof window!=='undefined')window.madgerForestDiagnostics={photoscannedTrees:this.stats.photoscannedTrees,photoscannedRoots:this.stats.photoscannedRoots,photoscannedGrasses:this.stats.photoscannedGrasses,terrainVertices:this.stats.terrainVertices,drawCalls:this.stats.drawCalls,triangles:this.stats.triangles,resolutionScale:this.quality,route:this.stats.route,biome:this.stats.biome,terrainProfileLoaded:this.stats.terrainProfileLoaded,sceneryProfileLoaded:this.stats.sceneryProfileLoaded,groundedSceneryInstances:this.stats.groundedSceneryInstances,terrainMaterial:this.terrainBiome,cavernVaultTriangles:this.stats.cavernVaultTriangles,madgerRig:this.stats.madgerRig,madgerMeshCount:this.stats.madgerMeshCount};
    if(!this.logged){this.logged=true;console.info('MADGER_FOREST_RENDER',JSON.stringify(this.stats));}
  }
  dispose(){if(this.dead)return;this.dead=true;this.cavernVault?.dispose();for(const b of this.batches.values())b.mesh.dispose();for(const {mesh} of this.scanBatches){mesh.geometry.dispose();for(const value of Object.values(mesh.material))if(value?.isTexture)value.dispose();mesh.material.dispose();mesh.dispose();}for(const object of [this.terrain,this.trees,this.shafts]){object?.geometry.dispose();object?.material.dispose();}for(const g of this.geometries.values())g.dispose();for(const m of this.materials.values())m.dispose();for(const t of this.textures)t.dispose();for(const url of this.assetUrls?.values()||[])URL.revokeObjectURL(url);this.environment?.dispose();this.gpu.dispose();}
}
bridge=legacyCharacters(ForestRenderer);
window.madgerOvergrownScene=async gl=> {
  const scene=new bridge.Scene(gl);
  try{await scene.renderer.init();}catch(e){scene.dispose();throw e;}
  // The original renderer had only primitive spheres for the playable badger.
  // Replace ONLY the visible Overgrown hero, not deterministic movement,
  // companion logic, saved records, UI controls or legacy fallback gameplay.
  const hero=new MadgerHero(scene.renderer.scene,road,scene.renderer.approvedFace);
  const previousMadger=scene.madger.bind(scene);
  scene.madger=(s,time,calm)=>{
    if(s?.board!=='overgrown')return previousMadger(s,time,calm);
    hero.update(s,time,calm);
    if(s.slide>0&&typeof scene.burrowTrail==='function')
      scene.burrowTrail(s,Math.min(1,(s.slide||0)/.83),calm);
    if(s.shields>0)scene.shape('ring',[.26,.83,.75,.35],s.x+road(s,s.distance),
      Math.sin(s.distance/34)*.12+s.y+1.18,0,.90,1,.90,Math.PI/2,time*.8,0);
    if(s.magnet>0)scene.shape('ring',[.55,.42,.91,.28],s.x+road(s,s.distance),
      Math.sin(s.distance/34)*.12+.11,0,1.15,1,1.15,0,time*.35,0);
    scene.renderer.stats.madgerRig='authored-3d';
    scene.renderer.stats.madgerMeshCount=hero.meshCount;
    scene.renderer.stats.madgerTriangles=Math.round(hero.triangles);
    if(typeof window!=='undefined')window.madgerHeroDiagnostics=hero.lastPose;
  };
  const draw=scene.draw.bind(scene);
  scene.draw=(s,time,calm)=>{scene.renderer.run=s;draw(s,time,calm);};
  const setCourse=scene.setCourse.bind(scene);
  scene.setCourse=course=>{scene.renderer.course=course.filter(i=>i.kind==='gap');setCourse(course);};
  const previousDispose=scene.dispose.bind(scene);
  scene.dispose=()=>{hero.dispose();previousDispose();};
  return scene;
};