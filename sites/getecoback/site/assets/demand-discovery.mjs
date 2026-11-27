import {asksForLaundryCostComparison, balconyThresholdMoisture, exactBoschStackingGuide, exactGermanHouseholdTask, exactHygrometerPlacement, exactWindowShadeMeasurement, hasOtherWindowSurface, mentionsLaundryDryer} from './german-household-intent.mjs?v=5eb6bf0c5708';
import {mieleBagTask} from './miele-beutel-intent.mjs';
import {asksForTrotecTtk70Filter} from './trotec-ttk70-hepa-filter-intent.mjs';
import {asksForNarrowKaercherNozzle, asksForWindowVacClearance, focusWindowVacQuestion} from './kaercher-saugduese-intent.mjs';
import {asksForCoffeeWaterFilterMatch} from './kaffee-wasserfilter-intent.mjs?v=99bfa4094412';
import {asksForTrotecTtk75EcoConditions, asksForTrotecTtk75EcoOffer} from './trotec-ttk75-eco-intent.mjs?v=00b40528209b';
import {asksForCoolingNoiseComparison} from './cooling-noise-intent.mjs?v=f0bcc0785943';
import {asksForTesamollWindowProfile} from './tesamoll-profile-intent.mjs';
import {asksForLevoitCore300SBoxFilter,exactGermanFilterModel} from './exact-filter-intent.mjs?v=a55b45f02c08';
import {philipsHumidifierFilterSection} from './philips-humidifier-filter-intent.mjs?v=537af20b39fb';
import {asksForElectricBlanketCost} from './electric-blanket-cost-intent.mjs';
import {asksForHygrometerComparison} from './hygrometer-comparison-intent.mjs';
import {asksForN90ModelIdentity} from './n90-model-intent.mjs';
import {asksForPortaSplitWindowLip, namesDifferentPortaSplit, namesOriginalPortaSplitExactly} from './portasplit-fensterfalz-intent.mjs?v=66ae5fbd590d';
import {asksForCellarVentilationCheck} from './cellar-ventilation-intent.mjs';
import {asksForDehumidifierDrainRoute} from './dehumidifier-drain-intent.mjs?v=f6bce24817e8';

// Queries stay in memory. Only fixed navigation actions reach the existing bridge.
export const normalize=value=>String(value).toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFD').replace(/\p{Diacritic}/gu,'');
const stop=new Set('wie kann ich meine mein der die das und im in am zu fuer what how do i my the a an and for to can de la le les un une el los las il lo una di het een ik'.split(' '));
const n90ExactName=/^(?:de['’ -]?longhi[ -]+)?(?:pinguino[ -]+)?pac[ -]*n[ -]*90[ -]+eco[ -]+silent(?:[ -]+(?:ean[ -]+)?8004399512351)?$/;
const n90ExactEan=/^(?:ean[ -]+)?8004399512351$/;

function asksForCoolingWindowClosure(query) {
 const excludedDevices=/\bohne\s+(?:(?:eine?|die|meine)\s+)?(?:(?:mobil|tragbar)\w*\s+)?(?:klimaanlage|klimageraet|monoblock|(?:midea[ -]+)?porta[ -]*split)\b/g;
 const activeDevices=query.replace(excludedDevices,'');
 const cooling=/\b(?:klimaanlag\w*|klimageraet\w*|monoblock\w*|porta[ -]*split|4048164116478)\b/;
 const window=/\b[a-z]*fenster\w*\b/;
 if(!cooling.test(activeDevices)||!window.test(query)||namesDifferentPortaSplit(query)||
    /\b(?!4048164116478\b)\d{13}\b/.test(query))return false;

 const otherIntent=/\b(?:strom\w*|verbrauch\w*|kwh|lautstaerk\w*|wie (?:laut|leise)|geraeusch\w*|dezibel|db|kosten|kostet|fernbedienung|kindersicherung|tastensperre)\b/;
 if(otherIntent.test(query)||asksForPortaSplitWindowLip(query))return false;

 const lock=/\b(?:verriegel(?:n|e|t|st|ungen?)|abschliess(?:en|e|t|st|bar)|abgeschlossen)\b|\bschliess\w*\b[^.!?]{0,70}\bab(?=\s*(?:[,.!?]|$)|\s+(?:wenn|bevor)\b)/;
 const completeClosure=/\b(?:ganz|komplett|vollstaendig|normal|richtig)\s+(?:zu\b|geschloss\w*|schliess\w*)/;
 const absence=/\b(?:abwesenheit|unbeaufsichtigt|weggeh\w*|ausser haus)\b|\b(?:wohnung|haus)\b[^.!?]{0,25}\bverlass\w*\b|\bverlass\w*\b[^.!?]{0,25}\b(?:wohnung|haus)\b/;
 const windowState=/\b(?:schliess\w*|geschlossen|offen|gekippt|auf kipp|zumachen|zu bleiben)\b/;
 return lock.test(query)||completeClosure.test(query)||(absence.test(query)&&windowState.test(query));
}

function asksAboutIndoorWindowCondensation(query) {
 const window=/\b(?:[a-z]*fenster\w*|(?:innen)?scheib\w*|glas)\b/;
 const inside=/\b(?:innen(?:seite|scheiben?|fenster)?|raumseit(?:e|ig)|wohnungsseite)\b/;
 const moisture=/\b(?:beschla(?:g|eg)\w*|kondens(?:wasser|at|ation)\w*|wasser\w*|tropfen\w*|nass\w*|feucht\w*)\b|\blaeu(?:ft|fen|fst)\b[^.!?]{0,70}\ban(?=\s*(?:[,.!?]|$))/;
 const otherIntent=/\b(?:auto\w*|windschutzscheib\w*|pkw|fahrzeug\w*|wohnmobil\w*|kaercher|fenstersaug\w*|duese\w*|klimaanlag\w*|abluftschlauch|ablaufschlauch)\b/;
 return window.test(query)&&inside.test(query)&&moisture.test(query)&&
    !hasOtherWindowSurface(query)&&!otherIntent.test(query);
}

function asksForGermanCoolingAt40SquareMetres(query) {
 const areas=[...query.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:qm|m2|m²)(?![\p{L}\p{N}])/gu)];
 if(!areas.length||areas.some(match=>match[1]!=='40'))return false;
 const cooling=/\b(?:klimaanlag\w*|klimageraet\w*|monoblock\w*|porta[ -]*split|kuehlbedarf)\b/;
 const otherIntent=/\b(?:klarstein|comfee|delonghi|pinguino|strom\w*|kwh|heiz\w*|geraeusch\w*|wie laut|reparatur|reinigung)\b/;
 return cooling.test(query)&&!otherIntent.test(query)&&!namesDifferentPortaSplit(query)&&
    !asksForPortaSplitWindowLip(query)&&!/\b(?!4048164116478\b)\d{13}\b/.test(query);
}

