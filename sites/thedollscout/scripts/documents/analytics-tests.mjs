import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';
const source = fs.readFileSync(new URL('../../document-assets/analytics.mjs',import.meta.url),'utf8').replace(/^import .*business.mjs.*;$/m,'');
function fixture(options={}) {
  const scripts=[],elements=[],cookies=[],storage=new Map(options.choice?[['tds_analytics_choice_v1',options.choice]]:[]);
  const element=tag=>{const e={tag,dataset:{},hidden:false,children:[],setAttribute(){},append(...v){this.children.push(...v);},addEventListener(n,f){this[n]=f;},focus(){}};elements.push(e);return e;};
  const document={documentElement:{lang:'en'},title:'Public tool title',referrer:'https://google.com/search?q=PRIVATE',head:{append:e=>scripts.push(e)},body:element('body'),getElementById:()=>null,createElement:element,querySelector:s=>s.includes('canonical')?{href:options.url||'https://thedollscout.com/verify-file?private=SECRET#fingerprint'}:null};
  Object.defineProperty(document,'cookie',{get:()=>'_ga=123; _ga_2SEHFY33H8=456; unrelated=keep',set:v=>cookies.push(v)});
  const listeners={};const window={DS_CONFIG:{ga4Id:'G-2SEHFY33H8'},addEventListener:(name,fn)=>listeners[name]=fn};
  const context={businessEvent,window,document,location:new URL(options.url||'https://thedollscout.com/verify-file?private=SECRET#fingerprint'),navigator:{...options.navigator},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},URL,URLSearchParams,Date};
  vm.runInNewContext(source,context);
  const click=value=>elements.find(e=>e.dataset.analyticsChoice===value).click();
  return {window,scripts,elements,cookies,storage,click,emit:detail=>listeners['fleet:business']({detail})};
}
test('GA4 loads only after opt-in and only once; payload strips query, fragment and referrer path',()=>{
  const f=fixture();assert.equal(f.scripts.length,0);assert.equal(f.window.gtag,undefined);
  f.click('granted');f.click('granted');assert.equal(f.scripts.length,1);
  assert.equal(f.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-2SEHFY33H8');
  const config=f.window.dataLayer.find(a=>a[0]==='config');
  assert.equal(config[1],'G-2SEHFY33H8');assert.equal(config[2].page_location,'https://thedollscout.com/verify-file');assert.equal(config[2].page_referrer,'https://google.com/');
  assert(!JSON.stringify(f.window.dataLayer).includes('SECRET'));assert(!JSON.stringify(f.window.dataLayer).includes('PRIVATE'));assert(!JSON.stringify(f.window.dataLayer).includes('fingerprint'));
});
test('remembered consent, decline, withdrawal and regrant retain the visitor choice',()=>{
  assert.equal(fixture({choice:'granted'}).scripts.length,1);assert.equal(fixture({choice:'denied'}).scripts.length,0);
  const f=fixture();f.click('denied');assert.equal(f.scripts.length,0);f.click('granted');assert.equal(f.scripts.length,1);
  f.click('denied');assert.equal(f.window['ga-disable-G-2SEHFY33H8'],true);assert(f.cookies.every(c=>c.startsWith('_ga')));assert.equal(f.cookies.length,12);
  f.click('granted');assert.equal(f.window['ga-disable-G-2SEHFY33H8'],false);assert.equal(f.scripts.length,1);assert.equal(f.window.dataLayer.at(-1)[2].analytics_storage,'granted');
});
test('QA, bots, preview hosts and privacy signals cannot create Google requests even with stored consent',()=>{
  const cases=[{url:'https://thedollscout.com/?__ci=1'},{url:'https://thedollscout.com/?ci=1'},{url:'https://thedollscout.com/?__probe=1'},{url:'https://thedollscout.com/?utm_source=verify'},{url:'https://thedollscout.com/__ci/documents'},{url:'https://preview.pages.dev/'},{navigator:{webdriver:true}},{navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}}];
  for(const c of cases){const f=fixture({...c,choice:'granted'});assert.equal(f.scripts.length,0);assert.equal(f.elements.filter(e=>e.tag==='section').length,0);}
});

test('Business events require consent, valid route and fixed action; repeats and private fields are rejected',()=>{
 const f=fixture({url:'https://thedollscout.com/de/pdf-to-text?private=SECRET'});
 f.emit({name:'doc_complete'});assert.equal(f.window.gtag,undefined);
 f.click('granted');f.emit({name:'doc_sample'});f.emit({name:'doc_complete',filename:'SECRET'});
 f.emit({name:'doc_complete'});f.emit({name:'doc_complete'});
 f.click('denied');f.emit({name:'doc_export'});
 f.click('granted');f.emit({name:'doc_export'});
 const events=f.window.dataLayer.filter(a=>a[0]==='event');
 assert.deepEqual(Array.from(events,a=>a[1]),['tool_example_run','tool_complete','tool_export']);
 assert(events.every(a=>a[2].tool_id==='pdf-to-text'));assert(!JSON.stringify(events).includes('SECRET'));
});
