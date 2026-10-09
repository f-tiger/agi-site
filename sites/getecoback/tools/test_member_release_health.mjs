import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {validateMemberStatus,checkMemberReleaseHealth} from './member_release_health.mjs';
const valid=()=>({ok:true,ready:true,site:'eco',chain:'bsc',token:'USDT',auto_renew:false,plan:{id:'eco-workbench-30',price_units:9000000,quote_base:9020000,days:30,workspaces:50,versions:10,max_bytes:65536,total_bytes:5242880,grace_days:30}});
test('existing readiness and every site/rail/plan field must match; unknown is not healthy',()=>{
 assert.equal(validateMemberStatus(valid()).ready,true);
 for(const key of ['ok','ready','site','chain','token','auto_renew']){const d=valid();delete d[key];assert.throws(()=>validateMemberStatus(d));}
 for(const key of Object.keys(valid().plan)){const d=valid();delete d.plan[key];assert.throws(()=>validateMemberStatus(d));}
 for(const patch of [{ready:false},{ready:'true'},{site:'bpj'},{chain:'base-sepolia'},{token:'USDC'},{auto_renew:true}])assert.throws(()=>validateMemberStatus({...valid(),...patch}));
});
test('release health performs one fixed GET with no bearer, POST, order or watcher action',async()=>{
 let requests=[];const result=await checkMemberReleaseHealth(async(url,options)=>{requests.push({url,options});return new Response(JSON.stringify(valid()));});
 assert.equal(requests.length,1);assert.equal(requests[0].url,'https://getecoback.com/api/member');assert.equal(requests[0].options.method,'GET');assert.equal(requests[0].options.credentials,'omit');assert(!requests[0].options.headers);assert(!requests[0].options.body);
 assert.equal(result.freshChainProbe,false);assert.equal(result.watchKeyAuthentication,false);assert.equal(result.ordersProcessed,false);
});
test('network errors, failed HTTP, invalid JSON and false readiness fail closed',async()=>{
 for(const response of [()=>{throw Error('offline');},()=>new Response('{}',{status:503}),()=>new Response('not-json'),()=>new Response(JSON.stringify({...valid(),ready:false}))])await assert.rejects(checkMemberReleaseHealth(async()=>response()));
});
test('push release gate uses status checks; original non-push watcher remains separate',()=>{
 const workflow=readFileSync(new URL('../../../.github/workflows/deploy-getecoback.yml',import.meta.url),'utf8');
 const read=workflow.match(/- name: Verify non-destructive membership readiness after push([\s\S]*?)(?=\n      - name:)/)?.[1];
 assert(read);assert(read.includes("if: github.event_name == 'push'"));assert(read.includes('member_release_health.mjs'));assert(read.includes('tools/member-studio/verify.mjs --site eco --live'));assert(!read.includes('ops.mjs watch'));assert(!read.includes('ADS_WATCH_SECRET'));assert(!read.includes('continue-on-error'));
 const watch=workflow.match(/- name: Verify independent membership after deployment([\s\S]*?)(?=\n      - name:)/)?.[1];
 assert(watch.includes("if: github.event_name != 'push'"));assert(watch.includes('ops.mjs watch eco'));
});

test('actual ECO status route is non-destructive, stale health fails and 401 touches no database',async()=>{
 const {database}=await import('../../../tools/member-studio/test-fixtures.mjs');
 const {memberRoute}=await import('../../../tools/member-studio/server.mjs');
 const db=database(),queries=[],prepare=db.prepare.bind(db),beforeFetch=globalThis.fetch;
 db.prepare=sql=>{queries.push(sql);return prepare(sql);};
 globalThis.fetch=async()=>{throw Error('No live RPC or network is permitted by this fixture');};
 const raw={EVENTS:db,MEMBERS_ENABLED:'true',MEMBER_WALLET:'0x'+'2'.repeat(40),MEMBER_WATCH_SECRET:'2'.repeat(64)};
 const get=async()=>{queries.length=0;const r=await memberRoute(new Request('https://getecoback.com/api/member'),raw,'eco');assert.equal(r.status,200);assert(queries.every(q=>/^(CREATE|SELECT)\b/.test(q)));return r.json();};
 try{
  assert.equal((await get()).ready,false,'missing watcher health must close readiness');
  const now=Math.floor(Date.now()/1000),stale=now-14401;
  db.sql.prepare('INSERT INTO wb_health(id,checked_at) VALUES(1,?)').run(stale);
  assert.equal((await get()).ready,false,'health older than four hours must fail');
  assert.equal(db.sql.prepare('SELECT checked_at FROM wb_health WHERE id=1').get().checked_at,stale);
  db.sql.prepare('UPDATE wb_health SET checked_at=? WHERE id=1').run(now-60);
  assert.equal(validateMemberStatus(await get()).ready,true);
  assert.equal(db.sql.prepare('SELECT checked_at FROM wb_health WHERE id=1').get().checked_at,now-60,'GET never refreshes health');
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_orders').get().n,0);
  for(const endpoint of ['member','member-admin','member-watch']){
   queries.length=0;const r=await memberRoute(new Request('https://getecoback.com/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"action":"list"}'}),raw,'eco');
   assert.equal(r.status,401);assert.equal(queries.length,0,'unauthenticated POST must not reach schema or order handling');
  }
 }finally{globalThis.fetch=beforeFetch;db.sql.close();}
});
