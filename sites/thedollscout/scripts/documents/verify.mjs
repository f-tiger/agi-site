import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { copy, languages, toolSlugs } from './copy.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), live = args.includes('--live'), output = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : root;
const origin = 'https://thedollscout.com', edition = '2026-09-25.4';
const localFile = route => path.join(output, route.replace(/^\//,'') + (route.endsWith('/') ? 'index.html' : path.extname(route) ? '' : '.html'));
const headers = { 'user-agent':'tds-document-probe/1.0', 'x-probe':'1' };
async function read(route, binary = false) {
  if (!live) return fs.readFileSync(localFile(route), binary ? undefined : 'utf8');
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const response = await fetch(origin + route, { headers, signal:AbortSignal.timeout(20000) });
      assert.equal(response.status,200,route);
      if (route.startsWith('/document-assets/') || route.endsWith('.png')) assert.ok(!response.headers.get('content-type')?.includes('text/html'),'Asset returned HTML: ' + route);
      return binary ? Buffer.from(await response.arrayBuffer()) : await response.text();
    } catch (error) { last = error; if (i < 3) await new Promise(resolve => setTimeout(resolve,3000)); }
  }
  throw last;
}
const manifest = JSON.parse(await read('/document-assets/manifest.json'));
assert.equal(manifest.edition,edition); assert.equal(manifest.records.length,33);
const sitemap = await read('/sitemap.xml');
const titles = new Set();
for (const record of manifest.records) {
  const route = new URL(record.url).pathname, html = await read(route);
  assert.ok(html.includes(`data-document-edition="${edition}"`),'Old edition ' + route);
  assert.ok(html.includes(`rel="canonical" href="${record.url}"`),'Canonical ' + route);
  assert.equal((html.match(/<h1[ >]/g) || []).length,1,'One visible h1: ' + route);
  assert.ok(!/noindex|googletagmanager|\/js\/main\.js/.test(html),'Unexpected analytics or indexing block ' + route);
  assert.ok(html.includes(`lang="${languages[record.lang].tag}"`));
  for (const [lang, data] of Object.entries(languages)) assert.ok(html.includes(`hreflang="${data.tag}" href="${origin + data.prefix}/${record.slug}"`),'Hreflang ' + route + ' ' + lang);
  assert.ok(html.includes('hreflang="x-default"'));
  assert.ok(sitemap.includes('<loc>' + record.url + '</loc>'),'Sitemap ' + route);
  assert.equal(sitemap.split('<loc>' + record.url + '</loc>').length - 1,1,'One sitemap entry: ' + route);
  const title = /<title>(.*?)<\/title>/.exec(html)[1];
  assert.ok(!titles.has(title),'Unique localized search title: ' + route); titles.add(title);
  for (const marker of ['og:locale','og:site_name','og:image:alt','twitter:title','page-share-url','data-copy-share="page"']) assert.ok(html.includes(marker), marker + ': ' + route);
  assert.ok(html.includes(record.url + '?via=share'),'Share only public page: ' + route);
  const plain = await read(new URL(record.textUrl).pathname);
  assert.ok(plain.includes(record.url) && plain.includes(copy[record.lang].maintained), 'Citable text: ' + route);
  const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
  assert.ok(ld[0]['@graph'].some(s => s['@type'] === 'WebPage'));
  if (record.slug) assert.ok(ld[0]['@graph'].some(s => s['@type'] === 'BreadcrumbList'));
  if (record.slug.startsWith('learn/')) assert.ok(ld[0]['@graph'].some(s => s['@type'] === 'Article'));
  const tool = toolSlugs.indexOf(record.slug);
  if (tool >= 0) for (const text of [copy[record.lang].useCases[tool],copy[record.lang].outputs[tool],copy[record.lang].limitations[tool]]) assert.ok(plain.includes(text),'Visible capabilities in text: ' + route);
  assert.deepEqual(JSON.parse(/<script id="document-copy" type="application\/json">(.*?)<\/script>/s.exec(html)[1]),copy[record.lang]);
  // All new document links must resolve in the actual release directory.
  if (!live) for (const m of html.matchAll(/href="([^"#]+)"/g)) {
    const u = new URL(m[1], origin + route);
    if (u.origin !== origin || u.pathname === '/llms.txt') continue;
    assert.ok(fs.existsSync(localFile(u.pathname)), 'Broken local link: ' + route + ' -> ' + u.pathname);
  }
}
for (const asset of ['app.mjs','core.mjs','sharing.mjs','pdf-reader.mjs','style.css','favicon.svg','vendor/pdf.mjs','vendor/pdf.worker.mjs','vendor/LICENSE.txt','samples/sample-before.pdf','samples/sample-after.pdf','samples/sample-image.pdf']) assert.ok((await read('/document-assets/' + asset,true)).length > 100,asset);
const capabilities = JSON.parse(await read('/document-assets/tool-capabilities.json'));
assert.equal(capabilities.edition,edition); assert.equal(capabilities.uploads,false); assert.equal(capabilities.tools.length,12);
for (const tool of capabilities.tools) {
  const record = manifest.records.find(r => r.url === tool.url);
  assert.ok(record,'Document capability URL exists');
  assert.equal(tool.output,copy[record.lang].outputs[toolSlugs.indexOf(record.slug)]);
}
assert.ok((await read('/img/document-scout-brand.png',true)).length > 1000);
const brand = await read('/css/brand.css');
assert.ok(brand.includes('--tds-accent: #e4002b') && brand.includes('Helvetica'), 'TDS brand foundation');
for (const css of ['/document-assets/style.css','/document-assets/archive.css','/css/main.css']) {
  const text = await read(css);
  assert.ok(text.includes('/css/brand.css?v=' + edition), 'Shared TDS brand: ' + css);
  assert.ok(!/#116a72|#173c50|#f3f8fa/.test(text), 'Retired document palette: ' + css);
}
assert.ok((await read('/document-assets/favicon.svg')).includes('#e4002b'), 'Brand-matched document icon');
for (const file of ['/llms.txt','/llms-full.txt']) {
  const text = await read(file); assert.ok(text.startsWith('# TDS Document Scout')); assert.ok(text.includes('/pdf-batch-audit'));
}
if (live) {
  const before = JSON.parse(await read('/api/document-stats'));
  assert.equal(before.ok,true); assert.equal(before.since,'2026-09-25');
  const response = await fetch(origin + '/api/doc-events', { method:'POST', headers:{ ...headers, origin, 'content-type':'application/json' }, body:JSON.stringify({ p:'/__ci/documents',e:'doc_ci' }), signal:AbortSignal.timeout(20000) });
  assert.equal(response.status,204,'Isolated CI event write');
  const after = JSON.parse(await read('/api/document-stats'));
  assert.ok((after.excluded.doc_ci || 0) > (before.excluded.doc_ci || 0),'CI event must be read back from D1');
  assert.ok(!('doc_ci' in after.events) && !('doc_sample' in after.events));
  console.log('Isolated CI event written and read back; excluded from document demand.');
}
console.log(`Document Scout: ${manifest.records.length} localized pages, SEO, links, PDF runtime and brand assets verified (${live ? 'production' : 'build'}).`);
