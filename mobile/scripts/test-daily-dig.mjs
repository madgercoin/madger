import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/dailyDigState.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { nextDig, sanitizeDig, visibleStreak } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('check-in is idempotent within the same UTC day', () => {
  const first = nextDig({ lastDate: '', streak: 0 }, new Date('2026-09-18T00:00:00Z'));
  assert.deepEqual(first, { lastDate: '2026-09-18', streak: 1 });
  assert.deepEqual(nextDig(first, new Date('2026-09-18T23:59:59Z')), first);
});

test('streak crosses month/year boundaries and resets after missed days', () => {
  assert.equal(nextDig({ lastDate: '2026-12-31', streak: 8 }, new Date('2027-01-01T00:00:00Z')).streak, 9);
  assert.equal(nextDig({ lastDate: '2028-02-29', streak: 8 }, new Date('2028-03-01T00:00:00Z')).streak, 9);
  const old = { lastDate: '2026-09-16', streak: 8 };
  assert.equal(visibleStreak(old, new Date('2026-09-18T00:00:00Z')), 0);
  assert.equal(nextDig(old, new Date('2026-09-18T00:00:00Z')).streak, 1);
});

test('corrupt, impossible, and future records do not fabricate a current streak', () => {
  for (const value of [null, [], { lastDate: '2026-02-30', streak: 2 }, { lastDate: '2026-09-18', streak: -1 }, { lastDate: '2026-09-18', streak: '9' }]) {
    assert.deepEqual(sanitizeDig(value), { lastDate: '', streak: 0 });
  }
  const future = { lastDate: '2026-10-01', streak: 9 };
  assert.equal(visibleStreak(future, new Date('2026-09-18T00:00:00Z')), 0);
  assert.equal(nextDig(future, new Date('2026-09-18T00:00:00Z')).streak, 1);
});
