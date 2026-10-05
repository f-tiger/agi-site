import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {validQuery,allowedByRobots,sourceCandidates,factFromPage,discover,fetchSource,SOURCE} from '../lib/manju-discovery-source.mjs';
import {onRequestPost,onRequestGet} from '../functions/api/manju-discover.js';
import {searchResults} from '../lib/search-results.mjs';
const html=title=>`<title>AI漫剧《${title}》-短剧百科</title>分类标签：<div class="badge tag">都市</div><div class="badge tag">重生</div>上映时间<p>2026年10月1日</p>`;
const search='<title>重生相关短剧推荐-短剧百科</title><a href="/manju/info-1234.html" title="漫剧《重生样本》">资料</a>';
test('source parsing is bounded and labels third-party metadata without copying plot',async()=>{const list=sourceCandidates(search);assert.equal(list[0].source,SOURCE+'/manju/info-1234.html');const fact=await factFromPage(html('重生样本'),list[0].source,'2026-10-05');assert.deepEqual(fact.reportedTags,['都市','重生']);assert.equal(fact.sourceHash.length,64);assert.equal(await factFromPage(html('桃花簪'),list[0].source,'2026-10-05',['桃花簪']),null);assert.equal(await factFromPage(html('样本').replace('AI漫剧','短剧'),list[0].source,'2026-10-05'),null);assert.throws(()=>sourceCandidates('<title>Please wait</title>'));});
test('robots, input privacy and source restrictions',()=>{assert.ok(allowedByRobots('User-agent: *\nAllow: /','/so.html'));assert.equal(allowedByRobots('User-agent: *\nDisallow: /so','/so.html?q=1'),false);assert.equal(allowedByRobots('challenge','/so.html'),false);for(const q of ['http://127.0.0.1','a@b.com','13800138000','a','x'.repeat(61)])assert.equal(validQuery(q),false);assert.ok(validQuery('推荐重生逆袭漫剧'));});
test('discovery actually requests search and detail with no arbitrary hosts',async()=>{const calls=[],get=async url=>{calls.push(url);return new Response(url.endsWith('/robots.txt')?'User-agent: *\nAllow: /':url.includes('/so.html')?search:html('重生样本'));};const facts=await discover('重生',{get,now:new Date('2026-10-05')});assert.equal(facts.length,1);assert.equal(calls.length,3);assert.ok(calls.every(u=>new URL(u).origin===SOURCE));});
function db(){
 const sql=new DatabaseSync(':memory:');
 return {sql,prepare(q){
  let args=[];
  return {
   bind(...a){args=a;return this;},
   async run(){const r=sql.prepare(q).run(...args);return {meta:{changes:Number(r.changes)}};},
   async first(){return sql.prepare(q).get(...args)||null;},
   async all(){return {results:sql.prepare(q).all(...args)};}
  };
 }};
}

const req=(q,suffix='',origin='https://baipiaoji.com')=>new Request('https://baipiaoji.com/api/manju-discover'+suffix,{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.1'},body:JSON.stringify({q})});
test('endpoint cache, zero raw query retention, rate cap, QA and origin gates',async()=>{const HITS=db(),env={HITS},old=globalThis.fetch;let requests=0;globalThis.fetch=async url=>{requests++;return new Response(url.endsWith('/robots.txt')?'User-agent: *\nAllow: /':url.includes('/so.html')?search:html('重生样本'));};try{assert.equal((await onRequestPost({env,request:req('重生','', 'https://evil.test')})).status,403);const qa=await onRequestPost({env,request:req('重生','?qa=1')});assert.equal((await qa.json()).persisted,false);assert.equal(requests,0);const first=await onRequestPost({env,request:req('重生')});assert.equal((await first.json()).status,'found');const second=await onRequestPost({env,request:req('重生')});assert.equal((await second.json()).cached,true);assert.equal(requests,3);const row=HITS.sql.prepare('SELECT * FROM manju_discovery_cache').get();assert.equal(row.cache_key.length,64);assert.ok(!Object.keys(row).includes('query'));assert.equal((await (await onRequestGet({env})).json()).records.length,1);for(let i=0;i<4;i++)await onRequestPost({env,request:req('其他剧'+i)});assert.equal((await onRequestPost({env,request:req('超过次数')})).status,429);}finally{globalThis.fetch=old;}});
test('new official anchors and natural language recommendations survive global search',()=>{const rows=[{u:'https://baipiaoji.com/manju/#work-hg-1234',n:'重生样本',genre:'都市',tags:['重生','逆袭'],q:'AI漫剧 重生 逆袭',k:'AI漫剧'}];assert.equal(searchResults(rows,'重生样本')[0].u,rows[0].u);assert.equal(searchResults(rows,'推荐重生逆袭漫剧')[0].u,rows[0].u);assert.equal(searchResults(rows,'AI视频')[0].u,rows[0].u);});

test('edge fetch rejects redirects without following them',async()=>{let called=0;await assert.rejects(fetchSource(SOURCE+'/robots.txt',async(url,options)=>{called++;assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{location:'https://other.example/'}});}),/source-http-302/);assert.equal(called,1);});
