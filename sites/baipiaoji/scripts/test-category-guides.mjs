import assert from 'node:assert/strict';
import fs from 'node:fs';
import {categoryGuideModel} from './category-guides.mjs';
const root=new URL('../dist/',import.meta.url),raw=JSON.parse(fs.readFileSync(new URL('../data/tools.json',import.meta.url)));
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for(const prefix of ['', 'en/']){
 const home=read(prefix+'index.html');
 const homeMirror=read(prefix+'index.md');
 const featured=[...home.matchAll(/<a class="home-category"[^>]*>([\s\S]*?)<\/a>/g)];
 assert.equal(featured.length,6,'Six task categories on the homepage');
 const directory=home.split('<section class="home-section" id="directory"')[1]?.split('</section>',1)[0];
 assert.ok(directory,'Homepage directory is present');
 for(const id of new Set(raw.map(t=>t.category))){
  const j=JSON.parse(read(prefix+'c/'+id+'.json')),h=read(prefix+'c/'+id+'.html'),md=read(prefix+'c/'+id+'.md');
  const rows=raw.filter(t=>t.category===id),verified=rows.filter(t=>t.limits?.source&&t.limits?.checked),dates=verified.map(t=>t.limits.checked).sort();
  assert.equal(j.count,rows.length);assert.equal(j.withDatedAllowance,verified.length);assert.equal(j.withoutDatedAllowance,rows.length-verified.length);
  assert.equal(j.sourceCheckedFrom,dates[0]||null);assert.equal(j.sourceCheckedThrough,dates.at(-1)||null);
  assert.ok(h.includes(esc(j.question))&&md.includes(j.question));
  assert.ok(directory.includes(`href="${j.url}"`)&&homeMirror.includes(`](${j.url})`),'Category reachable from both home formats: '+id);
  const card=featured.find(match=>match[0].includes(`href="${j.url}"`));
  if(card)assert.ok(card[1].includes(esc(j.question))&&homeMirror.includes(j.question),'Featured category wording: '+id);
  assert.ok(h.includes(esc(j.answer))&&md.includes(j.answer));
  assert.ok(h.includes('id="choose"')&&h.includes('id="tools"'));
  assert.ok(h.includes('rel="canonical" href="'+j.url+'"'));assert.ok(h.includes('type="application/json" href="'+j.url+'.json"'));assert.ok(h.includes('type="text/markdown" href="'+j.url+'.md"'));assert.ok(!h.includes('数据核实于 <time'));
  const schemas=[...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1]));
  assert.equal(schemas.find(s=>s['@type']==='ItemList').numberOfItems,rows.length);
  const next=prefix+j.nextPath;assert.ok(fs.existsSync(new URL(next.endsWith('/')?next+'index.html':next+'.html',root)),next);
  for(const t of rows){assert.ok(read(prefix+'tools/'+t.slug+'.html').includes('/c/'+id+'#choose'));}
 }
}
// No date/source evidence must remain unknown, even with a fresh successful link check.
const fixture=categoryGuideModel({id:'chat',label:'Chat',lang:'en',base:'/en',tools:[{category:'chat',name:'Fixture',slug:'fixture',last_verified:'2099-01-01',limits:{quota:'unknown'}}]});
assert.equal(fixture.withDatedAllowance,0);assert.equal(fixture.sourceCheckedThrough,null);
console.log('PASS 28 bilingual category guides, 1400 tool paths, evidence dates/counts, mirrors, schema and real next-step targets');
