import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('pngjs');
import * as THREE from '../public/blackroot/vendor/build/three.module.js';
import {MadgerHero} from '../public/blackroot/madger-hero.mjs';

const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(path.join(mobile,'assets/images/madger-mascot.webp'));
const shipped=readFileSync(path.join(mobile,'public/blackroot/assets/madger-official-face.webp'));
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const fixture=(options={})=>({
 board:'overgrown',route:'rootway',routeSide:-1,routeStart:140,routeEnd:450,
 mode:'running',distance:200,time:20,x:0,vx:0,y:0,slide:0,slideAge:0,
 lastHurt:-10,...options
});

test('approved facial reference is shipped unmodified, not replaced by invented artwork',()=>{
 assert.equal(sha(shipped),sha(source));
 assert(source.length>30000);
});

test('a genuine 3D articulated character replaces the legacy sphere-only silhouette',()=>{
 const scene=new THREE.Scene(),hero=new MadgerHero(scene,()=>0,new THREE.Texture());
 try{
   assert(hero.root.isGroup && hero.meshCount>=80);
   assert(hero.triangles>30000 && hero.triangles<100000);
   for(const name of ['center-cream-forehead-stripe','rear-head-blaze',
     'signature-back-V-left','signature-back-V-right',
     '3d-chevron-tail-mesh','approved-face-projection'])
     assert(hero.root.getObjectByName(name),name+' is missing');
   assert(hero.root.getObjectByName('approved-face-projection').geometry.attributes.position.count>700);
   const tail=hero.root.getObjectByName('3d-chevron-tail-mesh').geometry;
   assert(tail.attributes.position.count>1000);
   assert(tail.attributes.color.count===tail.attributes.position.count);
   assert(hero.tail.position.x>.2,'tail must be offset rather than a striped ball on the spine');
   assert.deepEqual(hero.clawCount,{hands:[5,5],feet:[5,5]});
 }finally{hero.dispose();}
});

test('run, idle, jump and burrow animate geometry without changing any saved game values',()=>{
 const scene=new THREE.Scene(),hero=new MadgerHero(scene,()=>-3,new THREE.Texture());
 try {
   for(const state of [
     fixture({mode:'ready',distance:0}),
     fixture({mode:'running',distance:200}),
     fixture({mode:'running',distance:202,y:.8}),
     fixture({mode:'running',distance:204,slide:.72,slideAge:.15}),
     fixture({mode:'paused',distance:204,slide:0})
   ]) {
     const before=structuredClone(state);
     hero.update(state,state.time,false);
     assert.deepEqual(state,before,'character rendering modified deterministic game state');
     assert(hero.root.visible && hero.shadow.visible);
     assert(hero.lastPose.approvedFace && hero.lastPose.backChevron);
     assert(hero.lastPose.patternedTail && hero.lastPose.rearCreamBlaze);
     assert(hero.lastPose.position.every(Number.isFinite));
     assert.equal(hero.lastPose.clawsPerPaw,5);
     assert(hero.root.position.x<-2,'route offset from the real game was lost');
   }
   hero.update(fixture({slide:.72}),40);
   assert(hero.lastPose.burrowing);
   hero.update(fixture({y:.9}),45);
   assert(hero.lastPose.jumping);
   const before=hero.tail.rotation.z;
   hero.update(fixture({y:0}),47);
   assert.notEqual(hero.tail.rotation.z,before,'tail animation was fixed');
 }finally{hero.dispose();}
});


test('native portrait is a decoder-compatible PNG with identical approved RGBA pixels',()=>{
 const bytes=readFileSync(path.join(mobile,'assets/images/madger-mascot-native.png'));
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const decoded=PNG.sync.read(bytes);
 assert.equal(decoded.width,1254);assert.equal(decoded.height,1254);
 // Hash of decoded approved WebP, independently checked with Pillow and sharp.
 assert.equal(sha(decoded.data),'deaedace5829d58ad744fe0fccba3fadeb264e7ba4c296c86fc2c8a4243f56b5');
});
