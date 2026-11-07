const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const workflow = readFileSync(path.join(root, '.github/workflows/android-production-build-only.yml'), 'utf8');
const eas = JSON.parse(readFileSync(path.join(root, 'mobile/eas.json'), 'utf8'));

test('production bundle workflow is manual-only and never submits', () => {
  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^  (push|pull_request|schedule|workflow_run):/m);
  assert.match(workflow, /if: github.event_name == 'workflow_dispatch'/);
  assert.doesNotMatch(workflow, /--auto-submit|\beas(?:-cli@\S+)? submit\b/);
  assert.match(workflow, /--platform android --profile closed-test-build --non-interactive --freeze-credentials --wait --json/);
});

test('build-only profile pins production identity and persistent signing without a submit profile', () => {
  const profile = eas.build['closed-test-build'];
  assert.equal(profile.extends, 'production');
  assert.equal(profile.distribution, 'store');
  assert.equal(profile.environment, 'production');
  assert.equal(profile.credentialsSource, 'remote');
  assert.equal(profile.android.buildType, 'app-bundle');
  assert.deepEqual(profile.env, { MADGER_ANDROID_PREVIEW: '0', MADGER_EXPEDITION_PREVIEW: '0' });
  assert.equal(eas.submit['closed-test-build'], undefined);
  assert.match(workflow, /c.android\?\.package!=='com\.madgercoin\.app'/);
});

test('authority and real Android QA remain fail-closed before any EAS request', () => {
  assert.match(workflow, /account_and_cost_authorized:[\s\S]*?default: false/);
  assert.match(workflow, /if \[ "\$BUILD_AUTHORIZED" != 'true' \]; then/);
  assert.match(workflow, /MADGER_ANDROID_DEVICE_QA: \$\{\{ vars.MADGER_ANDROID_DEVICE_QA \}\}/);
  assert.match(workflow, /npm run release:distribution:android/);
  assert.doesNotMatch(workflow, /MADGER_ANDROID_DEVICE_QA:\s*['"]?passed|eas(?:-cli@\S+)? (login|credentials|init)/);
  assert.ok(workflow.indexOf('npm run release:distribution:android') < workflow.indexOf('eas-cli@24.3.0 whoami'));
  assert.ok(workflow.indexOf('BUILD_AUTHORIZED') < workflow.indexOf('eas-cli@24.3.0 whoami'));
});

test('manual cost/account shell gate rejects missing and false confirmation', () => {
  const { spawnSync } = require('node:child_process');
  const gate = workflow.match(/run: \|\n([\s\S]*?)      - uses: actions\/checkout/)[1]
    .split('\n').map(line => line.replace(/^          /, '')).join('\n');
  for (const value of ['', 'false', 'TRUE', 'yes']) {
    assert.equal(spawnSync('bash', ['-c', gate], { env: { ...process.env, BUILD_AUTHORIZED: value } }).status, 1);
  }
  assert.equal(spawnSync('bash', ['-c', gate], { env: { ...process.env, BUILD_AUTHORIZED: 'true' } }).status, 0);
});
