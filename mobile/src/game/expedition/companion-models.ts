import { COMPANION_IDS, COMPANIONS, actionProgress, arrivalWeight, pawCycle, type CompanionId } from './companions';
import { clamp, routeOffset, smooth, type Expedition } from './core';
import { color, type ExpeditionRenderer, type Color, type Shape } from './gl';
import { transform, multiply, segment, type Mat4, type Vec3 } from './math';
const P = { ivory:color('#F0E9DA'),frost:color('#FFFCF0'),cream:color('#D9CEB7'),rose:color('#BD758D'),roseLight:color('#E9ABC0'),nose:color('#23272A'),eye:color('#2D2520'),white:color('#F4F5F3',-4),silver:color('#B5C1C7',-4),skin:color('#A68D72'),skinLight:color('#C6AC8B'),blue:color('#72BCE7',.1),dark:color('#243342'),metal:color('#9FAAB1'),cyan:color('#75DEEF',.9),orange:color('#FFB35D',.65),black:color('#101821'),shadow:color('#000000',-3) };
type Pose = { x:number;y:number;z:number;yaw?:number;scale?:number;time:number;distance:number;running:boolean;action?:number;air?:number;calm?:boolean };
export const COMPANION_ART_CONTRACT = {
 snow: { body:'lean, smooth short coat',muzzle:'long, soft forehead',tail:'cream frosted tip',collar:'muted rose pink',tag:'matching diamond SW charm' },
 gorilla: { coat:'white/silver',eyes:'blue',face:'warm tan',jaw:'clean without goatee',motion:'articulated knuckle run and bodyguard brace' },
 bot: { silhouette:'mechanical Madger',face:'angular visor and recessed speaker grille',armor:'black, silver and blue',lights:'cyan with orange accents',signatureFangs:0,clawsPerPaw:5 },
} as const;
function primitives(r:ExpeditionRenderer){
 const shape=(kind:Shape,c:Color,x:number,y:number,z:number,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,parent?:Mat4)=>r.shape(kind,c,x,y,z,sx,sy,sz,rx,ry,rz,parent);
 const orb=(c:Color,p:Vec3,x:number,y=x,z=x,parent?:Mat4)=>shape('sphere',c,...p,x,y,z,0,0,0,parent);
 const bone=(c:Color,a:Vec3,b:Vec3,radius:number,parent?:Mat4)=>r.add('cylinder',parent?multiply(parent,segment(a,b,radius)):segment(a,b,radius),c);
 return {shape,orb,bone};
}
/** Procedural rigs share travelled-distance contact phases; there are no billboard companions. */
export function drawCompanion(r:ExpeditionRenderer,id:CompanionId,p:Pose){
 const {shape,orb,bone}=primitives(r),t=p.time,a=p.action??0,air=p.air??0,scale=p.scale??1;
 const root=transform(p.x,p.y,p.z,scale,scale,scale,0,p.yaw??0,0);
 const blink=(t%4.7)<.15?.13:1;
 if(id==='snow'){
  const bounce=p.running?Math.abs(Math.sin(p.distance/3.4*Math.PI*2))*.055:Math.sin(t*2.8)*.018;
  const torso=multiply(root,transform(0,bounce,0,1,1,1,-air*.13,0,Math.sin(t*1.8)*.012));
  orb(P.ivory,[0,.71,.10],.265,.305,.58,torso);orb(P.cream,[0,.68,.42],.26,.27,.28,torso);
  orb(P.ivory,[0,.85,-.38],.185,.29,.245,torso);
  for(const front of [true,false])for(const side of [-1,1]){
   const z=front?-.33:.45,phase=(front?0:.22)+(side>0?.50:0),gait=pawCycle(p.distance,phase,p.running);
   const hip:Vec3=[side*.205,.70+bounce,z],foot:Vec3=[side*.225,gait.y+air*.22,z+gait.z*(1-air)];
   const middle:Vec3=[side*.22,(hip[1]+foot[1])*.52+.015,(hip[2]+foot[2])*.5+(front?-.12:.13)];
   bone(P.ivory,hip,middle,.087,root);orb(P.ivory,middle,.09,.10,.095,root);bone(P.ivory,middle,foot,.055,root);
   orb(P.frost,[foot[0],foot[1]-.015,foot[2]-.055],.086,.066,.14,root);
   for(let claw=0;claw<4;claw++)shape('cone',P.cream,foot[0]+(claw-1.5)*.032,foot[1]-.01,foot[2]-.175,.012,.05,.012,-Math.PI/2,0,0,root);
  }
  const head=multiply(torso,transform(0,1.04,-.61,1,1,1,Math.sin(t*2.3)*.025-air*.08,Math.sin(t*.85)*.055,0));
  orb(P.ivory,[0,0,0],.228,.23,.25,head);orb(P.frost,[0,-.045,-.245],.145,.108,.29,head);
  orb(P.nose,[0,-.018,-.501],.095,.060,.060,head);orb(P.cream,[0,-.139,-.255],.135,.044,.26,head);
  const pant=.012+Math.sin(t*7)*.005;
  bone(P.roseLight,[0,-.18,-.39],[.012*Math.sin(t*4),-.22-pant,-.57],.047,head);
  orb(P.roseLight,[.012*Math.sin(t*4),-.235-pant,-.59],.049,.03,.052,head);
  for(const side of [-1,1]){
   orb(P.nose,[side*.175,.045,-.145],.047,.056*blink,.04,head);
   orb(P.eye,[side*.187,.05,-.178],.027,.035*blink,.015,head);
   orb(P.frost,[side*.183-.009,.06,-.19],.009,.01,.006,head);
   const ear=multiply(head,transform(side*.177,.175,.005,1,1,1,.05,side*.12,side*(.18+Math.sin(t*1.4+side)*.03)));
   shape('cone',P.ivory,0,.115,0,.10,.31,.075,0,0,side*.13,ear);
   shape('cone',P.cream,0,.112,-.052,.058,.205,.019,0,0,side*.13,ear);
  }
  shape('ring',P.rose,0,.887,-.44,.196,.67,.196,Math.PI/2-.22,0,0,torso);
  const tag=multiply(torso,transform(.025*Math.sin(t*3),.59,-.541,1,1,1,0,Math.sin(t*3)*.08,Math.PI/4));
  shape('box',P.rose,0,0,0,.14,.14,.036,0,0,0,tag);
  // Tiny raised SW strokes, matching the rose collar rather than a generic metal disc.
  const letters=multiply(torso,transform(.025*Math.sin(t*3),.59,-.565));
  const strokes: [Vec3,Vec3][]=[ [[-.055,.042,0],[-.019,.042,0]],[[-.055,.042,0],[-.055,.007,0]],[[-.055,.007,0],[-.019,.007,0]],[[-.019,.007,0],[-.019,-.029,0]],[[-.019,-.029,0],[-.055,-.029,0]],[[.008,.04,0],[.019,-.03,0]],[[.019,-.03,0],[.035,.008,0]],[[.035,.008,0],[.051,-.03,0]],[[.051,-.03,0],[.065,.04,0]] ];
  for(const [u,v]of strokes)bone(P.roseLight,u,v,.006,letters);
  let previous:Vec3=[0,.72,.61];
  for(let i=1;i<=8;i++){const f=i/8,next:Vec3=[Math.sin(t*3.3-f*1.8)*f*.23,.72+Math.sin(f*Math.PI*.66)*.51,.61+f*.74];const c=f>.52?P.frost:P.ivory,rad=.089*(1-f*.68);bone(c,previous,next,rad,torso);orb(c,next,rad,rad,rad,torso);previous=next;}
  shape('shadow',P.shadow,0,.018,.03,.40,1,.83,0,0,0,root);
 }else if(id==='gorilla'){
  const brace=a>0?Math.sin(Math.min(1,a/.82)*Math.PI):0;
  const bob=p.running?Math.sin(p.distance/4*Math.PI*4)*.035:Math.sin(t*1.8)*.025;
  const body=multiply(root,transform(0,bob-brace*.12,0,1,1,1,-.10-brace*.14,0,Math.sin(t*1.2)*.02));
  orb(P.silver,[0,1.00,.15],.50,.67,.43,body);orb(P.white,[0,1.44,-.015],.67,.44,.45,body);
  orb(P.silver,[0,1.37,-.386],.42,.36,.081,body);
  for(const side of [-1,1]){
   const footCycle=pawCycle(p.distance,(side>0?.5:0)+.22,p.running);
   const hip:Vec3=[side*.29,.83+bob,.24],foot:Vec3=[side*.32,.13+footCycle.y-.10,.31+footCycle.z];
   const knee:Vec3=[side*.35,.44+bob+(footCycle.y-.10)*.55,.06+footCycle.z*.45];
   bone(P.white,hip,knee,.19,root);orb(P.white,knee,.20,.21,.19,root);bone(P.silver,knee,foot,.13,root);orb(P.skin,[foot[0],foot[1]-.025,foot[2]-.10],.18,.10,.25,root);
   for(let j=0;j<5;j++)orb(P.skin,[foot[0]+(j-2)*.055,foot[1]-.024,foot[2]-.31],.035,.047,.060,root);
   const cycle=pawCycle(p.distance,side>0?0:.5,p.running);
   const shoulder:Vec3=[side*.61,1.44+bob,0],elbow:Vec3=[side*(.81-brace*.17),.83+bob+brace*.42,-.08+cycle.z*.38],fist:Vec3=[side*(.76-brace*.48),.09+cycle.y+brace*1.07,-.28+cycle.z-brace*.55];
   bone(P.white,shoulder,elbow,.26,root);orb(P.white,elbow,.27,.28,.25,root);bone(P.silver,elbow,fist,.20,root);orb(P.skin,fist,.24,.19,.23,root);
   for(let j=0;j<4;j++)orb(P.skinLight,[fist[0]+(j-1.5)*.087,fist[1]-.08,fist[2]-.15],.052,.083,.075,root);
   orb(P.skin,[fist[0]-side*.19,fist[1]+.015,fist[2]-.08],.075,.11,.085,root);
  }
  const head=multiply(body,transform(0,1.91,-.08,1,1,1,Math.sin(t*1.7)*.018,Math.sin(t*.6)*.055-brace*.12,0));
  orb(P.white,[0,0,.055],.41,.42,.34,head);orb(P.skin,[0,-.038,-.248],.305,.30,.125,head);
  orb(P.skin,[0,-.207,-.275],.27,.14,.12,head);orb(P.nose,[0,-.075,-.379],.113,.061,.051,head);
  bone(P.nose,[-.14,-.22,-.383],[.14,-.22,-.383],.013,head);
  for(const side of [-1,1]){
   orb(P.skin,[side*.376,-.02,.015],.099,.13,.062,head);
   orb(P.nose,[side*.139,.075,-.324],.097,.067,.045,head);
   orb(P.blue,[side*.142,.077,-.358],.050,.042*blink,.019,head);orb(P.black,[side*.141,.077,-.375],.022,.033*blink,.01,head);
   orb(P.frost,[side*.135-.01,.091,-.386],.009,.009,.006,head);
   bone(P.silver,[side*.07,.161,-.327],[side*.26,.154,-.25],.069,head);
  }
  shape('shadow',P.shadow,0,.017,0,.84,1,.74,0,0,0,root);
 }else{
  const hover=Math.sin(t*3)*.055+Math.sin(t*1.1)*.025,hack=a>0?Math.sin(Math.min(a/.7,1)*Math.PI):0;
  const body=multiply(root,transform(0,hover,0,1,1,1,Math.sin(t*1.7)*.025,Math.sin(t*.75)*.055,Math.sin(t*1.5)*.035));
  shape('box',P.dark,0,.53,0,.52,.66,.37,.06,0,0,body);orb(P.metal,[0,.83,0],.31,.14,.22,body);
  bone(P.cyan,[-.18,.76,-.202],[0,.50,-.212],.025,body);bone(P.cyan,[0,.50,-.212],[.18,.76,-.202],.025,body);
  orb(P.orange,[0,.41,-.205],.053,.053,.025,body);
  for(const side of [-1,1]){
   const shoulder:Vec3=[side*.31,.75,0],elbow:Vec3=[side*(.43+hack*.08),.49+hack*.14,-.10-hack*.19],hand:Vec3=[side*(.37+hack*.17),.34+hack*.31,-.26-hack*.30];
   bone(P.metal,shoulder,elbow,.095,body);orb(P.dark,elbow,.097,.097,.097,body);bone(P.metal,elbow,hand,.069,body);
   orb(P.dark,hand,.10,.12,.11,body);orb(P.cyan,[hand[0],hand[1],hand[2]-.093],.055,.055,.032,body);
   for(let j=0;j<5;j++)shape('cone',P.metal,hand[0]+(j-2)*.031,hand[1]-.075,hand[2]-.095,.012,.09,.015,-Math.PI/2,0,0,body);
   const knee:Vec3=[side*.16,.16,.04],boot:Vec3=[side*.18,.0,-.08];bone(P.metal,[side*.16,.35,.03],knee,.095,body);bone(P.dark,knee,boot,.08,body);orb(P.metal,boot,.12,.10,.17,body);
   shape('cone',P.cyan,side*.18,-.17,.00,.061,.22+Math.sin(t*9+side)*.025,.061,Math.PI,0,0,body);
  }
  const head=multiply(body,transform(0,1.08,-.035,1,1,1,Math.sin(t*1.4)*.035,Math.sin(t*.9)*.12+hack*.15,0));
  shape('box',P.dark,0,0,0,.68,.47,.46,0,0,0,head);
  shape('box',P.metal,0,.19,-.005,.62,.07,.43,0,0,0,head);
  shape('box',P.metal,0,.10,-.042,.13,.28,.45,0,0,0,head);
  shape('box',P.black,0,.005,-.251,.59,.17,.035,0,0,0,head);
  for(const side of [-1,1]){
   shape('box',P.metal,side*.352,.07,.005,.06,.205,.20,0,0,0,head);
   shape('box',P.orange,side*.384,.07,-.054,.019,.092,.04,0,0,0,head);
   shape('box',P.cyan,side*.149,.02,-.273,.19,.035+.022*blink,.016,0,0,side*.035,head);
   shape('box',P.metal,side*.225,-.132,-.236,.12,.13,.043,0,0,0,head);
  }
  shape('box',P.metal,0,-.145,-.237,.27,.098,.043,0,0,0,head);
  shape('box',P.black,0,-.145,-.263,.22,.065,.017,0,0,0,head);
  for(let row=0;row<3;row++)shape('box',P.metal,0,-.164+row*.020,-.274,.175,.007,.012,0,0,0,head);
  for(let i=0;i<5;i++)shape('box',i%2?P.metal:P.dark,Math.sin(t*2-i*.5)*i*.016,.30+i*.028,.20+i*.13,.15-i*.018,.13,.17,0,Math.sin(t*2-i*.5)*.10,0,body);
 }
}
/** Companions enter, follow, act and leave in course coordinates, including secret branches. */
export function drawTeam(r:ExpeditionRenderer,s:Expedition,time:number,calm:boolean,curve:(d:number)=>number,floor:(d:number)=>number){
 const {shape,bone}=primitives(r);
 if(s.mode==='ready'){
  if(s.board==='overgrown')return;
  drawCompanion(r,'snow',{x:-1.22,y:floor(0),z:-.30,yaw:Math.PI-.3,scale:.86,time,distance:0,running:false,calm});
  drawCompanion(r,'gorilla',{x:1.40,y:floor(0),z:-1.13,yaw:Math.PI+.15,scale:.80,time,distance:0,running:false,calm});
  drawCompanion(r,'bot',{x:-.83,y:2.08,z:-1.37,yaw:Math.PI-.12,scale:.78,time,distance:0,running:false,calm});return;
 }
 for(const id of COMPANION_IDS){
  const c=s.companions[id];if(c.timeLeft<=0)continue;
  const arrival=arrivalWeight(c,s.time),exit=smooth(c.timeLeft/.65),offset=routeOffset(s);
  const away=(1-arrival)+(1-exit),a=actionProgress(id,c);
  let x=offset+c.followX+Math.sign(COMPANIONS[id].offset)*away*2.6,z=id==='gorilla'?-3.2:id==='snow'?-1.9:-2.3;
  let y=floor(s.distance)+(id==='bot'?2.25:0),air=0;
  if(id==='snow'&&c.actionRemaining>0&&c.targetRoute===s.route){
   const contact=COMPANIONS.snow.impactAt/COMPANIONS.snow.actionDuration;
   const blend=a<contact?smooth(a/contact):1-smooth((a-contact)/(1-contact));
   const tx=c.targetX+routeOffset(s,c.targetD)+curve(c.targetD)-curve(s.distance),tz=s.distance-c.targetD;
   x+=(tx-x)*blend;z+=(tz-z)*blend;air=a<contact?Math.sin(a/contact*Math.PI):Math.sin((a-contact)/(1-contact)*Math.PI)*.7;
   y+=Math.max(0,air)*1.1;
  }
  if(id==='gorilla'&&c.actionRemaining>0){const brace=Math.sin(Math.min(a/.82,1)*Math.PI);x+=(offset+s.x+.50-x)*brace;z+=(-.8-z)*brace;}
  if(id==='bot')y+=away*2.0;
  const running=['running','paused','upgrade'].includes(s.mode)&&s.distance>0;
  drawCompanion(r,id,{x,y,z,yaw:clamp(-c.followVx*.035,-.25,.25),scale:id==='gorilla'?.84:id==='bot'?.79:.91,time,distance:s.distance,running,action:a,air,calm});
  if(id==='gorilla'&&c.actionRemaining>0){const radius=.7+.45*Math.sin(Math.PI*a);shape('ring',color('#E0F0EC',.5),offset+s.x,floor(s.distance)+1.05+s.y,-.60,radius,1,radius,Math.PI/2,0,a);}
  if(id==='bot'){
   if(!calm)shape('ring',color('#73DFEE',.20),offset+s.x,floor(s.distance)+.08,0,1.15+.06*Math.sin(time*3),1,1.15,0,time*.4,0);
   if(c.actionRemaining>0&&c.targetRoute===s.route&&a<.75){
    const target:Vec3=[c.targetX+routeOffset(s,c.targetD)+curve(c.targetD)-curve(s.distance),floor(c.targetD)+.75,s.distance-c.targetD];
    const start:Vec3=[x,y+.45,z-.25];let previous=start;
    for(let i=1;i<=5;i++){const k=i/5,end:Vec3=[start[0]+(target[0]-start[0])*k+(calm?0:Math.sin(time*15+i*2)*.10*Math.sin(k*Math.PI)),start[1]+(target[1]-start[1])*k,start[2]+(target[2]-start[2])*k];bone(P.cyan,previous,end,.020);previous=end;}
    shape('ring',P.cyan,...target,.4,1,.4,Math.PI/2,time,0);
   }
  }
 }
}
