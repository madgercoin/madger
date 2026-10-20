/* Route-authored ruin architecture for the existing playable PBR expedition.
 * Geometry only: it never reads or writes saves, route choices or collision state.
 * Two stone mesh batches, one tower and one animated bronze batch keep draw calls
 * bounded on mobile. Textures reuse the scanned CC0 masonry PBR map set.
 */
import * as T from './vendor/build/three.module.js';

export const RUIN_ROUTES = Object.freeze(['ridge','causeway','watchtower','gearworks']);
const SEEDS = Object.freeze({ridge:7,causeway:23,watchtower:41,gearworks:59});
const hash = n => {const x=Math.sin(n*127.13+41.7)*43758.5453;return x-Math.floor(x);};
const ANGLE_STEP=Math.PI/13;

function masonryBlock() {
  // Irregular, beveled corners catch environmental highlights unlike cubes.
  const p=new T.Shape();
  p.moveTo(-.46,-.29);p.lineTo(.43,-.29);p.lineTo(.51,-.19);
  p.lineTo(.51,.24);p.lineTo(.43,.30);p.lineTo(-.46,.30);
  p.lineTo(-.51,.23);p.lineTo(-.51,-.23);p.closePath();
  const g=new T.ExtrudeGeometry(p,{depth:.78,steps:1,bevelEnabled:true,
    bevelSegments:1,bevelSize:.035,bevelThickness:.035});
  g.translate(0,0,-.39);g.computeVertexNormals();return g;
}
function voussoir() {
  // One wedge is rotated around the arch's centre to build true stone courses.
  const half=ANGLE_STEP*.48,inner=2.36,outer=3.12;
  const s=new T.Shape();
  s.moveTo(Math.sin(-half)*inner,Math.cos(-half)*inner);
  s.lineTo(Math.sin(-half)*outer,Math.cos(-half)*outer);
  for(let i=1;i<=4;i++) {
    const angle=-half+2*half*i/4;
    s.lineTo(Math.sin(angle)*outer,Math.cos(angle)*outer);
  }
  for(let i=4;i>=0;i--) {
    const angle=-half+2*half*i/4;
    s.lineTo(Math.sin(angle)*inner,Math.cos(angle)*inner);
  }
  s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:.84,steps:1,bevelEnabled:true,
    bevelSize:.027,bevelThickness:.027,bevelSegments:1});
  g.translate(0,0,-.42);g.computeVertexNormals();return g;
}
function toothedGear() {
  // Physically cut centre, sixteen relief teeth and a shallow bronze rim.
  const teeth=16,shape=new T.Shape();
  for(let i=0;i<teeth*4;i++) {
    const a=i*Math.PI*2/(teeth*4);
    const radius=i%4===1||i%4===2?1.56:1.34;
    const x=Math.cos(a)*radius,y=Math.sin(a)*radius;
    if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }
  shape.closePath();
  const hole=new T.Path();hole.absarc(0,0,.61,0,Math.PI*2,true);
  shape.holes.push(hole);
  const g=new T.ExtrudeGeometry(shape,{depth:.23,bevelEnabled:true,
    bevelSize:.024,bevelThickness:.024,bevelSegments:1,curveSegments:16});
  g.translate(0,0,-.115);g.computeVertexNormals();return g;
}
function batch(scene,name,geometry,material,capacity) {
  const mesh=new T.InstancedMesh(geometry,material,capacity);
  mesh.name=name;mesh.visible=false;mesh.count=0;
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  scene.add(mesh);return mesh;
}

