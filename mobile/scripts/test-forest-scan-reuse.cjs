/* Placement reuse must preserve every matrix, count and grounding diagnostic.
 * This CPU-only test does not establish native GPU frame rate or visual QA. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/blackroot/renderer.mjs'),'utf8');
const begin=source.indexOf('    const start=Math.floor(travel/12)*12;');
const end=source.indexOf('    this.stats.groundedSceneryInstances=anchored;',begin);
assert(begin>=0&&end>begin);
const body=source.slice(begin,end)+'\nreturn anchored;';
const args=['travel','s','scenery','ruins','underground','breezeTime','hash','road','curve','bankX','surface','matrix','foliageSway','canopyFade','canopyWind'];
const optimized=new Function(...args,'let anchored=0;'+body.replace(/surface\(/g,'(anchored++,surface)('));
// Force the exact same placement code to recompute each material's matrices.
const reference=new Function(...args,'let anchored=0;'+body.replace('placements.get(id)','undefined').replace(/surface\(/g,'(anchored++,surface)('));
// Shipped material primitives; rock variants are capped at two by the loader.
const materials={fern_02:4,rock_face_02:1,dead_tree_trunk:1,rock_moss_set_01:2,island_tree_02:3,root_cluster_01:1,grass_medium_02:5};
function scene(quality,budget){
 const result={sceneryQuality:quality,budget:{scenery:budget},trees:{count:1},scanBatches:[],writes:0};
 for(const [id,copies] of Object.entries(materials))for(let copy=0;copy<copies;copy++){
  const attribute={array:new Float32Array((['fern_02','grass_medium_02'].includes(id)?96:32)*16),ranges:[],clearUpdateRanges(){this.ranges=[];},addUpdateRange(start,count){this.ranges.push({start,count});}};
  result.scanBatches.push({id,mesh:{count:0,instanceMatrix:attribute,setMatrixAt(i,m){result.writes++;attribute.array.set(m,i*16);}}});
 }
 return result;
}
function run(fn,target,travel,ruins,underground,time){
 const hash=n=>{const v=Math.sin(n*127.13+91.7)*43758.5453;return v-Math.floor(v);};
 return fn.call(target,travel,{route:ruins?'ruins':underground?'cavern':'forest'},
  {seed:7,understory:1,rootScale:1,treeScale:1},ruins,underground,time,hash,
  (_s,d)=>Math.sin(d/76),d=>Math.sin(d/185),(x,d,m)=>x+Math.sin(d)*m,
  (x,d)=>Math.sin(x)*Math.cos(d),(...v)=>Float32Array.from([...v,...Array(16-v.length).fill(0)]),
  (t,d,side)=>Math.sin(t+d+side)*.03,ahead=>Math.max(0,Math.min(1,(110-ahead)/20)),
  (t,d,r)=>Math.sin(t+d+r)*.02);
}
test('all biome/quality placements remain byte-identical while duplicate material work drops',()=>{
 let before=0,after=0,capacity=0,uploads=0,cases=0;
 for(const [ruins,underground] of [[false,false],[true,false],[false,true]])
 for(const [q,b] of [[1,2],[.7,1],[.44,0]])
 for(const travel of [0,11.9,12,53,66,139.9,140,181,353,455,812]){
  const a=scene(q,b),c=scene(q,b);
  assert.equal(run(reference,a,travel,ruins,underground,10),run(optimized,c,travel,ruins,underground,10));
  for(let i=0;i<a.scanBatches.length;i++){
   const old=a.scanBatches[i].mesh,next=c.scanBatches[i].mesh;
   assert.equal(next.count,old.count);assert.deepEqual(next.instanceMatrix.array,old.instanceMatrix.array);
   assert.deepEqual(next.instanceMatrix.ranges,next.count?[{start:0,count:next.count*16}]:[]);
   capacity+=next.instanceMatrix.array.byteLength;uploads+=next.count*16*4;
  }
  assert(a.writes>c.writes);before+=a.writes;after+=c.writes;cases++;
 }
 console.log(JSON.stringify({cases,matrixWritesBefore:before,matrixWritesAfter:after,capacityBytes:capacity,activeUploadBytes:uploads}));
});
test('per-frame caches do not preserve stale wind, travel or quality',()=>{
 const a=scene(1,2),b=scene(1,2);
 run(optimized,b,66,false,false,10);
 a.sceneryQuality=b.sceneryQuality=.44;a.budget.scenery=b.budget.scenery=0;
 run(reference,a,181,true,false,20);run(optimized,b,181,true,false,20);
 for(let i=0;i<a.scanBatches.length;i++){
  const left=a.scanBatches[i].mesh,right=b.scanBatches[i].mesh;
  assert.equal(left.count,right.count);
  assert.deepEqual(left.instanceMatrix.array.subarray(0,left.count*16),right.instanceMatrix.array.subarray(0,right.count*16));
 }
});
