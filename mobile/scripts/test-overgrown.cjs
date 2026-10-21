const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),ts=require('typescript');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'madger-overgrown-'));test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
for(const name of ['companions','core','profile']){const text=fs.readFileSync(path.join(__dirname,'../src/game/expedition',name+'.ts'),'utf8');fs.writeFileSync(path.join(dir,name+'.js'),ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);}
const G=require(path.join(dir,'core.js')),P=require(path.join(dir,'profile.js'));
const run=(seed=17,profile=P.emptyExpeditionProfile())=>{const s=G.freshOvergrownExpedition(seed,'overgrown-'+seed,profile.heroShards,profile.upgrades);s.mode='running';return s;};
const step=(s,c,e=[])=>G.fixedStep(s,c,e);
test('the new board is deterministic and every branch has its own viable danger/reward selection',()=>{
 const all=[...G.MAJOR_FORKS,...Object.values(G.SUB_FORKS).flat()];
 assert.equal(G.MAJOR_FORKS.length,3);assert.equal(new Set(all.map(x=>x.id)).size,12);
 for(let seed=0;seed<45;seed++){
  const course=G.buildOvergrownCourse(seed);assert.deepEqual(course,G.buildOvergrownCourse(seed));assert(course.length<600);
  assert.equal(new Set(course.map(x=>x.id)).size,course.length);
  assert(course.every(i=>G.KINDS.includes(i.kind)&&i.d<G.TRACK_LENGTH));
  for(const choice of all){const items=course.filter(i=>i.route===choice.id);assert(items.length>=14,choice.id);assert(items.some(i=>G.HAZARDS.has(i.kind)),choice.id+' hazards');assert(items.some(i=>i.kind==='coin'),choice.id+' currency');assert(items.some(i=>['snow-sigil','guardian-totem','tech-cell'].includes(i.kind)),choice.id+' unlocks');}
  const occupied=new Map();for(const item of course.filter(i=>G.HAZARDS.has(i.kind))){const key=item.route+':'+item.d,lanes=occupied.get(key)||new Set();lanes.add(item.lane);occupied.set(key,lanes);}
  assert([...occupied.values()].every(lanes=>lanes.size<=2),'always keep at least one safe lane');
  assert(!course.some(i=>['snow-white','gorilla-white','madger-bot'].includes(i.kind)),'no free hero spawn');
 }
});
test('live three-way major fork never freezes physics, and the subfork lands on a lower trail if the ledge is missed',()=>{
 const s=run(),c=G.buildOvergrownCourse(s.seed),events=[];
 s.distance=139.97;s.lane=1;s.x=G.LANE_WIDTH;step(s,c,events);
 assert.equal(s.mode,'running');assert.equal(s.forkStage,1);assert.equal(s.majorPath,'deep');
 const before=s.distance;for(let i=0;i<20;i++)step(s,c,events);
 assert(s.distance>before,'physics must continue during route selection');
 const x=G.routeOffset(s);s.distance+=.04;assert(Math.abs(G.routeOffset(s)-x)<.2,'no horizontal teleport');
 s.distance=454.97;s.lane=0;s.x=0;s.y=0;s.vy=0;step(s,c,events);
 assert.equal(s.mode,'running');assert.equal(s.forkStage,2);
 assert.equal(s.subPath,'mudslide','missing the middle ledge drops to the lower branch, not a damage screen');
 assert(s.secrets.includes('deep')&&s.secrets.includes('mudslide'));
 assert(events.some(e=>e.kind==='hint'&&e.text.includes('LOWER PATH')));
});
test('route commitment uses actual lateral position rather than an unrealized last-frame steer',()=>{
 const s=run(),course=G.buildOvergrownCourse(s.seed);
 Object.assign(s,{distance:139.97,lane:1,x:0,vx:0});
 step(s,course,[]);
 assert.equal(s.majorPath,'ridge','unreached right lane must not teleport into Deep Burrow');
 const miss=run();
 Object.assign(miss,{forkStage:1,majorPath:'rootway',route:'rootway',routeStart:140,routeEnd:450,routeSide:-1,
   distance:454.97,lane:0,x:G.LANE_WIDTH,vx:0,y:1,vy:0,slide:0});
 step(miss,course,[]);
 assert.equal(miss.subPath,'mosswalk','last-frame center input cannot bypass an unreached tunnel');
});
test('all families select lower / elevated / hidden paths from actual lane and action',()=>{
 const c=G.buildOvergrownCourse(23);
 for(const major of G.MAJOR_FORKS){
  for(const side of [-1,0,1]){
   const s=run(23),events=[],options=G.SUB_FORKS[major.id];
   Object.assign(s,{forkStage:1,majorPath:major.id,route:major.id,routeStart:140,routeEnd:450,routeSide:major.side,distance:454.97,lane:side,x:side*G.LANE_WIDTH});
   if(side===0){s.y=1;s.vy=0;}
   if(side===1){s.slide=.65;s.slideCooldown=.8;s.y=0;if(options[2].id==='ancient-vault')s.keys=1;}
   const previousTime=s.time;step(s,c,events);
   assert.equal(s.subPath,options[side+1].id,major.id+' requires physical route selection');
   assert.equal(s.mode,'running');assert(s.time>previousTime);
   if(options[2].id==='ancient-vault'&&side===1)assert.equal(s.keys,0,'vault entry consumes a real key');
  }
  for(const side of [0,1]){
   const s=run(23),events=[],lower=G.SUB_FORKS[major.id][0].id;
   Object.assign(s,{forkStage:1,majorPath:major.id,route:major.id,routeStart:140,routeEnd:450,routeSide:major.side,distance:454.97,lane:side,x:side*G.LANE_WIDTH});
   step(s,c,events);assert.equal(s.subPath,lower,'missing the action should drop to lower path');
   assert.equal(s.hp,3,'fall to lower branch must not cause automatic unseen damage');
  }
 }
});
test('historical paused fork checkpoints still accept explicit choices',()=>{
 const s=run(),events=[];Object.assign(s,{mode:'fork',forkStage:1,distance:140});
 assert.equal(G.chooseFork(s,'gearworks',events),false);
 assert(G.chooseFork(s,'deep',events));assert.equal(s.majorPath,'deep');
 Object.assign(s,{mode:'fork',forkStage:2,distance:455,route:'main'});
 assert.deepEqual(G.availableForks(s).map(o=>o.id),['mudslide','crystal-vein','ancient-vault']);
 assert.equal(G.chooseFork(s,'mosswalk',events),false);
 assert(G.chooseFork(s,'crystal-vein',events));assert.equal(s.subPath,'crystal-vein');
});
test('hero fragments unlock a single selectable hero, no companion appears automatically',()=>{
 const s=run(),course=G.buildOvergrownCourse(s.seed),events=[];s.forkStage=1;s.majorPath='deep';s.route='deep';s.routeStart=140;s.routeEnd=450;s.routeSide=1;
 assert(!Object.values(s.companions).some(c=>c.timeLeft>0));assert(!G.activateHero(s,'snow',events));
 const sigils=course.filter(i=>i.kind==='snow-sigil'&&i.route==='deep');assert.equal(sigils.length,3);
 for(const item of sigils){s.distance=item.d-.09;s.lane=item.lane;s.x=item.lane*G.LANE_WIDTH;step(s,course,events);}
 assert.equal(s.heroShards.snow,3);assert.equal(s.heroUnlocked.snow,false);
 s.mode='fork';s.forkStage=2;assert(G.chooseFork(s,'crystal-vein',events));
 const fourth=course.find(i=>i.kind==='snow-sigil'&&i.route==='crystal-vein');s.distance=fourth.d-.09;s.x=fourth.lane*G.LANE_WIDTH;s.lane=fourth.lane;step(s,course,events);
 assert.equal(s.heroUnlocked.snow,true);assert.equal(s.heroShards.snow,4);assert.equal(s.heroCharge,96,'fragments grant hero energy, but activation still needs earned charge');
 const coin=course.find(i=>i.route==='crystal-vein'&&i.kind==='coin'&&i.d>fourth.d);assert(coin);s.distance=coin.d-.09;s.x=coin.lane*G.LANE_WIDTH;s.lane=coin.lane;step(s,course,events);
 assert.equal(s.heroCharge,100);assert(G.activateHero(s,'snow',events));assert.equal(s.heroCharge,0);assert(s.companions.snow.timeLeft>0);
 assert.equal(s.companions.gorilla.timeLeft,0);assert.equal(s.companions.bot.timeLeft,0);
 assert.equal(G.activateHero(s,'snow',events),false,'no duplicate active support');
 assert.equal(G.activateHero(s,'bot',events),false,'locked companion cannot be summoned');
});
test('run banking, permanent hero unlocks and earned-coin upgrades survive reloading and cannot double count',async()=>{
 let stored=null;const store=P.createExpeditionStore({getItem:async()=>stored,setItem:async(_,v)=>{stored=v;}});await store.init();
 const s=run();s.heroShards.snow=4;s.heroUnlocked.snow=true;s.coins=150;s.gems=4;s.mode='lost';s.finished=true;
 await store.finish(s);await store.finish(s);
 const p=store.getSnapshot().profile;assert.equal(p.runs,1);assert.equal(p.coins,150);assert.equal(p.heroShards.snow,4);
 const cost=P.upgradeCost('armor',0);assert(await store.buy('armor'));assert.equal(store.getSnapshot().profile.coins,150-cost);
 assert.equal(store.getSnapshot().profile.upgrades.armor,1);
 const load=P.normalizeProfile(JSON.parse(stored));assert.equal(load.heroShards.snow,4);assert.equal(load.upgrades.armor,1);
 const next=G.freshOvergrownExpedition(4,'next',load.heroShards,load.upgrades);assert(next.heroUnlocked.snow);assert(next.shields>0);assert(next.shieldTime>30);
 for(let i=0;i<2;i++)assert(await store.buy('armor'));assert.equal(await store.buy('armor'),false,'max level is enforced');
});
test('new forks, fragments and hero charges are safely checkpointed with legacy v1 records unaffected',()=>{
 const old=G.freshExpedition(9,'old');old.mode='running';old.distance=22;
 const legacy=P.sanitizeExpedition(old);assert(legacy&&legacy.board===undefined);
 const s=run();s.distance=140;s.mode='fork';s.forkStage=1;
 const restored=P.sanitizeExpedition(JSON.parse(JSON.stringify(s)));assert(restored);assert.equal(restored.mode,'fork');
 assert.equal(restored.forkStage,1);assert(G.chooseFork(restored,'ridge',[]));
 restored.mode='paused';restored.distance=299;restored.heroCharge=48;restored.heroShards.bot=2;
 const save=P.sanitizeExpedition(JSON.parse(JSON.stringify(restored)));assert(save);assert.equal(save.mode,'paused');assert.equal(save.heroCharge,48);assert.equal(save.heroShards.bot,2);
 const forged={...restored,route:'ancient-vault',distance:260};assert.equal(P.sanitizeExpedition(forged),null);
 const bad={...s,forkStage:2,distance:100};assert.equal(P.sanitizeExpedition(bad),null);
});

