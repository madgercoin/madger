import { MAX_GRIT, ROUND_SECONDS, applyPickup, createWave, multiplierFor, objectiveFor, objectiveProgress, phaseFor, sanitizeStats } from "./game-core.js";

const lanes = [25, 50, 75];
const field = document.getElementById("playfield");
const runner = document.getElementById("runner");
const startPanel = document.getElementById("start-panel");
const pausePanel = document.getElementById("pause-panel");
const startButton = document.getElementById("start-game");
const status = document.getElementById("game-status");
const scoreNode = document.getElementById("score");
const streakNode = document.getElementById("streak");
const timeNode = document.getElementById("time");
const gritNode = document.getElementById("grit");
const bestNode = document.getElementById("best");
const phaseNode = document.getElementById("phase-label");
const phaseProgressNode = document.getElementById("phase-progress");
const objectiveLabelNode = document.getElementById("objective-label");
const objectiveProgressNode = document.getElementById("objective-progress");
const distanceNode = document.getElementById("distance-label");
const soundButton = document.getElementById("sound-toggle");
const reportNode = document.getElementById("run-report");
const resetRecordButton = document.getElementById("reset-record");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const bestKey = "madger-burrow-run-best-v1";
const statsKey = "madger-burrow-run-stats-v2";
let today = new Date().toISOString().slice(0, 10);
let objective = objectiveFor(Math.floor(Date.parse(today) / 86400000));

let state = "ready";
let lane = 1;
let run = freshRun();
let remaining = ROUND_SECONDS;
let elapsed = 0;
let spawnClock = 0;
let lastFrame = 0;
let activePhase = "surface";
let items = [];
let frameId = 0;
let soundEnabled = false;
let audioContext;
let resetTimer;

function freshRun() { return { score: 0, streak: 0, bestStreak: 0, grit: MAX_GRIT, signals: 0, hits: 0 }; }
function readNumber(key) { try { return Math.max(0, Number.parseInt(localStorage.getItem(key) || "0", 10) || 0); } catch { return 0; } }
function writeNumber(key, value) { try { localStorage.setItem(key, String(value)); } catch {} }
function readStats() {
  try { return sanitizeStats(JSON.parse(localStorage.getItem(statsKey) || "{}")); }
  catch { return sanitizeStats(); }
}
function writeStats(value) { try { localStorage.setItem(statsKey, JSON.stringify(value)); } catch {} }
function formatScore(value) { return String(value).padStart(4, "0"); }

function drawRecord() {
  const stats = readStats();
  document.getElementById("record-runs").textContent = stats.runs;
  document.getElementById("record-signals").textContent = stats.signals;
  document.getElementById("record-streak").textContent = stats.bestStreak;
  document.getElementById("record-marks").textContent = stats.marks.length;
}

function updateHud() {
  const phase = phaseFor(elapsed);
  const progress = objectiveProgress(objective, run);
  scoreNode.textContent = formatScore(run.score);
  streakNode.textContent = `×${multiplierFor(run.streak)}`;
  timeNode.textContent = Math.max(0, remaining).toFixed(1);
  gritNode.textContent = `${"◆ ".repeat(run.grit)}${"◇ ".repeat(MAX_GRIT - run.grit)}`.trim();
  gritNode.setAttribute("aria-label", `${run.grit} grit remaining`);
  bestNode.textContent = formatScore(Math.max(run.score, readNumber(bestKey)));
  phaseNode.textContent = phase.label;
  phaseProgressNode.style.width = `${Math.min(100, elapsed / ROUND_SECONDS * 100)}%`;
  objectiveLabelNode.textContent = objective.label;
  objectiveProgressNode.textContent = progress.complete ? "MARK CLEARED ✓" : `${progress.value} / ${objective.target}`;
  objectiveProgressNode.classList.toggle("complete", progress.complete);
  distanceNode.textContent = `DEPTH ${String(Math.floor(elapsed * 8)).padStart(3, "0")}M`;
}

