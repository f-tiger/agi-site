import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {capitalRadarRoute,validateSnapshot,memberSnapshot} from './server.mjs';
import {database} from '../create/test-support.mjs';

const origin='https://agiscorecard.com',cookie='__Host-fleet_account='+'x'.repeat(43),relayKey='fixture-owner-alert-service-key';
const runner=secret=>createHash('sha256').update(secret+':capital-radar-runner:v1').digest('hex');
const snapshot=(extra={})=>({schemaVersion:1,generatedAt:'2026-10-30T12:00:00.000Z',items:[{id:'fixture',title:'Synthetic AI startup raises funds in San Francisco',url:'https://techcrunch.com/fixture',source:'techcrunch',publishedAt:'2026-10-29T12:00:00Z',discoveredAt:'2026-10-30T12:00:00Z',kind:'funding',sector:'agents',geography:'sf-bay-area',evidence:'rss-rule-match',summary:'Synthetic local test only'}],sources:[{id:'techcrunch',name:'TechCrunch',url:'https://techcrunch.com/feed/',ok:true,fetchedAt:'2026-10-30T12:00:00Z',matched:1}],history:[{date:'2026-10-30',count:1,complete:true}],forecast:{status:'insufficient_history',minimumDays:56,observedDays:1,target:'daily qualified article mentions',horizonDays:7},model:{status:'waiting_for_history',promotionThreshold:0.95},notifications:{configured:false},internal:{notificationOutbox:null,private:'must stay private'},...extra});
const req=(path,headers={},method='GET',body)=>new Request(origin+path,{method,headers:{...headers,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const member=async(url,options)=>{
 assert.equal(url,'https://baipiaoji.com/api/account-fleet');assert.equal(options.redirect,'manual');
 assert.deepEqual(JSON.parse(options.body),{action:'session',host:'agiscorecard.com'});
 assert.equal(options.headers.Authorization,'Bearer '+'x'.repeat(43));return Response.json({ok:true,user:{id:'synthetic-member'}});
};
function fixture(t){t.mock.method(Date,'now',()=>Date.parse('2026-11-01T00:00:00Z'));const db=database();t.after(()=>db.sqlite.close());return {EVENTS:db,MEMBER_WATCH_SECRET:'local-test-only',CAPITAL_RADAR_RELAY_KEY:relayKey,ASSETS:{fetch:async r=>{assert.equal(new URL(r.url).pathname,'/capital-radar/account');return new Response('<html>private shell</html>',{headers:{'Content-Type':'text/html',ETag:'old','Cache-Control':'public'}});}}};}

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
 r=await capitalRadarRoute(req('/api/capital-radar/runner',headers),e);const saved=(await r.json()).snapshot;assert.deepEqual(saved.internal,snapshot().internal);assert.deepEqual(saved.items,snapshot().items);assert.equal(saved.notifications.deliveryStatus,'waiting');
 r=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member);const body=await r.json();assert.equal(body.snapshot.items.length,1);assert.equal(body.snapshot.internal,undefined);assert.doesNotMatch(JSON.stringify(body),/must stay private/);
 r=await capitalRadarRoute(req('/api/capital-radar/runner',headers,'PUT',{snapshot:snapshot({generatedAt:'2026-10-29T12:00:00Z'})}),e);assert.equal(r.status,409);
 const update=snapshot({notifications:{configured:true,deliveryStatus:'sent'}});r=await capitalRadarRoute(req('/api/capital-radar/runner',headers,'PUT',{snapshot:update}),e);assert.equal(r.status,200);
 r=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member);assert.equal((await r.json()).snapshot.notifications.deliveryStatus,'waiting');
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

const outbox=(message,createdAt='2026-10-30T12:00:00Z')=>({id:createHash('sha256').update(message).digest('hex').slice(0,24),message,status:'pending',createdAt});
const relayHeaders={Authorization:'Bearer '+relayKey};
const save=(e,data)=>capitalRadarRoute(req('/api/capital-radar/runner',{Authorization:'Bearer '+runner(e.MEMBER_WATCH_SECRET)},'PUT',{snapshot:data}),e);
const relay=(e,body,headers=relayHeaders)=>capitalRadarRoute(req('/api/capital-radar/alerts',headers,body?'POST':'GET',body),e);

test('relay service key is isolated from fleet login and collector capability, before body parsing',async(t)=>{
 const e=fixture(t);
 for(const headers of [{},{cookie},{Authorization:'Bearer '+runner(e.MEMBER_WATCH_SECRET)},{Authorization:'Bearer wrong'}]){
  const response=await relay(e,{id:'bad'},headers);assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/no-store/);assert.match(response.headers.get('x-robots-tag'),/noindex/);
 }
 assert.equal(e.EVENTS.sqlite.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='capital_radar_alerts'").get().n,0);
 const empty=await relay(e);assert.deepEqual(await empty.json(),{ok:true,alert:null});
 assert.equal((await capitalRadarRoute(req('/api/capital-radar/alerts',relayHeaders,'DELETE'),e)).status,405);
 assert.equal((await capitalRadarRoute(req('/api/capital-radar/runner',relayHeaders),e)).status,401);
 assert.equal((await capitalRadarRoute(req('/api/capital-radar',relayHeaders),e,member)).status,401);
});

test('oldest queued alert and exact-ID receipts cannot acknowledge unseen or other messages',async(t)=>{
 const e=fixture(t),first=outbox('First private signal'),second=outbox('Second private signal','2026-10-30T13:00:00Z');
 assert.equal((await save(e,snapshot({internal:{notificationOutbox:first}}))).status,200);
 assert.equal((await save(e,snapshot({generatedAt:'2026-10-30T13:00:00Z',internal:{notificationOutbox:second}}))).status,200);
 const fetched=await (await relay(e)).json();assert.deepEqual(fetched,{ok:true,alert:{id:first.id,message:first.message,createdAt:'2026-10-30T12:00:00.000Z'}});
 const deliveredAt='2026-10-31T13:00:00Z';
 assert.equal((await relay(e,{id:'f'.repeat(24),messageId:41,deliveredAt})).status,404);
 assert.equal((await relay(e,{id:first.id,messageId:42,deliveredAt})).status,200);
 assert.equal((await (await relay(e)).json()).alert.id,second.id);
 assert.equal((await relay(e,{id:first.id,messageId:42,deliveredAt:'2026-10-31T14:00:00Z'})).status,200);
 assert.equal((await relay(e,{id:first.id,messageId:43,deliveredAt})).status,409);
 assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM capital_radar_alerts WHERE delivered_at IS NOT NULL').get().n,1);
 const response=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member),view=(await response.json()).snapshot;
 assert.deepEqual(view.notifications,{configured:true,channel:'sunwatch',lastSentAt:'2026-10-31T13:00:00.000Z',deliveryStatus:'pending'});
 assert.equal(view.internal,undefined);assert.doesNotMatch(JSON.stringify(view),/First private signal|Second private signal|telegram_message_id|messageId|fixture-owner-alert/);
 assert.equal((await relay(e,{id:second.id,messageId:44,deliveredAt})).status,200);
 assert.deepEqual(await (await relay(e)).json(),{ok:true,alert:null});
 const admin=await capitalRadarRoute(req('/api/capital-radar/runner',{Authorization:'Bearer '+runner(e.MEMBER_WATCH_SECRET)}),e);
 const latest=(await admin.json()).snapshot;assert.equal(latest.internal.notificationOutbox.status,'sent');assert.equal(latest.internal.notificationOutbox.id,second.id);assert.equal(latest.notifications.deliveryStatus,'sent');
});