test('support activations never overlap even after the meter refills',()=>{
 const s=run(7);s.heroUnlocked={snow:true,gorilla:true,bot:true};s.heroCharge=100;
 assert(G.activateHero(s,'snow',[]));s.heroCharge=100;
 assert.equal(G.activateHero(s,'gorilla',[]),false);assert.equal(s.heroCharge,100);
 assert.equal(G.activateHero(s,'bot',[]),false);
 s.distance=500;s.forkStage=2;s.majorPath='rootway';s.subPath='mosswalk';
 for(let i=0;i<18/G.STEP+2;i++)step(s,[]);
 assert(G.activateHero(s,'gorilla',[]));assert.equal(s.heroCharge,0);
});

test('the ancient vault gate consumes a real collected key and survives checkpoint recovery',()=>{
 const s=run(2);s.distance=455;s.forkStage=2;s.majorPath='deep';s.mode='fork';
 assert.equal(G.chooseFork(s,'ancient-vault',[]),false);assert.equal(s.mode,'fork');
 s.keys=1;assert(G.chooseFork(s,'ancient-vault',[]));assert.equal(s.keys,0);
 const restored=P.sanitizeExpedition(JSON.parse(JSON.stringify(s)));assert(restored);assert.equal(restored.subPath,'ancient-vault');assert.equal(restored.keys,0);
 const course=G.buildOvergrownCourse(s.seed);assert(course.some(i=>i.route==='deep'&&i.kind==='key'&&i.d<455));
 assert(course.some(i=>i.route==='ancient-vault'&&i.kind==='key'&&i.d<884));
});

