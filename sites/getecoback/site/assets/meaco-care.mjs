// Only this manufacturer's verified 10L/12L compatibility is represented here.
export const MEACO_SOURCE='https://www.meaco.com/products/meacodryarete10l-12lhepafilter';
export const CARE_URL='https://getecoback.com/en/guide/12l-vs-20l-dehumidifier-uk.html#meaco-care';
export function packCost({packPence=2999,packSize=3,filtersUsed=4,openingStock=0}={}){
 if(![packPence,packSize,filtersUsed,openingStock].every(Number.isSafeInteger)||packPence<0||packSize<1||filtersUsed<0||openingStock<0||Math.max(packPence,packSize,filtersUsed,openingStock)>1000000)throw new RangeError('Invalid pack-cost example.');
 const packs=Math.ceil(Math.max(0,filtersUsed-openingStock)/packSize);
 return {annualUsePence:Math.round(filtersUsed*packPence/packSize),packs,purchasePence:packs*packPence,leftover:openingStock+packs*packSize-filtersUsed};
}
export function careDecision({generation='unknown',size='unknown',purpose='unknown'}={}){
  if(!['unknown','one','two','other'].includes(generation)||!['unknown','10','12','20','25','other'].includes(size)||!['unknown','dry','air'].includes(purpose))throw new RangeError('Choose a listed option.');
  const verified=['one','two'].includes(generation)&&['10','12'].includes(size);
  if(!verified)return {status:'unverified',title:'Match the label before buying a filter.',text:'This check verifies only Arete One and Arete Two 10L/12L against the linked manufacturer page. The selected or unknown model is not verified here. Do not infer that a similar shape, capacity or family name makes a filter compatible. Check the exact model manual and official accessory listing.',cost:false};
  if(purpose==='dry')return {status:'optional',title:'For dehumidifying alone, HEPA is optional.',text:'For this verified Arete family, Meaco says the additional HEPA filter does not have to be fitted all the time. Keep and maintain the standard dust filter as the manual directs. Do not buy replacement HEPA filters solely because the dehumidifier needs its dust filter cleaned.',cost:false};
  if(purpose==='air')return {status:'verified',title:'The official 10L/12L H13 pack lists this model.',text:'Meaco lists Arete One and Arete Two 10L/12L for this pack. Check the exact item again before buying. The additional HEPA filter slightly reduces water extraction efficiency and increases noise, according to the manufacturer. It does not replace cleaning the standard dust filter.',cost:true};
  return {status:'purpose',title:'The model matches; decide whether you need the extra filtration.',text:'The linked 10L/12L H13 pack lists this model. HEPA is additional air filtration, not a requirement for dehumidifying alone. Choose your purpose to see the next step. This check does not assess health needs or promise a health benefit.',cost:false};
}
export function careShareText(result){
  const cost=result.cost?' Illustration, not a quote: £29.99 per 3-pack (read 17 October 2026). Four filters/year at the manufacturer’s roughly three-month reference costs £39.99 in annual consumption; starting with no filters requires two packs (£59.98), leaving two filters. This excludes any included filter, delivery and future price changes. Replacement timing depends on conditions; three months is not a lifespan guarantee.':'';
  return `EcoBack — Meaco filter care\n${result.title}\n${result.text}${cost}\nDo not wash, cut or improvise a HEPA filter. Verify stock and the exact model with the manufacturer.\n${CARE_URL}`;
}
export function careEventName(action){return ({view:'eco_upkeep_view',decision:'eco_upkeep_decision',share:'eco_upkeep_share'})[action]||null;}
// An explicit unverified model still completes the check; untouched choices do not.
export function careComplete({generation,size,purpose}={}){
 return ['one','two','other'].includes(generation)&&['10','12','20','25','other'].includes(size)&&['dry','air'].includes(purpose);
}
if(typeof document!=='undefined'){
 const root=document.querySelector('#meaco-care');
 if(root){
  const q=s=>root.querySelector(s),form=q('form'),result=q('[data-care-result]'),copy=q('[data-care-copy]'),fallback=q('[data-care-fallback]');let latest=null;const seen=new Set();
  const excluded=()=>navigator.doNotTrack==='1'||navigator.globalPrivacyControl||navigator.webdriver||/[?&]__(probe|ci|qa)(=|&|$)/.test(location.search)||window.__ecoToolExample;
  const emit=action=>{const name=careEventName(action);if(!name||excluded()||seen.has(name))return;seen.add(name);window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));};
  form.hidden=false;
  form.addEventListener('change',()=>{latest=null;result.hidden=true;q('[data-care-copy-box]').hidden=true;copy.disabled=true;q('[data-care-status]').textContent='';});
  form.addEventListener('submit',e=>{e.preventDefault();const selection=Object.fromEntries(new FormData(form));latest=careDecision(selection);q('[data-care-title]').textContent=latest.title;q('[data-care-text]').textContent=latest.text;q('[data-care-cost-link]').hidden=!latest.cost;result.hidden=false;copy.disabled=false;result.focus();if(careComplete(selection))emit('decision');});
  copy.addEventListener('click',async()=>{if(!latest)return;const text=careShareText(latest);try{await navigator.clipboard.writeText(text);q('[data-care-copy-box]').hidden=true;q('[data-care-status]').textContent='Guidance copied. You choose where to share it.';emit('share');}catch{q('[data-care-copy-box]').hidden=false;fallback.value=text;fallback.focus();fallback.select();q('[data-care-status]').textContent='Copy was unavailable. Select and copy the guidance below.';}});
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(rows=>{if(rows.some(r=>r.isIntersecting)){emit('view');observer.disconnect();}},{threshold:.2});observer.observe(form);}
 }
}
