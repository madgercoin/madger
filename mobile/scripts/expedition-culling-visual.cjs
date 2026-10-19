/* Compare real WebGL pixels before/after culling; never injects state into the app. */
/* global __dirname, process, beforeBundle, afterBundle */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ts=require('typescript'),{chromium}=require('playwright');
const baseline=process.env.MADGER_CULLING_BASELINE;
assert(baseline&&fs.existsSync(baseline),'Set MADGER_CULLING_BASELINE to the original gl.ts');
const out=path.join(root,'expedition-evidence');fs.mkdirSync(out,{recursive:true});
const reportPath=path.join(out,'culling-visual-equivalence.json');fs.rmSync(reportPath,{force:true});
function bundle(old){
 let text='const factories={},cache={};function require(n){n=n.replace(/^\\.\\//,"");if(cache[n])return cache[n].exports;const m={exports:{}};cache[n]=m;factories[n](require,m,m.exports);return m.exports;}';
 for(const name of ['companions','core','math','gl','companion-models','scene','animation']){
  const file=old&&name==='gl'?baseline:path.join(root,'src/game/expedition',name+'.ts');
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  text+='\nfactories['+JSON.stringify(name)+']=function(require,module,exports){'+compiled+'};';
 }
 return '(()=>{'+text+';return {Core:require("core"),Scene:require("scene").ExpeditionScene};})()';
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':undefined),headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:768,height:1024}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.setContent('<!doctype html><canvas id="before"></canvas><canvas id="after"></canvas>');
  await page.addScriptTag({content:'window.beforeBundle='+bundle(true)+';window.afterBundle='+bundle(false)+';'});
  const result=await page.evaluate(()=>{
   const contexts=['before','after'].map(id=>document.getElementById(id).getContext('webgl2',{antialias:false,alpha:false,preserveDrawingBuffer:true}));
   if(contexts.some(gl=>!gl))throw Error('WebGL2 is unavailable');
   const scenes=[new beforeBundle.Scene(contexts[0]),new afterBundle.Scene(contexts[1])],results=[];
   const cases=[
    {name:'lobby',mode:'ready',distance:0,time:1},
    {name:'overgrown',distance:40,time:4},
    {name:'crew-arrival',distance:146,time:14.6,crew:true},
    {name:'jump',distance:394,time:38,zone:1,y:1.1,vy:1,crew:true},
    {name:'slide',distance:589,time:55,zone:1,slide:.7,crew:true},
    {name:'hollow-left',distance:225,time:20,route:'hollow',routeStart:180,routeEnd:270,routeSide:-1,crew:true},
    {name:'grotto-right',distance:810,time:77,zone:2,route:'grotto',routeStart:780,routeEnd:870,routeSide:1,crew:true},
    {name:'grotto-main',distance:950,time:90,zone:2,crew:true},
    {name:'finish',distance:1080,time:103,zone:2,mode:'won',finished:true,crew:true},
   ];
   for(const [width,height] of [[360,800],[430,920],[768,1024]]){
    for(const gl of contexts){gl.canvas.width=width;gl.canvas.height=height;}
    for(const scenario of cases){
     const pixels=[];
     for(let i=0;i<2;i++){
      const Core=i===0?beforeBundle.Core:afterBundle.Core,gl=contexts[i],scene=scenes[i];
      const state=Core.freshExpedition(4242,'culling-visual');
      Object.assign(state,{mode:'running',score:500,zone:0},scenario);
      if(scenario.crew)for(const id of ['snow','gorilla','bot']){Core.recruitCompanion(state,id,[]);state.companions[id].joinedAt=state.time-.4;}
      scene.setCourse(Core.buildCourse(state.seed));scene.draw(state,state.time);
      if(gl.getError()!==gl.NO_ERROR)throw Error('GL error in '+scenario.name);
      const data=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,data);
      if(gl.getError()!==gl.NO_ERROR)throw Error('Pixel read failed in '+scenario.name);
      if(!data.some((value,index)=>index%4!==3&&value>20))throw Error('Blank comparison frame in '+scenario.name);
      const colors=new Set();for(let p=0;p<data.length;p+=Math.max(4,Math.floor(data.length/16000/4)*4))colors.add(data[p]+','+data[p+1]+','+data[p+2]);
      if(colors.size<20||gl.isContextLost())throw Error('Comparison scene lacks visible geometry in '+scenario.name);
      pixels.push(data);
     }
     let changed=0,max=0;for(let p=0;p<pixels[0].length;p++){const delta=Math.abs(pixels[0][p]-pixels[1][p]);if(delta){changed++;max=Math.max(max,delta);}}
     const sample={name:scenario.name,width,height,changedChannels:changed,maxChannelDifference:max,before:scenes[0].stats,after:scenes[1].stats};results.push(sample);
     if(changed)throw Error('Culling changed visible pixels: '+JSON.stringify(sample));
    }
   }
   scenes.forEach(scene=>scene.dispose());return {cases:results.length,results};
  });
  assert.equal(errors.length,0,errors.join('\n'));
  const report={status:'passed',date:new Date().toISOString(),scope:'Deterministic scene-only WebGL2 pixel comparison on software graphics; not gameplay or native performance acceptance',browser:await browser.version(),...result};
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
  console.log('CULLING_VISUAL_PASS',JSON.stringify({cases:result.cases,changedChannels:0,browser:report.browser}));
 }catch(error){await page.screenshot({path:path.join(out,'culling-visual-failure.png')}).catch(()=>{});throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
