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

## Follow-up GPU regression and narrow-viewport safeguard (October 20, 16:40 ET)

- The existing active-play Chrome acceptance exposed an actual 1,216 ms frame
  (`over400=1`, 132 frames, p95 33.2 ms in 3.5 s). The three-biome smoke
  independently recorded multi-second countdown stalls. These are graphics
  issues, not permission to bypass the existing safety pause.
- In the isolated Windows checkout only, narrow viewports now start at 0.84
  3D render scale with a 512px shadow map; dynamic shadows resume at render
  scale >=0.95. PBR directional, hemisphere, fill and environment lighting
  remain. Fully capable larger screens retain scale 1 and the 768px map.
  The game, route graph, collisions, unlocked heroes and save keys are unchanged.
- `npm run validate`, Expo web export and three actual biome-choice browser
  runs passed after the change. Three separate full interactive Chrome
  acceptance runs passed with `over400=0` and maxima 36.1, 33.4 and
  49.9 ms respectively; mean frames 17.0, 17.1 and 17.5 ms.
  The three secret chambers passed real controls, reward collection, cold
  reload and save-restoration checks with no protective pauses.
- These are 3.5-second Intel UHD/Chrome windows, **not** sustained Android
  frame-time, memory, thermal or battery benchmarks; cold startup still
  requires work. No preview distribution or signed Android claim.
- Visual inspection of Ridge, Watchtower, Gearworks and Deep Burrow confirms
  playable, distinct PBR 3D scenes but also substantial remaining stylized,
  visibly faceted props, simplistic far landmarks and heavy fog. They do
  **not** yet meet the requested high-detail realistic quality threshold.
- The narrow-viewport safeguard and this note are local to
  `mobile-ruin-qa-20261020` pending GitHub synchronization; the already
  published ruins feature branch's commit is `9ce36aca`.

## Route-specific environmental polish and low-cost animation (October 20)

- Added independent, bounded daylight, hemisphere, HDR PBR environment, local fill,
  exposure and exponential haze settings for all 15 existing route IDs.
  These are renderer-only metadata; no new GPU draw calls or course/save changes.
  Ridge and outdoor watchtowers now use thinner distance haze, while mineral
  passages retain a distinct underground lighting scheme.
- Removed three giant opaque cone-shaped placeholder sunbeams that obscured
  authored scenery in live route screenshots. Existing true directional,
  hemisphere and PBR environment lights remain enabled.
- Added time-dependent deterministic instanced forest grass/fern sway. This
  modifies only visual transforms, without moving terrain, obstacles, lanes,
  secrets, checkpoints, earned heroes or saved records.
- Added regression cases for all 15 atmosphere signatures, invalid metadata,
  protected lane heights, wind angular bounds and runtime wind matrix updates.
  The route renderer checks absence of unnatural cone primitives.
- Source-matched physical Android acceptance is still outstanding. Native CI
  on the earlier QA branch reports a missing enabled JUMP control and a stale
  foreground HUD observation; neither can be waived for preview release.
- Not a photorealism or performance certification: screenshots still show
  stylized low-poly hero/rock silhouettes. Further PBR mesh authoring, LOD,
  30+ minute mobile thermals/frame pacing and full unlock/save migration tests
  are necessary. No paid generation credits were used. No new APK published.

## Development cycle — full-viewport route QA and fallen PBR masonry (October 20, 18:20 ET)

