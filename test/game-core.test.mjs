import assert from "node:assert/strict";
import test from "node:test";
import { MAX_GRIT, applyPickup, createWave, courseFor, crossesRunner, resolvePickup, scoreChase, multiplierFor, objectiveFor, objectiveProgress, phaseFor, sanitizeStats } from "../game-core.js";

const fresh = () => ({ score: 0, streak: 0, bestStreak: 0, grit: MAX_GRIT, signals: 0, hits: 0 });

test("daily courses repeat exactly, change by day, and give players a safe opening", () => {
  const course = courseFor(20715);
  assert.deepEqual(courseFor(20715), course);
  assert.notDeepEqual(courseFor(20716), course);
  assert.equal(course[0].items[0].lane, 1);
  assert.ok(course.filter(wave => wave.at < 6).every(wave => wave.items.every(item => item.type === "signal")));
  for (const wave of course) {
    assert.ok(wave.items.some(item => item.type !== "noise"));
    assert.ok(wave.items.every(item => item.lane >= 0 && item.lane <= 2));
    assert.ok(.94 / wave.speed > 1.5, "at least 1.5 seconds to read a newly spawned threat");
    assert.ok(wave.at + 1.12 / wave.speed < 60, "every pickup can arrive before the round ends");
  }
});

test("collision happens once at the visible line, including a frame crossing it", () => {
  assert.equal(crossesRunner(.81, .83), false);
  assert.equal(crossesRunner(.83, .84), true);
  assert.equal(crossesRunner(.82, .88), true);
  assert.equal(crossesRunner(.84, .87), false);
});

test("recovery prevents stacked damage but still permits scoring and later hits", () => {
  const first = resolvePickup(fresh(), "noise", 10, 0);
  assert.equal(first.run.grit, 2);
  const second = resolvePickup(first.run, "noise", 10.4, first.protectedUntil);
  assert.equal(second.ignored, true);
  assert.equal(second.run.hits, 1);
  const signal = resolvePickup(second.run, "signal", 10.5, second.protectedUntil);
  assert.equal(signal.run.score, 100);
  assert.equal(resolvePickup(signal.run, "noise", 10.91, signal.protectedUntil).run.grit, 1);
});

test("score chase advances medals and offers an attainable next target", () => {
  assert.deepEqual(scoreChase(2500, 2700), { medal: "FIRST DIG", target: 2800, label: "PERSONAL BEST", gap: 300 });
  assert.equal(scoreChase(3000).medal, "BRONZE");
  assert.equal(scoreChase(8000).medal, "SILVER");
  assert.equal(scoreChase(15000).medal, "GOLD");
  for (const score of [0, 3000, 8000, 15000, 25000]) assert.ok(scoreChase(score).gap > 0);
});

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
