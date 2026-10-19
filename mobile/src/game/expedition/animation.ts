import { clamp, smooth } from './core';
/** During stance, foot displacement equals travelled ground displacement exactly.
 * The short 27% contact phase leaves an aerial recovery phase appropriate to a run,
 * rather than a walking cycle whose feet visibly skate over the moving course.
 */
export function gaitPose(distance:number,side:number,jumpHeight=0,crouch=0,running=true){
 const phase=((distance/3.8+(side>0?.5:0))%1+1)%1;
 const stance=phase<.27;
 let z=0,y=.12;
 if(running){
  if(stance)z=-.53+phase*3.8;
  else{const u=(phase-.27)/.73;z=.496-smooth(u)*1.026;y+=Math.sin(u*Math.PI)*.34;}
 }
 const air=smooth(jumpHeight/.38);
 z=z*(1-air)+(side>0?.30:-.25)*air;y=y*(1-air)+.32*air;
 z=z*(1-crouch)+.55*crouch;y=y*(1-crouch)+.10*crouch;
 return {phase,stance:stance&&air===0&&crouch===0,z,y,air};
}
export function slideBlend(remaining:number,age=Math.max(0,.83-remaining)){return remaining>0?smooth(age/.12)*smooth(remaining/.10):0;}
export function reactionEnvelope(age:number,duration=1.1){return age<0?0:smooth(age/.12)*(1-smooth((age-.44)/(duration-.44)));}
export function crouchPose(weight:number,running=true){
 const w=clamp(weight,0,1);return {bodyX:-1.18*w-(running?.10:0),bodyY:.09*w,headY:1.91-.65*w,headZ:-.16*w,headX:1.24*w,tailX:1.26*w};
}