test('snapshot retries are idempotent, stale writes cannot enqueue, and collection cannot erase receipts',async(t)=>{
 const e=fixture(t),message=outbox('Queue once'),data=snapshot({internal:{notificationOutbox:message}});
 assert.equal((await save(e,data)).status,200);assert.equal((await save(e,data)).status,200);
 assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM capital_radar_alerts').get().n,1);
 const stale=snapshot({generatedAt:'2026-10-29T12:00:00Z',internal:{notificationOutbox:outbox('Stale must not enqueue','2026-10-29T12:00:00Z')}});
 assert.equal((await save(e,stale)).status,409);assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM capital_radar_alerts').get().n,1);
 assert.equal((await relay(e,{id:message.id,messageId:101,deliveredAt:'2026-10-31T00:00:00Z'})).status,200);
 assert.equal((await save(e,data)).status,200);
 assert.equal((await save(e,snapshot({generatedAt:'2026-10-31T12:00:00Z',notifications:{configured:false,deliveryStatus:'not_configured'},internal:{notificationOutbox:null}}))).status,200);
 const view=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member);assert.deepEqual((await view.json()).snapshot.notifications,{configured:true,channel:'sunwatch',lastSentAt:'2026-10-31T00:00:00.000Z',deliveryStatus:'sent'});
 assert.deepEqual(await (await relay(e)).json(),{ok:true,alert:null});
});

