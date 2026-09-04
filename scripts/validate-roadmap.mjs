import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const html = await readFile('roadmap.html', 'utf8');
assert.equal((html.match(/<h1\b/g) || []).length, 1);
for (const term of ['Foundation', 'Readiness', 'Distribution', 'Expansion', 'proposed execution guidance', 'not announced products', 'MADGER_Roadmap_2026_2026-09-03.pdf']) assert.ok(html.includes(term), term);
assert.ok(html.includes('rel="canonical" href="https://madgercoin.com/roadmap"'));
assert.ok(html.includes('src="/assets/madger_official_logo_transparent_512.png"'));
assert.ok(!/madger_profile|madger_full_logo|guaranteed returns/i.test(html));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length,new Set(ids).size);
for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
for (const file of ['index.html','blog.html','litepaper.html','launch.html','official-links.html','collaborators.html']) assert.ok((await readFile(file,'utf8')).includes('href="/roadmap"'),file);
for (const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  if (url.startsWith('#')) {assert.ok(ids.includes(url.slice(1)));continue;}
  if (!url.startsWith('/')) continue;
  let file=url.split('?')[0].slice(1) || 'index.html';
  if (!file.includes('.')) file += '.html';
  if (file.startsWith('assets/')) file=file.slice(7);
  await access(file);
}
const pdf=await readFile('MADGER_Roadmap_2026_2026-09-03.pdf');
assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
console.log('Roadmap stages, qualifications, official logo, PDF, metadata, anchors and entry-point links verified.');
