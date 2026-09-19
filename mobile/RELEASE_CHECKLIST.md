# MADGER mobile 1.1.0 release checklist

## Automated source gate

Use EAS CLI 24.3.0 or newer. Run `npm ci`, then `npm run release:check`. This validates Burrow Run behavior, TypeScript, lint, Expo dependency compatibility, production export, release metadata, and the CRC integrity of every configured native PNG.

Run `npx expo-doctor` before cloud builds and inspect EAS's Expo Doctor phase. Resolve config-schema errors as well as dependency compatibility errors; a successful bundle alone does not validate the app-config schema.

For an optional local Android release smoke build, use JDK 17 with Android SDK 36 and NDK `27.1.12297006`, then run `npx expo prebuild --platform android --no-install` and `NODE_ENV=production ./android/gradlew -p android assembleRelease`. The generated APK is a local verification artifact only; store distribution must still use the authorized EAS production profile and signing credentials.

## Authorized account linkage

Verified on 2026-09-18: the mobile configuration is linked to [@madgercoins-team/dollarmadger](https://expo.dev/accounts/madgercoins-team/projects/dollarmadger), project ID `e4c06d4a-4d6c-44da-b405-624382b15c56`. The authenticated `madgercoin` user has the Owner role on `madgercoins-team`. Authentication is local to each release environment; no credentials belong in this repository.

1. Sign in with the MADGER Expo organization account using `eas login` or an organization-scoped `EXPO_TOKEN`.
2. Run `eas init` and select the existing MADGER project. Do not create a similarly named personal project.
3. Confirm `app.json` uses the verified project UUID above, owner `madgercoins-team`, and slug `dollarmadger`.
4. Run `eas project:info` and verify the owner, slug, iOS bundle ID `com.madgercoin.app`, and Android package `com.madgercoin.app`.

## Physical acceptance — Android

Use `PREVIEW_QA.md` for the research baseline, preview workflow, and device test matrix.

- Install a preview build on a supported physical Android device.
- Complete a 60-second Burrow Run using both movement buttons.
- Confirm signal, noise, grit, multiplier, phase, pause, and haptic behavior.
- Background and foreground during a run; confirm time does not advance while inactive.
- Leave and return to the Play tab; confirm the run is paused.
- Restart the app; confirm the field record persists, then confirm Reset removes it.
- Verify the control row clears the system navigation and app tab bar at large text sizes.
- After passing, run with `MADGER_ANDROID_DEVICE_QA=passed` in the release environment.

## Physical acceptance — iOS

Repeat the Android scenarios on a supported physical iPhone, including VoiceOver labels, safe-area clearance, haptics, backgrounding, persistence, and destructive-reset confirmation. After passing, run with `MADGER_IOS_DEVICE_QA=passed` in the release environment.

## Signed build and submission

1. Run `npm run release:distribution`; do not bypass a failed gate.
2. Run `eas build --platform all --profile production --non-interactive`.
3. Install and smoke-test the exact signed artifacts.
4. Confirm the live canonical privacy policy matches `PRIVACY.md` and the store listing.
5. Submit with `eas submit --platform all --profile production --non-interactive` from the authorized release account.
6. Record build URLs, store version IDs, review status, and release time in the private release log. Never commit signing material.

## Historical external blockers — 2026-09-12 UTC

The Expo login and placeholder linkage blockers below were resolved locally on 2026-09-18. Store credentials, physical-device acceptance, signed builds, and submissions have not been verified as complete.

- `eas whoami` reports **Not logged in** and no `EXPO_TOKEN` is present.
- `app.json` contains the placeholder EAS project ID, so the repository cannot identify the authorized Expo project.
- No Apple or Google store credential environment variables are present.
- Physical Android and iPhone acceptance has not been attested in this environment.
- Android prebuild and local release assembly pass with JDK 17, Android SDK 36, and NDK `27.1.12297006`; no emulator or physical Android device is attached for install/runtime acceptance.
- The Linux environment has no Xcode, CocoaPods, iOS simulator, or physical iPhone connection.

These are authorization and hardware boundaries, not code TODOs. An agent must not fabricate IDs, attestations, credentials, builds, submissions, or approvals.
