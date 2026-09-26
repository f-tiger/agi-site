import { DELIVERY_LIMITS, validateDeliveryFiles, fingerprint, deliveryRecord, parseDeliveryRecord, compareInventory, recordHTML, esc } from './delivery-core.mjs?v=2026-09-25.8';
import { referenceURL } from './verify-core.mjs?v=2026-09-25.8';
import { track } from './app.mjs?v=2026-09-25.8';
const c=JSON.parse(document.getElementById('delivery-copy').textContent), $=id=>document.getElementById('delivery-'+id);
let record=null, epoch=0, isSample=false, interestSent=false;
const downloads=new Set();
const reset=()=>{epoch++;record=null;$('result').hidden=true;$('result').replaceChildren();$('comparison').replaceChildren();$('verify-status').textContent='';for(const url of downloads)URL.revokeObjectURL(url);downloads.clear();};
function invalidate(){reset();$('status').textContent=c.stale;}
for(const el of $('form').querySelectorAll('input,textarea'))el.addEventListener('input',invalidate);
$('manifest').addEventListener('input',()=>{$('comparison').replaceChildren();$('verify-status').textContent='';epoch++;});
$('files').addEventListener('change',()=>{$('selected').textContent=Array.from($('files').files,f=>f.name).join(', ')||c.empty;isSample=false;});
function busy(value){for(const el of document.querySelectorAll('#delivery-form input,#delivery-form textarea,#delivery-build,#delivery-sample,#delivery-check,#delivery-manifest'))el.disabled=value;$('form').setAttribute('aria-busy',String(value));}
const errorText=e=>c[({files:'filesError',size:'sizeError',total:'totalError',names:'namesError',manifest:'manifestError'})[e.message]]||c.readError;
async function fingerprints(files){validateDeliveryFiles(files);const out=[];for(const f of files)out.push(await fingerprint(f));return out;}
function render(){const r=record;$('result').innerHTML=`<h2>${esc(c.result)}</h2>${isSample?`<p class="notice">${esc(c.sampleLabel)}</p>`:''}<h3>${esc(r.project)}</h3><p>${esc(c.scopeBody)}</p><div class="table-scroll"><table><thead><tr><th>${esc(c.file)}</th><th>${esc(c.bytes)}</th><th>${esc(c.hash)}</th></tr></thead><tbody>${r.files.map((f,i)=>`<tr><td>${esc(f.name)}</td><td>${f.bytes}</td><td class="delivery-digest">${f.sha256}<button class="delivery-recipient-link" data-recipient-copy="${i}">${esc(c.recipientCopy)}</button></td></tr>`).join('')}</tbody></table></div><p class="small">${esc(c.linkPrivacy)}</p><p id="delivery-recipient-status" role="status"></p><h3>${esc(c.notes)}</h3>${['scope','delivery','acceptance'].map(k=>`<p><strong>${esc(c[k])}</strong></p><pre>${esc(r.notes[k]||c.missingNote)}</pre>`).join('')}<p>${esc(c.private)}</p><div class="actions"><button data-delivery-export="json">${esc(c.downloadJSON)}</button><button data-delivery-export="html">${esc(c.downloadHTML)}</button></div><p id="delivery-download-status" role="status"></p>`;$('result').hidden=false;$('result').focus();}
async function create(files,sample=false,notes){reset();const current=epoch;isSample=sample;busy(true);$('status').textContent=c.working;
 try{const fs=await fingerprints(files);if(current!==epoch)return;record=deliveryRecord(fs,notes||Object.fromEntries(['project','scope','delivery','acceptance'].map(k=>[k,$(k).value])));render();$('status').textContent=c.ready;track(sample?'doc_delivery_sample':'doc_delivery_complete');}
 catch(e){if(current===epoch)$('status').textContent=errorText(e);}finally{busy(false);}
}
$('form').addEventListener('submit',event=>{event.preventDefault();create(Array.from($('files').files));});
$('sample').addEventListener('click',()=>create([new File(['Fictional handoff example. No real customer data.\n'],'fictional-deliverable.txt',{type:'text/plain'})],true,{project:'Fictional design handoff',scope:'Example only: a one-page design, described in the original project email.',delivery:'Example only: retain the original email and exact attachment. No delivery has occurred.',acceptance:''}));
$('clear').addEventListener('click',()=>{reset();$('form').reset();$('manifest').value='';$('selected').textContent=c.empty;$('status').textContent='';isSample=false;});
$('result').addEventListener('click',event=>{const button=event.target.closest('[data-delivery-export]');if(!button||!record)return;
 try{const type=button.dataset.deliveryExport;const data=type==='json'?JSON.stringify(record,null,2):recordHTML(record);const url=URL.createObjectURL(new Blob([data],{type:type==='json'?'application/json':'text/html;charset=utf-8'}));downloads.add(url);const a=document.createElement('a');a.href=url;a.download=`tds-${isSample?'fictional-':''}delivery-record.${type}`;a.textContent=c.recordReady;$('download-status').replaceChildren(a);a.click();if(!isSample)track('doc_delivery_export');}
 catch{$('download-status').textContent=c.downloadError;}
});
$('check').addEventListener('click',async()=>{const current=++epoch;$('comparison').replaceChildren();$('verify-status').textContent=c.working;busy(true);
 try{const expected=parseDeliveryRecord($('manifest').value);const actual=await fingerprints(Array.from($('files').files));if(current!==epoch)return;const rows=compareInventory(expected,actual);for(const row of rows){const li=document.createElement('li');li.textContent=`${row.name}: ${c[row.status]}`;$('comparison').append(li);}$('verify-status').textContent=c.verifyDone;track('doc_delivery_verify');}
 catch(e){if(current===epoch)$('verify-status').textContent=errorText(e);}finally{busy(false);}
});
const probe=new URLSearchParams(location.search).has('ci')||location.hostname!=='thedollscout.com'||navigator.webdriver||navigator.doNotTrack==='1';
document.addEventListener('click',async event=>{const button=event.target.closest('[data-delivery-interest]');if(!button||interestSent)return;const frequency=$('frequency').value;if(!frequency){$('interest-status').textContent=c.choose;return;}
 const buttons=document.querySelectorAll('[data-delivery-interest]');buttons.forEach(b=>b.disabled=true);
 try{if(!probe){const response=await fetch('/api/doc-events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({p:location.pathname,e:`doc_delivery_interest_${frequency}_${button.dataset.deliveryInterest}`}),signal:AbortSignal.timeout(10000)});if(response.status!==204)throw Error('not recorded');}interestSent=true;$('interest-status').textContent=probe?c.thanks.replace('Answer recorded.','Preview only.'):c.thanks;}
 catch{$('interest-status').textContent=c.queued;buttons.forEach(b=>b.disabled=false);}
});

$('result').addEventListener('click',async event=>{const button=event.target.closest('[data-recipient-copy]');if(!button||!record)return;
 const lang=document.documentElement.lang.startsWith('zh')?'zh':document.documentElement.lang;
 const url=referenceURL(record.files[Number(button.dataset.recipientCopy)],lang),output=$('recipient-status');
 try{await navigator.clipboard.writeText(url);output.textContent=c.recipientCopied;if(!isSample)track('doc_delivery_recipient_share');}
 catch{const input=document.createElement('input');input.readOnly=true;input.value=url;input.setAttribute('aria-label',c.recipientCopy);output.replaceChildren(input);input.focus();input.select();}
});
