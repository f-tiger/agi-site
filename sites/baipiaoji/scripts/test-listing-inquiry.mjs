import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../functions/api/listing-inquiry.js';
import {application,digest,ensure,INQUIRY_LIMITS,saveInquiry,withdrawInquiry} from '../lib/listing-inquiry.js';

function database() {
  const sqlite=new DatabaseSync(':memory:'); let operations=0;
  const HITS={prepare(sql){let values=[];const query={bind(...args){values=args;return query;},rawRun(){operations++;return sqlite.prepare(sql).run(...values);},async run(){return query.rawRun();},async first(){operations++;return sqlite.prepare(sql).get(...values)||null;},async all(){operations++;return {results:sqlite.prepare(sql).all(...values)};}};return query;},async batch(queries){sqlite.exec('BEGIN');try{const results=queries.map(query=>query.rawRun());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
  return {sqlite,HITS,operations:()=>operations};
}
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
const sample=(patch={})=>({email:'merchant@example.test',shopUrl:'https://merchant.example.test/shop',skuCount:'1-10',blocker:'english',consent:true,website:'',requestId:crypto.randomUUID(),receipt:token(),qa:false,...patch});
const request=(body,options={})=>new Request(options.url||'https://baipiaoji.com/api/listing-inquiry',{
  method:options.method||'POST',headers:{Origin:'https://baipiaoji.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...options.headers},
  ...((options.method||'POST')==='GET'?{}:{body:options.raw??JSON.stringify(body)}),
});
const call=(fixture,body,options={})=>onRequest({request:request(body,options),env:options.env??{HITS:fixture.HITS}});
const count=(fixture,table='listing_inquiries')=>fixture.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n;

test('capability GET is read-only and declares no payment; no operator endpoint',async()=>{
  const fixture=database();
  const response=await call(fixture,null,{method:'GET'});
  assert.deepEqual(await response.json(),{ok:true,accepting:true,paymentEnabled:false});
  assert.equal(fixture.operations(),0);
  assert.equal(fixture.sqlite.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table'").get().n,0);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-robots-tag'),'noindex');
  assert.equal((await call(fixture,null,{method:'GET',env:{}})).status,503);
  for(const action of ['list','stats','review','pause'])assert.equal((await call(fixture,{action})).status,400);
  assert.equal(fixture.operations(),0);
  fixture.sqlite.close();
});

test('same-origin and strict bounded request schema before database work',async()=>{
  const fixture=database(),body=sample();
  for(const origin of ['https://evil.example','null','https://baipiaoji.com:444',''])assert.equal((await call(fixture,body,{headers:{Origin:origin}})).status,403);
  assert.equal((await call(fixture,body,{method:'PUT'})).status,405);
  assert.equal((await call(fixture,body,{headers:{'Content-Type':'text/plain'}})).status,415);
  for(const bad of [null,[],true,{...body,consent:false},{...body,qa:'false'},{...body,qa:undefined},{...body,email:'bad'},
    {...body,email:'x@example.test\n'}, {...body,email:'a'.repeat(255)+'@example.test'},
    {...body,requestId:'request'}, {...body,receipt:'a'.repeat(63)}, {...body,receipt:'X'.repeat(64)},
    {...body,skuCount:'1000'}, {...body,blocker:'other'}, {...body,shopUrl:{}}, {...body,website:{}},
    {...body,shopUrl:'https://user:password@example.test'}, {...body,shopUrl:'https://example.test/?token=private'},
    {...body,shopUrl:'https://example.test/#private'}, {...body,shopUrl:'javascript:alert(1)'},
    {...body,shopUrl:'https://exa\nmple.test'}, {...body,products:[{sku:'private'}]}, {...body,note:'unrequested product data'},
    {...body,receipt:undefined}])assert.equal((await call(fixture,bad)).status,400);
  assert.equal((await call(fixture,body,{raw:'not json'})).status,400);
  assert.equal((await call(fixture,body,{raw:new Uint8Array([0xff])})).status,400);
  assert.equal((await call(fixture,body,{raw:'x'.repeat(4097)})).status,413);
  assert.equal((await call(fixture,body,{headers:{'Content-Length':'4097'}})).status,413);
  assert.equal(fixture.operations(),0);
  fixture.sqlite.close();
});

test('streaming limit cancels oversized unknown-length bodies',async()=>{
  let cancelled=false,index=0;
  const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(3000));index++;if(index>3)controller.close();},cancel(){cancelled=true;}});
  const response=await onRequest({request:new Request('https://baipiaoji.com/api/listing-inquiry',{method:'POST',duplex:'half',headers:{Origin:'https://baipiaoji.com','Content-Type':'application/json'},body:stream}),env:{}});
  assert.equal(response.status,413);assert.equal(cancelled,true);
});

