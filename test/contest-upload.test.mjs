import assert from 'node:assert/strict';
import test from 'node:test';

const entryId = '123e4567-e89b-42d3-a456-426614174000';
const token = 'a'.repeat(64);
const fileSize = 81_700_000;
const storagePath = `${entryId}/large-entry.mp4`;

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.includes('/functions/v1/madger-video-contest')) throw new Error(`Unexpected fetch: ${url}`);
  const body = JSON.parse(init.body);
  assert.equal(body.action, 'verify_r2_upload');
  assert.equal(body.entry_id, entryId);
  assert.equal(body.upload_token, token);
  return Response.json({
    ok: true, entry_id: entryId, storage_path: storagePath,
    file_name: 'large-entry.mp4', file_size: fileSize,
    content_type: 'video/mp4', upload_complete: false,
  });
};

const { default: worker } = await import('../worker.generated.js');

function r2Mock() {
  const uploads = new Map();
  const objects = new Map();
  return {
    createMultipartUpload(key) {
      const uploadId = 'upload-1';
      uploads.set(uploadId, { key, parts: new Map() });
      return { uploadId };
    },
    resumeMultipartUpload(key, uploadId) {
      const upload = uploads.get(uploadId);
      assert.equal(upload?.key, key);
      return {
        async uploadPart(partNumber, body) {
          const size = (await new Response(body).arrayBuffer()).byteLength;
          upload.parts.set(partNumber, size);
          return { partNumber, etag: `etag-${partNumber}` };
        },
        async complete(parts) {
          assert.equal(parts.length, upload.parts.size);
          objects.set(key, [...upload.parts.values()].reduce((sum, size) => sum + size, 0));
        },
        async abort() { uploads.delete(uploadId); },
      };
    },
    async head(key) {
      const size = objects.get(key);
      return size === undefined ? null : { size, etag: 'complete', httpEtag: '"complete"' };
    },
    async delete(key) { objects.delete(key); },
  };
}

const request = (path, init = {}) => worker.fetch(new Request(`https://madgercoin.com${path}`, init), {
  CONTEST_VIDEOS: r2,
  ASSETS: { fetch: () => new Response('not found', { status: 404 }) },
});
const r2 = r2Mock();

test('multipart R2 route accepts and verifies an 81.7 MB contest video', async () => {
  const startResponse = await request('/api/contest-upload/init', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ entry_id: entryId, upload_token: token }),
  });
  const start = await startResponse.json();
  assert.equal(startResponse.status, 200);
  assert.equal(start.part_size, 16 * 1024 * 1024);

  const parts = [];
  for (let offset = 0, partNumber = 1; offset < fileSize; offset += start.part_size, partNumber += 1) {
    const size = Math.min(start.part_size, fileSize - offset);
    const query = new URLSearchParams({ entry_id: entryId, upload_id: start.upload_id, part_number: String(partNumber) });
    const response = await request(`/api/contest-upload/part?${query}`, {
      method: 'PUT', headers: { 'x-upload-token': token, 'content-type': 'application/octet-stream' },
      body: new Uint8Array(size),
    });
    const result = await response.json();
    assert.equal(response.status, 200);
    parts.push({ partNumber: result.part_number, etag: result.etag });
  }

  const completeResponse = await request('/api/contest-upload/complete', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ entry_id: entryId, upload_token: token, upload_id: start.upload_id, parts }),
  });
  const complete = await completeResponse.json();
  assert.equal(completeResponse.status, 200);
  assert.equal(complete.size, fileSize);

  const statusResponse = await request(`/api/contest-upload/status?entry_id=${entryId}`, {
    headers: { 'x-upload-token': token },
  });
  const status = await statusResponse.json();
  assert.equal(statusResponse.status, 200);
  assert.equal(status.size, fileSize);
});
