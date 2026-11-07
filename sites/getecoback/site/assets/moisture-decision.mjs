// A bounded buying guide, not a moisture diagnosis or a product test.
export function decide({purpose,humidity,temperature}) {
  if(!['room','laundry','damage'].includes(purpose)||!['unknown','normal','high'].includes(humidity)||!['unknown','warm','cold'].includes(temperature))throw new RangeError('Invalid choice');
  if(purpose==='damage')return 'cause';
  if(humidity==='unknown')return 'measure';
  if(humidity==='normal'&&purpose==='room')return 'wait';
  if(temperature==='unknown')return 'measure';
  if(temperature==='cold')return 'cold';
  return purpose==='laundry'?'laundry':'compare';
}
const root=typeof document!=='undefined'?document.getElementById('eb-moisture-choice'):null;
if(root){
 const form=root.querySelector('form'),results=root.querySelector('[data-results]'),sent=new Set();
 const context=root.querySelector('#eb-choice-context'),method=root.querySelector('[data-choice-method]'),directNote=root.querySelector('[data-choice-direct-note]');
 const lang=root.dataset.lang;
 let state=null;
 const allowed=()=>{
  if(navigator.globalPrivacyControl||navigator.doNotTrack==='1'||navigator.webdriver||/[?&](?:__probe|__qa|__ci|qa|ci|verify)(?:=|&|$)/i.test(location.search)||new URLSearchParams(location.search).get('utm_source')==='verify')return false;
  // The shared footer stores this exact string. Read on each action so a
  // withdrawal in this tab or another tab takes effect without a reload.
  try{if(localStorage.getItem('fleet_ga4_choice_v1')==='denied')return false;}catch{}
  return true;
 };
 function event(name,choice='none',action='none'){
  const key=[name,choice,action].join(':');if(!allowed()||sent.has(key))return;sent.add(key);
  // Fixed completion only; the shared channel owns consent and never receives
  // the reader's humidity, temperature, answers or selected product.
  if(name==='buyer_result')window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'legacy:buyer_result'}}));
  const body=JSON.stringify({n:name,p:location.pathname,r:document.referrer,m:{lang,choice,action}});
  try{if(navigator.sendBeacon)navigator.sendBeacon('/api/ev',new Blob([body],{type:'text/plain'}));else fetch('/api/ev',{method:'POST',headers:{'Content-Type':'text/plain'},body,keepalive:true}).catch(()=>{});}catch{}
 }
 function reset(){
  state=null;results.hidden=true;context.hidden=false;directNote.hidden=true;root.querySelector('[data-status]').textContent='';
  root.querySelectorAll('[data-choice-evidence]').forEach(details=>details.open=false);
 }
 function show(choice,market,direct=false){
  state=choice;results.hidden=false;context.hidden=direct;directNote.hidden=!direct;
  root.querySelectorAll('[data-answer]').forEach(x=>x.hidden=x.dataset.answer!==state);
  root.querySelectorAll('[data-market-de]').forEach(x=>x.hidden=market!=='de');
  root.querySelectorAll('[data-market-other]').forEach(x=>x.hidden=market==='de');
  // Advice-only readers can still compare the existing public evidence table.
  // No German merchant or candidate panel is revealed for that market.
  if(direct&&market!=='de')method.open=true;
  results.focus();
 }
 form.addEventListener('change',reset);
 form.addEventListener('submit',e=>{
  e.preventDefault();const fields=new FormData(form);
  show(decide(Object.fromEntries(fields)),fields.get('market'));event('buyer_result',state);
 });
 root.querySelector('[data-choice-direct]').addEventListener('click',e=>{
  if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  e.preventDefault();event('buyer_view');reset();
  // Opening a model comparison does not answer the needs questionnaire and is
  // not a tool completion. Keep all selections and the existing market gate.
  show('compare',form.elements.market.value,true);event('buyer_next','compare','direct');
 });
 root.querySelectorAll('[data-choice-needs]').forEach(a=>a.addEventListener('click',e=>{
  if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  e.preventDefault();event('buyer_view');reset();form.querySelector('select').focus();
 }));
 root.querySelectorAll('a[data-choice-action]').forEach(a=>a.addEventListener('click',()=>{
  if(!state)return;event('buyer_next',state,a.dataset.choiceAction);
  // Existing page tracker coalesces affiliate clicks. This supplies the surface.
  if(a.dataset.choiceAction==='shop'&&allowed()&&window.gtag)window.gtag('event','affiliate_click',{source:'moisture-choice',link_url:a.href});
 }));
 root.querySelectorAll('[data-choice-evidence]').forEach(details=>details.addEventListener('toggle',()=>{
  if(details.open&&['compare','laundry'].includes(state)&&!results.hidden&&!details.closest('[hidden]')){
   // Both candidates share one evidence action per result type. No model or
   // reader answers are added to the existing categorical event contract.
   event('buyer_next',state,'evidence');
  }
 }));
 root.querySelector('[data-copy]').addEventListener('click',async()=>{
  const url=new URL(location.pathname,'https://getecoback.com');url.hash='eb-moisture-choice';
  const box=root.querySelector('[data-share]');box.hidden=false;box.value=url.href;
  let copied=false;try{await navigator.clipboard.writeText(url.href);copied=true;}catch{box.focus();box.select();}
  root.querySelector('[data-status]').textContent=lang==='de'?(copied?'Link kopiert. Deine Auswahl wird nicht mitgeteilt.':'Link markieren und kopieren. Deine Auswahl wird nicht mitgeteilt.'):(copied?'Link copied. Your answers are not shared.':'Select and copy the link. Your answers are not shared.');
  event('buyer_next',state||'none','share');
 });
 // Exposure now covers the shared two-speed entry, not just the questionnaire.
 // Entry clicks above provide a deterministic fallback and share the same dedup.
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(rows=>{if(rows.some(r=>r.isIntersecting)){event('buyer_view');observer.disconnect();}},{threshold:.25});observer.observe(root.querySelector('.choice-entry'));}
 // A failed or unavailable module leaves useful reading links, never a native
 // GET form that would put answers in the URL. Enable only after all handlers.
 root.querySelector('[data-choice-fallback]').hidden=true;
 root.querySelector('[data-copy]').hidden=false;
 form.querySelector('[data-choice-fields]').disabled=false;
 form.removeAttribute('inert');
 form.hidden=false;
 // The unenhanced method is open. Honour a direct hash even after JS starts.
 method.open=location.hash==='#eb-choice-method';
}
