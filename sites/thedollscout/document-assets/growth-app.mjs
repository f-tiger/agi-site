import {track} from './telemetry.mjs?v=2026-10-02.1';
import {GROWTH_EVENTS,growthEventAllowed,VIDEO_IDS} from './growth-core.mjs?v=2026-09-27.1';
document.addEventListener('click',ev=>{const target=ev.target.closest('[data-growth-event]');if(!target)return;const name=target.dataset.growthEvent;if(GROWTH_EVENTS.has(name)&&growthEventAllowed(name,location.pathname))track(name);});
const placeholders=new Map();
for(const button of document.querySelectorAll('[data-video-load]'))button.addEventListener('click',()=>{
 const id=button.dataset.videoLoad;if(!VIDEO_IDS.includes(id))return;
 const frame=document.querySelector(`[data-player="${id}"]`);if(!frame||!/^[-\w]{11}$/.test(frame.dataset.youtube))return;
 const placeholder=frame.firstElementChild;placeholders.set(id,placeholder);placeholder.remove();
 const player=document.createElement('iframe');player.src=`https://www.youtube-nocookie.com/embed/${frame.dataset.youtube}?playsinline=1`;player.title=frame.dataset.title;player.allow='encrypted-media; picture-in-picture; fullscreen';player.allowFullscreen=true;player.referrerPolicy='strict-origin-when-cross-origin';frame.append(player);
 const close=document.querySelector(`[data-video-close="${id}"]`);close.hidden=false;close.focus();
});
for(const button of document.querySelectorAll('[data-video-close]'))button.addEventListener('click',()=>{const id=button.dataset.videoClose,frame=document.querySelector(`[data-player="${id}"]`);if(!frame||!placeholders.has(id))return;frame.replaceChildren(placeholders.get(id));button.hidden=true;frame.querySelector('button').focus();});
for(const button of document.querySelectorAll('[data-checklist-download]'))button.addEventListener('click',()=>{
 const section=button.closest('[data-checklist]');if(!section)return;
 const body=[document.querySelector('h1').textContent,location.origin+location.pathname,'',...Array.from(section.querySelectorAll('li'),(el,i)=>`${i+1}. ${el.textContent}`),'','TDS · https://thedollscout.com/'].join('\n');
 const blob=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=blob;a.download=`tds-${button.dataset.checklistDownload}-checklist.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(blob),1000);
});
