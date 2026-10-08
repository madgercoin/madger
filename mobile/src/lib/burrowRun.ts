export const ROUND_SECONDS = 60;
export const MAX_GRIT = 3;

export const RUNNER_Y = 0.84;
export const BURST_COST = 100;
export type PickupType = "signal" | "noise" | "boost" | "shield" | "magnet";
export type RunState = {
  score: number;
  streak: number;
  bestStreak: number;
  grit: number;
  signals: number;
  hits: number;
  energy: number;
  burst: number;
  shield: number;
  magnet: number;
  invulnerable: number;
  dodges: number;
};
export type FieldRecord = {
  runs: number;
  signals: number;
  bestScore: number;
  bestStreak: number;
  marks: string[];
};
export type Objective = {
  id: "signals" | "score" | "streak";
  label: string;
  target: number;
};
export type WaveItem = { lane: number; type: PickupType; offset: number };

export const freshRun = (): RunState => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  grit: MAX_GRIT,
  signals: 0,
  hits: 0,
  energy: 0,
  burst: 0,
  shield: 0,
  magnet: 0,
  invulnerable: 0,
  dodges: 0,
});
export const emptyRecord = (): FieldRecord => ({
  runs: 0,
  signals: 0,
  bestScore: 0,
  bestStreak: 0,
  marks: [],
});

export function multiplierFor(streak: number) {
  return Math.min(5, 1 + Math.floor(Math.max(0, streak) / 5));
}

export function phaseFor(elapsed: number) {
  if (elapsed >= 40)
    return {
      id: "bedrock",
      label: "BEDROCK",
      speed: 0.53,
      interval: 0.95,
      accent: "#FFAD66",
      number: 3,
    } as const;
  if (elapsed >= 20)
    return {
      id: "deep",
      label: "DEEP BURROW",
      speed: 0.43,
      interval: 1.15,
      accent: "#7DDFC8",
      number: 2,
    } as const;
  return {
    id: "surface",
    label: "UPPER TUNNEL",
    speed: 0.34,
    interval: 1.4,
    accent: "#FFC928",
    number: 1,
  } as const;
}

export function applyPickup(run: RunState, type: PickupType): RunState {
  if (type === "signal") {
    const streak = run.streak + 1;
    return {
      ...run,
      streak,
      signals: run.signals + 1,
      energy: Math.min(BURST_COST, run.energy + 8),
      bestStreak: Math.max(run.bestStreak, streak),
      score: run.score + 100 * multiplierFor(streak) * (run.burst > 0 ? 2 : 1),
    };
  }
  if (type === "boost")
    return {
      ...run,
      grit: Math.min(MAX_GRIT, run.grit + 1),
      score: run.score + 250,
    };
  if (type === "shield") return { ...run, shield: 8, score: run.score + 150 };
  if (type === "magnet") return { ...run, magnet: 6, score: run.score + 150 };
  if (run.burst > 0) return { ...run, score: run.score + 100 };
  if (run.invulnerable > 0) return run;
  if (run.shield > 0) return { ...run, shield: 0, invulnerable: 1.1 };
  return {
    ...run,
    grit: Math.max(0, run.grit - 1),
    streak: 0,
    hits: run.hits + 1,
    invulnerable: 1.1,
  };
}

export function activateBurst(run: RunState): RunState {
  return run.energy >= BURST_COST && run.burst <= 0
    ? { ...run, energy: 0, burst: 3 }
    : run;
}

export function objectiveFor(dayNumber: number): Objective {
  return [
    { id: "signals", label: "Recover 18 signals", target: 18 },
    { id: "score", label: "Score 3,000 points", target: 3000 },
    { id: "streak", label: "Build a 10-signal streak", target: 10 },
  ][Math.abs(dayNumber) % 3] as Objective;
}

export function objectiveValue(objective: Objective, run: RunState) {
  if (objective.id === "signals") return run.signals;
  if (objective.id === "score") return run.score;
  return run.bestStreak;
}

export function createWave(random = Math.random, elapsed = 0): WaveItem[] {
  const signalLane = Math.min(2, Math.floor(random() * 3));
  // The first six seconds teach collecting before any hazards appear.
  const trail: WaveItem[] = [0, -0.15, -0.3].map((offset) => ({
    lane: signalLane,
    type: "signal",
    offset,
  }));
  if (elapsed < 6) return trail;
  const roll = random();
  if (roll < 0.18)
    return [
      {
        lane: signalLane,
        type: roll < 0.06 ? "boost" : roll < 0.12 ? "shield" : "magnet",
        offset: 0,
      },
    ];
  if (roll < 0.6)
    return [...trail, { lane: (signalLane + 1) % 3, type: "noise", offset: 0 }];
  if (roll < 0.8 || elapsed < 20)
    return [
      { lane: signalLane, type: "signal", offset: 0 },
      { lane: (signalLane + 1) % 3, type: "signal", offset: -0.2 },
      { lane: (signalLane + 2) % 3, type: "signal", offset: -0.4 },
    ];
  return [0, 1, 2].map((lane) => ({
    lane,
    type: lane === signalLane ? "signal" : "noise",
    offset: 0,
  }));
}

