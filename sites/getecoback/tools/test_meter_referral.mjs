import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {METER_PAGE, METER_QUERY, validMeterEvent, meterReferralReport} from '../src/meter-referral.mjs';
import {ecoPublicBusinessEvent} from '../site/assets/public-engagement.mjs';

test('only the exact source and fixed action pass both analytics contracts', () => {
  for (const name of ['eco_meter_guide_view','eco_meter_guide_click']) {
    const request = new Request('https://getecoback.com/api/ev', {headers:{origin:'https://getecoback.com'}});
    const body = {n:name,p:METER_PAGE};
    assert.ok(validMeterEvent(body,request));
    for (const bad of [{...body,r:'https://example.org/'},{...body,p:'/'},{...body,m:{kwh:2}}])
      assert.equal(validMeterEvent(bad,request),false);
    assert.equal(validMeterEvent(body,new Request('https://getecoback.com/api/ev')),false);
    assert.equal(ecoPublicBusinessEvent(METER_PAGE,{name}).name,name);
    assert.equal(ecoPublicBusinessEvent('/',{name}),null);
  }
});

test('date-indexed report distinguishes pre-launch missing coverage, real zeros, and failure', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(new URL('../db/d1_schema.sql', import.meta.url),'utf8'));
  const insert = db.prepare('INSERT INTO ev(day,name,page,ua_class) VALUES(?,?,?,?)');
  for (const [d,name,page,ua] of [
    [17,'page_view',METER_PAGE,'human'],[18,'eco_meter_guide_view',METER_PAGE,'human'],
    [19,'eco_meter_guide_view',METER_PAGE,'human'],[19,'eco_meter_guide_click',METER_PAGE,'human'],
    [19,'eco_meter_guide_click',METER_PAGE,'ci'],[19,'eco_meter_guide_click','/other','human'],
    [21,'eco_meter_guide_click',METER_PAGE,'human']]) insert.run('2026-11-'+d,name,page,ua);
  const env={EVENTS:{prepare:sql=>({bind:(...args)=>({all:async()=>({success:true,results:db.prepare(sql).all(...args)})})})}};
  const now=new Date('2026-11-21T15:00:00Z');
  const report=await (await meterReferralReport(env,now)).json();
  assert.equal(report.ok,true);
  assert.deepEqual(report.daily.slice(-4).map(r=>[r.date,r.source_pageviews,r.link_views,r.link_clicks]),[
    ['2026-11-17',1,null,null],['2026-11-18',0,null,null],['2026-11-19',0,1,1],['2026-11-20',0,0,0]]);
  assert.match(db.prepare('EXPLAIN QUERY PLAN '+METER_QUERY).all('2026-11-15','2026-11-21',METER_PAGE)[0].detail,/idx_ev_day/);
  const fail=await meterReferralReport({},now);
  assert.equal(fail.status,503);assert.equal((await fail.json()).daily,null);
  db.close();
});
