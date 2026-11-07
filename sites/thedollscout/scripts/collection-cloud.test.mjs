import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {collectionCloud,MAX_BYTES,MIN_WRITE_GAP_MS} from '../lib/collection-cloud.js';
import {SESSION_COOKIE} from '../../../tools/fleet-account/config.mjs';
const origin='https://thedollscout.com',fixture={app:'dollscout-collection',version:1,items:[{name:'Fixture figure',series:'Fixture series',status:'owned',quantity:2}]};
function setup({firstInsertCount}={}){
 const sql=new DatabaseSync(':memory:');let time=100000,active=true,calls=0;
 let racingInserts=firstInsertCount===undefined?null:[];
 const insertOrder=[];
 const env={HITS:{prepare(query){let args=[];const q={bind(...v){args=v;return q},async run(){return sql.prepare(query).run(...args)},async first(){
  if(racingInserts&&query.startsWith('INSERT INTO collector_cloud_v1('))return new Promise((resolve,reject)=>{
   racingInserts.push({query,args,resolve,reject});
   if(racingInserts.length===2){
    // Both requests have read the same revision before either real SQLite CAS runs.
    const pending=racingInserts;racingInserts=null;
    if(JSON.parse(pending[0].args[1]).items.length!==firstInsertCount)pending.reverse();
    for(const write of pending){try{insertOrder.push(JSON.parse(write.args[1]).items.length);write.resolve(sql.prepare(write.query).get(...write.args)||null)}catch(error){write.reject(error)}}
   }
  });
  return sql.prepare(query).get(...args)||null;
 } };return q}}};
 const service=async(url,init)=>{calls++;assert.equal(url,'https://baipiaoji.com/api/account-fleet');assert.equal(init.redirect,'manual');assert.deepEqual(JSON.parse(init.body),{action:'session',host:'thedollscout.com'});return active?Response.json({ok:true,user:{id:init.headers.Authorization.endsWith('b'.repeat(43))?'account-b':'account-a',email:'must-not-leak@example.test'}}):Response.json({ok:false},{status:401})};
 const req=(body,token='a',headers={},method=body?'POST':'GET')=>new Request(origin+'/api/collection-cloud',{method,headers:{Cookie:SESSION_COOKIE+'='+token.repeat(43),...(body?{Origin:origin,'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 const run=(body,token='a',headers={})=>collectionCloud(req(body,token,headers),env,service,()=>time);
 return {sql,env,service,req,run,insertOrder,advance(){time+=MIN_WRITE_GAP_MS},revoke(){active=false},get calls(){return calls}};
}
const parsed=async r=>({status:r.status,data:await r.json()});

test('server identity, CSRF, canonical host and private cache headers fail closed',async()=>{
 const c=setup();for(const [request,code] of [[new Request(origin+'/api/collection-cloud'),401],[c.req(null,'a',{'Sec-Fetch-Site':'cross-site'}),403],[c.req({action:'save'},'a',{Origin:'https://evil.example'}),403],[new Request('https://evil.example/api/collection-cloud'),403],[c.req(null,'a',{},'PUT'),405],[c.req(null,'a',{Cookie:SESSION_COOKIE+'='+'a'.repeat(43)+'; '+SESSION_COOKIE+'='+'b'.repeat(43)}),401]]){const r=await collectionCloud(request,c.env,c.service);assert.equal(r.status,code);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.match(r.headers.get('X-Robots-Tag'),/noindex/);}
 assert.equal(c.calls,0);const r=await c.run(),text=await r.text();assert(!text.includes('account-a'));assert(!text.includes('example.test'));assert(!text.includes('collection"'));assert.equal(JSON.parse(text).revision,0);
 c.revoke();assert.equal((await c.run()).status,401);
});
for(const firstInsertCount of [1,0])test(`real SQLite isolates accounts and enforces atomic compare-and-swap and deletion tombstones (${firstInsertCount}-item write first)`,async()=>{
 const c=setup({firstInsertCount}),a=await(await c.run()).json(),b=await(await c.run(null,'b')).json();assert.notEqual(a.owner,b.owner);
 const collections=[fixture,{...fixture,items:[]}];
 const writes=await Promise.all(collections.map(collection=>c.run({action:'save',owner:a.owner,revision:0,collection})));assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);
 const winner=collections[writes.findIndex(r=>r.status===200)];assert.equal(winner.items.length,firstInsertCount);assert.deepEqual(c.insertOrder,[firstInsertCount,1-firstInsertCount]);
 const current=await(await c.run()).json();assert.equal(current.revision,1);assert.equal(current.count,winner.items.length);assert.equal(current.has_copy,true);assert(!('collection'in current));
 assert.deepEqual(JSON.parse(c.sql.prepare('SELECT payload FROM collector_cloud_v1 WHERE owner=?').get(a.owner).payload),winner);
 assert.equal((await c.run({action:'restore',owner:a.owner,revision:1},'b')).status,409);
 assert.equal((await c.run({action:'restore',owner:b.owner,revision:0},'b')).status,404);
 assert.deepEqual((await(await c.run({action:'restore',owner:a.owner,revision:1})).json()).collection,winner);
 const limited=await c.run({action:'save',owner:a.owner,revision:1,collection:fixture});assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'10');
 c.advance();assert.equal((await c.run({action:'delete',owner:a.owner,revision:1})).status,200);const deleted=await(await c.run()).json();assert.equal(deleted.revision,2);assert.equal(deleted.has_copy,false);assert.equal(c.sql.prepare('SELECT payload FROM collector_cloud_v1 WHERE owner=?').get(a.owner).payload,null);
 c.advance();assert.equal((await c.run({action:'save',owner:a.owner,revision:0,collection:fixture})).status,409);assert.equal((await c.run({action:'restore',owner:a.owner,revision:2})).status,404);
 assert.equal((await c.run({action:'save',owner:a.owner,revision:2,collection:fixture})).status,200);assert.equal((await(await c.run()).json()).revision,3);c.revoke();assert.equal((await c.run({action:'restore',owner:a.owner,revision:3})).status,401);
});
test('strict schema, byte limits, unsupported content and malformed streams never write',async()=>{
 const c=setup(),state=await(await c.run()).json(),base={action:'save',owner:state.owner,revision:0};
 const bad=[{...fixture,secret:'x'},{...fixture,version:2},{...fixture,items:Array.from({length:501},()=>fixture.items[0])},{...fixture,items:[{...fixture.items[0],email:'x'}]},{...fixture,items:[{...fixture.items[0],quantity:'2'}]},{...fixture,items:[{...fixture.items[0],series:{secret:'x'}}]},{...fixture,items:[{...fixture.items[0],name:'x'.repeat(121)}]},{...fixture,items:[{...fixture.items[0],status:'admin'}]}];
 for(const collection of bad)assert.equal((await c.run({...base,collection})).status,400);
 assert.equal((await c.run({...base,collection:fixture,debug:true})).status,400);
 assert.equal((await c.run({...base,action:'delete',collection:fixture})).status,400);
 const huge={...fixture,items:Array.from({length:500},()=>({...fixture.items[0],name:'猫'.repeat(120),series:'型'.repeat(120)}))};assert.equal((await c.run({...base,collection:huge})).status,413);
 assert.equal((await c.run({...base,collection:fixture},'a',{'Content-Type':'text/plain'})).status,400);
 for(const body of ['{bad',new Uint8Array([0xff]),'x'.repeat(MAX_BYTES+4097)]){const r=await collectionCloud(new Request(origin+'/api/collection-cloud',{method:'POST',headers:{Cookie:SESSION_COOKIE+'='+'a'.repeat(43),Origin:origin,'Content-Type':'application/json'},body}),c.env,c.service);assert([400,413].includes(r.status));}
 assert.equal(c.sql.prepare('SELECT count(*) n FROM collector_cloud_v1').get().n,0);
});
test('storage and hub outages are explicit without logging or leaking upstream content',async()=>{
 const c=setup();for(const fetcher of [async()=>{throw Error('token-private')},async()=>new Response('private',{status:302}),async()=>Response.json({ok:true,user:{email:'private'}})]){const r=await collectionCloud(c.req(),c.env,fetcher);assert.equal(r.status,503);assert(!JSON.stringify(await r.json()).includes('private'));}
 assert.equal((await collectionCloud(c.req(),{},c.service)).status,503);
});