test('invalid queue payloads and receipts fail closed without ledger mutation',async(t)=>{
 const e=fixture(t),message=outbox('Valid alert');
 for(const entry of [{...message,id:'0'.repeat(24)},{...message,message:'x'.repeat(4001)},{...message,status:'invented'},{...message,createdAt:'2099-01-01T00:00:00Z'},[]])assert.equal((await save(e,snapshot({internal:{notificationOutbox:entry}}))).status,400);
 assert.equal((await save(e,snapshot({internal:{notificationOutbox:message}}))).status,200);
 for(const receipt of [{id:message.id,messageId:0,deliveredAt:'2026-10-31T00:00:00Z'},{id:message.id,messageId:1.2,deliveredAt:'2026-10-31T00:00:00Z'},{id:message.id,messageId:1,deliveredAt:'2026-10-20T00:00:00Z'},{id:message.id,messageId:1,deliveredAt:'2099-01-01T00:00:00Z'},{id:message.id}])assert.equal((await relay(e,receipt)).status,400);
 assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM capital_radar_alerts WHERE delivered_at IS NOT NULL').get().n,0);
});

test('enqueue database failure rolls back snapshot and never pretends successful delivery',async(t)=>{
 const e=fixture(t);assert.equal((await save(e,snapshot())).status,200);
 const prepare=e.EVENTS.prepare.bind(e.EVENTS);
 e.EVENTS.prepare=sql=>sql.startsWith('INSERT INTO capital_radar_alerts')?{bind(){return this;},async run(){throw Error('synthetic D1 failure');}}:prepare(sql);
 const response=await save(e,snapshot({generatedAt:'2026-10-31T12:00:00Z',internal:{notificationOutbox:outbox('Will rollback')}}));assert.equal(response.status,503);
 assert.equal(e.EVENTS.sqlite.prepare('SELECT generated_at FROM capital_radar_snapshot').get().generated_at,'2026-10-30T12:00:00.000Z');
 assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM capital_radar_alerts').get().n,0);
 e.EVENTS.prepare=()=>{throw Error('synthetic D1 unavailable');};
 assert.equal((await relay(e)).status,503);
 const memberResponse=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member);assert.equal(memberResponse.status,503);
});

