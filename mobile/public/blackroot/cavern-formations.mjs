/* Camera-relative, authored cavern geological detail.
 * Visual only: never touches course lanes, hazards, saved checkpoints, or UI.
 * Two GPU instanced draw calls for route-specific formations; PBR rock reuses
 * the licensed stone maps already loaded by the forest renderer.
 */
import * as T from './vendor/build/three.module.js';

export const CAVERN_ROUTES=Object.freeze([
  'deep','mudslide','crystal-vein','ancient-vault','hollow','grotto'
]);
const hash=n=>{const x=Math.sin(n*127.31+31.1)*43758.55;return x-Math.floor(x);};
const seedOf=route=>[...route].reduce((n,c)=>n*31+c.charCodeAt(0),7)%10007;
const quartzRoutes=new Set(['crystal-vein','ancient-vault','grotto']);

/** Forged limestone with an uneven silhouette, shoulders and erosion rings.
 * Local top is y=0, tip is y=-1, so attachment remains above the hero.
 */
function formationGeometry(crystal=false) {
  const radial=crystal?6:9,rings=crystal?5:9;
  const positions=[],uv=[],indices=[];
  for(let j=0;j<=rings;j++){
    const t=j/rings;
    const width=crystal
      ? (t<.16?.31+1.05*t : .48*Math.pow(Math.max(0,1-t),.78)+.014)
      : .48*Math.pow(Math.max(0,1-t),1.28)+.015
        +.025*Math.sin(t*26)*Math.max(0,1-t);
    for(let i=0;i<=radial;i++){
      const a=i/radial*Math.PI*2;
      const ridges=crystal?1:1+.085*Math.sin(a*5.0+t*17)+.075*Math.cos(a*7-t*21);
      const bend=(crystal?.05:.14)*t*t;
      positions.push(Math.cos(a)*width*ridges+bend, -t,
        Math.sin(a)*width*ridges+(crystal?.03:.10)*t*t);
      uv.push(i/radial*1.5,t*2.2);
      if(j<rings&&i<radial){
        const top=j*(radial+1)+i,lower=top+radial+1;
        indices.push(top,top+1,lower,top+1,lower+1,lower);
      }
    }
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
  return g;
}

export function caveCeilingY(distance,lateral,routeSeed=0){
  // Matches the existing vault cross-section; ignore small per-vertex noise.
  const normalized=Math.min(.88,Math.abs(lateral)/8.65);
  const a=Math.asin(normalized)*(lateral<0?-1:1);
  const crown=8.2+.28*Math.sin(distance*.13);
  return -.44+crown*Math.cos(a)
    +.31*Math.cos(distance*.29+a*11)*(1-.45*Math.abs(normalized))
    -Math.abs(normalized)*.32
    +.035*Math.sin(routeSeed*.03+distance*.23);
}

export class CavernFormations {
  constructor(scene,stonePbr){
    this.scene=scene;
    this.stone=new T.InstancedMesh(formationGeometry(false),
      new T.MeshStandardMaterial({...stonePbr,color:'#b0b9af',roughness:.95,metalness:0}),72);
    this.quartz=new T.InstancedMesh(formationGeometry(true),
      new T.MeshStandardMaterial({color:'#71bbbe',metalness:.15,roughness:.34,envMapIntensity:1.05}),34);
    this.stone.name='CAVERN_PBR_STALACTITES';
    this.quartz.name='CAVERN_MINERAL_SEAMS';
    for(const mesh of [this.stone,this.quartz]){
      mesh.visible=false;mesh.count=0;mesh.frustumCulled=false;
      mesh.castShadow=false;mesh.receiveShadow=true;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      scene.add(mesh);
    }
    this.stoneCount=0;this.quartzCount=0;this.maxTriangles=0;
  }
  setVisible(visible){
    this.stone.visible=visible;
    this.quartz.visible=visible&&this.quartzCount>0;
  }
  update(run,travel,offset,curve){
    const route=run.route;
    const underground=CAVERN_ROUTES.includes(route)&&run.mode!=='chamber'&&run.board==='overgrown';
    if(!underground){this.setVisible(false);return;}
    const seed=seedOf(route);
    const step=5;
    const start=Math.floor((travel-17)/step)*step;
    let stones=0,minerals=0;
    const matrix=new T.Matrix4(),position=new T.Vector3();
    const rotation=new T.Quaternion(),scale=new T.Vector3(),euler=new T.Euler();
    for(let d=start;d<=travel+108;d+=step){
      const n=Math.round(d/step);
      for(const side of [-1,1]){
        const key=n*79+side*127+seed*3;
        const chance=hash(key+3);
        const mineral=quartzRoutes.has(route)&&hash(key+89)>(route==='crystal-vein'?.62:.83);
        if(chance<.22&&!mineral)continue;
        const lateral=side*(4.9+hash(key+5)*1.7);
        const x=offset(run,d)+curve(d)-curve(travel)+lateral;
        const ceiling=caveCeilingY(d,lateral,seed);
        const length=Math.min(.95+hash(key+11)*1.8,ceiling-3.4);
        if(length<.45)continue; // Never place hanging rock in the hero airspace.
        const useQuartz=mineral&&minerals<this.quartz.instanceMatrix.count;
        const mesh=useQuartz?this.quartz:this.stone;
        const index=useQuartz?minerals:stones;
        if(index>=mesh.instanceMatrix.count)continue;
        const girth=(useQuartz?.65:.84)+hash(key+17)*.52;
        position.set(x,ceiling-.06,travel-d);
        euler.set(0,hash(key+23)*Math.PI*2,(hash(key+29)-.5)*.12);
        rotation.setFromEuler(euler);
        scale.set(girth,length,girth);
        matrix.compose(position,rotation,scale);
        mesh.setMatrixAt(index,matrix);
        mesh.setColorAt(index,new T.Color(useQuartz
          ? (route==='ancient-vault'?'#c6a86d':'#7bcaca')
          : (route==='mudslide'?'#80918a':'#9eada7')));
        if(useQuartz)minerals++;else stones++;
      }
    }
    this.stone.count=stones;this.quartz.count=minerals;
    this.stone.instanceMatrix.needsUpdate=true;this.quartz.instanceMatrix.needsUpdate=true;
    if(this.stone.instanceColor)this.stone.instanceColor.needsUpdate=true;
    if(this.quartz.instanceColor)this.quartz.instanceColor.needsUpdate=true;
    this.stoneCount=stones;this.quartzCount=minerals;
    this.maxTriangles=stones*this.stone.geometry.index.count/3
      +minerals*this.quartz.geometry.index.count/3;
    this.setVisible(true);
  }
  dispose(){
    for(const mesh of [this.stone,this.quartz]){
      this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();
    }
  }
}
