# MADGER for Android and iPhone

The official native MADGER companion app, built with Expo SDK 57 and React Native.

## Included

- Official transparent MADGER logo and custom branded character art
- Prominent direct-buy and beginner buying-guide paths
- Dedicated Buy tab with wallet, SOL, mint-verification, swap, and risk guidance
- Exact official Solana mint verification, copy, and sharing
- Private on-device Daily Dig streak with no account or wallet
- Native Burrow Run game with touch controls, escalating tunnel phases, rotating daily field marks, haptics, lifecycle pausing, and a private on-device record
- Official Telegram, X, website, litepaper, and email directory
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

- Confirm the buying guide and Raydium route before every release.
- Confirm every URL in `src/constants/brand.ts` is official and reachable.
- Test the buying guide and Raydium links on real Android and iPhone devices.
- Verify the mint exactly matches madgercoin.com.
- Complete a Burrow Run on both a physical Android device and iPhone; verify backgrounding pauses the run and local records survive restart.
- Review `PRIVACY.md` and the live privacy-policy URL.
