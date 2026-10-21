# MADGER 3D — Android physical-device acceptance protocol

**Status:** Not certified. Developer-build QA only; no Play Store release approval.

## Device and installer identity
- Install only the source-matched artifact reported as **passed** by GitHub
  `Mobile CI`: validate, Android APK, actual emulator runtime, all route
  fixtures, and both browser modes. Record full Git commit, Android package
  ID/version code, APK SHA-256 and local installation timestamp.
- Preview package is currently `com.madgercoin.preview`. This is independent
  of any production package. Different CI-generated development certificates
  can prevent upgrades over prior previews. **Do not uninstall a preview
  containing progress without an export/backup plan and explicit approval.**
- Confirm the launcher loads with original approved MADGER character, not a
  generic sphere or blank GL frame. Keep Android system logs for any crash.

## Functional acceptance — repeat after cold application restart
- Run tutorial normally and collect gems/coins. Confirm LEFT/RIGHT move
  naturally, JUMP raises the hero, BURROW digs under obstacles, and BURST
  requires earned energy.
- Around 140m choose all three major worlds on separate genuine playthroughs.
  Do **not** expect a blocking menu in a new run; route is selected through
  actual horizontal position while forward motion continues.
- At 455m verify separate physical choices: LEFT descends to lower road;
  CENTER requires jumping up the ledge; RIGHT requires ground-level BURROW
  into the low tunnel; without the required action, the run descends to lower
  road without an invented health loss.
- Verify the Ancient Vault remains unavailable without the actual earned key.
- Enter Guardian Nest (burrow), Capacitor Sanctum (jump), and Moonwell
  (burrow). Claim a different earned supply/fragment option in separate
  playthroughs and verify exact rewards on cold reload. Confirm no repeated
  claim, loss of keys, banked currency duplication, or instant hero unlock.
- Confirm Snow White offensive support, Gorilla White defensive support and
  MADGER Bot electronic support remain earned; test entrance, action, and exit
  without lane blocking.
- PAUSE then background/foreground app, close it, reopen, and verify the same
  route, scores, shields, keys and earned progress. Test portrait/landscape
  resize only if the app supports rotation without resetting.

## Performance/clarity evidence — at least 20 real active minutes
- On a known Android **physical device** (record model, chipset, RAM, screen
  resolution, refresh rate, OS version, and app revision), run forest,
  ruins and cavern routes with actual input, transitions and companion use.
- Record cumulative gameplay time, average and p50/p95/p99 frame intervals,
  count of any >400ms protective game pauses, resolution/LOD changes,
  crashes, dropped input, RAM, temperature and battery change. Use Android
  graphics profiling when available; screenshots do not prove FPS or thermal.
- Aim for sustained >=30 fps on representative midrange devices and near
  60 fps on capable high-end phones, **without** relaxing the >400ms pause.
  Never treat 3.5-second Chrome results or software emulator data as thermal
  acceptance.
- Capture (at screen-native resolution) near-ground soil/roots/vegetation,
  mid-distance hills/ruins, far horizon and caves. Check for fog washing out
  landmarks, blocky silhouettes, sky leakage into caves, texture blur,
  scenery pop, floating trunks/rocks, occluded hazards, z-fighting, and a
  detached shadow around action icons.
- Confirm HUD route notifications do not cover the three earned-hero cards
  and all controls remain reachable with thumbs on narrow screen widths.

## Evidence required before any release approval
Archive installer checksum, exact source revision, CI run ID, full test logs,
real-device model/build/thermal/fps report, source-matched screenshots and
known issues. Do not automatically merge draft PRs, grant publishing authority
or replace the current tested APK when any gate is missing.
