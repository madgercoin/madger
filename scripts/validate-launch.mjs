import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const statePages = ["index.html", "launch.html", "litepaper.html"];
const informationalPages = ["index.html", "launch.html", "litepaper.html", "404.html"];
const mint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const stateSource = await readFile("launch-state.js", "utf8");
const normalizedStateSource = stateSource.replace(/\r\n?/g, "\n");
const stateBlobHeader = `blob ${Buffer.byteLength(normalizedStateSource)}\0`;
const stateCacheKey = createHash("sha1").update(stateBlobHeader).update(normalizedStateSource).digest("hex").slice(0, 8);
const failures = [];
if (!/const current = STATES\.PAUSED_OR_DELAYED;/.test(stateSource)) failures.push("PAUSED_OR_DELAYED is not the active launch state");
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
const homepage = await readFile("index.html", "utf8");
if (homepage.includes("2026-08-27T14:00:00Z") || homepage.includes("data-countdown")) failures.push("index.html: expired August 27 countdown remains");
if (!homepage.includes('href="/launch.html"')) failures.push("index.html: canonical launch record is not linked");
if (homepage.includes("meme-contest")) failures.push("index.html: retired meme contest remains on the homepage");
const launch = await readFile("launch.html", "utf8");
for (const fact of ["Direct Raydium CPMM", "100,000,000 MADGER", "40 SOL", "Permanent Burn &amp; Earn protection"]) {
  if (!launch.includes(fact)) failures.push(`launch.html: missing working launch fact ${fact}`);
}
if (!launch.includes("The August 27 target passed without a finalized canonical pool")) failures.push("launch.html: expired target is not explained");
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
console.log(`Validated exact mint, ${statePages.length} launch-state surfaces, delayed status, canonical launch record, focused 404 copy, and pre-launch trading-link prohibition.`);
