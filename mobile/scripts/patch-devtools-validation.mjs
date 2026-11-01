// Local defense-in-depth for the pinned Expo SDK 57 development CLI only.
// Zod >=4.6.6 rejects oversized bounded collections before visiting elements.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const cliPackage = expoRequire.resolve('@expo/cli/package.json');
const cliRequire = createRequire(cliPackage);
const metadata = JSON.parse(await readFile(cliPackage, 'utf8'));
if (metadata.version !== '57.0.32' || cliRequire('zod/package.json').version !== '4.6.7') {
  throw new Error('Reassess development validation hardening after dependency update');
}
const specifications = [
  ['DevToolsPlugin.schema.js', '4da5edad8daa6eda49fecc646934d372008952004b2c19abc03e27bcffc904a5', [
    ['])).readonly(),', '])).max(2).readonly(),'],
    ['z.array(CommandParameterSchema).optional()', 'z.array(CommandParameterSchema).max(64).optional()'],
    ['z.array(CommandSchema).min(1)', 'z.array(CommandSchema).max(128).min(1)'],
    ['z.array(DevToolsPluginOutputLinesSchema);', 'z.array(DevToolsPluginOutputLinesSchema).max(1024);'],
  ]],
  ['DevToolsPluginCliExtensionResults.js', 'ab531966e34f5009d65fab4a00204cc999580d21b921f58ef58e00c568801c02', [
    ['const MAX_OUTPUT_LENGTH = _nodebuffer().constants.MAX_STRING_LENGTH;', 'const MAX_OUTPUT_LENGTH = Math.min(_nodebuffer().constants.MAX_STRING_LENGTH, 1024 * 1024);'],
    ["Output truncated: plugin exceeded V8's max string length (${MAX_OUTPUT_LENGTH} chars).", 'Output truncated: plugin exceeded development output limit (${MAX_OUTPUT_LENGTH} chars).'],
    ["    parseOutputText(txt, level = 'info') {", "    parseOutputText(txt, level = 'info') {\n        if (_nodebuffer().Buffer.byteLength(txt, 'utf8') > MAX_OUTPUT_LENGTH) {\n            return [{ type: 'text', text: 'Plugin output exceeds the 1 MiB validation limit.', level: 'error' }];\n        }"],
  ]],
];
// Keep exact original source alongside replacements in this script's sibling fixtures.
// Both original and patched hashes are checked, so repeat install is idempotent and
// altered/updated dependency sources fail closed rather than receiving a fuzzy patch.
for (const [name, originalHash, replacements] of specifications) {
  const target = join(dirname(cliPackage), 'build/src/start/server', name);
  const original = await readFile(new URL(`./devtools-validation-original/${name}.txt`, import.meta.url), 'utf8');
  if (createHash('sha256').update(original).digest('hex') !== originalHash) throw new Error(`Corrupt reviewed fixture: ${name}`);
  let patched = original;
  for (const [before, after] of replacements) {
    if (patched.split(before).length !== 2) throw new Error(`Non-unique patch target: ${name}`);
    patched = patched.replace(before, after);
  }
  const current = await readFile(target, 'utf8');
  if (current === patched) continue;
  if (current !== original) throw new Error(`Unexpected CLI source; refusing to patch ${name}`);
  await writeFile(target, patched);
}
console.log('Verified bounded Expo 57 development-plugin validation (Zod 4.6.7).');
