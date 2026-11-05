// Backport upstream 0.5.1 without replacing query-string 7's CommonJS dependency
// with the incompatible ESM package. See uri-decoder-linear.txt and its MIT license.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const target = require.resolve('decode-uri-component');
const metadata = JSON.parse(await readFile(require.resolve('decode-uri-component/package.json'), 'utf8'));
if (metadata.version !== '0.2.2') throw new Error('Reassess URI decoder backport after a dependency update');
const normalize = value => value.replace(/\r\n/g, '\n');
const sha256 = value => createHash('sha256').update(normalize(value)).digest('hex');
const reviewed = normalize(await readFile(new URL('./uri-decoder-linear.txt', import.meta.url), 'utf8'));
const reviewedHash = '62fb0bb0341a0a76776143ecbb9861bea1e4eacdcec79f2bd471f93d91d15ce7';
if (sha256(reviewed) !== reviewedHash) throw new Error('URI decoder fixture differs from reviewed 0.5.1 source');
const current = await readFile(target, 'utf8');
const digest = sha256(current);
const acceptedSources = new Set([
  '3b8ba0a765e1089d11bba9a919d0d8789ecd9a6833ea078d8d9114e1db093863', // npm 0.2.2
  '1e5db9f5267da353fefb5882723291bb8c7b389ca757395d24b44cc87b04cf7b', // prior reviewed 0.5.0 CJS backport
  reviewedHash,
]);
if (!acceptedSources.has(digest)) throw new Error('Unexpected decoder source; refusing to patch');
if (digest !== reviewedHash) await writeFile(target, reviewed);
console.log('Verified upstream 0.5.1 single-pass URI decoder backport (CommonJS 0.2.2 API retained).');
