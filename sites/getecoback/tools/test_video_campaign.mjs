import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {campaignTags} from '../site/assets/video-campaign.mjs';
import {VIDEO_SQL,videoGrowth} from '../src/video-growth.mjs';
const href='https://getecoback.com/en/energy-tariff-workbench.html?utm_source=youtube&utm_medium=organic_video&utm_campaign=eco-bonus-01';
test('Attribution rejects unrelated links and separates missing, internal and matching referrers',()=>{
 assert.deepEqual(campaignTags(href,'https://www.youtube.com/watch?v=1'),{c:'eco-bonus-01',s:'youtube',v:'referrer'});
 for(const [ref,v] of [['','tag_only'],['https://baipiaoji.com/','internal'],['https://youtube.com.attacker.test/','other']])assert.equal(campaignTags(href,ref).v,v);
 assert.deepEqual(campaignTags(href.replace('youtube','email')),{});
 assert.deepEqual(campaignTags(href.replace('eco-bonus-01','other')),{});
 assert.deepEqual(campaignTags(href.replace('/en/energy-tariff-workbench.html','/')),{});
});
test('Actual SQLite query excludes bots, today, unrelated pages and bad JSON; splits own/example and channels',()=>{
 const python=`import sqlite3,json,sys
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ua_class,meta)')
def add(s='youtube',v='referrer',i='own',ua='human',page='/en/energy-tariff-workbench.html',day='-1 day',meta=None):
 m=json.dumps(dict(c='eco-bonus-01',s=s,v=v,input=i)) if meta is None else meta
 db.execute("INSERT INTO ev VALUES(date('now',?), 'solution_calc',?,?,?)",(day,page,ua,m))
add();add(s='tiktok');add(i='example');add(v='tag_only');add(v='internal')
add(ua='bot');add(ua=None);add(page='/__ci');add(day='0 days');add(day='-15 days');add(meta='{bad');add(s='email')
print(json.dumps([dict(r) for r in db.execute(sys.stdin.read())]))`;
 const result=spawnSync('python3',['-c',python],{input:VIDEO_SQL,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const rows=JSON.parse(result.stdout);assert.equal(rows.length,5);assert.equal(rows.reduce((n,r)=>n+r.n,0),5);
 assert(rows.some(r=>r.source==='tiktok'));assert(rows.some(r=>r.input==='example'));assert(rows.some(r=>r.evidence==='internal'));
});
test('Report failures remain unknown; successful counts are explicitly events',async()=>{
 assert.equal((await videoGrowth({})).status,503);
 const res=await videoGrowth({EVENTS:{prepare(sql){assert.equal(sql,VIDEO_SQL);return {all:async()=>({results:[]})};}}});
 const body=await res.json();assert.equal(body.metric,'events_not_users');assert.equal(body.window.complete_utc_days,14);assert.deepEqual(body.rows,[]);
});

test('Second video stays isolated and arbitrary campaign names are rejected',async()=>{
 const second=href.replace('eco-bonus-01','eco-fixed-02');
 assert.deepEqual(campaignTags(second),{c:'eco-fixed-02',s:'youtube',v:'tag_only'});
 const r=await videoGrowth({EVENTS:{prepare(sql){assert(sql.includes("='eco-fixed-02'"));assert(!sql.includes("='eco-bonus-01'"));return {all:async()=>({results:[]})};}}},'eco-fixed-02');
 assert.equal((await r.json()).campaign,'eco-fixed-02');
 assert.equal((await videoGrowth({},"x' OR 1=1 --")).status,400);
});
test('Spoken entry links have fixed destinations, preserve QA, and do not count redirect requests',async()=>{
 const {videoEntry}=await import('../src/video-entry.mjs');
 for(const source of ['youtube','tiktok']){
  const r=videoEntry(new URL('https://getecoback.com/bill-'+source+'?next=https://evil.test&__probe=1'));
  assert.equal(r.status,302); const target=new URL(r.headers.get('location'));
  assert.equal(target.origin,'https://getecoback.com');assert.equal(target.searchParams.get('utm_source'),source);
  assert.equal(target.searchParams.get('__probe'),'1');assert(!target.searchParams.has('next'));
  assert.equal(campaignTags(target.href).v,'tag_only');
 }
 assert.equal(videoEntry(new URL('https://getecoback.com/bill-tiktok'),'POST'),null);
 assert.equal(videoEntry(new URL('https://getecoback.com/unknown')),null);
});

test('Worker cache keys keep the two experiment reports separate',async()=>{
 const {default:worker}=await import('../src/worker.js');const prior=globalThis.caches;const cache=new Map();let reads=0;
 globalThis.caches={default:{match:async r=>cache.get(r.url)?.clone(),put:async(r,v)=>cache.set(r.url,v.clone())}};
 const env={EVENTS:{prepare:sql=>({all:async()=>{reads++;return {results:[]}}})}};
 try {
  for(const c of ['eco-bonus-01','eco-fixed-02','eco-bonus-01']){
   const pending=[];const r=await worker.fetch(new Request('https://getecoback.com/api/video-growth?campaign='+c),env,{waitUntil:p=>pending.push(p)});
   assert.equal((await r.json()).campaign,c);await Promise.all(pending);
  }
  assert.equal(reads,2);
 }finally{globalThis.caches=prior}
});
