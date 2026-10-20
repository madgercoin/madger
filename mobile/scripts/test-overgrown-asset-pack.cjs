/* Validate the committed Chrome PBR asset pack before an environment preview ships.
 * No network or paid asset-generation calls. The asset source tree remains canonical.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../public/blackroot');
const assets = path.join(root, 'assets');
const MAX_PACK_BYTES = 48 * 1024 * 1024;
const MAX_ASSET_BYTES = 16 * 1024 * 1024;

function contents() {
  const pack = fs.readFileSync(path.join(root, 'forest.pack'));
  assert(pack.byteLength >= 6, 'The asset pack is missing its index');
  assert(pack.byteLength <= MAX_PACK_BYTES, 'The browser pack exceeds its 48 MiB budget');
  const headerBytes = pack.readUInt32LE(0);
  assert(headerBytes > 1 && headerBytes <= 1024 * 1024, 'Invalid asset index size');
  assert(headerBytes + 4 <= pack.length, 'Asset index exceeds pack bounds');
  const entries = JSON.parse(pack.subarray(4, headerBytes + 4).toString('utf8'));
  assert(Array.isArray(entries) && entries.length >= 20 && entries.length < 500, 'Invalid asset inventory');
  return { pack, entries, bodyStart: 4 + headerBytes };
}

function validPath(name) {
  return typeof name === 'string'
    && name.length > 0
    && !name.includes('\\')
    && !name.startsWith('/')
    && name.split('/').every(part => part && part !== '.' && part !== '..');
}

test('forest pack has a complete, contiguous and byte-identical asset index', () => {
  const { pack, entries, bodyStart } = contents();
  const seen = new Set();
  let cursor = 0;
  for (const entry of entries) {
    assert(validPath(entry.path), 'Unsafe asset name: ' + entry.path);
    assert(!seen.has(entry.path), 'Duplicate asset name: ' + entry.path);
    seen.add(entry.path);
    assert(Number.isSafeInteger(entry.offset) && entry.offset === cursor, 'Noncontiguous offset: ' + entry.path);
    assert(Number.isSafeInteger(entry.length) && entry.length > 0 && entry.length <= MAX_ASSET_BYTES,
      'Invalid/mobile-hostile asset size: ' + entry.path);
    const file = path.join(assets, ...entry.path.split('/'));
    assert(fs.existsSync(file), 'Packed asset source is missing: ' + entry.path);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, entry.length, 'Packed length does not match source: ' + entry.path);
    assert(bytes.equals(pack.subarray(bodyStart + cursor, bodyStart + cursor + entry.length)),
      'Packed bytes differ from the source: ' + entry.path);
    cursor += entry.length;
  }
  assert.equal(bodyStart + cursor, pack.length, 'Pack contains truncated or trailing data');
  console.log('FOREST_PACK_AUDIT', JSON.stringify({ files: seen.size, bytes: pack.length }));
});

test('ground, bark and stone retain their required physically based texture channels', () => {
  const paths = new Set(contents().entries.map(entry => entry.path));
  for (const name of ['forest_ground_04', 'aerial_grass_rock', 'bark_brown_02']) {
    for (const channel of ['diff', 'nor_gl', 'rough']) {
      assert(paths.has(name + '/' + name + '_' + channel + '_1k.jpg'),
        'Missing ' + channel + ' PBR channel for ' + name);
    }
  }
  assert(paths.has('sunrise.hdr'), 'The physically lit environment map is missing');
  for (const name of ['fern_02', 'rock_face_02', 'dead_tree_trunk', 'rock_moss_set_01']) {
    assert(paths.has(name + '/' + name + '.gltf'), 'Missing imported glTF scan: ' + name);
  }
});

test('every glTF scan resolves its texture and geometry dependencies inside the pack', () => {
  const { pack, entries, bodyStart } = contents();
  const paths = new Set(entries.map(entry => entry.path));
  let models = 0;
  for (const entry of entries.filter(item => item.path.endsWith('.gltf'))) {
    models++;
    const bytes = pack.subarray(bodyStart + entry.offset, bodyStart + entry.offset + entry.length);
    const gltf = JSON.parse(bytes.toString('utf8'));
    assert(Array.isArray(gltf.meshes) && gltf.meshes.length > 0, 'glTF has no meshes: ' + entry.path);
    const directory = path.posix.dirname(entry.path);
    for (const resource of [...(gltf.buffers || []), ...(gltf.images || [])]) {
      if (!resource.uri || resource.uri.startsWith('data:')) continue;
      assert(!/^[a-z]+:\/\//i.test(resource.uri), 'Remote dependency: ' + entry.path);
      const resolved = path.posix.normalize(path.posix.join(directory, decodeURIComponent(resource.uri.split('?')[0])));
      assert(validPath(resolved) && paths.has(resolved),
        'Unpacked glTF dependency: ' + entry.path + ' -> ' + resource.uri);
    }
  }
  assert(models >= 4, 'Four physically scanned landmark/foliage meshes are expected');
});
