import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import ts from "typescript";
const directory = await mkdtemp(join(tmpdir(), "madger-profile-tests-"));
after(() => rm(directory, { recursive: true, force: true }));
for (const name of ["burrowRun", "runRecovery", "gameProfile", "gameStore"]) {
  const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"');
  await writeFile(join(directory, name + ".mjs"), compiled);
}
const p = await import(pathToFileURL(join(directory, "gameProfile.mjs")));
const { createGameStore } = await import(pathToFileURL(join(directory, "gameStore.mjs")));
const rules = await import(pathToFileURL(join(directory, "burrowRun.mjs")));
const { sanitizeCheckpoint } = await import(pathToFileURL(join(directory, "runRecovery.mjs")));
const run = (id, score = 5000, mode = "classic", day = "2026-10-10") => p.makeSavedRun({ ...rules.freshRun(), score, signals: 30, bestStreak: 15 }, { id, mode, day, finishedAt: `${day}T12:00:00.000Z`, seconds: 60, reason: "time" });
const memoryStorage = () => {
  const values = new Map();
  return { values, async getItem(key) { return values.get(key) ?? null; }, async multiSet(entries) { for (const [key, value] of entries) values.set(key, value); } };
};

const checkpoint = (id = "interrupted") => ({ version: 1, id, mode: "daily", day: "2026-10-10", stage: "running", countdown: 0,
  randomState: p.seedForDay("2026-10-10"), simulation: { ...rules.freshSimulation(), elapsed: 12,
    run: { ...rules.freshRun(), score: 600, signals: 5, streak: 5, bestStreak: 5, shield: 4, magnet: 2, energy: 40 } } });

test("recovery restores route RNG, powers and state without banking progression", async () => {
  const storage = memoryStorage(), first = createGameStore(storage);
  await first.init();
  const random = p.randomFromSeed(1234);
  for (let i = 0; i < 19; i++) random();
  const value = { ...checkpoint(), randomState: random.getState() };
  await first.checkpointRun(value);
  assert.equal(first.getSnapshot().profile.record.runs, 0);
  assert.equal(first.getSnapshot().profile.xp, 0);
  const reopened = createGameStore(storage);
  await reopened.init();
  assert.deepEqual(reopened.getSnapshot().profile.checkpoint, value);
  assert.equal(reopened.getSnapshot().activeRun, true);
  reopened.setRunActive(false);
  await reopened.resetProgress();
  assert.deepEqual(reopened.getSnapshot().profile.checkpoint, value, "a recoverable run protects progress on Home/Settings too");
  const restoredRandom = p.randomFromSeed(value.randomState);
  for (let i = 0; i < 50; i++) assert.equal(restoredRandom(), random());
});

test("completion replaces recovery atomically, cannot resurrect or bank the same run twice", async () => {
  const storage = memoryStorage(), store = createGameStore(storage);
  await store.init();
  await store.checkpointRun(checkpoint());
  await store.bankRun(run("interrupted", 3500, "daily"));
  assert.equal(store.getSnapshot().profile.checkpoint, null);
  assert.equal(store.getSnapshot().activeRun, false);
  await store.checkpointRun(checkpoint());
  await store.bankRun(run("interrupted", 3500, "daily"));
  const reopened = createGameStore(storage); await reopened.init();
  assert.equal(reopened.getSnapshot().profile.checkpoint, null);
  assert.equal(reopened.getSnapshot().profile.record.runs, 1);
  assert.equal(reopened.getSnapshot().profile.recentRuns.length, 1);
  assert.equal(p.sanitizeProfile({ ...reopened.getSnapshot().profile, checkpoint: checkpoint() }).checkpoint, null);
});

test("an actual seeded simulation continues identically after cold recovery with the same frames and inputs", async () => {
  const random = p.randomFromSeed(p.seedForDay("2026-10-10"));
  let live = rules.freshSimulation();
  for (let i = 0; i < 360; i++) live = rules.advanceSimulation(live, 0.033, random, true).state;
  assert.ok(live.run.grit > 0);
  const storage = memoryStorage(), store = createGameStore(storage); await store.init();
  await store.checkpointRun({ ...checkpoint(), simulation: live, randomState: random.getState() });
  const reopened = createGameStore(storage); await reopened.init();
  const point = reopened.getSnapshot().profile.checkpoint;
  assert.deepEqual(point.simulation, live);
  const recoveredRandom = p.randomFromSeed(point.randomState);
  let recovered = point.simulation;
  for (let i = 0; i < 60; i++) {
    const left = rules.advanceSimulation(live, 0.033, random, true);
    const right = rules.advanceSimulation(recovered, 0.033, recoveredRandom, true);
    assert.deepEqual(right, left);
    live = left.state; recovered = right.state;
  }
  assert.equal(recoveredRandom.getState(), random.getState());
});

