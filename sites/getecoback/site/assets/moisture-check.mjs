// Same-pressure vapour-pressure comparison, not a building diagnosis.
export function assess(v) {
 const limits={inside:[0,40],rh:[1,100],outside:[-30,45],outRh:[1,100]};
 for(const [k,[lo,hi]] of Object.entries(limits))if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<lo||v[k]>hi)throw new RangeError('Messwerte prüfen');
 const sat=t=>6.112*Math.exp(17.62*t/(243.12+t));
 const indoor=sat(v.inside)*v.rh/100, outdoor=sat(v.outside)*v.outRh/100;
 const equivalent=100*outdoor/sat(v.inside), difference=v.rh-equivalent;
 // A five percentage-point margin is an operating rule for sensor uncertainty,
 // not a biological safety limit. Below freezing the approximation is over water.
 return {equivalent,difference,state:v.damage?'cause':v.rh<40?'dry':difference>5?'air':difference< -5?'wetter':'uncertain'};
}
const root=typeof document!=='undefined'?document.querySelector('#moisture-check'):null;
if(root){
 const form=root.querySelector('form'),output=root.querySelector('[data-output]'),status=root.querySelector('[data-status]');
 root.querySelectorAll('[data-js]').forEach(el=>el.hidden=false);
 const key='eco_moisture_records_v1';let current=null,example=false;const sent=new Set();
 const messages={cause:'Feuchteursache klären: Nasse Wände, Lecks oder sichtbarer Schimmel brauchen eine fachliche Prüfung. Messwerte dokumentieren; ein Gerätekauf ersetzt die Ursachenklärung nicht.',dry:'Nicht zusätzlich entfeuchten: Deine Raumluft liegt unter 40 %. Lüften für Luftqualität bleibt wichtig; dieser Check beurteilt nur den Feuchtetransport.',air:'Außenluft hat Trocknungspotenzial. Kurz und bedarfsgerecht lüften, danach wieder auf übliche Raumtemperatur bringen und erneut messen. Das ist keine garantierte Ziel-Feuchte oder feste Lüftungsdauer.',wetter:'Lüften würde unter diesen Messbedingungen eher Feuchte eintragen. Für die Luftqualität kann Lüften trotzdem nötig sein. Feuchtequellen und kühlere beziehungsweise trockenere Zeitfenster prüfen, nicht pauschal alle Fenster geschlossen halten.',uncertain:'Kein deutlicher Unterschied. Sensorabweichungen können die Richtung ändern. Messungen wiederholen; aus diesen Werten folgt keine Kaufempfehlung.'};
 function emit(name){
  if(sent.has(name)||navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl||['__probe','qa','__qa','ci','__ci'].some(k=>new URLSearchParams(location.search).has(k)))return;
  try{if(localStorage.getItem('fleet_ga4_choice_v1')==='denied')return;}catch{}
  sent.add(name);window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));
  const body=JSON.stringify({n:name,p:location.pathname,r:document.referrer,m:{}});
  try{navigator.sendBeacon('/api/ev',new Blob([body],{type:'text/plain'}));}catch{}
 }
 function records(){try{const r=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(r)?r.filter(x=>{try{assess(x);return typeof x.at==='string'&&Number.isFinite(Date.parse(x.at));}catch{return false;}}).slice(-30):[];}catch{return [];}}
 function render(){const list=root.querySelector('[data-history]');list.replaceChildren();for(const r of records()){const li=document.createElement('li');li.textContent=`${new Date(r.at).toLocaleString('de-DE')}: innen ${r.inside} °C / ${r.rh} %, außen ${r.outside} °C / ${r.outRh} %`;list.append(li);}}
 form.addEventListener('input',()=>{current=null;example=false;output.hidden=true;root.querySelector('[data-save]').disabled=true;});
 root.querySelector('[data-example]').addEventListener('click',()=>{for(const [k,v] of Object.entries({inside:20,rh:65,outside:5,outRh:90}))form.elements[k].value=v;form.elements.damage.checked=false;example=true;form.requestSubmit();});
 form.addEventListener('submit',e=>{e.preventDefault();try{const v=Object.fromEntries(['inside','rh','outside','outRh'].map(k=>[k,Number(form.elements[k].value)]));v.damage=form.elements.damage.checked;const a=assess(v);current={...v,at:new Date().toISOString()};output.hidden=false;root.querySelector('[data-verdict]').textContent=(example?'Fiktives Beispiel. ':'')+messages[a.state];root.querySelector('[data-number]').textContent=`Außenluft hätte bei deiner Innentemperatur rechnerisch ${a.equivalent.toFixed(1)} % relative Feuchte${a.equivalent>100?' (über Sättigung: Kondensation möglich)':''}. Das ist kein vorhergesagter Raumwert nach dem Lüften.`;root.querySelector('[data-save]').disabled=example;status.textContent='';output.focus();emit(example?'eco_moisture_example':'eco_moisture_check');}catch{status.textContent='Bitte alle vier Messwerte innerhalb der angegebenen Grenzen eintragen.';}});
 root.querySelector('[data-save]').addEventListener('click',()=>{if(!current||example)return;try{localStorage.setItem(key,JSON.stringify([...records(),current].slice(-30)));render();status.textContent='Auf diesem Gerät gespeichert. Nach dem Lüften erneut messen und vergleichen.';root.querySelector('[data-save]').disabled=true;emit('eco_moisture_save');}catch{status.textContent='Speichern ist hier nicht verfügbar. Du kannst die Werte selbst notieren.';}});
 root.querySelector('[data-clear]').addEventListener('click',()=>{try{localStorage.removeItem(key);render();status.textContent='Lokale Messreihe gelöscht.';}catch{status.textContent='Löschen ist in diesem Browser nicht verfügbar.';}});
 root.querySelector('[data-export]').addEventListener('click',()=>{const rows=records();if(!rows.length){status.textContent='Zuerst eigene Messwerte speichern.';return;}const csv=['Zeitpunkt UTC,Innen Celsius,Innen rF,Außen Celsius,Außen rF',...rows.map(r=>[new Date(r.at).toISOString(),r.inside,r.rh,r.outside,r.outRh].join(','))].join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ecoback-feuchtemessung.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='CSV-Download gestartet.';emit('eco_moisture_export');});render();
}
