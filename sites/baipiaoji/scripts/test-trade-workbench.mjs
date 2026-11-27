import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {evaluateTool,tradeGroups} from '../lib/trade-workbench/engine.mjs';
import {TRADE_QUOTE_PATH} from './trade-pages.mjs';

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
const markdownAlternate = (html,url) => assert(html.match(/<head>[\s\S]*?<\/head>/)?.[0].includes(`type="text/markdown" href="${url}"`),url+' head Markdown alternate');
const guestCopy = prefix => prefix?'Guests get 2 web runs a day':'网页访客每天共';
const joinCopy = prefix => prefix?'Join free for 10 runs a day':'免费注册，解锁每天 10 次';
function inspectPage(html,prefix,tool) {
  const path = base+(tool?.id||'');
  const url = host+prefix+path;
  const quoteLink = `href="${host+prefix+TRADE_QUOTE_PATH}" data-bpj-next`;
  assert(html.includes('rel="canonical" href="'+url+'"'),prefix+path+' canonical');
  assert(html.includes(`hreflang="zh-Hans" href="${host+path}"`),prefix+path+' Chinese alternate');
  assert(html.includes(`hreflang="en" href="${host+'/en'+path}"`),prefix+path+' English alternate');
  assert(!html.includes('name="robots" content="noindex'),prefix+path+' discovery');
  assert(html.includes(`href="${host+prefix+base}mcp/"`),prefix+path+' MCP connection docs');
  assert(html.includes(joinCopy(prefix)),url+' free registration benefit');
  assert(html.includes(`${host+prefix}/account?next=${encodeURIComponent(prefix+path)}`),url+' signup returns to exact locale and tool');
  markdownAlternate(html,tool?url+'.md':url+'index.md');
  if (!tool) {
    assert(html.includes(guestCopy(prefix)),url+' guest web allowance');
    assert(html.match(/<head>[\s\S]*?<\/head>/)?.[0].includes(`type="application/json" href="${url}catalog.json"`),url+' head JSON alternate');
    assert(html.match(/<header class="trade-title">[\s\S]*?<\/header>/)?.[0].includes(quoteLink),url+' canonical quote link near the workbench title');
    return;
  }
  assert.equal(html.includes(quoteLink),tool.id==='fx-bank-quote-unit',url+' scoped quote handoff');
  if (tool.id==='fx-bank-quote-unit') assert(html.includes(prefix?'divide 1 by that result':'用 1 除以该结果'),url+' reciprocal direction');
  assert(html.includes(prefix?'Guests get 2 web runs a day across the workbench':'外贸工具网页访客每天共 2 次'),url+' visitor allowance across tools');
  assert(html.includes('data-trade-form hidden'),path+' form remains hidden until the live allowance is loaded');
  assert(html.includes('data-trade-result aria-labelledby="trade-result" hidden'),path+' no public result');
  assert(html.includes('tool=bpj-trade-toolbox#account-use'),path+' attributed membership');
  for (const [key] of tool.inputs) assert(html.includes('name="'+key+'" required'),path+' '+key);
  assert(html.includes(tool.source[2].replaceAll('&','&amp;')),path+' public official source');
  assert(!html.includes('/lib/trade-workbench/engine.mjs'),path+' no public engine');
  const application = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match=>JSON.parse(match[1])).find(node=>node['@type']==='WebApplication');
  assert.equal(application?.url,url,path+' application URL');
  assert.equal(application?.citation?.url,tool.source[2],path+' structured source');
  assert.equal(application?.subjectOf?.url,url+'.md',path+' structured reference');
}

