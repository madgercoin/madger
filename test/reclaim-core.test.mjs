import assert from "node:assert/strict";
import test from "node:test";
import {
  BOSS_TIME,
  RUN_SECONDS,
  createSeededRandom,
  draftUpgrades,
  enemyTypeFor,
  phaseForElapsed,
  proofPointsForResult,
  sanitizeReclaimRecord,
  statsForUpgrades,
  upgrades,
  xpForNextLevel
} from "../dist/reclaim-core.js";

test("Last Claw Out advances through sweep, lockdown, Warden, and blocked-route phases", () => {
  assert.equal(phaseForElapsed(0).id, "sweep");
  assert.equal(phaseForElapsed(40).id, "lockdown");
  assert.equal(phaseForElapsed(BOSS_TIME).id, "warden");
  assert.equal(phaseForElapsed(RUN_SECONDS, false).id, "overtime");
  assert.equal(phaseForElapsed(RUN_SECONDS, true).id, "warden");
});

test("seeded random courses and enemy selections are deterministic", () => {
  const first = createSeededRandom(9082);
  const second = createSeededRandom(9082);
  assert.deepEqual(Array.from({ length: 8 }, () => first()), Array.from({ length: 8 }, () => second()));
  const enemyRandomA = createSeededRandom(12);
  const enemyRandomB = createSeededRandom(12);
  assert.deepEqual(Array.from({ length: 10 }, () => enemyTypeFor(70, enemyRandomA)), Array.from({ length: 10 }, () => enemyTypeFor(70, enemyRandomB)));
});

test("upgrade drafts are distinct, exclude owned upgrades, and draw from all fifteen rules", () => {
  assert.equal(upgrades.length, 15);
  const owned = ["sharpenedClaws", "quickCut"];
  const draft = draftUpgrades(owned, createSeededRandom(44));
  assert.equal(draft.length, 3);
  assert.equal(new Set(draft.map(choice => choice.id)).size, 3);
  assert.ok(draft.every(choice => !owned.includes(choice.id)));
});

test("combat upgrades change only their documented rules", () => {
  const base = statsForUpgrades([]);
  const changed = statsForUpgrades(["sharpenedClaws", "thickHide", "hardDash", "ricochetStone", "magneticLoot"]);
  assert.equal(changed.attackDamage, base.attackDamage + 8);
  assert.equal(changed.maxHealth, base.maxHealth + 20);
  assert.equal(changed.dashDamage, 45);
  assert.equal(changed.ricochets, 1);
  assert.equal(changed.xpMultiplier, 1.2);
  assert.equal(changed.attackCooldown, base.attackCooldown);
});

test("successful extraction awards a fixed completion and Warden premium", () => {
  const failed = proofPointsForResult({ success: false, enemiesCleared: 20, bossDefeated: false, cacheIntegrity: 50, level: 4 });
  const success = proofPointsForResult({ success: true, enemiesCleared: 20, bossDefeated: true, cacheIntegrity: 50, level: 4 });
  assert.equal(failed, 350);
  assert.equal(success, 1240);
  assert.ok(success > failed);
});

test("records and level thresholds reject malformed persistence and progress predictably", () => {
  assert.deepEqual(sanitizeReclaimRecord({ runs: -3, extractions: 2, bestProof: "900", wardens: 1, highestLevel: 4 }), {
    runs: 0, extractions: 2, bestProof: 0, wardens: 1, highestLevel: 4
  });
  assert.deepEqual(sanitizeReclaimRecord(null), { runs: 0, extractions: 0, bestProof: 0, wardens: 0, highestLevel: 0 });
  assert.equal(xpForNextLevel(1), 55);
  assert.equal(xpForNextLevel(4), 169);
});
