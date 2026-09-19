import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/burrowRun.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const rules = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

test('native daily courses, collision line, and recovery preserve fair retries', () => {
  assert.deepEqual(rules.courseFor(20715), rules.courseFor(20715));
  assert.notDeepEqual(rules.courseFor(20715), rules.courseFor(20716));
  assert.ok(rules.courseFor(20715).filter(wave => wave.at < 6).every(wave => wave.items.every(item => item.type === 'signal')));
  assert.equal(rules.crossesRunner(0.82, 0.86), true);
  assert.equal(rules.crossesRunner(0.85, 0.9), false);
  const hit = rules.resolvePickup(rules.freshRun(), 'noise', 10, 0);
  assert.equal(rules.resolvePickup(hit.run, 'noise', 10.5, hit.protectedUntil).run.grit, 2);
  assert.equal(rules.resolvePickup(hit.run, 'signal', 10.5, hit.protectedUntil).run.score, 100);
  assert.equal(rules.resolvePickup(hit.run, 'noise', 11, hit.protectedUntil).run.grit, 1);
  assert.equal(rules.scoreChase(3000).medal, 'BRONZE');
  assert.equal(rules.scoreChase(8000).medal, 'SILVER');
  assert.equal(rules.scoreChase(15000).medal, 'GOLD');
});
const [screen, layout, home] = await Promise.all([
  readFile(new URL('../src/app/(tabs)/play.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/index.tsx', import.meta.url), 'utf8'),
]);

test('native rules preserve scoring, grit, and phase boundaries', () => {
  let run = rules.freshRun();
  for (let index = 0; index < 5; index += 1) run = rules.applyPickup(run, 'signal');
  assert.equal(run.score, 600);
  assert.equal(rules.multiplierFor(run.streak), 2);
  assert.equal(rules.applyPickup(run, 'noise').grit, 2);
  assert.equal(rules.phaseFor(20).id, 'deep');
  assert.equal(rules.phaseFor(40).id, 'bedrock');
});

test('native record normalization rejects corrupt values and bounds mark history', () => {
  const marks = Array.from({ length: 35 }, (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`);
  const record = rules.sanitizeRecord({ runs: -1, signals: 'bad', bestScore: 900, bestStreak: 5, marks: [...marks, 'nope', marks[34]] });
  assert.equal(record.runs, 0);
  assert.equal(record.signals, 0);
  assert.equal(record.bestScore, 900);
  assert.equal(record.marks.length, 30);
});

test('native game is a first-class tab with mobile lifecycle and privacy controls', () => {
  assert.match(layout, /name="play"/);
  assert.match(home, /router\.push\('\/play'\)/);
  assert.match(screen, /AppState\.addEventListener/);
  assert.match(screen, /useFocusEffect/);
  assert.match(screen, /AsyncStorage/);
  assert.match(screen, /Alert\.alert\('Reset field record\?'/);
  assert.match(screen, /Haptics/);
  assert.doesNotMatch(screen, /WebView|fetch\s*\(|WalletAdapter|solana\.connect/i);
});
