import {FILE_COPY} from './file-copy.mjs';
import {settings,recipe,readRecipe,checkFiles,classify,pages,safeName,bytes,LIMITS} from './file-core.mjs';
import {openPDF,decodeImage,processImage,assemblePDF,pdfLibrary,canvasBlob} from './file-engine.mjs';
import {escapeHTML as esc} from './file-view.mjs';

const root=document.getElementById('ft-workspace'),kind=root.dataset.kind,L=FILE_COPY[root.dataset.lang],pdf=kind==='pdf';
const $=id=>document.getElementById('ft-'+id),fields=pdf?['paper']:['width','height','fit','format','quality','background','remove','tolerance'];
let items=[],resultURLs=[],busy=false,serial=0,sequence=0;
const emit=action=>{const q=new URLSearchParams(location.search);if(window.bpjEv&&!q.has('__ci')&&!q.has('__probe'))window.bpjEv('calc','/studio/'+(pdf?'pdf-tools':'product-images')+'/'+action+'/'+(items.some(i=>i.demo)?'demo':'own'));};
const status=(message,error=false)=>{$('status').textContent=message;$('status').parentElement.dataset.error=String(error);};
const message=error=>L.errors[error.message]||L.errors.generic;
function values(){return settings(Object.fromEntries(fields.map(k=>[k,k==='remove'?$(k).checked:$(k).value])));}
function apply(s){for(const k of fields)if(k==='remove')$(k).checked=s[k];else $(k).value=s[k];}
function invalidate(notify=true){for(const url of resultURLs)URL.revokeObjectURL(url);resultURLs=[];$('output').replaceChildren();$('output-section').hidden=true;if(notify)status(L.changed);}
function setBusy(value){busy=value;$('controls').disabled=value;$('cancel').hidden=!value;$('progress').hidden=!value;if(value){$('cancel').disabled=false;$('progress').value=0;status(L.processing);}}
function render(){
  $('files').innerHTML=items.length?items.map((item,index)=>`<li data-id="${item.id}"><span class="file-name">${index+1}. ${esc(item.file.name)}</span><span class="file-meta">${bytes(item.file.size)} · ${item.type==='pdf'?item.count+' '+L.page:item.width+' × '+item.height}</span>${item.preview?`<img class="file-source-preview" src="${item.preview}" alt="${esc(L.before+' — '+item.file.name)}">`:''}${item.demo?`<p class="file-demo">${L.demo}</p>`:''}${pdf?`<div class="file-row-settings">${item.type==='pdf'?`<label>${L.range}<input data-range value="${esc(item.range)}" placeholder="${L.all}" aria-label="${esc(L.range+' — '+item.file.name)}"></label>`:''}<label>${L.rotation}<select data-rotation aria-label="${esc(L.rotation+' — '+item.file.name)}">${[0,90,180,270].map(n=>`<option value="${n}" ${n===item.rotation?'selected':''}>${n}°</option>`).join('')}</select></label></div>`:''}<div class="file-file-actions"><button type="button" data-action="up" ${index===0?'disabled':''} aria-label="${esc(L.up+' — '+item.file.name)}">↑ ${L.up}</button><button type="button" data-action="down" ${index===items.length-1?'disabled':''} aria-label="${esc(L.down+' — '+item.file.name)}">↓ ${L.down}</button><button type="button" data-action="remove" aria-label="${esc(L.remove+' — '+item.file.name)}">${L.remove}</button></div></li>`).join(''):`<li class="file-empty">${L.empty}</li>`;
}
async function add(files,demo=false){
  if(busy)return;try{checkFiles(items.map(i=>i.file),files,kind);}catch(e){status(message(e),true);return;}
  invalidate(false);setBusy(true);status(L.loading);const token=++serial,errors=[];const pending=[];
  for(const file of files){
    if(token!==serial)break;
    try{const type=classify(file),item={id:++sequence,file,type,range:'',rotation:0,demo};
      if(type==='pdf'){const doc=await openPDF(file);item.count=doc.getPageCount();}
      else{const img=await decodeImage(file);item.width=img.naturalWidth;item.height=img.naturalHeight;item.preview=URL.createObjectURL(file);}
      pending.push(item);
    }catch(e){errors.push(file.name+': '+message(e));}
    $('progress').max=files.length;$('progress').value=pending.length+errors.length;
  }
  if(token!==serial){for(const i of pending)if(i.preview)URL.revokeObjectURL(i.preview);setBusy(false);return;}
  items.push(...pending);render();setBusy(false);status(errors.length?errors.join(' · '):L.ready,!!errors.length);if(pending.length)emit('add');
}
function clear(){if(busy)return;for(const i of items)if(i.preview)URL.revokeObjectURL(i.preview);items=[];invalidate(false);render();status('');$('input').value='';}
$('add').addEventListener('click',()=>$('input').click());
$('input').addEventListener('change',async()=>{const files=Array.from($('input').files);$('input').value='';if(files.length)await add(files);});
$('clear').addEventListener('click',clear);
$('files').addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button||busy)return;
  const index=items.findIndex(i=>String(i.id)===button.closest('li').dataset.id),action=button.dataset.action;
  if(action==='remove'){const [item]=items.splice(index,1);if(item.preview)URL.revokeObjectURL(item.preview);}else{const next=index+(action==='up'?-1:1);if(next<0||next>=items.length)return;[items[index],items[next]]=[items[next],items[index]];}
  invalidate();render();
});
$('files').addEventListener('input',event=>{const row=event.target.closest('li[data-id]');if(!row||busy)return;const item=items.find(i=>String(i.id)===row.dataset.id);if(event.target.hasAttribute('data-range'))item.range=event.target.value;if(event.target.hasAttribute('data-rotation'))item.rotation=Number(event.target.value);invalidate();});
for(const key of fields)$(key).addEventListener('input',()=>{invalidate();$('link-label').hidden=true;});
$('cancel').addEventListener('click',()=>{serial++;status(L.cancelled);$('cancel').disabled=true;});
function progress(done,total){$('progress').max=total;$('progress').value=done;status(L.processing+' '+done+' / '+total);}
function url(blob){const value=URL.createObjectURL(blob);resultURLs.push(value);return value;}
function downloadLink(blob,name,label){return `<a class="studio-button primary" download="${esc(name)}" href="${url(blob)}">${label}</a>`;}
$('run').addEventListener('click',async()=>{
  if(busy)return;if(!items.length){status(L.errors.empty,true);return;}
  for(const key of fields)if(!$(key).reportValidity())return;
  if(pdf){try{let total=0;for(const item of items)total+=item.type==='pdf'?pages(item.range,item.count).length:1;if(total>LIMITS.pages)throw Error('pages');}catch(e){status(message(e),true);return;}}
  invalidate(false);setBusy(true);$('cancel').disabled=false;const token=++serial,alive=()=>token===serial,s=values();
  try{
    if(pdf){const result=await assemblePDF(items,s,progress,alive);if(!alive())return;
      const href=url(result.blob);$('output').innerHTML=`<div class="file-output-summary"><p>${result.pages} ${L.page} · ${bytes(result.blob.size)}</p><div class="studio-actions"><a class="studio-button primary" download="bpj-document.pdf" href="${href}">${L.downloadPDF}</a><a class="studio-button" target="_blank" rel="noopener" href="${href}">${L.openPDF}</a></div><p class="quote-note">${L.pdfScope}</p></div>`;
    }else{
      const outputs=[],errors=[];let total=0;
      for(let index=0;index<items.length;index++){
        if(!alive())return;const item=items[index];
        try{const out=await processImage(item.file,s);total+=out.blob.size;if(total>LIMITS.outputBytes)throw Error('output');outputs.push({...out,original:item.file.size,name:safeName(item.file.name,index,s.format==='jpeg'?'jpg':s.format)});}
        catch(e){errors.push(item.file.name+': '+message(e));}progress(index+1,items.length);await new Promise(r=>setTimeout(r,0));
      }
      if(!alive())return;
      if(outputs.length){const {zipSync}=await import('./vendor/fflate-0.8.2.mjs');const entries={};for(const out of outputs)entries[out.name]=new Uint8Array(await out.blob.arrayBuffer());if(!alive())return;
        const zip=new Blob([zipSync(entries,{level:0})],{type:'application/zip'});
        $('output').innerHTML=`<div class="file-output-summary"><p>${outputs.length} / ${items.length} · ${L.total} ${bytes(outputs.reduce((n,o)=>n+o.blob.size,0))}</p>${downloadLink(zip,'bpj-product-images.zip',L.zip)}</div><div class="file-output-grid">${outputs.map(out=>`<article class="file-output-item"><img src="${url(out.blob)}" alt="${esc(L.preview+' — '+out.name)}"><p>${esc(out.name)}<br>${out.width} × ${out.height}<br>${L.before}: ${bytes(out.original)} → ${L.after}: ${bytes(out.blob.size)}</p>${downloadLink(out.blob,out.name,L.download)}</article>`).join('')}</div>`;
      }
      if(errors.length){const note=document.createElement('p');note.className='file-error';note.textContent=errors.join(' · ');$('output').append(note);$('output-section').hidden=false;status(L.failed,true);if(outputs.length)emit('complete');return;}
    }
    if(alive()){$('output-section').hidden=false;status(L.done);emit('complete');}
  }catch(e){if(alive())status(message(e),true);}
  finally{setBusy(false);$('cancel').disabled=false;if(!alive()){invalidate(false);status(L.cancelled);}}
});
$('output').addEventListener('click',event=>{if(event.target.closest('a[download]'))emit('download');});
$('share').addEventListener('click',async()=>{
  for(const key of fields)if(!$(key).reportValidity())return;
  const target=new URL(location.href);target.search='';target.hash='settings='+btoa(JSON.stringify(recipe(kind,values())));$('link').value=target.href;$('link-label').hidden=false;
  try{await navigator.clipboard.writeText(target.href);status(L.shared);}catch{status(L.link);$('link').focus();$('link').select();}emit('share');
});
$('sample').addEventListener('click',async()=>{
  if(busy)return;clear();setBusy(true);const sampleToken=++serial;
  try{const files=[];
    if(pdf){const {PDFDocument,rgb}=await pdfLibrary();for(let d=0;d<2;d++){const doc=await PDFDocument.create();for(let p=0;p<2;p++){const page=doc.addPage([420,595]);page.drawText('BPJ SAMPLE '+(d+1)+' / '+(p+1),{x:36,y:520,size:22});page.drawRectangle({x:36,y:200,width:260,height:220,color:rgb(d?.12:.1,.35,p?.35:.85)});page.drawText('Synthetic file. No customer data.',{x:36,y:160,size:12});}files.push(new File([await doc.save()],'bpj-sample-'+(d+1)+'.pdf',{type:'application/pdf'}));}}
    else{for(let n=0;n<2;n++){const c=document.createElement('canvas');c.width=n?800:600;c.height=n?600:800;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=n?'#1f7a5c':'#1b4de4';ctx.fillRect(c.width*.3,c.height*.2,c.width*.4,c.height*.6);ctx.fillStyle='#ffffff';ctx.fillRect(c.width*.36,c.height*.4,c.width*.28,c.height*.2);ctx.fillStyle='#141414';ctx.font='bold 26px sans-serif';ctx.textAlign='center';ctx.fillText('BPJ',c.width*.5,c.height*.52);files.push(new File([await canvasBlob(c,'image/png')],'bpj-sample-'+(n+1)+'.png',{type:'image/png'}));}}
    setBusy(false);if(sampleToken!==serial){status(L.cancelled);return;}await add(files,true);
  }catch(e){setBusy(false);status(message(e),true);}
});
try{if(location.hash.startsWith('#settings=')){if(location.hash.length>2000)throw Error('recipe');apply(readRecipe(JSON.parse(atob(location.hash.slice(10))),kind));status(L.restored);}}catch{status(L.invalidRecipe,true);}
window.addEventListener('pagehide',()=>{serial++;busy=false;clear();});

document.querySelector('[data-ft-next=video]')?.addEventListener('click',()=>emit('next-video'));
