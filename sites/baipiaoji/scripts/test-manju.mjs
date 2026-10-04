import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {MANJU} from './manju-pages.mjs';
import {onRequestPost as inquiry} from '../functions/api/manju-inquiry.js';
import {onRequestPost as hit} from '../functions/api/hit.js';
import {businessEvent} from '../../../tools/fleet-analytics/business.mjs';
import {parseManjuEvent,readManjuSignals} from '../lib/manju.mjs';
const live=process.argv.includes('--live'),base='https://baipiaoji.com',ids=MANJU.items.map(x=>x.id);
assert.equal(new Set(ids).size,ids.length);
const js=readFileSync(new URL('../assets/manju.js',import.meta.url),'utf8');
for(const x of MANJU.items){assert.match(x.id,/^[a-z0-9-]+$/);assert.ok(js.includes("'"+x.id+"'"));assert.ok(x.source&&x.sourceDate&&x.checkedAt&&x.aiEvidence&&x.angle);assert.ok(['collection','intro','search'].includes(x.linkType));assert.equal(x.watched,false);assert.equal(x.sponsored,false);assert.equal(x.affiliate,false);assert.equal(new URL(x.source).protocol,'https:');}
async function get(path){if(!live)return readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');const u=new URL(path.replace(/index\.html$/,'').replace(/\.html$/,''),base+'/');u.searchParams.set('__probe','1');const r=await fetch(u,{headers:{'user-agent':'bpj-ci-selfcheck'},signal:AbortSignal.timeout(25000)});assert.equal(r.status,200,path);return r.text();}
const home=await get('manju/index.html');assert.ok(home.includes('rel="canonical" href="'+base+'/manju/"'));assert.ok(home.includes('CollectionPage'));assert.ok(!home.includes('<video')&&!home.includes('<iframe'));assert.equal((home.match(/data-item=/g)||[]).length,ids.length);
for(const x of MANJU.items){const h=await get('manju/'+x.id+'.html');assert.ok(h.includes(x.title));assert.ok(h.includes(x.sourceDate));assert.ok(h.includes('CreativeWork'));assert.ok(h.includes(x.destination.replaceAll('&','&amp;')));assert.ok(h.includes('没有独立审计'));}
assert.equal(JSON.parse(await get('manju/catalog.json')).items.length,ids.length);assert.ok((await get('manju/feed.xml')).includes('不是剧集追更'));assert.ok((await get('index.html')).includes('/manju/'));assert.ok(JSON.parse(await get('search-index.json')).some(x=>x.u===base+'/manju/beipai'));assert.ok((await get('llms.txt')).includes('/manju/catalog.json'));assert.ok((await get('sitemap.xml')).includes(base+'/manju/'));
for(const action of ['view','open','save','inquiry_ok']){assert.ok(parseManjuEvent('/manju/'+action+'/catalog',ids));assert.ok(businessEvent('baipiaoji.com','/manju/',{name:'manju_'+action}));}
assert.equal(parseManjuEvent('/manju/open/private@email.test',ids),false);assert.equal(businessEvent('baipiaoji.com','/account',{name:'manju_open'}),null);assert.equal(businessEvent('baipiaoji.com','/manju/',{name:'manju_open',email:'sensitive'}),null);
const good={kind:'cooperate',name:'__ci Manju validation',url:base+'/manju/',email:'test@example.test',note:'Automated validation only; never a customer lead.',consent:true};
if(live){const r=await fetch(base+'/api/manju-inquiry?qa=1',{method:'POST',headers:{origin:base,'content-type':'application/json','user-agent':'bpj-ci-selfcheck'},body:JSON.stringify(good)});assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,code:'validated',persisted:false,schemaReady:true});}
else{
 const sql=new DatabaseSync(':memory:');sql.exec("CREATE TABLE hits(d TEXT,path TEXT,lang TEXT,country TEXT,ref TEXT,ev TEXT); CREATE INDEX hits_events ON hits(d,ev) WHERE ev != '';");
 const env={HITS:{prepare(q){let args=[];const st={bind(...a){args=a;return st;},async run(){const r=sql.prepare(q).run(...args);return {meta:{changes:Number(r.changes)}};},async all(){return {results:sql.prepare(q).all(...args)};}};return st;}}};
 const post=(body=good,headers={},suffix='')=>inquiry({env,request:new Request(base+'/api/manju-inquiry'+suffix,{method:'POST',headers:{origin:base,'content-type':'application/json',...headers},body:JSON.stringify(body)})});
 assert.equal((await post(good,{},'?qa=1')).status,200);assert.equal(sql.prepare('SELECT COUNT(*) n FROM manju_inquiries').get().n,0);
 assert.equal((await post(good)).status,200);assert.equal((await (await post(good)).json()).code,'already');assert.equal(sql.prepare('SELECT COUNT(*) n FROM manju_inquiries').get().n,1);assert.equal(sql.prepare('SELECT email FROM manju_inquiries').get().email,good.email);
 for(const body of [{...good,email:'a b@example.test'},{...good,kind:'purchase'},{...good,url:'javascript:alert(1)'},{...good,url:'https://secret@site.test/'},{...good,note:'x'.repeat(1501)},{...good,consent:false},{...good,email:''}])assert.equal((await post(body)).status,400);
 assert.equal((await post(good,{origin:'https://evil.test'})).status,403);assert.equal((await post({...good,website:'spam'})).status,200);assert.equal(sql.prepare('SELECT COUNT(*) n FROM manju_inquiries').get().n,1);
 const req=(p,h={})=>new Request(base+'/api/hit',{method:'POST',headers:{'content-type':'application/json','user-agent':'Mozilla/5.0',referer:base+'/manju/',...h},body:JSON.stringify({e:'manju',p,l:'zh',r:'https://private.example'})});
 await hit({env,request:req('/manju/open/beipai')});assert.equal(sql.prepare('SELECT ref FROM hits').get().ref,'');
 for(const [p,h] of [['/manju/open/private@example.test',{}],['/manju/open/beipai',{DNT:'1'}],['/manju/open/beipai',{'sec-gpc':'1'}],['/manju/open/beipai',{'user-agent':'bpj-ci-selfcheck'}],['/manju/open/beipai',{referer:base+'/manju/?qa=1'}]])await hit({env,request:req(p,h)});
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM hits').get().n,1);const report=await readManjuSignals(env.HITS,'2026-01-01');assert.equal(report.actions.open,1);assert.equal(report.inquiries.cooperate,1);assert.ok(!JSON.stringify(report).includes('example.test'));assert.ok(sql.prepare("EXPLAIN QUERY PLAN SELECT path, COUNT(*) FROM hits INDEXED BY hits_events WHERE d >= ? AND ev != '' AND ev = 'manju' GROUP BY path").all('2026-01-01').some(x=>x.detail.includes('hits_events')));
 const failure=await inquiry({request:new Request(base+'/api/manju-inquiry',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify(good)}),env:{HITS:{prepare(){throw Error('quota');}}}});assert.equal(failure.status,503);
}
console.log('PASS manju '+(live?'live':'local')+': source distinctions, real routes, discovery, analytics privacy, inquiry validation'+(live?' and D1 schema (no synthetic lead).':', SQL persistence/dedup/failure and indexed aggregate report.'));
