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
