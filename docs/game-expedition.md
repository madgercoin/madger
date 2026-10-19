# MADGER 3D Expedition

## Current implementation

The Expo app opens Expedition from the first card on Home. The game uses an articulated 3D character and an instanced WebGL renderer through expo-gl. It has a 1,080-metre course across the Overgrown Burrow, Forgotten Works and Crystal Grotto.

The player can steer between three lanes, jump, burrow beneath the surface, activate an earned burst, collect relics and coins, recover health, gain shields and extra lives, and discover hidden routes. A hidden workshop grants a run upgrade. Keys open the sealed vault; the final treasure precedes the finish. The discovery journal and completed runs persist separately from the original Burrow Run records.

## Down-to-burrow controls

Down, S, a downward swipe, and the BURROW button make grounded MADGER dig below the surface, travel with a moving soil mound and dirt trail, then emerge. The action lasts 0.83 seconds with a 1.02-second cooldown. Pressing Down while airborne retains controlled fast descent. Burrowing passes under overhead roots and drones; gaps, saws, crates and boulders retain their existing collision rules. Mud still slows the run. A finished run visibly surfaces MADGER even if it ends during a burrow.

Existing saved runs remain compatible: version-one checkpoint fields retain their historical slide names, while player-facing controls and status read BURROW and burrowing. Pausing or restoring a run preserves the active action until play resumes.

## Companion behavior

| Companion | Support | Duration | Gameplay effect |
| --- | --- | --- | --- |
| Snow White | Attack | 18 seconds | Lunges at approaching drones or crates and awards 125 points when contact actually clears a threat. |
| Gorilla White | Defense | 16 seconds | Provides up to three guard saves, including ledge rescue, with a short guard cooldown. |
| MADGER Bot | Electronic boosts | 14 seconds | Adds 45 energy on arrival, recharges energy, attracts pickups, disables electronic traps for 80 points, and extends a burst activated during support by 1.2 seconds. |

Companions enter from course beacons, follow Madger through lane changes and secret routes, and exit when their support expires. Refresh beacons extend support without creating duplicates. The HUD displays remaining support and guard saves; the results screen records team assists. Snow White and MADGER Bot reserve unresolved targets symmetrically so they do not waste abilities on the same threat.

## Character and audio requirements

MADGER has normal, small, even teeth and no oversized fang. The latest user correction overrides older one-fang branding instructions. His arms remain naturally proportioned. Snow White stays compact and lightly cartoon styled. MADGER Bot has a mechanical visor face without an animal muzzle or oversized tooth.

Locomotion uses ground-linked stance and raised swing phases; all parts of a paw or foot move together. Effects accompany meaningful game events. Audio priority must invalidate delayed playback when a cue is interrupted, the game pauses, the app backgrounds, or a scene is disposed. Existing audio assets are retained; this change does not establish new official character voices.

## Persistence and simulation

Gameplay runs at a fixed 120 Hz independent of render cadence. Foreground stalls longer than 400 ms pause the run before unseen damage can occur. Pausing and backgrounding stop active audio and save a recovery point. Checkpoints restore paused, validate target identity, and preserve companions without duplicate scoring. Finished runs are banked once using serialized storage writes. Failed saves remain visible and retryable.

The renderer uses high fragment precision where supported to keep course-coordinate shading within range on mobile GPUs, and bounded grain inputs on the lower-precision fallback. Reduced effects mode suppresses optional effects while preserving gameplay cues.

Native rendering drains each submitted Expo GL frame before allowing the next one to queue. This bounds presentation lag when native work is slower than the JavaScript animation loop. The first and thirtieth native frames log instance/draw counts and drain time for verification; web rendering retains browser scheduling. Source tests exercise queued native work and both batching paths. Paused and upgrade screens redraw only when their state, layout, settings, or graphics surface changes. Animated material caching is bounded, tail vertices reuse allocated buffers, and fixed course features are indexed once per course. Loading a course resets camera initialization so a paused checkpoint inside a hidden route is framed correctly. Geometry comparisons preserve the previous tail triangle stream and scenery matrices. The signed build 14 APK passed native animation, BURROW controls, and recovery checks on the Android 15 software emulator in [QA run 39229821033](https://github.com/madgercoin/madger/actions/runs/39229821033). The [current evidence record](../reports/game-expedition/README.md) includes both that successful run and the earlier same-build 440 ms protective pause. These short checks do not establish sustained physical-phone performance.

The renderer also excludes primitives whose entire transformed local bounds fall outside the camera clipping volume. Bounds come from the actual vertices, including the updated animated tail, and account for rotation, nonuniform and mirrored scale, shear, and numerical tolerance. Surviving instance data and order are unchanged. Non-affine matrices remain visible. Independent corner tests and a 27-frame WebGL comparison verify that this optimization preserves rendered pixels; native performance is assessed separately on the signed APK.

The renderer uses indexed instanced drawing when exposed by the graphics context. Static meshes share only bit-identical position and normal records; the animated tail shares stable grid identities across poses. The original expanded arrays, triangle order, and shaders remain intact, and contexts without indexed instancing retain their array draw path. Exact stream reconstruction and independent pixel comparisons verify this work. The existing first and thirtieth native frame diagnostics also report indexed draw counts so Android evidence can confirm which path ran.

## Validation

From mobile/: run npm run validate, npx expo install --check, and the repository's export/build checks. The expedition tests cover seeded course generation, collision versus visible movement, jump/burrow rules, secret-route continuity, upgrades, extra lives, finish banking, corrupt storage, save failures, interruption recovery, and ordinary-control winning runs. Companion tests cover distinct abilities, timing, target reservations, saved-state integrity and rendered anatomy. Audio regression tests use delayed seek promises to check cancellation and cue priority.

Browser evidence is useful for exported web behavior and layout. It is not physical Android acceptance. An Android test APK must be built, signature/identity verified, installed and exercised on an available Android target before its native behavior is reported as tested. Production Play distribution retains its existing release gates and signing requirements.

## Release record

This is the active upgrade branch. Consult its current build evidence and release notes for the exact APK version, commit, signature, test coverage and remaining limitations. The earlier 1.4.0 preview does not contain this Expedition implementation.


## Android Expedition preview

Version 1.5.0 uses the EAS `expedition-preview` profile to build an internally distributed standalone APK. It sets `MADGER_EXPEDITION_PREVIEW=1`, names the app `MADGER Expedition`, and uses `com.madgercoin.expedition.preview`. This distinct identity installs alongside both the official application and the older CI preview. EAS manages the preview signing key and increments its build number. Build with `npx eas-cli@24.3.0 build --platform android --profile expedition-preview`; this command does not submit to Google Play.

After `npm run release:check`, run `node scripts/expedition-browser-smoke.cjs` against the freshly exported `dist/`. The standalone scene probes in `expedition-render-check.cjs` and `expedition-gpu-profile.cjs` check rendering separately. Keep emulator evidence distinct from physical-device QA.
