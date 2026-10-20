/* Renderer fixtures, separate from the ordinary-input app acceptance test. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),os=require('node:os'),ts=require('typescript');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),out=path.join(root,'expedition-evidence','overgrown-routes');fs.mkdirSync(out,{recursive:true});
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'overgrown-render-'));
for(const name of ['companions','core'])fs.writeFileSync(path.join(temporary,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(root,'src/game/expedition',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const G=require(path.join(temporary,'core.js'));
const types={'.mjs':'application/javascript','.js':'application/javascript','.html':'text/html','.jpg':'image/jpeg','.png':'image/png','.gltf':'model/gltf+json'};
const server=http.createServer((req,res)=>{
 if(req.url==='/fixture'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<body style="margin:0"><canvas width="430" height="920"></canvas><script type="module">import "/blackroot/renderer.mjs";window.rendererLoaded=true;</script>');return;}
 const file=path.resolve(dist,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined});
 const page=await browser.newPage({viewport:{width:430,height:920}}),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))failed.push(r.url())});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');await page.waitForFunction(()=>window.rendererLoaded);
  await page.evaluate(async()=>{window.fixtureScene=await window.madgerOvergrownScene(document.querySelector('canvas').getContext('webgl2'));});
  const fixtures=[];
  for(const major of G.MAJOR_FORKS){
   const s=G.freshOvergrownExpedition(19,'render-'+major.id);s.mode='fork';s.distance=140;s.forkStage=1;G.chooseFork(s,major.id,[]);s.distance=230;s.mode='paused';fixtures.push(structuredClone(s));
   for(const sub of G.SUB_FORKS[major.id]){const child=structuredClone(s);child.route='main';child.mode='fork';child.distance=455;child.forkStage=2;child.keys=1;G.chooseFork(child,sub.id,[]);child.distance=680;child.mode='paused';fixtures.push(child);}
  }
  for(const meta of G.CHAMBERS){
   const s=G.freshOvergrownExpedition(19,'interior-'+meta.id);
   const major=meta.route==='root-arch'?'rootway':meta.route==='gearworks'?'ridge':'deep';
   Object.assign(s,{mode:'running',forkStage:2,majorPath:major,subPath:meta.route,route:meta.route,routeStart:455,routeEnd:900,routeSide:G.SUB_FORKS[major].find(o=>o.id===meta.route).side,distance:meta.d-.7,x:meta.lane*G.LANE_WIDTH,lane:meta.lane});
   if(meta.action==='burrow')G.burrow(s,[]);else{s.y=1;s.vy=0;}
   const course=G.buildOvergrownCourse(s.seed);for(let i=0;i<8&&s.mode==='running';i++)G.fixedStep(s,course,[]);
   assert.equal(s.mode,'chamber');fixtures.push(s);
  }
  const results=[];
  for(const run of fixtures){
   const data=await page.evaluate(async({run,course})=>{
    window.fixtureScene.setCourse(course);window.fixtureScene.draw(run,12,false);
    await new Promise(requestAnimationFrame);window.fixtureScene.draw(run,12.016,false);
    const gl=document.querySelector('canvas').getContext('webgl2');return {route:run.chamber||run.route,stats:window.fixtureScene.stats,glError:gl.getError()};
   },{run,course:G.buildOvergrownCourse(run.seed)});
   assert.equal(data.glError,0,run.route);assert(data.stats.assetsReady);assert(data.stats.instances>100);
   await page.screenshot({path:path.join(out,(run.chamber||run.route)+'.png')});results.push(data);
  }
  const timing=await page.evaluate(async()=>{const s=window.fixtureScene,r=s.renderer.run,gaps=[];r.mode='paused';r.chamber=undefined;r.route='ancient-vault';r.routeSide=1;r.distance=680;let previous=performance.now();for(let i=0;i<55;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>4)gaps.push(now-previous);previous=now;r.distance+=.16;s.draw(r,15+i/60,false);}const sorted=gaps.sort((a,b)=>a-b);return {mean:gaps.reduce((a,b)=>a+b,0)/gaps.length,p95:sorted[Math.floor(sorted.length*.95)],triangles:s.stats.triangles,drawCalls:s.stats.drawCalls};});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={date:new Date().toISOString(),scope:'Actual exported renderer with deterministic route fixtures, separate from real-control gameplay tests',results,timing,errors,failed};
  fs.writeFileSync(path.join(out,'renderer-routes.json'),JSON.stringify(report,null,2));console.log('ALL_ROUTES_RENDER_PASS',JSON.stringify({routes:results.length,timing}));
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(temporary,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
