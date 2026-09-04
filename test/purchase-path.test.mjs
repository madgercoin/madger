import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import worker from '../worker.generated.js';

const mint = 'BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv';
const home = await readFile('index.html', 'utf8');
const guide = await readFile('buy.html', 'utf8');
const script = await readFile('script.js', 'utf8');
const homeCss = await readFile('home-v2.css', 'utf8');

test('hero banner retains its full landscape composition at responsive widths', () => {
  assert.match(home, /madger_social_share_v10\.jpg" width="1200" height="630"/);
  const imageRule = homeCss.match(/\.image-frame img\{([^}]+)\}/)?.[1];
  assert.ok(imageRule);
  assert.match(imageRule, /width:100%;height:auto;/);
  assert.match(imageRule, /aspect-ratio:1200\/630;/);
  assert.match(imageRule, /object-fit:contain;/);
  assert.doesNotMatch(imageRule, /object-fit:cover/);
  assert.match(homeCss, /\.hero-art\{min-width:0;width:100%;position:relative\}/);
  assert.match(home, /home-v2\.css\?v=20260903-image-fit/);
});

test('all purchase links are fixed SOL-to-MADGER links without financial presets', () => {
  for (const [name, html, count] of [['home', home, 2], ['guide', guide, 1]]) {
    const links = [...html.matchAll(/<a\b[^>]*href="(https:\/\/raydium\.io\/swap\/[^\"]*)"[^>]*>/g)];
    assert.equal(links.length, count, name);
    for (const [tag, href] of links) {
      const url = new URL(href.replaceAll('&amp;', '&'));
      assert.equal(url.origin, 'https://raydium.io');
      assert.equal(url.pathname, '/swap/');
      assert.deepEqual([...url.searchParams.keys()].sort(), ['inputMint', 'outputMint']);
      assert.equal(url.searchParams.get('inputMint'), 'sol');
      assert.equal(url.searchParams.get('outputMint'), mint);
      assert.match(tag, /rel="noopener noreferrer"/);
    }
  }
  assert.match(home, /href="\/buy"/);
  assert.ok(!home.includes('raydium.io/liquidity-pools/'));
});

test('guide is useful without scripts and includes failure/risk information', () => {
  assert.ok(guide.includes(`<code id="mint-address">${mint}</code>`));
  assert.match(guide, /Do not send SOL to this mint/);
  assert.match(guide, /lose the full amount/);
  assert.match(guide, /price impact/);
  assert.match(guide, /minimum received/);
  assert.match(guide, /before retrying/i);
  assert.match(guide, /aria-live="polite"/);
  assert.equal((guide.match(/<details>/g) || []).length, 4);
  assert.ok(!/<iframe|<form|<input|src="https:/i.test(guide));
});

for (const clipboardMode of ['success', 'denied', 'unavailable']) {
  test(`copy mint: ${clipboardMode}`, async () => {
    let click;
    let copied;
    const status = { textContent: '' };
    const button = { dataset: { copyTarget: 'mint-address' }, addEventListener: (_, fn) => { click = fn; } };
    const nodes = { '[data-copy-target]': button, '.copy-status': status, '#mint-address': { textContent: mint } };
    const context = {
      document: { querySelector: s => nodes[s] ?? null, querySelectorAll: () => [], documentElement: { scrollHeight: 1000, style: { setProperty() {} } } },
      window: { matchMedia: () => ({ matches: true }), innerHeight: 1000, scrollY: 0, addEventListener() {} },
      navigator: clipboardMode === 'unavailable' ? {} : { clipboard: { writeText: async value => { if (clipboardMode === 'denied') throw Error('denied'); copied = value; } } }
    };
    vm.runInNewContext(script, context);
    await click();
    assert.equal(status.textContent, clipboardMode === 'success' ? 'Official mint address copied.' : 'Copy unavailable. Select and copy the address above.');
    if (clipboardMode === 'success') assert.equal(copied, mint);
  });
}

test('guide route ignores hostile query parameters and serves secured HTML', async () => {
  const response = await worker.fetch(new Request('https://madgercoin.com/buy?outputMint=evil&redirect=https://evil.example'), {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), guide);
  for (const name of ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options']) assert.ok(response.headers.get(name));
  assert.equal(response.headers.get('cache-control'), 'no-cache');
});

test('guide canonical redirects, HEAD and unsupported methods', async () => {
  for (const path of ['/buy/', '/buy.html']) {
    const response = await worker.fetch(new Request(`https://madgercoin.com${path}?redirect=https://evil.example`), {});
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/buy');
  }
  const head = await worker.fetch(new Request('https://madgercoin.com/buy', { method: 'HEAD' }), {});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const post = await worker.fetch(new Request('https://madgercoin.com/buy', { method: 'POST' }), {});
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
});
