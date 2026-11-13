import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeCatalogSearch, filterCatalogItems, installHomeCatalog} from '../../collector-assets/home-catalog.mjs';
import {validateHomeCatalog, loadHomeCatalog, homeCatalogHTML, homeCatalogText, homeCatalogCategories, homeCatalogFeatured} from './home-catalog.mjs';
import {merchantURL, shoppingCopy, shoppingHomeHTML, shoppingHomeText, buildShopping} from './shopping.mjs';
import {origin, route, locales} from './content.mjs';
import {SHOPPING_IDS, SHOPPING_EXACT_ITEMS, shoppingLinkPayload, decodeShoppingRef} from '../../collector-assets/shopping-contract.mjs';
import {readShortlist, validateSelection} from '../../collector-assets/shopping-shortlist.mjs';

const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const disclosures=Object.fromEntries(Object.keys(locales).map(lang=>[lang,shoppingCopy[lang].disclosure]));
const decode=value=>value.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
function attributes(source){const result={};for(const match of source.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))result[match[1]]=decode(match[2]??match[3]??match[4]??'');return result;}
function anchors(html){return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(match=>({attrs:attributes(match[1]),text:decode(match[2].replace(/<[^>]*>/g,' ')).trim()}));}
function cards(html){return [...html.matchAll(/<article\b([^>]*\bdata-home-product(?:\s|=)[^>]*)>([\s\S]*?)<\/article>/g)].map(match=>({attrs:attributes(match[1]),html:match[2]}));}

// Two source-backed records only: these unit fixtures are never a published catalogue.
const fixtures=[
 {id:'niubee-risers',name:'NIUBEE acrylic risers',brand:'NIUBEE',model:'B07KN5G9CQ',category:'display',sourceUrl:'https://www.amazon.com/dp/B07KN5G9CQ',checked:'2026-11-13',useEn:'Separate rows on an existing shelf.',checkEn:'Confirm the selected variant; listed dimensions conflict.',useZh:'在已有层架上分开前后排。',checkZh:'核对所选款式，商品页尺寸存在冲突。',useDe:'Reihen auf einem vorhandenen Regal trennen.',checkDe:'Gewählte Variante prüfen; die Maßangaben widersprechen sich.',amazonUSAsin:'B07KN5G9CQ'},
 {id:'rub-4l',name:'Really Useful Box 4L',brand:'Really Useful',model:'4C',category:'storage',sourceUrl:'https://www.reallyusefulproducts.co.uk/usa/html/onlineshop/rub/b04_0litreUS.php',checked:'2026-11-13',useEn:'Keep small accessories together indoors.',checkEn:'Check the US 4C model and leave padding room.',useZh:'在室内集中收纳小配件。',checkZh:'核对美国4C型号并预留衬垫空间。',useDe:'Kleines Zubehör im Haus zusammenhalten.',checkDe:'US-Modell 4C prüfen und Polsterraum einplanen.',amazonUSAsin:'B000KN4DQ4'}
];

test('local search combines category and query without mutating product records or treating the query as code',()=>{
 const items=Object.freeze([
  Object.freeze({id:'niubee-risers',category:'storage',searchText:'NIUBEE acrylic risers · display shelves · 展示'}),
  Object.freeze({id:'rub-4l',category:'storage',searchText:'Really Useful Box 4C · clear storage · 收纳'}),
  Object.freeze({id:'lustigt',category:'workspace',searchText:'IKEA LUSTIGT · desk shelf · Büro'})
 ]);
 const before=JSON.stringify(items);
 assert.deepEqual(filterCatalogItems(items,{category:'storage',query:'NIUBEE risers'}).map(item=>item.id),['niubee-risers']);
 assert.deepEqual(filterCatalogItems(items,{category:'storage',query:'risers NIUBEE'}).map(item=>item.id),['niubee-risers']);
 assert.deepEqual(filterCatalogItems(items,{category:'workspace',query:'NIUBEE'}),[]);
 assert.deepEqual(filterCatalogItems(items,{category:'all',query:'收纳'}).map(item=>item.id),['rub-4l']);
 assert.deepEqual(filterCatalogItems(items,{category:'all',query:'buro'}).map(item=>item.id),['lustigt']);
 for(const query of ['<script>alert(1)</script>','[.*]','unmatched product'])assert.deepEqual(filterCatalogItems(items,{category:'all',query}),[]);
 assert.equal(JSON.stringify(items),before);
});

