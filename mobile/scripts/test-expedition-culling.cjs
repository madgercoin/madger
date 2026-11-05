/* global __dirname, Buffer */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'madger-culling-test-'));
test.after(()=>fs.rmSync(temporary,{recursive:true,force:true}));
function strip(source){
 try{const ts=require('typescript');return ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;}
 catch(error){const fn=require('node:module').stripTypeScriptTypes;if(!fn)throw error;return fn(source,{mode:'strip'});}
}
let GL,Maths,Scene,Core;
test.before(async()=>{
 fs.writeFileSync(path.join(temporary,'package.json'),'{"type":"module"}');
 for(const name of ['math','gl','scene','core','animation','companions','companion-models']){
  const source=fs.readFileSync(path.join(__dirname,'../src/game/expedition',name+'.ts'),'utf8');
  fs.writeFileSync(path.join(temporary,name+'.js'),strip(source).replace(/(from\s+['"]\.\/[^'"]+)(['"])/g,'$1.js$2'));
 }
 [GL,Maths,Scene,Core]=await Promise.all(['gl','math','scene','core'].map(name=>import(pathToFileURL(path.join(temporary,name+'.js')).href)));
});
function context({width=480,height=960,native=false,instanced=true}={}){
 const state={vp:null,drains:0,pending:0,maxPending:0,draws:[],buffers:new Map()};let bound;const noop=()=>{};
 const gl={drawingBufferWidth:width,drawingBufferHeight:height,
  createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,
  getUniformLocation:(_program,name)=>({name}),getExtension:()=>null,
  bindBuffer:(_target,buffer)=>{bound=buffer;},bufferData:(_target,data)=>{state.buffers.set(bound,new Float32Array(data));},
  uniformMatrix4fv:(_location,_transpose,vp)=>{state.vp=new Float32Array(vp);},
  drawArraysInstanced:instanced?(_mode,_first,vertices,count)=>state.draws.push({vertices,count}):undefined,
  vertexAttribDivisor:instanced?noop:undefined,drawArrays:(_mode,_first,vertices)=>state.draws.push({vertices,count:1}),
  endFrameEXP:native?()=>{state.pending++;state.maxPending=Math.max(state.maxPending,state.pending);}:undefined,
  flushEXP:native?()=>{state.drains++;state.pending=0;}:undefined,
 };
 return {gl:new Proxy(gl,{get:(target,key)=>key in target?target[key]:noop}),state};
}
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
function apply(matrix,point){return [0,1,2,3].map(row=>matrix[row]*point[0]+matrix[row+4]*point[1]+matrix[row+8]*point[2]+matrix[row+12]*point[3]);}
function corners(vertices){
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 for(let offset=0;offset<vertices.length;offset+=6)for(let axis=0;axis<3;axis++){low[axis]=Math.min(low[axis],vertices[offset+axis]);high[axis]=Math.max(high[axis],vertices[offset+axis]);}
 return [0,1,2,3,4,5,6,7].map(index=>[index&1?high[0]:low[0],index&2?high[1]:low[1],index&4?high[2]:low[2],1]);
}
// Independent geometric oracle: transform all eight box corners into clip
// coordinates. An excluded bound must be wholly outside one homogeneous plane.
function definitelyOutside(matrix,meshCorners,vp){
 const clip=meshCorners.map(point=>apply(vp,apply(matrix,point)));
 return [0,1,2].some(axis=>[1,-1].some(sign=>clip.every(point=>point[3]+sign*point[axis]<0)));
}
function audit(renderer,state){
 let kept=0,removed=0;
 for(const batch of renderer.batches.values()){
  if(!batch.count)continue;
  const source=batch.data.subarray(0,batch.count*20),meshCorners=corners(state.buffers.get(batch.vertex));
  const uploaded=state.buffers.get(batch.instances)||new Float32Array(0);let index=0;
  for(let offset=0;offset<source.length;offset+=20){
   const record=source.subarray(offset,offset+20),candidate=uploaded.subarray(index,index+20);
   if(candidate.length===20&&bytes(record).equals(bytes(candidate))){kept++;index+=20;}
   else{assert(definitelyOutside(record,meshCorners,state.vp),'culling removed a bound that intersects the camera clip volume');removed++;}
  }
  assert.equal(index,uploaded.length,'survivors must preserve every transform/material byte and source order');
 }
 assert.equal(renderer.stats.instances,kept);assert.equal(renderer.stats.culledInstances,removed);
 return {kept,removed};
}
test('six clipping planes retain intersections, large bounds, negative scales and planar meshes',()=>{
 const ctx=context({width:1000,height:1000}),renderer=new GL.ExpeditionRenderer(ctx.gl);
 const cases=[
  {p:[0,0,-6],keep:true},{p:[-9,0,-6],keep:false},{p:[9,0,-6],keep:false},
  {p:[0,9,-6],keep:false},{p:[0,-9,-6],keep:false},{p:[0,0,2],keep:false},{p:[0,0,-185],keep:false},
  {p:[-6*Math.tan(33*Math.PI/180),0,-6],keep:true},
  {p:[10,0,-6],s:[30,1,1],keep:true},{p:[0,0,-.04],s:[.2,.2,.2],keep:true},
  {p:[0,0,-180.25],keep:true},{p:[0,0,-6],s:[-2,.2,.7],keep:true},{p:[0,0,-6],s:[2,0,2],keep:true},
 ];
 cases.forEach((c,index)=>renderer.add('box',Maths.transform(...c.p,...(c.s||[1,1,1])),[.2,.3,.4,index]));
 renderer.render([0,0,0],[0,0,-1],0,0);
 const batch=renderer.batches.get('box'),data=ctx.state.buffers.get(batch.instances);
 assert.deepEqual(Array.from({length:data.length/20},(_,i)=>data[i*20+19]),cases.flatMap((c,i)=>c.keep?[i]:[]));
 audit(renderer,ctx.state);renderer.dispose();
});
test('a camera change can reveal earlier culled instances without rebuilding the submission',()=>{
 const ctx=context({width:1000,height:1000}),renderer=new GL.ExpeditionRenderer(ctx.gl);
 renderer.shape('box',[1,0,0,0],0,0,-5);renderer.shape('box',[0,1,0,0],0,0,5);
 const batch=renderer.batches.get('box'),original=new Float32Array(batch.data.subarray(0,40));
 renderer.render([0,0,0],[0,0,-1],0,0);
 assert.equal(ctx.state.buffers.get(batch.instances)[14],-5);
 renderer.render([0,0,0],[0,0,1],0,0);
 assert.equal(ctx.state.buffers.get(batch.instances)[14],5);
 assert.deepEqual(bytes(batch.data.subarray(0,40)),bytes(original));renderer.dispose();
});
test('projective models fail open instead of applying an affine-only rejection',()=>{
 const ctx=context(),renderer=new GL.ExpeditionRenderer(ctx.gl),matrix=Maths.transform(1000,0,-6);matrix[3]=.1;
 renderer.add('box',matrix,[1,1,1,0]);renderer.render([0,0,0],[0,0,-1],0,0);
 assert.equal(renderer.stats.instances,1);assert.equal(renderer.stats.culledInstances,0);renderer.dispose();
});
test('rotated, sheared and mirrored bounds agree with explicit corners across camera aspects',()=>{
 let seed=9741;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const [width,height,eye,target] of [[480,960,[0,4.4,9.6],[.8,.9,-14]],[960,480,[3.8,3.3,8.6],[0,1.35,-.6]],[1280,720,[-9,4,10],[-8,1,-15]]]){
  const ctx=context({width,height}),renderer=new GL.ExpeditionRenderer(ctx.gl);
  for(let i=0;i<400;i++){
   const matrix=Maths.transform((random()-.5)*120,(random()-.5)*80,30-random()*300,(random()-.5)*12,random()*9,random()*8,random()*6,random()*6,random()*6);
   matrix[4]+=random()*3;matrix[8]-=random()*2;
   renderer.add(i%2?'sphere':'box',matrix,[random(),random(),random(),i]);
  }
  renderer.render(eye,target,0,0);const counts=audit(renderer,ctx.state);assert(counts.removed>100);assert(counts.kept>10);renderer.dispose();
 }
});
test('animated tail bounds follow the uploaded mesh and retain the same vertex data',()=>{
 const ctx=context(),renderer=new GL.ExpeditionRenderer(ctx.gl);
 for(const time of [0,.17,1,4.9,180])for(const bank of [-.18,0,.18]){
  renderer.updateTail(time,bank);const batch=renderer.batches.get('tail'),vertices=ctx.state.buffers.get(batch.vertex),points=corners(vertices);
  for(let axis=0;axis<3;axis++){
   assert.equal(batch.bounds.center[axis]-batch.bounds.half[axis],Math.min(...points.map(p=>p[axis])));
   assert.equal(batch.bounds.center[axis]+batch.bounds.half[axis],Math.max(...points.map(p=>p[axis])));
  }
  renderer.reset();renderer.shape('tail',[1,1,1,-5],0,0,-6);renderer.render([0,0,0],[0,0,-1],time,0);
  assert.equal(renderer.stats.instances,1);assert.deepEqual(bytes(ctx.state.buffers.get(batch.vertex)),bytes(vertices));
 }
 renderer.dispose();
});
test('exact scene captures preserve visible uploads through all zones, shortcuts and active companions',()=>{
 let removed=0,submitted=0,frames=0;
 for(const [width,height] of [[480,960],[960,480]])for(const distance of [0,40,180,225,360,620,760,798,980,1079]){
  const ctx=context({width,height}),scene=new Scene.ExpeditionScene(ctx.gl),s=Core.freshExpedition(4242);
  Object.assign(s,{mode:distance===0?'ready':'running',distance,zone:Math.min(2,Math.floor(distance/360))});
  if(distance===225)Object.assign(s,{route:'hollow',routeStart:180,routeEnd:270,routeSide:1});
  if(distance===798)Object.assign(s,{route:'grotto',routeStart:780,routeEnd:870,routeSide:-1});
  if(distance===620)for(const ally of Object.values(s.companions))Object.assign(ally,{timeLeft:12,age:4});
  scene.setCourse(Core.buildCourse(4242));scene.draw(s,2+distance/10);
  const counts=audit(scene.renderer,ctx.state);removed+=counts.removed;submitted+=counts.kept+counts.removed;frames++;scene.dispose();
 }
 assert(removed>1000);console.log(`Clip-culling scene audit: ${frames} frames, ${submitted} submitted primitives, ${removed} safely excluded.`);
});
test('native frames still drain even when fully culled and the fallback draws only survivors',t=>{
 t.mock.method(console,'info',()=>{});
 for(const instanced of [true,false]){
  const ctx=context({native:true,instanced}),renderer=new GL.ExpeditionRenderer(ctx.gl);
  renderer.shape('box',[1,1,1,0],1000,0,-5);renderer.render([0,0,0],[0,0,-1],0,0);
  assert.equal(ctx.state.draws.length,0);assert.equal(ctx.state.drains,1);assert.equal(ctx.state.pending,0);
  renderer.reset();renderer.shape('box',[1,1,1,0],0,0,-5);renderer.shape('box',[1,1,1,0],1000,0,-5);
  renderer.render([0,0,0],[0,0,-1],1,0);
  assert.equal(ctx.state.draws.length,1);assert.equal(ctx.state.draws[0].count,1);assert.equal(ctx.state.drains,2);assert.equal(ctx.state.maxPending,1);
  renderer.dispose();
 }
});

