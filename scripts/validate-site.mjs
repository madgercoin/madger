import { access, readFile } from "node:fs/promises";
import path from "node:path";

const htmlFiles = ["index.html", "launch.html", "litepaper.html", "official-links.html", "collaborators.html", "privacy.html", "blog.html", "blog-building-foundations.html", "blog-honey-badger-standard.html", "blog-token-link-safety.html", "404.html"];
const indexablePages = new Map([
  ["index.html", "https://madgercoin.com/"],
  ["launch.html", "https://madgercoin.com/launch.html"],
  ["litepaper.html", "https://madgercoin.com/litepaper.html"],
  ["official-links.html", "https://madgercoin.com/official-links.html"],
  ["collaborators.html", "https://madgercoin.com/collaborators"],
  ["privacy.html", "https://madgercoin.com/privacy.html"]
  ,["blog.html", "https://madgercoin.com/blog.html"]
  ,["blog-building-foundations.html", "https://madgercoin.com/blog-building-foundations.html"]
  ,["blog-honey-badger-standard.html", "https://madgercoin.com/blog-honey-badger-standard.html"]
  ,["blog-token-link-safety.html", "https://madgercoin.com/blog-token-link-safety.html"]
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
const officialFacebook = "https://www.facebook.com/1279493098576451";
const officialReddit = "https://www.reddit.com/user/Madgercoin/";
const officialDiscord = "https://discord.gg/NcuPzSNz9e";
const socialPreview = "https://madgercoin.com/assets/madger_social_share_v10.jpg";
const homepageSocialPreview = "https://madgercoin.com/assets/madger_social_share_v10.jpg";
const pageSocialPreviews = new Map([
  ["blog.html", "https://madgercoin.com/assets/madger_journal_social_v2.jpg"],
  ["blog-building-foundations.html", "https://madgercoin.com/assets/madger_fieldnote_foundations_v1_social.jpg"],
  ["blog-honey-badger-standard.html", "https://madgercoin.com/assets/madger_fieldnote_standard_v1_social.jpg"],
  ["blog-token-link-safety.html", "https://madgercoin.com/assets/madger_fieldnote_safety_v1_social.jpg"]
]);
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

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:mdash|ndash|middot);/g, " ")
    .replace(/&amp;/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

function visibleBlocks(html) {
  return [...html.matchAll(/<(?:p|summary|h[1-3]|blockquote)\b[^>]*>([\s\S]*?)<\/(?:p|summary|h[1-3]|blockquote)>/gi)]
    .map(match => visibleText(match[1]).toLowerCase())
    .filter(text => text.length >= 50);
}

function normalizePhraseText(text) {
  return text
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}$]+/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));
const manifestIcons = [
  ...(manifest.icons ?? []),
  ...(manifest.shortcuts ?? []).flatMap(shortcut => shortcut.icons ?? [])
];
for (const icon of manifestIcons) {
  const publicPath = icon.src.split("?")[0].replace(/^\//, "");
  const source = publicPath.replace(/^assets\//, "");
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
    if (/^assets[\\/]/.test(target)) target = target.replace(/^assets[\\/]/, "");
    let resolved = target === "." || target === "" ? "index.html" : target;
    try {
      await access(resolved);
    } catch {
      if (!path.extname(resolved)) {
        const htmlCandidate = `${resolved}.html`;
        try {
          await access(htmlCandidate);
          resolved = htmlCandidate;
        } catch {
          failures.push(`${file}: missing internal target ${reference}`);
          continue;
        }
      } else {
        failures.push(`${file}: missing internal target ${reference}`);
        continue;
      }
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
  const expectedSocialPreview = file === "index.html" ? homepageSocialPreview : (pageSocialPreviews.get(file) ?? socialPreview);
  const expectedSocialType = "image/jpeg";
  const expectedSocialWidth = "1200";
  const expectedSocialHeight = "630";
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
  if (metaContent(html, "property", "og:image") !== expectedSocialPreview) failures.push(`${file}: Open Graph image must use its approved share card`);
  if (metaContent(html, "property", "og:image:type") !== expectedSocialType) failures.push(`${file}: Open Graph image type must be ${expectedSocialType}`);
  if (metaContent(html, "property", "og:image:width") !== expectedSocialWidth || metaContent(html, "property", "og:image:height") !== expectedSocialHeight) failures.push(`${file}: Open Graph image dimensions must be ${expectedSocialWidth}x${expectedSocialHeight}`);
  if (metaContent(html, "name", "twitter:image") !== expectedSocialPreview) failures.push(`${file}: X card must use its approved share card`);
}

if (!metaContent(pages.get("404.html"), "name", "robots")?.includes("noindex")) {
  failures.push("404.html: missing noindex directive");
}

const litepaper = pages.get("litepaper.html");
if (metaContent(litepaper, "property", "article:published_time") !== "2026-07-23T00:00:00-04:00") {
  failures.push("litepaper.html: article:published_time must preserve the original July 23, 2026 publication date");
}
if (!litepaper.includes('"datePublished": "2026-07-23"')) {
  failures.push("litepaper.html: Article JSON-LD must preserve the original July 23, 2026 publication date");
}

const visiblePages = new Map([...pages].map(([file, html]) => [file, visibleText(html).toLowerCase()]));
const obsoleteStatus = "minted on solana — not yet publicly launched for trading";
for (const [file, text] of visiblePages) {
  if (text.includes(obsoleteStatus)) failures.push(`${file}: repetitive legacy status sentence is present`);
}
const statusPatterns = /public(?:ly)? (?:launched for )?trading|public market|market launch|trading status/g;
for (const file of indexablePages.keys()) {
  const count = visiblePages.get(file).match(statusPatterns)?.length ?? 0;
  if (count > 1) failures.push(`${file}: visible trading-status language appears ${count} times; keep one purposeful status surface`);
}
if (/mint|trading|launch|financial advice|crypto assets/i.test(visiblePages.get("404.html"))) {
  failures.push("404.html: error-page copy must stay navigational rather than repeat project disclosures");
}
const homepage = pages.get("index.html");
const stylesheet = await readFile("styles.css", "utf8");
if (!homepage.includes('id="community" class="hunt-section community"')) failures.push("index.html: community section must expose the canonical #community anchor");
if (!homepage.includes('src="/assets/madger_v6_community_welcome.webp" width="1084" height="1451"')) failures.push("index.html: community section must use the custom canonical welcoming pose with exact intrinsic dimensions");
if (!homepage.includes('<footer class="hunt-footer"><div class="brand"><img src="/assets/madger_official_logo_transparent_512.png"')) failures.push("index.html: Launch Hunt footer must use the transparent official MADGER logo");
if (!homepage.includes('rel="apple-touch-icon" href="/favicon.png?v=20260829-coin3d"')) failures.push("index.html: missing official 3D coin Apple touch icon");
if (!homepage.includes('id="site-favicon"') || !homepage.includes('src="/favicon-spin.js?v=20260829-coin-visible"')) failures.push("index.html: missing continuous 360-degree coin favicon runtime");
if (!homepage.includes('class="launch-pin__coin"') || !homepage.includes('src="/madger_coin_spin_favicon.gif?v=20260829-360"')) failures.push("index.html: missing visible 360-degree coin beside the launch countdown");
if (!stylesheet.includes(".portrait-card img{width:100%;height:auto;aspect-ratio:900/1184;")) failures.push("styles.css: portrait must preserve its natural ratio and responsive height");
if (!homepage.includes(officialFacebook) || homepage.includes("facebook.com/share/")) failures.push("index.html: Facebook links must use the canonical page URL");
if (!homepage.includes(officialReddit)) failures.push("index.html: Reddit must use the verified u/Madgercoin profile");
if (!homepage.includes(officialDiscord)) failures.push("index.html: Discord must use the verified permanent MADGER invite");
for (const [file, html] of pages) {
  if (html.includes("reddit.com/r/madgercoin")) failures.push(`${file}: unverified r/madgercoin link must not be published before the subreddit exists`);
  for (const match of html.matchAll(/https:\/\/(?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+/gi)) {
    if (match[0] !== officialDiscord) failures.push(`${file}: Discord must use the verified permanent MADGER invite`);
  }
}
const homepageBlocks = new Set(visibleBlocks(homepage));
const crossPageDuplicates = visibleBlocks(pages.get("litepaper.html")).filter(block => homepageBlocks.has(block));
if (crossPageDuplicates.length) {
  failures.push(`index.html/litepaper.html: repeated visible block(s): ${crossPageDuplicates.join(" | ")}`);
}

const lowValuePhraseBudgets = new Map([
  [["stay", "mad", "keep", "digging"].join(" "), 0],
  [["small", "badger", "big", "mood"].join(" "), 0],
  ["small badger big crypto", 1],
  ["build the burrow", 1],
  ["community campaigns partnerships", 1],
  ["games collectibles licensing", 1],
  ["financial legal or tax advice", 1]
]);
const combinedIndexableCopy = [...indexablePages.keys()].map(file => normalizePhraseText(visiblePages.get(file))).join(" ");
for (const [phrase, budget] of lowValuePhraseBudgets) {
  const count = combinedIndexableCopy.split(phrase).length - 1;
  if (count > budget) failures.push(`indexable pages: low-value phrase "${phrase}" appears ${count} times; budget is ${budget}`);
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
