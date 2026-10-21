/* MADGER playable hero: sculpted, articulated Three.js mesh, not the legacy sphere runner.
 * Visual reference: MADGER official ten-pose card and madger-mascot.webp.
 * This remains an authored approximation of the reference, NOT an exact
 * photogrammetric likeness or a completed production character asset.
 * Never alter deterministic Expedition rules, saved checkpoints, or hero unlocks.
 */
import * as T from './vendor/build/three.module.js';

const DARK='#1d1c1c', BLACK='#090b0e', CREAM='#efd1a1', PALE='#f9e7cb';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const v3=(x,y,z)=>new T.Vector3(x,y,z);
const doubleSide=T.DoubleSide;

function furTexture(base, seed) {
  const size=256, pixels=new Uint8Array(size*size*4);
  let n=seed>>>0;
  const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const o=4*(x+y*size);
    const strand=(Math.sin((x+y*.37)*.43)+Math.sin((x-y*.72)*.91))*.11;
    const fleck=(rand()-.5)*.18+strand;
    for(let k=0;k<3;k++)pixels[o+k]=Math.round(clamp(base[k]*(1+fleck),0,255));
    pixels[o+3]=255;
  }
  const texture=new T.DataTexture(pixels,size,size,T.RGBAFormat);
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;
  texture.anisotropy=2;
  return texture;
}

function sphere(parent,name,at,scale,material,seg=28,rings=20) {
  const obj=new T.Mesh(new T.SphereGeometry(1,seg,rings),material);
  obj.name=name;obj.position.set(...at);obj.scale.set(...scale);
  obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;
}

// Face and back markings conform to actual curved head/body surfaces,
// rather than floating screen-facing stickers or a rotating 2-D billboard.
function marking(parent,name,vertices,radii,material,direction) {
  const outline=new T.Shape();
  vertices.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));
  outline.closePath();
  const geometry=new T.ShapeGeometry(outline,12);
  const pos=geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i);
    const n=1-x*x/(radii[0]*radii[0])-y*y/(radii[1]*radii[1]);
    pos.setZ(i,direction*(radii[2]*Math.sqrt(Math.max(0.012,n))+.022));
  }
  pos.needsUpdate=true;geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,material);
  mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;
  parent.add(mesh);return mesh;
}

function taperedLimb(group,name,at,dimensions,material) {
  const g=new T.SphereGeometry(1,20,14);
  const a=g.attributes.position;
  for(let i=0;i<a.count;i++){
    const y=a.getY(i);
    const taper=1-.11*y;
    a.setX(i,a.getX(i)*taper);
    a.setZ(i,a.getZ(i)*taper);
  }
  g.computeVertexNormals();
  const m=new T.Mesh(g,material);
  m.name=name;m.position.set(...at);m.scale.set(...dimensions);
  m.castShadow=true;group.add(m);return m;
}

function claw(group,at,scale,material,name,rotX=-Math.PI/2){
  const obj=new T.Mesh(new T.ConeGeometry(1,1,8),material);
  obj.name=name;obj.position.set(...at);obj.scale.set(...scale);
  obj.rotation.x=rotX;obj.castShadow=true;group.add(obj);return obj;
}

