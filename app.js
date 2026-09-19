const MINT = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const recognizedHosts = new Set(["madgercoin.com", "www.madgercoin.com", "x.com", "t.me", "www.instagram.com", "instagram.com", "www.tiktok.com", "tiktok.com", "www.facebook.com", "facebook.com", "www.reddit.com", "reddit.com", "discord.gg", "raydium.io"]);
const officialValues = new Set([MINT.toLowerCase(), "@madgercoin", "@themadgercoin"]);
const officialSocialPaths = new Map([
  ["x.com", new Set(["/madgercoin"])],
  ["t.me", new Set(["/madgercoin", "/madgerburrow"])],
  ["instagram.com", new Set(["/madgercoin"])],
  ["tiktok.com", new Set(["/@themadgercoin"])],
  ["facebook.com", new Set(["/1279493098576451"])],
  ["reddit.com", new Set(["/user/madgercoin"])],
  ["discord.gg", new Set(["/ncupzsnz9e"])]
]);

function classifyUrl(input) {
  const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (host === "madgercoin.com") return "verified";
  if (officialSocialPaths.get(host)?.has(path)) return "verified";
  if (host === "raydium.io" && path === "/swap" && url.searchParams.get("outputMint") === MINT) return "verified";
  return recognizedHosts.has(url.hostname.toLowerCase()) || recognizedHosts.has(host) ? "recognized-host" : "unknown";
}

function activateView(name, updateHash = true) {
  const exists = document.querySelector(`[data-view-panel="${name}"]`);
  if (!exists) name = "home";
  document.querySelectorAll("[data-view-panel]").forEach(panel => panel.classList.toggle("is-active", panel.dataset.viewPanel === name));
  document.querySelectorAll(".nav-item").forEach(button => {
    const active = button.dataset.view === name;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  if (updateHash) history.replaceState(null, "", name === "home" ? location.pathname : `#${name}`);
  document.querySelector("#workspace").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

document.querySelectorAll("[data-view], [data-go]").forEach(button => button.addEventListener("click", () => activateView(button.dataset.view || button.dataset.go)));
addEventListener("hashchange", () => activateView(location.hash.slice(1) || "home", false));

document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", async () => {
  const value = document.getElementById(button.dataset.copy)?.textContent.trim();
  const state = button.parentElement.querySelector(".copy-state");
  try { await navigator.clipboard.writeText(value); state.textContent = "Complete mint copied. Compare every character before use."; }
  catch { state.textContent = "Copy was blocked. Select the complete address above and copy it manually."; }
}));

document.getElementById("verify-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("verify-input").value.trim();
  const result = document.getElementById("verify-result");
  let status = "unknown";
  if (!input) status = "empty";
  else if (officialValues.has(input.toLowerCase())) status = "verified";
  else {
    try { status = classifyUrl(input); }
    catch {}
  }
  result.className = `result ${status === "verified" ? "good" : status === "recognized-host" ? "caution" : status === "empty" ? "neutral" : "bad"}`;
  if (status === "verified") result.innerHTML = "<b>EXACT MATCH</b><p>This matches MADGER’s canonical public record. Still review the complete transaction in your wallet.</p>";
  else if (status === "recognized-host") result.innerHTML = "<b>RECOGNIZED PLATFORM — NOT YET VERIFIED</b><p>The domain is used by MADGER, but this result does not verify the account, page, token, or message. Compare the complete path with the official-links record.</p>";
  else if (status === "empty") result.innerHTML = "<b>ENTER A COMPLETE VALUE</b><p>Paste the mint, URL, or handle you want to check.</p>";
  else result.innerHTML = "<b>NOT IN THE LOCAL OFFICIAL RECORD</b><p>Do not treat this result as proof of fraud, but do not proceed until you independently verify it through official channels.</p>";
});

