// Interaction never sends filter choices, clipboard data or user inputs.
const filters=document.querySelector('.filters');
if(filters){filters.hidden=false;filters.addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;const filter=button.dataset.filter;if(!['all','blind','plush'].includes(filter))return;for(const b of filters.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));let count=0;for(const card of document.querySelectorAll('[data-kind]')){card.hidden=filter!=='all'&&!card.dataset.kind.split(' ').includes(filter);if(!card.hidden)count++;}const status=document.querySelector('#filter-status');status.textContent=count+' '+status.dataset.suffix;});}
const share=document.querySelector('[data-share]');
if(share)share.addEventListener('click',async()=>{const status=document.querySelector('#share-status');try{const canonical=document.querySelector('link[rel=canonical]').href;await navigator.clipboard.writeText(canonical);status.textContent=share.dataset.share;}catch{status.textContent=share.dataset.failure;}});
// Preserve anonymous first-party page counts separately from consented GA4.
// QA, previews and privacy opt-outs never create production visits.
const params=new URLSearchParams(location.search);
const measurable=location.hostname==='thedollscout.com'&&!['ci','__ci','__probe'].some(k=>params.has(k))&&params.get('utm_source')!=='verify'&&!navigator.webdriver&&!/bot|crawler|spider|headless/i.test(navigator.userAgent)&&!navigator.globalPrivacyControl&&navigator.doNotTrack!=='1';
if(measurable){
 let ref='';try{ref=new URL(document.referrer).origin;}catch{}
 const body=JSON.stringify({p:new URL(document.querySelector('link[rel=canonical]').href).pathname,e:'',r:ref});
 fetch('/api/ev',{method:'POST',body,keepalive:true}).catch(()=>{});
}
const recorded=new Set();
function recordAction(name){if(!measurable||recorded.has(name))return;recorded.add(name);const body=JSON.stringify({p:new URL(document.querySelector('link[rel=canonical]').href).pathname,e:name,r:''});fetch('/api/ev',{method:'POST',body,keepalive:true}).catch(()=>{});}
import {initStyleOdds} from './style-odds-ui.mjs';
const styleTool=document.querySelector('[data-style-tool]');
if(styleTool)initStyleOdds(styleTool,recordAction);

// Only one player at a time; creating it is an explicit visitor action, not a play event.
let activeVideo=null;
function closeVideo(card){if(!card)return;card.querySelector('iframe')?.remove();card.querySelector('.video-poster').hidden=card.querySelector('.video-poster').dataset.failed==='true';card.querySelector('[data-video-load]').hidden=false;card.querySelector('[data-video-close]').hidden=true;if(activeVideo===card)activeVideo=null;}
for(const card of document.querySelectorAll('[data-video]')){
 const load=card.querySelector('[data-video-load]'),close=card.querySelector('[data-video-close]'),poster=card.querySelector('.video-poster');load.hidden=false;
 const posterFailed=()=>{poster.dataset.failed='true';poster.hidden=true;};poster.addEventListener('error',posterFailed);if(poster.complete&&!poster.naturalWidth)posterFailed();
 load.addEventListener('click',()=>{closeVideo(activeVideo);const id=card.dataset.video;if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;const frame=document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=0&playsinline=1&rel=0&cc_load_policy=1&hl=${document.documentElement.lang.split('-')[0]}`;frame.title=load.dataset.title;frame.allow='encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';card.querySelector('.video-poster').hidden=true;load.hidden=true;card.querySelector('.video-stage').append(frame);close.hidden=false;activeVideo=card;recordAction('collector_video_request');frame.focus();});
 close.addEventListener('click',()=>{closeVideo(card);load.focus();});
 card.querySelector('.video-next').addEventListener('click',()=>recordAction('collector_video_tool'));
}

// The demonstration is local, finite and never counted as a completed user task.
import {DEMO_INPUT} from './mcp-contract.mjs';
const demo=document.querySelector('[data-demo]');
if(demo){
 const button=demo.querySelector('[data-demo-play]'),status=demo.querySelector('[data-demo-status]'),steps=[...demo.querySelectorAll('[data-demo-step]')],reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let timer=null,playing=false,phase=2,started=false;
 const fit=globalThis.DSCollector.fit(DEMO_INPUT);
 demo.dataset.resultCount=String(fit.count);
 const show=n=>{phase=n;demo.dataset.phase=String(n);for(const [i,step]of steps.entries())i===n?step.setAttribute('aria-current','step'):step.removeAttribute('aria-current');status.textContent=steps[n].textContent+(n===2?' · '+demo.querySelector('[data-demo-result]').textContent:'');};
 const stop=()=>{clearTimeout(timer);timer=null;playing=false;button.textContent=reduced.matches?button.dataset.next:started?button.dataset.replay:button.dataset.play;button.setAttribute('aria-pressed','false');};
 const advance=()=>{if(!playing)return;if(phase===2){stop();return;}show(phase+1);timer=setTimeout(advance,2000);};
 button.hidden=false;stop();
 button.addEventListener('click',()=>{if(reduced.matches){stop();started=true;show((phase+1)%3);return;}if(playing){stop();return;}started=true;playing=true;show(0);button.textContent=button.dataset.pause;button.setAttribute('aria-pressed','true');timer=setTimeout(advance,2000);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 reduced.addEventListener('change',()=>{stop();show(2);});
}
const mcpCopy=document.querySelector('[data-copy-mcp]');
if(mcpCopy)mcpCopy.addEventListener('click',async()=>{const status=document.querySelector('[data-mcp-status]');try{await navigator.clipboard.writeText('https://thedollscout.com/mcp');status.textContent=mcpCopy.dataset.success;}catch{status.textContent=mcpCopy.dataset.failure;}});
