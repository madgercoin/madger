import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import worker from '../worker.generated.js';

const mint = 'BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv';
const home = await readFile('index.html', 'utf8');
const guide = await readFile('buy.html', 'utf8');
const script = await readFile('script.js', 'utf8');

const expectedDestinations = {
  raydium: `https://raydium.io/swap/?inputMint=sol&outputMint=${mint}`,
  jupiter: `https://jup.ag/swap?buy=${mint}&sell=So11111111111111111111111111111111111111112`,
  bonkbot: `https://t.me/bonkbot_bot?start=ref_7cien_ca_${mint}`,
  trojan: `https://t.me/achilles_trojanbot?start=r-burrowking-${mint}`,
};

test('homepage leads with the MADGER brand and usable community paths', () => {
  assert.match(home, /class="hero hero-showcase utility-first-hero"/);
  assert.match(home, /LIVE ON SOLANA · THE BURROW IS OPEN/);
  assert.match(home, /YOUR WAY INTO THE BURROW/);
  assert.match(home, /href="\/commons"><b>02<\/b><span>Use the Commons/);
  assert.match(home, /href="\/buy"/);
});

test('guide exposes four verified routes without financial presets', () => {
  for (const route of Object.keys(expectedDestinations)) assert.match(guide, new RegExp(`href="\\/r\\/${route}"`));
  assert.match(guide, /Buy on Raydium/);
  assert.match(guide, /Buy on Jupiter/);
  assert.match(guide, /Buy with BONKbot/);
  assert.match(guide, /Buy with Trojan/);
  assert.match(guide, /@bonkbot_bot/);
  assert.match(guide, /@achilles_trojanbot/);
  assert.doesNotMatch(guide, /[?&](amount|inputAmount|fixedAmount)=/i);
});

test('fixed buy redirects resolve only to approved destinations and log aggregate clicks', async () => {
  const events = [];
  const env = { FUNNEL_ANALYTICS: { writeDataPoint: point => events.push(point) } };
  for (const [route, expected] of Object.entries(expectedDestinations)) {
    const request = new Request(`https://madgercoin.com/r/${route}?utm_source=test&utm_medium=qa&utm_campaign=route_test&utm_content=${route}`);
    const response = await worker.fetch(request, env);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), expected);
  }
  assert.equal(events.length, 4);
  for (const event of events) {
    assert.equal(event.indexes[0], 'madger');
    assert.equal(event.blobs[0], 'outbound_buy_click');
    assert.equal(event.blobs[1], 'test');
    assert.equal(event.blobs[2], 'qa');
    assert.equal(event.blobs[3], 'route_test');
    assert.equal(event.doubles[0], 1);
  }
});

test('unknown redirect keys and hostile redirect parameters cannot create an open redirect', async () => {
  const unknown = await worker.fetch(new Request('https://madgercoin.com/r/evil?redirect=https://evil.example'), {});
  assert.equal(unknown.status, 404);
  const known = await worker.fetch(new Request('https://madgercoin.com/r/raydium?redirect=https://evil.example'), {});
  assert.equal(known.status, 302);
  assert.equal(known.headers.get('location'), expectedDestinations.raydium);
});

test('Proficy and Telegram campaign aliases carry fixed attribution into the buy guide', async () => {
  const cases = {
    'proficy-4h': '/buy?utm_source=proficy&utm_medium=paid_trending&utm_campaign=proficy_4h_test&utm_content=trending_slot',
    'proficy-12h': '/buy?utm_source=proficy&utm_medium=paid_trending&utm_campaign=proficy_12h_test&utm_content=trending_slot',
    'telegram-pin': '/buy?utm_source=telegram&utm_medium=community&utm_campaign=burrow_buy_pin&utm_content=pinned_message',
  };
  for (const [key, expected] of Object.entries(cases)) {
    const response = await worker.fetch(new Request(`https://madgercoin.com/c/${key}`), {});
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), expected);
  }
});

test('guide is useful without scripts and includes failure/risk information', () => {
  assert.ok(guide.includes(`<code id="mint-address">${mint}</code>`));
  assert.match(guide, /Do not send SOL to this mint/);
  assert.match(guide, /lose the full amount/);
  assert.match(guide, /price impact/);
  assert.match(guide, /minimum received/);
  assert.match(guide, /without cookies, wallet addresses, or personal identifiers/);
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

test('buy page preserves UTM query for attribution but ignores hostile redirect intent', async () => {
  const events = [];
  const env = { FUNNEL_ANALYTICS: { writeDataPoint: point => events.push(point) } };
  const response = await worker.fetch(new Request('https://madgercoin.com/buy?utm_source=proficy&utm_medium=paid_trending&utm_campaign=proficy_4h_test&redirect=https://evil.example'), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), guide);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].blobs.slice(0, 4), ['buy_page_view', 'proficy', 'paid_trending', 'proficy_4h_test']);
  for (const name of ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options']) assert.ok(response.headers.get(name));
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
