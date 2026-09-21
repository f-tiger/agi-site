import {impact} from './impact.mjs';
const out=document.getElementById('cost-result'),form=document.getElementById('cost-form');
const send=event=>document.dispatchEvent(new CustomEvent('web3:measure',{detail:event}));

if(form)form.addEventListener('submit',e=>{
 e.preventDefault();try{const v=Object.fromEntries(['amount','price','gas','feeGwei','ethUsd'].map(k=>{const raw=form.elements[k].value;if(raw.trim()==='')throw Error('Fill each input; missing prices are not assumed.');return[k,Number(raw)];})),r=impact(v),fmt=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(n);out.textContent=`Reference value ${fmt(r.value)}; difference from $1 per token ${fmt(r.difference)}; gas estimate ${fmt(r.gasUsd)}. Gas units and effective fee are your assumptions. L2 data fees, swaps and other charges are not included. This does not prove a payment settled.`;send('cost_check');}catch(e){out.textContent=e.message;}
});
const market=document.getElementById('research-controls')?null:document.getElementById('market-live'),briefs=document.getElementById('briefs-live');
async function refresh(){
 if(document.hidden)return;
 const block=market||briefs;if(!block)return;
 const url=market?'/api/market?format=html':'/api/briefs?format=html';
 try{const r=await fetch(url,{signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error();block.innerHTML=await r.text();}catch{const state=block.querySelector('.source-state');if(state){state.textContent='Refresh unavailable. The displayed snapshot may be stale; verify its receipt time.';state.dataset.sourceState='stale';}}
}
document.getElementById('refresh-source')?.addEventListener('click',refresh);
if(market)setInterval(refresh,60000);
if(briefs)setInterval(refresh,300000);
document.querySelectorAll('[data-copy-citation]').forEach(b=>b.addEventListener('click',async()=>{const t=document.getElementById(b.dataset.copyCitation);try{await navigator.clipboard.writeText(t.value);send('citation_copy');document.getElementById('citation-status').textContent='Citation copied.';}catch{t.focus();t.select();document.getElementById('citation-status').textContent='Text selected. Use Copy on your device.';}}));
