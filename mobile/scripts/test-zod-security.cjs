// Actual Expo SDK 57.0.33 JSON-schema consumer regression tests.
// The new CLI no longer uses the old Zod plugin parser; ESLint Hooks still uses Zod.
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');

const expoRequire = createRequire(require.resolve('expo/package.json'));
const cliPackage = expoRequire.resolve('@expo/cli/package.json');
const cliRequire = createRequire(cliPackage);
const cliRoot = path.dirname(cliPackage);
const server = path.join(cliRoot, 'build/src/start/server');
const devtools = path.join(server, 'devtools');
const { PluginSchema, DevToolsPluginOutputSchema } = require(path.join(devtools, 'DevToolsPlugin.schema.js'));
const { createMCPDevToolsExtensionSchema } = require(path.join(server, 'mcp/createMCPDevToolsExtensionSchema.js'));
const { DevToolsPluginCliExtensionResults } = require(path.join(devtools, 'DevToolsPluginCliExtensionResults.js'));
const schemaTools = cliRequire('@expo/schema-utils');
const check = (schema, data) => schemaTools.validate(schema, data);
const invalid = (schema, data) => assert.throws(
  () => check(schema, data),
  (error) => error instanceof schemaTools.ValidationError,
);
const command = () => ({
  name: 'inspect', title: 'Inspect', environments: ['cli', 'mcp'],
  parameters: [
    { name: 'count', type: 'number' },
    { name: 'confirm', type: 'confirm' },
    { name: 'label', type: 'text' },
  ],
});
const plugin = () => ({
  packageName: 'test-plugin', packageRoot: '/test-plugin',
  cliExtensions: { description: 'Fixture plugin', entryPoint: 'index.js', commands: [command()] },
});

test('exact Expo SDK CLI consumer uses reviewed JSON schema; Hooks retains patched Zod', () => {
  assert.equal(require(cliPackage).version, '57.0.33');
  assert.equal(typeof PluginSchema, 'object');
  assert.equal(typeof DevToolsPluginOutputSchema, 'object');
  const hooksRequire = createRequire(require.resolve('eslint-plugin-react-hooks'));
  assert.equal(hooksRequire('zod/package.json').version, '4.6.7');
  assert.ok(hooksRequire('zod/v4').z);
});

test('pinned plugin patch is idempotent on actual installed CLI', () => {
  const paths = ['DevToolsPlugin.schema.js', 'DevToolsPluginCliExtensionResults.js']
    .map((name) => path.join(devtools, name));
  const before = paths.map((file) => readFileSync(file, 'utf8'));
  for (let i = 0; i < 2; i++) {
    execFileSync(process.execPath, [path.join(__dirname, 'patch-devtools-validation.mjs')], { timeout: 5000 });
    assert.deepEqual(paths.map((file) => readFileSync(file, 'utf8')), before);
  }
});

