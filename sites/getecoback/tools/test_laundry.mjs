import {runInNewContext} from 'node:vm';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
import {laundry} from '../site/assets/laundry-math.mjs';import {acquisition,laundryInputKind} from '../site/assets/laundry-check.mjs';import {LAUNDRY_PATHS,validLaundryEvent} from '../src/laundry-events.mjs';import {videoEntry} from '../src/video-entry.mjs';import worker from '../src/worker.js';
const x={dryer:1.5,dryerBasis:'cycle',method:'estimate',watts:250,hours:8,dehum:2,price:.35,loads:3,purchase:200,currency:'EUR',comparable:true};
test('same dry load: low watts can lose, shorter runtime can win, labels normalize exactly',()=>{let r=laundry(x);assert.equal(r.dehum,2);assert.equal(r.winner,'dryer');assert.equal(r.breakEvenHours,6);assert.equal(r.payback,null);r=laundry({...x,hours:4});assert.equal(r.winner,'dehum');assert.ok(Math.abs(r.annualDifference-27.3)<1e-10);assert.ok(Math.abs(r.payback-200/27.3)<1e-10);assert.deepEqual(laundry({...x,dryer:150,dryerBasis:'hundred'}),laundry(x));assert.equal(laundry({...x,hours:6}).winner,'tie');});
test('measured kWh takes precedence; unmatched drying never returns a winner or payback',()=>{const r=laundry({...x,method:'measured',dehum:.8,watts:NaN,hours:NaN});assert.equal(r.dehum,.8);assert.equal(r.breakEvenHours,null);for(const hours of [0,4,8]){const a=laundry({...x,hours,comparable:false});assert.equal(a.winner,'unconfirmed');assert.equal(a.payback,null);}assert.equal(laundry({...x,hours:4,loads:0}).payback,null);assert.equal(laundry({...x,price:0}).winner,'tie');for(const change of [{price:-1},{dryer:Infinity},{dryer:21},{currency:'JPY'},{method:'bad'},{hours:NaN}])assert.throws(()=>laundry({...x,...change}),RangeError);});
test('fixed channel links preserve probes, never accept arbitrary destinations or attribution',()=>{for(const source of ['youtube','tiktok']){const res=videoEntry(new URL('https://getecoback.com/dry-'+source+'?next=https://evil.test&__probe=1'));const u=new URL(res.headers.get('location'));assert.equal(u.pathname,LAUNDRY_PATHS[1]);assert.equal(u.hash,'#laundry-check');assert.equal(u.searchParams.get('__probe'),'1');assert(!u.searchParams.has('next'));assert.deepEqual(acquisition(u.href),{source,evidence:'tag_only'});assert.equal(acquisition(u.href,'https://'+source+'.com/watch').evidence,'referrer');assert.equal(acquisition(u.href,'https://'+source+'.com.evil.test/').evidence,'other');assert.equal(acquisition(u.href.replace('eco-laundry-03','other')).source,'onsite');}assert.equal(videoEntry(new URL('https://getecoback.com/dry-tiktok'),'POST'),null);});
test('actual collector rejects meter readings and preserves bounded metadata while suppressing bots and DNT',async()=>{let writes=[];const env={EVENTS:{prepare:()=>({bind:(...args)=>({run:async()=>writes.push(args)})})}};const b={n:'laundry_compare',p:LAUNDRY_PATHS[1],r:'https://www.youtube.com/watch?secret=private',m:{lang:'en',input:'edited',method:'measured',equal:'yes',action:'compare',source:'youtube',evidence:'referrer'}};const send=(body,headers={})=>worker.fetch(new Request('https://getecoback.com/api/ev',{method:'POST',headers:{'user-agent':'Mozilla/5.0',...headers},body:JSON.stringify(body)}),env,{});assert(validLaundryEvent(b));assert(JSON.stringify(b.m).length<200);assert.equal((await send(b)).status,200);assert.equal(writes.length,1);assert.equal(writes[0][3],'www.youtube.com');for(const bad of [{...b,p:'/'},{...b,m:{...b.m,kwh:1.5}},{...b,m:{...b.m,lang:'de'}},{...b,m:{...b.m,action:'buy'}}])assert.equal((await send(bad)).status,400);for(const headers of [{dnt:'1'},{'sec-gpc':'1'},{'user-agent':'getecoback-ci'}])await send(b,headers);assert.equal(writes.length,1);});
test('both existing pages contain one localized calculator and do not claim measured performance',()=>{for(const path of LAUNDRY_PATHS){const h=readFileSync(new URL('../site'+path,import.meta.url),'utf8');assert.equal((h.match(/id="laundry-check"/g)||[]).length,1);assert(h.includes('laundry-check.mjs'));assert(h.includes('37984'));}const en=readFileSync(new URL('../site'+LAUNDRY_PATHS[1],import.meta.url),'utf8');assert(!en.includes('usually wins'));assert(!en.includes('those two numbers decide'));assert(!en.includes('60 per cent at a cool wall surface'));});


