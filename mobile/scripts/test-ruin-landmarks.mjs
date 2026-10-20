import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/blackroot/vendor/build/three.module.js';
import { RuinLandmarks, RUIN_ROUTES } from '../public/blackroot/ruin-landmarks.mjs';

const stone=()=>({map:new T.Texture(),normalMap:new T.Texture(),
  roughnessMap:new T.Texture(),normalScale:new T.Vector2(.8,.8)});
const run=route=>({board:'overgrown',mode:'running',route,time:7,
  routeStart:120,routeEnd:850,routeSide:1});
const offset=(_state,d)=>Math.sin(d*.008)*1.2;
const curve=d=>Math.sin(d*.02)*.5;
const surface=(x,d)=>-.33+Math.max(0,(Math.abs(x)-4)/10)*(.9+.15*Math.sin(d*.13));
const make=()=>new RuinLandmarks(new T.Scene(),stone());

test('four ruins routes have four GPU-instanced, mapped PBR architecture types',()=>{
  assert.deepEqual([...RUIN_ROUTES].sort(),['causeway','gearworks','ridge','watchtower']);
  for(const route of RUIN_ROUTES) {
    const environment=make(),state=run(route),snapshot=structuredClone(state);
    try {
      environment.update(state,330,offset,curve,surface,7,1);
      assert.deepEqual(state,snapshot,'rendering cannot alter deterministic route or save');
      const s=environment.stats;
      assert(s.archStones>=15 && s.archStones<=100,route+' arch stones absent/budget exceeded');
      assert(s.pierBlocks>=10 && s.pierBlocks<=160,route+' piers absent/budget exceeded');
      assert(s.rubbleStones>=4 && s.rubbleStones<=20,route+' collapsed masonry missing or over budget');
      assert(s.pierBlocks>=s.rubbleStones+10,route+' rubble displaced intact piers');
      assert(s.towerCourses<=25 && s.rotatingGears<=15,route+' mobile instance cap exceeded');
      assert.equal(s.towerCourses>0,route==='watchtower',route+' tower identity');
      assert.equal(s.rotatingGears>0,route==='gearworks',route+' machinery identity');
      assert(environment.blocks.material.map?.isTexture,route+' diffuse PBR missing');
      assert(environment.arch.material.normalMap?.isTexture,route+' normal PBR missing');
      assert(environment.arch.material.roughnessMap?.isTexture,route+' roughness PBR missing');
      for(const mesh of environment.meshes) {
        assert(mesh.isInstancedMesh && mesh.frustumCulled===false,route+' instancing');
        assert(mesh.geometry.attributes.normal?.count>=20,route+' faceted silhouette');
        assert(mesh.count<=mesh.instanceMatrix.count,route+' unsafe GPU buffer');
        assert.equal(mesh.visible,mesh.count>0);
        for(let i=0;i<mesh.count;i++) {
          const matrix=new T.Matrix4();mesh.getMatrixAt(i,matrix);
          assert([...matrix.elements].every(Number.isFinite),route+' invalid transform');
        }
      }
      // Architecture lives on the outer bank, not inside any of the three
      // flat gameplay lanes; verify actual transformed mesh vertex positions.
      for(const mesh of environment.meshes) {
        const positions=mesh.geometry.attributes.position,m=new T.Matrix4(),v=new T.Vector3();
        for(let i=0;i<mesh.count;i++) {
          mesh.getMatrixAt(i,m);
          for(let j=0;j<positions.count;j+=Math.max(1,Math.floor(positions.count/25))) {
            v.fromBufferAttribute(positions,j).applyMatrix4(m);
            const d=330-v.z;
            const centre=offset(state,d)+curve(d)-curve(330);
            assert(Math.abs(v.x-centre)>4.1,route+' masonry enters a running lane');
          }
        }
      }
    }finally{environment.dispose();}
  }
});

