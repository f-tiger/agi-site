import test from 'node:test';import assert from 'node:assert/strict';
import catalog from '../data/manju.json' with {type:'json'};
import {watchlistFixture} from './manju-watchlist-fixture.mjs';
import {parseManjuEvent} from '../lib/manju.mjs';
import {businessEvent} from '../../../tools/fleet-analytics/business.mjs';
const ids=catalog.items.slice(0,3).map(work=>work.id);
const save=(u,version,list=ids)=>({action:'save',account_id:u.id,version,ids:list});
test('manual account save and restore isolate accounts, use CAS and preserve deletion version',async()=>{
 const h=await watchlistFixture(),a=await h.account('reader_a'),b=await h.account('reader_b');
 assert.equal((await h.call(null)).status,401);
 const initial=await h.call(a);assert.equal(initial.body.version,0);assert.deepEqual(initial.body.ids,[]);assert.match(initial.headers.get('Cache-Control'),/no-store/);assert.match(initial.headers.get('X-Robots-Tag'),/noindex/);
 assert.equal((await h.call(a,save(a,0))).body.version,1);assert.deepEqual((await h.call(a)).body.ids,ids);assert.deepEqual((await h.call(b)).body.ids,[]);
 assert.equal((await h.call(b,save(a,1))).status,409);assert.equal((await h.call(a,save(a,0))).status,409);
 const concurrent=await Promise.all([h.call(a,save(a,1,[ids[0]])),h.call(a,save(a,1,[ids[1]]))]);assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,409]);
 assert.equal((await h.call(a,{action:'delete',account_id:a.id,version:2})).body.version,3);assert.deepEqual((await h.call(a)).body.ids,[]);
 assert.equal((await h.call(a,save(a,0))).status,409);assert.equal((await h.call(a,save(a,2))).status,409);assert.equal((await h.call(a,save(a,3))).body.version,4);
 h.sql.prepare('DELETE FROM free_accounts WHERE id=?').run(a.id);assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_manju_watchlists').get().n,0);h.sql.close();
});
test('reject CSRF, oversized bodies, unknown data, illegal IDs and wrong types without mutation',async()=>{
 const h=await watchlistFixture(),a=await h.account('validation_user');
 for(const payload of [save(a,0,['not-a-work']),save(a,0,[ids[0],ids[0]]),save(a,0,Array(201).fill(ids[0])),{...save(a,0),search:'private'},save(a,-1),save(a,Number.MAX_SAFE_INTEGER),{...save(a,0),version:'0'},{action:'delete',account_id:a.id,version:0,ids:[]}])assert.equal((await h.call(a,payload)).status,400);
 assert.equal((await h.call(a,save(a,0),{headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await h.call(a,save(a,0),{headers:{Origin:''}})).status,403);
 assert.equal((await h.call(a,save(a,0),{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
 assert.equal((await h.call(a,save(a,0),{headers:{'Content-Type':'text/plain'}})).status,415);
 assert.equal((await h.call(a,save(a,0),{raw:' '.repeat(16385)})).status,413);
 assert.equal((await h.call(a,save(a,0),{raw:'{bad json'})).status,400);
 assert.deepEqual((await h.call(a)).body.ids,[]);h.sql.close();
});
test('session revoked between authorization and SQL write cannot save; bounded rate enforces',async()=>{
 const h=await watchlistFixture(),a=await h.account('revoked_user');
 h.setBeforeStatement((query,sql)=>{if(query.startsWith('INSERT INTO free_account_manju_watchlists'))sql.prepare('DELETE FROM free_account_sessions WHERE account_id=?').run(a.id);});
 assert.equal((await h.call(a,save(a,0))).status,409);assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_manju_watchlists').get().n,0);
 h.setBeforeStatement(null);const b=await h.account('rate_user');for(let version=0;version<60;version++)assert.equal((await h.call(b,save(b,version,[]))).status,200);assert.equal((await h.call(b,save(b,60))).status,429);h.sql.close();
});
test('cloud analytics accept fixed catalog actions and never identity/content payloads',()=>{
 for(const action of ['save','restore','delete']){assert(parseManjuEvent('/manju/cloud_'+action+'/catalog',ids));assert(!parseManjuEvent('/manju/cloud_'+action+'/'+ids[0],ids));assert(!parseManjuEvent('/manju/cloud_'+action+'/private@example.test',ids));assert(businessEvent('baipiaoji.com','/manju/',{name:'manju_cloud_'+action}));assert.equal(businessEvent('baipiaoji.com','/manju/',{name:'manju_cloud_'+action,account_id:'private'}),null);}
});
