import {SHOPPING_IDS} from './shopping-contract.mjs';
import {recordShoppingCompare} from './affiliate-measurement.mjs?v=2026-11-07.2';

export const SHORTLIST_LIMIT = 3;
export const shortlistStorageKey = market => 'tds_shopping_shortlist_v1:' + (market === 'DE' ? 'DE' : 'US');
export function validateSelection(value, allowed = SHOPPING_IDS) {
  if (!Array.isArray(value) || value.length > SHORTLIST_LIMIT || new Set(value).size !== value.length ||
      value.some(id => typeof id !== 'string' || !allowed.includes(id))) throw Error('Invalid shortlist');
  return [...value];
}
export function parseShortlistFragment(hash, known = SHOPPING_IDS) {
  if (typeof hash !== 'string' || !hash.startsWith('#shortlist=')) return {state:'absent', ids:[]};
  if (hash.length > 160 || !/^#shortlist=[a-z-]+(?:,[a-z-]+){0,2}$/.test(hash)) return {state:'invalid', ids:[]};
  try {return {state:'valid', ids:validateSelection(hash.slice(11).split(','), known)};} catch {return {state:'invalid', ids:[]};}
}
export function readShortlist(storage, market, allowed = SHOPPING_IDS) {
  let raw;
  try {if (!storage || typeof storage.getItem !== 'function') return {state:'unavailable', ids:[]};raw = storage.getItem(shortlistStorageKey(market));} catch {return {state:'unavailable', ids:[]};}
  try {
    if (raw === null) return {state:'empty', ids:[]};
    if (typeof raw !== 'string' || raw.length > 2048) return {state:'corrupt', ids:[]};
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1 || Object.keys(data).some(key => !['version','ids'].includes(key))) return {state:'corrupt', ids:[]};
    return {state:'saved', ids:validateSelection(data.ids, allowed)};
  } catch {return {state:'corrupt', ids:[]};}
}
export function writeShortlist(storage, market, ids, allowed = SHOPPING_IDS) {
  const selected = validateSelection(ids, allowed);
  try {if (!storage || typeof storage.setItem !== 'function') return false;storage.setItem(shortlistStorageKey(market),JSON.stringify({version:1,ids:selected}));return true;} catch {return false;}
}
export function changeSelection(ids, id, selected, allowed = SHOPPING_IDS) {
  const current=validateSelection(ids,allowed);
  if (!allowed.includes(id)) return {ids:current, changed:false, reason:'unavailable'};
  if (selected && !current.includes(id)) {
    if (current.length === SHORTLIST_LIMIT) return {ids:current, changed:false, reason:'limit'};
    return {ids:[...current,id], changed:true, reason:null};
  }
  if (!selected && current.includes(id)) return {ids:current.filter(value=>value!==id), changed:true, reason:null};
  return {ids:current, changed:false, reason:null};
}
export function shortlistURL(base, ids, allowed = SHOPPING_IDS) {
  const selected=validateSelection(ids,allowed),url=new URL(base);
  if (!selected.length || url.origin!=='https://thedollscout.com' || !/^\/(?:de\/|zh\/)?shop$/.test(url.pathname) || url.search || url.hash || url.username || url.password) throw Error('Invalid shortlist link');
  url.hash='shortlist='+selected.join(',');return url.href;
}
export function initialSelection({hash='',storage,market,allowed=SHOPPING_IDS}) {
  const saved=readShortlist(storage,market,allowed),shared=parseShortlistFragment(hash);
  if (shared.state==='valid') {const ids=shared.ids.filter(id=>allowed.includes(id));return {ids,state:ids.length===shared.ids.length?'shared':'partial-share',storageState:saved.state};}
  return {ids:saved.ids,state:shared.state==='invalid'?'invalid-share':saved.state,storageState:saved.state};
}

