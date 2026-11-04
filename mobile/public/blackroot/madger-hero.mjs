/* MADGER articulated game mesh. Reference authority is the user-supplied
 * madger-user-pose-card.png. This is a modeled candidate, not an approved
 * production likeness. Identity acceptance requires actual rendered review.
 * No portrait, pose-card crop, billboard or generated substitute is rendered.
 */
import * as T from './vendor/build/three.module.js';
import {mergeGeometries} from './vendor/examples/jsm/utils/BufferGeometryUtils.js';
const BLACK='#101110',TAN='#e8bc84',PALE='#f3d8ad';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const hash=n=>{const v=Math.sin(n*127.1+7.3)*43758.5453;return v-Math.floor(v);};
const dark=new T.Color(BLACK),tan=new T.Color(TAN);

// Short, offset strands, not the previous full-surface diagonal corduroy bands.
function furTexture(){
 const size=256,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const row=Math.floor(y/12),col=Math.floor((x+row*2.3)/5);
  const u=((x+row*2.3)%5+5)%5,v=y%12;
  const strand=Math.max(0,1-Math.abs(u-2.1-.3*Math.sin(v*.3))/1.3)*Math.sin(v/12*Math.PI);
  const tone=196+strand*36+(hash(col*91+row*17)-.5)*24+(hash(x+y*size)-.5)*13;
  const i=(x+y*size)*4;pixels[i]=pixels[i+1]=pixels[i+2]=tone;pixels[i+3]=255;
 }
 const map=new T.DataTexture(pixels,size,size,T.RGBAFormat);
 map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;
 map.anisotropy=4;map.needsUpdate=true;return map;
}

/** Coat marks are part of the volumetric skin and fur, not floating plates. */
export function creamCoatAt(x,y,z,zone){
 const a=Math.abs(x),jag=.012*Math.sin(y*93)+.007*Math.sin(y*159);
 if(zone==='head'){
  if(y>.38&&a<.12+jag)return true;
  if(z>=.015)return a<.066+.055*clamp((y+.5)/1)+jag;
  const crown=y>-.105&&a<.034+.125*clamp((y+.105)/.6)+jag;
  const brow=a>.10&&a<.54&&y>.035&&Math.abs(y-(.265-.86*Math.abs(a-.29)))<.043+jag*.4;
  const cheek=y<-.105&&a>.12&&z<.07;
  return crown||brow||cheek||y<-.32;
 }
 if(zone==='body'){
  if(z>.02)return y>-.50&&a<.063+jag;
  return z<-.10&&a<.33&&Math.abs(y-(.16+.65*a))<.024+jag*.35;
 }
 return zone==='cream';
}

