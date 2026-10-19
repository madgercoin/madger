# Isolated runtime candidate 15 - native validation pending

This is a dedicated candidate branch. Do not merge it into the active preview branch or treat it as a Play release. The unready visual/environment work is excluded.

- Base app: a0e7141258cd957f3e44862327c299abb6890e4c, rechecked unchanged before this build.
- APK source: ba60c7ff81a6d5d94398252c8b323693f4a90dbc (bounded transient frame-gap proposal).
- EAS build: 63c5a7db-cc27-40ad-80ba-90b2287632c2, expedition-preview, internal Android version 1.5.0 (15).
- Exactly one build request; included Free allowance verified before submission (11/15 Android builds used, zero overage). Existing remote keystore selected with --freeze-credentials; no credential change.
- APK bytes: 121150808. SHA-256: f48f4bc4093b59a21eca583db1c2663151b46ea4691d640fcb42cfa51119f655.
- Certificate SHA-256: 029979e508fdd9d48626a9d5627498db0563f8106d08ba75bad0e79fa15b47da, matching the existing independently verified key. Cryptographic signature verification remains the unchanged CI apksigner gate.
- Packaged lastDiscardAt/recovering policy markers found. Full source validation: 138 passed, 2 skipped; typecheck/lint passed. Second-pass core/policy tests: 40/40 passed.

Only the exact APK pin and these notes change after the APK source commit. Native acceptance scripts, workflow, emulator resolution, thresholds, lifecycle tests and legacy suite remain unchanged. The same pinned APK must undergo repeated full native runs and repeated phase-bracketed motion checks; preserve every failure. One favorable run is not readiness. No APK rebuild is triggered by this QA-only workflow.

Native validation is pending. No merge, Play publication, signing change or active-owner-checkout edit is included. Underlying render or screenshot contention remains unproven.
