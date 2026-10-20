/* Conservative mobile fallback for a sustained slow 3D frame cadence.
 * UI remains at full resolution. A verified software renderer starts with
 * a smaller 3D buffer; observed frame intervals adapt further when needed.
 * Hardware-accelerated GPUs begin at the existing full-detail quality.
 */
export const MIN_SCENE_SCALE = 0.30;
/** Give true software rasterizers a safe head start before an expensive frame
 * trips the game's (unchanged) protective 400ms pause. Real GPUs keep full PBR.
 */
export function initialSceneScale(rendererName) {
  return typeof rendererName==='string' &&
    /swiftshader|llvmpipe|softpipe|software rasterizer/i.test(rendererName)
      ? 0.36 : 1;
}
/** A detected running-to-protective-pause transition may have no further
 * animation frames; reduce costly visuals for the next *real* Resume click.
 */
export function recoverScaleAfterPause(scale, elapsedMs, previousMode, currentMode) {
  if(previousMode!=='running'||currentMode!=='paused'
     ||!Number.isFinite(elapsedMs)||elapsedMs<400||elapsedMs>=1800
     ||!Number.isFinite(scale)||scale<=MIN_SCENE_SCALE)return scale;
  return Math.max(MIN_SCENE_SCALE,Math.round(scale*.60*100)/100);
}
export function adjustedSceneScale(scale, samples) {
  if (!Number.isFinite(scale) || scale < MIN_SCENE_SCALE || scale > 1
      || !Array.isArray(samples) || samples.length < 3) return scale;
  const valid = samples.filter(v => Number.isFinite(v) && v > 0 && v < 1800);
  if (valid.length < 3) return scale;
  valid.sort((a, b) => a - b);
  // A single delayed animation frame (GC, browser task, screenshot) must not
  // reduce quality. Repeated bad frames must trigger well before 24 frames.
  const p75 = valid[Math.floor((valid.length - 1) * .75)];
  if (p75 > 400) return Math.max(MIN_SCENE_SCALE, Math.round(scale * .48 * 100) / 100);
  if (p75 > 95) return Math.max(MIN_SCENE_SCALE, Math.round(scale * .72 * 100) / 100);
  if (p75 > 48 && scale > .65) return Math.max(.65, Math.round(scale * .86 * 100) / 100);
  return scale;
}
