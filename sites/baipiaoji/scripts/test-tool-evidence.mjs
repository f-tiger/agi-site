import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toolEvidence, evidenceSummary} from './tool-evidence.mjs';
const linkedOnly = {last_verified:'2026-09-27'};
assert.equal(toolEvidence(linkedOnly).free_tier_checked, null);
assert.match(evidenceSummary(linkedOnly, null, 'en'), /no separate check date/);
const fixture = {...linkedOnly, limits:{checked:'2026-08-12',paid:{checked:'2026-09-11'}}};
assert.deepEqual(toolEvidence(fixture, {checked:'2026-08-20'}), {free_tier_checked:'2026-08-12',paid_tier_checked:'2026-09-11',commercial_terms_checked:'2026-08-20',link_checked:'2026-09-27'});
for (const lang of ['zh','en']) {
  const prefix = lang==='zh' ? '' : 'en/';
  const dir = JSON.parse(readFileSync(new URL('../dist/'+prefix+'directory.json',import.meta.url)));
  for(const slug of ['kimi','grok','aider']) {
    const t=dir.tools.find(x=>x.slug===slug);
    const html=readFileSync(new URL('../dist/'+prefix+'tools/'+slug+'.html',import.meta.url),'utf8');
    assert.equal(t.evidence.link_checked,t.last_verified);
    assert.equal(t.evidence.free_tier_checked,t.verified_limit?.checked||null);
    assert.ok(t.citation_url.endsWith('/tools/'+slug+'#sources'));
    assert.ok(html.includes('id="sources"'));
    assert.ok(!html.includes('2-million-character')&&!html.includes('200 万字'));
    const schemas=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1]));
    const web=schemas.find(x=>x['@type']==='WebPage');
    const app=schemas.find(x=>x['@type']==='SoftwareApplication');
    assert.equal(web.lastReviewed,t.evidence.free_tier_checked||undefined);
    assert.equal(app.dateModified,undefined,'vendor app date must not equal our URL probe date');
    const faq=schemas.find(x=>x['@type']==='FAQPage');
    const a=faq.mainEntity.at(-1).acceptedAnswer.text;
    assert.match(a,lang==='zh'?/链接可达不代表/:/An available link does not/);
    for(const d of Object.values(t.evidence).filter(Boolean)) assert.ok(html.includes(d));
  }
}
console.log('PASS: content vs link dates, missing-review case, bilingual FAQ/schema/directory agreement');

// Validate the generated script, not a reimplementation of its QA rule.
const {runInNewContext} = await import('node:vm');
const home=readFileSync(new URL('../dist/en/index.html',import.meta.url),'utf8');
const analytics=[...home.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes('var bpjQaVisit'));
assert.ok(analytics);
for(const [pathname,search,expected] of [['/en/','',2],['/en/','?__ci=1',0],['/en/','?__probe=1',0],['/__probe/example','',0],['/en/','?qa=1',0],['/en/','?q=ci',2]]) {
  const sent=[]; const context={location:{hostname:'baipiaoji.com',pathname,search},navigator:{sendBeacon:(u,b)=>sent.push(b)},document:{referrer:'https://www.google.com/',createElement:()=>({}),head:{appendChild(){}},addEventListener(){}},URL};
  context.window=context;runInNewContext(analytics,context);context.bpjEv('go','/go/kimi');assert.equal(sent.length,expected,pathname+search);
}
const raw=JSON.parse(readFileSync(new URL('../data/tools.json',import.meta.url)));
const zhDir=JSON.parse(readFileSync(new URL('../dist/directory.json',import.meta.url)));
const enDir=JSON.parse(readFileSync(new URL('../dist/en/directory.json',import.meta.url)));
for(const slug of ['grok','kimi','aider']) {
  const zh=zhDir.tools.find(x=>x.slug===slug),en=enDir.tools.find(x=>x.slug===slug),source=raw.find(x=>x.slug===slug);
  assert.deepEqual(zh.evidence,en.evidence);
  assert.equal(zh.evidence.free_tier_checked,source.limits?.checked||null);
  const badge=readFileSync(new URL('../dist/badge/'+slug+'.svg',import.meta.url),'utf8');
  assert.ok(!badge.includes('已核实免费额度')&&!badge.includes('免费额度已核实'));
  assert.match(badge,/link checked/);
}
const {onRequestPost}=await import('../functions/api/mcp.js');
for(const lang of ['zh','en']) {
  const response=await onRequestPost({request:new Request('https://baipiaoji.com/api/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_ai_tools',arguments:{query:'kimi',lang}}})}),env:{ASSETS:{fetch:async u=>new Response(readFileSync(new URL('../dist'+u.pathname,import.meta.url)))}}});
  const msg=await response.json();assert.ok(!msg.result.isError,JSON.stringify(msg));
  const tool=JSON.parse(msg.result.content[0].text).tools[0];
  assert.deepEqual(tool.evidence,zhDir.tools.find(x=>x.slug==='kimi').evidence);
  assert.ok(tool.citation_url.endsWith('/tools/kimi#sources'));
}
console.log('PASS: generated QA beacon, original/bilingual dates, accessible badge text, actual MCP handler');
