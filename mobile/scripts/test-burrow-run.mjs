import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/burrowRun.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const rules = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
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
