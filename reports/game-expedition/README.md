# MADGER Expedition 1.5.0 — Android build 14

> This page preserves historical build-14 evidence and download links. Current
> preview work, acceptance results and phone downloads are tracked in
> [PR #134](https://github.com/madgercoin/madger/pull/134).

The signed standalone preview APK below passed source validation, renderer pixel comparisons, the exported-web functional check, and both native Android suites. This README records the accepted artifact and the scope of those checks.

## Verified APK and source

- [Download the signed Android APK](https://expo.dev/artifacts/eas/-n5ogmb04gyjo30P6TAJDgGLYrAoDIeg0M0eiCl_AVw.apk).
- [EAS build `00d385dd-5d9c-477b-bc6d-031ac469be97`](https://expo.dev/accounts/madgercoins-team/projects/dollarmadger/builds/00d385dd-5d9c-477b-bc6d-031ac469be97).
- [Exact app source `a69220e80d8132b2e4dbe29d724f80c7dc01289f`](https://github.com/madgercoin/madger/commit/a69220e80d8132b2e4dbe29d724f80c7dc01289f).
- [Exact-APK Android QA run](https://github.com/madgercoin/madger/actions/runs/39229821033); [project change record](https://github.com/madgercoin/madger/pull/128).
- [Artifact manifest](../../mobile/expedition-preview-build.json) pins the download and checksum.

| Identity | Verified value |
| --- | --- |
| Application | MADGER Expedition |
| Package | `com.madgercoin.expedition.preview` |
| Version / Android build | 1.5.0 / 14 |
| APK size | 121,149,692 bytes |
| Signature | Verified |
| SHA-256 | `081f4eb7d9e92d010f683796f48cb3f3ccf2bd252d47076679c936ab28e59bf9` |

Open the APK on Android and allow installation from the browser or file manager when requested. Choose **Install** or **Update**, open **MADGER Expedition**, then choose **Play the 3D Expedition** and **Start expedition**. This preview uses its separate application identifier.

## Controls and renderer changes

| Action | Phone input | Browser keyboard |
| --- | --- | --- |
| Steer | LEFT / RIGHT buttons or horizontal swipes | Left / Right arrows or A / D |
| Jump | JUMP button or upward swipe | Up arrow, W, or Space |
| Burrow | BURROW button or downward swipe | Down arrow or S |
| Burst | BURST at 100% charge | B |
| Pause | Pause button | P or Escape |

Grounded **BURROW** digs below the surface for a short action, leaving dirt and emerging back into the run. Downward input while airborne produces a controlled fast descent. Existing checkpoint timer fields and collision behavior remain compatible. Web game buttons now use completed press events so quick clicks, taps and button keyboard activation register; native controls still act immediately on press. The Home screen retains the older Burrow Run and its daily mode.

The renderer conservatively omits geometry wholly outside the camera clip volume and uses indexed drawing to reuse identical static vertex records and stable tail vertices. Triangle order, attributes and the fallback draw path are preserved. Native GL draining, the 400 ms foreground safety pause and saved-run protections remain enabled. The pixel comparisons below check the current scenes through the archived and current renderers.

## Source and browser acceptance

| Check | Actual result |
| --- | --- |
| Source tests | 130 passed; 0 failed; 2 optional baseline cases skipped |
| Release checks | TypeScript, Expo lint, Expo dependency compatibility, web bundle export, source release metadata |
| Renderer pixel comparison | 27 passed; zero changed channels and zero maximum channel difference |
| Exported browser application | 12 named checks; no JavaScript errors or failed asset requests |
| Accepted browser run | 2026-10-19T08:34:19.397Z |
| Browser / graphics | 155.0.8059.82 / ANGLE (Intel, Intel(R) UHD Graphics (0x00008A56) Direct3D11 vs_5_0 ps_5_0, D3D11) |

The accepted uninterrupted browser window contains **211 frames over 3.501 s**: mean **16.591 ms**, 95th percentile **16.8 ms**, maximum **17.2 ms**, and **0 gaps above 400 ms**. It observed **2,321 active GPU draw submissions**. These are PC-browser animation-frame timings, not Android frame-rate measurements.

The functional checks cover visible rendering and idle animation, jump, both keyboard Down and a quick **BURROW** button tap, active GPU submission observation, frozen pause with no further unchanged GPU submissions, stopped pause audio, cold checkpoint restoration, resumed progress, saved reduced-effects preference, and small-phone/tablet layouts.

Source evidence: [source-acceptance-20261019.json](source-acceptance-20261019.json), [pixel comparisons](culling-visual-equivalence.json), and [browser report](app-runtime-smoke.json).

## Exact-APK Android acceptance

Both suites passed on **Android 15 / API 35, x86_64, using the SwANGLE software emulator at 480 × 960**. The [QA workflow](../../.github/workflows/expedition-preview-qa.yml) defines this environment. Signature, checksum, package, version, Android build and EAS identity match the supplied manifest before these results are accepted.

| Suite | Completed checks | Suite duration |
| --- | --- | --- |
| expedition | 7 | 42.492 s |
| legacy-burrow | 11 | 37.748 s |

Expedition completed at `2026-10-19T09:26:36.778539+00:00` in 42.348 s.

### Expedition observations

- Home launches and exposes the Expedition entry.
- 3D game field renders nonblank geometry and animates.
- Left, right, jump, and burrow respond through the visible HUD.
- Manual pause freezes distance, score, lane, and action.
- Backgrounding saves and returns to a paused run.
- Force-stop and cold launch restore the same saved run.
- Restored run resumes with a nonblank 3D view; left safely paused.

| Running capture bracket | Before | After | Progress | Raw captures |
| --- | --- | --- | --- | --- |
| initial-running | 10 m | 44 m | 34 m | 4 |
| 08-restored-running | 138 m | 154 m | 16 m | 1 |

The HUD was running and distance advanced at both ends of each raw capture bracket; the capture windows avoid intervening control input and accessibility scans.

Adjacent game-field mean pixel differences were **12.035, 11.325, 11.315**, each meeting the unchanged 0.8 motion threshold.

| Saved or paused state | Distance (m) | Score | Lane | HUD action | Route |
| --- | --- | --- | --- | --- | --- |
| Manual pause | 113 | 475 | 0 | running | main |
| Background return | 124 | 475 | 0 | running | main |
| Cold restored | 124 | 475 | 0 | running | main |
| Final safe pause | 170 | 475 | 0 | running | main |

Background return and cold restoration retained the same recorded HUD state.

Selected native renderer diagnostics:

| Sample | Frame | Instances | Culled | Draw calls | Indexed calls | Triangles | Native drain (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 611 | 780 | 11 | 11 | 61,756 | 230.546 |
| 2 | 30 | 959 | 241 | 11 | 11 | 64,568 | 41.17 |
| 3 | 1 | 1,244 | 247 | 11 | 11 | 87,238 | 69.462 |
| 4 | 30 | 1,307 | 223 | 11 | 11 | 91,178 | 58.295 |

These are selected instrumented frames, including renderer recreation when recorded. Drain time is the synchronous native GL queue wait; these samples do not establish a native frame-rate distribution.

The complete supplied Expedition log contains **0** `MADGER_EXPEDITION_FRAME_STALL` entries. The native report contains no scoped native/JavaScript crash or application ANR findings.

Control and charge label checked; burst activation is not exercised by this short route.

### Older Burrow Run

- Standalone APK launches and renders the Home entry.
- Game lobby loads with an enabled start action.
- Both native steering buttons change the runner lane.
- Pause and resume work in the standalone app.
- Backgrounding automatically pauses the native run.
- Foreground process kill recovers a periodic checkpoint with at most two HUD seconds of rollback.
- Unfinished native run survives repeated process restarts, frozen with its lane and timer.
- Ending the run banks the score in native storage.
- The native high-score table displays the banked daily score.
- The high score survives a full native app process restart.
- App stays running with no fatal native or JavaScript errors.

The [accepted QA run](https://github.com/madgercoin/madger/actions/runs/39229821033) retains the full reports, raw native captures, APK signing/identity output and logs for both suites.

## Diagnostic history and remaining scope

Build 13 showed intermittent foreground stalls on the software emulator. The older Burrow harness's live RPC scans were corrected while retaining its foreground-checkpoint, repeated recovery and score assertions.

The same build-14 APK failed [native run 39228365858](https://github.com/madgercoin/madger/actions/runs/39228365858): Expedition recorded a **440 ms** foreground frame gap and safely paused at **8 m**. The independent older Burrow test's live timer read took **2.524 s**, exceeding its strict 2-second freshness budget before process kill. The later [accepted run 39229821033](https://github.com/madgercoin/madger/actions/runs/39229821033) used a harness-only `UiSelector` correction (`instance=0`) with the **unchanged APK**, **400 ms game safety pause** and **2-second foreground-observation deadline**. The proposed quiet-countdown patch stayed unshipped and is not part of that result.

One PC-browser attempt recorded a **2.016 s** animation-frame gap and failed the 400 ms gate before the accepted functional repeat recorded above. The historical build-12 narrative is preserved separately in [history/build-12-evidence.md](history/build-12-evidence.md).

**Successful short-run acceptance does not establish the absence of intermittent software-emulator stalls.** The earlier build-14 safety pause remains part of the evidence for this same installer.

**Physical-phone performance and audio have not been measured.** This short software-emulator acceptance does not establish physical-device frame rate, temperature, battery use or complete Android/iOS audio behavior. Browser audio checks cover browser behavior only.