const missionKey = "madger-burrow-hunt-v2";
const tiers = [{ name: "SCOUT", min: 0 }, { name: "TRACKER", min: 100 }, { name: "BUILDER", min: 250 }, { name: "WARDEN", min: 500 }, { name: "BURROWKEEPER", min: 690 }];
const dispatches = [
  ["Find the missing answer.", "Choose one real newcomer question MADGER’s public pages do not answer clearly. Draft the smallest useful answer.", "Proof: question source, proposed answer, and destination page.", 40],
  ["Trace a broken trail.", "Test three official MADGER links on mobile and record any dead end, confusing handoff, or inaccessible label.", "Proof: device, browser, URLs, and reproducible result.", 45],
  ["Make safety shareable.", "Turn one approved safety rule into a clear field card without price language or urgency.", "Proof: source rule, finished artifact, and editable source.", 55],
  ["Map community weather.", "Review ten public MADGER mentions and summarize recurring questions without collecting usernames.", "Proof: links, anonymized themes, and one recommendation.", 65],
  ["Open the gate wider.", "Find one accessibility or plain-language improvement and describe an exact correction.", "Proof: current behavior, affected user, and acceptance criteria.", 70],
  ["Credit the quiet builder.", "Find a useful public contribution and write a specific, evidence-linked recognition note.", "Proof: contribution link, consent if needed, and why it mattered.", 50]
];
function readHunt() { try { const value = JSON.parse(localStorage.getItem(missionKey) || "{}"); return { ready: new Set(value.ready || []), callsign: value.callsign || "", dispatch: value.dispatch || "" }; } catch { return { ready: new Set(), callsign: "", dispatch: "" }; } }
function writeHunt(value) { try { localStorage.setItem(missionKey, JSON.stringify({ ...value, ready: [...value.ready] })); } catch {} }
function tierFor(xp) { let tier = 0; tiers.forEach((item, index) => { if (xp >= item.min) tier = index; }); return tier; }
const weekId = String(Math.floor((Date.now() - Date.UTC(1970, 0, 5)) / 604800000));
const dispatch = dispatches[Number(weekId) % dispatches.length];
let packetText = "";

function drawMissions() {
  const hunt = readHunt();
  const cards = [...document.querySelectorAll("[data-mission]")];
  const coreXp = cards.filter(card => hunt.ready.has(card.dataset.mission)).reduce((total, card) => total + Number(card.dataset.xp), 0);
  const xp = coreXp + (hunt.dispatch === weekId ? dispatch[3] : 0);
  const tier = tierFor(xp);
  document.querySelectorAll("[data-mission]").forEach(card => {
    const ready = hunt.ready.has(card.dataset.mission);
    const locked = Number(card.dataset.tier) > tier;
    card.classList.toggle("is-done", ready);
    card.classList.toggle("is-locked", locked);
    const button = card.querySelector(".mission-toggle");
    button.disabled = locked;
    button.textContent = locked ? `PREVIEW · ${tiers[Number(card.dataset.tier)].name}` : ready ? "PROOF PREPARED ✓" : `PREPARE PROOF · ${card.dataset.xp} XP`;
    button.setAttribute("aria-pressed", String(ready));
  });
  document.getElementById("mission-count").textContent = cards.filter(card => hunt.ready.has(card.dataset.mission)).length;
  document.getElementById("mission-xp").textContent = xp;
  document.getElementById("trail-tier").textContent = tiers[tier].name;
  const currentMinimum = tiers[tier].min;
  const nextMinimum = tiers[tier + 1]?.min;
  const progress = nextMinimum ? (xp - currentMinimum) / (nextMinimum - currentMinimum) * 100 : 100;
  document.getElementById("mission-bar").style.width = `${Math.max(0, Math.min(100, progress))}%`;
  document.getElementById("dispatch-toggle").setAttribute("aria-pressed", String(hunt.dispatch === weekId));
  document.getElementById("dispatch-toggle").classList.toggle("is-ready", hunt.dispatch === weekId);
  document.getElementById("badge-row").innerHTML = tiers.map((item, index) => `<span class="badge ${index <= tier ? "eligible" : ""}" aria-label="${item.name}: ${item.min} Trail XP; ${index <= tier ? "eligible for review" : "locked"}"><b>${index + 1}</b><small>${item.name}</small><i>${item.min} XP · ${index <= tier ? "ELIGIBLE" : "LOCKED"}</i></span>`).join("");
  document.getElementById("callsign").value = hunt.callsign;
}
document.querySelectorAll(".mission-toggle").forEach(button => button.addEventListener("click", () => {
  const id = button.closest("[data-mission]").dataset.mission;
  const hunt = readHunt();
  hunt.ready.has(id) ? hunt.ready.delete(id) : hunt.ready.add(id);
  writeHunt(hunt);
  drawMissions();
}));

