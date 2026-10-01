import test from 'node:test';import assert from 'node:assert/strict';
import {ORIGIN,canonical,sitemapUrls,selectUrls,checkPage,submit} from './indexnow.mjs';
const urls=['/', '/cn','/progress-index'].map(p=>ORIGIN+p);
test('only source HTML changes, new sitemap URLs and evidence dependencies are candidates',()=>{
 const html=()=>`<link href='${urls[1]}' rel='canonical'>`;assert.equal(canonical(html()),urls[1]);
 assert.deepEqual(selectUrls({current:urls,previous:urls,changed:['sites/agiscorecard/home-focus/focus.css','sites/agiscorecard/tools/analytics-worker/index.js'],html}),{updated:[],removed:[]});
 assert.deepEqual(selectUrls({current:urls,previous:[urls[0],urls[1]],changed:['sites/agiscorecard/cn.html'],html}).updated,[urls[1],urls[2]]);
 assert.deepEqual(selectUrls({current:urls,previous:urls,changed:['sites/agiscorecard/data.json'],html}).updated,[...urls].sort());
});
test('reject sitemap pollution, redirects, wrong canonicals and noindex',()=>{
 assert.deepEqual(sitemapUrls(`<urlset><url><loc>${urls[0]}</loc></url></urlset>`),[urls[0]]);
 for(const u of ['https://other.test/','https://agiscorecard.com/?ref=x'])assert.throws(()=>sitemapUrls(`<urlset><loc>${u}</loc></urlset>`));
 const r={status:200,url:urls[0],headers:new Headers()},html=`<link rel="canonical" href="${urls[0]}">`;checkPage(urls[0],r,html);
 for(const mutation of [{...r,status:302},{...r,url:urls[1]},{...r,headers:new Headers({'x-robots-tag':'noindex'})}])assert.throws(()=>checkPage(urls[0],mutation,html));
 assert.throws(()=>checkPage(urls[0],r,html+`<meta content='noindex, follow' name='robots'>`));
});
test('verify key, distinguish 200/202, fail on rejection and skip unchanged submissions',async()=>{
 let calls=0;assert.equal((await submit({urls:[],fetcher:()=>{throw Error('must not fetch');}})).submitted,0);
 for(const status of [200,202,403,429]){
  const fetcher=async(url,options)=>{calls++;if(!options.method)return new Response('test-key');assert.equal(JSON.parse(options.body).urlList.length,1);return new Response(null,{status});};
  if(status<300){const r=await submit({urls:[urls[0]],key:'test-key',fetcher});assert.equal(r.indexing,'unknown');assert.equal(r.outcome,status===200?'received':'received_key_validation_pending');}
  else await assert.rejects(submit({urls:[urls[0]],key:'test-key',fetcher}),/cursor unchanged/);
 }
 assert.equal(calls,8);await assert.rejects(submit({urls:[urls[0]],key:'test-key',fetcher:async()=>new Response('wrong')}),/key could not/);
});

import {markdownCanonical} from './analytics-worker/index.js';
test('Markdown canonical maps to HTML and preserves installable skill semantics',()=>{
 assert.equal(markdownCanonical('/index.md'),'/');assert.equal(markdownCanonical('/cn.md'),'/cn');assert.equal(markdownCanonical('/zh/progress-index.md'),'/zh/progress-index');assert.equal(markdownCanonical('/skill.md'),null);
});

import worker from './analytics-worker/index.js';
test('actual mirror response carries canonical and noindex headers',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('# Evidence',{headers:{'content-type':'text/markdown'}})}};
 for(const [path,expected] of [['/index.md','/'],['/cn.md','/cn'],['/skill.md',null]]){
  const r=await worker.fetch(new Request('https://agiscorecard.com'+path+'?ci=1'),env,{waitUntil(){}});
  assert.equal(r.headers.get('x-robots-tag'),'noindex');assert.equal(r.headers.get('link'),expected?'<https://agiscorecard.com'+expected+'>; rel="canonical"':null);assert.equal(await r.text(),'# Evidence');
 }
});