function configFor(root) {
  const text=root.querySelector('[data-shortlist-config]')?.textContent;
  if (!text || text.length>30000) throw Error('Missing shortlist configuration');
  const data=JSON.parse(text);
  if (!['en','de','zh'].includes(data.lang) || !['US','DE'].includes(data.market) || !Array.isArray(data.items) || data.items.length!==SHOPPING_IDS.length ||
      new Set(data.items.map(item=>item.id)).size!==SHOPPING_IDS.length || data.items.some(item=>!SHOPPING_IDS.includes(item.id)||typeof item.eligible!=='boolean'||
      ['name','when','skip','size','source'].some(key=>typeof item[key]!=='string'||item[key].length>1200))) throw Error('Invalid shortlist configuration');
  const allowed=data.items.filter(item=>item.eligible).map(item=>item.id);
  shortlistURL(data.shareURL,[allowed[0]],allowed);
  return {...data,allowed};
}
const installed=new WeakSet();
export function installShoppingShortlist(root,runtime=globalThis) {
  if (!root || installed.has(root)) return null;
  let config;try{config=configFor(root);}catch{return null;}
  const document=root.ownerDocument,labels=config.labels,byId=new Map(config.items.map(item=>[item.id,item]));
  const toolbar=root.querySelector('[data-shortlist-toolbar]'),status=root.querySelector('[data-shortlist-status]'),counter=root.querySelector('[data-shortlist-count]'),selectedList=root.querySelector('[data-shortlist-selected]');
  const actions=root.querySelector('[data-shortlist-actions]'),comparison=root.querySelector('[data-shortlist-comparison]'),compareButton=root.querySelector('[data-shortlist-compare]'),copyButton=root.querySelector('[data-shortlist-copy]'),clearButton=root.querySelector('[data-shortlist-clear]'),shareLink=root.querySelector('[data-shortlist-share-link]'),persistence=root.querySelector('[data-shortlist-persistence]');
  const dock=root.querySelector('[data-shortlist-dock]'),dockCount=root.querySelector('[data-shortlist-dock-count]'),dockHint=root.querySelector('[data-shortlist-dock-hint]');
  if (![toolbar,status,counter,selectedList,actions,comparison,compareButton,copyButton,clearButton,shareLink,persistence,dock,dockCount,dockHint].every(Boolean)) return null;
  let storage;try{storage=runtime.localStorage;}catch{}
  const initial=initialSelection({hash:runtime.location?.hash||'',storage,market:config.market,allowed:config.allowed});
  let ids=initial.ids,revision=0;
  const setStatus=(key,message)=>{
    status.dataset.shortlistState=key;status.textContent=message;
    dockHint.textContent=key==='limit'?labels.limit:ids.length===1?labels.oneMore:'';
    dockHint.hidden=!dockHint.textContent;
  };
  const hideComparison=()=>{comparison.hidden=true;comparison.replaceChildren();};
  const snapshot=()=>ids.join(',');
  function renderSelection(){
    counter.textContent=ids.length+' '+labels.count;
    dock.hidden=!ids.length;dockCount.textContent=ids.length+' / '+SHORTLIST_LIMIT;
    dockHint.textContent=ids.length===1?labels.oneMore:'';dockHint.hidden=!dockHint.textContent;
    actions.hidden=!ids.length;selectedList.hidden=!ids.length;persistence.hidden=!ids.length;
    for(const input of root.querySelectorAll('[data-shortlist-select]'))input.checked=ids.includes(input.dataset.shortlistSelect);
    selectedList.replaceChildren();
    for(const id of ids){const button=document.createElement('button');button.type='button';button.className='shopping-shortlist-chip';button.dataset.shortlistRemove=id;button.textContent=byId.get(id).name+' ×';button.setAttribute('aria-label',labels.remove+': '+byId.get(id).name);selectedList.append(button);}
    compareButton.disabled=ids.length<2;copyButton.disabled=!ids.length;clearButton.disabled=!ids.length;
    shareLink.hidden=true;shareLink.removeAttribute('href');shareLink.textContent='';
  }
  function persist(){
    const saved=writeShortlist(storage,config.market,ids,config.allowed);
    persistence.textContent=saved?labels.saved:labels.unavailable;
    persistence.dataset.shortlistStorage=saved?'saved':'unavailable';
    return saved;
  }
  function update(next){
    ids=next;revision++;hideComparison();renderSelection();
    const saved=persist();setStatus(saved?'changed':'storage-unavailable',saved?ids.length?labels.changed:labels.empty:labels.unavailable);
  }
  root.addEventListener('change',event=>{
    const target=event.target;
    if(target?.matches?.('[data-shortlist-select]')){
      const change=changeSelection(ids,target.dataset.shortlistSelect,target.checked,config.allowed);
      if(change.changed)update(change.ids);else{target.checked=ids.includes(target.dataset.shortlistSelect);if(change.reason==='limit')setStatus('limit',labels.limit);}
    }
    if(target?.matches?.('[data-shortlist-filter]')){
      const filter=['all','display-cases','storage-transport'].includes(target.value)?target.value:'all';
      for(const card of root.querySelectorAll('[data-shopping-card]'))card.hidden=filter!=='all'&&!card.dataset.shoppingTasks.split(' ').includes(filter);
    }
  });
  // Rebuilding chips or hiding actions must not strand keyboard focus on body.
  function focusSelection(index=0){
    const chips=selectedList.querySelectorAll('[data-shortlist-remove]');
    (chips[Math.min(index,chips.length-1)]||toolbar).focus();
  }
  selectedList.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-shortlist-remove]');if(!button||!selectedList.contains(button))return;
    const index=ids.indexOf(button.dataset.shortlistRemove),next=changeSelection(ids,button.dataset.shortlistRemove,false,config.allowed);
    if(next.changed){update(next.ids);focusSelection(index);}
  });
  clearButton.addEventListener('click',()=>{update([]);focusSelection();});
  compareButton.addEventListener('click',event=>{
    if(ids.length<2)return;
    const selected=validateSelection(ids,config.allowed),heading=document.createElement('h3'),hint=document.createElement('p'),wrap=document.createElement('div'),table=document.createElement('table');
    heading.textContent=labels.comparison;hint.className='shopping-comparison-hint';hint.textContent=labels.scroll;wrap.className='shopping-comparison-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',labels.comparison);
    const caption=document.createElement('caption');caption.textContent=labels.noGuarantee;table.append(caption);
    const thead=document.createElement('thead'),titles=document.createElement('tr'),first=document.createElement('th');first.scope='col';first.textContent=labels.comparison;titles.append(first);
    for(const id of selected){const th=document.createElement('th');th.scope='col';th.dataset.shortlistCompared=id;th.textContent=byId.get(id).name;titles.append(th);}thead.append(titles);table.append(thead);
    const tbody=document.createElement('tbody');
    for(const key of ['when','skip','size','source','destination']){
      const row=document.createElement('tr'),label=document.createElement('th');row.dataset.shortlistRow=key;label.scope='row';label.textContent=labels[key];row.append(label);
      for(const id of selected){const cell=document.createElement('td');if(key==='destination'){
        const source=root.querySelector(`template[data-shortlist-destination="${id}"]`)?.content?.firstElementChild;
        if(!source){hideComparison();return;}const anchor=source.cloneNode(true);anchor.dataset.shoppingPlacement='compare';cell.append(anchor);
      }else cell.textContent=byId.get(id)[key];row.append(cell);}tbody.append(row);
    }
    const edit=document.createElement('button');edit.type='button';edit.className='button shopping-comparison-edit';edit.dataset.shortlistEdit='';edit.textContent=labels.edit;
    edit.addEventListener('click',()=>{toolbar.scrollIntoView({behavior:'instant',block:'start'});focusSelection();});
    table.append(tbody);wrap.append(table);comparison.replaceChildren(heading,edit,hint,wrap);comparison.hidden=false;setStatus('compared',labels.compared);comparison.focus({preventScroll:true});comparison.scrollIntoView({behavior:runtime.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',block:'start'});persist();
    // Only an explicit actual comparison reaches the fixed event helper. Restores,
    // filters and example data never emit comparison or purchase events.
    try{recordShoppingCompare(event,selected,runtime);}catch{}
  });
  copyButton.addEventListener('click',async()=>{
    if(!ids.length)return;let url;try{url=shortlistURL(config.shareURL,ids,config.allowed);}catch{return;}
    const before=snapshot(),version=revision;
    shareLink.href=url;shareLink.textContent=url;shareLink.hidden=false;
    try{if(!runtime.navigator?.clipboard?.writeText)throw Error('Clipboard unavailable');await runtime.navigator.clipboard.writeText(url);
      if(version!==revision||before!==snapshot()){setStatus('changed',labels.changed);return;}setStatus('copied',labels.copied);
    }catch{if(version===revision&&before===snapshot())setStatus('copy-failed',labels.copyFailed);}
  });
  renderSelection();toolbar.hidden=false;for(const area of root.querySelectorAll('[data-shortlist-select-area]'))area.hidden=false;
  if(['shared','partial-share'].includes(initial.state))persistence.textContent=labels.shared;
  if(initial.storageState==='unavailable'){persistence.textContent=labels.unavailable;persistence.dataset.shortlistStorage='unavailable';}
  if(initial.state==='invalid-share')setStatus('invalid-share',labels.invalid);
  else if(initial.state==='partial-share')setStatus('invalid-share',labels.partial);
  else if(initial.state==='shared')setStatus('shared',labels.shared);
  else if(initial.state==='corrupt')setStatus('storage-unavailable',labels.corrupt);
  else if(initial.state==='unavailable')setStatus('storage-unavailable',labels.unavailable);
  installed.add(root);
  return {getSelection:()=>[...ids]};
}
if(typeof document!=='undefined')for(const root of document.querySelectorAll('[data-shopping-products]'))installShoppingShortlist(root);
