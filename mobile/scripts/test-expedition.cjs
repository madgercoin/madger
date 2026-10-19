const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'madger-expedition-test-'));test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
for(const name of ['companions','core','profile','math','animation']){const text=fs.readFileSync(path.join(__dirname,'../src/game/expedition',name+'.ts'),'utf8');fs.writeFileSync(path.join(dir,name+'.js'),ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);}
const G=require(path.join(dir,'core.js')),P=require(path.join(dir,'profile.js')),M=require(path.join(dir,'math.js')),A=require(path.join(dir,'animation.js'));
function running(seed=17){const s=G.freshExpedition(seed,'test-'+seed);s.mode='running';return s;}
function at(kind,opts={}){const s=running();s.distance=99.8;Object.assign(s,opts);const item={id:1,d:100,lane:0,kind,route:'main',phase:0};return {s,course:[item],events:[]};}
function stepFor(s,course,seconds,events=[]){for(let i=0;i<Math.round(seconds/G.STEP);i++)G.fixedStep(s,course,events);return events;}
test('150 course seeds are reproducible, bounded, sorted and leave an unobstructed lane',()=>{
 for(let seed=0;seed<150;seed++){const c=G.buildCourse(seed);assert.deepEqual(c,G.buildCourse(seed));assert(c.length<250);assert.equal(new Set(c.map(x=>x.id)).size,c.length);c.forEach((x,i)=>{assert(G.KINDS.includes(x.kind));if(i)assert(c[i-1].d<=x.d);assert(x.d<G.TRACK_LENGTH);});const rows=new Map();for(const x of c.filter(x=>G.HAZARDS.has(x.kind))){const v=rows.get(x.d)||new Set();v.add(x.lane);rows.set(x.d,v);}for(const lanes of rows.values())assert(lanes.size<=2);assert(c.filter(x=>G.HAZARDS.has(x.kind)).every(x=>x.d>=64));}
});
test('steering is continuous and collision follows physical x, not selected lane',()=>{const {s,course,events}=at('boulder');G.steer(s,1);assert.equal(s.x,0);G.fixedStep(s,course,events);assert(s.x>0&&s.x<.03);assert.equal(s.hp,2);const safe=at('boulder',{x:2.15,lane:1});G.steer(safe.s,-1);G.fixedStep(safe.s,safe.course,safe.events);assert.equal(safe.s.hp,3);});
test('jump follows gravity, lands on the surface and cannot stack airborne impulses',()=>{const s=running(),e=[];G.jump(s,e);const initial=s.vy;G.jump(s,e);assert.equal(s.vy,initial);stepFor(s,[],.35,e);assert(s.y>1.2&&s.y<1.8);stepFor(s,[],.6,e);assert.equal(s.y,0);assert.equal(s.vy,0);assert(e.some(x=>x.kind==='land'));});
test('jump avoids low traps and gaps; slide avoids overhead roots and drones',()=>{for(const kind of ['saw','gap','crate','mud','boulder']){const {s,course,events}=at(kind,{y:1.4,vy:0});G.fixedStep(s,course,events);assert.equal(s.hp,3,kind);assert.equal(s.mud,0);}for(const kind of ['roots','drone']){const {s,course,events}=at(kind,{slide:.6});G.fixedStep(s,course,events);assert.equal(s.hp,3,kind);}const root=at('roots',{y:1,vy:0});G.fixedStep(root.s,root.course,root.events);assert.equal(root.s.hp,2);});
test('hits resolve once, shields consume one charge and immunity prevents stacked damage',()=>{const {s,course,events}=at('boulder',{shields:2,shieldTime:10});stepFor(s,course,.1,events);assert.equal(s.hp,3);assert.equal(s.shields,1);assert.equal(events.filter(e=>e.kind==='block').length,1);const multi=at('crate');multi.course.push({...multi.course[0],id:2});G.fixedStep(multi.s,multi.course,multi.events);assert.equal(multi.s.hp,2);assert.equal(multi.s.hits,1);});
test('extra life revives once, restores grit and grants a safe recovery period',()=>{const {s,course,events}=at('boulder',{hp:1,lives:1});G.fixedStep(s,course,events);assert.equal(s.hp,3);assert.equal(s.lives,0);assert(s.immune>2.9);assert.equal(s.finished,false);assert(events.some(e=>e.kind==='revive'));});
test('dead runs cannot score, move or emit another failure',()=>{const {s,course,events}=at('boulder',{hp:1});G.fixedStep(s,course,events);assert.equal(s.mode,'lost');const before=JSON.stringify(s);G.fixedStep(s,course,events);assert.equal(JSON.stringify(s),before);assert.equal(events.filter(e=>e.kind==='lose').length,1);});
test('pause freezes physics, hazards, upgrade timers and score',()=>{const s=running(),c=G.buildCourse(17),e=[];s.magnet=5;s.shieldTime=6;G.pause(s);const before=JSON.stringify(s);G.advance(s,c,10,G.createClock(),e);assert.equal(JSON.stringify(s),before);assert.equal(e.length,0);G.resume(s);assert.equal(s.mode,'running');});
test('30 and 144 Hz displays produce identical simulation; long stalls pause safely',()=>{const course=G.buildCourse(9),a=running(9),b=running(9),ca=G.createClock(),cb=G.createClock();for(let i=0;i<300;i++)G.advance(a,course,1/30,ca,[]);for(let i=0;i<1440;i++)G.advance(b,course,1/144,cb,[]);assert.deepEqual(a,b);const before=a.distance,hp=a.hp;G.advance(a,course,1.2,ca,[]);assert.equal(a.mode,'paused');assert.equal(a.distance,before);assert.equal(a.hp,hp);});
test('hidden burrow needs a slide and provides a continuous, safe, valuable shortcut',()=>{const s=running(),course=G.buildCourse(17),gate=course.find(i=>i.kind==='burrow');s.distance=gate.d-.2;s.x=gate.lane*G.LANE_WIDTH;s.lane=gate.lane;G.fixedStep(s,course,[]);assert.equal(s.route,'main');s.slide=.5;const e=[];G.fixedStep(s,course,e);assert.equal(s.route,'hollow');assert(s.secrets.includes('hollow'));assert(s.score>=500);assert(Math.abs(G.routeOffset(s)-gate.lane*G.LANE_WIDTH)<.05);assert.equal(G.branchOffset(270,180,270,1),0);s.distance=269.99;G.fixedStep(s,course,e);assert.equal(s.route,'main');assert(s.immune>=1.9);});
test('workshop opens by jumping, freezes play and grants a functional upgrade',()=>{const miss=at('workshop');G.fixedStep(miss.s,miss.course,miss.events);assert.equal(miss.s.mode,'running');assert.equal(miss.s.hp,2);const {s,course,events}=at('workshop',{y:.9});G.fixedStep(s,course,events);assert.equal(s.mode,'upgrade');const d=s.distance;stepFor(s,course,1,events);assert.equal(s.distance,d);G.chooseUpgrade(s,'armor',events);assert.equal(s.shields,2);assert.equal(s.mode,'running');});
test('a vault consumes a real key and cannot be farmed repeatedly',()=>{const {s,course,events}=at('vault',{keys:1});stepFor(s,course,.1,events);assert.equal(s.keys,0);assert.equal(s.lives,1);assert.equal(s.score,1800);assert(s.secrets.includes('sealed-vault'));});
test('magnet reaches adjacent lanes; full life reserves convert to a bonus',()=>{const {s,course,events}=at('gem',{x:2.15,lane:1,magnet:5});G.fixedStep(s,course,events);assert.equal(s.gems,1);const life=at('life',{lives:2});G.fixedStep(life.s,life.course,life.events);assert.equal(life.s.lives,2);assert.equal(life.s.score,750);});
test('finish is banked once and does not use the legacy storage key',()=>{const s=running();s.distance=1079.99;G.fixedStep(s,[],[]);assert.equal(s.mode,'won');const p=P.bankExpedition(P.emptyExpeditionProfile(),s,'2026-10-18T00:00:00Z');assert.equal(p.runs,1);assert.equal(P.bankExpedition(p,s),p);assert(P.EXPEDITION_KEY.includes('expedition'));assert.equal(p.best,2500);});
test('checkpoint roundtrip preserves a seeded interrupted run but restores paused',()=>{const s=running(7);s.magnet=7;stepFor(s,G.buildCourse(7),5);const restored=P.sanitizeExpedition(JSON.parse(JSON.stringify(s)));assert(restored);assert.equal(restored.mode,'paused');G.resume(restored);assert.deepEqual({...s,resumeMode:'running'},restored);});
test('corrupt checkpoints cannot admit impossible routes, infinite scores or invalid health',()=>{assert.equal(P.sanitizeExpedition({version:1,seed:1,distance:Infinity}),null);const s=running();s.route='hollow';s.routeStart=400;s.routeEnd=405;assert.equal(P.sanitizeExpedition(s),null);const p=P.normalizeProfile({version:1,best:-2,gems:NaN,history:[null,{id:'x',date:'no'}],checkpoint:{}});assert.equal(p.best,0);assert.equal(p.gems,0);assert.equal(p.checkpoint,null);});
test('failed writes remain visible; retry saves the latest score without resurrecting the run',async()=>{let fail=false,value=null;const store=P.createExpeditionStore({getItem:async()=>value,setItem:async(k,v)=>{if(fail)throw Error('disk');value=v;}});await store.init();const s=running();await store.checkpoint(s);fail=true;s.distance=1079.99;G.fixedStep(s,[],[]);await store.finish(s);assert(store.getSnapshot().error);assert.equal(store.getSnapshot().profile.runs,1);await store.checkpoint(s);fail=false;await store.retry();assert.equal(store.getSnapshot().error,null);const saved=JSON.parse(value);assert.equal(saved.checkpoint,null);assert.equal(saved.runs,1);});
test('malformed saved JSON is not overwritten by loading, checkpointing or preferences',async()=>{let writes=0;const store=P.createExpeditionStore({getItem:async()=>'{broken',setItem:async()=>{writes++;}});await store.init();assert.equal(store.getSnapshot().ready,false);await store.checkpoint(running());await store.preferences({sound:false});assert.equal(writes,0);assert(store.getSnapshot().error);});
test('twenty scripted runs maintain finite state and bounded retained objects',()=>{for(let n=0;n<20;n++){const s=running(n),c=G.buildCourse(n);for(let tick=0;tick<18000&&!s.finished;tick++){if(tick%144===0)G.steer(s,tick%288===0?-1:1);if(tick%100===0)G.jump(s,[]);if(s.mode==='upgrade')G.chooseUpgrade(s,'armor',[]);G.fixedStep(s,c,[]);for(const key of ['distance','x','y','vx','vy','score','hp','speed'])assert(Number.isFinite(s[key]),key);assert(s.used.length<=c.length);assert(s.hp>=0&&s.hp<=3);}}});
test('all five discoveries and a winning run are reachable with ordinary controls',()=>{
 for(let seed=0;seed<12;seed++){
  const s=running(seed),c=G.buildCourse(seed),e=[];
  for(let tick=0;tick<18000&&!s.finished;tick++){
   if(s.mode==='upgrade')G.chooseUpgrade(s,'armor',e);
   let target=s.lane;
   if(s.route!=='main')target=0;
   else{
    const special=c.find(i=>i.route==='main'&&['burrow','workshop','key','vault'].includes(i.kind)&&i.d-s.distance>-.6&&i.d-s.distance<17&&!s.used.includes(i.id));
    if(special){target=special.lane;if(special.kind==='burrow'&&special.d-s.distance<5&&special.d>=s.distance)G.slide(s,e);if(special.kind==='workshop'&&special.d-s.distance<4&&s.y===0)G.jump(s,e);}
    else{const next=c.find(i=>i.route==='main'&&G.HAZARDS.has(i.kind)&&i.d-s.distance>-.5&&i.d-s.distance<10);if(next){const blocked=c.filter(i=>G.HAZARDS.has(i.kind)&&i.d===next.d).map(i=>i.lane);target=[-1,0,1].find(l=>!blocked.includes(l));}}
   }
   if(target!==s.lane)G.steer(s,target<s.lane?-1:1);
   G.fixedStep(s,c,e);
  }
  assert.equal(s.mode,'won',`seed ${seed} stopped at ${s.distance}`);
  for(const id of ['hollow','grotto','workshop','sealed-vault','finish-vault'])assert(s.secrets.includes(id),`${id} missing for seed ${seed}`);
  assert(s.score>10000);assert(s.gems>=10);
 }
});
test('geometry transforms remain finite for vertical bones and unusual camera angles',()=>{for(const a of [[0,0,0],[1,2,3]])for(const b of [[0,2,0],[0,-1,0],[4,5,-2]]){const m=M.segment(a,b,.2);assert.equal(m.length,16);assert([...m].every(Number.isFinite));}const t=M.transform(1,2,3),product=M.multiply(M.identity(),t);for(let i=0;i<16;i++)assert(Math.abs(product[i]-t[i])<1e-7);});
test('burst requires earned charge and does not bridge a gap',()=>{const {s,course,events}=at('gap',{energy:99});G.burst(s,events);assert.equal(s.burst,0);s.energy=100;G.burst(s,events);assert.equal(s.energy,0);G.fixedStep(s,course,events);assert.equal(s.hp,2);});

