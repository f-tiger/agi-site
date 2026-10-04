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
 const lang=root.dataset.lang;
 let state=null;
 const allowed=()=>!navigator.globalPrivacyControl&&navigator.doNotTrack!=='1'&&!navigator.webdriver&&!/[?&]__probe(?:=|&|$)/.test(location.search);
 function event(name,choice='none',action='none'){
  const key=[name,choice,action].join(':');if(!allowed()||sent.has(key))return;sent.add(key);
  // Fixed completion only; the shared channel owns consent and never receives
  // the reader's humidity, temperature, answers or selected product.
  if(name==='buyer_result')window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'legacy:buyer_result'}}));
  const body=JSON.stringify({n:name,p:location.pathname,r:document.referrer,m:{lang,choice,action}});
  try{if(navigator.sendBeacon)navigator.sendBeacon('/api/ev',new Blob([body],{type:'text/plain'}));else fetch('/api/ev',{method:'POST',headers:{'Content-Type':'text/plain'},body,keepalive:true}).catch(()=>{});}catch{}
 }
 function reset(){state=null;results.hidden=true;root.querySelector('[data-status]').textContent='';}
 form.addEventListener('change',reset);
 form.addEventListener('submit',e=>{
  e.preventDefault();const fields=new FormData(form);state=decide(Object.fromEntries(fields));
  results.hidden=false;root.querySelectorAll('[data-answer]').forEach(x=>x.hidden=x.dataset.answer!==state);
  root.querySelectorAll('[data-market-de]').forEach(x=>x.hidden=fields.get('market')!=='de');
  root.querySelectorAll('[data-market-other]').forEach(x=>x.hidden=fields.get('market')==='de');
  results.focus();event('buyer_result',state);
 });
 root.querySelectorAll('a[data-choice-action]').forEach(a=>a.addEventListener('click',()=>{
  if(!state)return;event('buyer_next',state,a.dataset.choiceAction);
  // Existing page tracker coalesces affiliate clicks. This supplies the surface.
  if(a.dataset.choiceAction==='shop'&&allowed()&&window.gtag)window.gtag('event','affiliate_click',{source:'moisture-choice',link_url:a.href});
 }));
 root.querySelector('[data-copy]').addEventListener('click',async()=>{
  const url=new URL(location.pathname,'https://getecoback.com');url.hash='eb-moisture-choice';
  const box=root.querySelector('[data-share]');box.hidden=false;box.value=url.href;
  let copied=false;try{await navigator.clipboard.writeText(url.href);copied=true;}catch{box.focus();box.select();}
  root.querySelector('[data-status]').textContent=lang==='de'?(copied?'Link kopiert. Deine Auswahl wird nicht mitgeteilt.':'Link markieren und kopieren. Deine Auswahl wird nicht mitgeteilt.'):(copied?'Link copied. Your answers are not shared.':'Select and copy the link. Your answers are not shared.');
  event('buyer_next',state||'none','share');
 });
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(rows=>{if(rows.some(r=>r.isIntersecting)){event('buyer_view');observer.disconnect();}},{threshold:.25});observer.observe(form);}
}
