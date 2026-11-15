import {MARKET_PATHS,marketMeasurement} from './market-contract.mjs?v=20261115.uknl1';
export function marketPayload(event,runtime=globalThis){
 try{
  const {location,navigator,localStorage,document,window}=runtime,u=new URL(location.href);
  if(!event.isTrusted||u.origin!=='https://thedollscout.com'||window.top!==window.self||navigator.webdriver||/bot|crawler|spider|headless|playwright|puppeteer/i.test(navigator.userAgent)||navigator.doNotTrack==='1'||navigator.globalPrivacyControl||localStorage.getItem('tds_analytics_choice_v1')==='denied'||['ci','__ci','__probe','qa','__qa'].some(k=>u.searchParams.has(k))||u.searchParams.get('utm_source')==='verify')return null;
  const canonical=new URL(document.querySelector('link[rel="canonical"]').href),p=canonical.pathname;
  if(canonical.origin!==u.origin||canonical.search||canonical.hash||u.pathname.replace(/\.html$/,'')!==p||!Object.hasOwn(MARKET_PATHS,p))return null;
  const a=event.target?.closest?.('a[data-market-shop],a[data-market-source]');if(!a)return null;
  const target=new URL(a.href);if(target.protocol!=='https:'||target.username||target.password||target.port)return null;
  const e=a.hasAttribute('data-market-shop')?'market_shop_click':'market_source_click';
  // These local search links currently have no verified affiliate programme.
  if(e==='market_shop_click'&&(target.pathname!=='/s'||target.searchParams.has('tag')||target.hash))return null;
  const payload={p,e,r:e==='market_shop_click'?'https://'+target.hostname.replace(/^www\./,''):target.origin};return marketMeasurement(payload)?payload:null;
 }catch{return null;}
}
export function installMarketMeasurement(runtime=globalThis){
 runtime.document.addEventListener('click',event=>{
  const payload=marketPayload(event,runtime);if(!payload)return;
  try{runtime.window.dispatchEvent(new runtime.CustomEvent('fleet:business',{detail:{name:payload.e==='market_shop_click'?'tds_market_shop':'tds_market_source'}}));}catch{}
  try{Promise.resolve(runtime.fetch('/api/ev',{method:'POST',body:JSON.stringify(payload),keepalive:true})).catch(()=>{});}catch{}
 },true);
}
if(typeof document!=='undefined')installMarketMeasurement();
