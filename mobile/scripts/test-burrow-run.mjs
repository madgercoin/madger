import { Buffer } from 'node:buffer';
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../src/lib/burrowRun.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const rules = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);
const [screen, layout, home] = await Promise.all([
  readFile(new URL("../src/app/(tabs)/play.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/(tabs)/_layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/(tabs)/index.tsx", import.meta.url), "utf8"),
]);

test("native rules preserve scoring, grit, and phase boundaries", () => {
  let run = rules.freshRun();
  for (let index = 0; index < 5; index += 1)
    run = rules.applyPickup(run, "signal");
  assert.equal(run.score, 600);
  assert.equal(rules.multiplierFor(run.streak), 2);
  assert.equal(rules.applyPickup(run, "noise").grit, 2);
  assert.equal(rules.phaseFor(20).id, "deep");
  assert.equal(rules.phaseFor(40).id, "bedrock");
});

test("native record normalization rejects corrupt values and bounds mark history", () => {
  const marks = Array.from(
    { length: 35 },
    (_, index) => `2026-09-${String(index + 1).padStart(2, "0")}`,
  );
  const record = rules.sanitizeRecord({
    runs: -1,
    signals: "bad",
    bestScore: 900,
    bestStreak: 5,
    marks: [...marks, "nope", marks[34]],
  });
  assert.equal(record.runs, 0);
  assert.equal(record.signals, 0);
  assert.equal(record.bestScore, 900);
  assert.equal(record.marks.length, 30);
});

test("native game is a first-class tab with mobile lifecycle and privacy controls", () => {
  assert.match(layout, /name="play"/);
  assert.match(home, /router\.push\(['"]\/play['"]\)/);
  assert.match(screen, /AppState\.addEventListener/);
  assert.match(screen, /useFocusEffect/);
  assert.match(screen, /AsyncStorage/);
  assert.match(screen, /Alert\.alert\(\s*['"]Reset field record\?['"]/);
  assert.match(screen, /Haptics/);
  assert.doesNotMatch(
    screen,
    /WebView|fetch\s*\(|WalletAdapter|solana\.connect/i,
  );
});

test("shield covers one hit without breaking the combo; recovery prevents stacked damage", () => {
  let run = { ...rules.freshRun(), streak: 12 };
  run = rules.applyPickup(run, "shield");
  run = rules.applyPickup(run, "noise");
  assert.equal(run.grit, 3);
  assert.equal(run.shield, 0);
  assert.equal(run.streak, 12);
  assert.equal(rules.applyPickup(run, "noise"), run);
  const exposed = rules.applyPickup({ ...run, invulnerable: 0 }, "noise");
  assert.equal(exposed.grit, 2);
  assert.equal(exposed.streak, 0);
});

test("burst requires a charge, doubles signal points, and expires on game time", () => {
  const empty = rules.freshRun();
  assert.equal(rules.activateBurst(empty), empty);
  let run = empty;
  for (let i = 0; i < 13; i++) run = rules.applyPickup(run, "signal");
  assert.equal(run.energy, rules.BURST_COST);
  run = rules.activateBurst(run);
  assert.equal(run.energy, 0);
  assert.equal(run.burst, 3);
  assert.equal(rules.activateBurst(run), run);
  const signal = rules.applyPickup(run, "signal");
  assert.equal(signal.score - run.score, 600);
  const smashed = rules.applyPickup(run, "noise");
  assert.equal(smashed.score - run.score, 100);
  assert.equal(smashed.grit, 3);
  let state = { ...rules.freshSimulation(), run, spawnIn: 100 };
  for (let i = 0; i < 31; i++) state = rules.stepSimulation(state, 0.1).state;
  assert.equal(state.run.burst, 0);
});

test("swept collision collects once and the magnet reaches all lanes", () => {
  const items = [0, 1, 2].map((lane) => ({
    id: lane,
    lane,
    type: "signal",
    y: rules.RUNNER_Y - 0.02,
    passed: false,
  }));
  const state = {
    ...rules.freshSimulation(),
    run: { ...rules.freshRun(), magnet: 1 },
    spawnIn: 100,
    entities: items,
  };
  const first = rules.stepSimulation(state, 0.1);
  assert.equal(first.state.run.signals, 3);
  assert.equal(first.state.entities.length, 0);
  assert.equal(rules.stepSimulation(first.state, 0.1).state.run.signals, 3);
  assert.ok(first.state.run.magnet < 1);
  const withoutMagnet = rules.stepSimulation(
    { ...state, run: rules.freshRun() },
    0.1,
  );
  assert.equal(withoutMagnet.state.run.signals, 1);
});

test("nearby dodge is awarded only once, and distant lanes earn no close-call bonus", () => {
  const entity = {
    id: 0,
    lane: 0,
    type: "noise",
    y: rules.RUNNER_Y + 0.04,
    passed: false,
  };
  const base = { ...rules.freshSimulation(), spawnIn: 100, entities: [entity] };
  const first = rules.stepSimulation(base, 0.1);
  assert.equal(first.state.run.score, 50);
  assert.equal(first.state.run.dodges, 1);
  assert.equal(rules.stepSimulation(first.state, 0.1).state.run.score, 50);
  assert.equal(
    rules.stepSimulation({ ...base, lane: 2 }, 0.1).state.run.score,
    0,
  );
});

test("opening waves teach collecting and every hazard row leaves an escape lane", () => {
  for (let index = 0; index < 100; index++) {
    let seed = index + 1;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    assert.ok(
      rules.createWave(random, 3).every((item) => item.type === "signal"),
    );
    for (const elapsed of [8, 20, 40, 59]) {
      const wave = rules.createWave(random, elapsed);
      assert.ok(wave.every((item) => item.lane >= 0 && item.lane <= 2));
      const hazards = wave.filter((item) => item.type === "noise");
      assert.ok(new Set(hazards.map((item) => item.lane)).size < 3);
    }
  }
});

test("simulation ends exactly once, bounds objects, and handles phase changes", () => {
  const ending = rules.stepSimulation(
    { ...rules.freshSimulation(), elapsed: 59.98, spawnIn: 100 },
    0.1,
  );
  assert.equal(ending.ended, "time");
  assert.equal(ending.state.elapsed, 60);
  assert.equal(rules.stepSimulation(ending.state, 0.1).state, ending.state);
  assert.equal(
    rules.stepSimulation(
      { ...rules.freshSimulation(), run: { ...rules.freshRun(), grit: 0 } },
      0.1,
    ).ended,
    "grit",
  );
  assert.ok(
    rules
      .stepSimulation({ ...rules.freshSimulation(), elapsed: 19.99 }, 0.05)
      .events.some((event) => event.kind === "phase"),
  );
  let state = rules.freshSimulation();
  // A shielded soak verifies cleanup throughout all three phases.
  for (let i = 0; i < 1800; i++) {
    const result = rules.stepSimulation(
      { ...state, run: { ...state.run, invulnerable: 1 } },
      1 / 30,
      () => 0.85,
    );
    state = result.state;
    assert.ok(state.entities.length < 35);
    if (result.ended) break;
  }
  assert.equal(rules.phaseFor(state.elapsed).id, "bedrock");
});
