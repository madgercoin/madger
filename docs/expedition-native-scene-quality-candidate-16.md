# Optional scene quality native candidate 16: validation pending

Dedicated candidate branch, based on runtime QA pin 81af58b. APK source 9e2b6ca21f2f3626d4e3dd1e9e7170226a52d90b: only optional renderer ff6eedc is integrated. Sharp remains full-resolution default; Softer is an explicit ready/paused menu selection. No unfinished art, timing changes, acceptance relaxation or signing changes are included.

- EAS build: 7898af24-000e-4cc6-84c4-c876f84cf6d9, internal Android version 1.5.0 (16).
- APK SHA256: 545c5046cc4ba7889990f6722b80ef49e615b31e1a5f0d822e380b7cdd9fd71a; bytes: 121156796.
- Certificate SHA256: 029979e508fdd9d48626a9d5627498db0563f8106d08ba75bad0e79fa15b47da, matching the existing key. Native apksigner cryptographic verification is still pending.
- Exactly one build request, included Free allowance verified at 12/15 Android builds, zero overage; existing credentials frozen.
- Source review tests 46/46 passed; feature validation 144 passed, 2 skipped, typecheck/lint passed. UI setup wrapper checks 3/3 passed.

The APK is immutable after its source commit. This QA pin changes the installer manifest and QA setup only. The registered workflow path on this branch runs a Sharp/Softer matrix with the same emulator, resolution, child acceptance scripts, motion thresholds and lifecycle assertions. Sharp uses the original Expedition runner. Softer subclasses only ready/paused menu selection and adds target-activation/fallback proof; it inherits the original run body unchanged and never resumes a safety pause during a motion window. Both modes run the unmodified legacy suite afterward. Three repetitions are planned, and every failure must remain visible.

No merge, Play publication or active preview overwrite is authorized. Prior build15 remains unready (two failures, one pass). Neither a favorable optional result nor desktop profiling proves Sharp stability or physical-phone throughput. The Android host is a software-GPU emulator; physical-device testing is unavailable here.
