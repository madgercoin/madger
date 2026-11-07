// Verified, fail-closed hardening for the exact Expo SDK 57.0.33 development CLI.
// Expo 57.0.33 switched plugin validation from Zod to JSON Schema.
// Patch only pinned pristine upstream bytes; never fuzzy-match unknown CLI builds.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const cliPackage = expoRequire.resolve('@expo/cli/package.json');
const metadata = JSON.parse(await readFile(cliPackage, 'utf8'));
if (metadata.version !== '57.0.33') {
  throw new Error('Reassess development plugin validation hardening after CLI version update');
}

const specifications = [
  ['DevToolsPlugin.schema.js', '58eddd614cfe8cdd0f28367a868f81cf46c0422ae9fc3ca713f135fe18479e86', [
    [
      "        environments: {\n            type: 'array',\n            items: {",
      "        environments: {\n            type: 'array',\n            maxItems: 2,\n            items: {",
    ],
    [
      "        parameters: {\n            type: 'array',\n            items: CommandParameterSchema",
      "        parameters: {\n            type: 'array',\n            maxItems: 64,\n            items: CommandParameterSchema",
    ],
    [
      "        commands: {\n            type: 'array',\n            items: CommandSchema,\n            minItems: 1",
      "        commands: {\n            type: 'array',\n            items: CommandSchema,\n            minItems: 1,\n            maxItems: 128",
    ],
    [
      "const DevToolsPluginOutputSchema = {\n    type: 'array',",
      "const DevToolsPluginOutputSchema = {\n    type: 'array',\n    maxItems: 1024,",
    ],
  ]],
  ['DevToolsPluginCliExtensionResults.js', '9f8b8b6ed922a1c4b289d36f2b1447acebe8c2dfd6263e55e610e487f16988eb', [
    [
      "const MAX_OUTPUT_LENGTH = _nodebuffer().constants.MAX_STRING_LENGTH;",
      "const MAX_OUTPUT_LENGTH = Math.min(_nodebuffer().constants.MAX_STRING_LENGTH, 1024 * 1024);",
    ],
    [
      "Output truncated: plugin exceeded V8's max string length (${MAX_OUTPUT_LENGTH} chars).",
      "Output truncated: plugin exceeded development output limit (${MAX_OUTPUT_LENGTH} chars).",
    ],
    [
      "    parseOutputText(txt, level = 'info') {\n        let output;",
      "    parseOutputText(txt, level = 'info') {\n        if (_nodebuffer().Buffer.byteLength(txt, 'utf8') > MAX_OUTPUT_LENGTH) {\n            return [{ type: 'text', text: 'Plugin output exceeds the 1 MiB validation limit.', level: 'error' }];\n        }\n        let output;",
    ],
  ]],
];
for (const [name, originalHash, replacements] of specifications) {
  const fixture = await readFile(new URL('./devtools-validation-57_0_33-original/' + name + '.txt', import.meta.url), 'utf8');
  if (createHash('sha256').update(fixture).digest('hex') !== originalHash) {
    throw new Error('Corrupt reviewed upstream fixture: ' + name);
  }
  let patched = fixture;
  for (const [from, to] of replacements) {
    if (patched.split(from).length !== 2) throw new Error('Non-unique patch target: ' + name);
    patched = patched.replace(from, to);
  }
  const target = join(dirname(cliPackage), 'build/src/start/server/devtools', name);
  const current = await readFile(target, 'utf8');
  if (current === patched) continue;
  if (current !== fixture) throw new Error('Unexpected CLI source; refusing to patch ' + name);
  await writeFile(target, patched);
}
console.log('Verified bounded Expo 57.0.33 JSON-schema plugin validation, 1 MiB output cap, and source hashes.');
