/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'madger-render-test-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
for (const name of ['math', 'gl']) {
  const source = fs.readFileSync(path.join(__dirname, '../src/game/expedition', name + '.ts'), 'utf8');
  fs.writeFileSync(path.join(dir, name + '.js'), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText);
}
const { ExpeditionRenderer } = require(path.join(dir, 'gl.js'));

// Model Expo's asynchronous frame batches: submission does not present them.
// A blocking native drain must finish the preceding batch before JS gets ahead.
function context({ native = true, instanced = true, webShim = false } = {}) {
  const state = { pending: [], presented: [], maxPending: 0, flushes: 0, drains: 0, draws: 0, instancedDraws: 0, travel: 0 };
  const noop = () => {};
  const gl = {
    drawingBufferWidth: 480, drawingBufferHeight: 960,
    createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}),
    getShaderParameter: () => true, getProgramParameter: () => true,
    getUniformLocation: (_, name) => ({ name }), getExtension: () => null,
    uniform1f: (location, value) => { if (location.name === 'uTravel') state.travel = value; },
    flush: () => { state.flushes++; },
    drawArrays: () => { state.draws++; },
    drawArraysInstanced: instanced ? () => { state.instancedDraws++; } : undefined,
    vertexAttribDivisor: instanced ? noop : undefined,
    endFrameEXP: native ? () => {
      state.pending.push(state.travel);
      state.maxPending = Math.max(state.maxPending, state.pending.length);
    } : webShim ? noop : undefined,
    flushEXP: native ? () => {
      state.drains++;
      state.presented.push(...state.pending);
      state.pending.length = 0;
    } : undefined,
  };
  let constant = 1;
  const proxy = new Proxy(gl, { get(target, key) {
    if (key in target) return target[key];
    if (/^[A-Z_0-9]+$/.test(String(key))) return target[key] = constant++;
    return noop;
  } });
  return { gl: proxy, state };
}

function frame(renderer, index, instances = 100) {
  renderer.reset();
  for (let i = 0; i < instances; i++) renderer.shape('box', [1, 1, 1, 0], i / 10, 0, -i, 1, 1, 1);
  renderer.render([0, 4, 9], [0, 1, -14], index / 60, 0, index);
}

test('native submission cannot accumulate stale frames behind current simulation state', t => {
  t.mock.method(console, 'info', () => {});
  const { gl, state } = context();
  const renderer = new ExpeditionRenderer(gl);
  for (let i = 1; i <= 60; i++) {
    frame(renderer, i);
    assert.equal(state.pending.length, 0, 'frame must drain before another render can be submitted');
    assert.equal(state.presented.at(-1), i, 'presentation must contain the current travel state');
  }
  assert.equal(state.maxPending, 1);
  assert.equal(state.drains, 60);
  assert.equal(state.instancedDraws, 60);
  assert.equal(state.draws, 0);
  assert.equal(renderer.stats.drawCalls, 1);
  assert.equal(renderer.stats.instances, 100);
  assert(Number.isFinite(renderer.stats.nativeDrainMs));
});

test('non-instanced native rendering remains synchronized and exposes its real draw count', t => {
  t.mock.method(console, 'info', () => {});
  const { gl, state } = context({ instanced: false });
  const renderer = new ExpeditionRenderer(gl);
  frame(renderer, 7, 12);
  assert.deepEqual(state.presented, [7]);
  assert.equal(state.draws, 12);
  assert.equal(renderer.stats.drawCalls, 12);
});

test('browser rendering does not require a native synchronization method', () => {
  for (const webShim of [false, true]) {
    const { gl, state } = context({ native: false, webShim });
    const renderer = new ExpeditionRenderer(gl);
    frame(renderer, 3);
    assert.equal(state.drains, 0);
    assert.equal(state.flushes, 1);
    assert.equal(state.instancedDraws, 1);
    assert.equal(renderer.stats.nativeDrainMs ?? 0, 0);
  }
});

test('a failed native drain propagates so the screen can pause and save', () => {
  const { gl } = context();
  gl.flushEXP = () => { throw Error('GPU unavailable'); };
  assert.throws(() => frame(new ExpeditionRenderer(gl), 2), /GPU unavailable/);
});
