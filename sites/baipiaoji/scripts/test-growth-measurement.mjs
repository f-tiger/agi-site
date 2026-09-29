import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {normalizeGrowthEvent,recordGrowthEvent,readGrowthMeasurement,GROWTH_SQL} from '../lib/growth-measurement.js';
import {arrivalClass,growthMarkup} from '../lib/growth-campaigns.js';
import {onRequestPost,onRequestGet} from '../functions/api/growth.js';
import {officialTarget,campaignInput} from '../assets/studio/growth-campaign.mjs';
const sql=new DatabaseSync(':memory:');
const binding = {
  prepare(query) {
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      async run() { return sql.prepare(query).run(...args); },
      async all() { return {results: sql.prepare(query).all(...args)}; },
    };
  },
};
const at=Date.parse('2026-09-26T12:00:00Z');
const event=(changes={})=>normalizeGrowthEvent({campaign:'bpj-quota-clarity-01',source:'github',sid:'a'.repeat(32),kind:'arrival',path:'/en/tools/google-ai-studio',referrer_host:'github.com',...changes});
const report=()=>readGrowthMeasurement(binding,14,Date.parse('2026-09-28T12:00:00Z'));
assert.equal((await report()).campaigns[0].rows.length,0,'instrument initialized, observed zero');
for(let n=0;n<3;n++)assert.equal(await recordGrowthEvent(binding,event(),at),true);
assert.equal(await recordGrowthEvent(binding,event({kind:'qualified'}),at+9000),false,'server enforces minimum time');
assert.equal(await recordGrowthEvent(binding,event({kind:'qualified'}),at+10000),true);
for(let n=0;n<3;n++)await recordGrowthEvent(binding,event({kind:'official_click'}),at+11000);
assert.deepEqual((await report()).campaigns[0].rows,[{source:'github',arrival:'external_referrer',arrivals:1,qualified:1,action_sessions:1}]);
assert.equal(await recordGrowthEvent(binding,event({source:'x',kind:'official_click'}),at+12000),false,'same nonce cannot move campaigns/sources');
assert.equal(await recordGrowthEvent(binding,event({kind:'official_click',sid:'b'.repeat(32)}),at+12000),false,'action needs arrival');
assert.equal(await recordGrowthEvent(binding,event({kind:'official_click'}),at+1801000),false,'expired action');
assert.equal(await recordGrowthEvent(binding,event(),at+1801000),false,'expired nonce not resurrected');
for(const [sid,host] of [['b',''],['c','baipiaoji.com'],['d','www.getecoback.com'],['e','www.google.de']])await recordGrowthEvent(binding,event({sid:sid.repeat(32),referrer_host:host}),at);
assert.deepEqual((await report()).campaigns[0].rows.map(r=>r.arrival).sort(),['external_referrer','fleet','internal','search','tag_only']);
const raw=JSON.stringify(sql.prepare('SELECT * FROM bpj_growth_sessions').all());
assert.ok(!raw.includes('github.com')&&!raw.includes('a'.repeat(32)),'no raw referrer or client nonce stored');
assert.ok(sql.prepare('EXPLAIN QUERY PLAN '+GROWTH_SQL).all('2026-09-14','2026-09-28').some(r=>r.detail.includes('bpj_growth_day')),'indexed window');
await recordGrowthEvent(binding,event({sid:'f'.repeat(32)}),Date.parse('2026-09-28T00:00:00Z'));
assert.equal((await report()).campaigns[0].rows.reduce((n,r)=>n+r.arrivals,0),5,'current partial day excluded');
await recordGrowthEvent(binding,event({sid:'1'.repeat(32)}),Date.parse('2026-08-01T00:00:00Z'));
await report();assert.equal(sql.prepare("SELECT COUNT(*) n FROM bpj_growth_sessions WHERE d<'2026-08-28'").get().n,0,'expired rows pruned');
assert.equal((await readGrowthMeasurement({prepare(){throw Error('quota')}},14,at)).campaigns,null,'failure is unknown');
for(const bad of [{campaign:'made-up'},{source:'arbitrary-email@example.test'},{path:'/en/tools/fireworks'},{sid:'email@example.test'},{kind:'purchase'},{qa:true},{qa:1}])assert.equal(event(bad),null);
assert.equal(arrivalClass('fakebaipiaoji.com'),'external_referrer');
assert.equal(arrivalClass('www.baipiaoji.com'),'internal');
for(const page of ['/en/tools/fireworks','/en/tools/pixverse','/en/tools/suno','/en/tools/kling'])assert.equal(growthMarkup(page),'','search cohorts unchanged');
assert.ok(growthMarkup('/en/tools/google-ai-studio.html').includes('data-bpj-growth'));
assert.equal(officialTarget('https://aistudio.google.com.evil.example/','https://baipiaoji.com'),false);
assert.equal(officialTarget('https://aistudio.google.com:8443/','https://baipiaoji.com'),false);
assert.equal(officialTarget('https://ai.google.dev/gemini-api/docs/pricing','https://baipiaoji.com'),true);
const page='https://baipiaoji.com/en/tools/google-ai-studio';
const req=(body=event(),extra={})=>new Request('https://baipiaoji.com/api/growth',{method:'POST',headers:{origin:'https://baipiaoji.com',referer:page,'user-agent':'Mozilla/5.0 Chrome/130',...extra},body:JSON.stringify(body)});
let posts=0;const noWrites={prepare(){posts++;throw Error('must not write')}};
for(const headers of [{'user-agent':'Googlebot'},{DNT:'1'},{'Sec-GPC':'1'},{referer:page+'?__ci=1'},{referer:page+'?qa=1'}]){
  const r=await onRequestPost({request:req(event(),headers),env:{HITS:noWrites}});assert.equal((await r.json()).ignored,true);
}
assert.equal(posts,0);
assert.equal((await onRequestPost({request:req(event(),{origin:'https://foreign.example'}),env:{HITS:binding}})).status,403);
assert.equal((await onRequestPost({request:req(event({sid:'bad'})),env:{HITS:binding}})).status,400);
assert.equal((await onRequestGet({request:new Request('https://baipiaoji.com/api/growth?days=999'),env:{HITS:binding}})).status,400);
const fakeWin={location:{href:page+'?utm_campaign=bpj-quota-clarity-01&utm_source=github'},navigator:{}};
const script={dataset:{bpjGrowth:'bpj-quota-clarity-01',growthSources:'github,x'}};
assert.equal(campaignInput(fakeWin,{referrer:'https://github.com/x?private=1'},script).referrer_host,'github.com');
fakeWin.navigator.globalPrivacyControl=true;assert.equal(campaignInput(fakeWin,{},script),null);
// Exercise the deployed allowlist through the browser parser, server and report.
const sources=growthMarkup('/en/tools/google-ai-studio').match(/data-growth-sources="([^"]+)"/)[1];
for(const [source,sid] of [['youtube','2'],['tiktok','3']]) {
  const input=campaignInput({location:{href:page+'?utm_campaign=bpj-quota-clarity-01&utm_source='+source},navigator:{}},{referrer:'https://www.'+source+'.com/'},{dataset:{bpjGrowth:'bpj-quota-clarity-01',growthSources:sources}});
  assert.equal(input.source,source);
  const arrival=event({...input,sid:sid.repeat(32)});
  assert.equal(await recordGrowthEvent(binding,arrival,at),true);
  assert.equal(await recordGrowthEvent(binding,{...arrival,kind:'official_click'},at+1000),true);
}
const socialRows=(await report()).campaigns[0].rows.filter(r=>['youtube','tiktok'].includes(r.source));
assert.equal(socialRows.length,2,'channels remain separate');
for(const row of socialRows)assert.deepEqual([row.arrivals,row.qualified,row.action_sessions],[1,1,1]);
console.log('PASS SQLite replay/order/expiry/retention, complete UTC days, indexed reads, unknown vs zero, origin/QA/bot/privacy filters, scoped pages.');
