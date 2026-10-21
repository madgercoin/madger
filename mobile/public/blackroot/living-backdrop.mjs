/* Streamed, GPU-instanced PBR backdrop for the existing MADGER 3D world.
 * Noninteractive: never reads/writes gameplay, collisions, routes or saves.
 * Stable absolute-distance placement and soft edges prevent scenery popping.
 * One outdoor sky draw + one mapped far-bank draw, with a mobile LOD cap.
 */
import * as T from './vendor/build/three.module.js';

const SKY=Object.freeze({
  forest:{zenith:'#29506a',middle:'#86afb6',horizon:'#d9d4b2',cloud:'#e4e9d6'},
  ruins:{zenith:'#354d63',middle:'#a3ac9d',horizon:'#dfcaab',cloud:'#d8ddcc'},
});
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x);};
const hash=n=>{const v=Math.sin(n*127.13+37.7)*43758.5453;return v-Math.floor(v);};
export const BACKDROP_INSTANCE_LIMIT=20;
export function bankVisibility(distance,far=149) {
  if(!Number.isFinite(distance)||distance<=2||distance>=far)return 0;
  return smooth((distance-2)/17)*smooth((far-distance)/24);
}
export function canopyFade(ahead) {
  if(!Number.isFinite(ahead))return 0;
  // Exactly zero at the visible stream's far/near boundaries, preventing a
  // photographically detailed tree from materializing at the cell boundary.
  return smooth((ahead-9)/14)*smooth((96-ahead)/16);
}
export function canopyWind(time,distance,phase=0) {
  if(![time,distance,phase].every(Number.isFinite))return 0;
  return .028*Math.sin(time*.79+distance*.083+phase)
    +.010*Math.sin(time*1.61+distance*.027+phase*.7);
}
// A single UV'd sloped terrain shell: no blocky stack silhouettes, collision
// surfaces or physics proxies. Artfully irregular, deterministic and bounded.
function hillGeometry() {
  // More sampled crest and erosion normals retain a readable near/mid/far silhouette.
  // Still a single bounded instanced PBR draw and outside all gameplay lanes.
  const g=new T.PlaneGeometry(2,2,30,18);
  g.rotateX(-Math.PI/2);
  const p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i);
    const shoulder=Math.pow(Math.max(0,1-Math.abs(x)),.58);
    // Several geological bands and asymmetric crests break up the old
    // repeated tent-shaped silhouette without adding material or draw calls.
    const crest=.49+.18*Math.sin(x*5.7+z*.9)+.13*Math.cos(x*12.9-z*2.9)
      +.075*Math.sin(x*22.2+z*7.1)+.040*Math.cos(x*37.1-z*13.4);
    const fractured=.052*Math.sin(x*19.1+z*24.5)*Math.cos(z*12.1-x*13.7)
      +.032*Math.sin(x*40.4-z*9.4)*Math.sin(z*26.1+x*11.9);
    const strata=.034*Math.cos((z+1)*15.6+x*8.4);
    const y=Math.max(0,shoulder*(crest+fractured+strata));
    p.setY(i,y);uv.setXY(i,(x+1)*3.1,(z+1)*3.2);
  }
  p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export class LivingBackdrop {
  constructor(scene,stonePbr) {
    this.scene=scene;
    this.skyGeometry=new T.SphereGeometry(138,48,18);
    this.skyGeometry.setAttribute('color',new T.Float32BufferAttribute(
      new Float32Array(this.skyGeometry.attributes.position.count*3),3));
    this.sky=new T.Mesh(this.skyGeometry,new T.MeshBasicMaterial({
      vertexColors:true,side:T.BackSide,depthTest:false,depthWrite:false,fog:false
    }));
    this.sky.name='LIVING_WORLD_LAYERED_SKY';this.sky.renderOrder=-200;
    scene.add(this.sky);
    this.hills=new T.InstancedMesh(hillGeometry(),new T.MeshStandardMaterial({
      ...stonePbr,color:'#adb4a1',roughness:.97,metalness:0,envMapIntensity:.3
    }),BACKDROP_INSTANCE_LIMIT);
    this.hills.name='LIVING_WORLD_PBR_HILLS';
    this.hills.count=0;this.hills.frustumCulled=false;
    this.hills.castShadow=false;this.hills.receiveShadow=false;
    this.hills.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.matrix=new T.Matrix4();this.position=new T.Vector3();
    this.rotation=new T.Quaternion();this.scale=new T.Vector3();
    this.euler=new T.Euler();this.scratchColor=new T.Color();
    this.high=new T.Color();this.mid=new T.Color();
    this.low=new T.Color();this.cloud=new T.Color();
    this.skyBiome=null;this.lastSkyTime=-Infinity;
    this.hills.setColorAt(0,new T.Color('#ffffff')); // shader variant prewarm
    scene.add(this.hills);
    this.stats={landforms:0,skyAnimated:false,skyVisible:false,skyColorUpdates:0};
    this.update({biome:'forest',travel:0,time:0,centre:()=>0,quality:1});
  }
  colorSky(biome,time) {
    const palette=SKY[biome]||SKY.forest;
    this.high.set(palette.zenith);this.mid.set(palette.middle);
    this.low.set(palette.horizon);this.cloud.set(palette.cloud);
    const p=this.skyGeometry.attributes.position,c=this.skyGeometry.attributes.color;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const elevation=clamp((y/138+.07)*1.7);
      this.scratchColor.copy(this.low).lerp(this.mid,smooth(elevation*1.7));
      this.scratchColor.lerp(this.high,smooth((elevation-.38)*1.36));
      // Wispy cloud banks move slowly, coherently, without new textures,
      // per-pixel noise shaders or costly transparent planes over the phone.
      const direction=Math.atan2(z,x),drift=time*.032;
      const cloudBand=smooth((elevation-.16)*5)*smooth((.82-elevation)*4);
      const wave=Math.sin(direction*10.0+drift+Math.sin(elevation*15)*.8)
        *Math.sin(direction*4.4-time*.017+elevation*19);
      const opacity=cloudBand*smooth((wave+.3)*1.7)*.29;
      this.scratchColor.lerp(this.cloud,opacity);
      c.setXYZ(i,this.scratchColor.r,this.scratchColor.g,this.scratchColor.b);
    }
    c.needsUpdate=true;this.stats.skyColorUpdates++;
  }
  update({biome='forest',travel=0,time=0,centre=()=>0,quality=1,chamber=false}={}) {
    const outdoor=!chamber&&(biome==='forest'||biome==='ruins');
    this.sky.visible=outdoor;this.hills.visible=outdoor;
    this.stats.skyVisible=outdoor;
    if(!outdoor){this.hills.count=0;this.stats.landforms=0;
      this.stats.skyAnimated=false;return;}
    const clock=Number.isFinite(time)?time:0,d=Number.isFinite(travel)?travel:0;
    this.sky.position.set(centre(d),1,0);
    if(this.skyBiome!==biome||Math.abs(clock-this.lastSkyTime)>.17){
      this.colorSky(biome,clock);this.skyBiome=biome;this.lastSkyTime=clock;
    }
    const end=quality<.65?109:149;
    const start=Math.floor((d-24)/24),stop=Math.ceil((d+end+24)/24);
    let count=0;
    for(let n=start;n<=stop;n++)for(const side of [-1,1]){
      const position=n*24,forward=position-d,fade=bankVisibility(forward,end);
      if(fade<.035)continue;
      const seed=n*71+side*17+(biome==='ruins'?89:13);
      const r=hash(seed),r2=hash(seed+11);
      const width=8.5+r*3.4,height=7.1+r2*4.4,depth=14+r2*4;
      // At least nine metres from the playable centerline even after yaw.
      const x=centre(position)+side*(22+r*3.1);
      this.position.set(x,-.45,d-position);
      this.euler.set(0,(r-.5)*.15,0);
      this.rotation.setFromEuler(this.euler);
      this.scale.set(width*fade,height*fade,depth*fade);
      this.matrix.compose(this.position,this.rotation,this.scale);
      this.hills.setMatrixAt(count,this.matrix);
      this.scratchColor.set(biome==='ruins'?'#a5a392':'#779187');
      this.scratchColor.multiplyScalar(.86+r*.19);
      this.hills.setColorAt(count,this.scratchColor);
      count++;
      if(count>=BACKDROP_INSTANCE_LIMIT)break;
    }
    this.hills.count=count;
    this.hills.instanceMatrix.needsUpdate=true;
    this.hills.instanceColor.needsUpdate=true;
    this.stats.landforms=count;
    this.stats.skyAnimated=Number.isFinite(clock)&&clock!==0;
  }
  dispose() {
    for(const mesh of [this.sky,this.hills]){
      this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();
      mesh.dispose?.();
    }
  }
}
