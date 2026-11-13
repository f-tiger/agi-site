import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeRule,normalizeRules,evaluateRule,markReviewed} from '../../infrastructure-assets/thesis.mjs';
import {normalize,emptyNote,stale} from '../../infrastructure-assets/core.mjs';
import {emitThesis,emitResource,RESOURCE_EVENTS,THESIS_EVENTS,publicThesisLink,thesisAttribution} from '../../infrastructure-assets/thesis-signals.mjs';
import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';
import {campaignFields} from '../../../../tools/fleet-analytics/campaign.mjs';
import {cleanThesisEvent,THESIS_SQL,thesisGrowth} from '../analytics-worker/thesis-growth.mjs';
import {spawnSync} from 'node:child_process';
import worker from '../analytics-worker/index.js';
const now=Date.parse('2026-11-12T14:00:00Z'),snapshot='a'.repeat(20),context={now,snapshot};
const source=JSON.parse(fs.readFileSync(new URL('../../infrastructure-assets/snapshot.json',import.meta.url))).companies.find(c=>c.ticker==='NVDA');
function company(){const c=structuredClone(source);c.checked_at='2026-11-12T12:00:00Z';delete c.refresh_failed;for(const k of ['revenue','ocf','capex']){c.facts[k]={...structuredClone(source.facts.revenue),tag:k==='revenue'?'Revenues':k==='ocf'?'NetCashProvidedByUsedInOperatingActivities':'PaymentsToAcquirePropertyPlantAndEquipment'};c.facts[k].start='2025-01-27';c.facts[k].end='2026-01-25';c.facts[k].filed='2026-03-01';}c.annual_end='2026-01-25';c.facts.revenue.val=100;c.facts.ocf.val=40;c.facts.capex.val=24;c.facts.revenue.previous={start:'2024-01-29',end:'2025-01-26',filed:'2026-03-01',val:80,accn:c.facts.revenue.accn};return c;}
const rule=(metric='capex_to_ocf',threshold=50,op='gt')=>({metric,threshold,op,mode:'own'});
test('export referral links retain only a public company and fixed attribution',()=>{
 for(const lang of ['en','zh']){
  const u=new URL(publicThesisLink('MU',lang));assert.equal(u.origin,'https://agiscorecard.com');assert.equal(u.pathname,(lang==='zh'?'/zh':'')+'/ai-infrastructure');assert.equal(u.searchParams.get('ticker'),'MU');assert.equal(u.hash,'#thesis-watch');assert.deepEqual([...u.searchParams.keys()].sort(),['ticker','utm_campaign','utm_medium','utm_source']);
  assert.deepEqual(campaignFields(u.searchParams),{campaign_source:'reader_share',campaign_medium:'referral',campaign_name:'agi-thesis-watch-01'});
  const event=cleanThesisEvent({n:'thesis_check_own',p:'/ai-infrastructure',u:u.search+'&note=PRIVATE&threshold=PRIVATE'});
  assert.equal(new URLSearchParams(event.u).get('utm_source'),'reader_share');assert(!event.u.includes('MU'));assert(!event.u.includes('PRIVATE'));
 }
 for(const ticker of ['MU?note=PRIVATE','../../../private',null,'UNKNOWN'])assert.throws(()=>publicThesisLink(ticker));
 for(const query of ['utm_campaign=agi-thesis-watch-01&utm_source=reader_share&utm_medium=organic_video','utm_campaign=agi-thesis-watch-01&utm_source=youtube&utm_medium=referral','utm_campaign=private&utm_source=reader_share&utm_medium=referral'])assert.equal(thesisAttribution(query).toString(),'');
});
test('three calculations use actual matched facts, with strict thresholds and negative margins',()=>{
 const c=company();for(const [metric,value]of [['revenue_growth',25],['ocf_margin',40],['capex_to_ocf',60]]){const r=evaluateRule(c,rule(metric,value),context);assert.equal(r.value,value);assert.equal(r.status,'not_triggered');assert.equal(evaluateRule(c,rule(metric,value-1),context).status,'triggered');assert.equal(evaluateRule(c,rule(metric,value+1,'lt'),context).status,'triggered');}
 c.facts.ocf.val=-10;assert.equal(evaluateRule(c,rule('ocf_margin',0,'lt'),context).value,-10);assert.equal(evaluateRule(c,rule(),context).status,'unknown');
 c.facts.ocf.val=10;assert.equal(evaluateRule(c,rule(),context).value,240);
});
test('unavailable is never a non-triggered pass: freshness, units, periods, ambiguity and source identity',()=>{
 const mutations=[c=>c.refresh_failed=true,c=>c.checked_at='not a date',c=>c.checked_at='2026-11-20T12:00:00Z',c=>c.checked_at='2026-11-01T12:00:00Z',c=>c.facts.capex=null,c=>c.facts.capex.error='conflicting_facts',c=>c.facts.capex.unit='EUR',c=>c.facts.capex.basis='adjusted',c=>c.facts.capex.kind='quarter',c=>c.facts.capex.start='2025-02-01',c=>c.facts.capex.filed='2027-01-01',c=>c.facts.capex.source='https://www.sec.gov.evil.test/data',c=>c.facts.ocf.val=0,c=>c.facts.capex.val=-1,c=>c.facts.capex.val=Infinity];
 for(const mutate of mutations){const c=company();mutate(c);assert.equal(evaluateRule(c,rule(),context).status,'unknown');}
 const c=company();for(const k of ['capex','ocf']){c.facts[k].start='2023-01-30';c.facts[k].end='2024-01-28';}c.annual_end='2024-01-28';assert.equal(evaluateRule(c,rule(),context).reason,'annual_age');
 assert.equal(stale({...c,checked_at:'invalid'},now),true);
});
test('prior year must have a positive denominator and comparable full-year duration',()=>{
 for(const mutate of [p=>p.val=0,p=>p.val=-1,p=>p.start='2024-10-01',p=>p.end='2025-02-30',p=>p.filed='2027-01-01',p=>p.accn='unknown']){const c=company();mutate(c.facts.revenue.previous);assert.equal(evaluateRule(c,rule('revenue_growth'),context).reason,'previous');}
});
test('saved checkpoints identify a crossing but do not overwrite themselves on a new check',()=>{
 const c=company(),saved=markReviewed(c,rule('capex_to_ocf',70),context);assert.equal(saved.reviewed.value,60);
 c.facts.capex.val=32;const result=evaluateRule(c,saved,context);assert.equal(result.value,80);assert.equal(result.crossed,true);assert.equal(result.changed,true);assert.equal(saved.reviewed.value,60);
 assert.throws(()=>normalizeRule({...saved,threshold:75}));assert.throws(()=>markReviewed({...c,refresh_failed:true},saved,context));
 saved.reviewed.at='2027-01-01T00:00:00Z';assert.equal(evaluateRule(c,saved,context).previous,null);
});
test('old records round trip; optional rules persist; imported malformed records reject atomically',()=>{
 const old={version:1,product:'ai-infrastructure',values:{selected:'NVDA',watch:['NVDA'],notes:{NVDA:emptyNote()}}};assert.deepEqual(normalize(old),old);
 const next=structuredClone(old);next.values.notes.NVDA.rules=[markReviewed(company(),rule(),context),rule('ocf_margin',10)];assert.deepEqual(normalize(next),next);
 for(const bad of [null,[rule(),rule()],Array.from({length:4},(_,i)=>rule('ocf_margin',i)),[{...rule(),threshold:'20'}],[{...rule(),threshold:true}],[{...rule(),mode:'paid'}],[{...rule(),threshold:Infinity}]]){assert.throws(()=>normalizeRules(bad));}
});
test('client and GA4 collect fixed actions only, respect privacy and exclude all QA modes',()=>{
 const sent=[],events=[];const win={location:{href:'https://agiscorecard.com/ai-infrastructure?ticker=PRIVATE&utm_source=youtube&utm_medium=organic_video&utm_campaign=agi-thesis-watch-01'},navigator:{},localStorage:{getItem:()=>null},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},dispatchEvent:e=>events.push(e),fetch:async(u,o)=>sent.push(JSON.parse(o.body))};
 emitThesis('check','own',win);assert.equal(sent.length,1);assert.equal(events[0].detail.name,'thesis_check_own');assert.deepEqual(Object.keys(sent[0]).sort(),['n','p','u']);assert.ok(!JSON.stringify(sent).includes('PRIVATE'));
 for(const flag of ['__qa','__ci','__probe','qa','ci']){const w={...win,location:{href:win.location.href+'&'+flag+'=anything'}};emitThesis('check','own',w);}for(const flag of ['webdriver','globalPrivacyControl'])emitThesis('check','own',{...win,navigator:{[flag]:true}});emitThesis('check','own',{...win,navigator:{doNotTrack:'1'}});emitThesis('check','own',{...win,localStorage:{getItem:()=> 'denied'}});assert.equal(sent.length,1);
 for(const name of THESIS_EVENTS){assert.deepEqual(businessEvent('agiscorecard.com','/zh/ai-infrastructure',{name}),{name,tool_id:'ai-infrastructure',repeat:true});assert.equal(businessEvent('agiscorecard.com','/invest',{name}),null);assert.equal(businessEvent('agiscorecard.com','/ai-infrastructure',{name,threshold:10}),null);}
});
test('collector drops extra payload and QA before writes; exact eligible records are stored',async()=>{
 assert.equal(cleanThesisEvent({n:'thesis_check_own',p:'/invest'}),null);assert.equal(cleanThesisEvent({n:'thesis_check_own',p:'/ai-infrastructure',threshold:'PRIVATE'}),null);
 const writes=[],waits=[],env={EVENTS:{prepare(sql){return{bind(...args){return{run:async()=>writes.push(args)}}}}}},ctx={waitUntil:p=>waits.push(p)};
 const send=async b=>{await worker.fetch(new Request('https://agiscorecard.com/api/e',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},body:JSON.stringify(b)}),env,ctx);await Promise.all(waits.splice(0));};
 const b={n:'thesis_check_own',p:'/ai-infrastructure',u:'utm_campaign=agi-thesis-watch-01&utm_medium=organic_video&utm_source=youtube'};await send(b);assert.equal(writes.length,1);assert.equal(writes[0][2],'thesis_check_own');assert.deepEqual(writes[0].slice(-3),['youtube','organic_video','agi-thesis-watch-01']);
 await send({...b,b:'PRIVATE'});await send({...b,u:b.u+'&__ci=1'});await send({...b,p:'/'});assert.equal(writes.length,1);
});
test('real SQLite aggregation separates actions and tagged arrivals over complete days',async()=>{
 const py=`import sqlite3,json,sys\ndb=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row\ndb.execute('CREATE TABLE events(day,name,path,ua_class,utm_source,utm_medium,utm_campaign)')\ndef add(name='thesis_check_own',day='-1 day',ua='human',path='/ai-infrastructure',campaign='agi-thesis-watch-01'):\n db.execute("INSERT INTO events VALUES(date('now',?),?,?,?,?,?,?)",(day,name,path,ua,'youtube','organic_video',campaign))\nadd();add(name='thesis_check_sample');add(name='page_view');add(day='0 days');add(day='-29 days');add(ua='bot');add(path='/invest');add(campaign='other');\nprint(json.dumps([dict(r) for r in db.execute(sys.argv[1])]))`;
 const p=spawnSync('python3',['-c',py,THESIS_SQL],{encoding:'utf8',timeout:15000});assert.equal(p.status,0,p.stderr);const rows=JSON.parse(p.stdout);assert.equal(rows.reduce((n,r)=>n+r.n,0),4);assert(rows.some(r=>r.source==='unattributed'));
 assert.equal((await thesisGrowth({})).status,503);const response=await thesisGrowth({EVENTS:{prepare:()=>({all:async()=>({results:rows})})}}),body=await response.json();assert.equal(body.window.complete_utc_days,28);assert.equal(body.metric,'browser_action_events_not_users');
});
test('reader export referrals remain a separate hint and preserve source/date exclusions',async()=>{
 const fixtures=[
  ['thesis_check_own','-1 day','human','/ai-infrastructure','reader_share','referral'],
  ['page_view','-1 day','human','/zh/ai-infrastructure','reader_share','referral'],
  ['thesis_check_own','-1 day','human','/ai-infrastructure','reader_share','organic_video'],
  ['thesis_export_sample','-1 day','human','/ai-infrastructure','youtube','organic_video'],
  ['thesis_check_own','0 days','human','/ai-infrastructure','reader_share','referral'],
  ['thesis_check_own','-29 days','human','/ai-infrastructure','reader_share','referral'],
  ['thesis_check_own','-1 day','ci','/ai-infrastructure','reader_share','referral'],
  ['thesis_check_own','-1 day','human','/invest','reader_share','referral'],
  ['purchase','-1 day','human','/ai-infrastructure','reader_share','referral']
 ];
 const py=`import sqlite3,json,sys\ndb=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row\ndb.execute('CREATE TABLE events(day,name,path,ua_class,utm_source,utm_medium,utm_campaign)')\nfor name,day,ua,path,source,medium in json.loads(sys.argv[2]):\n db.execute("INSERT INTO events VALUES(date('now',?),?,?,?,?,?,?)",(day,name,path,ua,source,medium,'agi-thesis-watch-01'))\nprint(json.dumps([dict(r) for r in db.execute(sys.argv[1])]))`;
 const p=spawnSync('python3',['-c',py,THESIS_SQL,JSON.stringify(fixtures)],{encoding:'utf8',timeout:15000});assert.equal(p.status,0,p.stderr);const rows=JSON.parse(p.stdout);const sum=source=>rows.filter(r=>r.source===source).reduce((n,r)=>n+r.n,0);assert.equal(sum('reader_share'),2);assert.equal(sum('youtube'),1);assert.equal(sum('unattributed'),1);assert.equal(rows.reduce((n,r)=>n+r.n,0),4);
 const response=await thesisGrowth({EVENTS:{prepare:()=>({all:async()=>({results:rows})})}});assert.equal(response.status,200);assert((await response.json()).rows.some(r=>r.source==='reader_share'));
});

