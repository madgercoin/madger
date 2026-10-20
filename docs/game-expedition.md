# MADGER 3D Expedition

## Forest environment realism pass — October 2026

The browser-playable Overgrown Burrow now uses real, CC0-scanned **3D broadleaf tree, forest roots and grass** assets instead of relying on large synthetic trees, blocky cliffs and fake floor foliage. Original Poly Haven models were converted offline into mobile game-ready glTF LODs and bundled with the Expo browser preview. Provenance, image/geometry checksums and LOD triangle budgets are recorded in `mobile/public/blackroot/FOREST_ASSETS_PROVENANCE.json` and guarded by `mobile/scripts/test-forest-environment.cjs`.

| New source asset | Mobile LOD triangles | Bundled GLB bytes | Gameplay purpose |
| --- | ---: | ---: | --- |
| `island_tree_02` | 68,282 | 10,098,392 | Actual textured and branched leafy trees flanking forest paths |
| `root_cluster_01` | 12,359 | 3,303,136 | Photoscanned roots and believable trail-side obstacles |
| `grass_medium_02` | 4,702 | 703,396 | Dense 3D grass and low plants under the tree canopy |

The optimized `forest.pack` is 24,699,375 bytes and contains 33 model, environment-lighting and texture assets. This is **larger** than the earlier web preview; network startup and real-phone GPU performance still require verification. Only one pack loads; the original 46 MB tree source and other large high-polygon scans are excluded from deployment. The runtime samples frame time and reduces 3D resolution/visible foliage on slower devices without altering HUD size.

The old environment mistake was traced to normalizing every scanned object by its height. Flat logs and rocks became canyon-sized and obstructed the camera. Logs, root clusters and rock formations now normalize by their **longest axis**, while standing trees preserve correct height scaling. The corridor no longer has an enormous false rock wall. The ground is now one continuous deformed and vertex-tinted PBR terrain mesh (5,529 control vertices), with mossy shoulders, varied earthen trail, banks and gaps instead of repeated rectangular track slabs. Photogrammetry foliage and near-ground vegetation use instancing; cavern and ruin route gameplay remains unchanged.

Browser QA uses the **real exported game** and normal controls, not injected game-state. Tests assert that the new trees, roots, grasses and contoured terrain truly render after the first fork. In the desktop reference run, the forest scene displayed up to 8 tree instances, 6 roots and 48 grass patches with adaptive resolution. The three hidden-chamber tests independently confirmed enter, pause, cold reload, selectable rewards and preserved checkpoint recovery. Source test suite and Android native regression still need to be considered separately.

**Visual limitations:** This is a tangible realism improvement to a procedural Three.js/Expo web preview, not a completed photorealistic game or a Unity migration. The existing MADGER hero rig, distant biomes, and lighting remain less detailed than finished commercial 3D artwork. New signed Android APK and physical-phone performance acceptance are not yet claimed.


## Flagship Overgrown Burrow web test (October 19, 2026)

**Verified playable browser preview:** https://madger-expedition--52lqwih09c.expo.app/expedition (Expo EAS web deployment, tested Oct 19). Hosted Playwright QA confirmed PBR renderer/forest pack load, real asset HTTP responses, interactive training and fork, hero-unlock workshop, pause, cold reload, and resuming the saved same-route run. This is not a signed new Android APK or Google Play release; Build 14 remains the older Android-only build.

The **new browser test** now starts in a single authored Overgrown Burrow world rather than cycling through the previous three visual zones. The opening corridor leads to a mandatory, untimed choice of Mossbound Rootway (lower risk, guardian materials), Ruined Watchridge (medium risk, electronic materials), or Deep Burrow (high risk, Snow White materials). Around 455 m, each main choice opens three distinct sub-route selections: nine secondary paths overall. Each selected path is represented by its own physically diverging and rejoining 3D road geometry, environment treatment, hazard schedule, collectible set and specific risk/reward profile. Choosing a path pauses the run for a player decision; time, hazards and companions do not advance behind the menu.

Snow White, Gorilla White and MADGER Bot no longer auto-appear in the **new board**. The player collects four matching fragments over one or more runs for a permanent unlock, fills one earned hero-energy meter by collecting coins, gems and fragments, and manually summons an unlocked ally at 100% energy. Active allies remain single-instance and their established attack/defense/electronic mechanics are unchanged. New run fragments and coins are banked on completion or defeat once only. The Burrow Workshop accepts **earned coins only** for up to three permanent ranks in armor, magnet or treasure fortune. The shop has no IAP, ad, payment, or misleading paid item gate.

