// Export the authored game afresh; verification rejects stale or modified assets.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, '.offline-game');
const manifestName = 'offline-manifest.json';
const sha = data => createHash('sha256').update(data).digest('hex');
function walk(directory) {
  return readdirSync(directory).sort().flatMap(name => {
    const path = join(directory, name), info = lstatSync(path);
    if (info.isSymbolicLink()) throw Error('Offline input must not contain symlinks: ' + path);
    return info.isDirectory() ? walk(path) : [path];
  });
}
function sourceFingerprint() {
  const inputs = ['src', 'public', 'assets'].flatMap(name => walk(join(root, name)));
  for (const name of ['package.json', 'package-lock.json', 'app.json', 'app.config.js', 'tsconfig.json']) inputs.push(join(root, name));
  return sha(inputs.sort().map(path => relative(root, path).replaceAll('\\', '/') + '\0' + sha(readFileSync(path))).join('\n'));
}
function exportFiles() {
  return walk(dist).filter(path => relative(dist, path) !== manifestName).map(path => ({
    path: relative(dist, path).replaceAll('\\', '/'), sha256: sha(readFileSync(path)), bytes: lstatSync(path).size,
  }));
}
const mustHave = ['expedition.html', 'blackroot/renderer.mjs', 'blackroot/forest.pack', 'blackroot/madger-hero.mjs', 'blackroot/vendor/build/three.module.js'];
function validateFiles(files) {
  for (const name of mustHave) if (!files.some(file => file.path === name && file.bytes > 0)) throw Error('Missing authored offline resource: ' + name);
  if (!files.some(file => file.path.startsWith('_expo/static/js/web/') && file.path.endsWith('.js'))) throw Error('Missing exported web application bundle');
}
const verify = process.argv.includes('--verify');
if (!verify) {
  const exportEnv = { ...process.env, EXPO_NO_TELEMETRY: '1', MADGER_ANDROID_PREVIEW: '0', MADGER_EXPEDITION_PREVIEW: '0' };
  delete exportEnv.EXPO_TOKEN;
  execFileSync(process.execPath, [join(root, 'node_modules/expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', '.offline-game'], {
    cwd: root, stdio: 'inherit', env: exportEnv,
  });
  const files = exportFiles(); validateFiles(files);
  writeFileSync(join(dist, manifestName), JSON.stringify({ version: 1, sourceFingerprint: sourceFingerprint(), files }, null, 2) + '\n');
}
if (!existsSync(join(dist, manifestName))) throw Error('Run npm run export:offline before Android prebuild; no reviewed offline export exists');
const manifest = JSON.parse(readFileSync(join(dist, manifestName), 'utf8'));
if (manifest.version !== 1 || manifest.sourceFingerprint !== sourceFingerprint()) throw Error('Offline export is stale; rerun npm run export:offline for current source');
const actual = exportFiles(); validateFiles(actual);
if (JSON.stringify(actual) !== JSON.stringify(manifest.files)) throw Error('Offline export contents differ from their verified manifest');
const destinationIndex = process.argv.indexOf('--destination');
if (destinationIndex !== -1) {
  const destination = resolve(process.argv[destinationIndex + 1] || '');
  const allowed = join(root, 'android/app/src/main/assets/expedition');
  if (destination !== allowed) throw Error('Refusing unexpected Android asset destination');
  rmSync(destination, { recursive: true, force: true });
  cpSync(dist, destination, { recursive: true });
}
console.log(`Verified offline authored Expedition: ${actual.length} files, source ${manifest.sourceFingerprint}.`);
