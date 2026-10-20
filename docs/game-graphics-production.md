# MADGER — realistic 3D production direction

## Technical decision

Current `mobile/src/game/expedition` is a proven TypeScript simulation, and `mobile/public/blackroot/renderer.mjs` is a functional Three.js/WebGL presentation with limited imported glTF scans and PBR lighting. It is **not** a complete artist-authored environment: the visible level still relies heavily on basic procedural shapes. More shader tweaks or image-only concept art will not close the visual gap.

**Recommended production target:** a native Android game in **Unity with URP**, using Blender-created and properly rigged character meshes and an authored, textured environment. Retain the Expo browser game as the accessible playable preview, rules baseline and test harness. Do not overwrite or abandon the working web implementation before a superior native vertical slice is demonstrated.

**Alternative for mandatory instant browser play:** retain a Three.js/Babylon.js renderer but replace procedural primitives with UV-unwrapped and optimized glTF meshes, realistic materials, authored light probes/shadows and spline-based paths. This can look substantially better, but the fidelity and memory tradeoffs are greater on mobile browsers. Unreal Engine is not the recommended first move for a lightweight Chrome-playable mobile title.

## First art/gameplay vertical slice: one polished Overgrown Burrow board

Deliver one fully playable, highly authored section with a clear multi-route decision and meaningful collectibles; prove its quality before building more worlds. No empty placeholder environments:
1. **Ground and routes:** hand-shaped terrain, irregular floor silhouettes, real branching splines, physical barriers, ledges, roots, streams and cave interiors. Follow player-selected routes rather than painting interchangeable lane tiles.
2. **Materials and lighting:** authorized rock, mud, moss, bark and water PBR texture sets (albedo, normal, roughness/metallic/AO); baked indirect illumination, contact shadows, shadow-casting canopy, atmospheric depth and restrained tone mapping. Lighting must react believably as MADGER crosses from sunlit forest into covered tunnels.
3. **Character fidelity:** sculpt and retopologize MADGER from the approved design (no oversized fang, faithful stripe and natural limbs). Rig the body, face, paws and digging action; build LODs and fur cards instead of resource-heavy strand fur. Use the same pipeline later for Snow White, Gorilla White and MADGER Bot, without changing approved character identities.
4. **Route-specific composition:** safe/rootway uses rich canopy, mossy caches, healing and guardian shards; ridge features masonry, ruins, narrow bridges and technology; deep path uses root tunnels, crystal veins, mud hazards and elite treasure. Each needs readable silhouette, landmarks, previewable risk, playable alternatives and secret rooms.
5. **Responsive world-space feedback:** raised tactile HUD controls and icon depth; physically understandable collectible pickup animation, impact/debris, environmental reactions, timed companion summon/exit, and sound cues that match effects.
6. **Persistent freemium-style progression:** fragments unlock heroes, earned energy triggers one companion at a time, coins purchase lasting upgrades, and risk/reward options yield distinct drops. No paid currency or purchased unlocks need to be introduced to test fun.

## Migration safety and measurable acceptance

- Keep the current deterministic TypeScript rules and route/test corpus as the reference implementation. Port to native C# behind an adapter, compare seeded item positions and event sequences against exported fixtures, and validate saves/upgrades/hero currencies. Never silently replace users' saves or game package.
- Optimize for physical Android hardware: establish a measured 30 fps floor on the target test device and aim for stable 60 fps where supported. Confirm actual GPU frame times, RAM, cold-start time, thermal behavior, camera clipping and input latency. Use ASTC texture compression, mesh LOD groups, instancing, baked lightmaps and occlusion culling based on profiling.
- First approval gate: a **genuine in-engine gameplay screenshot plus captured movement video** showing one character, one real forest fork, a cave, and an animated BURROW action. Do not pass still images or cinematics off as playable graphics.
- Second gate: a downloadable signed Android test build installed and played on the physical phone; preserve a Chrome-playable preview but explain that native and browser builds may have different visual quality.
- Third gate: repeatable ten-minute playtests, save/reload, all route choices, unreachable-loot/softlock checks, readable hero rewards, clean audio, safe failure/recovery, and accepted device performance.

This is a **production plan**, not a claim that a Unity build or high-end character model exists yet. Quality and commercial success depend on art assets, performance, game feel and user testing, not on the programming platform or a prompt alone.
