import Phaser from "phaser";
import {
  BOSS_TIME,
  CACHE_MAX_INTEGRITY,
  PLAYER_MAX_HEALTH,
  RUN_SECONDS,
  createSeededRandom,
  draftUpgrades,
  enemyTypeFor,
  phaseForElapsed,
  proofPointsForResult,
  sanitizeReclaimRecord,
  statsForUpgrades,
  upgrades,
  xpForNextLevel,
  type CombatStats,
  type EnemyType,
  type ReclaimRecord,
  type UpgradeDefinition,
  type UpgradeId
} from "./core";

const WIDTH = 960;
const HEIGHT = 540;
const RECORD_KEY = "madger-reclaim-field-record-v1";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const element = <T extends HTMLElement>(id: string) => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing required element #${id}`);
  return node as T;
};

const ui = {
  health: element<HTMLElement>("health-value"), healthMeter: element<HTMLElement>("health-meter"),
  cache: element<HTMLElement>("cache-value"), cacheMeter: element<HTMLElement>("cache-meter"),
  phase: element<HTMLElement>("phase-label"), timer: element<HTMLElement>("timer-value"),
  level: element<HTMLElement>("level-value"), cleared: element<HTMLElement>("cleared-value"),
  xp: element<HTMLElement>("xp-value"), xpMeter: element<HTMLElement>("xp-meter"),
  dash: element<HTMLElement>("dash-status"), burrow: element<HTMLElement>("burrow-status"),
  brief: element<HTMLElement>("brief-panel"), upgrades: element<HTMLElement>("upgrade-panel"),
  upgradeOptions: element<HTMLElement>("upgrade-options"), pause: element<HTMLElement>("pause-panel"),
  result: element<HTMLElement>("result-panel"), resultKicker: element<HTMLElement>("result-kicker"),
  resultTitle: element<HTMLElement>("result-title"), resultGrid: element<HTMLElement>("result-grid"),
  bossBanner: element<HTMLElement>("boss-banner"), status: element<HTMLElement>("game-status")
};

const controls = { up: false, down: false, left: false, right: false, attack: false };

let soundEnabled = false;
let audioContext: AudioContext | undefined;
function tone(frequency: number, duration = .07, kind: OscillatorType = "triangle") {
  if (!soundEnabled) return;
  const AudioEngine = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioEngine) return;
  try {
    audioContext ||= new AudioEngine();
    if (audioContext.state === "suspended") void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = kind;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    soundEnabled = false;
    const button = element<HTMLButtonElement>("sound-toggle");
    button.textContent = "SOUND: UNAVAILABLE";
    button.setAttribute("aria-pressed", "false");
  }
}

function announce(message: string) { ui.status.textContent = message; }

function readRecord(): ReclaimRecord {
  try { return sanitizeReclaimRecord(JSON.parse(localStorage.getItem(RECORD_KEY) || "{}")); }
  catch { return sanitizeReclaimRecord(); }
}
function writeRecord(record: ReclaimRecord) {
  try { localStorage.setItem(RECORD_KEY, JSON.stringify(sanitizeReclaimRecord(record))); } catch {}
}
function drawRecord() {
  const record = readRecord();
  element("record-runs").textContent = String(record.runs);
  element("record-extractions").textContent = String(record.extractions);
  element("record-proof").textContent = String(record.bestProof);
  element("record-wardens").textContent = String(record.wardens);
  element("record-level").textContent = String(record.highestLevel);
}

interface Enemy {
  id: number;
  type: EnemyType | "warden";
  node: Phaser.GameObjects.Container;
  core: Phaser.GameObjects.Arc;
  healthBar: Phaser.GameObjects.Rectangle;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  xp: number;
  armor: number;
  attackTimer: number;
  actionTimer: number;
  state: "normal" | "warning" | "charging" | "buried";
  targetX: number;
  targetY: number;
  boss: boolean;
}

interface Shot {
  node: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  hostile: boolean;
  ricochets: number;
  hitIds: Set<number>;
}

interface Trap {
  node: Phaser.GameObjects.Arc;
  life: number;
}

class ReclaimScene extends Phaser.Scene {
  running = false;
  pausedByPlayer = false;
  player!: Phaser.GameObjects.Container;
  playerHalo!: Phaser.GameObjects.Arc;
  cacheNode!: Phaser.GameObjects.Container;
  cachePulse!: Phaser.GameObjects.Arc;
  decoyNode?: Phaser.GameObjects.Container;
  keys!: Record<"up" | "down" | "left" | "right" | "attack" | "dash" | "burrow" | "pause", Phaser.Input.Keyboard.Key>;
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  traps: Trap[] = [];
  selected: UpgradeId[] = [];
  stats: CombatStats = statsForUpgrades([]);
  health = PLAYER_MAX_HEALTH;
  cacheIntegrity = CACHE_MAX_INTEGRITY;
  level = 1;
  xp = 0;
  cleared = 0;
  elapsed = 0;
  spawnTimer = 0;
  attackTimer = 0;
  dashCooldown = 0;
  dashTime = 0;
  dashDirection = new Phaser.Math.Vector2(0, -1);
  dashHits = new Set<number>();
  burrowCooldown = 0;
  burrowTime = 0;
  playerRecovery = 0;
  secondWindUsed = false;
  bossSpawned = false;
  bossDefeated = false;
  phaseId = "sweep";
  tripwireTimer = 0;
  assistTimer = 0;
  decoyTimer = 0;
  decoyLife = 0;
  random = createSeededRandom(Date.now());
  nextEnemyId = 1;
  aim = new Phaser.Math.Vector2(0, -1);

