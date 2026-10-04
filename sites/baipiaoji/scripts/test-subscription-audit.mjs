import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import vm from 'node:vm';
import {auditQuota,assessAudit,auditAdvice} from './subscription-audit.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const json=name=>JSON.parse(readFileSync(join(root,'data',name),'utf8'));
const coding=json('coding-quotas.json').entries,chat=json('chat-quotas.json').entries;
const quota=slug=>auditQuota(coding.find(x=>x.slug===slug),'coding');
assert.equal(auditQuota(chat.find(x=>x.slug==='ms-copilot'),'chat').kind,'unknown','Image boosts must not become a chat message allowance');
for(const slug of ['qoder','codebuddy']) {
  assert.equal(assessAudit(quota(slug),{}).status,'trial');
  assert.match(auditAdvice('trial',false).limitation,/does not mean the free tier is absent or has zero/);
}
for(const slug of ['codex','cursor']) assert.equal(assessAudit(quota(slug),{chatRequests:0}).status,'unknown');
for(const raw of ['', ' ', null,undefined,-1,NaN,Infinity,'invalid']) assert.equal(assessAudit(quota('github-copilot'),{completions:raw,chatRequests:0}).status,'missing');
assert.equal(assessAudit(quota('github-copilot'),{completions:0,chatRequests:0}).status,'within','Explicit zero remains valid');
assert.equal(assessAudit(quota('github-copilot'),{completions:60,chatRequests:1}).status,'within');
assert.equal(assessAudit(quota('github-copilot'),{completions:60,chatRequests:2}).status,'over','Monthly chat allowance cannot be omitted');
const range=assessAudit(quota('github-models'),{requests:51});
assert.equal(range.status,'tiered','An unselected model cannot be judged against the smallest tier');
assert.equal(assessAudit(quota('github-models'),{requests:100}).status,'tiered');
assert.equal(assessAudit(quota('github-copilot'),{completions:1,requests:1}).status,'missing','Model requests cannot substitute for billed chat/premium requests');
assert.equal(assessAudit(quota('kiro'),{chatRequests:1}).status,'other-unit','Do not convert credits to questions');
assert.equal(assessAudit(quota('cline'),{}).status,'provider');
assert.equal(assessAudit(auditQuota(chat.find(x=>x.slug==='chatgpt'),'chat'),{}).status,'text');
for(const status of ['within','over','missing','unknown','trial','provider','text','other-unit','tiered']) for(const zh of [true,false]) {
  const advice=auditAdvice(status,zh);assert.ok(advice.title&&advice.limitation&&advice.next);
}
assert.match(auditAdvice('within',false).limitation,/does not establish/);
assert.match(auditAdvice('over',false).limitation,/does not establish/);

const live=process.argv.includes('--live');
if(live||process.argv.includes('--dist'))for(const prefix of ['', 'en/']) {
  let html;
  if(live){
    const url='https://baipiaoji.com/'+prefix+'subscription-audit?__ci=1';
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,url+' must be published');
    html=await response.text();
  }else html=readFileSync(join(root,'dist',prefix,'subscription-audit.html'),'utf8');
  assert.match(html,/data-account-gate/,'Existing account boundary stays in place');
  assert.match(html,/id="auCopy"/);assert.match(html,/id="auComp"[^>]*placeholder=/);
  assert.doesNotMatch(html,/id="auComp"[^>]*value=/,'No example volume passed off as actual input');
  assert.doesNotMatch(html,/免费档就够，可以先停|this one earns its fee|a month you could stop paying|worth the fee|which paid AI tools you can cancel/);
  assert.ok(html.includes(assessAudit.toString()),'Generated page runs the tested comparison function');
  for(const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(!script[0].includes('application/ld+json'))new vm.Script(script[1]);
  const faq=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(x=>{const j=JSON.parse(x[1]);return Array.isArray(j)?j:[j]}).find(x=>x['@type']==='FAQPage');
  assert.ok(faq);assert.equal(faq.mainEntity.length,3);
  assert.ok(html.includes(prefix?'Does this tell me which subscription to cancel?':'结果能告诉我该退订哪个吗？'));
  assert.match(html,/subscription_review/);assert.match(html,/subscription_copy/);
}
console.log('subscription-audit: real-data unit boundaries, unknowns and advice checks passed'+(live?' with bilingual live output checks':process.argv.includes('--dist')?' with bilingual output checks':''));