document.getElementById("dispatch-title").textContent = dispatch[0];
document.getElementById("dispatch-copy").textContent = dispatch[1];
document.getElementById("dispatch-proof").textContent = dispatch[2];
document.getElementById("dispatch-xp").textContent = dispatch[3];
document.getElementById("dispatch-toggle").addEventListener("click", () => { const hunt = readHunt(); hunt.dispatch = hunt.dispatch === weekId ? "" : weekId; writeHunt(hunt); drawMissions(); });
document.getElementById("callsign").addEventListener("input", event => { const hunt = readHunt(); hunt.callsign = event.target.value.trim(); writeHunt(hunt); });

function packetId(value) { let hash = 2166136261; for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return `MGR-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`; }
document.getElementById("proof-form").addEventListener("submit", event => {
  event.preventDefault();
  const hunt = readHunt();
  const notes = document.getElementById("proof-notes").value.trim();
  const missions = [...document.querySelectorAll("[data-mission]")].filter(card => hunt.ready.has(card.dataset.mission)).map(card => card.querySelector("h2").textContent);
  if (hunt.dispatch === weekId) missions.push(`Weekly dispatch: ${dispatch[0]}`);
  const status = document.getElementById("packet-status");
  if (!missions.length) { status.textContent = "Prepare at least one mission first."; return; }
  if (notes.length < 20) { status.textContent = "Add a public evidence link and a short explanation."; return; }
  if (!document.getElementById("attest-safe").checked || !document.getElementById("attest-credit").checked) { status.textContent = "Confirm both safety and source-credit statements before packaging."; return; }
  const core = `CALLSIGN\n${hunt.callsign || "Anonymous Scout"}\n\nMISSIONS\n- ${missions.join("\n- ")}\n\nEVIDENCE\n${notes}`;
  const reference = packetId(core);
  packetText = `MADGER FIELD PROOF PACKET\nREFERENCE ${reference}\nSTATUS UNREVIEWED\n\n${core}\n\nREVIEW RUBRIC\nEvidence · Usefulness · Originality · Safety\n\nTrail XP is not reviewed XP or a verified badge.\n`;
  const download = document.getElementById("download-packet");
  if (download.href.startsWith("blob:")) URL.revokeObjectURL(download.href);
  download.href = URL.createObjectURL(new Blob([packetText], { type: "text/plain" })); download.download = `madger-proof-${reference.toLowerCase()}.txt`; download.removeAttribute("aria-disabled");
  const email = document.getElementById("email-packet"); email.href = `mailto:hello@madgercoin.com?subject=${encodeURIComponent(`MADGER review · ${reference}`)}&body=${encodeURIComponent(packetText)}`; email.removeAttribute("aria-disabled");
  document.getElementById("copy-packet").disabled = false;
  status.textContent = `Packet ${reference} ready. Save and review it before submission.`;
});
document.getElementById("copy-packet").addEventListener("click", async () => { const status = document.getElementById("packet-status"); try { await navigator.clipboard.writeText(packetText); status.textContent = "Proof packet copied."; } catch { status.textContent = "Copy blocked. Download the .txt file instead."; } });

