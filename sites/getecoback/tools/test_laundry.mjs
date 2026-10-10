import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {laundry} from '../site/assets/laundry-math.mjs';import {acquisition} from '../site/assets/laundry-check.mjs';import {LAUNDRY_PATHS,validLaundryEvent} from '../src/laundry-events.mjs';import {videoEntry} from '../src/video-entry.mjs';import worker from '../src/worker.js';
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

test('heated-airer costs are illustrative whole-run arithmetic, with matching FAQ and Markdown',()=>{
  const path='../site/en/guide/heated-airer-vs-dehumidifier';
  const h=readFileSync(new URL(path+'.html',import.meta.url),'utf8');
  const md=readFileSync(new URL(path+'.md',import.meta.url),'utf8');
  const cap=JSON.parse(readFileSync(new URL('../data/ofgem-cap.json',import.meta.url),'utf8'));
  const energy=2*300/1000*8, dryer=2;
  for(const text of [h,md]){
    for(const claim of ['Usually yes per session','lands close to a tumble dryer cycle','8 hours (one drying session)','usually faster than either alone'])assert(!text.includes(claim),claim);
    for(const caveat of ['not product measurements or matched drying tests','same laundry mass and final dryness','Lower wattage alone','actual running hours','not a promise that a load will be dry'])assert(text.includes(caveat),caveat);
    assert(text.includes(`${energy.toFixed(1)} kWh (£${(energy*cap.electricity_p_per_kwh/100).toFixed(2)})`));
    assert(text.includes(`${dryer.toFixed(1)} kWh (£${(dryer*cap.electricity_p_per_kwh/100).toFixed(2)})`));
    assert(text.includes(`${(energy/dryer).toFixed(1)} times`));
  }
  const graphs=[...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(m=>{const d=JSON.parse(m[1]);return d['@graph']||[d];});
  const faq=graphs.find(x=>x['@type']==='FAQPage');assert.equal(faq.mainEntity.length,4);
  const visible=h.replace(/<script\b.*?<\/script>/gs,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  for(const q of faq.mainEntity)assert(visible.includes(q.acceptedAnswer.text));
});

test('airer generator keeps the combined example and comparison current when unit rates change',()=>{
  const run=spawnSync('python3',['-c',`import json,sys
sys.path.insert(0,'tools')
from build_ukcost import block
cap=json.load(open('data/ofgem-cap.json'))
print(json.dumps([block({**cap,'electricity_p_per_kwh':rate},'airer') for rate in [0,26.32,70]]))`],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const blocks=JSON.parse(run.stdout);
  for(const [i,rate] of [0,26.32,70].entries()){
    const h=blocks[i];
    assert(h.includes('Airer plus dehumidifier (both at 300 W)</td><td>600 W'));
    assert(h.includes(`4.8 kWh (£${(4.8*rate/100).toFixed(2)})`));
    assert(h.includes(`2.0 kWh (£${(2*rate/100).toFixed(2)})`));
    assert(h.includes('2.4 times'));
    assert(h.includes('not product measurements or matched drying tests'));
    assert(!h.includes('one drying session'));
  }
});