test("failed completion retains the last durable recovery point and retry clears it", async () => {
  const storage = memoryStorage(); let fail = false;
  const writer = { ...storage, async multiSet(entries) { if (fail) throw Error("disk full"); return storage.multiSet(entries); } };
  const store = createGameStore(writer); await store.init(); await store.checkpointRun(checkpoint());
  fail = true; await store.bankRun(run("interrupted"));
  assert.ok(store.getSnapshot().error);
  const reopened = createGameStore(storage); await reopened.init();
  assert.equal(reopened.getSnapshot().profile.checkpoint.id, "interrupted");
  assert.equal(reopened.getSnapshot().profile.record.runs, 0);
  fail = false; await store.retry();
  const recovered = createGameStore(storage); await recovered.init();
  assert.equal(recovered.getSnapshot().profile.checkpoint, null);
  assert.equal(recovered.getSnapshot().profile.record.runs, 1);
});

test("stale completion and a second controller cannot overwrite the current recovery point", async () => {
  const storage = memoryStorage(), store = createGameStore(storage); await store.init();
  await store.checkpointRun(checkpoint("current"));
  await store.checkpointRun(checkpoint("replacement"));
  assert.equal(store.getSnapshot().profile.checkpoint.id, "current");
  await store.bankRun(run("older-finish"));
  assert.equal(store.getSnapshot().profile.checkpoint.id, "current");
  assert.equal(store.getSnapshot().activeRun, true);
  await store.bankRun(run("current"));
  assert.equal(store.getSnapshot().profile.checkpoint, null);
  assert.equal(store.getSnapshot().profile.record.runs, 2);
});

test("corrupt and terminal checkpoints are rejected while old records survive", () => {
  const value = checkpoint();
  assert.deepEqual(sanitizeCheckpoint(value), value);
  for (const broken of [null, { ...value, randomState: -1 }, { ...value, day: "2026-02-30" },
    { ...value, simulation: { ...value.simulation, elapsed: 60 } },
    { ...value, simulation: { ...value.simulation, lane: 7 } },
    { ...value, simulation: { ...value.simulation, run: { ...value.simulation.run, grit: 0 } } },
    { ...value, simulation: { ...value.simulation, entities: [{ id: 0, lane: 1, y: NaN, type: "signal", passed: false }] } }]) {
    assert.equal(sanitizeCheckpoint(broken), null);
    const profile = p.sanitizeProfile({ ...p.emptyProfile(), record: { ...rules.emptyRecord(), bestScore: 1234 }, checkpoint: broken });
    assert.equal(profile.checkpoint, null); assert.equal(profile.record.bestScore, 1234);
  }
});

// Observe actual spawns from stepSimulation. Undo only the movement applied in
// that frame to recover authored offsets; scores and collisions are not compared.
function spawnedRoute(day, frames, scheduledSpawns = true, until = 45) {
  const random = p.randomFromSeed(p.seedForDay(day));
  let state = rules.freshSimulation();
  const waves = [];
  for (let frame = 0; state.elapsed < until; frame++) {
    const seconds = Math.min(frames[frame % frames.length], until - state.elapsed);
    const before = state;
    // Keep the route running through hazards without altering its RNG or clock.
    const result = rules.stepSimulation(
      { ...state, run: { ...state.run, invulnerable: 1 } },
      seconds,
      random,
      scheduledSpawns,
    );
    state = result.state;
    if (state.nextId > before.nextId) {
      const movement = rules.phaseFor(state.elapsed).speed * (state.elapsed - before.elapsed);
      waves.push({
        at: Number((before.elapsed + before.spawnIn).toFixed(9)),
        items: state.entities.filter(item => item.id >= before.nextId).map(item => ({
          lane: item.lane,
          type: item.type,
          offset: Number((item.y - movement + 0.05).toFixed(9)) + 0,
        })),
      });
    }
    assert.equal(result.ended, null);
  }
  return waves;
}

test("daily simulation preserves spawned lanes, types, offsets and schedule across frame rates", () => {
  const normal = spawnedRoute("2026-10-10", [0.033]);
  for (const frames of [[0.09], [0.016, 0.09, 0.047, 0.1, 0.023]]) {
    assert.deepEqual(spawnedRoute("2026-10-10", frames), normal);
  }
  assert.deepEqual(normal[4], {
    at: 5.95,
    items: [0, -0.15, -0.3].map(offset => ({ lane: 0, type: "signal", offset })),
  });
  // The 19.95-second wave still uses the surface interval despite a frame
  // ending after 20 seconds. Then the next scheduled wave switches to deep.
  assert.equal(normal[14].at, 19.95);
  assert.equal(normal[15].at, 21.35);
  assert.equal(normal[16].at, 22.5);
  assert.ok(normal.some(wave => wave.at > 40));
  assert.notDeepEqual(spawnedRoute("2026-10-11", [0.033]), normal);
});

