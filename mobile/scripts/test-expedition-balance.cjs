const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),ts=require('typescript'),crypto=require('node:crypto');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'madger-balance-'));test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
for(const name of ['companions','core','profile'])fs.writeFileSync(path.join(dir,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/game/expedition',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const G=require(path.join(dir,'core.js')),P=require(path.join(dir,'profile.js'));
const fragmentKinds=['snow-sigil','guardian-totem','tech-cell'];
const choices=[...G.MAJOR_FORKS,...Object.values(G.SUB_FORKS).flat()];
function run(seed=17,upgrades={armor:0,magnet:0,fortune:0}){const s=G.freshOvergrownExpedition(seed,'balance-'+seed,undefined,upgrades);s.mode='running';return s;}
function enter(s,route){const major=G.MAJOR_FORKS.find(x=>x.id===route),parent=major??G.MAJOR_FORKS.find(x=>G.SUB_FORKS[x.id].some(y=>y.id===route));const choice=choices.find(x=>x.id===route);Object.assign(s,{route,majorPath:parent.id,subPath:major?undefined:route,forkStage:major?1:2,routeStart:major?140:455,routeEnd:major?450:900,routeSide:choice.side});}
function steps(s,course,seconds,events=[]){for(let n=0;n<Math.round(seconds/G.STEP);n++)G.fixedStep(s,course,events);return events;}
function item(kind,d=200,lane=0,extra={}){return {id:10000,d,lane,kind,route:'rootway',phase:0,...extra};}
function gateRows(course,route){const rows=new Map();for(const i of course.filter(i=>i.route===route&&G.HAZARDS.has(i.kind))){const row=rows.get(i.d)||[];row.push(i);rows.set(i.d,row);}return [...rows.values()].filter(row=>new Set(row.map(i=>i.lane)).size===3);}

test('build-33 checkpoint courses remain byte-identical at original seeds',()=>{
 const hashes={0:'16af5f07bf99360b737017b46131f4f396791f256a565336391bc2787da2676f',17:'57245e93527832e345a080086f618ad83857feef9151721687b4e774b544c587',4242:'d2eb2dc9dc7f0cfefb694eda88f11b2ce33d1d9d8950ad214a84f8537398c296'};
 for(const [seed,hash] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(JSON.stringify(G.buildOvergrownCourse(Number(seed),1))).digest('hex'),hash);
 const s=run();delete s.courseRevision;delete s.metaArmor;delete s.metaMagnet;s.distance=100;s.used=[0,1,2];
 const restored=P.sanitizeExpedition(JSON.parse(JSON.stringify(s)));assert(restored);assert.equal(restored.courseRevision,1);assert.deepEqual(restored.used,[0,1,2]);assert.equal(restored.metaArmor,0);assert.equal(restored.metaMagnet,0);
});
test('earned legacy unlocks survive migration; new four-fragment records remain locked',()=>{
 const legacy=P.normalizeProfile({version:1,heroShards:{snow:4,gorilla:3,bot:7}});assert.deepEqual(legacy.heroUnlocks,{snow:true,gorilla:false,bot:true});
 const s=G.freshOvergrownExpedition(17,'migrated',legacy.heroShards,legacy.upgrades,legacy.heroUnlocks);assert(s.heroUnlocked.snow);assert(s.heroUnlocked.bot);assert(!s.heroUnlocked.gorilla);
 s.mode='running';s.distance=100;const saved=P.sanitizeExpedition(s);assert(saved.heroUnlocked.snow);assert(saved.heroUnlocked.bot);
 const modern=P.emptyExpeditionProfile();modern.heroShards.snow=4;assert.equal(P.normalizeProfile(modern).heroUnlocks.snow,false);
 modern.heroShards.snow=G.HERO_SHARD_TARGET;assert.equal(P.normalizeProfile(modern).heroUnlocks.snow,true);
});
test('200 seeded boards have rare action-earned fragments and varied valuable secrets on every road',()=>{
 const signatures=new Set(),actions=new Set(),distances=new Set(),lanes=new Set();
 for(let seed=0;seed<200;seed++){
  const c=G.buildOvergrownCourse(seed);assert.deepEqual(c,G.buildOvergrownCourse(seed));assert(c.length<700);assert.equal(new Set(c.map(i=>i.id)).size,c.length);
  for(const choice of choices){
   const shards=c.filter(i=>i.route===choice.id&&fragmentKinds.includes(i.kind));assert.equal(shards.length,1);assert(['jump','burrow'].includes(shards[0].requiredAction));
   const secrets=c.filter(i=>i.route===choice.id&&i.secret);assert.equal(secrets.length,1);assert.equal(secrets[0].kind,'treasure-cache');assert(['jump','burrow','burst'].includes(secrets[0].requiredAction));
   const gates=gateRows(c,choice.id);assert(gates.length>=2,choice.id);assert(gates.some(row=>row[0].kind==='gap'));assert(gates.some(row=>row[0].kind==='roots'));
   for(const row of gates){assert.equal(new Set(row.map(i=>i.kind)).size,1);assert(['gap','roots','crate'].includes(row[0].kind));}
   const rows=[...new Set(c.filter(i=>i.route===choice.id&&G.HAZARDS.has(i.kind)&&!c.some(cache=>cache.route===choice.id&&cache.secret&&Math.abs(cache.d-i.d)<=3)).map(i=>i.d))].sort((a,b)=>a-b);
   for(let n=1;n<rows.length;n++)assert(rows[n]-rows[n-1]>=22,'enough time to land and recover before the next action');
  }
  const cache=c.find(i=>i.route==='rootway'&&i.secret);signatures.add([cache.d,cache.lane,cache.requiredAction].join(':'));actions.add(cache.requiredAction);distances.add(cache.d);lanes.add(cache.lane);
 }
 assert(signatures.size>80);assert.equal(actions.size,3);assert(distances.size>12);assert.equal(lanes.size,3);
 assert(G.HERO_SHARD_TARGET>3,'even both matching routes plus a chamber cannot unlock a hero in one fresh run');
});
test('full-width gates are actionable at real running speed and cannot be solved by standing still',()=>{
 for(const kind of ['gap','roots','crate'])for(const lane of [-1,0,1])for(const act of ['none','jump','burrow','burst']){
  const s=run();enter(s,'rootway');s.distance=294.5;s.speed=13.3;s.x=lane*G.LANE_WIDTH;s.lane=lane;
  const course=[-1,0,1].map((l,i)=>item(kind,300,l,{id:i}));
  if(act==='jump')G.jump(s,[]);if(act==='burrow')G.burrow(s,[]);if(act==='burst'){s.energy=100;G.burst(s,[]);}
  while(s.distance<303)G.fixedStep(s,course,[]);
  const valid=kind==='roots'?['burrow','burst']:kind==='gap'?['jump']:['jump','burst'];
  assert.equal(s.hits,valid.includes(act)?0:1,`${kind}/${lane}/${act}`);
 }
});
test('rare fragment and secret action gates resist magnets and award once after a real action',()=>{
 for(const action of ['jump','burrow','burst']){
  const cache=item('treasure-cache',300,0,{requiredAction:action,secret:true}),miss=run();enter(miss,'rootway');miss.distance=294.5;miss.magnet=18;
  steps(miss,[cache],1);assert.equal(miss.coins,0);
  const s=run();enter(s,'rootway');s.distance=294.5;
  if(action==='jump')G.jump(s,[]);if(action==='burrow')G.burrow(s,[]);if(action==='burst'){s.energy=100;G.burst(s,[]);}
  steps(s,[cache],1);assert.equal(s.coins,5);assert.equal(s.gems,3);assert.equal(s.score,650);assert.equal(s.used.filter(i=>i===cache.id).length,1);
 }
});
test('armor, magnet and fortune upgrades have persistent distinct effects after starting timers expire',()=>{
 const base=run(),armor=run(17,{armor:3,magnet:0,fortune:0}),magnet=run(17,{armor:0,magnet:3,fortune:0}),fortune=run(17,{armor:0,magnet:0,fortune:3});
 assert.equal(armor.shields,2);assert.equal(armor.shieldTime,90);
 for(const s of [base,armor,magnet,fortune]){enter(s,'rootway');s.distance=199.8;s.shields=0;s.shieldTime=0;s.magnet=0;}
 G.fixedStep(base,[item('shield')],[]);G.fixedStep(armor,[item('shield')],[]);assert.equal(base.shields,1);assert.equal(armor.shields,2);assert.equal(base.shieldTime,18);assert.equal(armor.shieldTime,48);
 base.distance=219.8;magnet.distance=219.8;G.fixedStep(base,[item('coin',220,1,{id:2})],[]);G.fixedStep(magnet,[item('coin',220,1,{id:2})],[]);assert.equal(base.coins,0);assert.equal(magnet.coins,1);assert.equal(magnet.energy,13);
 base.distance=239.8;fortune.distance=239.8;G.fixedStep(base,[item('treasure-cache',240,0,{id:3})],[]);G.fixedStep(fortune,[item('treasure-cache',240,0,{id:3})],[]);assert.equal(base.coins,5);assert.equal(fortune.coins,11);assert.equal(fortune.gems,4);assert.equal(fortune.score,1100);assert.equal(G.secretRevealDistance(fortune),30);
 const restored=P.sanitizeExpedition(magnet);assert(restored);assert.equal(restored.metaMagnet,3);assert.equal(restored.courseRevision,2);
});
test('Snow charges offense, Gorilla opens an escape, and Bot chains electronics only',()=>{
 const snow=run();enter(snow,'rootway');snow.distance=180;G.recruitCompanion(snow,'snow',[]);snow.companions.snow.cooldown=0;snow.companions.snow.joinedAt=-1;steps(snow,[item('crate')],.8);assert.equal(snow.energy,18);assert.equal(snow.companions.snow.actions,1);
 const guard=run();enter(guard,'rootway');guard.distance=199.8;guard.slideCooldown=.8;guard.mud=2;G.recruitCompanion(guard,'gorilla',[]);G.fixedStep(guard,[item('gap')],[]);assert.equal(guard.hp,3);assert.equal(guard.slideCooldown,0);assert.equal(guard.mud,0);assert.equal(guard.companions.gorilla.charges,2);assert(guard.immune>=1.09);
 const bot=run();enter(bot,'rootway');bot.distance=180;G.recruitCompanion(bot,'bot',[]);bot.companions.bot.cooldown=0;bot.companions.bot.joinedAt=-1;
 const c=[item('saw',200,0,{id:1}),item('steam',200,1,{id:2}),item('drone',201,-1,{id:3}),item('crate',201,0,{id:4}),item('steam',201,0,{id:5,route:'ridge'})];
 steps(bot,c,.8);assert.equal(bot.companions.bot.actions,2);assert.equal(bot.score,160);assert.deepEqual(bot.used,[1,2]);assert(bot.energy>45);assert.equal(snow.companions.bot.actions,0);
});
test('new run recovery preserves challenge revision and deterministic state at 30/144Hz',()=>{
 const a=run(42,{armor:3,magnet:3,fortune:3}),b=run(42,{armor:3,magnet:3,fortune:3}),course=G.buildOvergrownCourse(42),ca=G.createClock(),cb=G.createClock();
 for(let i=0;i<300;i++)G.advance(a,course,1/30,ca,[]);for(let i=0;i<1440;i++)G.advance(b,course,1/144,cb,[]);assert.deepEqual(a,b);
 const restored=P.sanitizeExpedition(a);assert(restored);G.resume(restored);assert.deepEqual(restored,a);
 const before=JSON.stringify(a);G.advance(a,course,.401,ca,[]);assert.equal(a.mode,'paused');assert.equal(a.distance,b.distance);G.resume(a);assert.equal(JSON.stringify(a),before);
});
test('visible challenge cues prioritize mandatory actions without revealing hidden rewards',()=>{
 const s=run();enter(s,'rootway');s.distance=280;
 const c=[item('treasure-cache',287,1,{id:99,secret:true,requiredAction:'burst'}),...[-1,0,1].map((lane,id)=>item('gap',300,lane,{id}))];
 assert.deepEqual(G.upcomingChallenge(s,c),{distance:20,kind:'gap',action:'jump'});assert.equal(G.nearbyHint(s,c),'BROKEN TRAIL · JUMP · 20m');
 assert.equal(G.upcomingChallenge(s,[c[0]]),null);s.distance=260;assert.equal(G.upcomingChallenge(s,c),null);
});
test('passive play cannot complete a new board even when the centre lane contains treasure',()=>{
 for(let seed=0;seed<12;seed++){
  const s=run(seed),course=G.buildOvergrownCourse(seed);
  for(let n=0;n<18000&&!s.finished;n++)G.fixedStep(s,course,[]);
  assert.equal(s.mode,'lost',String(seed));assert(s.distance<900);assert.equal(s.heroShards.snow+s.heroShards.gorilla+s.heroShards.bot,0);
 }
});
test('late-run acceleration checkpoints retain actual speed instead of clamping it on recovery',()=>{
 const s=run();enter(s,'watchtower');s.route='main';s.distance=1015;s.speed=13.3;s.energy=100;G.burst(s,[]);steps(s,[],1.2);assert(s.speed>16);
 const restored=P.sanitizeExpedition(s);assert(restored);assert.equal(restored.speed,s.speed);G.resume(restored);steps(s,[],.5);steps(restored,[],.5);assert.deepEqual(restored,s);
});
test('ordinary obstacle cues follow physical lane and visible contact distance, excluding secrets and other roads',()=>{
 const s=run();enter(s,'rootway');s.distance=280;s.lane=1;s.x=0;
 const c=[item('treasure-cache',281,0,{id:8,secret:true}),item('roots',285,1,{id:1}),item('gap',286,0,{id:2,route:'ridge'}),item('boulder',290,0,{id:3})];
 const cue=G.upcomingChallenge(s,c);assert.equal(cue.kind,'boulder');assert.equal(cue.distance,G.hazardPose(c[3],s.time,s.distance).ahead);assert.equal(cue.action,'jump-or-burst');
 assert(G.nearbyHint(s,c).startsWith('ROLLING BOULDER · JUMP OR BURST · '));s.x=G.LANE_WIDTH;assert.equal(G.upcomingChallenge(s,c).kind,'roots');
 s.used=[1];assert.equal(G.upcomingChallenge(s,c),null);
 for(const [kind,action] of [['drone','burrow'],['mud','jump'],['steam','jump-or-burst'],['saw','jump-or-burst']]){s.x=0;const hazard=item(kind,300,0,{id:15});assert.equal(G.upcomingChallenge(s,[hazard]).action,action);}
});
test('nearest cue uses moving contact distance, not original course order',()=>{
 const s=run();enter(s,'rootway');s.distance=280;
 const c=[item('boulder',290,0,{id:1}),item('crate',291,0,{id:2})];
 assert(G.hazardPose(c[0],s.time,s.distance).ahead>11);assert.equal(G.upcomingChallenge(s,c).kind,'crate');assert.equal(G.upcomingChallenge(s,c).distance,11);
});
test('every advertised obstacle counter succeeds in actual collision simulation',()=>{
 for(const kind of ['boulder','saw','steam','roots','drone','mud','gap','crate']){
  const sample=run();enter(sample,'rootway');sample.distance=294.5;const hazard=item(kind,300,0,{phase:2});
  const cue=G.upcomingChallenge(sample,[hazard]);assert(cue,kind);
  for(const action of cue.action==='jump-or-burst'?['jump','burst']:[cue.action]){
   const s=run();enter(s,'rootway');s.distance=294.5;s.speed=13.3;
   if(action==='jump')G.jump(s,[]);if(action==='burrow')G.burrow(s,[]);if(action==='burst'){s.energy=100;G.burst(s,[]);}
   while(s.distance<303)G.fixedStep(s,[hazard],[]);
   assert.equal(s.hits,0,kind+'/'+action);assert.equal(s.hp,3,kind+'/'+action);assert.equal(s.mud,0,kind+'/'+action);
  }
 }
});
test('damage and guardian gap recovery bounces cannot earn jump-gated fragments',()=>{
 for(const guarded of [false,true]){
  const s=run();enter(s,'rootway');s.distance=299;const e=[];
  if(guarded)G.recruitCompanion(s,'gorilla',e);
  const c=[item('gap',300,0,{id:1}),item('guardian-totem',302,0,{id:2,requiredAction:'jump'})];
  steps(s,c,.8,e);assert.equal(s.heroShards.gorilla,0);assert.equal(e.filter(x=>x.kind==='hero-shard').length,0);
 }
 const s=run();enter(s,'rootway');s.distance=294.5;G.fixedStep(s,[],[]);G.jump(s,[]);steps(s,[],.2);const restored=P.sanitizeExpedition(s);assert.equal(restored.lastJumpAt,s.lastJumpAt);G.resume(restored);
 const fragment=item('guardian-totem',300,0,{requiredAction:'jump'});steps(s,[fragment],.5);steps(restored,[fragment],.5);assert.equal(s.heroShards.gorilla,1);assert.deepEqual(restored,s);
});
test('corrupt jump timestamps cannot become fresh input during checkpoint recovery',()=>{
 const s=run();enter(s,'rootway');s.distance=300;s.time=20;s.y=1;s.vy=0;
 for(const timestamp of [1e9,20.01,-.1,-100,NaN,Infinity,-Infinity,undefined]){
  const restored=P.sanitizeExpedition({...s,lastJumpAt:timestamp});assert(restored);assert.equal(restored.lastJumpAt,-100,String(timestamp));assert.equal(G.actionSatisfied(restored,'jump'),false,String(timestamp));
 }
 for(const timestamp of [NaN,Infinity,-Infinity,-.1,20.1])assert.equal(G.actionSatisfied({...s,lastJumpAt:timestamp},'jump'),false,String(timestamp));
 const valid=P.sanitizeExpedition({...s,lastJumpAt:19.8});assert.equal(valid.lastJumpAt,19.8);assert(G.actionSatisfied(valid,'jump'));
});
test('a guardian gap rescue invalidates an earlier real jump instead of reusing it for a fragment',()=>{
 const s=run();enter(s,'rootway');s.distance=300;s.time=20;G.recruitCompanion(s,'gorilla',[]);G.jump(s,[]);
 assert.equal(s.lastJumpAt,20);G.fixedStep(s,[item('gap',300,0,{id:1})],[]);assert.equal(s.companions.gorilla.charges,2);assert.equal(s.lastJumpAt,-100);
 const fragment=item('guardian-totem',302,0,{id:2,requiredAction:'jump'});steps(s,[fragment],.5);assert.equal(s.heroShards.gorilla,0);
});
test('a real jump entered immediately after grounded damage remains eligible at the same tick',()=>{
 const s=run();enter(s,'rootway');s.distance=300;s.time=20;
 G.fixedStep(s,[item('crate',300,0,{id:1})],[]);assert.equal(s.hits,1);assert.equal(s.lastJumpAt,-100);
 G.jump(s,[]);assert.equal(s.lastJumpAt,s.lastHurt,'real post-hit input can share the physics timestamp');
 const fragment=item('guardian-totem',303,0,{id:2,requiredAction:'jump'});steps(s,[fragment],.5);assert.equal(s.heroShards.gorilla,1);
});
