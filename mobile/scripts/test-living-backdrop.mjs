import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/blackroot/vendor/build/three.module.js';
import {LivingBackdrop,BACKDROP_INSTANCE_LIMIT,bankVisibility,canopyWind,canopyFade}
  from '../public/blackroot/living-backdrop.mjs';

const stone=()=>({map:new T.Texture(),normalMap:new T.Texture(),
  roughnessMap:new T.Texture(),normalScale:new T.Vector2(.8,.8)});
const centre=d=>Math.sin(d*.015)*1.7;
const state=(travel=300,time=10,biome='forest',quality=1)=>
  ({travel,time,biome,quality,centre});
const make=()=>new LivingBackdrop(new T.Scene(),stone());
const centres=(b,travel)=>{
  const found=new Map(),m=new T.Matrix4(),p=new T.Vector3();
  for(let i=0;i<b.hills.count;i++){
    b.hills.getMatrixAt(i,m);
    p.setFromMatrixPosition(m);
    // Correct absolute-distance identity, despite motion across camera.
    found.set(Math.round((travel-p.z)/24)+'/'+(p.x<0?-1:1),[p.x,p.y,p.z]);
  }
  return found;
};

test('sky and far terrain are stable GPU batches with real PBR maps',()=>{
  const b=make();
  try{
    b.update(state());
    assert.equal(b.sky.name,'LIVING_WORLD_LAYERED_SKY');
    assert(b.hills.isInstancedMesh&&b.hills.instanceMatrix.isInstancedBufferAttribute);
    assert(b.hills.material.map?.isTexture);
    assert(b.hills.material.normalMap?.isTexture);
    assert(b.hills.material.roughnessMap?.isTexture);
    assert.equal(b.hills.material.metalness,0);
    assert(b.hills.count>=5&&b.hills.count<=BACKDROP_INSTANCE_LIMIT);
    assert(b.sky.visible&&b.hills.visible);
    const geo=b.hills.geometry;
    assert(geo.attributes.position.count>200&&geo.attributes.position.count<600);
    assert.equal(geo.attributes.normal.count,geo.attributes.position.count);
    assert.equal(geo.attributes.uv.count,geo.attributes.position.count);
    assert(geo.attributes.position.array.every(Number.isFinite));
    assert(geo.attributes.normal.array.every(Number.isFinite));
    assert(geo.attributes.uv.array.every(Number.isFinite));
    assert(b.skyGeometry.attributes.color.array.every(Number.isFinite));
    assert.equal(b.sky.material.depthWrite,false);
    assert.equal(b.sky.material.fog,false);
  }finally{b.dispose();}
});
test('all distant PBR vertices clear the existing playable lane corridor',()=>{
  const b=make();
  try{
    for(const biome of ['forest','ruins']) {
      b.update(state(380,10,biome));
      const positions=b.hills.geometry.attributes.position;
      const m=new T.Matrix4(),v=new T.Vector3();
      for(let i=0;i<b.hills.count;i++){
        b.hills.getMatrixAt(i,m);
        for(let j=0;j<positions.count;j+=13){
          v.fromBufferAttribute(positions,j).applyMatrix4(m);
          const d=380-v.z;
          assert(Math.abs(v.x-centre(d))>7.5,'distant bank crossed protected lanes');
        }
      }
    }
  }finally{b.dispose();}
});
test('streamed geometry moves continuously at cell seams without randomized jumps',()=>{
  const b=make();
  try{
    b.update(state(311.94));const first=centres(b,311.94);
    b.update(state(312.06));const second=centres(b,312.06);
    let common=0;
    for(const [key,at] of first)if(second.has(key)){
      const next=second.get(key);common++;
      assert(Math.abs(next[0]-at[0])<.01,'bank horizontally teleported');
      assert(Math.abs(next[2]-at[2]-.12)<.01,'bank moved discontinuously');
    }
    assert(common>=5,'world-distance identities failed to survive a cell seam');
    assert.equal(bankVisibility(1),0);
    assert.equal(bankVisibility(150),0);
    assert(bankVisibility(75)>.97);
    assert(bankVisibility(146)<.1,'new distant terrain must ease in at horizon');
    assert.equal(canopyFade(9),0,'near scanned trees must disappear smoothly');
    assert.equal(canopyFade(96),0,'new canopy instance must appear at zero scale');
    assert(canopyFade(55)>.99,'detailed scanned trees must remain visible midground');
  }finally{b.dispose();}
});
test('living wind and shifting sky animate in elapsed world time without mutating gameplay',()=>{
  const b=make(),game={route:'ridge',time:18.1,distance:345.7,coins:72,
    heroShards:{snow:2,bot:1,gorilla:4},secrets:['moonwell']};
  const before=structuredClone(game);
  try{
    b.update({...state(game.distance,game.time,'ruins'),chamber:false});
    const first=Array.from(b.skyGeometry.attributes.color.array),updates=b.stats.skyColorUpdates;
    b.update({...state(game.distance,game.time,'ruins'),chamber:false});
    assert.equal(b.stats.skyColorUpdates,updates,'unnecessary sky upload');
    b.update({...state(game.distance,game.time+2,'ruins'),chamber:false});
    assert.notDeepEqual(Array.from(b.skyGeometry.attributes.color.array),first,
      'cloud banks cannot remain fixed in time');
    assert.equal(b.stats.skyAnimated,true);
    assert.deepEqual(game,before,'visual updates must not change rewards or saves');
    assert(Math.abs(canopyWind(10,300,4))<.04);
    assert.notEqual(canopyWind(10,300,4),canopyWind(11,300,4));
    assert.equal(canopyWind(NaN,300,4),0);
  }finally{b.dispose();}
});
test('low detail removes only distant terrain, while caverns and chambers hide sky',()=>{
  const scene=new T.Scene(),b=new LivingBackdrop(scene,stone());
  try{
    b.update(state(300,2,'forest',1));const full=b.hills.count;
    b.update(state(300,2,'forest',.50));
    assert(b.hills.count<full,'background must scale down without touching lanes');
    b.update(state(300,2,'cavern'));
    assert(!b.sky.visible&&!b.hills.visible&&b.hills.count===0);
    assert.equal(b.stats.skyAnimated,false,'cave sky animation must be disabled');
    b.update({...state(300,2,'ruins'),chamber:true});
    assert(!b.sky.visible&&!b.hills.visible);
    b.update(state(300,2,'ruins'));
    assert(b.sky.visible&&b.hills.visible);
  }finally{b.dispose();}
  assert.equal(scene.children.length,0,'scene resources leak between runs');
});
