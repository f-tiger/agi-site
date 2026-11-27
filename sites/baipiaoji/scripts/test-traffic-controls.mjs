import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {guardTraffic,trafficClass,recordQuality,RULES,qualityEligible,qualityKind} from '../lib/traffic-controls.mjs';
import {onRequestPost as submit} from '../functions/api/submit.js';
import {onRequestGet as report} from '../functions/api/traffic-quality.js';
import {onRequestPost as hit} from '../functions/api/hit.js';
function db(){const sqlite=new DatabaseSync(':memory:');return {sqlite,prepare(sql){let args=[];const stmt=()=>sqlite.prepare(sql);return {bind(...a){args=a;return this;},async first(){return stmt().get(...args)||null;},async run(){const r=stmt().run(...args);return {meta:{changes:r.changes,last_row_id:r.lastInsertRowid}};},async all(){return {success:true,results:stmt().all(...args)};}};}};}
const req=(path='/api/submit',body='{}',extra={})=>new Request('https://baipiaoji.com'+path,{method:'POST',headers:{origin:'https://baipiaoji.com','content-type':'application/json','cf-connecting-ip':'192.0.2.1',...extra},body});
test('bounded targeted protection; atomic concurrent budget, reset and separate identities',async()=>{
 const HITS=db(),now=1800000000000;let passed=0;
 const call=(request,time=now)=>guardTraffic({request,env:{HITS},next:async r=>{assert.equal(await r.text(),'{}');passed++;return new Response('ok');}},{now:time,cache:null});
 const results=await Promise.all(Array.from({length:12},()=>call(req())));
 assert.equal(results.filter(r=>r.status===200).length,5);assert.equal(results.filter(r=>r.status===429).length,7);assert.equal(passed,5);
 assert.ok(results.find(r=>r.status===429).headers.get('retry-after'));
 assert.equal((await call(req('/api/submit','{}',{'x-forwarded-for':'203.0.113.2'}))).status,429);
 assert.equal((await call(req('/api/%73ubmit/?q=other'))).status,429);
 assert.equal((await call(req(),now+600001)).status,200);
 assert.equal((await call(req('/api/submit','{}',{'cf-connecting-ip':'192.0.2.2'}))).status,200);
 assert.ok(!JSON.stringify(HITS.sqlite.prepare('SELECT * FROM bpj_traffic_rates').all()).includes('192.0.2'));

 for(const p of ['/manju/','/robots.txt','/api/tools','/api/mcp','/api/claim'])assert.equal((await guardTraffic({request:new Request('https://baipiaoji.com'+p),env:{},next:()=>new Response('public')})).status,200);
});
test('reject cross origin, oversized streams and missing edge identity before business handler',async()=>{
 const HITS=db(),next=()=>assert.fail('handler must not run');
 assert.equal((await guardTraffic({request:req('/api/submit','{}',{origin:'https://elsewhere.example'}),env:{HITS},next})).status,403);
 assert.equal((await guardTraffic({request:req('/api/submit','x'.repeat(16001)),env:{HITS},next})).status,413);
 const request=req();request.headers.delete('cf-connecting-ip');assert.equal((await guardTraffic({request,env:{HITS},next})).status,503);
 assert.equal((await guardTraffic({request:req(),env:{HITS:{prepare(){throw Error('unavailable');}}},next})).status,503);
 const retry=await guardTraffic({request:req(),env:{HITS,BPJ_TRAFFIC_LIMITS:'off'},next:()=>new Response('rollback')});assert.equal(retry.status,200);
});
test('cached denial skips further database work',async()=>{
 let calls=0;const db={prepare(){calls++;throw Error('should not query');}};
 const r=await guardTraffic({request:req(),env:{HITS:db},next:()=>assert.fail()},{cache:{match:async()=>new Response('limited')}});assert.equal(r.status,429);assert.equal(calls,0);
});
test('concurrent duplicate submissions produce one queued row',async()=>{
 const HITS=db(),request=()=>req('/api/submit',JSON.stringify({name:'Fixture',url:'https://example.com/'}));
 const results=await Promise.all(Array.from({length:4},()=>submit({request:request(),env:{HITS}})));
 assert.ok(results.every(r=>r.status===200));assert.equal(HITS.sqlite.prepare('SELECT count(*) n FROM submissions').get().n,1);
});
test('quality classes stay observations; aggregate endpoint excludes partial today and missing data is unknown',async()=>{
 assert.equal(trafficClass(req('/api/submit','{}',{'user-agent':'Mozilla/5.0 Chrome/43.0.6526.1090'})),'ua_anomaly');
 assert.equal(trafficClass(req('/api/submit','{}',{'user-agent':'Mozilla/5.0 Chrome/60.0.3112.90'})),'unclassified');
 assert.equal(trafficClass(req('/api/submit','{}',{'user-agent':'Googlebot'})),'declared_automation');
 const verified=req();Object.defineProperty(verified,'cf',{value:{botManagement:{verifiedBot:true}}});assert.equal(trafficClass(verified),'verified_bot');
 const HITS=db();await recordQuality(HITS,'page','ua_anomaly',Date.now()-86400000);await recordQuality(HITS,'page','unclassified');
 const r=await report({env:{HITS},request:new Request('https://baipiaoji.com/api/traffic-quality')});const j=await r.json();assert.equal(j.rows.length,1);assert.match(j.definition,/unclassified does not mean human/);assert.ok(!JSON.stringify(j).includes('user-agent'));
 const missing=await report({env:{},request:new Request('https://baipiaoji.com/api/traffic-quality')});assert.equal((await missing.json()).rows,null);
});

