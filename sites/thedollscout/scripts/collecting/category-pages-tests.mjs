import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCategoryPages, categoryPageSlugs, categoryPageHTML, loadCategoryGuides, validateCategoryGuides} from './category-pages.mjs';
import {homeCatalogCategories, loadHomeCatalog, homeCatalogHTML, homeCatalogText} from './home-catalog.mjs';
import {merchantURL, shoppingCopy} from './shopping.mjs';
import {origin, route, locales} from './content.mjs';
import {SHOPPING_EXACT_ITEMS, shoppingLinkPayload} from '../../collector-assets/shopping-contract.mjs';

const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const decode=value=>value.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
function attributes(source){const result={};for(const m of source.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))result[m[1]]=decode(m[2]??m[3]??m[4]??'');return result;}
function anchors(html){return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(m=>({attrs:attributes(m[1]),text:decode(m[2].replace(/<[^>]*>/g,' ')).trim()}));}
function cards(html){return [...html.matchAll(/<article\b([^>]*\bdata-home-product(?:\s|=)[^>]*)>([\s\S]*?)<\/article>/g)].map(m=>({attrs:attributes(m[1]),html:m[2]}));}
const products=loadHomeCatalog();
const guides=()=>loadCategoryGuides(products);
function renderedPages(){
 const pages=new Map();
 buildCategoryPages({route,esc,locales,origin,products,guides:guides(),emit:(lang,slug,title,description,html,text,schema,modified)=>{
  const path=route(lang,slug);assert.equal(pages.has(path),false,'One canonical render per language and category');
  pages.set(path,{lang,slug,title,description,html,text,schema,modified});
 }});
 return pages;
}

test('nine distinct buying guides deepen actual categories with dated sources and translated decisions',()=>{
 const data=guides(),expected=new Set(homeCatalogCategories.map(g=>g.id));
 assert.equal(data.categories.length,expected.size);
 assert.deepEqual(new Set(data.categories.map(g=>g.id)),expected);
 for(const guide of data.categories){
  const group=homeCatalogCategories.find(g=>g.id===guide.id),owned=new Set(products.filter(p=>group.types.includes(p.category)).map(p=>p.id));
  assert.ok(guide.checked<=data.updated,'Source check cannot postdate the guide');
  assert.ok(guide.sourceProductIds.length>=2,guide.id+' has model-specific source evidence');
  assert.equal(new Set(guide.sourceProductIds).size,guide.sourceProductIds.length);
  assert.ok(guide.sourceProductIds.every(id=>owned.has(id)),guide.id+' source IDs');
  assert.equal(new Set(guide.related).size,guide.related.length);
  assert.ok(guide.related.every(id=>expected.has(id)&&id!==guide.id));
  assert.ok(guide.sources.length>=2,guide.id+' needs more than one source');
  assert.equal(new Set(guide.sources.map(source=>source.url)).size,guide.sources.length);
  for(const source of guide.sources){
   const url=new URL(source.url);assert.equal(url.protocol,'https:');assert.equal(url.username+url.password+url.port,'');
   assert.notEqual(url.pathname,'/','A brand homepage cannot substantiate buying details');
   assert.equal(url.searchParams.has('tag'),false,'Evidence links cannot be disguised affiliate exits');
   assert.doesNotMatch(url.hostname,/(^|\.)(?:google|bing)\./,'Search results are not primary evidence');
  }
  for(const lang of Object.keys(locales)){
   const d=guide[lang];
   assert.ok(d.decisions.length>=3,guide.id+'/'+lang+' choosing criteria');
   assert.ok(d.comparisons.length>=3,guide.id+'/'+lang+' alternative uses');
   assert.ok(d.beforeBuying.length>=3,guide.id+'/'+lang+' final checks');
   assert.ok(d.faq.length>=2,guide.id+'/'+lang+' user questions');
   assert.equal(new Set(d.decisions.map(x=>x.title)).size,d.decisions.length);
   assert.equal(new Set(d.faq.map(x=>x.question)).size,d.faq.length);
   for(const row of d.comparisons){assert.ok(row.productIds.every(id=>owned.has(id)));assert.equal(new Set(row.productIds).size,row.productIds.length);}
   const prose=[d.answer,...d.decisions.flatMap(x=>[x.title,x.body]),...d.comparisons.flatMap(x=>[x.need,x.consider,x.check]),...d.beforeBuying,...d.faq.flatMap(x=>[x.question,x.answer])].join('\n');
   assert.doesNotMatch(prose,/\b(?:we (?:tested|measured|benchmarked)|tested by our|in our tests|our testing (?:showed|found))\b/i,'Source interpretation must not masquerade as original testing');
   assert.doesNotMatch(prose,/<(?:script|iframe|img)\b|\bTODO\b|lorem ipsum/i);
   if(lang==='zh')assert.match(prose,/\p{Script=Han}/u);
  }
  assert.equal(new Set(Object.keys(locales).map(lang=>guide[lang].answer)).size,3,'Translated answers are not copied English');
 }
 for(const lang of Object.keys(locales)){
  assert.equal(new Set(data.categories.map(g=>g[lang].title)).size,expected.size);
  assert.equal(new Set(data.categories.map(g=>g[lang].description)).size,expected.size);
  assert.equal(new Set(data.categories.map(g=>g[lang].answer)).size,expected.size);
 }
});

