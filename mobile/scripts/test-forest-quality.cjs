/* The renderer may drop 3D resolution only after sustained slow visible frames.
 * It never changes the game clock, saved progress or native app rendering.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

const quality=import(pathToFileURL(path.resolve(__dirname,'../public/blackroot/quality.mjs')).href);

test('fast rendering preserves full-resolution lighting',async()=>{
 const {adjustedSceneScale}=await quality;
 assert.equal(adjustedSceneScale(1,[16,17,17]),1);
 assert.equal(adjustedSceneScale(1,[30,34,33]),1);
});

test('sporadic high frame intervals do not reduce detail',async()=>{
 const {adjustedSceneScale}=await quality;
 assert.equal(adjustedSceneScale(1,[16,850,17]),1);
 assert.equal(adjustedSceneScale(1,[10,2000,21]),1);
 assert.equal(adjustedSceneScale(1,[20,NaN,22]),1);
});

test('repeated overloaded frames promptly trigger a bounded mobile fallback',async()=>{
 const {adjustedSceneScale,MIN_SCENE_SCALE}=await quality;
 let scale=1;
 const observed=[];
 for(let i=0;i<6;i++){scale=adjustedSceneScale(scale,[310,475,960]);observed.push(scale);}
 assert.deepEqual(observed.slice(0,3),[.72,.52,.42]);
 assert(observed.every(n=>n<=1&&n>=MIN_SCENE_SCALE));
 assert.equal(observed.at(-1),MIN_SCENE_SCALE);
});

test('moderately slow screens preserve more detail than severely overloaded ones',async()=>{
 const {adjustedSceneScale}=await quality;
 assert.equal(adjustedSceneScale(1,[52,60,65]),.86);
 assert.equal(adjustedSceneScale(.65,[52,60,65]),.65);
});
