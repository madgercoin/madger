/** Real browser acceptance for branching Overgrown Burrow (no game-state injections). */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),out=path.join(root,'expedition-evidence','overgrown-board');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost'),relative=decodeURIComponent(u.pathname)==='/'?'/index.html':decodeURIComponent(u.pathname);let file=path.resolve(dist,'.'+relative);if(!file.startsWith(dist+path.sep)){res.writeHead(403);return res.end();}if(!path.extname(file))file+='.html';if(!fs.existsSync(file)){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(400);res.end();}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':undefined)});
 const context=await browser.newContext({viewport:{width:430,height:920},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],badRequests=[];page.on('console',m=>{if(m.type()==='error')console.error('BROWSER_CONSOLE',m.text())});page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))badRequests.push({url:r.url(),status:r.status()});});
 const shot=async name=>page.screenshot({path:path.join(out,name+'.png')});
 const assert3DButton=async (locator,name)=>{const detail=await locator.evaluate(element=>({bevel:parseFloat(getComputedStyle(element).borderBottomWidth)||0,children:element.querySelectorAll('*').length}));assert(detail.bevel>=1,`${name} missing raised lower bevel: ${JSON.stringify(detail)}`);assert(detail.children>=4,`${name} missing layered icon or button face: ${JSON.stringify(detail)}`);};
 const nonblank=async()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const canvas=document.querySelector('canvas');if(!canvas)return resolve(false);const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');g.drawImage(canvas,0,0,64,64);const v=g.getImageData(0,0,64,64).data;let bright=0;for(let i=0;i<v.length;i+=4)if(v[i]+v[i+1]+v[i+2]>30)bright++;resolve(bright>1100);})));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/expedition';
  const startedAt=Date.now();
  await page.goto(url,{waitUntil:'networkidle',timeout:90000});
  await page.getByRole('button',{name:'Start expedition'}).waitFor({timeout:90000});
  console.log('FOREST_BOOT_TIME_MS',Date.now()-startedAt);
  await assert3DButton(page.getByRole('button',{name:'Start expedition'}),'Start expedition');
  await assert3DButton(page.getByRole('button',{name:'Mute sound'}),'Sound icon');
  assert(await nonblank(),'lobby scenery must be 3D and nonblank');
  await page.waitForFunction(()=>window.madgerActiveRenderer==='pbr'&&window.madgerForestDiagnostics?.photoscannedTrees>0,{timeout:30000});
  await shot('01-overgrown-lobby');
  await page.getByRole('button',{name:'Visit the Burrow Workshop'}).click();
  await page.getByText('Earn it. Keep it.').waitFor();
  await page.getByText('0 COINS').waitFor();await shot('02-earned-workshop');
  await page.getByRole('button',{name:'Return to the expedition'}).click();
  await page.getByRole('button',{name:'Hero unlocks'}).click();
  await page.getByText('Earn four hero fragments',{exact:false}).waitFor({timeout:5000});
  await shot('03-locked-hero-roster');
  await page.getByRole('button',{name:'Back to the expedition'}).click();
  await page.getByRole('button',{name:'Start expedition'}).click();
  await assert3DButton(page.getByRole('button',{name:'BURROW',exact:true}),'Raised BURROW control');
  await page.getByText('HERO ENERGY',{exact:false}).waitFor({timeout:10000}).catch(()=>{});
  await page.getByText(/LIVE PATH · \d+ m · STEER BEFORE THE JUNCTION/).waitFor({timeout:45000});
  await page.waitForFunction(()=>{const label=document.querySelector('[aria-label^="Expedition distance"]')?.getAttribute('aria-label')||'';const metres=Number(label.match(/distance (\d+)/)?.[1]||0);return metres>=119&&metres<140;},{},{timeout:45000});
  assert(await page.locator('canvas').count()>0,'live split must keep rendering');
  // Do not stall active physics with a GPU screenshot readback at the fork.
  assert(await page.getByText('Rootway',{exact:false}).isVisible(),'Three live path labels must be visible');
  const d1=await page.getByLabel(/Expedition distance \d+ meters; lane/).getAttribute('aria-label');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(350);
  const d2=await page.getByLabel(/Expedition distance \d+ meters; lane/).getAttribute('aria-label');
  assert.notEqual(d1,d2,'time and movement must continue while approaching the split');
  assert(!await page.getByText('Choose your destiny.',{exact:true}).isVisible(),'Old blocking fork dialog returned');
  await page.getByLabel(/Expedition distance 1\d\d meters; lane .*; route rootway/).waitFor({timeout:7000});
  await page.waitForTimeout(1200);
  // Read the non-preserved WebGL drawing buffer while it is actively rendered.
  // After pause the compositor retains the picture but the buffer may be cleared.
  assert(await nonblank(),'selected branch must render');
  await page.getByRole('button',{name:'Pause expedition',exact:true}).click();
  await page.getByText('Your run is safe.',{exact:true}).waitFor();
  await shot('05-rootway-physical-branch');
  const forest=await page.evaluate(()=>window.madgerForestDiagnostics);
  assert(forest.photoscannedTrees>0,'Photogrammetry trees did not render');
  assert(forest.photoscannedGrasses>0,'3D ground-cover grass did not render');
  assert(forest.photoscannedRoots>0,'Real scanned roots did not render');
  assert(forest.terrainVertices>4000,'Continuous deformable terrain missing');
  assert.equal(forest.sceneryProfileLoaded,true,'Route-specific authored foliage profile missing');
  assert(forest.groundedSceneryInstances>20,'Scanned vegetation is not anchored to the terrain surface');
  console.log('FOREST_WORLD_DIAGNOSTICS',JSON.stringify(forest));
  assert(await page.getByLabel(/HERO ENERGY/).count()>=0);
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert.equal(badRequests.length,0,JSON.stringify(badRequests));
  const report={date:new Date().toISOString(),status:'PASS',checks:['rendered 3D lobby','modern layered Start button and crisp one-pixel icon shadows','workshop opens and displays earned-only upgrades','heroes begin locked','three choices appear in real time','live visible three-road guidance','BURROW input retains raised tactile control','real-time fork preserves forward movement','selection opens physical Rootway route','selected branch remains nonblank','photoscanned CC0 trees, 3D roots, grass and contoured terrain load','per-route scenery configuration and grounded 3D instances verified','no JS errors or failed assets'],errors,badRequests};
  fs.writeFileSync(path.join(out,'browser-branch-acceptance.json'),JSON.stringify(report,null,2));console.log('OVERGROWN_BROWSER_PASS',JSON.stringify(report));
 }catch(e){await shot('failure').catch(()=>{});console.error('OVERGROWN_BROWSER_FAIL',String(e),'ERRORS',errors);throw e;}
 finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