test('search normalization bounds input while preserving useful multilingual model queries',()=>{
 assert.equal(normalizeCatalogSearch('  NIUBEE  '),'niubee');
 assert.equal(normalizeCatalogSearch('BÜRO'),'buro');
 assert.equal(normalizeCatalogSearch('收纳 4C'),'收纳 4c');
 assert.ok(normalizeCatalogSearch('a'.repeat(400)).length<=80);
});

test('the input limit never truncates model names or purpose words in the searchable product index',()=>{
 const item=Object.freeze({id:'long-index',category:'home-care',searchText:'A long named model '.repeat(12)+'humidity bedside 寝室'});
 for(const query of ['humidity','bedside','寝室'])assert.deepEqual(filterCatalogItems([item],{query}),[item]);
 const products=loadHomeCatalog();
 for(const lang of ['en','de','zh']){
  const html=homeCatalogHTML({lang,route,esc,merchantURL,disclosure:disclosures[lang],products});
  const index=cards(html).map(card=>({id:card.attrs['data-home-product'],category:card.attrs['data-catalog-category'],searchText:card.attrs['data-catalog-search']}));
  const suffix={en:'En',de:'De',zh:'Zh'}[lang];
  for(const product of products){
   for(const query of [product.brand+' '+product.model,product['use'+suffix]])
    assert.ok(filterCatalogItems(index,{query}).some(item=>item.id===product.id),product.id+' '+lang+' must be findable by model and purpose');
  }
 }
});

test('the published source data contains 100 unique named models with dated evidence and all three language fields',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../../content/amazon-products.json',import.meta.url),'utf8'));
 assert.equal(data.count,100);assert.equal(data.products.length,100);assert.ok(data.scope&&data.sourcePolicy);
 const products=loadHomeCatalog(),fold=value=>value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
 assert.equal(new Set(products.map(p=>fold(p.brand)+'|'+fold(p.model))).size,100);
 assert.equal(new Set(products.map(p=>p.sourceUrl)).size,100,'Distinct source pages for the 100 distinct models');
 for(const p of products){
  for(const key of ['name','brand','model','sourceEvidence','useEn','checkEn','useDe','checkDe','useZh','checkZh'])assert.ok(typeof p[key]==='string'&&p[key].trim().length>1,p.id+' '+key);
  assert.match(p.useZh+p.checkZh,/\p{Script=Han}/u,p.id+' Chinese copy');
  assert.equal(new Date(p.checked+'T00:00:00Z').toISOString().slice(0,10),p.checked);
  assert.ok(p.checked<=data.updated,p.id+' source date');
  const source=new URL(p.sourceUrl);assert.equal(source.protocol,'https:');assert.equal(source.username+source.password+source.port,'');
  assert.notEqual(source.pathname,'/');assert.equal(source.searchParams.has('tag'),false);
  assert.doesNotMatch(source.hostname,/(^|\.)(?:google|bing)\./,'A search results URL is not the primary product source');
  if(/(^|\.)amazon\./.test(source.hostname)){
   assert.equal(p.id,'niubee-risers','Only the existing NIUBEE primary-marketplace evidence is an exception to official brand sources');
   assert.equal(source.pathname,'/dp/B07KN5G9CQ');
  }
  if(p.amazonUSAsin!==undefined)assert.equal(p.amazonUSAsin,SHOPPING_EXACT_ITEMS[p.id]?.asin);
 }
 assert.deepEqual(products.filter(p=>p.amazonUSAsin).map(p=>p.id).sort(),['niubee-risers','rub-4l']);
});

