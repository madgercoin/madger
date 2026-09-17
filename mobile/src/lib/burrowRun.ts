export const ROUND_SECONDS = 60;
export const MAX_GRIT = 3;

export type PickupType = 'signal' | 'noise' | 'boost';
export type RunState = { score: number; streak: number; bestStreak: number; grit: number; signals: number; hits: number };
export type FieldRecord = { runs: number; signals: number; bestScore: number; bestStreak: number; marks: string[] };
export type Objective = { id: 'signals' | 'score' | 'streak'; label: string; target: number };
export type WaveItem = { lane: number; type: PickupType; offset: number };

export const freshRun = (): RunState => ({ score: 0, streak: 0, bestStreak: 0, grit: MAX_GRIT, signals: 0, hits: 0 });
export const emptyRecord = (): FieldRecord => ({ runs: 0, signals: 0, bestScore: 0, bestStreak: 0, marks: [] });

export function multiplierFor(streak: number) { return Math.min(5, 1 + Math.floor(Math.max(0, streak) / 5)); }

export function phaseFor(elapsed: number) {
  if (elapsed >= 40) return { id: 'bedrock', label: 'BEDROCK', speed: 0.62, interval: 0.58 } as const;
  if (elapsed >= 20) return { id: 'deep', label: 'DEEP BURROW', speed: 0.5, interval: 0.72 } as const;
  return { id: 'surface', label: 'UPPER TUNNEL', speed: 0.39, interval: 0.88 } as const;
}

export function applyPickup(run: RunState, type: PickupType): RunState {
  if (type === 'signal') {
    const streak = run.streak + 1;
    return { ...run, streak, signals: run.signals + 1, bestStreak: Math.max(run.bestStreak, streak), score: run.score + 100 * multiplierFor(streak) };
  }
  if (type === 'boost') return { ...run, grit: Math.min(MAX_GRIT, run.grit + 1), score: run.score + 250 };
  return { ...run, grit: Math.max(0, run.grit - 1), streak: 0, hits: run.hits + 1 };
}

export function objectiveFor(dayNumber: number): Objective {
  return [
    { id: 'signals', label: 'Recover 18 signals', target: 18 },
    { id: 'score', label: 'Score 3,000 points', target: 3000 },
    { id: 'streak', label: 'Build a 10-signal streak', target: 10 },
  ][Math.abs(dayNumber) % 3] as Objective;
}

export function objectiveValue(objective: Objective, run: RunState) {
  if (objective.id === 'signals') return run.signals;
  if (objective.id === 'score') return run.score;
  return run.bestStreak;
}

export function createWave(random = Math.random, elapsed = 0): WaveItem[] {
  const signalLane = Math.floor(random() * 3);
  const roll = random();
  if (roll < 0.1) return [{ lane: signalLane, type: 'boost', offset: 0 }];
  if (roll < 0.42) {
    const noiseLane = (signalLane + 1 + Math.floor(random() * 2)) % 3;
    return [{ lane: signalLane, type: 'signal', offset: 0 }, { lane: noiseLane, type: 'noise', offset: 0 }];
  }
  if (roll < 0.72 || elapsed / ROUND_SECONDS < 0.3) return [{ lane: signalLane, type: 'signal', offset: 0 }, { lane: (signalLane + 1) % 3, type: 'signal', offset: -0.18 }];
  return [0, 1, 2].map(lane => ({ lane, type: lane === signalLane ? 'signal' : 'noise', offset: 0 }));
}

export function sanitizeRecord(candidate: unknown): FieldRecord {
  const value = candidate && typeof candidate === 'object' ? candidate as Partial<FieldRecord> : {};
  const number = (field: keyof FieldRecord) => Number.isSafeInteger(value[field]) && Number(value[field]) >= 0 ? Number(value[field]) : 0;
  return {
    runs: number('runs'), signals: number('signals'), bestScore: number('bestScore'), bestStreak: number('bestStreak'),
    marks: Array.isArray(value.marks) ? [...new Set(value.marks.filter(mark => typeof mark === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(mark)))].slice(-30) : [],
  };
}
