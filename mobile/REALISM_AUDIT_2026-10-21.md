# MADGER realism audit — build 27 candidate

This continues accepted test build 26 on PR #134. It reuses the live-route/UI
work from d0a310d (PR #135), without replacing build 26's native assets/audio or
its stricter native QA. The original Windows workspace is untouched.

## Findings and corrections

- **Integration:** build 26 still stopped at fork menus. New runs now commit
  through actual lateral position while simulation continues. Historical paused
  `fork` checkpoints retain their explicit chooser.
- **Spatial accuracy:** routes previously occupied the same elevation and their
  entrances overlapped. Forks now start at the three entrance lanes, widen into
  separate roads and rebase player-local coordinates without teleporting world
  position. Upper subroutes have a 0.65m jump lip and rise to 1.9m; lower and
  tunnel roads descend. All ease to zero elevation before the 900m rejoin.
- **Moving danger:** boulders previously spun on one spot. Their deterministic
  rockfall pose now starts on a visible bank, descends into the target lane and
  rolls forward. Rendering and swept collision use the same centre. Pause and
  cold recovery cannot advance a rock by wall clock.
- **Environment:** periodic terrain end rings remove a real geometry seam;
  wider shoulder overlap closes edge wedges. Low-detail mode retains distant
  ridges. Cave routes now select cool cave illumination rather than forest sun.
- **Sound accuracy:** the board's legacy `zone=0` incorrectly selected forest
  birds and paw sounds underground. Audio now follows the actual selected biome,
  including cold resume; caves use stone contacts and suppress outdoor ambience.
- **Code fidelity:** the browser character/scene bridge was stale. Regenerated
  from the current authoritative core/scene/geometry and added a provenance gate.
- **Controls:** integrated the approved smaller contact shadows and shallower
  button bevels, preserving every existing input and earned companion rule.

## Verification boundaries

The local full regression/type/lint suite and web export are run for this
candidate. Fresh hosted browser fixtures, exact APK emulator acceptance and
independent package/signature/archive/download verification remain required
before delivery. Local Chromium execution is blocked by the environment's socket
policy; it is not reported as a graphics pass. Hosted tests use their normal
browser environment and retain the 400ms gameplay pause and strict two-second
foreground-observation-through-kill deadline.

This is still stylized 3D. Native albedo/normal lighting does not equal the full
browser PBR renderer or photorealism. Authored landmarks, long-duration device
frame pacing, thermals, audible phone review and full companion activation on
Android remain separate review work. High-value platform-top coin sequences
are not yet implemented; do not claim that a gate jump provides that mechanic.
No Classic/Daily record keys, earned unlock requirements, production package,
Play listing or release-signing credentials are changed.