test('nine nonempty categories partition all 100 products exactly once and their displayed counts sum to 100',()=>{
 const products=loadHomeCatalog();
 assert.deepEqual(homeCatalogCategories.map(c=>c.id),['storage','workspace','lighting','smart-home','electronics','kitchen','home-care','daily-care','creative']);
 for(const p of products)assert.equal(homeCatalogCategories.filter(c=>c.types.includes(p.category)).length,1,p.id+' category');
 for(const lang of ['en','de','zh'])for(const compact of [false,true]){
  const html=homeCatalogHTML({lang,route,esc,merchantURL,disclosure:disclosures[lang],compact,products});
  const navigation=anchors(html).filter(link=>link.attrs['data-catalog-category-link']);
  assert.equal(navigation.length,9);let total=0;
  for(const group of homeCatalogCategories){
   for(const locale of ['en','de','zh'])assert.ok(group[locale]);
   const expected=products.filter(p=>group.types.includes(p.category)).length;assert.ok(expected>0);
   const link=navigation.find(link=>link.attrs['data-catalog-category-link']===group.id);assert.ok(link);
   const count=Number(/(\d+)\s*$/.exec(link.text)?.[1]);assert.equal(count,expected);total+=count;
   assert.equal(link.attrs.href,(compact?route(lang,'shop'):'')+'#catalog-category-'+group.id);
   if(!compact)assert.equal(cards(html).filter(card=>card.attrs['data-catalog-category']===group.id).length,expected);
  }
  assert.equal(total,100);
 }
});

test('catalogue admission rejects missing, incomplete, duplicate and unverified exact-product data',()=>{
 assert.equal(validateHomeCatalog(fixtures,{expectedCount:2}).length,2);
 assert.equal(validateHomeCatalog({updated:'2026-11-13',products:fixtures},{expectedCount:2}).length,2);
 assert.throws(()=>validateHomeCatalog(fixtures),'Two genuine fixtures cannot masquerade as the published 100-model catalogue');
 for(const missing of [undefined,null,{},[],{products:[]}])assert.throws(()=>validateHomeCatalog(missing));
 const edited=(index,patch)=>fixtures.map((row,i)=>i===index?{...row,...patch}:{...row});
 for(const patch of [{id:fixtures[0].id},{brand:fixtures[0].brand,model:fixtures[0].model},{category:'unverified-category'},
  {sourceUrl:'javascript:alert(1)'},{sourceUrl:'https://user:secret@example.com/product'},
  {useZh:''},{checkDe:''},{checked:'2026-02-30'},{amazonUSAsin:'B000FAKE00'}])
  assert.throws(()=>validateHomeCatalog(edited(1,patch),{expectedCount:2}),JSON.stringify(patch));
 assert.throws(()=>validateHomeCatalog(edited(0,{amazonUSAsin:'B000KN4DQ4'}),{expectedCount:2}),'A known ASIN cannot be attached to the wrong fixed item');
});

test('the actual catalogue renders 100 real models in every language and a bounded homepage selection',()=>{
 const products=loadHomeCatalog();assert.equal(products.length,100);assert.equal(new Set(products.map(item=>item.id)).size,100);
 for(const lang of ['en','de','zh']){
  const html=homeCatalogHTML({lang,route,esc,merchantURL,disclosure:disclosures[lang],products});
  const full=cards(html);assert.equal(full.length,100,lang+' no-JavaScript model count');
  assert.deepEqual(full.map(card=>card.attrs['data-home-product']).sort(),products.map(product=>product.id).sort());
  assert.equal((html.match(/id="home-catalog"/g)||[]).length,1);
  assert.match(html,/<noscript>/,'The no-script catalogue remains an intentional path');
  for(const card of full){assert.equal(Object.hasOwn(card.attrs,'hidden'),false);assert.ok(anchors(card.html).some(link=>(link.attrs.rel||'').split(/\s+/).includes('sponsored')),'Every model has a usable Amazon destination');}
  const compact=homeCatalogHTML({lang,route,esc,merchantURL,disclosure:disclosures[lang],compact:true,products});
  const featured=cards(compact);assert.ok(featured.length>=8&&featured.length<=12,lang+' homepage selection');
  assert.equal(new Set(featured.map(card=>card.attrs['data-home-product'])).size,featured.length);
  assert.ok(featured.every(card=>products.some(product=>product.id===card.attrs['data-home-product'])));
  assert.match(html,/data-catalog-controls[^>]*hidden/,'Interactive controls stay hidden until initialization');
  const featuredGroups=new Set(featured.map(card=>card.attrs['data-catalog-category']));
  assert.equal(featuredGroups.size,9,'Homepage features every nonempty household category');
  assert.ok(featured.some(card=>card.attrs['data-home-product']==='niubee-risers'));
  assert.ok(featured.some(card=>card.attrs['data-home-product']==='rub-4l'));
 }
});

