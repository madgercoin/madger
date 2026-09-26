export const RUN_SECONDS = 120;
export const BOSS_TIME = 85;
export const PLAYER_MAX_HEALTH = 100;
export const CACHE_MAX_INTEGRITY = 100;

export type PhaseId = "sweep" | "lockdown" | "warden" | "overtime";
export type EnemyType = "scrounger" | "rusher" | "spitter" | "burrower" | "bulwark" | "snatcher";
export type UpgradeId =
  | "sharpenedClaws" | "quickCut" | "wideArc" | "twinSlash" | "puncture"
  | "thickHide" | "swiftPaws" | "hardDash" | "deepBreath" | "secondWind"
  | "ricochetStone" | "tripwire" | "decoyScent" | "magneticLoot" | "crewAssist";

export interface PhaseDefinition {
  id: PhaseId;
  label: string;
  spawnInterval: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  group: "STRIKE" | "GRIT" | "CONTROL";
}

export interface CombatStats {
  maxHealth: number;
  moveSpeed: number;
  attackDamage: number;
  attackCooldown: number;
  projectileRadius: number;
  twinChance: number;
  armorBypass: number;
  dashDamage: number;
  burrowCooldown: number;
  secondWind: boolean;
  ricochets: number;
  tripwire: boolean;
  decoy: boolean;
  xpMultiplier: number;
  crewAssist: boolean;
}

export interface ReclaimResult {
  success: boolean;
  enemiesCleared: number;
  bossDefeated: boolean;
  cacheIntegrity: number;
  level: number;
}

export interface ReclaimRecord {
  runs: number;
  extractions: number;
  bestProof: number;
  wardens: number;
  highestLevel: number;
}

export const upgrades: readonly UpgradeDefinition[] = Object.freeze([
  { id: "sharpenedClaws", name: "Sharpened Claws", description: "+8 strike damage.", group: "STRIKE" },
  { id: "quickCut", name: "Quick Cut", description: "Attack 12% faster.", group: "STRIKE" },
  { id: "wideArc", name: "Wide Arc", description: "Larger strike path.", group: "STRIKE" },
  { id: "twinSlash", name: "Twin Slash", description: "20% chance to release a second strike.", group: "STRIKE" },
  { id: "puncture", name: "Puncture", description: "Bypass part of enemy armor.", group: "STRIKE" },
  { id: "thickHide", name: "Thick Hide", description: "+20 maximum health and recover 20.", group: "GRIT" },
  { id: "swiftPaws", name: "Swift Paws", description: "+20 movement speed.", group: "GRIT" },
  { id: "hardDash", name: "Hard Dash", description: "Damage enemies crossed during a dash.", group: "GRIT" },
  { id: "deepBreath", name: "Deep Breath", description: "Burrow recovers 0.8 seconds faster.", group: "GRIT" },
  { id: "secondWind", name: "Second Wind", description: "Recover once instead of being downed.", group: "GRIT" },
  { id: "ricochetStone", name: "Ricochet Stone", description: "A strike can jump to one nearby target.", group: "CONTROL" },
  { id: "tripwire", name: "Tripwire", description: "Deploy a damaging trap near the proof cache.", group: "CONTROL" },
  { id: "decoyScent", name: "Decoy Scent", description: "Periodically redirect ordinary enemies.", group: "CONTROL" },
  { id: "magneticLoot", name: "Magnetic Loot", description: "Recover 20% more field experience.", group: "CONTROL" },
  { id: "crewAssist", name: "Crew Assist", description: "The extraction crew fires supporting shots.", group: "CONTROL" }
]);

export function phaseForElapsed(elapsed: number, bossDefeated = false): PhaseDefinition {
  if (elapsed >= RUN_SECONDS && !bossDefeated) return { id: "overtime", label: "ROUTE BLOCKED", spawnInterval: 1.08 };
  if (elapsed >= BOSS_TIME) return { id: "warden", label: "THE WARDEN", spawnInterval: 1.16 };
  if (elapsed >= 40) return { id: "lockdown", label: "LOCKDOWN", spawnInterval: .78 };
  return { id: "sweep", label: "SWEEP", spawnInterval: 1.12 };
}

export function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ next >>> 15, next | 1);
    next ^= next + Math.imul(next ^ next >>> 7, next | 61);
    return ((next ^ next >>> 14) >>> 0) / 4294967296;
  };
}