test('QA and honeypot requests do not create even schema or lead rows',async()=>{
  const fixture=database();
  for(const [body,options] of [[sample({qa:true}),{}],[sample(),{url:'https://baipiaoji.com/api/listing-inquiry?__ci=1'}],[sample(),{headers:{'User-Agent':'HeadlessChrome Playwright'}}]]){
    assert.deepEqual(await (await call(fixture,body,options)).json(),{ok:true,code:'qa',saved:false,paymentEnabled:false});
  }
  const ignored=await (await call(fixture,sample({website:'spam'}))).json();assert.equal(ignored.saved,false);
  assert.equal(fixture.operations(),0);
  assert.equal((await call(fixture,sample(),{env:{}})).status,503);
  assert.equal((await call(fixture,sample(),{headers:{'CF-Connecting-IP':''}})).status,503);
  assert.equal(fixture.operations(),0);
  fixture.sqlite.close();
});

test('private persistence, normalization and proof-bound idempotent retries',async()=>{
  const fixture=database(),body=sample({email:' Merchant@Example.Test '});
  const first=await call(fixture,body);assert.equal(first.status,200);
  const output=await first.json();assert.equal(output.saved,true);assert.equal(output.paymentEnabled,false);
  const publicText=JSON.stringify(output);assert.ok(!publicText.includes(body.receipt));assert.ok(!publicText.includes('Merchant'));
  const stored=fixture.sqlite.prepare('SELECT * FROM listing_inquiries').get();
  assert.equal(stored.email,'merchant@example.test');assert.equal(stored.receipt_hash,await digest(body.receipt));assert.equal(stored.qa,0);
  assert.equal(stored.consent,1);assert.equal(stored.status,'new');
  assert.ok(!Object.values(stored).includes(body.receipt));assert.ok(!Object.values(stored).includes('192.0.2.1'));
  assert.equal((await call(fixture,body)).status,200);assert.equal(count(fixture),1);assert.equal(count(fixture,'listing_inquiry_rates'),1);
  assert.equal((await call(fixture,{...body,blocker:'images'})).status,409);
  assert.equal((await call(fixture,{...body,receipt:token()})).status,409);
  // Same contact with a different proof is neither disclosed nor rejected as an
  // existing email. Applications are not advertised as distinct humans.
  assert.equal((await call(fixture,sample())).status,200);assert.equal(count(fixture),2);
  fixture.sqlite.close();
});

test('withdrawal is non-enumerating, erases contact and cannot reset rate quota',async()=>{
  const fixture=database(),body=sample();await call(fixture,body);
  const form={action:'withdraw',requestId:body.requestId,receipt:body.receipt};
  const wrong=await (await call(fixture,{...form,receipt:token()})).json();assert.equal(count(fixture),1);
  const real=await (await call(fixture,form)).json();assert.deepEqual(real,wrong);assert.equal(count(fixture),0);
  assert.equal(count(fixture,'listing_inquiry_rates'),2);
  assert.equal((await call(fixture,form)).status,200);
  assert.equal((await call(fixture,body)).status,409);
  for(let index=2;index<INQUIRY_LIMITS.perNetworkDay;index++)assert.equal((await call(fixture,sample())).status,200);
  assert.equal((await call(fixture,sample())).status,429);
  assert.equal(count(fixture,'listing_inquiry_rates'),INQUIRY_LIMITS.perNetworkDay);
  fixture.sqlite.close();
});

