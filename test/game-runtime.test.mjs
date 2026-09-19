import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import * as rules from "../game-core.js";

const source = (await readFile(new URL("../game.js", import.meta.url), "utf8"))
  .replace(/^import \{([^}]+)\} from "\.\/game-core.js";/, "const {$1} = rules;");

function game() {
  const elements = new Map();
  const storage = new Map();
  let pendingFrame;
  let timestamp = 100;
  class Element {
    textContent = ""; innerHTML = ""; hidden = false; disabled = false;
    style = {}; dataset = {}; events = new Map(); children = [];
    classList = { add() {}, remove() {}, toggle() {} };
    addEventListener(name, handler) { this.events.set(name, handler); }
    setAttribute() {} focus() {} scrollIntoView() {} closest() { return null; }
    appendChild(node) { this.children.push(node); }
    remove() { this.removed = true; }
    getBoundingClientRect() { return { left: 0, width: 300 }; }
    fire(name, values = {}) { this.events.get(name)?.({ target: this, preventDefault() {}, ...values }); }
  }
  const element = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const document = Object.assign(new Element(), { getElementById: element, querySelector: element, createElement: () => new Element(), hidden: false });
  const context = vm.createContext({ rules, document, window: {}, navigator: {}, location: { protocol: "http:" },
    matchMedia: () => ({ matches: false }),
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    requestAnimationFrame: callback => { pendingFrame = callback; return 1; }, cancelAnimationFrame: () => { pendingFrame = null; },
    setTimeout: () => 1, clearTimeout() {},
  });
  vm.runInContext(source, context);
  return { element, document, storage, advance(seconds) {
    for (let index = 0; index < seconds * 60; index++) {
      timestamp += 1000 / 60;
      const callback = pendingFrame; pendingFrame = null; callback?.(timestamp);
    }
  } };
}

test("actual web runtime pauses time, pickups, and movement until resumed", () => {
  const app = game();
  app.element("start-game").fire("click");
  app.advance(4);
  assert.equal(app.element("score").textContent, "0100");
  app.element("pause-game").fire("click");
  const time = app.element("time").textContent;
  app.advance(10);
  app.element("move-left").fire("pointerdown", { button: 0 });
  assert.equal(app.element("time").textContent, time);
  assert.equal(app.element("runner").style.left, "50%");
  app.element("resume-game").fire("click");
  app.advance(1);
  assert.ok(Number(app.element("time").textContent) < Number(time));
});

test("pointer and keyboard button activation each move exactly one lane", () => {
  const app = game();
  app.element("start-game").fire("click");
  app.element("move-left").fire("pointerdown", { button: 0 });
  app.element("move-left").fire("click", { detail: 1 });
  assert.equal(app.element("runner").style.left, `${100 / 6}%`);
  app.element("move-right").fire("click", { detail: 0 });
  assert.equal(app.element("runner").style.left, "50%");
  app.element("playfield").fire("pointerdown", { button: 0, clientX: 290 });
  assert.equal(app.element("runner").style.left, `${500 / 6}%`);
});

test("a run is saved once and retry clears entities, time, score, and lane", () => {
  const app = game();
  app.element("start-game").fire("click");
  app.advance(65);
  const stats = JSON.parse(app.storage.get("madger-burrow-run-stats-v2"));
  assert.equal(stats.runs, 1);
  assert.equal(app.element("start-panel").hidden, false);
  app.advance(5);
  assert.equal(JSON.parse(app.storage.get("madger-burrow-run-stats-v2")).runs, 1);
  app.element("start-game").fire("click");
  assert.equal(app.element("score").textContent, "0000");
  assert.equal(app.element("time").textContent, "60.0");
  assert.equal(app.element("runner").style.left, "50%");
  assert.ok(app.element("playfield").children.every(item => item.removed));
  app.document.hidden = true;
  app.document.fire("visibilitychange");
  app.advance(5);
  assert.equal(app.element("time").textContent, "60.0");
});
