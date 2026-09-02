import { access, readFile } from "node:fs/promises";

const mint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const pool = "FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h";
const dexScreenerPair = `https://dexscreener.com/solana/${pool.toLowerCase()}`;
const [home, launch, links, collaborators] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("launch.html", "utf8"),
  readFile("official-links.html", "utf8"),
  readFile("collaborators.html", "utf8")
]);
const failures = [];
for (const [name, html] of [["index.html", home], ["launch.html", launch], ["official-links.html", links], ["collaborators.html", collaborators]]) {
  if (!html.includes(mint)) failures.push(`${name}: official mint is absent`);
}
if (!home.includes("TRADING LIVE") || !home.includes("RAYDIUM CPMM")) failures.push("index.html: post-launch status is absent");
if (!home.includes("https://www.instagram.com/reel/DcotYCFDD3p/embed/") || !home.includes("<iframe")) failures.push("index.html: Instagram-hosted cinematic film is absent");
if (/youtube\.com|youtube-nocookie\.com/i.test(home)) failures.push("index.html: suspended YouTube destination remains");
if (!launch.includes(pool) || !launch.includes("0.25%")) failures.push("launch.html: verified pool record is incomplete");
if (!launch.includes(`href="${dexScreenerPair}"`)) failures.push("launch.html: exact DEX Screener pair link is absent");
if (!links.includes(`href="${dexScreenerPair}"`)) failures.push("official-links.html: exact DEX Screener pair link is absent");
if (/Launch Hunt|Meme Contest|MLH26|SEEKPASTNOISE27|ENDS SEP/i.test(home)) failures.push("index.html: expired campaign content is present");
for (const retired of ["launch-hunt.html", "meme-contest.html"]) {
  try { await access(retired); failures.push(`${retired}: retired contest page must be removed`); } catch {}
}
if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Validated MADGER post-launch state, market record, film, and retired campaign removal.");
