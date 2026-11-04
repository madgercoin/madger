import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('pngjs');
import * as THREE from '../public/blackroot/vendor/build/three.module.js';
import {MadgerHero,sampleFootGait,creamCoatAt} from '../public/blackroot/madger-hero.mjs';

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

test('modeled facial anatomy replaces the failed photograph projection',()=>{
 const portrait=new THREE.Texture(),hero=new MadgerHero(new THREE.Scene(),()=>0,portrait);
 try{
   assert(hero.root.isGroup);
   assert(hero.triangles>20000 && hero.triangles<55000);
   assert(hero.renderMeshCount<=28,'rigid batching must bound hero submissions');
   assert.equal(hero.root.getObjectByName('approved-face-projection'),undefined);
   const meshes=[];hero.root.traverse(node=>{if(node.isMesh)meshes.push(node);});
   assert(meshes.every(node=>node.material.map!==portrait),'full portrait must never be rendered on skin');
   for(const name of ['projecting-short-muzzle','projecting-triangular-nose','left-amber-iris','right-amber-iris','left-cheek-ruff','right-cheek-ruff','3d-chevron-tail-mesh'])
     assert(hero.root.getObjectByName(name),name+' missing');
   assert.equal(meshes.filter(node=>/^(left|right)-ear-rim$/.test(node.name)).length,2,'only two volumetric ears');
   const nose=hero.root.getObjectByName('projecting-triangular-nose');
   assert(nose.position.z<-.65,'side profile needs a genuinely projecting nose');
   const muzzle=hero.root.getObjectByName('projecting-short-muzzle');
   muzzle.geometry.computeBoundingBox();
   assert(muzzle.geometry.boundingBox.min.z<-.65,'muzzle geometry must protrude beyond the skull');
   const tail=hero.root.getObjectByName('3d-chevron-tail-mesh').geometry;
   assert(tail.attributes.position.count>2000 && tail.attributes.uv,'sharp tail shader requires continuous UVs');
   assert.equal(hero.mats.tail.customProgramCacheKey(),'madger-tail-sharp-chevron-v2');
   assert.deepEqual(hero.clawCount,{hands:[5,5],feet:[5,5]});
 }finally{hero.dispose();}
});

test('warm crown, rear stripe and small chest V are skin/fur marks, not a flat necklace',()=>{
 assert(creamCoatAt(0,.42,-.2,'head'));
 assert(creamCoatAt(0,-.25,.25,'head'));
 assert(!creamCoatAt(.3,.3,.2,'head'));
 assert(creamCoatAt(0,.2,.25,'body'));
 assert(creamCoatAt(.2,.29,-.2,'body'));
 assert(!creamCoatAt(.2,.13,-.2,'body'));
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
     assert.equal(hero.lastPose.faceTechnique,'modeled-3d');
     assert.equal(hero.lastPose.faceProjection,false);
     assert.equal(hero.lastPose.likenessStatus,'pending-visual-review');
     assert(hero.lastPose.patternedTail && hero.lastPose.rearCreamBlaze);
     assert(hero.lastPose.position.every(Number.isFinite));
     assert.equal(hero.lastPose.clawsPerPaw,5);
     assert(hero.root.position.x<-2,'route offset from the real game was lost');
   }
   hero.update(fixture({slide:.72,slideAge:.18}),40);
   assert(hero.lastPose.burrowing);
   hero.update(fixture({y:.9}),45);
   assert(hero.lastPose.jumping);
   const before=hero.tail.rotation.z;
   hero.update(fixture({y:0,distance:202}),47);
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


test('planted paws follow the passing ground and swing feet clear it',()=>{
 const hero=new MadgerHero(new THREE.Scene(),()=>0,new THREE.Texture());
 try{
   for(let d=.04;d<5.6;d+=.04){
     hero.update(fixture({distance:d}),10);
     for(let i=0;i<2;i++){
       const gait=sampleFootGait(d,i*.5),foot=hero.feet[i];
       const p=foot.getWorldPosition(new THREE.Vector3());
       const q=foot.getWorldQuaternion(new THREE.Quaternion());
       assert(p.y>=-.212,'paw penetrated the ground');
       assert(Math.abs(new THREE.Euler().setFromQuaternion(q).x)<.001,'paw lost its horizontal contact');
       if(gait.contact){
         assert(Math.abs(p.y-(-.205))<.012,'stance paw floated above the ground');
         const next=sampleFootGait(d+.001,i*.5);
         if(next.contact)assert(Math.abs((next.z-gait.z)/.001-1)<1e-8,'stance slipped against the scrolling ground');
       } else assert(gait.lift>=0 && gait.lift<=.181);
     }
   }
 }finally{hero.dispose();}
});

test('burrow entry and exit ease into the pose instead of snapping',()=>{
 const hero=new MadgerHero(new THREE.Scene(),()=>0,new THREE.Texture());
 try{
   hero.update(fixture({slide:.82,slideAge:0}),10);const initial=hero.body.scale.y;
   hero.update(fixture({slide:.80,slideAge:.02}),10.02);const entering=hero.body.scale.y;
   hero.update(fixture({slide:.5,slideAge:.30}),10.3);const deep=hero.body.scale.y;
   hero.update(fixture({slide:.01,slideAge:.80}),10.8);const exit=hero.body.scale.y;
   assert.equal(initial,1);assert(entering<initial && entering>deep);assert(exit>.99);
 }finally{hero.dispose();}
});


test('full burrow dives beneath real terrain, then the result pose emerges with frozen timers',()=>{
 const hero=new MadgerHero(new THREE.Scene(),()=>0,new THREE.Texture());
 try{
   const state=fixture({slide:.5,slideAge:.3});hero.update(state,10);
   const bounds=new THREE.Box3().setFromObject(hero.root,true);
   assert(bounds.max.y<-.33,'a fully burrowing hero still clips through overhead hazards');
   hero.update({...state,mode:'won'},11);hero.update({...state,mode:'won'},11.3);
   assert(!hero.lastPose.burrowing,'frozen finished slide timer kept the hero underground');
 }finally{hero.dispose();}
});


test('arm skins and directional fur have outward triangle winding',()=>{
 const hero=new MadgerHero(new THREE.Scene(),()=>0);
 try{
   const arm=hero.root.getObjectByName('continuous-shoulder-to-wrist').geometry;
   assert(arm.attributes.normal.getX(0)>.9,'front-side arm material would cull its exterior');
   assert(arm.attributes.normal.getX(12*21+10)<-.9,'opposite arm side must face outward too');
   const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();
   for(const name of ['sculpted-cranium-and-crown-directional-fur','furred-paw-directional-fur','continuous-spine-and-chest-coat-directional-fur']){
     const geometry=hero.root.getObjectByName(name).geometry,position=geometry.attributes.position,normals=geometry.attributes.normal;
     for(let i=0;i<position.count;i+=3){
       a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
       const actual=b.sub(a).cross(c.sub(a));normal.fromBufferAttribute(normals,i);
       assert(actual.dot(normal)>0,name+' triangle '+i/3+' is inward-facing');
     }
   }
 }finally{hero.dispose();}
});
