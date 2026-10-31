import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {ACCESS} from './coding-access-pages.mjs';import {onRequestPost} from '../functions/api/hit.js';
assert.equal(new Set(ACCESS.items.map(x=>x.id)).size,ACCESS.items.length);
for(const x of ACCESS.items){
 assert.equal(x.handsOnTested,false);assert.equal(x.affiliate,false);assert.equal(!!x.checkedAt,x.status==='reviewed');
 for(const k of ['summary','billing','caution','ownership',...(x.discovery?['discovery']:[])])for(const l of ['zh','en'])assert.ok(x[k][l].length>12);
 for(const url of [x.url,x.source])assert.equal(new URL(url).protocol,'https:');
 for(const reference of x.references||[]){
  assert.equal(new URL(reference.url).protocol,'https:');assert.ok(['docs','pricing','terms','discussion','promotion'].includes(reference.kind));
  assert.match(reference.observedAt,/^\d{4}-\d{2}-\d{2}$/);assert.ok(reference.observedAt<=ACCESS.updated);
  for(const lang of ['zh','en'])assert.ok(reference.label[lang].length>2);
 }
}
const escapeHtml=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const live=process.argv.includes('--live');
for(const prefix of ['','en/']){
 const get=async p=>{if(!live)return readFileSync(new URL('../dist/'+prefix+p,import.meta.url),'utf8');const r=await fetch('https://baipiaoji.com/'+prefix+p.replace('coding-access/index.html','coding-access/'),{headers:{'User-Agent':'bpj-ci-selfcheck'}});assert.equal(r.status,200,p);return r.text();};
 const html=await get('coding-access/index.html'),data=JSON.parse(await get('coding-access.json')),md=await get('coding-access.md');
 assert.ok(html.includes('rel="canonical" href="https://baipiaoji.com/'+prefix+'coding-access/"'));assert.ok(html.includes('hreflang="en"'));assert.ok(html.includes('FAQPage'));assert.ok(html.includes('coding-access.js'));assert.ok(html.includes('id="access-selection-copy"'));assert.ok(html.includes('data-access-url="https://baipiaoji.com/'+prefix+'coding-access/"'));assert.equal(data.items.length,ACCESS.items.length);
 const lang=prefix?'en':'zh';
 for(const x of data.items){
  const original=ACCESS.items.find(r=>r.id===x.id);
  assert.ok(html.includes('id="'+x.id+'"'));assert.ok(md.includes(x.source));assert.equal(x.status,original.status);
  if(original.discovery){assert.equal(x.discovery,original.discovery[lang]);assert.ok(html.includes(escapeHtml(x.discovery)));assert.ok(md.includes(x.discovery));}
  assert.equal((x.references||[]).length,(original.references||[]).length);
  for(const reference of original.references||[]){
   const localized=x.references.find(r=>r.url===reference.url);assert.ok(localized);assert.equal(localized.label,reference.label[lang]);assert.equal(localized.kind,reference.kind);assert.equal(localized.observedAt,reference.observedAt);
   assert.ok(html.includes('href="'+escapeHtml(reference.url)+'"'));assert.ok(html.includes(escapeHtml(reference.label[lang])));assert.ok(html.includes('data-reference-kind="'+reference.kind+'"'));assert.ok(html.includes('data-reference-date="'+reference.observedAt+'"'));
   assert.ok(md.includes(reference.url));assert.ok(md.includes(reference.label[lang]));assert.ok(md.includes(reference.observedAt));
  }
 }

 assert.ok((await get('index.html')).includes('href="https://baipiaoji.com/'+prefix+'coding-access/"'));assert.ok(JSON.parse(await get('search-index.json')).some(x=>x.u.includes('/coding-access/#deepseek')));assert.ok(JSON.parse(await get('site-journeys.json')).items.some(x=>x.id==='coding-access'));
}
if(!live){let written=[];const env={HITS:{prepare:()=>({bind:(...values)=>({run:async()=>written.push(values)})})}};const send=async(p,h={})=>onRequestPost({env,request:new Request('https://baipiaoji.com/api/hit',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0',Referer:'https://baipiaoji.com/coding-access/',...h},body:JSON.stringify({e:'coding_access',p,l:'zh',r:'https://private.example'})})});await send('/coding-access/open/codex');assert.equal(written.length,1);assert.equal(written[0][4],'');await send('/coding-access/copy/selection');assert.equal(written.length,2);assert.equal(written[1][4],'');for(const[p,h]of [['/coding-access/copy/private-selection',{}],['/coding-access/open/selection',{}],['/coding-access/copy/selection',{Referer:'https://baipiaoji.com/coding-access/?qa=1'}],['/coding-access/open/private-key',{}],['/coding-access/arbitrary/codex',{}],['/coding-access/open/codex',{DNT:'1'}],['/coding-access/open/codex',{'sec-gpc':'1'}],['/coding-access/open/codex',{'User-Agent':'bpj-ci-selfcheck'}],['/coding-access/open/codex',{Referer:'https://baipiaoji.com/coding-access/?qa=1'}]])await send(p,h);assert.equal(written.length,2);
 for(const item of ACCESS.items)for(const action of ['open','source']){
  const before=written.length;await send('/coding-access/'+action+'/'+item.id);assert.equal(written.length,before+1,item.id+' '+action+' must be measurable');assert.equal(written.at(-1)[4],'');
 }
 const sitemap=readFileSync(new URL('../dist/sitemap.xml',import.meta.url),'utf8');for(const p of ['','en/'])assert.ok(sitemap.includes('https://baipiaoji.com/'+p+'coding-access/'));assert.ok(readFileSync(new URL('../dist/llms.txt',import.meta.url),'utf8').includes('/coding-access/'));}
console.log('PASS coding access '+(live?'live':'dist')+': evidence/status, bilingual discovery, machine assets and bounded privacy-safe events.');
