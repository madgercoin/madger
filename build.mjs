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

const [home, app, game, launch, transparency, litepaper, notFound, buy] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("app.html", "utf8"),
  readFile("game.html", "utf8"),
  readFile("launch.html", "utf8"),
  readFile("transparency.html", "utf8"),
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
const pages = ${JSON.stringify({ home, app, game, launch, transparency, litepaper, notFound, buy })};
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
const contestApi = "https://wtqcolceuvlxrelugvjw.supabase.co/functions/v1/madger-video-contest";
const contestPartSize = 16 * 1024 * 1024;
const contestMaxParts = 64;
const apiHeaders = { ...securityHeaders, "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" };
const apiJson = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: apiHeaders });
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

function validContestOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === "https://madgercoin.com" || origin === "https://www.madgercoin.com";
}

async function contestApiCall(payload) {
  const response = await fetch(contestApi, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.error || "Contest authorization failed.");
  return data;
}

async function verifyContestUpload(entryId, token) {
  if (!/^[0-9a-f-]{36}$/i.test(entryId || "") || !/^[0-9a-f]{64}$/i.test(token || "")) {
    throw new Error("Invalid upload authorization.");
  }
  return contestApiCall({ action: "verify_r2_upload", entry_id: entryId, upload_token: token });
}

async function handleContestEntry(request) {
  if (request.method !== "GET" && request.method !== "POST") return apiJson({ ok: false, error: "Method not allowed." }, 405);
  const upstream = await fetch(contestApi, {
    method: request.method,
    headers: request.method === "POST" ? { "content-type": "application/json" } : undefined,
    body: request.method === "POST" ? request.body : undefined
  });
  return new Response(upstream.body, { status: upstream.status, headers: apiHeaders });
}

async function handleContestUpload(request, env, pathname, url) {
  if (!env.CONTEST_VIDEOS) return apiJson({ ok: false, error: "Contest storage is unavailable." }, 503);
  if (!validContestOrigin(request)) return apiJson({ ok: false, error: "Origin not allowed." }, 403);
  try {
    if (pathname === "/api/contest-upload/init" && request.method === "POST") {
      const body = await request.json();
      const entry = await verifyContestUpload(body.entry_id, body.upload_token);
      if (entry.upload_complete) return apiJson({ ok: false, error: "This entry has already been uploaded." }, 409);
      const upload = await env.CONTEST_VIDEOS.createMultipartUpload(entry.storage_path, {
        httpMetadata: { contentType: entry.content_type },
        customMetadata: { entryId: entry.entry_id, fileName: entry.file_name }
      });
      return apiJson({ ok: true, upload_id: upload.uploadId, part_size: contestPartSize });
    }

    if (pathname === "/api/contest-upload/part" && request.method === "PUT") {
      const entryId = url.searchParams.get("entry_id") || "";
      const uploadId = url.searchParams.get("upload_id") || "";
      const partNumber = Number(url.searchParams.get("part_number"));
      const token = request.headers.get("x-upload-token") || "";
      if (!uploadId || uploadId.length > 512 || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > contestMaxParts) {
        return apiJson({ ok: false, error: "Invalid upload part." }, 400);
      }
      const entry = await verifyContestUpload(entryId, token);
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > contestPartSize) return apiJson({ ok: false, error: "Upload part is too large." }, 413);
      const multipart = env.CONTEST_VIDEOS.resumeMultipartUpload(entry.storage_path, uploadId);
      const uploaded = await multipart.uploadPart(partNumber, request.body);
      return apiJson({ ok: true, part_number: uploaded.partNumber, etag: uploaded.etag });
    }

    if ((pathname === "/api/contest-upload/complete" || pathname === "/api/contest-upload/abort") && request.method === "POST") {
      const body = await request.json();
      const entry = await verifyContestUpload(body.entry_id, body.upload_token);
      if (typeof body.upload_id !== "string" || !body.upload_id || body.upload_id.length > 512) {
        return apiJson({ ok: false, error: "Invalid multipart upload." }, 400);
      }
      const multipart = env.CONTEST_VIDEOS.resumeMultipartUpload(entry.storage_path, body.upload_id);
      if (pathname.endsWith("/abort")) {
        await multipart.abort();
        return apiJson({ ok: true });
      }
      if (!Array.isArray(body.parts) || body.parts.length < 1 || body.parts.length > contestMaxParts) {
        return apiJson({ ok: false, error: "Invalid multipart manifest." }, 400);
      }
      const parts = body.parts.map(part => ({ partNumber: Number(part.partNumber), etag: String(part.etag || "") }));
      if (parts.some(part => !Number.isInteger(part.partNumber) || part.partNumber < 1 || part.partNumber > contestMaxParts || !part.etag)) {
        return apiJson({ ok: false, error: "Invalid multipart manifest." }, 400);
      }
      await multipart.complete(parts);
      const object = await env.CONTEST_VIDEOS.head(entry.storage_path);
      if (!object || Number(object.size) !== Number(entry.file_size)) {
        await env.CONTEST_VIDEOS.delete(entry.storage_path);
        return apiJson({ ok: false, error: "The assembled upload did not match the original file size." }, 409);
      }
      return apiJson({ ok: true, size: object.size, etag: object.httpEtag || object.etag });
    }

    if (pathname === "/api/contest-upload/status" && request.method === "GET") {
      const entryId = url.searchParams.get("entry_id") || "";
      const token = request.headers.get("x-upload-token") || "";
      const entry = await verifyContestUpload(entryId, token);
      const object = await env.CONTEST_VIDEOS.head(entry.storage_path);
      if (!object) return apiJson({ ok: false, error: "Uploaded video not found." }, 404);
      return apiJson({ ok: true, size: object.size, etag: object.httpEtag || object.etag });
    }

    return apiJson({ ok: false, error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("contest upload", error);
    const message = error instanceof Error ? error.message : "Contest upload failed.";
    return apiJson({ ok: false, error: message }, /authorization|not found/i.test(message) ? 403 : 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === "/api/contest-entry") return handleContestEntry(request);
    if (pathname.startsWith("/api/contest-upload/")) return handleContestUpload(request, env, pathname, url);
    if (pathname === "/index.html") return permanentRedirect("/");
    if (pathname === "/app/" || pathname === "/app.html") return permanentRedirect("/app");
    if (pathname === "/game/" || pathname === "/game.html") return permanentRedirect("/game");
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
    if (pathname === "/app") {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { ...html.headers, allow: "GET, HEAD" } });
      return new Response(request.method === "HEAD" ? null : pages.app, html);
    }
    if (pathname === "/game") {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { ...html.headers, allow: "GET, HEAD" } });
      return new Response(request.method === "HEAD" ? null : pages.game, html);
    }
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
