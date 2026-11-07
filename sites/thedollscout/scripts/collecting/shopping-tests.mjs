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
