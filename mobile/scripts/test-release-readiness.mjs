import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  payload.copy(result, 4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
  return result;
}

async function check(args, qa = {}, mutate = () => {}) {
  const root = await mkdtemp(join(tmpdir(), 'madger-release-gate-'));
  try {
    await mkdir(join(root, 'scripts'));
    await mkdir(join(root, 'assets/images'), { recursive: true });
    await writeFile(join(root, 'scripts/release-readiness.mjs'), await readFile(new URL('./release-readiness.mjs', import.meta.url)));
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(1024, 0);
    ihdr.writeUInt32BE(1024, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    // Synthetic metadata fixture exercises this script's signature, dimensions, and CRC checks.
    const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IEND', Buffer.alloc(0))]);
    await writeFile(join(root, 'assets/images/madger-splash.png'), png);
    const app = { version: '1.4.0', icon: './assets/images/madger-splash.png', ios: { buildNumber: '6' }, android: { versionCode: 8 }, extra: { eas: { projectId: 'e4c06d4a-4d6c-44da-b405-624382b15c56' } } };
    mutate(app);
    await writeFile(join(root, 'app.json'), JSON.stringify({ expo: app }));
    await writeFile(join(root, 'package.json'), JSON.stringify({ version: '1.4.0' }));
    const env = { ...process.env };
    delete env.MADGER_ANDROID_DEVICE_QA;
    delete env.MADGER_IOS_DEVICE_QA;
    const result = spawnSync(process.execPath, ['scripts/release-readiness.mjs', ...args], { cwd: root, env: { ...env, ...qa }, encoding: 'utf8' });
    assert.ifError(result.error);
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('Android distribution still blocks missing Android QA', async () => {
  const result = await check(['--distribution', '--platform', 'android'], { MADGER_IOS_DEVICE_QA: 'passed' });
  assert.equal(result.status, 1);
  assert.match(result.output, /Android physical-device QA is not attested/);
});
test('Android distribution accepts Android QA without iOS QA', async () => {
  assert.equal((await check(['--distribution', '--platform', 'android'], { MADGER_ANDROID_DEVICE_QA: 'passed' })).status, 0);
});
test('Default distribution still requires iOS QA', async () => {
  const result = await check(['--distribution'], { MADGER_ANDROID_DEVICE_QA: 'passed' });
  assert.equal(result.status, 1);
  assert.match(result.output, /iOS physical-device QA is not attested/);
});
test('Default distribution still requires Android QA', async () => {
  assert.equal((await check(['--distribution'], { MADGER_IOS_DEVICE_QA: 'passed' })).status, 1);
});
test('Default and explicit all distribution accept both attestations', async () => {
  const qa = { MADGER_ANDROID_DEVICE_QA: 'passed', MADGER_IOS_DEVICE_QA: 'passed' };
  for (const args of [['--distribution'], ['--distribution', '--platform', 'all']]) assert.equal((await check(args, qa)).status, 0);
});
test('iOS distribution still requires iOS QA', async () => {
  assert.equal((await check(['--distribution', '--platform', 'ios'], { MADGER_ANDROID_DEVICE_QA: 'passed' })).status, 1);
  assert.equal((await check(['--distribution', '--platform', 'ios'], { MADGER_IOS_DEVICE_QA: 'passed' })).status, 0);
});
test('Invalid, missing, and duplicated platform arguments fail closed', async () => {
  for (const args of [['--platform', 'windows'], ['--platform'], ['--platform', 'android', '--platform', 'ios']]) {
    const result = await check(['--distribution', ...args], { MADGER_ANDROID_DEVICE_QA: 'passed', MADGER_IOS_DEVICE_QA: 'passed' });
    assert.equal(result.status, 1);
    assert.match(result.output, /--platform must be one of all, android, or ios/);
  }
});
test('Android mode retains project linkage and version metadata gates', async () => {
  const qa = { MADGER_ANDROID_DEVICE_QA: 'passed' };
  for (const mutate of [
    (app) => { app.extra.eas.projectId = 'placeholder'; },
    (app) => { app.version = '0.0.0'; },
    (app) => { app.android.versionCode = 0; },
    (app) => { app.ios.buildNumber = 'invalid'; },
    (app) => { app.icon = './assets/images/missing.png'; },
  ]) {
    assert.equal((await check(['--distribution', '--platform', 'android'], qa, mutate)).status, 1);
  }
});
test('Source-only mode keeps device QA as warnings', async () => {
  const result = await check([]);
  assert.equal(result.status, 0);
  assert.match(result.output, /WARNING: Android physical-device QA/);
  assert.match(result.output, /WARNING: iOS physical-device QA/);
});

test('Android workflow preserves source, Expo access, and production build checks', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/android-internal-release.yml', import.meta.url), 'utf8');
  assert.match(workflow, /npm ci\s+npm run release:check\s+node scripts\/release-readiness\.mjs --distribution --platform android\s+npx expo-doctor/);
  assert.match(workflow, /EXPO_TOKEN: \$\{\{ secrets\.EXPO_TOKEN \}\}/);
  assert.match(workflow, /MADGER_ANDROID_DEVICE_QA: \$\{\{ vars\.MADGER_ANDROID_DEVICE_QA \}\}/);
  assert.match(workflow, /npx --yes eas-cli@24\.3\.0 whoami/);
  assert.match(workflow, /npx --yes eas-cli@24\.3\.0 build --platform android --profile production --non-interactive --wait --auto-submit/);
});
