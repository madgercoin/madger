import { buildCourse, clamp, freshExpedition, type Expedition, type Mode, type Upgrade } from './core';
import { sanitizeCompanions } from './companions';
export const EXPEDITION_KEY = 'madger-expedition-3d-v1';
export type ExpeditionResult = {id:string; score:number; coins:number; gems:number; secrets:string[]; distance:number; won:boolean; hits:number; date:string};
export type ExpeditionProfile = {version:1; best:number; runs:number; gems:number; discoveries:string[]; history:ExpeditionResult[]; completedIds:string[]; checkpoint:Expedition|null; settings:{sound:boolean;calm:boolean;music:boolean};};
export type StorageAdapter = {getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<void>};
const int=(value:unknown,max=100000000)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?Math.min(value,max):0;
const finite=(value:unknown,lo:number,hi:number,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?clamp(value,lo,hi):fallback;
const discoveries=(value:unknown)=>[...new Set((Array.isArray(value)?value:[]).filter((s):s is string=>['hollow','grotto','workshop','sealed-vault','finish-vault'].includes(s)))];
export const emptyExpeditionProfile=():ExpeditionProfile=>({version:1,best:0,runs:0,gems:0,discoveries:[],history:[],completedIds:[],checkpoint:null,settings:{sound:true,calm:false,music:true}});
export function sanitizeExpedition(input:unknown):Expedition|null {
  if(!input||typeof input!=='object')return null;
  const p=input as Partial<Expedition>;
  if(p.version!==1||typeof p.id!=='string'||!p.id||p.id.length>100||!Number.isSafeInteger(p.seed)||Number(p.seed)<0||!Number.isFinite(p.distance)||Number(p.distance)<0||Number(p.distance)>=1080||p.finished||p.mode==='won'||p.mode==='lost'||p.mode==='ready')return null;
  if(!['countdown','running','paused','upgrade'].includes(p.mode??'')||![-1,0,1].includes(Number(p.lane))||!['main','hollow','grotto'].includes(p.route??''))return null;
  if(Number(p.hp)<=0||Number(p.hp)>3)return null;
  const s=freshExpedition(Number(p.seed),p.id);
  const course=buildCourse(Number(p.seed)),ids=new Set(course.map(i=>i.id));
  Object.assign(s,{
    tick:int(p.tick,200000),time:finite(p.time,0,2000),distance:finite(p.distance,0,1079.99),
    countdown:finite(p.countdown,0,2.4),lane:p.lane,x:finite(p.x,-2.19,2.19),vx:finite(p.vx,-20,20),
    y:finite(p.y,0,4),vy:finite(p.vy,-30,10),slide:finite(p.slide,0,1.10),slideAge:finite(p.slideAge,0,3),slideCooldown:finite(p.slideCooldown,0,1.2),jumpBuffer:0,
    speed:finite(p.speed,5,16,9.8),hp:int(p.hp,3),lives:int(p.lives,2),shields:int(p.shields,2),shieldTime:finite(p.shieldTime,0,22),
    magnet:finite(p.magnet,0,18),burst:finite(p.burst,0,3.6),energy:finite(p.energy,0,100),immune:finite(p.immune,0,3),mud:finite(p.mud,0,2.5),
    score:int(p.score),coins:int(p.coins,5000),gems:int(p.gems,1000),combo:int(p.combo,5000),bestCombo:int(p.bestCombo,5000),hits:int(p.hits,1000),nearMisses:int(p.nearMisses,1000),keys:int(p.keys,2),
    route:p.route,routeStart:finite(p.routeStart,0,1080),routeEnd:finite(p.routeEnd,0,1080),routeSide:p.routeSide===-1?-1:p.routeSide===1?1:0,
    secrets:discoveries(p.secrets),upgrade:['magnet','armor','fortune'].includes(p.upgrade??'')?p.upgrade as Upgrade:null,
    used:[...new Set((Array.isArray(p.used)?p.used:[]).filter(id=>ids.has(id)))],eventId:int(p.eventId,1000000),
    lastHurt:finite(p.lastHurt,-10,2000,-10),lastGood:finite(p.lastGood,-10,2000,-10),lastFoot:int(p.lastFoot,1000),zone:int(p.zone,2),
    companions:sanitizeCompanions(p.companions,ids,finite(p.time,0,2000)),
    resumeMode:p.mode==='countdown'||p.resumeMode==='countdown'?'countdown':'running',mode:p.mode==='upgrade'?'upgrade':'paused',
  });
  if(s.route!=='main') {
    const gate=s.route==='hollow'?180:780;
    if(s.routeStart!==gate||s.routeEnd!==gate+90||s.distance<gate-1||s.distance>=gate+90||s.routeSide===0)return null;
  }
  return s;
}
export function normalizeProfile(input:unknown):ExpeditionProfile {
  const d=emptyExpeditionProfile();if(!input||typeof input!=='object')return d;
  const p=input as Partial<ExpeditionProfile>;if(p.version!==1)return d;
  const history=(Array.isArray(p.history)?p.history:[]).flatMap((v:unknown)=>{
    if(!v||typeof v!=='object')return [];
    const r=v as Partial<ExpeditionResult>;
    if(typeof r.id!=='string'||!r.id||r.id.length>100||typeof r.date!=='string'||!Number.isFinite(Date.parse(r.date)))return [];
    return [{id:r.id,score:int(r.score),coins:int(r.coins,5000),gems:int(r.gems,1000),secrets:discoveries(r.secrets),distance:finite(r.distance,0,1080),won:r.won===true,hits:int(r.hits,1000),date:r.date}];
  }).slice(0,40);
  const seen=new Set<string>();
  d.history=history.filter(r=>!seen.has(r.id)&&!!seen.add(r.id));
  d.best=Math.max(int(p.best),...d.history.map(r=>r.score),0);d.runs=int(p.runs);d.gems=int(p.gems);d.discoveries=discoveries(p.discoveries);
  d.completedIds=[...new Set([...(Array.isArray(p.completedIds)?p.completedIds:[]).filter((v):v is string=>typeof v==='string'&&v.length>0&&v.length<=100),...seen])].slice(-512);
  d.checkpoint=sanitizeExpedition(p.checkpoint);if(d.checkpoint&&d.completedIds.includes(d.checkpoint.id))d.checkpoint=null;
  d.settings={sound:p.settings?.sound!==false,calm:p.settings?.calm===true,music:p.settings?.music!==false};return d;
}
export function bankExpedition(profile:ExpeditionProfile,run:Expedition,date=new Date().toISOString()):ExpeditionProfile {
  if(!run.finished||!['won','lost'].includes(run.mode)||profile.completedIds.includes(run.id))return profile;
  const result:ExpeditionResult={id:run.id,score:run.score,coins:run.coins,gems:run.gems,secrets:[...run.secrets],distance:run.distance,won:run.mode==='won',hits:run.hits,date};
  return {...profile,best:Math.max(profile.best,run.score),runs:profile.runs+1,gems:profile.gems+run.gems,
    discoveries:discoveries([...profile.discoveries,...run.secrets]),history:[result,...profile.history].slice(0,40),
    completedIds:[...profile.completedIds,run.id].slice(-512),checkpoint:profile.checkpoint?.id===run.id?null:profile.checkpoint};
}
export type StoreSnapshot={profile:ExpeditionProfile;ready:boolean;saving:boolean;error:string|null};
/** Serialized writes prevent a delayed checkpoint from resurrecting a finished run. */
export function createExpeditionStore(storage:StorageAdapter) {
  let snapshot:StoreSnapshot={profile:emptyExpeditionProfile(),ready:false,saving:false,error:null};
  let queue=Promise.resolve(),loadPromise:Promise<void>|null=null,pending=0,disposed=false;
  const listeners=new Set<()=>void>();
  const emit=()=>{if(!disposed)for(const listener of listeners)listener();};
  const load=()=>{
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      try{const text=await storage.getItem(EXPEDITION_KEY);const parsed=text?JSON.parse(text):null;
        if(text&&(!parsed||parsed.version!==1))throw Error('Unsupported saved record');
        snapshot={profile:normalizeProfile(parsed),ready:true,saving:false,error:null};
      }catch{snapshot={...snapshot,ready:false,error:'Saved expedition could not be loaded. Retry; your existing record has not been overwritten.'};}
      finally{loadPromise=null;emit();}
    })();return loadPromise;
  };
  const persist=()=>{
    if(!snapshot.ready)return Promise.resolve();
    const payload=JSON.stringify(snapshot.profile);pending++;snapshot={...snapshot,saving:true};emit();
    queue=queue.then(async()=>{
      try{await storage.setItem(EXPEDITION_KEY,payload);snapshot={...snapshot,error:null};}
      catch{snapshot={...snapshot,error:'Progress is in memory only. Retry saving before closing the game.'};}
      finally{pending--;snapshot={...snapshot,saving:pending>0};emit();}
    });return queue;
  };
  return {
    init:load,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener);},getSnapshot:()=>snapshot,
    checkpoint:(run:Expedition)=>{if(!snapshot.ready||run.finished||snapshot.profile.completedIds.includes(run.id)||run.mode==='ready')return Promise.resolve();
      const copy=JSON.parse(JSON.stringify(run)) as Expedition;snapshot={...snapshot,profile:{...snapshot.profile,checkpoint:copy}};return persist();},
    finish:(run:Expedition)=>{if(!snapshot.ready)return Promise.resolve();const next=bankExpedition(snapshot.profile,run);if(next===snapshot.profile)return Promise.resolve();snapshot={...snapshot,profile:next};return persist();},
    preferences:(settings:Partial<ExpeditionProfile['settings']>)=>{if(!snapshot.ready)return Promise.resolve();snapshot={...snapshot,profile:{...snapshot.profile,settings:{...snapshot.profile.settings,...settings}}};return persist();},
    retry:()=>snapshot.ready?persist():load(),
    dispose:()=>{disposed=true;listeners.clear();},
  };
}
export function isActive(mode:Mode) {return ['running','countdown','paused','upgrade'].includes(mode);}
