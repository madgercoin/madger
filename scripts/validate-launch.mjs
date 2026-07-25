import { readFile } from "node:fs/promises";

const pages = ["index.html", "litepaper.html", "404.html"];
const mint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const stateSource = await readFile("launch-state.js", "utf8");
const failures = [];
if (!/const current = STATES\.MINTED_NOT_TRADING;/.test(stateSource)) failures.push("MINTED_NOT_TRADING is not the active launch state");
for (const state of ["MINTED_NOT_TRADING", "LAUNCH_SCHEDULED", "TRADING_LIVE", "PAUSED_OR_DELAYED"]) {
  if (!stateSource.includes(`${state}: "${state}"`)) failures.push(`missing supported state ${state}`);
}
const tradingHosts = /(?:raydium\.io|jup\.ag|birdeye\.so|dexscreener\.com|orca\.so|meteora\.ag)/i;
for (const page of pages) {
  const html = await readFile(page, "utf8");
  if (!html.includes('data-launch-state')) failures.push(`${page}: no centralized launch-state surface`);
  if (!html.includes('/launch-state.js')) failures.push(`${page}: launch-state controller absent`);
  if (tradingHosts.test(html)) failures.push(`${page}: trading link present before launch`);
}
for (const file of ["index.html", "litepaper.html"]) {
  if (!(await readFile(file, "utf8")).includes(mint)) failures.push(`${file}: exact official mint absent`);
}
if (failures.length) { console.error(failures.map(x => `- ${x}`).join("\n")); process.exit(1); }
console.log(`Validated exact mint, ${pages.length} launch-state surfaces, all states, and pre-launch trading-link prohibition.`);
