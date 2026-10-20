

## Cavern geometry and verification — October 20

The underground web renderer now adds a deterministic limestone stalactite field and route-specific quartz/mineral seams. These are actual three-dimensional, camera-relative, instanced meshes attached above the traversable lane clearance. The meshes reuse the already shipped CC0 PBR stone textures, with separate mineral highlights, no new paid assets, and bounded draw/triangle budgets. Deep Burrow, Mudslide, Crystal Vein, Ancient Vault, Hollow, and Grotto have route-specific geometry; interior secret chambers hide the main tunnel mesh. The code does not alter the game's deterministic collision, earned hero unlocks, rewards, or persistent checkpoints.

Local evidence: 88 Expedition tests passed (2 skips), all 15 real browser renderer route/chamber fixtures passed, and all three interactive secret rooms passed ordinary action/choice/cold-reload testing after the normal jump-entry timing was aligned to the hatch. The desktop screenshots still show visually crude rocks and props; this geometry pass alone is not production-level realism or a verified Android build.

Browser acceptance and the same-source Android release test in GitHub remain independent publication gates. Do not merge or call the game complete based only on local graphics fixtures.


## Adaptive software-GPU graphics fallback

On devices presenting an actual software rasterizer (SwiftShader, llvmpipe or softpipe), the existing web game starts the 3D scene at reduced resolution and omits distant ornamental meshes; on hardware GPUs it retains the high-quality default. Observed sustained frame latency further adjusts the LOD. A transition from a real running phase into a >400ms protective pause can lower subsequent visual complexity before the user clicks the normal Resume button. **The game pause, input, hazard collision, hero unlocks, fragment banking and saved-progress contract are unchanged.** This is not a test-only bypass.

The 15-route local browser fixture passed with normal detail and a forced emergency 3D comparison: full 1,310,812 triangles; medium 825,888; emergency 316,806 (about 76% fewer than full). User-interface resolution is not reduced. This is a desktop browser geometry comparison only, **not** measured physical Android FPS, smoothness, or thermal behavior. Slow software GPU acceptance and exact signed Android verification remain release gates.


## WebGL canvas resizing regression

Linux SwiftShader route fixtures revealed an intrinsic-canvas feedback loop: dynamic 3D backing-buffer scaling shrank the canvas display size, causing repeated shrinking and eventually zero drawn instances on otherwise valid routes. The renderer now preserves original CSS display dimensions only for canvases with no explicit inline sizing. Expo GLView's mobile/browser CanvasWrapper already supplies responsive inline width/height and remains in control of its own layout. The route fixture now checks six successive low-detail frames, stable CSS sizes, stable backing dimensions and nonzero instanced geometry before validating all 15 paths. Local route fixtures and 90 Expedition tests (two skipped) passed. This is browser-only adaptive rendering; no claim of native Android parity or physical-device smoothness.
