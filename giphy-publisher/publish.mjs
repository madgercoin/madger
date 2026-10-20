import { readFile, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const localDate = (date, timeZone) => new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

export function validateQueue(queue) {
  if (queue.schemaVersion !== 1 || !Array.isArray(queue.items)) throw new Error('Invalid queue schema.');
  if (queue.expectedUsername !== 'MadgerDaBadger') throw new Error('Unexpected publishing destination.');
  const ids = new Set(), hashes = new Set();
  for (const item of queue.items) {
    if (!/^[a-z0-9-]{3,80}$/.test(item.id) || ids.has(item.id)) throw new Error('Duplicate or invalid queue ID.');
    if (!/^[a-f0-9]{64}$/.test(item.sha256) || hashes.has(item.sha256)) throw new Error('Duplicate or invalid asset hash.');
    if (!item.file?.startsWith('giphy-publisher/assets/') || item.file.includes('..')) throw new Error('Invalid asset path.');
    if (!Array.isArray(item.tags) || item.tags.length < 1 || item.tags.length > 20) throw new Error('Invalid tags.');
    if (item.tags.some(tag => typeof tag !== 'string' || tag.length > 50 || tag.includes(','))) throw new Error('Invalid tag value.');
    if (item.sourceUrl !== 'https://madgercoin.com' || item.approved !== true) throw new Error('Asset is not approved.');
    if (!Number.isFinite(Date.parse(item.publishAt))) throw new Error('Invalid publication date.');
    ids.add(item.id); hashes.add(item.sha256);
  }
}

const blockedStatuses = new Set(['reserved', 'uncertain', 'uploaded_unverified', 'rejected']);
export function selectItem(queue, records, now, mode, testId) {
  validateQueue(queue);
  const block = records.find(record => blockedStatuses.has(record.status));
  if (block) throw new Error(`Queue paused: ${block.id} has status ${block.status}; resolve the recorded outcome before another upload.`);
  const published = records.filter(record => record.status === 'published');
  const finishedIds = new Set(published.map(record => record.id));
  const finishedHashes = new Set(published.map(record => record.sha256));
  if (mode === 'test') {
    const item = queue.items.find(candidate => candidate.id === testId && candidate.test === true);
    if (!item) throw new Error('The requested test item is not approved.');
    if (finishedIds.has(item.id) || finishedHashes.has(item.sha256)) return null;
    return item;
  }
  if (mode !== 'scheduled') throw new Error('Invalid operation.');
  if (!queue.enabled) return null;
  const verification = published.find(record => record.test === true && record.owner?.toLowerCase() === queue.expectedUsername.toLowerCase());
  if (!verification) throw new Error('No API upload has verified ownership of the target channel.');
  if (published.some(record => !record.test && localDate(new Date(record.publishedAt), queue.timeZone) === localDate(now, queue.timeZone))) return null;
  return queue.items.filter(item => !item.test && Date.parse(item.publishAt) <= now.getTime()
    && !finishedIds.has(item.id) && !finishedHashes.has(item.sha256))
    .sort((a, b) => Date.parse(a.publishAt) - Date.parse(b.publishAt))[0] || null;
}

export async function publishItem({ item, queue, bytes, key, save, getGif, upload, now = () => new Date() }) {
  if (sha256(bytes) !== item.sha256) throw new Error('Asset integrity check failed.');
  if (!bytes.subarray(0, 6).toString().match(/^GIF8[79]a$/)) throw new Error('Asset is not a GIF.');
  if (bytes.length > 100 * 1024 * 1024) throw new Error('GIF exceeds the upload size limit.');
  const record = { schemaVersion: 1, id: item.id, sha256: item.sha256, file: item.file,
    title: item.title, test: item.test === true, scheduledFor: item.publishAt,
    expectedOwner: queue.expectedUsername, status: 'reserved', reservedAt: now().toISOString(),
    runId: process.env.GITHUB_RUN_ID || 'local-test' };
  // This must be durable before sending the request. An uncertain upload is never blindly repeated.
  await save(record);
  let result;
  try {
    result = await upload({ item, bytes, key });
  } catch (error) {
    record.status = error.definitelyRejected ? 'rejected' : 'uncertain';
    record.httpStatus = error.httpStatus || null;
    record.updatedAt = now().toISOString();
    await save(record);
    throw new Error(`Upload ${record.status}; outcome recorded. No automatic duplicate retry will occur.`);
  }
  record.gifId = result.id;
  record.gifUrl = `https://giphy.com/gifs/${result.id}`;
  record.status = 'uploaded_unverified';
  record.updatedAt = now().toISOString();
  await save(record);
  let gif;
  try { gif = await getGif(result.id, key); } catch { /* preserve the uploaded ID for reconciliation */ }
  const owner = gif?.user?.username || gif?.username || null;
  record.owner = owner;
  if (owner?.toLowerCase() !== queue.expectedUsername.toLowerCase()) {
    await save(record);
    throw new Error(`Uploaded GIF ${result.id} is not verified on ${queue.expectedUsername}. Queue paused; saved GIF ID prevents duplicates.`);
  }
  record.status = 'published';
  record.publishedAt = now().toISOString();
  await save(record);
  return record;
}

class StateStore {
  constructor(repository, token, branch, baseSha) {
    if (repository !== 'madgercoin/madger' || branch !== 'giphy-publisher-state') throw new Error('Unexpected state destination.');
    this.root = `https://api.github.com/repos/${repository}`;
    this.token = token; this.branch = branch; this.baseSha = baseSha;
  }
  async api(path, method = 'GET', body) {
    let response;
    try {
      response = await fetch(this.root + path, { method, headers: {
        Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json',
      }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
    } catch { throw new Error('GitHub state storage is unavailable.'); }
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub state storage returned HTTP ${response.status}.`);
    return response.status === 204 ? {} : response.json();
  }
  async init() {
    if (!await this.api(`/git/ref/heads/${this.branch}`)) {
      await this.api('/git/refs', 'POST', { ref: `refs/heads/${this.branch}`, sha: this.baseSha });
    }
  }
  async records() {
    const listing = await this.api(`/contents/giphy-publisher-ledger?ref=${this.branch}`);
    if (!listing) return [];
    if (!Array.isArray(listing)) throw new Error('Invalid publication ledger.');
    return Promise.all(listing.filter(file => file.name.endsWith('.json')).map(async file => {
      const result = await this.api(`/contents/${file.path}?ref=${this.branch}`);
      return JSON.parse(Buffer.from(result.content, 'base64').toString('utf8'));
    }));
  }
  async save(record) {
    const path = `/contents/giphy-publisher-ledger/${record.id}.json`;
    const existing = await this.api(`${path}?ref=${this.branch}`);
    await this.api(path, 'PUT', { message: `GIPHY ${record.id}: ${record.status}`,
      branch: this.branch, content: Buffer.from(JSON.stringify(record, null, 2) + '\n').toString('base64'),
      ...(existing ? { sha: existing.sha } : {}) });
  }
}

async function uploadGif({ item, bytes, key }) {
  const form = new FormData();
  form.set('api_key', key);
  form.set('file', new Blob([bytes], { type: 'image/gif' }), `${item.id}.gif`);
  form.set('tags', item.tags.join(','));
  form.set('source_post_url', item.sourceUrl);
  // Beta keys do not support username. Ownership is checked from the created GIF.
  let response;
  try { response = await fetch('https://upload.giphy.com/v1/gifs', { method: 'POST', body: form, signal: AbortSignal.timeout(90000) }); }
  catch { throw new Error('Upload request outcome is uncertain.'); }
  if (!response.ok) {
    const error = new Error('GIPHY rejected the upload.');
    error.httpStatus = response.status;
    error.definitelyRejected = response.status >= 400 && response.status < 500;
    throw error;
  }
  let body;
  try { body = await response.json(); } catch { throw new Error('Upload response could not be parsed.'); }
  if (!/^[a-zA-Z0-9]+$/.test(body.data?.id || '')) throw new Error('Upload response did not include a GIF ID.');
  return { id: body.data.id };
}

async function getGif(id, key) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = new URL(`https://api.giphy.com/v1/gifs/${id}`);
    url.searchParams.set('api_key', key);
    let response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(15000) }); }
    catch { if (attempt === 5) throw new Error('GIF verification unavailable.'); }
    if (response?.ok) {
      const body = await response.json();
      if (body.data?.user?.username || body.data?.username) return body.data;
      if (attempt === 5) return body.data;
    }
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error('Uploaded GIF could not be verified.');
}

async function main() {
  const queue = JSON.parse(await readFile('giphy-publisher/queue.json', 'utf8'));
  const request = JSON.parse(await readFile('giphy-publisher/request.json', 'utf8'));
  validateQueue(queue);
  const mode = process.env.GITHUB_EVENT_NAME === 'schedule' ? 'scheduled' : request.operation;
  const key = process.env.GIPHY_API_KEY?.trim();
  if (!key) throw new Error('GIPHY_API_KEY repository Actions secret is missing.');
  const store = new StateStore(process.env.GITHUB_REPOSITORY, process.env.GITHUB_TOKEN,
    'giphy-publisher-state', process.env.GITHUB_SHA);
  await store.init();
  const records = await store.records();
  const item = selectItem(queue, records, new Date(), mode, request.itemId);
  if (!item) { console.log('No approved GIF is due. Previously published items are skipped.'); return; }
  const path = resolve(item.file);
  const within = relative(resolve('giphy-publisher/assets'), path);
  if (within.startsWith('..') || isAbsolute(within)) throw new Error('Asset is outside the approved directory.');
  const record = await publishItem({ item, queue, bytes: await readFile(path), key,
    save: record => store.save(record), getGif, upload: uploadGif });
  console.log(`Published ${record.title}: ${record.gifUrl}`);
  console.log(`Verified channel: ${record.owner}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY,
      `## GIPHY publication\n\n[${record.title}](${record.gifUrl})\n\nVerified channel: @${record.owner}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
