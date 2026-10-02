import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet} from '../functions/api/tools.js';
import {onRequestPost} from '../functions/api/mcp.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const raw=JSON.parse(read('data/tools.json'));
const additions=raw.filter(t=>t.catalog_status==='discovery');
assert.ok(additions.length>0);
assert.equal(new Set(raw.map(t=>t.slug)).size,raw.length);
const sitemap=read('dist/sitemap.xml');
for(const lang of ['zh','en']) {
 const dir=lang==='en'?'en/':'';
 const data=JSON.parse(read('dist/'+dir+'directory.json'));
 assert.equal(data.count,raw.length);
 const search=JSON.parse(read('dist/'+dir+'search-index.json'));
 for(const t of additions) {
  assert.equal(t.link_status,200);
  assert.ok(t.last_verified && t.catalog_source?.license_url);
  assert.ok(!t.limits && !t.affiliate);
  assert.ok(t.tags.every(x=>!['完全免费','免费额度','国内直连'].includes(x)));
  const record=data.tools.find(x=>x.slug===t.slug);
  assert.equal(record.pricing_status,'unverified');
  assert.equal(record.verified_limit,null);
  assert.equal(record.fully_free,false);
  assert.equal(record.evidence.free_tier_checked,null);
  assert.ok(JSON.stringify(search).includes('/tools/'+t.slug));
  const html=read('dist/'+dir+'tools/'+t.slug+'.html');
  assert.match(html,/<meta name="robots" content="noindex,follow">/);
  assert.match(html,/id="sources"/);
  assert.ok(!sitemap.includes('/tools/'+t.slug+'<'));
  for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
   const schema=JSON.parse(m[1]);
   if(schema['@type']==='SoftwareApplication') {
    assert.equal(schema.offers,undefined);
    assert.equal(schema.isAccessibleForFree,undefined);
   }
  }
 }
 const env={ASSETS:{fetch:async u=>new Response(read('dist'+u.pathname))}};
 const sample=additions.at(-1);
 const response=await onRequestGet({request:new Request(`https://baipiaoji.com/api/tools?slug=${sample.slug}&lang=${lang}`),env});
 const result=await response.json();
 assert.ok(JSON.stringify(result).includes(sample.slug));
 const response2=await onRequestPost({request:new Request('https://baipiaoji.com/api/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_ai_tools',arguments:{query:sample.name,lang}}})}),env});
 const mcp=await response2.json();
 assert.ok(!mcp.result.isError);
 assert.ok(mcp.result.content[0].text.includes(sample.slug));
}
console.log(`PASS: ${additions.length} discovery records, bilingual search/REST/MCP, price evidence and noindex boundaries`);
