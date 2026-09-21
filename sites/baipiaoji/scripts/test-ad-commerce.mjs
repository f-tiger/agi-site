import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {ensure,fulfill,publicStatus,settings,signature} from '../lib/ad-commerce.js';
import {onRequestPost as hook} from '../functions/api/ad-webhook.js';
import {onRequestPost as draft} from '../functions/api/ad-draft.js';
import {onRequestPost as status} from '../functions/api/ad-status.js';
import {onRequestGet as ads} from '../functions/api/ads.js';
function db(){
 const sql=new DatabaseSync(':memory:');
 return {sql,fail:false,failAt:null,prepare(query){const self=this;return {args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(query).get(...this.args)||null;},async all(){return {results:sql.prepare(query).all(...this.args)};},async run(){if(self.fail)throw Error('database failed');const r=sql.prepare(query).run(...this.args);return {meta:{changes:r.changes}};},query};},async batch(items){sql.exec('BEGIN');try{const out=[];for(const [i,s] of items.entries()){if(this.fail||this.failAt===i)throw Error('database failed');out.push({meta:{changes:sql.prepare(s.query).run(...s.args).changes}});}sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
}
const envFor=HITS=>({HITS,ADS_PRICE_CENTS:'4900',ADS_DAYS:'30',ADS_CURRENCY:'EUR',ADS_STRIPE_MODE:'test',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'fixture'});
const now=2000000000;
async function seed(d,id,extra={}){await ensure(d);d.sql.prepare(`INSERT INTO bpj_ad_checkout(id,token_hash,name,url,pitch,cat,lang,price_cents,currency,days,livemode,state,session,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,'hash'+id,'Tool','https://tool.example.org','Workflow tool',extra.cat||'coding','en',4900,'eur',30,extra.live??0,'pending','cs_'+id,now);}
function session(id,extra={}){return {id:'cs_'+id,metadata:{bpj_order:id},client_reference_id:id,mode:'payment',payment_status:'paid',payment_intent:'pi_'+id,amount_subtotal:4900,amount_total:4900,currency:'eur',livemode:false,total_details:{amount_tax:0},...extra};}
function eventRequest(ev){const raw=JSON.stringify(ev),t=Math.floor(Date.now()/1000);const sig=createHmac('sha256','fixture').update(t+'.'+raw).digest('hex');return new Request('https://baipiaoji.com/api/ad-webhook',{method:'POST',headers:{'Stripe-Signature':`t=${t},v1=${sig}`},body:raw});}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS',name);}
await test('four concurrent payments get 3 lanes; fourth gets full future term',async()=>{
 const d=db();for(const id of ['a','b','c','d'])await seed(d,id);
 await Promise.all(['a','b','c','d'].map(id=>fulfill(d,session(id),'evt_'+id,'checkout.session.completed',now)));
 const rows=d.sql.prepare('SELECT * FROM bpj_ad_checkout ORDER BY id').all();
 assert.deepEqual(rows.map(r=>r.slot),[1,2,3,1]);assert.deepEqual(rows.map(r=>r.starts_at),[now,now,now,now+30*86400]);
 assert.equal(publicStatus(rows[3],now).state,'queued');assert.equal(publicStatus(rows[0],now+30*86400).state,'expired');
 assert.equal(publicStatus(rows[3],now+30*86400).state,'live');
 const before=JSON.stringify(rows);await fulfill(d,session('a'),'evt_other','checkout.session.async_payment_succeeded',now+100);assert.equal(JSON.stringify(d.sql.prepare('SELECT * FROM bpj_ad_checkout ORDER BY id').all()),before);
});
await test('category and live/test inventories are independent',async()=>{
 const d=db();for(const id of ['a','b','c']){await seed(d,id);await fulfill(d,session(id),'evt_'+id,'paid',now);}
 await seed(d,'live',{live:1});await fulfill(d,session('live',{livemode:true}),'evt_live','paid',now);
 await seed(d,'other',{cat:'image'});await fulfill(d,session('other'),'evt_other','paid',now);
 assert.equal(d.sql.prepare('SELECT starts_at FROM bpj_ad_checkout WHERE id=?').get('live').starts_at,now);
 assert.equal(d.sql.prepare('SELECT starts_at FROM bpj_ad_checkout WHERE id=?').get('other').starts_at,now);
});
await test('unpaid and absent payment status never deliver; delayed payment does',async()=>{
 const d=db();await seed(d,'a');
 for(const payment_status of ['unpaid',undefined])await fulfill(d,session('a',{payment_status}),'evt_a','completed',now);
 assert.equal(d.sql.prepare('SELECT state FROM bpj_ad_checkout').get().state,'pending');
 await fulfill(d,session('a'),'evt_async','checkout.session.async_payment_succeeded',now);assert.equal(d.sql.prepare('SELECT state FROM bpj_ad_checkout').get().state,'paid');
});
await test('amount currency reference session and environment mismatches fail closed',async()=>{
 for(const change of [{amount_subtotal:1},{amount_total:1},{currency:'usd'},{client_reference_id:'b'},{id:'cs_other'},{livemode:true},{mode:'subscription'},{payment_intent:''},{total_details:{amount_discount:1}}]){
  const d=db();await seed(d,'a');const r=await fulfill(d,session('a',change),'evt_a','paid',now);assert.equal(r.ok,false);assert.equal(d.sql.prepare('SELECT state FROM bpj_ad_checkout').get().state,'pending');
 }
});
await test('tax is verified separately from the purchased subtotal',async()=>{
 const d=db();await seed(d,'a');assert.equal((await fulfill(d,session('a',{amount_total:5880,total_details:{amount_tax:980}}),'evt_a','paid',now)).ok,true);
});
await test('database failure returns retry and transaction leaves no delivery',async()=>{
 const d=db();await seed(d,'a');d.fail=true;
 const r=await hook({env:envFor(d),request:eventRequest({id:'evt_a',type:'checkout.session.completed',data:{object:session('a')}})});assert.equal(r.status,503);assert.equal(d.sql.prepare('SELECT state FROM bpj_ad_checkout').get().state,'pending');
});
await test('mid-transaction failure rolls back slot, payment and event together',async()=>{
 const d=db();await seed(d,'a');d.failAt=3;
 await assert.rejects(()=>fulfill(d,session('a'),'evt_a','paid',now));
 const r=d.sql.prepare('SELECT * FROM bpj_ad_checkout').get();assert.equal(r.state,'pending');assert.equal(r.slot,null);assert.equal(r.intent,null);assert.equal(d.sql.prepare('SELECT COUNT(*) n FROM bpj_ad_events').get().n,0);
 d.failAt=null;await fulfill(d,session('a'),'evt_a','paid',now);assert.equal(d.sql.prepare('SELECT state FROM bpj_ad_checkout').get().state,'paid');
});
await test('refund before payment is retained; later event cannot activate',async()=>{
 const d=db();await seed(d,'a');
 for(const ev of [{id:'evt_refund',type:'charge.refunded',data:{object:{payment_intent:'pi_a',amount_refunded:100}}},{id:'evt_paid',type:'checkout.session.completed',data:{object:session('a')}}])assert.equal((await hook({env:envFor(d),request:eventRequest(ev)})).status,200);
 assert.equal(d.sql.prepare('SELECT state FROM bpj_ad_checkout').get().state,'refunded');
});
await test('dispute after delivery suspends and replay never extends',async()=>{
 const d=db();await seed(d,'a');await fulfill(d,session('a'),'evt_paid','paid',now);
 const ev={id:'evt_dispute',type:'charge.dispute.created',data:{object:{payment_intent:'pi_a'}}};
 for(let n=0;n<2;n++)assert.equal((await hook({env:envFor(d),request:eventRequest(ev)})).status,200);
 assert.equal(d.sql.prepare('SELECT state FROM bpj_ad_checkout').get().state,'disputed');
 await fulfill(d,session('a'),'evt_late','paid',now+100);assert.equal(d.sql.prepare('SELECT state FROM bpj_ad_checkout').get().state,'disputed');
});
await test('signatures accept rotated v1 keys and reject stale or tampered payload',async()=>{
 const raw='{}',t=Math.floor(Date.now()/1000),sig=createHmac('sha256','fixture').update(t+'.'+raw).digest('hex');
 assert.equal(await signature('fixture',`t=${t},v1=bad,v1=${sig}`,raw),true);
 assert.equal(await signature('fixture',`t=${t},v1=${sig}`,raw+' '),false);
 assert.equal(await signature('fixture',`t=${t-301},v1=${sig}`,raw),false);
});
await test('checkout price is server-owned and retry reuses session, status requires capability',async()=>{
 const d=db(),env=envFor(d),oldFetch=globalThis.fetch;let creates=0;
 globalThis.fetch=async(url,opts)=>{if(opts.method==='POST'){creates++;const f=new URLSearchParams(opts.body);assert.equal(f.get('line_items[0][price_data][unit_amount]'),'4900');assert.equal(f.get('mode'),'payment');}return Response.json({id:'cs_test_order',livemode:false,url:'https://checkout.stripe.com/c/pay/test'});};
 try{
  const b={name:'Tool',pitch:'A workflow tool',url:'https://tool.example.org',cat:'coding',order_token:'a'.repeat(64),price_cents:1,accept_queue:true};
  for(let n=0;n<2;n++){const r=await draft({env,request:new Request('https://baipiaoji.com/api/ad-draft',{method:'POST',headers:{Origin:'https://baipiaoji.com'},body:JSON.stringify(b)})});assert.equal(r.status,200,await r.text());}
  assert.equal(creates,1);assert.equal(d.sql.prepare('SELECT COUNT(*) n FROM bpj_ad_checkout').get().n,1);
  assert.equal((await status({env,request:new Request('https://baipiaoji.com/api/ad-status',{method:'POST',headers:{Authorization:'Bearer '+'a'.repeat(64)}})})).status,200);
  assert.equal((await status({env,request:new Request('https://baipiaoji.com/api/ad-status',{method:'POST',headers:{Authorization:'Bearer '+'b'.repeat(64)}})})).status,404);
 }finally{globalThis.fetch=oldFetch;}
});
await test('public listing never exposes test payments or secret/payment fields',async()=>{
 const d=db();await seed(d,'test');await fulfill(d,session('test'),'evt_test','paid',Math.floor(Date.now()/1000));
 await seed(d,'live',{live:1});await fulfill(d,session('live',{livemode:true}),'evt_live','paid',Math.floor(Date.now()/1000));
 const r=await ads({env:envFor(d),request:new Request('https://baipiaoji.com/api/ads?cat=coding')});const out=await r.json();assert.equal(out.ads.length,1);assert.equal(out.ads[0].id,'live');for(const key of ['session','intent','token_hash','price_cents'])assert.equal(key in out.ads[0],false);
});
await test('configuration fails closed without both keys or wrong mode',async()=>{
 const env=envFor(db());assert.equal(settings(env).ready,true);for(const change of [{STRIPE_WEBHOOK_SECRET:''},{STRIPE_SECRET_KEY:''},{ADS_STRIPE_MODE:'live'},{ADS_STRIPE_MODE:'invalid'},{ADS_PRICE_CENTS:'0'}])assert.equal(settings({...env,...change}).ready,false);
});
console.log(`${passed} commerce integration tests passed (real SQLite, mocked Stripe transport).`);