function tone(frequency, duration = .06, type = "sine") {
  if (!soundEnabled) return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  try {
    audioContext ||= new AudioEngine();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    soundEnabled = false;
    soundButton.textContent = "SOUND: UNAVAILABLE";
    soundButton.setAttribute("aria-pressed", "false");
  }
}

function move(direction) {
  if (state !== "running") return;
  lane = Math.max(0, Math.min(2, lane + direction));
  runner.style.left = `${lanes[lane]}%`;
  tone(180 + lane * 35, .04, "triangle");
}
function announce(text) { status.textContent = text; }
function flash(text, kind) {
  const node = document.getElementById("event-flash");
  node.textContent = text;
  node.className = `event-flash ${kind} show`;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => { node.className = "event-flash"; }, reducedMotion ? 280 : 550);
}
function removeItem(item) { item.node.remove(); items = items.filter(candidate => candidate !== item); }

function spawnItem(specification) {
  const node = document.createElement("div");
  node.className = `game-item ${specification.type}`;
  node.dataset.label = specification.type === "signal" ? "SIGNAL" : specification.type === "noise" ? "NOISE" : "GRIT";
  node.innerHTML = specification.type === "boost" ? "<span>◆</span>" : specification.type === "signal" ? "✓" : "!";
  node.style.left = `${lanes[specification.lane]}%`;
  node.style.top = `${-10 + specification.offset}%`;
  field.appendChild(node);
  items.push({ node, ...specification, progress: -10 + specification.offset });
}
function spawnWave() { createWave(Math.random, elapsed).forEach(spawnItem); }

function collect(item) {
  const previous = run;
  run = applyPickup(run, item.type);
  if (item.type === "signal") {
    const earned = run.score - previous.score;
    flash(`+${earned}`, "good");
    tone(520 + multiplierFor(run.streak) * 65, .1);
  } else if (item.type === "boost") {
    flash(previous.grit === MAX_GRIT ? "+250" : "+1 GRIT", "good");
    tone(720, .16, "triangle");
  } else {
    flash("NOISE!", "bad");
    tone(90, .18, "sawtooth");
    field.classList.remove("hit");
    void field.offsetWidth;
    field.classList.add("hit");
  }
  removeItem(item);
  updateHud();
  if (run.grit <= 0) endGame("grit");
}

function gameLoop(timestamp) {
  if (state !== "running") return;
  if (!lastFrame) lastFrame = timestamp;
  const delta = Math.min((timestamp - lastFrame) / 1000, .05);
  lastFrame = timestamp;
  remaining -= delta;
  elapsed += delta;
  const phase = phaseFor(elapsed);
  if (phase.id !== activePhase) {
    activePhase = phase.id;
    flash(phase.label, "good");
    announce(`${phase.label} reached. Tunnel speed increased.`);
  }
  spawnClock -= delta;
  if (spawnClock <= 0) {
    spawnWave();
    spawnClock = phase.interval + Math.random() * .24;
  }
  for (const item of [...items]) {
    item.progress += phase.speed * delta;
    item.node.style.top = `${item.progress}%`;
    if (item.progress >= 79 && item.progress <= 97 && item.lane === lane) collect(item);
    else if (item.progress > 108) removeItem(item);
  }
  updateHud();
  if (remaining <= 0) endGame("time");
  else if (state === "running") frameId = requestAnimationFrame(gameLoop);
}

function clearItems() { items.forEach(item => item.node.remove()); items = []; }
function startGame() {
  today = new Date().toISOString().slice(0, 10);
  objective = objectiveFor(Math.floor(Date.parse(today) / 86400000));
  cancelAnimationFrame(frameId);
  clearItems();
  state = "running";
  lane = 1;
  run = freshRun();
  remaining = ROUND_SECONDS;
  elapsed = 0;
  activePhase = "surface";
  spawnClock = .65;
  lastFrame = 0;
  runner.style.left = `${lanes[lane]}%`;
  reportNode.hidden = true;
  startPanel.hidden = true;
  pausePanel.hidden = true;
  updateHud();
  announce("Run started. Upper Tunnel, 60 seconds remaining, 3 grit.");
  field.focus();
  frameId = requestAnimationFrame(gameLoop);
}

