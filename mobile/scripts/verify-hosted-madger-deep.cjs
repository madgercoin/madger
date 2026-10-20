/* Real Chrome gameplay through Deep Burrow; no injected game state. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const url=process.argv[2];
if(!url||!/^https:\/\/madger-expedition--[\w-]+\.expo\.app\/expedition$/.test(url))
  throw Error('Supply the exact Expo Expedition preview URL');
const out=path.resolve(process.argv[3]||path.join(__dirname,'../expedition-evidence/hosted-madger-deep'));
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({
  headless:true,
  executablePath:process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined
 });
 const page=await browser.newPage({viewport:{width:430,height:920},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))bad.push({url:r.url(),status:r.status()});});
 try{
  await page.goto(url,{waitUntil:'networkidle',timeout:100000});
  await page.getByRole('button',{name:'Start expedition',exact:true}).waitFor({timeout:70000});
  await page.waitForFunction(()=>window.madgerActiveRenderer==='pbr'&&window.madgerHeroDiagnostics?.approvedFace,
    undefined,{timeout:70000});
  await page.screenshot({path:path.join(out,'approved-madger-front.png')});
  await page.getByRole('button',{name:'Start expedition',exact:true}).click();
  await page.getByRole('button',{name:/Choose Deep Burrow/}).waitFor({timeout:65000});
  await page.getByRole('button',{name:/Choose Deep Burrow/}).click();
  await page.getByLabel(/Expedition distance 1\d\d meters; lane .*; route deep/).waitFor({timeout:10000});
  await page.waitForFunction(()=>window.madgerForestDiagnostics?.cavernVaultTriangles>4000,
    undefined,{timeout:12000});
  const state=await page.evaluate(()=>({
    hero:window.madgerHeroDiagnostics,forest:window.madgerForestDiagnostics
  }));
  assert.equal(state.forest.biome,'cavern');
  assert.equal(state.forest.madgerRig,'authored-3d');
  assert(state.forest.cavernVaultTriangles>4000);
  assert(state.hero.approvedFace&&state.hero.backChevron&&state.hero.patternedTail);
  await page.screenshot({path:path.join(out,'deep-playable-cavern.png')});
  await page.getByRole('button',{name:'Pause expedition',exact:true}).click();
  await page.getByText('Your run is safe.',{exact:true}).waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('madger-expedition-3d-v1')).checkpoint);
  assert.equal(saved.route,'deep');
  await page.reload({waitUntil:'networkidle',timeout:100000});
  await page.getByText('Your run is safe.',{exact:true}).waitFor({timeout:70000});
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('madger-expedition-3d-v1')).checkpoint);
  assert.equal(restored.id,saved.id);assert.equal(restored.distance,saved.distance);
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  const report={date:new Date().toISOString(),status:'PASS',url,
    checks:['approved face on live 3D rig','real controls choose Deep Burrow',
      'physically enclosed PBR cavern','real save/reload returns to Deep',
      'back stripe and 3D patterned tail','no JavaScript or failed requests'],
    hero:state.hero,cavernVaultTriangles:state.forest.cavernVaultTriangles,errors,bad};
  fs.writeFileSync(path.join(out,'hosted-madger-deep.json'),JSON.stringify(report,null,2));
  console.log('HOSTED_MADGER_DEEP_PASS',JSON.stringify(report));
 }catch(e){
  await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
  console.error('HOSTED_MADGER_DEEP_FAIL',e.stack||String(e),JSON.stringify({errors,bad}));
  throw e;
 }finally{await browser.close();}
})().catch(()=>{process.exitCode=1;});