import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/blackroot/vendor/build/three.module.js';
import {CavernVault} from '../public/blackroot/cavern-vault.mjs';
import {CAVERN_ROUTES,caveCeilingY} from '../public/blackroot/cavern-formations.mjs';

const material=()=>({
  map:new T.Texture(),normalMap:new T.Texture(),
  roughnessMap:new T.Texture(),normalScale:new T.Vector2(.7,.7)
});
const run=route=>({board:'overgrown',mode:'running',route,
  distance:400,coins:345,routeStart:120,routeEnd:850,routeSide:1});
const make=()=>new CavernVault(new T.Scene(),material());
const offset=(_run,d)=>Math.sin(d*.008)*2.4;
const curve=d=>Math.cos(d*.016)*.8;

test('six underground routes grow PBR geometry above clear playable lanes',()=>{
  assert.equal(CAVERN_ROUTES.length,6);
  for(const route of CAVERN_ROUTES){
    const vault=make();
    try{
      const state=run(route),frozen=structuredClone(state);
      vault.update(state,400,offset,curve);
      assert.deepEqual(state,frozen,'visual-only formations must not alter saves/game state');
      const detail=vault.formations;
      assert(vault.mesh.visible && detail.stone.visible,route);
      assert(detail.stoneCount>=12 && detail.stoneCount<=72,route+' limestone detail missing/budget exceeded');
      assert(detail.quartzCount<=34,route+' mineral budget exceeded');
      assert(detail.maxTriangles<=17000,route+' geometry exceeds conservative mobile detail budget');
      assert.equal(detail.stone.material.map!==null,true,'PBR rock map missing');
      assert.equal(detail.stone.material.normalMap!==null,true,'stone normal map missing');
      for(const mesh of [detail.stone,detail.quartz]){
        assert(mesh.isInstancedMesh,'must use instancing rather than per-formation draw calls');
        assert(mesh.geometry.attributes.normal?.count>30,'formation needs authored silhouette');
        for(let i=0;i<mesh.count;i++){
          const transform=new T.Matrix4();
          const pos=new T.Vector3(),rot=new T.Quaternion(),scale=new T.Vector3();
          mesh.getMatrixAt(i,transform);transform.decompose(pos,rot,scale);
          assert([pos.x,pos.y,pos.z,scale.x,scale.y,scale.z].every(Number.isFinite),route);
          // Top of each spike is mounted to the vault, tip kept > 3m above lanes.
          assert(pos.y-scale.y>3.13,route+' spike obstructs jump clearance');
          assert(Math.abs(pos.x-offset(state,400-pos.z)-curve(400-pos.z)+curve(400))>=4.75,
            route+' geological prop intrudes into playable lane');
        }
      }
    }finally{vault.dispose();}
  }
});

test('crystal routes are identifiable and formation placement is repeatable',()=>{
  for(const route of ['deep','crystal-vein','grotto']){
    const v=make();
    try{
      const state=run(route),travel=450;
      v.update(state,travel,offset,curve);
      const first=v.formations;
      const sample=Array.from(first.stone.instanceMatrix.array.slice(0,16));
      const count=first.stoneCount;
      v.update(state,travel+2,offset,curve);
      v.update(state,travel,offset,curve);
      assert.equal(first.stoneCount,count,route);
      assert.deepEqual(Array.from(first.stone.instanceMatrix.array.slice(0,16)),sample,route);
      if(route==='crystal-vein'||route==='grotto') assert(first.quartzCount>0,route+' crystal signature lost');
      else assert.equal(first.quartzCount,0,'standard limestone path cannot inherit crystal seam');
    }finally{v.dispose();}
  }
  assert(caveCeilingY(140,6.6)>4.2);
});

test('ground/secret-chamber transitions hide geological meshes and disposal reclaims scene objects',()=>{
  const scene=new T.Scene(),v=new CavernVault(scene,material());
  const root=run('rootway'),cave=run('mudslide');
  try{
    v.update(cave,420,offset,curve);
    assert(v.formations.stone.visible);
    v.update(root,423,offset,curve);
    assert(!v.formations.stone.visible && !v.formations.quartz.visible);
    v.update({...cave,mode:'chamber'},423,offset,curve);
    assert(!v.formations.stone.visible);
    v.update(cave,426,offset,curve);
    assert(v.formations.stone.visible);
  }finally{v.dispose();}
  assert.equal(scene.children.length,0,'graphics resources should be removed on exit');
});
