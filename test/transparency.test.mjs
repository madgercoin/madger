import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import worker from "../worker.generated.js";

const page = await readFile("transparency.html", "utf8");
const deploymentCheck = await readFile("scripts/check-deployment.mjs", "utf8");
const config = JSON.parse(await readFile("wrangler.json", "utf8"));
const env = { ASSETS: { fetch() { throw new Error("Transparency must bypass asset redirects"); } } };

test("the canonical transparency URL serves the bundled page directly", async () => {
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.assets.html_handling, "auto-trailing-slash");
  for (const query of ["", "?utm_source=burrow"]) {
    const response = await worker.fetch(new Request(`https://madgercoin.com/transparency.html${query}`), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.ok(response.headers.get("content-security-policy"));
    assert.equal(await response.text(), page);
  }
  const head = await worker.fetch(new Request("https://madgercoin.com/transparency.html", { method: "HEAD" }), env);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  const post = await worker.fetch(new Request("https://madgercoin.com/transparency.html", { method: "POST" }), env);
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
});

test("transparency aliases redirect once to the declared canonical", async () => {
  for (const alias of ["/transparency", "/transparency/"]) {
    const response = await worker.fetch(new Request(`https://madgercoin.com${alias}`), env);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), "/transparency.html");
  }
  assert.match(page, /rel="canonical" href="https:\/\/madgercoin.com\/transparency.html"/);
});

test("deployment verification rejects transparency redirects and incorrect page content", async () => {
  for (const [status, body, expectedFailures] of [[200, page, false], [307, "", true], [200, "<html>wrong page</html>", true]]) {
    const errors = [];
    const requests = [];
    await vm.runInNewContext(`(async () => { ${deploymentCheck} })()`, {
      process: { env: {}, exit() {} },
      console: { log() {}, error: message => errors.push(message) },
      fetch: async (url, options) => {
        if (new URL(url).pathname !== "/transparency.html") throw new Error("Unrelated route excluded from this test");
        requests.push(options);
        return new Response(body, { status, headers: { "content-type": "text/html", ...(status === 307 ? { location: "/transparency" } : {}) } });
      },
    });
    assert.equal(requests.length, 1, "the deployment check must request transparency");
    assert.equal(requests[0].redirect, "manual");
    const failures = errors.join("\n").split("\n").filter(line => /^- (?:\/transparency\.html:|transparency:)/.test(line));
    assert.equal(failures.length > 0, expectedFailures, failures.join("\n"));
  }
});
