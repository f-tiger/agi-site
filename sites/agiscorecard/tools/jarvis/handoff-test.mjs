import test from 'node:test';import assert from 'node:assert/strict';
import {HANDOFF_KEY,HANDOFF_TTL,HANDOFF_BYTES,makeEnvelope,readEnvelope,consumeEnvelope,normalizeContext,planGoal,contextReceipt,contextQualifies} from '../../jarvis-assets/handoff.mjs';
import {boundedPlan,COMMERCIAL_CLAIM,COMMERCIAL_VERSION} from '../../foresight-assets/commercial.mjs';
import {inputOf,markdown,markdownText} from '../../jarvis-assets/core.mjs';
const fit={recurring:true,records:true,owner:true},context={kind:'future-guide-plan-v1',claimId:COMMERCIAL_CLAIM,evidenceVersion:COMMERCIAL_VERSION,fit},note=lang=>({...boundedPlan(lang),review:'2026-10-12',commercial:{version:COMMERCIAL_VERSION,fit}});
const body=()=>({goal:planGoal(makeEnvelope(note('en'),'en').plan,'en'),lang:'en',cadence:'once',web:false,consent:true,memory:[],nonce:'0'.repeat(32),context});
test('strict context accepts only a known type, claim and evidence version and three self-reported answers',()=>{
 assert.deepEqual(normalizeContext(context),context);assert.equal(normalizeContext(undefined),undefined);
 for(const bad of [null,[],{...context,kind:'other'},{...context,claimId:'agent-coordination'},{...context,evidenceVersion:'unknown'},{...context,url:'https://bad.example'},{...context,verified:true},{...context,selectedPlan:note('en')},{...context,fit:{...fit,owner:'yes'}},{...context,fit:{...fit,extra:false}},{...context,fit:{recurring:true,records:true}}]){assert.throws(()=>normalizeContext(bad));assert.throws(()=>inputOf({...body(),context:bad}),/invalid_request/);}
 assert.deepEqual(inputOf(body()).context,context);assert.equal(inputOf({...body(),context:undefined}).context,undefined);
});
test('single selected plan travels with no notebook, memory, account or source body',()=>{
 const v=makeEnvelope({...note('zh'),secret:'DO NOT COPY',memory:['PRIVATE'],notes:{secret:'PRIVATE'}},'zh',1000);
 assert.deepEqual(Object.keys(v).sort(),['context','createdAt','lang','plan','schema']);assert.deepEqual(Object.keys(v.context).sort(),['claimId','evidenceVersion','fit','kind']);assert.ok(!JSON.stringify(v).includes('PRIVATE'));assert.ok(!JSON.stringify(v).includes('https://'));
 assert.deepEqual(readEnvelope(JSON.stringify(v),1001),v);assert.ok(new TextEncoder().encode(JSON.stringify(v)).length<HANDOFF_BYTES);
});
test('expired, future, unknown, oversized and repeated handoffs fail closed',()=>{
 const v=makeEnvelope(note('en'),'en',1000),raw=JSON.stringify(v);
 for(const [value,now]of [[raw,1000+HANDOFF_TTL],[raw,999],[JSON.stringify({...v,extra:true}),1000],[JSON.stringify({...v,lang:'xx'}),1000],[' '.repeat(HANDOFF_BYTES+1),1000],['bad json',1000],[JSON.stringify({...v,context:{...context,evidenceVersion:'future'}}),1000]])assert.throws(()=>readEnvelope(value,now));
 const store=new Map([[HANDOFF_KEY,raw]]),storage={getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};assert.deepEqual(consumeEnvelope(storage,1000),v);assert.equal(consumeEnvelope(storage,1000),null);store.set(HANDOFF_KEY,'invalid');assert.throws(()=>consumeEnvelope(storage,1000));assert.equal(store.has(HANDOFF_KEY),false);
});
test('complete goals preserve the stop condition, original plan and exact limits without clipping',()=>{
 for(const lang of ['en','zh']){const n=note(lang),before=structuredClone(n),goal=planGoal(makeEnvelope(n,lang).plan,lang);for(const k of ['task','action','counter','review'])assert.ok(goal.includes(n[k]));assert.deepEqual(n,before);assert.ok(goal.length<=1200);assert.equal(inputOf({...body(),goal:'x'.repeat(1200)}).goal.length,1200);assert.throws(()=>inputOf({...body(),goal:'x'.repeat(1201)}));assert.throws(()=>makeEnvelope({...n,action:'x'.repeat(1200)},lang),/plan_too_long/);}
});
test('unknown/no fits remain self-reports and never restore a maintenance recommendation',()=>{
 for(const value of [false,null]){const c={...context,fit:{...fit,owner:value}};assert.equal(contextQualifies(c),false);const text=contextReceipt(c,'en');assert.match(text,/No maintenance recommendation/);assert.ok(!text.includes('/earn/cases/workflow-maintenance'));}
});
test('exports preserve final visible goal and full receipt, without hidden original text',()=>{
 const b=inputOf({...body(),goal:'My revised visible goal with no original private text.'}),text=markdown({input:b,status:'limited',runs:1,result:{sources:[],reason:'ai_unavailable'}});
 for(const value of ['5.5%','8%','17:27','29:09','openrouter.ai/pricing','20261009'])assert.ok(text.includes(markdownText(value)),value);
 assert.ok(text.includes('My revised visible goal'));assert.ok(!text.includes(note('en').action));assert.ok(!JSON.stringify(b).includes('selectedPlan'));assert.match(text,/not prove|not verified|unverified|unknown/);
});
