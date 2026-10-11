import {styleProbability} from './style-odds-core.mjs';
export function initSeriesChecklist(root, record, {core=globalThis.DSCollector, storage=()=>globalThis.localStorage, events=globalThis.window, page=globalThis.document}={}) {
 const boxes=[...root.querySelectorAll('input[type=checkbox]')];
 const labels=JSON.parse(root.querySelector('[data-checklist-labels]').textContent);
 const status=root.querySelector('[data-storage-status]');
 let snapshot;
 const figure=box=>({seriesId:labels.seriesId,styleId:box.dataset.styleId,name:box.nextElementSibling.textContent,series:labels.title});
 function render(items) {
  for(const box of boxes) box.checked=core.seriesOwned(items,figure(box));
  const owned=boxes.filter(box=>box.checked).length;
  root.querySelector('[data-owned]').textContent=owned;
  root.querySelector('[data-missing]').textContent=boxes.length-owned;
 }
 function refresh(message=labels.ready) {
  try {
   if(!core) throw Error('core');
   snapshot=core.readCollection(storage());
   render(snapshot.items);
   for(const box of boxes) box.disabled=false;
   root.querySelector('[data-checklist-copy]').disabled=false;
   status.textContent=message;
  } catch {
   for(const box of boxes) box.disabled=true;
   root.querySelector('[data-checklist-copy]').disabled=true;
   root.querySelector('[data-owned]').textContent='—';
   root.querySelector('[data-missing]').textContent='—';
   status.textContent=labels.storageError;
  }
 }
 root.addEventListener('change',event=>{
  const box=event.target;
  if(!boxes.includes(box)) return;
  root.querySelector('[data-copy-status]').textContent='';
  let changed=false;
  try {
   // Read the latest ledger on every change so a tracker edit in another tab
   // cannot be overwritten with this page's old quantities or wishlist.
   const target=storage(), latest=core.readCollection(target);
   const result=core.setSeriesOwned(latest.items,figure(box),box.checked);
   snapshot=core.writeCollection(target,result.items,latest.raw);
   render(snapshot.items);
   status.textContent=labels.saved;
   changed=result.changed;
  } catch(error) {
   refresh(error.message==='conflict'?labels.conflict:labels.storageError);
  }
  if(changed) record('collector_series_save');
 });
 root.querySelector('[data-checklist-copy]').addEventListener('click',async()=>{
  try {
   await navigator.clipboard.writeText(labels.title+'\n'+boxes.map(box=>(box.checked?'[x] ':'[ ] ')+box.nextElementSibling.textContent).join('\n'));
   root.querySelector('[data-copy-status]').textContent=labels.copied;
  } catch { root.querySelector('[data-copy-status]').textContent=labels.copyFail; }
 });
 events.addEventListener('storage',event=>{if(event.key===core?.COLLECTION_KEY||event.key===null)refresh(labels.synced);});
 events.addEventListener('focus',()=>refresh());
 events.addEventListener('pageshow',()=>refresh());
 page.addEventListener('visibilitychange',()=>{if(!page.hidden)refresh();});
 refresh();
}
export function initSeries(record){
 for(const root of document.querySelectorAll('[data-series-checklist]'))initSeriesChecklist(root,record);
 for(const root of document.querySelectorAll('[data-series-odds]')){const form=root.querySelector('form'),output=root.querySelector('[data-series-result]'),error=root.querySelector('[data-series-error]'),labels=JSON.parse(root.querySelector('[data-series-labels]').textContent),format=new Intl.NumberFormat(document.documentElement.lang,{style:'percent',maximumFractionDigits:2});const clear=()=>{output.replaceChildren();error.textContent='';};form.addEventListener('input',clear);form.addEventListener('invalid',clear,true);form.addEventListener('submit',e=>{e.preventDefault();clear();try{if(!form.checkValidity())throw Error('invalid');const r=styleProbability({target:'printed',probabilityPercent:Number(form.elements.probability.value),boxes:Number(form.elements.boxes.value)});for(const [label,value]of [[labels.hit,r.probabilityAtLeastOne],[labels.miss,r.probabilityNone]]){const p=document.createElement('p');p.textContent=label+': '+(value>0&&value<.0001?'<0.01%':value<1&&value>.9999?'>99.99%':format.format(value));output.append(p);}record('collector_series_calc');}catch{error.textContent=labels.error;}});}
}
