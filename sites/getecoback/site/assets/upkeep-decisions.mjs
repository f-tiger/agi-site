import {careDecision,curtainDecision,upkeepEvent} from './upkeep-decisions-rules.mjs';
if(typeof document!=='undefined')for(const root of document.querySelectorAll('[data-upkeep]')){
 const form=root.querySelector('form'),panel=root.querySelector('[data-result]'),example=root.querySelector('[data-example]'),share=root.querySelector('[data-copy]'),copy=root.querySelector('[data-copy-text]'),status=root.querySelector('[data-status]');
 const care=root.dataset.upkeep==='tineco-care',decision=care?careDecision:curtainDecision,seen=new Set();let latest=null;
 form.hidden=false;example.hidden=false;
 const values=()=>Object.fromEntries(new FormData(form));
 const emit=action=>{if(seen.has(action)||navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl||/[?&]__(probe|ci|qa)(=|&|$)/.test(location.search))return;seen.add(action);window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:upkeepEvent(action)}}));};
 const invalidate=()=>{latest=null;panel.hidden=true;share.hidden=true;copy.hidden=true;copy.value='';status.textContent='';};
 const render=(v,isExample=false)=>{
  const r=decision(v);if(!r)return false;
  root.querySelector('[data-result-label]').textContent=isExample?'Fiktives Beispiel – nicht deine Auswahl':'Ergebnis deiner Auswahl – keine Ferndiagnose';
  root.querySelector('[data-result-title]').textContent=r.title;
  const ul=root.querySelector('[data-result-steps]');ul.replaceChildren(...r.steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  const source=root.querySelector('[data-result-source]');source.href=r.source;
  const shop=root.querySelector('[data-shop]');if(shop)shop.hidden=isExample||!r.shop;
  latest=isExample?null:r;panel.hidden=false;share.hidden=isExample;copy.hidden=true;status.textContent='';panel.focus();emit(isExample?'example':'decision');return true;
 };
 form.addEventListener('change',invalidate);
 form.addEventListener('submit',e=>{e.preventDefault();invalidate();if(form.reportValidity())render(values());});
 example.addEventListener('click',()=>render(care?{model:'s5',symptom:'weak',care:'not-yet'}:{place:'window',radiator:'covered',opening:'clear'},true));
 share.addEventListener('click',async()=>{if(!latest)return;const text=['EcoBack · '+(care?'Tineco Pflege-Check':'Vorhang-Montagecheck'),latest.title,...latest.steps.map(s=>'• '+s),'Orientierung, keine Diagnose oder Passformzusage.','https://getecoback.com'+location.pathname+'#upkeep-check'].join('\n');copy.value=text;copy.hidden=false;try{await navigator.clipboard.writeText(text);status.textContent='Ergebnis kopiert. Du entscheidest, ob und wo du es teilst.';emit('share');}catch{status.textContent='Bitte den Text unten selbst markieren und kopieren.';copy.focus();copy.select();}});
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){emit('view');observer.disconnect();}},{threshold:.15});observer.observe(root);}
}
