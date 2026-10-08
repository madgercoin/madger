# Burrow Run 1.2 verification

The native game and Home were redesigned with approved MADGER running art, a perspective tunnel, signal trails, varied hazard waves, shields, magnets, charged Dig Burst, close-dodge scoring, local sound, haptics, and clear replay/pause controls. Existing private field records keep their storage key and format.

## Completed locally

- TypeScript source typecheck and ESLint source/script checks: pass.
- Nine game-rule tests and three Daily Dig tests: pass.
- Production web export: pass.
- Chromium touch/browser playthrough: all 13 checks pass with zero runtime errors, including swipes, boundaries, pause freeze, tab auto-pause, debrief/replay, record persistence after reload, Home entry, and 320/390/768px layouts. See `browser-qa.json` and the captured screenshots.
- Root website validation and deployment dry run: pass.

## Distribution evidence

Mobile CI validates sources and exports Android/iOS JavaScript, then builds a standalone ARM64 Android preview APK and checks its real permission manifest. The preview uses a separate package (`com.madgercoin.preview`) and a generated development signing key, so installing it preserves the official app.

Physical Android/iPhone acceptance and production store signing remain separate release gates. No physical-device attestation, EAS login, or store submission is claimed by this report.
