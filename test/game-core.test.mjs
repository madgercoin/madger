import assert from "node:assert/strict";
import test from "node:test";
import { MAX_GRIT, applyPickup, createWave, multiplierFor, objectiveFor, objectiveProgress, phaseFor, sanitizeStats } from "../game-core.js";

const fresh = () => ({ score: 0, streak: 0, bestStreak: 0, grit: MAX_GRIT, signals: 0, hits: 0 });

test("signal streaks increase scoring multiplier at five-pickup boundaries", () => {
  let run = fresh();
  for (let index = 0; index < 5; index += 1) run = applyPickup(run, "signal");
  assert.equal(multiplierFor(run.streak), 2);
  assert.equal(run.score, 600);
  assert.equal(run.bestStreak, 5);
});

test("noise consumes grit and resets the active streak without erasing the best", () => {
  const run = applyPickup({ ...fresh(), streak: 7, bestStreak: 7 }, "noise");
  assert.equal(run.grit, 2);
  assert.equal(run.streak, 0);
  assert.equal(run.bestStreak, 7);
  assert.equal(run.hits, 1);
});

test("boosts restore grit only up to the cap and always award points", () => {
  assert.deepEqual(applyPickup({ ...fresh(), grit: 2 }, "boost"), { ...fresh(), grit: 3, score: 250 });
  assert.equal(applyPickup(fresh(), "boost").grit, MAX_GRIT);
});

test("the run advances through three explicit difficulty phases", () => {
  assert.equal(phaseFor(0).id, "surface");
  assert.equal(phaseFor(20).id, "deep");
  assert.equal(phaseFor(40).id, "bedrock");
  assert.ok(phaseFor(40).speed > phaseFor(20).speed);
  assert.ok(phaseFor(40).interval < phaseFor(20).interval);
});

test("daily objectives rotate deterministically and report bounded progress", () => {
  assert.equal(objectiveFor(0).id, "signals");
  assert.equal(objectiveFor(1).id, "score");
  assert.equal(objectiveFor(2).id, "streak");
  assert.deepEqual(objectiveProgress(objectiveFor(0), { ...fresh(), signals: 30 }), { value: 30, complete: true, ratio: 1 });
});

test("late-game wall waves always leave one signal lane between two threats", () => {
  const values = [0.4, 0.9];
  const wave = createWave(() => values.shift(), 50);
  assert.equal(wave.length, 3);
  assert.equal(wave.filter(item => item.type === "signal").length, 1);
  assert.equal(wave.filter(item => item.type === "noise").length, 2);
  assert.deepEqual(wave.map(item => item.lane), [0, 1, 2]);
});

test("persisted statistics are sanitized and field marks are deduplicated", () => {
  assert.deepEqual(sanitizeStats({ runs: -4, signals: "12", bestStreak: 8, marks: ["2026-09-12", "bad", "2026-09-12"] }), {
    runs: 0,
    signals: 0,
    bestStreak: 8,
    marks: ["2026-09-12"]
  });
  assert.deepEqual(sanitizeStats(null), { runs: 0, signals: 0, bestStreak: 0, marks: [] });
});
