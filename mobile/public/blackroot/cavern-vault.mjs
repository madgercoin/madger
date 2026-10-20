/* Overgrown Burrow underground: continuous physically lit rock vault.
 * The geometry is a purely visual authored surface. Course physics, gaps,
 * collision corridors, secrets and checkpoint serialization are unchanged.
 */
import * as T from './vendor/build/three.module.js';
import { CavernFormations } from './cavern-formations.mjs';
const THREE_PI=Math.PI;
const hash=n=>{const x=Math.sin(n*127.31+31.1)*43758.55;return x-Math.floor(x);};
export class CavernVault {
  constructor(scene,stonePbr) {
    const radial=40,longitudinal=56;
    this.radial=radial;this.longitudinal=longitudinal;
    const count=(radial+1)*(longitudinal+1);
    const positions=new Float32Array(count*3);
    const colors=new Float32Array(count*3),uvs=new Float32Array(count*2),indices=[];
    for(let d=0;d<=longitudinal;d++)for(let a=0;a<=radial;a++){
      const i=d*(radial+1)+a;
      uvs[2*i]=a/radial*5;
      uvs[2*i+1]=d*.35;
    }
    for(let d=0;d<longitudinal;d++)for(let a=0;a<radial;a++){
      const i=d*(radial+1)+a,k=i+radial+1;
      indices.push(i,k,i+1,i+1,k,k+1);
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.BufferAttribute(positions,3));
    geometry.setAttribute('color',new T.BufferAttribute(colors,3));
    geometry.setAttribute('uv',new T.BufferAttribute(uvs,2));
    geometry.setIndex(indices);
    const material=new T.MeshStandardMaterial({
      ...stonePbr,roughness:1,color:'#bec8c7',vertexColors:true,side:T.DoubleSide
    });
    material.normalScale.set(.72,.72);
    this.mesh=new T.Mesh(geometry,material);
    this.mesh.name='CONTINUOUS_SCANNED_PBR_CAVERN_VAULT';
    this.mesh.frustumCulled=false;this.mesh.castShadow=false;
    this.mesh.receiveShadow=true;this.mesh.visible=false;
    this.scene=scene;scene.add(this.mesh);
    this.formations=new CavernFormations(scene,stonePbr);
    this.lastTravel=-10000;this.lastRoute=null;
    this.triangles=indices.length/3;
  }
  update(run,travel,offset,curve) {
    const cavern=['deep','mudslide','crystal-vein','ancient-vault','hollow','grotto'].includes(run.route);
    const visible=cavern&&run.mode!=='chamber'&&run.board==='overgrown';
    this.mesh.visible=visible;
    this.formations.setVisible(visible);
    if(!visible)return;
    if(this.lastRoute===run.route&&Math.abs(travel-this.lastTravel)<1.7)return;
    this.lastRoute=run.route;this.lastTravel=travel;
    const radial=this.radial,longitudinal=this.longitudinal;
    const position=this.mesh.geometry.attributes.position;
    const tint=this.mesh.geometry.attributes.color;
    const uv=this.mesh.geometry.attributes.uv;
    const start=travel-23;
    for(let j=0;j<=longitudinal;j++){
      const d=start+j*2.52,z=travel-d;
      const road=offset(run,d)+curve(d)-curve(travel);
      for(let i=0;i<=radial;i++){
        const k=j*(radial+1)+i;
        const a=-THREE_PI/2+THREE_PI*i/radial;
        const edge=Math.abs(Math.sin(a));
        const strata=.24*Math.sin(d*.17+a*7)
          +.18*Math.sin(d*.37-a*4.7)+.09*Math.sin(d*.63+a*15);
        const fine=(hash(j*71+i*13)-.5)*.13;
        const radius=8.65+strata+fine;
        const x=road+radius*Math.sin(a);
        const crown=8.2+.28*Math.sin(d*.13);
        const y=-.44+crown*Math.max(0,Math.cos(a))
          +.31*Math.cos(d*.29+a*11)*(1-.45*edge)
          -edge*.32;
        position.setXYZ(k,x,y,z);
        // Damp slate walls and warm mineral highlights follow strata,
        // while keeping the traversable track and hazard edges readable.
        const patch=.85+.07*Math.sin(d*.11+a*13)+.07*(hash(j*7+i*23)-.5);
        const light=.68+.26*(1-edge);
        tint.setXYZ(k,patch*light*.68,patch*light*.77,patch*light*.79);
        uv.setXY(k,i/radial*5,d*.18);
      }
    }
    position.needsUpdate=tint.needsUpdate=uv.needsUpdate=true;
    this.mesh.geometry.computeVertexNormals();
    this.formations.update(run,travel,offset,curve);
  }
  dispose(){
    this.formations.dispose();
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();this.mesh.material.dispose();
  }
}