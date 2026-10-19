const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),ts=require('typescript');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'madger-scene-scale-'));
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
for(const name of ['math','gl'])fs.writeFileSync(path.join(dir,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/game/expedition',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const {SceneRenderTarget,ExpeditionRenderer}=require(path.join(dir,'gl.js'));
function context(){
 const calls=[],live=new Set();let next=1,lost=false,incomplete=false,failTexture=false;
 const object=kind=>{const o={kind,id:next++};live.add(o);return o;},remove=o=>{assert(live.delete(o),'resource released once');};
 const target={drawingBufferWidth:480,drawingBufferHeight:960,isContextLost:()=>lost,getExtension:()=>null,getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:()=>({}),checkFramebufferStatus:()=>incomplete?0:gl.FRAMEBUFFER_COMPLETE,
  createShader:()=>object('shader'),createProgram:()=>object('program'),createBuffer:()=>object('buffer'),createFramebuffer:()=>object('framebuffer'),createTexture:()=>failTexture?null:object('texture'),createRenderbuffer:()=>object('depth'),
  deleteShader:remove,deleteProgram:remove,deleteBuffer:remove,deleteFramebuffer:remove,deleteTexture:remove,deleteRenderbuffer:remove};
 let constant=1;const gl=new Proxy(target,{get(o,key){if(key in o)return o[key];if(/^[A-Z_0-9]+$/.test(String(key)))return o[key]=constant++;return (...args)=>calls.push([key,...args]);}});
 return {gl,calls,live,setLost:v=>lost=v,setIncomplete:v=>incomplete=v,setAllocationFailure:v=>failTexture=v};
}
test('target allocates once, scales dimensions and presents full size with restored depth state',()=>{
 const {gl,calls,live}=context(),target=new SceneRenderTarget(gl);
 assert(target.begin(480,960,.75));assert.equal(target.width,360);assert.equal(target.height,720);const count=live.size;
 assert(target.begin(480,960,.75));assert.equal(live.size,count);assert.equal(calls.filter(c=>c[0]==='texImage2D').length,1);
 target.present(480,960);assert.deepEqual(calls.filter(c=>c[0]==='viewport').at(-1),['viewport',0,0,480,960]);
 assert.deepEqual(calls.filter(c=>c[0]==='drawArrays').at(-1),['drawArrays',gl.TRIANGLES,0,3]);assert.deepEqual(calls.at(-1),['enable',gl.DEPTH_TEST]);target.dispose();target.dispose();assert.equal(live.size,0);
});
test('resize reallocates target attachments and preserves program/buffer; odd size remains bounded',()=>{
 const {gl,live}=context(),target=new SceneRenderTarget(gl);assert(target.begin(480,960,.75));const program=[...live].find(o=>o.kind==='program');
 assert(target.begin(431,919,.75));assert.equal(target.width,323);assert.equal(target.height,689);assert(live.has(program));assert.equal([...live].filter(o=>o.kind==='framebuffer').length,1);target.dispose();assert.equal(live.size,0);
});
test('incomplete framebuffer and partial allocation release everything, bind default and stop retrying each frame',t=>{
 t.mock.method(console,'warn',()=>{});
 for(const failure of ['setIncomplete','setAllocationFailure']){const c=context(),target=new SceneRenderTarget(c.gl);c[failure](true);assert.equal(target.begin(480,960,.75),false);assert.equal(c.live.size,0);const calls=c.calls.length;assert.equal(target.begin(480,960,.75),false);assert.equal(c.calls.length,calls);assert(c.calls.some(x=>x[0]==='bindFramebuffer'&&x[2]===null));c[failure](false);assert(target.begin(960,480,.75),'resize can retry recovered capability');target.dispose();assert.equal(c.live.size,0);}
});
test('lost context does not allocate; recreated target owns fresh resources and old disposal is idempotent',()=>{
 const c=context(),target=new SceneRenderTarget(c.gl);c.setLost(true);assert.equal(target.begin(480,960,.75),false);assert.equal(c.live.size,0);target.dispose();
 const restored=new SceneRenderTarget(c.gl);c.setLost(false);assert(restored.begin(480,960,.75));restored.dispose();assert.equal(c.live.size,0);
});
test('renderer defaults to direct sharp path; optional low tier adds presentation and releases on sharp selection',()=>{
 const c=context(),r=new ExpeditionRenderer(c.gl),draw=()=>{r.reset();r.shape('box',[1,1,1,0],0,0,-5);r.render([0,4,9],[0,1,-14],0,0);};
 draw();assert.equal([...c.live].filter(o=>o.kind==='framebuffer').length,0);r.setSceneScale(.75);draw();assert.equal([...c.live].filter(o=>o.kind==='framebuffer').length,1);assert(c.calls.some(x=>x[0]==='viewport'&&x[3]===360&&x[4]===720));
 r.setSceneScale(1);draw();assert.equal([...c.live].filter(o=>o.kind==='framebuffer').length,0);r.dispose();assert.equal(c.live.size,0);
});
test('renderer framebuffer failure falls back to a full-sized scene draw, without presentation',t=>{
 t.mock.method(console,'warn',()=>{});const c=context(),r=new ExpeditionRenderer(c.gl,{sceneScale:.75});c.setIncomplete(true);r.reset();r.shape('box',[1,1,1,0],0,0,-5);r.render([0,4,9],[0,1,-14],0,0);
 assert.deepEqual(c.calls.filter(x=>x[0]==='viewport').at(-1),['viewport',0,0,480,960]);assert.equal(c.calls.filter(x=>x[0]==='drawArraysInstanced').length,1);assert.equal(c.calls.filter(x=>x[0]==='drawArrays').length,0);r.dispose();assert.equal(c.live.size,0);
});
