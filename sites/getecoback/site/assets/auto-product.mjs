// Manufacturer figures are fixed page data. User choices never leave the browser.
export function costScenario({watts,hours,rate}={}){
 if(![watts,hours,rate].every(v=>typeof v==='number'&&Number.isFinite(v))||watts<=0||watts>10000||hours<0||hours>24||rate<0||rate>10)throw new RangeError('Finite power, hours and tariff within the supported bounds are required.');
 const energyKwh=watts/1000*hours,dailyCost=energyKwh*rate;
 return {watts,hours,rate,energyKwh,dailyCost,thirtyDayCost:dailyCost*30};
}
export function explicitScenario({hours,rate}={}){return ['4','8','12'].includes(hours)&&['0.30','0.35','0.40'].includes(rate);}
export function autoEventName(action){return ({view:'eco_auto_view',example:'eco_auto_example',calculate:'eco_auto_calculate',share:'eco_auto_share'})[action]||null;}
export function eventExcluded({dnt=false,gpc=false,webdriver=false,search='',example=false}={}){return dnt==='1'||dnt===true||!!gpc||!!webdriver||/[?&]__(probe|ci|qa)(=|&|$)/.test(search)||!!example;}
export function scenarioText(result,{language='en-GB',currency='GBP',name='Dehumidifier',url='',example=false,drainage='unknown',drainVerified=false}={}){
 const de=language==='de';if(!['de','en-GB'].includes(language)||currency!==(de?'EUR':'GBP'))throw new RangeError('Country language/currency mismatch.');
 if(!['unknown','tank','hose'].includes(drainage))throw new RangeError('Invalid drainage choice.');
 const n=v=>v.toFixed(2).replace('.',de?',':'.'),cash=v=>de?n(v)+' €':'£'+n(v);
 const title=de?(example?'Beispielrechnung – keine eigene Auswahl':'Dein Szenario – keine Verbrauchsmessung'):(example?'Example calculation — not your selection':'Your scenario — not a consumption measurement');
 const cost=de?`${result.watts} W ÷ 1000 × ${result.hours} h × ${cash(result.rate)}/kWh = ${cash(result.dailyCost)} pro Tag (${n(result.energyKwh)} kWh). Bei gleicher Nutzung an 30 Tagen: ${cash(result.thirtyDayCost)}.`:`${result.watts} W ÷ 1000 × ${result.hours} h × ${cash(result.rate)}/kWh = ${cash(result.dailyCost)} per day (${n(result.energyKwh)} kWh). At the same run time for 30 days: ${cash(result.thirtyDayCost)}.`;
 const limit=de?'Szenarioschätzung bei durchgehend dieser Herstellerleistung, keine Prognose und keine garantierte Leistungsobergrenze. Tatsächlichen Verbrauch mit einem geeigneten Strommessgerät prüfen. Der gewählte Preis ist eine Annahme, kein aktueller Tarif.':'Scenario estimate at this constant manufacturer power, not a forecast or a guaranteed power ceiling. Check actual consumption with a suitable plug-in energy monitor. The selected price is an assumption, not a current tariff.';
 let drain=de?'Tank und Ablauf erst anhand der genauen Modellanleitung planen. Aus Tankgröße und Labor-Literleistung folgt kein tatsächliches Entleerungsintervall.':'Plan tank emptying and drainage using the exact model manual. Tank capacity divided by laboratory extraction does not establish a real emptying interval.';
 if(drainage==='tank')drain=de?'Tankbetrieb: Füllstand zunächst regelmäßig prüfen und die Abschaltfunktion in der Anleitung bestätigen. Keine verlässliche Entleerungszeit aus Laborwerten.':'Tank use: check the fill level regularly at first and confirm shut-off in the manual. Laboratory figures do not provide a reliable emptying time.';
 if(drainage==='hose')drain=de?(drainVerified?'Ablauf laut erfasster Quelle vorhanden. Schlauchanschluss, Gefälle und erlaubte Aufstellung prüfen; keine eingebaute Pumpe oder unbeaufsichtigte Nutzung unterstellen.':'Schlauchbetrieb ist in den erfassten Daten nicht bestätigt. Erst Anschluss und Anleitung verifizieren, bevor du damit planst.'):(drainVerified?'A drain is identified in the captured source. Check the hose connector, fall and permitted placement; do not assume a built-in pump or unattended-use permission.':'Hose drainage is not confirmed in the captured data. Verify the connection and manual before relying on it.');
 const safeUrl=/^https:\/\/getecoback\.com\/(?:en\/)?guide\/[a-z0-9-]+\.html$/.test(url)?url:'';
 return {title,cost,limit,drain,share:`EcoBack — ${name}\n${title}\n${cost}\n${limit}\n${drain}\n${safeUrl}`};
}
if(typeof document!=='undefined'){
 const root=document.querySelector('#auto-product-tool');
 if(root){
  const q=s=>root.querySelector(s),form=q('form'),example=q('[data-auto-example]'),result=q('[data-auto-result]');let latest=null;const seen=new Set();
  const opts={language:root.dataset.language,currency:root.dataset.currency,name:root.dataset.productName,url:root.dataset.shareUrl,drainVerified:root.dataset.drainVerified==='yes'};
  const emit=action=>{const name=autoEventName(action);if(!name||seen.has(name)||eventExcluded({dnt:navigator.doNotTrack,gpc:navigator.globalPrivacyControl,webdriver:navigator.webdriver,search:location.search,example:window.__ecoToolExample}))return;seen.add(name);window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));};
  const display=(selection,isExample)=>{const calculation=costScenario({watts:Number(root.dataset.powerWatts),hours:Number(selection.hours),rate:Number(selection.rate)});latest=scenarioText(calculation,{...opts,example:isExample,drainage:selection.drainage||'unknown'});q('[data-auto-result-title]').textContent=latest.title;q('[data-auto-result-cost]').textContent=latest.cost;q('[data-auto-result-limit]').textContent=latest.limit;q('[data-auto-result-drain]').textContent=latest.drain;q('[data-auto-status]').textContent='';q('[data-auto-copy-text]').hidden=true;result.hidden=false;result.focus();};
  form.hidden=false;example.hidden=false;
  form.addEventListener('change',()=>{latest=null;result.hidden=true;q('[data-auto-status]').textContent='';q('[data-auto-copy-text]').hidden=true;});
  form.addEventListener('submit',event=>{event.preventDefault();const selection=Object.fromEntries(new FormData(form));if(!explicitScenario(selection))return;display(selection,false);emit('calculate');});
  example.addEventListener('click',()=>{display({hours:'8',rate:'0.35',drainage:'unknown'},true);emit('example');});
  q('[data-auto-copy]').addEventListener('click',async()=>{if(!latest)return;try{await navigator.clipboard.writeText(latest.share);q('[data-auto-copy-text]').hidden=true;q('[data-auto-status]').textContent=opts.language==='de'?'Ergebnis kopiert. Du entscheidest, wo du es teilst.':'Result copied. You choose where to share it.';emit('share');}catch{const fallback=q('[data-auto-copy-text]');fallback.value=latest.share;fallback.hidden=false;fallback.focus();fallback.select();q('[data-auto-status]').textContent=opts.language==='de'?'Kopieren war nicht verfügbar. Text unten auswählen und kopieren.':'Copy was unavailable. Select and copy the text below.';}});
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){emit('view');observer.disconnect();}},{threshold:.2});observer.observe(form);}
 }
}