test('actual shopping page generation wires the full no-JavaScript catalogue and home selection without losing the original shortlist',()=>{
 const products=loadHomeCatalog(),emitted=new Map();
 buildShopping({emit:(lang,slug,title,description,html,text)=>emitted.set(route(lang,slug),{html,text}),route,esc,locales,origin});
 for(const lang of ['en','de','zh']){
  const hub=emitted.get(route(lang,'shop'));assert.ok(hub);
  assert.equal(cards(hub.html).length,100);
  for(const id of SHOPPING_IDS)assert.match(hub.html,new RegExp('data-shopping-card[^>]*data-shopping-item="'+id+'"'),'Original shortlist card '+id);
  const home=shoppingHomeHTML({lang,route,esc}),featured=cards(home);
  assert.ok(featured.length>=9&&featured.length<=12);
  assert.deepEqual(featured.map(card=>card.attrs['data-home-product']),homeCatalogFeatured(products).map(p=>p.id));
  assert.ok(anchors(home).some(link=>link.attrs.href===route(lang,'shop')&&/100/.test(link.text)),'Homepage opens the complete 100-model catalogue');
  for(const text of [hub.text,shoppingHomeText(lang,route,origin)])assert.doesNotMatch(text.join('\n'),/https?:\/\/(?:www\.)?amazon\.|[?&]tag=/i);
 }
});

test('model searches stay merchant-only while the two verified US exits retain exact provenance',()=>{
 const products=loadHomeCatalog();
 for(const lang of ['en','de','zh'])for(const compact of [false,true]){
  const html=homeCatalogHTML({lang,route,esc,merchantURL,disclosure:disclosures[lang],compact,products});
  const renderedCards=cards(html),byId=new Map(products.map(product=>[product.id,product]));
  const destinations=renderedCards.flatMap(card=>anchors(card.html).filter(link=>(link.attrs.rel||'').split(/\s+/).includes('sponsored')).map(link=>({...link,product:byId.get(card.attrs['data-home-product'])})));
  assert.equal(destinations.length,cards(html).length,'One primary Amazon action per model');
  const p=route(lang,compact?'':'shop'),exact=[];
  for(const link of destinations){
   const a=link.attrs,url=new URL(a.href),german=lang==='de';
   assert.equal(url.protocol,'https:');assert.equal(url.hostname,german?'www.amazon.de':'www.amazon.com');
   assert.deepEqual(url.searchParams.getAll('tag'),[german?'getecoback-21':'ecoback0d-20']);
   for(const rel of ['sponsored','nofollow','noopener'])assert.ok(a.rel.split(/\s+/).includes(rel));
   const payload=shoppingLinkPayload({p,href:a.href,item:a['data-shopping-item'],placement:a['data-shopping-placement'],affiliate:true,official:false});
   assert.ok(payload,a.href);
   if(a['data-shopping-item']){
    assert.equal(german,false);const id=a['data-shopping-item'];exact.push(id);
    assert.ok(Object.hasOwn(SHOPPING_EXACT_ITEMS,id));assert.equal(url.pathname,'/dp/'+SHOPPING_EXACT_ITEMS[id].asin);assert.equal(a['data-shopping-placement'],'card');
    assert.equal(a['data-catalog-link-type'],'exact');
   }else{
    assert.equal(url.pathname,'/s');assert.ok(url.searchParams.get('k'));assert.ok(Object.hasOwn(a,'data-shopping-merchant'));
    assert.equal(Object.hasOwn(a,'data-shopping-placement'),false);assert.match(link.text,/search|suchen|suche|搜索|搜尋/i);
    assert.deepEqual(Object.keys(payload).sort(),['e','p','r']);assert.doesNotMatch(JSON.stringify(payload),/[?&]k=|[?&]tag=|PRIVATE/);
    assert.equal(url.searchParams.get('k'),link.product.brand+' '+link.product.model,'A model search must search its actual named brand and model');
    assert.equal(a['data-catalog-link-type'],'model-search');
   }
  }
  if(!compact)assert.deepEqual(exact.sort(),lang==='de'?[]:['niubee-risers','rub-4l']);
 }
});