const philipsHumidifierGuide='/guide/luftbefeuchter-ratgeber.html';

export function exactGermanGuide(normalizedQuery) {
 const query=normalizedQuery.trim().replace(/\s+/g,' ');
 if(asksForTrotecTtk75EcoOffer(query))
   return {path:'/guide/trotec-luftentfeuchter-test.html',id:'ttk75-angebot'};
 const philipsSection=philipsHumidifierFilterSection(query);
 if(philipsSection)return {path:philipsHumidifierGuide,id:philipsSection};
 if(n90ExactName.test(query)||n90ExactEan.test(query))
   return {path:'/guide/delonghi-pac-n90-test.html',id:'testlage'};
 if(namesOriginalPortaSplitExactly(query))
   return {path:'/guide/midea-portasplit-ausverkauft-alternativen.html',id:'fensterfalz'};
 if(asksForCoolingWindowClosure(query))
   return {path:'/guide/klimaanlage-fenster-einbruchschutz.html',id:'fenster-verschluss-pruefen'};
 if(asksForGermanCoolingAt40SquareMetres(query))
   return {path:'/guide/klimaanlage-40-qm.html',id:'portasplit-40-qm'};
 const shade=exactWindowShadeMeasurement(query);
 if(shade)return {path:shade.path,id:shade.id};
 const placement=exactHygrometerPlacement(query);
 if(placement)return placement;
 const task=exactBoschStackingGuide(query) ?? exactGermanHouseholdTask(query);
 if(task===balconyThresholdMoisture)return {path:task.path,id:task.id};
 if(asksAboutIndoorWindowCondensation(query))
   return {path:'/guide/fenster-beschlagen-innen.html',id:'fenstersauger-gegen-kondenswasser'};
 if(task)return {path:task.path,id:task.id};
 if(asksForLevoitCore300SBoxFilter(query))
   return {path:'/guide/luftreiniger-ratgeber.html',id:'levoit-core-300s-lieferumfang'};
 if(exactGermanFilterModel(query)==='levoit-core-300s')
   return {path:'/ersatzfilter.html',id:'levoit-core-300s'};
 if (/\b(?:luft)?entfeuchter(?:s|n)?\b/.test(query) && /\bluftreiniger(?:s|n)?\b/.test(query) &&
     /\b(?:oder|vs|versus|unterschied\w*|vergleich\w*|beide)\b/.test(query) &&
     !/\b(?:strom\w*|kwh|kosten\w*|verbrauch\w*|ersatzfilter)\b/.test(query))
   return {path:'/guide/luftentfeuchter-oder-luftreiniger.html',id:'der-unterschied-in-einem-satz'};
 const seasonalTotal=/\b(?:saisonkosten|saisonwechsel|(?:pro|je)\s+(?:saison|winter|jahr))\b|\b\d+\s+von\s+\d+\s+(?:waesche|wasch)?ladungen\b/;
 return !seasonalTotal.test(query)&&!asksForDehumidifierDrainRoute(query)&&!asksForCellarVentilationCheck(query)&&
   asksForLaundryCostComparison(query) ? laundryComparisonGuide : null;
}

