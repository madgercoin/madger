import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const statePages = ["index.html", "litepaper.html"];
const informationalPages = ["index.html", "litepaper.html", "404.html"];
const mint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const stateSource = await readFile("launch-state.js", "utf8");
const stateBlobHeader = `blob ${Buffer.byteLength(stateSource)}\0`;
const stateCacheKey = createHash("sha1").update(stateBlobHeader).update(stateSource).digest("hex").slice(0, 8);
const failures = [];
if (!/const current = STATES\.MINTED_NOT_TRADING;/.test(stateSource)) failures.push("MINTED_NOT_TRADING is not the active launch state");
for (const state of ["MINTED_NOT_TRADING", "LAUNCH_SCHEDULED", "TRADING_LIVE", "PAUSED_OR_DELAYED"]) {
  if (!stateSource.includes(`${state}: "${state}"`)) failures.push(`missing supported state ${state}`);
}
for (const voice of ["default", "safety", "research"]) {
  if (!stateSource.includes(`${voice}:`)) failures.push(`missing launch-state voice ${voice}`);
}
const tradingHosts = /(?:raydium\.io|jup\.ag|birdeye\.so|dexscreener\.com|orca\.so|meteora\.ag)/i;
for (const page of statePages) {
  const html = await readFile(page, "utf8");
  if (!html.includes("data-launch-state")) failures.push(`${page}: no centralized launch-state surface`);
  if (!html.includes(`/launch-state.js?v=${stateCacheKey}`)) failures.push(`${page}: launch-state controller must use cache key ${stateCacheKey}`);
}
for (const page of informationalPages) {
  const html = await readFile(page, "utf8");
  if (tradingHosts.test(html)) failures.push(`${page}: trading link present before launch`);
}
const notFound = await readFile("404.html", "utf8");
if (notFound.includes("data-launch-state") || notFound.includes("/launch-state.js")) {
  failures.push("404.html: error page must not repeat project launch messaging");
}
for (const file of statePages) {
  if (!(await readFile(file, "utf8")).includes(mint)) failures.push(`${file}: exact official mint absent`);
}
if (failures.length) { console.error(failures.map(x => `- ${x}`).join("\n")); process.exit(1); }
console.log(`Validated exact mint, ${statePages.length} distinct launch-state surfaces, all states and voices, focused 404 copy, and pre-launch trading-link prohibition.`);
