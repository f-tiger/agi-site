const version = new URL(import.meta.url).searchParams.get('v') || '';
const {STORAGE_KEY,ACTIONS,approvedIdentity,availability,affiliateSearchDE,localToday,validCare,readSaved,serializeSaved} = await import('./filter-care-core.mjs?v='+encodeURIComponent(version));
const {measurementAllowed} = await import('./filter-finder-core.mjs?v='+encodeURIComponent(version));
const $ = selector => document.querySelector(selector);
const node = (tag,text,className) => {const n=document.createElement(tag);if(text!=null)n.textContent=text;if(className)n.className=className;return n;};
const button = (label,fn,className='model-option') => {const b=node('button',label,className);b.type='button';b.addEventListener('click',fn);return b;};
const business = name => {
  if(measurementAllowed({webdriver:navigator.webdriver,doNotTrack:navigator.doNotTrack||window.doNotTrack,globalPrivacyControl:navigator.globalPrivacyControl,search:location.search}))
    window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));
};
let data;
try {data=JSON.parse($('#filter-care-data').textContent);} catch {}
if(data?.market==='DE' && data.items?.every(approvedIdentity)) init(data.items);
else $('#search-status').textContent='Die Modellauswahl ist nicht verfügbar. Bitte nutze die Herstellerquellen in der Tabelle.';

