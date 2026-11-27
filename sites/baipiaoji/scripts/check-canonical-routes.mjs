import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {canonicalUrls} from './canonical-urls.mjs';
assert.equal(canonicalUrls('https://baipiaoji.com/en/index.html https://baipiaoji.com/tools/grok.html?x=1#cost https://other.example/x.html'), 'https://baipiaoji.com/en/ https://baipiaoji.com/tools/grok?x=1#cost https://other.example/x.html');
const files=[];function walk(dir){for(const x of readdirSync(dir,{withFileTypes:true})){const p=join(dir,x.name);x.isDirectory()?walk(p):files.push(p);}}walk('dist');
let checked=0;
for(const file of files.filter(p=>p.endsWith('.html'))){
 const text=readFileSync(file,'utf8'),match=text.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
 if(!match)continue;
 const url=new URL(match[1]);assert.equal(url.hostname,'baipiaoji.com',file);
 assert.ok(!url.pathname.endsWith('.html'),file+' canonical points at a redirect');
 const path=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname+'.html';
 assert.equal('dist'+path,file,file+' has a mismatched canonical');checked++;
 for(const m of text.matchAll(/<link[^>]+hreflang="[^"]+"[^>]+href="([^"]+)"/g))assert.ok(!new URL(m[1]).pathname.endsWith('.html'),file+' hreflang redirect');
}
const sitemap=readFileSync('dist/sitemap.xml','utf8');
for(const [,loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)){
 const p=new URL(loc).pathname;assert.ok(!p.endsWith('.html'),loc);
 assert.ok(existsSync('dist'+(p.endsWith('/')?p+'index.html':p+'.html')),loc+' missing page');
}

const origin = 'https://baipiaoji.com';
const limits = JSON.parse(readFileSync('dist/limits.json', 'utf8'));
assert.ok(limits.tools.some(tool => tool.source && /^\d{4}-\d{2}-\d{2}$/.test(tool.checked)), 'Local free-tier data includes sourced, dated records');

for (const prefix of ['', '/en']) {
 const canonical = `${origin}${prefix}/`;
 const mirror = `${canonical}index.md`;
 const html = readFileSync(`dist${prefix}/index.html`, 'utf8');
 const markdown = readFileSync(`dist${prefix}/index.md`, 'utf8');
 assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), `${canonical} self-canonical`);
 assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), `${canonical} in sitemap`);
 assert.ok(!sitemap.includes(`<loc>${mirror}</loc>`), `${mirror} excluded from the HTML sitemap`);

 const head = html.split('</head>', 1)[0];
 for (const [lang, url] of [['zh-Hans', `${origin}/`], ['en', `${origin}/en/`], ['x-default', `${origin}/`]]) {
  assert.ok(head.includes(`<link rel="alternate" hreflang="${lang}" href="${url}">`), `${canonical} ${lang} alternate`);
 }
 const mirrors = [...head.matchAll(/<link rel="alternate" type="text\/markdown" href="([^"]+)">/g)].map(([,url]) => url);
 assert.deepEqual(mirrors, [mirror], `${canonical} has exactly one localized Markdown alternate`);

 const schema = [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(([, json]) => JSON.parse(json)).flatMap(node => node['@graph'] || [node]);
 const website = schema.find(node => node['@type'] === 'WebSite');
 assert.equal(website?.potentialAction?.['@type'], 'SearchAction', `${canonical} WebSite search action`);
 assert.equal(website.potentialAction.target?.urlTemplate, `${canonical}?q={search_term_string}`);
 const dataset = schema.find(node => node['@type'] === 'Dataset');
 for (const name of prefix ? ['Official source', 'Check date'] : ['官方来源', '核实日期']) {
  assert.ok(dataset?.variableMeasured?.some(field => field.name === name), `${canonical} Dataset field ${name}`);
 }
 assert.ok(dataset.distribution?.some(asset => asset.encodingFormat === 'application/json' && asset.contentUrl === `${origin}/limits.json`), `${canonical} Dataset points to the local limits feed`);

 const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
 const headings = [...main.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
 assert.equal(headings.length, 1, `${canonical} has one main heading`);
 assert.ok(headings[0][1].replace(/<[^>]*>/g, '').trim(), `${canonical} main heading has text`);
 const verification = main.match(/<section\b[^>]*\sid="verification"[^>]*>([\s\S]*?)<\/section>/)?.[1];
 assert.ok(verification, `${canonical} has a visible verification section`);
 const htmlLinks = [...verification.matchAll(/\bhref="([^"]+)"/g)].map(([,href]) => new URL(href, canonical).href);
 const markdownLinks = [...markdown.matchAll(/\]\(([^)]+)\)/g)].map(([,href]) => new URL(href, canonical).href);
 assert.match(markdown, /^#[ \t]+\S/m, `${mirror} contains a Markdown heading`);
 for (const link of [`${origin}${prefix}/method`, `${origin}/limits.json`, `${origin}${prefix}/changes`]) {
  assert.ok(htmlLinks.includes(link), `${canonical} verification links to ${link}`);
  assert.ok(markdownLinks.includes(link), `${mirror} links to ${link}`);
 }
}

assert.ok(checked>1000,'Unexpectedly incomplete build');console.log(`Canonical routes verified: ${checked} pages; sitemap targets and bilingual homepage evidence mirrors verified.`);