test('withdrawal before a delayed application atomically blocks that exact proof',async()=>{
  const fixture=database(),body=sample(),form={action:'withdraw',requestId:body.requestId,receipt:body.receipt};
  const withdrawn=await call(fixture,form);assert.equal(withdrawn.status,200);
  assert.equal(count(fixture),0);assert.equal(count(fixture,'listing_inquiry_cancellations'),1);
  assert.equal((await call(fixture,body)).status,409);
  assert.equal(count(fixture),0);assert.equal(count(fixture,'listing_inquiry_rates'),1);
  // Replay of the exact withdrawal is idempotent, not another rate slot.
  assert.equal((await call(fixture,form)).status,200);assert.equal(count(fixture,'listing_inquiry_rates'),1);
  fixture.sqlite.close();

  // Exercise the public helper order that reproduced the original race.
  const direct=database(),value=application(sample());
  assert.equal(await withdrawInquiry(direct.HITS,value),'withdrawn');
  assert.equal(await saveInquiry(direct.HITS,value,'192.0.2.1'),'conflict');
  assert.equal(count(direct),0);direct.sqlite.close();
});

test('an incorrect withdrawal proof does not block the real delayed application',async()=>{
  const fixture=database(),body=sample();
  await call(fixture,{action:'withdraw',requestId:body.requestId,receipt:token()});
  assert.equal((await call(fixture,body)).status,200);
  assert.equal(count(fixture),1);
  assert.equal(fixture.sqlite.prepare('SELECT receipt_hash FROM listing_inquiries').get().receipt_hash,await digest(body.receipt));
  fixture.sqlite.close();
});

test('unknown withdrawal cap fails explicitly while existing contacts can always withdraw',async()=>{
  const fixture=database(),body=sample();await call(fixture,body);
  for(let index=1;index<INQUIRY_LIMITS.perNetworkDay;index++){
    const pending=sample();assert.equal((await call(fixture,{action:'withdraw',requestId:pending.requestId,receipt:pending.receipt})).status,200);
  }
  const over=sample(),response=await call(fixture,{action:'withdraw',requestId:over.requestId,receipt:over.receipt});
  assert.equal(response.status,429);assert.equal((await response.json()).code,'capacity');
  assert.equal(count(fixture,'listing_inquiry_cancellations'),INQUIRY_LIMITS.perNetworkDay-1);
  const real=await call(fixture,{action:'withdraw',requestId:body.requestId,receipt:body.receipt});
  assert.equal(real.status,200);assert.equal(count(fixture),0);
  assert.equal(count(fixture,'listing_inquiry_rates'),INQUIRY_LIMITS.perNetworkDay);
  fixture.sqlite.close();
});

test('both concurrent withdrawal/application orders leave no resurrected contact',async()=>{
  for(const withdrawalFirst of [true,false])for(let attempt=0;attempt<5;attempt++){
    const fixture=database(),body=sample(),form={action:'withdraw',requestId:body.requestId,receipt:body.receipt};
    const calls=withdrawalFirst?[call(fixture,form),call(fixture,body)]:[call(fixture,body),call(fixture,form)];
    const responses=await Promise.all(calls);
    assert.equal(responses[withdrawalFirst?0:1].status,200);
    assert.equal(count(fixture),0);
    assert.equal(count(fixture,'listing_inquiry_cancellations'),1);
    assert.equal((await call(fixture,body)).status,409);
    fixture.sqlite.close();
  }
});

