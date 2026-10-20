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

/** Return the *rendered* terrain surface, including its small-scale shoulder
 * relief. All scan anchors use this exact height so 3D roots, rocks and plants
 * grow from the ground rather than float or disappear into the slope.
 * Renderer-only: the deterministic course and its collision model do not move.
 */
export function terrainSurfaceHeight(profile, x, distance, roadCentre, isGap = false) {
  const base = terrainHeight(profile, x, distance, roadCentre, isGap);
  if (isGap) return base;
  const lateral = Math.abs(x - roadCentre);
  const shoulder = smooth((lateral - 3.5) / 3.8);
  const fineRelief = shoulder * (
    Math.sin(distance * .31 + x * .37) * .16
    + Math.sin(distance * .67 - x * .21) * .08
  );
  return Math.max(-.33, Math.min(5, base + fineRelief));
}

/** Small deterministic forest understory sway. Visual-only; time changes
 * the instanced mesh orientation, never saved inventory or course physics.
 * Bound the sine amplitudes to avoid plants crossing the protected lanes.
 */
export function foliageSway(time,distance,phase=0){
  const t=finite(time,0),d=finite(distance,0),p=finite(phase,0);
  return .038*Math.sin(t*1.55+d*.21+p*.7)
    +.008*Math.sin(t*.65-d*.43+p);
}

/** Authored daylight, haze and PBR exposure, with no extra draw calls.
 * Visual-only profiles: never used by route generation, physics or persistence.
 */
export const DEFAULT_ATMOSPHERE_PROFILE = Object.freeze({
  fogDensity: .012, hemisphere: 2, environment: .32,
  fill: 13, exposure: 1.2, fillColor: '#ffb257'
});
export function atmosphereProfile(presets, route) {
  const candidate=presets?.atmosphereProfiles?.[route]
    ??presets?.atmosphereProfiles?.main??DEFAULT_ATMOSPHERE_PROFILE;
  const bounded=(key,min,max)=>Math.max(min,Math.min(max,
    finite(candidate?.[key],DEFAULT_ATMOSPHERE_PROFILE[key])));
  const fillColor=typeof candidate?.fillColor==='string'
    &&/^#[0-9a-f]{6}$/i.test(candidate.fillColor)
    ?candidate.fillColor:DEFAULT_ATMOSPHERE_PROFILE.fillColor;
  return {
    fogDensity:bounded('fogDensity',.006,.038),
    hemisphere:bounded('hemisphere',.8,2.5),
    environment:bounded('environment',.1,.5),
    fill:bounded('fill',5,40),
    exposure:bounded('exposure',.95,1.4),
    fillColor
  };
}

export const DEFAULT_SCENERY_PROFILE = Object.freeze({
  seed: 0, treeScale: 1, understory: 1, rootScale: 1
});
/** Route-authoring controls, bounded against missing or malformed presets.
 * Layout seeds keep a persistent, reproducible scene for each selected fork.
 */
export function sceneryProfile(presets, route) {
  const values = presets?.sceneryProfiles?.[route]
    ?? presets?.sceneryProfiles?.main
    ?? DEFAULT_SCENERY_PROFILE;
  const bounded = (key, min, max) => Math.max(min, Math.min(max,
    finite(values?.[key], DEFAULT_SCENERY_PROFILE[key])));
  return {
    seed: Math.floor(bounded('seed', 0, 1024)),
    treeScale: bounded('treeScale', 0, 1.4),
    understory: bounded('understory', .15, 1.4),
    rootScale: bounded('rootScale', .2, 1.6)
  };
}