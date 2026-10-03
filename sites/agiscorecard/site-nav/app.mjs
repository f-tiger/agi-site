const header=document.getElementById('agi-nav'),menu=document.getElementById('agi-site-menu');
if(header&&menu){
 const summary=menu.querySelector('summary'),params=new URLSearchParams(location.search),privatePage=/^\/(?:zh\/)?(?:members|discuss\/(?:account|moderate))(?:\/|$)/.test(location.pathname);
 const quiet=()=>privatePage||['ci','__qa','__probe'].some(k=>params.get(k)==='1')||params.get('utm_source')==='verify'||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
 const send=name=>{if(quiet())return;try{if(localStorage.getItem('fleet_ga4_choice_v1')==='granted')window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));}catch{}};
 if(params.get('embed')==='1')document.documentElement.classList.add('agi-embedded');
 menu.addEventListener('toggle',()=>{summary.setAttribute('aria-expanded',String(menu.open));if(menu.open)send('nav_menu_open');});
 summary.setAttribute('aria-expanded',String(menu.open));
 document.addEventListener('click',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;summary.focus();}});
 header.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;if(a.dataset.navDestination)send('nav_'+a.dataset.navDestination);if(a.id==='language')send('nav_language');if(menu.contains(a))menu.open=false;});
 // Keep safe, existing view state on the translated page. Private input never enters a URL.
 // Feature-owned language handlers retain authority over their detailed state.
 const language=document.getElementById('language');
 if(language?.dataset.navLanguageLink==='translation'&&!/\/future-guide(?:\/|$)/.test(location.pathname)){
  const u=new URL(language.href,location.origin);
  for(const [key,pattern]of Object.entries({media:/^(video|audio|text)$/,topic:/^(all|work|learn|earn|family|understand|forecast)$/,watch:/^[\w-]{11}$/,order:/^(views|newest)$/,lang:/^(en|zh)$/,window:/^(all|30|90|archive)$/,category:/^(all|interview|commentary|research|official)$/}))if(pattern.test(params.get(key)||''))u.searchParams.set(key,params.get(key));
  if(/^#[\w-]{1,80}$/.test(location.hash))u.hash=location.hash;
  language.href=u.pathname+u.search+u.hash;
 }
}
