/* global __dirname, process, Buffer */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{performance}=require('node:perf_hooks');
const sourceDir=path.join(__dirname,'../src/game/expedition');
const baselineDir=process.env.MADGER_RENDER_BASELINE;
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'madger-render-memory-'));
test.after(()=>fs.rmSync(temporary,{recursive:true,force:true}));

// Use the project's TypeScript compiler where installed; Node 22.13+ also has a
// built-in stripper, allowing this isolated review harness to run without npm.
function strip(source){
 try{const ts=require('typescript');return ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;}
 catch(error){const fn=require('node:module').stripTypeScriptTypes;if(!fn)throw error;return fn(source,{mode:'strip'});}
}
async function modules(source,name){
 const dir=path.join(temporary,name);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'package.json'),'{"type":"module"}');
 for(const file of ['math','gl','scene','core','animation','companions','companion-models']){
  // An archived baseline may contain just the changed files; use the unchanged
  // current animation/companion dependencies for both sides of that comparison.
  const candidate=path.join(source,file+'.ts'),input=fs.existsSync(candidate)?candidate:path.join(sourceDir,file+'.ts');
  let text=fs.readFileSync(input,'utf8');
  if(file==='gl')text+='\nexport const __cacheSizeForTest=()=>colorCache.size;\nexport const __tailForTest=(time:number,bank:number)=>tailGeometry(time,bank);\n';
  text=strip(text).replace(/(from\s+['"]\.\/[^'"]+)(['"])/g,'$1.js$2');
  fs.writeFileSync(path.join(dir,file+'.js'),text);
 }
 const [GL,Scene,Core,Maths]=await Promise.all(['gl','scene','core','math'].map(f=>import(pathToFileURL(path.join(dir,f+'.js')).href)));
 return {GL,Scene,Core,Maths};
}
let current,baseline;
test.before(async()=>{current=await modules(sourceDir,'current');if(baselineDir)baseline=await modules(baselineDir,'baseline');});

function originalTail(time,bank){
 const v=[],rings=16,sides=14;
 const point=(i,j)=>{const t=i/rings,a=j/sides*Math.PI*2,radius=Math.max(.022,(.22+.17*Math.sin(Math.PI*t))*(1-t*t*.82)),cy=.14*Math.sin(t*Math.PI)+.26*t*t,cx=Math.sin(time*3.1-t*2.8)*.13*t*t-bank*t*.15,r=radius*(1+.025*Math.sin(a*7+t*80));return {p:[cx+Math.cos(a)*r,cy+Math.sin(a)*r,t*1.26],n:[Math.cos(a),Math.sin(a),.15+t*.35]};};
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++)for(const q of [point(i,j),point(i+1,j),point(i,j+1),point(i+1,j),point(i+1,j+1),point(i,j+1)]){const l=Math.hypot(...q.n);v.push(...q.p,q.n[0]/l,q.n[1]/l,q.n[2]/l);}
 return new Float32Array(v);
}
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
function mockGL(){
 const gl={lastUpload:null,eye:null,drawingBufferWidth:480,drawingBufferHeight:960,createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:(_program,name)=>({name}),drawArraysInstanced:()=>{},vertexAttribDivisor:()=>{},endFrameEXP:undefined,flushEXP:undefined,getExtension:()=>null,bufferData(_target,data){gl.lastUpload=data;},uniform3f(location,...values){if(location.name==='uEye')gl.eye=values;}};
 return new Proxy(gl,{get:(target,key)=>key in target?target[key]:()=>{}});
}
function scenery(bundle,course,capture=true){
 const instance=Object.create(bundle.Scene.ExpeditionScene.prototype),records=[];
 instance.renderer={
  shape(shape,c,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,parent){const t=bundle.Maths.transform(x,y,z,sx,sy,sz,rx,ry,rz);this.add(shape,parent?bundle.Maths.multiply(parent,t):t,c);},
  add(shape,matrix,c){if(capture)records.push([shape,Array.from(matrix),Array.from(c)]);},
 };
 instance.setCourse(course);return {instance,records};
}

test('burst trails remain attached to Madger on raised and lowered routes',()=>{
 for(const route of ['main','root-arch','mosswalk','ancient-vault']){
  const s=current.Core.freshOvergrownExpedition(23,'burst-height');
  Object.assign(s,{mode:'running',distance:500,route,burst:1,y:.3});
  const {instance,records}=scenery(current,[]);
  instance.clock=4;instance.reaction={kind:'none',at:-10};instance.renderer.updateTail=()=>{};
  instance.madger(s,4,false);
  const expected=Math.sin(s.distance/34)*.12+current.Core.overgrownPathHeight(route,s.distance)+.45+s.y;
  assert.equal(records.slice(-7).length,7);
  for(const [shape,matrix] of records.slice(-7)){
   assert.equal(shape,'cone');assert(Math.abs(matrix[13]-expected)<1e-6,route+' burst must follow the physical floor');
  }
 }
});

