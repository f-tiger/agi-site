import {drying,measured,replacement} from './household-math.mjs';
const form=document.querySelector('[data-household]'),out=document.querySelector('#result');
const eur=n=>(Math.round((n+Number.EPSILON)*100)/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'}),num=n=>n.toLocaleString('de-DE',{maximumFractionDigits:2});
if(form){
 const calc=()=>{
  if(!form.reportValidity())return;
  const data=Object.fromEntries([...new FormData(form)].map(([k,v])=>[k,Number(v)]));
  try{
   let text;const kind=form.dataset.household;
   if(kind==='drying'){
    const r=drying(data);text=`Trockner: ${num(r.dryer)} kWh und ${eur(r.dryerCost)} je Ladung. Entfeuchter: ${num(r.dehum)} kWh und ${eur(r.dehumCost)} je Durchgang. Bei ${num(data.loads)} Ladungen pro Woche: ${eur(r.annualDryer)} gegenüber ${eur(r.annualDehum)} im Jahr. Differenz: ${eur(Math.abs(r.difference))} zugunsten ${r.difference>0?'des Trockners':r.difference<0?'des Entfeuchters':'keiner Variante'}. Nur direkte Stromkosten; gleiche Wäschemenge und Restfeuchte vorausgesetzt.`;
   }else if(kind==='measured'){
    const r=measured(data);text=`${num(r.daily)} kWh je 24 Stunden. Hochgerechnet auf ${num(data.days)} Betriebstage: ${num(r.annual)} kWh und ${eur(r.cost)}. Das ist eine Hochrechnung aus deinem Messzeitraum, keine Verbrauchsprognose.`;
   }else{
    const r=replacement(data);text=`Stromkosten-Differenz: ${eur(r.saving)} pro Jahr. ${r.payback===null?'Kein Rückfluss des Kaufpreises durch Stromersparnis.':`Rechnerischer Rückfluss des Kaufpreises nach ${num(r.payback)} Jahren.`} Über ${num(data.years)} Jahre: vorhandenes Gerät ${eur(r.keep)}, neues Gerät einschließlich Kauf ${eur(r.buy)}. Reparaturen, Finanzierung, Restwert und graue Energie sind nicht eingerechnet.`;
   }
   out.textContent=text;out.focus();
   // Only an intentional successful calculation, no inputs or result sent.
   if(!new URLSearchParams(location.search).has('__probe'))window.gtag?.('event','stromkosten_calc',{source:'household-'+kind});
  }catch{out.textContent='Bitte gültige Zahlen innerhalb der angegebenen Grenzen eingeben.';}
 };
 form.addEventListener('submit',e=>{e.preventDefault();calc();});
}