function mesh(parent,name,geometry,material){
 const object=new T.Mesh(geometry,material);object.name=name;
 object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
function sphere(parent,name,at,scale,material,seg=28,rings=18){
 const object=mesh(parent,name,new T.SphereGeometry(1,seg,rings),material);
 object.position.set(...at);object.scale.set(...scale);return object;
}

// Skin plus thousands of very short directional fur wedges share one material
// batch. The tapered tips break the silhouette without alpha planes/overdraw.
function coat(parent,name,at,radii,material,zone='dark',density=450,shape=null){
 const segments=density>=1500?36:density>=800?32:density>=400?26:20;
 const rings=density>=1500?24:density>=800?22:density>=400?18:14;
 const base=new T.SphereGeometry(1,segments,rings),position=base.attributes.position;
 const colors=[];
 const sample=(n)=>{
  let x=n.x*radii[0],y=n.y*radii[1],z=n.z*radii[2];
  if(shape==='head'){
   const cheek=1+.12*Math.exp(-(((y+.14)/.22)**2))*(z<.05?1:.3);
   x*=cheek;z+=.025*Math.max(0,-n.y);
  }
  const color=creamCoatAt(x,y,z,zone)?tan:dark;
  return {point:new T.Vector3(x+at[0],y+at[1],z+at[2]),color};
 };
 for(let i=0;i<position.count;i++){
  const q=sample(new T.Vector3().fromBufferAttribute(position,i));
  position.setXYZ(i,...q.point.toArray());colors.push(q.color.r,q.color.g,q.color.b);
 }
 base.setAttribute('color',new T.Float32BufferAttribute(colors,3));base.computeVertexNormals();
 mesh(parent,name,base,material);
 const p=[],n=[],uv=[],c=[];
 for(let i=0;i<density;i++){
  const y=1-2*(i+.5)/density,a=i*2.39996323,r=Math.sqrt(1-y*y);
  const normal=new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
  const q=sample(normal),unit=new T.Vector3(normal.x/radii[0],normal.y/radii[1],normal.z/radii[2]).normalize();
  const down=new T.Vector3(.10*Math.sin(i*2.7),-1,.10).addScaledVector(unit,unit.y).normalize();
  const across=new T.Vector3().crossVectors(unit,down).normalize();
  const length=.035+.022*hash(i*19),width=.009+.006*hash(i*31),point=q.point;
  const left=point.clone().addScaledVector(across,-width).addScaledVector(unit,.003);
  const right=point.clone().addScaledVector(across,width).addScaledVector(unit,.003);
  const ridge=point.clone().addScaledVector(down,length*.45).addScaledVector(unit,.016);
  const tip=point.clone().addScaledVector(down,length).addScaledVector(unit,.006);
  for(const triangle of [[left,right,ridge],[left,ridge,tip],[ridge,right,tip]]){
   for(const v of triangle){p.push(v.x,v.y,v.z);n.push(unit.x,unit.y,unit.z);uv.push(.5+v.x*2,v.y*2);c.push(q.color.r,q.color.g,q.color.b);}
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));
 geometry.setAttribute('normal',new T.Float32BufferAttribute(n,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 geometry.setAttribute('color',new T.Float32BufferAttribute(c,3));mesh(parent,name+'-directional-fur',geometry,material);
}
function tube(parent,name,points,radius,material,radial=8){
 return mesh(parent,name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),18,radius,radial,false),material);
}
function claw(parent,name,at,width=.028,length=.13){
 const g=new T.ConeGeometry(width,length,9),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const t=(p.getY(i)+length*.5)/length;p.setZ(i,p.getZ(i)-t*t*.025);}
 g.computeVertexNormals();const object=mesh(parent,name,g,parent.userData.clawMaterial);
 object.position.set(...at);object.rotation.x=-2.1;return object;
}
function armGeometry(side){
 const rings=24,sides=20,p=[],uv=[],indices=[];
 for(let j=0;j<=rings;j++){
  const t=j/rings,r=(.145+.043*Math.sin(t*Math.PI))*(.75+.25*Math.sin(Math.PI*clamp(t,.02,.98)));
  const x=side*(.085*Math.sin(t*Math.PI*.7)),y=-t*.67,z=-.04-.09*t*t;
  for(let k=0;k<=sides;k++){
   const a=k/sides*Math.PI*2;p.push(x+Math.cos(a)*r,y,z+Math.sin(a)*r);uv.push(k/sides,t);
   if(j<rings&&k<sides){const i=j*(sides+1)+k;indices.push(i,i+sides+1,i+1,i+1,i+sides+1,i+sides+2);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function tailGeometry(){
 const rings=80,sides=36,p=[],uv=[],indices=[];
 for(let j=0;j<=rings;j++){
  const t=j/rings,bulb=Math.pow(Math.max(.0001,Math.sin(Math.PI*t)),.72);
  for(let i=0;i<=sides;i++){
   const a=i/sides*Math.PI*2,edge=1+.025*Math.sin(j*3.1+i*2.1);
   p.push(Math.cos(a)*(.008+.33*bulb)*edge,.03+t*.73, .03+t*.77+Math.sin(a)*(.015+.21*bulb)*edge);
   uv.push(i/sides,t);
   if(j<rings&&i<sides){const k=j*(sides+1)+i;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function tailMaterial(fur){
 const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:.97,bumpMap:fur,bumpScale:.018,side:T.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 vTailPattern;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTailPattern=uv;');
  shader.fragmentShader='varying vec2 vTailPattern;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float lateral=cos(vTailPattern.x*6.2831853);
   float zig=abs(fract(lateral*3.2+vTailPattern.y*.7)-.5)*.13;
   float band=vTailPattern.y*3.45-abs(lateral)*.86+zig;
   float edge=fract(band);
   float aa=max(fwidth(band),.003);
   float cream=smoothstep(.06-aa,.06+aa,edge)*(1.0-smoothstep(.51-aa,.51+aa,edge));
   diffuseColor.rgb*=mix(vec3(.006,.0065,.006),vec3(.806,.503,.238),cream);
  `);
 };
 material.customProgramCacheKey=()=> 'madger-tail-sharp-chevron-v2';return material;
}

export function sampleFootGait(distance,phase=0){
 const period=2.8,stance=.32,p=((distance/period+phase)%1+1)%1,reach=period*stance*.5;
 if(p<stance)return {z:-reach+p*period,lift:0,contact:true};
 const swing=(p-stance)/(1-stance);return {z:reach-2*reach*smooth(swing),lift:.18*Math.sin(swing*Math.PI),contact:false};
}
function batchRigidParts(group){
 group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),byMaterial=new Map();
 for(const child of group.children){
  if(!child.isMesh||!child.visible||child.userData.rigidBatch)continue;
  let geometry=child.geometry.clone().applyMatrix4(inverse.clone().multiply(child.matrixWorld));
  if(geometry.index){const indexed=geometry;geometry=indexed.toNonIndexed();indexed.dispose();}
  const list=byMaterial.get(child.material)||[];list.push(geometry);byMaterial.set(child.material,list);
  child.visible=false;child.userData.batchedSource=true;
 }
 for(const [material,parts] of byMaterial){
  const combined=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());
  const object=mesh(group,group.name+'-rigid-batch',combined,material);object.userData.rigidBatch=true;
 }
}

export class MadgerHero {
 constructor(scene,pathX,_unusedApprovedPortrait=null,pathHeight=()=>0){
  this.scene=scene;this.pathX=pathX;this.pathHeight=pathHeight;
  const fur=furTexture();
  this.mats={
   fur:new T.MeshStandardMaterial({color:'#242421',map:fur,bumpMap:fur,bumpScale:.018,roughness:.94}),
   coat:new T.MeshStandardMaterial({vertexColors:true,map:fur,bumpMap:fur,bumpScale:.012,roughness:.96,side:T.DoubleSide}),
   cream:new T.MeshStandardMaterial({color:TAN,map:fur,bumpMap:fur,bumpScale:.012,roughness:.95}),
   pale:new T.MeshStandardMaterial({color:PALE,roughness:.6}),
   black:new T.MeshStandardMaterial({color:BLACK,roughness:.74}),
   eyeWhite:new T.MeshPhysicalMaterial({color:'#fff8e9',roughness:.21,clearcoat:.35}),
   iris:new T.MeshPhysicalMaterial({color:'#c88a25',roughness:.24,clearcoat:.65}),
   pupil:new T.MeshPhysicalMaterial({color:'#070a08',roughness:.15,clearcoat:1}),
   nose:new T.MeshPhysicalMaterial({color:'#0b0e0c',roughness:.22,clearcoat:.8}),
   tail:tailMaterial(fur)
  };
  this.root=new T.Group();this.root.name='MADGER_AUTHORED_3D_RIG';scene.add(this.root);
  this.root.userData.reference='madger-user-pose-card.png';this.root.userData.visualApproval='pending';
  this.body=new T.Group();this.body.name='compact-furred-body';this.root.add(this.body);
  coat(this.body,'continuous-spine-and-chest-coat',[0,-.02,.015],[.43,.57,.35],this.mats.coat,'body',1100);
  this.head=new T.Group();this.head.name='modeled-badger-face';this.head.position.set(0,.79,-.055);this.body.add(this.head);
  coat(this.head,'sculpted-cranium-and-crown',[0,0,0],[.59,.50,.39],this.mats.coat,'head',1600,'head');
  // Exactly two ears; each has a black back, warm fur rim and recessed cavity.
  for(const side of [-1,1]){
   const name=side<0?'left':'right';
   coat(this.head,name+'-ear-rim',[side*.49,.355,.015],[.16,.178,.10],this.mats.coat,'cream',180);
   const cavity=sphere(this.head,name+'-ear-cavity',[side*.49,.354,-.071],[.111,.132,.044],this.mats.black,24,16);cavity.rotation.z=-side*.14;
   // Broad angled cheek ruff provides the characteristic pointed side profile.
   coat(this.head,name+'-cheek-ruff',[side*.39,-.195,-.265],[.247,.17,.19],this.mats.coat,'cream',450);
   for(let j=0;j<3;j++){
    const tuft=mesh(this.head,name+'-cheek-point-'+j,new T.ConeGeometry(.072,.16,5),this.mats.cream);
    tuft.position.set(side*(.575+j*.017),-.12-j*.065,-.23+j*.021);
    tuft.rotation.z=-side*(Math.PI*.53+j*.12);tuft.rotation.x=.15;
   }
   const eye=sphere(this.head,name+'-eye-mask',[side*.252,.015,-.365],[.205,.215,.095],this.mats.black,30,22);
   eye.rotation.z=-side*.18;
   const white=sphere(this.head,name+'-sclera',[side*.247,.007,-.432],[.159,.174,.061],this.mats.eyeWhite,32,22);
   white.rotation.z=-side*.21;
   sphere(this.head,name+'-amber-iris',[side*.225,-.017,-.488],[.108,.135,.038],this.mats.iris,30,20);
   sphere(this.head,name+'-pupil',[side*.221,-.014,-.521],[.062,.089,.023],this.mats.pupil,24,18);
   sphere(this.head,name+'-catchlight',[side*.221-.030,.037,-.542],[.026,.030,.012],this.mats.eyeWhite,14,10);
   // Upper lids make the eyes intent rather than circular surprised buttons.
   tube(this.head,name+'-upper-lid',[[side*.10,.105,-.444],[side*.20,.175,-.455],[side*.32,.175,-.403],[side*.408,.09,-.343]],.023,this.mats.black);
   tube(this.head,name+'-raised-cream-brow',[[side*.094,.145,-.367],[side*.22,.247,-.371],[side*.34,.248,-.30],[side*.47,.105,-.235]],.042,this.mats.cream);
  }
  coat(this.head,'projecting-short-muzzle',[0,-.251,-.455],[.315,.14,.225],this.mats.coat,'cream',550);
  sphere(this.head,'lower-lip',[0,-.342,-.513],[.235,.052,.124],this.mats.cream,28,16);
  tube(this.head,'confident-smile',[[-.226,-.290,-.595],[-.13,-.335,-.646],[0,-.35,-.651],[.13,-.335,-.646],[.226,-.29,-.595]],.012,this.mats.black);
  const nose=sphere(this.head,'projecting-triangular-nose',[0,-.188,-.671],[.133,.091,.093],this.mats.nose,32,22);
  const np=nose.geometry.attributes.position;
  for(let i=0;i<np.count;i++)np.setX(i,np.getX(i)*(.65+.35*(np.getY(i)+1)*.5));nose.geometry.computeVertexNormals();
  tube(this.head,'nose-to-smile',[[0,-.25,-.704],[0,-.30,-.686],[0,-.342,-.66]],.009,this.mats.black);
  // One small inset tooth, not the previously rejected oversized fang.
  const tooth=mesh(this.head,'small-inset-signature-tooth',new T.ConeGeometry(.019,.052,10),this.mats.pale);
  tooth.position.set(-.15,-.346,-.647);tooth.rotation.z=Math.PI;
  this.arms=[];this.legs=[];this.knees=[];this.feet=[];this.clawCount={hands:[5,5],feet:[5,5]};
  for(const side of [-1,1]){
   const arm=new T.Group();arm.name=(side<0?'left':'right')+'-continuous-arm';arm.position.set(side*.385,.34,-.015);this.body.add(arm);
   mesh(arm,'continuous-shoulder-to-wrist',armGeometry(side),this.mats.fur);
   coat(arm,'furred-paw',[side*.07,-.617,-.13],[.175,.14,.155],this.mats.coat,'dark',180);
   arm.userData.clawMaterial=this.mats.pale;
   for(let i=0;i<5;i++)claw(arm,'hand-claw-'+i,[side*.07+(i-2)*.062,-.659,-.254],.026,.12);
   this.arms.push(arm);
   const leg=new T.Group();leg.name=(side<0?'left':'right')+'-leg';leg.position.set(side*.275,-.33,.045);this.body.add(leg);
   coat(leg,'furred-thigh',[0,-.15,0],[.206,.254,.197],this.mats.coat,'dark',270);
   const knee=new T.Group();knee.name='articulated-knee';knee.position.y=-.34;leg.add(knee);
   coat(knee,'furred-shin',[0,-.16,0],[.176,.238,.167],this.mats.coat,'dark',220);
   const foot=new T.Group();foot.name='planted-five-claw-foot';foot.position.y=-.34;knee.add(foot);
   coat(foot,'broad-badger-paw',[0,0,-.105],[.223,.125,.272],this.mats.coat,'dark',190);
   foot.userData.clawMaterial=this.mats.pale;
   for(let i=0;i<5;i++)claw(foot,'foot-claw-'+i,[(i-2)*.080,.007,-.337],.028,.135);
   this.knees.push(knee);this.feet.push(foot);this.legs.push(leg);
  }
  this.tail=new T.Group();this.tail.name='bushy-chevron-tail';this.tail.position.set(0,-.43,.28);this.body.add(this.tail);
  mesh(this.tail,'3d-chevron-tail-mesh',tailGeometry(),this.mats.tail);
  for(const group of [this.head,...this.arms,...this.feet,...this.knees,...this.legs,this.tail,this.body])batchRigidParts(group);
  this.meshCount=0;this.renderMeshCount=0;this.triangles=0;
  this.root.traverse(o=>{if(o.isMesh){this.meshCount++;if(o.visible){this.renderMeshCount++;this.triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}}});
  this.shadow=new T.Mesh(new T.CircleGeometry(.72,32),new T.MeshBasicMaterial({color:BLACK,transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide}));
  this.shadow.name='ground-contact-shadow';this.shadow.rotation.x=-Math.PI/2;scene.add(this.shadow);
 }

  update(run,time,calm=false) {
    const active=run?.board==='overgrown';
    this.root.visible=active;this.shadow.visible=active;
    if(!active)return;
    const t=Number.isFinite(time)?time:0;
    const distance=Number.isFinite(run.distance)?run.distance:0;
    const laneX=Number.isFinite(run.x)?run.x:0;
    const bx=laneX+this.pathX(run,distance);
    const floor=this.pathHeight(run,distance)-.33;
    const y=Math.max(0,Number.isFinite(run.y)?run.y:0);
    const support=Math.max(0,run.groundHeight||0),airHeight=Math.max(0,y-support);
    const finished=['won','lost'].includes(run.mode);
    if(finished&&this.finishedAt===undefined)this.finishedAt=t;
    if(!finished)this.finishedAt=undefined;
    const emergence=finished?1-smooth((t-this.finishedAt)/.24):1;
    const burrow=run.slide>0?smooth((run.slideAge||0)/.10)*smooth(run.slide/.16)*(1-smooth(airHeight/.18))*emergence:0;
    const walking=run.mode==='running'&&distance>0;
    const lobby=run.mode==='ready';
    const stride=distance/2.8*Math.PI*2;
    const grounded=airHeight<.04;
    const bob=walking&&grounded&&!burrow?.025*Math.sin(stride*2):0;
    this.root.position.set(bx,floor+y-burrow*2.15,0);
    this.root.rotation.y=lobby?Math.PI+.09*Math.sin(t*.65):clamp((run.vx||0)*-.025,-.16,.16);
    this.root.rotation.z=0;
    this.body.position.y=.94+bob;
    this.body.rotation.x=burrow*(-.47)+(walking&&!burrow?.045:0);
    this.body.scale.set(1,1-.17*burrow,1+.06*burrow);
    this.head.rotation.x=-.16*burrow+(lobby?.012*Math.sin(t*1.8):-.025);
    this.head.rotation.y=(!lobby&&run.mode==='chamber'?.13*Math.sin(t):0);
    this.tail.rotation.x=-.05+.09*Math.sin(stride)*(walking&&!calm?1:.2)-.18*burrow;
    this.tail.rotation.y=-.58+clamp(-(run.vx||0)*.035,-.2,.2)+.07*Math.sin(t*2.3);
    this.tail.rotation.z=.32+.05*Math.sin(walking?stride:t*1.9);
    const contacts=[];
    for(let i=0;i<2;i++){
      const gait=sampleFootGait(distance,i*.5),phase=stride+i*Math.PI;
      const lift=walking&&grounded?gait.lift:airHeight>.04?.17:0;
      const z=walking&&grounded?gait.z:airHeight>.04?(i===0?-.20:.16):0;
      // Two-bone IK: each planted paw remains horizontal at the trail surface,
      // rather than orbiting the hip with a rigid pendulum leg.
      const targetY=.125+lift-(this.body.position.y-.33);
      const d=clamp(Math.hypot(targetY,z),.08,.675),bend=Math.acos(clamp(d/.68,-1,1));
      const hip=Math.atan2(-z,-targetY)+bend;
      this.legs[i].rotation.x=hip-this.body.rotation.x;
      this.knees[i].rotation.x=-2*bend;
      this.feet[i].rotation.x=-(hip-2*bend);
      this.arms[i].rotation.x=walking?-.50*Math.sin(phase)*(1-burrow):-.08;
      this.arms[i].rotation.x+=burrow*(-.8+.28*Math.sin(t*17+i*Math.PI));
      this.arms[i].rotation.z=(i===0?.08:-.08)*burrow;
      contacts.push(walking&&grounded&&gait.contact&&!burrow);
    }
    const hurt=run.lastHurt!==undefined&&run.time!==undefined
      &&run.time-run.lastHurt>=0&&run.time-run.lastHurt<.34;
    this.mats.fur.emissive.set(hurt?'#802c27':'#000000');
    this.mats.fur.emissiveIntensity=hurt?.42:0;
    this.shadow.position.set(bx,floor+support+.018,0);
    const shadowScale=clamp(1-airHeight*.15,.55,1)*(1-burrow*.3);
    this.shadow.scale.set(shadowScale,shadowScale,1);
    this.shadow.material.opacity=.25*(1-.8*burrow);
    this.root.updateMatrixWorld(true);
    this.lastPose={route:run.route,phase:run.mode,
      burrowing:burrow>.05,jumping:airHeight>.08,position:[bx,this.root.position.y,0],
      triangleCount:Math.round(this.triangles),meshCount:this.meshCount,
      rearCreamBlaze:true,
      continuousSpineBlaze:true,
      footContacts:contacts,renderMeshCount:this.renderMeshCount,
      patternedTail:this.root.getObjectByName('3d-chevron-tail-mesh')!==undefined,
      faceTechnique:'modeled-3d',faceProjection:false,likenessStatus:'pending-visual-review',
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
