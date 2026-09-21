import {VERSION,LIMIT,parse,inspectChallenge,checkDelivery,compareChallenges,checkBatch,appendRule,sampleChallenge,sampleResponse,sampleContract,sampleBatch} from './engine.mjs';
const $=id=>document.getElementById(id), pretty=v=>JSON.stringify(v,null,2);
let mode='challenge', report=null, ownCompleted=false;
const buffers=new Map();
const modes={
  challenge:{a:'PaymentRequired JSON or header',help:'Paste the x402 v2 PaymentRequired JSON or a base64 PAYMENT-REQUIRED header.',run:'Check payment terms'},
  delivery:{a:'API response JSON',b:'Acceptance contract',help:'Check a JSON response against paths, types, exact values and numeric bounds. Add rules with the guided editor below.',run:'Check response'},
  compare:{a:'Previous PaymentRequired JSON or header',b:'Current PaymentRequired JSON or header',help:'Compare captured payment challenges. Changed payment options are shown in full; option order is ignored.',run:'Compare payment terms'},
  batch:{a:'Attempt records (JSON array)',b:'Acceptance contract',help:'Check up to 100 attempts. Include paid failures and retries to see the cost of each output that meets your rules.',run:'Check batch & cost'}
};
const usesContract=()=>['delivery','batch'].includes(mode);
function download(name,content,type='application/json') {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resetResult(message='Run a check to create a report.') {
  $('download').disabled=true;report=null;$('status').textContent='READY';$('status').className='stamp';
  $('result-title').textContent='Your report will appear here.';$('result-summary').textContent=message;$('result-details').replaceChildren();
}
function sample() {
  $('source').value='sample';
  $('input-a').value=pretty(mode==='batch'?sampleBatch:mode==='delivery'?sampleResponse:sampleChallenge);
  const after=structuredClone(sampleChallenge);after.accepts[0].amount='15000';
  $('input-b').value=pretty(usesContract()?sampleContract:after);
  $('run-note').textContent='Fictional example loaded.';$('rule-status').textContent='';
  resetResult('Example ready. Providers, responses and costs in the examples are fictional.');
}
function setMode(next) {
  if(!Object.hasOwn(modes,next)||next===mode)return;
  buffers.set(mode,{a:$('input-a').value,b:$('input-b').value,source:$('source').value});
  mode=next;
  for(const button of document.querySelectorAll('[role=tab]')) {
    button.setAttribute('aria-selected',String(button.dataset.mode===mode));button.tabIndex=button.dataset.mode===mode?0:-1;
  }
  $('workspace').setAttribute('aria-labelledby','tab-'+mode);$('label-a').textContent=modes[mode].a;$('label-b').textContent=modes[mode].b||'';
  $('second-editor').hidden=mode==='challenge';document.querySelector('.editors').classList.toggle('two',mode!=='challenge');
  $('mode-help').textContent=modes[mode].help;$('run').textContent=modes[mode].run+' →';
  $('rule-builder').hidden=!usesContract();$('export-contract').hidden=!usesContract();$('batch-guide').hidden=mode!=='batch';
  $('rule-status').textContent='';
  const saved=buffers.get(mode);
  if(saved){$('input-a').value=saved.a;$('input-b').value=saved.b;$('source').value=saved.source;resetResult('Your inputs were kept in this tab. Run again to refresh the report.');}
  else sample();
  $('run-note').textContent='Inputs stay in this tab.';
}
for(const button of document.querySelectorAll('[role=tab]')) {
  button.addEventListener('click',()=>setMode(button.dataset.mode));
  button.addEventListener('keydown',event=>{
    const list=Object.keys(modes);let index=list.indexOf(mode);
    if(event.key==='ArrowRight')index=(index+1)%list.length;else if(event.key==='ArrowLeft')index=(index+list.length-1)%list.length;
    else if(event.key==='Home')index=0;else if(event.key==='End')index=list.length-1;else return;
    event.preventDefault();setMode(list[index]);$('tab-'+list[index]).focus();
  });
}
$('sample').addEventListener('click',sample);
$('clear').addEventListener('click',()=>{
  $('input-a').value='';$('input-b').value=usesContract()?'{"checks":[]}':'';$('source').value='own';
  $('run-note').textContent='Ready for your input.';resetResult();$('input-a').focus();
});
for(const id of ['input-a','input-b','source'])$(id).addEventListener('input',()=>resetResult('Input changed. Run the check again to refresh your report.'));
for(const [id,target] of [['file-a','input-a'],['file-b','input-b']])$(id).addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  const destinationMode=mode;
  try {
    if(file.size>Math.ceil(LIMIT*1.4))throw Error('File exceeds the 180 KiB import limit. Decoded JSON must still fit 128 KiB.');
    const text=await file.text();
    if(mode!==destinationMode)throw Error('Tool changed during import. Import the file again in the intended tool.');
    $(target).value=text;$('source').value='own';resetResult('File imported locally. Review it and run the check.');
  }catch(e){$('run-note').textContent=e.message;}
  finally{event.target.value='';}
});
$('rule-condition').addEventListener('change',()=>{
  const condition=$('rule-condition').value;
  $('rule-value').value=condition==='type'?'string':condition==='equals'?'"USD"':'0';
  $('rule-value-label').textContent=condition==='type'?'Type name':'Value (JSON)';
});
$('add-rule').addEventListener('click',()=>{
  try{$('input-b').value=appendRule($('input-b').value,$('rule-path').value,$('rule-condition').value,$('rule-value').value);$('rule-status').textContent='Rule added. Review the contract, then run the check.';resetResult('Contract changed. Run again to apply the new rule.');}
  catch(e){$('rule-status').textContent=e.message;}
});
$('empty-contract').addEventListener('click',()=>{$('input-b').value='{"checks":[]}';$('rule-status').textContent='Empty contract. Add at least one rule before checking.';resetResult();});
$('export-contract').addEventListener('click',()=>{
  try{checkDelivery('null',$('input-b').value);download('acceptance-contract.json',pretty(parse($('input-b').value))+'\n');$('rule-status').textContent='Contract downloaded. Review expected values before sharing.';}
  catch(e){$('rule-status').textContent=e.message;}
});
function row(level,path,message) {
  const el=document.createElement('div');el.className='finding';
  const l=document.createElement('span');l.className='level '+(['fail','error'].includes(level)?'bad':level==='pass'?'good':'');l.textContent=level;
  const p=document.createElement('code');p.textContent=path;const m=document.createElement('div');m.textContent=message;
  el.append(l,p,m);$('result-details').append(el);return m;
}
function batchSummary(result) {
  const wrapper=document.createElement('div');wrapper.className='batch-table';
  const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent='Recorded cost and rule acceptance — no provider ranking';table.append(caption);
  const head=document.createElement('thead'),tr=document.createElement('tr');
  for(const title of ['Provider / unit','Attempts','Accepted outputs','Accepted tasks','Total entered cost','Cost / accepted output']){const th=document.createElement('th');th.textContent=title;th.scope='col';tr.append(th);}head.append(tr);table.append(head);
  const body=document.createElement('tbody');
  for(const g of result.summaries){const r=document.createElement('tr');for(const v of [g.provider+' / '+g.currency,g.attempts,g.accepted,g.acceptedTasks+' / '+g.uniqueTasks,g.totalCost,g.costPerAccepted??'— No accepted output']){const td=document.createElement('td');td.textContent=String(v);r.append(td);}body.append(r);}table.append(body);wrapper.append(table);$('result-details').append(wrapper);
  if(new Set(result.summaries.map(g=>JSON.stringify(g.taskSet))).size>1)row('note','Task coverage','Providers have different task sets. These totals are not a controlled comparison.');
  for(const attempt of result.results){const reason=attempt.issues.map(x=>x.path+': '+x.message).join(' ');row(attempt.status,attempt.id,attempt.provider+' · '+attempt.task+' · '+attempt.cost+' '+attempt.currency+'. '+(reason||'All declared rules met.'));}
}
$('run').addEventListener('click',()=>{
  resetResult();
  try {
    const result=mode==='challenge'?inspectChallenge($('input-a').value):mode==='delivery'?checkDelivery($('input-a').value,$('input-b').value):mode==='batch'?checkBatch($('input-a').value,$('input-b').value):compareChallenges($('input-a').value,$('input-b').value);
    report={tool:'Agent Delivery Lab',version:VERSION,createdAt:new Date().toISOString(),inputSource:$('source').value,...result};
    if($('source').value==='own'&&result.status!=='unsupported')ownCompleted=true;
    $('status').className='stamp '+result.status;$('status').textContent=result.status.toUpperCase();
    const titles={pass:usesContract()?'Your declared rules were met.':'Supported shape checks passed.',fail:'Issues need your review.',unsupported:'Outside the supported profile.',changed:'Payment terms have changed.',unchanged:'No snapshot differences found.'};
    $('result-title').textContent=mode==='batch'?result.accepted+' of '+result.attempts+' outputs met your rules.':titles[result.status];$('result-summary').textContent=result.coverage;
    if(mode==='batch')batchSummary(result);
    else {
      for(const o of result.options||[])row('option',String(o.option),o.scheme+' · '+o.network+' · '+o.amountAtomic+' atomic units (decimals unverified)');
      for(const i of result.issues||[])row(i.level,i.path,i.message);
      for(const i of result.results||[])row(i.status,i.path,i.message);
      for(const c of result.changes||[]){const m=row('changed',c.path,'');for(const [label,v] of [['Before',c.before],['After',c.after]]){const p=document.createElement('pre');p.textContent=label+': '+pretty(v);m.append(p);}}
    }
    $('download').disabled=false;$('run-note').textContent='Report ready to export.';
  }catch(e){$('status').textContent='INPUT ERROR';$('status').className='stamp error';$('result-title').textContent='Check your input.';$('result-summary').textContent=e.message;}
});
$('download').addEventListener('click',()=>{if(report)download('agent-delivery-'+mode+'-report.json',pretty(report)+'\n');});
$('feedback-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('feedback-status').textContent='Sending…';
  try {
    const res=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),frequency:$('frequency').value,interest:$('interest').value,ownCompleted,qa:new URLSearchParams(location.search).get('qa')==='1'})});
    if(!res.ok)throw Error('Feedback could not be saved. Your local checks still work; please try again later.');
    $('feedback-status').textContent='Thank you. Your anonymous choices were saved. This is not a subscription or reservation.';
  }catch(e){$('feedback-status').textContent=e.message;button.disabled=false;}
});
sample();setMode(new URLSearchParams(location.search).get('mode'));
