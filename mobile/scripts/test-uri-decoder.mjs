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
