import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { assetFiles, rootFiles } from "./site-config.mjs";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });
await Promise.all(rootFiles.map(file => cp(file, `dist/${file}`)));
await Promise.all(assetFiles.map(file => cp(file, `dist/assets/${file}`)));

const [home, litepaper, notFound] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("litepaper.html", "utf8"),
  readFile("404.html", "utf8")
]);

const workerSource = `/** Generated at build time. HTML is bundled to prevent stale or corrupted edge assets. */
const pages = ${JSON.stringify({ home, litepaper, notFound })};
const html = { headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-cache" } };

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/" || pathname === "/index.html") return new Response(pages.home, html);
    if (pathname === "/litepaper" || pathname === "/litepaper/" || pathname === "/litepaper.html") {
      return new Response(pages.litepaper, html);
    }
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    return new Response(pages.notFound, { status: 404, ...html });
  }
};
`;

await writeFile("worker.generated.js", workerSource);
console.log(`Built MADGER static site with ${rootFiles.length + assetFiles.length} files and bundled HTML routes.`);
