import {TICKERS} from './core.mjs';

export const THESIS_ACTIONS=['add','check','blocked','review','export','save','recheck','member'];
export const THESIS_EVENTS=THESIS_ACTIONS.flatMap(a=>['sample','own'].map(m=>'thesis_'+a+'_'+m));
export function thesisAttribution(input) {
  const q=input instanceof URLSearchParams?input:new URLSearchParams(input),out=new URLSearchParams();
  if(q.get('utm_campaign')!=='agi-thesis-watch-01')return out;
  const source=q.get('utm_source'),medium=q.get('utm_medium');
  if(!(['youtube','tiktok'].includes(source)&&medium==='organic_video')&&!(source==='reader_share'&&medium==='referral'))return out;
  out.set('utm_campaign','agi-thesis-watch-01');out.set('utm_source',source);out.set('utm_medium',medium);return out;
}
export function publicThesisLink(ticker,lang='en') {
  if(!TICKERS.includes(ticker))throw new TypeError('Unknown public company');
  const url=new URL('https://agiscorecard.com'+(lang==='zh'?'/zh':'')+'/ai-infrastructure');
  url.searchParams.set('ticker',ticker);url.searchParams.set('utm_source','reader_share');url.searchParams.set('utm_medium','referral');url.searchParams.set('utm_campaign','agi-thesis-watch-01');url.hash='thesis-watch';return url.href;
}
export function emitThesis(action,mode,win=window) {
  const name='thesis_'+action+'_'+mode;if(!THESIS_EVENTS.includes(name))return;
  const url=new URL(win.location.href),nav=win.navigator;
  if(nav.webdriver||nav.doNotTrack==='1'||nav.globalPrivacyControl||['__ci','__qa','__probe','ci','qa'].some(k=>url.searchParams.has(k)))return;
  try{if(win.localStorage.getItem('fleet_ga4_choice_v1')==='denied')return;}catch{return;}
  const path=url.pathname.replace(/\.html$/,'');if(!['/ai-infrastructure','/zh/ai-infrastructure'].includes(path))return;
  const query=thesisAttribution(url.searchParams);
  // Never send selections, thresholds, source facts, filenames or research notes.
  win.dispatchEvent(new win.CustomEvent('fleet:business',{detail:{name}}));
  win.fetch('/api/e',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({n:name,p:path,u:query.toString()})}).catch(()=>{});
}