test("daily threshold selection uses spawn time while Classic retains frame timing", () => {
  for (const [elapsed, spawnIn, interval, expectedType] of [
    [5.94, 0.01, 1.4, "signal"],
    [19.94, 0.01, 1.4, "signal"],
    [39.94, 0.01, 1.15, "noise"],
  ]) {
    const state = { ...rules.freshSimulation(), elapsed, spawnIn };
    const random = () => elapsed < 6 ? 0.15 : 0.85;
    const daily = rules.stepSimulation(state, 0.09, random, true).state;
    assert.ok(Math.abs(daily.spawnIn - (spawnIn - 0.09 + interval)) < 1e-9);
    assert.equal(daily.entities[0].type, expectedType);
    if (elapsed < 20) assert.ok(daily.entities.every(item => item.type === "signal"));
    const classic = rules.stepSimulation(state, 0.09, random).state;
    assert.deepEqual(classic, rules.stepSimulation(state, 0.09, random, false).state);
    assert.ok(Math.abs(classic.spawnIn - (spawnIn - 0.09 + rules.phaseFor(classic.elapsed).interval)) < 1e-9);
    if (elapsed < 20) assert.ok(classic.entities.some(item => item.type !== "signal"));
  }
});

test("legacy migration keeps the real best and lifetime totals without inventing old runs", () => {
  const profile = p.sanitizeProfile(null, { runs: 8, signals: 140, bestScore: 25600, bestStreak: 36, marks: ["2026-10-09"] });
  assert.equal(profile.legacyBest, 25600); assert.equal(profile.record.runs, 8);
  assert.equal(p.bestFor(profile, "classic"), 25600); assert.equal(p.bestFor(profile, "daily", "2026-10-10"), 0);
  assert.deepEqual(profile.highScores, []); assert.equal(profile.completed, 0);
  assert.equal(p.trailUnlocked(profile, "mint"), true);
});
test("scores rank correctly, modes stay separate, and a finish only counts once", () => {
  let profile = p.emptyProfile();
  for (const saved of [run("low", 4000), run("high", 9000), run("daily", 2000, "daily")]) profile = p.addCompletedRun(profile, saved);
  assert.deepEqual(p.scoresFor(profile, "classic").map(r => r.id), ["high", "low"]);
  assert.equal(p.bestFor(profile, "daily", "2026-10-10"), 2000);
  const repeated = p.addCompletedRun(profile, run("high", 9000));
  assert.equal(repeated, profile); assert.equal(repeated.record.runs, 3);
});
test("retention bounds classic/history and keeps a lower-scoring new daily route", () => {
  let profile = p.emptyProfile();
  for (let i = 0; i < 45; i++) profile = p.addCompletedRun(profile, run(`classic-${i}`, i * 100));
  for (let i = 0; i < 39; i++) {
    const date = new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10);
    for (let j = 0; j < 6; j++) profile = p.addCompletedRun(profile, run(`daily-${i}-${j}`, 10000 + j, "daily", date));
  }
  profile = p.addCompletedRun(profile, run("today", 100, "daily", "2026-10-10"));
  assert.equal(profile.highScores.filter(r => r.mode === "classic").length, 25);
  assert.equal(profile.recentRuns.length, 20); assert.ok(profile.highScores.length <= 175);
  assert.equal(p.bestFor(profile, "daily", "2026-10-10"), 100);
  assert.equal(new Set(profile.highScores.filter(r => r.mode === "daily").map(r => r.day)).size, 30);
});
test("corrupt scores and locked cosmetics are rejected on load", () => {
  const profile = p.sanitizeProfile({ ...p.emptyProfile(), xp: -20, highScores: [run("good", 9000), { ...run("bad"), score: -1 }, { ...run("date"), day: "2026-02-30" }, { ...run("mode"), mode: "fake" }], preferences: { sound: true, trail: "ember" } });
  assert.deepEqual(profile.highScores.map(r => r.id), ["good"]);
  assert.equal(profile.xp, 0); assert.equal(profile.preferences.trail, "gold");
  assert.equal(profile.preferences.sound, true); assert.equal(profile.record.bestScore, 9000);
});
test("levels, consecutive play days, achievements, and trails follow real progress", () => {
  const profile = p.addCompletedRun(p.emptyProfile(), { ...run("full", 15000), signals: 120, bestStreak: 25 });
  assert.equal(profile.completed, 1); assert.equal(profile.perfectRuns, 1);
  for (const trail of ["gold", "mint", "violet", "ember"]) assert.equal(p.trailUnlocked(profile, trail), true);
  assert.equal(p.levelFor(250).level, 2); assert.equal(p.levelFor(125).progress, 0.5);
  assert.equal(p.streakFor(["2026-10-08", "2026-10-09"], "2026-10-10"), 2);
  assert.equal(p.streakFor(["2026-10-07"], "2026-10-10"), 0);
  assert.ok(p.achievementsFor(profile).filter(a => a.value >= a.target).length >= 5);
});
test("daily routes repeat for their date and change on the next UTC day", () => {
  const route = day => { const rng = p.randomFromSeed(p.seedForDay(day)); return Array.from({ length: 30 }, (_, i) => rules.createWave(rng, i * 2)); };
  assert.deepEqual(route("2026-10-10"), route("2026-10-10"));
  assert.notDeepEqual(route("2026-10-10"), route("2026-10-11"));
});
test("scores, history, settings, XP, and old totals survive a cold store restart", async () => {
  const storage = memoryStorage(); storage.values.set(p.LEGACY_RECORD_KEY, JSON.stringify({ runs: 8, bestScore: 6000, signals: 10 }));
  const first = createGameStore(storage); await first.init(); await first.bankRun(run("saved", 12500)); await first.setPreferences({ sound: true, haptics: false });
  const next = createGameStore(storage); await next.init();
  assert.equal(next.getSnapshot().profile.record.runs, 9);
  assert.equal(p.bestFor(next.getSnapshot().profile, "classic"), 12500);
  assert.equal(next.getSnapshot().profile.recentRuns[0].id, "saved");
  assert.equal(next.getSnapshot().profile.preferences.sound, true); assert.equal(next.getSnapshot().profile.preferences.haptics, false);
  assert.ok(next.getSnapshot().profile.xp > 0);
});
test("overlapping writes serialize, keeping a fast replay and settings change", async () => {
  const storage = memoryStorage(); let release;
  const gate = new Promise(resolve => { release = resolve; });
  const original = storage.multiSet; let writes = 0;
  storage.multiSet = async entries => { if (++writes === 1) await gate; await original(entries); };
  const store = createGameStore(storage); await store.init();
  const first = store.bankRun(run("first")); const settings = store.setPreferences({ sound: true }); const second = store.bankRun(run("second", 10000));
  assert.equal(store.getSnapshot().profile.record.runs, 2); assert.equal(store.getSnapshot().saving, true);
  release(); await Promise.all([first, settings, second]);
  const saved = JSON.parse(storage.values.get(p.PROFILE_KEY));
  assert.equal(saved.record.runs, 2); assert.equal(saved.preferences.sound, true); assert.equal(saved.highScores[0].score, 10000);
  assert.equal(store.getSnapshot().saving, false);
});
test("failed saves remain visible and retry persists the current scores", async () => {
  const storage = memoryStorage(), original = storage.multiSet; let failing = true;
  storage.multiSet = async entries => { if (failing) throw new Error("storage full"); return original(entries); };
  const store = createGameStore(storage); await store.init(); await store.bankRun(run("kept", 8000));
  assert.match(store.getSnapshot().error, /only in memory/); assert.equal(store.getSnapshot().profile.record.bestScore, 8000);
  failing = false; await store.retry(); assert.equal(store.getSnapshot().error, "");
  assert.equal(JSON.parse(storage.values.get(p.PROFILE_KEY)).record.bestScore, 8000);
});
test("failed loading cannot overwrite scores, and retry loads the old record", async () => {
  const storage = memoryStorage(), get = storage.getItem; let failing = true;
  storage.values.set(p.LEGACY_RECORD_KEY, JSON.stringify({ bestScore: 12000 }));
  storage.getItem = async key => { if (failing) throw new Error("unavailable"); return get(key); };
  const store = createGameStore(storage); await store.init(); await store.bankRun(run("blocked"));
  assert.equal(store.getSnapshot().ready, false); assert.equal(storage.values.has(p.PROFILE_KEY), false);
  failing = false; await store.retry(); assert.equal(store.getSnapshot().profile.legacyBest, 12000);
});
test("reset clears both record formats, keeps preferences, and protects an active run", async () => {
  const storage = memoryStorage(), store = createGameStore(storage); await store.init(); await store.bankRun(run("saved")); await store.setPreferences({ sound: true, trail: "ember" });
  store.setRunActive(true); await store.resetProgress(); assert.equal(store.getSnapshot().profile.record.runs, 1);
  store.setRunActive(false); await store.resetProgress();
  assert.equal(store.getSnapshot().profile.record.runs, 0); assert.equal(store.getSnapshot().profile.highScores.length, 0);
  assert.equal(store.getSnapshot().profile.preferences.sound, true); assert.equal(store.getSnapshot().profile.preferences.trail, "gold");
  assert.equal(JSON.parse(storage.values.get(p.LEGACY_RECORD_KEY)).bestScore, 0);
});
