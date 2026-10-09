import {COMMERCIAL_CLAIM,COMMERCIAL_VERSION,evidenceFor,commercialText,qualifies} from '../foresight-assets/commercial.mjs';
export const HANDOFF_KEY='agi-jarvis-plan-handoff-v1';
export const HANDOFF_FROM='future-guide-plan';
export const HANDOFF_TTL=30*60*1000;
export const HANDOFF_BYTES=16*1024;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,names)=>object(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const text=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
export function selectedPlanOf(v){
 if(!keys(v,['task','action','counter','review','done'])||['task','action','counter'].some(k=>!text(v[k],1500))||typeof v.review!=='string'||typeof v.done!=='boolean')throw Error('invalid_context');
 if(v.review&&(!/^\d{4}-\d{2}-\d{2}$/.test(v.review)||!Number.isFinite(Date.parse(v.review))||new Date(v.review).toISOString().slice(0,10)!==v.review))throw Error('invalid_context');
 return Object.fromEntries(['task','action','counter','review','done'].map(k=>[k,v[k]]));
}
export function normalizeContext(value){
 if(value===undefined)return undefined;
 const fields=['kind','claimId','evidenceVersion','fit'];
 if(!keys(value,fields)||value.kind!=='future-guide-plan-v1'||value.claimId!==COMMERCIAL_CLAIM||value.evidenceVersion!==COMMERCIAL_VERSION||!keys(value.fit,['recurring','records','owner'])||Object.values(value.fit).some(x=>![true,false,null].includes(x)))throw Error('invalid_context');
 return {kind:value.kind,claimId:value.claimId,evidenceVersion:value.evidenceVersion,fit:{recurring:value.fit.recurring,records:value.fit.records,owner:value.fit.owner}};
}
export function planGoal(plan,lang){
 const p=selectedPlanOf(plan),zh=lang==='zh';
 const goal=[zh?'为下列计划准备可审阅的检查草稿；不代表已诊断、修复或执行。':'Prepare a reviewable check draft for this plan; this is not diagnosis, repair or execution.',(zh?'任务：':'Task: ')+p.task,(zh?'行动：':'Action: ')+p.action,(zh?'停止或调整条件：':'Stop or change course if: ')+p.counter,(zh?'复查日期：':'Review date: ')+(p.review||'—'),(zh?'已尝试（自报）：':'Tried (self-reported): ')+(p.done?(zh?'是':'yes'):(zh?'否':'no'))].join('\n\n');
 if(goal.length>1200)throw Error('plan_too_long');
 return goal;
}
export function makeEnvelope(note,lang,now=Date.now()){
 if(!['en','zh'].includes(lang)||!Number.isSafeInteger(now))throw Error('invalid_handoff');
 const plan=selectedPlanOf(Object.fromEntries(['task','action','counter','review','done'].map(k=>[k,note?.[k]])));
 const context=normalizeContext({kind:'future-guide-plan-v1',claimId:COMMERCIAL_CLAIM,evidenceVersion:note?.commercial?.version,fit:note?.commercial?.fit});
 planGoal(plan,lang);const envelope={schema:HANDOFF_KEY,createdAt:now,lang,plan,context};
 if(new TextEncoder().encode(JSON.stringify(envelope)).length>HANDOFF_BYTES)throw Error('handoff_too_large');
 return envelope;
}
export function readEnvelope(raw,now=Date.now()){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>HANDOFF_BYTES)throw Error('invalid_handoff');
 let v;try{v=JSON.parse(raw);}catch{throw Error('invalid_handoff');}
 if(!keys(v,['schema','createdAt','lang','plan','context'])||v.schema!==HANDOFF_KEY||!Number.isSafeInteger(v.createdAt)||v.createdAt>now||now-v.createdAt>=HANDOFF_TTL||!['en','zh'].includes(v.lang))throw Error('invalid_handoff');
 const context=normalizeContext(v.context),plan=selectedPlanOf(v.plan);planGoal(plan,v.lang);
 return {schema:HANDOFF_KEY,createdAt:v.createdAt,lang:v.lang,plan,context};
}
// Consume before parsing. A failed, expired or repeated handoff is never replayed.
export function consumeEnvelope(storage,now=Date.now()){
 const raw=storage.getItem(HANDOFF_KEY);storage.removeItem(HANDOFF_KEY);if(raw===null)return null;return readEnvelope(raw,now);
}
export function contextReceipt(value,lang){
 const c=normalizeContext(value);if(!c)return '';
 return commercialText({version:c.evidenceVersion,fit:c.fit},lang);
}
export function contextQualifies(value){return qualifies(normalizeContext(value)?.fit);}
export function contextEvidence(value){const c=normalizeContext(value);return c?evidenceFor({version:c.evidenceVersion}):null;}
