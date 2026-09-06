import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
const port = Number(option("--port") || 4173);
const host = option("--host") || "0.0.0.0";
const root = path.resolve("dist");
const mime = { ".css": "text/css", ".gif": "image/gif", ".html": "text/html", ".jpg": "image/jpeg", ".js": "text/javascript", ".json": "application/json", ".pdf": "application/pdf", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json", ".webp": "image/webp", ".xml": "application/xml" };

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const clean = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  let file = path.join(root, clean);
  try {
    let details = await stat(file);
    if (details.isDirectory()) file = path.join(file, "index.html");
  } catch {
    if (!path.extname(file)) file += ".html";
  }
  if (!file.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    await stat(file);
    response.writeHead(200, { "Content-Type": `${mime[path.extname(file)] || "application/octet-stream"}; charset=utf-8` });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(path.join(root, "404.html")).pipe(response);
  }
}).listen(port, host, () => console.log(`MADGER preview listening on http://${host}:${port}`));
