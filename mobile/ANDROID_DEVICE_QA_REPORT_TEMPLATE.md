# MADGER 1.5.1 — actual Android device acceptance report

Duplicate this report per physical phone and per **exact-source build**. Do not
mark a check passed without observation. This is a template, not a completed
test or permission to set MADGER_ANDROID_DEVICE_QA=passed.

## Build and tester provenance

| Field | Recorded value |
| --- | --- |
| Tester / test date and location/time zone | Not yet tested |
| Phone manufacturer and exact model | Not yet tested |
| OS / Android API, screen pixels and scale | Not yet tested |
| CPU/GPU, battery level, power saving mode | Not yet tested |
| Preview or production package ID | Not yet tested |
| Git commit and GitHub Action run ID | Not yet tested |
| APK/AAB SHA-256 and signing fingerprint | Not yet tested |
| App version and Android versionCode | Not yet tested |
| Install mode (new vs. upgrade from last released build) | Not yet tested |
| Network mode (Wi-Fi / mobile / airplane mode) | Not yet tested |
| Logs, actual video capture and screenshots | Not yet tested |

## Required hands-on game paths

| Check | Pass / fail / evidence |
| --- | --- |
| Cold launch, no endless progress spinner or frozen 100% | Pending |
| App displays correctly in portrait / device insets / navigation bar | Pending |
| Start Expedition and choose forest route with real touch controls | Pending |
| JUMP visible and responsive before, during and after active play | Pending |
| BURROW visible, responsive and gated properly when not grounded | Pending |
| Left/right steering and real-time fork outcome correspond to input | Pending |
| Visit ruins, watchtower/gear route and cavern environment | Pending |
| Hidden routes/chambers, keys and earned rewards survive return | Pending |
| Workshop upgrades change intended run state and persist | Pending |
| Snow White joins and attacks a threat (visible/audio) | Pending |
| Gorilla White shields Madger from danger (visible/audio) | Pending |
| Madger Bot provides the correct electrical boost (visible/audio) | Pending |
| Pause, resume, Home/Android background, recent-apps, force stop | Pending |
| Cold restart restores an interrupted run to a safe paused state | Pending |
| Complete a run; final score and rewards bank exactly once | Pending |
| Burrow Run Classic 60s, movement, shields, magnet, Dig Burst | Pending |
| Daily seed and separate Classic/Daily personal records persist | Pending |
| Settings: sound, mute, haptic, calm/reduced effects, reset | Pending |
| Audio audible from real device speaker, wired/Bluetooth if used | Pending |
| Audio remains sane after mute/unmute and external interruption | Pending |
| Offline/no-login behavior, privacy and support links when online | Pending |
| Large font/display scaling and accessibility control usability | Pending |
| Upgrade path preserves prior official app's saved records | Pending |

## Minimum performance/graphics evidence

Run **20+ minutes of active play** across forest, ruins and cavern routes on a
representative Android device, preferably also a midrange device. Log:
- Exact duration, build SHA, gameplay route and hardware/power settings.
- Actual rendered FPS and frame time mean/p95/p99/max if measurable; native
  GPU/GL drain and draw-count diagnostics where available.
- Frame stalls over 400ms, resulting protective pauses, crashes, ANRs, black
  frames, flickering controls, texture/layer misalignment and thermals.
- Memory before, midway and after, battery percentage and thermal state.
- Foreground UI freshness, stable timer / Pause / JUMP / BURROW visibility.
- Representative screenshots and gameplay screen recording from the device.

**Fail conditions:** a crash, Android ANR, lost progress, repeated native input
blindness, incorrect companion action, false reward banking, missing sound,
unverified source identity, or sustained unacceptable FPS. A frame over 400ms
must cause the existing safe pause, but also requires investigation and blocks
production signoff. Never disable the pause to make a test pass.

## Result and attestation

- Tester conclusion: **NOT TESTED**
- Evidence links and issue IDs: **NOT RECORDED**
- Fixed and retested issues: **NONE RECORDED**
- Test reviewer: **NOT ASSIGNED**
- Android distribution-gate attestation: **NOT AUTHORIZED**

Only after real signed-source QA and independent reviewer signoff may the
owner set MADGER_ANDROID_DEVICE_QA=passed for a specific current source/build.
Changing dependencies, native code, bundled 3D assets or gameplay after the
test invalidates this attestation and requires a fresh device run.
