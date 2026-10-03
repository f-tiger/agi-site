const lang=document.documentElement.lang.startsWith('zh')?'zh':'en',qa=new URLSearchParams(location.search);
const quiet=()=>['ci','__qa','__probe'].some(k=>qa.get(k)==='1')||qa.get('utm_source')==='verify'||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
function action(name){if(quiet())return;try{if(localStorage.getItem('fleet_ga4_choice_v1')==='granted')window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'home_'+name}}));}catch{}}
function images(){for(const img of document.querySelectorAll('.home-poster img,.home-thumb img')){if(img.complete&&!img.naturalWidth)img.hidden=true;img.addEventListener('error',()=>{img.hidden=true;},{once:true});}}
document.addEventListener('click',e=>{
 const link=e.target.closest('[data-home-action]');if(link)action(link.dataset.homeAction);
 const button=e.target.closest('[data-home-video]');if(!button)return;
 const id=button.dataset.homeVideo;if(!/^[\w-]{11}$/.test(id))return;
 const stage=button.closest('.home-poster');if(stage.querySelector('iframe'))return;
 const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&playsinline=1';frame.title=button.dataset.playerTitle;frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;stage.append(frame);action('video_open');
});
let last=Date.now();
async function refresh(){if(document.hidden||Date.now()-last<300000)return;last=Date.now();try{
 const r=await fetch('/foresight-assets/home.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('network');const d=await r.json();
 if(d.version!==1||!d.locales?.[lang]||!/^\d{4}-\d\d-\d\dT/.test(d.checkedAt))throw Error('schema');
 for(const [id,key]of [['home-stats','stats'],['home-feature','feature'],['home-feed','feed']]){const node=document.getElementById(id);if(node&&!node.querySelector('iframe')&&typeof d.locales[lang][key]==='string')node.innerHTML=d.locales[lang][key];}images();
 }catch{/* The published, dated snapshot remains readable offline. */}}
document.addEventListener('visibilitychange',refresh);setInterval(refresh,300000);images();