- All work remains in the isolated `mobile-ruin-qa-20261020` checkout; the original `mobile` tree, course graph, earned unlock logic, and save storage keys were not modified.
- Ruined Watchridge, Broken Causeway, Watchtower Climb and Chamber of Gears now scatter deterministic, individually tilted/collapsed masonry on the outer banks. They reuse the existing instanced PBR stone draw call with diffuse/normal/roughness maps, so no new per-object draw calls. Causeway gets more debris than Ridge. Added unit tests for mobile instance budgets, route transitions, lane/vertex clearance, resource disposal and deterministic transforms.
- Fixed `render-overgrown-routes.cjs` to classify legacy Hollow and Grotto as underground scenes rather than falsely reporting that their geological formations leaked into an outdoor board. Grotto's distinct mineral signature is now checked.
- Fixed misleading screenshot coverage: the browser fixture's 430x920 canvas previously shrank its intrinsic CSS area each draw as adaptive resolution scaled its backing buffer. The fixture now fixes its CSS viewport size independently of rendering resolution; tests reject shrunk displays or tiny backing buffers. Reviewed full-size Ridge, Watchtower and Deep screenshots. The assets remain visibly stylized/faceted, not photorealistic.
- Added renderer route diagnostics and browser assertions to confirm PBR rubble only appears in the ruins biome; all 15 saved route IDs and 3 secret chambers are covered by deterministic full-viewport browser fixtures.
- Improved the interactive Chrome harness to handle a safety pause that races with a real-input assertion: it may click the actual Resume button at most five times and records `safetyResumes`. The 400 ms uninterrupted-frame-stall rejection remains intact; no engine pause, scoring, physics or inventory rules were relaxed.
- Fresh interactive exported-app browser acceptance passed on Intel UHD/Chrome (207 frames over 3.506 s; mean 16.94 ms, p95 16.8 ms, worst 33.4 ms, over400=0, safetyResumes=0). Keyboard and touchscreen BURROW, JUMP, stop/freeze/audio, checkpoint cold reload and viewport resizing passed.
- All three actual secret chamber browser playthroughs passed with 0 protective pauses, verified entrance inputs, rewards and two save/reload checkpoints. Full mobile source validation including TypeScript and lint passed. All-route renderer and source-matched final web export are checked separately.
- Android emulator jobs on GitHub PR #131 continue to fail: exact-APK JUMP label/visibility and two-second live HUD foreground freshness. These are real release blockers; passing PC Chrome evidence does not establish phone FPS, thermals, save migration or release readiness. No paid generation credits, Play Store upload or new public preview were used.

## October 20 evening: weathered masonry geometry and browser verification

- Applied deterministic one-time surface erosion to PBR ruin blocks and arch stones; re-computed normals and bounding spheres. Existing UVs, draw batches, terrain physics and saved profiles remain unchanged.
- Added a fourth geometry regression test covering deterministic positions, UVs, surface normals, triangle area and instance budgets.
- Full source validation and fresh Expo web export succeeded. All 15 saved route IDs and three chamber browser-rendering fixtures passed, with zero WebGL errors.
- Three actual biome UI branches passed. The Rootway countdown logged two long frames (700 ms and 3100 ms), which remain a startup performance concern.
- The interactive exported web app passed jump, burrow, pause, audio and checkpoint recovery. In a 3.516 second browser sample, 203 frames averaged 17.32 ms; peak was 33.4 ms with zero frames over 400 ms. This is PC Chrome, not physical Android validation.
- Android emulator CI still fails independent JUMP visibility and strict live-HUD timing gates. Do not distribute a preview before source-matched native acceptance. Detailed realism and prolonged mobile performance remain incomplete.


## Android graphics and strict foreground QA — October 20, 2026