function endGame(reason) {
  if (state !== "running") return;
  state = "ended";
  cancelAnimationFrame(frameId);
  clearItems();
  const oldBest = readNumber(bestKey);
  const isBest = run.score > oldBest;
  if (isBest) writeNumber(bestKey, run.score);
  const objectiveState = objectiveProgress(objective, run);
  const stats = readStats();
  const marks = objectiveState.complete ? [...new Set([...stats.marks, today])].slice(-30) : stats.marks;
  writeStats({ runs: stats.runs + 1, signals: stats.signals + run.signals, bestStreak: Math.max(stats.bestStreak, run.bestStreak), marks });
  drawRecord();
  document.getElementById("panel-title").textContent = isBest ? "NEW DEEP MARK." : reason === "time" ? "RUN COMPLETE." : "BURIED IN NOISE.";
  document.getElementById("panel-copy").innerHTML = `You recovered <b>${formatScore(run.score)} signal points</b>${isBest ? " and set a new local best." : ". The Burrow remembers your best on this device."}`;
  reportNode.innerHTML = `<span><small>SIGNALS</small><b>${run.signals}</b></span><span><small>BEST STREAK</small><b>${run.bestStreak}</b></span><span><small>FIELD MARK</small><b>${objectiveState.complete ? "CLEARED ✓" : "OPEN"}</b></span>`;
  reportNode.hidden = false;
  startButton.innerHTML = "RUN AGAIN <span>→</span>";
  startPanel.hidden = false;
  updateHud();
  announce(`Run complete. Score ${run.score}. ${run.signals} signals. Best streak ${run.bestStreak}.${objectiveState.complete ? " Daily field mark cleared." : ""}${isBest ? " New local best." : ""}`);
  tone(isBest ? 660 : 220, .25, "triangle");
  startButton.focus();
}

function togglePause() {
  if (state === "running") {
    state = "paused";
    cancelAnimationFrame(frameId);
    pausePanel.hidden = false;
    announce("Game paused.");
    document.getElementById("resume-game").focus();
  } else if (state === "paused") {
    state = "running";
    pausePanel.hidden = true;
    lastFrame = 0;
    announce("Run resumed.");
    field.focus();
    frameId = requestAnimationFrame(gameLoop);
  }
}

document.addEventListener("keydown", event => {
  if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D", "p", "P"].includes(event.key)) event.preventDefault();
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") move(-1);
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") move(1);
  if (event.key.toLowerCase() === "p" && (state === "running" || state === "paused")) togglePause();
});
document.getElementById("move-left").addEventListener("pointerdown", () => move(-1));
document.getElementById("move-right").addEventListener("pointerdown", () => move(1));
document.getElementById("pause-game").addEventListener("click", togglePause);
document.getElementById("resume-game").addEventListener("click", togglePause);
startButton.addEventListener("click", startGame);
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.textContent = `SOUND: ${soundEnabled ? "ON" : "OFF"}`;
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  if (soundEnabled) tone(440, .08);
});
document.addEventListener("visibilitychange", () => { if (document.hidden && state === "running") togglePause(); });
resetRecordButton.addEventListener("click", () => {
  if (resetRecordButton.dataset.confirm !== "true") {
    clearTimeout(resetTimer);
    resetRecordButton.dataset.confirm = "true";
    resetRecordButton.textContent = "CONFIRM RESET";
    announce("Press Confirm Reset to erase the local field record.");
    resetTimer = setTimeout(() => { resetRecordButton.dataset.confirm = "false"; resetRecordButton.textContent = "RESET LOCAL RECORD"; }, 3000);
    return;
  }
  clearTimeout(resetTimer);
  try { localStorage.removeItem(bestKey); localStorage.removeItem(statsKey); } catch {}
  resetRecordButton.dataset.confirm = "false";
  resetRecordButton.textContent = "RESET LOCAL RECORD";
  drawRecord();
  updateHud();
  announce("Local field record reset.");
});
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js").catch(() => {});
drawRecord();
updateHud();
