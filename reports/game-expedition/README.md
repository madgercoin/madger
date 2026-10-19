# MADGER Expedition 1.5.0 preview evidence

## Current source: Down-to-burrow

Grounded Down, S, a downward swipe, and the BURROW button make MADGER dig below the surface, move with a soil mound and dirt trail, and emerge. Airborne Down retains fast descent. The action timing, cooldown, obstacle rules, hidden routes and version-one recovery fields remain compatible. A run that ends underground visibly surfaces MADGER.

The web game controls now use completed press events so quick mouse clicks, touch taps and button keyboard activation are delivered. Native controls retain immediate press-in actions.

The renderer combines conservative camera culling with indexed instanced geometry. Static vertices share only identical positions and normals; animated-tail indices remain stable across poses. Original triangle order, shaders and fallback array paths are retained. Native frame submission remains bounded and the existing 400 ms safety pause remains active.

## Completed source and web verification

The full mobile release check passed **130 tests**, TypeScript, Expo lint, Expo dependency compatibility, the web export and source release metadata. Two optional baseline/benchmark cases remain skipped in the routine test command. The dedicated GL comparison passed all **27 pixel comparisons**, with zero changed channels across three viewport sizes and the indexed path used in every case. Both renderer versions draw the same current scene, including the burrow pose; this establishes renderer equivalence rather than matching the removed slide animation.

The exported web app passed **12 checks** at 2026-10-19T08:34:19.397Z: boot, detailed nonblank rendering, idle animation, jump, Down and quick BURROW touch input, observed active drawing, frozen pause, stopped pause audio, cold checkpoint restoration, resumed progress, reduced-effects persistence, and phone/tablet layouts. No JavaScript or asset-request errors were recorded. Its uninterrupted sample contained 211 frames over 3.5 seconds, with 16.59 ms mean and 17.2 ms maximum, and 2,321 observed draw submissions.

A prior PC-browser diagnostic encountered a 2.016-second frame gap and correctly failed the stall gate. The accepted repeat above establishes the stated short functional scope and does not establish sustained physical-device performance. A separate capture-interrupted run remained safely paused; the interaction harness resumes from such capture boundaries before testing its next action.

Evidence:
- `source-acceptance-20261019.json`: source checks and source-file hashes.
- `culling-visual-equivalence.json`: 27 exact current-scene renderer comparisons.
- `app-runtime-smoke.json`: exported app checks and measured uninterrupted interval.
- `02a-burrow-midpoint.png`, `02b-burrow-emergence.png`: deterministic scene visual review.
- `app-03-burrow-keyboard.png`, `app-03-burrow-button.png`: actual app inputs.
- `app-04-paused.png`, `app-05-recovered.png`: actual pause and cold recovery.

## Replacement Android acceptance pending

The next EAS `expedition-preview` APK must pass checksum, signature, package and version verification, followed by both the Expedition and legacy Burrow Run Android suites. Its expected app identity remains `com.madgercoin.expedition.preview`, named MADGER Expedition, version 1.5.0. This is an internal Android preview.

Build 13 added camera culling but still produced intermittent native safety pauses in the Android 15 software emulator. Its binary is therefore not the accepted final burrow build. The legacy test also exposed expensive live accessibility queries that could allow an unattended Daily run to end before the intended process-kill checkpoint test. The harness revisions retain the observation freshness and rollback gates and are recorded in their GitHub runs.

The `native-*` files currently preserved in this folder are historical build-12 evidence. The corresponding narrative is archived in [history/build-12-evidence.md](history/build-12-evidence.md). They do not attest to the new burrow/indexed source. They will be replaced by exact-artifact evidence once both native suites pass.

Physical-phone frame rate, temperature, battery use and complete audio acceptance have not been measured. No iOS distribution or Google Play submission is included.
