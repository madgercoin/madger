import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, css, js, build, config, sitemap, app, manifestText, serviceWorker] = await Promise.all([
  readFile("game.html", "utf8"), readFile("game.css", "utf8"), readFile("game.js", "utf8"),
  readFile("build.mjs", "utf8"), readFile("site-config.mjs", "utf8"), readFile("sitemap.xml", "utf8"),
  readFile("app.html", "utf8"), readFile("manifest.webmanifest", "utf8"), readFile("sw.js", "utf8")
]);
const manifest = JSON.parse(manifestText);

test("game exposes keyboard, touch, pause, status, and reduced-motion affordances", () => {
  for (const marker of ['id="playfield" tabindex="0"', 'id="move-left"', 'id="move-right"', 'id="pause-game"', 'aria-live="polite"']) assert.match(html, new RegExp(marker));
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /ArrowLeft/);
});

test("game loop remains free, local, and non-financial", () => {
  assert.match(html, /No wallet/i);
  assert.match(html, /Scores have no cash, token, prize, or financial value/i);
  assert.match(js, /localStorage/);
  assert.match(html, /DAILY FIELD MARK/);
  assert.match(html, /id="run-report"/);
  assert.match(html, /id="record-runs"/);
  assert.match(html, /id="reset-record"/);
  assert.doesNotMatch(js, /fetch\s*\(|WebSocket|walletAdapter|solana\.connect/i);
});

test("installed Burrow App exposes and caches the complete game offline", () => {
  assert.match(app, /href="\/game"/);
  assert.match(app, /Burrow Run/);
  assert.ok(manifest.shortcuts.some(shortcut => shortcut.url === "/game"));
  for (const resource of ["/game", "/game.css", "/game.js", "/game-core.js"]) assert.match(serviceWorker, new RegExp(`"${resource.replace(".", "\\.")}"`));
  assert.match(serviceWorker, /await cache\.put\(event\.request, response\.clone\(\)\)/);
});

test("game route and public assets are part of the production boundary", () => {
  for (const file of ["game.html", "game.css", "game.js", "game-core.js"]) assert.match(config, new RegExp(`"${file}"`));
  assert.match(build, /pathname === "\/game"/);
  assert.match(sitemap, /<loc>https:\/\/madgercoin\.com\/game<\/loc>/);
});
