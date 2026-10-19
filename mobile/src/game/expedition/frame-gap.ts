/** App RAF policy only. core.advance retains its strict 400 ms safety guard.
 * An isolated moderate gap buys no game time. A healthy recovery frame also
 * buys no time; only the following interval may advance the simulation.
 */
export const SAFE_FRAME_SECONDS=.4;
export const HARD_FRAME_SECONDS=SAFE_FRAME_SECONDS*2;
export const REPEATED_STALL_WINDOW_SECONDS=HARD_FRAME_SECONDS*2;
export type FrameGapGuard={recovering:boolean;lastDiscardAt:number|null};
export type FrameGapDecision='advance'|'discard'|'recover'|'pause';
export function createFrameGapGuard():FrameGapGuard{return {recovering:false,lastDiscardAt:null};}
export function resetFrameGapGuard(guard:FrameGapGuard){guard.recovering=false;guard.lastDiscardAt=null;}
export function classifyFrameGap(guard:FrameGapGuard,seconds:number,now:number,active:boolean):FrameGapDecision{
 if(!active){resetFrameGapGuard(guard);return 'advance';}
 if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(now)){resetFrameGapGuard(guard);return 'pause';}
 if(seconds>=HARD_FRAME_SECONDS){resetFrameGapGuard(guard);return 'pause';}
 if(seconds>SAFE_FRAME_SECONDS){
  if(guard.recovering||(guard.lastDiscardAt!==null&&now-guard.lastDiscardAt<=REPEATED_STALL_WINDOW_SECONDS)){
   resetFrameGapGuard(guard);return 'pause';
  }
  guard.recovering=true;guard.lastDiscardAt=now;return 'discard';
 }
 if(guard.recovering){guard.recovering=false;return 'recover';}
 if(guard.lastDiscardAt!==null&&now-guard.lastDiscardAt>REPEATED_STALL_WINDOW_SECONDS)guard.lastDiscardAt=null;
 return 'advance';
}
