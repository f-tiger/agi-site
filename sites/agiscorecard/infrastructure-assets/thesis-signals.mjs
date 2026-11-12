export const THESIS_ACTIONS=['add','check','blocked','review','export','save','recheck','member'];
export const THESIS_EVENTS=THESIS_ACTIONS.flatMap(a=>['sample','own'].map(m=>'thesis_'+a+'_'+m));
export function emitThesis(action,mode,win=window) {
  const name='thesis_'+action+'_'+mode;if(!THESIS_EVENTS.includes(name))return;
  const url=new URL(win.location.href),nav=win.navigator;
  if(nav.webdriver||nav.doNotTrack==='1'||nav.globalPrivacyControl||['__ci','__qa','__probe','ci','qa'].some(k=>url.searchParams.has(k)))return;
  try{if(win.localStorage.getItem('fleet_ga4_choice_v1')==='denied')return;}catch{return;}
  const path=url.pathname.replace(/\.html$/,'');if(!['/ai-infrastructure','/zh/ai-infrastructure'].includes(path))return;
  const query=new URLSearchParams();
  if(url.searchParams.get('utm_campaign')==='agi-thesis-watch-01'&&['youtube','tiktok'].includes(url.searchParams.get('utm_source'))){query.set('utm_campaign','agi-thesis-watch-01');query.set('utm_source',url.searchParams.get('utm_source'));query.set('utm_medium','organic_video');}
  // Never send selections, thresholds, source facts, filenames or research notes.
  win.dispatchEvent(new win.CustomEvent('fleet:business',{detail:{name}}));
  win.fetch('/api/e',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({n:name,p:path,u:query.toString()})}).catch(()=>{});
}
