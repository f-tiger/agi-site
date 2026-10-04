const {calculate}=await import('./au-cooling-math.mjs'+new URL(import.meta.url).search);
const f=(n,d=2)=>n.toLocaleString('en-AU',{minimumFractionDigits:d,maximumFractionDigits:d});
const event=name=>!window.__ecoToolExample&&window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'legacy:'+name}}));
for(const root of document.querySelectorAll('[data-au-cost]')){
 const form=root.querySelector('form'),result=root.querySelector('[data-result]'),error=root.querySelector('[data-error]'),download=root.querySelector('[data-export]'),seen=new Set();let latest=null,started=false;
 const reset=()=>{latest=null;result.hidden=true;download.hidden=true;error.textContent='';};
 form.addEventListener('input',()=>{reset();if(!started&&!window.__ecoToolExample){started=true;event('tool_start');}});form.addEventListener('change',reset);
 form.addEventListener('submit',ev=>{ev.preventDefault();reset();if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form)),own=data.own==='on';delete data.own;
  try{const r=calculate(data),lines=[own?'Your checked inputs · scenario estimate':'Illustrative example · not a measurement',`Daily electricity: ${f(r.dailyKwh,3)} kWh`,`Daily usage cost: AUD ${f(r.dailyAud,3)}`,`Selected period: ${f(r.periodKwh,3)} kWh · AUD ${f(r.periodAud)}`,'Usage charges only. Supply and demand charges, purchase and installation are excluded. The same daily schedule and average input power are assumed.'];
   result.replaceChildren(...lines.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));result.hidden=false;if(!window.__ecoToolExample)result.focus();download.hidden=false;
   latest={own,text:[document.title,...lines,'','Inputs:',...Object.entries(data).map(([k,v])=>form.elements[k].closest('label').childNodes[0].textContent.trim()+': '+v),'','Source: '+document.querySelector('link[rel=canonical]').href].join('\n')};
   const signature=JSON.stringify(data);if(own&&!seen.has(signature)){seen.add(signature);event('tool_complete');}
  }catch(e){error.textContent=e.message;}
 });
 download.addEventListener('click',()=>{if(!latest)return;const u=URL.createObjectURL(new Blob([latest.text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='ecoback-australia-cooling-cost.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);if(latest.own)event('tool_export');});root.dataset.ready='true';
}
