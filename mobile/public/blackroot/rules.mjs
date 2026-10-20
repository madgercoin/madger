/* Blackroot Ravine: deterministic route graph and earned progression.
 * This board has a separate save key. It never changes legacy Expedition records.
 */
export const SAVE_KEY='madger-blackroot-v1', VERSION=1, STEP=1/90, LANE=1.45;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
export const HEROES={
 snow:{name:'Snow White',role:'Attack',resource:'Trail sigils',need:6,color:'#f2d4b7',duration:12,detail:'Clears logs, rocks and sentry drones ahead. Earn 6 trail sigils on the upper routes.'},
 gorilla:{name:'Gorilla White',role:'Guard',resource:'Guardian seals',need:5,color:'#b5dce4',duration:12,detail:'Blocks two impacts, including a ledge rescue. Earn 5 guardian seals at the shrine and Warden gate.'},
 bot:{name:'MADGER Bot',role:'Tech',resource:'Tech cores',need:5,color:'#7fdad2',duration:12,detail:'Disables sentries, saws and pressure vents; attracts salvage. Earn 5 tech cores on the lower routes.'}
};
export const UPGRADES={
 vitality:{name:'Reinforced harness',cost:45,max:2,detail:'+1 maximum grit per level. Takes effect next expedition.'},
 magnet:{name:'Salvage magnet',cost:35,max:2,detail:'Wider pickup reach, including neighboring lanes at level 2.'},
 satchel:{name:'Recovery satchel',cost:30,max:2,detail:'Keep 75%, then 90% of unbanked salvage after a defeat instead of 60%.'}
};
export const NODES={start:[0,1,25],fork:[0,1,-53],ridge:[-33,7,-139],sluice:[33,-1,-140],gate:[0,3,-259],exit:[0,6,-330]};
const definitions=[
 ['entry','start','fork','The Old Approach','forest',0,'Follow the amber lanterns','Learn the trail; collect salvage before choosing a route.',[[0,1,25],[-3,1,7],[3,1,-15],[0,1,-53]]],
 ['ridge','fork','ridge','Rootbound Ridge','forest',1,'Lower risk / trail sigils','Wide dirt path, fallen timber, healing sap. Leads to two upper subpaths.',[[0,1,-53],[-11,3,-69],[-24,5,-102],[-33,7,-139]]],
 ['sluice','fork','sluice','The Broken Spillway','water',2,'Higher risk / tech cores','Pressure vents, wet crossings and a sentry. Leads to two lower subpaths.',[[0,1,-53],[14,0,-71],[27,-1,-103],[33,-1,-140]]],
 ['canopy','ridge','gate','Canopy Smuggler Walk','bridge',2,'Trail sigils / vault key','Narrow timber crossing. Jump broken planks and burrow under hanging roots.',[[-33,7,-139],[-49,11,-174],[-45,10,-208],[-22,6,-236],[0,3,-259]]],
 ['shrine','ridge','gate','The Mossbound Shrine','ruins',1,'Guardian seals / recovery','Stone sanctuary. More protection, less salvage; an optional buried cache.',[[-33,7,-139],[-15,4,-163],[-12,2,-195],[-18,2,-229],[0,3,-259]]],
 ['culvert','sluice','gate','Flooded Culvert','cave',3,'Tech cores / rich salvage','Vents and low arches in the wet tunnel. High salvage, sparse healing.',[[33,-1,-140],[20,-2,-166],[19,-2,-192],[29,-1,-223],[0,3,-259]]],
 ['foundry','sluice','gate','Overgrown Turbine Yard','industrial',2,'Tech cores / shield','Rusted mechanisms and moving saws. A shield cache rewards a well-timed burrow.',[[33,-1,-140],[49,1,-164],[51,5,-198],[38,7,-231],[0,3,-259]]],
 ['return','gate','exit','Lantern Ascent','forest',1,'Bank safely / +30 salvage','A gentler climb to extraction. Keep every piece of salvage you bring home.',[[0,3,-259],[-13,3,-280],[-12,5,-307],[0,6,-330]]],
 ['vault','gate','exit','The Sealed Warden Vault','vault',3,'Spend 1 key / +90 salvage','A guarded final detour. More hazards, no healing; the vault pays only at extraction.',[[0,3,-259],[17,5,-279],[20,5,-305],[0,6,-330]]]
];
function catmull(points,t){
 const q=clamp(t,0,1)*(points.length-1),i=Math.min(points.length-2,Math.floor(q)),f=q-i;
 const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
 return [0,1,2].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*f+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*f*f+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*f*f*f));
}
export const ROUTES=Object.fromEntries(definitions.map(([id,from,to,name,biome,risk,reward,description,points])=>{
 const samples=[],lengths=[0];for(let i=0;i<=200;i++){const p=catmull(points,i/200);if(i)lengths.push(lengths[i-1]+Math.hypot(...p.map((v,k)=>v-samples[i-1][k])));samples.push(p);}
 return [id,{id,from,to,name,biome,risk,reward,description,points,samples,lengths,length:lengths.at(-1)}];
}));
export function routePoint(id,d){
 const r=ROUTES[id];d=clamp(d,0,r.length);let lo=0,hi=r.lengths.length-1;
 while(lo+1<hi){const m=(lo+hi)>>1;if(r.lengths[m]<=d)lo=m;else hi=m;}
 const w=(d-r.lengths[lo])/(r.lengths[hi]-r.lengths[lo]||1),a=r.samples[lo],b=r.samples[hi];
 const point=a.map((v,k)=>v+(b[k]-v)*w),dir=b.map((v,k)=>v-a[k]),mag=Math.hypot(...dir)||1;
 return {point,dir:dir.map(v=>v/mag)};
}
export function worldPoint(id,d,lateral=0,height=0){const {point,dir}=routePoint(id,d),flat=Math.hypot(dir[0],dir[2])||1;return [point[0]-dir[2]/flat*lateral,point[1]+height,point[2]+dir[0]/flat*lateral];}
export function availableRoutes(r){return Object.values(ROUTES).filter(e=>e.from===ROUTES[r.edge].to).map(e=>({...e,locked:e.id==='vault'&&r.keys<1,requirement:e.id==='vault'?'1 vault key':''}));}
export function seedRandom(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function makeItems(edge){
 const r=ROUTES[edge],items=[];const add=(f,lane,kind,value=1)=>items.push({id:edge+':'+items.length,edge,d:f*r.length,lane,kind,value});
 for(let i=0;i<10;i++)add(.09+i*.077,i%4===3?(i%2?1:-1):0,'salvage',3);
 const H=(f,l,k)=>add(f,l,k);
 if(edge==='entry'){H(.39,0,'log');H(.69,1,'roots');add(.23,0,'amber',8);add(.78,0,'heal');}
 if(edge==='ridge'){[.18,.44,.74].forEach(f=>add(f,0,'snow'));H(.30,0,'log');H(.60,-1,'rock');H(.81,0,'roots');add(.54,1,'heal');add(.90,0,'battery');}
 if(edge==='sluice'){[.22,.73].forEach(f=>add(f,0,'bot'));H(.32,0,'steam');H(.48,1,'gap');H(.64,0,'drone');H(.84,-1,'steam');add(.55,-1,'amber',12);add(.91,0,'battery');}
 if(edge==='canopy'){[.15,.42,.77].forEach(f=>add(f,0,'snow'));H(.26,0,'gap');H(.52,0,'roots');H(.64,-1,'gap');H(.85,0,'log');add(.33,1,'amber',14);add(.68,0,'key');add(.91,1,'cache',22);}
 if(edge==='shrine'){[.13,.35,.58,.81].forEach(f=>add(f,0,'gorilla'));H(.24,-1,'rock');H(.48,0,'roots');H(.72,0,'log');add(.20,1,'heal');add(.64,0,'shield');add(.88,-1,'key');add(.91,0,'cache',18);}
 if(edge==='culvert'){[.15,.41,.79].forEach(f=>add(f,0,'bot'));H(.26,0,'steam');H(.35,1,'gap');H(.51,0,'roots');H(.63,0,'saw');H(.86,-1,'steam');add(.20,1,'amber',15);add(.57,-1,'amber',15);add(.70,1,'key');add(.92,0,'cache',28);}
 if(edge==='foundry'){[.14,.40,.76].forEach(f=>add(f,0,'bot'));H(.25,0,'saw');H(.48,1,'drone');H(.60,0,'steam');H(.84,0,'saw');add(.31,-1,'gorilla');add(.69,0,'key');add(.55,-1,'shield');add(.91,0,'cache',22);}
 if(edge==='return'){H(.25,1,'log');H(.49,0,'roots');add(.66,0,'gorilla');add(.38,-1,'heal');add(.78,0,'amber',10);}
 if(edge==='vault'){H(.22,0,'saw');H(.39,0,'gap');H(.56,0,'drone');H(.75,0,'roots');H(.88,1,'steam');add(.31,-1,'amber',15);add(.67,1,'amber',15);add(.81,0,'gorilla');}
 return items.sort((a,b)=>a.d-b.d);
}
export const ITEMS=Object.fromEntries(Object.keys(ROUTES).map(id=>[id,makeItems(id)]));
export const HAZARDS=new Set(['log','roots','rock','gap','saw','steam','drone']);
export const HINTS={log:'Jump the fallen timber, or take another lane.',roots:'Burrow under the hanging roots.',rock:'Dodge the boulder or jump clear.',gap:'Jump the broken crossing. Burrowing cannot cross a gap.',saw:'Stay clear of the moving saw.',steam:'Wait for a quiet vent, jump, or change lanes.',drone:'Burrow beneath the sentry or dodge it.',cache:'Burrow into the marked hollow to recover this cache.'};
export function hazardPose(item,time){return {lateral:item.lane*LANE+(item.kind==='saw'?Math.sin(time*1.9+item.d)*.45:0),active:item.kind!=='steam'||((time+item.d*.13)%3.4)>1.1};}
export function emptyProfile(){return {version:VERSION,revision:0,bank:0,bonds:{snow:0,gorilla:0,bot:0},selected:null,upgrades:{vitality:0,magnet:0,satchel:0},discoveries:[],best:0,runs:0,history:[],checkpoint:null};}
export function unlocked(p,id){return !!HEROES[id]&&p.bonds[id]>=HEROES[id].need;}
export function upgradeCost(p,id){return UPGRADES[id]?UPGRADES[id].cost*(1+p.upgrades[id]):Infinity;}
export function buyUpgrade(p,id){if(!UPGRADES[id]||p.upgrades[id]>=UPGRADES[id].max||p.bank<upgradeCost(p,id))return false;p.bank-=upgradeCost(p,id);p.upgrades[id]++;return true;}
export function selectHero(p,id){if(id!==null&&!unlocked(p,id))return false;p.selected=id;return true;}
export function freshRun(p,id){return {version:VERSION,id:id||('br-'+Date.now()+'-'+Math.random().toString(36).slice(2)),mode:'ready',resumeMode:'running',edge:'entry',d:0,total:0,time:0,lane:0,x:0,vx:0,y:0,vy:0,burrow:0,burrowAge:0,burrowCooldown:0,hp:3+p.upgrades.vitality,maxHp:3+p.upgrades.vitality,shield:0,charge:0,burst:0,immune:0,slow:0,coins:0,score:0,keys:0,used:[],visited:['entry'],equipped:p.selected&&unlocked(p,p.selected)?p.selected:null,hero:null,heroCooldown:0,assists:0,bankAward:0,campReward:null,routeBonus:0,finished:false,hitCount:0,sessionUpgrades:[],eventNo:0};}
const emit=(r,events,type,text='',data={})=>events.push({id:r.id+':'+r.eventNo++,type,text,...data});
export function startRun(r){if(r.mode==='ready'){r.mode='running';return true;}return false;}
export function pause(r){if(r.mode==='running'){r.resumeMode='running';r.mode='paused';return true;}return false;}
export function resume(r){if(r.mode==='paused'){r.mode='running';return true;}return false;}
export function input(r,action,events=[]){
 if(r.mode!=='running')return false;
 if(action==='left'||action==='right'){r.lane=clamp(r.lane+(action==='left'?-1:1),-1,1);return true;}
 if(action==='jump'){if(r.y>.03||r.burrow>0)return false;r.y=.025;r.vy=8.7;emit(r,events,'jump');return true;}
 if(action==='burrow'){if(r.burrowCooldown>0)return false;if(r.y>.18){r.vy=Math.min(r.vy,-11);return true;}r.burrow=r.sessionUpgrades.includes('claws')?1.2:.88;r.burrowAge=0;r.burrowCooldown=1.15;emit(r,events,'burrow');return true;}
 if(action==='burst'){if(r.charge<100||r.burst>0)return false;r.charge=0;r.burst=2.6;emit(r,events,'burst','BURST · protected from solid obstacles');return true;}
 return false;
}
export function summon(r,p,events=[]){
 if(r.mode!=='running'||!r.equipped||!unlocked(p,r.equipped)||r.hero||r.heroCooldown>0||r.charge<100)return false;
 r.charge=0;r.hero={id:r.equipped,time:HEROES[r.equipped].duration,age:0,cooldown:.4,guards:2,target:null,action:0,actionKind:'join',lastAction:-10};r.heroCooldown=22;
 emit(r,events,'hero-join',HEROES[r.equipped].name+' · '+HEROES[r.equipped].role+' support');return true;
}
export function takeRoute(r,id,p,events=[]){
 if(r.mode!=='fork')return false;const option=availableRoutes(r).find(e=>e.id===id);if(!option||option.locked)return false;
 if(id==='vault')r.keys--;
 r.edge=id;r.d=0;r.x=0;r.vx=0;r.lane=0;r.y=0;r.vy=0;r.burrow=0;r.used=[];r.visited.push(id);r.mode='running';r.immune=Math.max(r.immune,1.5);
 if(r.hero){r.hero.target=null;r.hero.action=0;}
 if(!p.discoveries.includes(id))p.discoveries.push(id);
 emit(r,events,'route',option.name);return true;
}
export function campUpgrade(r,id,events=[]){if(r.mode!=='fork'||!r.campReward||!['armor','magnet','claws'].includes(id))return false;if(id==='armor')r.shield=Math.max(2,r.shield);else if(!r.sessionUpgrades.includes(id))r.sessionUpgrades.push(id);r.campReward=null;emit(r,events,'upgrade',id==='armor'?'FIELD ARMOR · 2 blocks':id==='magnet'?'RUN MAGNET · all-lane salvage':'DIGGING CLAWS · extended burrow');return true;}
function finish(r,p,won,events){
 if(r.finished)return;r.finished=true;r.mode=won?'won':'lost';r.hero=null;
 if(won){r.routeBonus=r.edge==='vault'?90:30;r.coins+=r.routeBonus;r.score+=r.routeBonus*20;}
 const retention=[.6,.75,.9][p.upgrades.satchel]||.6;r.bankAward=won?r.coins:Math.floor(r.coins*retention);
 if(!p.history.some(h=>h.id===r.id)){p.bank+=r.bankAward;p.runs++;p.best=Math.max(p.best,r.score);p.history.unshift({id:r.id,won,score:r.score,bank:r.bankAward,routes:[...r.visited]});p.history=p.history.slice(0,12);}
 p.checkpoint=null;emit(r,events,won?'win':'lose',won?'Extraction complete':'Expedition ended');
}
export function retire(r,p,events=[]){if(r.finished||r.mode==='ready')return false;finish(r,p,false,events);return true;}
function collect(r,p,item,events){
 if(HEROES[item.kind]){const id=item.kind,before=unlocked(p,id);p.bonds[id]=Math.min(99999,p.bonds[id]+item.value);r.score+=100;r.charge=clamp(r.charge+16,0,100);emit(r,events,'bond',HEROES[id].resource+' +'+item.value,{hero:id});if(!before&&unlocked(p,id)){if(!p.selected)p.selected=id;if(!r.equipped)r.equipped=id;emit(r,events,'unlock',HEROES[id].name+' unlocked · summon at 100 energy',{hero:id});}return;}
 if(item.kind==='salvage'||item.kind==='amber'||item.kind==='cache'){r.coins+=item.value;r.score+=item.value*20;r.charge=clamp(r.charge+(item.kind==='salvage'?9:20),0,100);emit(r,events,item.kind,item.kind==='cache'?'BURIED CACHE +'+item.value:item.kind==='amber'?'AMBER RELIC +'+item.value:'', {value:item.value});}
 if(item.kind==='heal'){r.hp=Math.min(r.maxHp,r.hp+1);emit(r,events,'heal','Healing sap · +1 grit');}
 if(item.kind==='shield'){r.shield=Math.min(3,r.shield+1);emit(r,events,'shield','Field shield · one impact blocked');}
 if(item.kind==='key'){r.keys++;emit(r,events,'key','Warden key found · vault detour available');}
 if(item.kind==='battery'){r.charge=clamp(r.charge+30,0,100);emit(r,events,'battery','Energy cell +30');}
}
function hit(r,p,item,events){
 if(r.immune>0)return;
 if(r.burst>0&&item.kind!=='gap'){r.score+=60;emit(r,events,'block','Burst smash');return;}
 if(r.hero?.id==='gorilla'&&r.hero.guards>0){r.hero.guards--;r.hero.lastAction=r.time;r.hero.actionKind='guard';r.hero.action=.7;r.assists++;r.immune=1;if(item.kind==='gap'){r.y=.2;r.vy=7;}emit(r,events,'guard','Gorilla White · '+(item.kind==='gap'?'ledge rescue':'impact blocked'));return;}
 if(r.shield>0&&item.kind!=='gap'){r.shield--;r.immune=.9;emit(r,events,'block','Shield absorbed the impact');return;}
 r.hp--;r.hitCount++;r.immune=1.45;r.slow=.5;emit(r,events,'hit',item.kind==='gap'?'MISSED LEDGE · −1 GRIT':'IMPACT · −1 GRIT');
 if(item.kind==='gap'){r.y=.2;r.vy=7;}
 if(r.hp<=0)finish(r,p,false,events);
}
function stepHero(r,items,events,dt){
 const h=r.hero;if(!h)return;h.time=Math.max(0,h.time-dt);h.age+=dt;h.cooldown=Math.max(0,h.cooldown-dt);h.action=Math.max(0,h.action-dt);
 if(h.time===0){emit(r,events,'hero-leave',HEROES[h.id].name+' · support complete');r.hero=null;return;}
 if(h.target&&h.action<.28){const target=items.find(i=>i.id===h.target);if(target&&!r.used.includes(target.id)){r.used.push(target.id);r.assists++;r.score+=100;h.lastAction=r.time;emit(r,events,'assist',HEROES[h.id].name+' · threat cleared',{target:target.id});}h.target=null;}
 if(h.id==='gorilla'||h.cooldown>0)return;
 const types=h.id==='snow'?['log','rock','drone']:['drone','steam','saw'];
 const target=items.find(i=>!r.used.includes(i.id)&&types.includes(i.kind)&&i.d-r.d>8&&i.d-r.d<19&&Math.abs(i.lane*LANE-r.x)<1.7);
 if(target){h.target=target.id;h.action=.62;h.actionKind='attack';h.lastAction=r.time;h.cooldown=2.8;emit(r,events,'hero-action','',{target:target.id});}
}
export function stepRun(r,p,dt,events=[]){
 if(r.mode!=='running'||r.finished)return;
 if(!Number.isFinite(dt)||dt<=0||dt>.25)return;
 const old=r.d;r.time+=dt;
 for(const k of ['burrow','burrowCooldown','immune','slow','burst','heroCooldown'])r[k]=Math.max(0,r[k]-dt);
 if(r.burrow>0)r.burrowAge+=dt;
 r.vx+=(95*(r.lane*LANE-r.x)-19*r.vx)*dt;r.x=clamp(r.x+r.vx*dt,-LANE-.04,LANE+.04);
 if(r.y>0||r.vy>0){r.vy-=24*dt;r.y=Math.max(0,r.y+r.vy*dt);if(r.y===0){r.vy=0;emit(r,events,'land');}}
 const speed=8.3*(r.slow>0?.65:1)*(r.burst>0?1.18:1);r.d=Math.min(ROUTES[r.edge].length,r.d+speed*dt);r.total+=r.d-old;
 const items=ITEMS[r.edge];stepHero(r,items,events,dt);
 for(const item of items){
  if(item.d>r.d+.85)break;if(r.used.includes(item.id)||item.d<old-1.2)continue;
  const {lateral,active}=hazardPose(item,r.time),distance=Math.abs(lateral-r.x),hazard=HAZARDS.has(item.kind);
  if(item.d<r.d-1.1){r.used.push(item.id);continue;}
  const magnet=(r.sessionUpgrades.includes('magnet')||r.hero?.id==='bot')&&(item.kind==='salvage'||item.kind==='amber');
  if(distance>(hazard?.78:.76+p.upgrades.magnet*.4)&&!magnet)continue;
  if(hazard){const avoid=item.kind==='roots'||item.kind==='drone'?r.burrow>0&&r.y<.2:item.kind==='steam'?!active||r.y>.9:r.y>(item.kind==='rock'?1.05:.64);if(!avoid){r.used.push(item.id);hit(r,p,item,events);if(r.finished)break;}}
  else{if(item.kind==='cache'&&(r.burrow<=0||r.y>.2))continue;r.used.push(item.id);collect(r,p,item,events);}
 }
 if(!r.finished&&r.d>=ROUTES[r.edge].length-1e-7){const choices=availableRoutes(r);if(choices.length){r.mode='fork';r.y=0;r.vy=0;r.burrow=0;r.campReward=ROUTES[r.edge].to==='gate'?'Warden cache':null;emit(r,events,'fork',ROUTES[r.edge].to==='gate'?'Warden camp · bank or risk the vault':'Choose your route');}else finish(r,p,true,events);}
}
export function advance(r,p,seconds,clock,events=[]){if(seconds>.4||!Number.isFinite(seconds)){pause(r);clock.acc=0;return;}if(r.mode!=='running'){clock.acc=0;return;}clock.acc+=Math.max(0,seconds);let n=0;while(clock.acc>=STEP&&n++<40){stepRun(r,p,STEP,events);clock.acc-=STEP;if(r.mode!=='running'){clock.acc=0;break;}}}
export function nextHint(r){const item=ITEMS[r.edge].find(i=>!r.used.includes(i.id)&&i.d-r.d>1&&i.d-r.d<15&&(HAZARDS.has(i.kind)||i.kind==='cache'));return item?{...item,distance:Math.round(item.d-r.d),hint:HINTS[item.kind]}:null;}
export function expectedMaxSalvage(id){return ITEMS[id].filter(i=>['salvage','amber','cache'].includes(i.kind)).reduce((s,i)=>s+i.value,0)+(id==='vault'?90:id==='return'?30:0);}
export function snapshot(p,r){return {...p,checkpoint:r&&!r.finished&&r.mode!=='ready'?JSON.parse(JSON.stringify(r)):null};}
export function normalizeProfile(raw){
 if(!raw||raw.version!==VERSION)throw Error('This Blackroot save is not compatible. Your other game records are untouched.');
 const p=emptyProfile(),integer=(n,max=1e8)=>Number.isFinite(n)?Math.floor(clamp(n,0,max)):0;
 for(const k of ['bank','best','runs','revision'])p[k]=integer(raw[k]);
 for(const id of Object.keys(HEROES))p.bonds[id]=integer(raw.bonds?.[id],99999);
 for(const id of Object.keys(UPGRADES))p.upgrades[id]=integer(raw.upgrades?.[id],UPGRADES[id].max);
 p.selected=unlocked(p,raw.selected)?raw.selected:null;
 p.discoveries=[...new Set((Array.isArray(raw.discoveries)?raw.discoveries:[]).filter(k=>ROUTES[k]))];
 p.history=(Array.isArray(raw.history)?raw.history:[]).filter(h=>h&&typeof h.id==='string'&&Number.isFinite(h.bank)&&Number.isFinite(h.score)).slice(0,12);
 if(raw.checkpoint){const s=raw.checkpoint;if(s.version!==VERSION||!ROUTES[s.edge]||typeof s.id!=='string'||!['running','paused','fork'].includes(s.mode)||s.finished)throw Error('Interrupted Blackroot run is invalid. Saved rewards have not been overwritten.');
  const r=freshRun(p,s.id),limits={d:ROUTES[s.edge].length,total:10000,time:10000,hp:5,maxHp:5,coins:5000,score:1e7,keys:5,charge:100,shield:3,burrow:1.2,burrowAge:2,burrowCooldown:1.15,immune:5,slow:5,burst:3,heroCooldown:25,assists:10000,eventNo:1e7,hitCount:1000};
  for(const [key,max]of Object.entries(limits)){if(!Number.isFinite(s[key])||s[key]<0||s[key]>max)throw Error('Interrupted run has invalid '+key);r[key]=s[key];}
  for(const k of ['x','vx','y','vy'])if(!Number.isFinite(s[k])||Math.abs(s[k])>30)throw Error('Invalid saved movement');
  if(![-1,0,1].includes(s.lane)||s.hp<=0||s.hp>s.maxHp)throw Error('Invalid saved health or lane');
  Object.assign(r,{edge:s.edge,mode:s.mode==='running'?'paused':s.mode,lane:s.lane,x:s.x,vx:s.vx,y:clamp(s.y,0,5),vy:s.vy,visited:Array.isArray(s.visited)?s.visited.filter(k=>ROUTES[k]):['entry'],campReward:s.campReward==='Warden cache'?s.campReward:null});
  const valid=new Set(ITEMS[r.edge].map(i=>i.id));r.used=[...new Set((Array.isArray(s.used)?s.used:[]).filter(id=>valid.has(id)))];r.sessionUpgrades=[...new Set((s.sessionUpgrades||[]).filter(k=>['magnet','claws'].includes(k)))];
  r.equipped=unlocked(p,s.equipped)?s.equipped:null;
  if(s.hero&&s.hero.id===r.equipped&&Number.isFinite(s.hero.time)&&s.hero.time>0&&s.hero.time<=12){r.hero={id:s.hero.id,time:s.hero.time,age:clamp(s.hero.age||0,0,12),cooldown:clamp(s.hero.cooldown||0,0,3),guards:integer(s.hero.guards,2),target:valid.has(s.hero.target)?s.hero.target:null,action:clamp(s.hero.action||0,0,.7),actionKind:['join','attack','guard'].includes(s.hero.actionKind)?s.hero.actionKind:'join',lastAction:Number.isFinite(s.hero.lastAction)?s.hero.lastAction:-10};}
  p.checkpoint=r;
 }
 return p;
}
