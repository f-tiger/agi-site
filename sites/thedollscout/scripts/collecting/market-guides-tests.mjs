import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadMarketGuides,validateMarketGuides,buildMarketPages} from './market-guides.mjs';
import {MARKET_PATHS,marketMeasurement} from '../../collector-assets/market-contract.mjs';
import {marketPayload,installMarketMeasurement} from '../../collector-assets/market-guides.mjs';
import {onRequestPost,langOf} from '../../functions/api/ev.js';
import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';
import {changedUrls} from '../indexnow.mjs';
import {loadHomeCatalog} from './home-catalog.mjs';
import {createRoutes} from '../../../../tools/fleet/pages-static-routes.mjs';
const data=loadMarketGuides(),files=new Map();
const records=buildMarketPages({write:(p,s)=>files.set(p,s)});
test('eight distinct regional pages preserve original 100-model catalogue and local destinations',()=>{
 assert.equal(loadHomeCatalog().length,100);assert.equal(records.length,8);assert.equal(new Set(records.map(r=>r.url)).size,8);
 for(const r of records){const m=data.markets.find(m=>m.id===r.market),p=new URL(r.url).pathname,h=files.get(p.slice(1)+(r.slug?'.html':'index.html'));
  assert.equal((h.match(/<h1>/g)||[]).length,1);assert(h.includes(`<html lang="${m.lang}">`));assert(h.includes(`rel="canonical" href="${r.url}"`));assert(h.includes('data-market-guide'));
  for(const a of r.alternatives){assert(h.includes(`hreflang="${a.lang}" href="${a.url}"`));const other=records.find(x=>x.url===a.url);assert(other.alternatives.some(x=>x.url===r.url));}
  assert(!/amazon\.com\/|amazon\.de\/|tag=|rel="sponsored|"@type":"(?:Product|Review|FAQPage|AggregateRating|Offer)"/.test(h));
  for(const a of h.matchAll(/href="(https:\/\/www\.amazon[^\"]+)"/g)){const url=new URL(a[1]);assert.equal(url.hostname,'www.'+m.merchant);assert.equal(url.pathname,'/s');}
  const mirror=files.get(new URL(r.textUrl).pathname.slice(1));assert(mirror.includes(r.url));if(r.slug){const g=m.guides.find(g=>g.slug===r.slug);assert(mirror.includes(g.answer));for(const model of g.models)assert(mirror.includes(model.check));}
  assert(h.includes('market-guides.mjs?v=20261115.uknl1'));
 }
});
test('bad country routes, source URLs and incomplete original guidance cannot publish',()=>{
 for(const edit of [d=>d.markets[1].id='uk',d=>d.markets[0].merchant='amazon.com',d=>d.markets[0].guides[0].slug='unknown',d=>d.markets[0].guides[0].sources[0].url='https://evil.test/',d=>d.markets[0].guides[0].models[0].url+='?tag=wrong',d=>d.markets[0].guides[0].comparisons=[]]){const d=structuredClone(data);edit(d);assert.throws(()=>validateMarketGuides(d));}
});
test('same named UK and NL plugs use distinct source and load notes; US box identity not reused',()=>{
 const uk=data.markets[0],nl=data.markets[1];assert(uk.guides[2].decisions.some(x=>x.body.includes('13A')));assert(nl.guides[2].models.some(x=>x.check.includes('16A')));
 assert(uk.guides[0].models[0].check.includes('US 4C'));assert(nl.guides[0].models[1].check.includes('Amerikaanse 4C'));assert(!files.get('uk/storage-boxes.html').includes('B000KN4DQ4'));
});
function runtime({path='/uk/storage-boxes',query='',denied=false,qa=false,host='thedollscout.com',privacy={}}={}){
 const handlers=[],posts=[],business=[],win={dispatchEvent:e=>business.push(e.detail)};win.top=win.self=win;
 const rt={location:new URL('https://'+host+path+query),navigator:{userAgent:'Mozilla/5.0',webdriver:qa,...privacy},localStorage:{getItem:()=>denied?'denied':null},document:{querySelector:()=>({href:'https://thedollscout.com'+path}),addEventListener:(n,f)=>handlers.push(f)},window:win,fetch:async(u,o)=>posts.push(JSON.parse(o.body)),CustomEvent:class{constructor(type,opts){this.detail=opts.detail;}}};
 const event=(href='https://www.amazon.co.uk/s?k=PRIVATE_MODEL',kind='shop',trusted=true)=>({isTrusted:trusted,target:{closest:()=>({href,hasAttribute:n=>n==='data-market-'+kind})}});
 return{rt,event,handlers,posts,business};
}
test('browser sends only fixed local click and host, with correct merchant and dynamic opt-out',()=>{
 const f=runtime(),e=f.event();assert.deepEqual(marketPayload(e,f.rt),{p:'/uk/storage-boxes',e:'market_shop_click',r:'https://amazon.co.uk'});
 installMarketMeasurement(f.rt);f.handlers[0](e);assert.equal(f.posts.length,1);assert.equal(f.business[0].name,'tds_market_shop');assert(!JSON.stringify(f.posts).includes('PRIVATE'));
 f.rt.localStorage.getItem=()=> 'denied';f.handlers[0](e);assert.equal(f.posts.length,1);
 for(const cfg of [{denied:true},{qa:true},{host:'preview.pages.dev'},{query:'?__probe=1'},{query:'?utm_source=verify'},{privacy:{doNotTrack:'1'}},{privacy:{globalPrivacyControl:true}}]){const excluded=runtime(cfg);assert.equal(marketPayload(excluded.event(),excluded.rt),null);}
 const active=runtime();for(const href of ['https://www.amazon.nl/s?k=test','https://www.amazon.co.uk/s?k=test&tag=wrong','https://www.amazon.co.uk/dp/FAKE','https://user@www.amazon.co.uk/s?k=test'])assert.equal(marketPayload(active.event(href),active.rt),null);
 assert.equal(marketPayload(active.event(undefined,'shop',false),active.rt),null);
 assert.equal(marketPayload(active.event('https://www.ikea.com/gb/en/p/item/','source'),active.rt).e,'market_source_click');
});
test('ordinary merchant/source action is not an affiliate event or revenue',()=>{
 for(const p of Object.keys(MARKET_PATHS))for(const name of ['tds_market_shop','tds_market_source']){
  assert.deepEqual(businessEvent('thedollscout.com',p,{name}),{name,tool_id:'local-buying-guide',repeat:true});
  assert.equal(businessEvent('getecoback.com',p,{name}),null);assert.equal(businessEvent('thedollscout.com',p,{name,model:'PRIVATE'}),null);
 }
 for(const p of ['/','/uk/private','/nl/opbergboxen?model=PRIVATE'])assert.equal(businessEvent('thedollscout.com',p,{name:'tds_market_shop'}),null);
});
async function record(body,headers={}){
 const rows=[],pending=[];const ctx={request:new Request('https://thedollscout.com/api/ev',{method:'POST',headers:{origin:'https://thedollscout.com','user-agent':'Mozilla/5.0',...headers},body:JSON.stringify(body)}),env:{HITS:{prepare:()=>({bind:(...v)=>({run:async()=>rows.push(v)})})}},waitUntil:p=>pending.push(p)};
 assert.equal((await onRequestPost(ctx)).status,204);await Promise.all(pending);return rows;
}
test('server stores host-only local actions, rejects private fields, wrong markets and QA',async()=>{
 const b={p:'/nl/opbergboxen',e:'market_shop_click',r:'https://amazon.nl'};
 const rows=await record(b);assert.equal(rows.length,1);assert.equal(rows[0][2],'nl');assert.equal(rows[0][4],'amazon.nl');assert.equal(rows[0][5],'market_shop_click');assert.equal(langOf('/uk/'),'en');assert.equal(langOf('/'),'de');
 for(const body of [{...b,item:'private'},{...b,p:'/nl/no-page'},{...b,r:'https://amazon.co.uk'},{...b,r:'https://amazon.nl/s?k=SECRET'},{...b,r:'https://amazon.nl/?x=secret'},{...b,r:'https://amazon.nl.evil.test'},{...b,r:'https://user@amazon.nl'},{...b,p:'/nl/opbergboxen?qa=1'}])assert.deepEqual(await record(body),[]);
 for(const headers of [{'x-probe':'1'},{dnt:'1'},{'sec-gpc':'1'},{'user-agent':'Googlebot'},{cookie:'tds_analytics_choice_v1=denied'}])assert.deepEqual(await record(b,headers),[]);
 assert.equal(marketMeasurement({...b,r:'https://amazon.nl:444/'}),null);
});
test('new static files map to canonical IndexNow URLs without notifications from content JSON',()=>{
 assert.deepEqual(changedUrls(['sites/thedollscout/uk/index.html','sites/thedollscout/nl/opbergboxen.html','sites/thedollscout/content/market-guides.json']),['https://thedollscout.com/uk/','https://thedollscout.com/nl/opbergboxen']);
 const workflow=fs.readFileSync(new URL('../../../../.github/workflows/deploy-thedollscout.yml',import.meta.url),'utf8');assert(workflow.includes('verify-market-guides.mjs --live'));assert(workflow.includes('market-guides-tests.mjs'));
});
test('only reviewed regional manifest and text files bypass Functions',()=>{
 const paths=['/collector-assets/market-manifest.json',...records.map(r=>new URL(r.textUrl).pathname)];
 assert.deepEqual(createRoutes('tds',paths).exclude,['/collector-assets/*']);
 for(const p of ['/collector-assets/text/nl/private.txt','/collector-assets/private.json','/collector-assets/text/uk/customer.txt'])assert.throws(()=>createRoutes('tds',[...paths,p]));
});