function init(items) {
  const records = new Map(items.map(item=>[item.id,item]));
  const label = item => `${item.brand} ${item.models[0]}`;
  let selected='',saved={};
  try {saved=readSaved(localStorage.getItem(STORAGE_KEY));}
  catch {$('#save-status').textContent='Browser-Speicher nicht verfügbar. Notizen bleiben nur im geöffneten Tab.';}
  function persist(message) {
    let stored=false;
    try {
      if(Object.keys(saved).length) localStorage.setItem(STORAGE_KEY,serializeSaved(saved));
      else localStorage.removeItem(STORAGE_KEY);
      $('#save-status').textContent=message;
      stored=true;
    } catch {$('#save-status').textContent='Browser-Speicher konnte nicht geändert werden. Diese Änderung gilt nur im geöffneten Tab.';}
    renderSaved();
    return stored;
  }
  function renderSaved() {
    const area=$('#saved-model-buttons');area.replaceChildren();
    for(const id of Object.keys(saved)) {
      if(records.has(id)) area.append(button(label(records.get(id)),()=>choose(id,true),'saved-model'));
    }
    $('#saved-models').hidden=!area.childElementCount;
  }
  function renderOptions() {
    const query=$('#model-search').value.trim().toLocaleLowerCase('de');
    const found=items.filter(item=>label(item).toLocaleLowerCase('de').includes(query));
    $('#model-options').replaceChildren(...found.map(item=>button(label(item),()=>choose(item.id,true))));
    $('#search-status').textContent=found.length ? `${found.length} genaue Modelle zur Auswahl. Bitte mit dem Typenschild vergleichen.` :
      'Dieses Modell ist hier nicht dokumentiert. Das bedeutet nicht, dass es keinen passenden Filter gibt. Bitte die Herstellerseite prüfen.';
  }
  function renderResult() {
    const item=records.get(selected),result=$('#model-result');result.replaceChildren();
    if(!item){result.hidden=true;return;}
    result.hidden=false;
    const heading=node('div',null,'result-heading');
    heading.append(node('h3',label(item)));
    heading.append(button(saved[item.id]?'Modell und Notiz löschen':'Modell merken',()=>{
      if(saved[item.id]){delete saved[item.id];persist('Modell und zugehörige Notiz aus diesem Browser gelöscht.');}
      else {saved[item.id]={saved:true,care:null};if(persist('Modell in diesem Browser gemerkt.'))business('eco_filter_save');}
      renderResult();$('#model-result').focus({preventScroll:true});
    },'save-model'));
    result.append(heading);
    const state=availability(item),card=node('article',null,'filter-result'),copy=node('div');
    copy.append(node('p',item.name,'filter-name'),node('p',`Variante: ${item.variant}`,'result-note'));
    if(item.part_number)copy.append(node('p',`Hersteller-Artikelnummer: ${item.part_number}`,'part-number'));
    copy.append(node('p',`${state.label}. Zuletzt geprüft: ${item.checked_at}.`,'result-check'),node('p',item.note,'result-note'));
    const source=node('a','Herstellerzuordnung öffnen','source-link');source.href=item.source_url;source.target='_blank';source.rel='noopener noreferrer';source.addEventListener('click',()=>business('eco_filter_source'));copy.append(source);card.append(copy);
    const destination=affiliateSearchDE(item);
    if(destination) {
      const area=node('div',null,'affiliate-area'),a=node('a','Bei Amazon.de suchen','affiliate-link');
      a.href=destination;a.target='_blank';a.rel='sponsored noopener noreferrer';a.dataset.amzn='';a.dataset.source='tool';
      // Recheck at click time too: an open tab must not retain an expired CTA.
      a.addEventListener('click',event=>{if(!affiliateSearchDE(item)){event.preventDefault();event.stopImmediatePropagation();renderResult();}},true);
      area.append(a,node('span','Werbelink · Suchergebnisse und Verkäufer selbst prüfen','affiliate-label'));card.append(area);
    } else card.append(node('p','Händlersuche pausiert. Die Herstellerquelle bleibt zur eigenen Prüfung erreichbar.','paused-label'));
    result.append(card);
    const care=$('#care-template').content.cloneNode(true),form=care.querySelector('form');
    const action=form.querySelector('[name=action]'),date=form.querySelector('[name=date]'),status=form.querySelector('[role=status]');
    date.max=localToday();
    const previous=saved[item.id]?.care;
    if(previous){action.value=previous.action;date.value=previous.date;status.textContent=`Deine letzte Notiz: ${ACTIONS[previous.action]} am ${previous.date}.`;}
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const care={action:action.value,date:date.value};
      if(!validCare(care)){status.textContent='Bitte eine Tätigkeit und ein gültiges Datum bis einschließlich heute wählen.';return;}
      saved[item.id]={saved:true,care};const stored=persist('Modell und letzte Tätigkeit in diesem Browser gespeichert.');
      status.textContent=`Deine letzte Notiz: ${ACTIONS[care.action]} am ${care.date}.`;
      if(stored)business('eco_filter_care_save');renderResult();$('#model-result').focus({preventScroll:true});
    });
    const remove=form.querySelector('[data-delete-care]');remove.hidden=!previous;
    remove.addEventListener('click',()=>{saved[item.id]={saved:true,care:null};persist('Pflegenotiz gelöscht; das Modell bleibt gemerkt.');renderResult();$('#model-result').focus({preventScroll:true});});
    result.append(care);
  }
  function choose(id,interactive=false) {
    if(!records.has(id)){selected='';renderResult();return;}
    selected=id;$('#model-search').value=label(records.get(id));renderOptions();renderResult();
    if(interactive){history.replaceState(null,'','#'+id);business('legacy:tool_start');if(availability(records.get(id)).active)business('legacy:tool_complete');$('#model-result').focus({preventScroll:true});}
  }
  function fragment() {let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{id='';}choose(id);}
  $('#model-search').addEventListener('input',()=>{selected='';history.replaceState(null,'',location.pathname+location.search);renderResult();renderOptions();});
  $('#model-search-form').addEventListener('submit',event=>{
    event.preventDefault();const exact=items.find(item=>label(item)===$('#model-search').value.trim());
    if(exact)choose(exact.id,true);else {renderOptions();$('#search-status').textContent+=' Wähle eine vollständige Modellschaltfläche; Teilnamen bestätigen keine Zuordnung.';}
  });
  window.addEventListener('hashchange',fragment);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderResult();refreshTable();}});
  function refreshTable(){for(const cell of document.querySelectorAll('[data-record-id]'))cell.textContent=availability(records.get(cell.dataset.recordId)).label;}
  $('#model-search-form').hidden=false;refreshTable();renderOptions();renderSaved();fragment();
}
