import {attribution,pageName,pageNames,events} from './attribution.mjs';
const page=pageName(location.pathname),source=attribution(location.href,document.referrer),sent=new Set();
const params=new URL(location.href).searchParams,probe=params.get('__probe')==='1'||params.get('qa')==='1';
const control=document.getElementById('measurement-optin');let enabled=false;
const privacySignal=navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
if(control){control.disabled=probe||privacySignal;control.addEventListener('change',()=>{enabled=control.checked;if(enabled)track('page_view');});}
export function track(event){
 if(!enabled||probe||privacySignal||!events.includes(event)||!pageNames.includes(page)||sent.has(event))return;
 sent.add(event);fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({id:crypto.randomUUID(),event,page,...source,consent:true,qa:false})}).then(r=>{if(!r.ok)sent.delete(event);}).catch(()=>sent.delete(event));
}
document.addEventListener('web3:measure',e=>track(e.detail));
document.addEventListener('click',e=>{
 const a=e.target.closest('a');if(!a)return;
 let u;try{u=new URL(a.href);}catch{return;}
 if(u.hostname.endsWith('.agiscorecard.com')){
  if(u.pathname==='/for-agents.html')track('mcp_setup');
  if(u.hostname!==location.hostname&&/^https:\/\/(reconcile|evidence|route|protocol|permit|compute|incentives|proof|calls|disclosures)\.agiscorecard\.com/.test(u.href))track('tool_open');
  if(pageNames.includes(pageName(u.pathname))){
   if(source.channel!=='direct')u.searchParams.set('channel',source.channel);
   if(source.campaign!=='none'&&!u.searchParams.has('via'))u.searchParams.set('via',source.campaign);
   a.href=u.href;
  }
 }
 if(a.dataset.track)track(a.dataset.track);
});