test('research-resource opens remain separate, fixed and private through client, GA4 and aggregate',async()=>{
 const sent=[],events=[];const win={location:{href:'https://agiscorecard.com/zh/ai-infrastructure?ticker=PRIVATE&note=PRIVATE'},navigator:{},localStorage:{getItem:()=>null},CustomEvent:class{constructor(type,options){this.detail=options.detail;}},dispatchEvent:e=>events.push(e),fetch:async(u,o)=>sent.push(JSON.parse(o.body))};
 for(const id of ['sec','stockanalysis','koyfin','fiscal'])emitResource(id,win);
 assert.equal(sent.length,4);assert.equal(events[0].detail.name,'legacy:invest_tool_click');assert.equal(businessEvent('agiscorecard.com','/zh/ai-infrastructure',events[0].detail).name,'invest_tool_click');assert(!JSON.stringify(sent).includes('PRIVATE'));assert(!sent.some(e=>THESIS_EVENTS.includes(e.n)));
 for(const name of RESOURCE_EVENTS){assert.equal(businessEvent('agiscorecard.com','/zh/ai-infrastructure',{name}),null);assert.equal(businessEvent('baipiaoji.com','/ai-infrastructure',{name}),null);assert.equal(businessEvent('agiscorecard.com','/invest',{name}),null);assert.equal(businessEvent('agiscorecard.com','/ai-infrastructure',{name,note:'PRIVATE'}),null);assert.ok(THESIS_SQL.includes(name));assert.deepEqual(cleanThesisEvent({n:name,p:'/zh/ai-infrastructure',u:'note=PRIVATE'}),{n:name,p:'/zh/ai-infrastructure',u:''});}
 for(const id of ['unknown','sec?note=PRIVATE',null])emitResource(id,win);
 for(const key of ['__ci','__qa','__probe','ci','qa'])emitResource('sec',{...win,location:{href:win.location.href+'&'+key+'=1'}});
 for(const navigator of [{webdriver:true},{globalPrivacyControl:true},{doNotTrack:'1'}])emitResource('sec',{...win,navigator});
 emitResource('sec',{...win,localStorage:{getItem:()=> 'denied'}});assert.equal(sent.length,4);
 const response=await thesisGrowth({EVENTS:{prepare:()=>({all:async()=>({results:[{day:'2026-11-13',name:'thesis_resource_sec',source:'unattributed',n:1}]})})}});const j=await response.json();assert.equal(j.ok,true);assert.equal(j.rows[0].event,'thesis_resource_sec');assert(j.limits.some(x=>x.includes('not affiliate sales')));
});
