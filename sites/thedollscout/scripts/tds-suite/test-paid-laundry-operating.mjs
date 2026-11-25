import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet, paidLaundryReport, paidLaundryWindow} from '../../functions/api/paid-laundry-operating.js';
import {onRequestPost} from '../../functions/api/ev.js';
import {PAID_REVIEW_ACTIONS, PAID_REVIEW_PATHS, recordPaidReviewAction} from '../../collector-assets/tds-suite/regional-measurement.mjs';
import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';

const LAST_DAY = new Date('2026-11-27T08:00:00Z');
const TOOL = PAID_REVIEW_PATHS[0];
const OTHER_TOOL = '/de/ai-tools/dach-meter-fit';
const EVENTS = PAID_REVIEW_ACTIONS;
const sec = date => Date.parse(date) / 1000;

function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE hits(d TEXT,path TEXT,ref TEXT,ev TEXT);
    CREATE INDEX day_lookup ON hits(d,path,ev);
    CREATE TABLE wb_orders(id TEXT PRIMARY KEY,chain TEXT,tx TEXT,amount_units INTEGER,created INTEGER,expires INTEGER,state TEXT,paid_at INTEGER);
    CREATE TABLE wb_order_sources(order_id TEXT PRIMARY KEY,product TEXT,created INTEGER);
    CREATE TABLE bpj_ad_chain_receipts(chain TEXT,tx TEXT,order_id TEXT UNIQUE,amount_units INTEGER);`);
  const db = {prepare: query => ({bind: (...args) => ({all: async () => ({results:sql.prepare(query).all(...args)}),
    first: async () => sql.prepare(query).get(...args) ?? null})})};
  return {db, sql,
    hit: (d,path,ev,ref='') => sql.prepare('INSERT INTO hits VALUES(?,?,?,?)').run(d,path,ref,ev),
    order(id, {quote='2026-11-26T01:00:00Z', payment=null, proof=0, product='tds-uk-laundry-review'} = {}) {
      const created=sec(quote), paid=payment===null ? null : sec(payment);
      sql.prepare('INSERT INTO wb_orders VALUES(?,?,?,?,?,?,?,?)').run(id,'bsc',id,9030001,created,created+3600,paid===null?'pending':'paid',paid);
      sql.prepare('INSERT INTO wb_order_sources VALUES(?,?,?)').run(id,product,created);
      if (proof) sql.prepare('INSERT INTO bpj_ad_chain_receipts VALUES(?,?,?,?)').run('bsc',id,'member:'+id,9030000+proof);
    }};
}

async function dispatch(body, headers={}) {
  const rows=[], tasks=[];
  const request=new Request('https://thedollscout.com/api/ev',{method:'POST', headers:{origin:'https://thedollscout.com','cf-ipcountry':'GB',...headers},body:JSON.stringify(body)});
  const HITS={prepare() {return {bind(...data) {return {run:async () => {rows.push(data);}};}};}};
  const response=await onRequestPost({request,env:{HITS},waitUntil:task=>tasks.push(task)});
  await Promise.all(tasks);
  assert.equal(response.status,204);
  return rows;
}

test('paid workspace actions send four fixed route-bound labels and discard extra values', async () => {
  for (const path of PAID_REVIEW_PATHS) for (const name of EVENTS) {
    const body={p:path,e:name,r:''}, sent=[], ga=[];
    const win={location:{href:'https://thedollscout.com'+path+'?x=PRIVATE'},navigator:{},
      localStorage:{getItem:()=>null},document:{querySelector:()=>({href:'https://thedollscout.com'+path})},
      fetch:(url,{body})=>sent.push([url,JSON.parse(body)]),CustomEvent:class {constructor(_,event) {this.detail=event.detail;}},
      dispatchEvent:event=>ga.push(event.detail)};
    win.self=win; win.top=win;
    assert.equal(recordPaidReviewAction(name,win),true);
    assert.deepEqual(sent,[['/api/ev',body]]);
    assert.deepEqual(ga,[{name}]);
    assert.deepEqual(businessEvent('thedollscout.com',path,{name}),{name,tool_id:'tds-uk-laundry-review',repeat:true});
    assert.equal(businessEvent('thedollscout.com',path,{name,reading:1.25}),null);
    assert.equal(businessEvent('thedollscout.com',OTHER_TOOL,{name}),null);
    assert.equal(businessEvent('thedollscout.com','/members',{name}),null);
    assert.equal(businessEvent('getecoback.com',path,{name}),null);
    assert.deepEqual((await dispatch(body))[0].slice(3),['','',name]);
    for (const unsafe of [{...body,r:'https://example.com'},{...body,reading:1.25},{...body,p:OTHER_TOOL},
      {...body,p:path+'?private=sample'},{...body,item:'private'},{...body,e:'tds_paid_purchase'}]) {
      assert.deepEqual(await dispatch(unsafe),[]);
    }
    for (const reject of [{dnt:'1'},{'sec-gpc':'1'},{'x-probe':'fixture'},{'user-agent':'Playwright'}]) {
      assert.deepEqual(await dispatch(body,reject),[]);
    }
    win.navigator.globalPrivacyControl=true;
    assert.equal(recordPaidReviewAction(name,win),false);
  }
});

test('closed UTC period separates first-touch quote cohorts and corroborated payment times', async () => {
  const {db,sql,hit,order}=fixture();
  try {
    hit('2026-11-25',TOOL,EVENTS[0]);
    hit('2026-11-26',TOOL,'');
    hit('2026-11-26',PAID_REVIEW_PATHS[1],'tds_regional_result');
    hit('2026-11-26',TOOL,EVENTS[0]);
    hit('2026-11-26',TOOL,EVENTS[1]);
    hit('2026-11-26',TOOL,EVENTS[2]);
    hit('2026-11-26',TOOL,EVENTS[3],'private.example');
    hit('2026-11-26',OTHER_TOOL,EVENTS[0]);
    hit('2026-11-27',TOOL,EVENTS[0]);
    order('settled',{payment:'2026-11-26T02:00:00Z',proof:1});
    order('pre-window',{quote:'2026-11-25T23:00:00Z',payment:'2026-11-26T00:00:00Z',proof:1});
    order('unpaid');
    order('partial-day-payment',{payment:'2026-11-27T00:30:00Z',proof:1});
    order('wrong-proof',{payment:'2026-11-26T02:00:00Z',proof:2});
    order('other-source',{product:'displayfit',payment:'2026-11-26T02:00:00Z',proof:1});
    const report=await paidLaundryReport(db,true,LAST_DAY);
    assert.deepEqual(report.measured_window,{start:'2026-11-26',end_exclusive:'2026-11-27'});
    assert.deepEqual(report.engagement,{tool_pageviews:1,tool_result_events:1,paid_offer_views:1,paid_member_opens:1,
      workspace_saved_actions:1,workspace_restored_actions:0});
    assert.deepEqual(report.orders,{quotes_created:4,cohort_confirmed_at_close:1,confirmed_settlements:2,paid_rows_without_matching_proof:1});
    assert.equal(report.checkout_ready_now,true);
    assert.equal(report.refunds,null); assert.equal(report.net_revenue_usd,null);
    assert.equal(report.order_coverage,'complete_utc_days');
    assert.doesNotMatch(JSON.stringify(report), /wrong-proof|private\.example|903000/);
  } finally {sql.close();}
});

test('pending periods, real zeros and missing schema stay distinct', async () => {
  const {db,sql}=fixture();
  try {
    const pending=await paidLaundryReport(null,false,new Date('2026-11-26T23:59:59Z'));
    assert.equal(pending.engagement,null); assert.equal(pending.orders,null);
    assert.equal(pending.order_coverage,'pending_first_complete_day');
    assert.equal(pending.checkout_ready_now,false);
    const zero=await paidLaundryReport(db,null,LAST_DAY);
    assert.ok(Object.values(zero.engagement).every(n=>n===0));
    assert.ok(Object.values(zero.orders).every(n=>n===0));
    assert.equal(zero.checkout_ready_now,null);
    sql.exec('DROP INDEX day_lookup');
    const noHits=await paidLaundryReport(db,true,LAST_DAY);
    assert.equal(noHits.engagement,null); assert.equal(noHits.engagement_coverage,'unavailable');
    assert.equal(noHits.orders.quotes_created,0);
    sql.exec('DROP TABLE wb_order_sources');
    const noOrders=await paidLaundryReport(db,true,LAST_DAY);
    assert.equal(noOrders.orders,null); assert.equal(noOrders.order_coverage,'unavailable');
    assert.deepEqual(paidLaundryWindow(new Date('2027-02-01T12:00:00Z')).measured_window,{start:'2027-01-04',end_exclusive:'2027-02-01'});
  } finally {sql.close();}
});

test('operator endpoint requires TDS origin and stored bearer credential before reading D1', async () => {
  const secret='fixture-secret-does-not-leave-process';
  const request=(token,host='thedollscout.com')=>new Request('https://'+host+'/api/paid-laundry-operating',{
    headers:token ? {Authorization:token} : {}});
  let reads=0;
  const env={MEMBER_WATCH_SECRET:secret,HITS:{prepare() {reads++;throw Error('Unavailable fixture');}}};
  for (const token of ['',secret,'Bearer bad']) {
    const response=await onRequestGet({request:request(token),env});
    assert.equal(response.status,401);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(response.headers.get('x-robots-tag'),'noindex');
    assert.deepEqual(await response.json(),{ok:false,code:'unauthorized'});
  }
  assert.equal((await onRequestGet({request:request('Bearer '+secret,'getecoback.com'),env})).status,403);
  assert.equal(reads,0);
  assert.equal((await onRequestGet({request:request('Bearer '+secret),env})).status,200);
  assert.ok(reads>0);
});
