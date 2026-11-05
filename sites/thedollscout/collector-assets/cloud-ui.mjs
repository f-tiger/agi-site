import {cloudCopy} from './cloud-copy.mjs';
export function initCloud({doc=document,win=window,core=globalThis.DSCollector,storage=()=>localStorage,fetcher=fetch,confirmAction=message=>win.confirm(message)}={}){
 const box=doc.querySelector('[data-collection-cloud]');if(!box||!core)return;
 const c=cloudCopy[box.dataset.lang]||cloudCopy.en,q=name=>box.querySelector('[data-cloud-'+name+']');
 let state=null,busy=false,epoch=0;
 const status=text=>{q('status').textContent=text;};
 function buttons(){q('check').disabled=busy;for(const action of ['save','restore','delete'])q(action).disabled=busy||!state||(action!=='save'&&!state.has_copy);}
 function invalidate(){epoch++;state=null;busy=false;buttons();status(c.checkAgain);}
 async function api(body){const r=await fetcher('/api/collection-cloud',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'failed');return d;}
 function measure(name){try{const p=new URL(win.location.href),n=win.navigator;if(p.hostname!=='thedollscout.com'||win.top!==win.self||/bot|crawler|spider|headless|playwright|puppeteer|curl|wget|monitor/i.test(n.userAgent||'')||n.webdriver||n.globalPrivacyControl||n.doNotTrack==='1'||['ci','qa','__ci','__qa','__probe'].some(k=>p.searchParams.has(k))||storage().getItem('fleet_ga4_choice_v1')==='denied'||storage().getItem('tds_analytics_choice_v1')==='denied')return;win.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));const body=JSON.stringify({p:p.pathname.replace(/\.html$/,''),e:name,r:''});if(!n.sendBeacon?.('/api/ev',body))fetcher('/api/ev',{method:'POST',body,keepalive:true}).catch(()=>{});}catch{}}
 async function run(action){
  if(busy)return;const turn=++epoch;busy=true;buttons();
  try{
   if(action==='check'){const result=await api();if(turn!==epoch)return;state=result;status(result.has_copy?c.ready.replace('{count}',result.count):c.empty);return;}
   if(!state)throw Error('account_changed');
   const expected={owner:state.owner,revision:state.revision};
   // Take the local snapshot before any network wait; restoration uses its exact CAS value.
   const local=action==='delete'?null:core.readCollection(storage());
   let collection;if(action==='save'){collection=JSON.parse(core.backup(local.items));if(local.items.length>500||new TextEncoder().encode(JSON.stringify(collection,null,2)).byteLength>131072)throw Error('collection_too_large');}
   if(!confirmAction(c[action==='save'?'confirmSave':action==='restore'?'confirmRestore':'confirmDelete']))return;
   const result=await api({action,...expected,...(collection?{collection}:{})});if(turn!==epoch)return;
   if(action==='restore'){core.writeCollection(storage(),core.restore(JSON.stringify(result.collection)),local.raw);win.dispatchEvent(new Event('tds:collection-restored'));measure('collection_cloud_restore');status(c.restored);}
   else{state=result;measure(action==='save'?'collection_cloud_save':'collection_cloud_delete');status(action==='save'?c.saved:c.deleted);}
  }catch(e){if(turn!==epoch)return;state=null;status(e.message==='retry_later'?c.retry:e.message==='authentication_required'?c.auth:['conflict','account_changed'].includes(e.message)?c.conflict:e.message==='collection_too_large'?c.limit:c.failed);}
  finally{if(turn===epoch){busy=false;buttons();}}
 }
 for(const action of ['check','save','restore','delete'])q(action).addEventListener('click',()=>run(action));
 // Do not retain account data/authority across tab switches, sign-out or BFCache.
 win.addEventListener('blur',invalidate);win.addEventListener('pagehide',invalidate);win.addEventListener('pageshow',invalidate);
 return {invalidate,run};
}
if(typeof document!=='undefined'){if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',()=>initCloud(),{once:true});else initCloud();}
