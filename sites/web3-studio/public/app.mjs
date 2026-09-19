import {byId,enums,label} from './catalog.mjs';
import {run} from './engine.mjs';
import {parse,LIMIT,VERSION} from './core.mjs';
const $=id=>document.getElementById(id),id=document.body.dataset.site,site=byId[id];
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
const pretty=x=>JSON.stringify(x,null,2);let current=structuredClone(site.sample),report=null,ownCompleted=false,editingJson=false;
function invalidate(message='Inputs changed. Run the tool to update the result.') {report=null;$('result').hidden=true;$('report-output').value='';$('export-report').disabled=true;$('copy-report').disabled=true;$('status').textContent=message;}
function sync(){ $('json-input').value=pretty(current);invalidate();}
function control(key,value,onChange,scope){
 const wrap=el('label'),name=label(key),input=enums[key]?el('select'):el('input');wrap.append(el('span',name));input.setAttribute('aria-label',scope+' '+name);
 if(enums[key]){for(const option of enums[key]){const n=el('option',option);n.value=option;input.append(n);}input.value=value;}
 else if(typeof value==='boolean'){input.type='checkbox';input.checked=value;}
 else{input.type=typeof value==='number'?'number':/^(date|asOf|expires)$/.test(key)?'date':'text';if(input.type==='number')input.step='any';input.value=value;input.autocomplete='off';input.spellcheck=false;}
 input.addEventListener('input',()=>{let v=typeof value==='boolean'?input.checked:typeof value==='number'?(input.value===''?null:Number(input.value)):input.value;onChange(v);sync();});wrap.append(input);return wrap;
}
function renderEditor(){
 const root=$('form-fields');root.replaceChildren();const basics=el('div',undefined,'field-grid');root.append(basics);
 for(const [key,value]of Object.entries(current)){
  if(!Array.isArray(value)){basics.append(control(key,value,v=>current[key]=v,'Settings'));continue;}
  const section=el('section',undefined,'record-section');section.append(el('h3',label(key)+' ('+value.length+')'));
  value.forEach((row,index)=>{const details=el('details',undefined,'record');details.open=index<2;details.append(el('summary',label(key)+' '+(index+1)+(row.id?' · '+row.id:'')));const fields=el('div',undefined,'field-grid');for(const[k,v]of Object.entries(row))fields.append(control(k,v,n=>current[key][index][k]=n,label(key)+' '+(index+1)));details.append(fields);const remove=el('button','Remove record','subtle');remove.type='button';remove.setAttribute('aria-label','Remove '+key+' record '+(index+1));remove.addEventListener('click',()=>{current[key].splice(index,1);sync();renderEditor();});details.append(remove);section.append(details);});
  const add=el('button','Add '+label(key).toLowerCase()+' record','secondary');add.type='button';add.addEventListener('click',()=>{if(current[key].length>=200){$('status').textContent='Maximum 200 records. Some tools have a lower limit shown in the guide.';return;}const template=site.sample[key][0],row=Object.fromEntries(Object.entries(template).map(([k,v])=>[k,typeof v==='boolean'?false:typeof v==='number'?0:'']));current[key].push(row);sync();renderEditor();});section.append(add);root.append(section);
 }
}
function validateShapeForEditor(data){
 const keys=Object.keys(site.sample);if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==keys.length||keys.some(k=>!Object.hasOwn(data,k)))throw Error('Use the complete input structure from this tool’s example.');
 for(const k of keys){if(Array.isArray(site.sample[k])){if(!Array.isArray(data[k])||data[k].length>200)throw Error(k+' must be an array of at most 200 records.');for(const row of data[k]){if(!row||typeof row!=='object'||Array.isArray(row))throw Error(k+' contains a non-record.');const template=site.sample[k][0];if(Object.keys(row).length!==Object.keys(template).length||Object.keys(template).some(f=>!Object.hasOwn(row,f)||typeof row[f]!==typeof template[f]))throw Error(k+' record fields/types must match the example.');}}else if(typeof data[k]!==typeof site.sample[k])throw Error(k+' has the wrong type.');}return data;
}
function load(data,message){current=validateShapeForEditor(data);$('json-input').value=pretty(current);renderEditor();invalidate(message);}
function renderResult(output){
 $('result').hidden=false;$('result-title').textContent=output.title;$('result-summary').textContent=output.summary;
 const metrics=$('metrics');metrics.replaceChildren();for(const m of output.metrics){const box=el('div');box.append(el('strong',m.value),el('span',m.label));metrics.append(box);}
 const tables=$('tables');tables.replaceChildren();for(const t of output.tables){const box=el('div',undefined,'table-scroll'),tab=el('table');tab.append(el('caption',t.title));const head=el('thead'),tr=el('tr');t.columns.forEach(c=>{const th=el('th',c);th.scope='col';tr.append(th);});head.append(tr);tab.append(head);const body=el('tbody');if(!t.rows.length){const row=el('tr'),td=el('td','No records in this category.');td.colSpan=t.columns.length;row.append(td);body.append(row);}for(const row of t.rows){const tr=el('tr');row.forEach(v=>tr.append(el('td',v??'Unknown')));body.append(tr);}tab.append(body);box.append(tab);tables.append(box);}
 const notes=$('notes');notes.replaceChildren();output.notes.forEach(n=>notes.append(el('li',n)));
}
function download(filename,text){const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);$('status').textContent='Download requested. If your browser blocks it, use the report text below.';}
$('load-example').addEventListener('click',()=>{$('input-source').value='example';load(structuredClone(site.sample),'Fictional example loaded.');});
$('input-source').addEventListener('change',()=>invalidate('Input source changed. Run again.'));
$('clear').addEventListener('click',()=>{$('input-source').value='own';const blank=Object.fromEntries(Object.entries(site.sample).map(([k,v])=>[k,Array.isArray(v)?[]:typeof v==='number'?0:typeof v==='boolean'?false:enums[k]?enums[k][0]:'']));load(blank,'Add your records and settings.');});
$('editor-mode').addEventListener('change',()=>{const useJson=$('editor-mode').value==='json';if(!useJson){try{load(parse($('json-input').value),'JSON loaded into the form.');}catch(e){$('editor-mode').value='json';$('status').textContent=e.message;return;}}editingJson=useJson;$('form-fields').hidden=useJson;$('json-panel').hidden=!useJson;});
$('json-input').addEventListener('input',()=>invalidate());
$('import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>LIMIT)throw Error('Use an input file smaller than 128 KiB.');const data=parse(await file.text());load(data,'Local JSON imported. No input was uploaded.');$('input-source').value='own';}catch(error){invalidate(error.message);}finally{e.target.value='';}});
$('run').addEventListener('click',()=>{try{const input=editingJson?$('json-input').value:pretty(current),out=run(id,input);report={tool:id,version:VERSION,createdAt:new Date().toISOString(),inputSource:$('input-source').value,result:out};renderResult(out);$('report-output').value=pretty(report);$('export-report').disabled=false;$('copy-report').disabled=false;$('status').textContent='Review complete. The report is ready.';if($('input-source').value==='own')ownCompleted=true;$('result-title').focus();}catch(e){invalidate(e.message);$('status').focus();}});
$('export-report').addEventListener('click',()=>{if(report)download(id+'-report.json',pretty(report)+'\n');});
$('save-input').addEventListener('click',()=>{try{download(id+'-input.json',pretty(parse(editingJson?$('json-input').value:pretty(current)))+'\n');}catch(e){$('status').textContent=e.message;}});
$('copy-report').addEventListener('click',async()=>{if(!report)return;try{await navigator.clipboard.writeText($('report-output').value);$('status').textContent='Report copied.';}catch{$('report-details').open=true;$('report-output').focus();$('report-output').select();$('status').textContent='Report text selected. Use your device’s Copy command.';}});
$('feedback').addEventListener('submit',async e=>{e.preventDefault();const status=$('feedback-status');status.textContent='Sending your choices…';try{const res=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),frequency:$('frequency').value,usefulness:$('usefulness').value,interest:$('interest').value,ownCompleted,qa:new URL(location.href).searchParams.get('qa')==='1'})});if(!res.ok)throw Error('Feedback could not be saved. You can still use every tool.');status.textContent='Feedback saved. Thank you.';}catch(e){status.textContent=e.message;}});
if($('fingerprint'))$('fingerprint').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>10*1024*1024)throw Error('Use a file of 10 MiB or less.');const bytes=await crypto.subtle.digest('SHA-256',await f.arrayBuffer());$('fingerprint-result').textContent='sha256:'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}catch(error){$('fingerprint-result').textContent=error.message;}finally{e.target.value='';}});
load(current,'Fictional example loaded. Replace it with your records when ready.');