The board uses more custom geometry, forest/ruin/cavern landmark sets, separate branch paths, and procedural dirt, rock and bark shading. This is an improved **playable procedural-art iteration**, not yet cinematic photorealism or finished sculpted/PBR character production. External rigged characters, baked shadows, authored PBR textures and physical Android performance testing remain release-quality art tasks. The previous 1.5.0 build 14 Android APK **does not** contain these new browser-only changes; a new signed APK requires a fresh build and native verification.

Verification: `npm run validate` (includes `scripts/test-overgrown.cjs`), `npx expo export --platform web`, `node scripts/expedition-browser-smoke.cjs`, and `node scripts/overgrown-browser-smoke.cjs`. The latter visits the earned-coins workshop, inspects locked heroes, reaches a real first fork, verifies the fork freezes progression, and selects an actual physical branch without injecting game state.

## Previous three-zone course and compatibility

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

## Overgrown Burrow preview — October 19, 2026

New runs use the Overgrown board; legacy v1 checkpoints retain the original course and storage key. The board stops at 140 m for three major choices, then at 455 m for three subchoices specific to the selected path. Roads visibly diverge and rejoin. Every subpath has its own hazard family and collectible rewards. Deep Burrow supplies a key; Ancient Vault requires and consumes one at entry and supplies another before its treasure chest.

Four collected Snow Sigils, Guardian Totems, or Tech Cells permanently unlock Snow White, Gorilla White, or MADGER Bot respectively. Treasure charges a shared summon meter. Activation requires 100% energy and no active companion, so earned support cannot overlap. Snow White remains offense with bark-only audio, Gorilla White supplies bounded defensive saves, and Bot supplies electronic boosts. Finishing or losing banks coins, relics and fragments once. Coins purchase three levels each of starting armor, starting magnet and treasure fortune. Settings, old records, paused forks and interrupted runs retain v1 compatibility.

Chrome now loads the pinned local Three.js renderer, Poly Haven scanned ferns, rock formations and dead tree trunks, diffuse/normal/roughness material maps, HDR environmental illumination, directional shadows, continuous terrain, branched canopy trees, cave ceilings and subtle light shafts. Character geometry and animation come from the existing approved rigs; no new fang or character replacement was introduced. Assets are local to the deployment with license/source records in `mobile/public/blackroot/`. Dense scans are clustered before instancing. Slow devices can reduce the 3D buffer to 80% while the interface retains native resolution. This is an improved playable preview, not a claim of photorealistic AAA completion or universal 60 FPS.

Native Android retains the existing Expo GL renderer with Overgrown geometry and the updated progression/gameplay. The new scanned-material Chrome renderer has not been ported to Android. EAS preview build 17 was submitted from the working tree on October 19; consult its actual build status and artifact rather than treating submission as a completed or tested APK.

Validation includes `npm run validate`, `npx expo install --check`, `npx expo export --platform web`, `node scripts/overgrown-browser-smoke.cjs`, `node scripts/expedition-browser-smoke.cjs`, and `node scripts/render-overgrown-routes.cjs`. The Overgrown rules tests traverse all nine complete route combinations with movement actions, test key consumption, exclusivity of summons, progression banking and v1 recovery. Browser acceptance uses ordinary controls for input, forks, workshop, locked heroes and recovery. The separate route-render test uses explicit deterministic fixtures for all twelve major/subpath views and must not be described as twelve full browser playthroughs. Local evidence is under `mobile/expedition-evidence/`.

Remaining work includes bespoke high-detail hero assets, further board-specific landmark/chamber art, broader balance and sustained phone/GPU performance testing, and bringing the scanned-material presentation to native Android. Saved progress is browser-origin-local; a fresh Expo preview hostname does not automatically share saves with an earlier preview hostname.

## Secret chambers update — October 19, 2026

