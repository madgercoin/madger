import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/blackroot/vendor/build/three.module.js';
import {CavernVault} from '../public/blackroot/cavern-vault.mjs';

const materials=()=>({
 map:new T.Texture(),normalMap:new T.Texture(),
 roughnessMap:new T.Texture(),normalScale:new T.Vector2(.7,.7)
});
const run=(route,mode='paused')=>({
 board:'overgrown',route,mode,distance:350,
 routeStart:140,routeEnd:450,routeSide:1
});
test('real volumetric cave vault spans the course without entering playable lanes',()=>{
 const scene=new T.Scene(),vault=new CavernVault(scene,materials());
 try{
  const s=run('deep'),snapshot=structuredClone(s);
  vault.update(s,350,()=>0,()=>0);
  assert.deepEqual(s,snapshot,'visual-only geometry may not alter game state');
  assert(vault.mesh.visible && vault.triangles>=4000);
  const positions=vault.mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    for(const coordinate of [positions.getX(i),positions.getY(i),positions.getZ(i)])
      assert(Number.isFinite(coordinate));
  }
  const radial=vault.radial;
  const first=positions;
  const left=first.getX(0),right=first.getX(radial),crown=first.getY(radial/2);
  assert(left<-7.5 && right>7.5 && crown>7,'tunnel must cover the entire running corridor');
  const before=positions.getY(radial/2);
  vault.update(s,366,()=>0,()=>0);
  assert.notEqual(positions.getY(radial/2),before,'rock strata must update as the camera moves');
  assert.equal(positions.getZ(0),23,'near vault end remains correctly camera-relative');
 }finally{vault.dispose();}
});
test('cavern hides outside underground routes and inside secret chambers',()=>{
 const scene=new T.Scene(),vault=new CavernVault(scene,materials());
 try{
  for(const route of ['main','rootway','ridge','gearworks']){
    vault.update(run(route),300,()=>0,()=>0);assert.equal(vault.mesh.visible,false,route);
  }
  vault.update(run('mudslide'),510,()=>0,()=>0);
  assert(vault.mesh.visible);
  vault.update(run('mudslide','chamber'),510,()=>0,()=>0);
  assert(!vault.mesh.visible);
 }finally{vault.dispose();}
});