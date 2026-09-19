import {VERSION,inspectChallenge,checkDelivery,compareChallenges,sampleChallenge,sampleResponse,sampleContract} from './engine.mjs';
const $=id=>document.getElementById(id), pretty=v=>JSON.stringify(v,null,2);
let mode='challenge', report=null, ownCompleted=false;
const modes={challenge:{a:'PaymentRequired JSON or header',help:'Paste the x402 v2 PaymentRequired JSON or a base64 PAYMENT-REQUIRED header.',run:'Check payment terms'},delivery:{a:'API response JSON',b:'Acceptance contract',help:'Check a JSON response against paths, types, exact values and numeric bounds. See the guide for rule syntax.',run:'Check response'},compare:{a:'Previous PaymentRequired JSON or header',b:'Current PaymentRequired JSON or header',help:'Compare two supported payment challenges. Changed payment options are shown in full; option order is ignored.',run:'Compare payment terms'}};
function resetResult(message='Run a check to create a report.'){$('download').disabled=true;report=null;$('status').textContent='READY';$('status').className='stamp';$('result-title').textContent='Your report will appear here.';$('result-summary').textContent=message;$('result-details').replaceChildren();}
function sample(){
  $('source').value='sample';
  $('input-a').value=pretty(mode==='delivery'?sampleResponse:sampleChallenge);
  const after=structuredClone(sampleChallenge);after.accepts[0].amount='15000';
  $('input-b').value=pretty(mode==='delivery'?sampleContract:after);
  $('run-note').textContent='Fictional example loaded.';resetResult('Example ready. All displayed addresses and responses are demonstration fixtures.');
}
function setMode(next){mode=next;for(const b of document.querySelectorAll('[role=tab]')){b.setAttribute('aria-selected',String(b.dataset.mode===mode));b.tabIndex=b.dataset.mode===mode?0:-1;}$('workspace').setAttribute('aria-labelledby','tab-'+mode);$('label-a').textContent=modes[mode].a;$('label-b').textContent=modes[mode].b||'';$('second-editor').hidden=mode==='challenge';document.querySelector('.editors').classList.toggle('two',mode!=='challenge');$('mode-help').textContent=modes[mode].help;$('run').textContent=modes[mode].run+' →';sample();}
for(const b of document.querySelectorAll('[role=tab]')){b.addEventListener('click',()=>setMode(b.dataset.mode));b.addEventListener('keydown',e=>{const list=['challenge','delivery','compare'];let index=list.indexOf(mode);if(e.key==='ArrowRight')index=(index+1)%3;else if(e.key==='ArrowLeft')index=(index+2)%3;else if(e.key==='Home')index=0;else if(e.key==='End')index=2;else return;e.preventDefault();setMode(list[index]);$('tab-'+list[index]).focus();});}
$('sample').addEventListener('click',sample);$('clear').addEventListener('click',()=>{$('input-a').value='';$('input-b').value='';$('source').value='own';$('run-note').textContent='Ready for your input.';resetResult();$('input-a').focus();});
for(const id of ['input-a','input-b','source'])$(id).addEventListener('input',()=>resetResult('Input changed. Run the check again to refresh your report.'));
function row(level,path,message){const el=document.createElement('div');el.className='finding';const l=document.createElement('span');l.className='level '+(['fail','error'].includes(level)?'bad':level==='pass'?'good':'');l.textContent=level;const p=document.createElement('code');p.textContent=path;const m=document.createElement('div');m.textContent=message;el.append(l,p,m);$('result-details').append(el);return m;}
$('run').addEventListener('click',()=>{
  resetResult();
  try{
    const result=mode==='challenge'?inspectChallenge($('input-a').value):mode==='delivery'?checkDelivery($('input-a').value,$('input-b').value):compareChallenges($('input-a').value,$('input-b').value);
    report={tool:'Agent Delivery Lab',version:VERSION,createdAt:new Date().toISOString(),inputSource:$('source').value,...result};
    if($('source').value==='own' && result.status!=='unsupported')ownCompleted=true;
    $('status').className='stamp '+result.status;$('status').textContent=result.status.toUpperCase();
    const titles={pass:mode==='delivery'?'Your declared rules were met.':'Supported shape checks passed.',fail:'Issues need your review.',unsupported:'Outside the supported profile.',changed:'Payment terms have changed.',unchanged:'No snapshot differences found.'};
    $('result-title').textContent=titles[result.status];$('result-summary').textContent=result.coverage;
    for(const o of result.options||[])row('option',String(o.option),o.scheme+' · '+o.network+' · '+o.amountAtomic+' atomic units (decimals unverified)');
    for(const i of result.issues||[])row(i.level,i.path,i.message);
    for(const i of result.results||[])row(i.status,i.path,i.message);
    for(const c of result.changes||[]){const m=row('changed',c.path,'');for(const [label,v] of [['Before',c.before],['After',c.after]]){const p=document.createElement('pre');p.textContent=label+': '+pretty(v);m.append(p);}}
    $('download').disabled=false;$('run-note').textContent='Report ready to export.';
  }catch(e){$('status').textContent='INPUT ERROR';$('status').className='stamp error';$('result-title').textContent='Check your input.';$('result-summary').textContent=e.message;}
});
$('download').addEventListener('click',()=>{if(!report)return;const url=URL.createObjectURL(new Blob([pretty(report)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='agent-delivery-'+mode+'-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('feedback-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;$('feedback-status').textContent='Sending…';try{const res=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),frequency:$('frequency').value,interest:$('interest').value,ownCompleted,qa:new URLSearchParams(location.search).get('qa')==='1'})});if(!res.ok)throw Error('Feedback could not be saved. Your local checks still work; please try again later.');$('feedback-status').textContent='Thank you. Your anonymous choices were saved. This is not a subscription or reservation.';}catch(e){$('feedback-status').textContent=e.message;button.disabled=false;}});
sample();