test('subpaths have distinct mechanical hazard families for every seed',()=>{
 const permitted={'mosswalk':['mud','crate'],'root-arch':['roots','crate'],'log-crossing':['gap','boulder'],causeway:['gap','boulder','crate'],watchtower:['gap','drone'],gearworks:['steam','saw','drone'],mudslide:['mud','boulder'],'crystal-vein':['roots','gap','drone'],'ancient-vault':['steam','saw','gap']};
 for(let seed=0;seed<40;seed++){
  const course=G.buildOvergrownCourse(seed);
  for(const [route,kinds] of Object.entries(permitted))assert(course.filter(i=>i.route===route&&G.HAZARDS.has(i.kind)).every(i=>kinds.includes(i.kind)),route);
 }
});

test('all nine route combinations remain winnable with steering and timed jump/burrow',()=>{
 for(const major of G.MAJOR_FORKS)for(const sub of G.SUB_FORKS[major.id]){
  const s=run(19),course=G.buildOvergrownCourse(19),events=[];
  for(let frame=0;frame<22000&&!s.finished;frame++){
   if(s.mode==='chamber')assert(G.resolveChamber(s,'supplies',events));
   const choosingMajor=s.forkStage===0&&s.distance>=128;
   const choosingSub=s.forkStage===1&&s.distance>=438;
   if(choosingMajor||choosingSub){
    const want=choosingMajor?major.side:sub.side;
    if(s.lane!==want)G.steer(s,want<s.lane?-1:1);
    if(choosingSub&&s.distance>=452&&s.distance<455){
     if(sub.side===0&&s.y<=.025)G.jump(s,events);
     if(sub.side===1&&s.slide<=.01)G.burrow(s,events);
    }
   }else{
    const ahead=course.filter(i=>i.route===s.route&&!s.used.includes(i.id)&&i.d>=s.distance-2&&i.d<s.distance+12);
    const threats=ahead.filter(i=>G.HAZARDS.has(i.kind));
    const key=ahead.find(i=>i.kind==='key');
    const free=[0,-1,1].filter(lane=>!threats.some(i=>i.lane===lane));
    const desired=key?key.lane:(free.includes(s.lane)?s.lane:free[0]??0);
    if(desired!==s.lane)G.steer(s,desired<s.lane?-1:1);
    const danger=threats.find(i=>Math.abs(G.hazardPose(i,s.time,s.distance).x-s.x)<1&&i.d-s.distance<5.5&&i.d>s.distance);
    if(danger){if(danger.kind==='roots'||danger.kind==='drone')G.burrow(s,events);else if(s.y<.02)G.jump(s,events);}
   }
   step(s,course,events);
  }
  assert.equal(s.mode,'won',major.id+' / '+sub.id+' must be beatable with ordinary inputs');
  assert.equal(s.majorPath,major.id,'first junction is steered, not modal');
  assert.equal(s.subPath,sub.id,'second junction requires physical action');
 }
});
function chamberApproach(meta){
 const s=run(23);s.forkStage=2;s.majorPath=meta.route==='root-arch'?'rootway':meta.route==='gearworks'?'ridge':'deep';s.subPath=meta.route;
 s.route=meta.route;s.routeStart=455;s.routeEnd=900;s.routeSide=G.SUB_FORKS[s.majorPath].find(c=>c.id===meta.route).side;
 s.distance=meta.d-.7;s.x=meta.lane*G.LANE_WIDTH;s.lane=meta.lane;
 return s;
}
test('secret entrances require their own route, lane and movement action',()=>{
 const course=G.buildOvergrownCourse(23);
 assert.equal(course.filter(i=>i.kind==='chamber-door').length,3);
 assert(Math.max(...course.filter(i=>i.kind!=='chamber-door').map(i=>i.id))<Math.min(...course.filter(i=>i.kind==='chamber-door').map(i=>i.id)),'new object IDs are appended');
 for(const meta of G.CHAMBERS){
  const miss=chamberApproach(meta);for(let i=0;i<20;i++)step(miss,course,[]);assert.equal(miss.mode,'running');
  const s=chamberApproach(meta);if(meta.action==='burrow')G.burrow(s,[]);else{s.y=1;s.vy=0;}
  for(let i=0;i<8&&s.mode==='running';i++)step(s,course,[]);
  assert.equal(s.mode,'chamber',meta.id);assert.equal(s.chamber,meta.id);
  const before=JSON.stringify(s);for(let i=0;i<400;i++)step(s,course,[]);assert.equal(JSON.stringify(s),before,'world, support and action timers freeze');
  assert(G.nearbyHint(chamberApproach(meta),course).includes(meta.action==='burrow'?'BURROW':'JUMP'));
 }
});
test('chambers cold-restore exactly and bank each choice only once',async()=>{
 const course=G.buildOvergrownCourse(23);
 for(const meta of G.CHAMBERS)for(const choice of ['fragment','supplies']){
  const s=chamberApproach(meta);s.hp=1;if(meta.action==='burrow')G.burrow(s,[]);else{s.y=1;s.vy=0;}
  for(let i=0;i<8&&s.mode==='running';i++)step(s,course,[]);
  const restore=P.sanitizeExpedition(JSON.parse(JSON.stringify(s)));assert(restore,meta.id);assert.equal(restore.mode,'chamber');
  const charge=restore.heroCharge;
  assert(G.resolveChamber(restore,choice,[]));assert.equal(restore.mode,'running');assert(restore.secrets.includes(meta.id));assert.equal(restore.coins,8);assert.equal(restore.gems,2);
  if(choice==='fragment'){assert.equal(restore.heroShards[meta.hero],1);assert.equal(restore.heroCharge,Math.min(100,charge+24));}
  else if(meta.hero==='gorilla'){assert.equal(restore.hp,3);assert.equal(restore.shields,1);}
  else if(meta.hero==='bot'){assert.equal(restore.magnet,18);assert.equal(restore.energy,40);}
  else{assert.equal(restore.lives,1);assert.equal(restore.hp,2);}
  assert.equal(G.resolveChamber(restore,choice,[]),false);
  const forged={...s,chamber:meta.id,secrets:[...s.secrets,meta.id]};assert.equal(P.sanitizeExpedition(forged),null);
  assert.equal(P.sanitizeExpedition({...s,distance:meta.d-8}),null);
  restore.mode='won';restore.finished=true;
  const profile=P.bankExpedition(P.emptyExpeditionProfile(),restore);assert(profile.discoveries.includes(meta.id));assert.equal(profile.coins,8);
 }
});

