import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const statePages = ["index.html", "launch.html", "litepaper.html", "collaborators.html"];
const informationalPages = ["index.html", "launch.html", "litepaper.html", "404.html"];
const mint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const stateSource = await readFile("launch-state.js", "utf8");
const normalizedStateSource = stateSource.replace(/\r\n?/g, "\n");
const stateBlobHeader = `blob ${Buffer.byteLength(normalizedStateSource)}\0`;
const stateCacheKey = createHash("sha1").update(stateBlobHeader).update(normalizedStateSource).digest("hex").slice(0, 8);
const failures = [];
if (!/const current = STATES\.LAUNCH_SCHEDULED;/.test(stateSource)) failures.push("LAUNCH_SCHEDULED is not the active launch state");
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
const huntPage = await readFile("launch-hunt.html", "utf8");
if (!homepage.includes('id="launch-film"')) failures.push("index.html: prominent launch-film section is absent");
if (!homepage.includes('madger-launch-film.mp4')) failures.push("index.html: official cinematic launch film is absent");
if (!homepage.includes('id="start"')) failures.push("index.html: Launch Hunt entry trail is absent");
if (!homepage.includes("SEEKPASTNOISE27")) failures.push("index.html: Burrow Field Mark is absent");
if (!homepage.includes('href="/launch-hunt.html"')) failures.push("index.html: complete Launch Hunt rules link is absent");
if (!homepage.includes('href="/launch.html"')) failures.push("index.html: canonical launch-status link is absent");
if (homepage.includes("meme-contest")) failures.push("index.html: retired meme contest remains on the homepage");
const entryRecipient = "madgercoin@gmail.com";
const entrySubject = "MADGER Launch Hunt Entry — MLH26";
const orderedEntryFields = [
  "ENTRY FORMAT: MLH26",
  "FIELD MARK:",
  "TELEGRAM USERNAME:",
  "COUNTRY / REGION:",
  "AGE / ELIGIBILITY:",
  "X USERNAME:",
  "BONUS X POST URL:",
  "REFERRER ENTRY ID:"
];
for (const [page, html] of [["index.html", homepage], ["launch-hunt.html", huntPage]]) {
  const match = html.match(/href="(mailto:[^"]+)"/i);
  if (!match) { failures.push(`${page}: private-entry email button is absent`); continue; }
  const mailto = new URL(match[1].replaceAll("&amp;", "&"));
  if (mailto.pathname.toLowerCase() !== entryRecipient) failures.push(`${page}: entry recipient must be ${entryRecipient}`);
  if (mailto.searchParams.get("subject") !== entrySubject) failures.push(`${page}: entry subject is not canonical`);
  const body = mailto.searchParams.get("body") || "";
  let previousIndex = -1;
  for (const field of orderedEntryFields) {
    const index = body.indexOf(field);
    if (index < 0) failures.push(`${page}: prepared email is missing ${field}`);
    else if (index <= previousIndex) failures.push(`${page}: prepared email fields are not in spreadsheet-ready order`);
    previousIndex = Math.max(previousIndex, index);
  }
}
for (const page of informationalPages) {
  const html = await readFile(page, "utf8");
  if (tradingHosts.test(html)) failures.push(`${page}: trading link present before launch`);
}
const launchPage = await readFile("launch.html", "utf8");
if (!launchPage.includes('href="https://madgercoin.com/launch.html"')) failures.push("launch.html: canonical URL is absent");
if (!launchPage.includes("Monday, August 31, 2026 at 14:00 UTC")) failures.push("launch.html: current public target is absent");
if (!launchPage.includes("600,000,000 MADGER") || !launchPage.includes("Final amounts pending authorization")) failures.push("launch.html: liquidity target or funding boundary is incomplete");
if (!launchPage.includes("Permanent Burn &amp; Earn planned")) failures.push("launch.html: working LP-protection plan is absent");
const notFound = await readFile("404.html", "utf8");
if (notFound.includes("data-launch-state") || notFound.includes("/launch-state.js")) {
  failures.push("404.html: error page must not repeat project launch messaging");
}
for (const file of statePages) {
  if (!(await readFile(file, "utf8")).includes(mint)) failures.push(`${file}: exact official mint absent`);
}
if (failures.length) { console.error(failures.map(x => `- ${x}`).join("\n")); process.exit(1); }
console.log(`Validated exact mint, ${statePages.length} distinct launch-state surfaces, all states and voices, focused 404 copy, and pre-launch trading-link prohibition.`);
