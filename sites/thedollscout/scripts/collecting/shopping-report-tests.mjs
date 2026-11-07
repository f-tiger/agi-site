import test from 'node:test';
import assert from 'node:assert/strict';
import {shoppingWindow,SHOPPING_PATHS,MERCHANTS,CACHE_SECONDS,SCHEMA_VERSION} from '../../functions/api/shopping-growth.js';
import {summarizeShoppingReport,healthSummary,fetchShoppingReport} from './shopping-report.mjs';

const now=new Date('2026-11-10T06:01:00Z');
const row=(event='pageview',n=1,extra={})=>{
 const dimensionless=event==='pageview'||event==='shopping_compare',official=event==='shopping_official_click';
 return {date:'2026-11-09',path:'/shop/display-cases',country:'US',event,
  merchant:dimensionless?null:official?'ikea.com':'amazon.com',
  item:dimensionless?null:official?'blaliden':'unknown',placement:dimensionless?null:official?'card':'unknown',n,...extra};
};
function fixture(generated='2026-11-10T06:00:00Z',daily=[]){
 const window=shoppingWindow(new Date(generated));
 return {ok:true,schema_version:SCHEMA_VERSION,generated,...window,unit:'anonymous_events_not_users',cache_seconds:CACHE_SECONDS,
  scope:{paths:SHOPPING_PATHS,merchants:MERCHANTS},daily,query_rows_read:0,
  counts:window.coveredDays?{pageviews:daily.filter(r=>r.event==='pageview').reduce((sum,r)=>sum+r.n,0),
   affiliate_clicks:daily.filter(r=>r.event==='affiliate_click').reduce((sum,r)=>sum+r.n,0),
   official_clicks:daily.filter(r=>r.event==='shopping_official_click').reduce((sum,r)=>sum+r.n,0),
   compare_actions:daily.filter(r=>r.event==='shopping_compare').reduce((sum,r)=>sum+r.n,0)}:null};
}

test('Pending observation is successful without treating absent coverage as measured activity',()=>{
 const data=fixture('2026-11-08T23:59:00Z');
 const report=summarizeShoppingReport(data,{now:new Date(data.generated)});
 assert.deepEqual(report,{ok:true,status:'pending_first_complete_day'});
 assert.match(healthSummary(report),/Missing coverage is not zero activity/);
 assert.doesNotMatch(healthSummary(report),/pageviews|affiliate_clicks|official_clicks|compare_actions|revenue:\s*0/);
});

test('Public health output reveals no counts, countries, paths or arbitrary upstream text',()=>{
 const data=fixture(undefined,[row('pageview',7341),row('affiliate_click',2197),row('shopping_official_click',485),row('shopping_compare',28)]);
 data.notes='PRIVATE_ACCOUNT_NOTE';data.customer_input='PRIVATE_CUSTOMER_INPUT';
 const report=summarizeShoppingReport(data,{now});
 assert.deepEqual(report,{ok:true,status:'measured_complete_utc_days'});
 const summary=healthSummary(report);
 assert.equal(summary,healthSummary(summarizeShoppingReport(fixture(),{now})));
 assert.doesNotMatch(JSON.stringify(report)+summary,/7341|2197|485|PRIVATE|amazon|ikea|blaliden|display-cases|"US"|"counts"/);
 assert.match(summary,/does not establish uninterrupted collection, channel attribution or earnings/);
});

