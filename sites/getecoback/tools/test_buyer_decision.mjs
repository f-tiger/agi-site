import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decide} from '../site/assets/moisture-decision.mjs';
import {BUYER_PATHS,validBuyerEvent} from '../src/buyer-events.mjs';
import worker from '../src/worker.js';
test('uncertainty, normal humidity and structural damage never produce a model recommendation',()=>{
 for(const temperature of ['unknown','warm','cold']){
  assert.equal(decide({purpose:'damage',humidity:'high',temperature}),'cause');
  assert.equal(decide({purpose:'room',humidity:'normal',temperature}),'wait');
  assert.equal(decide({purpose:'laundry',humidity:'unknown',temperature}),'measure');
 }
 assert.equal(decide({purpose:'room',humidity:'high',temperature:'unknown'}),'measure');
 assert.equal(decide({purpose:'room',humidity:'high',temperature:'cold'}),'cold');
 assert.equal(decide({purpose:'room',humidity:'high',temperature:'warm'}),'compare');
 assert.equal(decide({purpose:'laundry',humidity:'normal',temperature:'warm'}),'laundry');
 assert.throws(()=>decide({purpose:'<script>',humidity:'high',temperature:'warm'}),RangeError);
});
test('the actual collector validates scope and categorical metadata and suppresses bot/privacy traffic',async()=>{
 let writes=[];const env={EVENTS:{prepare:()=>({bind:(...args)=>({run:async()=>writes.push(args)})})}};
 const body={n:'buyer_result',p:BUYER_PATHS[0],r:'https://example.org/read?private=1',m:{lang:'de',choice:'wait',action:'none'}};
 const send=(b,headers={})=>worker.fetch(new Request('https://getecoback.com/api/ev',{method:'POST',headers:{'user-agent':'Mozilla/5.0',...headers},body:JSON.stringify(b)}),env,{});
 assert.equal((await send(body)).status,200);assert.equal(writes.length,1);assert.equal(writes[0][3],'example.org');
 for(const bad of [{...body,p:'/not-eligible.html'},{...body,m:{...body.m,rh:75}},{...body,m:{...body.m,lang:'en'}},{...body,m:{...body.m,choice:'anything'}}])assert.equal((await send(bad)).status,400);
 for(const headers of [{'dnt':'1'},{'sec-gpc':'1'},{'user-agent':'getecoback-ci'},{'user-agent':'Googlebot'}])await send(body,headers);
 assert.equal(writes.length,1);
 assert.equal(validBuyerEvent({...body,n:'buyer_view',m:{lang:'de',choice:'none',action:'none'}}),true);
});
test('six built guides retain disclosures, evidence and existing language boundaries',()=>{
 for(const path of BUYER_PATHS){
  const html=readFileSync(new URL('../site'+path,import.meta.url),'utf8');
  assert.equal((html.match(/id="eb-moisture-choice"/g)||[]).length,1,path);
  assert.equal((html.match(/src="\/assets\/moisture-decision.mjs\?v=[a-f0-9]{12}"/g)||[]).length,1);
  assert.ok(html.includes('getecoback-21'));
  assert.ok(html.includes('rel="sponsored nofollow noopener"'));
  assert.ok(html.includes('8.5 L')&&html.includes('180 W'));
  if(path.startsWith('/en/'))assert.ok(html.includes('value="other" selected'));
 }
});
