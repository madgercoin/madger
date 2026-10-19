/** MADGER Expedition: deterministic, renderer-independent 3D gameplay rules.
 * Distances are metres; times are seconds. No display or sound RNG enters physics.
 */
import { COMPANION_IDS, COMPANIONS, companionId, freshCompanions, clearCompanionAction, type CompanionId, type CompanionTeam } from './companions';
export const STEP = 1 / 120;
export const TRACK_LENGTH = 1080;
export const LANE_WIDTH = 2.15;
export const MAX_HP = 3;
export const ENGINE_VERSION = 1;
export type Lane = -1 | 0 | 1;
export type Mode = 'ready' | 'countdown' | 'running' | 'paused' | 'upgrade' | 'won' | 'lost';
export type Kind = 'coin' | 'gem' | 'heart' | 'shield' | 'magnet' | 'life' | 'key' | 'vault' | 'workshop' | 'burrow' | 'boulder' | 'saw' | 'roots' | 'steam' | 'gap' | 'mud' | 'drone' | 'crate' | 'snow-white' | 'gorilla-white' | 'madger-bot';
export type Upgrade = 'magnet' | 'armor' | 'fortune';
export type Route = 'main' | 'hollow' | 'grotto';
export type CourseItem = { id: number; d: number; lane: Lane; kind: Kind; phase: number; route: Route };
export type EventKind = 'coin' | 'gem' | 'hit' | 'block' | 'jump' | 'land' | 'slide' | 'burst' | 'power' | 'secret' | 'revive' | 'upgrade' | 'near' | 'zone' | 'win' | 'lose' | 'step' | 'splash' | 'hint' | 'companion-join' | 'companion-attack' | 'companion-guard' | 'companion-boost' | 'companion-leave';
export type GameEvent = { id: number; kind: EventKind; at: number; x: number; text: string; value: number; companion?: CompanionId; targetD?: number; targetX?: number };
export type Expedition = {
  version: 1; seed: number; id: string; mode: Mode; resumeMode: 'countdown' | 'running';
  tick: number; time: number; distance: number; countdown: number; lane: Lane; x: number; vx: number;
  y: number; vy: number; slide: number; slideAge: number; slideCooldown: number; jumpBuffer: number; speed: number;
  hp: number; lives: number; shields: number; shieldTime: number; magnet: number; burst: number;
  energy: number; immune: number; mud: number; score: number; coins: number; gems: number;
  combo: number; bestCombo: number; hits: number; nearMisses: number; keys: number;
  route: Route; routeStart: number; routeEnd: number; routeSide: Lane; secrets: string[];
  upgrade: Upgrade | null; used: number[]; eventId: number; lastHurt: number; lastGood: number;
  lastFoot: number; zone: number; finished: boolean; companions: CompanionTeam;
};
export const KINDS: Kind[] = ['coin','gem','heart','shield','magnet','life','key','vault','workshop','burrow','boulder','saw','roots','steam','gap','mud','drone','crate','snow-white','gorilla-white','madger-bot'];
export const HAZARDS = new Set<Kind>(['boulder','saw','roots','steam','gap','mud','drone','crate']);
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const smooth = (v: number) => { const x = clamp(v, 0, 1); return x*x*(3-2*x); };
export function randomGenerator(initial: number) {
  let state = initial >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
export function daySeed(day: string) {
  let value = 2166136261;
  for (const char of day) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}
export function freshExpedition(seed = 1, id = `expedition-${seed}`): Expedition {
  return { version: 1, seed: seed >>> 0, id, mode: 'ready', resumeMode: 'running', tick: 0, time: 0,
    distance: 0, countdown: 2.4, lane: 0, x: 0, vx: 0, y: 0, vy: 0, slide: 0, slideAge: 0, slideCooldown: 0,
    jumpBuffer: 0, speed: 9.8, hp: 3, lives: 0, shields: 0, shieldTime: 0, magnet: 0, burst: 0,
    energy: 0, immune: 0, mud: 0, score: 0, coins: 0, gems: 0, combo: 0, bestCombo: 0,
    hits: 0, nearMisses: 0, keys: 0, route: 'main', routeStart: 0, routeEnd: 0,
    routeSide: 0, secrets: [], upgrade: null, used: [], eventId: 0, lastHurt: -10,
    lastGood: -10, lastFoot: -1, zone: 0, finished: false, companions: freshCompanions() };
}
export function buildCourse(seed: number): CourseItem[] {
  const random = randomGenerator(seed), items: CourseItem[] = [];
  const side = (random() < .5 ? -1 : 1) as Lane;
  const add = (d: number, lane: Lane, kind: Kind, route: Route = 'main') => {
    items.push({ id: items.length, d, lane, kind, phase: random() * Math.PI * 2, route });
  };
  // Teach collection and movement before asking for a timed avoidance action.
  for (const d of [18,24,30,36,42,48]) add(d, 0, 'coin');
  add(64,-1,'boulder'); for(const d of [62,68,74]) add(d,0,'coin');
  add(91,0,'saw'); add(90,1,'gem'); add(113,1,'roots'); add(116,-1,'shield');
  let safe: Lane = 0;
  const families: Kind[][] = [ ['boulder','saw','roots','crate'], ['steam','mud','drone','saw'], ['gap','boulder','roots','steam','drone'] ];
  const reserved = [180,405,465,660,780,1010];
  for (let d = 142; d < 1020; d += 25) {
    if (reserved.some(spot => Math.abs(d - spot) < 22)) continue;
    safe = clamp(safe + (random() < .5 ? -1 : 1), -1, 1) as Lane;
    const zone = Math.min(2, Math.floor(d / 360)), types = families[zone];
    for (const lane of [-1,0,1] as Lane[]) {
      if (lane === safe) continue;
      if (d < 320 && random() < .35) continue;
      add(d,lane,types[Math.floor(random()*types.length)]);
    }
    for (const offset of [-5,0,5]) add(d+offset,safe,'coin');
    if (Math.floor(d/25)%6===0) add(d+10,safe,random()<.5?'heart':'magnet');
  }
  add(180, side, 'burrow');
  for(let d=198;d<=252;d+=6) add(d, (Math.floor((d-198)/18)%3-1) as Lane, 'gem','hollow');
  add(235,0,'life','hollow'); add(251,0,'magnet','hollow');
  add(405,-side as Lane,'workshop'); add(465,0,'key'); add(660,side,'vault');
  add(780,-side as Lane,'burrow');
  for(let d=798;d<=852;d+=6) add(d, (Math.floor((d-798)/18)%3-1) as Lane,'gem','grotto');
  add(826,0,'life','grotto'); add(846,0,'shield','grotto');
  add(1010,0,'vault');
  // Append IDs after the existing course so legacy recovery points retain item identity.
  add(50,0,'snow-white'); add(78,0,'crate');
  add(126,0,'gorilla-white'); add(156,0,'madger-bot');
  add(225,0,'madger-bot','hollow');
  add(390,0,'snow-white'); add(646,0,'gorilla-white'); add(930,0,'madger-bot');
  return items.sort((a,b)=>a.d-b.d || a.id-b.id);
}
export function zoneAt(distance: number) { return Math.min(2, Math.floor(distance / 360)); }
export const ZONES = [
  { name: 'THE OVERGROWN BURROW', subtitle: 'Lanterns, roots and hidden hollows', color: '#ffc766' },
  { name: 'THE FORGOTTEN WORKS', subtitle: 'Pressure, machinery and buried treasure', color: '#74e5df' },
  { name: 'THE CRYSTAL GROTTO', subtitle: 'Broken bridges and valuable discoveries', color: '#c6a5ff' },
] as const;
/** The same motion is used for visible moving traps and their collision centres. */
export function hazardPose(item: CourseItem, time: number, distance: number) {
  let x = item.lane * LANE_WIDTH, y = 0, active = true;
  if (item.kind === 'drone') { x += Math.sin(time * 2.2 + item.phase) * .36; y = .72 + Math.sin(time*3+item.phase)*.15; }
  if (item.kind === 'saw') x += Math.sin(time * 1.8 + item.phase) * .28;
  if (item.kind === 'steam') active = ((time + item.phase) % 3.2) > 1.05;
  if (item.kind === 'boulder') y = .07 * Math.abs(Math.sin(time * 7 + item.phase));
  return { x, y, active, ahead: item.d - distance };
}
/** Branch paths visibly diverge and rejoin. Coordinates are continuous at both ends. */
export function branchOffset(distance: number, start: number, end: number, side: number) {
  const entry = smooth((distance-start)/18), exit = smooth((end-distance)/20);
  return side * (LANE_WIDTH + (8.5-LANE_WIDTH)*entry) * exit;
}
export function routeOffset(s: Expedition, distance = s.distance) {
  return s.route === 'main' ? 0 : branchOffset(distance,s.routeStart,s.routeEnd,s.routeSide);
}
function event(s: Expedition, events: GameEvent[], kind: EventKind, text = '', value = 0) {
  events.push({ id: s.eventId++, kind, at: s.time, x: s.x + routeOffset(s), text, value });
}
export function begin(s: Expedition) { if (s.mode==='ready') s.mode='countdown'; }
export function pause(s: Expedition) {
  if(s.mode==='countdown'||s.mode==='running') { s.resumeMode=s.mode; s.mode='paused'; }
}
export function resume(s: Expedition) { if(s.mode==='paused') s.mode=s.resumeMode; }
export function steer(s: Expedition, direction: -1|1) {
  if(s.mode==='running'||s.mode==='countdown') s.lane=clamp(s.lane+direction,-1,1) as Lane;
}
export function jump(s: Expedition, events: GameEvent[]) {
  if(s.mode!=='running') return;
  if(s.y <= .025 && s.slide <= .01) { s.vy=8.7; s.y=.025; s.jumpBuffer=0; event(s,events,'jump'); }
  else if(s.y > .025) s.jumpBuffer=.12;
}
export function slide(s: Expedition, events: GameEvent[]) {
  if(s.mode!=='running' || s.slideCooldown>0) return;
  if(s.y>.18) { s.vy=Math.min(s.vy,-11); return; }
  s.slide=.83; s.slideAge=0; s.slideCooldown=1.02; event(s,events,'slide');
}
export function burst(s: Expedition, events: GameEvent[]) {
  if(s.mode!=='running' || s.energy<100 || s.burst>0) return;
  s.energy=0; s.burst=s.companions.bot.timeLeft>0?3.6:2.4; s.lastGood=s.time; event(s,events,'burst','MADGER BURST');
}
export function chooseUpgrade(s: Expedition, choice: Upgrade, events: GameEvent[]) {
  if(s.mode!=='upgrade' || !['magnet','armor','fortune'].includes(choice)) return;
  s.upgrade=choice; s.mode='running'; s.immune=Math.max(s.immune,2);
  if(choice==='magnet') s.magnet=18;
  if(choice==='armor') { s.shields=2; s.shieldTime=22; }
  s.lastGood=s.time; event(s,events,'upgrade',choice==='armor'?'REINFORCED SHIELD':choice==='magnet'?'LONG-RANGE MAGNET':'TREASURE FINDER');
}
function allyEvent(s: Expedition, events: GameEvent[], kind: EventKind, id: CompanionId, text: string, value=0, target?: CourseItem) {
  event(s,events,kind,text,value);
  const e=events[events.length-1];e.companion=id;
  if(target){e.targetD=target.d;e.targetX=hazardPose(target,s.time,s.distance).x+routeOffset(s,target.d);}
}
export function recruitCompanion(s: Expedition, id: CompanionId, events: GameEvent[]) {
  if(s.mode!=='running')return;
  const c=s.companions[id],meta=COMPANIONS[id],refresh=c.timeLeft>0;
  if(!refresh){clearCompanionAction(c);c.followX=clamp(s.x+meta.offset,-2.8,2.8);c.followVx=0;c.joinedAt=s.time;c.cooldown=id==='gorilla'?0:.55;}
  c.timeLeft=meta.duration;c.arrivals++;
  if(id==='gorilla')c.charges=3;
  if(id==='bot')s.energy=clamp(s.energy+45,0,100);
  s.lastGood=s.time;
  allyEvent(s,events,'companion-join',id,meta.name.toUpperCase()+(refresh?' · SUPPORT REFRESHED':id==='snow'?' · ATTACK SUPPORT':id==='gorilla'?' · 3 GUARD SAVES':' · +45 ENERGY / TECH BOOST'));
}
function stepCompanions(s: Expedition, course: CourseItem[], used: Set<number>, events: GameEvent[]) {
  for(const id of COMPANION_IDS){
    const c=s.companions[id],meta=COMPANIONS[id];if(c.timeLeft<=0)continue;
    c.timeLeft=Math.max(0,c.timeLeft-STEP);c.cooldown=Math.max(0,c.cooldown-STEP);
    c.followVx+=(64*(clamp(s.x+meta.offset,-2.8,2.8)-c.followX)-16*c.followVx)*STEP;c.followX+=c.followVx*STEP;
    if(c.timeLeft===0){clearCompanionAction(c);c.charges=0;allyEvent(s,events,'companion-leave',id,meta.name.toUpperCase()+' · SEE YOU AHEAD');continue;}
    if(id==='bot')s.energy=clamp(s.energy+2.5*STEP,0,100);
    if(c.actionRemaining>0){
      c.actionRemaining=Math.max(0,c.actionRemaining-STEP);
      if(id!=='gorilla'){
        const target=course.find(i=>i.id===c.targetId);
        const permitted=id==='snow'?['drone','crate']:['drone','saw','steam'];
        if(!target||target.route!==s.route||target.d!==c.targetD||!permitted.includes(target.kind)){clearCompanionAction(c);continue;}
        if(!c.resolved)c.targetX=hazardPose(target,s.time,s.distance).x;
        // Resolve once at visible contact, then animate a return; never award on animation alone.
        if(!c.resolved&&meta.actionDuration-c.actionRemaining>=meta.impactAt){
          c.resolved=true;
          if(!used.has(target.id)&&target.d>=s.distance-.6){
            used.add(target.id);c.actions++;s.lastGood=s.time;
            if(id==='snow'){s.score+=125;allyEvent(s,events,'companion-attack',id,'SNOW WHITE · THREAT CLEARED +125',125,target);}
            else{s.score+=80;allyEvent(s,events,'companion-boost',id,'MADGER BOT · TRAP DISABLED +80',80,target);}
          }
        }
      }
      if(c.actionRemaining===0)clearCompanionAction(c);
      continue;
    }
    if(id==='gorilla'||c.cooldown>0||s.time-c.joinedAt<.55)continue;
    const targets=id==='snow'?['drone','crate']:['drone','saw','steam'];
    const teammate=s.companions[id==='snow'?'bot':'snow'];
    const reserved=teammate.actionRemaining>0&&!teammate.resolved?teammate.targetId:null;
    const target=course.find(i=>i.route===s.route&&!used.has(i.id)&&i.id!==reserved&&targets.includes(i.kind)&&i.d-s.distance>=9&&i.d-s.distance<=21&&Math.abs(hazardPose(i,s.time,s.distance).x-s.x)<1.35);
    if(target){c.targetId=target.id;c.targetD=target.d;c.targetX=hazardPose(target,s.time,s.distance).x;c.targetRoute=target.route;c.actionRemaining=meta.actionDuration;c.lastActionAt=s.time;c.resolved=false;c.cooldown=meta.cooldown;}
  }
}
function reward(s: Expedition, item: CourseItem, events: GameEvent[]) {
  const ally=companionId(item.kind);if(ally){recruitCompanion(s,ally,events);return;}
  const base = item.kind === 'coin' ? 50 : item.kind === 'gem' ? 175 : 150;
  const multiplier = 1+Math.min(4,Math.floor(s.combo/8));
  const points = base * multiplier * (s.burst>0?2:1) * (item.kind==='gem' && s.upgrade==='fortune'?2:1);
  if(item.kind==='coin'||item.kind==='gem') {
    s.combo++; s.bestCombo=Math.max(s.bestCombo,s.combo); s.score+=points; s.energy=clamp(s.energy+7,0,100);
    if(item.kind==='coin') s.coins++; else s.gems++;
    s.lastGood=s.time; event(s,events,item.kind,item.kind==='gem'?`RELIC +${points}`:'',points); return;
  }
  if(item.kind==='heart') { s.hp=clamp(s.hp+1,0,3); s.score+=150; event(s,events,'power','GRIT RESTORED',150); }
  if(item.kind==='shield') { s.shields=s.upgrade==='armor'?2:1; s.shieldTime=18; event(s,events,'power','SHIELD UP'); }
  if(item.kind==='magnet') { s.magnet=s.upgrade==='magnet'?18:10; event(s,events,'power','MAGNET ACTIVE'); }
  if(item.kind==='life') { if(s.lives<2) {s.lives++;event(s,events,'power','EXTRA LIFE');} else {s.score+=750;event(s,events,'power','LIFE RESERVE FULL +750',750);} }
  if(item.kind==='key') { s.keys++;event(s,events,'secret','VAULT KEY FOUND'); }
  if(item.kind==='vault') {
    if(s.keys>0 || item.d>1000) {
      if(s.keys>0) s.keys--; s.score+=1800; s.gems+=3; s.hp=clamp(s.hp+1,0,3);
      if(item.d<1000) s.lives=clamp(s.lives+1,0,2);
      const key=item.d>1000?'finish-vault':'sealed-vault'; if(!s.secrets.includes(key))s.secrets.push(key);
      event(s,events,'secret',item.d>1000?'TREASURE SECURED +1800':'VAULT OPEN! +1800 · EXTRA LIFE',1800);
    } else event(s,events,'hint','A KEY OPENS THIS VAULT');
  }
  s.lastGood=s.time;
}
function hurt(s: Expedition, item: CourseItem, events: GameEvent[]) {
  if(s.immune>0) {event(s,events,'block','RECOVERING');return;}
  if(s.burst>0 && item.kind!=='gap') { s.score+=125; event(s,events,'block','SMASH +125',125);return; }
  const guard=s.companions.gorilla;
  if(guard.timeLeft>0&&guard.charges>0&&guard.cooldown===0){
    guard.charges--;guard.actions++;guard.cooldown=COMPANIONS.gorilla.cooldown;guard.lastActionAt=s.time;guard.actionRemaining=COMPANIONS.gorilla.actionDuration;
    guard.targetId=item.id;guard.targetD=item.d;guard.targetX=item.lane*LANE_WIDTH;guard.targetRoute=s.route;guard.resolved=true;
    s.immune=Math.max(s.immune,.8);s.mud=0;s.lastGood=s.time;
    if(item.kind==='gap'){s.y=Math.max(s.y,.35);s.vy=6;}
    allyEvent(s,events,'companion-guard','gorilla',item.kind==='gap'?'GORILLA WHITE · LEDGE RESCUE':'GORILLA WHITE · BODYGUARD SAVE',0,item);return;
  }
  if(s.shields>0 && item.kind!=='gap') {s.shields--;s.immune=.9;event(s,events,'block','SHIELD BLOCK');return;}
  if(item.kind==='mud') {s.mud=2.5;s.combo=0;event(s,events,'splash','MUD! JUMP TO AVOID');return;}
  s.hp--;s.hits++;s.combo=0;s.immune=1.7;s.lastHurt=s.time;event(s,events,'hit',item.kind==='gap'?'LEDGE RECOVERY · −1 GRIT':'OUCH! −1 GRIT',-1);
  if(item.kind==='gap') {s.vy=6;s.y=.35;}
  if(s.hp<=0) {
    if(s.lives>0) {s.lives--;s.hp=3;s.immune=3;s.shields=Math.max(1,s.shields);s.shieldTime=3;s.lastGood=s.time;event(s,events,'revive','EXTRA LIFE! BACK IN THE RUN');}
    else {s.mode='lost';s.finished=true;event(s,events,'lose','DUST OFF. DIG AGAIN.');}
  }
}
/** Mutates only this run. fixedStep is called at 120 Hz; rendering is independent. */
export function fixedStep(s: Expedition, course: CourseItem[], events: GameEvent[]) {
  if(s.mode!=='countdown' && s.mode!=='running') return;
  s.tick++;
  // Collision uses the damped physical x, never an instantly changed lane index.
  const target=s.lane*LANE_WIDTH, acceleration=95*(target-s.x)-19*s.vx;
  s.vx+=acceleration*STEP; s.x=clamp(s.x+s.vx*STEP,-LANE_WIDTH-.04,LANE_WIDTH+.04);
  if(s.mode==='countdown') {s.countdown=Math.max(0,s.countdown-STEP);if(s.countdown<=1e-6){s.mode='running';event(s,events,'hint','GO! FOLLOW THE GOLD');}return;}
  s.time+=STEP;
  if(s.slide>0)s.slideAge+=STEP;
  const oldDistance=s.distance, oldY=s.y;
  for(const key of ['slide','slideCooldown','magnet','burst','immune','mud','shieldTime','jumpBuffer'] as const)s[key]=Math.max(0,s[key]-STEP);
  if(s.shieldTime===0)s.shields=0;
  if(s.y>0 || s.vy>0) {s.vy-=24*STEP;s.y=Math.max(0,s.y+s.vy*STEP);if(s.y===0){s.vy=0;if(oldY>0)event(s,events,'land');if(s.jumpBuffer>0)jump(s,events);}}
  const base=9.8+Math.min(3.5,s.distance/300);
  const targetSpeed=base*(s.mud>0?.65:1)*(s.burst>0?1.10:1);
  s.speed+=(targetSpeed-s.speed)*Math.min(1,STEP*5);
  s.distance=Math.min(TRACK_LENGTH,s.distance+s.speed*STEP);
  const zone=zoneAt(s.distance);if(zone!==s.zone){s.zone=zone;event(s,events,'zone',ZONES[zone].name);}
  if(s.route!=='main' && s.distance>=s.routeEnd){s.route='main';s.immune=Math.max(s.immune,2);event(s,events,'hint','SHORTCUT COMPLETE · SAFE REJOIN');}
  const used=new Set(s.used);
  stepCompanions(s,course,used,events);
  for(const item of course) {
    if(item.d > s.distance+5)break;
    if(item.d < oldDistance-4 || used.has(item.id) || item.route!==s.route)continue;
    const pose=hazardPose(item,s.time,s.distance), halfLength=item.kind==='gap'?1.55:item.kind==='mud'?1.25:.62;
    if(item.d < s.distance-halfLength && item.d >= oldDistance-halfLength) {
      if(HAZARDS.has(item.kind) && item.kind!=='mud' && Math.abs(pose.x-s.x)>1.05 && Math.abs(pose.x-s.x)<1.65){s.score+=75;s.nearMisses++;event(s,events,'near','CLOSE CALL +75',75);}
      used.add(item.id);continue;
    }
    const withinLongitudinal=s.distance+halfLength>=item.d && oldDistance-halfLength<=item.d;
    if(!withinLongitudinal)continue;
    const dx=Math.abs(pose.x-s.x), isHazard=HAZARDS.has(item.kind);
    const radius=isHazard?(item.kind==='drone'?.72:.82):.83;
    const attracted=(item.kind==='coin'||item.kind==='gem')&&(s.magnet>0||s.companions.bot.timeLeft>0);
    if(dx>radius&&!attracted)continue;
    if(item.kind==='burrow') {
      if(s.slide>0 && s.y<.25 && s.route==='main') {
        s.route=item.d<500?'hollow':'grotto';s.routeStart=item.d;s.routeEnd=item.d+90;s.routeSide=item.lane;
        s.x-=item.lane*LANE_WIDTH;for(const id of COMPANION_IDS){s.companions[id].followX-=item.lane*LANE_WIDTH;clearCompanionAction(s.companions[id]);}s.lane=0;s.vx=0;s.immune=Math.max(s.immune,1.4);s.score+=500;
        s.slide=Math.max(s.slide,1.10);s.slideCooldown=Math.max(s.slideCooldown,1.2);
        if(!s.secrets.includes(s.route))s.secrets.push(s.route);
        s.lastGood=s.time;event(s,events,'secret','HIDDEN ROUTE! +500',500);used.add(item.id);
      }
      continue;
    }
    if(item.kind==='workshop') {
      if(s.y>.55){s.mode='upgrade';s.secrets.push('workshop');s.score+=500;used.add(item.id);event(s,events,'secret','HIDDEN WORKSHOP · CHOOSE AN UPGRADE',500);break;}
      used.add(item.id);hurt(s,{...item,kind:'crate'},events);if(s.finished)break;continue;
    }
    if(isHazard) {
      const avoided=(item.kind==='roots'?s.slide>0&&s.y<.2:item.kind==='steam'?!pose.active||s.y>1.05:item.kind==='drone'?s.slide>0||s.y>1.20:s.y>(item.kind==='boulder'?1.08:.66));
      if(!avoided){used.add(item.id);hurt(s,item,events);if(s.finished)break;}
    }else {used.add(item.id);reward(s,item,events);}
  }
  s.used=[...used];
  const foot=Math.floor(s.distance/1.9);
  if(foot!==s.lastFoot && s.y<.02 && s.slide<=0){s.lastFoot=foot;event(s,events,'step');}
  if(s.mode==='running' && s.distance>=TRACK_LENGTH){s.mode='won';s.finished=true;s.score+=2500;event(s,events,'win','EXPEDITION COMPLETE +2500',2500);}
}
export function createClock() {return {accumulator:0};}
/** Long foreground stalls pause rather than inflict damage for unseen frames. */
export function advance(s: Expedition, course: CourseItem[], seconds: number, clock: {accumulator:number}, events: GameEvent[]) {
  if(!Number.isFinite(seconds)||seconds<0||seconds>.4){pause(s);clock.accumulator=0;return;}
  if(s.mode!=='running'&&s.mode!=='countdown'){clock.accumulator=0;return;}
  clock.accumulator+=seconds;
  while(clock.accumulator>=STEP-1e-9){fixedStep(s,course,events);clock.accumulator=Math.max(0,clock.accumulator-STEP);if(s.mode!=='running'&&s.mode!=='countdown'){clock.accumulator=0;break;}}
}
export function nearbyHint(s: Expedition, course: CourseItem[]) {
  if(s.route!=='main')return 'Hidden route · gems, upgrades and life reserves';
  const item=course.find(i=>i.route==='main'&&i.d>s.distance+6&&i.d<s.distance+45&&['burrow','workshop','vault','key'].includes(i.kind));
  if(!item){const ally=course.find(i=>i.route===s.route&&i.d>s.distance+3&&i.d<s.distance+40&&companionId(i.kind)&&!s.used.includes(i.id));if(!ally)return '';const id=companionId(ally.kind)!;return COMPANIONS[id].name.toUpperCase()+' · '+COMPANIONS[id].role+' · '+['LEFT','CENTRE','RIGHT'][ally.lane+1];}
  const lane=['LEFT','CENTRE','RIGHT'][item.lane+1];
  if(item.kind==='burrow')return `CLAW MARKS ${lane} · SLIDE INTO THE HOLLOW`;
  if(item.kind==='workshop')return `WORKSHOP ${lane} · JUMP THROUGH THE ARCH`;
  if(item.kind==='key')return `VAULT KEY ${lane} · KEEP IT FOR THE GOLD DOOR`;
  return `${item.d>1000?'TREASURE':'SEALED VAULT'} ${lane}${s.keys>0?' · KEY READY':''}`;
}