export type Entity = {
  id: number;
  lane: number;
  type: PickupType;
  y: number;
  passed: boolean;
};
export type GameEvent = {
  kind: "pickup" | "hit" | "blocked" | "dodge" | "phase" | "burst-ready";
  type?: PickupType;
  points?: number;
};
export type Simulation = {
  run: RunState;
  elapsed: number;
  spawnIn: number;
  entities: Entity[];
  nextId: number;
  lane: number;
};
export const freshSimulation = (): Simulation => ({
  run: freshRun(),
  elapsed: 0,
  spawnIn: 0.35,
  entities: [],
  nextId: 0,
  lane: 1,
});

export function lanePosition(lane: number, depth: number) {
  return 0.5 + (lane - 1) * (0.09 + 0.25 * Math.max(0, Math.min(1, depth)));
}

export function stepSimulation(
  state: Simulation,
  seconds: number,
  random = Math.random,
): { state: Simulation; events: GameEvent[]; ended: "time" | "grit" | null } {
  if (state.run.grit <= 0) return { state, events: [], ended: "grit" };
  if (state.elapsed >= ROUND_SECONDS)
    return { state, events: [], ended: "time" };
  const delta = Math.max(
    0,
    Math.min(0.1, seconds, ROUND_SECONDS - state.elapsed),
  );
  const elapsed = state.elapsed + delta;
  const phase = phaseFor(elapsed);
  const events: GameEvent[] = [];
  if (phase.id !== phaseFor(state.elapsed).id) events.push({ kind: "phase" });
  let run = {
    ...state.run,
    burst: Math.max(0, state.run.burst - delta),
    shield: Math.max(0, state.run.shield - delta),
    magnet: Math.max(0, state.run.magnet - delta),
    invulnerable: Math.max(0, state.run.invulnerable - delta),
  };
  let spawnIn = state.spawnIn - delta;
  let nextId = state.nextId;
  const items = [...state.entities];
  if (spawnIn <= 0) {
    items.push(
      ...createWave(random, elapsed).map((item) => ({
        ...item,
        id: nextId++,
        y: -0.05 + item.offset,
        passed: false,
      })),
    );
    spawnIn = phase.interval;
  }
  const entities: Entity[] = [];
  for (const entity of items) {
    const moved = { ...entity, y: entity.y + phase.speed * delta };
    const inRange = moved.y >= RUNNER_Y - 0.045 && entity.y <= RUNNER_Y + 0.045;
    const collected =
      inRange &&
      (entity.lane === state.lane ||
        (entity.type === "signal" && run.magnet > 0));
    if (collected) {
      const previous = run;
      run = applyPickup(run, entity.type);
      events.push({
        kind:
          entity.type !== "noise"
            ? "pickup"
            : run.hits > previous.hits
              ? "hit"
              : "blocked",
        type: entity.type,
        points: run.score - previous.score,
      });
      if (previous.energy < BURST_COST && run.energy >= BURST_COST)
        events.push({ kind: "burst-ready" });
      if (run.grit <= 0) break;
      continue;
    }
    if (!moved.passed && moved.y > RUNNER_Y + 0.045) {
      moved.passed = true;
      if (moved.type === "noise" && Math.abs(moved.lane - state.lane) === 1) {
        run = { ...run, score: run.score + 50, dodges: run.dodges + 1 };
        events.push({ kind: "dodge", points: 50 });
      }
    }
    if (moved.y <= 1.1) entities.push(moved);
  }
  return {
    state: { ...state, run, elapsed, spawnIn, entities, nextId },
    events,
    ended: run.grit <= 0 ? "grit" : elapsed >= ROUND_SECONDS ? "time" : null,
  };
}

export function runRank(run: RunState) {
  if (run.score >= 15000 && run.hits === 0) return "S";
  if (run.score >= 10000) return "A";
  if (run.score >= 5000) return "B";
  return "C";
}

export function sanitizeRecord(candidate: unknown): FieldRecord {
  const value =
    candidate && typeof candidate === "object"
      ? (candidate as Partial<FieldRecord>)
      : {};
  const number = (field: keyof FieldRecord) =>
    Number.isSafeInteger(value[field]) && Number(value[field]) >= 0
      ? Number(value[field])
      : 0;
  return {
    runs: number("runs"),
    signals: number("signals"),
    bestScore: number("bestScore"),
    bestStreak: number("bestStreak"),
    marks: Array.isArray(value.marks)
      ? [
          ...new Set(
            value.marks.filter(
              (mark) =>
                typeof mark === "string" && /^\d{4}-\d{2}-\d{2}$/.test(mark),
            ),
          ),
        ].slice(-30)
      : [],
  };
}