test('continuous lantern emission stays exact and the color cache stays bounded',()=>{
 const original=current.GL.color('#ffd994',1.5),before=[...original];
 for(let i=0;i<5000;i++){
  const emission=1.5+Math.sin(i*.127)*.04,c=current.GL.color('#ffd994',emission);
  assert.deepEqual(c,[before[0],before[1],before[2],emission]);
 }
 assert(current.GL.__cacheSizeForTest()<=512);
 assert.deepEqual(original,before);assert.deepEqual(current.GL.color('#ffd994',1.5),before);
});

test('shared-grid tail is byte-identical to the original triangle stream',()=>{
 for(const time of [0,.017,.1,1,4.9,180,1000])for(const bank of [-.18,0,.18]){
  assert.deepEqual(bytes(current.GL.__tailForTest(time,bank)),bytes(originalTail(time,bank)),`time=${time}, bank=${bank}`);
 }
});

test('tail updates reuse an upload buffer and separate renderers own separate buffers',()=>{
 const a=mockGL(),b=mockGL(),ra=new current.GL.ExpeditionRenderer(a),rb=new current.GL.ExpeditionRenderer(b);
 ra.updateTail(1,.1);const upload=a.lastUpload;assert.equal(upload.length,8064);
 ra.updateTail(2,-.1);assert.equal(a.lastUpload,upload);assert.deepEqual(bytes(upload),bytes(originalTail(2,-.1)));
 rb.updateTail(3,0);assert.notEqual(b.lastUpload,upload);
 ra.dispose();rb.dispose();
});

test('scenery avoids full-course scans and refreshes when the course changes',()=>{
 const course=current.Core.buildCourse(17),s=scenery(current,course);
 course.some=()=>{throw Error('Scenery scanned the full course');};
 course.filter=()=>{throw Error('Scenery filtered the full course during a frame');};
 const state={distance:192,zone:0,route:'main'};
 s.instance.scenery(state,2,false);assert(s.records.length>100);
 s.instance.setCourse([]);s.records.length=0;s.instance.scenery(state,2,false);
 const fresh=scenery(current,[]);fresh.instance.scenery(state,2,false);
 assert.deepEqual(s.records,fresh.records);
});

test('restoring a paused secret route reinitializes the camera after the lobby',()=>{
 const gl=mockGL(),scene=new current.Scene.ExpeditionScene(gl),course=current.Core.buildCourse(17);
 scene.setCourse(course);scene.draw(current.Core.freshExpedition(17),0);
 assert.deepEqual(gl.eye,[3.8,3.3,8.6]);
 const saved=current.Core.freshExpedition(17);
 Object.assign(saved,{mode:'paused',distance:225,route:'hollow',routeStart:180,routeEnd:270,routeSide:1,x:.7,y:1.2});
 scene.setCourse(course);scene.draw(saved,0);
 const expected=current.Core.routeOffset(saved)+saved.x*.72;
 assert(Math.abs(gl.eye[0]-expected)<1e-12);
 assert(Math.abs(gl.eye[1]-(4.4+Math.sin(saved.distance/34)*.12+saved.y*.18))<1e-12);
 scene.dispose();
});

test('scenery matrices and material values match the supplied original source',{skip:!baselineDir},()=>{
 let frames=0,instances=0;
 for(const seed of [17,4242,923])for(const d of [0,160,180,198,235,269,360,620,760,798,869,980,1079])for(const calm of [false,true]){
  const course=baseline.Core.buildCourse(seed),old=scenery(baseline,course),next=scenery(current,course),s={distance:d,zone:Math.min(2,Math.floor(d/360)),route:d===235?'hollow':d===798?'grotto':'main'},time=2.17+d/9.8;
  old.instance.scenery(s,time,calm);next.instance.scenery(s,time,calm);
  assert.deepEqual(next.records,old.records,`seed=${seed}, distance=${d}, calm=${calm}`);frames++;instances+=next.records.length;
 }
 console.log(`Exact scenery differential: ${frames} frames, ${instances} primitive matrices/materials.`);
});

test('report isolated CPU timing without an environment-dependent performance gate',{skip:!baselineDir},()=>{
 const measure=(fn,n)=>{for(let i=0;i<20;i++)fn(i);const start=performance.now();for(let i=0;i<n;i++)fn(i);return performance.now()-start;};
 const a=mockGL(),b=mockGL(),old=new baseline.GL.ExpeditionRenderer(a),next=new current.GL.ExpeditionRenderer(b);
 const tailOld=measure(i=>old.updateTail(i/60,.1),1000),tailNew=measure(i=>next.updateTail(i/60,.1),1000);
 const course=baseline.Core.buildCourse(17),before=scenery(baseline,course,false).instance,after=scenery(current,course,false).instance,s={distance:0,zone:0,route:'main'};
 const sceneryOld=measure(i=>before.scenery(s,i/60,false),300),sceneryNew=measure(i=>after.scenery(s,i/60,false),300);
 console.log(JSON.stringify({runtime:process.version,tail1000:{beforeMs:tailOld,afterMs:tailNew},scenery300:{beforeMs:sceneryOld,afterMs:sceneryNew},scope:'Node CPU only; excludes native GL, GPU and React UI'}));
 old.dispose();next.dispose();
});
