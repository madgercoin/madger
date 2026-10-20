/* Conservative mobile fallback for a sustained slow 3D frame cadence.
 * UI remains at full resolution. Runs on observed frame intervals, not device
 * names, so fast GPUs keep native 3D detail and slow/software GPUs can recover.
 */
export const MIN_SCENE_SCALE = 0.42;
export function adjustedSceneScale(scale, samples) {
  if (!Number.isFinite(scale) || scale < MIN_SCENE_SCALE || scale > 1
      || !Array.isArray(samples) || samples.length < 3) return scale;
  const valid = samples.filter(v => Number.isFinite(v) && v > 0 && v < 1800);
  if (valid.length < 3) return scale;
  valid.sort((a, b) => a - b);
  // A single delayed animation frame (GC, browser task, screenshot) must not
  // reduce quality. Repeated bad frames must trigger well before 24 frames.
  const p75 = valid[Math.floor((valid.length - 1) * .75)];
  if (p75 > 95) return Math.max(MIN_SCENE_SCALE, Math.round(scale * .72 * 100) / 100);
  if (p75 > 48 && scale > .65) return Math.max(.65, Math.round(scale * .86 * 100) / 100);
  return scale;
}
