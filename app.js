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

const missionKey = "madger-burrow-missions-v1";
function readMissions() { try { return new Set(JSON.parse(localStorage.getItem(missionKey) || "[]")); } catch { return new Set(); } }
function drawMissions() {
  const done = readMissions();
  document.querySelectorAll("[data-mission]").forEach(card => {
    const complete = done.has(card.dataset.mission);
    card.classList.toggle("is-done", complete);
    const button = card.querySelector(".mission-toggle");
    button.textContent = complete ? "CHECKED ✓" : "ADD TO CHECKLIST";
    button.setAttribute("aria-pressed", String(complete));
  });
  document.getElementById("mission-count").textContent = done.size;
  document.getElementById("mission-bar").style.width = `${done.size * 25}%`;
}
document.querySelectorAll(".mission-toggle").forEach(button => button.addEventListener("click", () => {
  const id = button.closest("[data-mission]").dataset.mission;
  const done = readMissions();
  done.has(id) ? done.delete(id) : done.add(id);
  try { localStorage.setItem(missionKey, JSON.stringify([...done])); } catch {}
  drawMissions();
}));

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