test('quality counter excludes CI, privacy signals and probe referrers',()=>{
 assert.equal(qualityEligible(req(),'/__selftest','ci'),false);
 assert.equal(qualityEligible(req('/api/hit','{}',{dnt:'1'}),'/','zh'),false);
 assert.equal(qualityEligible(req('/api/hit','{}',{referer:'https://baipiaoji.com/?__probe=1'}),'/','zh'),false);
 assert.equal(qualityEligible(req('/api/hit'),'/','zh'),true);
});

test('views are never relabeled as meaningful interactions',()=>{
 assert.equal(qualityKind('manju','/manju/view/catalog'),'manju_view');
 assert.equal(qualityKind('manju','/manju/official_open/hg-123'),'manju_official_open');
 assert.equal(qualityKind('manju','/manju/search_submit/catalog'),'manju_search_submit');
 assert.equal(qualityKind('manju','/manju/search_results/catalog'),'other_event');
});

test('quality writes preserve raw events and fail independently without leaking input',async()=>{
 const HITS=db();HITS.sqlite.exec('CREATE TABLE hits(d TEXT,path TEXT,lang TEXT,country TEXT,ref TEXT,ev TEXT)');
 const request=()=>req('/api/hit',JSON.stringify({p:'/distribution/work-plan/calculate/external/edited',e:'distribution',l:'en',r:'https://publisher.example/private?email=private-marker',input:'private-marker'}),{'user-agent':'Mozilla/5.0'});
 const pending=[];assert.equal((await hit({request:request(),env:{HITS},waitUntil:p=>pending.push(p)})).status,204);await Promise.all(pending);
 const rows=HITS.sqlite.prepare('SELECT * FROM hits').all();assert.equal(rows.length,1);assert.equal(rows[0].ref,'publisher.example');assert.equal(rows[0].ev,'distribution');
 const totals=HITS.sqlite.prepare('SELECT * FROM bpj_traffic_quality').all();assert.equal(totals.length,1);assert.equal(totals[0].kind,'other_event');assert.equal(totals[0].class,'unclassified');assert.equal(totals[0].n,1);assert.ok(!JSON.stringify({rows,totals}).includes('private-marker'));
 const broken={prepare(sql){if(sql.includes('bpj_traffic_quality'))throw Error('quality unavailable');return HITS.prepare(sql);}};
 assert.equal((await hit({request:request(),env:{HITS:broken}})).status,204);
 await hit({request:request(),env:{HITS,BPJ_TRAFFIC_QUALITY:'off'}});
 assert.equal(HITS.sqlite.prepare('SELECT count(*) n FROM hits').get().n,3);assert.equal(HITS.sqlite.prepare('SELECT sum(n) n FROM bpj_traffic_quality').get().n,1);
});

