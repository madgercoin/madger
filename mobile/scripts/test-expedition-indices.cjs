/* global __dirname, Buffer */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'madger-indices-test-'));
test.after(()=>fs.rmSync(temporary,{recursive:true,force:true}));
function strip(source){
 try{const ts=require('typescript');return ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;}
 catch(error){const fn=require('node:module').stripTypeScriptTypes;if(!fn)throw error;return fn(source,{mode:'strip'});}
}
let ExpeditionRenderer;
test.before(async()=>{
 fs.writeFileSync(path.join(temporary,'package.json'),'{"type":"module"}');
 for(const name of ['math','gl']){
  const source=fs.readFileSync(path.join(__dirname,'../src/game/expedition',name+'.ts'),'utf8');
  fs.writeFileSync(path.join(temporary,name+'.js'),strip(source).replace(/(from\s+['"]\.\/[^'"]+)(['"])/g,'$1.js$2'));
 }
 ({ExpeditionRenderer}=await import(pathToFileURL(path.join(temporary,'gl.js')).href));
});
function context({mode='webgl2',native=true}={}){
 const bound=new Map(),state={buffers:new Map(),created:[],deleted:[],draws:[],pending:0,maxPending:0,drains:0};
 const noop=()=>{},record=(kind,count,instances)=>state.draws.push({kind,count,instances,elements:bound.get(34963)});
 const angle=mode==='angle'?{drawArraysInstancedANGLE:(_mode,_first,count,instances)=>record('arrays',count,instances),vertexAttribDivisorANGLE:noop,drawElementsInstancedANGLE:(_mode,count,_type,_offset,instances)=>record('indexed',count,instances)}:null;
 const gl={ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,UNSIGNED_SHORT:5123,TRIANGLES:4,
  drawingBufferWidth:480,drawingBufferHeight:960,
  createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>{const b={};state.created.push(b);return b;},deleteBuffer:b=>state.deleted.push(b),
  getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:(_program,name)=>({name}),getExtension:()=>angle,
  bindBuffer:(target,b)=>bound.set(target,b),bufferData:(target,data)=>state.buffers.set(bound.get(target),new data.constructor(data)),
  drawArraysInstanced:['webgl2','arrays'].includes(mode)?(_mode,_first,count,instances)=>record('arrays',count,instances):undefined,
  drawElementsInstanced:mode==='webgl2'?(_mode,count,type,offset,instances)=>{assert.equal(type,5123);assert.equal(offset,0);record('indexed',count,instances);}:undefined,
  vertexAttribDivisor:['webgl2','arrays'].includes(mode)?noop:undefined,
  drawArrays:(_mode,_first,count)=>record('single',count,1),
  endFrameEXP:native?()=>{state.pending++;state.maxPending=Math.max(state.maxPending,state.pending);}:undefined,
  flushEXP:native?()=>{state.drains++;state.pending=0;}:undefined,
 };
 return {gl:new Proxy(gl,{get:(target,key)=>key in target?target[key]:noop}),state};
}
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
function expanded(vertices,indices){
 const result=new Float32Array(indices.length*6);
 for(let i=0;i<indices.length;i++){assert(indices[i]<vertices.length/6);result.set(vertices.subarray(indices[i]*6,indices[i]*6+6),i*6);}
 return result;
}
test('all indexed meshes expand to the exact original position/normal triangle stream',()=>{
 const ctx=context(),renderer=new ExpeditionRenderer(ctx.gl),counts={};
 for(const [shape,batch] of renderer.batches){
  const vertices=ctx.state.buffers.get(batch.vertex),indices=ctx.state.buffers.get(batch.elements);
  assert(indices instanceof Uint16Array);assert.equal(indices.length,batch.vertices);assert(!indices.includes(65535));
  assert.deepEqual(bytes(expanded(vertices,indices)),bytes(vertices),shape+' changed a vertex, normal, or triangle ordering');
  counts[shape]={expanded:batch.vertices,distinct:new Set(indices).size};
 }
 assert.equal(counts.sphere.expanded,960);assert(counts.sphere.distinct<200);
 assert.equal(counts.tail.expanded,1344);assert.equal(counts.tail.distinct,255);
 console.log('Indexed vertex references: '+JSON.stringify(counts));renderer.dispose();
});
test('tail element identities remain valid through every animated pose without rebuilding indices',()=>{
 const ctx=context(),renderer=new ExpeditionRenderer(ctx.gl),batch=renderer.batches.get('tail'),indices=ctx.state.buffers.get(batch.elements),originalIndices=new Uint16Array(indices);
 for(const time of [0,.017,.1,1,4.9,180,1000])for(const bank of [-.18,0,.18]){
  renderer.updateTail(time,bank);const vertices=ctx.state.buffers.get(batch.vertex);
  assert.equal(ctx.state.buffers.get(batch.elements),indices,'animation rebuilt a static element buffer');
  assert.deepEqual(bytes(indices),bytes(originalIndices));
  assert.deepEqual(bytes(expanded(vertices,indices)),bytes(vertices),`tail mismatch at time=${time}, bank=${bank}`);
 }
 renderer.dispose();
});
test('native indexed, ANGLE, instanced-array and individual-array backends preserve draws and drains',t=>{
 t.mock.method(console,'info',()=>{});
 for(const mode of ['webgl2','angle','arrays','single']){
  const ctx=context({mode}),renderer=new ExpeditionRenderer(ctx.gl),indexed=mode==='webgl2'||mode==='angle';
  renderer.shape('sphere',[1,0,0,0],0,0,-6);renderer.shape('sphere',[0,1,0,0],1,0,-8);
  renderer.shape('tail',[1,1,1,-5],0,0,-7);renderer.shape('box',[1,1,1,0],1000,0,-6);
  renderer.render([0,0,0],[0,0,-1],0,0);
  assert.equal(renderer.stats.instances,3);assert.equal(renderer.stats.culledInstances,1);assert.equal(renderer.stats.triangles,1088);
  assert.equal(renderer.stats.drawCalls,mode==='single'?3:2);assert.equal(renderer.stats.indexedDrawCalls,indexed?2:0);
  assert(ctx.state.draws.every(draw=>draw.kind===(indexed?'indexed':mode==='single'?'single':'arrays')));
  assert.equal(ctx.state.draws.reduce((n,draw)=>n+draw.count*draw.instances,0),1088*3);
  if(indexed)for(const draw of ctx.state.draws)assert(ctx.state.buffers.get(draw.elements) instanceof Uint16Array);
  else for(const batch of renderer.batches.values())assert.equal(batch.elements,null);
  assert.equal(ctx.state.drains,1);assert.equal(ctx.state.pending,0);
  renderer.reset();renderer.shape('box',[1,1,1,0],1000,0,-6);renderer.render([0,0,0],[0,0,-1],1,0);
  assert.equal(renderer.stats.drawCalls,0);assert.equal(renderer.stats.indexedDrawCalls,0);assert.equal(ctx.state.drains,2);assert.equal(ctx.state.maxPending,1);
  renderer.dispose();assert.equal(new Set(ctx.state.deleted).size,ctx.state.created.length,'all vertex, instance and element buffers must be released');
 }
});
test('indexed native telemetry reports the active path and native drain failures propagate',t=>{
 const lines=[];t.mock.method(console,'info',line=>lines.push(line));
 const ctx=context(),renderer=new ExpeditionRenderer(ctx.gl);
 renderer.shape('sphere',[1,1,1,0],0,0,-6);renderer.render([0,0,0],[0,0,-1],0,0);
 assert.equal(lines.length,1);const logged=JSON.parse(lines[0].slice('MADGER_EXPEDITION_RENDER '.length));
 assert.equal(logged.indexedDrawCalls,1);assert.equal(logged.drawCalls,1);assert.equal(logged.instanced,true);
 ctx.gl.flushEXP=()=>{throw Error('native drain unavailable');};
 assert.throws(()=>renderer.render([0,0,0],[0,0,-1],1,0),/native drain unavailable/);renderer.dispose();
});
test('the browser indexed path does not need Expo presentation methods',()=>{
 const ctx=context({native:false}),renderer=new ExpeditionRenderer(ctx.gl);
 renderer.shape('sphere',[1,1,1,0],0,0,-6);renderer.render([0,0,0],[0,0,-1],0,0);
 assert.equal(renderer.stats.indexedDrawCalls,1);assert.equal(ctx.state.drains,0);assert.equal(renderer.stats.nativeDrainMs,0);renderer.dispose();
});
