# MADGER Expedition 1.5.0 preview evidence

## Android build 12

- EAS build: [993c27cf-02f2-465f-9b7d-fe258c5a5105](https://expo.dev/accounts/madgercoins-team/projects/dollarmadger/builds/993c27cf-02f2-465f-9b7d-fe258c5a5105)
- [Download the standalone APK](https://expo.dev/artifacts/eas/3r7-1E2iRGIiZJUeYTpOq9TSDxXOFyaCGnuYdrILxNw.apk)
- Profile: `expedition-preview`; version `1.5.0`; Android build `12`.
- Application identifier: `com.madgercoin.expedition.preview`; application name: `MADGER Expedition`.
- Downloaded size: 121,145,464 bytes.
- SHA-256: `edb5de5e7015f7b3669529b551fd83adf27c618701874ad3ce76a62e6d96c859`.
- EAS completed the build at `2026-10-19T06:45:40.381Z`.
- Exact committed app source: [`85cb796b9631a3d45a32c585cf8e563047d43995`](https://github.com/madgercoin/madger/commit/85cb796b9631a3d45a32c585cf8e563047d43995).

`mobile/expedition-preview-build.json` pins this artifact. The Expedition preview APK QA workflow checks its checksum, signature, package, version and permissions before installing it on Android. Native acceptance for build 12 is pending at this evidence revision. A successful package build does not establish runtime acceptance or physical-device performance.

This internal preview uses a separate application identifier. No production release or Play submission is included in this work.

## Implementation covered by this build

The 3D Expedition has three worlds, deterministic routes, traps, secret passages, upgrades, extra lives and recoverable checkpoints. Snow White provides attacks, Gorilla White guards MADGER, and MADGER Bot supplies electronic powers and boosts. Their support includes animated entrances, actions, exits and audio cues.

The latest character corrections remove the large fang in favor of small, even teeth, keep natural arms, use a compact stylized Snow White and give Bot an angular robotic face. The audio additions are nonverbal reaction cues and foley. Exact likeness and speaking-voice matching against the previously approved external references remains unverified because those reference assets were not recovered.

Rendering fixes bound the native GL submission queue, reuse tail vertex buffers and material colors, and index course gaps and burrows. Paused and upgrade screens stop submitting unchanged GPU frames and stop publishing unchanged HUD state; layout, lifecycle and settings changes still invalidate the view. Changing a course resets the camera interpolation so restored hidden-route checkpoints receive the correct camera. Delayed audio seeks are invalidated when their cue is superseded, stopped or disposed.

## Completed source checks

The complete mobile release check passed: **113 tests**, TypeScript checking, Expo lint, Expo dependency compatibility, web export and source release-metadata validation. Two optional renderer baseline/benchmark cases were skipped in the routine suite and passed separately against the saved baseline. [GitHub mobile validation at head `cf383c0`](https://github.com/madgercoin/madger/actions/runs/39210524056/job/117922645205), which contains the same app source as build 12, also passed Expo Doctor and Android/iOS bundle exports. The repository build, site validation, distribution allowlist validation and secret scan passed.

The routine tests comprise 36 Expedition/render checks, 29 companion checks, 14 delayed-audio cancellation checks and the existing game's 34 checks. They cover reproducible course seeds, pause and recovery, hidden routes, upgrades, ordinary-control winning runs, companion timing and checkpoint integrity, native GL queue behavior, course-camera replacement, buffer reuse and material-cache limits.

A separate renderer comparison matched all matrices and materials across 78 scenery frames (74,561 primitives) and matched the tail's vertex stream across 21 animation states. These equivalence checks establish preservation of the rendered geometry; CPU microbenchmarks are not Android frame-rate measurements.

## Completed browser checks

`app-runtime-smoke.json` and the application screenshots record the exported app on the PC using Chrome 155 and the Intel UHD GPU at `2026-10-19T06:29:31.030Z`. The run passed boot, nonblank 3D rendering, idle animation, jump/slide input, frozen pause with no GPU submissions, stopped pause audio, cold checkpoint restoration, resume progress, reduced-effects persistence, and small-phone/tablet layouts. It reported no JavaScript errors or failed asset requests.

A 3.5-second uninterrupted sample contained 211 frames, averaging 16.60 ms with a 16.8 ms 95th percentile and no 400 ms stalls. This is PC-browser evidence, not physical Android performance. The separate scene render check compiled the shaders and rendered lobby/world probes without a WebGL error; its lobby contained 1,391 instances in 11 draw calls.

## Native diagnostic history and test scope

Build 10 failed the native motion gate. Build 11 included the queue correction and produced two nonblank running frames with mean crop difference 12.328. Its next PNG showed MADGER running at 37 metres, but the subsequent accessibility scan returned a paused state. The scan took 1.583 seconds; that duration measures test-call latency and does not itself prove that it blocked the game.

The corrected test observes running phase and HUD progress at both ends of a four-frame raw-ADB capture window, with no input or accessibility scans between frames. It retains the nonblank and per-pair animation thresholds and rejects paused, countdown, missing-HUD or nonprogressing endpoints. This avoids labeling an earlier PNG with a later state while reducing observation load. The game's long-frame safety pause is retained.

The older Burrow Run Android harness now scrolls the Home screen to its legacy action, which moved below the first viewport when the Expedition card was added. Its steering, pause, backgrounding, repeated recovery, score-persistence and crash checks remain in place.

The native smoke test exercises installation, launch, live rendering and controls, manual/background pause, exact cold checkpoint restoration and resumed rendering. It checks the burst control and charge label but does not activate a fully charged burst in its short route. Physical Android/iOS QA and complete device-specific audio/thermal/performance acceptance remain outstanding.
