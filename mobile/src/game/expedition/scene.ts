import { branchOffset, clamp, hazardPose, environmentZone, LANE_WIDTH, routeOffset, overgrownPathOffset, overgrownPathHeight, overgrownPathWidth, MAJOR_FORKS, SUB_FORKS, CHAMBERS, smooth, type ForkOption, type CourseItem, type Expedition, type GameEvent } from './core';
import { ExpeditionRenderer, color, type Color, type GL, type Shape } from './gl';
import { multiply, segment, transform, type Mat4, type Vec3 } from './math';
import { gaitPose, burrowPose, reactionEnvelope } from './animation';
import { companionId, COMPANIONS } from './companions';
import { drawCompanion, drawTeam } from './companion-models';
const C={fur:color('#24272a',-4),furLight:color('#353237',-4),black:color('#0d1117'),cream:color('#f2d9a2'),pale:color('#fff0c7'),gold:color('#ffcb5a'),goldGlow:color('#ffc765',1.15),mint:color('#70e4d7',.35),violet:color('#b4a0fa',.45),red:color('#e8795e'),pink:color('#da818b'),stone:color('#758474',-8),stoneDark:color('#425450',-8),wood:color('#6c4b35',-7),woodLight:color('#a47c4b',-7),leaf:color('#427763'),leafLight:color('#75aa63'),iron:color('#657579'),copper:color('#ad8155'),water:color('#254d56',-2),shadow:color('#000000',-3)};
const TAU=Math.PI*2;
const hash=(n:number)=>{const x=Math.sin(n*127.13+91.7)*43758.5453;return x-Math.floor(x);};
export const CHARACTER_CONTRACT={fangCount:0,teeth:'small-even',clawsPerPaw:5,fur:'black',markings:'cream',eyes:'amber-gold'} as const;
const curve=(d:number)=>Math.sin(d/76)*.8+Math.sin(d/185)*1.1;
const floorY=(d:number,route:Expedition['route']='main')=>Math.sin(d/34)*.12+overgrownPathHeight(route,d);
type Particle={x:number;y:number;d:number;vx:number;vy:number;vz:number;born:number;life:number;c:Color;size:number};
export class ExpeditionScene {
 renderer:ExpeditionRenderer;private particles:Particle[]=[];private clock=0;private lastTime=0;
 private reaction:{kind:'good'|'hurt'|'revive'|'discovery';at:number}={kind:'good',at:-10};
 private cameraX=0;private cameraY=0;private initializedCamera=false;private disposed=false;private particleId=0;
 constructor(gl:GL){this.renderer=new ExpeditionRenderer(gl);}
 get stats(){return {...this.renderer.stats,particles:this.particles.length,nativeWorldReady:this.renderer.worldReady===true};}
 events(events:GameEvent[],s:Expedition,calm=false){
  for(const e of events){
   if(e.kind==='hit')this.reaction={kind:'hurt',at:this.clock};
   if(['secret','upgrade','power','companion-join','companion-attack','companion-guard','companion-boost'].includes(e.kind))this.reaction={kind:e.kind==='secret'?'discovery':'good',at:this.clock};
   if(e.kind==='revive'||e.kind==='win')this.reaction={kind:'revive',at:this.clock};
   if(calm||!['coin','gem','hit','block','secret','revive','land','step','slide','burst','splash','power','companion-join','companion-attack','companion-guard','companion-boost'].includes(e.kind))continue;
   const amount=e.kind==='step'?2:e.kind==='coin'?4:e.kind==='secret'||e.kind==='revive'?18:9;
   const c=e.companion?color(COMPANIONS[e.companion].color,.5):e.kind==='hit'?C.red:e.kind==='land'||e.kind==='step'||e.kind==='slide'?color('#b3a386'):e.kind==='splash'?C.mint:e.kind==='block'?C.mint:e.kind==='gem'?C.violet:C.goldGlow;
   for(let i=0;i<amount;i++){
    const n=this.particleId++,r=hash(n),a=hash(n+8)*TAU;
    this.particles.push({x:e.targetX!==undefined?e.targetX+curve(e.targetD??s.distance)-curve(s.distance):s.x+routeOffset(s),y:floorY(e.targetD??s.distance,s.route)+(e.kind==='step'||e.kind==='land'||e.kind==='slide'?.15:1.1)+s.y,d:e.targetD??s.distance,
     vx:Math.cos(a)*(1+r*1.8),vy:(e.kind==='step'?.5:1.8)+r*2,vz:Math.sin(a)*2,born:this.clock,life:e.kind==='step'?.32:.55+r*.4,c,size:e.kind==='step'?.055:.065+r*.04});
   }
  }this.particles=this.particles.slice(-100);
 }
 private shape(shape:Shape,c:Color,x:number,y:number,z:number,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,parent?:Mat4){this.renderer.shape(shape,c,x,y,z,sx,sy,sz,rx,ry,rz,parent);}
 private link(a:Vec3,b:Vec3,radius:number,c:Color,parent?:Mat4){const m=segment(a,b,radius);this.renderer.add('cylinder',parent?multiply(parent,m):m,c);}
 private orb(x:number,y:number,z:number,r:number,c:Color,parent?:Mat4){this.shape('sphere',c,x,y,z,r,r,r,0,0,0,parent);}
 private arch(x:number,y:number,z:number,r:number,c:Color,width=.26){
  for(let i=0;i<9;i++){const a=(i+.5)/9*Math.PI;this.shape('box',c,x+Math.cos(a)*r,y+Math.sin(a)*r,z,width,r*.365,.6,0,0,a);}
 }
 /** Articulated three-dimensional character; no billboard or static runner sprite. */
 private madger(s:Expedition,time:number,calm:boolean){
  const running=['running','paused','upgrade'].includes(s.mode)&&s.distance>0,idle=s.mode==='ready',age=this.clock-this.reaction.at;
  const hurt=this.reaction.kind==='hurt'?smooth(age/.045)*Math.max(0,1-age/.65):0;
  const happy=this.reaction.kind!=='hurt'?reactionEnvelope(age):0;
  const turnBack=running&&this.reaction.kind==='discovery'?Math.sin(clamp(age/1.15,0,1)*Math.PI)*1.15:0;
  const stride=s.distance/3.8*TAU,grounded=s.y<.02&&s.slide<=0;
  const bob=running&&grounded?Math.abs(Math.sin(stride))*.07:Math.sin(time*2.6)*.018;
  const finishAge=s.mode==='won'||s.mode==='lost'?age:undefined;
  const pose=burrowPose(s.slide,s.slideAge,running,s.y,finishAge),crouch=pose.weight,air=smooth(s.y/.38);
  const idleYaw=idle?Math.PI+.12+Math.sin(time*.5)*.15:0;
  const bank=calm?0:clamp(-s.vx*.04,-.18,.18);
  const bounce=happy*.06*Math.sin(age*10);
  const root=transform(s.x+routeOffset(s),floorY(s.distance,s.route)+s.y-pose.depth,0,1,1,1,0,idleYaw,0);
  const body=multiply(root,transform(0,bob*(1-crouch)+bounce*(1-crouch)+pose.bodyY,0,1,1,1,pose.bodyX+hurt*.17,0,bank+hurt*.15));
  const fur=hurt>.2?color('#705055'):C.fur;
  this.shape('sphere',fur,0,1.10,0,.47,.66,.34,0,0,0,body);
  this.shape('sphere',C.furLight,0,.82,.08,.45,.37,.34,0,0,0,body);
  this.link([-.28,1.56,-.28],[0,1.10,-.354],.061,C.cream,body);
  this.link([0,1.10,-.354],[.27,1.50,-.285],.061,C.cream,body);
  this.link([-.20,1.31,-.33],[0,.94,-.326],.038,C.cream,body);
  this.link([0,.94,-.326],[.20,1.29,-.33],.038,C.cream,body);
  // Stance and swing share travelled distance with footsteps and ground motion.
  for(const side of [-1,1]){
   const gait=gaitPose(s.distance,side,s.y,crouch,running),footZ=gait.z,footY=gait.y;
   const hip:Vec3=[side*.26,.88+bob-crouch*.40,0],foot:Vec3=[side*(.27+crouch*.08),footY,footZ];
   const dy=foot[1]-hip[1],dz=foot[2]-hip[2],length=Math.min(.95,Math.max(.01,Math.hypot(dy,dz))),bend=Math.sqrt(Math.max(.015,.49*.49-(length*.5)**2));
   const knee:Vec3=[side*.28,(hip[1]+foot[1])*.5+dz/length*bend,(hip[2]+foot[2])*.5+dy/length*bend];
   this.link(hip,knee,.18,fur,root);this.orb(...knee,.19,fur,root);this.link(knee,foot,.135,fur,root);
   this.shape('sphere',fur,foot[0],foot[1],foot[2]-.07,.20,.13,.31,0,0,0,root);
   this.shape('sphere',C.woodLight,foot[0],foot[1]-.072,foot[2]-.06,.155,.036,.235,0,0,0,root);
   for(let i=0;i<5;i++)this.shape('cone',C.pale,foot[0]+(i-2)*.067,foot[1]+.025,foot[2]-.33,.027,.14,.030,-Math.PI/2,0,0,root);
   const swing=running?Math.sin(stride+(side<0?Math.PI:0))*.67:Math.sin(time*1.9+side)*.055;
   const shoulder:Vec3=[side*.44,1.45,0],elbow:Vec3=[side*(.58+happy*.12),1.08+happy*.34,-Math.sin(swing)*.38+hurt*.23],hand:Vec3=[side*(.50+happy*.23),.82+happy*.71,-.21-Math.sin(swing)*.47];
   elbow[1]+=.28*air;hand[1]+=.45*air;hand[2]-=.12*air;
   elbow[1]=elbow[1]*(1-crouch)+.85*crouch;elbow[2]=elbow[2]*(1-crouch)+.10*crouch;hand[1]=hand[1]*(1-crouch)+.72*crouch;hand[2]=hand[2]*(1-crouch)-.05*crouch;
   // Alternating claw strokes visibly pull Madger into the ground during the dive.
   elbow[1]+=side*pose.stroke*.12;hand[1]+=side*pose.stroke*.22;hand[2]-=crouch*.22+side*pose.stroke*.18;
   this.link(shoulder,elbow,.19,fur,body);this.orb(...elbow,.19,fur,body);this.link(elbow,hand,.15,fur,body);
   this.shape('sphere',fur,...hand,.20,.21,.17,0,0,0,body);
   for(let i=0;i<5;i++)this.shape('cone',C.pale,hand[0]+(i-2)*.065,hand[1]-.07,hand[2]-.16,.024,.12,.028,-Math.PI/2,0,side*.08,body);
  }
  // A continuous deforming fur mesh avoids disconnected, bead-like tail segments.
  this.renderer.updateTail(time,bank);
  const tail=multiply(body,transform(0,.65-crouch*.20,.23-crouch*.13,1,1,1,pose.tailX,Math.sin(time*2.8)*.16-bank*.7,0));
  this.renderer.add('tail',tail,color('#343034',-5));
  const head=multiply(body,transform(0,pose.headY,pose.headZ,1,1,1,pose.headX+Math.sin(time*2.4)*.025-happy*.07,hurt*.18+turnBack+Math.sin(time*.72)*.04,Math.sin(time*1.6)*.015));
  this.shape('sphere',fur,0,0,-.03,.67,.59,.52,0,0,0,head);
  for(const side of [-1,1]){
   const ear=multiply(head,transform(side*.54,.40,.05,1,1,1,0,0,side*(.19+Math.sin(time*2.1+side)*.025)));
   this.shape('sphere',C.cream,0,0,0,.21,.235,.10,0,0,0,ear);this.shape('sphere',C.wood,0,0,-.08,.142,.16,.045,0,0,0,ear);
   if(!this.renderer.portraitReady){
   this.shape('sphere',C.cream,side*.37,-.06,-.385,.29,.30,.135,0,side*.22,side*.22,head);
   this.shape('sphere',C.cream,side*.42,-.24,-.32,.235,.24,.16,0,0,side*.35,head);
   const blinkPhase=(time+side*.027)%4.3,blink=blinkPhase<.12?.1:blinkPhase<.19?smooth((blinkPhase-.12)/.07):1;
   const eyeY=.08,eyeScale=Math.max(.07,blink*(1-hurt*.55));
   this.shape('sphere',C.black,side*.30,eyeY,-.50,.199,.240,.076,0,0,side*.15,head);
   this.shape('sphere',color('#fff6e4'),side*.30,eyeY,-.551,.159,.195*eyeScale,.045,0,0,side*.15,head);
   this.shape('sphere',color('#dca334'),side*.29,eyeY-.004,-.590,.115,.149*eyeScale,.028,0,0,0,head);
   this.shape('sphere',C.black,side*.29,eyeY-.002,-.614,.067,.108*eyeScale,.015,0,0,0,head);
   this.orb(side*.27-.020,eyeY+.055*eyeScale,-.632,.023,color('#fffef4',.25),head);
   this.link([side*.12,.27,-.53],[side*.46,.30+hurt*.035,-.44],.067,C.fur,head);
   for(let i=0;i<3;i++)this.shape('cone',C.cream,side*(.49+i*.039),-.23-i*.042,-.21,.062,.25,.042,0,0,side*1.10,head);
   }
  }
  this.shape('headStripe',this.renderer.portraitReady?color('#f2d9a2',-11):C.cream,0,0,0,1,1,1,0,0,0,head);
  if(this.renderer.portraitReady){this.renderer.add('face',head,color('#ffffff',-10));}else{
  this.shape('sphere',C.cream,0,.29,-.461,.14,.24,.062,0,0,0,head);
  this.shape('cone',C.cream,.027,.078,-.538,.103,.26,.035,Math.PI,0,-.15,head);
  // Normal, even teeth remain inside the mouth; no oversized external fang.
  const mouthOpen=.02+happy*.07+hurt*.075;
  this.shape('sphere',C.black,0,-.295-mouthOpen*.3,-.515,.325,.17+mouthOpen,.099,0,0,0,head);
  this.shape('sphere',C.cream,0,-.335-mouthOpen,-.506,.337,.10,.154,0,0,0,head);
  if(mouthOpen>.05)this.shape('sphere',C.pink,0,-.34-mouthOpen*.7,-.61,.135,.045,.035,0,0,0,head);
  this.shape('sphere',C.cream,-.16,-.18,-.525,.25,.17,.205,0,0,.09,head);
  this.shape('sphere',C.cream,.16,-.18,-.525,.25,.17,.205,0,0,-.09,head);
  this.shape('sphere',C.black,0,-.105,-.704,.169,.116,.118,0,0,0,head);
  this.shape('sphere',color('#869093'),-.034,-.068,-.807,.05,.018,.015,0,0,0,head);
  if(mouthOpen>.045)for(let i=0;i<4;i++)this.shape('box',C.pale,(i-1.5)*.057,-.303,-.611,.043,.049,.033,0,0,0,head);
  }
  this.shape('shadow',C.shadow,s.x+routeOffset(s),floorY(s.distance,s.route)+.018,0,.76*(1-s.y*.10)*(1-crouch*.45),1,.62*(1-s.y*.10));
  if(crouch>0)this.burrowTrail(s,crouch,calm);
  if(s.shields>0){this.shape('ring',C.mint,s.x+routeOffset(s),1.20+floorY(s.distance,s.route)+s.y,0,.88,1,.88,Math.PI/2,time*.8,0);this.shape('ring',C.mint,s.x+routeOffset(s),1.20+floorY(s.distance,s.route)+s.y,0,.88,1,.88,0,0,time*.5);}
  if(s.magnet>0)this.shape('ring',C.violet,s.x+routeOffset(s),floorY(s.distance,s.route)+.10,0,1.2+.07*Math.sin(time*5),1,1.2,0,time*.4,0);
  if(s.burst>0)for(let i=0;i<7;i++)this.shape('cone',C.goldGlow,s.x+routeOffset(s)+(i-3)*.15,.45+s.y,i*.18+.35,.06,.8,.06,-Math.PI/2,0,0);
 }
 /** Surface soil marks the runner's position while the articulated body is underground. */
 private burrowTrail(s:Expedition,weight:number,calm:boolean){
  const x=s.x+routeOffset(s),y=floorY(s.distance,s.route),pulse=calm?0:Math.sin(s.slideAge*34)*.025;
  const soil=s.zone===2?color('#75677b'):s.zone===1?color('#85735c'):color('#8b6743');
  this.shape('rock',soil,x,y+.09*weight,0,.66*weight,(.18+pulse)*weight,.84*weight,0,0,0);
  for(const side of [-1,1])this.shape('rock',C.woodLight,x+side*.38*weight,y+.055,.10,.27*weight,.105*weight,.52*weight,0,side*.25,0);
  // A short trail scrolls backwards with travelled distance; no retained particles are needed.
  const travel=s.slideAge*s.speed;
  for(let i=0;i<6;i++){
   const z=((travel+i*.48)%2.88)+.36,fade=weight*(1-z/3.4);
   this.shape('rock',i%2?soil:C.woodLight,x+Math.sin(i*2.4)*.20*weight,y+.025,z,.36*fade,.065*fade,.27*fade,0,i,0);
  }
  if(!calm)for(let i=0;i<8;i++){
   const age=(s.slideAge*3.4+i/8)%1,side=i%2?1:-1;
   this.shape('rock',i%3?soil:C.woodLight,x+side*(.26+age*.66)*weight,y+(.08+Math.sin(age*Math.PI)*.34)*weight,-.30+age*.80,.055*weight,.05*weight,.045*weight,age*3,i,age*2);
  }
 }
 private plant(x:number,y:number,z:number,n:number,time:number){
  for(let i=0;i<5;i++){const a=i/5*TAU+hash(n)*6;this.shape('leaf',i%2?C.leaf:C.leafLight,x,y,z,.45,.6,.8,Math.sin(time*1.2+n+i)*.13,a,.25);}
 }
 private crystal(x:number,y:number,z:number,scale:number,n:number){
  for(let i=0;i<3;i++){const h=scale*(.8+hash(n+i)*.7);this.shape('cone',i%2?C.violet:C.mint,x+(i-1)*.30*scale,y+h/2,z+hash(n+i)*.2,.22*scale,h,.22*scale,0,hash(n)*6,(i-1)*.15);this.shape('cone',i%2?C.violet:C.mint,x+(i-1)*.30*scale,y+.06,z,.22*scale,.18,.22*scale,Math.PI,0,0);}
 }
 private gear(x:number,y:number,z:number,r:number,time:number){
  this.shape('cylinder',C.copper,x,y,z,r,.16,r,Math.PI/2,0,0);this.shape('ring',C.iron,x,y,z,r*1.12,1,r*1.12,Math.PI/2,0,time);
  for(let i=0;i<10;i++){const a=i/10*TAU+time;this.shape('box',C.iron,x+Math.cos(a)*r,y+Math.sin(a)*r,z,.20,.26,.23,0,0,a);}
 }
 private scenery(s:Expedition,time:number,calm:boolean){
  if(s.board==='overgrown'){this.overgrownScenery(s,time,calm);return;}
  const d=s.distance,zone=s.zone,c0=curve(d);const worldX=(wd:number)=>curve(wd)-c0;
  const branchSide=(wd:number,side:number)=>this.burrows.some(g=>g.lane===side&&wd>=g.d-14&&wd<=g.d+103);
  for(let i=0;i<13;i++){
   const wd=Math.floor(d/20)*20+i*20,zz=d-wd,n=Math.floor(wd/20);
   for(const side of [-1,1]){
    const x=worldX(wd)+side*((branchSide(wd,side)?24:14)+hash(n+side)*9),h=8+hash(n*3)*16;
    this.shape('rock',color(zone===2?'#45455e':'#374a43'),x,h/2-4,zz,5,h/2,5,.1,hash(n)*4,.12);
    if(n%3===0){
      const wall=color(zone===2?'#526079':'#405952');
      this.shape('box',wall,x-side*3,3.5,zz-9,2,9,2);this.arch(x-side*3,5,zz-9,3,wall,.7);
      for(let j=0;j<3;j++)this.shape('box',C.stoneDark,x-side*(1.5+j*1.7),7.3-j*.45,zz-9,1.65,.6,1.5);
      if(zone!==1)for(let k=0;k<3;k++){this.shape('box',color('#162b30'),x-side*3,2+k*1.4,zz-7.92,.55,.80,.05);this.orb(x-side*3,2.0+k*1.4,zz-7.85,.06,C.goldGlow);}
     }
     if(n%5===2&&zone===0){const hut=x-side*5;this.shape('rock',C.stoneDark,hut,-.1,zz,2.2,1.6,1.9);this.arch(hut,-.1,zz+1.7,.70,C.wood,.19);this.shape('box',C.wood,hut,.31,zz+1.7,1.12,.9,.16);this.orb(hut+.87,.58,zz+1.85,.11,C.goldGlow);}
   }
  }
  const start=Math.floor(d/4)*4-12;
  for(let wd=start;wd<d+108;wd+=4){
   const z=d-wd,x=worldX(wd),y=floorY(wd),index=Math.floor(wd/4),zoneTile=s.board==='overgrown'?0:Math.min(2,Math.floor(Math.max(0,wd)/360));
   for(const lane of [-1,0,1]){
    const hole=s.route==='main'&&this.mainGaps.some(o=>o.lane===lane&&Math.abs(o.d-wd)<2.8);
    if(hole){this.shape('box',C.water,x+lane*LANE_WIDTH,y-1.75,z,2.1,.05,4);continue;}
    const floor=zoneTile===0?['#899984','#879481','#95a08b'][Math.abs(index+lane)%3]:zoneTile===1?['#727c7e','#7c8886','#69797b'][Math.abs(index+lane)%3]:['#717991','#858895','#7c879b'][Math.abs(index+lane)%3];
    this.shape('box',color(floor,-1),x+lane*LANE_WIDTH,y-.20,z,2.10,.38,3.94,0,-Math.cos(wd/76)*.010,0);
    if(zoneTile===1)this.shape('box',C.copper,x+lane*LANE_WIDTH,y+.008,z,1.90,.015,.07);
    else if(index%3===0)this.shape('box',color('#567763'),x+lane*LANE_WIDTH+.71,y+.007,z+.65,.35,.015,.9,0,.2,0);
   }
   if(index%2===0)for(const side of [-1,1]){
    if(branchSide(wd,side))continue;
    this.shape('box',C.stoneDark,x+side*3.43,y-.15,z,.45,.60,7.8);
    this.shape('cylinder',C.wood,x+side*3.42,y+.55,z,.10,1.3,.10);
    this.link([x+side*3.42,y+.93,z-4],[x+side*3.42,y+.88,z+4],.045,C.woodLight);
    this.shape('box',C.water,x+side*8,y-.95,z,8,.08,8,0,0,0);
   }
   if(index%3===0)for(const side of [-1,1]){
    const n=index*11+side*3,xx=x+side*(4.8+hash(n)*1.8);
    if(branchSide(wd,side)){this.plant(x+side*13.2,y-.15,z,n,time);continue;}
    this.shape('rock',C.stoneDark,xx,y-.15,z,1.0+hash(n),1.1,1.4,0,hash(n+2)*5,.1);
    this.plant(xx-side*.5,y+.48,z+.5,n,time);
    if(zoneTile===0){
      const sway=calm?0:Math.sin(time*.9+n)*.025;
      this.link([xx,y-.6,z],[xx-side*.7,y+6,z-.6],.30,C.wood);
      this.link([xx-side*.7,y+4.1,z-.3],[xx-side*3.6,y+6+sway,z+.2],.16,C.wood);
      for(let j=0;j<3;j++){
       const cx=xx-side*(.5+j*.75),cy=y+6.2+j*.32+sway,cz=z+(hash(n+j)-.5)*1.1;
       this.shape('rock',j%2?C.leaf:C.leafLight,cx,cy,cz,1.12+j*.21,.58+hash(n+j)*.22,1.43,0,hash(n+j)*5,.06);
       if(j!==1)this.shape('rock',C.leaf,cx+side*.85,cy-.27,cz+.35,.93,.49,1.02,0,hash(n+2)*4,0);
      }
      if(n%2===0){this.link([xx-side*1.9,y+5.7,z],[xx-side*2.0+Math.sin(time*.8+n)*.12,y+2.7,z+.20],.025,C.leaf);this.plant(xx-side*2.0,y+3.6,z+.2,n+1,time);}
    }else if(zoneTile===1){
      this.shape('box',C.iron,xx,y+.8,z,.8,2,.7);this.shape('cylinder',C.copper,xx,y+1.5,z,.24,2.1,.24,Math.PI/2,0,0);
      this.gear(xx-side*.6,y+1.2,z,.5,time*.6*(side>0?1:-1));
    }else this.crystal(xx,y+.7,z,1.4,n);
   }
   if(index%5===0){
    this.arch(x,y+2.1,z,5.0,zoneTile===2?color('#606779'):C.stoneDark,.60);
    for(const side of [-1,1]){
     this.shape('box',C.stoneDark,x+side*5,y+1,z,.65,2.3,.9);
     this.link([x+side*4.0,y+1.3,z],[x+side*4.0,y+2.8,z],.09,C.wood);
     const swing=calm?0:Math.sin(time*1.6+index)*.07;
     this.shape('box',C.iron,x+side*4.0+swing,y+2.45,z,.33,.54,.33,0,0,swing);
     this.shape('sphere',color('#ffd994',1.5+Math.sin(time*7+index)*.04),x+side*4.0+swing,y+2.46,z,.13,.20,.13);
    }
   }
  }
  // Both shortcuts physically diverge and rejoin rather than teleporting the player.
  for(const gate of this.burrows){
   if(gate.d+94<d-10||gate.d>d+105)continue;
   for(let wd=gate.d;wd<=gate.d+90;wd+=3){
    const z=d-wd;if(z>12||z< -110)continue;
    const bx=worldX(wd)+branchOffset(wd,gate.d,gate.d+90,gate.lane),by=floorY(wd)+.025;
    this.shape('box',C.woodLight,bx,by-.17,z,6.4,.25,2.93);
    for(const side of [-1,1]){this.shape('cylinder',C.wood,bx+side*3.13,by+.52,z,.085,1.25,.085);this.link([bx+side*3.13,by+.85,z-1.5],[bx+side*3.13,by+.82,z+1.5],.025,C.cream);}
    if(Math.round(wd)%9===0){this.arch(bx,by+.6,z,3.3,C.wood,.22);this.crystal(bx+2.7,by+.15,z,.48,wd);}
   }
  }
  if(!calm)for(let i=0;i<25;i++){const zz=-((i*7.3+d*.6)%95)+8;this.orb(Math.sin(i*9.7)*9+Math.sin(time+i)*.14,1.2+hash(i)*5+Math.sin(time*.7+i)*.18,zz,.025+(i%3)*.008,i%3?C.mint:C.goldGlow);}
  if(d>970){const z=d-1090;this.arch(worldX(1090),1.2,z,4.5,C.gold,.5);for(let i=0;i<5;i++)this.shape('box',C.goldGlow,worldX(1090)+(i-2)*1.4,1.8,z,.8,3.2,.25);}
 }
 /** Physical branching roads and authored biome props for the Overgrown Burrow.
  * Each child route gets a separate offset road and themed geometry. Only the
  * chosen road is detailed once the player has committed to a fork.
  */
 /** Native scanned woodland, rooted in a continuous contoured ground mesh.
  * Geometry and texture detail survive the lowest GPU budget. Only counts and
  * draw distance change. Trees are full meshes, never camera-facing sprites. */
 private nativeLandscape(s:Expedition,time:number,calm:boolean){
  const d=s.distance,base=curve(d),budget=this.renderer.sceneryBudget;
  const cave=['deep','mudslide','crystal-vein','ancient-vault'].includes(s.route);
  const ruins=['ridge','causeway','watchtower','gearworks'].includes(s.route);
  const white=color('#f2f1dd'),stone=color(cave?'#a4bbc9':'#d6d8cc'),ground=color(cave?'#717a85':ruins?'#a7a48a':'#9eab7b',cave?-8:-1);
  const far=[44,64,86][budget];
  const centre=(wd:number)=>curve(wd)-base+overgrownPathOffset(s.route,wd);
  if(cave)for(const side of [-1,1])this.shape('box',color('#526576',-8),centre(d+74)+side*7.8,4.2,-74,4,9,80);
  // Fill from the edge of the playable road out into the forest and hills.
  // The playable surface itself remains open at every authored gap.
  for(let wd=Math.floor((d-18)/12)*12;wd<d+112;wd+=12){
   const z=d-wd,x=centre(wd),y=floorY(wd,s.route);
   for(const side of [-1,1])this.shape('terrain',ground,x+side*3.02,y-.10,z,side*29,6,6.7,0,0,0);
   if(cave){
    this.shape('ceiling',color('#607582',-8),x,10.0,z,8.8,4.2,6.0,0,0,0);
    for(const side of [-1,1])this.shape('cone',color('#70838a',-8),x+side*4.7,y+6.8,z,.45,2.1,.52,Math.PI,0,0);
   }
  }
  for(let n=Math.floor(d/14);n*14<d+far;n++){
   const wd=n*14+7,ahead=wd-d;if(ahead<7)continue;
   const z=-ahead,x=centre(wd),y=floorY(wd,s.route),side=n%2?1:-1;
   const yaw=hash(n*17)*TAU,h=9.2+hash(n*31)*2.2;
   if(!cave){
    const bx=x+side*(8.0+hash(n)*1.7);
    for(const part of ['scanTreeTrunk','scanTreeCrown','scanTreeTwigs'] as const)
     this.shape(part,white,bx,y-.12,z,h,h,h,0,yaw,0);
    this.shape('shadow',C.shadow,bx,y+.015,z,2.1,1,1.9);
    if(budget>0&&n%2===0)for(const part of ['scanTreeTrunk','scanTreeCrown','scanTreeTwigs'] as const)
     this.shape(part,color('#c9d8c1'),x-side*10,y+.25,z-5,h*.85,h*.85,h*.85,0,yaw+1,0);
    if(ahead<32||budget>0){
     this.shape('scanFern',color('#b7cc94'),x+side*4.25,y-.02,z+2,.90,.90,.90,0,yaw,0);
     if(ahead<25)this.shape('scanFern',color('#b7cc94'),x-side*3.95,y-.02,z+4,.65,.65,.65,0,yaw+2,0);
     this.shape('scanRoots',white,x+side*5.7,y-.05,z-2,3.1,1.5,2.5,0,yaw,0);
    }
   }else{
    this.shape('scanCliff',stone,x+side*7.9,y-.7,z,7.3,9.2,5.8,0,yaw,0);
    this.shape('scanCliff',stone,x-side*7.9,y-.7,z-4,7.3,9.2,5.8,0,yaw+2,0);
    this.crystal(x+side*4.35,y+.05,z,.72,n);
   }
   this.shape('scanRock',stone,x-side*4.6,y-.10,z-2,2.1,1.9,1.8,0,yaw,0);
   this.shape('shadow',C.shadow,x-side*4.6,y+.01,z-2,1.2,1,1.1);
   if(n%3===0&&!cave)this.shape('scanLog',white,x-side*6.0,y+.05,z+3,4.2,5.4,4.0,0,yaw*.3,0);
   if(ruins&&n%2===0){
    for(let row=0;row<4;row++)for(let col=0;col<2;col++)this.shape('box',C.stone,x+side*(5.1+col*.8),y+.36+row*.73,z, .77,.71,1.14,0,.1*side,0);
    this.shape('scanCliff',stone,x+side*9,y-.3,z-5,5.3,4.2,4.7,0,yaw,0);
   }
   // Moving air is subtle. No particle curtain over collision silhouettes.
   if(!calm&&ahead<35&&n%2===0)this.shape('leaf',C.leaf,x+side*(4.0+Math.sin(time*.5+n)),y+1.5+Math.sin(time*.7+n)*.5,z+Math.cos(time*.4+n),.16,.22,.26,time*.4,n,time*.6);
  }
 }
 private overgrownScenery(s:Expedition,time:number,calm:boolean){
  const d=s.distance,base=curve(d);
  if(this.renderer.worldReady)this.nativeLandscape(s,time,calm);
  // Native GL has a measured, hysteretic GPU-drain budget. Preserve every
  // playable lane and hazard at full fidelity; trim ONLY off-track distance
  // dressing when a software renderer or older phone is falling behind.
  const sceneryBudget=this.renderer.sceneryBudget;
  const sceneryFar=sceneryBudget===0?42:sceneryBudget===1?65:95;
  const mainTheme=(route:string)=>['main','rootway','mosswalk','root-arch','log-crossing'].includes(route)?'forest':
    ['ridge','causeway','watchtower','gearworks'].includes(route)?'ruins':'cavern';
  const approach={id:'main',name:'The Overgrown Burrow',risk:'LOW',reward:'Coins',description:'Forest approach',side:0,accent:'#B1DC88'} as const;
  const phases:{start:number;end:number;options:readonly (ForkOption|typeof approach)[]}[]=[
   {start:this.renderer.worldReady?-24:0,end:140,options:[approach]},
   {start:140,end:450,options:MAJOR_FORKS},
   {start:445,end:461,options:[approach]},
   {start:455,end:900,options:SUB_FORKS[(s.majorPath==='ridge'||s.majorPath==='deep')?s.majorPath:'rootway']},
   {start:900,end:1080,options:[approach]},
  ];
  for(const phase of phases){
   if(d>phase.end+8||d+94<phase.start)continue;
   const allRoutes=(s.mode==='fork'||d<phase.start)&&d<phase.start+25;
   const options=allRoutes?phase.options:phase.options.filter(o=>o.id===s.route);
   for(const option of options){
    const theme=mainTheme(option.id),highlight=option.accent;
    const mud=theme==='cavern'?color('#6c7b85',-8):theme==='ruins'?color('#716458',-1):color('#625848',-1);
    const edge=theme==='cavern'?color('#3A3446',-8):theme==='ruins'?color('#4F504D',-8):color('#4B4638',-8);
    const vegetation=theme==='cavern'?color('#4B6D69'):theme==='ruins'?C.leaf:C.leafLight;
    const step=6,first=this.renderer.worldReady?Math.max(phase.start,Math.floor((d-12)/step)*step):Math.max(phase.start+3,Math.floor((d-9)/step)*step);
    for(let wd=first;wd<Math.min(phase.end+(this.renderer.worldReady?3:-2),d+90);wd+=step){
     const z=d-wd,off=overgrownPathOffset(option.id,wd),x=off+curve(wd)-base,y=floorY(wd,option.id),n=Math.floor(wd/6);
     const delta=(overgrownPathOffset(option.id,wd+1)+curve(wd+1)-overgrownPathOffset(option.id,wd-1)-curve(wd-1))*.5;
     const roadYaw=-Math.atan(delta);
     // Three walkable physical lanes. Their dirt and stone retain the same
     // independently interpolated fork offset as Madger and collectibles.
     for(const lane of [-1,0,1]){
      const width=overgrownPathWidth(option.id,wd),lx=x+lane*LANE_WIDTH*width;
      if(this.renderer.worldReady){
       for(let j=0;j<4;j++){
        const td=wd-2.25+j*1.5;
        const gap=this.course.some(o=>o.kind==='gap'&&o.route===option.id&&o.lane===lane&&Math.abs(o.d-td)<2.0);
        if(!gap)this.shape('trail',mud,overgrownPathOffset(option.id,td)+curve(td)-base+lane*LANE_WIDTH*overgrownPathWidth(option.id,td),floorY(td,option.id),d-td,2.19*overgrownPathWidth(option.id,td),1,1.67,Math.atan((floorY(td+.75,option.id)-floorY(td-.75,option.id))/1.5),roadYaw,0);
       }
      }else this.shape('box',mud,lx,y-.24,z,2.12*width,.40,6.7,0,roadYaw,0);
      if(!this.renderer.worldReady&&(n+lane)%3===0){
       this.shape('rock',vegetation,lx+.60,y+.025,z+.5,.42,.026,1.55,0,n*.48,0);
       this.shape('rock',edge,lx-.67,y+.023,z-.6,.37,.042,.39,0,n,0);
      }
      if(!this.renderer.worldReady&&(n+lane)%4===0)this.shape('rock',color('#454A37',-8),lx-.13,y+.023,z+1.1,.61,.035,.77,0,n*.51,0);
     }
     // Opaque trees, foliage and rock faces behind the camera can block
     // the entire screen as a fork curves. Keep the track under the runner,
     // but render tall scenery only ahead of the playing/camera corridor.
     if(this.renderer.worldReady||z>-7||-z>sceneryFar)continue;
     // Keep detailed close-up vegetation and masonry. Thin only off-track
     // props beyond 30 metres; forks, pickups, road and hero are untouched.
     if(sceneryBudget<2&&-z>30&&n%(sceneryBudget===0?4:2)!==0)continue;
     // Wet border rock, ancient edging and root networks never occupy lanes.
     for(const side of [-1,1]){
      const bx=x+side*4.33,t=(hash(n*43+side*9)*2-1),bark=theme==='ruins'?color('#807B73',-8):theme==='cavern'?edge:color('#735438',-7);
      this.shape('rock',edge,bx,y+.16,z,1.08,.42,2.8,0,n*.21,0);
      if(n%3===0){
       if(theme==='forest'){
        // Living canopy sways above its fixed rooted base; only foliage and
        // branch endpoints animate, never the path or hazard positions.
        const wind=calm?0:Math.sin(time*.73+n*.43+side)*.095;
        this.link([bx,y+.15,z],[bx+side*.14+wind*.42,y+3.65,z-.18+wind*.3],.30,bark);
        this.link([bx+side*.14+wind*.31,y+2.65,z-.18],[bx-side*.92+wind,y+4.26,z-.72+wind*.4],.15,bark);
        this.link([bx+side*.14+wind*.36,y+3.05,z-.18],[bx+side*.86+wind,y+4.72,z+.32+wind*.4],.13,bark);
        for(let j=0;j<5;j++)this.shape('rock',j%2?C.leaf:C.leafLight,bx+Math.sin(j*2.32)*.67+wind,y+4.6+Math.cos(j*3.1)*.37,z-.3+Math.cos(j*2.1)*.57,1.05,.53,.90,0,j,0);
        if(!calm)this.link([bx-side*.5,y+4.1,z-.5],[bx-side*.48+Math.sin(time+n)*.05,y+2.65,z-.45],.020,C.leaf);
       }else if(theme==='ruins'){
        const broken=.65+hash(n*17+side)*1.75;
        this.shape('cylinder',C.stone,bx,y+broken/2,z,.40,broken,.39);
        this.shape('rock',C.stoneDark,bx+t*.35,y+broken+.05,z,.60,.16,.61,0,n*.3,.11);
        this.shape('box',C.copper,bx+side*.30,y+.35,z+.28,.11,.56,.10,0,n*.22,0);
        if(n%6===0)this.gear(bx-side*.7,y+1.1,z,.48,time*.2);
       }else{
        // A low ceiling of layered shale, mineral veins and damp formations.
        this.shape('rock',edge,bx-side*.2,y+2.0,z,1.44,2.9,2.15,0,n*.22,.12);
        this.shape('cone',C.stoneDark,bx-side*.7,y+3.82,z,.30,1.28,.28,Math.PI,0,0);
        if(n%6===0)this.crystal(bx-side*.7,y+.18,z,.62,n);
        this.shape('sphere',color('#48626A',-2),bx-side*.75,y+.012,z,.72,.02,1.03);
       }
      }else if(n%2===0){
       for(let j=0;j<3;j++)this.shape('rock',j%2?edge:vegetation,bx+Math.sin(j*4+n)*.35,y+.15+j*.11,z+(j-1)*.69,.55,.25,.50,0,n+j,0);
      }
     }
     // Distant cliff silhouettes and softer outer banks fill the sky without
     // covering the runner or inventing hazards beyond the selected path.
     // Normal-shaded ridgeline strips now replace these old giant
     // faceted placeholder rocks. The terrain banks are streamed below from
     // stable absolute world distances and never block the three lanes.
     // Path-specific recognizable landmarks, not interchangeable filler props.
     if(option.id==='main'&&n%7===0){
      for(const side of [-1,1])this.shape('rock',C.leaf,x+side*3.6,y+.25,z+.6,.58,.35,.75,0,n*.31,0);
      if(n%14===0)for(const side of [-1,1])this.shape('sphere',color('#D6B494',.15),x+side*3.48,y+.57,z,.12,.12,.12);
     }
     if(n%9===0){
      if(option.id==='root-arch')this.arch(x,y+.98,z,3.1,C.wood,.28);
      if(option.id==='log-crossing')this.link([x-2.6,y+.15,z],[x+2.6,y+.17,z],.20,C.wood);
      if(option.id==='watchtower')this.arch(x+3.9,y+3.1,z,2.5,C.stone,.36);
      if(option.id==='gearworks')this.gear(x-3.4,y+.95,z,.71,time*.5);
      if(option.id==='crystal-vein')for(const side of [-1,1])this.crystal(x+side*3.9,y+.1,z,.9,n+side);
      if(option.id==='ancient-vault'){this.shape('box',C.wood,x+3.8,y+.65,z,1.1,1.2,.9);this.shape('ring',C.goldGlow,x+3.8,y+1.12,z+.49,.29,1,.29);}
     }
    }
    // Native WebGL counterpart of the richer browser PBR far banks.
    // One reused indexed/instanced ridge batch; no new per-frame draw calls
    // per hill, no collisions, no changes to the saved route or checkpoints.
    const backdropFar=sceneryBudget===0?88:sceneryBudget===1?100:112;
    const backdropTint=color(theme==='cavern'?'#4A5661':theme==='ruins'?'#898C83':'#607F72',-8);
    const startBand=Math.floor((d-24)/24),endBand=Math.ceil((d+backdropFar)/24);
    for(let band=startBand;band<=endBand;band++){
     const distance=band*24,ahead=distance-d;
     if(distance<phase.start+4||distance>phase.end-4||ahead<=2||ahead>=backdropFar)continue;
     const fade=smooth((ahead-2)/16)*smooth((backdropFar-ahead)/20);
     if(fade<.035)continue;
     const roadCentre=overgrownPathOffset(option.id,distance)+curve(distance)-base;
     for(const side of [-1,1]){
      const noise=hash(band*71+side*17+(theme==='ruins'?89:13));
      const bankX=roadCentre+side*(21+noise*3.1);
      this.shape('ridge',backdropTint,bankX,floorY(distance,option.id)-.43,d-distance,
       (8.2+noise*3)*fade,(7.4+noise*3)*fade,(13+noise*3.5)*fade,
       0,(noise-.5)*.13,0);
     }
    }
    // A visible route junction accompanies the actual fixed-step choice:
    // three approach lanes at 140m, then a low descent, raised jump ledge and
    // root-clad burrow tunnel at 455m. Only artwork; the fixed-step engine
    // decides which path was genuinely reached, without scripted teleports.
    if(allRoutes&&phase.start===455){
     const junction=455,jz=d-junction,ix=curve(junction)-base+option.side*LANE_WIDTH,iy=floorY(junction);
     if(jz>-60&&jz<11){
      const metal=theme==='ruins'?C.copper:C.stone;
      if(option.side===-1){
       // Open lower channel: a clearly down-sloping earth lip and side stones.
       this.shape('box',C.stoneDark,ix,iy-.36,jz-.8,1.77,.25,3.1,-.17,0,0);
       for(const side of [-1,1])this.shape('rock',C.stone,ix+side*.98,iy-.16,jz-1.0,.21,.24,.8);
      }else if(option.side===0){
       // Mid-path is not accessible merely by steering: reach the high lip
       // with a correctly timed jump above the untouched .65m physics gate.
       this.shape('box',metal,ix,iy+.52,jz-1.25,1.86,.26,2.3);
       this.shape('box',C.stoneDark,ix,iy+.32,jz-.8,1.72,.64,.9);
       for(const side of [-1,1])this.shape('cylinder',metal,ix+side*.90,iy+.60,jz-1.4,.11,1.2,.11);
      }else{
       // Crawl under the roots to find the hidden branch. Normal running
       // fails the action gate and safely falls back to the lower channel.
       for(const side of [-1,1])this.shape('rock',C.wood,ix+side*.70,iy+.72,jz-.8,.26,.72,.73);
       this.link([ix-.77,iy+1.26,jz-.8],[ix+.77,iy+1.26,jz-.8],.19,C.wood);
       this.shape('box',C.goldGlow,ix,iy+.22,jz-.71,.68,.08,.20);
      }
     }
    }
    // At an imminent fork every doorway remains visible, even before choosing.
    if(allRoutes){
     const portal=phase.start+13,z=d-portal;
     if(z>-95&&z<14){
      const x=curve(portal)-base+overgrownPathOffset(option.id,portal),y=floorY(portal,option.id);
      this.arch(x,y+1.15,z,3.1,theme==='cavern'?C.stone:theme==='ruins'?C.copper:C.wood,.35);
      this.shape('sphere',color(highlight,.75),x,y+3.80+Math.sin(time*2+option.side)*.09,z,.21,.33,.21);
      for(const side of [-1,1])this.shape('rock',edge,x+side*3.1,y+.30,z,.81,.75,.88);
     }
    }
   }
  }
 }
 private course:CourseItem[]=[];private burrows:CourseItem[]=[];private mainGaps:CourseItem[]=[];
 setCourse(course:CourseItem[]){this.course=course;this.burrows=course.filter(o=>o.kind==='burrow');this.mainGaps=course.filter(o=>o.kind==='gap'&&o.route==='main');this.initializedCamera=false;}
 private item(item:CourseItem,s:Expedition,time:number){
  const ahead=item.d-s.distance;if(ahead < -6||ahead>102)return;
  if(item.kind==='boulder'&&item.route===s.route&&ahead<52){
   const side=item.lane||(Math.sin(item.phase)>=0?1:-1),bx=side*6.6+routeOffset(s,item.d)+curve(item.d)-curve(s.distance),by=floorY(item.d,item.route);
   this.shape(this.renderer.worldReady?'scanCliff':'rock',C.stone,bx,by-.15,-ahead-5.76,2.6,3.3,3.2,0,side*.3,0);
   for(let i=0;i<3;i++)this.shape('rock',C.stoneDark,bx-side*(.75+i*.32),by+.15+i*.24,-ahead-3.5+i*.3,.22,.18,.28,0,i,0);
  }
  if(s.used.includes(item.id))return;
  if(s.board==='overgrown'){if(item.route!==s.route&&item.route!=='main')return;}
  else if(item.route!==s.route&&item.route!=='main'&&s.route!=='main')return;
  let offset=0;
  if(s.board==='overgrown')offset=overgrownPathOffset(item.route,item.d);
  else if(item.route!=='main'){const gate=this.burrows.find(g=>(item.route==='hollow'&&g.d<500)||(item.route==='grotto'&&g.d>500));if(gate)offset=branchOffset(item.d,gate.d,gate.d+90,gate.lane);}
  const pose=hazardPose(item,s.time,s.distance),x=pose.x+offset+curve(pose.d)-curve(s.distance),z=-pose.ahead,y=floorY(pose.d,item.route),phase=time+item.phase;
  const bob=Math.sin(phase*3)*.09;
  const shadow=(size:number)=>this.shape('shadow',C.shadow,x,y+.020,z,size,1,size);
  if(['coin','gem','life','key','shield','magnet','snow-sigil','guardian-totem','tech-cell','treasure-cache'].includes(item.kind))this.shape('halo',color(item.kind==='gem'?'#b6a4ff':item.kind==='shield'?'#69efcf':'#ffc363',-6),x,y+1+bob,z,.68,.68,.68);
  const ally=companionId(item.kind);
  if(ally){
   const c=color(COMPANIONS[ally].color,.45),active=s.companions[ally].timeLeft>0;
   this.shape('ring',c,x,y+.06,z,.67,1,.67,0,time*.5,0);
   if(!active)drawCompanion(this.renderer,ally,{x,y:y+(ally==='bot'?1.25:0),z,yaw:Math.PI,scale:ally==='gorilla'?.70:ally==='bot'?.76:.85,time,distance:s.distance,running:false});
   else{this.shape('ring',c,x,y+1.03+bob,z,.43,1,.43,Math.PI/2,time,0);this.orb(x,y+1.03+bob,z,.15,c);}
   return;
  }
  switch(item.kind){
   case 'chamber-door':{
    const chamber=CHAMBERS.find(c=>c.route===item.route&&c.d===item.d);if(!chamber)break;
    const tech=chamber.hero==='bot',accent=color(chamber.accent,.55),height=tech?1.25:.16;
    this.arch(x,y+height,z,tech?.85:1.0,tech?C.copper:color('#5B503D',-7),.22);
    this.shape('box',color('#122723'),x,y+.55+height,z-.12,1.45,1.0,.20);
    this.shape('ring',accent,x,y+height+.75,z+.18,.35,1,.35,Math.PI/2,0,0);
    for(const side of [-1,1]){
     this.shape('rock',color('#6D7567',-8),x+side*1.0,y+.37,z,.32,.52,.6);
     this.orb(x+side*.8,y+height+.72,z+.1,.075,accent);
    }
    if(tech){this.gear(x,y+2.65,z,.24,time*.4);this.shape('box',C.copper,x,y+.28,z+.3,1.5,.15,1.0);}
    else for(let i=0;i<4;i++)this.link([x-.5+i*.3,y+1.1,z+.12],[x-.48+i*.3,y+.84,z+.15],.025,C.cream);
    break;
   }
   case 'snow-sigil':{
    this.shape('cylinder',C.iron,x,y+.18,z,.50,.26,.50);
    this.shape('cone',color('#A6DCE8',.5),x,y+1.10+bob,z,.33,.94,.33,0,phase*.55,0);
    this.shape('cone',color('#F6D8F2',.7),x,y+1.44+bob,z,.21,.52,.23,Math.PI,phase*.55,0);
    for(let i=0;i<5;i++){const a=i*TAU/5;this.shape('sphere',C.pale,x+Math.cos(a)*.30,y+.90+Math.sin(a*2+phase)*.10,z+Math.sin(a)*.30,.055,.075,.05);}
    shadow(.52);break;
   }
   case 'guardian-totem':{
    this.shape('cylinder',C.stoneDark,x,y+.37,z,.45,.68,.43);
    this.shape('rock',C.stone,x,y+.83+bob,z,.47,.54,.37,0,phase*.16,0);
    this.shape('box',C.goldGlow,x,y+.86+bob,z-.39,.16,.47,.045);
    for(const side of [-1,1])this.shape('rock',C.cream,x+side*.31,y+1.06+bob,z-.26,.14,.21,.16,0,0,side*.28);
    shadow(.60);break;
   }
   case 'tech-cell':{
    this.shape('cylinder',C.iron,x,y+.82+bob,z,.33,.92,.33);
    this.shape('cylinder',C.mint,x,y+.82+bob,z,.26,.68,.26);
    for(const level of [.38,.70,1.03,1.26])this.shape('ring',C.copper,x,y+level+bob,z,.36,1,.36);
    this.orb(x,y+1.43+bob,z,.16,C.mint);shadow(.45);break;
   }
   case 'treasure-cache':{
    this.shape('rock',C.stoneDark,x,y+.18,z,.79,.33,.66);
    this.shape('box',C.wood,x,y+.48,z,.83,.52,.67);
    this.shape('rock',C.goldGlow,x,y+.75+bob,z,.53,.23,.48);
    for(let i=0;i<5;i++)this.orb(x+(i-2)*.18,y+.78+bob,z-.24,.085,i%2?C.gold:C.violet);
    shadow(.72);break;
   }
   case 'coin':
    this.shape('ring',C.goldGlow,x,y+.92+bob,z,.32,.9,.32,Math.PI/2,phase*2.5,0);this.shape('cylinder',C.gold,x,y+.92+bob,z,.225,.055,.225,Math.PI/2,phase*2.5,0);shadow(.32);break;
   case 'gem':
    this.shape('cone',C.violet,x,y+1.12+bob,z,.32,.55,.32,0,phase*1.7,0);this.shape('cone',C.mint,x,y+.73+bob,z,.32,.24,.32,Math.PI,phase*1.7,0);shadow(.35);break;
   case 'heart':case 'life':{
    const yy=y+.95+bob,c=item.kind==='life'?C.goldGlow:C.pink;
    this.orb(x-.13,yy+.09,z,.22,c);this.orb(x+.13,yy+.09,z,.22,c);this.shape('cone',c,x,yy-.15,z,.31,.43,.23,Math.PI,phase*.4,0);
    if(item.kind==='life')for(const side of [-1,1])this.shape('leaf',C.pale,x+side*.2,yy,z,.55,1,.7,Math.PI/2,side*Math.PI/2,side*Math.sin(phase*5)*.3);
    shadow(.4);break;}
   case 'shield':
    this.shape('sphere',C.mint,x,y+1+bob,z,.42,.50,.10,0,phase,0);this.shape('box',C.pale,x,y+1+bob,z+.08,.08,.52,.06,0,phase,0);shadow(.4);break;
   case 'magnet':
    this.shape('ring',C.violet,x,y+1+bob,z,.40,.8,.40,Math.PI/2,phase*1.7,0);this.orb(x,y+1+bob,z,.16,C.pale);shadow(.4);break;
   case 'key':
    this.shape('ring',C.goldGlow,x,y+1.27+bob,z,.22,.7,.22,Math.PI/2,0,0);this.shape('box',C.gold,x,y+.91+bob,z,.08,.54,.09);this.shape('box',C.gold,x+.10,y+.72+bob,z,.25,.09,.09);shadow(.4);break;
   case 'boulder':
    if(this.renderer.worldReady){
     const roll=transform(x,y+.80+pose.y,z,1,1,1,pose.roll,0,0);
     this.shape('scanRock',color('#ddd4c5'),0,-.80,0,1.72,3.05,1.72,0,0,0,roll);
    }else this.shape('rock',color('#947d66'),x,y+.80+pose.y,z,.85,.80,.85,pose.roll,0,0);this.shape('ring',color('#c59164'),x,y+.10,z,.83,1,.83);shadow(.9);break;
   case 'saw':
    this.shape('box',C.wood,x,y+.16,z,1.3,.3,.9);
    this.shape('cylinder',C.iron,x,y+.53,z,.52,.12,.52,Math.PI/2,0,0);
    for(let i=0;i<12;i++){const a=phase*8+i/12*TAU;this.shape('cone',i%3?C.iron:C.red,x+Math.cos(a)*.56,y+.53+Math.sin(a)*.56,z,.10,.26,.065,0,0,a-Math.PI/2);}shadow(.7);break;
   case 'roots':
    this.link([x-.82,y,z],[x-.77,y+1.2,z],.12,C.wood);this.link([x+.82,y,z],[x+.73,y+1.2,z],.14,C.wood);
    this.link([x-.79,y+1.22,z],[x+.78,y+1.19,z],.30,C.wood);this.link([x-.83,y+1.35,z+.10],[x+.84,y+1.40,z-.12],.13,C.leaf);
    for(let i=0;i<4;i++)this.shape('leaf',C.leafLight,x-.7+i*.43,y+1.55,z,.4,.4,.65,.2,phase*.025+i,.3);shadow(.8);break;
   case 'steam':{
    const pressure=((s.time+item.phase)%3.2)/3.2;
    this.shape('cylinder',C.iron,x,y+.06,z,.58,.15,.58);
    this.shape('ring',pose.active?C.red:C.gold,x,y+.15,z,.48,1,.48);
    const count=pose.active?7:2;
    for(let i=0;i<count;i++){const f=((time*1.9+i/count)%1),radius=.14+f*.31;this.shape('sphere',color(pose.active?'#c6ddd3':'#a2b4ad',.1),x+Math.sin(i*7+phase)*f*.11,y+.16+f*(pose.active?1.9:.30),z,radius,radius*.7,radius);}
    this.shape('box',C.copper,x+.57,y+.25,z,.20,.5,.3);this.shape('box',pose.active?C.red:C.gold,x+.57,y+.26+pressure*.13,z+.16,.10,.22,.04);break;}
   case 'gap':
    for(const side of [-1,1])this.shape('box',C.red,x+side*.85,y+.045,z,.08,.04,3.0);
    this.shape('box',color('#142e36'),x,y-1.9,z,1.9,.10,3.5);
    for(let i=0;i<3;i++)this.shape('box',C.wood,x-.6+i*.6,y-.24-Math.max(0,1-ahead/9)*.5,z,.35,.16,1.5,Math.max(0,1-ahead/9)*.5,0,.10*i);break;
   case 'mud':
    this.shape('sphere',color('#634d38'),x,y+.018,z,.91,.045,1.28);
    for(let i=0;i<4;i++)this.orb(x+Math.sin(i*4)*.56,y+.04+Math.max(0,Math.sin(phase*2+i))*.06,z+Math.cos(i)*.7,.07,color('#8a7152'));break;
   case 'drone':
    this.shape('sphere',C.copper,x,y+1.04+pose.y*.25,z,.42,.22,.29);this.orb(x,y+.99+pose.y*.25,z+.26,.105,C.red);
    for(const side of [-1,1]){this.link([x,y+1.05,z],[x+side*.6,y+1.13,z],.045,C.iron);this.shape('box',C.iron,x+side*.6,y+1.2,z,.82,.035,.10,0,phase*35,0);}
    shadow(.65);break;
   case 'crate':
    if(this.renderer.worldReady){
     // Separate slats, inset faces and corner hardware retain depth in motion.
     for(let j=0;j<4;j++){
      this.shape('box',C.woodLight,x,y+.14+j*.23,z,1,.20,.98);
      for(const side of [-1,1])this.shape('box',C.wood,x+side*.51,y+.14+j*.23,z,.08,.20,1.0);
     }
     for(const side of [-1,1])for(const end of [-1,1]){
      this.shape('box',C.copper,x+side*.43,y+.47,z+end*.51,.13,.95,.08);
      for(const h of [.10,.82])this.orb(x+side*.43,y+h,z+end*.56,.033,C.iron);
     }
     this.shape('box',C.wood,x,y+.47,z+.55,1.2,.12,.09,0,0,.7);shadow(.7);break;
    }
    this.shape('box',C.woodLight,x,y+.47,z,1,.95,1,0,Math.sin(phase)*.02,0);for(const side of [-1,1])this.shape('box',C.wood,x+side*.35,y+.47,z+.51,.10,.94,.05);this.shape('box',C.copper,x,y+.47,z+.53,1,.09,.06,0,0,.65);shadow(.7);break;
   case 'burrow':{
    const archX=branchOffset(item.d+7,item.d,item.d+90,item.lane)+curve(item.d+7)-curve(s.distance);
    this.arch(archX,y,z-7,1.12,C.wood,.23);this.shape('rock',C.wood,archX,y+.85,z-7.04,1.3,.45,.45);
    this.shape('rock',C.stone,x-item.lane*.82,y+.48,z+.10,.27,.40,.16);
    for(let i=0;i<5;i++)this.shape('box',C.cream,x-item.lane*.82+(i-2)*.055,y+.55,z+.27,.024,.19,.017,0,0,-.18);
    this.orb(x+item.lane*.95,y+.65+Math.sin(phase)*.02,z+.12,.095,C.goldGlow);break;}
   case 'workshop':
    this.arch(x,y+.70,z,1.0,C.copper,.24);this.shape('box',C.woodLight,x,y+.49,z,.9,.65,.9);this.gear(x,y+2.0,z,.30,phase*.5);
    this.shape('box',C.mint,x,y+.82,z+.45,.5,.03,.03);shadow(.9);break;
   case 'vault':
    this.shape('box',C.wood,x,y+.55,z,1.38,.9,.98);this.shape('cylinder',C.copper,x,y+.97,z,.66,1.39,.5,0,0,Math.PI/2);
    for(const side of [-1,1])this.shape('box',C.gold,x+side*.46,y+.65,z+.52,.10,1.1,.06);
    this.shape('box',C.goldGlow,x,y+.72,z+.54,.21,.27,.075);shadow(.9);break;
  }
 }
 private chamberRoom(s:Expedition,time:number){
  const chamber=CHAMBERS.find(c=>c.id===s.chamber);if(!chamber)return;
  const x=s.x+routeOffset(s),floor=floorY(s.distance,s.route),tech=chamber.hero==='bot',nest=chamber.hero==='gorilla';
  const wall=color(nest?'#5A6352':tech?'#626666':'#5A596C',-8),wood=color('#695139',-7),accent=color(chamber.accent,.7);
  for(let row=0;row<6;row++)for(let col=-2;col<=2;col++){
   this.shape('box',wall,x+col*1.6,floor-.18,-row*1.8,1.57,.35,1.76,0,0,0);
   if((row+col)%3===0)this.shape('rock',nest?C.leaf:C.stoneDark,x+col*1.6+.4,floor+.01,-row*1.8,.33,.025,.52);
  }
  for(const side of [-1,1])for(let row=0;row<5;row++){
   for(let layer=0;layer<3;layer++)this.shape('box',wall,x+side*3.8,floor+.5+layer*.98,-1-row*2.0,1.0,.96,1.94,0,0,side*.025);
   this.shape('cylinder',tech?C.copper:wall,x+side*3.4,floor+1.65,-1-row*2.0,.23,3.3,.23);
   if(row%2===0){this.orb(x+side*3.0,floor+2.1,-1-row*2,.12,accent);this.shape('halo',color(chamber.accent,-6),x+side*3.0,floor+2.1,-.96-row*2,.60,.60,.60);}
  }
  this.arch(x,floor+1.8,-8.9,3.25,wall,.48);
  for(let layer=0;layer<4;layer++)this.shape('box',wall,x,floor+.5+layer*.98,-10.3,8.2,.96,1.0);
  this.shape('cylinder',C.stoneDark,x,floor+.24,-5.8,1.55,.45,1.55);
  this.shape('ring',accent,x,floor+.49,-5.8,1.45,1,1.45);
  if(nest){
   for(let i=0;i<8;i++){const a=i/8*TAU;this.link([x+Math.cos(a)*1.15,floor+.45,-5.8+Math.sin(a)*1.15],[x+Math.cos(a+.45)*.4,floor+.66,-5.8+Math.sin(a+.45)*.4],.15,wood);}
   this.shape('rock',wall,x,floor+1.3,-5.8,.66,.91,.60);
   for(const side of [-1,1]){this.shape('rock',C.cream,x+side*.25,floor+1.4,-5.15,.16,.28,.10);this.plant(x+side*2.7,floor+.1,-7,side,time);}
   for(const side of [-1,1])this.link([x+side*3.6,floor+3.5,-7],[x+side*.5,floor+3.0,-8],.27,wood);
  }else if(tech){
   for(const side of [-1,1]){this.gear(x+side*2.9,floor+2.6,-8.1,1.15,time*.25*side);this.link([x+side*2.6,floor+.3,-7],[x+side*2.6,floor+3.2,-7],.18,C.copper);}
   this.shape('cylinder',C.iron,x,floor+1.1,-5.8,.66,1.2,.66);
   this.shape('cylinder',accent,x,floor+1.25,-5.8,.43,.93,.43);
   for(let i=0;i<4;i++)this.shape('ring',C.copper,x,floor+.67+i*.35,-5.8,.73,1,.73);
  }else{
   this.shape('cylinder',color('#243A50',-2),x,floor+.48,-5.8,1.23,.035,1.23);
   for(let i=0;i<7;i++){const a=i/7*TAU;this.crystal(x+Math.cos(a)*2.3,floor+.1,-5.8+Math.sin(a)*2,.7+i%2*.3,i);}
   this.shape('cone',accent,x,floor+1.5,-5.8,.42,1.2,.42,0,time*.2,0);
   this.shape('ring',C.pale,x,floor+2.1,-5.8,.60,1,.60);
  }
 }
 draw(s:Expedition,visualTime:number,calm=false){
  if(this.disposed)return;const dt=Math.min(.08,Math.max(0,visualTime-this.lastTime));this.lastTime=visualTime;this.clock=visualTime;
  this.renderer.reset();if(s.mode==='chamber')this.chamberRoom(s,visualTime);else{
   this.scenery(s,visualTime,calm);for(const item of this.course)this.item(item,s,visualTime);
  }
  this.madger(s,visualTime,calm);
  drawTeam(this.renderer,s,visualTime,calm,curve,(d)=>floorY(d,s.route));
  this.particles=this.particles.filter(p=>visualTime-p.born<p.life);
  if(!calm)for(const p of this.particles){const age=visualTime-p.born,fade=1-age/p.life;this.orb(p.x+p.vx*age,p.y+p.vy*age-4.3*age*age,s.distance-p.d+p.vz*age,Math.max(.008,p.size*fade),p.c);}
  const lobby=s.mode==='ready',centre=routeOffset(s),targetX=centre+s.x*.72;
  if(!this.initializedCamera){this.cameraX=targetX;this.cameraY=floorY(s.distance,s.route)+s.y*.18;this.initializedCamera=true;}
  this.cameraX+=(targetX-this.cameraX)*(1-Math.exp(-dt*4));
  this.cameraY+=(floorY(s.distance,s.route)+s.y*.18-this.cameraY)*(1-Math.exp(-dt*3));
  const shake=!calm&&this.clock-this.reaction.at<.26&&this.reaction.kind==='hurt'?Math.sin(this.clock*73)*.055*(1-(this.clock-this.reaction.at)/.26):0;
  const chamber=s.mode==='chamber',cx=s.x+routeOffset(s);
  const eye:Vec3=chamber?[cx+1.9,3.8,8]:lobby?[3.8,3.3,8.6]:[this.cameraX+shake,4.4+this.cameraY,9.6];
  const target:Vec3=chamber?[cx,1.3,-5]:lobby?[0,1.35,-.6]:[this.cameraX+curve(s.distance+22)-curve(s.distance),.9+floorY(s.distance+14,s.route),-14];
  // Inside a single existing sphere instancing batch: a low-cost moving
  // atmospheric dome, not a static clear-color sky or an independent shader.
  // Hidden underground and in secret chambers. Entirely visual: no physics,
  // route state, checkpoint, rewards or hero transform changes.
  const cavernRoutes=['deep','mudslide','crystal-vein','ancient-vault','hollow','grotto'];
  if(s.board==='overgrown'&&!chamber&&!cavernRoutes.includes(s.route)){
   const ruinRoutes=['ridge','causeway','watchtower','gearworks'];
   const skyTint=ruinRoutes.includes(s.route)?'#bdc4b2':'#b4cfc8';
   this.shape('sphere',color(skyTint,-9),eye[0],eye[1],eye[2],138,138,138);
  }
  const lightZone=environmentZone(s);
  this.renderer.render(eye,target,visualTime,lightZone,s.distance);
 }
 dispose(){this.disposed=true;this.particles=[];this.renderer.dispose();}
}