test('fresh patch, source drift and future CLI version changes fail closed', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'madger-cli-schema-'));
  try {
    const scripts = path.join(root, 'scripts');
    const expo = path.join(root, 'node_modules/expo');
    const cli = path.join(expo, 'node_modules/@expo/cli');
    const target = path.join(cli, 'build/src/start/server/devtools');
    for (const dir of [scripts, target]) mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(expo, 'package.json'), JSON.stringify({ name: 'expo', version: '57.0.32' }));
    writeFileSync(path.join(cli, 'package.json'), JSON.stringify({ name: '@expo/cli', version: '57.0.33' }));
    cpSync(path.join(__dirname, 'patch-devtools-validation.mjs'), path.join(scripts, 'patch.mjs'));
    cpSync(path.join(__dirname, 'devtools-validation-57_0_33-original'), path.join(scripts, 'devtools-validation-57_0_33-original'), { recursive: true });
    const names = ['DevToolsPlugin.schema.js', 'DevToolsPluginCliExtensionResults.js'];
    for (const name of names) cpSync(path.join(scripts, 'devtools-validation-57_0_33-original', name + '.txt'), path.join(target, name));
    const run = () => execFileSync(process.execPath, [path.join(scripts, 'patch.mjs')], { timeout: 5000, stdio: 'pipe' });
    run();
    const patched = names.map(name => readFileSync(path.join(target, name), 'utf8'));
    assert.deepEqual(patched, names.map(name => readFileSync(path.join(devtools, name), 'utf8')));
    run();
    assert.deepEqual(names.map(name => readFileSync(path.join(target, name), 'utf8')), patched);
    writeFileSync(path.join(target, names[0]), patched[0] + '\n// unexpected source drift\n');
    assert.throws(run, /Unexpected CLI source/);
    writeFileSync(path.join(target, names[0]), patched[0]);
    writeFileSync(path.join(cli, 'package.json'), JSON.stringify({ name: '@expo/cli', version: '57.0.34' }));
    assert.throws(run, /Reassess development plugin validation/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('real plugin schema preserves valid commands and rejects malformed settings', () => {
  const valid = plugin();
  assert.doesNotThrow(() => check(PluginSchema, valid));
  invalid(PluginSchema, { ...valid, packageName: '' });
  const broken = plugin(); broken.cliExtensions.commands[0].parameters[0].type = 'unknown';
  invalid(PluginSchema, broken);
  invalid(PluginSchema, { ...valid, cliExtensions: { ...valid.cliExtensions, commands: [] } });
});

test('development collection limits are applied by the real JSON-schema validator', () => {
  const cli = PluginSchema.properties.cliExtensions.properties;
  assert.equal(cli.commands.maxItems, 128);
  assert.equal(cli.commands.items.properties.parameters.maxItems, 64);
  assert.equal(cli.commands.items.properties.environments.maxItems, 2);
  assert.equal(DevToolsPluginOutputSchema.maxItems, 1024);

  for (const [field, length] of [['commands', 129], ['parameters', 65], ['environments', 3]]) {
    const obj = plugin();
    if (field === 'commands') obj.cliExtensions.commands = Array.from({ length }, command);
    else if (field === 'parameters') obj.cliExtensions.commands[0].parameters = Array.from({ length }, () => ({ name: 'p', type: 'text' }));
    else obj.cliExtensions.commands[0].environments = Array.from({ length }, () => 'cli');
    invalid(PluginSchema, obj);
  }
  const valid = plugin();
  valid.cliExtensions.commands = Array.from({ length: 128 }, command);
  valid.cliExtensions.commands[0].parameters = Array.from({ length: 64 }, (_, i) => ({ name: 'p' + i, type: 'text' }));
  assert.doesNotThrow(() => check(PluginSchema, valid));
});

test('actual MCP schema preserves typed CLI parameters', () => {
  const schema = createMCPDevToolsExtensionSchema(plugin());
  assert.ok(schema && typeof schema === 'object');
  assert.doesNotThrow(() => check(schema, { command: 'inspect', count: 2, confirm: true, label: 'sample' }));
  invalid(schema, { command: 'wrong' });
  invalid(schema, { command: 'inspect', count: '2' });
});

test('real plugin output schema preserves text, audio and image and rejects invalid output', () => {
  const output = [
    { type: 'text', text: 'ready', level: 'info' },
    { type: 'audio', url: 'https://example.com/audio' },
    { type: 'image', url: 'https://example.com/image', text: 'fixture' },
  ];
  assert.doesNotThrow(() => check(DevToolsPluginOutputSchema, output));
  invalid(DevToolsPluginOutputSchema, [{ type: 'audio', url: 'bad-url' }]);
  invalid(DevToolsPluginOutputSchema, [{ type: 'text', text: 'x', level: 'fatal' }]);
  assert.doesNotThrow(() => check(DevToolsPluginOutputSchema, Array.from({ length: 1024 }, () => output[0])));
  invalid(DevToolsPluginOutputSchema, Array.from({ length: 1025 }, () => output[0]));
});

test('the CLI parser checks UTF-8 byte limit before JSON.parse', () => {
  const parser = new DevToolsPluginCliExtensionResults();
  const original = JSON.parse;
  let calls = 0;
  JSON.parse = () => { calls++; throw Error('oversized input reached JSON.parse'); };
  try {
    for (const input of ['x'.repeat(1024 * 1024 + 1), '🦡'.repeat(262145)]) {
      const output = parser.parseOutputText(input);
      assert.equal(output.length, 1);
      assert.equal(output[0].type, 'text');
      assert.equal(output[0].level, 'error');
    }
    assert.equal(calls, 0);
  } finally { JSON.parse = original; }
});

test('CLI output parser preserves normal JSON, plain text and error reporting', () => {
  const parser = new DevToolsPluginCliExtensionResults();
  const value = [{ type: 'text', text: 'ready', level: 'info' }];
  assert.deepEqual(parser.parseOutputText(JSON.stringify(value)), value);
  assert.deepEqual(parser.parseOutputText('one\ntwo', 'warning'), [
    { type: 'text', text: 'one', level: 'warning' },
    { type: 'text', text: 'two', level: 'warning' },
  ]);
  const error = parser.parseOutputText('[{"type":"invalid"}]');
  assert.equal(error.length, 1);
  assert.equal(error[0].level, 'error');
  assert.match(error[0].text, /Invalid JSON:/);
});

test('accumulated output cap cannot be bypassed by subsequent append', () => {
  const parser = new DevToolsPluginCliExtensionResults();
  parser.append('x'.repeat(1024 * 1024));
  assert.equal(parser.isTruncated(), false);
  parser.append('overflow');
  assert.equal(parser.isTruncated(), true);
  const before = parser.getOutput().slice();
  assert.match(before.at(-1).text, /Output truncated:/);
  parser.append('ignored');
  assert.deepEqual(parser.getOutput(), before);
});
