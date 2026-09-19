export const ROUND_SECONDS = 60;
export const MAX_GRIT = 3;
export const CATCH_LINE = .84;
export const HIT_RECOVERY = .9;

export function multiplierFor(streak) {
  return Math.min(5, 1 + Math.floor(Math.max(0, streak) / 5));
}

export function phaseFor(elapsed) {
  if (elapsed >= 40) return { id: "bedrock", label: "BEDROCK", speed: .57, interval: .58 };
  if (elapsed >= 20) return { id: "deep", label: "DEEP BURROW", speed: .46, interval: .72 };
  return { id: "surface", label: "UPPER TUNNEL", speed: .36, interval: .88 };
}

export function applyPickup(run, type) {
  const next = { ...run };
  if (type === "signal") {
    next.streak += 1;
    next.signals += 1;
    next.bestStreak = Math.max(next.bestStreak, next.streak);
    next.score += 100 * multiplierFor(next.streak);
  } else if (type === "boost") {
    next.grit = Math.min(MAX_GRIT, next.grit + 1);
    next.score += 250;
  } else if (type === "noise") {
    next.grit = Math.max(0, next.grit - 1);
    next.streak = 0;
    next.hits += 1;
  }
  return next;
}

export function objectiveFor(dayNumber) {
  const objectives = [
    { id: "signals", label: "Recover 18 signals", target: 18, value: run => run.signals },
    { id: "score", label: "Score 3,000 points", target: 3000, value: run => run.score },
    { id: "streak", label: "Build a 10-signal streak", target: 10, value: run => run.bestStreak }
  ];
  return objectives[Math.abs(dayNumber) % objectives.length];
}

export function objectiveProgress(objective, run) {
  const value = objective.value(run);
  return { value, complete: value >= objective.target, ratio: Math.min(1, value / objective.target) };
}

export function sanitizeStats(candidate) {
  const value = candidate && typeof candidate === "object" ? candidate : {};
  const number = field => Number.isSafeInteger(value[field]) && value[field] >= 0 ? value[field] : 0;
  return {
    runs: number("runs"),
    signals: number("signals"),
    bestStreak: number("bestStreak"),
    marks: Array.isArray(value.marks) ? [...new Set(value.marks.filter(mark => /^\d{4}-\d{2}-\d{2}$/.test(mark)))].slice(-30) : []
  };
}

export function createWave(random = Math.random, elapsed = 0) {
  const signalLane = Math.floor(random() * 3);
  const difficulty = elapsed / ROUND_SECONDS;
  const roll = random();
  if (elapsed < 6) return [{ lane: signalLane, type: "signal", offset: 0 }];
  if (roll < .1) return [{ lane: signalLane, type: "boost", offset: 0 }];
  if (roll < .42) {
    const noiseLane = (signalLane + 1 + Math.floor(random() * 2)) % 3;
    return [{ lane: signalLane, type: "signal", offset: 0 }, { lane: noiseLane, type: "noise", offset: 0 }];
  }
  if (roll < .72 || difficulty < .3) {
    return [{ lane: signalLane, type: "signal", offset: 0 }, { lane: (signalLane + 1) % 3, type: "signal", offset: -.18 }];
  }
  return [0, 1, 2].map(lane => ({ lane, type: lane === signalLane ? "signal" : "noise", offset: 0 }));
}

// Precompute the course so frame rate and player input cannot alter a retry.
export function courseFor(dayNumber) {
  let seed = dayNumber >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const course = [];
  for (let at = .65; at < ROUND_SECONDS - 3; ) {
    const phase = phaseFor(at);
    const items = createWave(random, at);
    if (course.length === 0) items[0].lane = 1;
    course.push({ at, speed: phase.speed, items });
    at += phase.interval + random() * .24;
  }
  return course;
}

export function crossesRunner(previous, next) { return previous < CATCH_LINE && next >= CATCH_LINE; }

export function resolvePickup(run, type, elapsed, protectedUntil) {
  if (type === "noise" && elapsed < protectedUntil) return { run, protectedUntil, ignored: true };
  return { run: applyPickup(run, type), protectedUntil: type === "noise" ? elapsed + HIT_RECOVERY : protectedUntil, ignored: false };
}

export function scoreChase(score, previousBest = 0) {
  const medals = [{ label: "BRONZE", score: 3000 }, { label: "SILVER", score: 8000 }, { label: "GOLD", score: 15000 }];
  const medal = [...medals].reverse().find(item => score >= item.score)?.label || "FIRST DIG";
  const nextMedal = medals.find(item => item.score > score);
  const personalTarget = previousBest > score ? previousBest + 100 : Infinity;
  const target = Math.min(nextMedal?.score ?? Math.ceil((score + 1) / 5000) * 5000, personalTarget);
  return { medal, target, label: target === personalTarget ? "PERSONAL BEST" : nextMedal?.label || "DEEPER RECORD", gap: target - score };
}