test('filtered conversion writes, bilingual task routes and independent page measurement', async () => {
 const HITS = db();
 HITS.sqlite.exec('CREATE TABLE hits(d TEXT,path TEXT,lang TEXT,country TEXT,ref TEXT,ev TEXT)');
 async function send(event, path, headers = {}, verified = false) {
   const request = new Request('https://baipiaoji.com/api/hit', {
     method: 'POST', headers, body: JSON.stringify({p:path, e:event, l:'en', r:'https://private.example/test'})
   });
   if (verified) Object.defineProperty(request, 'cf', {value:{botManagement:{verifiedBot:true}}});
   await hit({request, env:{HITS}});
 }
 const fromTool = {origin:'https://baipiaoji.com', referer:'https://baipiaoji.com/en/tools/kimi'};
 await send('catalog_task','/catalog-task/kimi',fromTool);
 await send('catalog_task','/catalog-task/chatgpt',fromTool);
 await send('catalog_task','/catalog-task/kimi',{...fromTool,dnt:'1'});
 await send('go','/go/kimi',{'user-agent':'curl/8'});
 await send('star','/star/kimi',{origin:'https://other.example'});
 await send('biz','/biz/submit/other',fromTool,true);
 await send('go','/go/kimi',{'user-agent':'Mozilla/5.0'});
 await send('', '/tools/kimi',{'user-agent':'curl/8'});
 assert.deepEqual(HITS.sqlite.prepare('SELECT ev FROM hits ORDER BY rowid').all().map(x=>x.ev),['catalog_task','go','']);
 assert.equal(HITS.sqlite.prepare("SELECT ref FROM hits WHERE ev='catalog_task'").get().ref,'');
 assert.equal(HITS.sqlite.prepare("SELECT n FROM bpj_traffic_quality WHERE kind='catalog_task_kimi'").get().n,1);
});

test('vendor repeat attempts produce one inquiry and the sixth request stays outside the handler', async () => {
 const {onRequestPost: vendor} = await import('../functions/api/vendor.js');
 const HITS = db(), env={HITS};
 const body=JSON.stringify({name:'Fixture',url:'https://example.org/',email:'test@example.org',kind:'sponsor',note:'local fixture'});
 const results=await Promise.all(Array.from({length:6},()=>guardTraffic({request:req('/api/vendor',body),env,next:request=>vendor({request,env})},{now:1800000000000,cache:null})));
 assert.equal(results.filter(r=>r.status===429).length,1);
 const replies=await Promise.all(results.filter(r=>r.ok).map(r=>r.json()));
 assert.equal(replies.filter(r=>r.code==='already').length,4);
 assert.equal(HITS.sqlite.prepare('SELECT count(*) n FROM vendor_inquiries').get().n,1);
});

test('operator readout counts stored inquiries independently of QA and browser actions',async()=>{
 const {onRequestGet}=await import('../functions/api/vendor-stats.js');
 const HITS=db(), secret='x'.repeat(40), env={HITS,ADS_WATCH_SECRET:secret};
 const load=(key,view='')=>onRequestGet({request:new Request('https://baipiaoji.com/api/vendor-stats'+view,{headers:{authorization:'Bearer '+key}}),env});
 assert.equal((await load('invalid')).status,401);
 const ecoView='?view=eco_mcp_signups';
 assert.equal((await load('invalid',ecoView)).status,401);
 assert.equal((await (await load(secret,ecoView)).json()).eco_mcp_signups,null);
 HITS.sqlite.exec("CREATE TABLE eco_laundry_signup_daily(day TEXT PRIMARY KEY,n INTEGER NOT NULL); INSERT INTO eco_laundry_signup_daily VALUES(date('now','-1 day'),1),(date('now'),20),(date('now','-8 day'),30);");
 const ecoResponse=await load(secret,ecoView);
 assert.match(ecoResponse.headers.get('Cache-Control'),/no-store/);
 assert.equal(ecoResponse.headers.get('X-Robots-Tag'),'noindex');
 const eco=await ecoResponse.json();
 assert.equal(eco.end_exclusive,new Date().toISOString().slice(0,10));
 assert.equal(eco.eco_mcp_signups.committed_accounts,1);
 assert.equal(eco.eco_mcp_signups.daily.length,1);
 assert.equal((await load(secret)).status,503);
 HITS.sqlite.exec("CREATE TABLE hits(d,path,ev,lang); INSERT INTO hits VALUES(date('now'),'/biz/trigger/ad-inquiry','biz','en'),(date('now'),'/biz/trigger/ad-inquiry','biz','ci')");
 const empty=await (await load(secret)).json();
 assert.equal(empty.provisioned,false);assert.equal(empty.events[0].n,1);
 HITS.sqlite.exec("CREATE TABLE vendor_inquiries(created,kind,status,email); INSERT INTO vendor_inquiries VALUES(date('now'),'sponsor','new','private@example.test'),(date('now','-9 days'),'expedite','new','private@example.test')");
 const result=await (await load(secret)).json();
 assert.deepEqual(result.eco_mcp_registration,{start:eco.start,end_exclusive:eco.end_exclusive,eco_mcp_signups:eco.eco_mcp_signups});
 assert.equal(result.intake.length,1);assert.equal(result.intake[0].pending,1);
 assert.equal(result.intake[0].intent,'sponsor');assert.doesNotMatch(JSON.stringify(result),/private@example/);
});
