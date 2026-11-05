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
 assert.deepEqual(observed.slice(0,3),[.88,.77,.72]);
 assert(observed.every(n=>n<=1&&n>=MIN_SCENE_SCALE));
 assert.equal(observed.at(-1),MIN_SCENE_SCALE);
});

test('moderately slow screens preserve more detail than severely overloaded ones',async()=>{
 const {adjustedSceneScale}=await quality;
 assert.equal(adjustedSceneScale(1,[52,60,65]),.94);
 assert.equal(adjustedSceneScale(.82,[52,60,65]),.82);
});


test('scenery density drops before scene clarity and recovers only after sustained headroom',async()=>{
 const {adaptSceneBudget}=await quality;
 let state={scenery:2,scale:1,fastFrames:0};
 state=adaptSceneBudget(state,[66,70,68]);assert.equal(state.scenery,1);assert.equal(state.scale,1);
 state=adaptSceneBudget(state,[66,70,68]);assert.equal(state.scenery,0);assert.equal(state.scale,1);
 state=adaptSceneBudget(state,[66,70,68]);assert.equal(state.scale,.94);
 for(let i=0;i<49;i++)state=adaptSceneBudget(state,[16,17,18]);
 assert.equal(state.scale,.94);state=adaptSceneBudget(state,[16,17,18]);assert.equal(state.scale,.98);
 assert.equal(state.scenery,0,'restoring crisp pixels has priority over far dressing');
});

test('high density phone buffers remain clear within a bounded PBR fill budget',async()=>{
 const {sceneBufferSize}=await quality;
 for(const [w,h] of [[430,920],[390,650],[1920,1080],[1440,3120]]){
   const full=sceneBufferSize(w,h,3,1),low=sceneBufferSize(w,h,3,.72);
   assert(full.width*full.height<1053000);assert(low.width*low.height<full.width*full.height);
   assert(Math.abs(full.width/full.height-w/h)<.01);
   if(w<500)assert(low.width>=w,'reduced phone graphics must not become a 42%-CSS-width pixel buffer');
 }
});


test('continued overload never raises an already reduced resolution',async()=>{
 const {adjustedSceneScale}=await quality;
 for(const scale of [.72,.77,.82,.86,.94,1])
   assert(adjustedSceneScale(scale,[60,60,60])<=scale);
 assert.equal(adjustedSceneScale(.72,[60,60,60]),.72);
});


test('GPU timing follows the submitted active frame through a protective pause',async()=>{
 const {isActiveSceneTimingSample,adaptSceneBudget}=await quality;
 assert(isActiveSceneTimingSample('running',567,true,10),
   'The previous running frame must count after advance pauses the current state');
 assert(!isActiveSceneTimingSample('paused',550,true,10),
   'A Resume click after an idle pause is not a slow GPU frame');
 for(const elapsed of [NaN,0,-1,1800,10000])
   assert(!isActiveSceneTimingSample('running',elapsed,true,10));
 assert(!isActiveSceneTimingSample('running',567,false,10));
 assert(!isActiveSceneTimingSample('running',567,true,3));
 let state={scenery:1,scale:1,fastFrames:0},samples=[];
 // Reproduce six slow frames, each followed by safety pause and real Resume.
 // Current-mode sampling used to discard every pressure frame in this loop.
 for(let i=0;i<6;i++){
   for(const [previousMode,elapsed] of [['running',550],['paused',800]]){
     if(isActiveSceneTimingSample(previousMode,elapsed,true,10+i))samples.push(elapsed);
     if(samples.length===3){state=adaptSceneBudget(state,samples);samples=[];}
   }
 }
 assert.equal(state.scenery,0);assert.equal(state.scale,.88);
});
