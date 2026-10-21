/* Smoke-test the actual exported game through the three major biome choices.
 * Every route is reached through real UI controls. No injected checkpoints or
 * altered game physics; each route receives a fresh browser profile.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const {PNG} = require('pngjs');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const evidence = path.join(root, 'expedition-evidence', 'biome-browser');
fs.mkdirSync(evidence, {recursive:true});
const mime = {'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript',
  '.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp',
  '.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server = http.createServer((req,res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file = path.resolve(dist,'.'+(relative==='/'?'/index.html':relative));
    if(!file.startsWith(dist+path.sep)) {res.writeHead(403);return res.end();}
    if(!path.extname(file)) file += '.html';
    if(!fs.existsSync(file)) {res.writeHead(404);return res.end();}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  } catch {res.writeHead(400);res.end();}
});
const cases = [
  {route:'rootway',biome:'forest',input:'ArrowLeft'},
  {route:'ridge',biome:'ruins',input:null},
  {route:'deep',biome:'cavern',input:'ArrowRight'}
];
const selectedCases = process.env.MADGER_BIOME_ONLY
  ? cases.filter(item=>item.route===process.env.MADGER_BIOME_ONLY) : cases;
assert(selectedCases.length,'No matching biome selected');
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,
    executablePath:process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':undefined});
  const results=[];
  try {
    for(const item of selectedCases) {
      const context=await browser.newContext({viewport:{width:430,height:920},deviceScaleFactor:1,
        isMobile:true,hasTouch:true});
      const page=await context.newPage(),errors=[],requests=[],stallWarnings=[];
      page.on('console',message=>{if(message.text().includes('MADGER_EXPEDITION_FRAME_STALL'))stallWarnings.push(message.text());});
      page.on('pageerror',e=>errors.push(String(e)));
      page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))
        requests.push({url:r.url(),status:r.status()});});
      try {
        await page.goto('http://127.0.0.1:'+server.address().port+'/expedition',
          {waitUntil:'networkidle',timeout:90000});
        await page.getByRole('button',{name:'Start expedition',exact:true}).waitFor({timeout:60000});
        assert.equal(await page.evaluate(()=>window.madgerActiveRenderer),'pbr',
          'PBR renderer not active for '+item.route);
        await page.getByRole('button',{name:'Start expedition',exact:true}).click();
        await page.getByText(/LIVE PATH · \d+ m · STEER BEFORE THE JUNCTION/).waitFor({timeout:60000});
        await page.waitForFunction(()=>{const label=document.querySelector('[aria-label^="Expedition distance"]')?.getAttribute('aria-label')||'';const metres=Number(label.match(/distance (\d+)/)?.[1]||0);return metres>=119&&metres<140;},{},{timeout:60000});
        if(item.input)await page.keyboard.press(item.input);
        await page.waitForFunction(route=>window.madgerForestDiagnostics?.route===route,
          item.route,{timeout:12000});        await page.waitForTimeout(450);
        const diagnostics=await page.evaluate(()=>window.madgerForestDiagnostics);
        assert.equal(diagnostics.route,item.route);
        assert.equal(diagnostics.biome,item.biome);
        assert.equal(diagnostics.terrainMaterial,item.biome);
        assert.equal(diagnostics.sceneryProfileLoaded,true);
        assert.equal(diagnostics.atmosphereProfileLoaded,true,'Route-specific PBR lighting missing');
        assert.equal(diagnostics.dynamicShadows,false,'Mobile routes must not compile dynamic shadow programs after the fork');
        assert.equal(diagnostics.sunbeamPrimitives,0,'Opaque sunbeam cone must not obscure the route');
        assert.equal(diagnostics.terrainProfileLoaded,true);
        assert(diagnostics.terrainVertices>=5000,'Terrain mesh missing');
        assert(diagnostics.groundedSceneryInstances>=20,'Scanned assets missing grounding');
        assert(diagnostics.drawCalls>0 && diagnostics.triangles>0,'No rendered 3D geometry');
        assert(Number.isFinite(diagnostics.scanCpuMs) && diagnostics.scanCpuMs>=0,
          'Invalid scenery CPU profile: '+item.route);
        assert(Number.isFinite(diagnostics.webglSubmitMs) && diagnostics.webglSubmitMs>=0,
          'Invalid WebGL submission profile: '+item.route);
        if(item.biome==='cavern') assert(diagnostics.cavernVaultTriangles>0,
          'The enclosed cave roof was not rendered');
        if(item.biome==='ruins' && !process.env.MADGER_RUINS_AB_TEST) {
          assert(diagnostics.ruinArchStones>=13,'PBR masonry arches were not drawn');
          assert(diagnostics.ruinPierBlocks>=10,'Ruined masonry supports were not drawn');
          assert(diagnostics.photoscannedTrees<=3,'Distant forest scans overload ruined route');
        } else {
          assert.equal(diagnostics.ruinArchStones,0,'Ruin architecture leaked into another biome');
        }
        if(item.biome!=='cavern') assert(diagnostics.photoscannedTrees>0,
          'Scanned trees missing from the outdoor scene');
        // The real game pauses when an uninterrupted frame exceeds 400ms.
        // Chrome screenshot readback can itself block its GPU for >400ms,
        // falsely creating a gameplay stall in this visual-only fixture.
        // Observe the live route first, then use the *real Pause control*
        // before the heavyweight screenshot. Never override engine state.
        const safetyBeforeScreenshot=await page.getByText('Your run is safe.',{exact:true}).isVisible();
        const liveWarnings=stallWarnings.length;
        if(!safetyBeforeScreenshot){
          await page.getByRole('button',{name:'Pause expedition',exact:true}).click();
          await page.getByText('Your run is safe.',{exact:true}).waitFor();
        }
        // Browser screenshots preserve the composited WebGL frame even when
        // drawingBuffer preservation is off and direct canvas readback is blank.
        const screenshot=await page.locator('canvas').first().screenshot({
          path:path.join(evidence,item.route+'.png')});
        const bitmap=PNG.sync.read(screenshot),colors=new Set();let lit=0;
        for(let i=0;i<bitmap.data.length;i+=64){
          const r=bitmap.data[i],g=bitmap.data[i+1],b=bitmap.data[i+2];
          if(r+g+b>30)lit++;
          colors.add((r>>3)+','+(g>>3)+','+(b>>3));
        }
        console.log('BIOME_VISIBLE_PIXELS',item.route,JSON.stringify({lit,colors:colors.size}));
        assert(lit>1000 && colors.size>65,'Composited 3D scene is blank: '+item.route);
        const unexpectedlyPaused=safetyBeforeScreenshot;
        if(unexpectedlyPaused||stallWarnings.length) {
          console.warn('BIOME_STALL_DIAGNOSTICS',item.route,JSON.stringify({unexpectedlyPaused,stallWarnings}));
          // A safety pause is a release failure, but inspect whether ordinary
          // Resume actually restores forward movement instead of hiding damage.
          const metres=async()=>Number((await page.locator('[aria-label^="Expedition distance"]').first()
            .getAttribute('aria-label').catch(()=>''))?.match(/distance ([0-9]+)/)?.[1]||-1);
          const before=await metres(),attempts=[];
          for(let retry=0;retry<3;retry++) {
            if(!await page.getByText('Your run is safe.',{exact:true}).isVisible())break;
            await page.getByRole('button',{name:'Resume expedition',exact:true}).last().click();
            await page.waitForTimeout(1000);
            attempts.push({distance:await metres(),
              paused:await page.getByText('Your run is safe.',{exact:true}).isVisible()});
            if(attempts.at(-1).distance>=before+4 && !attempts.at(-1).paused)break;
          }
          console.log('BIOME_RECOVERY_DIAGNOSTICS',item.route,
            JSON.stringify({before,attempts,stallCount:stallWarnings.length}));
        }
        assert.equal(unexpectedlyPaused,false,'Route unexpectedly paused from a long frame: '+item.route);
        assert.equal(liveWarnings,0,'Safety warning during live route selection: '+item.route);
        assert.equal(stallWarnings.length,0,'Protective frame stall detected in visual fixture: '+item.route);
        assert.deepEqual(errors,[],'JS errors: '+item.route);
        assert.deepEqual(requests,[],'Asset errors: '+item.route);
        results.push({route:item.route,biome:item.biome,diagnostics,errors,requests});
        console.log('BIOME_RENDER_PASS',item.route,JSON.stringify(diagnostics));
      } finally {await context.close();}
    }
    const report={date:new Date().toISOString(),scope:'Physical route choice in desktop Chrome; not an Android benchmark',
      cases:results,status:'PASS'};
    fs.writeFileSync(path.join(evidence,'three-biomes.json'),JSON.stringify(report,null,2));
    console.log('THREE_BIOMES_PASS',results.length);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error('THREE_BIOMES_FAIL',error.stack||String(error));process.exitCode=1;});