export function enemyTypeFor(elapsed: number, random: () => number = Math.random): EnemyType {
  const roll = random();
  if (elapsed < 20) return roll < .78 ? "scrounger" : "rusher";
  if (elapsed < 40) return roll < .48 ? "scrounger" : roll < .72 ? "rusher" : roll < .9 ? "spitter" : "snatcher";
  if (elapsed < BOSS_TIME) {
    if (roll < .25) return "scrounger";
    if (roll < .43) return "rusher";
    if (roll < .61) return "spitter";
    if (roll < .75) return "burrower";
    if (roll < .88) return "bulwark";
    return "snatcher";
  }
  if (roll < .16) return "scrounger";
  if (roll < .34) return "rusher";
  if (roll < .54) return "spitter";
  if (roll < .71) return "burrower";
  if (roll < .87) return "bulwark";
  return "snatcher";
}

export function baseCombatStats(): CombatStats {
  return {
    maxHealth: PLAYER_MAX_HEALTH,
    moveSpeed: 230,
    attackDamage: 28,
    attackCooldown: .42,
    projectileRadius: 7,
    twinChance: 0,
    armorBypass: 0,
    dashDamage: 0,
    burrowCooldown: 8,
    secondWind: false,
    ricochets: 0,
    tripwire: false,
    decoy: false,
    xpMultiplier: 1,
    crewAssist: false
  };
}

export function statsForUpgrades(selected: readonly UpgradeId[]): CombatStats {
  const stats = baseCombatStats();
  for (const id of selected) {
    if (id === "sharpenedClaws") stats.attackDamage += 8;
    else if (id === "quickCut") stats.attackCooldown = Math.max(.18, stats.attackCooldown * .88);
    else if (id === "wideArc") stats.projectileRadius += 2;
    else if (id === "twinSlash") stats.twinChance += .2;
    else if (id === "puncture") stats.armorBypass = Math.min(1, stats.armorBypass + .28);
    else if (id === "thickHide") stats.maxHealth += 20;
    else if (id === "swiftPaws") stats.moveSpeed += 20;
    else if (id === "hardDash") stats.dashDamage += 45;
    else if (id === "deepBreath") stats.burrowCooldown = Math.max(3, stats.burrowCooldown - .8);
    else if (id === "secondWind") stats.secondWind = true;
    else if (id === "ricochetStone") stats.ricochets = 1;
    else if (id === "tripwire") stats.tripwire = true;
    else if (id === "decoyScent") stats.decoy = true;
    else if (id === "magneticLoot") stats.xpMultiplier += .2;
    else if (id === "crewAssist") stats.crewAssist = true;
  }
  return stats;
}

export function draftUpgrades(selected: readonly UpgradeId[], random: () => number = Math.random): UpgradeDefinition[] {
  const selectedSet = new Set(selected);
  const available = upgrades.filter(upgrade => !selectedSet.has(upgrade.id));
  const draft: UpgradeDefinition[] = [];
  while (available.length && draft.length < 3) {
    const index = Math.floor(random() * available.length);
    draft.push(available.splice(index, 1)[0]);
  }
  return draft;
}

export function xpForNextLevel(level: number): number {
  return 55 + Math.max(0, level - 1) * 38;
}

export function proofPointsForResult(result: ReclaimResult): number {
  const enemies = Math.max(0, Math.floor(result.enemiesCleared));
  const cache = Math.max(0, Math.min(CACHE_MAX_INTEGRITY, Math.floor(result.cacheIntegrity)));
  const level = Math.max(1, Math.floor(result.level));
  return (result.success ? 500 : 0) + enemies * (result.success ? 12 : 5) + cache * 3 + level * 25 + (result.bossDefeated ? 250 : 0);
}

export function sanitizeReclaimRecord(candidate?: Partial<ReclaimRecord> | null): ReclaimRecord {
  const value = candidate && typeof candidate === "object" ? candidate : {};
  const safe = (field: keyof ReclaimRecord) => {
    const entry = value[field];
    return Number.isSafeInteger(entry) && Number(entry) >= 0 ? Number(entry) : 0;
  };
  return {
    runs: safe("runs"),
    extractions: safe("extractions"),
    bestProof: safe("bestProof"),
    wardens: safe("wardens"),
    highestLevel: safe("highestLevel")
  };
}
