import { readFile } from 'node:fs/promises';

const strict = process.argv.includes('--distribution');
const app = JSON.parse(await readFile(new URL('../app.json', import.meta.url), 'utf8')).expo;
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const failures = [];
const warnings = [];
const projectId = app.extra?.eas?.projectId;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function validatePng(relativePath) {
  try {
    const png = await readFile(new URL(`../${relativePath.replace(/^\.\//, '')}`, import.meta.url));
    if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('invalid signature');
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (relativePath === app.icon && (width !== 1024 || height !== 1024)) throw new Error(`app icon must be 1024x1024, found ${width}x${height}`);
    let offset = 8;
    while (offset + 12 <= png.length) {
      const length = png.readUInt32BE(offset);
      const end = offset + 12 + length;
      if (end > png.length) throw new Error('truncated chunk');
      const payload = png.subarray(offset + 4, offset + 8 + length);
      if (crc32(payload) !== png.readUInt32BE(offset + 8 + length)) throw new Error(`CRC mismatch in ${payload.subarray(0, 4).toString()}`);
      if (payload.subarray(0, 4).toString() === 'IEND') return;
      offset = end;
    }
    throw new Error('missing IEND chunk');
  } catch (error) {
    failures.push(`${relativePath}: ${error.message}`);
  }
}

if (pkg.version !== app.version) failures.push(`package version ${pkg.version} does not match Expo version ${app.version}`);
if (!/^\d+$/.test(app.ios?.buildNumber ?? '')) failures.push('iOS buildNumber must be a numeric string');
if (!Number.isSafeInteger(app.android?.versionCode) || app.android.versionCode < 1) failures.push('Android versionCode must be a positive integer');
await Promise.all([
  app.icon,
  app.ios?.icon,
  app.android?.adaptiveIcon?.foregroundImage,
  app.android?.adaptiveIcon?.monochromeImage,
  './assets/images/madger-splash.png',
].filter(Boolean).map(validatePng));
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId ?? '')) {
  const message = 'EAS projectId is not linked; run `eas init` from an authorized Expo account';
  (strict ? failures : warnings).push(message);
}

for (const [platform, variable] of [['Android', 'MADGER_ANDROID_DEVICE_QA'], ['iOS', 'MADGER_IOS_DEVICE_QA']]) {
  if (process.env[variable] !== 'passed') {
    const message = `${platform} physical-device QA is not attested; set ${variable}=passed only after completing mobile/RELEASE_CHECKLIST.md`;
    (strict ? failures : warnings).push(message);
  }
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
for (const failure of failures) console.error(`BLOCKED: ${failure}`);
if (failures.length) process.exit(1);
console.log(`Validated MADGER mobile ${app.version} source metadata (iOS ${app.ios.buildNumber}, Android ${app.android.versionCode}).`);
if (!strict) console.log('Source-ready check passed. Use `npm run release:distribution` for signed-release gates.');
