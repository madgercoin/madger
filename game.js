import { MAX_GRIT, ROUND_SECONDS, courseFor, crossesRunner, resolvePickup, scoreChase, multiplierFor, objectiveFor, objectiveProgress, phaseFor, sanitizeStats } from "./game-core.js";

const lanes = [100 / 6, 50, 500 / 6];
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
let today;
let objective;
let course;
let waveIndex = 0;
let protectedUntil = 0;
let best = readNumber(bestKey);
let runBest = best;
function prepareCourse() {
  today = new Date().toISOString().slice(0, 10);
  const dayNumber = Math.floor(Date.parse(today) / 86400000);
  objective = objectiveFor(dayNumber);
  course = courseFor(dayNumber);
  document.getElementById("course-label").textContent = `DAILY COURSE · ${today} UTC`;
}
prepareCourse();

let state = "ready";
let lane = 1;
let run = freshRun();
let remaining = ROUND_SECONDS;
let elapsed = 0;
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
  bestNode.textContent = formatScore(Math.max(run.score, best));
  const chase = scoreChase(run.score, runBest);
  document.getElementById("chase-label").textContent = `${chase.label} · ${chase.gap.toLocaleString()} TO GO`;
  document.getElementById("combo-progress").style.width = `${multiplierFor(run.streak) === 5 ? 100 : run.streak % 5 * 20}%`;
  document.getElementById("combo-label").textContent = multiplierFor(run.streak) === 5 ? "MAX COMBO" : `${5 - run.streak % 5} SIGNALS TO ×${multiplierFor(run.streak) + 1}`;
  document.getElementById("move-left").disabled = state !== "running" || lane === 0;
  document.getElementById("move-right").disabled = state !== "running" || lane === 2;
  document.getElementById("pause-game").disabled = state !== "running" && state !== "paused";
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
  selectLane(Math.max(0, Math.min(2, lane + direction)));
}
function selectLane(next) {
  if (state !== "running" || next === lane) return;
  lane = next;
  runner.style.left = `${lanes[lane]}%`;
  tone(180 + lane * 35, .04, "triangle");
  updateHud();
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

function spawnItem(specification, speed, age) {
  const node = document.createElement("div");
  node.className = `game-item ${specification.type}`;
  node.dataset.label = specification.type === "signal" ? "SIGNAL" : specification.type === "noise" ? "NOISE" : "GRIT";
  node.innerHTML = specification.type === "boost" ? "<span>◆</span>" : specification.type === "signal" ? "✓" : "!";
  node.style.left = `${lanes[specification.lane]}%`;
  node.setAttribute("aria-hidden", "true");
  const progress = -.1 + specification.offset + speed * age;
  node.style.top = `${progress * 100}%`;
  field.appendChild(node);
  items.push({ node, ...specification, speed, progress });
}

function collect(item) {
  const previous = run;
  const result = resolvePickup(run, item.type, elapsed, protectedUntil);
  run = result.run;
  protectedUntil = result.protectedUntil;
  removeItem(item);
  if (result.ignored) return;
  if (item.type === "signal") {
    const earned = run.score - previous.score;
    const comboUp = multiplierFor(run.streak) > multiplierFor(previous.streak);
    flash(comboUp ? `×${multiplierFor(run.streak)} COMBO!` : `+${earned}`, "good");
    if (comboUp) announce(`Multiplier increased to ${multiplierFor(run.streak)}.`);
    tone(520 + multiplierFor(run.streak) * 65, .1);
  } else if (item.type === "boost") {
    flash(previous.grit === MAX_GRIT ? "+250" : "+1 GRIT", "good");
    tone(720, .16, "triangle");
  } else {
    flash("HIT · RECOVER!", "bad");
    tone(90, .18, "sawtooth");
    field.classList.remove("hit");
    void field.offsetWidth;
    field.classList.add("hit");
  }
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
  while (waveIndex < course.length && course[waveIndex].at <= elapsed) {
    const wave = course[waveIndex++];
    wave.items.forEach(item => spawnItem(item, wave.speed, Math.max(0, elapsed - delta - wave.at)));
  }
  runner.classList.toggle("recovering", elapsed < protectedUntil);
  for (const item of [...items]) {
    if (state !== "running") break;
    const previous = item.progress;
    item.progress += item.speed * delta;
    item.node.style.top = `${item.progress * 100}%`;
    if (crossesRunner(previous, item.progress) && item.lane === lane) collect(item);
    else if (item.progress > 1.08) removeItem(item);
  }
  updateHud();
  if (remaining <= 0) endGame("time");
  else if (state === "running") frameId = requestAnimationFrame(gameLoop);
}

function clearItems() { items.forEach(item => item.node.remove()); items = []; }
function startGame() {
  cancelAnimationFrame(frameId);
  clearItems();
  prepareCourse();
  state = "running";
  lane = 1;
  run = freshRun();
  remaining = ROUND_SECONDS;
  elapsed = 0;
  activePhase = "surface";
  waveIndex = 0;
  protectedUntil = 0;
  runBest = best;
  lastFrame = 0;
  runner.style.left = `${lanes[lane]}%`;
  runner.classList.remove("recovering");
  document.querySelector(".game-shell").classList.add("playing");
  reportNode.hidden = true;
  startPanel.hidden = true;
  pausePanel.hidden = true;
  updateHud();
  announce("Run started. Upper Tunnel, 60 seconds remaining, 3 grit.");
  field.focus();
  document.querySelector(".game-shell").scrollIntoView({ block: "start", behavior: "instant" });
  frameId = requestAnimationFrame(gameLoop);
}

function endGame(reason) {
  if (state !== "running") return;
  state = "ended";
  cancelAnimationFrame(frameId);
  clearItems();
  document.querySelector(".game-shell").classList.remove("playing");
  const oldBest = best;
  const isBest = run.score > oldBest;
  if (isBest) { best = run.score; writeNumber(bestKey, best); }
  const chase = scoreChase(run.score, oldBest);
  const objectiveState = objectiveProgress(objective, run);
  const stats = readStats();
  const marks = objectiveState.complete ? [...new Set([...stats.marks, today])].slice(-30) : stats.marks;
  writeStats({ runs: stats.runs + 1, signals: stats.signals + run.signals, bestStreak: Math.max(stats.bestStreak, run.bestStreak), marks });
  drawRecord();
  document.getElementById("panel-title").textContent = isBest ? "PERSONAL BEST!" : reason === "time" ? "TUNNEL CLEARED!" : "ONE MORE DIG?";
  document.getElementById("panel-copy").textContent = `${run.score.toLocaleString()} points · ${chase.medal}. ${chase.gap.toLocaleString()} more for ${chase.label.toLowerCase()}. Same course today. Learn the line and beat it.`;
  reportNode.innerHTML = `<span><small>SIGNALS</small><b>${run.signals}</b></span><span><small>BEST STREAK</small><b>${run.bestStreak}</b></span><span><small>FIELD MARK</small><b>${objectiveState.complete ? "CLEARED ✓" : "OPEN"}</b></span>`;
  reportNode.hidden = false;
  startButton.innerHTML = "RETRY THIS COURSE <span>→</span>";
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
    updateHud();
  } else if (state === "paused") {
    state = "running";
    pausePanel.hidden = true;
    lastFrame = 0;
    announce("Run resumed.");
    field.focus();
    updateHud();
    frameId = requestAnimationFrame(gameLoop);
  }
}