test('stance foot stays locked to the travelling ground instead of skating',()=>{for(const side of [-1,1]){const d=side>0?2.0:.1,a=A.gaitPose(d,side),b=A.gaitPose(d+.01,side);assert(a.stance&&b.stance);assert(Math.abs((b.z-a.z)-.01)<1e-8);}});
test('gait transitions and jump/slide blends do not snap foot positions',()=>{for(const d of [.27*3.8,3.8]){const a=A.gaitPose(d-1e-5,-1),b=A.gaitPose(d+1e-5,-1);assert(Math.abs(a.z-b.z)<1e-3);assert(Math.abs(a.y-b.y)<1e-3);}assert.equal(A.reactionEnvelope(0),0);assert.equal(A.reactionEnvelope(1.2),0);assert.equal(A.slideBlend(.83),0);assert.equal(A.slideBlend(0),0);});
test('full crouch keeps head and muzzle under the overhead root beam',()=>{const p=A.crouchPose(1,true);const cy=Math.cos(p.bodyX)*p.headY-Math.sin(p.bodyX)*p.headZ+p.bodyY;const rotation=p.bodyX+p.headX;const radius=Math.sqrt((.616*Math.cos(rotation))**2+(.546*Math.sin(rotation))**2);assert(cy+radius<.93);assert(cy>0);});

