import {auditCSV,serializeCSV,applyResults,checkTranslation,HEADERS} from './core.mjs';
const $=id=>document.getElementById(id);
export const SAMPLE=serializeCSV(HEADERS,[
{Type:'PRODUCT',Identification:'1001',Field:'title',Locale:'de',Market:'',Status:'', 'Default content':'Cedar insulated bottle, 750 ml','Translated content':''},
{Type:'PRODUCT',Identification:'1002',Field:'meta_description',Locale:'fr',Market:'',Status:'','Default content':'Cedar cotton tote with 2 inner pockets.','Translated content':''},
{Type:'PRODUCT',Identification:'1003',Field:'title',Locale:'es',Market:'',Status:'','Default content':'Cedar desk lamp, 12 W','Translated content':''},
{Type:'PRODUCT',Identification:'1004',Field:'title',Locale:'de',Market:'',Status:'','Default content':'Cedar linen cushion','Translated content':'Cedar Leinenkissen'},
{Type:'PRODUCT',Identification:'1005',Field:'body_html',Locale:'de',Market:'',Status:'','Default content':'<p>Cedar is our fictional sample brand.</p>','Translated content':''}
]);
let doc=null,results=[],config={available:false},job=null,poll=null;
function say(text,error=false){$('message').textContent=text;$('message').className='message'+(error?' error':'');}
function download(name,content,type='text/csv;charset=utf-8'){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function reset(){clearTimeout(poll);doc=null;results=[];$('delivery').hidden=true;$('reviewed').checked=false;$('sample-run').disabled=true;$('audit-export').disabled=true;$('purchase').disabled=true;$('rows').replaceChildren();for(const id of ['eligible','kept','chars'])$(id).textContent='—';$('summary').textContent='';$('mode').textContent='LOCAL CHECKER';}
function render(){
  $('eligible').textContent=doc.eligible;$('kept').textContent=doc.rows.length-doc.eligible;$('chars').textContent=doc.characters.toLocaleString();
  $('rows').replaceChildren();const byIndex=new Map(results.map(r=>[r.index,r]));
  for(const entry of doc.entries){const row=document.createElement('tr'),first=document.createElement('td'),source=document.createElement('td'),out=document.createElement('td');first.textContent=`${entry.index+2} · ${entry.locale}`;source.textContent=entry.source;const result=byIndex.get(entry.index);out.textContent=result?.output||result?.issue||entry.reason||'Ready to translate';const badge=document.createElement('div');badge.className='badge '+(result?.status||'');badge.textContent=result?.status||(entry.eligible?'ready':'kept');out.append(badge);row.append(first,source,out);$('rows').append(row);}
  $('sample-run').disabled=$('csv').value!==SAMPLE;$('audit-export').disabled=false;$('purchase').disabled=!config.available||!doc.eligible;
  $('delivery').hidden=!results.some(r=>r.status==='accepted');$('reviewed').checked=false;$('download').disabled=true;$('review-export').disabled=true;
  $('summary').textContent=doc.formulaCells?`${doc.formulaCells} formula-like source cells: use the spreadsheet-safe copy for manual review.`:'';
}
function audit(){try{reset();doc=auditCSV($('csv').value,$('glossary').value.split('\n').map(x=>x.trim()).filter(Boolean));render();say(`${doc.eligible} fields can be processed. ${doc.rows.length-doc.eligible} will stay unchanged.`);}catch(e){say(e.message,true);}}
$('audit').addEventListener('click',audit);
for(const id of ['csv','glossary'])$(id).addEventListener('input',()=>{reset();say('Content changed. Check this batch again.');});
$('file').addEventListener('change',async()=>{const file=$('file').files[0];if(!file)return;if(file.size>700000){say('Use a CSV smaller than 700 KB.',true);return;}$('csv').value=await file.text();audit();});
$('demo').addEventListener('click',()=>{$('csv').value=SAMPLE;$('glossary').value='Cedar';audit();$('workbench').scrollIntoView({behavior:'smooth'});});
$('sample-run').addEventListener('click',()=>{
  if(!doc||$('csv').value!==SAMPLE)return;
  const outputs=['Cedar Isolierflasche, 750 ml','Sac fourre-tout Cedar en coton avec 2 poches intérieures.','Lámpara de escritorio Cedar'];
  results=doc.entries.filter(e=>e.eligible).map((e,i)=>{const issues=checkTranslation(e,outputs[i]);return {index:e.index,status:issues.length?'blocked':'accepted',output:issues.length?null:outputs[i],issue:issues.join('; ')};});
  render();say('Fixed sample: 2 accepted, 1 blocked because “12” was lost. No AI provider was called.');$('mode').textContent='FIXED SAMPLE';
});
$('audit-export').addEventListener('click',()=>{if(doc)download('localebatch-check.json',JSON.stringify({eligible:doc.eligible,characters:doc.characters,checks:doc.entries.map(({source,protected:terms,...e})=>e)},null,2),'application/json');});
$('reviewed').addEventListener('change',()=>{const disabled=!$('reviewed').checked;$('download').disabled=disabled;$('review-export').disabled=disabled;});
$('download').addEventListener('click',()=>{if(doc&&$('reviewed').checked)download('shopify-translations-reviewed.csv',serializeCSV(doc.headers,applyResults(doc,results)));});
$('review-export').addEventListener('click',()=>{if(doc&&$('reviewed').checked)download('localebatch-spreadsheet-review.csv',serializeCSV(doc.headers,applyResults(doc,results),{spreadsheetSafe:true}));});
async function api(path,{method='GET',payload,auth=true}={}){const res=await fetch(path,{method,headers:{...(payload?{'Content-Type':'application/json'}:{}),...(auth&&job?{Authorization:'Bearer '+job.token}:{})},...(payload?{body:JSON.stringify(payload)}:{})});const data=await res.json();if(!res.ok)throw Error(data.error||'Request failed.');return data;}
function remember(){try{localStorage.setItem('localebatch:'+job.id,job.token);}catch{}$('job-id').value=job.id;$('job-key').value=job.token;$('sync').disabled=false;$('resume').disabled=false;}
async function refresh(){if(!job)return;const data=await api('/api/jobs/'+job.id);$('csv').value=data.input.csv;$('glossary').value=data.input.glossary.join('\n');doc=auditCSV(data.input.csv,data.input.glossary);results=data.results;render();$('mode').textContent='PAID BATCH';$('purchase').disabled=true;$('refund').disabled=!['paid','processing','completed','refund_pending'].includes(data.state);$('resume').disabled=!['paid','processing'].includes(data.state);$('job-message').textContent=`Batch: ${data.state}${data.refund?' · Refund: '+data.refund:''}. Files expire ${new Date(data.expires_at).toLocaleDateString()}.`;
  if(['paid','processing'].includes(data.state)){clearTimeout(poll);poll=setTimeout(()=>refresh().catch(e=>{$('job-message').textContent=e.message+' Use Open batch to retry.';}),6000);}else clearTimeout(poll);
}
$('purchase').addEventListener('click',async()=>{try{
  if(!doc||!$('consent').checked)throw Error('Confirm permission to process this catalog first.');$('purchase').disabled=true;
  const created=await api('/api/jobs',{method:'POST',auth:false,payload:{csv:$('csv').value,glossary:doc.glossary,consent:true}});job={id:created.id,token:created.token};remember();
  download('localebatch-recovery-'+job.id+'.json',JSON.stringify(job,null,2),'application/json');
  const checkout=await api('/api/jobs/'+job.id+'/checkout',{method:'POST'});location.assign(checkout.url);
}catch(e){say(e.message,true);$('purchase').disabled=!config.available;}});
$('recover').addEventListener('click',async()=>{try{job={id:$('job-id').value.trim(),token:$('job-key').value.trim()};await refresh();remember();}catch(e){$('job-message').textContent=e.message;}});
for(const action of ['sync','resume','refund'])$(action).addEventListener('click',async()=>{if(!job)return;try{
  if(action==='refund'&&!window.confirm('Request a full refund and stop further processing for this batch?'))return;
  $(action).disabled=true;await api('/api/jobs/'+job.id+'/'+action,{method:'POST'});await refresh();
}catch(e){$('job-message').textContent=e.message;}finally{if(action==='sync')$('sync').disabled=false;}});
async function init(){try{config=await api('/api/config',{auth:false});if(config.available){$('sales-state').textContent=`Paid pilot available. Seller: ${config.seller}. Support: ${config.support}. Check your file before checkout.`;$('purchase').textContent='Start this batch — €19 + tax';$('mode').textContent='LOCAL CHECKER';if(doc)render();}}catch{/* Offline review is intentionally useful without a server. */}
  const id=new URLSearchParams(location.search).get('job');if(id){$('job-id').value=id;let secret;try{secret=localStorage.getItem('localebatch:'+id);}catch{}if(secret){job={id,token:secret};remember();try{await api('/api/jobs/'+id+'/sync',{method:'POST'});await refresh();}catch(e){$('job-message').textContent=e.message;}}}
}
init();
