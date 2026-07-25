import { access, readFile } from "node:fs/promises";
import path from "node:path";

const htmlFiles = ["index.html", "litepaper.html", "404.html"];
const officialMint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const failures = [];
const pages = new Map();

const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));
for (const icon of manifest.icons ?? []) {
  const source = icon.src.replace(/^\/assets\//, "");
  try {
    await access(source);
  } catch {
    failures.push(`manifest.webmanifest: missing icon ${icon.src}`);
  }
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  pages.set(file, html);

  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) failures.push(`${file}: duplicate IDs: ${[...new Set(duplicates)].join(", ")}`);

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      failures.push(`${file}: invalid JSON-LD (${error.message})`);
    }
  }
}

for (const [file, html] of pages) {
  const references = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map(match => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|data:)/i.test(reference)) continue;
    const [pathname, fragment] = reference.split("#", 2);
    let target = pathname
      ? path.normalize(path.join(path.dirname(file), pathname.replace(/^\//, "")))
      : file;
    if (target.startsWith("assets/")) target = path.basename(target);
    const resolved = target === "." || target === "" ? "index.html" : target;
    try {
      await access(resolved);
    } catch {
      failures.push(`${file}: missing internal target ${reference}`);
      continue;
    }
    if (fragment && resolved.endsWith(".html")) {
      const targetHtml = pages.get(resolved) ?? await readFile(resolved, "utf8");
      const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`\\bid=["']${escaped}["']`, "i").test(targetHtml)) {
        failures.push(`${file}: missing fragment target ${reference}`);
      }
    }
  }
}

const productionText = [...pages.values()].join("\n") + await readFile("manifest.webmanifest", "utf8");
for (const requiredFile of ["index.html", "litepaper.html"]) {
  if (!pages.get(requiredFile).includes(officialMint)) failures.push(`${requiredFile}: official mint is absent`);
}
if (/no official token contract/i.test(productionText)) failures.push("obsolete no-contract language is present");
const mintCandidates = productionText.match(/\b[1-9A-HJ-NP-Za-km-z]{43,44}\b/g) ?? [];
const unexpectedMints = [...new Set(mintCandidates.filter(value => value !== officialMint))];
if (unexpectedMints.length) failures.push(`unexpected mint-like value(s): ${unexpectedMints.join(", ")}`);

if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`Validated ${htmlFiles.length} HTML files: links, IDs, JSON-LD, and official mint are correct.`);
