import {growthSlugs,projects,videos,affiliateUrl} from './growth-data.mjs';
import {AI_TOOLS,aiCopy} from './ai-copy.mjs';
import {utilityCopy,utilitySlugs} from './utility-copy.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { copy, languages, toolSlugs } from './copy.mjs';
import { HUB_TASKS } from '../../document-assets/hub-core.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), live = args.includes('--live'), output = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : root;
const origin = 'https://thedollscout.com', edition = '2026-09-25.8';
const localFile = route => path.join(output, route.replace(/^\//,'') + (route.endsWith('/') ? 'index.html' : path.extname(route) ? '' : '.html'));
const headers = { 'user-agent':'tds-document-probe/1.0', 'x-probe':'1' };
async function read(route, binary = false) {
  if (!live) return fs.readFileSync(localFile(new URL(route,origin).pathname), binary ? undefined : 'utf8');
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
assert.equal(manifest.edition,edition); assert.equal(manifest.records.length,57+growthSlugs.length*3);
const analyticsConfig = await read('/js/config.js?v=2026-10-01.1');
assert.ok(/ga4Id:\s*"G-2SEHFY33H8"/.test(analyticsConfig),'TDS retains its own existing GA4 stream');
const sitemap = await read('/sitemap.xml');
const documentSitemap = await read('/document-sitemap.xml');
assert.equal((documentSitemap.match(/<loc>/g)||[]).length,54+growthSlugs.length*3);
const titles = new Set();
for (const record of manifest.records) {
  const route = new URL(record.url).pathname, html = await read(route);
  assert.ok(html.includes(`data-document-edition="${edition}"`),'Old edition ' + route);
  assert.ok(html.includes(`rel="canonical" href="${record.url}"`),'Canonical ' + route);
  assert.equal((html.match(/<h1[ >]/g) || []).length,1,'One visible h1: ' + route);
  assert.ok(!/noindex|googletagmanager|\/js\/main\.js/.test(html),'Unexpected direct Google loader or indexing block ' + route);
  assert.equal((html.match(/src="\/js\/config\.js\?v=2026-10-01\.1"/g)||[]).length,1,'GA4 configuration: '+route);
  assert.equal((html.match(/src="\/document-assets\/analytics\.mjs\?v=2026-10-02\.1"/g)||[]).length,1,'One consent-gated GA4 loader: '+route);
  assert.ok(html.includes(`lang="${languages[record.lang].tag}"`));
  for (const [lang, data] of Object.entries(languages)) assert.ok(html.includes(`hreflang="${data.tag}" href="${origin + data.prefix}/${record.slug}"`),'Hreflang ' + route + ' ' + lang);
  assert.ok(html.includes('hreflang="x-default"'));
  assert.ok(sitemap.includes('<loc>' + record.url + '</loc>'),'Sitemap ' + route);
  assert.equal(sitemap.split('<loc>' + record.url + '</loc>').length - 1,1,'One sitemap entry: ' + route);
  assert.equal(documentSitemap.includes('<loc>'+record.url+'</loc>'),record.slug!=='collectors','Document sitemap scope '+route);
  assert.ok(html.includes('page-embed-html'),'Reusable public link '+route);
  if(Object.values(AI_TOOLS).includes(record.slug)){assert.ok(html.includes('id="ai-panel"')&&html.includes('id="ai-load"')&&html.includes('id="ai-method"'),'AI model controls and method '+route);assert.ok(!html.includes('preload" href="https://huggingface.co'),'No automatic model download');}
  if(Object.values(utilitySlugs).includes(record.slug)){assert.ok(html.includes('id="utility-form"')&&html.includes('id="worked-example"'),'Working tool and example '+route);}
  if(record.slug==='verify-file') assert.ok(html.includes('checksum-method'),'Independent verification method');
  const title = /<title>(.*?)<\/title>/.exec(html)[1];
  assert.ok(!titles.has(title),'Unique localized search title: ' + route); titles.add(title);
  for (const marker of ['og:locale','og:site_name','og:image:alt','twitter:title','page-share-url','data-copy-share="page"']) assert.ok(html.includes(marker), marker + ': ' + route);
  assert.ok(html.includes(record.url + '?via=share'),'Share only public page: ' + route);
  const plain = await read(new URL(record.textUrl).pathname);
  assert.ok(plain.includes(record.url) && plain.includes(copy[record.lang].maintained), 'Citable text: ' + route);
  const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
  assert.ok(ld[0]['@graph'].some(s => s['@type'] === (record.slug ? 'WebPage' : 'CollectionPage')));
  if (!record.slug) {
    assert.ok(html.includes('class="hub-hero outcome-hero"'), 'Outcome entry exists');
    assert.ok(html.includes('id="outcome-tasks-title"') && html.indexOf('id="outcome-tasks-title"') < html.indexOf('id="tools"'), 'Concrete tasks precede the full directory');
    assert.ok(html.includes(`${route}image-compressor?example=1#utility-result`), 'Localized runnable image example');
    assert.ok(html.includes(`${route}compare-pdf-text?example=1#results`), 'Localized runnable PDF example');
    assert.ok(!html.includes('type="file"') && !html.includes('id="workspace"'), 'Homepage is a directory: '+route);
    assert.ok(html.includes('data-document-mode="hub"'), 'Homepage mode: '+route);
    assert.ok(!ld[0]['@graph'].some(s=>s['@type']==='WebApplication'), 'Directory is not one application');
    const list=ld[0]['@graph'].find(s=>s['@type']==='ItemList');
    assert.equal(list.numberOfItems,Object.keys(HUB_TASKS).length);
    assert.deepEqual(list.itemListElement.map(s=>s.url),Object.values(HUB_TASKS).map(slug=>origin+route+slug));
    for (const [task,slug] of Object.entries(HUB_TASKS)) {
      assert.ok(html.includes(`data-hub-task="${task}" href="${route+slug}"`), 'Visible task destination: '+task);
      assert.ok(plain.includes(origin+route+slug), 'Same task in text: '+task);
    }
  }
  if (record.slug) assert.ok(ld[0]['@graph'].some(s => s['@type'] === 'BreadcrumbList'));
  if(growthSlugs.includes(record.slug)){
    assert.ok(!ld[0]['@graph'].some(s=>s['@type']==='WebApplication'),'External content is not a TDS app');
    const video=videos.find(v=>'videos/'+v.id===record.slug);
    if(video){const schema=ld[0]['@graph'].find(s=>s['@type']==='VideoObject');assert.equal(schema.creator.name,video.author);assert.equal(schema.uploadDate,video.date);assert.ok(html.includes('data-video-load="'+video.id+'"'));assert.ok(!/<iframe[^>]*src=/.test(html),'YouTube is opt-in');assert.ok(html.includes('https://www.youtube.com/watch?v='+video.youtube));}
    if(record.slug==='creator-kit')for(const kind of ['mic','light','storage'])assert.ok(html.includes(affiliateUrl(record.lang,kind).replaceAll('&','&amp;')),'Correct affiliate market');
  }
  if (record.slug.startsWith('learn/')) assert.ok(ld[0]['@graph'].some(s => s['@type'] === 'Article'));
  const tool = toolSlugs.indexOf(record.slug);
  if(tool>=0) {
    assert.ok(html.includes('id="worked-example"'),'Reproducible example '+route);
    assert.ok(html.includes('id="questions"'),'Tool-specific questions '+route);
    assert.ok(plain.includes(record.url+'#worked-example'),'Same public example in text '+route);
  }
  if (tool >= 0) for (const text of [copy[record.lang].useCases[tool],copy[record.lang].outputs[tool],copy[record.lang].limitations[tool]]) assert.ok(plain.includes(text),'Visible capabilities in text: ' + route);
  assert.deepEqual(JSON.parse(/<script id="document-copy" type="application\/json">(.*?)<\/script>/s.exec(html)[1]),copy[record.lang]);
  // All new document links must resolve in the actual release directory.
  if (!live) for (const m of html.matchAll(/href="([^"#]+)"/g)) {
    const u = new URL(m[1], origin + route);
    if (u.origin !== origin || u.pathname === '/llms.txt') continue;
    assert.ok(fs.existsSync(localFile(u.pathname)), 'Broken local link: ' + route + ' -> ' + u.pathname);
  }
}
for (const asset of ['analytics.mjs','tds-file-check-kit.zip','tds-file-check-kit.txt','growth.css','growth-app.mjs','growth-core.mjs','resource-library.json','ai-evaluation.json','ai-app.mjs','ai-core.mjs','ai-worker.mjs','ai.css','telemetry.mjs','utility-core.mjs','utility-app.mjs','utility.css','app.mjs','core.mjs','hub-core.mjs','hub.css','sharing.mjs','delivery.mjs','delivery-core.mjs','delivery.css','delivery-format.txt','verify.mjs','verify-core.mjs','verify.css','verify-format.txt','verify-file-cli.mjs','pdf-reader.mjs','style.css','favicon.svg','vendor/pdf.mjs','vendor/pdf.worker.mjs','vendor/LICENSE.txt','samples/sample-before.pdf','samples/sample-after.pdf','samples/sample-image.pdf']) assert.ok((await read('/document-assets/' + asset,true)).length > 100,asset);
const capabilities = JSON.parse(await read('/document-assets/tool-capabilities.json'));
const examples = JSON.parse(await read('/document-assets/sample-results.json'));
assert.equal(examples.documents.length,3);
assert.deepEqual(examples.documents.map(d=>d.pageCount),[2,3,1]);
assert.equal(examples.documents[2].pages[0].characters,0);
assert.deepEqual(examples.comparison.changes.map(c=>[c.kind,c.before,c.after]),[['changed',1,1],['added',null,2],['changed',2,3]]);
for(const doc of examples.documents) {
 const bytes=await read(new URL(doc.url).pathname,true);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),doc.sha256,'Public sample hash '+doc.kind);
 assert.equal(bytes.length,doc.size,'Public sample byte count '+doc.kind);
}
assert.equal(capabilities.edition,edition); assert.equal(capabilities.uploads,false); assert.equal(capabilities.tools.length,30);
for (const tool of capabilities.tools) {
  const record = manifest.records.find(r => r.url === tool.url);
  assert.ok(record,'Document capability URL exists');
  const utilityTask=Object.keys(utilitySlugs).find(k=>utilitySlugs[k]===record.slug);
  const aiTask=Object.keys(AI_TOOLS).find(k=>AI_TOOLS[k]===record.slug);
  assert.equal(tool.output,aiTask?aiCopy[record.lang].tools[aiTask].intro:utilityTask?utilityCopy[record.lang].tools[utilityTask].intro:copy[record.lang].outputs[toolSlugs.indexOf(record.slug)]);
}
assert.ok((await read('/img/document-scout-brand.png',true)).length > 1000);
const brand = await read('/css/brand.css?v=' + edition);
assert.ok(brand.includes('--tds-accent: #e4002b') && brand.includes('Helvetica'), 'TDS brand foundation');
for (const css of ['/document-assets/style.css','/document-assets/archive.css','/css/main.css']) {
  const text = await read(css + '?v=' + edition);
  assert.ok(text.includes('/css/brand.css?v=' + edition), 'Shared TDS brand: ' + css);
  assert.ok(!/#116a72|#173c50|#f3f8fa/.test(text), 'Retired document palette: ' + css);
}
assert.ok((await read('/document-assets/favicon.svg')).includes('#e4002b'), 'Brand-matched document icon');
for (const file of ['/llms.txt','/llms-full.txt']) {
  const text = await read(file); assert.ok(text.startsWith('# TDS Document Scout')); assert.ok(text.includes('/pdf-batch-audit'));
}
if (live && !args.includes('--skip-events')) await import('./verify-events.mjs');

console.log(`Document Scout: ${manifest.records.length} localized pages, SEO, links, PDF runtime and brand assets verified (${live ? 'production' : 'build'}).`);
