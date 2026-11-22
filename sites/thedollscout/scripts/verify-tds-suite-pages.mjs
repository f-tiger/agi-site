import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TDS_HOME_TOOL_COUNT } from '../collector-assets/tds-suite/service.mjs';
import { TDS_TOOLS, runTdsTool } from '../collector-assets/tds-suite/index.mjs';

const output = path.resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const read = (file) => fs.readFileSync(path.join(output,file),'utf8');
const origin = 'https://thedollscout.com';
const assets = 'collector-assets/tds-suite';
const locales = {de:'/de',en:'',zh:'/zh'};
const m = JSON.parse(read(assets+'/manifest.json'));
const all = new Set(m.pages.map(page => page.url));
const sitemap = read('/sitemap.xml');
const llms = read('/llms.txt');
assert.equal(m.count,TDS_HOME_TOOL_COUNT);
assert.equal(all.size,m.pages.length);
const discover = new Set(m.indexable);
assert.equal(discover.size,m.indexable.length);
assert.deepEqual(discover,new Set(m.pages.filter(page => page.discover).map(page => page.url)));
for (const item of m.pages) {
  const canonical = new URL(item.url);
  assert.equal(canonical.origin,origin);
  const html = read(canonical.pathname+'.html');
  assert.ok(html.includes(`rel="canonical" href="${item.url}"`),item.url);
  assert.ok(html.includes(`rel="alternate" type="text/plain" href="${origin+item.machine}"`),item.url);
  assert.ok(html.includes('lang="'+({de:'de',en:'en',zh:'zh-Hans'}[item.lang])+'"'),item.url);
  assert.ok(html.includes(`href="${origin}/de/${item.slug}"`),item.url);
  assert.ok(fs.existsSync(path.join(output,item.machine)),item.url);
  assert.equal(sitemap.includes(`<loc>${item.url}</loc>`),item.discover,item.url);
  assert.equal(html.includes('content="noindex,follow"'),!item.discover,item.url);
}
for (const [lang,prefix] of Object.entries(locales)) {
  const catalog = JSON.parse(read(`${assets}/catalog-${lang}.json`));
  assert.equal(catalog.count,TDS_TOOLS.length);
  assert.equal(catalog.tools.length,TDS_TOOLS.length);
  assert.equal(new Set(catalog.tools.map(tool=>tool.name)).size,TDS_TOOLS.length);
  assert.equal(new Set(catalog.tools.map(tool=>tool.path)).size,TDS_TOOLS.length);
  assert.equal(Object.values(catalog.categories).reduce((n,c)=>n+c.count,0),TDS_TOOLS.length);
  for (const entry of catalog.tools) {
    assert.ok(all.has(origin+entry.path),entry.path);
    assert.ok(entry.path.startsWith(prefix+'/ai-tools/'),entry.path);
    const html = read(entry.path+'.html');
    assert.ok(html.includes('data-tds-tool'),entry.path);
    assert.ok(html.includes('data-tds-result'),entry.path);
    assert.ok(html.includes('data-tds-example'),entry.path);
    const raw = /<script type="application\/json" data-tds-config>([\s\S]*?)<\/script>/.exec(html)?.[1];
    assert.ok(raw,entry.path);
    const config = JSON.parse(raw);
    assert.equal(config.locale,lang,entry.path);
    assert.equal(config.name,entry.name,entry.path);
    assert.doesNotThrow(()=>runTdsTool(config.name,config.example,config.locale),entry.path);
    assert.ok(!/data-tds-suite-entry/.test(html),entry.path);
  }
  const index = read(prefix+'/ai-tools.html');
  assert.ok(index.includes('data-tds-directory'));
  assert.equal([...index.matchAll(/class="tds-suite-card"/g)].length,24);
  for (const category of Object.values(catalog.categories)) {
    const html = read(category.url+'.html');
    assert.equal([...html.matchAll(/class="tds-suite-card"/g)].length,category.count);
    assert.ok(index.includes(`href="${category.url}"`));
  }
  assert.ok(llms.includes(origin+prefix+'/ai-tools'));
  assert.ok(llms.includes(origin+'/'+assets+'/catalog-'+lang+'.json'));
}
console.log(`TDS suite verified: ${m.count} distinct browser/MCP definitions, ${m.pages.length} localized pages, all ${TDS_HOME_TOOL_COUNT * Object.keys(locales).length} rendered examples execute, and ${discover.size} indexable pages.`);
