import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { terrainHeight, terrainProfile, terrainBiome, terrainSurfaceHeight, sceneryProfile } from '../public/blackroot/terrain.mjs';

const presets = JSON.parse(readFileSync(new URL('../public/blackroot/world-presets.json', import.meta.url), 'utf8'));
const routes = Object.keys(presets.routes);
const expected = ['main','rootway','ridge','deep','mosswalk','root-arch','log-crossing','causeway','watchtower','gearworks','mudslide','crystal-vein','ancient-vault','hollow','grotto'];

test('all 15 existing route IDs have biome and finite authored terrain profiles', () => {
  assert.deepEqual([...routes].sort(), expected.sort());
  for (const route of routes) {
    assert(['forest','ruins','cavern'].includes(terrainBiome(presets, route)), route);
    const profile = terrainProfile(presets, route);
    for (const value of Object.values(profile)) assert(Number.isFinite(value), route);
    assert(profile.bank >= 0 && profile.bank <= 4, route);
  }
  assert.equal(terrainBiome(presets,'ridge'),'ruins');
  assert.equal(terrainBiome(presets,'crystal-vein'),'cavern');
});

test('the running surface stays collision-aligned and gaps remain cut', () => {
  for (const route of routes) for (const centre of [-8.5,0,8.5]) {
    const profile=terrainProfile(presets,route);
    for (const distance of [0,140,455,680,1080]) for(const lane of [-2.15,0,2.15]) {
      assert.equal(terrainHeight(profile,centre+lane,distance,centre),-.33,route);
      assert.equal(terrainHeight(profile,centre+lane,distance,centre,true),-2.4,route);
    }
  }
});

test('all routes produce bounded, nonflat shoulder relief without unsafe lane heights', () => {
  const signatures=new Set();
  for(const route of routes) {
    const profile=terrainProfile(presets,route);
    const elevations=[40,150,260,470,700].map(d=>terrainHeight(profile,10,d,0));
    elevations.forEach(v=>assert(v>=-.33&&v<=5,route));
    assert(elevations.some(v=>v>.01),route);
    signatures.add(elevations.map(v=>v.toFixed(3)).join(','));
  }
  assert.equal(signatures.size,routes.length,'Each planned route must have identifiable geology');
});

test('malformed or unavailable visual presets cannot break the route surface', () => {
  assert.equal(terrainBiome(null,'main'),'forest');
  assert.equal(terrainProfile(null,'main').bank,1.5);
  const sanitized=terrainProfile({terrainProfiles:{main:{bank:Infinity,ripple:-8,frequency:2,strata:1e9}}},'main');
  assert.equal(terrainHeight(sanitized,2.15,33,0),-.33,'Playable running lanes remain flat');
  const shoulder=terrainHeight(sanitized,5,33,0);
  assert(Number.isFinite(shoulder)&&shoulder>=-.33&&shoulder<=5,'Malformed relief is bounded');
});

test('all fifteen boards have unique bounded, repeatable scenery direction', () => {
  assert.deepEqual(Object.keys(presets.sceneryProfiles).sort(), [...routes].sort());
  const placements = new Set();
  for (const route of routes) {
    const visual = sceneryProfile(presets, route);
    assert.deepEqual(visual, sceneryProfile(presets, route), route + ' changed between evaluations');
    assert(Number.isSafeInteger(visual.seed) && visual.seed >= 0, route);
    assert(visual.understory >= .15 && visual.understory <= 1.4, route);
    assert(visual.rootScale >= .2 && visual.rootScale <= 1.6, route);
    assert(visual.treeScale >= 0 && visual.treeScale <= 1.4, route);
    if (terrainBiome(presets, route) === 'cavern') assert.equal(visual.treeScale, 0, route);
    placements.add(visual.seed);
  }
  assert.equal(placements.size, routes.length, 'Distinct paths must not repeat the same planting layout');
  assert(sceneryProfile(presets, 'mosswalk').understory > sceneryProfile(presets, 'gearworks').understory);
  assert(sceneryProfile(presets, 'root-arch').rootScale > sceneryProfile(presets, 'causeway').rootScale);
});

test('rendered terrain and anchored scenery agree without changing the three safe lanes', () => {
  for (const route of routes) for (const centre of [-8.5, 0, 8.5]) {
    const profile = terrainProfile(presets, route);
    for (const distance of [0, 19.4, 140, 455, 680, 1080]) {
      for (const lane of [-2.15, 0, 2.15]) {
        assert.equal(terrainSurfaceHeight(profile, centre + lane, distance, centre), -.33, route);
        assert.equal(terrainSurfaceHeight(profile, centre + lane, distance, centre, true), -2.4, route);
      }
      for (const offset of [-13, -7, -4.5, 4.5, 7, 13]) {
        const x = centre + offset;
        const elevation = terrainSurfaceHeight(profile, x, distance, centre);
        assert(Number.isFinite(elevation) && elevation >= -.33 && elevation <= 5, route);
        const shoulder = Math.max(0, Math.min(1, (Math.abs(offset) - 3.5) / 3.8));
        const eased = shoulder * shoulder * (3 - 2 * shoulder);
        const expectedSurface = Math.max(-.33, Math.min(5,
          terrainHeight(profile, x, distance, centre)
          + eased * (Math.sin(distance * .31 + x * .37) * .16
            + Math.sin(distance * .67 - x * .21) * .08)));
        assert(Math.abs(elevation - expectedSurface) < 1e-10, route + ' anchor detached from terrain');
      }
    }
  }
});

test('bad scenery configuration cannot produce nonfinite transforms', () => {
  const fallback = sceneryProfile(null, 'main');
  assert.deepEqual(fallback, { seed: 0, treeScale: 1, understory: 1, rootScale: 1 });
  const invalid = sceneryProfile({ sceneryProfiles: { main: {
    seed: Infinity, treeScale: -999, understory: NaN, rootScale: 9e20
  } } }, 'missing-route');
  assert.deepEqual(invalid, { seed: 0, treeScale: 0, understory: 1, rootScale: 1.6 });
});