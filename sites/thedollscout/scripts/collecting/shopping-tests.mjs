import test from 'node:test';
import assert from 'node:assert/strict';
import {shoppingSlugs,shoppingCopy,merchantURL,shoppingHomeHTML,shoppingHomeText,buildShopping} from './shopping.mjs';
const locales={en:{},de:{},zh:{}};
const route=(l,s='')=>(l==='en'?'':'/'+l)+'/'+s;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const origin='https://thedollscout.com';
function pages(){const out=[];buildShopping({emit:(...args)=>out.push(args),route,esc,locales,origin});return out;}
test('shopping publishes every route in all languages with useful comparison and no-buy guidance',()=>{
 const out=pages();assert.equal(out.length,15);
 for(const l of Object.keys(locales))for(const slug of shoppingSlugs){const p=out.find(x=>x[0]===l&&x[1]===slug);assert.ok(p,l+slug);const html=p[4];assert.equal((html.match(/<h1>/g)||[]).length,1);assert.ok(html.includes(shoppingCopy[l].methodBody));if(slug!=='shop'){assert.ok(html.includes('<table>'));assert.ok(html.includes(shoppingCopy[l].skip));assert.ok((html.match(/<li>/g)||[]).length>=6);assert.ok(html.includes('rel="sponsored nofollow noopener"'));}}
});
test('merchant markets and tags remain explicit, exact and separate',()=>{
 for(const l of Object.keys(locales)){const u=new URL(merchantURL(l,'case & riser'));assert.equal(u.hostname,l==='de'?'www.amazon.de':'www.amazon.com');assert.equal(u.searchParams.get('tag'),l==='de'?'getecoback-21':'ecoback0d-20');assert.equal(u.searchParams.get('k'),'case & riser');
  for(const p of pages().filter(p=>p[0]===l)){const html=p[4];for(const m of html.matchAll(/href="(https:\/\/www\.amazon\.[^"]+)"/g)){const a=new URL(m[1].replaceAll('&amp;','&'));assert.equal(a.hostname,u.hostname);assert.equal(a.searchParams.get('tag'),u.searchParams.get('tag'));assert.equal(a.pathname,'/s');assert.ok(html.includes(shoppingCopy[l].market));}}
 }
});
test('agent text has canonical guides and official sources but never merchant links',()=>{
 for(const p of pages()){assert.ok(!/amazon\.|[?&]tag=/.test(p[5].join('\n')));assert.ok(p[5].join('\n').includes(origin));}
 for(const lang of Object.keys(locales)){const text=shoppingHomeText(lang,route,origin).join('\n');assert.ok(!/amazon\.|[?&]tag=/.test(text));assert.ok(text.includes(origin+route(lang,'shop/display-cases')));}
});
test('homepage provides direct functional buying paths without a script or form gate',()=>{
 for(const lang of Object.keys(locales)){const html=shoppingHomeHTML({lang,route,esc});assert.equal((html.match(/<h1>/g)||[]).length,1);for(const slug of shoppingSlugs)assert.ok(html.includes('href="'+route(lang,slug)+'"'));assert.ok(html.includes(shoppingCopy[lang].market));assert.ok(html.includes(shoppingCopy[lang].disclosure));assert.ok(!html.includes('<script'));}
});

test('country paths are differentiated and UK destinations never borrow a foreign affiliate tag',()=>{
 for(const lang of Object.keys(locales)){const hub=pages().find(p=>p[0]===lang&&p[1]==='shop')[4];
  for(const country of ['us','de','uk']){assert.ok(hub.includes('href="#country-'+country+'"'));assert.ok(hub.includes('id="country-'+country+'"'));}
  assert.ok(hub.includes('href="/shop/display-cases"'));assert.ok(hub.includes('href="https://www.sonnyangel.com/en/store/"'));
  const de=hub.match(/<article[^>]+id="country-de"[\s\S]*?<\/article>/)?.[0];assert.ok(de);assert.ok(de.includes('href="/de/shop/display-cases"'));assert.ok(!de.includes('href="/de/shop"'));
  const text=pages().find(p=>p[0]===lang&&p[1]==='shop')[5].join('\n');assert.ok(text.includes(origin+'/de/shop/display-cases'));
  const uk=hub.match(/<article[^>]+id="country-uk"[\s\S]*?<\/article>/)?.[0];assert.ok(uk);assert.ok(uk.includes('href="https://jellycat.com/"'));assert.ok(!/amazon|tag=|sponsored/.test(uk));
 }
});
test('concrete source-backed guidance appears on the relevant guide and in its plain-text mirror',()=>{
 for(const lang of Object.keys(locales))for(const slug of shoppingSlugs.filter(s=>s!=='shop')){const p=pages().find(p=>p[0]===lang&&p[1]===slug),html=p[4],text=p[5].join('\n');
  const block=html.match(/<section class="shop-evidence"[\s\S]*?<\/section>/)?.[0];assert.ok(block);const title=block.match(/<h2>(.*?)<\/h2>/)[1],body=block.match(/<p>(.*?)<\/p>/)[1];assert.ok(text.includes(title));assert.ok(text.includes(body));for(const link of block.matchAll(/href="([^"]+)"/g))assert.ok(text.includes(link[1]));assert.ok(!/[?&]tag=/.test(block));
  if(slug==='shop/display-cases')assert.ok(block.includes('805.029.98'));
  if(slug==='shop/storage-transport')assert.ok(block.includes('103')&&block.includes('148')&&block.includes('HIPPERS'));
 }
});

test('official brand references identify their market and keep Jellycat region selection explicit',()=>{
 const regional='https://jellycatecommerce.zendesk.com/hc/en-gb/articles/12755134287389-What-countries-and-regions-can-I-ship-to';
 for(const p of pages().filter(p=>['shop','shop/plush-display','shop/collector-gifts'].includes(p[1]))){
  const block=p[4].match(/<section class="shop-references"[\s\S]*?<\/section>/)?.[0];assert.ok(block);
  assert.ok(block.includes('href="'+regional+'"'));assert.ok(!block.includes('https://us.jellycat.com/'));
  assert.match(block,/POP MART · (?:US|USA|美国)<\/a>/);
  const label=block.match(/href="https:\/\/jellycatecommerce\.zendesk\.com[^"]+"[^>]*>([^<]+)<\/a>/)?.[1];
  assert.ok(label?.startsWith('Jellycat · '));assert.ok(p[5].join('\n').includes(label+': '+regional));
 }
});
