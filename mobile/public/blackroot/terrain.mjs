/* Authored, route-specific landforms for the optional high-detail browser scene.
 * Geometry is visual only: deterministic physics, collision gaps and saves live
 * in src/game/expedition/core.ts and are never modified here.
 */
export const DEFAULT_TERRAIN_PROFILE = Object.freeze({
  bank: 1.5, ripple: 0.9, frequency: 0.13, strata: 0
});
const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;
const smooth = value => {
  const v = Math.max(0, Math.min(1, value));
  return v * v * (3 - 2 * v);
};
export function terrainProfile(presets, route) {
  const candidate = presets?.terrainProfiles?.[route] ?? presets?.terrainProfiles?.main;
  if (!candidate) return DEFAULT_TERRAIN_PROFILE;
  return {
    bank: Math.max(0, Math.min(4, finite(candidate.bank, DEFAULT_TERRAIN_PROFILE.bank))),
    ripple: Math.max(0, Math.min(1.5, finite(candidate.ripple, DEFAULT_TERRAIN_PROFILE.ripple))),
    frequency: Math.max(0.01, Math.min(.5, finite(candidate.frequency, DEFAULT_TERRAIN_PROFILE.frequency))),
    strata: Math.max(0, Math.min(1, finite(candidate.strata, DEFAULT_TERRAIN_PROFILE.strata)))
  };
}
/** Safe running lanes are flat; relief starts outside their shoulder.
 * The exact existing gap cut remains unchanged, and all values are bounded.
 */
export function terrainHeight(profile, x, distance, roadCentre, isGap = false) {
  if (isGap) return -2.4;
  const shoulder = smooth((Math.abs(x - roadCentre) - 3.5) / 6);
  if (!shoulder) return -.33;
  const base = finite(profile?.bank, 1.5);
  const ripple = finite(profile?.ripple, .9);
  const frequency = finite(profile?.frequency, .13);
  const strata = finite(profile?.strata, 0);
  const undulation = Math.sin(distance * frequency + x * .2) * ripple;
  const layered = Math.cos(distance * .067 + x * .16) * strata;
  const h = -.33 + shoulder * Math.max(.2, base + undulation + layered);
  return Math.max(-.33, Math.min(5, h));
}
export function terrainBiome(presets, route) {
  const name = presets?.routes?.[route]?.[0];
  return ['forest', 'ruins', 'cavern'].includes(name) ? name : 'forest';
}
