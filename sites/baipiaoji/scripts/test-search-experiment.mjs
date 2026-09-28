import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchExperiment as plan, experimentDescription, limitCheckEntry} from './search-experiment.mjs';
const read = p => readFileSync(new URL('../dist/' + p, import.meta.url),'utf8');
const esc = s => s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
assert.deepEqual(plan.pages.filter(p=>p.cohort==='treatment').map(p=>p.path), ['/en/tools/fireworks','/en/tools/pixverse']);
for(const page of plan.pages) {
  const html = read(page.path.slice(1)+'.html');
  const title = html.match(/<title>(.*?)<\/title>/s)[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/)[1];
  assert.equal(title,page.baseline.metadata.title, page.path+' frozen title');
  assert.equal(description,page.description ? esc(page.description) : page.baseline.metadata.description, page.path+' assigned description');
  assert.ok(html.includes(`rel="canonical" href="https://baipiaoji.com${page.path}"`));
  assert.ok(html.includes('id="sources"') && html.includes('id="free-tier-limits"'));
}
const tools = JSON.parse(readFileSync(new URL('../data/tools.json',import.meta.url)));
for(const t of tools) {
  assert.equal(experimentDescription(t.slug,'zh','fallback'),'fallback');
  if(!['fireworks','pixverse'].includes(t.slug)) assert.equal(experimentDescription(t.slug,'en','fallback'),'fallback');
}
assert.equal(limitCheckEntry('zh','https://baipiaoji.com'),'');
assert.ok(!read('index.html').includes('id="limit-check"'));
const home=read('en/index.html');
for(const href of ['/en/c/api','/en/c/video','/en/publish-check']) assert.ok(home.includes(`href="https://baipiaoji.com${href}"`));
assert.ok(home.includes('data-home-block="limit-check"'));
console.log('PASS: two English descriptions only; frozen cohort titles and controls; three real homepage destinations');
