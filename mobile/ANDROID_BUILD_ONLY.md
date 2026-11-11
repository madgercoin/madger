# Production Android bundle — build only

Prepared workflow: `.github/workflows/android-production-build-only.yml`.
It has **no push trigger, no automatic submission, and no Play track change**.
The separate `closed-test-build` profile produces an Android App Bundle using
`com.madgercoin.app` and existing remote signing credentials. It does not use the
preview package or the existing internal-submit profile.

Before a future manual dispatch, the operator must verify the MADGER Expo
account/project, existing persistent upload credentials, actual Android device
and audio acceptance for the source selected, and either an approved build cost
or a verified unused free allowance. The default-false workflow input records
that prerequisite; it is not a billing lookup or new spending authorization.
Do not set `MADGER_ANDROID_DEVICE_QA=passed` without the checklist evidence.

The workflow first runs the existing Android distribution gate and checks the
resolved production identity. Only then can it use the existing `EXPO_TOKEN`.
Pinned EAS CLI 24.3.0 runs non-interactively with `--freeze-credentials`; missing
access/signing must stop rather than generating new credentials. EAS may advance
the existing remote Android version counter because the production profile has
`autoIncrement`; retain the returned version and build ID in the release record.

The result JSON artifact contains the EAS build ID and download URL. Independently
verify the downloaded AAB's source, package, version, upload certificate and
artifact checksum before a **separate** authorized Closed-testing upload in Play
Console. That upload/review/tester opt-in starts a different process; building
this AAB alone does not start the 12-tester/14-day test requirement or launch the
game. This preparation performs no dispatch, authentication, signing or spending.

Do not use `android-internal-release.yml` for Closed testing: its existing
production submit profile targets Internal testing and it still auto-submits.
This change deliberately leaves that pre-existing workflow untouched.

Local configuration regression: `node --test scripts/test-production-build-only.cjs`
(from `mobile`). Future source changes still require full release checks and
native QA. CLI reference: https://docs.expo.dev/eas/cli/#eas-build