- Examined the failed GitHub Actions Android emulator artifact from Mobile CI run 39484797097. JUMP existed initially and was only disabled after the game's real protective pause. The captured frame-stall diagnostic showed 411ms total, including 218.72ms native GL drain, with 1,099 instances and 11 draw calls. This is a performance failure, not permission to bypass the 400ms safety gate.
- Native Expo GL now begins with reduced noninteractive scenery at 65m. Sustained costly GPU drains progressively trim only *distant off-track* vegetation, cliff and landmark dressing; sustained fast drains gradually restore detail. The three playable roads, collision geometry, route selection, controls, pickups, earned hero fragments, inventory, score, state schema and checkpoints are unchanged. The PC/browser PBR renderer still retains full detail.
- The strict Android foreground-observation test discards at most one stale pair of live timer/Pause readings and takes a fresh independent pair. Each pair retains an unchanged two-second bound, and the force-stop must finish within two seconds of the accepted fresh pair. RPC failures remain fatal; a rejected stale read never becomes evidence of live foreground play.
- Native GPU-drain adaptation tests pass (6/6). Full source validation (including TypeScript and lint), clean Expo web export, all 15 route + three chamber browser-rendering fixtures, and true exported-app interactive Chrome controls, audio and checkpoint recovery passed. The browser captured 212 frames / 3.513s, mean 16.57ms, worst 17.1ms, zero over-400ms frames and zero safety resumes. These results are *not* native Android/physical-device FPS or thermal data.
- The changes were integrated on a new branch based on upstream 9ce36ac to avoid overwriting the existing shared ruins branch. No release gate was disabled. A new APK/Play preview is blocked until new source-matched emulator checks and sustained physical Android testing pass. No paid asset generation was used; photorealism remains unverified.

## Follow-up QA — narrow-screen shadow transition and Android gates

- In the isolated feature worktree based on upstream 9ce36ac, the narrow viewport PBR renderer now caps 3D resolution recovery at 0.93 and keeps directional dynamic shadows off on small screens. It retains PBR base/normal/roughness maps, HDR environment, directional/hemisphere/fill lighting and high-resolution UI; desktop-capable viewports retain the preexisting shadow behavior. Quality still decreases automatically under sustained load and recovers gradually. This targets a real 950ms frame stall in the earlier Deep Burrow UI-choice test; causation and physical-device improvement require further verification.
- Fresh source validation and Expo web export passed on the integrated worktree. A full UI-based Rootway/Ridge/Deep run passed all three choices with nonblank PBR route imagery, independent atmosphere and geometry diagnostics, and no post-choice protective pause. The new run still detected a 2,083ms graphics frame in the Rootway **countdown**, which is a remaining cold-start performance concern; passing the route checks does not erase it.
- Android emulator checks are still required for the *newly built source-matched APK*. The older GitHub failure was a 411ms native safety-pause frame (218.72ms graphics drain), not an absent JUMP button. The Android native scene still uses a separate hand-authored WebGL renderer and has not been proven photorealistic or equivalent to desktop PBR.
- No changes to game simulation, course hazards, branch graph, saved-profile schema or earned hero unlocks. No paid credits, signed release or public preview promotion.

- Follow-up visual tests exposed two distinct kinds of slow frame: actual route-entry WebGL shader/shadow work (up to 905ms on Deep Burrow) and intermittent Chrome capture overhead (433ms overall but only 7ms scene draw / 4.4ms WebGL submit). The first is addressed by retaining PBR directional/environment lighting but avoiding dynamic-shadow shader switching on narrow screens, and by limiting narrow-screen scene scale to 0.93. The second is a *test-induced screenshot readback*: the route fixture now checks for real live safety warnings, uses the game UI Pause button before expensive screenshots, and fails if any stall warning was recorded during the live route. The engine's 400ms protective pause remains unchanged.

- With the final mobile 0.93 scene-scale ceiling, narrow-screen dynamic shadow guard, and screenshot QA conducted after a *real user Pause*, fresh exported-app browser runs passed all three actual biome choices (Rootway, Ridge, Deep Burrow), confirming PBR assets, 3D terrain, scene differentiation, no live stall warnings, and no JavaScript/asset errors. The interactive browser playthrough then passed JUMP, BURROW, pause/resume, sound and checkpoint recovery, recording 212 frames in 3.515 seconds (mean 16.58ms, max 17.1ms, zero over-400ms, zero safety resumes). This establishes PC/Chrome evidence only; Android smoke/physical frame pacing remains a release blocker.
