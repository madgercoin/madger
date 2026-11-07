# SDK 57 development-tool validation hardening (November 7, 2026)

MADGER 1.5.1 retains Expo SDK 57 and the existing 3D gameplay. This change
fixes stale Expo patch-level dependencies and updates development-tool security
without claiming an approved Android release.

## Upstream compatibility and threat model

GitHub advisory [GHSA-mrhx-c7xc-m3w5 / CVE-2023-54404](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
describes excess allocation during Zod collection validation in older
versions; Zod 4.6.7 retains the reviewed fix for bounded collections.

Expo CLI **57.0.33** has replaced its developer plugin Zod descriptor/output
validation with JSON Schema through @expo/schema-utils. It still accepts
a Zod instance injected by the MCP consumer for typed tool arguments. The
previous patch written against CLI 57.0.32 Zod schema no longer applies;
blindly reusing it would break npm installs and development tooling.
ESLint React Hooks 7.1.1 remains pinned to Zod 4.6.7 as a narrowly scoped
security override; the old CLI 57.0.32 scoped override was retargeted to
CLI 57.0.33 as defense-in-depth for any residual CLI Zod dependencies.
The new developer plugin JSON-schema validation itself does not depend on Zod.

## Exact-source security controls

- The clean install uses pinned Expo 57.0.32, Expo CLI 57.0.33 and the
  matching seven Expo SDK patch dependencies, with the npm 10 lockfile.
- Two pristine upstream CLI 57.0.33 files are recorded in
  scripts/devtools-validation-57_0_33-original with exact SHA-256 hashes.
  The postinstall guard verifies that installed sources match those hashes
  before modifying anything. Unknown future versions, corrupt fixtures or
  altered installed source fail closed.
- Bound developer plugin configurations to 128 commands, 64 parameters
  per command and two environment entries; bound output lists to 1024
  entries via the real JSON schema validator.
- Limit one developer plugin message to 1 MiB of UTF-8 bytes **before**
  JSON.parse and total buffered plugin output to 1 MiB code units. The
  existing typed text/audio/image parsing and failure reporting remain.
- Verify actual JSON Schema plugin validation, the injected-Zod MCP
  bridge, positive and negative output paths, source/version drift,
  idempotent installation and overflow handling in regression tests.
- Keep the development CLI private. These controls do not certify every
  supply-chain dependency and must not be used to claim no vulnerabilities.

## Verification and Android caveat

The source-only GitHub Actions run
https://github.com/madgercoin/madger/actions/runs/42407371015 passed
npm ci, all release source checks, companion/audio/graphics/security
tests, TypeScript/lint, Expo compatibility, web export, Expo Doctor,
and safeguarded Android AAB workflow tests. The earlier SDK 58 proposal
is deliberately not merged. Native source-matched Android APK/emulator and
physical-device QA, battery/thermal endurance, original art review, sound,
production signing, Play review and privacy deployment are still separate
release requirements. See RELEASE_CANDIDATE_1_5_1.md.

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