Three optional, fully modeled interiors now require an action at a route-specific doorway. Root Arch Hollow hides the Guardian Nest in the left lane at 704 m (burrow). Chamber of Gears hides the Capacitor Sanctum in the right lane at 716 m (jump). Crystal Vein hides the Buried Moonwell in the center at 704 m (burrow). A clue appears 65 m before each doorway. Door IDs are appended after the previous course IDs so existing checkpoints retain object identity. The entrance window allows time to complete a jump started at the marked hatch.

Entering safely surfaces MADGER in the room and freezes the course, hero support, and power timers. Each chamber presents a hero-fragment or survival-supply choice. Both choices award eight coins, two relics and 900 score. The fragment also grants the normal fragment score/energy and permanent-unlock progress. Guardian supplies restore two grit and one shield for 45 seconds; Sanctum supplies grant an 18-second magnet and 40 burst energy; Moonwell supplies restore one grit and grant an extra life, respecting the existing reserve limit. Treasure is recorded once per run and banks through the existing terminal-run flow. A chamber can cold-reload before or after its choice without replaying rewards.

The Chrome renderer now grows instance buffers according to actual scene use and uploads only occupied ranges. Wall and floor material projections follow the visible face rather than stretching horizontal texture coordinates up vertical masonry. Graphics-module URLs carry the chambers release version so the existing stable preview hostname can load updated scene code. The existing character rigs and Snow White bark-only audio remain unchanged.

Additional validation: `node scripts/test-chambers-browser.cjs` uses explicit saved approaches, then ordinary movement, reward buttons and reloads to check all three secrets. `node scripts/render-overgrown-routes.cjs` now includes the three interiors alongside twelve route fixtures. These fixtures are separate from full-route simulation and ordinary-start browser acceptance.

The shared web layout preloads the Material Community icon font with a real private-use paw glyph before mounting icon components. This fixes the font observer's default Latin probe timing out on cold recovery. Failed interface loads offer a retry; native font loading is unchanged. The complete browser recovery test passes without script errors after this change.

Hosted reload testing exposed HTTP 429 responses during bursts of individual texture requests. The Chrome graphics loader now reads the same thirty source assets from one 10,594,177-byte `forest.pack` file, decodes its small index, and gives Three.js local Blob URLs. Texture/model source content and attribution are unchanged. The pack download retries transient rate-limit/server responses with bounded backoff. Run `node scripts/pack-overgrown-assets.cjs` before exporting the website when graphics assets change. The packed assets and the generated character module are deployed together with the versioned renderer.

Web audio players are now instantiated when needed, so paused recovery and chamber screens do not fetch every sound in advance. Active background music/ambience and individual cues reuse their players, with the existing cancellation tokens retained. Native keeps its previous eager preloading. Audio tests cover lazy web allocation as well as delayed seek cancellation, mute/pause, priorities and disposal. Hosted fixture runs pause between chambers to respect the host's request limits rather than treating repeated automated reload bursts as ordinary play.

The pinned Expo 57 web audio player discards the promise returned by its internal media element's `play()`. Expedition observes rejection on each created web media element so intentional pause/removal cannot leak an unhandled playback-cancellation promise. No global media prototype is changed. Tests reproduce the SDK's dropped internal promise as well as cancellation returned directly from a player.

Android build 17 completed and its artifact was downloaded (121,179,284 bytes; SHA-256 `248bbe1c14326227011d2d2a058461ba6e3cc5d3d65875775eef0a26cd5739a9`). This is the previous Overgrown update, not the chamber update. The chamber implementation was submitted as preview build 18 (`c17dddce-2558-4d38-9c75-ca4c8787c310`). Neither build is represented here as device-tested. The Chrome material renderer remains separate from native Expo GL rendering.

Build 18 subsequently completed at 23:12:59 UTC. Its downloaded APK has SHA-256 `c88a85a82e9d1191b6958becfa3ea25553bab26cc0630069baac3594a0555f6a`; the embedded Android bundle contains all three chamber identities and the chamber-door mechanic. This inspection confirms bundled content, not APK signature verification or device acceptance. The build artifact is `https://expo.dev/artifacts/eas/5oM2OHoruFboTZVduxLkymPsW6ph4KzuBNzuiuitDoc.apk`.

The final verified Chrome chambers release is deployment `3te2jbxv8y`, assigned to the existing `overgrown-burrow` alias. Hosted renderer and character-module SHA-256 hashes match the tested local files. Reusing this alias preserves the browser origin used by the previous Overgrown preview.
