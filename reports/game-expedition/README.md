# MADGER Expedition 1.5.0 preview evidence

## Android build

- EAS build: [67572e2f-22ef-400f-ba62-654992dd0c05](https://expo.dev/accounts/madgercoins-team/projects/dollarmadger/builds/67572e2f-22ef-400f-ba62-654992dd0c05)
- [Download the standalone APK](https://expo.dev/artifacts/eas/HsaHA_oswZdFFdTdibiWo7urSlFqAt2_OZB-qOgoDsc.apk)
- Profile: `expedition-preview`; version `1.5.0`; Android build `10`.
- Expected application identifier: `com.madgercoin.expedition.preview`; application name: `MADGER Expedition`.
- Downloaded size: 121,143,552 bytes. Native libraries include arm64-v8a, armeabi-v7a, x86 and x86_64.
- SHA-256: `9e53d6d6f7aac84f2f62ef9e5a25acbd85fa25a1f8410cc4f2360ec6e6103b36`.
- EAS completed the build at `2026-10-19T02:13:52.920Z`.

The game implementation is saved in commit `0759283c0510fcb82186455370799887c4619dcb`. The EAS upload preceded that commit, so its build record lists the then-current parent `3b094279b4dd7e0c5828bc24da286b4921b14e68`; the upload included the recovered working-tree game changes.

`mobile/expedition-preview-build.json` pins the exact downloadable artifact. The Expedition preview APK QA workflow verifies its checksum, signature, package, version and permissions before installing it on an Android emulator. Consult that workflow's result and evidence artifact for native acceptance. A build succeeding does not itself establish native runtime or physical-device QA.

## Completed source checks

A fresh mobile `npm ci`, all 104 mobile tests, TypeScript checking, Expo lint, Expo dependency compatibility, web export, Android Hermes bundle export, and source release-metadata checks passed. The repository build, site validation, distribution allowlist validation, and secret scan also passed. Physical-device QA flags were not attested by these source checks.

The tests include 27 Expedition checks, 29 companion checks and 14 delayed-audio cancellation checks, alongside the existing game's 34 checks. Expedition tests exercise 150 reproducible course seeds, failure-safe persistence, pause/recovery, hidden routes, upgrades, and ordinary-control winning runs. Companion tests exercise ability timing, symmetric target reservation, guard limits, Bot powers, checkpoint integrity and animated geometry.

## Completed browser checks

The reports and screenshots in this folder came from the current exported application on the PC, using Chrome 155 and the Intel UHD GPU. They establish browser behavior and appearance. They do not attest physical Android performance.

The real-app playthrough passed boot, nonblank 3D rendering, idle animation, jump/slide input, frozen pause, stopped pause audio, cold checkpoint restoration, resume progress, reduced-effects persistence and small-phone/tablet layouts. It reported no JavaScript errors or failed asset requests. A 3.5-second uninterrupted sample contained 211 frames, averaging 16.59 ms with a 16.8 ms 95th percentile and no 400 ms stalls.

The separate scene render check compiled the shaders and rendered the lobby and world probes without a WebGL error. Its lobby contained 1,391 instances in 11 draw calls. The screenshots show the corrected MADGER teeth and robotic Bot face.
