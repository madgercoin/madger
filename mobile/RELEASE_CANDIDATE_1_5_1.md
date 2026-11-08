# MADGER 1.5.1 — Android release-candidate gate and handoff

Status: **source checks passed; NOT cleared for a signed release or Play submission**.
Created 2026-11-07 from the existing Expedition game, without replacing gameplay
or changing save keys, route physics, companion unlock requirements, or identity.

## Identity and evidence

- Product: MADGER, Android package com.madgercoin.app, Expo project
  madgercoins-team/dollarmadger (e4c06d4a-4d6c-44da-b405-624382b15c56).
- Version: app/package 1.5.1; app.json Android versionCode 34. EAS production
  autoIncrement may produce a different signed-bundle versionCode.
- Existing primary Expedition PR: #134 (base feature branch, draft).
- Release-source fix branch: fix/madger-android-release-gates-20261107,
  based on the Nov 5 Expedition source. Merge only after source-matched checks.
- Passed source-only run: https://github.com/madgercoin/madger/actions/runs/42407371015
  (clean npm install, game/companion/renderer/audio/security tests,
  TypeScript/lint, Expo SDK 57 dependency check, web export, release metadata,
  Expo Doctor, and build-only safety tests).
- Seven Expo SDK 57 patch-level dependencies were aligned and package-lock
  regenerated with npm 10.9.9; no SDK 58 jump. Expo CLI 57.0.33 switched from
  a Zod plugin schema to JSON Schema. The developer-only validation hardening
  was rebuilt against exact upstream SHA-256 fixtures, with 1 MiB output
  limits, bounded collection sizes, fail-closed source checks and regression
  tests. ESLint Hooks still has a scoped Zod 4.6.7 pin.
- Source checks do not prove native APK/AAB, physical graphics performance,
  audible sound, signing, upload, acceptance by Google, or live privacy-policy
  deployment.

## November 7 Android native startup investigation

The source-matched Android APK in CI run
https://github.com/madgercoin/madger/actions/runs/42408711941 compiled, but
the API-35 x86_64 emulator crashed before displaying the Expedition lobby.
Its own logcat and APK archive confirm the cause:
`lib/arm64-v8a/libexpo-gl.so` is present while
`lib/x86_64/libexpo-gl.so` is **absent**. SoLoader failed loading
`libexpo-gl.so` while initializing the GLModule; the missing
`Start expedition` UI and render proofs are downstream symptoms.

To address the missing x86_64 library without changing actual gameplay,
the Android Expo Autolinking config now builds *only* `expo-gl` from source,
while retaining precompiled packages for the other libraries. A new
post-assembly APK gate inspects both arm64-v8a and x86_64 native libraries
(including expo-gl, expo-modules-core, and reactnative) before preview
delivery. A configuration regression prevents accidentally dropping this
source-build requirement. These changes remain **unverified** until a
new CI APK compile, source/ABI inspection and Android emulator smoke pass.
Do not reuse the previously failing artifact or lower any smoke threshold.

## Before Play Closed testing

1. **Integrate source:** approve the new release preparation PR against
   Expedition PR #134; merge Expedition through its intended dependency chain
   only after reviewing any newer changes. Preserve existing save data.
2. **Native source matching:** build a new APK from the exact candidate code;
   run native emulator smoke tests and verify the compiled source revision,
   package, manifest, signature, and archive hashes. Do not reuse the previous
   build-33 APK: its source predates these changes, and strict artifact checks
   correctly reject it.
3. **Physical Android QA:** complete and attach [ANDROID_DEVICE_QA_REPORT_TEMPLATE.md](./ANDROID_DEVICE_QA_REPORT_TEMPLATE.md). Install an exact-source signed testing APK on
   a real Android phone. Record phone model, OS, display/font scale, nav mode,
   build ID, graphics metrics, and failures. Exercise launch, JUMP, BURROW,
   steering, three biome entries, secret rooms, collectible upgrades, vault
   persistence, workshop, complete and interrupted runs, companions (Snow
   White attack, Gorilla White defense, Madger Bot boosts), pause/resume,
   cold restore, 60-second Classic/Daily, sounds and haptics, mute and audio
   interruption, airplane mode, rotation handling, accessibility and large
   font. Investigate all foreground stale-state and native GL stalls.
4. **Sustained device trial:** at least 20 minutes on forest, ruins and
   cavern routes, capturing FPS/frame-time p95 and slowest frames, memory,
   battery, thermal trend and renderer logs. Aim for >=30 FPS sustained on
   representative midrange Android hardware. Preserve protective pause on
   frames longer than 400 ms; never mask the warning or weaken tests.
5. **Signed store artifact:** use the manual-only build workflow
   android-production-build-only.yml only after Android device QA genuinely
   passes, existing Expo token/signing and cost/free allowance are authorized.
   Its closed-test-build profile produces an AAB for com.madgercoin.app;
   no Play submission occurs. Independently inspect the final AAB signature,
   upload-certificate fingerprint, SDK target, required permissions,
   network/analytics SDKs, versionCode, provenance and SHA-256.
6. **Store content and privacy:** deploy the repository privacy.html revision
   with 3D Expedition data practices before submitting. Verify the live
   https://madgercoin.com/privacy.html text against the exact signed
   application and complete final Play Data safety fields. The prepared
   PLAY_STORE_LISTING.md describes the two modes and forbids fabricated
   screenshots; supply a Play icon, feature graphic, and real mobile
   screenshots from the exact build.
7. **Owner Play Console decisions:** content rating, target age, countries,
   app-access questions, financial-features questionnaire if applicable to
   token-branded external destinations, and signing/enrollment permissions.
   Confirm whether the developer account is subject to Google's closed-test
   minimum (12 opted-in testers for 14 consecutive days for newly created
   personal accounts), and follow the current Console account-specific
   instructions; do not assert eligibility.
8. **Controlled rollout:** separately upload the audited AAB to Closed testing,
   invite real testers, monitor crashes/ANRs and graphics stalls, act on
   feedback, then request production access when eligible. A build is not a
   release, and Closed testing is not production availability.

## Explicit unresolved blockers

- The reported Windows workstation was offline during this audit; current
  physical-phone test artifacts, USB devices and locally uncommitted visuals
  could not be inspected.
- No source-matched current native APK/AAB verification or 20-minute physical
  Android performance and sound acceptance is recorded.
- No live Expo signing authorization, cost allowance or Google Play Console
  submission was exercised by this work. The strict QA guard is intentionally
  unset until test evidence exists.
- App screenshots/feature artwork and current in-production privacy-policy
  agreement remain unverified. Draft listing copy is not evidence of upload.
- Native Expo GL renders separately from the higher-detail web PBR scene.
  Native/web visual parity, sustained heat and frame pacing remain unproven.

This document is a release gate, not a release approval. Record every later
signed artifact URL, package, source SHA, versionCode, signature fingerprint,
device QA log, store review status and final approval here before promoting.
