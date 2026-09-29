import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import worker from './analytics-worker/index.js';
import {VIDEO_SQL,refEvidence,videoGrowth} from './analytics-worker/video-growth.js';
test('Source evidence separates tags, platform hosts, internal links and lookalikes',()=>{
 assert.equal(refEvidence('youtube','www.youtube.com'),'referrer');
 assert.equal(refEvidence('tiktok','m.tiktok.com'),'referrer');
 assert.equal(refEvidence('youtube','youtube.com.attacker.test'),'other');
 assert.equal(refEvidence('youtube','getecoback.com'),'internal');
 assert.equal(refEvidence('youtube','invest.agiscorecard.com'),'internal');
 assert.equal(refEvidence('youtube',null),'tag_only');
});
test('Actual SQLite excludes bots, today, untagged visits and other pages; keeps channels apart',()=>{
 const py=`import sqlite3,json,sys
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE events(day,name,path,ua_class,utm_source,utm_medium,utm_campaign,ref_host)')
db.execute('CREATE INDEX idx_events_name ON events(name)')
def add(source='youtube',name='page_view',day='-1 day',path='/agi-test',ua='human',camp='agi-timeline-01'):
 db.execute("INSERT INTO events VALUES(date('now',?),?,?,?,?,?,?,?)",(day,name,path,ua,source,'organic_video',camp,'www.youtube.com'))
add();add(name='vote_cast');add(source='tiktok');add(day='0 days');add(day='-15 days');add(path='/');add(ua='bot');add(ua=None);add(camp='other');add(source='email')
print(json.dumps([dict(r) for r in db.execute(sys.stdin.read())]))`;
 const p=spawnSync('python3',['-c',py],{input:VIDEO_SQL,encoding:'utf8'});assert.equal(p.status,0,p.stderr);const rows=JSON.parse(p.stdout);assert.equal(rows.reduce((n,r)=>n+r.n,0),3);assert(rows.some(r=>r.source==='tiktok'));
});
test('Collector preserves UTM on browser events and rejects QA before any write',async()=>{
 const writes=[],waits=[];
 const env={EVENTS:{prepare(sql){
  return {bind(...args){return {run:async()=>{writes.push({sql,args});}};}};
 }}};
 const ctx={waitUntil(p){waits.push(p);}};
 const u='?utm_source=youtube&utm_medium=organic_video&utm_campaign=agi-timeline-01&pick=realist&self=1';
 const send=async(u,headers={})=>{const res=await worker.fetch(new Request('https://agiscorecard.com/api/e',{method:'POST',headers:{'content-type':'application/json','user-agent':'Mozilla/5.0',...headers},body:JSON.stringify({n:'prediction_lock',p:'/agi-test',u,b:'realist',r:'https://www.youtube.com/'})}),env,ctx);await Promise.all(waits.splice(0));assert.equal(res.status,204);};
 await send(u);assert.equal(writes.length,1);assert.deepEqual(writes[0].args.slice(-3),['youtube','organic_video','agi-timeline-01']);
 for(const q of [u+'&ci=1',u+'&__probe=1','?utm_source=verify'])await send(q);
 await send(u,{dnt:'1'});await send(u,{'sec-gpc':'1'});assert.equal(writes.length,1);
});
test('Report failures remain unknown; output hides raw referrer hosts',async()=>{
 assert.equal((await videoGrowth({})).status,503);
 const res=await videoGrowth({EVENTS:{prepare(){return {all:async()=>({results:[{source:'youtube',host:'www.youtube.com',name:'vote_cast',n:2}]})};}}});
 const body=await res.json();assert.equal(body.metric,'browser_events_not_users');assert.equal(body.window.complete_utc_days,14);assert.deepEqual(body.rows,[{source:'youtube',evidence:'referrer',event:'vote_cast',n:2}]);
});
