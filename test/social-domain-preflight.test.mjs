import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { MADGER_WEBSITE, preflightPost, validateMadgerLinks } from '../scripts/social-domain-preflight.mjs';

const media = 'https://media.example/post.jpg';
const review = { mediaUrls: [media], reviewedBy: 'Test reviewer', reviewedAt: '2026-10-11T00:00:00Z', website: MADGER_WEBSITE, confirmed: true };

test('canonical website, paths, www, case and third-party accounts remain allowed', () => {
  validateMadgerLinks({ text: 'MADGERCOIN.COM, https://www.madgercoin.com/buy?x=1 https://x.com/MadgerDaBadger https://www.instagram.com/madgercoin/ https://youtube.com/@madger https://example.org/article', mediaUrl: 'https://raw.githubusercontent.com/madgercoin/madger/main/image.jpg' });
  preflightPost({ artworkUrlReview: review }, { mediaUrls: [media] });
});

for (const bad of ['madgerbadgercoin.com', 'HTTPS://MADGERBADGERCOIN.COM/path', '//www.madgerbadgercoin.com', 'https://madgercoin.com.evil.org', 'https://madgercoin.com@evil.org', 'https://other-madger.net', 'https://news.madgercoin.com']) {
  test(`rejects unapproved brand host ${bad}`, () => {
    for (const field of ['text', 'link', 'altText', 'artworkText']) {
      assert.throws(() => validateMadgerLinks({ [field]: bad }, 'campaign-28'), (error) => error.message.includes('campaign-28') && error.message.includes(field) && error.message.includes(MADGER_WEBSITE));
    }
  });
}

test('nested assets and declared text are checked; explicit owned URLs reject unrelated hosts', () => {
  assert.throws(() => validateMadgerLinks({ assets: [{ image: { metadata: { altText: 'madgerbadgercoin.com' } } }] }), /assets\[0\].image.metadata.altText/);
  assert.throws(() => validateMadgerLinks({ artworkText: ['Join us', 'madgerbadgercoin.com'] }), /artworkText\[1\]/);
  assert.throws(() => validateMadgerLinks({ websiteUrl: 'https://example.org' }), /unapproved MADGER/);
  assert.throws(() => validateMadgerLinks({ websiteUrl: 'http://madgercoin.com' }), /HTTPS/);
});

test('media review is mandatory and bound to every exact asset URL', () => {
  for (const artworkUrlReview of [undefined, { ...review, confirmed: false }, { ...review, reviewedBy: '' }, { ...review, reviewedAt: 'bad' }, { ...review, mediaUrls: ['https://media.example/old.jpg'] }]) {
    assert.throws(() => preflightPost({ artworkUrlReview }, { mediaUrls: [media] }), /visual artwork URL check required/);
  }
  assert.throws(() => preflightPost({ artworkUrlReview: review }, { mediaUrls: [media, 'https://media.example/other.mp4'] }), /other.mp4/);
});

test('publish entry points reject a bad later entry before any network call', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'madger-preflight-'));
  const write = (name, value) => { const file = path.join(dir, name); fs.writeFileSync(file, JSON.stringify(value)); return file; };
  const manifest = write('manifest.json', { schemaVersion: 1, posts: [
    { id: 'good', enabled: true, publishNow: true, text: 'madgercoin.com', mediaUrl: media, artworkUrlReview: review },
    { id: 'bad', enabled: true, publishNow: true, text: 'madgerbadgercoin.com', mediaUrl: media, artworkUrlReview: review },
  ] });
  const campaign = write('campaign.json', { defaultText: 'madgercoin.com', posts: { instagram: { text: 'madgerbadgercoin.com' } }, artworkUrlReview: review });
  const channels = write('channels.json', { buffer: [] });
  const blocker = path.join(dir, 'block-network.mjs');
  fs.writeFileSync(blocker, "globalThis.fetch = () => { throw new Error('NETWORK_CALLED'); };\n");
  const run = (script, args = [], env = {}) => spawnSync(process.execPath, ['--import', pathToFileURL(blocker).href, script, ...args], { encoding: 'utf8', env: { ...process.env, BUFFER_API_TOKEN: 'test-only', BUFFER_API_KEY: 'test-only', ...env } });
  try {
    for (const mode of ['publish', 'publish-now']) {
      const result = run('scripts/buffer-automation.mjs', [mode, manifest]);
      assert.notEqual(result.status, 0); assert.match(result.stderr, /unapproved MADGER website host/); assert.doesNotMatch(result.stderr, /NETWORK_CALLED/);
    }
    const result = run('scripts/buffer_publish.mjs', [], { CAMPAIGN_FILE: campaign, CHANNELS_FILE: channels, ASSET_URL: media, DRY_RUN: 'true', OUTBOX_FILE: '' });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /unapproved MADGER website host/); assert.doesNotMatch(result.stderr, /NETWORK_CALLED/);
    const legacy = run('scripts/publish-launch-hunt-buffer.mjs');
    assert.notEqual(legacy.status, 0); assert.match(legacy.stderr, /visual artwork URL check required/); assert.doesNotMatch(legacy.stderr, /NETWORK_CALLED/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
