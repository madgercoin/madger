const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const project = path.join(__dirname, '..');
const pkg = JSON.parse(readFileSync(path.join(project, 'package.json'), 'utf8'));
const workflow = readFileSync(path.join(project, '../.github/workflows/mobile-ci.yml'), 'utf8');
const verifier = readFileSync(path.join(__dirname, 'verify-native-gl-abis.py'), 'utf8');

test('Expo GL compiles from source instead of relying on an incomplete prebuilt x86_64 AAR', () => {
  const buildFromSource = pkg.expo?.autolinking?.android?.buildFromSource;
  assert.ok(Array.isArray(buildFromSource), 'Expo Android autolinking must declare buildFromSource');
  assert.ok(buildFromSource.includes('expo-gl'), 'expo-gl must compile native .so for x86_64');
  assert.ok(pkg.dependencies['expo-gl'].startsWith('57.'), 'preserve reviewed Expo SDK 57 line');
});

test('Android preview verifies required native GL libraries before reporting success', () => {
  assert.match(workflow, /-PreactNativeArchitectures=arm64-v8a,x86_64/);
  const check = 'python3 scripts/verify-native-gl-abis.py android/app/build/outputs/apk/release/app-release.apk';
  assert.ok(workflow.includes(check));
  assert.ok(workflow.indexOf(check) < workflow.indexOf('Inspect permissions on the actual APK'));
  assert.match(verifier, /"arm64-v8a,x86_64"/);
  assert.match(verifier, /libexpo-gl\.so/);
  assert.match(verifier, /file_size/);
  assert.match(verifier, /raise RuntimeError/);
});
