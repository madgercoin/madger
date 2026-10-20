/** Companion state is deterministic and saved with the run. Rendering never grants rewards. */
export type CompanionId = 'snow' | 'gorilla' | 'bot';
export type CompanionPickup = 'snow-white' | 'gorilla-white' | 'madger-bot';
export type CompanionRoute = 'main' | 'hollow' | 'grotto' | 'rootway' | 'ridge' | 'deep' | 'mosswalk' | 'root-arch' | 'log-crossing' | 'causeway' | 'watchtower' | 'gearworks' | 'mudslide' | 'crystal-vein' | 'ancient-vault';
export const COMPANION_IDS: readonly CompanionId[] = ['snow', 'gorilla', 'bot'];
export const COMPANIONS = {
  snow: { name: 'Snow White', role: 'ATTACK', duration: 18, cooldown: 1.8, actionDuration: .90, impactAt: .40, color: '#D990B0', item: 'snow-white', offset: -1.35,
    description: 'Runs alongside Madger and leaps at approaching drones and crates. Her attacks clear a threat in your path and award 125 points. Gaps, steam and stone still require your attention.' },
  gorilla: { name: 'Gorilla White', role: 'DEFENSE', duration: 16, cooldown: .80, actionDuration: .80, impactAt: 0, color: '#DFE6EE', item: 'gorilla-white', offset: 1.55,
    description: 'Provides three bodyguard saves, including catching Madger at a broken ledge. Each save preserves your grit and shield. Protection ends when time or guard charges run out.' },
  bot: { name: 'Madger Bot', role: 'TECH BOOST', duration: 14, cooldown: 3.0, actionDuration: 1.0, impactAt: .35, color: '#73DFEE', item: 'madger-bot', offset: .75,
    description: 'Adds 45 burst energy on arrival, recharges energy, magnetizes pickups and disables nearby electronic traps. A burst activated with Bot lasts 1.2 seconds longer.' },
} as const;
export const COMPANION_PICKUPS: Record<CompanionPickup, CompanionId> = { 'snow-white': 'snow', 'gorilla-white': 'gorilla', 'madger-bot': 'bot' };
export function companionId(kind: string): CompanionId | null {
  return Object.prototype.hasOwnProperty.call(COMPANION_PICKUPS, kind) ? COMPANION_PICKUPS[kind as CompanionPickup] : null;
}
export type CompanionState = {
  timeLeft: number; joinedAt: number; lastActionAt: number; cooldown: number; charges: number;
  arrivals: number; actions: number; followX: number; followVx: number;
  targetId: number | null; targetD: number; targetX: number; targetRoute: CompanionRoute;
  actionRemaining: number; resolved: boolean;
};
export type CompanionTeam = Record<CompanionId, CompanionState>;
export function freshCompanion(): CompanionState {
  return { timeLeft: 0, joinedAt: -100, lastActionAt: -100, cooldown: 0, charges: 0, arrivals: 0, actions: 0,
    followX: 0, followVx: 0, targetId: null, targetD: 0, targetX: 0, targetRoute: 'main', actionRemaining: 0, resolved: false };
}
export function freshCompanions(): CompanionTeam { return { snow: freshCompanion(), gorilla: freshCompanion(), bot: freshCompanion() }; }
const limit = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const finite = (v: unknown, lo: number, hi: number, fallback = 0) => typeof v === 'number' && Number.isFinite(v) ? limit(v, lo, hi) : fallback;
const count = (v: unknown, max: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? Math.min(max, v) : 0;
export function clearCompanionAction(c: CompanionState) { c.targetId = null; c.actionRemaining = 0; c.resolved = false; }
/** Existing version-1 checkpoints gain an empty team; invalid targets cannot be replayed. */
export function sanitizeCompanions(input: unknown, validIds: Set<number>, time: number): CompanionTeam {
  const team = freshCompanions();
  if (!input || typeof input !== 'object') return team;
  const raw = input as Partial<Record<CompanionId, Partial<CompanionState>>>;
  for (const id of COMPANION_IDS) {
    const p = raw[id]; if (!p || typeof p !== 'object') continue;
    const c = team[id], meta = COMPANIONS[id];
    Object.assign(c, { timeLeft: finite(p.timeLeft, 0, meta.duration), joinedAt: finite(p.joinedAt, -100, time, -100),
      lastActionAt: finite(p.lastActionAt, -100, time, -100), cooldown: finite(p.cooldown, 0, meta.cooldown),
      charges: id === 'gorilla' ? count(p.charges, 3) : 0, arrivals: count(p.arrivals, 100), actions: count(p.actions, 1000),
      followX: finite(p.followX, -5, 5), followVx: finite(p.followVx, -25, 25), targetD: finite(p.targetD, 0, 1080),
      targetX: finite(p.targetX, -2.6, 2.6), targetRoute: ['main', 'hollow', 'grotto', 'rootway', 'ridge', 'deep', 'mosswalk', 'root-arch', 'log-crossing', 'causeway', 'watchtower', 'gearworks', 'mudslide', 'crystal-vein', 'ancient-vault'].includes(p.targetRoute ?? '') ? p.targetRoute : 'main',
      actionRemaining: finite(p.actionRemaining, 0, meta.actionDuration), resolved: p.resolved === true,
      targetId: Number.isSafeInteger(p.targetId) && validIds.has(p.targetId as number) ? p.targetId : null });
    if (c.timeLeft <= 0) { c.charges = 0; clearCompanionAction(c); }
    if (id !== 'gorilla' && c.targetId === null) clearCompanionAction(c);
  }
  return team;
}
/** Continuous quadruped contact/swing pose; stance travels with the ground. */
export function pawCycle(distance: number, phaseOffset: number, running: boolean) {
  const stride = 3.4, contact = .22;
  const phase = ((distance / stride + phaseOffset) % 1 + 1) % 1;
  if (!running) return { z: 0, y: .10, stance: true };
  if (phase < contact) return { z: -.38 + phase * stride, y: .10, stance: true };
  const u = (phase - contact) / (1 - contact), ease = u * u * (3 - 2 * u);
  return { z: .368 - .748 * ease, y: .10 + Math.sin(Math.PI * u) * .28, stance: false };
}
export function actionProgress(id: CompanionId, c: CompanionState) { return c.actionRemaining > 0 ? limit(1 - c.actionRemaining / COMPANIONS[id].actionDuration, 0, 1) : 0; }
export function arrivalWeight(c: CompanionState, time: number) { const v = limit((time - c.joinedAt) / .55, 0, 1); return v * v * (3 - 2 * v); }
