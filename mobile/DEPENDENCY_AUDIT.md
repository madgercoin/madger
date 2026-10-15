# Burrow Run candidate dependency assessment

The initial October 12, 2026 `npm audit --omit=dev` reported 23 affected dependency nodes: one critical, 19 high and three moderate. These are not 23 independent vulnerabilities. Expo declares some development/build tooling as production npm dependencies, so `--omit=dev` does not establish installed-app exposure.

| Leaf package | Dependency path / exposure | Candidate treatment |
| --- | --- | --- |
| `shell-quote` | React Native → `react-devtools-core`; developer shell-command quoting | Compatible lockfile update from 1.10.0 to 1.12.0 removes the critical advisory. |
| `brace-expansion` | `minimatch`; build/lint file-pattern expansion | Compatible update from 5.0.9 to 5.0.12 (and patched 1.x copies) removes its high advisories. |
| `decode-uri-component` | Expo Router → `query-string` → decoder; app URL/query parsing, therefore runtime exposure | Backport the upstream 0.5.0 linear decoder into the existing 0.2.2 CommonJS API during `npm ci`. Preserve the old plus-decoding/export behavior. Clean installs fail if the expected upstream source changes. Router compatibility and hostile malformed-query tests are mandatory. |
| `braces` 3.0.3 | `micromatch` → `metro-file-map` → Metro/Expo/RN CLI; build-time file patterns | No patched version is published. Keep the current SDK; do not use npm's suggested SDK downgrade. Never feed untrusted patterns to, or expose, development/build tooling. Track the upstream fix. |
| `node-forge` 1.4.0 | Expo CLI / `@expo/code-signing-certificates`; development certificate verification | No patched version is published. No app-side certificate verification or OTA-update feature is added by this change. Do not process untrusted certificates with this tooling. Android JKS signing and independent AAB signature verification are separate paths. Track the upstream fix. |

After compatible lockfile fixes, npm still reports 21 nodes (18 high and three moderate). The three moderate nodes remain in the registry report because the retained CommonJS decoder package version is still 0.2.2; the reviewed upstream security backport changes its installed implementation. Do not report a clean npm audit, spoof the package version, suppress the advisory, or infer safety merely from CI passing.

The candidate's production Android Hermes export source map contains the URI decoder with the linear backport. It contains no `braces`, `node-forge`, `shell-quote` or `brace-expansion` module. This verifies the exported JavaScript dependency graph; it is not a claim that build environments or the full native artifact have no vulnerabilities.

The official 0.5.0 decoder is ESM; `query-string` 7 calls its CommonJS dependency directly as a function. An override to the ESM release would break that API. `scripts/patch-uri-decoder.mjs` checks the original source SHA-256, applies the upstream helper in `scripts/uri-decoder-linear.txt`, and verifies idempotent installs. The upstream MIT license is included. Remove this backport when a compatible official dependency update is adopted and revalidate query routing.

Remaining risks: the two unpatched build-tool vulnerabilities still affect developer/build environments. Candidate internal testing does not constitute approval for a production rollout. Public release requires reviewing those exposure assumptions, physical Android/iOS acceptance and the release checklist. Any evidence that attacker-controlled brace patterns or certificates enter these build tools is a release blocker. The malformed runtime-query path must remain patched and covered; an install/export that omits the backport is also a release blocker.

Sources: [shell-quote advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv), [brace-expansion advisory](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [URI decoder advisory and patch](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [upstream linear decoder](https://github.com/SamVerschueren/decode-uri-component/blob/v0.5.0/index.js), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