test('machine-readable catalogue keeps source-backed reasoning and canonical product anchors without Amazon URLs',()=>{
 const products=loadHomeCatalog();
 for(const lang of ['en','de','zh']){
  const text=homeCatalogText({lang,route,origin,products}).join('\n'),suffix={en:'En',de:'De',zh:'Zh'}[lang];
  assert.equal(/https?:\/\/(?:www\.)?amazon\.(?:com|de|co\.uk)\b|[?&]tag=/i.test(text),false,'The mirror must omit merchant URLs and affiliate parameters');
  for(const product of products){assert.ok(text.includes(product.name),product.id);assert.ok(text.includes(product['use'+suffix]),product.id+' purpose');assert.ok(text.includes(product['check'+suffix]),product.id+' limit');}
  assert.ok(text.includes(origin+route(lang,'shop')));
 }
});

function interactionFixture(html,effects){
 const forbidden=label=>(...args)=>{effects.push({label,args});throw Error('Unexpected private-input side effect: '+label);};
 const node=(properties={})=>{
  const listeners=new Map();
  const element={hidden:false,textContent:'',dataset:{},...properties,
   addEventListener(name,listener){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(listener);},
   emit(name,event={}){for(const listener of listeners.get(name)||[])listener(event);},
   listenerCount:()=>[...listeners.values()].reduce((n,list)=>n+list.length,0)};
  Object.defineProperty(element,'innerHTML',{set:forbidden('innerHTML'),get:()=>''});
  element.insertAdjacentHTML=forbidden('insertAdjacentHTML');
  return element;
 };
 const input=node({value:'',focus(){this.focused=true;}}),select=node({value:'all'}),reset=node({disabled:true}),count=node(),empty=node({hidden:true}),controls=node({hidden:true});
 const rendered=cards(html),elements=rendered.map(card=>node({dataset:{homeProduct:card.attrs['data-home-product'],catalogCategory:card.attrs['data-catalog-category'],catalogSearch:card.attrs['data-catalog-search']}}));
 const config=JSON.parse(/<script[^>]*data-home-catalog-config[^>]*>([\s\S]*?)<\/script>/.exec(html)[1]);
 const groups=config.categories.map(category=>{const label=node();return node({dataset:{homeCategory:category},querySelector:selector=>{assert.equal(selector,'[data-catalog-group-count]');return label;}});});
 const categoryLinks=config.categories.map(category=>node({dataset:{catalogCategoryLink:category}}));
 const view=node({location:new URL(origin+'/shop'),fetch:forbidden('window.fetch'),navigator:{sendBeacon:forbidden('sendBeacon')},history:{pushState:forbidden('history.pushState'),replaceState:forbidden('history.replaceState')}});
 for(const name of ['localStorage','sessionStorage'])Object.defineProperty(view,name,{get:forbidden('window.'+name)});
 const selectors={'[data-home-catalog-config]':{textContent:JSON.stringify(config)},'[data-catalog-controls]':controls,'[data-catalog-filter]':select,
  '[data-catalog-query]':input,'[data-catalog-reset]':reset,'[data-catalog-count]':count,'[data-catalog-empty]':empty};
 const document={defaultView:view,createElement:forbidden('createElement'),write:forbidden('document.write')};
 const root=node({ownerDocument:document,hasAttribute:name=>false,contains:element=>categoryLinks.includes(element),
  querySelector:selector=>{assert.ok(Object.hasOwn(selectors,selector),selector);return selectors[selector];},
  querySelectorAll:selector=>{assert.ok(['[data-home-product]','[data-home-category]'].includes(selector));return selector==='[data-home-product]'?elements:groups;}});
 return{root,document,view,input,select,reset,count,empty,controls,elements,groups,categoryLinks,forbidden,
  visible:()=>elements.filter(element=>!element.hidden).map(element=>element.dataset.homeProduct)};
}