// Authored 3D tail: broad tapered silhouette, jagged cream/dark bands,
// and a continuously curved volume on all sides (not a flat rear sprite).
function sculptTail() {
  const vertices=[],colors=[],indices=[],rings=72,sides=32;
  const dark=new T.Color('#161719'),tan=new T.Color('#f2c995'),warm=new T.Color('#a67e50');
  for(let j=0;j<=rings;j++){
    const t=j/rings;
    const bulb=Math.pow(Math.max(.004,Math.sin(Math.PI*t)),.64);
    const wx=(.035+bulb*.236)*(1-.17*t),depth=.05+bulb*.145;
    const cy=.04+t*1.13,cz=.04+t*.44+.09*Math.sin(t*Math.PI*.9);
    for(let i=0;i<=sides;i++){
      const a=i/sides*Math.PI*2;
      // A sharp V-shaped band, not horizontal raccoon-like rings:
      // the cream wedges converge at the spine and flare out on the sides.
      const chevron=t*4.1+.43*Math.abs(Math.cos(a))+.055*Math.sin(a*4);
      const wave=((chevron%1)+1)%1;
      const tone=wave<.49?tan:wave<.54?warm:dark;
      vertices.push(Math.cos(a)*wx+t*.12,cy,cz+Math.sin(a)*depth);
      colors.push(tone.r,tone.g,tone.b);
      if(j<rings&&i<sides){const k=j*(sides+1)+i;
        indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

// Exact approved facial pixels are mapped onto a curved, dimensional head.
// Geometry and animation remain 3D; this is not a billboard or an AI remake.
// At extreme side views a bespoke sculpted face will still be needed.
function officialFaceSurface(reference) {
  const width=1.18,height=1.07;
  const geometry=new T.PlaneGeometry(width,height,32,28);
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i);
    const surface=Math.sqrt(Math.max(.015,
      1-(x/.67)**2-(y/.58)**2));
    position.setZ(i,-.515*surface-.065);
  }
  position.needsUpdate=true;geometry.computeVertexNormals();
  const map=reference.clone();
  // Crop from the unchanged 1254x1254 approved full-body portrait,
  // without recoloring or generating substitute facial features.
  map.offset.set(.270,.522);map.repeat.set(.472,.408);
  map.wrapS=map.wrapT=T.ClampToEdgeWrapping;
  map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;
  const size=128,mask=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x+.5)/size,v=(y+.5)/size;
    const radius=Math.hypot((u-.5)/.52,(v-.50)/.53);
    const fade=1-smooth((radius-.83)/.19),k=4*(x+y*size);
    mask[k]=mask[k+1]=mask[k+2]=Math.round(fade*255);mask[k+3]=255;
  }
  const alpha=new T.DataTexture(mask,size,size,T.RGBAFormat);
  alpha.needsUpdate=true;alpha.magFilter=T.LinearFilter;alpha.minFilter=T.LinearFilter;
  const material=new T.MeshStandardMaterial({
    map,alphaMap:alpha,transparent:true,side:T.DoubleSide,
    depthWrite:true,roughness:.92,polygonOffset:true,polygonOffsetFactor:-1
  });
  const mesh=new T.Mesh(geometry,material);
  mesh.name='approved-face-projection';
  mesh.userData.identitySource='madger-mascot.webp';
  mesh.castShadow=false;mesh.receiveShadow=true;
  return mesh;
}

