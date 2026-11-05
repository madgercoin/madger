/* Explicit saved-run fixtures approach each secret; normal inputs enter and claim it. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict'),ts=require('typescript'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),out=process.env.MADGER_CHAMBER_EVIDENCE?path.resolve(process.env.MADGER_CHAMBER_EVIDENCE):path.join(root,'expedition-evidence','secret-chambers');fs.mkdirSync(out,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'madger-chambers-'));
for(const name of ['companions','core','profile'])fs.writeFileSync(path.join(temp,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(root,'src/game/expedition',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const G=require(path.join(temp,'core.js')),P=require(path.join(temp,'profile.js'));
const types={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.jpg':'image/jpeg','.png':'image/png','.css':'text/css','.ttf':'font/ttf','.wav':'audio/wav','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{let file=path.resolve(dist,'.'+decodeURIComponent(req.url.split('?')[0]));if(!path.extname(file))file+='.html';if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
// Slow software-GPU frames can legitimately trigger MADGER's protective pause.
// A normal Resume click is required; this test must never bypass game rules
// or pretend the runner kept moving while it was safely paused.
async function reachApproach(page,minimumDistance,chamber){
 const safe=page.getByText('Your run is safe.',{exact:true});
 const label=page.locator('[aria-label^="Expedition distance"]').first();
 const until=Date.now()+75000;
 let resumes=0,meters=-1;
 while(Date.now()<until){
  if(await safe.isVisible()){
   if(++resumes>5)throw new Error('Repeated protective graphics pauses near '+chamber+
     ' after five real Resume clicks; gameplay was not reliable');
   const checkpoint=await label.getAttribute('aria-label').catch(()=>null);
   console.log('CHAMBER_SAFE_PAUSE',JSON.stringify({chamber,resumes,checkpoint}));
   await page.getByRole('button',{name:'Resume expedition',exact:true}).last().click();
  }
  const current=await label.getAttribute('aria-label').catch(()=>null);
  const distance=/(?:Expedition )?distance (\d+)/.exec(current||'');
  if(distance)meters=Number(distance[1]);
  if(meters>=minimumDistance)return {resumes,meters};
  await page.waitForTimeout(65);
 }
 throw new Error('Chamber approach did not reach '+minimumDistance+'m for '+chamber+
   '; last observed='+meters+'m; protective resumes='+resumes);
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)}),results=[];
 try{
  for(const meta of G.CHAMBERS){
   if(process.env.MADGER_CHAMBER_URL&&results.length)await new Promise(resolve=>setTimeout(resolve,20000));
   const profile=P.emptyExpeditionProfile(),s=G.freshOvergrownExpedition(23,'browser-'+meta.id);
   Object.assign(s,{mode:'paused',forkStage:2,majorPath:meta.route==='root-arch'?'rootway':meta.route==='gearworks'?'ridge':'deep',subPath:meta.route,route:meta.route,routeStart:455,routeEnd:900,distance:meta.d-(meta.action==='jump'?4.2:6.4),x:meta.lane*G.LANE_WIDTH,lane:meta.lane,hp:1});
   s.routeSide=G.SUB_FORKS[s.majorPath].find(c=>c.id===meta.route).side;profile.checkpoint=s;
   const context=await browser.newContext({viewport:{width:430,height:920},deviceScaleFactor:1,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],warnings=[],requests=[];
   page.on('response',r=>{if(r.status()>=400)requests.push({url:r.url(),status:r.status()})});page.on('pageerror',e=>errors.push(e.stack||e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});
   await page.addInitScript(({profile,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(profile));},{profile,key:P.EXPEDITION_KEY});
   try{
    await page.goto(process.env.MADGER_CHAMBER_URL||('http://127.0.0.1:'+server.address().port+'/expedition'),{waitUntil:'networkidle',timeout:90000});
    await page.getByText('Your run is safe.',{exact:true}).waitFor();await page.waitForFunction(()=>window.madgerActiveRenderer==='pbr',undefined,{timeout:90000});assert.equal(await page.evaluate(()=>window.madgerActiveRenderer),'pbr','secret rooms require the actual PBR renderer');await page.getByRole('button',{name:'Resume expedition',exact:true}).last().click();
    // The exact saved approach is a fixture, not a gameplay-speed override.
    // A slow software-GPU hierarchy poll previously overshot the door at
    // 707m (704m entrance) before sending BURROW. Begin the real keyboard
    // input immediately on Resume, leaving the full normal collision test in
    // charge of whether we enter. Jump and burrow need different lead distance.
    const input=meta.action==='burrow'?'ArrowDown':'ArrowUp';
    const approach={resumes:0,meters:s.distance,doorMeters:meta.d};
    console.log('CHAMBER_ENTRY_INPUT',JSON.stringify({chamber:meta.id,action:meta.action,approach}));
    await page.keyboard.press(input);
    for(let attempt=0;attempt<70&&!await page.getByText(meta.name,{exact:true}).isVisible();attempt++){
      const current=await page.locator('[aria-label^="Expedition distance"]').first().getAttribute('aria-label').catch(()=>null);
      const metres=Number(/distance (\d+)/.exec(current||'')?.[1]||-1);
      if(metres>meta.d+2)throw new Error('Normal input missed '+meta.name+' hatch at '+meta.d+'m; already at '+metres+'m');
      if(await page.getByText('Your run is safe.',{exact:true}).isVisible()){
        if(++approach.resumes>5)throw new Error('Repeated real GPU safety pauses during '+meta.id);
        await page.getByRole('button',{name:'Resume expedition',exact:true}).last().click();
        await page.keyboard.press(input);
      }
      await page.waitForTimeout(80);
    }
    await page.getByText(meta.name,{exact:true}).waitFor({timeout:5000});
    await page.screenshot({path:path.join(out,meta.id+'.png')});
    const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).checkpoint,P.EXPEDITION_KEY);
    const before=await stored();assert.equal(before.mode,'chamber');
    await page.waitForTimeout(450);const frozen=await stored();assert.equal(frozen.distance,before.distance);assert.equal(frozen.time,before.time);
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});await page.getByText(meta.name,{exact:true}).waitFor({timeout:60000});await page.waitForFunction(()=>window.madgerActiveRenderer==='pbr',undefined,{timeout:60000});
    const choice=meta.hero==='bot'?'supplies':'fragment';
    await page.getByRole('button',{name:choice==='supplies'?'Take survival supplies':'Take '+require(path.join(temp,'companions.js')).COMPANIONS[meta.hero].name+' fragment',exact:true}).click();
    if(!await page.getByText('Your run is safe.',{exact:true}).isVisible()){try{await page.getByRole('button',{name:'Pause expedition',exact:true}).click({timeout:2500});}catch(e){if(!await page.getByText('Your run is safe.',{exact:true}).isVisible())throw e;}}await page.getByText('Your run is safe.',{exact:true}).waitFor();
    const rewarded=await stored();assert(rewarded.coins>=8);assert(rewarded.gems>=2);assert(rewarded.secrets.includes(meta.id));
    if(choice==='fragment')assert(rewarded.heroShards[meta.hero]>=1);
    else {
      // The 18s reward ticks with GAME time after the modal closes. Slow
      // software-GPU screenshots may consume >2 actual seconds; a fixed
      // >16s remaining threshold would reject a valid rewarded checkpoint.
      // Verify BOTH components of the earned reward and its exact countdown.
      const elapsed=rewarded.time-before.time;
      assert(Number.isFinite(elapsed)&&elapsed>=0,'Rewarded game clock cannot run backwards');
      assert(rewarded.energy>=40,'Bot survival choice must grant 40 burst energy');
      assert(rewarded.magnet>0&&rewarded.magnet<=18,'Bot magnet must be active and bounded');
      assert(Math.abs(rewarded.magnet-Math.max(0,18-elapsed))<.35,
        'Bot magnet must decay by actual simulated time since chamber reward');
    }
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});await page.getByText('Your run is safe.',{exact:true}).waitFor();await page.waitForFunction(()=>window.madgerActiveRenderer==='pbr',undefined,{timeout:60000});const restored=await stored();assert.equal(restored.coins,rewarded.coins);assert.deepEqual(restored.heroShards,rewarded.heroShards);
    assert.equal(await page.getByText('SECRET CHAMBER DISCOVERED',{exact:true}).count(),0);assert.deepEqual(errors,[]);
    results.push({chamber:meta.id,entry:meta.action,choice,protectivePauses:approach.resumes,checks:['movement enters secret','interior renders','timers freeze','chamber cold-reloads','choice grants real reward','reward checkpoint survives another reload']});
   }catch(e){const debug={error:String(e),errors,warnings,requests,state:await page.evaluate(()=>({renderer:window.madgerActiveRenderer,body:document.body.innerText.slice(-3000)})).catch(()=>null)};fs.writeFileSync(path.join(out,meta.id+'-failure.json'),JSON.stringify(debug,null,2));console.error('CHAMBER_DEBUG',JSON.stringify(debug));await page.screenshot({path:path.join(out,meta.id+'-failure.png')});throw e;}
   finally{await context.close();console.log('CHAMBER_CHECK_FINISHED',meta.id);}
  }
  fs.writeFileSync(path.join(out,'chambers-browser.json'),JSON.stringify({date:new Date().toISOString(),scope:'Saved approach fixtures with ordinary movement, choice and reload controls',results},null,2));console.log('CHAMBERS_BROWSER_PASS',JSON.stringify(results));
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
