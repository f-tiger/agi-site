import assert from 'node:assert/strict';
// Independent output oracle, recomputed from source records rather than models.
export async function checkGenreOutput({get,catalog,genres}){
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 for(const g of genres){
  const base='manju/genre-'+g.id,h=await get(base+'.html'),j=JSON.parse(await get(base+'.json')),md=await get(base+'.md'),rows=catalog.items.filter(x=>x.category===g.id);
  assert.equal(j.count,rows.length);assert.equal(j.evidence.reduce((n,x)=>n+x.count,0),rows.length);assert.equal(j.formats.reduce((n,x)=>n+x.count,0),rows.length);
  assert.equal(j.officialEntryCount,j.items.filter(x=>x.entry.official).length);
  assert.equal(j.sourceCheckedFrom,rows.map(x=>x.checkedAt).sort()[0]);assert.equal(j.sourceCheckedThrough,rows.map(x=>x.checkedAt).sort().at(-1));
  assert.equal((h.match(/<h1[ >]/g)||[]).length,1);assert.ok(!/content="noindex/.test(h));
  assert.ok(h.includes('type="application/json" href="'+j.url+'.json"'));
  const schema=[...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
  const list=schema.find(x=>x['@type']==='CollectionPage').mainEntity;
  assert.equal(list.numberOfItems,rows.length);assert.deepEqual(list.itemListElement.map(x=>x.url),j.items.map(x=>x.url));
  assert.equal(schema.find(x=>x['@type']==='BreadcrumbList').itemListElement[1].item,'https://baipiaoji.com/manju/categories');
  for(const [q,a] of j.faq){assert.ok(h.includes(escape(q))&&h.includes(escape(a)));assert.ok(md.includes(q)&&md.includes(a));}
  for(const t of j.tags){assert.equal(t.count,rows.filter(x=>x.tags.includes(t.label)).length);assert.ok(h.includes(escape(t.url)));}
  for(const x of j.items){const original=rows.find(r=>r.id===x.id);assert.ok(original);assert.equal(x.source,original.source);assert.equal(x.checkedAt,original.checkedAt);assert.ok(md.includes(x.source));assert.ok(h.includes(escape(x.entry.url)));if(x.plot)assert.ok(h.includes(escape(x.plot.source))&&md.includes(x.plot.source));}
  assert.ok(h.includes(escape(j.summary))&&md.includes(j.summary));
 }
 const hub=JSON.parse(await get('manju/categories.json')),html=await get('manju/categories.html');
 assert.equal(hub.categories.reduce((n,x)=>n+x.count,0),catalog.items.length);
 assert.equal(hub.categories.filter(x=>x.guide).length,genres.length);
 for(const c of hub.categories){assert.equal(c.count,catalog.items.filter(x=>x.category===c.id).length);assert.ok(html.includes(escape(c.url)));}
 assert.ok((await get('sitemap.xml')).includes('<loc>https://baipiaoji.com/manju/categories</loc>'));
}