export class MadgerHero {
  constructor(scene,pathX,approvedFaceTexture=null,pathHeight=()=>0) {
    this.pathHeight=pathHeight;
    this.scene=scene;this.pathX=pathX;
    this.mats={};
    this.mats.fur=new T.MeshStandardMaterial({
      map:furTexture([39,38,37],923),roughness:.91,metalness:0,
      bumpMap:null,side:doubleSide
    });
    this.mats.fur.bumpMap=this.mats.fur.map;this.mats.fur.bumpScale=.023;
    this.mats.cream=new T.MeshStandardMaterial({
      map:furTexture([236,202,155],204),roughness:.93,metalness:0,side:doubleSide
    });
    this.mats.cream.bumpMap=this.mats.cream.map;this.mats.cream.bumpScale=.018;
    this.mats.pale=new T.MeshStandardMaterial({color:PALE,roughness:.68,side:doubleSide});
    this.mats.black=new T.MeshStandardMaterial({color:BLACK,roughness:.32});
    this.mats.eyeWhite=new T.MeshPhysicalMaterial({color:'#fdf4e4',roughness:.2,clearcoat:.35});
    this.mats.iris=new T.MeshPhysicalMaterial({color:'#c88320',metalness:.25,roughness:.21,clearcoat:.7});
    this.mats.pupil=new T.MeshPhysicalMaterial({color:'#11110e',roughness:.10,clearcoat:1});
    this.mats.nose=new T.MeshPhysicalMaterial({color:'#080b0c',roughness:.18,clearcoat:1});
    this.mats.mouth=new T.MeshStandardMaterial({color:'#191012',roughness:.83});
    this.mats.tail=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,side:doubleSide});
    this.mats.gold=new T.MeshStandardMaterial({color:'#c49a5c',roughness:.85});
    this.root=new T.Group();this.root.name='MADGER_AUTHORED_3D_RIG';
    this.root.userData.identity='MADGER_OFFICIAL_POSE_CARD';
    this.scene.add(this.root);

    this.body=new T.Group();this.body.name='torso-and-markings';
    this.root.add(this.body);
    sphere(this.body,'sculpted-shoulders',[0,0,0],[.475,.67,.41],this.mats.fur,32,24);
    sphere(this.body,'pelvis-fur',[0,-.37,.045],[.425,.31,.34],this.mats.fur,24,16);
    for(const dir of [1,-1]){
      marking(this.body,dir>0?'signature-back-V-left':'chest-V-left',
        [[-.395,.34],[-.285,.385],[-.01,-.08],[.005,-.22],[-.13,.02]],
        [.485,.68,.41],this.mats.cream,dir);
      marking(this.body,dir>0?'signature-back-V-right':'chest-V-right',
        [[.395,.34],[.285,.385],[.01,-.08],[-.005,-.22],[.13,.02]],
        [.485,.68,.41],this.mats.cream,dir);
      marking(this.body,dir>0?'signature-back-blaze':'chest-throat-cream',
        [[0,.64],[-.14,.38],[-.09,.19],[0,.11],[.09,.19],[.14,.38]],
        [.485,.68,.41],this.mats.cream,dir);
    }
    this.head=new T.Group();
    this.head.name='articulated-badger-head';this.head.position.set(0,.86,-.07);
    this.body.add(this.head);
    sphere(this.head,'badger-head-shape',[0,0,0],[.67,.58,.515],this.mats.fur,36,28);

    marking(this.head,'center-cream-forehead-stripe',
      [[0,.574],[-.16,.365],[-.065,.13],[-.23,-.135],[0,-.27],[.23,-.135],[.065,.13],[.16,.365]],
      [.67,.58,.515],this.mats.cream,-1);
    marking(this.head,'rear-head-blaze',
      [[0,.568],[-.18,.405],[-.108,.245],[-.058,.035],[-.080,-.16],[-.045,-.385],[0,-.49],
       [.045,-.385],[.080,-.16],[.058,.035],[.108,.245],[.18,.405]],
      [.67,.58,.515],this.mats.cream,1);

    for(const side of [-1,1]){
      const sideName=side<0?'left':'right';
      const ear=new T.Group();ear.name=sideName+'-ear';
      ear.position.set(side*.545,.44,.015);ear.rotation.z=-side*.17;
      this.head.add(ear);
      sphere(ear,'black-ear',[0,0,0],[.194,.204,.117],this.mats.fur,22,16);
      sphere(ear,'cream-ear-rim',[0,.012,-.056],[.152,.158,.086],this.mats.cream,20,14);
      sphere(ear,'ear-inner-shadow',[0,-.02,-.111],[.114,.108,.038],this.mats.black,18,12);

      marking(this.head,sideName+'-angular-cream-brow',
        side<0?[[-.60,.095],[-.43,.305],[-.18,.315],[-.085,.115],[-.26,.18],[-.455,.003]]:
               [[.60,.095],[.43,.305],[.18,.315],[.085,.115],[.26,.18],[.455,.003]],
        [.67,.58,.515],this.mats.cream,-1);
      marking(this.head,sideName+'-cream-cheek',
        side<0?[[-.63,-.06],[-.46,-.32],[-.20,-.455],[-.055,-.32],[-.40,-.125]]:
               [[.63,-.06],[.46,-.32],[.20,-.455],[.055,-.32],[.40,-.125]],
        [.67,.58,.515],this.mats.cream,-1);
      sphere(this.head,sideName+'-furred-cheek',[side*.39,-.25,-.34],
        [.27,.20,.205],this.mats.cream,24,16);
      for(let i=0;i<3;i++){
        const cheek=sphere(this.head,sideName+'-cheek-fur-tuft-'+i,
          [side*(.51+i*.042),-.24-i*.047,-.285+i*.035],[.105,.064,.073],this.mats.cream,12,8);
        cheek.rotation.z=side*.34;
      }

      sphere(this.head,sideName+'-eye-outline',[side*.285,.084,-.477],
        [.214,.228,.068],this.mats.black,28,20);
      const sclera=sphere(this.head,sideName+'-sclera',[side*.285,.085,-.536],
        [.161,.186,.055],this.mats.eyeWhite,28,20);
      sclera.rotation.z=-side*.13;
      sphere(this.head,sideName+'-amber-iris',[side*.274,.070,-.587],
        [.115,.145,.038],this.mats.iris,26,18);
      sphere(this.head,sideName+'-pupil',[side*.270,.069,-.617],
        [.064,.101,.026],this.mats.pupil,24,16);
      sphere(this.head,sideName+'-catchlight',[side*.255-.025,.128,-.641],
        [.031,.036,.013],this.mats.eyeWhite,16,12);
    }
    // Pointed cream muzzle and separate black nose: recognizable badger, not a bear.
    sphere(this.head,'left-tapered-muzzle',[-.15,-.268,-.507],[.254,.161,.194],
      this.mats.cream,28,18);
    sphere(this.head,'right-tapered-muzzle',[.15,-.268,-.507],[.254,.161,.194],
      this.mats.cream,28,18);
    sphere(this.head,'mouth-opening',[0,-.354,-.571],[.237,.10,.075],this.mats.mouth,26,16);
    sphere(this.head,'lower-cream-lip',[0,-.40,-.542],[.25,.075,.089],this.mats.cream,26,14);
    sphere(this.head,'black-triangular-nose',[0,-.205,-.707],[.155,.107,.105],
      this.mats.nose,24,18);
    sphere(this.head,'nose-highlight',[-.038,-.174,-.791],[.038,.018,.011],
      this.mats.eyeWhite,16,10);
    // No oversized projecting fang. Tiny, anatomically inset teeth only.
    for(let i=0;i<4;i++){
      const tooth=sphere(this.head,'small-even-tooth-'+i,
        [(i-1.5)*.070,-.371,-.638],[.029,.037,.018],this.mats.pale,12,8);
      tooth.castShadow=false;
    }
    if(approvedFaceTexture){
      // Remove the improvised eyes and muzzle; the physically curved head
      // displays the approved mascot pixels instead of a generic cartoon face.
      this.head.traverse(node=>{
        if(!node.isMesh)return;
        if(/angular-cream-brow|cream-cheek|furred-cheek|cheek-fur-tuft|eye-outline|sclera|amber-iris|pupil|catchlight|tapered-muzzle|mouth-opening|cream-lip|triangular-nose|nose-highlight|small-even-tooth|center-cream-forehead-stripe/.test(node.name))
          node.visible=false;
      });
      this.faceSurface=officialFaceSurface(approvedFaceTexture);
      this.head.add(this.faceSurface);
      this.mats.faceSurface=this.faceSurface.material;
    }

    // Five individual naturally spaced claws on every hand and foot.
    this.arms=[];this.legs=[];this.clawCount={hands:[0,0],feet:[0,0]};
    for(const side of [-1,1]){
      const arm=new T.Group();arm.name=(side<0?'left':'right')+'-arm';
      arm.position.set(side*.47,.39,-.03);this.body.add(arm);
      taperedLimb(arm,'upper-arm-fur',[side*.08,-.23,-.01],[.195,.28,.19],this.mats.fur);
      taperedLimb(arm,'forearm-fur',[side*.12,-.47,-.11],[.172,.252,.170],this.mats.fur);
      sphere(arm,'five-clawed-hand',[side*.13,-.668,-.21],[.178,.144,.176],this.mats.fur,22,16);
      for(let i=0;i<5;i++){
        claw(arm,[side*.13+(i-2)*.067,-.707,-.38],[.029,.145,.028],
             this.mats.pale,'hand-claw-'+i);
      }
      this.clawCount.hands[side<0?0:1]=5;this.arms.push(arm);

      const leg=new T.Group();leg.name=(side<0?'left':'right')+'-leg';
      leg.position.set(side*.275,-.33,.045);this.body.add(leg);
      taperedLimb(leg,'thigh-fur',[0,-.12,0],[.228,.315,.213],this.mats.fur);
      taperedLimb(leg,'shin-fur',[0,-.35,.002],[.179,.265,.185],this.mats.fur);
      sphere(leg,'badger-foot',[0,-.532,-.125],[.218,.139,.297],this.mats.fur,24,18);
      for(let i=0;i<5;i++){
        claw(leg,[(i-2)*.080,-.556,-.387],[.031,.155,.030],
             this.mats.pale,'foot-claw-'+i);
      }
      this.clawCount.feet[side<0?0:1]=5;this.legs.push(leg);
    }
    this.tail=new T.Group();this.tail.name='swaying-black-cream-chevron-tail';
    this.tail.position.set(.32,-.43,.39);this.body.add(this.tail);
    const tailMesh=new T.Mesh(sculptTail(),this.mats.tail);
    tailMesh.name='3d-chevron-tail-mesh';tailMesh.castShadow=true;
    this.tail.add(tailMesh);
    const shadowGeometry=new T.CircleGeometry(.77,32);
    this.shadow=new T.Mesh(shadowGeometry,new T.MeshBasicMaterial({
      color:BLACK,transparent:true,opacity:.25,depthWrite:false,side:doubleSide
    }));
    this.shadow.name='ground-contact-shadow';this.shadow.rotation.x=-Math.PI/2;
    this.scene.add(this.shadow);
    this.meshCount=0;this.triangles=0;
    this.root.traverse(o=>{
      if(o.isMesh){this.meshCount++;const geometry=o.geometry;
        this.triangles+=(geometry.index?geometry.index.count:geometry.attributes.position.count)/3;}
    });
  }

  update(run,time,calm=false) {
    const active=run?.board==='overgrown';
    this.root.visible=active;this.shadow.visible=active;
    if(!active)return;
    const t=Number.isFinite(time)?time:0;
    const distance=Number.isFinite(run.distance)?run.distance:0;
    const laneX=Number.isFinite(run.x)?run.x:0;
    const bx=laneX+this.pathX(run,distance);
    const floor=Math.sin(distance/34)*.12+this.pathHeight(run,distance);
    const y=Math.max(0,Number.isFinite(run.y)?run.y:0);
    const digging=clamp((run.slide||0)/.83),burrow=smooth(digging);
    const walking=run.mode==='running'&&distance>0;
    const lobby=run.mode==='ready';
    const stride=distance*1.63;
    const sway=walking&&!calm?Math.sin(stride)*.065:0;
    const bob=walking&&y<.025&&!burrow?Math.abs(Math.sin(stride))*.046:0;
    this.root.position.set(bx,floor+y-burrow*.29+bob,0);
    this.root.rotation.y=lobby?Math.PI+.09*Math.sin(t*.65):0;
    this.root.rotation.z=clamp(-(run.vx||0)*.028,-.17,.17);
    this.body.position.y=1.0;
    this.body.rotation.x=burrow*(-.55)+(walking&&!burrow?.035*Math.cos(stride):0);
    this.body.scale.set(1,1-.48*burrow,1+.23*burrow);
    this.head.rotation.x=-.13*burrow+.017*Math.sin(t*1.8);
    this.head.rotation.y=(!lobby&&run.mode==='chamber'?.13*Math.sin(t):0);
    this.tail.rotation.x=-.10*burrow+.095*Math.sin(t*2.7);
    this.tail.rotation.y=.12*Math.sin(t*2.3);
    this.tail.rotation.z=-.33+.045*Math.sin(t*1.9);
    for(let i=0;i<2;i++){
      const phase=stride+i*Math.PI;
      this.legs[i].rotation.x=walking?.49*Math.sin(phase)*(1-burrow):0;
      this.arms[i].rotation.x=walking?-.60*Math.sin(phase)*(1-burrow):0;
      this.arms[i].rotation.x+=burrow*(-.8+.4*Math.sin(t*17+i*Math.PI));
      this.arms[i].rotation.z=(i===0?.08:-.08)*burrow;
    }
    const hurt=run.lastHurt!==undefined&&run.time!==undefined
      &&run.time-run.lastHurt>=0&&run.time-run.lastHurt<.34;
    this.mats.fur.emissive.set(hurt?'#802c27':'#000000');
    this.mats.fur.emissiveIntensity=hurt?.42:0;
    this.shadow.position.set(bx,floor-.30+.025,0);
    const shadowScale=clamp(1-y*.15,.55,1)*(1-burrow*.3);
    this.shadow.scale.set(shadowScale,shadowScale,1);
    this.root.updateMatrixWorld(true);
    this.lastPose={route:run.route,phase:run.mode,
      burrowing:burrow>.05,jumping:y>.08,position:[bx,this.root.position.y,0],
      triangleCount:Math.round(this.triangles),meshCount:this.meshCount,
      rearCreamBlaze:this.root.getObjectByName('rear-head-blaze')!==undefined,
      backChevron:this.root.getObjectByName('signature-back-V-left')!==undefined
        &&this.root.getObjectByName('signature-back-V-right')!==undefined,
      patternedTail:this.root.getObjectByName('3d-chevron-tail-mesh')!==undefined,
      approvedFace:this.faceSurface?.visible===true,
      eyes:'amber',clawsPerPaw:5};
  }

  dispose() {
    const geometries=new Set(),materials=new Set(),textures=new Set();
    for(const m of Object.values(this.mats)){
      if(m.map)textures.add(m.map);
      if(m.alphaMap)textures.add(m.alphaMap);
    }
    this.root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
    geometries.add(this.shadow.geometry);materials.add(this.shadow.material);
    for(const g of geometries)g.dispose();
    for(const m of materials)m.dispose();
    for(const t of textures)t.dispose();
    this.scene.remove(this.root,this.shadow);
  }
}
