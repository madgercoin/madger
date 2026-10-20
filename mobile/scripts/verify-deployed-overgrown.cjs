const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const url=process.argv[2],out=path.resolve(process.argv[3]||path.join(__dirname,'../expedition-evidence/hosted-overgrown'));
if(!url||!/^https:\/\/madger-expedition--[\w-]+\.expo\.app\/expedition$/.test(url))throw Error('Pass the exact Expo Expedition HTTPS URL');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined});
 const page=await browser.newPage({viewport:{width:430,height:920},deviceScaleFactor:1,isMobile:true,hasTouch:true}),errors=[],bad=[],assets=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))bad.push({url:r.url(),status:r.status()});if(r.url().includes('/blackroot/'))assets.push({url:r.url(),status:r.status()});});
 const shot=name=>page.screenshot({path:path.join(out,name+'.png')});
 const raised=async (locator,name)=>{const s=await locator.evaluate(el=>({bevel:parseFloat(getComputedStyle(el).borderBottomWidth)||0,n:el.querySelectorAll('*').length}));assert(s.bevel>=4&&s.n>=4,`${name} has no raised face: ${JSON.stringify(s)}`);};
 try{
  await page.goto(url,{waitUntil:'networkidle',timeout:90000});const start=page.getByRole('button',{name:'Start expedition',exact:true});await start.waitFor({timeout:60000});await start.isEnabled().then(v=>assert(v));await raised(start,'Start expedition');
  await shot('overgrown-live-lobby');
  await page.getByRole('button',{name:'Visit the Burrow Workshop'}).click();await page.getByText('Earn it. Keep it.').waitFor();await page.getByRole('button',{name:'Return to the expedition'}).click();
  await page.getByRole('button',{name:'Hero unlocks'}).click();await page.getByText('Earn four hero fragments',{exact:false}).waitFor();await page.getByRole('button',{name:'Back to the expedition'}).click();
  await start.click();
  await raised(page.getByRole('button',{name:'BURROW',exact:true}),'BURROW control');
  await page.getByLabel(/Expedition distance \d+ meters; lane/).waitFor();
  // These are normal controls; no test checkpoint or game state is inserted.
  await page.waitForTimeout(3000);await page.keyboard.press('ArrowUp');await page.waitForTimeout(120);await shot('overgrown-live-jump');await page.waitForTimeout(900);await page.keyboard.press('ArrowDown');
  const fork=page.getByRole('button',{name:/Choose Mossbound Rootway/});await fork.waitFor({timeout:45000});await raised(fork,'Rootway choice');
  await shot('overgrown-live-fork');await fork.click();
  await page.getByLabel(/Expedition distance 1\d\d meters; lane .*; route rootway/).waitFor({timeout:8000});await page.waitForTimeout(1200);
  await page.getByRole('button',{name:'Pause expedition',exact:true}).click();await page.getByText('Your run is safe.',{exact:true}).waitFor();
  const checkpoint=await page.evaluate(()=>JSON.parse(localStorage.getItem('madger-expedition-3d-v1')).checkpoint);assert.equal(checkpoint.board,'overgrown');assert.equal(checkpoint.route,'rootway');
  await page.reload({waitUntil:'networkidle',timeout:90000});await page.getByText('Your run is safe.',{exact:true}).waitFor({timeout:60000});
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('madger-expedition-3d-v1')).checkpoint);assert.equal(restored.id,checkpoint.id);assert.equal(restored.distance,checkpoint.distance);
  await page.getByRole('button',{name:'Resume expedition',exact:true}).last().click();await page.waitForTimeout(1000);await shot('overgrown-live-rootway');
  assert(assets.some(a=>new URL(a.url).pathname.endsWith('/renderer.mjs')&&a.status===200));assert(assets.some(a=>new URL(a.url).pathname.endsWith('/forest.pack')&&a.status===200),'graphics pack must be served');assert.equal(await page.evaluate(()=>window.madgerActiveRenderer),'pbr');
  const forest=await page.evaluate(()=>window.madgerForestDiagnostics);
  assert(forest?.photoscannedTrees>0,'shipped photogrammetry trees missing from live scene');
  assert(forest?.photoscannedRoots>0,'shipped photoscanned root geometry missing');
  assert(forest?.photoscannedGrasses>0,'shipped 3D ground-cover grass missing');
  assert(forest?.terrainVertices>4000,'authored terrain geometry missing');
  console.log('HOSTED_FOREST_METRICS',JSON.stringify(forest));
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  const report={date:new Date().toISOString(),status:'PASS',url,checks:['hosted game loads and enables play','beveled 3D buttons and symbols on lobby, controls and route choices','real scanned models and material maps load from Expo','workshop opens','heroes start locked','ordinary movement and burrow inputs','live three-way fork','physical Rootway selection','pause and cold reload preserve the same checkpoint','saved run resumes'],assets:assets.length,errors,bad};
  fs.writeFileSync(path.join(out,'overgrown-live-verification.json'),JSON.stringify(report,null,2));console.log('HOSTED_OVERGROWN_PASS',JSON.stringify(report));
 }catch(e){await shot('hosted-failure').catch(()=>{});console.error('HOSTED_OVERGROWN_FAIL',String(e),errors,bad);throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
