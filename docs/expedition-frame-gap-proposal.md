# Expedition transient frame-gap proposal (not released)

Base: remote app commit a0e7141, fetched on 2026-10-19 into an isolated clone. No owner checkout, renderer, assets, signing, build or deployment changes are included. The original core.advance 400 ms rejection and its existing 1.2-second regression are unchanged.

A 402 ms RAF gap was observed after a 316 ms draw with 256.6 ms native drain; a previous failure used 440 ms, and the same APK also passed. Screenshot contention is plausible, not proven. EGL_BAD_MATCH and slow screenshot RPC also occurred on passing runs and are not treated as causes or conditions for forgiving time.

## Bounded app policy

- At most one isolated gap greater than 400 ms and less than 800 ms is discarded. No simulation call, accumulated remainder or visual-time advancement is allowed for it.
- The first subsequent healthy interval (at most the existing 400 ms bound) is also discarded. Only the following interval may advance. There is no catch-up or automatic resume from a paused game mode.
- A second moderate gap within 1.6 seconds, including consecutive gaps, pauses immediately. A gap of 800 ms or more, a negative/non-finite gap, or an invalid timestamp also pauses. The 800 ms hard limit is twice the existing bound; the recurrence window is twice that hard limit. These are explicit reviewable proposal constants, not a raised core guard.
- Both discarded intervals clear the fixed-step remainder. Thus less than 1.2 seconds can be discarded in one transient/recovery pair, while a single 1.2-second interval always pauses. No unseen time is forwarded to core.advance.
- Existing pause, AppState, visibility, focus, back, graphics-loss, replacement/start/resume and unmount paths retain their behavior. The guard resets on inactive modes and on the existing null-timestamp baseline. Returning to foreground or a healthy frame never resumes a paused run.

The guard is ephemeral app state, not persisted run state. Diagnostics retain the existing stall log and add its policy disposition. Gameplay controls, collision rules, obstacle generation, fixed steps, rendering and native frame draining are unchanged. This proposal does not fix underlying render latency or establish native performance.

## Verification and integration

The new tests transpile and execute the actual app RAF callback, command callback and lifecycle handlers with the real simulation core and fake rendering/scheduling. They check 402/440 ms discards, healthy recovery, HP/distance/countdown/visual time, repeated/hard/invalid gaps, ordinary 30/144 Hz behavior, manual pause/resume, AppState, visibility, focus, unmount, back and context loss. Existing tests are not weakened. Run npm run validate from mobile.

Review the 800 ms/1.6-second bounds and device behavior before integration. Keep this patch separate from visual branch 9448650, whose environment remains unready. No APK, push or merge is authorized here. The owner status remains unresolved; this local proposal does not imply owner receipt or approval.
