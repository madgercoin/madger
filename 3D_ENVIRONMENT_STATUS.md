

## Cavern geometry and verification — October 20

The underground web renderer now adds a deterministic limestone stalactite field and route-specific quartz/mineral seams. These are actual three-dimensional, camera-relative, instanced meshes attached above the traversable lane clearance. The meshes reuse the already shipped CC0 PBR stone textures, with separate mineral highlights, no new paid assets, and bounded draw/triangle budgets. Deep Burrow, Mudslide, Crystal Vein, Ancient Vault, Hollow, and Grotto have route-specific geometry; interior secret chambers hide the main tunnel mesh. The code does not alter the game's deterministic collision, earned hero unlocks, rewards, or persistent checkpoints.

Local evidence: 88 Expedition tests passed (2 skips), all 15 real browser renderer route/chamber fixtures passed, and all three interactive secret rooms passed ordinary action/choice/cold-reload testing after the normal jump-entry timing was aligned to the hatch. The desktop screenshots still show visually crude rocks and props; this geometry pass alone is not production-level realism or a verified Android build.

Browser acceptance and the same-source Android release test in GitHub remain independent publication gates. Do not merge or call the game complete based only on local graphics fixtures.
