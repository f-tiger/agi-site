import {UTILITY_LIMITS,parseJSONExact,formatJSONExact,diffJSONExact,imageHeader,fitImage,planMeeting,calendarFile} from './utility-core.mjs?v=2026-09-27.2';
import {track} from './telemetry.mjs?v=2026-09-27.2';
const $=id=>document.getElementById(id),form=$('utility-form'),task=form.dataset.utility,u=JSON.parse($('utility-copy').textContent),result=$('utility-result');
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let epoch=0,busy=false,isSample=false,files=[];const urls=new Set();
const urlFor=blob=>{const url=URL.createObjectURL(blob);urls.add(url);return url;};
const errorText=e=>(u.errors[e.message]||u.errors.unknown)+(e.line?` ${u.line} ${e.line}, ${u.column} ${e.column}.`:'');
function status(text,error=false){$('utility-status').textContent=text;$('utility-status').classList.toggle('error',error);}
function reset(){epoch++;result.hidden=true;result.replaceChildren();for(const url of urls)URL.revokeObjectURL(url);urls.clear();}
function setBusy(value){busy=value;for(const control of form.querySelectorAll('input,select,textarea,button'))control.disabled=value&&control.id!=='utility-clear';if(!value&&task==='image')$('image-quality').disabled=$('image-format').value==='image/png';form.setAttribute('aria-busy',String(value));}
function setSample(value){isSample=value;$('utility-sample-note').hidden=!value;}
function download(text,name,type='application/json'){const a=document.createElement('a');a.href=urlFor(new Blob([text],{type}));a.download=name;a.className='button';a.textContent=task==='meeting'?u.calendar:u.export;a.addEventListener('click',()=>{if(!isSample)track('doc_utility_export');});result.append(a);}
function show(){result.hidden=false;result.focus({preventScroll:true});status(u.done);}
function meetingDefaults(){if(task!=='meeting')return;const tomorrow=new Date(Date.now()+86400000);$('time-date').value=[tomorrow.getFullYear(),String(tomorrow.getMonth()+1).padStart(2,'0'),String(tomorrow.getDate()).padStart(2,'0')].join('-')+'T09:00';const z=Intl.DateTimeFormat().resolvedOptions().timeZone;$('time-zone').value=u.zoneNames[z]?z:'UTC';}
meetingDefaults();
form.addEventListener('input',()=>{if(!busy){reset();status(u.ready);}});
$('utility-clear').addEventListener('click',()=>{reset();form.reset();files=[];setSample(false);setBusy(false);meetingDefaults();if($('utility-selected'))$('utility-selected').textContent=u.empty;status(u.ready);});
if(task==='image'){
 $('utility-files').addEventListener('change',()=>{reset();files=[...$('utility-files').files];setSample(false);$('utility-selected').textContent=files.length?files.map(f=>f.name).join(' · '):u.empty;status(u.ready);});
 $('image-format').addEventListener('change',()=>{$('image-quality').disabled=$('image-format').value==='image/png';});
}
if(task==='json')for(const side of ['before','after'])$('json-file-'+side).addEventListener('change',async()=>{reset();const current=epoch,file=$('json-file-'+side).files[0];if(!file)return;try{if(file.size>UTILITY_LIMITS.jsonBytes)throw Error('jsonSize');const buffer=await file.arrayBuffer();let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{throw Error('jsonSyntax');}if(current!==epoch)return;$('json-'+side).value=text;setSample(false);status(u.ready);}catch(e){if(current===epoch)status(errorText(e),true);}});
const png=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('imageDecode')),'image/png'));
$('utility-sample').addEventListener('click',async()=>{if(busy)return;reset();setSample(true);const current=epoch;
 if(task==='image'){setBusy(true);try{const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=1000;const ctx=canvas.getContext('2d');const gradient=ctx.createLinearGradient(0,0,1500,1000);gradient.addColorStop(0,'#e4002b');gradient.addColorStop(1,'#111114');ctx.fillStyle=gradient;ctx.fillRect(0,0,1500,1000);ctx.fillStyle='#fff';ctx.fillRect(120,140,760,520);ctx.fillStyle='#e4002b';ctx.font='bold 100px sans-serif';ctx.fillText('TDS',190,400);const blob=await png(canvas);canvas.width=canvas.height=1;if(current!==epoch)return;files=[new File([blob],'tds-example.png',{type:'image/png'})];$('utility-selected').textContent=files[0].name;$('image-width').value='1000';$('image-height').value='1000';}catch(e){status(errorText(e),true);setBusy(false);return;}setBusy(false);}
 if(task==='json'){for(const side of ['before','after'])$('json-'+side).value=u.samples.json[side];}
 if(task==='meeting'){const s=u.samples.meeting;$('time-date').value=s.local;$('time-zone').value=s.zone;$('time-duration').value=s.duration;$('time-title').value=u.sample;$('time-notes').value='';$('time-occurrence').value='reject';for(const input of form.querySelectorAll('[name=zone]'))input.checked=s.zones.includes(input.value);}
 await perform(task==='json'?'compare':undefined);
});
form.addEventListener('submit',event=>{event.preventDefault();perform(event.submitter?.value);});
async function perform(operation){if(busy)return;reset();const current=epoch;setBusy(true);status(u.working);let complete=false;
 try{
  result.innerHTML=`<h2>${esc(u.result)}</h2>`;
  if(task==='image')complete=await images(current);
  if(task==='json'){const before=parseJSONExact($('json-before').value);
   if(operation==='compare'){const after=parseJSONExact($('json-after').value),changes=diffJSONExact(before,after);result.innerHTML+=changes.length?`<div class="table-scroll"><table><thead><tr>${[u.path,u.changed,u.before,u.after].map(s=>`<th scope="col">${esc(s)}</th>`).join('')}</tr></thead><tbody>${changes.map(r=>`<tr><th scope="row">${esc(r.path||u.root)}</th><td>${esc(u[r.kind])}</td><td><pre>${esc(r.before??'—')}</pre></td><td><pre>${esc(r.after??'—')}</pre></td></tr>`).join('')}</tbody></table></div>`:`<p>${esc(u.noChanges)}</p>`;download(JSON.stringify({format:'tds-json-diff-v1',arrayComparison:'index',changes},null,2),'tds-json-changes.json');}
   else{const formatted=formatJSONExact(before,{sort:$('json-sort').checked,pretty:!$('json-minify').checked});result.innerHTML+=`<p>${esc(u.valid)}</p><pre>${esc(formatted)}</pre>`;download(formatted+'\n','formatted.json');}complete=true;
  }
  if(task==='meeting'){const plan=planMeeting({local:$('time-date').value,zone:$('time-zone').value,duration:$('time-duration').value,occurrence:$('time-occurrence').value,zones:[...form.querySelectorAll('[name=zone]:checked')].map(i=>i.value)});const pad=n=>String(n).padStart(2,'0'),display=p=>`${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
   result.innerHTML+=`<p>${esc(new Date(plan.start).toISOString())} → ${esc(new Date(plan.end).toISOString())}</p><div class="table-scroll"><table><thead><tr>${[u.zone,u.start,u.end,u.hours].map(s=>`<th scope="col">${esc(s)}</th>`).join('')}</tr></thead><tbody>${plan.rows.map(r=>`<tr><th scope="row">${esc(u.zoneNames[r.zone])}<br><small>${esc(r.zone)}</small></th><td>${display(r.start)}</td><td>${display(r.end)}</td><td>${esc(r.outside?u.outside:u.inside)}</td></tr>`).join('')}</tbody></table></div>`;
   download(calendarFile({...plan,title:$('time-title').value,description:$('time-notes').value,uid:crypto.randomUUID()}),'tds-meeting.ics','text/calendar;charset=utf-8');complete=true;
  }
  if(current!==epoch)return;show();if(isSample)track('doc_'+task+'_sample');else if(complete)track('doc_'+task+'_complete');
 }catch(e){if(current===epoch){reset();status(errorText(e),true);}}
 finally{if(current===epoch||!result.hasChildNodes())setBusy(false);}
}
async function images(current){if(!files.length||files.length>UTILITY_LIMITS.imageFiles||files.reduce((n,f)=>n+f.size,0)>UTILITY_LIMITS.imageTotal)throw Error('imageCount');const maxWidth=Number($('image-width').value),maxHeight=Number($('image-height').value),format=$('image-format').value,quality=Number($('image-quality').value)/100;if(!['image/png','image/jpeg','image/webp'].includes(format))throw Error('imageFormat');fitImage(1,1,maxWidth,maxHeight);if(!Number.isFinite(quality)||quality<.01||quality>1)throw Error('imageDimensions');let succeeded=0;
 for(const file of files){let bitmap,canvas;try{if(file.size>UTILITY_LIMITS.imageBytes)throw Error('imageSize');const buffer=await file.arrayBuffer();imageHeader(buffer);bitmap=await createImageBitmap(new Blob([buffer]));if(current!==epoch)return false;if(bitmap.width*bitmap.height>UTILITY_LIMITS.imagePixels)throw Error('imagePixels');const dimensions=fitImage(bitmap.width,bitmap.height,maxWidth,maxHeight);canvas=document.createElement('canvas');Object.assign(canvas,dimensions);const ctx=canvas.getContext('2d');if(!ctx)throw Error('imageDecode');if(format==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('imageDecode')),format,quality));if(current!==epoch)return false;if(blob.type!==format)throw Error('imageFormat');const url=urlFor(blob),ratio=(blob.size-file.size)/file.size*100,extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[format];
  const article=document.createElement('article');article.className='utility-image-result';article.innerHTML=`<img src="${url}" alt=""><div><h3>${esc(file.name)}</h3><p>${esc(u.before)}: ${bitmap.width} × ${bitmap.height} · ${file.size.toLocaleString()} B</p><p>${esc(u.after)}: ${dimensions.width} × ${dimensions.height} · ${blob.size.toLocaleString()} B</p><p>${Math.abs(ratio).toFixed(1)}% ${esc(ratio>0?u.larger:ratio<0?u.smaller:u.sameSize)}</p></div><a class="button" href="${url}" download="${esc(file.name.replace(/\.[^.]*$/,'').replace(/[\x00-\x1f<>:"/\\|?*]/g,'_').slice(0,100)||'image')}-tds.${extension}">${esc(u.download)}</a>`;article.querySelector('a').addEventListener('click',()=>{if(!isSample)track('doc_utility_export');});result.append(article);succeeded++;
 }catch(e){if(current!==epoch)return false;const p=document.createElement('p');p.className='notice error';p.textContent=file.name+' — '+u.failed+': '+errorText(e);result.append(p);}finally{bitmap?.close();if(canvas)canvas.width=canvas.height=1;}}
 return succeeded===files.length;
}