test('category admission rejects wrong-category models, unsafe evidence, missing translation and broken related links',()=>{
 const original=guides(),change=fn=>{const copy=structuredClone(original);fn(copy.categories[0],copy);return copy;};
 const firstGroup=homeCatalogCategories.find(c=>c.id===original.categories[0].id);
 const alien=products.find(p=>!firstGroup.types.includes(p.category)).id;
 for(const value of [
  change(g=>{g.related=[g.id];}),
  change(g=>{g.related=['unpublished-category'];}),
  change(g=>{g.sourceProductIds=[alien];}),
  change(g=>{g.en.comparisons[0].productIds=[alien];}),
  change(g=>{g.sources[0].url='javascript:alert(1)';}),
  change(g=>{g.sources[0].url='https://user:secret@example.com/product';}),
  change(g=>{delete g.de;}),
  change(g=>{g.zh.answer='';}),
  change((g,data)=>{data.categories[1].id=g.id;})
 ])assert.throws(()=>validateCategoryGuides(value,products));
 assert.deepEqual(guides(),original,'Validation and rendering must not mutate published editorial data');
});

test('all 27 category pages expose usable decisions, comparison anchors and every model without JavaScript',()=>{
 const pages=renderedPages(),data=guides();
 assert.equal(categoryPageSlugs.length,9);assert.equal(pages.size,27);
 for(const lang of Object.keys(locales)){
  const displayed=[];
  for(const guide of data.categories){
   const slug='shop/categories/'+guide.id,page=pages.get(route(lang,slug)),d=guide[lang],group=homeCatalogCategories.find(g=>g.id===guide.id);
   assert.ok(page,lang+'/'+guide.id);assert.equal(page.title,d.title);assert.equal(page.description,d.description);assert.equal(page.modified,data.updated);
   assert.equal((page.html.match(/<h1[ >]/g)||[]).length,1);
   assert.ok(page.html.includes(esc(d.answer)));assert.ok(page.html.includes('datetime="'+guide.checked+'"'));
   assert.ok(page.html.includes('<table>'));assert.ok(page.html.includes('id="category-faq"'));
   for(const x of d.decisions)assert.ok(page.html.includes(esc(x.body)));
   for(const x of d.beforeBuying)assert.ok(page.html.includes(esc(x)));
   for(const x of d.faq){assert.ok(page.html.includes(esc(x.question)));assert.ok(page.html.includes(esc(x.answer)));}
   const modelCards=cards(page.html),expected=products.filter(p=>group.types.includes(p.category));
   assert.deepEqual(modelCards.map(c=>c.attrs['data-home-product']),expected.map(p=>p.id));
   displayed.push(...modelCards.map(c=>c.attrs['data-home-product']));
   for(const card of modelCards){assert.equal(Object.hasOwn(card.attrs,'hidden'),false);assert.ok(anchors(card.html).some(a=>(a.attrs.rel||'').split(/\s+/).includes('sponsored')));}
   const ids=new Set([...page.html.matchAll(/\bid="([^"]+)"/g)].map(m=>decode(m[1])));
   for(const link of anchors(page.html).filter(a=>a.attrs.href?.startsWith('#')))assert.ok(ids.has(link.attrs.href.slice(1)),link.attrs.href+' must resolve within its category');
   for(const id of guide.related)assert.ok(anchors(page.html).some(a=>a.attrs.href===route(lang,'shop/categories/'+id)));
  }
  assert.equal(displayed.length,100,'Category pages partition the same 100 real models');assert.equal(new Set(displayed).size,100);
 }
});

test('category ItemList and breadcrumbs describe visible same-page content without invented Product, Offer or review schema',()=>{
 for(const [path,page]of renderedPages()){
  const list=page.schema.find(s=>s['@type']==='ItemList'),breadcrumb=page.schema.find(s=>s['@type']==='BreadcrumbList');
  assert.ok(list);assert.ok(breadcrumb);assert.equal(list.numberOfItems,cards(page.html).length);
  assert.equal(list.itemListElement.length,list.numberOfItems);
  assert.deepEqual(list.itemListElement.map(x=>x.position),list.itemListElement.map((_,i)=>i+1));
  for(const entry of list.itemListElement){const url=new URL(entry.url);assert.equal(url.origin,origin);assert.equal(url.pathname,path);assert.ok(page.html.includes('id="'+url.hash.slice(1)+'"'));assert.ok(page.html.includes(esc(entry.name)));}
  assert.deepEqual(breadcrumb.itemListElement.map(x=>x.item),[origin+route(page.lang),origin+route(page.lang,'shop'),origin+path]);
  assert.doesNotMatch(JSON.stringify(page.schema),/"@type":"(?:FAQPage|Product|Offer|AggregateRating|Review)"/);
 }
});

test('plain-text category mirrors retain decisions, model identity and evidence while omitting merchant URLs',()=>{
 const data=guides();
 for(const [path,page]of renderedPages()){
  const guide=data.categories.find(g=>'shop/categories/'+g.id===page.slug),d=guide[page.lang],text=page.text.join('\n');
  assert.doesNotMatch(text,/https?:\/\/(?:www\.)?amazon\.(?:com|de|co\.uk)\b|[?&]tag=/i);
  for(const value of [d.title,d.description,d.answer,...d.decisions.map(x=>x.body),...d.beforeBuying,...d.faq.flatMap(x=>[x.question,x.answer])])assert.ok(text.includes(value),path+' missing visible decision content');
  for(const card of cards(page.html)){const id=card.attrs['data-home-product'],product=products.find(p=>p.id===id);assert.ok(text.includes(product.name));assert.ok(text.includes(origin+path+'#catalog-item-'+id));}
  for(const source of guide.sources.filter(s=>!/(^|\.)amazon\./.test(new URL(s.url).hostname)))assert.ok(text.includes(source.url));
 }
});

test('home and catalogue provide crawlable localized links to all nine category guides',()=>{
 for(const lang of Object.keys(locales))for(const compact of [false,true]){
  const html=homeCatalogHTML({lang,route,esc,merchantURL,disclosure:shoppingCopy[lang].disclosure,compact,products});
  const links=anchors(html).filter(a=>Object.hasOwn(a.attrs,'data-catalog-category-link'));
  assert.equal(links.length,9);
  const text=homeCatalogText({lang,route,origin,compact,products}).join('\n');
  for(const category of homeCatalogCategories){
   const target=route(lang,'shop/categories/'+category.id);
   assert.ok(links.some(a=>a.attrs.href===target),target+' must be an ordinary link, not only a runtime filter');
   assert.ok(text.includes(origin+target));
  }
 }
});

test('category Amazon exits retain market, exact-model provenance and sanitized meaningful-action payloads',()=>{
 for(const [path,page]of renderedPages())for(const card of cards(page.html)){
  const exits=anchors(card.html).filter(a=>(a.attrs.rel||'').split(/\s+/).includes('sponsored'));assert.equal(exits.length,1);
  const link=exits[0],a=link.attrs,url=new URL(a.href),german=page.lang==='de';
  assert.equal(url.hostname,german?'www.amazon.de':'www.amazon.com');assert.equal(url.protocol,'https:');
  assert.deepEqual(url.searchParams.getAll('tag'),[german?'getecoback-21':'ecoback0d-20']);
  for(const rel of ['sponsored','nofollow','noopener'])assert.ok(a.rel.split(/\s+/).includes(rel));
  const payload=shoppingLinkPayload({p:path,href:a.href,item:a['data-shopping-item'],placement:a['data-shopping-placement'],affiliate:true,official:false});
  assert.ok(payload,path+' must have a measurable affiliate action');assert.equal(payload.e,'affiliate_click');assert.equal(payload.p,path);
  if(a['data-shopping-item']){
   assert.equal(german,false);const id=a['data-shopping-item'];assert.equal(id,card.attrs['data-home-product']);assert.ok(Object.hasOwn(SHOPPING_EXACT_ITEMS,id));
   assert.equal(url.pathname,'/dp/'+SHOPPING_EXACT_ITEMS[id].asin);assert.equal(a['data-shopping-placement'],'guide');assert.equal(payload.item,id);assert.equal(payload.placement,'guide');
  }else{
   const product=products.find(p=>p.id===card.attrs['data-home-product']);assert.equal(url.pathname,'/s');assert.equal(url.searchParams.get('k'),product.brand+' '+product.model);
   assert.deepEqual(Object.keys(payload).sort(),['e','p','r']);assert.match(link.text,/search|suchen|suche|搜索|搜尋/i);
  }
  assert.doesNotMatch(JSON.stringify(payload),/[?&](?:k|tag)=|\/dp\/|B000KN4DQ4|B07KN5G9CQ/,'Model searches and merchant query parameters stay outside event payloads');
 }
});

test('editorial text is escaped before it becomes HTML',()=>{
 const data=guides(),record=structuredClone(data.categories[0]);
 record.en.title='<img src=x onerror="EXECUTE()">';record.en.answer='<script>EXECUTE()</script>';
 record.en.faq[0].answer='Compare A & B < carefully';
 const html=categoryPageHTML({record,updated:data.updated,lang:'en',route,esc,products});
 assert.ok(html.includes(esc(record.en.title)));assert.ok(html.includes(esc(record.en.answer)));assert.ok(html.includes(esc(record.en.faq[0].answer)));
 assert.doesNotMatch(html,/<img src=x|<script>EXECUTE\(\)/);
});
