// Interaction never sends filter choices, clipboard data or user inputs.
const filters=document.querySelector('.filters');
if(filters){filters.hidden=false;filters.addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;const filter=button.dataset.filter;if(!['all','blind','plush'].includes(filter))return;for(const b of filters.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));let count=0;for(const card of document.querySelectorAll('[data-kind]')){card.hidden=filter!=='all'&&!card.dataset.kind.split(' ').includes(filter);if(!card.hidden)count++;}const status=document.querySelector('#filter-status');status.textContent=count+' '+status.dataset.suffix;});}
const share=document.querySelector('[data-share]');
if(share)share.addEventListener('click',async()=>{const status=document.querySelector('#share-status');try{const canonical=document.querySelector('link[rel=canonical]').href;await navigator.clipboard.writeText(canonical);status.textContent=share.dataset.share;}catch{status.textContent=share.dataset.failure;}});
// Preserve anonymous first-party page counts separately from consented GA4.
// QA, previews and privacy opt-outs never create production visits.
const params=new URLSearchParams(location.search);
if(location.hostname==='thedollscout.com'&&!['ci','__ci','__probe'].some(k=>params.has(k))&&!navigator.webdriver&&!/bot|crawler|spider|headless/i.test(navigator.userAgent)&&!navigator.globalPrivacyControl&&navigator.doNotTrack!=='1'){
 let ref='';try{ref=new URL(document.referrer).origin;}catch{}
 const body=JSON.stringify({p:new URL(document.querySelector('link[rel=canonical]').href).pathname,e:'',r:ref});
 fetch('/api/ev',{method:'POST',body,keepalive:true}).catch(()=>{});
}