test('cancellation has an explicit 30-day bound and expiry uses an index',async()=>{
  const fixture=database(),value=application(sample()),now=Date.parse('2026-10-31T12:00:00Z');
  await withdrawInquiry(fixture.HITS,value,now,'192.0.2.1');
  assert.equal(await saveInquiry(fixture.HITS,value,'192.0.2.1',now+29*86400000),'conflict');
  assert.equal(count(fixture),0);
  assert.ok(fixture.sqlite.prepare('EXPLAIN QUERY PLAN DELETE FROM listing_inquiry_cancellations WHERE expires <= ?').all(now).some(plan=>plan.detail.includes('listing_inquiry_cancellations_expires')));
  await ensure(fixture.HITS,now+31*86400000);
  assert.equal(count(fixture,'listing_inquiry_cancellations'),0);
  assert.equal(await saveInquiry(fixture.HITS,value,'192.0.2.1',now+31*86400000),'saved');
  fixture.sqlite.close();
});

test('daily global limit remains bounded across networks',async()=>{
  const fixture=database();
  for(let index=0;index<INQUIRY_LIMITS.perDay;index++){
    assert.equal((await call(fixture,sample(),{headers:{'CF-Connecting-IP':'192.0.2.'+index}})).status,200);
  }
  assert.equal((await call(fixture,sample(),{headers:{'CF-Connecting-IP':'198.51.100.1'}})).status,429);
  assert.equal(count(fixture),INQUIRY_LIMITS.perDay);
  const plans=fixture.sqlite.prepare('EXPLAIN QUERY PLAN SELECT COUNT(*) FROM listing_inquiry_rates WHERE rate_key=?').all('key');
  assert.ok(plans.some(plan=>plan.detail.includes('listing_inquiry_rates_key')));
  assert.ok(fixture.sqlite.prepare('EXPLAIN QUERY PLAN SELECT COUNT(*) FROM listing_inquiry_rates WHERE day=?').all('day').some(plan=>plan.detail.includes('listing_inquiry_rates_day')));
  fixture.sqlite.close();
});

test('racing submissions cannot overrun rate slots or overwrite an id',async()=>{
  const fixture=database();
  const responses=await Promise.all(Array.from({length:12},()=>call(fixture,sample())));
  assert.equal(responses.filter(response=>response.status===200).length,INQUIRY_LIMITS.perNetworkDay);
  assert.equal(count(fixture),INQUIRY_LIMITS.perNetworkDay);
  fixture.sqlite.close();
  const another=database(),body=sample();
  const duplicate=await Promise.all([call(another,body),call(another,body)]);
  assert.deepEqual(duplicate.map(response=>response.status),[200,200]);assert.equal(count(another),1);
  const conflicting=await Promise.all([call(another,{...sample(),requestId:body.requestId}),call(another,{...body,blocker:'images'})]);
  assert.deepEqual(conflicting.map(response=>response.status),[409,409]);assert.equal(count(another),1);
  another.sqlite.close();
});

test('expiry cleans contacts and temporary rate pseudonyms on valid mutations only',async()=>{
  const fixture=database(),now=Date.parse('2026-10-31T12:00:00Z');
  await saveInquiry(fixture.HITS,application(sample()),'192.0.2.1',now);
  await ensure(fixture.HITS,now+49*3600000);
  assert.equal(count(fixture),1);assert.equal(count(fixture,'listing_inquiry_rates'),0);
  const before=fixture.operations();await call(fixture,null,{method:'GET'});assert.equal(fixture.operations(),before);
  await ensure(fixture.HITS,now+31*86400000);assert.equal(count(fixture),0);
  fixture.sqlite.close();
});

test('database errors do not expose contact, token, SQL or environment details',async()=>{
  const fixture=database(),body=sample();
  const response=await call(fixture,body,{env:{HITS:{prepare(){throw Error('private details '+body.email+' '+body.receipt);},batch(){throw Error('private');}}}});
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{ok:false,code:'unavailable',paymentEnabled:false});
  fixture.sqlite.close();
});