export class RuinLandmarks {
  constructor(scene,stonePbr) {
    this.scene=scene;
    const stone=new T.MeshStandardMaterial({...stonePbr,roughness:.94,
      metalness:0,color:'#c6c2b7'});
    this.blocks=batch(scene,'RUINS_PBR_JOINTED_MASONRY',
      masonryBlock(),stone,160);
    this.arch=batch(scene,'RUINS_PBR_VOUSSOIR_ARCHES',
      voussoir(),stone.clone(),100);
    this.tower=batch(scene,'RUINS_PBR_WATCHTOWER_COURSES',
      new T.CylinderGeometry(1.83,1.99,1.16,14,1),
      stone.clone(),25);
    this.gears=batch(scene,'RUINS_ROTATING_BRONZE_GEARS',
      toothedGear(),new T.MeshStandardMaterial({color:'#9f8055',
        metalness:.75,roughness:.42,envMapIntensity:.7}),15);
    this.meshes=[this.blocks,this.arch,this.tower,this.gears];
    // Keep these objects across animation frames to avoid per-frame colour and
    // collection allocations while ruins are moving past the camera.
    this.counts=new Map(this.meshes.map(mesh=>[mesh,0]));
    this.patinas={gearworks:new T.Color('#aea087'),watchtower:new T.Color('#a0b2a5'),
      causeway:new T.Color('#aaaba5'),ridge:new T.Color('#b5ada0')};
    this.stoneTint=new T.Color();
    // Pre-create instanced colour buffers before the GPU warm-up draw.
    // Otherwise first entering a ruins route changes shader defines mid-run.
    for(const mesh of [this.blocks,this.arch,this.tower])
      mesh.setColorAt(0,new T.Color('#ffffff'));
    this.stats={archStones:0,pierBlocks:0,towerCourses:0,rotatingGears:0};
    this.temp=new T.Matrix4();this.position=new T.Vector3();
    this.rotation=new T.Quaternion();this.scale=new T.Vector3();
    this.euler=new T.Euler();
  }
  setVisible(visible) {for(const mesh of this.meshes)mesh.visible=visible&&mesh.count>0;}
  put(mesh,counts,x,y,z,scaleX=1,scaleY=1,scaleZ=1,rz=0,tint) {
    const index=counts.get(mesh)||0;
    if(index>=mesh.instanceMatrix.count)return;
    this.position.set(x,y,z);
    this.euler.set(0,0,rz);this.rotation.setFromEuler(this.euler);
    this.scale.set(scaleX,scaleY,scaleZ);
    this.temp.compose(this.position,this.rotation,this.scale);
    mesh.setMatrixAt(index,this.temp);
    if(tint)mesh.setColorAt(index,tint);
    counts.set(mesh,index+1);
  }
  update(run,travel,offset,curve,surface,time=0,quality=1) {
    const route=run?.route;
    const visible=run?.board==='overgrown'&&run?.mode!=='chamber'
      &&RUIN_ROUTES.includes(route);
    if(!visible) {
      for(const mesh of this.meshes)mesh.count=0;
      this.stats={archStones:0,pierBlocks:0,towerCourses:0,rotatingGears:0};
      this.setVisible(false);return;
    }
    const counts=this.counts;
    for(const mesh of this.meshes)counts.set(mesh,0);
    const seed=SEEDS[route];
    const first=Math.ceil((travel+18)/36);
    const end=Math.floor((travel+(quality<.7?83:112))/36);
    for(let k=first;k<=Math.min(end,first+3);k++) {
      const distance=k*36,noise=hash(k*7+seed);
      const side=hash(k*17+seed)>.5?1:-1;
      const centre=offset(run,distance)+curve(distance)-curve(travel);
      const archX=centre+side*(9.65+noise*.65),z=travel-distance;
      const footLeft=surface(archX-2.73,distance);
      const footRight=surface(archX+2.73,distance);
      const base=Math.max(footLeft,footRight);
      const patina=this.patinas[route];
      // Articulated piers are always outside the three protected lanes.
      for(const direction of [-1,1]) {
        const bx=archX+direction*2.73;
        const columnBase=direction===-1?footLeft:footRight;
        for(let level=0;level<5;level++) {
          this.put(this.blocks,counts,bx+(level%2?.075:-.065),
            columnBase+.295+level*.48,z,.98,.78,.98,
            (hash(k*31+direction*13+level+seed)-.5)*.055,patina);
        }
      }
      // Individual keystone and voussoirs; causeway has deliberately
      // missing upper masonry, while ridge retains a more complete arch.
      for(let j=0;j<13;j++) {
        if(route==='causeway'&&(j===8||(k%3===0&&j===7)))continue;
        if(route==='ridge'&&k%5===0&&j===0)continue;
        const angle=-Math.PI/2+(j+.5)*ANGLE_STEP;
        this.put(this.arch,counts,archX,base+2.44,z,1,1,1,-angle,
          this.stoneTint.copy(patina).multiplyScalar(.86+hash(j*17+k*3+seed)*.18));
      }
      if(route==='watchtower'&&k%2===0) {
        const x=centre+side*(11.2+noise),floor=surface(x,distance);
        for(let tier=0;tier<6;tier++) {
          this.put(this.tower,counts,x,floor+.61+tier*1.16,z-.85,
            1-(tier*.019),1,1-(tier*.019),0,patina);
        }
        for(let parapet=0;parapet<8;parapet++) {
          const a=parapet*Math.PI/4;
          this.put(this.blocks,counts,x+Math.cos(a)*1.6,
            floor+7.22,z-.85+Math.sin(a)*1.6,.91,1.05,.9,a,patina);
        }
      }
      if(route==='gearworks') {
        const x=centre+side*(8.1+noise),floor=surface(x,distance);
        const spin=time*(side===1?.27:-.32)+k*.8;
        this.put(this.gears,counts,x,floor+4.45,z+.55,
          .88+noise*.2,.88+noise*.2,1,spin);
      }
    }
    for(const mesh of this.meshes) {
      mesh.count=counts.get(mesh);
      if(mesh.count) {
        mesh.instanceMatrix.needsUpdate=true;
        if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      }
      mesh.visible=mesh.count>0;
    }
    this.stats={
      archStones:this.arch.count,pierBlocks:this.blocks.count,
      towerCourses:this.tower.count,rotatingGears:this.gears.count
    };
  }
  dispose() {
    for(const mesh of this.meshes) {
      this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();
    }
  }
}