function validateTrustRegistry(value) {
  if (value.schemaVersion !== 1 || !Array.isArray(value.contributors) || !Array.isArray(value.ranks)) return false;
  return value.contributors.every(record => {
    if (!Array.isArray(record.reviewers)) return false;
    if (!["WARDEN", "BURROWKEEPER"].includes(record.rank)) return true;
    const reviewers = new Set(record.reviewers.map(reviewer => String(reviewer).trim().toLowerCase()).filter(Boolean));
    return reviewers.size >= 2;
  });
}

async function loadTrustRegistry() {
  const response = await fetch("/verified-contributions.json", { cache: "no-store" });
  if (!response.ok) throw new Error("registry unavailable");
  const value = await response.json();
  if (!validateTrustRegistry(value)) throw new Error("registry invalid");
  return value;
}
document.getElementById("registry-form").addEventListener("submit", async event => {
  event.preventDefault();
  const query = document.getElementById("registry-query").value.trim().toLowerCase();
  const output = document.getElementById("registry-result");
  output.className = "registry-result";
  if (!query) { output.replaceChildren(Object.assign(document.createElement("b"), { textContent: "ENTER AN EXACT VALUE" }), Object.assign(document.createElement("span"), { textContent: "Use the complete callsign or MGR review reference." })); return; }
  output.replaceChildren(Object.assign(document.createElement("b"), { textContent: "CHECKING OFFICIAL REGISTRY…" }));
  try {
    const registry = await loadTrustRegistry();
    const record = registry.contributors.find(item => item.status === "active" && (item.callsign?.toLowerCase() === query || item.references?.some(reference => reference.toLowerCase() === query)));
    if (!record) { output.classList.add("not-found"); output.replaceChildren(Object.assign(document.createElement("b"), { textContent: "NO ACTIVE VERIFIED RECORD" }), Object.assign(document.createElement("span"), { textContent: "This is not proof of wrongdoing. Treat the badge as unverified and ask for its exact public record." })); return; }
    output.classList.add("verified");
    output.replaceChildren(Object.assign(document.createElement("b"), { textContent: `${record.rank} · VERIFIED` }), Object.assign(document.createElement("span"), { textContent: `${record.callsign} · ${record.reviewedXp} reviewed XP · reviewed ${record.reviewedAt.slice(0, 10)}` }));
  } catch { output.classList.add("not-found"); output.replaceChildren(Object.assign(document.createElement("b"), { textContent: "REGISTRY UNAVAILABLE" }), Object.assign(document.createElement("span"), { textContent: "Do not accept a badge as verified. Try the raw registry or return later." })); }
});

document.getElementById("lesson").addEventListener("submit", event => {
  event.preventDefault();
  const fields = [...event.currentTarget.querySelectorAll("fieldset")];
  let score = 0;
  fields.forEach(field => {
    const choice = field.querySelector("input:checked");
    const correct = choice?.value === field.dataset.answer;
    field.classList.toggle("correct", correct);
    field.classList.toggle("incorrect", Boolean(choice) && !correct);
    if (correct) score++;
  });
  const result = document.getElementById("lesson-result");
  result.innerHTML = score === fields.length ? `<b>FIELDCRAFT COMPLETE · ${score}/${fields.length}</b><p>Sharp work. Verify the source, protect your secrets, and read before signing.</p>` : `<b>${score}/${fields.length} CORRECT</b><p>Review the highlighted questions and try again. Calm checking beats urgency.</p>`;
  result.focus?.();
});

drawMissions();
activateView(location.hash.slice(1) || "home", false);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js").catch(() => {});

const connectionState = document.getElementById("connection-state");
function drawConnectionState() {
  const online = navigator.onLine;
  connectionState.classList.toggle("is-offline", !online);
  connectionState.querySelector("b").textContent = online ? "ONLINE" : "OFFLINE READY";
}
addEventListener("online", drawConnectionState);
addEventListener("offline", drawConnectionState);
drawConnectionState();

let installPrompt;
const installButton = document.getElementById("install-app");
addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  installButton.hidden = true;
});
addEventListener("appinstalled", () => { installPrompt = null; installButton.hidden = true; });
