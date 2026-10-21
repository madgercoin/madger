# MADGER 3D — living-world visual quality contract
October 20, 2026. Ongoing development specification, **not a release approval**.

## Creative benchmark
Aim for the environmental density, material response, continuous streaming,
distinctive landmarks and active atmosphere associated with a premium mobile
dark-fantasy game such as *Diablo Immortal*. This is a quality reference only:
do not reuse another game's protected assets, logos, UI or character designs.
Maintain MADGER's existing characters, original world and familiar controls.

## Scene acceptance
- All fifteen persistent route identities and three earned chambers must have
  identifiable 3D terrain, background landmarks and near/mid/far depth layers.
- Move the *world*, not scenery randomly: every background object has a stable
  absolute route-distance identity. Stream in and out through bounded fade or
  LOD zones with no visible teleport at 12m/24m updates and no path occlusion.
- Use correctly attributed/license-reviewed optimized 3D meshes, high-quality
  albedo/normal/roughness PBR textures, local and HDR environment lights.
- Keep animated, coherent vegetation and believable movement in machinery,
  mist/water, clouds, and ambient particles; reduced-effects mode must stay calm.
- Important interactive route features and hidden rewards must remain visible
  through the atmosphere. Never let ornamental landforms enter the three lanes.
- Distinct cave interiors use enclosed ceilings and authored minerals; never
  show an outdoor sky in underground/cavern/secret-chamber scenes.
- Keep hero motion, JUMP, BURROW, collision timing, earned hero unlocks,
  checkpoints, persistence keys, scores and route-choice semantics unchanged.

## Current incremental implementation
- Web PBR: one low-cost moving gradient sky, one instanced textured/normal/
  roughness-mapped far-bank draw, coherent distance-keyed landforms, gently
  moving scanned 3D canopies and foliage; low-detail mode culls far banks.
- Native Expo GL: a bounded instanced, normal-shaded sculpted ridgeline replaces
  some giant placeholder boulders; tree branches move coherently with game time.
  **Native is still NOT a full PBR GLTF/textured scene and is not at target
  visual parity with the browser.** It needs a source-matched mesh/texture/
  material renderer upgrade and stronger scene composition, not only particles.
- Browser sky/cloud appearance, character proportions, distant landmarks and
  full environment diversity still require art review. Do not call it photoreal.

## Mobile verification gates before any new preview
1. Complete validate, TypeScript/lint, fresh browser export and all 18 scene
   fixtures; test actual input, branching, secret rewards and save restoration.
2. Source-matched Android APK on emulator: UI, controls, audio, cold checkpoint,
   responsive app lifecycle, strict fresh foreground observation, error logs.
3. On physical Android test devices: record frame-time percentiles, graphics
   stalls, GPU/CPU draw time, memory, battery and thermals during at least
   20 minutes of active gameplay on forest, ruins and cavern routes. Aim for
   sustained >=30 fps on a representative midrange phone and near 60 fps on
   supported high-end phones; don't assume the PC Chrome results apply.
4. A single >400ms active-frame stall must retain the existing safe-pause gate
   and block release until investigated. Do not weaken safety/QA thresholds.
5. Require visually inspected stable frame captures on small phone and tablet,
   plus an asset/license inventory and full Android/native PBR parity review.

No paid generation credits. No signed or public Android release without proof.

## Real-time route traversal and crisp-control follow-up (October 20)
- The former stopping fork menus are retained only to restore historical
  paused checkpoints. New runs commit one of three physical junctions from
  Madger's **actual interpolated lateral position** without pausing forward
  simulation. At 455m, left is the lower trail, centre requires a timed
  upward jump and right requires burrowing beneath a root tunnel; absent
  actions or a locked vault redirect to the lower route. Actual route rewards,
  secret chambers, fragment gating, key consumption and persistence remain.
- The foreground native scene now illustrates a descending channel, a raised
  ledge, and a low root entrance, plus live approach direction labels. These
  are preliminary rendered approach markers, **not yet a fully sculpted,
  physically graded multi-level canyon**; genuine vertical terrain continuity,
  fall animations and per-route biome refinement remain artwork/gameplay work.
- Expo control icons use a 1-pixel contact extrusion rather than detached 5px
  shadow silhouettes, with shallower modern bevels and a contextual live
  three-choice indicator. Verify touch size and contrast on physical devices.
- The browser PBR terrain remains textured with normal/roughness channels;
  anisotropic sample caps increase to 6 on narrow devices and 8 elsewhere,
  and near/far scenery mesh subdivision and camera visibility are refined.
  Texture source resolution remains 1K; this is **not** a 4K asset upgrade
  or measured Android clarity improvement.
- New unit tests distinguish requested steering from physically reached lanes,
  exercise all nine path combinations, verify missed jumps/tunnels descend
  without fabricated damage and preserve legacy paused-fork saves.
- The unmodified protective >400ms pause and <=2-second native foreground
  verification remain mandatory. Android native PBR parity, sustained frame
  pacing and temperature certification are **not** established.
