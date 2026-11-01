# SDK 57 development-tool validation hardening

This branch preserves Expo SDK 57, React Native, all gameplay code, and the
previously delivered build 30 artifact. It is not a new store release.

## Reason

GitHub advisory [GHSA-mrhx-c7xc-m3w5 / CVE-2023-54404](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
lists Zod below 4.6.6 as affected by excessive allocation during collection
validation. Upstream [fix 6652](https://github.com/colinhacks/zod/pull/6652)
rejects oversized **bounded** collections before visiting their elements;
unbounded schemas are not automatically protected.

The lockfile's Zod consumers are Expo CLI 57.0.32 and ESLint React Hooks 7.1.1.
No game source imports Zod. This is dependency/source evidence, not a guarantee
that every production bundle is unaffected. The repository alert 32-to-advisory
mapping could not be confirmed through the available alert API.

## Narrow remediation

- Pin Zod 4.6.7 only for those two exact consumer versions, without upgrading Expo.
- Test real installed CLI plugin/output/MCP schema behavior across valid and
  invalid inputs, including typed parameters, strict keys, and URL validation.
- Apply a hash-guarded, fail-closed patch to the exact CLI source during
  `postinstall`. Limit each plugin to 128 commands, 64 parameters per command,
  two environment entries, and 1024 output records per validated output batch.
- Reject plugin text above 1MiB UTF-8 before `JSON.parse`. Cap accumulated CLI
  output at 1MiB code units as an additional guard. These are intentional
  development-plugin limits; oversized plugin output now produces an error.
- Keep ordinary text/audio/image results, valid plugin descriptors, and CLI
  error reporting covered by regression tests. Zod error wording may differ.

The SDK 58 proposal PR 140 changes many native assumptions and currently fails
Expo compatibility checks. This fix does not adopt or merge it. The scoped
major-version substitution is deliberately qualified by consumer-specific
regressions and full release checks, rather than assumed semver compatible.

## Verification and limits

`npm ci` applies both the existing URI-decoder backport and this hardening.
`npm run test:dependencies` checks both fixes. `npm run release:check` covers
application tests, TypeScript, lint, Expo compatibility, web export and metadata.
CI additionally exports Android/iOS, builds a preview APK and runs emulator QA.

Do not infer that all security advisories are cleared, that an old APK was
modified, that production signing is complete, or that emulator tests replace
physical-device/audio acceptance. Keep development servers/MCP private and do
not load untrusted plugins. A future upstream CLI update should replace this
local compatibility patch only after reviewing its schemas and regressions.

## Follow-up: single-pass URI decoding

[GHSA-qr28-fpjm-wq7f / CVE-2026-118664](https://github.com/advisories/GHSA-qr28-fpjm-wq7f)
affects `decode-uri-component` through 0.5.0. The earlier backport fixed the
recursive scanner but retained a quadratic replacement loop for many distinct
percent-encoded runs. This follow-up backports the exact scanner and single-pass
replacement from upstream [0.5.1 commit fad01d6](https://github.com/SamVerschueren/decode-uri-component/commit/fad01d65b93bd3f2f0dc32dfd8d57a38b57bc608),
while retaining the 0.2.2 CommonJS export, type error, and plus-to-space wrapper
required by the installed `query-string` consumer. Decoded output is not rescanned;
the fallback now preserves one-level decoding even beside a malformed suffix.

The full reviewed installed source is `scripts/uri-decoder-linear.txt`, SHA-256
`62fb0bb0341a0a76776143ecbb9861bea1e4eacdcec79f2bd471f93d91d15ce7`.
Its upstream MIT notice is retained in `scripts/uri-decoder-LICENSE.txt`.
The installer accepts only the exact original 0.2.2 source, the previously
reviewed 0.5.0 backport, or this reviewed result; fixture/source/version drift
fails closed. Regression coverage includes 64,000 distinct runs through actual
`query-string` in a child process with a 3-second timeout, plus BOM/truncated-byte,
malformed UTF-8, single-level decoding, idempotence and tamper checks.

The dependency metadata intentionally remains **0.2.2**, so package-version-only
audit tools can continue flagging it. This is an explicit source backport, not a
claim that Dependabot/npm audit is clear. No ESM override, SDK upgrade, old-APK
modification, production release, or physical-device acceptance is implied.