test('72-hour expiry does not pretend delivery or block a newer signal, and late real ACK remains valid',async(t)=>{
 const e=fixture(t),oldAt=new Date(Date.now()-80*3600000).toISOString(),newAt=new Date(Date.now()-3600000).toISOString();
 const old=outbox('Expired signal',oldAt),fresh=outbox('Recent signal',newAt);
 assert.equal((await save(e,snapshot({generatedAt:oldAt,internal:{notificationOutbox:old}}))).status,200);
 assert.deepEqual(await (await relay(e)).json(),{ok:true,alert:null});
 const oldRow=e.EVENTS.sqlite.prepare('SELECT expired_at,delivered_at FROM capital_radar_alerts WHERE id=?').get(old.id);assert.ok(oldRow.expired_at);assert.equal(oldRow.delivered_at,null);
 let response=await capitalRadarRoute(req('/api/capital-radar/runner',{Authorization:'Bearer '+runner(e.MEMBER_WATCH_SECRET)}),e),view=(await response.json()).snapshot;
 assert.equal(view.notifications.deliveryStatus,'expired');assert.equal(view.notifications.lastSentAt,undefined);assert.equal(view.internal.notificationOutbox.status,'expired');
 assert.equal((await save(e,snapshot({generatedAt:newAt,internal:{notificationOutbox:fresh}}))).status,200);
 assert.equal((await (await relay(e)).json()).alert.id,fresh.id);
 // A delayed acknowledgment records an actual prior Telegram acceptance. It
 // acknowledges only the expired ID and leaves the newer pending alert intact.
 assert.equal((await relay(e,{id:old.id,messageId:301,deliveredAt:new Date(Date.parse(oldAt)+3600000).toISOString()})).status,200);
 assert.equal((await (await relay(e)).json()).alert.id,fresh.id);
 response=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member);view=(await response.json()).snapshot;
 assert.equal(view.notifications.deliveryStatus,'pending');assert.ok(view.notifications.lastSentAt);
 assert.equal((await relay(e,{id:fresh.id,messageId:302,deliveredAt:new Date(Date.now()).toISOString()})).status,200);
 response=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member);view=(await response.json()).snapshot;assert.equal(view.notifications.deliveryStatus,'sent');
 const actualReceipt=view.notifications.lastSentAt,now=Date.now(),third=outbox('Later unconfirmed signal',new Date(now).toISOString());
 assert.equal((await save(e,snapshot({generatedAt:third.createdAt,internal:{notificationOutbox:third}}))).status,200);
 t.mock.method(Date,'now',()=>now+74*3600000);
 response=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member);view=(await response.json()).snapshot;
 assert.equal(view.notifications.deliveryStatus,'expired');assert.equal(view.notifications.lastSentAt,actualReceipt);
});

test('pre-release queue schema gains expiry without losing existing rows',async(t)=>{
 const e=fixture(t),old=outbox('Preserved legacy queued message',new Date(Date.now()-80*3600000).toISOString());
 e.EVENTS.sqlite.exec('CREATE TABLE capital_radar_alerts(id TEXT PRIMARY KEY,message TEXT NOT NULL,created_at TEXT NOT NULL,delivered_at TEXT,telegram_message_id INTEGER)');
 e.EVENTS.sqlite.prepare('INSERT INTO capital_radar_alerts(id,message,created_at) VALUES(?,?,?)').run(old.id,old.message,old.createdAt);
 assert.deepEqual(await (await relay(e)).json(),{ok:true,alert:null});
 const row=e.EVENTS.sqlite.prepare('SELECT * FROM capital_radar_alerts').get();assert.equal(row.id,old.id);assert.ok(row.expired_at);assert.equal(row.delivered_at,null);
});

test('missing historical identity archive or relay configuration cannot block monitoring reads and collection',async(t)=>{
 const e=fixture(t);delete e.CAPITAL_RADAR_RELAY_KEY;
 assert.equal(e.EVENTS.sqlite.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='owner_identity'").get().n,0);
 let response=await capitalRadarRoute(req('/api/capital-radar/runner',{Authorization:'Bearer '+runner(e.MEMBER_WATCH_SECRET)}),e);
 assert.deepEqual(await response.json(),{ok:true,snapshot:null});
 const message=outbox('Durable until relay is configured');
 assert.equal((await save(e,snapshot({internal:{notificationOutbox:message}}))).status,200);
 response=await capitalRadarRoute(req('/api/capital-radar/runner',{Authorization:'Bearer '+runner(e.MEMBER_WATCH_SECRET)}),e);
 let view=(await response.json()).snapshot;assert.equal(view.items.length,1);assert.equal(view.notifications.configured,false);assert.equal(view.notifications.deliveryStatus,'pending');
 assert.equal((await relay(e)).status,401);
 response=await capitalRadarRoute(req('/api/capital-radar',{cookie}),e,member);view=(await response.json()).snapshot;assert.equal(view.items.length,1);assert.equal(view.internal,undefined);assert.equal(view.notifications.configured,false);
 e.CAPITAL_RADAR_RELAY_KEY=relayKey;
 assert.equal((await (await relay(e)).json()).alert.id,message.id);
 response=await capitalRadarRoute(req('/api/capital-radar/runner',{Authorization:'Bearer '+runner(e.MEMBER_WATCH_SECRET)}),e);
 view=(await response.json()).snapshot;assert.equal(view.notifications.configured,true);assert.equal(view.internal.notificationOutbox.status,'pending');
 assert.equal(e.EVENTS.sqlite.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='owner_identity'").get().n,0);
});
