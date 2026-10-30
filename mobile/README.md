# MADGER for Android and iPhone

The native MADGER arcade app, built with Expo SDK 57 and React Native.

## Included

- Home game launcher, Play, Scores, and Settings tabs
- Three-zone Burrow Run with approved animated character art, swipe/button controls, shield and magnet pickups, Dig Burst, close-call bonuses, pause, and instant replay
- Separate Classic and daily seeded high scores, 20-run history, personal-best sharing, XP levels, eight achievements, and four earned cosmetic trails
- Private on-device scores and preferences that survive app restarts; earlier field records are preserved on upgrade
- Persistent sound, haptic, and calm settings, with system reduced motion respected
- Interrupted-run recovery restores the original route, powers, lane and countdown in a paused state; completed runs cannot be banked twice
- Safe progress reset and recovery actions for storage failures
- Official community links available in Settings; no account, wallet, ads, or purchase needed to play
- Android adaptive icon and opaque iOS store icon built from the official mark

## Run locally

```bash
npm install
npx expo start
```

Open the project with Expo Go on Android or iPhone. Run `npm run validate` before committing.

Before signed distribution, complete `RELEASE_CHECKLIST.md` and run `npm run release:distribution`. The strict gate rejects placeholder project linkage or missing physical-device attestations.

## Create signed builds

1. Install and authenticate EAS CLI: `npm install -g eas-cli && eas login`.
2. Verify the existing linkage with `eas project:info`: owner `madgercoins-team`, slug `dollarmadger`, project ID `e4c06d4a-4d6c-44da-b405-624382b15c56`. See `RELEASE_CHECKLIST.md` before relinking.
3. Build an Android preview APK: `eas build --platform android --profile preview`.
4. Build both production apps: `eas build --platform all --profile production`.
5. Submit after store listings and account agreements are complete with `eas submit`.

Store submission requires access to the MADGER Apple Developer and Google Play Console accounts. Never commit signing keys or credentials.

Run these commands from `mobile/`. The repository-root `.easignore` restricts normal Git-based uploads to the mobile application. `mobile/.easignore` also excludes local environment files, credentials, signing material, and generated output when `mobile/` itself is the upload root, such as a standalone checkout or `EAS_NO_VCS=1` with `EAS_PROJECT_ROOT` set to its absolute path. Keep both files aligned when changing upload exclusions.

## Release checks

- Confirm retired purchase deep links redirect safely and no trading routes are included.
- Confirm every URL in `src/constants/brand.ts` is official and reachable.
- Test privacy and support links on the target devices.
- Keep game rewards separate from real-world assets: no purchase, transfer or withdrawal.
- Complete a Burrow Run on both a physical Android device and iPhone; verify backgrounding pauses the run and local records survive restart.
- Review `PRIVACY.md` and the live privacy-policy URL.

## Burrow Run 1.4

The Home screen leads directly into Classic play, the seeded daily route, saved scores, and earned rewards. Runs last 60 seconds and cross three increasingly fast tunnel zones. Collect signal trails to build the multiplier and charge a three-second Dig Burst: it doubles signal points and smashes noise. Shields cover one hit for up to eight seconds; magnets collect signals in every lane for six seconds. The first six seconds teach collecting before hazards spawn. Movement, pause/resume, countdown, power timers, and persistence are covered by rule and browser checks. Classic and daily scores are separate; the last 20 runs, XP, achievements, and trails are saved locally. End a paused run to bank its current score. Sound is off by default; haptics and calm effects are player controlled and persist across restarts. System reduced motion is respected.

The Mobile CI workflow exports Android/iOS bundles and uploads a web preview. Its Android preview job builds a standalone ARM64/x86_64 APK with the generated development key and inspects the actual permission manifest, and runs launch, movement, pause/resume, backgrounding, score banking, and cold-restart checks on an Android emulator. Browser CI checks scores, settings, migration, and storage recovery alongside gameplay. That artifact is for internal testing, installs separately as `com.madgercoin.preview` / MADGER Preview, is not signed with the production store key, and must not be described as store released or physically accepted. It leaves the installed official app and its record intact. Official EAS production builds still follow `RELEASE_CHECKLIST.md`.