document.addEventListener("keydown", event => {
  if (state !== "running" && state !== "paused") return;
  if (event.target.closest("button,a,input,textarea,select") && !["p", "P"].includes(event.key)) return;
  if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D", "p", "P"].includes(event.key)) event.preventDefault();
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") move(-1);
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") move(1);
  if (event.key.toLowerCase() === "p" && (state === "running" || state === "paused")) togglePause();
});
for (const [id, direction] of [["move-left", -1], ["move-right", 1]]) {
  const button = document.getElementById(id);
  button.addEventListener("pointerdown", event => { if (event.button === 0) { event.preventDefault(); move(direction); } });
  button.addEventListener("click", event => { if (event.detail === 0) move(direction); });
}
field.addEventListener("pointerdown", event => {
  if (state !== "running" || event.button !== 0 || event.target.closest("button")) return;
  const bounds = field.getBoundingClientRect();
  selectLane(Math.max(0, Math.min(2, Math.floor((event.clientX - bounds.left) / bounds.width * 3))));
});
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
  best = 0; runBest = 0;
  resetRecordButton.dataset.confirm = "false";
  resetRecordButton.textContent = "RESET LOCAL RECORD";
  drawRecord();
  updateHud();
  announce("Local field record reset.");
});
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js").catch(() => {});
drawRecord();
updateHud();
