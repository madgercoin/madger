import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, css, source, core, build, config, sitemap, app, home, manifestText, serviceWorker, packageText] = await Promise.all([
  readFile("reclaim.html", "utf8"), readFile("reclaim.css", "utf8"), readFile("reclaim/src/main.ts", "utf8"),
  readFile("reclaim/src/core.ts", "utf8"), readFile("build.mjs", "utf8"), readFile("site-config.mjs", "utf8"),
  readFile("sitemap.xml", "utf8"), readFile("app.html", "utf8"), readFile("index.html", "utf8"),
  readFile("manifest.webmanifest", "utf8"), readFile("sw.js", "utf8"), readFile("package.json", "utf8")
]);
const manifest = JSON.parse(manifestText);
const packageJson = JSON.parse(packageText);

test("Reclaim the Block exposes the complete accessible combat control set", () => {
  for (const marker of ['id="reclaim-game"', 'id="start-operation"', 'id="pause-operation"', 'id="upgrade-panel"', 'aria-live="polite"', 'data-control="attack"', 'data-control="dash"', 'data-control="burrow"']) assert.match(html, new RegExp(marker));
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /Keyboard\.JustDown/);
});

test("the combat slice is local, free, and separated from token rewards", () => {
  assert.match(html, /NO WALLET|no wallet/i);
  assert.match(html, /no cash, token, prize, or financial value/i);
  assert.match(source, /localStorage/);
  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|walletAdapter|solana\.connect/i);
  assert.doesNotMatch(core, /lamports|privateKey|seedPhrase/i);
});

test("the selected Phaser and TypeScript build is pinned and self-hosted", () => {
  assert.equal(packageJson.dependencies.phaser, "3.90.0");
  assert.equal(packageJson.devDependencies.esbuild, "0.25.10");
  assert.equal(packageJson.devDependencies.typescript, "5.9.2");
  assert.match(build, /reclaim\/src\/main\.ts/);
  assert.match(build, /bundle: true/);
  assert.doesNotMatch(html, /https:\/\/.*(?:phaser|cdn|unpkg|jsdelivr)/i);
});

test("the route is discoverable, bundled, installable, and cached offline", () => {
  assert.match(config, /"reclaim\.html"/);
  assert.match(config, /"reclaim-game\.js"/);
  assert.match(build, /pathname === "\/reclaim"/);
  assert.match(sitemap, /<loc>https:\/\/madgercoin\.com\/reclaim<\/loc>/);
  assert.match(app, /href="\/reclaim"/);
  assert.match(home, /href="\/reclaim"/);
  assert.ok(manifest.shortcuts.some(shortcut => shortcut.url === "/reclaim"));
  for (const resource of ["/reclaim", "/reclaim.css", "/reclaim-game.js", "/reclaim-core.js"]) assert.match(serviceWorker, new RegExp(`"${resource.replace(".", "\\.")}"`));
});

test("combat input and boss telegraphs preserve their gameplay guarantees", () => {
  assert.match(source, /this\.pointerAimActive = true/);
  assert.match(source, /movement\.lengthSq\(\) && !this\.pointerAimActive/);

  const updateLoop = source.slice(source.indexOf("  update(_time"), source.indexOf("  updatePhase()"));
  assert.ok(updateLoop.indexOf("pauseRun();") < updateLoop.indexOf("this.elapsed += delta"));

  const warden = source.slice(source.indexOf("  updateWarden("), source.indexOf("  resolveEnemyContact("));
  assert.match(warden, /enemy\.state === "warning"[\s\S]*enemy\.state = "charging"/);
  assert.match(warden, /enemy\.state === "charging"[\s\S]*enemy\.targetX \* enemy\.speed \* 3\.4/);
});
