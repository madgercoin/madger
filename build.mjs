import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assetFiles, rootFiles } from "./site-config.mjs";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });
await Promise.all(rootFiles.map(file => cp(file, `dist/${file}`)));
await Promise.all(assetFiles.map(async file => {
  const destination = `dist/assets/${file}`;
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(file, destination);
}));

const [home, launch, litepaper, notFound, buy] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("launch.html", "utf8"),
  readFile("litepaper.html", "utf8"),
  readFile("404.html", "utf8"),
  readFile("buy.html", "utf8")
]);

const MINT = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const redirects = {
  raydium: `https://raydium.io/swap/?inputMint=sol&outputMint=${MINT}`,
  jupiter: `https://jup.ag/swap?buy=${MINT}&sell=${SOL_MINT}`,
  bonkbot: `https://t.me/bonkbot_bot?start=ref_7cien_ca_${MINT}`,
  trojan: `https://t.me/achilles_trojanbot?start=r-burrowking-${MINT}`
};
const campaigns = {
  "proficy-4h": "/buy?utm_source=proficy&utm_medium=paid_trending&utm_campaign=proficy_4h_test&utm_content=trending_slot",
  "proficy-12h": "/buy?utm_source=proficy&utm_medium=paid_trending&utm_campaign=proficy_12h_test&utm_content=trending_slot",
  "telegram-pin": "/buy?utm_source=telegram&utm_medium=community&utm_campaign=burrow_buy_pin&utm_content=pinned_message"
};

const workerSource = `/** Generated at build time. HTML is bundled to prevent stale or corrupted edge assets. */
const pages = ${JSON.stringify({ home, launch, litepaper, notFound, buy })};
const redirectTargets = ${JSON.stringify(redirects)};
const campaignTargets = ${JSON.stringify(campaigns)};
const securityHeaders = Object.freeze({
  "content-security-policy": "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src https://www.instagram.com; img-src 'self' data:; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY"
});
const html = { headers: { ...securityHeaders, "content-type": "text/html; charset=UTF-8", "cache-control": "no-cache" } };
const permanentRedirect = location => new Response(null, {
  status: 301,
  headers: { ...securityHeaders, location, "cache-control": "public, max-age=3600" }
});
const temporaryRedirect = location => new Response(null, {
  status: 302,
  headers: { ...securityHeaders, location, "cache-control": "no-store" }
});
const notFound = {
  status: 404,
  headers: { ...html.headers, "x-robots-tag": "noindex, follow" }
};

function cleanDimension(value, fallback = "direct") {
  const cleaned = String(value || "").toLowerCase().replace(/[^a-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64);
  return cleaned || fallback;
}

function acquisitionContext(request) {
  const url = new URL(request.url);
  let source = url.searchParams.get("utm_source");
  let medium = url.searchParams.get("utm_medium");
  let campaign = url.searchParams.get("utm_campaign");
  let content = url.searchParams.get("utm_content");
  if (!source) {
    try {
      const referrer = request.headers.get("referer");
      if (referrer) {
        const refUrl = new URL(referrer);
        if (refUrl.origin === url.origin) {
          source = refUrl.searchParams.get("utm_source") || source;
          medium = refUrl.searchParams.get("utm_medium") || medium;
          campaign = refUrl.searchParams.get("utm_campaign") || campaign;
          content = refUrl.searchParams.get("utm_content") || content;
        }
      }
    } catch {}
  }
  return {
    source: cleanDimension(source, "direct"),
    medium: cleanDimension(medium, "none"),
    campaign: cleanDimension(campaign, "none"),
    content: cleanDimension(content, "none")
  };
}

function writeFunnelEvent(env, request, eventName, destination = "none") {
  if (!env?.FUNNEL_ANALYTICS?.writeDataPoint) return;
  const ctx = acquisitionContext(request);
  env.FUNNEL_ANALYTICS.writeDataPoint({
    indexes: ["madger"],
    blobs: [
      cleanDimension(eventName, "event"),
      ctx.source,
      ctx.medium,
      ctx.campaign,
      ctx.content,
      cleanDimension(destination, "none")
    ],
    doubles: [1]
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === "/index.html") return permanentRedirect("/");
    if (pathname === "/buy/" || pathname === "/buy.html") return permanentRedirect("/buy");

    if (pathname.startsWith("/r/")) {
      const destination = pathname.slice(3);
      const target = redirectTargets[destination];
      if (!target) return new Response(pages.notFound, notFound);
      if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { ...html.headers, allow: "GET, HEAD" } });
      if (request.method === "GET") writeFunnelEvent(env, request, "outbound_buy_click", destination);
      return temporaryRedirect(target);
    }

    if (pathname.startsWith("/c/")) {
      const campaignKey = pathname.slice(3);
      const target = campaignTargets[campaignKey];
      if (!target) return new Response(pages.notFound, notFound);
      if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { ...html.headers, allow: "GET, HEAD" } });
      if (request.method === "GET") writeFunnelEvent(env, request, "campaign_entry", campaignKey);
      return temporaryRedirect(target);
    }

    if (pathname === "/buy") {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { ...html.headers, allow: "GET, HEAD" } });
      if (request.method === "GET") writeFunnelEvent(env, request, "buy_page_view");
      return new Response(request.method === "HEAD" ? null : pages.buy, html);
    }
    if (pathname === "/launch" || pathname === "/launch/") return permanentRedirect("/launch.html");
    if (pathname === "/litepaper" || pathname === "/litepaper/") return permanentRedirect("/litepaper.html");
    if (pathname === "/launch-hunt" || pathname === "/launch-hunt/" || pathname === "/launch-hunt.html") return permanentRedirect("/");
    if (pathname === "/meme-contest" || pathname === "/meme-contest/" || pathname === "/meme-contest.html") return permanentRedirect("/");
    if (pathname === "/") return new Response(pages.home, html);
    if (pathname === "/launch.html") return new Response(pages.launch, html);
    if (pathname === "/litepaper.html") return new Response(pages.litepaper, html);
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    return new Response(pages.notFound, notFound);
  }
};
`;

await writeFile("worker.generated.js", workerSource);
console.log(`Built MADGER static site with ${rootFiles.length + assetFiles.length} files, bundled HTML routes, and fixed acquisition redirects.`);
