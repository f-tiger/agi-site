export const VERSION=1;
const fail=()=>{throw Error('invalid_input');};
const text=(v,n=2000)=>typeof v==='string'&&v.trim()&&v.length<=n?v.trim():fail();
export function reviewTask(input={}){
 const goal=text(input.goal),acceptance=text(input.acceptance);const blockers=input.blockers??[];
 if(!Array.isArray(blockers)||blockers.length>20)fail();blockers.forEach(x=>text(x));
 for(const k of ['cancelled','permissionRequired','artifactCreated','acceptancePassed'])if(input[k]!==undefined&&typeof input[k]!=='boolean')fail();
 const failures=input.repeatFailures??0;if(!Number.isInteger(failures)||failures<0||failures>10000)fail();
 let action='execute_next_step';
 if(input.cancelled)action='stop';
 else if(input.acceptancePassed&&typeof input.acceptanceEvidence==='string'&&input.acceptanceEvidence.trim()&&!blockers.length)action='complete';
 else if(input.permissionRequired)action='request_authorization';
 else if(blockers.length)action='resolve_blocker';
 else if(failures>=2)action='diagnose_before_retry';
 else if(input.artifactCreated||input.acceptancePassed)action='verify_acceptance';
 return {goal,acceptance,action,blockers,method:'explicit-state rules',successProbability:null,limitation:'No model execution or independent verification of supplied evidence.'};
}
export function appendEvent(events,kind,data,at=new Date().toISOString()){
 if(!Array.isArray(events)||events.length>=200)fail();
 const last=events.at(-1);if(!Number.isFinite(Date.parse(at))||last&&Date.parse(at)<Date.parse(last.at))fail();
 const current=[...events].reverse().find(x=>x.kind==='state');let payload;
 if(kind==='state'){
  reviewTask(data);payload=JSON.parse(JSON.stringify(data));
  if(current&&(current.data.goal!==data.goal||current.data.acceptance!==data.acceptance)){
   text(data.changeReason);if(data.acceptancePassed)fail();
  }
 }else if(kind==='prediction'){
  if(!current)fail();for(const k of ['action','expected','checkWhen','ifWrong'])text(data[k]);
  const p=data.probability??null;if(p!==null&&(!Number.isFinite(p)||p<0||p>1))fail();
  payload={action:data.action,expected:data.expected,checkWhen:data.checkWhen,ifWrong:data.ifWrong,probability:p,stateId:current.id,snapshot:current.data};
 }else if(kind==='outcome'){
  const prediction=events.find(e=>e.id===data.predictionId&&e.kind==='prediction');
  if(!prediction||events.some(e=>e.kind==='outcome'&&e.data.predictionId===data.predictionId))fail();
  if(!['pass','fail','inconclusive','aborted'].includes(data.status))fail();text(data.evidence);
  payload={predictionId:data.predictionId,status:data.status,evidence:data.evidence,stateChanged:current.id!==prediction.data.stateId};
 }else fail();
 return [...events,{id:events.length+1,at,kind,data:JSON.parse(JSON.stringify(payload))}];
}
export function restoreLedger(raw){
 if(!raw||raw.version!==VERSION||!Array.isArray(raw.events)||raw.events.length>200)fail();
 let rebuilt=[];for(const e of raw.events){if(e.id!==rebuilt.length+1)fail();rebuilt=appendEvent(rebuilt,e.kind,e.data,e.at);}
 return rebuilt;
}
export function summarize(events){
 const predictions=events.filter(e=>e.kind==='prediction'),outcomes=events.filter(e=>e.kind==='outcome');
 const errors=outcomes.flatMap(o=>{const p=predictions.find(e=>e.id===o.data.predictionId)?.data.probability;return p!==null&&p!==undefined&&['pass','fail'].includes(o.data.status)?[(p-(o.data.status==='pass'?1:0))**2]:[];});
 return {predictions:predictions.length,pending:predictions.length-outcomes.length,observed:outcomes.length,passes:outcomes.filter(x=>x.data.status==='pass').length,failures:outcomes.filter(x=>x.data.status==='fail').length,brierSamples:errors.length,brierMean:errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:null};
}
export function compareRuns(runs){
 if(!Array.isArray(runs)||!runs.length||runs.length>100)fail();
 const groups=Object.create(null);for(const r of runs){text(r.group,60);text(r.taskId,100);if(typeof r.passed!=='boolean'||!Number.isFinite(r.cost)||r.cost<0||!Number.isInteger(r.interventions)||r.interventions<0)fail();const g=groups[r.group]??={runs:0,passed:0,cost:0,interventions:0};g.runs++;g.passed+=Number(r.passed);g.cost+=r.cost;g.interventions+=r.interventions;}
 return {groups,method:'descriptive supplied-data summary',causalConclusion:null,note:'Use the same currency, model, budget and matched tasks. This summary does not establish causality or statistical significance.'};
}
