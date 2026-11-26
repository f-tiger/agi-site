import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {evaluateTool,tradeGroups} from '../lib/trade-workbench/engine.mjs';

const tools = tradeGroups.flatMap(group=>group.tools);
assert.equal(tradeGroups.length,5);
assert.equal(tools.length,100);
for (const group of tradeGroups) assert.equal(group.tools.length,20,group.id);
for (const key of ['id','zh','en']) assert.equal(new Set(tools.map(tool=>tool[key])).size,tools.length,key);
for (const tool of tools) {
  assert.match(tool.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert(tool.id.length<=60);
  assert(tool.inputs.length>=2 && tool.inputs.length<=8,tool.id);
  for (const [key] of tool.inputs) assert.match(key,/^[a-z][a-zA-Z0-9_]*$/);
  const source = new URL(tool.source[2]);
  assert.equal(source.protocol,'https:',tool.id);
  assert(!source.username && !source.password,tool.id);
  const input = Object.fromEntries(tool.inputs.map(([key,,,,value])=>[key,value]));
  evaluateTool(tool.id,input);
  assert.throws(()=>evaluateTool(tool.id,{...input,unknown_field:1}),RangeError,tool.id);
  const [key] = tool.inputs[0];
  assert.throws(()=>evaluateTool(tool.id,{...input,[key]:null}),RangeError,tool.id);
}
assert.throws(()=>evaluateTool('no-such-tool',{}),RangeError);
console.log('PASS 100 unique trade workflows execute with validated defaults and reject malformed input.');

const host = 'https://baipiaoji.com';
const base = '/studio/trade-tools/';
const prefixes = ['', '/en'];
const dist = fileURLToPath(new URL('../dist/',import.meta.url));
function inspectPage(html,prefix,tool) {
  const path = base+(tool?.id||'');
  assert(html.includes('rel="canonical" href="'+host+prefix+path+'"'),prefix+path+' canonical');
  assert(html.includes('href="'+host+(prefix ? '' : '/en')+path+'"'),prefix+path+' alternate');
  assert(!html.includes('name="robots" content="noindex'),prefix+path+' discovery');
  if (!tool) return;
  assert(html.includes('data-trade-form hidden'),path+' authenticated form');
  assert(html.includes('data-trade-result aria-labelledby="trade-result" hidden'),path+' no public result');
  assert(html.includes('tool=bpj-trade-toolbox#account-use'),path+' attributed membership');
  for (const [key] of tool.inputs) assert(html.includes('name="'+key+'" required'),path+' '+key);
  assert(html.includes(tool.source[2].replaceAll('&','&amp;')),path+' public official source');
  assert(!html.includes('/lib/trade-workbench/engine.mjs'),path+' no public engine');
}

if (process.argv.includes('--dist')) {
  const sitemap = readFileSync(dist+'sitemap.xml','utf8');
  assert(!existsSync(dist+'studio-assets/trade-workbench/engine.mjs'));
  for (const prefix of prefixes) {
    const root = dist+prefix.replace(/^\//,'');
    const directory = root+base;
    const catalog = JSON.parse(readFileSync(directory+'catalog.json','utf8'));
    assert.equal(catalog.execution,'registered_account_required');
    assert.deepEqual(catalog.categories.flatMap(group=>group.tools.map(tool=>tool.id)),tools.map(tool=>tool.id));
    const search = JSON.parse(readFileSync(root+'/search-index.json','utf8'));
    const linked = new Set(search.map(row=>row.u));
    const hub = readFileSync(directory+'index.html','utf8');
    inspectPage(hub,prefix);
    assert(sitemap.includes(`<loc>${host+prefix+base}</loc>`));
    for (const tool of tools) {
      const url = host+prefix+base+tool.id;
      assert(sitemap.includes(`<loc>${url}</loc>`),url+' sitemap');
      assert(linked.has(url),url+' search');
      assert(hub.includes('href="'+url+'"'),url+' directory');
      inspectPage(readFileSync(directory+tool.id+'.html','utf8'),prefix,tool);
    }
  }
  console.log('PASS 200 localized canonical tool pages, two directories, search, sitemap and source links.');
}

if (process.argv.includes('--live') || process.argv.includes('--live-smoke')) {
  const liveTools = process.argv.includes('--live') ? tools : tradeGroups.map(group=>group.tools[0]);
  const entries = prefixes.flatMap(prefix=>[null,...liveTools].map(tool=>[prefix,tool]));
  for (let offset=0;offset<entries.length;offset+=8) await Promise.all(entries.slice(offset,offset+8).map(async ([prefix,tool])=>{
    const url = host+prefix+base+(tool?.id||'');
    const response = await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'bpj-ci-selfcheck/1.0'}});
    assert.equal(response.status,200,url);
    assert.equal(response.url,url);
    inspectPage(await response.text(),prefix,tool);
  }));
  const response = await fetch(host+'/api/trade-workbench',{method:'POST',headers:{Origin:host,'Content-Type':'application/json'},body:JSON.stringify({id:tools[0].id,input:{}}),signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,401);
  assert.equal((await response.json()).code,'sign_in_required');
  console.log(`PASS ${entries.length} live canonical pages and direct unauthenticated execution rejected.`);
}
