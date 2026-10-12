// Backport the upstream linear decoder while retaining query-string 7's CJS API.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const target = require.resolve('decode-uri-component');
const metadata = JSON.parse(await readFile(require.resolve('decode-uri-component/package.json'), 'utf8'));
if (metadata.version !== '0.2.2') throw new Error('Reassess URI decoder backport after a dependency update');
const current = await readFile(target, 'utf8');
const helper = (await readFile(new URL('./uri-decoder-linear.txt', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const marker = '// MIT: Sam Verschueren. Backport of decode-uri-component v0.5.0 linear decoder.';
if (!current.includes(marker)) {
  const digest = createHash('sha256').update(current.replace(/\r\n/g, '\n')).digest('hex');
  if (digest !== '3b8ba0a765e1089d11bba9a919d0d8789ecd9a6833ea078d8d9114e1db093863') {
    throw new Error('Unexpected decoder source; refusing to patch');
  }
  const patched = current.replace(/var singleMatcher[^\n]*\n/, '').replace(/function decodeComponents[\s\S]*?(?=function customDecodeURIComponent)/, helper);
  if (patched === current || patched.includes('function decodeComponents')) throw new Error('URI decoder patch did not apply');
  await writeFile(target, patched);
} else if (!current.includes(helper)) {
  throw new Error('Installed URI decoder backport differs from the reviewed helper');
}
console.log('Applied upstream linear URI decoder backport (CommonJS 0.2.2 API retained).');