test('German laundry guide keeps illustrative runtimes separate from measured dry loads',()=>{
  const h=readFileSync(new URL('../site/guide/waesche-trocknen-wohnung.html',import.meta.url),'utf8');
  const md=readFileSync(new URL('../site/guide/waesche-trocknen-wohnung.md',import.meta.url),'utf8');
  for(const text of [h,md]){
    for(const claim of ['6 Std. (1 Ladung)','Das sind Obergrenzen','fast immer günstiger','Der Entfeuchter ist meist günstiger','gar nicht erst an der Wand','Wäsche schneller trocken, Wände geschützt','60 % an kühlen Wandflächen beginnt Schimmel'])assert(!text.includes(claim),claim);
    for(const caveat of ['6 Std. (Beispiel)','12 × 6 Std. in 4 Wochen','keine Obergrenzen für eine trockene Ladung','gleichen Trocknungsgrad','keine Schimmelfrei-Garantie'])assert(text.includes(caveat),caveat);
  }
  const graphs=[...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(m=>{const d=JSON.parse(m[1]);return d['@graph']||[d];});
  const faq=graphs.find(x=>x['@type']==='FAQPage');assert.equal(faq.mainEntity.length,6);
  const visible=h.replace(/<script\b.*?<\/script>/gs,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  for(const q of faq.mainEntity)assert(visible.includes(q.acceptedAnswer.text));
  assert(h.includes('Watt ÷ 1.000 × Stunden × Strompreis'));
  for(const value of ['200 W','300 W','500 W','0,36 €','0,54 €','0,90 €','4,32 €','6,48 €','10,80 €'])assert(h.includes(value));
});


test('mode-only and equal-confirmation changes remain examples; inactive fields do not count as edits',()=>{
 for(const method of ['estimate','measured'])for(const comparable of [false,true])assert.equal(laundryInputKind({...x,method,comparable},x),'example');
 assert.equal(laundryInputKind({...x,method:'measured',watts:0,hours:0},x),'example');
 assert.equal(laundryInputKind({...x,dehum:42},x),'example');
 for(const change of [{dryer:1.6},{price:.36},{hours:7},{purchase:201},{loads:4},{method:'measured',dehum:1.1}])assert.equal(laundryInputKind({...x,...change},x),'edited');
 assert.equal(laundryInputKind({...x,method:'measured',dehum:2},x),'example');
});



test('tracker rebuild preserves laundry probe guards and current asset hash without changing other pages',()=>{
 const code=`from pathlib import Path
import build_structure as b
import hashlib
from laundry_decision import block
version=hashlib.sha256((Path(b.SITE)/'assets/laundry-check.mjs').read_bytes()).hexdigest()[:12]
for english in (False,True):
    assert block(english).count('/assets/laundry-check.mjs?v='+version+'"')==1
guard='if(new URLSearchParams(location.search).get("__probe")==="1")return;'
for route in (b.LAUNDRY_DE,b.LAUNDRY_EN):
    html=(Path(b.SITE)/route.lstrip('/')).read_text()
    rebuilt=b.inject_track(html)
    assert rebuilt.count(guard)==1, route
    assert b.inject_track(rebuilt)==rebuilt, route
ordinary='<html><head><link rel="canonical" href="https://getecoback.com/guide/other.html"></head><body></body></html>'
assert b.inject_track(ordinary)==ordinary.replace('</body>',b.TRACK+'\\n</body>',1)
print('PASS')`;
 assert.equal(execFileSync('python3',['-c',code],{cwd:new URL('.',import.meta.url),encoding:'utf8'}).trim(),'PASS');
});


// Exercise the actual module against a small local DOM fixture. The browser
// suite separately verifies native click/Enter trust and the isolated channel.
function client({lang='en',active=true,started=true,privacy={},search=''}={}){
 const nodes=new Map(),business=[],d1=[],downloads=[],timers=[],blobs=[];
 const element=()=>({dataset:{},style:{},hidden:false,textContent:'',listeners:{},addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},fire(name,e={}){for(const fn of this.listeners[name]||[])fn({target:this,isTrusted:false,preventDefault(){},...e});},focus(){}});
 const q=selector=>{if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);};
 const form=q('form'),initial={...x,purchase:0,comparable:false};form.elements=Object.fromEntries(Object.entries(initial).map(([name,value])=>[name,{value:String(value),checked:value===true,disabled:false}]));
 form.reset=()=>{for(const [name,value]of Object.entries(initial)){form.elements[name].value=String(value);form.elements[name].checked=value===true;}};
 form.valid=true;form.reportValidity=()=>form.valid;
 const root={dataset:{lang},querySelector:q},settings={dataset:{analyticsChoice:'denied'}};let frame={contentWindow:{}};
 const document={referrer:'https://www.google.com/search?q=private',querySelector:selector=>selector==='#laundry-check'?root:selector==='#fleet-analytics-settings'?settings:selector==='iframe[title="Optional analytics"]'?frame:null,createElement:tag=>tag==='canvas'?{getContext:()=>({fillRect(){},fillText(){},measureText:s=>({width:s.length*7})}),toBlob:fn=>blobs.push(fn)}:{click(){downloads.push(this.download);}}};
 const window={...element(),__ecoToolExample:false,dispatchEvent:event=>business.push(event.detail)};
 const context={document,window,navigator:{...privacy},location:{search,pathname:LAUNDRY_PATHS[lang==='en'?1:0],href:'https://getecoback.com'+LAUNDRY_PATHS[lang==='en'?1:0]+search},URL,Blob,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},FormData:class{get(name){const e=form.elements[name];return e.disabled?null:e.value;}has(name){return form.elements[name].checked;}},fetch:(url,options)=>{d1.push(JSON.parse(options.body));return Promise.resolve();},setTimeout:fn=>timers.push(fn),laundry};
 const source=readFileSync(new URL('../site/assets/laundry-check.mjs',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('export function ','function ');
 runInNewContext(source,context);
 const handshake=(overrides={})=>window.fire('message',{isTrusted:true,origin:'https://getecoback.com',source:frame?.contentWindow,data:{type:'fleet-ga4-started'},...overrides});
 const choose=(enabled,ready=true)=>{settings.dataset.analyticsChoice=enabled?'denied':'granted';frame=enabled?{contentWindow:{}}:null;if(enabled&&ready)handshake();};if(!active)choose(false);else if(started)handshake();
 const submit=(trusted=true,click=trusted)=>{if(click)form.fire('click',{isTrusted:trusted,target:{closest:()=>({form})}});form.fire('submit',{isTrusted:trusted});};
 const edit=(name,value)=>{form.elements[name].value=String(value);form.fire('input');form.fire('change');};
 return {form,q,window,settings,business,d1,downloads,blobs,submit,edit,choose,handshake,frame:()=>frame,hideChannel:()=>{frame=null;},showChannel:()=>{frame={contentWindow:{}};handshake();},tick:()=>{while(timers.length)timers.shift()();},click:(selector,trusted=true)=>q(selector).fire('click',{isTrusted:trusted}),flushBlob:blob=>blobs.shift()?.(blob),events:()=>business.map(e=>e.name)};
}

test('generic bridge emits name-only visitor actions once, with bounded D1 details left in D1',()=>{
 for(const lang of ['de','en']){
  const f=client({lang});f.window.__ecoToolExample=true;f.submit();f.window.__ecoToolExample=false;
  assert.deepEqual(f.events(),[]);assert.equal(f.d1.length,0);
  f.submit(true,false);f.submit(false);assert.deepEqual(f.events(),[],'requestSubmit or synthetic submit is not a visitor activation');
  f.edit('method','measured');f.submit();assert.deepEqual(f.events(),['legacy:tool_complete']);assert.equal(f.d1.at(-1).m.input,'example');
  f.edit('dehum','1.234567');f.submit();f.submit();assert.equal(f.events().length,1);
  f.click('[data-csv]');f.click('[data-csv]');f.click('[data-card]');f.flushBlob(new Blob(['png']));
  assert.deepEqual(f.events(),['legacy:tool_complete','legacy:tool_export']);
  for(const detail of f.business)assert.deepEqual(Object.keys(detail),['name']);
  for(const event of f.d1){assert(validLaundryEvent(event));assert(!JSON.stringify(event.m).includes('1.234567'));}
 }
});
test('native examples have one example owner; later explicit preset/shared operations are generic actions',()=>{
 const f=client();f.click('[data-example]');assert.deepEqual(f.events(),['eco_tool_example']);
 f.window.__ecoToolExample=true;f.edit('price','.2');f.submit(true,false);f.window.__ecoToolExample=false;
 assert.deepEqual(f.events(),['eco_tool_example']);
 f.submit();f.click('[data-csv]');assert.deepEqual(f.events(),['eco_tool_example','legacy:tool_complete','legacy:tool_export']);
 assert(!JSON.stringify(f.business).includes('edited'),'generic operations make no input-provenance claim');
});
test('failed/stale exports and expired activation cannot consume the generic action',()=>{
 const f=client();f.edit('dryer',21);f.submit();f.click('[data-csv]');assert.deepEqual(f.events(),[]);
 f.form.fire('click',{isTrusted:true,target:{closest:()=>({form:f.form})}});f.tick();f.edit('dryer',1.5);f.submit(true,false);assert.deepEqual(f.events(),[]);
 f.edit('hours',4);f.click('[data-csv]');assert.deepEqual(f.events(),[]);f.submit();
 f.click('[data-card]');f.flushBlob(null);assert.deepEqual(f.events(),['legacy:tool_complete']);
 f.click('[data-card]');f.edit('hours',5);f.flushBlob(new Blob(['stale']));assert.equal(f.downloads.length,0);
 f.submit();f.click('[data-card]');f.flushBlob(new Blob(['current']));assert.deepEqual(f.events(),['legacy:tool_complete','legacy:tool_export']);
});
test('denied/unavailable actions are not consumed or replayed, including delayed card completion',()=>{
 const f=client({active:false});f.submit();f.click('[data-csv]');f.choose(true);assert.deepEqual(f.events(),[]);
 f.submit();assert.deepEqual(f.events(),['legacy:tool_complete']);f.choose(false);f.click('[data-card]');f.choose(true);f.flushBlob(new Blob(['denied action']));assert.deepEqual(f.events(),['legacy:tool_complete']);
 f.click('[data-card]');f.choose(false);f.choose(true);f.flushBlob(new Blob(['withdrawn pending action']));assert.deepEqual(f.events(),['legacy:tool_complete']);
 f.click('[data-csv]');f.choose(false);f.choose(true);f.submit();f.click('[data-csv]');assert.deepEqual(f.events(),['legacy:tool_complete','legacy:tool_export']);
 const early=client();early.hideChannel();early.submit();early.click('[data-csv]');early.showChannel();assert.deepEqual(early.events(),[]);early.submit();early.click('[data-csv]');assert.deepEqual(early.events(),['legacy:tool_complete','legacy:tool_export']);
});
test('laundry bridge and D1 honor probe, QA, DNT, GPC and webdriver exclusions',()=>{
 for(const options of [{search:'?__probe=1'},{search:'?__qa=1'},{privacy:{doNotTrack:'1'}},{privacy:{globalPrivacyControl:true}},{privacy:{webdriver:true}}]){
  const f=client(options);f.submit();f.click('[data-csv]');f.click('[data-example]');assert.deepEqual(f.events(),[]);assert.equal(f.d1.length,0);
 }
});

test('only the current frame startup handshake permits dedup; withdrawal before it loses no future action',()=>{
 const f=client({started:false});f.submit();f.click('[data-csv]');assert.deepEqual(f.events(),[]);
 const oldFrame=f.frame();f.choose(false);f.choose(true,false);
 for(const message of [{origin:'https://other.example'},{source:oldFrame.contentWindow},{data:{type:'fleet-ga4-ready'}},{isTrusted:false}]){
  f.handshake(message);f.submit();f.click('[data-csv]');assert.deepEqual(f.events(),[]);
 }
 f.handshake();assert.deepEqual(f.events(),[],'readiness must not replay earlier actions');f.submit();f.click('[data-csv]');assert.deepEqual(f.events(),['legacy:tool_complete','legacy:tool_export']);
});
