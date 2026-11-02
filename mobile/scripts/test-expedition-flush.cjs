const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const exports = {}; cache.set(name, exports);
  const source = fs.readFileSync(path.join(__dirname, '../src/game/expedition', name + '.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, {
    exports, require: dependency => { assert.match(dependency, /^\.\//); return load(dependency.slice(2)); },
  });
  return exports;
}
const { createExpeditionStore, emptyExpeditionProfile } = load('profile');
const { freshOvergrownExpedition } = load('core');
async function fixture() {
  const writes = [], durable = [], initial = emptyExpeditionProfile(); initial.coins = 100;
  const store = createExpeditionStore({
    getItem: async () => JSON.stringify(initial),
    setItem: (key, value) => new Promise((resolve, reject) => writes.push({ key, value, reject, resolve: () => { durable.push(JSON.parse(value)); resolve(); } })),
  });
  await store.init();
  return { store, writes, durable };
}
const turn = () => new Promise(resolve => setImmediate(resolve));
async function assertExitWaits(store, run, writes) {
  let exited = false;
  const exit = (async () => { await store.checkpoint(run); await store.flush(); if (!store.getSnapshot().error) exited = true; })();
  await turn();
  assert.equal(exited, false, 'exit must not pass the outstanding durable write');
  assert.equal(writes.length, 1);
  writes[0].resolve();
  await exit;
  assert.equal(exited, true);
}
test('ready-screen preferences must become durable before hosted exit', async () => {
  const { store, writes, durable } = await fixture();
  void store.preferences({ sound: false });
  await assertExitWaits(store, freshOvergrownExpedition(42, 'ready'), writes);
  assert.equal(durable[0].settings.sound, false);
});
test('ready-screen workshop purchase must become durable before hosted exit', async () => {
  const { store, writes, durable } = await fixture();
  void store.buy('armor');
  await assertExitWaits(store, freshOvergrownExpedition(42, 'ready'), writes);
  assert.equal(durable[0].upgrades.armor, 1);
  assert.equal(durable[0].coins, 82);
});
test('finished reward banking must become durable before hosted exit', async () => {
  const { store, writes, durable } = await fixture();
  const run = freshOvergrownExpedition(42, 'completed');
  Object.assign(run, { finished: true, mode: 'won', coins: 9 });
  void store.finish(run);
  await assertExitWaits(store, run, writes);
  assert.equal(durable[0].coins, 109);
  assert.equal(durable[0].runs, 1);
  assert.equal(durable[0].completedIds[0], 'completed');
});
test('flush covers every already queued write, not only the first', async () => {
  const { store, writes, durable } = await fixture();
  void store.preferences({ sound: false }); void store.preferences({ music: false });
  let flushed = false; const completion = store.flush().then(() => { flushed = true; });
  await turn(); writes[0].resolve(); await turn();
  assert.equal(flushed, false); assert.equal(writes.length, 2);
  writes[1].resolve(); await completion;
  assert.equal(durable[1].settings.sound, false); assert.equal(durable[1].settings.music, false);
});
test('failed queued save leaves an actionable error and prevents hosted exit', async () => {
  const { store, writes } = await fixture();
  void store.preferences({ sound: false });
  let exited = false;
  const completion = store.flush().then(() => { if (!store.getSnapshot().error) exited = true; });
  await turn(); writes[0].reject(new Error('disk full')); await completion;
  assert.equal(exited, false); assert.match(store.getSnapshot().error, /Retry saving/);
  const retry = store.retry(); await turn(); writes[1].resolve(); await retry; await store.flush();
  assert.equal(store.getSnapshot().error, null);
});
