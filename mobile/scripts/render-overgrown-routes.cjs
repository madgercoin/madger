/* Renderer fixtures, separate from the ordinary-input app acceptance test. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),os=require('node:os'),ts=require('typescript');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),out=path.join(root,'expedition-evidence','overgrown-routes');fs.mkdirSync(out,{recursive:true});
const worldPresets=JSON.parse(fs.readFileSync(path.join(root,'public','blackroot','world-presets.json'),'utf8'));
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'overgrown-render-'));
for(const name of ['companions','core'])fs.writeFileSync(path.join(temporary,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(root,'src/game/expedition',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const G=require(path.join(temporary,'core.js'));
const types={'.mjs':'application/javascript','.js':'application/javascript','.html':'text/html','.jpg':'image/jpeg','.png':'image/png','.gltf':'model/gltf+json'};
const server=http.createServer((req,res)=>{
 if(req.url==='/fixture'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<body style="margin:0;background:#101d1d"><canvas width="430" height="920" style="display:block;width:430px;height:920px"></canvas><script type="module">import "/blackroot/renderer.mjs";window.rendererLoaded=true;</script>');return;}
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
  // The current branch graph covers twelve routes. Include the launch approach
  // and two grandfathered shortcuts so ALL persistent route IDs get a live PBR
  // render check; do not edit the course graph or any save schema.
  for(const route of ['main','hollow','grotto']){
   const s=G.freshOvergrownExpedition(19,'render-'+route);
   Object.assign(s,{route,mode:'paused',distance:route==='main'?86:680,
     routeStart:route==='main'?0:455,routeEnd:900,routeSide:0,
     majorPath:route==='main'?null:'deep',subPath:route==='main'?null:route});
   fixtures.push(s);
  }
  const covered=new Set(fixtures.filter(s=>s.mode!=='chamber').map(s=>s.route));
  assert.deepEqual([...covered].sort(),Object.keys(worldPresets.routes).sort(),
   'Every authored and legacy saved route must have its own rendered fixture');
  assert.equal(fixtures.length,covered.size+G.CHAMBERS.length,
   'No route may silently replace a secret chamber or duplicate another test');
  const results=[];
  for(const run of fixtures){
   const data=await page.evaluate(async({run,course})=>{
    window.fixtureScene.setCourse(course);window.fixtureScene.draw(run,12,false);
    await new Promise(requestAnimationFrame);window.fixtureScene.draw(run,12.016,false);
    const gl=document.querySelector('canvas').getContext('webgl2');
    const canvas=document.querySelector('canvas'),viewport=canvas.getBoundingClientRect();
    const display={width:viewport.width,height:viewport.height,bufferWidth:gl.drawingBufferWidth,bufferHeight:gl.drawingBufferHeight};
    const material=window.fixtureScene.renderer.terrain.material;
    const terrainPbr=Boolean(material.isMeshStandardMaterial&&material.map&&material.normalMap&&material.roughnessMap);
    return {route:run.chamber||run.route,stats:window.fixtureScene.stats,hero:window.madgerHeroDiagnostics,terrainPbr,display,glError:gl.getError()};
   },{run,course:G.buildOvergrownCourse(run.seed)});
   console.log('MADGER_HERO_FIXTURE',JSON.stringify({route:data.route,instances:data.stats.instances,meshCount:data.stats.madgerMeshCount,heroTriangles:data.stats.madgerTriangles,renderedTriangles:data.stats.triangles,drawCalls:data.stats.drawCalls,rig:data.stats.madgerRig,glError:data.glError}));
   assert.equal(data.glError,0,run.route);assert(data.stats.assetsReady);
   assert.equal(data.display.width,430,'Route screenshot must occupy full 430px mobile width');
   assert.equal(data.display.height,920,'Route screenshot must occupy full 920px mobile height');
   assert(data.display.bufferWidth>=200&&data.display.bufferHeight>=420,
     'Canvas backing pixels must not shrink over repeated frames: '+run.route);
   assert(data.stats.triangles>10000&&data.stats.drawCalls>10,'No playable 3D scenery: '+run.route);
   // The grandfathered shortcuts contain scenery but deliberately have no
   // modern course-prop batches. Their PBR geometry is checked separately.
   if(!['hollow','grotto'].includes(run.route))assert(data.stats.instances>30,'Missing authored running props: '+run.route);
   assert.equal(data.terrainPbr,true,'Terrain missing diffuse, normal or roughness PBR channels: '+run.route);
   assert.equal(data.stats.madgerRig,'authored-3d','Legacy generic character appeared');
   assert(data.stats.madgerMeshCount>=80&&data.stats.madgerTriangles>30000,'Custom animated 3D hero was not rendered');
   assert(data.hero?.approvedFace&&data.hero?.backChevron&&data.hero?.patternedTail,'Required MADGER identity marks missing');
   if(run.mode==='chamber'){
     assert.equal(data.stats.cavernVaultTriangles,0,'Cavern ceiling obstructed a secret room');
     assert.equal(data.stats.cavernFormationInstances,0,'Geological objects intruded into secret room');
   }else if(worldPresets.routes[run.route][0]==='cavern'){
     assert(data.stats.cavernVaultTriangles>4000,'Playable underground vault not rendered');
     assert(data.stats.cavernFormationInstances>=12,'Cave lacks PBR geological detail: '+run.route);
     assert(data.stats.cavernFormationTriangles<=17000,'Cave exceeds mobile geological mesh budget: '+run.route);
     if(['crystal-vein','ancient-vault','grotto'].includes(run.route))
       assert(data.stats.cavernMineralInstances>0,'Distinct mineral formation missing: '+run.route);
   }else{
     assert.equal(data.stats.cavernFormationInstances,0,'Underground formations leaked outdoors');
   }
   if(run.mode!=='chamber'&&worldPresets.routes[run.route][0]==='ruins')
     assert(data.stats.ruinRubbleStones>=4,'PBR collapsed masonry is missing on '+run.route);
   else assert.equal(data.stats.ruinRubbleStones,0,'Surface rubble intruded into another biome');
   assert.equal(data.stats.route,run.route,'Live renderer route differs from selected route');
   assert.equal(data.stats.biome,worldPresets.routes[run.route][0],'Wrong environment biome: '+run.route);
   assert.equal(data.stats.terrainProfileLoaded,true,'Authored terrain profile was not loaded: '+run.route);
   assert.equal(data.stats.terrainMaterial,data.stats.biome,'PBR ground texture does not match biome');
   if(run.mode!=='chamber')assert.equal(data.stats.atmosphereProfileLoaded,true,'No route-specific lighting profile: '+run.route);
   assert.equal(data.stats.sunbeamPrimitives,0,'Unrealistic solid light cone returned: '+run.route);
    // Only outdoor scenes stream the new layered PBR backdrop. Indoor
    // chamber/underground routes must never render the sky or distant banks.
    const outdoor=run.mode!=='chamber'&&['forest','ruins'].includes(data.stats.biome);
    assert.equal(data.stats.skyVisible,outdoor,'Sky leaked into wrong biome: '+run.route);
    if(outdoor)assert(data.stats.backgroundLandforms>=4&&data.stats.backgroundLandforms<=20,
      'Seamless PBR far banks absent or over budget: '+run.route);
    else assert.equal(data.stats.backgroundLandforms,0,'Distant hills leaked into underground: '+run.route);
   await page.screenshot({path:path.join(out,(run.chamber||run.route)+'.png')});results.push(data);
  }
  // Prove that the existing mobile fallback actually reduces rendered geometry,
  // not merely canvas resolution. This is a browser LOD comparison, not phone FPS.
  const lod=await page.evaluate(({run,course})=>{
    const scene=window.fixtureScene,renderer=scene.renderer;
    scene.setCourse(course);
    renderer.quality=1;scene.draw(run,20,false);const full=renderer.stats.triangles;
    renderer.quality=.52;scene.draw(run,20.016,false);const reduced=renderer.stats.triangles;
    renderer.quality=1;
    return {full,reduced};
  },{run:fixtures[0],course:G.buildOvergrownCourse(fixtures[0].seed)});
  assert(lod.full>0&&lod.reduced<lod.full*.95,'Adaptive 3D detail did not lower geometry: '+JSON.stringify(lod));
  // Exercise real 3D foliage instance transforms at two visual times. Route,
  // collision and checkpoint state are never changed by the renderer.
  const foliageMotion=await page.evaluate(({run,course})=>{
    const scene=window.fixtureScene,copy=structuredClone(run);
    copy.mode='paused';copy.time=1;scene.setCourse(course);
    scene.draw(copy,31,false);
    const grass=scene.renderer.scanBatches.find(item=>item.id==='grass_medium_02')?.mesh;
    if(!grass?.count)return {count:0,changed:false};
    const before=Array.from(grass.instanceMatrix.array.slice(0,16));
    copy.time=3;scene.draw(copy,33,false);
    const after=Array.from(grass.instanceMatrix.array.slice(0,16));
    return {count:grass.count,changed:before.some((v,i)=>v!==after[i])};
  },{run:fixtures[0],course:G.buildOvergrownCourse(fixtures[0].seed)});
  assert(foliageMotion.count>0&&foliageMotion.changed,
    'PBR instanced understory must animate subtly without new geometry');
  const timing=await page.evaluate(async()=>{const s=window.fixtureScene,r=s.renderer.run,gaps=[];r.mode='paused';r.chamber=undefined;r.route='ancient-vault';r.routeSide=1;r.distance=680;let previous=performance.now();for(let i=0;i<55;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>4)gaps.push(now-previous);previous=now;r.distance+=.16;s.draw(r,15+i/60,false);}const sorted=gaps.sort((a,b)=>a-b);return {mean:gaps.reduce((a,b)=>a+b,0)/gaps.length,p95:sorted[Math.floor(sorted.length*.95)],triangles:s.stats.triangles,drawCalls:s.stats.drawCalls};});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={date:new Date().toISOString(),scope:'Actual exported renderer with deterministic route fixtures, separate from real-control gameplay tests',results,timing,lod,foliageMotion,errors,failed};
  fs.writeFileSync(path.join(out,'renderer-routes.json'),JSON.stringify(report,null,2));console.log('ALL_ROUTES_RENDER_PASS',JSON.stringify({routes:results.length,timing,lod,foliageMotion}));
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(temporary,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