const laundryPage='/waeschetrockner-oder-luftentfeuchter.html';
const laundryComparisonGuide={path:laundryPage,id:'laundry-check'};
const singleLaundryId='luftentfeuchter-waesche-kosten';
function asksForOneDehumidifierRun(question) {
 const withDevices=question.replace(/\s+/g,' ');
 const laundry=/\b(?:waesch|waschladung)\w*/.test(withDevices)||
   (/\bladung(?:en)?\b/.test(withDevices)&&/\btrock\w*/.test(withDevices));
 return laundry &&
   /\b(?:luft)?entfeuchter(?:s|n)?\b/.test(withDevices) &&
   /\b(?:kost\w*|strom\w*|verbrauch\w*|kwh|eur|euro)\b/.test(withDevices) &&
   !mentionsLaundryDryer(withDevices) &&
   !/\b(?:oder|vs|versus|vergleich\w*|erspar\w*|guenstig\w*|billig\w*|amorti\w*|lohnt|keller\w*|stromtarif\w*|tarifwechsel\w*)\b/.test(withDevices);
}
export function searchEntries(index,term,lang){
 const query=normalize(term),words=query.match(/[\p{L}\p{N}]+/gu)?.filter(w=>!stop.has(w))||[];
 if(!words.length)return [];
 const exactGuide=lang==='de' && exactGermanGuide(query);
 const pages=index.filter(e=>e.l===lang&&typeof e.t==='string'&&/^\/(?!\/)[^?#\\]*$/.test(e.u)&&!/^\/(auth|api|account|members|widgets)(\/|\.|$)/.test(e.u));
 let targetPage, targetId;
 const filterModel=lang==='de' && exactGermanFilterModel(query);
 if(filterModel) {
   targetPage='/ersatzfilter.html'; targetId=filterModel;
 } else if(exactGuide?.path===philipsHumidifierGuide) {
   ({path:targetPage,id:targetId}=exactGuide);
 } else if(lang==='de' && asksForElectricBlanketCost(query)) {
   targetPage='/guide/heizdecke-stromverbrauch.html'; targetId='waerme-rechner';
 } else if(lang==='de' && asksForHygrometerComparison(query)) {
   targetPage='/guide/luftfeuchtigkeit-richtig-messen.html'; targetId='hygrometer-vergleichen';
 } else if(lang==='de' && asksForCoolingNoiseComparison(query)) {
   targetPage='/guide/delonghi-pac-n90-test.html'; targetId='lautstaerke';
 } else if(exactGuide && exactGuide!==laundryComparisonGuide) {
   ({path:targetPage,id:targetId}=exactGuide);
 } else if(lang==='de' && asksForN90ModelIdentity(query)) {
   targetPage='/guide/delonghi-pac-n90-test.html'; targetId='testlage';
 } else if(lang==='de' && asksForTesamollWindowProfile(query)) {
   targetPage='/guide/fenster-zugluft-mietwohnung.html'; targetId='dichtungsprofil';
 } else if(lang==='de' && asksForPortaSplitWindowLip(query)) {
   targetPage='/guide/midea-portasplit-ausverkauft-alternativen.html'; targetId='fensterfalz';
 } else if(lang==='de' && asksForWindowVacClearance(focusWindowVacQuestion(query)?.query ?? '')) {
   targetPage='/produkte.html'; targetId='fenstersauger-duesenbreite';
 } else if(lang==='de' && asksForNarrowKaercherNozzle(focusWindowVacQuestion(query)?.query ?? '')) {
   targetPage='/produkte.html'; targetId='kaercher-170mm-saugduese';
 } else if(lang==='de' && mieleBagTask(query)) {
   targetPage='/produkte.html'; targetId='miele-staubsaugerbeutel';
 } else if(lang==='de' && asksForCoffeeWaterFilterMatch(query)) {
   targetPage='/produkte.html'; targetId='kaffee-wasserfilter';
 } else if(lang==='de' && asksForTrotecTtk70Filter(query)) {
   targetPage='/guide/trotec-luftentfeuchter-test.html'; targetId='ttk70-hepa-filter';
 } else if(lang==='de' && asksForTrotecTtk75EcoConditions(query)) {
   targetPage='/guide/trotec-luftentfeuchter-test.html'; targetId='ttk75-pruefpunkt';
 } else if(lang==='de' && asksForDehumidifierDrainRoute(query)) {
   targetPage='/guide/luftentfeuchter-keller.html'; targetId='ablauf-vor-kauf';
 } else if(lang==='de' && asksForCellarVentilationCheck(query)) {
   targetPage='/guide/keller-lueften-sommer.html'; targetId='taupunkt';
 } else if(exactGuide===laundryComparisonGuide) {
   ({path:targetPage,id:targetId}=exactGuide);
 } else if(lang==='de' && asksForOneDehumidifierRun(query)) {
   targetPage=laundryPage; targetId=singleLaundryId;
 }
 const candidate=targetPage && pages.find(e=>e.u===targetPage);
 const section=candidate?.model_sections?.find(row=>row.id===targetId) ?? candidate?.section;
 const focused=section?.id===targetId && typeof section?.title==='string' && typeof section?.description==='string' ? candidate : null;
 const ranked=pages.filter(e=>!focused||e.u!==targetPage)
 .map(e=>{const title=normalize(e.t),desc=normalize(e.d||''),alias=normalize(e.a||'');const scores=words.map(w=>title.includes(w)?4:alias.includes(w)?3:desc.includes(w)?1:0);return {entry:e,score:scores.every(Boolean)?scores.reduce((a,b)=>a+b,0):0};})
 .filter(h=>h.score>0).sort((a,b)=>b.score-a.score||a.entry.u.localeCompare(b.entry.u));
 if(focused){
   const {title,description}=section;
   ranked.unshift({entry:{...focused,t:title,d:description,u:targetPage+'#'+targetId},score:1+4*words.length});
 }
 return ranked.slice(0,6);
}
if(typeof document!=='undefined'){
 const root=document.getElementById('eco-discovery');
 if(root){
  const t=JSON.parse(document.getElementById('eco-chrome-copy').textContent);
  const lang=location.pathname.startsWith('/au/')?'en-AU':({'en-GB':'en','de-DE':'de','zh':'zh-CN'}[document.documentElement.lang]||document.documentElement.lang);
  const query=document.getElementById('eb-search-query'),results=document.getElementById('eb-search-results'),status=document.getElementById('eb-search-status'),toggle=document.getElementById('eb-search-toggle'),form=document.getElementById('eb-search-form');
  let pending,timer,sequence=0;
  const emit=name=>window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));
  const close=focus=>{root.open=false;toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus();};
  async function search(){
   const id=++sequence,term=query.value.trim();results.replaceChildren();
   if(term.length<2){status.textContent=t.searchHint;return;}
   status.textContent=t.searchLoading;
   try{
    pending??=fetch('/assets/search-index.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(x=>{if(!Array.isArray(x))throw Error();return x;});
    const index=await pending;if(id!==sequence||query.value.trim()!==term)return;
    for(const {entry} of searchEntries(index,term,lang)){
     const li=document.createElement('li'),a=document.createElement('a'),title=document.createElement('strong');
     a.href=entry.u;a.hreflang=lang;title.textContent=entry.t;a.append(title);
     if(entry.d){const d=document.createElement('span');d.textContent=entry.d.slice(0,120)+(entry.d.length>120?'…':'');a.append(d);}
     a.addEventListener('click',()=>emit('eco_discovery_result'));li.append(a);results.append(li);
    }
    status.textContent=results.children.length?t.searchFound.replace('{n}',results.children.length):t.searchEmpty;
   }catch{pending=undefined;if(id===sequence)status.textContent=t.searchError;}
  }
  toggle.addEventListener('click',e=>{e.preventDefault();root.open=!root.open;toggle.setAttribute('aria-expanded',String(root.open));if(root.open)query.focus();});
  root.addEventListener('toggle',()=>{toggle.setAttribute('aria-expanded',String(root.open));if(root.open){query.focus();emit('eco_discovery_open');}});
  form.addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);search();});
  query.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,150);});
  root.querySelectorAll('[data-eco-task]').forEach(a=>a.addEventListener('click',()=>emit('eco_discovery_task')));
  document.addEventListener('click',e=>{if(!root.contains(e.target))close(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.open)close(true);});
  form.hidden=false;status.textContent=t.searchHint;
 }
}