test('a secret entry extends the slide without snapping out of the crouch',()=>{const s=running(),c=G.buildCourse(17),g=c.find(i=>i.kind==='burrow');s.distance=g.d-.1;s.x=g.lane*G.LANE_WIDTH;s.lane=g.lane;s.slide=.4;s.slideAge=.43;const before=A.slideBlend(s.slide,s.slideAge);G.fixedStep(s,c,[]);assert.equal(s.route,'hollow');assert(s.slide>=1.0);assert.equal(A.slideBlend(s.slide,s.slideAge),before);});


test('Snow White waits for a drone already being hacked instead of wasting an attack',()=>{
 const s=running(),course=[{id:1,d:18,lane:0,kind:'drone',route:'main',phase:0}],events=[];
 G.recruitCompanion(s,'snow',events);G.recruitCompanion(s,'bot',events);
 s.time=1;s.companions.snow.cooldown=.10;s.companions.bot.cooldown=0;
 G.fixedStep(s,course,events);assert.equal(s.companions.bot.targetId,1);
 stepFor(s,course,.16,events);
 assert.equal(s.companions.snow.targetId,null);assert.equal(s.companions.snow.actionRemaining,0);
 stepFor(s,course,.4,events);
 assert.equal(s.companions.bot.actions,1);assert.equal(s.companions.snow.actions,0);
 assert.equal(s.companions.snow.cooldown,0);assert.equal(events.filter(e=>e.kind==='companion-boost').length,1);
});
