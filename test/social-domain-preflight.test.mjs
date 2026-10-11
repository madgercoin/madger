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

test('MADGER links require canonical HTTPS origins and standard ports', () => {
  for (const url of ['https://madgercoin.com/', 'https://madgercoin.com:443/buy?x=1', 'https://www.madgercoin.com:443/', 'madgercoin.com:443/buy']) {
    assert.doesNotThrow(() => validateMadgerLinks({ text: `Visit ${url}, join us!` }));
  }
  for (const url of ['https://madgercoin.com:444/', 'https://www.madgercoin.com:8080/', 'http://madgercoin.com/', 'http://www.madgercoin.com:80/', 'ftp://madgercoin.com/', 'ws://madgercoin.com/', '//madgercoin.com:444/', 'madgercoin.com:444/buy']) {
    for (const field of ['text', 'link', 'altText', 'artworkText']) {
      assert.throws(() => validateMadgerLinks({ [field]: url }), /HTTPS on the standard port 443/);
    }
  }
  assert.doesNotThrow(() => validateMadgerLinks({ websiteUrl: 'https://madgercoin.com:443/buy' }));
  assert.throws(() => validateMadgerLinks({ websiteUrl: 'https://madgercoin.com:444/' }), /standard port 443/);
  assert.doesNotThrow(() => validateMadgerLinks({ text: 'http://example.org:8080/article https://x.com/MadgerDaBadger' }));
});

test('WHATWG special-scheme forms retain their original protocol before validation', () => {
  for (const text of ['http:madgercoin.com', 'http:/madgercoin.com', String.raw`http:\madgercoin.com`, String.raw`http:\\madgercoin.com`, 'http:madgercoin.com:444', 'ftp:madgercoin.com', 'ws:madgercoin.com']) {
    for (const field of ['text', 'link', 'altText', 'artworkText']) {
      assert.throws(() => validateMadgerLinks({ [field]: text }), /HTTPS on the standard port 443/, text);
    }
  }
  for (const text of ['https:madgercoin.com', 'https:/madgercoin.com', String.raw`https:\madgercoin.com`, 'https:madgercoin.com:443/buy', 'http:example.org:8080/path']) {
    assert.doesNotThrow(() => validateMadgerLinks({ text }), text);
  }
  assert.throws(() => validateMadgerLinks({ text: 'https:madgerbadgercoin.com' }), /unapproved MADGER/);
});

test('review timestamps require real calendar dates and retain valid offsets', () => {
  for (const reviewedAt of ['2026-02-31T00:00:00Z', '2026-02-29T00:00:00Z', '1900-02-29T00:00:00Z', '2026-04-31T00:00:00+05:30', '2026-00-10T00:00:00Z', '2026-10-00T00:00:00Z', '2026-10-11T24:00:00Z', '2026-10-11T12:60:00Z', '2026-10-11T12:00:60Z']) {
    assert.throws(() => preflightPost({ artworkUrlReview: { ...review, reviewedAt } }, { mediaUrls: [media] }), /visual artwork URL check required/, reviewedAt);
  }
  for (const reviewedAt of ['2024-02-29T23:59:59Z', '2000-02-29T00:00:00Z', '2026-02-28T23:59:59.123Z', '2026-10-11T00:00:00+05:30', '2026-10-11T00:00:00-04:00', '2026-12-31T23:59:59+14:00']) {
    assert.doesNotThrow(() => preflightPost({ artworkUrlReview: { ...review, reviewedAt } }, { mediaUrls: [media] }), reviewedAt);
  }
});

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

