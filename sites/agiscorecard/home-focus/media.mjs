import {homeEdition,rotationDay,renderHomeFeature,renderHomePicks} from './rotation.mjs?v=20261003-daily1';
const lang=document.documentElement.lang.startsWith('zh')?'zh':'en',qa=new URLSearchParams(location.search);
const quiet=()=>['ci','__qa','__probe'].some(k=>qa.get(k)==='1')||qa.get('utm_source')==='verify'||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
function action(name){if(quiet())return;try{if(localStorage.getItem('fleet_ga4_choice_v1')==='granted')window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'home_'+name}}));}catch{}}
function images(root=document){for(const img of root.querySelectorAll('.home-poster img,.home-thumb img')){if(img.complete&&!img.naturalWidth)img.hidden=true;img.addEventListener('error',()=>{img.hidden=true;},{once:true});}}
document.addEventListener('click',e=>{
 const link=e.target.closest('[data-home-action]');if(link)action(link.dataset.homeAction);
 const button=e.target.closest('[data-home-video]');if(!button)return;
 const id=button.dataset.homeVideo;if(!/^[\w-]{11}$/.test(id))return;
 const stage=button.closest('.home-poster');if(stage.querySelector('iframe'))return;
 const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&playsinline=1';frame.title=button.dataset.playerTitle;frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;stage.append(frame);action('video_open');
});
let snapshot=null,lastFetch=-Infinity,fetching=false,edition=null,editionPool=null,sourceFragments=null;
const focused=node=>node?.contains(document.activeElement);
function rotate(){
 if(!snapshot||document.hidden)return;
 if(editionPool!==snapshot.rotation||edition?.day!==rotationDay()){edition=homeEdition(snapshot.rotation);editionPool=snapshot.rotation;}if(!edition)return;
 const feature=document.getElementById('home-feature'),grid=document.querySelector('.home-latest-grid');
 const stats=document.getElementById('home-stats');if(stats&&!focused(stats)&&stats.innerHTML!==snapshot.locales[lang].stats)stats.innerHTML=snapshot.locales[lang].stats;
 // Refresh source metadata separately; do not replace a focused card or the
 // current day's choices when the publisher feed arrives later in the day.
 for(const selector of ['.home-topics','.home-sync-note']){const node=document.querySelector(selector),next=sourceFragments?.querySelector(selector);if(node&&next&&!focused(node)&&node.outerHTML!==next.outerHTML)node.replaceWith(next.cloneNode(true));}
 // Keep an existing player and its matching takeaways intact, even across midnight.
 if(feature&&!feature.querySelector('iframe')&&!focused(feature)&&feature.querySelector('[data-home-edition]')?.dataset.homeEdition!==edition.day){feature.innerHTML=renderHomeFeature(edition,lang);images(feature);}
 if(grid&&!focused(grid)&&grid.dataset.homePicksDay!==edition.day){grid.innerHTML=renderHomePicks(edition,lang);grid.dataset.homePicksDay=edition.day;images(grid);}
 for(const time of document.querySelectorAll('[data-home-edition-date]')){const displayed=grid?.dataset.homePicksDay;if(displayed){time.dateTime=displayed;time.textContent=displayed;}}
 document.documentElement.dataset.homeRotationDay=grid?.dataset.homePicksDay||edition.day;
}
async function refresh(){
 if(document.hidden||fetching||Date.now()-lastFetch<300000)return;
 fetching=true;lastFetch=Date.now();
 try{
  const r=await fetch('/foresight-assets/home.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('network');const d=await r.json();
  if(d.version!==1||!['stats','feed'].every(k=>typeof d.locales?.[lang]?.[k]==='string')||!Number.isFinite(Date.parse(d.checkedAt)))throw Error('schema');
  const nextEdition=homeEdition(d.rotation);if(!nextEdition)throw Error('empty pool');
  const template=document.createElement('template');template.innerHTML=d.locales[lang].feed;
  if(!template.content.querySelector('.home-topics')||!template.content.querySelector('.home-sync-note'))throw Error('feed schema');
  const first=!snapshot;snapshot=d;edition=nextEdition;editionPool=d.rotation;sourceFragments=template.content;
  const feature=document.getElementById('home-feature'),grid=document.querySelector('.home-latest-grid');
  if(first){if(feature&&!feature.querySelector('iframe'))feature.querySelector('[data-home-edition]')?.removeAttribute('data-home-edition');if(grid)delete grid.dataset.homePicksDay;}
  rotate();images();
 }catch{/* Preserve the last published content. An already loaded pool still rotates. */}
 finally{fetching=false;}
}
function tick(){rotate();refresh();}
document.addEventListener('visibilitychange',tick);window.addEventListener('pageshow',tick);
setInterval(tick,60000);images();tick();
