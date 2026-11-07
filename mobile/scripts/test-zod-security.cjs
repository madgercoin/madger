const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');

// Resolve through the actual Expo consumer, rather than accidentally testing a
// different hoisted Zod copy. These tests intentionally fail on unpatched installs.
const expoRequire = createRequire(require.resolve('expo/package.json'));
const cliPackage = expoRequire.resolve('@expo/cli/package.json');
const cliRequire = createRequire(cliPackage);
const cliRoot = path.dirname(cliPackage);
const server = path.join(cliRoot, 'build/src/start/server');
const devtools = path.join(server, 'devtools');
const { z } = cliRequire('zod');
const { PluginSchema, DevToolsPluginOutputSchema } = require(path.join(devtools, 'DevToolsPlugin.schema.js'));
const { createMCPDevToolsExtensionSchema } = require(path.join(server, 'mcp/createMCPDevToolsExtensionSchema.js'));
const { DevToolsPluginCliExtensionResults } = require(path.join(devtools, 'DevToolsPluginCliExtensionResults.js'));

const command = () => ({ name: 'inspect', title: 'Inspect', environments: ['cli', 'mcp'], parameters: [
  { name: 'count', type: 'number' }, { name: 'confirm', type: 'confirm' }, { name: 'label', type: 'text' },
] });
const plugin = () => ({ packageName: 'test-plugin', packageRoot: '/test-plugin', cliExtensions: {
  description: 'Fixture plugin', entryPoint: 'index.js', commands: [command()],
} });
function untouchedArray(length) {
  const value = new Array(length);
  Object.defineProperty(value, 0, { get() { throw new Error('Oversized array element was evaluated'); } });
  return value;
}

test('both actual consumers resolve the reviewed patched Zod version', () => {
  assert.equal(require(cliPackage).version, '57.0.33');
  assert.equal(cliRequire('zod/package.json').version, '4.6.7');
  const hooksRequire = createRequire(require.resolve('eslint-plugin-react-hooks'));
  assert.equal(hooksRequire('zod/package.json').version, '4.6.7');
  assert.ok(hooksRequire('zod/v4').z);
});

test('reviewed CLI patch is idempotent on the installed exact dependency', () => {
  const files = ['DevToolsPlugin.schema.js', 'DevToolsPluginCliExtensionResults.js'].map(name => path.join(devtools, name));
  const before = files.map(file => readFileSync(file, 'utf8'));
  for (let attempt = 0; attempt < 2; attempt++) {
    execFileSync(process.execPath, [path.join(__dirname, 'patch-devtools-validation.mjs')], { timeout: 5000 });
    assert.deepEqual(files.map(file => readFileSync(file, 'utf8')), before);
  }
});

test('fresh patch and source/version tamper guards work in an isolated install fixture', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'madger-zod-guard-'));
  try {
    const scripts = path.join(root, 'scripts');
    const expo = path.join(root, 'node_modules/expo');
    const cli = path.join(expo, 'node_modules/@expo/cli');
    const target = path.join(cli, 'build/src/start/server/devtools');
    const zod = path.join(cli, 'node_modules/zod');
    for (const dir of [scripts, target, zod]) mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(expo, 'package.json'), JSON.stringify({ name: 'expo', version: '57.0.31' }));
    writeFileSync(path.join(cli, 'package.json'), JSON.stringify({ name: '@expo/cli', version: '57.0.33' }));
    writeFileSync(path.join(zod, 'package.json'), JSON.stringify({ name: 'zod', version: '4.6.7' }));
    cpSync(path.join(__dirname, 'patch-devtools-validation.mjs'), path.join(scripts, 'patch.mjs'));
    cpSync(path.join(__dirname, 'devtools-validation-original'), path.join(scripts, 'devtools-validation-original'), { recursive: true });
    const names = ['DevToolsPlugin.schema.js', 'DevToolsPluginCliExtensionResults.js'];
    for (const name of names) cpSync(path.join(scripts, 'devtools-validation-original', name + '.txt'), path.join(target, name));
    const run = () => execFileSync(process.execPath, [path.join(scripts, 'patch.mjs')], { timeout: 5000, stdio: 'pipe' });
    run();
    const patched = names.map(name => readFileSync(path.join(target, name), 'utf8'));
    assert.deepEqual(patched, names.map(name => readFileSync(path.join(devtools, name), 'utf8')));
    run();
    assert.deepEqual(names.map(name => readFileSync(path.join(target, name), 'utf8')), patched);
    writeFileSync(path.join(target, names[0]), patched[0] + '\n// unexpected dependency modification\n');
    assert.throws(run, /Unexpected CLI source/);
    assert.equal(readFileSync(path.join(target, names[1]), 'utf8'), patched[1]);
    writeFileSync(path.join(target, names[0]), patched[0]);
    writeFileSync(path.join(zod, 'package.json'), JSON.stringify({ name: 'zod', version: '4.6.8' }));
    assert.throws(run, /Reassess development validation/);
    assert.deepEqual(names.map(name => readFileSync(path.join(target, name), 'utf8')), patched);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('upstream collection bounds reject before walking array, set, or map values', () => {
  let visited = 0;
  const element = z.any().transform((value) => { visited++; return value; });
  const results = [
    z.array(element).max(1).safeParse(untouchedArray(2)),
    z.set(element).max(1).safeParse(new Set([1, 2])),
    z.map(element, element).max(1).safeParse(new Map([[1, 1], [2, 2]])),
  ];
  for (const result of results) {
    assert.equal(result.success, false);
    assert.equal(result.error.issues.length, 1);
    assert.equal(result.error.issues[0].code, 'too_big');
  }
  assert.equal(visited, 0);
});

