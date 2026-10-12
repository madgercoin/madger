import { freshRun, type Simulation } from "./burrowRun";

export type RunCheckpoint = {
  version: 1; id: string; mode: "classic" | "daily"; day: string;
  stage: "countdown" | "running"; countdown: number; randomState: number;
  simulation: Simulation;
};

const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, min: number, max: number): value is number =>
  finite(value, min, max) && Number.isSafeInteger(value);

// Recovery accepts a complete bounded snapshot, never partial/corrupt gameplay.
export function sanitizeCheckpoint(value: unknown): RunCheckpoint | null {
  if (!value || typeof value !== "object") return null;
  const c = value as RunCheckpoint, s = c.simulation, r = s?.run;
  if (c.version !== 1 || typeof c.id !== "string" || !c.id || c.id.length > 100 ||
      !["classic", "daily"].includes(c.mode) || !["countdown", "running"].includes(c.stage) ||
      typeof c.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.day) ||
      !Number.isFinite(Date.parse(c.day)) || new Date(c.day).toISOString().slice(0, 10) !== c.day ||
      !finite(c.countdown, 0, 2.4) || (c.stage === "countdown" && c.countdown <= 0) ||
      !integer(c.randomState, 0, 4294967295) || !s || !r ||
      !finite(s.elapsed, 0, 60) || s.elapsed >= 60 ||
      !finite(s.spawnIn, 0, 1.4) || !integer(s.lane, 0, 2) || !integer(s.nextId, 0, 1000) ||
      !Array.isArray(s.entities) || s.entities.length > 128) return null;
  for (const name of ["score", "signals", "streak", "bestStreak", "hits", "dodges"] as const)
    if (!integer(r[name], 0, Number.MAX_SAFE_INTEGER)) return null;
  if (!integer(r.grit, 1, 3) || !integer(r.energy, 0, 100) || r.streak > r.bestStreak || r.bestStreak > r.signals ||
      !finite(r.burst, 0, 3) || !finite(r.shield, 0, 8) || !finite(r.magnet, 0, 6) || !finite(r.invulnerable, 0, 1.1)) return null;
  const ids = new Set<number>();
  for (const item of s.entities) {
    if (!item || !integer(item.id, 0, s.nextId - 1) || ids.has(item.id) ||
        !integer(item.lane, 0, 2) || !["signal", "noise", "boost", "shield", "magnet"].includes(item.type) ||
        !finite(item.y, -1, 1.1) || typeof item.passed !== "boolean") return null;
    ids.add(item.id);
  }
  if (c.stage === "countdown") {
    const initial = freshRun();
    if (s.elapsed !== 0 || s.entities.length !== 0 || s.nextId !== 0 ||
        (Object.keys(initial) as (keyof typeof initial)[]).some(key => r[key] !== initial[key])) return null;
  }
  return { version: 1, id: c.id, mode: c.mode, day: c.day, stage: c.stage,
    countdown: c.countdown, randomState: c.randomState,
    simulation: { elapsed: s.elapsed, spawnIn: s.spawnIn, lane: s.lane, nextId: s.nextId,
      run: { score: r.score, signals: r.signals, streak: r.streak, bestStreak: r.bestStreak, hits: r.hits, dodges: r.dodges,
        grit: r.grit, energy: r.energy, burst: r.burst, shield: r.shield, magnet: r.magnet, invulnerable: r.invulnerable },
      entities: s.entities.map(item => ({ id: item.id, lane: item.lane, type: item.type, y: item.y, passed: item.passed })) },
  };
}