  constructor() { super("Reclaim"); }

  preload() { this.load.image("madger-emblem", "/assets/madger_official_logo_transparent_512.png"); }

  create() {
    this.drawDistrict();
    this.cacheNode = this.createCache();
    this.player = this.createPlayer();
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input unavailable");
    this.keys = {
      up: keyboard.addKey("W"), down: keyboard.addKey("S"), left: keyboard.addKey("A"), right: keyboard.addKey("D"),
      attack: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE), dash: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      burrow: keyboard.addKey("Q"), pause: keyboard.addKey("P")
    };
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP).on("down", () => { controls.up = true; });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP).on("up", () => { controls.up = false; });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN).on("down", () => { controls.down = true; });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN).on("up", () => { controls.down = false; });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT).on("down", () => { controls.left = true; });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT).on("up", () => { controls.left = false; });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT).on("down", () => { controls.right = true; });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT).on("up", () => { controls.right = false; });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.updatePointerAim(pointer));
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.updatePointerAim(pointer));
    this.refreshHud();
    sceneRef = this;
  }

  drawDistrict() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x080906).fillRect(0, 0, WIDTH, HEIGHT);
    graphics.fillStyle(0x11120d).fillRoundedRect(42, 34, 876, 472, 18);
    graphics.fillStyle(0x191910).fillRect(338, 34, 284, 472);
    graphics.fillStyle(0x0c0d09).fillRect(42, 212, 876, 118);
    graphics.lineStyle(2, 0xd4af37, .12);
    for (let x = 62; x < 920; x += 64) graphics.lineBetween(x, 34, x, 506);
    for (let y = 54; y < 506; y += 64) graphics.lineBetween(42, y, 918, y);
    graphics.lineStyle(3, 0xd4af37, .25).strokeRoundedRect(42, 34, 876, 472, 18);
    graphics.lineStyle(2, 0xc8ad7b, .14).strokeCircle(480, 270, 112).strokeCircle(480, 270, 174);
    this.add.text(60, 49, "SIGNAL ROW // BLOCK 01", { fontFamily: "system-ui", fontSize: "12px", color: "#8b7b57", fontStyle: "bold" }).setAlpha(.8);
    this.add.text(900, 482, "EXTRACTION GRID", { fontFamily: "system-ui", fontSize: "10px", color: "#8b7b57", fontStyle: "bold" }).setOrigin(1);
  }

  createCache() {
    const glow = this.add.circle(0, 0, 48, 0x59d89c, .08).setStrokeStyle(2, 0x59d89c, .58);
    this.cachePulse = this.add.circle(0, 0, 63, 0xd4af37, 0).setStrokeStyle(2, 0xd4af37, .28);
    const core = this.add.rectangle(0, 0, 46, 34, 0x191b15, 1).setStrokeStyle(2, 0xd4af37, .85);
    const mark = this.add.text(0, 0, "PROOF", { fontFamily: "system-ui", fontSize: "10px", color: "#f2ead9", fontStyle: "bold" }).setOrigin(.5);
    return this.add.container(480, 270, [this.cachePulse, glow, core, mark]).setDepth(3);
  }

  createPlayer() {
    this.playerHalo = this.add.circle(0, 0, 37, 0xd4af37, .12).setStrokeStyle(2, 0xd4af37, .52);
    const image = this.add.image(0, 0, "madger-emblem").setDisplaySize(64, 64);
    return this.add.container(480, 418, [this.playerHalo, image]).setDepth(12);
  }

  updatePointerAim(pointer: Phaser.Input.Pointer) {
    const vector = new Phaser.Math.Vector2(pointer.worldX - this.player.x, pointer.worldY - this.player.y);
    if (vector.lengthSq() > 64) this.aim.copy(vector.normalize());
  }

  startRun() {
    this.clearRunObjects();
    this.running = true;
    this.pausedByPlayer = false;
    this.selected = [];
    this.stats = statsForUpgrades([]);
    this.health = PLAYER_MAX_HEALTH;
    this.cacheIntegrity = CACHE_MAX_INTEGRITY;
    this.level = 1;
    this.xp = 0;
    this.cleared = 0;
    this.elapsed = 0;
    this.spawnTimer = .8;
    this.attackTimer = 0;
    this.dashCooldown = 0;
    this.dashTime = 0;
    this.burrowCooldown = 0;
    this.burrowTime = 0;
    this.playerRecovery = 0;
    this.secondWindUsed = false;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.phaseId = "sweep";
    this.tripwireTimer = 5;
    this.assistTimer = 1;
    this.decoyTimer = 6;
    this.decoyLife = 0;
    this.random = createSeededRandom(Math.floor(Date.now() / 86400000) ^ readRecord().runs);
    this.nextEnemyId = 1;
    this.player.setPosition(480, 418).setAlpha(1).setVisible(true);
    this.cacheNode.setVisible(true);
    ui.brief.hidden = true;
    ui.result.hidden = true;
    ui.pause.hidden = true;
    ui.upgrades.hidden = true;
    ui.bossBanner.hidden = true;
    this.refreshHud();
    announce("Operation started. Protect the proof cache and prepare for the Block Warden.");
    tone(330, .12);
    element("reclaim-game").focus();
  }

  clearRunObjects() {
    for (const enemy of this.enemies) enemy.node.destroy();
    for (const shot of this.shots) shot.node.destroy();
    for (const trap of this.traps) trap.node.destroy();
    this.decoyNode?.destroy();
    this.decoyNode = undefined;
    this.enemies = [];
    this.shots = [];
    this.traps = [];
  }

  update(_time: number, deltaMs: number) {
    if (!this.running) return;
    const delta = deltaMs / 1000;
    const step = Math.min(delta, .05);
    this.elapsed += delta;
    this.attackTimer = Math.max(0, this.attackTimer - delta);
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    this.burrowCooldown = Math.max(0, this.burrowCooldown - delta);
    this.playerRecovery = Math.max(0, this.playerRecovery - delta);
    this.updatePhase();
    this.updatePlayer(step, delta);
    this.updateSupport(step, delta);
    this.updateSpawning(delta);
    this.updateEnemies(step, delta);
    this.updateShots(step, delta);
    this.updateTraps(delta);
    this.checkEndState();
    this.refreshHud();
  }

  updatePhase() {
    const phase = phaseForElapsed(this.elapsed, this.bossDefeated);
    if (phase.id !== this.phaseId) {
      this.phaseId = phase.id;
      announce(phase.id === "warden" ? "The Block Warden has entered Signal Row." : `${phase.label} phase reached.`);
      tone(phase.id === "warden" ? 95 : 410, phase.id === "warden" ? .3 : .12, phase.id === "warden" ? "sawtooth" : "triangle");
    }
    if (!this.bossSpawned && this.elapsed >= BOSS_TIME) this.spawnWarden();
  }

  updatePlayer(step: number, delta: number) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.pause)) { pauseRun(); return; }
    if (Phaser.Input.Keyboard.JustDown(this.keys.dash)) this.beginDash();
    if (Phaser.Input.Keyboard.JustDown(this.keys.burrow)) this.beginBurrow();

    const movement = new Phaser.Math.Vector2(
      Number(this.keys.right.isDown || controls.right) - Number(this.keys.left.isDown || controls.left),
      Number(this.keys.down.isDown || controls.down) - Number(this.keys.up.isDown || controls.up)
    );
    if (movement.lengthSq()) movement.normalize();

    if (this.dashTime > 0) {
      this.dashTime -= delta;
      this.player.x += this.dashDirection.x * this.stats.moveSpeed * 3.25 * step;
      this.player.y += this.dashDirection.y * this.stats.moveSpeed * 3.25 * step;
      this.applyDashDamage();
    } else if (this.burrowTime > 0) {
      this.burrowTime -= delta;
      this.player.setAlpha(.28);
      this.player.x += movement.x * this.stats.moveSpeed * 1.55 * step;
      this.player.y += movement.y * this.stats.moveSpeed * 1.55 * step;
      if (this.burrowTime <= 0) this.player.setAlpha(1);
    } else {
      this.player.x += movement.x * this.stats.moveSpeed * step;
      this.player.y += movement.y * this.stats.moveSpeed * step;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, 67, 893);
    this.player.y = Phaser.Math.Clamp(this.player.y, 59, 481);
    if (movement.lengthSq()) this.aim.copy(movement);

    const pointer = this.input.activePointer;
    const pointerAttack = pointer.isDown && pointer.x >= 0 && pointer.x <= WIDTH && pointer.y >= 0 && pointer.y <= HEIGHT;
    if ((pointerAttack || this.keys.attack.isDown || controls.attack) && this.attackTimer <= 0 && this.burrowTime <= 0) this.firePlayerShot(controls.attack);
  }

  beginDash() {
    if (!this.running || this.dashCooldown > 0 || this.burrowTime > 0) return;
    const movement = new Phaser.Math.Vector2(
      Number(this.keys.right.isDown || controls.right) - Number(this.keys.left.isDown || controls.left),
      Number(this.keys.down.isDown || controls.down) - Number(this.keys.up.isDown || controls.up)
    );
    this.dashDirection.copy(movement.lengthSq() ? movement.normalize() : this.aim);
    this.dashTime = .2;
    this.dashCooldown = 3;
    this.dashHits.clear();
    this.playerHalo.setFillStyle(0xf2ead9, .28);
    this.time.delayedCall(210, () => this.playerHalo.setFillStyle(0xd4af37, .12));
    tone(240, .08);
  }

  beginBurrow() {
    if (!this.running || this.burrowCooldown > 0 || this.dashTime > 0) return;
    this.burrowTime = .72;
    this.burrowCooldown = this.stats.burrowCooldown;
    tone(120, .16, "sine");
  }

  firePlayerShot(autoAim = false) {
    let direction = this.aim.clone();
    if (autoAim || direction.lengthSq() < .5) {
      const nearest = this.nearestEnemy(this.player.x, this.player.y);
      if (nearest) direction = new Phaser.Math.Vector2(nearest.node.x - this.player.x, nearest.node.y - this.player.y).normalize();
    }
    if (!direction.lengthSq()) direction.set(0, -1);
    this.createShot(this.player.x, this.player.y, direction, this.stats.attackDamage, false, this.stats.projectileRadius, this.stats.ricochets, 0xf2cf60);
    if (this.random() < this.stats.twinChance) {
      const twin = direction.clone().rotate(.12);
      this.createShot(this.player.x, this.player.y, twin, this.stats.attackDamage * .72, false, this.stats.projectileRadius, 0, 0xf0e3c7);
    }
    this.attackTimer = this.stats.attackCooldown;
    tone(470, .045);
  }

  createShot(x: number, y: number, direction: Phaser.Math.Vector2, damage: number, hostile: boolean, radius = 6, ricochets = 0, color = 0xef604f) {
    const speed = hostile ? 255 : 545;
    const node = this.add.circle(x, y, radius, color, 1).setStrokeStyle(2, hostile ? 0xffb0a6 : 0x3a2b0b, .72).setDepth(10);
    this.shots.push({ node, vx: direction.x * speed, vy: direction.y * speed, radius, damage, life: hostile ? 4.2 : 1.8, hostile, ricochets, hitIds: new Set() });
  }

  updateSupport(_step: number, delta: number) {
    if (this.stats.tripwire) {
      this.tripwireTimer -= delta;
      if (this.tripwireTimer <= 0) {
        const angle = this.random() * Math.PI * 2;
        const node = this.add.circle(480 + Math.cos(angle) * 92, 270 + Math.sin(angle) * 92, 21, 0xd4af37, .08).setStrokeStyle(3, 0xd4af37, .72).setDepth(4);
        this.traps.push({ node, life: 14 });
        this.tripwireTimer = 8;
      }
    }
    if (this.stats.crewAssist) {
      this.assistTimer -= delta;
      if (this.assistTimer <= 0) {
        const target = this.nearestEnemy(480, 270);
        if (target) {
          const direction = new Phaser.Math.Vector2(target.node.x - 480, target.node.y - 270).normalize();
          this.createShot(480, 270, direction, 18, false, 5, 0, 0x59d89c);
        }
        this.assistTimer = 1.45;
      }
    }
    if (this.stats.decoy) {
      this.decoyTimer -= delta;
      this.decoyLife -= delta;
      if (this.decoyTimer <= 0) {
        this.decoyNode?.destroy();
        const angle = this.random() * Math.PI * 2;
        const ring = this.add.circle(0, 0, 26, 0x59d89c, .08).setStrokeStyle(2, 0x59d89c, .74);
        const label = this.add.text(0, 0, "DECOY", { fontFamily: "system-ui", fontSize: "8px", color: "#59d89c", fontStyle: "bold" }).setOrigin(.5);
        this.decoyNode = this.add.container(480 + Math.cos(angle) * 150, 270 + Math.sin(angle) * 150, [ring, label]).setDepth(5);
        this.decoyLife = 3.4;
        this.decoyTimer = 12;
      }
      if (this.decoyLife <= 0 && this.decoyNode) { this.decoyNode.destroy(); this.decoyNode = undefined; }
    }
    if (!reducedMotion) this.cachePulse.setScale(1 + Math.sin(this.elapsed * 3) * .07).setAlpha(.6 + Math.sin(this.elapsed * 3) * .18);
  }

  updateSpawning(delta: number) {
    this.spawnTimer -= delta;
    const phase = phaseForElapsed(this.elapsed, this.bossDefeated);
    if (this.spawnTimer <= 0) {
      const pressure = Math.min(.32, this.elapsed / 360);
      this.spawnEnemy(enemyTypeFor(this.elapsed, this.random));
      if (this.random() < pressure) this.spawnEnemy(enemyTypeFor(this.elapsed, this.random));
      this.spawnTimer = phase.spawnInterval + this.random() * .32;
    }
  }

  spawnEnemy(type: EnemyType) {
    const edge = Math.floor(this.random() * 4);
    const x = edge < 2 ? (edge === 0 ? 55 : 905) : 90 + this.random() * 780;
    const y = edge >= 2 ? (edge === 2 ? 48 : 492) : 70 + this.random() * 400;
    const specs: Record<EnemyType, { hp: number; speed: number; radius: number; damage: number; xp: number; armor: number; color: number; mark: string }> = {
      scrounger: { hp: 54, speed: 76, radius: 16, damage: 11, xp: 14, armor: 0, color: 0x9d7a43, mark: "S" },
      rusher: { hp: 44, speed: 88, radius: 15, damage: 15, xp: 17, armor: 0, color: 0xe68b44, mark: "R" },
      spitter: { hp: 48, speed: 58, radius: 16, damage: 10, xp: 18, armor: 0, color: 0xb96669, mark: "P" },
      burrower: { hp: 66, speed: 68, radius: 17, damage: 14, xp: 22, armor: .08, color: 0x805aa8, mark: "B" },
      bulwark: { hp: 132, speed: 42, radius: 22, damage: 17, xp: 30, armor: .45, color: 0x77786c, mark: "◈" },
      snatcher: { hp: 58, speed: 82, radius: 16, damage: 10, xp: 20, armor: 0, color: 0x4e9c7a, mark: "C" }
    };
    const spec = specs[type];
    this.enemies.push(this.makeEnemy(type, x, y, spec, false));
  }

  makeEnemy(type: Enemy["type"], x: number, y: number, spec: { hp: number; speed: number; radius: number; damage: number; xp: number; armor: number; color: number; mark: string }, boss: boolean) {
    const shadow = this.add.ellipse(0, spec.radius * .72, spec.radius * 2.2, spec.radius * .72, 0x000000, .48);
    const core = this.add.circle(0, 0, spec.radius, spec.color, 1).setStrokeStyle(boss ? 4 : 2, boss ? 0xef604f : 0xf2ead9, boss ? .9 : .42);
    const mark = this.add.text(0, 0, spec.mark, { fontFamily: "system-ui", fontSize: boss ? "20px" : "12px", color: "#090a08", fontStyle: "bold" }).setOrigin(.5);
    const barBack = this.add.rectangle(0, -spec.radius - 10, spec.radius * 2.2, 4, 0x211311, .9);
    const healthBar = this.add.rectangle(-spec.radius * 1.1, -spec.radius - 10, spec.radius * 2.2, 4, boss ? 0xef604f : 0xd4af37, 1).setOrigin(0, .5);
    const node = this.add.container(x, y, [shadow, core, mark, barBack, healthBar]).setDepth(boss ? 11 : 8);
    return {
      id: this.nextEnemyId++, type, node, core, healthBar, hp: spec.hp, maxHp: spec.hp, speed: spec.speed, radius: spec.radius,
      damage: spec.damage, xp: spec.xp, armor: spec.armor, attackTimer: .45 + this.random() * .3,
      actionTimer: type === "rusher" ? 1.5 : type === "burrower" ? 2.6 : boss ? 2.2 : 0,
      state: "normal" as const, targetX: x, targetY: y, boss
    };
  }

  spawnWarden() {
    this.bossSpawned = true;
    const spec = { hp: 1150, speed: 58, radius: 38, damage: 20, xp: 140, armor: .22, color: 0xb93b30, mark: "W" };
    this.enemies.push(this.makeEnemy("warden", 480, 58, spec, true));
    ui.bossBanner.hidden = false;
    this.time.delayedCall(3000, () => { ui.bossBanner.hidden = true; });
  }

  updateEnemies(step: number, delta: number) {
    for (const enemy of [...this.enemies]) {
      enemy.attackTimer = Math.max(0, enemy.attackTimer - delta);
      enemy.actionTimer -= delta;
      if (enemy.type === "burrower") this.updateBurrower(enemy, step);
      else if (enemy.type === "rusher") this.updateRusher(enemy, step);
      else if (enemy.type === "spitter") this.updateSpitter(enemy, step);
      else if (enemy.type === "warden") this.updateWarden(enemy, step);
      else this.moveEnemyTowardTarget(enemy, step);
      this.resolveEnemyContact(enemy);
    }
  }

  targetFor(enemy: Enemy) {
    if (enemy.type === "snatcher") return new Phaser.Math.Vector2(480, 270);
    if (this.decoyNode && this.decoyLife > 0 && !enemy.boss) return new Phaser.Math.Vector2(this.decoyNode.x, this.decoyNode.y);
    return new Phaser.Math.Vector2(this.player.x, this.player.y);
  }

  moveEnemyTowardTarget(enemy: Enemy, step: number, multiplier = 1) {
    const target = this.targetFor(enemy);
    const vector = target.subtract(new Phaser.Math.Vector2(enemy.node.x, enemy.node.y));
    if (vector.lengthSq()) vector.normalize();
    enemy.node.x += vector.x * enemy.speed * multiplier * step;
    enemy.node.y += vector.y * enemy.speed * multiplier * step;
  }

  updateRusher(enemy: Enemy, step: number) {
    if (enemy.state === "warning") {
      enemy.core.setStrokeStyle(4, 0xf2cf60, .95);
      if (enemy.actionTimer <= 0) {
        const vector = this.targetFor(enemy).subtract(new Phaser.Math.Vector2(enemy.node.x, enemy.node.y)).normalize();
        enemy.targetX = vector.x; enemy.targetY = vector.y; enemy.state = "charging"; enemy.actionTimer = .56;
      }
      return;
    }
    if (enemy.state === "charging") {
      enemy.node.x += enemy.targetX * enemy.speed * 4.1 * step;
      enemy.node.y += enemy.targetY * enemy.speed * 4.1 * step;
      if (enemy.actionTimer <= 0) { enemy.state = "normal"; enemy.actionTimer = 2.1; enemy.core.setStrokeStyle(2, 0xf2ead9, .42); }
      return;
    }
    if (enemy.actionTimer <= 0) { enemy.state = "warning"; enemy.actionTimer = .58; return; }
    this.moveEnemyTowardTarget(enemy, step);
  }

  updateBurrower(enemy: Enemy, step: number) {
    if (enemy.state === "buried") {
      enemy.node.setAlpha(.14);
      if (enemy.actionTimer <= 0) {
        const angle = this.random() * Math.PI * 2;
        enemy.node.setPosition(this.player.x + Math.cos(angle) * 92, this.player.y + Math.sin(angle) * 92).setAlpha(1);
        enemy.state = "normal"; enemy.actionTimer = 3.1;
      }
      return;
    }
    if (enemy.actionTimer <= 0) { enemy.state = "buried"; enemy.actionTimer = .68; return; }
    this.moveEnemyTowardTarget(enemy, step);
  }

  updateSpitter(enemy: Enemy, step: number) {
    const toPlayer = new Phaser.Math.Vector2(this.player.x - enemy.node.x, this.player.y - enemy.node.y);
    const distance = toPlayer.length();
    if (distance > 265) this.moveEnemyTowardTarget(enemy, step);
    else if (distance < 175 && distance > 0) { toPlayer.normalize(); enemy.node.x -= toPlayer.x * enemy.speed * step; enemy.node.y -= toPlayer.y * enemy.speed * step; }
    if (enemy.attackTimer <= 0 && distance < 390) {
      this.createShot(enemy.node.x, enemy.node.y, toPlayer.normalize(), enemy.damage, true, 6, 0, 0xef604f);
      enemy.attackTimer = 1.75;
    }
  }

  updateWarden(enemy: Enemy, step: number) {
    this.moveEnemyTowardTarget(enemy, step, enemy.state === "charging" ? 3.4 : 1);
    if (enemy.actionTimer > 0) return;
    if (enemy.state === "charging") {
      enemy.state = "normal"; enemy.actionTimer = 2.3; enemy.core.setStrokeStyle(4, 0xef604f, .9); return;
    }
    if (this.random() < .5) {
      for (let index = 0; index < 10; index += 1) {
        const angle = index / 10 * Math.PI * 2;
        this.createShot(enemy.node.x, enemy.node.y, new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)), 13, true, 7, 0, 0xef604f);
      }
      enemy.actionTimer = 3.4;
      tone(86, .22, "sawtooth");
    } else {
      enemy.state = "charging"; enemy.actionTimer = .8; enemy.core.setStrokeStyle(6, 0xf2cf60, 1);
    }
  }

  resolveEnemyContact(enemy: Enemy) {
    const playerDistance = Phaser.Math.Distance.Between(enemy.node.x, enemy.node.y, this.player.x, this.player.y);
    if (playerDistance < enemy.radius + 28 && enemy.attackTimer <= 0 && this.burrowTime <= 0 && this.dashTime <= 0) {
      this.damagePlayer(enemy.damage);
      enemy.attackTimer = enemy.boss ? .92 : .72;
    }
    if (enemy.type === "snatcher") {
      const cacheDistance = Phaser.Math.Distance.Between(enemy.node.x, enemy.node.y, 480, 270);
      if (cacheDistance < enemy.radius + 45 && enemy.attackTimer <= 0) {
        this.damageCache(enemy.damage);
        enemy.attackTimer = .82;
      }
    }
  }

  updateShots(step: number, delta: number) {
    for (const shot of [...this.shots]) {
      shot.life -= delta;
      shot.node.x += shot.vx * step;
      shot.node.y += shot.vy * step;
      if (shot.life <= 0 || shot.node.x < 35 || shot.node.x > 925 || shot.node.y < 25 || shot.node.y > 515) { this.removeShot(shot); continue; }
      if (shot.hostile) {
        if (this.burrowTime <= 0 && this.dashTime <= 0 && Phaser.Math.Distance.Between(shot.node.x, shot.node.y, this.player.x, this.player.y) < shot.radius + 25) {
          this.damagePlayer(shot.damage); this.removeShot(shot);
        }
      } else {
        const target = this.enemies.find(enemy => !shot.hitIds.has(enemy.id) && Phaser.Math.Distance.Between(shot.node.x, shot.node.y, enemy.node.x, enemy.node.y) < shot.radius + enemy.radius);
        if (target) this.hitEnemy(target, shot);
      }
    }
  }

  hitEnemy(enemy: Enemy, shot: Shot) {
    shot.hitIds.add(enemy.id);
    const armor = enemy.armor * (1 - this.stats.armorBypass);
    this.damageEnemy(enemy, shot.damage * (1 - armor));
    if (shot.ricochets > 0) {
      const next = this.nearestEnemy(enemy.node.x, enemy.node.y, shot.hitIds, 220);
      if (next) {
        const direction = new Phaser.Math.Vector2(next.node.x - enemy.node.x, next.node.y - enemy.node.y).normalize();
        shot.node.setPosition(enemy.node.x, enemy.node.y); shot.vx = direction.x * 545; shot.vy = direction.y * 545; shot.ricochets -= 1; return;
      }
    }
    this.removeShot(shot);
  }

  damageEnemy(enemy: Enemy, damage: number) {
    enemy.hp -= damage;
    enemy.healthBar.scaleX = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);
    enemy.core.setAlpha(.45);
    this.time.delayedCall(70, () => { if (enemy.core.active) enemy.core.setAlpha(1); });
    if (enemy.hp <= 0) this.defeatEnemy(enemy);
  }

  defeatEnemy(enemy: Enemy) {
    this.enemies = this.enemies.filter(candidate => candidate !== enemy);
    enemy.node.destroy();
    this.cleared += 1;
    this.xp += Math.round(enemy.xp * this.stats.xpMultiplier);
    if (enemy.boss) { this.bossDefeated = true; announce("Block Warden defeated. Hold until the route opens."); tone(680, .24); }
    else tone(570, .04);
    this.checkLevelUp();
  }

  damagePlayer(amount: number) {
    if (this.playerRecovery > 0 || this.burrowTime > 0 || this.dashTime > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.playerRecovery = .65;
    this.playerHalo.setStrokeStyle(4, 0xef604f, .95);
    this.time.delayedCall(140, () => this.playerHalo.setStrokeStyle(2, 0xd4af37, .52));
    if (!reducedMotion) this.cameras.main.shake(90, .005);
    tone(95, .14, "sawtooth");
    if (this.health <= 0 && this.stats.secondWind && !this.secondWindUsed) {
      this.secondWindUsed = true; this.health = Math.ceil(this.stats.maxHealth * .5); this.playerRecovery = 1.4;
      announce("Second Wind restored MADGER to the fight."); tone(520, .2);
    }
  }

  damageCache(amount: number) {
    this.cacheIntegrity = Math.max(0, this.cacheIntegrity - amount);
    this.cachePulse.setStrokeStyle(4, 0xef604f, .92);
    this.time.delayedCall(150, () => this.cachePulse.setStrokeStyle(2, 0xd4af37, .28));
    if (!reducedMotion) this.cameras.main.shake(80, .003);
    tone(130, .12, "square");
  }

  applyDashDamage() {
    if (!this.stats.dashDamage) return;
    for (const enemy of this.enemies) {
      if (this.dashHits.has(enemy.id)) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.node.x, enemy.node.y) < enemy.radius + 29) {
        this.dashHits.add(enemy.id); this.damageEnemy(enemy, this.stats.dashDamage);
      }
    }
  }

  updateTraps(delta: number) {
    for (const trap of [...this.traps]) {
      trap.life -= delta;
      const target = this.enemies.find(enemy => Phaser.Math.Distance.Between(trap.node.x, trap.node.y, enemy.node.x, enemy.node.y) < 25 + enemy.radius);
      if (target) { this.damageEnemy(target, 88); trap.life = 0; tone(260, .1, "square"); }
      if (trap.life <= 0) { trap.node.destroy(); this.traps = this.traps.filter(candidate => candidate !== trap); }
    }
  }

  checkLevelUp() {
    const needed = xpForNextLevel(this.level);
    if (this.xp < needed) return;
    this.xp -= needed;
    this.level += 1;
    const choices = draftUpgrades(this.selected, this.random);
    if (!choices.length) return;
    this.showUpgradeDraft(choices);
  }

  showUpgradeDraft(choices: UpgradeDefinition[]) {
    this.scene.pause();
    ui.upgradeOptions.replaceChildren();
    for (const choice of choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-option";
      button.innerHTML = `<small>${choice.group}</small><b>${choice.name}</b><span>${choice.description}</span>`;
      button.addEventListener("click", () => this.selectUpgrade(choice));
      ui.upgradeOptions.append(button);
    }
    ui.upgrades.hidden = false;
    announce(`Level ${this.level}. Choose one field adaptation.`);
    (ui.upgradeOptions.querySelector("button") as HTMLButtonElement | null)?.focus();
  }

  selectUpgrade(choice: UpgradeDefinition) {
    const previousMax = this.stats.maxHealth;
    this.selected.push(choice.id);
    this.stats = statsForUpgrades(this.selected);
    if (this.stats.maxHealth > previousMax) this.health = Math.min(this.stats.maxHealth, this.health + 20);
    ui.upgrades.hidden = true;
    announce(`${choice.name} equipped. Operation resumed.`);
    tone(620, .13);
    this.scene.resume();
    element("reclaim-game").focus();
  }

  checkEndState() {
    if (this.health <= 0) this.finish(false, "MADGER DOWN", "SIGNAL ROW TOOK THE ROUND.");
    else if (this.cacheIntegrity <= 0) this.finish(false, "PROOF CACHE LOST", "THE ROUTE CLOSED ON THE PROOF.");
    else if (this.elapsed >= RUN_SECONDS && this.bossDefeated) this.finish(true, "EXTRACTION CONFIRMED", "SIGNAL ROW HOLDS.");
  }

  finish(success: boolean, kicker: string, title: string) {
    if (!this.running) return;
    this.running = false;
    const proof = proofPointsForResult({ success, enemiesCleared: this.cleared, bossDefeated: this.bossDefeated, cacheIntegrity: this.cacheIntegrity, level: this.level });
    const record = readRecord();
    writeRecord({
      runs: record.runs + 1,
      extractions: record.extractions + Number(success),
      bestProof: Math.max(record.bestProof, proof),
      wardens: record.wardens + Number(this.bossDefeated),
      highestLevel: Math.max(record.highestLevel, this.level)
    });
    drawRecord();
    ui.resultKicker.textContent = kicker;
    ui.resultTitle.textContent = title;
    ui.resultGrid.innerHTML = [
      ["RESULT", success ? "EXTRACTED" : "FAILED"], ["CLEARED", String(this.cleared)], ["WARDEN", this.bossDefeated ? "DOWN" : "ACTIVE"],
      ["CACHE", `${Math.round(this.cacheIntegrity)}%`], ["PROOF", String(proof)]
    ].map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join("");
    ui.result.hidden = false;
    ui.bossBanner.hidden = true;
    announce(`${title} ${proof} local Proof Points recorded.`);
    tone(success ? 760 : 120, .32, success ? "triangle" : "sawtooth");
    element<HTMLButtonElement>("run-again").focus();
  }

  nearestEnemy(x: number, y: number, excluded = new Set<number>(), limit = Number.POSITIVE_INFINITY) {
    let nearest: Enemy | undefined;
    let best = limit;
    for (const enemy of this.enemies) {
      if (excluded.has(enemy.id)) continue;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.node.x, enemy.node.y);
      if (distance < best) { nearest = enemy; best = distance; }
    }
    return nearest;
  }

  removeShot(shot: Shot) {
    shot.node.destroy();
    this.shots = this.shots.filter(candidate => candidate !== shot);
  }

  refreshHud() {
    const phase = phaseForElapsed(this.elapsed, this.bossDefeated);
    const healthRatio = Phaser.Math.Clamp(this.health / this.stats.maxHealth, 0, 1);
    const cacheRatio = Phaser.Math.Clamp(this.cacheIntegrity / CACHE_MAX_INTEGRITY, 0, 1);
    const needed = xpForNextLevel(this.level);
    ui.health.textContent = String(Math.ceil(this.health)); ui.healthMeter.style.width = `${healthRatio * 100}%`;
    ui.cache.textContent = String(Math.ceil(this.cacheIntegrity)); ui.cacheMeter.style.width = `${cacheRatio * 100}%`;
    ui.phase.textContent = phase.label;
    const remaining = Math.max(0, RUN_SECONDS - this.elapsed);
    ui.timer.textContent = remaining > 0 ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(Math.ceil(remaining % 60)).padStart(2, "0")}` : this.bossDefeated ? "OPEN" : "BLOCKED";
    ui.level.textContent = String(this.level).padStart(2, "0"); ui.cleared.textContent = String(this.cleared).padStart(3, "0");
    ui.xp.textContent = `${this.xp} / ${needed}`; ui.xpMeter.style.width = `${Math.min(100, this.xp / needed * 100)}%`;
    ui.dash.textContent = this.dashCooldown <= 0 ? "READY" : `${this.dashCooldown.toFixed(1)}s`;
    ui.burrow.textContent = this.burrowCooldown <= 0 ? "READY" : `${this.burrowCooldown.toFixed(1)}s`;
  }
}

let sceneRef: ReclaimScene | null = null;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "reclaim-game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#080906",
  transparent: false,
  antialias: true,
  render: { pixelArt: false, roundPixels: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: ReclaimScene
});

function pauseRun() {
  if (!sceneRef?.running || sceneRef.scene.isPaused()) return;
  sceneRef.pausedByPlayer = true;
  sceneRef.scene.pause();
  ui.pause.hidden = false;
  announce("Operation paused.");
  element<HTMLButtonElement>("resume-operation").focus();
}
function resumeRun() {
  if (!sceneRef?.running || !sceneRef.scene.isPaused() || !sceneRef.pausedByPlayer) return;
  sceneRef.pausedByPlayer = false;
  ui.pause.hidden = true;
  sceneRef.scene.resume();
  announce("Operation resumed.");
  element("reclaim-game").focus();
}

element<HTMLButtonElement>("start-operation").addEventListener("click", () => sceneRef?.startRun());
element<HTMLButtonElement>("run-again").addEventListener("click", () => sceneRef?.startRun());
element<HTMLButtonElement>("pause-operation").addEventListener("click", pauseRun);
element<HTMLButtonElement>("resume-operation").addEventListener("click", resumeRun);

const soundButton = element<HTMLButtonElement>("sound-toggle");
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.textContent = `SOUND: ${soundEnabled ? "ON" : "OFF"}`;
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  if (soundEnabled) tone(440, .09);
});

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-control]")) {
  const control = button.dataset.control;
  const set = (active: boolean) => {
    button.classList.toggle("active", active);
    if (control === "up" || control === "down" || control === "left" || control === "right" || control === "attack") controls[control] = active;
    if (active && control === "dash") sceneRef?.beginDash();
    if (active && control === "burrow") sceneRef?.beginBurrow();
  };
  button.addEventListener("pointerdown", event => { event.preventDefault(); button.setPointerCapture(event.pointerId); set(true); });
  button.addEventListener("pointerup", () => set(false));
  button.addEventListener("pointercancel", () => set(false));
  button.addEventListener("lostpointercapture", () => set(false));
}

document.addEventListener("visibilitychange", () => { if (document.hidden) pauseRun(); });

let resetTimer = 0;
const resetButton = element<HTMLButtonElement>("reset-record");
resetButton.addEventListener("click", () => {
  if (resetButton.dataset.confirm !== "true") {
    window.clearTimeout(resetTimer);
    resetButton.dataset.confirm = "true";
    resetButton.textContent = "CONFIRM RESET";
    announce("Press Confirm Reset to erase the local Reclaim the Block record.");
    resetTimer = window.setTimeout(() => { resetButton.dataset.confirm = "false"; resetButton.textContent = "RESET LOCAL RECORD"; }, 3000);
    return;
  }
  window.clearTimeout(resetTimer);
  try { localStorage.removeItem(RECORD_KEY); } catch {}
  resetButton.dataset.confirm = "false";
  resetButton.textContent = "RESET LOCAL RECORD";
  drawRecord();
  announce("Local Reclaim the Block record reset.");
});

if ("serviceWorker" in navigator && location.protocol === "https:") void navigator.serviceWorker.register("/sw.js");
drawRecord();