test('ordinary prose punctuation allows canonical and third-party links without suffix bypasses', () => {
  for (const url of ['https://madgercoin.com', 'https://www.madgercoin.com/buy', 'https://x.com/MadgerDaBadger', 'https://instagram.com/madgercoin', 'https://youtube.com/@madger', 'https://example.org']) {
    for (const text of [`Visit ${url}, join us!`, `(${url})`, `[${url}]`, `${url}.`, `${url}!`, `${url};`]) {
      assert.doesNotThrow(() => validateMadgerLinks({ text }), text);
    }
  }
  for (const text of ['(https://madgercoin.com.evil.org)', 'https://madgercoin.com.evil.org,', 'https://madgercoin.com,evil.org', '(https://madgerbadgercoin.com)', 'https://madgerbadgercoin.com!']) {
    assert.throws(() => validateMadgerLinks({ text }), /unapproved MADGER/, text);
  }
});

test('owned website fields reject unsupported shapes instead of losing ownership context', () => {
  for (const field of ['websiteUrl', 'officialWebsite', 'madgerWebsiteUrl']) {
    for (const value of [['https://example.org'], { url: 'https://example.org' }, { nested: ['https://example.org'] }, ['https://madgercoin.com'], [], {}, null, false, 123]) {
      assert.throws(() => validateMadgerLinks({ posts: [{ [field]: value }] }), (error) => error.message.includes(field) && error.message.includes('single absolute HTTPS URL string'));
    }
    assert.doesNotThrow(() => validateMadgerLinks({ posts: [{ [field]: 'https://madgercoin.com/buy' }] }));
  }
});

test('encoded and ordinary URL credentials are rejected', () => {
  for (const text of ['https://mad%67ercoin.com@evil.org', 'https://user:password@example.org', 'https://user@madgercoin.com']) {
    assert.throws(() => validateMadgerLinks({ text }), /URL credentials are not allowed/);
  }
});

test('internal campaign identifiers are not scanned as published prose', () => {
  assert.doesNotThrow(() => validateMadgerLinks({ campaign: 'madger-weekly.json', campaignFile: 'social/madger-weekly.json', id: 'madger-weekly.json', text: 'Visit https://madgercoin.com, join us!' }));
  assert.throws(() => validateMadgerLinks({ campaign: 'madger-weekly.json', posts: { instagram: { text: 'madgerbadgercoin.com' } } }), /unapproved MADGER/);
});

test('known provider media buckets remain valid without allowing website claims', () => {
  for (const url of ['https://madger-assets.s3.amazonaws.com/post.jpg', 'https://madger-assets.s3.us-east-1.amazonaws.com/post.jpg', 'https://madger-assets.r2.dev/post.jpg']) {
    const artworkUrlReview = { ...review, mediaUrls: [url] };
    assert.doesNotThrow(() => preflightPost({ mediaUrl: url, artworkUrlReview }, { mediaUrls: [url] }));
    assert.doesNotThrow(() => preflightPost({ assets: [{ image: { url } }], artworkUrlReview }, { mediaUrls: [url] }));
    assert.throws(() => validateMadgerLinks({ websiteUrl: url }), /unapproved MADGER/);
  }
  assert.throws(() => validateMadgerLinks({ mediaUrl: 'https://madger-assets.s3.amazonaws.com.evil.org/post.jpg' }), /unapproved MADGER/);
});

test('media URLs and visual review timestamps require valid string types', () => {
  for (const url of [null, 123, {}, [], 'http://media.example/post.jpg', 'not-a-url', 'https://user@example.org/post.jpg']) {
    assert.throws(() => preflightPost({ artworkUrlReview: { ...review, mediaUrls: [url] } }, { mediaUrls: [url] }), /absolute HTTPS URL strings|URL credentials are not allowed/);
  }
  for (const reviewedAt of [123, ['2026-10-11T00:00:00Z'], '2026-10-11', 'invalid']) {
    assert.throws(() => preflightPost({ artworkUrlReview: { ...review, reviewedAt } }, { mediaUrls: [media] }), /visual artwork URL check required/);
  }
  assert.throws(() => preflightPost({ artworkUrlReview: { ...review, mediaUrls: [media, null] } }, { mediaUrls: [media] }), /visual artwork URL check required/);
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
