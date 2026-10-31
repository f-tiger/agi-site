import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {capitalRadarRoute,validateSnapshot,memberSnapshot} from './server.mjs';
import {database} from '../create/test-support.mjs';

const origin='https://agiscorecard.com',cookie='__Host-fleet_account='+'x'.repeat(43);
const runner=secret=>createHash('sha256').update(secret+':capital-radar-runner:v1').digest('hex');
const snapshot=(extra={})=>({schemaVersion:1,generatedAt:'2026-10-30T12:00:00.000Z',items:[{id:'fixture',title:'Synthetic AI startup raises funds in San Francisco',url:'https://techcrunch.com/fixture',source:'techcrunch',publishedAt:'2026-10-29T12:00:00Z',discoveredAt:'2026-10-30T12:00:00Z',kind:'funding',sector:'agents',geography:'sf-bay-area',evidence:'rss-rule-match',summary:'Synthetic local test only'}],sources:[{id:'techcrunch',name:'TechCrunch',url:'https://techcrunch.com/feed/',ok:true,fetchedAt:'2026-10-30T12:00:00Z',matched:1}],history:[{date:'2026-10-30',count:1,complete:true}],forecast:{status:'insufficient_history',minimumDays:56,observedDays:1,target:'daily qualified article mentions',horizonDays:7},model:{status:'waiting_for_history',promotionThreshold:0.95},notifications:{configured:false},internal:{notificationOutbox:[{private:'must stay private'}]},...extra});
const req=(path,headers={},method='GET',body)=>new Request(origin+path,{method,headers:{...headers,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const member=async(url,options)=>{
 assert.equal(url,'https://baipiaoji.com/api/account-fleet');assert.equal(options.redirect,'manual');
 assert.deepEqual(JSON.parse(options.body),{action:'session',host:'agiscorecard.com'});
 assert.equal(options.headers.Authorization,'Bearer '+'x'.repeat(43));return Response.json({ok:true,user:{id:'synthetic-member'}});
};
function fixture(t){const db=database();t.after(()=>db.sqlite.close());return {EVENTS:db,MEMBER_WATCH_SECRET:'local-test-only',ASSETS:{fetch:async r=>{assert.equal(new URL(r.url).pathname,'/capital-radar/account');return new Response('<html>private shell</html>',{headers:{'Content-Type':'text/html',ETag:'old','Cache-Control':'public'}});}}};}

test('anonymous and client claims cannot fetch any private page alias or API',async()=>{
 const noHub=()=>{throw Error('should not introspect without a session');};
 for(const path of ['/capital-radar','/capital-radar/','/capital-radar.html','/capital-radar/account','/capital-radar/account.html','/capital%2dradar','/capital-radar/account/','//capital-radar/account.html','/capital-radar%2Faccount.html','/%63apital-radar/account.html','/%2563apital-radar/account.html','/capital-radar/account.html/','/capital-radar//account.html']){
  const r=await capitalRadarRoute(req(path,{Authorization:'Bearer '+'1'.repeat(64),'x-user-id':'owner'}),{},noHub);
  assert.equal(r.status,303,path);assert.equal(r.headers.get('Location'),'/auth/account?next=%2Fcapital-radar&lang=zh');assert.match(r.headers.get('Cache-Control'),/no-store/);assert.match(r.headers.get('X-Robots-Tag'),/noindex/);assert.equal(await r.text(),'');
 }
 for(const path of ['/api/capital-radar','/api/capital-radar/runner'])assert.equal((await capitalRadarRoute(req(path),{},noHub)).status,401);
 assert.equal((await capitalRadarRoute(req('/capital-radar.json'),{},noHub)).status,404);
 for(const path of ['/capital-radar-about','/capital-radar-assets/app.mjs'])assert.equal(await capitalRadarRoute(req(path),{},noHub),null);
});
test('host boundary and failed or revoked sessions fail closed',async(t)=>{
 const e=fixture(t);assert.equal((await capitalRadarRoute(new Request('https://elsewhere.test/capital-radar',{headers:{cookie}}),e,member)).status,404);
 for(const status of [401,403,500,302]){
  const r=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,async()=>new Response('{}',{status}));
  assert.equal(r.status,status===401?401:503);assert.equal(e.EVENTS.sqlite.prepare("SELECT count(*) n FROM sqlite_master WHERE name='capital_radar_snapshot'").get().n,0);
 }
 assert.equal((await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,async()=>{throw Error('offline');})).status,503);
 assert.equal((await capitalRadarRoute(req('/api/capital-radar',{cookie:cookie+'; '+cookie}),e,member)).status,401);
});
test('member shell is private, excludes analytics injection, and each read revalidates',async(t)=>{
 const e=fixture(t);let calls=0;const hub=async(...args)=>{calls++;return member(...args);};
 for(const method of ['GET','HEAD']){
  const r=await capitalRadarRoute(req('/capital-radar',{cookie},method),e,hub);assert.equal(r.status,200);assert.equal(r.headers.get('etag'),null);assert.match(r.headers.get('X-Robots-Tag'),/noindex/);assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.equal(await r.text(),method==='HEAD'?'':'<html>private shell</html>');
 }
 const r=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,hub);assert.deepEqual(await r.json(),{ok:true,snapshot:null});assert.equal(calls,3);
});
test('scoped runner saves private state, rejects stale writes, and members never receive internals',async(t)=>{
 const e=fixture(t),headers={Authorization:'Bearer '+runner(e.MEMBER_WATCH_SECRET)};
 assert.equal((await capitalRadarRoute(req('/api/capital-radar/runner',{Authorization:'Bearer '+createHash('sha256').update(e.MEMBER_WATCH_SECRET+':jarvis-runner:v1').digest('hex')}),e)).status,401);
 let r=await capitalRadarRoute(req('/api/capital-radar/runner',headers,'PUT',{snapshot:snapshot()}),e);assert.equal(r.status,200);
 r=await capitalRadarRoute(req('/api/capital-radar/runner',headers),e);assert.deepEqual((await r.json()).snapshot,snapshot());
 r=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member);const body=await r.json();assert.equal(body.snapshot.items.length,1);assert.equal(body.snapshot.internal,undefined);assert.doesNotMatch(JSON.stringify(body),/must stay private/);
 r=await capitalRadarRoute(req('/api/capital-radar/runner',headers,'PUT',{snapshot:snapshot({generatedAt:'2026-10-29T12:00:00Z'})}),e);assert.equal(r.status,409);
 const update=snapshot({notifications:{configured:true,deliveryStatus:'sent'}});r=await capitalRadarRoute(req('/api/capital-radar/runner',headers,'PUT',{snapshot:update}),e);assert.equal(r.status,200);
 r=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member);assert.equal((await r.json()).snapshot.notifications.deliveryStatus,'sent');
});
test('input rejects invalid sources, fake readiness, malformed body and excessive payload',async(t)=>{
 const e=fixture(t),headers={Authorization:'Bearer '+runner(e.MEMBER_WATCH_SECRET)};
 for(const change of [{url:'javascript:alert(1)'},{url:'https://techcrunch.com.evil.test/a'},{url:'https://x:password@techcrunch.com/a'},{url:'http://techcrunch.com/a'},{geography:'silicon-valley-guessed'}])assert.throws(()=>validateSnapshot(snapshot({items:[{...snapshot().items[0],...change}]})),/invalid_snapshot/);
 assert.throws(()=>validateSnapshot(snapshot({forecast:{status:'ready',points:[]}})),/invalid_snapshot/);
 let r=await capitalRadarRoute(req('/api/capital-radar/runner',headers,'PUT',{snapshot:{schemaVersion:1}}),e);assert.equal(r.status,400);
 r=await capitalRadarRoute(req('/api/capital-radar/runner',headers,'PUT',{snapshot:snapshot({internal:{huge:'x'.repeat(1500000)}})}),e);assert.equal(r.status,413);
 r=await capitalRadarRoute(req('/api/capital-radar',{},'POST',{}),e);assert.equal(r.status,405);
});
test('Worker registers the private route before static assets and analytics',()=>{
 const source=readFileSync(new URL('../analytics-worker/index.js',import.meta.url),'utf8');
 assert.ok(source.indexOf('await capitalRadarRoute(request,env)')<source.indexOf('await jarvisRoute(request,env,ctx)'));
 const privateView=memberSnapshot(snapshot({model:{status:'waiting_for_history',rawWeights:'hidden'},notifications:{configured:false,chatId:'hidden'}}));
 assert.doesNotMatch(JSON.stringify(privateView),/rawWeights|chatId|hidden/);
});
