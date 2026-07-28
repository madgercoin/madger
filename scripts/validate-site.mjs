import { access, readFile } from "node:fs/promises";
import path from "node:path";

const htmlFiles = ["index.html", "litepaper.html", "404.html"];
const indexablePages = new Map([
  ["index.html", "https://madgercoin.com/"],
  ["litepaper.html", "https://madgercoin.com/litepaper.html"]
]);
const requiredSocialProperties = [
  'property="og:type"',
  'property="og:site_name"',
  'property="og:title"',
  'property="og:description"',
  'property="og:url"',
  'property="og:image"',
  'property="og:image:width"',
  'property="og:image:height"',
  'property="og:image:alt"',
  'name="twitter:card"',
  'name="twitter:title"',
  'name="twitter:description"',
  'name="twitter:image"',
  'name="twitter:image:alt"'
];
const officialMint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const failures = [];
const pages = new Map();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function metaContent(html, attribute, value) {
  const tag = html.match(new RegExp(`<meta\\b[^>]*\\b${attribute}=["']${escapeRegExp(value)}["'][^>]*>`, "i"))?.[0];
  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? null;
}

function linkHref(html, rel) {
  const tag = html.match(new RegExp(`<link\\b[^>]*\\brel=["']${escapeRegExp(rel)}["'][^>]*>`, "i"))?.[0];
  return tag?.match(/\bhref=["']([^"']*)["']/i)?.[1] ?? null;
}

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

  for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\bwidth=["']\d+["']/i.test(image[0]) || !/\bheight=["']\d+["']/i.test(image[0])) {
      failures.push(`${file}: image is missing explicit width/height: ${image[0]}`);
    }
  }
}

for (const [file, html] of pages) {
  const references = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map(match => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|data:)/i.test(reference)) continue;
    const [beforeFragment, fragment] = reference.split("#", 2);
    const pathname = beforeFragment.split("?", 1)[0];
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
      const escaped = escapeRegExp(fragment);
      if (!new RegExp(`\\bid=["']${escaped}["']`, "i").test(targetHtml)) {
        failures.push(`${file}: missing fragment target ${reference}`);
      }
    }
  }
}

const titles = new Set();
const descriptions = new Set();
for (const [file, expectedCanonical] of indexablePages) {
  const html = pages.get(file);
  const canonical = linkHref(html, "canonical");
  if (canonical !== expectedCanonical) failures.push(`${file}: canonical must be ${expectedCanonical}`);

  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = metaContent(html, "name", "description");
  const robots = metaContent(html, "name", "robots");
  if (!title || title.length < 20 || title.length > 65) failures.push(`${file}: title must be descriptive and 20-65 characters`);
  if (!description || description.length < 70 || description.length > 170) failures.push(`${file}: description must be 70-170 characters`);
  if (title && titles.has(title)) failures.push(`${file}: duplicate title`);
  if (description && descriptions.has(description)) failures.push(`${file}: duplicate meta description`);
  if (title) titles.add(title);
  if (description) descriptions.add(description);
  if (!robots?.includes("index,follow")) failures.push(`${file}: missing index,follow robots directive`);

  for (const property of requiredSocialProperties) {
    if (!html.includes(property)) failures.push(`${file}: missing social metadata ${property}`);
  }
  if (!html.includes('type="application/ld+json"')) failures.push(`${file}: missing JSON-LD`);
}

if (!metaContent(pages.get("404.html"), "name", "robots")?.includes("noindex")) {
  failures.push("404.html: missing noindex directive");
}

const sitemap = await readFile("sitemap.xml", "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const expectedSitemapUrls = [...indexablePages.values()];
if (JSON.stringify(sitemapUrls.sort()) !== JSON.stringify(expectedSitemapUrls.sort())) {
  failures.push(`sitemap.xml: expected only canonical indexable URLs, found ${sitemapUrls.join(", ")}`);
}
if (!sitemap.includes("<lastmod>") || !sitemap.includes("<image:image>")) {
  failures.push("sitemap.xml: missing lastmod or image discovery data");
}

const productionText = [...pages.values()].join("\n") + await readFile("manifest.webmanifest", "utf8");
for (const requiredFile of indexablePages.keys()) {
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
console.log(`Validated ${htmlFiles.length} HTML files: SEO metadata, links, IDs, image dimensions, JSON-LD, sitemap parity, and official mint are correct.`);
