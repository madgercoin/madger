# MADGER 3D environment development status

Updated: 2026-10-20. This is an in-progress development checkpoint, **not** a
photorealism, physical Android, signed distribution, or complete-game claim.

## Implemented in this checkpoint

- The existing, playable Overgrown Burrow scene uses the same rendered terrain
  elevation for scanned trunks, rocks, roots, ferns, grasses, and distant trees.
  Instanced scan bases no longer share one fixed height across raised banks.
- Every existing route ID has a distinct, reproducible scenic layout seed and
  authored tree, understory, and root scaling in `public/blackroot/world-presets.json`.
  The three forest/ruins/cavern biomes retain their CC0 scanned objects, 1K PBR
  channels, terrain relief, HDR/environment lights, fog and adaptive rendering.
- Large stumps and boulders were moved toward outer banks to protect the main
  running sightline. This changes the visual renderer only. Core movement,
  hazards, branches, unlock requirements, coins and saved profiles are untouched.
- Rendering diagnostics now expose `sceneryProfileLoaded` and
  `groundedSceneryInstances` for browser acceptance and regression tracking.

## Verified locally on the connected Windows machine

- `npm run validate` passed after the final code changes (see
  `expedition-evidence/automation-final-validation.log`).
- `node --test scripts/test-world-terrain.mjs`: seven passing checks for the
  15 defined routes, finite/scaled scenic profiles, exact playable-lane/gap
  elevations, and ground/scan anchor equivalence.
- `npx expo export --platform web` passed after the final changes (see
  `expedition-evidence/automation-final-export.log`).
- `node scripts/overgrown-browser-smoke.cjs` passed after the final changes:
  a live Chrome run loaded Rootway with 2 scanned tree instances, 6 root
  clusters, 32 grass instances, 5,529 contoured terrain vertices, and 460
  calculated scenery anchor placements; no page errors or failed assets.
  Evidence: `expedition-evidence/automation-final-branch-browser.log` and
  `expedition-evidence/overgrown-board/` screenshots.
- `node scripts/expedition-browser-smoke.cjs` passed earlier in the same
  checkpoint, after the new scenic profiles/grounding and before the final
  outer-bank clearance adjustment. On Intel UHD/Chrome it observed a 3.5-second
  uninterrupted segment averaging 16.74 ms/frame (p95 16.9 ms), with zero
  >400 ms frames; saved-run recovery, burrow, jump, pause, sound, and viewport
  checks passed. This is **PC Chrome evidence**, not an Android benchmark.

## Remaining release gates

1. Visually review all **15 routes**, including the three secret chambers and
   the physically continuous nine major/subfork combinations, on real device
   viewports. Distinct layout seeds and passing rules tests do not prove every
   level is high-detail or photorealistic.
2. Replace visibly primitive landmark silhouettes and unfinished ruin/cavern
   landmarks with authored geometry, route-specific props, PBR treatments and
   lightweight animation. Verify playable sightlines in each route screenshot.
3. Profile GPU memory, 30 fps floor, thermal throttling, and input latency
   with the **same source-matched APK** on low/midrange Android hardware.
   Android SDK platform-tools/emulator were not present in the expected
   locations on the connected Windows machine. No physical device acceptance
   has been recorded for these changes.
4. Verify persistent hero unlocks, fragment banking, route restoration and
   migration on Android install/upgrade before distributing another APK.
5. Publish a preview only after appropriate browser and native verification.
   Do not treat the exported web bundle as a Play Store release or a signed APK.

Preserve existing game IDs/storage keys; no save migration was introduced here.
No paid image, mesh, video, or other asset-generation credits were used.
## Experimental ruin architecture — draft follow-up (October 20)

- Four playable ruins routes (`ridge`, `causeway`, `watchtower`, `gearworks`) now have a reusable, deterministic PBR architectural layer: stone courses, individual voussoir arches, watchtower tiers, and rotating bronze machinery. Geometry is instanced and drawn on the outer banks, outside all three protected running lanes. It uses existing licensed PBR stone maps; no paid generation credits.
- Added tests for asset channels, bounded instance counts, all route identities, world-space playable-lane clearance, low-quality distance culling, deterministic poses, animations, and disposal. The renderer also attempts shader/texture warm-up while the game is loading.
- On the isolated draft checkout based on `580e7aa`, `npm run validate` and `npx expo export --platform web` passed. The three unit tests in `scripts/test-ruin-landmarks.mjs` passed.
- An earlier 430 x 920 Chrome run hit a **767 ms frame**, including 729 ms spent inside WebGL submission, at ~689k triangles on Ridge. The protective pause stayed intact. In response, the renderer prewarms genuine colour/texture/shader variants during loading and reduces distant rock/root/understory batches on ruins routes. JavaScript submission wall time is not a native GPU-timer measurement.
- **Follow-up browser regression passed for all three major biome choices after a fresh web export** (`expedition-evidence/automation-20261020-final-biomes.log`): Rootway 797,858 triangles / 86 calls / 0.65 scale; Ridge 405,392 triangles / 90 calls / 0.93 scale with 38 arch stones and 30 pier blocks; Deep Burrow 238,798 triangles / 80 calls / 0.80 scale. The short headless Chrome run showed no protective pause or failed assets. Scenery-CPU and WebGL-submission durations are now recorded. These point-in-time figures do **not** prove sustained FPS, Android performance, or thermals.
- Ruin instancing now reuses frame-to-frame colour/counter objects while preserving poses. The three deterministic landmark tests, full `npm run validate`, web export and three-biome browser regression passed on the isolated checkout (`automation-20261020-final-validate.log`, `automation-20261020-final-export.log`). Branch choices, collisions, earned heroes and saved progress were unchanged.
- **No preview promotion or signed release** is authorized. All 15 route compositions and three hidden chambers still need full visual/browser and source-matched physical Android testing. Independent Android CI on the parent QA branch has failures (a JUMP control was not visible in an exact-APK run, and separate HUD observation exceeded the unchanged freshness deadline). Preserve the safety gates; verify frame pacing, thermals, controls, route restoration, progression and save upgrades before distribution.
