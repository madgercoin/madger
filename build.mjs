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

const [home, launch, litepaper, notFound] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("launch.html", "utf8"),
  readFile("litepaper.html", "utf8"),
  readFile("404.html", "utf8")
]);

const workerSource = `/** Generated at build time. HTML is bundled to prevent stale or corrupted edge assets. */
const pages = ${JSON.stringify({ home, launch, litepaper, notFound })};
const securityHeaders = Object.freeze({
  "content-security-policy": "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; frame-src https://docs.google.com; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests",
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
const notFound = {
  status: 404,
  headers: { ...html.headers, "x-robots-tag": "noindex, follow" }
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/index.html") return permanentRedirect("/");
    if (pathname === "/launch" || pathname === "/launch/") return permanentRedirect("/launch.html");
    if (pathname === "/litepaper" || pathname === "/litepaper/") return permanentRedirect("/litepaper.html");
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
console.log(`Built MADGER static site with ${rootFiles.length + assetFiles.length} files and bundled HTML routes.`);
