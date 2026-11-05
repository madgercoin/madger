import type { Expedition } from './core';
/** Read-only render diagnostics: no setters, commands, checkpoint imports or test hooks. */
export function renderSnapshot(s: Expedition, hint?: string) {
  return {runId:s.id,mode:s.mode,distance_m:Math.floor(s.distance),lane:s.lane,
    action:s.y>.1?'jumping':s.slide>0?'burrowing':'running',route:s.route,score:s.score,...(s.lastJumpAt===undefined?{}:{jumpAt:s.lastJumpAt}),...(hint===undefined?{}:{hint})};
}
export type RenderedSnapshot = ReturnType<typeof renderSnapshot> & {at:number};
