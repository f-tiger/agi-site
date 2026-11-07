import test from 'node:test';
import assert from 'node:assert/strict';
import {SHORTLIST_LIMIT,validateSelection,parseShortlistFragment,readShortlist,writeShortlist,changeSelection,shortlistStorageKey,shortlistURL,initialSelection} from '../../collector-assets/shopping-shortlist.mjs';
import {SHOPPING_IDS,shoppingItemAllowed,shoppingLinkPayload} from '../../collector-assets/shopping-contract.mjs';
import {shoppingProducts,shoppingProductIds,shoppingProductsHTML,shoppingProductsText} from './shopping-products.mjs';

function memoryStorage(){const data=new Map(),writes=[];return {data,writes,getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>{writes.push({key,value});data.set(key,value);}};}
const de=SHOPPING_IDS.filter(id=>shoppingItemAllowed(id,'DE'));
test('selection changes are bounded, distinct and do not mutate caller state',()=>{
 assert.equal(SHORTLIST_LIMIT,3);
 const initial=['blaliden','samla'];const next=changeSelection(initial,'baggebo',true);
 assert.deepEqual(initial,['blaliden','samla']);assert.deepEqual(next.ids,['blaliden','samla','baggebo']);
 const full=changeSelection(next.ids,'lustigt',true);assert.equal(full.changed,false);assert.equal(full.reason,'limit');assert.deepEqual(full.ids,next.ids);
 assert.deepEqual(changeSelection(next.ids,'samla',false).ids,['blaliden','baggebo']);
 assert.equal(changeSelection(initial,'blaliden',true).changed,false);
 assert.equal(changeSelection(initial,'niubee-risers',true,de).reason,'unavailable');
 for(const value of [null,{},'blaliden',['blaliden','blaliden'],['private-note'],SHOPPING_IDS])assert.throws(()=>validateSelection(value));
});
test('fragment parser permits only one to three known IDs and leaves unrelated anchors alone',()=>{
 assert.deepEqual(parseShortlistFragment('#shortlist=blaliden,samla'),{state:'valid',ids:['blaliden','samla']});
 for(const hash of ['#shortlist=','#shortlist=blaliden,blaliden','#shortlist=blaliden,samla,lustigt,baggebo','#shortlist=unknown','#shortlist=blaliden&email=test','#shortlist=blaliden%2Csamla','#shortlist='+('a'.repeat(180)),'#shortlist=blaliden\n'])assert.equal(parseShortlistFragment(hash).state,'invalid',hash);
 for(const hash of ['','#country-de','#product-baggebo',null])assert.equal(parseShortlistFragment(hash).state,'absent');
});
test('copyable URLs contain only the canonical shopping route and fixed public IDs',()=>{
 const link=shortlistURL('https://thedollscout.com/zh/shop',['samla','my-bestie']);
 assert.equal(link,'https://thedollscout.com/zh/shop#shortlist=samla,my-bestie');
 assert.deepEqual(parseShortlistFragment(new URL(link).hash).ids,['samla','my-bestie']);
 for(const base of ['https://evil.example/shop','http://thedollscout.com/shop','https://thedollscout.com/shop?customer=x','https://thedollscout.com/shop#country-us','https://thedollscout.com/shop/','https://user@thedollscout.com/shop','https://thedollscout.com/private'])assert.throws(()=>shortlistURL(base,['samla']));
 assert.throws(()=>shortlistURL('https://thedollscout.com/shop',[]));
 assert.throws(()=>shortlistURL('https://thedollscout.com/de/shop',['niubee-risers'],de));
});
test('browser persistence is versioned, market-separated and rejects corrupted or oversized records',()=>{
 const storage=memoryStorage();assert.equal(readShortlist(storage,'US').state,'empty');
 assert.equal(writeShortlist(storage,'US',['niubee-risers','samla']),true);
 assert.deepEqual(readShortlist(storage,'US').ids,['niubee-risers','samla']);assert.deepEqual(readShortlist(storage,'DE',de).ids,[]);
 assert.equal(writeShortlist(storage,'DE',['blaliden'],de),true);assert.deepEqual(readShortlist(storage,'US').ids,['niubee-risers','samla']);
 for(const raw of ['{','null','[]','x'.repeat(2049),JSON.stringify({version:2,ids:['samla']}),JSON.stringify({version:1,ids:['samla'],email:'private'}),JSON.stringify({version:1,ids:['samla','samla']})]){storage.data.set(shortlistStorageKey('US'),raw);assert.equal(readShortlist(storage,'US').state,'corrupt');}
 storage.data.set(shortlistStorageKey('DE'),JSON.stringify({version:1,ids:['niubee-risers']}));assert.equal(readShortlist(storage,'DE',de).state,'corrupt');
});
test('storage failure does not break current-page selection or export',()=>{
 const blocked={getItem(){throw Error('SecurityError');},setItem(){throw Error('QuotaExceededError');}};
 assert.equal(readShortlist(blocked,'US').state,'unavailable');assert.equal(writeShortlist(blocked,'US',['samla']),false);
 assert.deepEqual(changeSelection([], 'samla', true).ids,['samla']);
 assert.equal(shortlistURL('https://thedollscout.com/shop',['samla']),'https://thedollscout.com/shop#shortlist=samla');
 assert.equal(readShortlist(undefined,'US').state,'unavailable');assert.equal(writeShortlist(undefined,'US',[]),false);
});
test('shared selections preview without overwriting saved records; invalid shares preserve existing choices',()=>{
 const storage=memoryStorage();writeShortlist(storage,'US',['baggebo']);const before=storage.writes.length;
 const shared=initialSelection({hash:'#shortlist=blaliden,samla',storage,market:'US'});
 assert.equal(shared.state,'shared');assert.deepEqual(shared.ids,['blaliden','samla']);assert.equal(storage.writes.length,before);assert.deepEqual(readShortlist(storage,'US').ids,['baggebo']);
 const invalid=initialSelection({hash:'#shortlist=unknown',storage,market:'US'});assert.equal(invalid.state,'invalid-share');assert.deepEqual(invalid.ids,['baggebo']);
 const partial=initialSelection({hash:'#shortlist=niubee-risers,samla',storage,market:'DE',allowed:de});assert.equal(partial.state,'partial-share');assert.deepEqual(partial.ids,['samla']);
});

