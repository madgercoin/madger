import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./release-readiness.mjs', import.meta.url));
function check(args, qa = {}) {
  const env = { ...process.env };
  delete env.MADGER_ANDROID_DEVICE_QA;
  delete env.MADGER_IOS_DEVICE_QA;
  return spawnSync(process.execPath, [script, ...args], {
    env: { ...env, ...qa }, encoding: 'utf8',
  });
}

test('Android distribution requires Android acceptance, not iOS acceptance', () => {
  const result = check(['--distribution', '--platform', 'android'], { MADGER_ANDROID_DEVICE_QA: 'passed' });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /iOS physical-device/);
});
test('Android distribution still blocks missing or invalid Android acceptance', () => {
  for (const value of ['', 'true', 'failed']) {
    const result = check(['--distribution', '--platform', 'android'], {
      MADGER_ANDROID_DEVICE_QA: value, MADGER_IOS_DEVICE_QA: 'passed',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /BLOCKED: Android physical-device/);
  }
});
test('iOS distribution requires only iOS acceptance', () => {
  assert.equal(check(['--distribution', '--platform', 'ios'], { MADGER_IOS_DEVICE_QA: 'passed' }).status, 0);
  assert.equal(check(['--distribution', '--platform', 'ios'], { MADGER_ANDROID_DEVICE_QA: 'passed' }).status, 1);
});
test('default and all-platform distribution preserve both acceptance gates', () => {
  for (const args of [['--distribution'], ['--distribution', '--platform', 'all']]) {
    assert.equal(check(args, { MADGER_ANDROID_DEVICE_QA: 'passed' }).status, 1);
    assert.equal(check(args, { MADGER_IOS_DEVICE_QA: 'passed' }).status, 1);
    assert.equal(check(args, { MADGER_ANDROID_DEVICE_QA: 'passed', MADGER_IOS_DEVICE_QA: 'passed' }).status, 0);
  }
});
test('unknown or missing platform fails closed', () => {
  for (const args of [['--distribution', '--platform'], ['--distribution', '--platform', 'andriod']]) {
    const result = check(args, { MADGER_ANDROID_DEVICE_QA: 'passed', MADGER_IOS_DEVICE_QA: 'passed' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--platform must be/);
  }
});
test('source-only checks warn without asserting acceptance', () => {
  const result = check([]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /WARNING: Android physical-device/);
  assert.match(result.stderr, /WARNING: iOS physical-device/);
});
