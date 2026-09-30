// Numeric-only contract. Neither code, prompts, paths nor log messages are accepted.
export const VERSION='1.0.0';
export const MAX_SUMMARY_BYTES=16384;
const fields=['id','tokens','elapsed_ms','interventions','failures','accepted'];
export function validateSummary(input){
 if(!input||Object.keys(input).sort().join(',')!=='project,runs,version'||input.version!==1||!/^[a-f0-9]{32}$/.test(input.project||'')||!Array.isArray(input.runs)||input.runs.length<1||input.runs.length>30)throw Error('bad_summary');
 const seen=new Set();
 const runs=input.runs.map(r=>{
  if(!r||Object.keys(r).sort().join(',')!==[...fields].sort().join(',')||!/^[a-f0-9]{32}$/.test(r.id||'')||seen.has(r.id)||typeof r.accepted!=='boolean')throw Error('bad_summary');
  seen.add(r.id);
  for(const key of ['tokens','elapsed_ms','interventions','failures'])if(r[key]!==null&&(!Number.isSafeInteger(r[key])||r[key]<0||r[key]>1e12))throw Error('bad_summary');
  return Object.fromEntries(fields.map(k=>[k,r[k]]));
 });
 const out={version:1,project:input.project,runs};
 if(new TextEncoder().encode(JSON.stringify(out)).length>MAX_SUMMARY_BYTES)throw Error('too_large');
 return out;
}
const median=values=>{if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
export function compilePolicy(summary,previous=null){
 const runs=summary.runs,failed=runs.filter(r=>!r.accepted).length,retry=runs.filter(r=>r.failures!==null&&r.failures>=2).length;
 const rules=[{id:'acceptance',text:'Before editing, state the required outcome and the smallest checks that can verify it. Keep security and release gates.',evidence:{runs:runs.length,not_accepted:failed}}];
 if(retry)rules.push({id:'diagnose',text:'After two failures of the same approach, inspect the failure evidence and change one assumption before retrying. Do not omit required tests.',evidence:{runs_with_two_failures:retry}});
 if(runs.some(r=>r.interventions>=2))rules.push({id:'scope',text:'At a scope change, restate the requested deliverable and complete its necessary dependencies before optional expansion.',evidence:{runs_with_two_interventions:runs.filter(r=>r.interventions>=2).length}});
 const accepted=runs.filter(r=>r.accepted),metrics={runs:runs.length,accepted:accepted.length,median_tokens:median(accepted.map(r=>r.tokens).filter(v=>v!==null)),median_elapsed_ms:median(accepted.map(r=>r.elapsed_ms).filter(v=>v!==null)),median_interventions:median(accepted.map(r=>r.interventions).filter(v=>v!==null))};
 return {version:1,policy_version:VERSION,project:summary.project,rules,metrics,previous:previous?{metrics:previous.metrics,policy_version:previous.policy_version}:null,conclusion:runs.length<2?'insufficient_evidence':retry||failed?'review_repeated_failures':'no_additional_rule_indicated',comparison:'Descriptive only: these runs are not controlled matched tasks. No savings or causal improvement is established.',review_required:true};
}
