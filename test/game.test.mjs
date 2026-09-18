import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as rules from "../game-core.js";

const [html, css, js, build, config, sitemap, app, manifestText, serviceWorker] = await Promise.all([
  readFile("game.html", "utf8"), readFile("game.css", "utf8"), readFile("game.js", "utf8"),
  readFile("build.mjs", "utf8"), readFile("site-config.mjs", "utf8"), readFile("sitemap.xml", "utf8"),
  readFile("app.html", "utf8"), readFile("manifest.webmanifest", "utf8"), readFile("sw.js", "utf8")
]);
const manifest = JSON.parse(manifestText);

test("touch controls are enabled independently of viewport width for coarse/no-hover input", () => {
  // Keep the capability rule independent of the narrow-layout breakpoint.
  assert.match(css, /@media\s*\(pointer:\s*coarse\)\s*,\s*\(hover:\s*none\)\s*\{\s*\.touch-controls\s*\{\s*display:\s*grid\s*\}/);
  assert.match(css, /@media\(max-width:900px\)\{[^@]*\.touch-controls\{display:grid\}/);
});

test("an open game refreshes its objective on start/replay and preserves the run date across midnight", () => {
  let now = Date.parse("2026-09-18T23:59:59Z");
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const nodes = new Map();
  const storage = new Map();
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      style: {}, dataset: {}, classList: { toggle() {}, add() {}, remove() {} },
      events: {}, addEventListener(name, callback) { this.events[name] = callback; },
      setAttribute() {}, focus() {}, remove() {},
    });
    return nodes.get(id);
  }
  const context = vm.createContext({
    ...rules, Date: Clock, document: { getElementById: node, addEventListener() {} },
    matchMedia: () => ({ matches: false }), navigator: {}, window: {},
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame() {}, cancelAnimationFrame() {}, setTimeout() {}, clearTimeout() {},
  });
  vm.runInContext(js.replace(/^import .*;\s*/, ""), context);
  const labelFor = timestamp => rules.objectiveFor(Math.floor(Date.parse(timestamp) / 86400000)).label;
  assert.equal(node("objective-label").textContent, labelFor("2026-09-18"));
  now = Date.parse("2026-09-19T23:59:59Z");
  node("start-game").events.click();
  assert.equal(node("objective-label").textContent, labelFor("2026-09-19"));
  node("pause-game").events.click();
  now = Date.parse("2026-09-20T00:00:01Z");
  node("resume-game").events.click();
  assert.equal(node("objective-label").textContent, labelFor("2026-09-19"));
  // Exercise scoring and the real completion/persistence path without animating a full round.
  vm.runInContext('for (let i = 0; i < 25; i++) collect({ type: "signal", node: { remove() {} } }); endGame("time");', context);
  assert.deepEqual(JSON.parse(storage.get("madger-burrow-run-stats-v2")).marks, ["2026-09-19"]);
  node("start-game").events.click();
  assert.equal(node("objective-label").textContent, labelFor("2026-09-20"));
  vm.runInContext('for (let i = 0; i < 25; i++) collect({ type: "signal", node: { remove() {} } }); endGame("time");', context);
  assert.deepEqual(JSON.parse(storage.get("madger-burrow-run-stats-v2")).marks, ["2026-09-19", "2026-09-20"]);
});

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
