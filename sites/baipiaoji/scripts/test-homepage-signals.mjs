import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readHomepageSignals,HOMEPAGE_SQL,parseHomepageClick} from '../lib/homepage-signals.js';
import {HITS_INDEXES} from '../lib/hits-schema.js';
import {onRequestPost} from '../functions/api/hit.js';
import {verifyHomepageLive} from './verify-homepage-live.mjs';
const db=new DatabaseSync(':memory:');
db.exec(`CREATE TABLE hits(d TEXT,path TEXT,lang TEXT,ev TEXT,ref TEXT,country TEXT);${HITS_INDEXES.join(';')}`);
const binding={prepare(sql){let args=[];return{bind(...x){args=x;return this},async all(){return{results:db.prepare(sql).all(...args)}},async run(){return db.prepare(sql).run(...args)}}}};
const insert=db.prepare('INSERT INTO hits(d,path,lang,ev) VALUES(?,?,?,?)');
for(const [d,path,lang='zh',ev='home'] of [
 ['2026-09-22','/home/other/studio/'],['2026-09-30','/home/featured-tools/en/studio/pdf-tools','en'],
 ['2026-09-30','/home/featured-tools/en/studio/pdf-tools','en'],['2026-10-01','/home/hero/account'],
 ['2026-10-01','/home/hero/account','ci'],['2026-10-01','/discovery/share/copy'],
 ['2026-10-01','/discovery/next/studio/pdf-tools'],['2026-10-02','/home/hero/account'],
 ['2026-09-21','/home/hero/account'],['2026-10-01','/home/other/customer-private-name'],
 ['2026-10-01','/home/other/account?token=secret'],['2026-10-01','/home/hero/account','en','bot'],
])insert.run(d,path,lang,ev);
const r=await readHomepageSignals(binding,'2026-09-01','2026-10-01');
assert(r.ok);assert.equal(r.window.start,'2026-09-22');assert.equal(r.clicks,5);assert.deepEqual(r.by_language,{zh:3,en:2,other:0});
assert.equal(r.daily.find(d=>d.date==='2026-09-30').clicks,2);assert.equal(r.daily.at(-1).complete,false);
assert.equal(r.unclassified_records,1);assert.equal(r.entries.find(x=>x.block==='other'&&x.destination==='toolbox').n,1);
assert.equal(r.daily.reduce((sum,d)=>sum+d.clicks,0),r.clicks);assert.equal(r.entries.reduce((sum,d)=>sum+d.n,0),r.clicks);
assert(!JSON.stringify(r).includes('customer-private-name'));assert(!JSON.stringify(r).includes('token=secret'));
assert.equal(parseHomepageClick('/discovery/share/copy'),null);
const plan=db.prepare('EXPLAIN QUERY PLAN '+HOMEPAGE_SQL).all('2026-09-22','2026-10-01').map(x=>x.detail).join(' ');
assert.match(plan,/SEARCH hits USING INDEX hits_events/);assert(!plan.includes('SCAN hits'));
assert.equal((await readHomepageSignals({prepare(){throw Error('unavailable')}},'2026-09-24','2026-10-01')).clicks,null);
assert.equal((await readHomepageSignals({prepare(){return{bind(){return this},all:async()=>({results:Array(5001).fill({})})}}},'2026-09-24','2026-10-01')).reason,'row_limit');
const empty=await readHomepageSignals(binding,'2026-10-03','2026-10-04');assert.equal(empty.clicks,0);assert.equal(empty.daily.length,2);
const post=(headers={},path='/home/hero/studio/')=>onRequestPost({env:{HITS:binding},request:new Request('https://baipiaoji.com/api/hit',{method:'POST',headers:{'user-agent':'Mozilla/5.0 Chrome/153','referer':'https://baipiaoji.com/',...headers},body:JSON.stringify({e:'home',p:path,l:'zh'})})});
const before=db.prepare('SELECT count(*) n FROM hits').get().n;
for(const headers of [{'referer':'https://baipiaoji.com/?__ci=1'},{'referer':'https://baipiaoji.com/?qa=1'},{'referer':'https://baipiaoji.com/?ci=1'},{'user-agent':'HeadlessChrome/153'},{'user-agent':'bpj-ci-selfcheck'},{dnt:'1'},{'sec-gpc':'1'}])await post(headers);
await post({},'/home/hero/account?secret=1');assert.equal(db.prepare('SELECT count(*) n FROM hits').get().n,before);
await post();await post({},'/discovery/share/copy');assert.equal(db.prepare('SELECT count(*) n FROM hits').get().n,before+2);
console.log('PASS homepage daily/language/block/destination aggregates, legacy labels, partial day, privacy, missing≠zero, indexed SQL, QA/bot/DNT/GPC ingestion.');

const liveHTML=`data-home-block="hero" sec.classList.contains('bpj-site-header') !navigator.webdriver`;
for(const failures of [0,1,5]){
 let reads=0,waits=0;
 const verify=()=>verifyHomepageLive({
  fetchImpl:async url=>new Response(url.includes('/api/reach')?JSON.stringify(++reads<=failures?{}:{homepage_signals:r}):liveHTML),
  wait:async ms=>{assert.equal(ms,10000);waits++;},onRetry:()=>{},
 });
 if(failures===5)await assert.rejects(verify,/homepage detail available/);else await verify();
 assert.equal(reads,Math.min(failures+1,5));assert.equal(waits,Math.min(failures,4));
}
for(const broken of ['sum','html']){
 let reads=0;
 await assert.rejects(()=>verifyHomepageLive({
  fetchImpl:async url=>{if(url.includes('/api/reach')){reads++;return Response.json({homepage_signals:broken==='sum'?{...r,clicks:r.clicks+1}:r});}return new Response('missing deployment labels');},
  wait:async()=>{},onRetry:()=>{},
 }));
 assert.equal(reads,5);
}
console.log('PASS live verifier bounded retries: current response, stale then current, persistent stale, bad totals and missing HTML labels.');
