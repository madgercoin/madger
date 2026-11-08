/* Harness timing regression, using actual core physics, not browser state injection. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),ts=require('typescript');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'madger-biome-input-'));
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
for(const name of ['companions','core'])fs.writeFileSync(path.join(dir,name+'.js'),ts.transpileModule(
  fs.readFileSync(path.join(__dirname,'../src/game/expedition',name+'.ts'),'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const G=require(path.join(dir,'core.js'));
function enter(action,observedDistance,commandDelay,seed=17){
  const s=G.freshOvergrownExpedition(seed,'timing-'+seed);s.mode='running';
  const course=G.buildOvergrownCourse(seed);let steered=false;
  while(s.distance<observedDistance){
    if(!steered&&s.distance>=119){if(action==='burrow')G.steer(s,1);steered=true;}
    G.fixedStep(s,course,[]);
  }
  const at=s.time;
  while(s.time-at<commandDelay)G.fixedStep(s,course,[]);
  const inputDistance=s.distance;G[action](s,[]);let observedPose=false;
  while(s.forkStage===0){
    G.fixedStep(s,course,[]);
    if(s.distance<140&&(action==='jump'?s.y>.1:s.slide>0))observedPose=true;
  }
  return {route:s.route,inputDistance,observedPose};
}
test('134m trigger tolerates one measured 238ms software frame of sampling skew and one command delay',()=>{
  // At ~10.2m/s a 238ms HUD frame can first report the 134m threshold
  // at ~136.5m. Observer setup must already be complete before that wait.
  for(const action of ['jump','burrow'])for(const distance of [134,135,136.5])
    for(const delay of [0,.12,.238])for(const seed of [17,42,4242]){
      const result=enter(action,distance,delay,seed);
      assert.equal(result.route,action==='jump'?'ridge':'deep',JSON.stringify({action,distance,delay,seed,result}));
      assert(result.observedPose,'A real entrance action must occur before the route boundary');
    }
});
test('132m is too early and the old observed138m plus238ms delay misses the raised route',()=>{
  assert.equal(enter('jump',132,0).route,'rootway');
  const late=enter('jump',138,.238);
  assert(late.inputDistance>=140);
  assert.equal(late.route,'rootway');
  assert.equal(late.observedPose,false);
});
test('observer setup precedes the early window and no setup RPC delays its keypress',()=>{
  const source=fs.readFileSync(path.join(__dirname,'overgrown-biome-browser-smoke.cjs'),'utf8');
  const arm=source.indexOf('actionObserver=await page.evaluateHandle(');
  const windowStart=source.indexOf("if(metres>=137)throw Error(");
  const press=source.indexOf('await page.keyboard.press(item.action);');
  assert(arm>=0&&arm<windowStart&&windowStart<press);
  const between=source.slice(windowStart,press);
  assert(between.includes('return metres>=134;'));
  assert(!between.includes('page.evaluate'),'Do not put observer setup back inside the action window');
});