if (process.argv.includes('--dist')) {
  const sitemap = readFileSync(dist+'sitemap.xml','utf8');
  assert(!existsSync(dist+'studio-assets/trade-workbench/engine.mjs'));
  const changed = JSON.parse(readFileSync(dist+'changed-canonical-urls.json','utf8'));
  const changedTrade = changed.filter(url=>prefixes.some(prefix=>new URL(url).pathname.startsWith(prefix+base)));
  assert(changedTrade.every(url=>!/\.(md|json)$/.test(url)),'workbench reference never sent to IndexNow');
  for (const prefix of prefixes) {
    const locale = prefix?1:0;
    const root = dist+prefix.replace(/^\//,'');
    const directory = root+base;
    const catalog = JSON.parse(readFileSync(directory+'catalog.json','utf8'));
    assert.equal(catalog.execution,'web_guest_or_account');
    assert.deepEqual(catalog.access,{
      web:{guest_daily_runs:2,free_account_daily_runs:10,linked_member_daily_runs:100,guest_may_share_network_quota:true},
      mcp:{scoped_account_key_required:true,shares_account_web_allowance:true},
      reset:'00:00 UTC',
    });
    const docsUrl = host+prefix+base+'mcp/';
    assert.equal(catalog.mcp_docs,docsUrl);
    assert(sitemap.includes(`<loc>${docsUrl}</loc>`),docsUrl+' public setup page indexed');
    assert(!sitemap.includes(`<loc>${docsUrl}keys/</loc>`),docsUrl+' key manager excluded from sitemap');
    assert(!changedTrade.includes(docsUrl+'keys/'),docsUrl+' key manager excluded from IndexNow');
    assert.match(readFileSync(directory+'mcp/keys/index.html','utf8'),/<meta name="robots" content="noindex\b/);
    const references = catalog.categories.flatMap(group=>group.tools);
    assert.deepEqual(references.map(tool=>tool.id),tools.map(tool=>tool.id));
    for (const group of catalog.categories) assert(group.tools.some(tool=>tool.example),group.id+' includes a worked example');
    const search = JSON.parse(readFileSync(root+'/search-index.json','utf8'));
    const linked = new Set(search.map(row=>row.u));
    const hub = readFileSync(directory+'index.html','utf8');
    const hubMirror = readFileSync(directory+'index.md','utf8');
    inspectPage(hub,prefix);
    const quoteReference = `](${host+prefix+TRADE_QUOTE_PATH})`;
    assert(hubMirror.includes(quoteReference),docsUrl+' localized canonical quote handoff');
    const mcpCopy = prefix?'MCP requires a scoped account key':'使用 MCP 需要账号专用密钥';
    assert(hubMirror.includes(guestCopy(prefix))&&hubMirror.includes(mcpCopy),docsUrl+' Markdown distinguishes web and MCP access');
    assert(sitemap.includes(`<loc>${host+prefix+base}</loc>`));
    for (const suffix of ['index.md','catalog.json']) assert(!sitemap.includes(`<loc>${host+prefix+base+suffix}</loc>`));
    for (const tool of tools) {
      const url = host+prefix+base+tool.id;
      const reference = references.find(item=>item.id===tool.id);
      const mirror = readFileSync(directory+tool.id+'.md','utf8');
      assert.equal(mirror.includes(quoteReference),tool.id==='fx-bank-quote-unit',url+' scoped Markdown quote handoff');
      if (tool.id==='fx-bank-quote-unit') assert(mirror.includes(prefix?'divide 1 by that result':'用 1 除以该结果'),url+' Markdown reciprocal direction');
      assert(sitemap.includes(`<loc>${url}</loc>`),url+' sitemap');
      assert(!sitemap.includes(`<loc>${url}.md</loc>`),url+' no indexed mirror duplicate');
      assert(linked.has(url),url+' search');
      assert(hub.includes('href="'+url+'"'),url+' directory');
      assert(hubMirror.includes(`](${url}.md)`),url+' browsable from Markdown directory');
      assert.equal(reference.markdown,url+'.md');
      assert.equal(reference.scope,tool.scope[locale]);
      assert.deepEqual(reference.source,{name:tool.source[locale],url:tool.source[2]});
      assert.deepEqual(reference.inputs,tool.inputs.map(([id,type,cn,en])=>({id,type,label:locale?en:cn})));
      const sample = Object.fromEntries(tool.inputs.map(([key,,,,value])=>[key,value]));
      const rows = evaluateTool(tool.id,sample);
      assert.deepEqual(reference.outputs,rows.map(row=>row[locale]));
      for (const part of [tool.purpose[locale],reference.scope,reference.source.name,reference.source.url,...reference.outputs,...reference.inputs.map(field=>field.label)]) assert(mirror.includes(part),url+' mirror '+part);
      assert(mirror.includes(`](${url})`),url+' mirror points to canonical');
      assert(mirror.includes(guestCopy(prefix))&&mirror.includes(mcpCopy),url+' Markdown distinguishes web and MCP access');
      if (reference.example) {
        assert.equal(reference.example.type,'illustrative');
        assert.deepEqual(reference.example.outputs,rows.map(row=>({label:row[locale],value:Array.isArray(row[2])?row[2][locale]:row[2]})));
        for (const {label,value} of reference.example.outputs) assert(mirror.includes(`${label} — ${value}`),url+' mirror output value');
      }
      inspectPage(readFileSync(directory+tool.id+'.html','utf8'),prefix,tool);
    }
  }
  console.log('PASS 200 localized canonical tool pages and Markdown evidence references, two directories, structured sources, search, sitemap and IndexNow boundaries.');
}

if (process.argv.includes('--live') || process.argv.includes('--live-smoke')) {
  const liveTools = process.argv.includes('--live') ? tools : tradeGroups.map(group=>group.tools[0]);
  const entries = prefixes.flatMap(prefix=>[null,...liveTools].map(tool=>[prefix,tool]));
  async function publishedPage(url) {
    // A new Pages deployment can briefly return a 404 from an older edge.
    const backoff = [0,1500,3000,6000,12000];
    for (const [attempt,delay] of backoff.entries()) {
      if (delay) await new Promise(resolve=>setTimeout(resolve,delay));
      const response = await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'bpj-ci-selfcheck/1.0'}});
      if (attempt===backoff.length-1 || ![404,429,502,503,504].includes(response.status)) return response;
      await response.body?.cancel();
    }
  }
  for (let offset=0;offset<entries.length;offset+=8) await Promise.all(entries.slice(offset,offset+8).map(async ([prefix,tool])=>{
    const url = host+prefix+base+(tool?.id||'');
    const response = await publishedPage(url);
    assert.equal(response.status,200,url);
    assert.equal(response.url,url);
    inspectPage(await response.text(),prefix,tool);
  }));
  await Promise.all(prefixes.map(async prefix=>{
    const url = host+prefix+base+tools[0].id+'.md';
    const response = await publishedPage(url);
    assert.equal(response.status,200,url);
    assert.match(response.headers.get('x-robots-tag')||'',/\bnoindex\b/i,url+' mirror noindex');
    assert((await response.text()).includes(url.slice(0,-3)),url+' live canonical reference');
  }));
  const response = await publishedPage(host+'/api/trade-workbench');
  assert.equal(response.status,200);
  const visitor = await response.json();
  assert.equal(visitor.ok,true);
  assert.equal(visitor.access,'guest');
  assert.equal(visitor.limit,2);
  assert(Number.isInteger(visitor.remaining)&&visitor.remaining>=0&&visitor.remaining<=visitor.limit);
  assert.equal(visitor.checkout.ready,false);
  console.log(`PASS ${entries.length} live canonical pages and read-only guest allowance status.`);
}
