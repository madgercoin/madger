# MADGER for Android and iPhone

The official native MADGER companion app, built with Expo SDK 57 and React Native.

## Included

- Official transparent MADGER logo and custom branded character art
- Prominent in-app launch film with fullscreen and picture-in-picture
- Active Launch Hunt instructions, prizes, rules, and private submission flow
- Exact official Solana mint verification, copy, and sharing
- Private on-device Daily Dig streak with no account or wallet
- Official Telegram, X, website, litepaper, and email directory
- Android adaptive icon and opaque iOS store icon built from the official mark

## Run locally

```bash
npm install
npx expo start
```

Open the project with Expo Go on Android or iPhone. Run `npm run validate` before committing.

## Create signed builds

1. Install and authenticate EAS CLI: `npm install -g eas-cli && eas login`.
2. Run `eas init`, then replace the placeholder project ID in `app.json`.
3. Build an Android preview APK: `eas build --platform android --profile preview`.
4. Build both production apps: `eas build --platform all --profile production`.
5. Submit after store listings and account agreements are complete with `eas submit`.

Store submission requires access to the MADGER Apple Developer and Google Play Console accounts. Never commit signing keys or credentials.

## Release checks

- Confirm Launch Hunt status and dates before every release.
- Confirm every URL in `src/constants/brand.ts` is official and reachable.
- Test film playback on real Android and iPhone devices.
- Verify the mint exactly matches madgercoin.com.
- Review `PRIVACY.md` and the live privacy-policy URL.
