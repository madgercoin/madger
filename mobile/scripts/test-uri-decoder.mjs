import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const decode = require('decode-uri-component');
const queryString = require('query-string');

test('CommonJS router decoder preserves valid UTF-8, plus and malformed input behavior', () => {
  for (const [input, expected] of [['hello+world', 'hello world'], ['%C3%A5', 'å'], ['%F0%9F%A6%A1', '🦡'], ['%FE%FF', '\uFFFD\uFFFD'], ['%C2', '\uFFFD'], ['%C3%28', '%C3('], ['%', '%']]) {
    assert.equal(decode(input), expected);
  }
  assert.throws(() => decode(2), TypeError);
  assert.deepEqual({ ...queryString.parse('mode=daily&tag=a&tag=b&name=%C3%A5&empty=') }, { mode: 'daily', tag: ['a', 'b'], name: 'å', empty: '' });
  assert.equal(queryString.stringify({ mode: 'daily', name: 'å' }), 'mode=daily&name=%C3%A5');
});

test('malformed percent-encoded query input is bounded in a separate router process', () => {
  // An unpatched recursive decoder must time out/fail, never hang the test runner.
  const output = execFileSync(process.execPath, ['-e', 'const q=require("query-string"); const input="%C3%28".repeat(4000); const result=q.parse("value="+input).value; if(result!=="%C3(".repeat(4000))throw Error("Incorrect decoding"); console.log(result.length);'], { cwd: new URL('..', import.meta.url), timeout: 2000, encoding: 'utf8' });
  assert.equal(output.trim(), '16000');
});

test('fallback decodes one level, preserving BOM and truncated-byte behavior', () => {
  const cases = [
    ['%41%FE%FF', 'A\uFFFD\uFFFD'], ['%FF%FE%FE%FF', '\uFFFD\uFFFD\uFFFD\uFFFD'],
    ['%C2%41', '\uFFFDA'], ['%25C2%zz', '%C2%zz'], ['%25%41%zz', '%A%zz'],
    ['%252525', '%2525'], ['%E2%82%AC+%zz', '€ %zz'],
    ['%F0%9F%A6%A1%zz', '🦡%zz'], ['%ed%a0%80', '%ed%a0%80'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(decode(input), expected, input);
    assert.equal(queryString.parse('value=' + input).value, expected, input);
  }
});

test('many distinct malformed query runs finish in a bounded child process', () => {
  // Repeated identical runs do not detect CVE-2026-118664's quadratic map loop.
  // 64,000 distinct runs would require billions of scanned characters before
  // the 0.5.1 single-pass replacement. Keep the expensive path out of this runner.
  const script = `
    const assert = require('node:assert/strict');
    const q = require('query-string');
    const decode = require('decode-uri-component');
    let input = '', expected = '';
    for (let i=0; i<64000; i++) {
      const run = '%' + Math.floor(i/256).toString(16).padStart(2,'0') + '%' + (i%256).toString(16).padStart(2,'0');
      input += run + 'x'; expected += decode(run) + 'x';
    }
    input += '%zz'; expected += '%zz';
    assert.equal(q.parse('value=' + input).value, expected);
    console.log(input.length);
  `;
  const output = execFileSync(process.execPath, ['-e', script], {
    cwd: new URL('..', import.meta.url), timeout: 3000, encoding: 'utf8',
  });
  assert.equal(output.trim(), '448003');
});

test('reviewed patch is idempotent and rejects source, fixture, and version drift', async () => {
  const { readFile, writeFile, mkdir, mkdtemp, cp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = await mkdtemp(join(tmpdir(), 'madger-uri-guard-'));
  try {
    const scripts = join(root, 'scripts');
    const dependency = join(root, 'node_modules/decode-uri-component');
    await mkdir(scripts, { recursive: true });
    await mkdir(dependency, { recursive: true });
    await cp(new URL('./patch-uri-decoder.mjs', import.meta.url), join(scripts, 'patch.mjs'));
    const fixture = await readFile(new URL('./uri-decoder-linear.txt', import.meta.url), 'utf8');
    await writeFile(join(scripts, 'uri-decoder-linear.txt'), fixture);
    const metadata = join(dependency, 'package.json');
    await writeFile(metadata, JSON.stringify({ name: 'decode-uri-component', version: '0.2.2', main: 'index.js' }));
    const target = join(dependency, 'index.js');
    await writeFile(target, fixture);
    const run = () => execFileSync(process.execPath, [join(scripts, 'patch.mjs')], { timeout: 3000, stdio: 'pipe' });
    run(); run();
    assert.equal(await readFile(target, 'utf8'), fixture);
    await writeFile(target, fixture + '\n// unexpected source modification\n');
    assert.throws(run, /Unexpected decoder source/);
    await writeFile(target, fixture);
    await writeFile(join(scripts, 'uri-decoder-linear.txt'), fixture + '\n');
    assert.throws(run, /fixture differs/);
    await writeFile(join(scripts, 'uri-decoder-linear.txt'), fixture);
    await writeFile(metadata, JSON.stringify({ name: 'decode-uri-component', version: '0.2.3', main: 'index.js' }));
    assert.throws(run, /Reassess URI decoder/);
    assert.equal(await readFile(target, 'utf8'), fixture);
  } finally { await rm(root, { recursive: true, force: true }); }
});
