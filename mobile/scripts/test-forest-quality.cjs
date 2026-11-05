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
 assert(isActiveSceneTimingSample('running',567,true,1),'restored active frames cannot be discarded as lobby warmup');
 assert(!isActiveSceneTimingSample('ready',567,true,3));
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

test('cold restored run adapts before repeated safety pauses exhaust real Resume attempts',async()=>{
 const fs=require('node:fs'),os=require('node:os'),ts=require('typescript');
 const q=await quality;
 const source=fs.readFileSync(path.join(__dirname,'../public/blackroot/renderer.mjs'),'utf8');
 const signature='  render(eye,target,time,zone,travel=0) {';
 const start=source.indexOf(signature)+signature.length;
 const end=source.indexOf('    // UI remains at native resolution;',start);
 assert(start>=signature.length&&end>start,'real renderer timing block must be found');
 let now=0;
 // Execute the actual production timing block, without allocating a WebGL GPU.
 const timing=new Function('performance','document','console',...Object.keys(q),
   'return function(){'+source.slice(start,end)+'}')( {now:()=>now},{visibilityState:'visible'},{info:()=>{}},...Object.values(q));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'madger-restored-quality-'));
 try{
   for(const name of ['companions','core'])fs.writeFileSync(path.join(dir,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/game/expedition',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
   const G=require(path.join(dir,'core.js')),s=G.freshOvergrownExpedition(23,'cold-quality'),clock=G.createClock();
   Object.assign(s,{mode:'paused',distance:697.6,route:'crystal-vein',majorPath:'deep',subPath:'crystal-vein',forkStage:2});
   const course=G.buildOvergrownCourse(s.seed),renderer={run:s,renderedFrames:0,frameSamples:[],budget:{scenery:1,scale:1,fastFrames:0},quality:1,sceneryQuality:.7};
   timing.call(renderer);const states=[];
   for(let i=0;i<5;i++){
     now+=800;G.resume(s);G.advance(s,course,0,clock,[]);timing.call(renderer);
     const before=s.distance;now+=550;G.advance(s,course,.55,clock,[]);
     assert.equal(s.mode,'paused','400ms gameplay safety gate must still pause');
     assert.equal(s.distance,before,'no unseen motion during stalled frame');
     timing.call(renderer);states.push({...renderer.budget});
   }
   assert.equal(states[0].scenery,1,'one slow frame must not be treated as sustained overload');
   assert.equal(states[1].scenery,0,'two consecutive safety-level stalls must remove distant detail');
   assert.equal(states[1].scale,1,'reduce scenery before pixel clarity');
   assert.equal(states[2].scale,.88,'pixel fallback must start before five Resume clicks fail');
   assert.equal(states[4].scale,q.MIN_SCENE_SCALE);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test('severe-pressure recovery requires consecutive real safety-level intervals',async()=>{
 const {hasSevereScenePressure,adaptSceneBudget}=await quality;
 for(const samples of [[550],[550,16],[16,550],[550,NaN],[550,2000],[399,550]])
   assert(!hasSevereScenePressure(samples),JSON.stringify(samples));
 assert(hasSevereScenePressure([550,517]));
 assert.deepEqual(adaptSceneBudget({scenery:0,scale:1,fastFrames:0},[550,517]),
   {scenery:0,scale:.88,fastFrames:0});
});