test('rockfalls descend from the banks and continue rolling toward the player',()=>{
 for(const lane of [-1,0,1])for(const phase of [0,2,4]){
  const item={id:99,d:220,lane,kind:'boulder',phase,route:'ridge'};
  const start=G.hazardPose(item,0,188),near=G.hazardPose(item,0,216),contact=G.hazardPose(item,0,220);
  assert.equal(Math.abs(start.x),6.6);assert(start.y>2.5);assert(start.d>item.d+5);
  assert(Math.abs(near.x-lane*G.LANE_WIDTH)<1e-12);assert(near.y<.05);assert(near.d>contact.d);
  assert(near.roll>start.roll);assert.equal(contact.ahead,0);
  assert.deepEqual(G.hazardPose(item,200,216),near,'pausing/reloading cannot advance the rock by wall clock');
 }
});
test('rolling rock collision agrees with the displayed moving centre and requires jump or dodge',()=>{
 const item={id:99,d:220,lane:0,kind:'boulder',phase:0,route:'ridge'};
 for(const avoidance of ['none','jump','dodge']){
  const s=run();Object.assign(s,{distance:216,route:'ridge',majorPath:'ridge',forkStage:1,routeStart:140,routeEnd:450,routeSide:0});
  if(avoidance==='jump')G.jump(s,[]);if(avoidance==='dodge'){s.x=G.LANE_WIDTH;s.lane=1;}
  const events=[];let hitAt=null;
  while(s.distance<222){step(s,[item],events);if(s.hits&&hitAt===null)hitAt=G.hazardPose(item,s.time,s.distance).ahead;}
  assert.equal(s.hits,avoidance==='none'?1:0,avoidance);
  if(hitAt!==null)assert(Math.abs(hitAt)<=.62+.12,'collision must be at visible contact');
 }
});
test('upper and lower trails have distinct physical elevations and continuous safe rejoins',()=>{
 for(const family of Object.values(G.SUB_FORKS)){
  const [lower,upper,tunnel]=family;
  assert(G.overgrownPathHeight(upper.id,500)>1.8);assert(G.overgrownPathHeight(lower.id,500)<-.8);assert(G.overgrownPathHeight(tunnel.id,500)<-.4);
  for(const option of family){assert.equal(G.overgrownPathHeight(option.id,900),0);assert(Math.abs(G.overgrownPathHeight(option.id,899.99))<.00001);}
  const s=run();Object.assign(s,{distance:454.97,forkStage:1,majorPath:family===G.SUB_FORKS.ridge?'ridge':family===G.SUB_FORKS.deep?'deep':'rootway',lane:0,x:0,y:1,vy:0});
  step(s,[],[]);assert.equal(s.subPath,upper.id);
  assert(Math.abs(s.y+G.overgrownPathHeight(s.route,s.distance)-(.9983333333333333))<.001,'jump does not teleport vertically on commitment');
 }
});

test('route ambience and lighting follow the actual biome even though the board zone is zero',()=>{
 const s=run();for(const [route,zone] of [['rootway',0],['watchtower',1],['deep',2],['crystal-vein',2],['ancient-vault',2]]){s.route=route;assert.equal(G.environmentZone(s),zone);}
 const legacy=G.freshExpedition(1);legacy.zone=2;assert.equal(G.environmentZone(legacy),2);
});