const route=(lang,slug='')=>(lang==='en'?'':'/'+lang)+'/'+slug;
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
test('source-backed catalogue and merchant destinations honor the shared market contract',()=>{
 assert.deepEqual(shoppingProductIds,SHOPPING_IDS);assert.deepEqual(shoppingProducts.map(p=>p.id),SHOPPING_IDS);
 for(const product of shoppingProducts){assert.equal(product.checked,'2026-11-07');for(const lang of ['en','de','zh'])for(const field of ['when','skip','size'])assert.ok(product[lang][field]);
  for(const market of ['US','DE']){if(!shoppingItemAllowed(product.id,market))continue;const href=product.reference||product.urls[market];const p=market==='DE'?'/de/shop':'/shop';const affiliate=product.id==='niubee-risers';assert.ok(shoppingLinkPayload({p,href,item:product.id,placement:'card',affiliate,official:!affiliate}),product.id+market);}
 }
 assert.equal(shoppingProducts.find(p=>p.id==='niubee-risers').urls.DE,undefined);
 assert.ok(shoppingProducts.find(p=>p.id==='my-bestie').reference.includes('sonnyangelstore.com'));
});
test('server output retains useful no-JS sources while enhancement and machine text respect their boundaries',()=>{
 for(const lang of ['en','de','zh']){
  const html=shoppingProductsHTML({lang,route,esc}),config=JSON.parse(html.match(/<script type="application\/json" data-shortlist-config>([\s\S]*?)<\/script>/)[1]);
  assert.equal((html.match(/data-shopping-card /g)||[]).length,6);assert.ok(html.includes('id="shopping-products"'));assert.ok(html.includes('data-shortlist-toolbar hidden'));assert.ok(html.includes('<noscript>'));
  assert.equal(config.items.length,6);assert.equal(config.items.find(p=>p.id==='niubee-risers').eligible,lang!=='de');
  const text=shoppingProductsText({lang,route}).join('\n');assert.ok(!/amazon\.|[?&]tag=/.test(text));assert.ok(text.includes('IKEA BLÅLIDEN'));assert.ok(text.includes('https://www.ikea.com/'));assert.ok(!/AggregateRating|Review|Offer/.test(html));
  for(const category of ['collector-gifts','plush-display'])assert.equal(shoppingProductsHTML({lang,route,esc,category}),'');
  assert.equal((shoppingProductsHTML({lang,route,esc,category:'storage-transport'}).match(/data-shopping-card /g)||[]).length,2);
  const compact=shoppingProductsHTML({lang,route,esc,compact:true});assert.equal((compact.match(/data-shopping-card /g)||[]).length,3);assert.ok(compact.includes('id="product-samla"'));
 }
});
