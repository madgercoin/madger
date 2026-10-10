# Game-first app 1.3.0

The native app has four main tabs: Home, Play, Scores, and Settings. Classic high scores and each UTC day's seeded challenge are separate. A score is banked on a normal finish or through the paused end-and-save action.

The versioned local profile retains 25 Classic scores, five daily scores per day for 30 days, 20 recent runs, aggregate records, XP, achievements, play dates, and preferences. Older field records migrate without invented run history. Storage uses a shared serialized queue; failed loads block play and failed saves retain the in-memory score with a retry action.

Progress rewards are cosmetic. Trails never change scoring. The eight achievements and XP levels give repeated runs a purpose. The daily route uses a date seed and advances at midnight UTC.

`npm run validate` covers gameplay, daily dates, profile normalization/migration, rankings, restart persistence, overlapping writes, storage failures, and reset protection. Mobile CI also exports all platforms, runs browser navigation/game/recovery checks, compiles an Android preview, inspects its permissions, and tests movement, lifecycle pausing, banking, and cold-restart persistence on an emulator. Fresh reports and screenshots accompany each published preview.

No account, backend leaderboard, advertising, or purchase is needed to play. Scores remain on this device; uninstalling or clearing app data removes them. Preview signing and emulator checks do not replace official store signing or physical-device acceptance.