// Exercise the real item renderer and its normal GL batches. No production
// state hook or replacement drawing implementation is needed for these checks.
function itemSubmissions(scene,item,state,time=2){
 scene.renderer.reset();
 const before=structuredClone(state),original=structuredClone(item);
 scene.item(item,state,time);
 assert.deepEqual(state,before,'reward drawing mutated the saved run');
 assert.deepEqual(item,original,'reward drawing mutated the seeded course');
 const records=[];
 for(const [shape,batch] of scene.renderer.batches)for(let n=0;n<batch.count;n++)
  records.push({shape,data:Array.from(batch.data.subarray(n*20,(n+1)*20))});
 return records;
}
function rewardFixture(extra={}){
 return {id:9000,d:220,lane:0,kind:'treasure-cache',route:'rootway',phase:0,...extra};
}
function rewardRun(extra={}){
 return Object.assign(Core.freshOvergrownExpedition(23,'render-rewards'),
  {mode:'running',route:'rootway',distance:200,time:2},extra);
}
test('secret caches conceal their reward, halo and action glyph until the earned reveal distance',()=>{
 const scene=new Scene.ExpeditionScene(context().gl);
 try{
  for(const fortune of [0,1,2,3])for(const action of ['jump','burrow','burst']){
   const state=rewardRun({metaFortune:fortune}),reveal=Core.secretRevealDistance(state);
   const cache=rewardFixture({secret:true,requiredAction:action,d:state.distance+reveal+.01});
   assert.equal(itemSubmissions(scene,cache,state).length,0,'distant secret leaked visible primitives');
   cache.d=state.distance+reveal;
   const visible=itemSubmissions(scene,cache,state);
   assert(visible.some(record=>record.shape==='halo'),'discovered cache needs a visible reward');
   assert(visible.some(record=>record.shape==='cylinder'),'discovered cache needs its action glyph');
  }
  const cache=rewardFixture({secret:true,requiredAction:'jump',d:225});
  assert.equal(itemSubmissions(scene,cache,rewardRun()).length,0);
  assert(itemSubmissions(scene,cache,rewardRun({metaFortune:3})).length>0,'fortune must reveal the actual scene earlier');
 }finally{scene.dispose();}
});
test('secret concealment never hides ordinary rewards or mandatory action gates',()=>{
 const scene=new Scene.ExpeditionScene(context().gl),state=rewardRun();
 try{
  assert(itemSubmissions(scene,rewardFixture({d:260}),state).length>0,'legacy ordinary cache became hidden');
  for(const kind of ['gap','roots','crate'])for(const lane of [-1,0,1])
   assert(itemSubmissions(scene,rewardFixture({kind,lane,d:260}),state).length>0,kind+' gate disappeared before its warning window');
 }finally{scene.dispose();}
});
test('jump, burrow and burst rewards submit distinct directionally correct movement glyphs',()=>{
 const scene=new Scene.ExpeditionScene(context().gl),state=rewardRun();
 try{
  const cache=rewardFixture({d:212}),base=itemSubmissions(scene,cache,state);
  for(const action of ['jump','burrow','burst']){
   const plain=new Map();for(const record of base){const key=JSON.stringify(record);plain.set(key,(plain.get(key)||0)+1);}
   const added=itemSubmissions(scene,{...cache,requiredAction:action},state).filter(record=>{
    const key=JSON.stringify(record),left=plain.get(key)||0;if(!left)return true;plain.set(key,left-1);return false;
   });
   assert([...plain.values()].every(left=>left===0),'glyph replaced or moved the reward itself');
   assert.equal(added.length,action==='burst'?6:3);
   assert(added.every(record=>record.shape==='cylinder'&&record.data.every(Number.isFinite)));
   if(action==='burst'){
    assert.equal(new Set(added.map(record=>record.data[12].toFixed(3))).size,3,'burst must show three separate lightning strokes');
    const mint=GL.color('#70e4d7',.35);
    assert(added.every(record=>mint.every((channel,i)=>Math.abs(record.data[16+i]-channel)<1e-7)),'burst glyph lost its distinct mint color');
   }else{
    const stem=added.find(record=>Math.abs(record.data[4])<1e-6&&Math.abs(record.data[6])<1e-6);
    assert(stem,'arrow has no vertical shaft');
    assert(Math.abs(stem.data[5]-(action==='jump'?.39:-.39))<1e-6,'arrow points in the wrong direction');
   }
  }
 }finally{scene.dispose();}
});
test('collected or off-route secret rewards cannot leave an orphaned action glyph',()=>{
 const scene=new Scene.ExpeditionScene(context().gl),cache=rewardFixture({d:212,secret:true,requiredAction:'burst'});
 try{
  assert.equal(itemSubmissions(scene,cache,rewardRun({used:[cache.id]})).length,0);
  assert.equal(itemSubmissions(scene,cache,rewardRun({route:'ridge'})).length,0);
 }finally{scene.dispose();}
});
