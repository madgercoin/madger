# Android preview: research, implementation, and acceptance

## Scope and standard

This preview uses the existing MADGER Expo project and an internally distributed Android APK. It is a test artifact, not a store release or an attestation of physical-device acceptance.

Research was reviewed on September 18, 2026. The measurable baseline is Android's core app quality and accessibility guidance, applied through React Native and Expo. Meeting this baseline requires testing the signed artifact on devices; a successful JavaScript export alone is insufficient.

| Source | Requirement applied |
| --- | --- |
| [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps) | At least 48 dp interactive targets; readable contrast; meaningful labels and roles; decorative icons do not replace text. |
| [Android core app quality](https://developer.android.com/develop/adaptive-apps/quality-guidelines/core-app-quality) | Verify navigation, lifecycle, visual contrast, and stable behavior across device configurations. |
| [Android edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge) | Respect navigation and status-bar insets so system UI does not obscure controls. |
| [React Native accessibility](https://reactnative.dev/docs/accessibility) | Expose button roles, disabled/busy states, and status announcements; retain text scaling. |
| [React Navigation tabs](https://reactnavigation.org/docs/bottom-tab-navigator/) | Use normal-flow navigation, explicit tab labels, and history-based back navigation. |
| [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/) | Build a signed APK through the preview profile and distribute its installation URL to testers. |
| [Expo build troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/) | Validate bundles before cloud compilation and distinguish build success from runtime acceptance. |
| [Expo upload exclusions](https://docs.expo.dev/build-reference/easignore/) | Inspect the actual source archive; upload mobile source without repository media, caches, generated builds, or credentials. |
| [Expo permissions](https://docs.expo.dev/guides/permissions/) | Block unused shared-storage and overlay permissions introduced by native defaults; inspect the built APK manifest. |

## Implementation plan and decisions

1. Start from the merged `b83ce70` source in an isolated checkout; carry forward the verified Expo linkage.
2. Keep the approved brand assets, existing mint, app display name, and store identifiers. Improve reliability and layout without introducing wallets, accounts, tracking, or a new dependency.
3. Use five visible primary tabs. Community remains reachable from More. Keep movement and pause controls fixed above the tab bar; during a run, dedicate the screen to the arena and HUD.
4. Give asynchronous buttons a shared busy guard, disabled state, and recoverable failure message. Treat haptics as optional feedback, not a prerequisite for a successful action.
5. Validate stored Daily Dig data, define day boundaries in UTC, prevent repeat check-ins, and refresh after returning to the app. Report record-load/save/reset failures accurately.
6. Run TypeScript, lint, game and streak tests, Expo compatibility, metadata/PNG checks, web and Android bundle checks, and archive inspection.
7. Inspect rendered phone layouts, build the preview APK, record the build URL and source patch, then complete the physical-device tests below before production.
8. Inspect the built manifest and archive integrity. Remove unused shared-storage and overlay permissions discovered in the first successful APK, rebuild, and verify their absence before delivery.

## Device acceptance checklist

Record device model, Android version, navigation mode, font/display size, build ID, result, and any reproduction steps.

- Install the APK from the recorded EAS build; cold-launch it without Metro or Expo Go. Confirm icon, splash, app title, and the correct version.
- Inspect at default and 200% font size, with both gesture navigation and three-button navigation. Check clipping, overlapping text, contrast, scrolling, and the last actionable element on every screen.
- With TalkBack, traverse tabs, links, check-in, copy/share, play/pause/resume, and reset confirmation. Verify understandable names, focus order, disabled states, and copy/saving feedback. Visual gameplay still requires separate accessibility assessment; no claim of fully nonvisual gameplay is made.
- Confirm Home artwork remains visible and button labels wrap rather than overflow. Reach community through More and return using Back.
- Check in once; repeated taps must not add days. Restart the app and confirm persistence. Verify offline check-in. Simulate storage failure in a test environment and confirm a useful error without false success.
- Copy the complete mint and compare it character-for-character. Cancel sharing. Verify all official destinations, email-without-mail-app behavior, and returning from the browser.
- Complete a Burrow Run with left/right controls, inspect score/grit/multiplier/phase/field-mark behavior, and retry after a run ends.
- Pause, wait, and resume: the timer must remain unchanged while paused. Background the app, switch tabs, lock the phone, and return; the run must stay paused until explicitly resumed.
- Restart after a completed run and verify the field record. Cancel Reset and verify no change, then confirm Reset and verify removal. If saving fails, retry and verify persistence before closing.
- Test airplane mode: game, records, mint display/copy, and Daily Dig should remain usable; external destinations require network access and can report browser/network errors.
- Review the privacy policy and release checklist before any production build or store submission.

Physical Android and iPhone acceptance must remain pending until observed on the corresponding hardware. Do not set either device-QA environment variable based on browser checks.