test('real CLI plugin schema preserves valid values and rejects invalid configuration', () => {
  const fixture = plugin();
  assert.deepEqual(PluginSchema.parse(fixture), fixture);
  assert.equal(PluginSchema.safeParse({ ...fixture, packageName: '' }).success, false);
  const invalid = plugin();
  invalid.cliExtensions.commands[0].parameters[0].type = 'unknown';
  assert.equal(PluginSchema.safeParse(invalid).success, false);
  assert.equal(PluginSchema.safeParse({ ...fixture, cliExtensions: { ...fixture.cliExtensions, commands: [] } }).success, false);
});

test('real CLI nested collection limits reject before reading oversized elements', () => {
  for (const [field, length] of [['commands', 129], ['parameters', 65], ['environments', 3]]) {
    const fixture = plugin();
    if (field === 'commands') fixture.cliExtensions.commands = untouchedArray(length);
    else fixture.cliExtensions.commands[0][field] = untouchedArray(length);
    const result = PluginSchema.safeParse(fixture);
    assert.equal(result.success, false, field);
    assert.equal(result.error.issues.length, 1, field);
    assert.equal(result.error.issues[0].code, 'too_big', field);
  }
});

test('plugin limits include boundary values without changing normal descriptors', () => {
  const fixture = plugin();
  fixture.cliExtensions.commands = Array.from({ length: 128 }, command);
  fixture.cliExtensions.commands[0].parameters = Array.from({ length: 64 }, (_, n) => ({ name: `p${n}`, type: 'text' }));
  assert.equal(PluginSchema.safeParse(fixture).success, true);
});

test('actual MCP schema keeps typed parameters, command enum and strict unknown-key rejection', () => {
  const schema = createMCPDevToolsExtensionSchema(plugin());
  const valid = { command: 'inspect', count: 2, confirm: true, label: 'example' };
  assert.deepEqual(schema.parse(valid), valid);
  assert.equal(schema.safeParse({ command: 'inspect' }).success, true);
  for (const invalid of [{ command: 'wrong' }, { command: 'inspect', count: '2' },
    { command: 'inspect', confirm: 'true' }, { command: 'inspect', label: 1 },
    { command: 'inspect', unknown: 1 }]) assert.equal(schema.safeParse(invalid).success, false);
  assert.throws(() => createMCPDevToolsExtensionSchema({ packageName: 'empty' }), /no commands/);
});

test('real output schema accepts text/audio/image and rejects malformed or oversized output', () => {
  const valid = [{ type: 'text', text: 'ready', level: 'info' },
    { type: 'audio', url: 'https://example.com/audio' },
    { type: 'image', url: 'https://example.com/image', text: 'fixture' }];
  assert.deepEqual(DevToolsPluginOutputSchema.parse(valid), valid);
  assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'audio', url: 'invalid' }]).success, false);
  assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'text', text: 'x', level: 'fatal' }]).success, false);
  assert.equal(DevToolsPluginOutputSchema.safeParse(Array.from({ length: 1024 }, () => valid[0])).success, true);
  const result = DevToolsPluginOutputSchema.safeParse(untouchedArray(1025));
  assert.equal(result.success, false);
  assert.equal(result.error.issues.length, 1);
  assert.equal(result.error.issues[0].code, 'too_big');
});

test('CLI output parser rejects oversized UTF-8 bytes before JSON parsing', () => {
  const parser = new DevToolsPluginCliExtensionResults();
  const original = JSON.parse;
  let parsed = 0;
  JSON.parse = () => { parsed++; throw new Error('Oversized text reached JSON.parse'); };
  try {
    for (const input of ['x'.repeat(1024 * 1024 + 1), '🦡'.repeat(262145)]) {
      const result = parser.parseOutputText(input);
      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'text');
      assert.equal(result[0].level, 'error');
    }
    assert.equal(parsed, 0);
  } finally { JSON.parse = original; }
});

test('CLI output parser retains ordinary JSON, plain-text and error reporting behavior', () => {
  const parser = new DevToolsPluginCliExtensionResults();
  const value = [{ type: 'text', text: 'ready', level: 'info' }];
  assert.deepEqual(parser.parseOutputText(JSON.stringify(value)), value);
  assert.deepEqual(parser.parseOutputText('one\ntwo', 'warning'), [
    { type: 'text', text: 'one', level: 'warning' }, { type: 'text', text: 'two', level: 'warning' },
  ]);
  const invalid = parser.parseOutputText('[{"type":"invalid"}]');
  assert.equal(invalid.length, 1);
  assert.equal(invalid[0].level, 'error');
  assert.match(invalid[0].text, /Invalid JSON:/);
});

test('accumulated plugin output is capped and later writes remain ignored', () => {
  const parser = new DevToolsPluginCliExtensionResults();
  parser.append('x'.repeat(1024 * 1024));
  assert.equal(parser.isTruncated(), false);
  parser.append('overflow');
  assert.equal(parser.isTruncated(), true);
  const before = parser.getOutput().slice();
  assert.match(before.at(-1).text, /Output truncated:/);
  parser.append('must be ignored');
  assert.deepEqual(parser.getOutput(), before);
});
