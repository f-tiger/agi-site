const {calculate}=await import('./winter-math.mjs'+new URL(import.meta.url).search);
const fmt=(n,d=2)=>n.toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
const event=name=>window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'legacy:'+name}}));
for(const root of document.querySelectorAll('[data-winter-tool]')){
 const kind=root.dataset.winterTool,form=root.querySelector('form'),result=root.querySelector('[data-result]'),error=root.querySelector('[data-error]'),download=root.querySelector('[data-export]'),seen=new Set();let latest=null,started=false;
 const reset=()=>{latest=null;result.hidden=true;download.hidden=true;error.textContent='';};
 form.addEventListener('input',()=>{reset();if(!started){started=true;event('tool_start');}});
 form.addEventListener('change',reset);
 form.addEventListener('submit',ev=>{
  ev.preventDefault();reset();if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form)),own=data.own==='on';delete data.own;
  try{
   const currency=data.currency==='CHF'?'CHF':'EUR',r=calculate(kind,data),lines=[own?'Eigene Angaben · Szenariorechnung':'Frei gewähltes Rechenbeispiel · keine Messung'];
   if(kind==='thermostat')lines.push(`Angenommene Bruttoersparnis: ${fmt(r.gross)} ${currency}/Jahr`,`Nach laufenden Kosten: ${fmt(r.net)} ${currency}/Jahr`,r.payback===null?'Keine positive jährliche Nettoersparnis; keine Amortisation.':`Einfache Amortisation: ${fmt(r.payback,1)} Jahre (ohne Finanzierung oder Preisänderungen).`);
   if(kind==='shower')lines.push(`Bisher: ${fmt(r.before.litres,1)} Liter und ${fmt(r.before.cost)} ${currency} pro Dusche`,`Vergleich: ${fmt(r.after.litres,1)} Liter und ${fmt(r.after.cost)} ${currency} pro Dusche`,`Jährliche variable Kostendifferenz: ${fmt(r.annual)} ${currency}`,`Wasserdifferenz: ${fmt(r.waterSaved,1)} m³/Jahr`,r.payback===null?'Keine positive Kostendifferenz; keine Amortisation.':`Einfache Amortisation der Sparbrause: ${fmt(r.payback,1)} Jahre.`,'Gleiche Duschzeit und Temperatur angenommen. Verteilverluste und Grundgebühren nicht enthalten.');
   if(kind==='lights')lines.push(`Bisher: ${fmt(r.before)} kWh · ${fmt(r.beforeCost)} ${currency}`,`Mit Timer: ${fmt(r.after)} kWh · ${fmt(r.afterCost)} ${currency}`,`Differenz im gewählten Zeitraum: ${fmt(r.saving)} ${currency}`,r.saving<=0?'Unter diesen Annahmen spart der Timer keine Stromkosten.':'Der Timer-Kaufpreis ist noch nicht abgezogen.');
   result.replaceChildren(...lines.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));result.hidden=false;result.focus();download.hidden=false;
   latest={text:[document.title,...lines,'','Eingaben:',...Object.entries(data).map(([key,value])=>`${form.elements[key].closest('label').childNodes[0].textContent.trim()}: ${value}`),'','Quelle: '+document.querySelector('link[rel=canonical]').href].join('\n'),own};
   const signature=JSON.stringify(data);if(own&&!seen.has(signature)){seen.add(signature);event('tool_complete');}
  }catch(e){error.textContent=e.message;}
 });
 download.addEventListener('click',()=>{if(!latest)return;const u=URL.createObjectURL(new Blob([latest.text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='ecoback-winter-rechnung.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);if(latest.own)event('tool_export');});
 root.dataset.ready='true';
}
