import type { Expedition } from './core';
/** Read-only render diagnostics: no setters, commands, checkpoint imports or test hooks. */
export function renderSnapshot(s: Expedition, hint?: string) {
  return {runId:s.id,mode:s.mode,distance_m:Math.floor(s.distance),lane:s.lane,
    action:s.y>.1?'jumping':s.slide>0?'burrowing':'running',route:s.route,score:s.score,...(s.lastJumpAt===undefined?{}:{jumpAt:s.lastJumpAt}),...(hint===undefined?{}:{hint})};
}
export type RenderedSnapshot = ReturnType<typeof renderSnapshot> & {at:number};

/** Keep live entrance input visible to external observers without changing play.
 * The usual 500ms heartbeat can skip a three-metre input approach entirely.
 * Only the two short fork approaches need denser, still post-draw evidence.
 * This schedules diagnostics only: it never advances, pauses or steers a run.
 */
export function renderObservationInterval(s: Pick<Expedition,'board'|'mode'|'distance'>) {
  const nearEntrance=(s.distance>=120&&s.distance<141)||(s.distance>=435&&s.distance<456);
  return s.board==='overgrown'&&s.mode==='running'&&nearEntrance?80:500;
}
