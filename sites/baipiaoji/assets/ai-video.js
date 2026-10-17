const {filterWorks,suggestWorks,relatedWorks,sourceGroups}=await import('./ai-video-core.mjs'+new URL(import.meta.url).search);

const app=document.getElementById('fp-main');
if(app){
 const $=id=>document.getElementById(id),data=JSON.parse($('fp-data').textContent),works=data.works,sources=data.sources;
 const byId=new Map(works.map(work=>[work.id,work])),cards=new Map([...document.querySelectorAll('[data-fp-work]')].map(node=>[node.dataset.fpWork,node]));
 const storageKey='bpj_framepick_saved_v1';
 let saved=new Set(),savedOnly=false,related=null,searchTimer,statusTimer,suggestionIndex=-1,suggestions=[],lastSearch='',viewed=false;
 const controls={source:$('fp-source'),genre:$('fp-genre'),format:$('fp-format'),year:$('fp-year'),sort:$('fp-sort')};
 const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
 function say(message){clearTimeout(statusTimer);$('fp-status').textContent=message;if(message)statusTimer=setTimeout(()=>{$('fp-status').textContent='';},6500);}
 function excluded(){const q=new URLSearchParams(location.search);return navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true||window.top!==window.self||['ci','__ci','__probe','qa','__qa'].some(key=>q.has(key))||q.get('utm_source')==='verify';}
 function optedOut(){try{return localStorage.getItem('fleet_ga4_choice_v1')==='denied';}catch{return false;}}
 function track(action,event){
  if(action!=='view'&&!event?.isTrusted||document.visibilityState!=='visible'||excluded()||optedOut()||!$('fleet-analytics-settings'))return;
  if(!['view','search','filter','preview','outbound','save','unsave','related'].includes(action))return;
  window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'ai_video_'+action}}));
 }
 function exposure(){
  if(viewed)return;
  if(excluded()||optedOut()){viewed=true;observer.disconnect();return;}
  if(document.visibilityState==='visible'&&$('fleet-analytics-settings')){viewed=true;track('view');observer.disconnect();}
 }
 const observer=new MutationObserver(exposure);observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',exposure);exposure();
 try{const stored=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(stored))saved=new Set(stored.filter(id=>typeof id==='string'&&byId.has(id)));}catch{say('Saved list could not be read. You can still browse and watch.');}
 function saveControls(){
  $('fp-save-count').textContent=String(saved.size);$('fp-saved').setAttribute('aria-pressed',String(savedOnly));
  for(const button of document.querySelectorAll('[data-fp-save]')){const work=byId.get(button.dataset.fpSave),active=saved.has(work.id);button.textContent=active?'Saved':'Save';button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',`${active?'Remove':'Save'} ${work.title}${active?' from saved list':''}`);}
 }
 const currentFilters=()=>({query:$('fp-query').value.slice(0,100),source:controls.source.value,genre:controls.genre.value,format:controls.format.value,year:controls.year.value,sort:controls.sort.value,shortOnly:$('fp-short').checked,savedOnly,saved:[...saved]});
 function sourceTitle(source){const heading=el('div',undefined,'fp-group-heading'),left=el('div');left.append(el('h3',source.label),el('p',source.kind==='series'?'Publisher showcase; unranked':'Official festival selection; jury recognition'));const link=el('a','Official source');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';link.dataset.fpOutbound='';heading.append(left,link);return heading;}
 function render(){
  let shown=filterWorks(works,currentFilters()),reasons=new Map();
  const source=sources.find(item=>item.id===controls.source.value);
  const ranked=source&&works.some(work=>work.sourceId===source.id&&work.rank||work.additionalRecognitions?.some(item=>item.sourceId===source.id&&item.rank));
  controls.sort.querySelector('[value="source-rank"]').disabled=!ranked;
  if(controls.sort.value==='source-rank'&&!ranked){controls.sort.value='recent';shown=filterWorks(works,currentFilters());}
  if(related){const matches=relatedWorks(works,byId.get(related));reasons=new Map(matches.map(item=>[item.work.id,item.reasons]));shown=matches.map(item=>item.work).filter(work=>shown.some(item=>item.id===work.id));}
  for(const [id,card] of cards){
   card.querySelector('.fp-related-note')?.remove();
   const work=byId.get(id),recognition=source&&work.sourceId!==source.id?work.additionalRecognitions?.find(item=>item.sourceId===source.id):work;
   card.querySelector('[data-fp-award]').textContent=recognition?.award||recognition?.selectionLabel||work.selectionLabel||'Official publisher showcase';
   if(reasons.has(id))card.querySelector('.fp-summary').after(el('p',reasons.get(id).join('. ')+'.','fp-related-note'));
  }
  $('fp-results').replaceChildren();
  const grouped=!related&&controls.sort.value==='recent'&&!source;
  if(grouped){for(const group of sourceGroups(shown,sources)){const section=el('section',undefined,'fp-group'),grid=el('div',undefined,'fp-grid');section.dataset.fpGroup=group.source.id;grid.append(...group.works.map(work=>cards.get(work.id)));section.append(sourceTitle(group.source),grid);$('fp-results').append(section);}}
  else{if(source)$('fp-results').append(sourceTitle(source));const grid=el('div',undefined,'fp-grid');grid.append(...shown.map(work=>cards.get(work.id)));$('fp-results').append(grid);}
  $('fp-empty').hidden=shown.length>0;$('fp-count').textContent=`${shown.length} of ${works.length} works${savedOnly?' in your saved list':''}`;
  $('fp-catalog-title').textContent=related?`Similar to ${byId.get(related).title}`:savedOnly?'Your saved works':'Find your next watch';
  $('fp-order-note').textContent=related?'Matched by shared editorial themes, format and known runtime. These are browsing suggestions, not AI video analysis.':controls.sort.value==='source-rank'?'Official placements within this collection only. Entries without a published placement follow; no audience popularity is inferred.':controls.sort.value==='shortest'?'Known runtimes first; unverified runtimes follow. Runtime is not a popularity score.':'Works appear once below. Use the collection filter to see all its recognitions, including shared winners. This is not a US or European audience popularity chart.';
  for(const button of document.querySelectorAll('[data-fp-quick]')){const [kind,value]=button.dataset.fpQuick.split(':');button.setAttribute('aria-pressed',String(kind==='short'?$('fp-short').checked:controls[kind]?.value===value));}
  saveControls();
 }
 function closeSuggestions(){suggestions=[];suggestionIndex=-1;$('fp-suggestions').hidden=true;$('fp-query').setAttribute('aria-expanded','false');$('fp-query').removeAttribute('aria-activedescendant');}
 function showSuggestions(){
  suggestions=suggestWorks(works,$('fp-query').value);suggestionIndex=-1;$('fp-suggestions').replaceChildren();
  suggestions.forEach((work,index)=>{const li=el('li');li.setAttribute('role','presentation');const button=el('button');button.type='button';button.id='fp-suggestion-'+index;button.dataset.fpSuggestion=work.id;button.setAttribute('role','option');button.setAttribute('aria-selected','false');button.append(el('strong',work.title),el('span',work.creator));li.append(button);$('fp-suggestions').append(li);});
  $('fp-suggestions').hidden=!suggestions.length;$('fp-query').setAttribute('aria-expanded',String(Boolean(suggestions.length)));$('fp-query').removeAttribute('aria-activedescendant');
 }
 function reset(){for(const [key,control] of Object.entries(controls))control.value=key==='sort'?'recent':'';$('fp-query').value='';$('fp-short').checked=false;savedOnly=false;related=null;lastSearch='';closeSuggestions();render();}
 function searchEvent(event){const query=$('fp-query').value.trim();if(query&&query!==lastSearch){lastSearch=query;track('search',event);}}
 $('fp-query').addEventListener('input',event=>{related=null;render();showSuggestions();clearTimeout(searchTimer);if(event.isTrusted)searchTimer=setTimeout(()=>searchEvent(event),600);});
 $('fp-query').addEventListener('focus',()=>{if($('fp-query').value)showSuggestions();});
 $('fp-query').addEventListener('keydown',event=>{
  if(event.key==='Escape')return closeSuggestions();
  if(['ArrowDown','ArrowUp'].includes(event.key)&&suggestions.length){event.preventDefault();suggestionIndex=(suggestionIndex+(event.key==='ArrowDown'?1:-1)+suggestions.length)%suggestions.length;for(const [index,button] of [...$('fp-suggestions').querySelectorAll('button')].entries())button.setAttribute('aria-selected',String(index===suggestionIndex));$('fp-query').setAttribute('aria-activedescendant','fp-suggestion-'+suggestionIndex);}
  if(event.key==='Enter'&&suggestionIndex>=0){event.preventDefault();choose(suggestions[suggestionIndex].id,event);}
 });
 function choose(id,event){const work=byId.get(id);if(!work)return;reset();$('fp-query').value=work.title;render();closeSuggestions();searchEvent(event);$('fp-query').focus();}
 $('fp-search').addEventListener('submit',event=>{event.preventDefault();clearTimeout(searchTimer);related=null;render();closeSuggestions();searchEvent(event);});
 for(const control of Object.values(controls))control.addEventListener('change',event=>{related=null;render();track('filter',event);});
 $('fp-short').addEventListener('change',event=>{related=null;render();track('filter',event);});
 $('fp-filter-toggle').addEventListener('click',()=>{const expanded=$('fp-filter-toggle').getAttribute('aria-expanded')!=='true';$('fp-filter-toggle').setAttribute('aria-expanded',String(expanded));$('fp-filters').dataset.collapsed=String(!expanded);});
 for(const id of ['fp-reset','fp-empty-reset'])$(id).addEventListener('click',event=>{reset();track('filter',event);});
 $('fp-saved').addEventListener('click',event=>{savedOnly=!savedOnly;related=null;render();track('filter',event);$('fp-catalog').scrollIntoView();});
 document.addEventListener('click',event=>{
  const suggestion=event.target.closest('[data-fp-suggestion]');if(suggestion)return choose(suggestion.dataset.fpSuggestion,event);
  if(!event.target.closest('.fp-search-field'))closeSuggestions();
  const quick=event.target.closest('[data-fp-quick]');if(quick){const [kind,value]=quick.dataset.fpQuick.split(':');reset();if(kind==='short')$('fp-short').checked=true;else if(controls[kind]&&[...controls[kind].options].some(option=>option.value===value))controls[kind].value=value;else $('fp-query').value=value;render();track('filter',event);return;}
  const save=event.target.closest('[data-fp-save]');if(save){
   const id=save.dataset.fpSave,next=new Set(saved),removing=next.has(id);if(removing)next.delete(id);else next.add(id);
   try{localStorage.setItem(storageKey,JSON.stringify([...next]));if(localStorage.getItem(storageKey)!==JSON.stringify([...next]))throw Error('Storage unavailable');saved=next;saveControls();if(savedOnly)render();say(removing?'Removed from this browser’s saved list.':'Saved in this browser. This list does not sync to your BPJ account.');track(removing?'unsave':'save',event);}catch{say('Could not save in this browser. Check its storage settings; your list was not changed.');}return;
  }
  const similar=event.target.closest('[data-fp-related]');if(similar){reset();related=similar.dataset.fpRelated;render();track('related',event);$('fp-catalog').scrollIntoView();return;}
  const preview=event.target.closest('[data-fp-preview]');if(preview){
   const work=byId.get(preview.dataset.fpPreview);if(!work||!/^[A-Za-z0-9_-]{11}$/.test(work.youtubeId||''))return;
   $('fp-preview-title').textContent=work.title;$('fp-preview-kind').textContent=({film:'Official film player',episode:'Official episode player',trailer:'Official trailer player',source:'Official source preview'}[work.watchKind]||'Official source player');$('fp-preview-official').href=work.watchUrl;
   const frame=document.createElement('iframe');frame.title=`${work.title} — official YouTube player`;frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.src=`https://www.youtube-nocookie.com/embed/${work.youtubeId}?autoplay=0&rel=0`;$('fp-player').replaceChildren(frame);$('fp-preview').showModal();track('preview',event);return;
  }
  if(event.target.closest('[data-fp-outbound]'))track('outbound',event);
 });
 $('fp-preview-close').addEventListener('click',()=>$('fp-preview').close());
 $('fp-preview').addEventListener('close',()=>$('fp-player').replaceChildren());
 $('fp-preview').addEventListener('click',event=>{if(event.target===$('fp-preview')){const bounds=$('fp-preview').getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)$('fp-preview').close();}});
 for(const image of document.querySelectorAll('.fp-cover img')){const loaded=()=>image.parentElement.classList.add('fp-image-loaded');image.addEventListener('load',loaded);image.addEventListener('error',()=>{image.remove();});if(image.complete){if(image.naturalWidth)loaded();else image.remove();}}
 function hashEntry(){let id;try{id=decodeURIComponent(location.hash.replace(/^#work-/,''));}catch{return;}if(!byId.has(id))return;const card=cards.get(id);if(!card.isConnected)reset();card.scrollIntoView({block:'start'});card.classList.add('fp-selected');setTimeout(()=>card.classList.remove('fp-selected'),1800);}
 const query=new URLSearchParams(location.search);$('fp-query').value=(query.get('q')||'').slice(0,100);for(const name of ['source','genre','format','year'])if([...controls[name].options].some(option=>option.value===query.get(name)))controls[name].value=query.get(name);savedOnly=query.get('saved')==='1';
 render();if(location.hash.startsWith('#work-'))requestAnimationFrame(hashEntry);window.addEventListener('hashchange',hashEntry);
 window.addEventListener('storage',event=>{if(event.key!==storageKey)return;try{const value=JSON.parse(event.newValue||'[]');if(Array.isArray(value)){saved=new Set(value.filter(id=>byId.has(id)));render();}}catch{say('The saved list changed but could not be read. Refresh to try again.');}});
}