test('scenery deterministically rebuilds at same time, and lower graphics scale culls distance',()=>{
  const e=make(),state=run('ridge');
  try {
    e.update(state,330,offset,curve,surface,8,1);
    const high=e.arch.count,reference=Array.from(e.arch.instanceMatrix.array.slice(0,high*16));
    const colors=Array.from(e.arch.instanceColor.array.slice(0,high*3));
    const counts=e.counts,patina=e.patinas.ridge,tint=e.stoneTint;
    e.update(state,330,offset,curve,surface,8,1);
    assert.deepEqual(Array.from(e.arch.instanceMatrix.array.slice(0,high*16)),reference);
    assert.deepEqual(Array.from(e.arch.instanceColor.array.slice(0,high*3)),colors,
      'PBR stone colours must remain deterministic without per-frame colour clones');
    assert.equal(e.counts,counts,'animated scenery should reuse its instance counter');
    assert(e.stats.rubbleStones>0,'scattered PBR ruins must survive repeated scene updates');
    assert.equal(e.patinas.ridge,patina,'route colours should be cached');
    assert.equal(e.stoneTint,tint,'arch tint scratch should be reused');
    e.update(state,330,offset,curve,surface,8,.55);
    assert(e.arch.count<high,'low-end phones must not draw far arches');
    e.update({...state,mode:'chamber'},330,offset,curve,surface,8,1);
    assert(e.meshes.every(mesh=>!mesh.visible),'chambers cannot show surface ruins');
    e.update(run('rootway'),330,offset,curve,surface,8,1);
    assert(e.meshes.every(mesh=>!mesh.visible),'forest cannot show ruin architecture');
    assert.equal(e.stats.rubbleStones,0,'route transitions must clear ruin debris');
  }finally{e.dispose();}
});
test('gearwork machinery rotates visually without changing route progress',()=>{
  const scene=new T.Scene(),e=new RuinLandmarks(scene,stone()),state=run('gearworks');
  try{
    e.update(state,330,offset,curve,surface,3,1);
    assert(e.gears.count>0);
    const first=Array.from(e.gears.instanceMatrix.array.slice(0,16));
    e.update(state,330,offset,curve,surface,4,1);
    const next=Array.from(e.gears.instanceMatrix.array.slice(0,16));
    assert.notDeepEqual(first,next,'gears should animate');
  }finally{e.dispose();}
  assert.equal(scene.children.length,0,'GPU resources must be detached on disposal');
});

test('weathered stone remains deterministic, UV-mapped and geometry-budgeted',()=>{
  const a=make(),b=make();
  try{
    assert.equal(a.meshes.length,4,'erosion cannot add GPU draw batches');
    for(const key of ['blocks','arch']) {
      const first=a[key].geometry,second=b[key].geometry;
      const positions=first.getAttribute('position');
      const normals=first.getAttribute('normal'),uvs=first.getAttribute('uv');
      assert(positions.count>50 && positions.count<2000,key+' topology budget');
      assert.equal(normals.count,positions.count,key+' broken normals');
      assert.equal(uvs.count,positions.count,key+' broken PBR mapping');
      assert(positions.array.every(Number.isFinite),key+' invalid displacement');
      assert(normals.array.every(Number.isFinite),key+' invalid shading');
      assert.deepEqual([...positions.array],[...second.getAttribute('position').array],
        key+' weathering must reproduce the same geometry every load');
      assert(first.boundingSphere?.radius>0 && Number.isFinite(first.boundingSphere.radius),
        key+' missing finite culling sphere');
      assert(uvs.array.every(Number.isFinite),key+' invalid PBR UV coordinates');
      const p=new T.Vector3(),q=new T.Vector3(),r=new T.Vector3();
      const edgeA=new T.Vector3(),edgeB=new T.Vector3();
      let soundFaces=0;
      for(let index=0;index+2<positions.count;index+=3) {
        p.fromBufferAttribute(positions,index);
        q.fromBufferAttribute(positions,index+1);
        r.fromBufferAttribute(positions,index+2);
        const areaSq=edgeA.subVectors(q,p).cross(edgeB.subVectors(r,p)).lengthSq();
        if(areaSq>1e-10)soundFaces++;
      }
      assert(soundFaces>positions.count/6,key+' stone surface degenerated');
    }
  }finally{a.dispose();b.dispose();}
});
