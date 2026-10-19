/* Tooling only: actual same-scene completed frames; includes presentation cost. */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.SCENE_SCALE_OUT||path.join(root,'scene-scale-evidence'));fs.mkdirSync(out,{recursive:true});
let bundle='const factories={},cache={};function require(n){n=n.replace(/^\\.\\//,"");if(cache[n])return cache[n].exports;const m={exports:{}};cache[n]=m;factories[n](require,m,m.exports);return m.exports;}';
for(const name of ['companions','core','math','gl','companion-models','scene','profile','animation'])bundle+='\nfactories['+JSON.stringify(name)+']=function(require,module,exports){'+ts.transpileModule(fs.readFileSync(path.join(root,'src/game/expedition',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText+'};';
const options={blocks:Number(process.env.PROFILE_BLOCKS||5),frames:Number(process.env.PROFILE_FRAMES||24),warmup:Number(process.env.PROFILE_WARMUP||12)};
(async()=>{const report={options,scope:'Desktop Chrome software renderer; not Android or phone throughput',apis:[]};
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const api of ['webgl2','webgl']){const page=await browser.newPage({viewport:{width:480,height:960},deviceScaleFactor:1});
 await page.setContent('<style>body{margin:0;background:#061710}canvas{display:block}</style><canvas width="480" height="960" id="canvas"></canvas><script>'+bundle+'</script>');
 const setup=await page.evaluate(api=>{const gl=document.getElementById('canvas').getContext(api,{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('No '+api);window.ctx=gl;const info=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),samples:gl.getParameter(gl.SAMPLES),sampleBuffers:gl.getParameter(gl.SAMPLE_BUFFERS),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight};},api);
 const measurements=await page.evaluate(async options=>{const gl=window.ctx,Core=require('core'),Scene=require('scene').ExpeditionScene,Renderer=require('gl').ExpeditionRenderer;
 const variants=[{id:'direct',options:{}},{id:'offscreen-1',options:{offscreen:true,sceneScale:1}},{id:'offscreen-075',options:{offscreen:true,sceneScale:.75}}];
 window.variants=variants;const state=Core.freshExpedition(7,'scale-profile');state.mode='running';state.distance=54;state.time=4;window.profileState=state;
 for(const v of variants){v.scene=new Scene(gl);v.scene.renderer.dispose();v.scene.renderer=new Renderer(gl,v.options);v.scene.setCourse(Core.buildCourse(7));v.blocks=[];v.samples=[];}
 const pixel=new Uint8Array(4),draw=v=>{const start=performance.now();v.scene.draw(state,4,false);gl.finish();gl.readPixels(240,480,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return performance.now()-start;};
 const idle=[];for(let i=0;i<12;i++){const start=performance.now();gl.finish();gl.readPixels(240,480,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);idle.push(performance.now()-start);}
 for(const v of variants)for(let i=0;i<options.warmup;i++){draw(v);await new Promise(r=>setTimeout(r,0));}
 for(let b=0;b<options.blocks;b++)for(const index of (b%2?[2,1,0]:[0,1,2])){const v=variants[index],samples=[];for(let f=0;f<options.frames;f++){samples.push(draw(v));await new Promise(r=>setTimeout(r,0));}v.blocks.push(samples.reduce((a,b)=>a+b,0)/samples.length);v.samples.push(...samples);}
 window.capture=(id,d)=>{state.distance=d;state.zone=Core.zoneAt(d);state.time=d/14;const v=variants.find(x=>x.id===id);for(let i=0;i<8;i++)v.scene.draw(state,state.time,false);gl.finish();return {...v.scene.stats};};
 return {idle,variants:variants.map(v=>({id:v.id,blocks:v.blocks,samples:v.samples,stats:v.scene.stats})),error:gl.getError()};},options);
 const captures=[];for(const distance of [54,394,810])for(const id of ['direct','offscreen-1','offscreen-075']){const stats=await page.evaluate(({id,distance})=>window.capture(id,distance),{id,distance});const filename=`${api}-${distance}-${id}.png`;await page.locator('canvas').screenshot({path:path.join(out,filename)});captures.push({distance,id,filename,stats});}
 const record={api,...setup,...measurements,captures,lifecycleStatus:'pending'};report.apis.push(record);fs.writeFileSync(path.join(out,'profile.json'),JSON.stringify(report,null,2));
 const lifecycle=await page.evaluate(async()=>{
  const gl=window.ctx,canvas=document.getElementById('canvas'),Target=require('gl').SceneRenderTarget,pixel=new Uint8Array(4),checks=[];
  const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},paint=(target,color)=>{gl.viewport(0,0,target.width,target.height);gl.clearColor(...color,1);gl.clear(gl.COLOR_BUFFER_BIT);target.present(canvas.width,canvas.height);gl.finish();gl.readPixels(20,20,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);};
  for(const v of window.variants)v.scene.dispose();
  const target=new Target(gl);check(target.begin(canvas.width,canvas.height,.75),'real framebuffer complete');paint(target,[1,0,0]);check(pixel[0]===255&&pixel[1]===0,'presentation preserves known red pixel');
  canvas.width=431;canvas.height=919;check(target.begin(431,919,.75)&&target.width===323&&target.height===689,'real odd-size resize');paint(target,[0,1,0]);check(pixel[0]===0&&pixel[1]===255,'resized presentation preserves green pixel');target.dispose();target.dispose();
  const status=gl.checkFramebufferStatus.bind(gl);gl.checkFramebufferStatus=()=>gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;const failed=new Target(gl);check(!failed.begin(431,919,.75),'incomplete target falls back');failed.dispose();gl.checkFramebufferStatus=status;
  const ext=gl.getExtension('WEBGL_lose_context');check(!!ext,'context-loss extension available');const old=new Target(gl);check(old.begin(431,919,.75),'target before context loss');
  const waitEvent=name=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(name+' timeout')),5000);canvas.addEventListener(name,event=>{event.preventDefault();clearTimeout(timer);resolve();},{once:true});});
  let event=waitEvent('webglcontextlost');ext.loseContext();await event;check(!old.begin(431,919,.75),'lost context refuses target');old.dispose();await new Promise(resolve=>setTimeout(resolve,250));event=waitEvent('webglcontextrestored');ext.restoreContext();await event;
  const restored=new Target(gl);check(restored.begin(431,919,.75),'restored context creates fresh target');paint(restored,[0,0,1]);check(pixel[2]===255&&pixel[0]===0,'restored presentation preserves blue pixel');restored.dispose();check(gl.getError()===gl.NO_ERROR,'no GL errors after lifecycle');return checks;
 });
 record.lifecycle=lifecycle;record.lifecycleStatus='passed';fs.writeFileSync(path.join(out,'profile.json'),JSON.stringify(report,null,2));console.log('SCENE_SCALE_PROFILE',JSON.stringify({api,...setup,variants:measurements.variants.map(({id,blocks,stats})=>({id,blocks,stats})),error:measurements.error,lifecycle}));await page.close();}
 }finally{await browser.close();}fs.writeFileSync(path.join(out,'profile.json'),JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