test('Malformed, stale and inconsistent aggregates fail instead of becoming zero or healthy',()=>{
 for(const edit of [
  d=>{d.ok=false;},d=>{d.schema_version=1;},d=>{delete d.schema_version;},d=>{d.unit='purchases';},d=>{d.generated='2026-11-10T05:40:00Z';},
  d=>{d.generated='2026-11-10T07:00:00Z';},d=>{d.generated='invalid';},d=>{d.cache_seconds=0;},
  d=>{d.scope={};},d=>{d.coveredDays=28;},d=>{d.measuredWindow=null;},d=>{d.first_full_utc_day='2026-11-07';},
  d=>{d.daily[0].path='/shop/display-cases?private';},d=>{d.daily[0].country='PRIVATE';},
  d=>{d.daily[0].date='2026-11-07';},d=>{d.daily[0].date='2026-11-10';},
  d=>{d.daily[0].event='purchase';},d=>{d.daily[0].merchant='amazon.com';},d=>{d.daily[0].n=-1;},
  d=>{d.daily[0].item='blaliden';},d=>{d.daily[0].placement='card';},d=>{delete d.daily[0].item;},
  d=>{d.daily[0].customer='PRIVATE';},
  d=>{d.daily.push({...d.daily[0]});d.counts.pageviews=2;},d=>{d.counts.pageviews=999;},
  d=>{d.counts.official_clicks=1;},d=>{d.counts.compare_actions=1;},d=>{delete d.counts.official_clicks;},
  d=>{d.counts.revenue=0;},d=>{d.counts=null;},d=>{d.query_rows_read=-1;}
 ]){
  const data=fixture(undefined,[row()]);edit(data);
  assert.throws(()=>summarizeShoppingReport(data,{now}),/unknown, not zero/);
 }
 const pending=fixture('2026-11-08T06:00:00Z');pending.counts={pageviews:0,affiliate_clicks:0};
 assert.throws(()=>summarizeShoppingReport(pending,{now:new Date(pending.generated)}),/unknown, not zero/);
});

test('Known item clicks, legacy affiliates and completed comparisons remain distinct valid action totals',()=>{
 const data=fixture(undefined,[
  row('affiliate_click',2),
  row('affiliate_click',3,{item:'niubee-risers',placement:'compare'}),
  row('shopping_official_click',4),
  row('shopping_official_click',5,{path:'/de/shop/display-cases',country:'DE',item:'baggebo',placement:'guide'}),
  row('shopping_official_click',6,{path:'/zh/shop/plush-display',merchant:'sonnyangelstore.com',item:'my-bestie',placement:'card'}),
  row('shopping_compare',7)
 ]);
 assert.deepEqual(data.counts,{pageviews:0,affiliate_clicks:5,official_clicks:15,compare_actions:7});
 assert.deepEqual(summarizeShoppingReport(data,{now}),{ok:true,status:'measured_complete_utc_days'});
 for(const edit of [
  d=>{d.daily[1].item='PRIVATE';},d=>{d.daily[1].placement='PRIVATE';},
  d=>{d.daily[1].path='/de/shop/display-cases';},d=>{d.daily[1].merchant='amazon.de';},
  d=>{d.daily[2].merchant='amazon.com';},d=>{d.daily[2].item='unknown';},
  d=>{d.daily[2].placement='unknown';},d=>{d.daily[2].item='niubee-risers';},
  d=>{d.daily[5].item='baggebo';},d=>{d.daily[5].merchant='ikea.com';},
  d=>{d.counts.affiliate_clicks+=d.counts.official_clicks;d.counts.official_clicks=0;}
 ]){
  const invalid=structuredClone(data);edit(invalid);
  assert.throws(()=>summarizeShoppingReport(invalid,{now}),/unknown, not zero/);
 }
});

test('Daily report makes exactly one cached GET with the QA user-agent and no retry or bypass',async()=>{
 const calls=[];
 const report=await fetchShoppingReport({now,fetcher:async(url,options)=>{
  calls.push({url,options});return new Response(JSON.stringify(fixture()),{status:200});
 }});
 assert.equal(report.ok,true);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://thedollscout.com/api/shopping-growth');
 assert.deepEqual(calls[0].options.headers,{'user-agent':'fleet-report-probe'});
 assert.equal(calls[0].options.redirect,'error');assert.ok(calls[0].options.signal instanceof AbortSignal);
 let attempts=0;
 await assert.rejects(()=>fetchShoppingReport({now,fetcher:async()=>{
  attempts++;return new Response('PRIVATE upstream failure',{status:503});
 }}),/unknown, not zero/);
 assert.equal(attempts,1);
 for(const raw of ['PRIVATE not-json','x'.repeat(1000001)]){
  await assert.rejects(()=>fetchShoppingReport({now,fetcher:async()=>new Response(raw)}),/unknown, not zero/);
 }
});