test('actual local-search handlers never send or store the query, inject markup, or emit a business event',()=>{
 const products=loadHomeCatalog(),html=homeCatalogHTML({lang:'en',route,esc,merchantURL,disclosure:disclosures.en,products}),effects=[];
 const ui=interactionFixture(html,effects),globals={fetch:ui.forbidden('global.fetch'),XMLHttpRequest:ui.forbidden('XMLHttpRequest'),WebSocket:ui.forbidden('WebSocket'),
  navigator:{sendBeacon:ui.forbidden('navigator.sendBeacon')},window:ui.view,document:ui.document};
 ui.view.dispatchEvent=ui.forbidden('business event');
 const previous=new Map();
 try{
  for(const [name,value]of Object.entries(globals)){previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});}
  for(const name of ['localStorage','sessionStorage']){previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{get:ui.forbidden('global.'+name),configurable:true});}
  assert.ok(installHomeCatalog(ui.root));assert.equal(installHomeCatalog(ui.root),null,'Repeated initialization cannot attach duplicate handlers');
  assert.equal(ui.input.listenerCount(),1);assert.equal(ui.visible().length,100);assert.equal(ui.controls.hidden,false);
  ui.input.value='OXO';ui.input.emit('input');
  assert.ok(ui.visible().length>0&&ui.visible().length<100);assert.equal(ui.empty.hidden,true);
  for(const query of ['<img src=x onerror="PRIVATE_EXECUTION()">','<script>PRIVATE_EXECUTION()</script>','[.*]','PRIVATE_QUERY_SENTINEL','PRIVATE'.repeat(100)]){
   ui.input.value=query;ui.input.emit('input');
   assert.equal(ui.visible().length,0);assert.equal(ui.empty.hidden,false);assert.ok(ui.input.value.length<=80);
   assert.doesNotMatch(ui.count.textContent,/PRIVATE|<img|<script|onerror/);
  }
  ui.select.value='__proto__';ui.input.value='';ui.select.emit('change');assert.equal(ui.select.value,'all');assert.equal(ui.visible().length,100);
  ui.select.value='kitchen';ui.select.emit('change');assert.equal(ui.visible().length,10);
  ui.reset.emit('click');assert.equal(ui.visible().length,100);assert.equal(ui.input.value,'');assert.equal(ui.select.value,'all');assert.equal(ui.reset.disabled,true);assert.equal(ui.input.focused,true);
  const group=ui.categoryLinks.find(link=>link.dataset.catalogCategoryLink==='daily-care');
  ui.root.emit('click',{button:0,target:{closest:()=>group}});assert.equal(ui.select.value,'daily-care');assert.equal(ui.visible().length,16);
  ui.view.location.hash='#catalog-category-kitchen';ui.view.emit('hashchange');assert.equal(ui.select.value,'kitchen');assert.equal(ui.visible().length,10);
  ui.view.location.hash='#catalog-item-'+products[0].id;ui.view.emit('hashchange');assert.equal(ui.select.value,'all');assert.equal(ui.visible().length,100);
  assert.deepEqual(effects,[],'Queries stay in the input and local filtering state');
 }finally{
  for(const [name,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
 }
});

test('broadening the catalogue does not expand saved-shortlist IDs or invalidate historical shopping references',()=>{
 assert.deepEqual(SHOPPING_IDS,['blaliden','baggebo','lustigt','samla','my-bestie','niubee-risers']);
 assert.deepEqual(readShortlist({getItem:()=>JSON.stringify({version:1,ids:['samla','my-bestie']})},'US'),{state:'saved',ids:['samla','my-bestie']});
 assert.throws(()=>validateSelection(['rub-4l']));
 assert.deepEqual(decodeShoppingRef('shopping_official_click','/de/shop','s1|ikea.com|samla|compare'),{merchant:'ikea.com',item:'samla',placement:'compare'});
 assert.deepEqual(decodeShoppingRef('affiliate_click','/shop','amazon.com'),{merchant:'amazon.com',item:'unknown',placement:'unknown'});
 assert.deepEqual(decodeShoppingRef('affiliate_click','/shop','s1|rub-4l|rub-4l|card'),null);
 assert.deepEqual(decodeShoppingRef('affiliate_click','/shop','s1|amazon.com|niubee-risers|card'),{merchant:'amazon.com',item:'niubee-risers',placement:'card'});
});
