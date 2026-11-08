# MADGER gameplay preview 35

This revision continues the existing 1.5.1 Expedition. It is an internal Android preview, not a store release or physical-device acceptance.

## Player-facing changes

- Both junctions are discovered through movement: jump onto high ground, burrow into a low opening, or stay on the lower trail. Steering alone cannot grant an upper or underground route. Missed actions land on a safe lower path.
- Named route-choice cards are replaced with environmental clues. A smaller active HUD leaves more of the world visible.
- The shield is a translucent body-sized protective shell instead of rotating hoops. The separate ground magnet effect remains distinct.
- Scenery persists until it passes behind the camera. Nearby branches remain in place across route commitment, and ground texture coordinates stay anchored to the world.
- Healing on side trails rewards deliberate movement rather than automatically refilling a stationary player.

## Verification and limits

The gameplay suites exercise all nine full route combinations, deliberate action timing, failed-input fallback, recovery and balance. Browser/native smoke tests use actual input and require observed movement; they do not inject a destination or suppress protective pauses. Visual fixtures cover an active shield and route boundaries.

Use the CI results for this exact source revision for current source, browser, APK and emulator status. Local Chromium could not start because its socket call was unavailable, so local visual acceptance is not claimed. Prior build 34 and its source manifest do not verify this revision.

Do not mark physical Android gameplay, thermal/performance, signing, closed testing or store submission as complete based on this change. Existing release gates remain in force.
