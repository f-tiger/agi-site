import {laundry} from './laundry-math.mjs';
export function acquisition(href,referrer=''){
 const u=new URL(href),source=u.searchParams.get('utm_source');
 if(u.searchParams.get('utm_campaign')!=='eco-laundry-03'||u.searchParams.get('utm_medium')!=='organic_video'||!['youtube','tiktok'].includes(source))return {source:'onsite',evidence:'none'};
 let h='';try{h=new URL(referrer).hostname.toLowerCase();}catch{}
 const same=d=>h===d||h.endsWith('.'+d);
 return {source,evidence:(source==='youtube'&&(same('youtube.com')||same('youtu.be'))||source==='tiktok'&&same('tiktok.com'))?'referrer':h?'other':'tag_only'};
}
if(typeof document!=='undefined'){
 const root=document.querySelector('#laundry-check');
 if(root){
 const en=root.dataset.lang==='en',t=(de,english)=>en?english:de,form=root.querySelector('form'),q=s=>root.querySelector(s),results=q('[data-results]'),seen=new Set();let latest=null;
 const values=()=>{const d=new FormData(form),number=n=>Number(d.get(n));return {dryer:number('dryer'),dryerBasis:d.get('dryerBasis'),method:d.get('method'),watts:number('watts'),hours:number('hours'),dehum:number('dehum'),price:number('price'),loads:number('loads'),purchase:number('purchase'),currency:d.get('currency'),comparable:d.has('comparable')};};
 const signature=x=>JSON.stringify({...x,comparable:false,watts:x.method==='estimate'?x.watts:0,hours:x.method==='estimate'?x.hours:0,dehum:x.method==='measured'?x.dehum:0});const initial=signature(values());
 const inputKind=x=>signature(x)===initial?'example':'edited';
 const privacy=()=>navigator.doNotTrack==='1'||navigator.globalPrivacyControl||navigator.webdriver||/[?&]__(probe|ci|qa)(=|&|$)/.test(location.search);
 const emit=(name,action,x=values())=>{if(privacy()||window.__ecoToolExample)return;const m={lang:en?'en':'de',input:inputKind(x),method:x.method,equal:x.comparable?'yes':'no',action,...acquisition(location.href,document.referrer)},key=name+JSON.stringify(m);if(seen.has(key))return;seen.add(key);try{fetch('/api/ev',{method:'POST',keepalive:true,credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify({n:name,p:location.pathname,r:document.referrer,m})}).catch(()=>{});}catch{}};
 const invalidate=()=>{latest=null;results.hidden=true;q('[data-error]').textContent='';};
 const mode=()=>{const measured=form.elements.method.value==='measured';q('[data-measured]').hidden=!measured;q('[data-estimate]').hidden=measured;form.elements.dehum.disabled=!measured;form.elements.watts.disabled=measured;form.elements.hours.disabled=measured;};
 const fmt=(n,d=2)=>n.toLocaleString(en?'en-GB':'de-DE',{maximumFractionDigits:d});
 const money=(n,c)=>Number(n.toFixed(10)).toLocaleString(en?'en-GB':'de-DE',{style:'currency',currency:c});
 form.addEventListener('input',invalidate);form.addEventListener('change',()=>{invalidate();mode();});mode();
 const run=()=>{
 invalidate();if(!form.reportValidity())return;
 try{
 const x=values(),r=laundry(x),m=n=>money(n,x.currency),max=Math.max(r.dryerCost,r.dehumCost,.00001);
 q('[data-cost=dryer]').textContent=m(r.dryerCost);q('[data-cost=dehum]').textContent=m(r.dehumCost);
 q('[data-bar=dryer]').style.width=(100*r.dryerCost/max)+'%';q('[data-bar=dehum]').style.width=(100*r.dehumCost/max)+'%';
 const provenance=t(inputKind(x)==='example'?'Rechenbeispiel':'Deine geänderten Eingaben',inputKind(x)==='example'?'Fictional example':'Your edited inputs')+' · '+t(x.method==='measured'?'kWh eingegeben, nicht verifiziert':'Watt × Stunden geschätzt',x.method==='measured'?'entered kWh, not verified':'estimated watts × hours');
 const verdict=r.winner==='unconfirmed'?t('Kosten berechnet. Vergleichbarkeit noch bestätigen.','Costs calculated. Confirm equivalent drying first.'):r.winner==='tie'?t('Gleiche Stromkosten mit diesen Eingaben.','Same electricity cost with these inputs.'):r.winner==='dryer'?t('Der Trockner verursacht hier geringere Stromkosten.','The dryer costs less to run in this scenario.'):t('Der Entfeuchter verursacht hier geringere Stromkosten.','The dehumidifier costs less to run in this scenario.');
 const annual=t(`Bei ${fmt(x.loads)} Ladungen pro Woche: Trockner ${m(r.annualDryer)}, Entfeuchter ${m(r.annualDehum)} pro Jahr.`,`At ${fmt(x.loads)} loads per week: dryer ${m(r.annualDryer)}, dehumidifier ${m(r.annualDehum)} per year.`);
 const threshold=r.breakEvenHours===null?'':t(`Strom-Gleichstand bei ${fmt(r.breakEvenHours)} Stunden mit ${fmt(x.watts)} W mittlerer Leistung. Nur bei gleicher Trocknung und demselben Tarif.`,`Energy break-even: ${fmt(r.breakEvenHours)} hours at ${fmt(x.watts)} W average power. Only with equivalent drying and the same tariff.`);
 const payback=x.purchase===0?t('Kein zusätzlicher Kaufpreis angesetzt. Das bedeutet nicht, dass ein neues Gerät kostenlos ist.','No extra purchase cost entered. This does not mean a new device is free.'):r.payback===null?t('Kein belastbarer Rückfluss des zusätzlichen Kaufpreises aus diesem Stromvergleich.','No supported payback for the extra purchase cost from this comparison.'):t(`Rechnerischer Rückfluss des zusätzlichen Kaufpreises: ${fmt(r.payback)} Jahre. Unveränderte Nutzung und Tarife vorausgesetzt; Lebensdauer nicht geprüft.`,`Simple payback of extra purchase cost: ${fmt(r.payback)} years. Assumes unchanged use and tariffs; service life is unknown.`);
 const formula=t(`Trockner ${fmt(r.dryer,4)} kWh × ${m(x.price)}/kWh. Entfeuchter ${fmt(r.dehum,4)} kWh × ${m(x.price)}/kWh. Jahreswerte werden vor der Rundung berechnet.`,`Dryer ${fmt(r.dryer,4)} kWh × ${m(x.price)}/kWh. Dehumidifier ${fmt(r.dehum,4)} kWh × ${m(x.price)}/kWh. Annual values use unrounded costs.`);
 for(const [attr,text] of Object.entries({provenance,verdict,annual,breakeven:threshold,payback,formula}))q('[data-'+attr+']').textContent=text;
 latest={x,r,provenance,verdict,annual,threshold,payback,formula};results.hidden=false;if(!window.__ecoToolExample)results.focus();q('[data-export-status]').textContent='';emit('laundry_compare','compare',x);
 }catch{q('[data-error]').textContent=t('Bitte gültige Werte prüfen. Trockner maximal 20 kWh je Ladung.','Check the values. Dryer consumption must not exceed 20 kWh per load.');}
 };
 form.addEventListener('submit',e=>{e.preventDefault();run();});
 q('[data-example]').addEventListener('click',()=>{form.reset();mode();invalidate();form.elements.comparable.checked=true;run();});
 const download=(blob,name)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);};
 q('[data-csv]').addEventListener('click',()=>{if(!latest)return;const {x,r}=latest,rows=[['EcoBack laundry comparison','scenario, not a product test'],['canonical','https://getecoback.com'+location.pathname],['input_status',inputKind(x)],['method',x.method],['dryer_input',x.dryer],['dryer_input_basis',x.dryerBasis],['average_watts',x.method==='estimate'?x.watts:'not used'],['runtime_hours',x.method==='estimate'?x.hours:'not used'],['equivalent_drying_confirmed',x.comparable],['currency',x.currency],['unit_price',x.price],['loads_per_week',x.loads],['extra_upfront_cost',x.purchase],['dryer_kwh_per_load',r.dryer],['dehumidifier_kwh_per_run',r.dehum],['dryer_cost_per_load',r.dryerCost],['dehumidifier_cost_per_run',r.dehumCost],['annual_dryer',r.annualDryer],['annual_dehumidifier',r.annualDehum],['simple_payback_years',r.payback??'not supported'],['excluded','heating, ventilation heat, repairs, time, financing, lifetime']];download(new Blob(['\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'ecoback-laundry.csv');emit('laundry_export','csv',x);});
 q('[data-card]').addEventListener('click',()=>{if(!latest)return;const {x,r,provenance,verdict,annual,formula}=latest,canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1280;const c=canvas.getContext('2d');c.fillStyle='#f3f8fb';c.fillRect(0,0,1080,1280);let y=60;
 const line=(s,size=29,bold=false)=>{c.fillStyle='#183d4a';c.font=`${bold?'700':'400'} ${size}px Arial`;let row='';for(const word of s.split(' ')){const trial=(row+' '+word).trim();if(c.measureText(trial).width>940&&row){c.fillText(row,60,y);y+=size*1.4;row=word;}else row=trial;}c.fillText(row,60,y);y+=size*1.5;};
 line('ECOBACK / '+t('WÄSCHEKOSTEN','LAUNDRY COSTS'),28,true);y+=20;line(provenance,24);y+=24;line(verdict,43,true);y+=24;
 const maximum=Math.max(r.dryerCost,r.dehumCost,.00001);for(const [label,cost,color] of [[t('Trockner','Dryer'),r.dryerCost,'#087ca7'],[t('Entfeuchter','Dehumidifier'),r.dehumCost,'#668334']]){line(label+' · '+money(cost,x.currency),35,true);c.fillStyle=color;c.fillRect(60,y,Math.max(2,900*cost/maximum),30);y+=75;}
 line(annual);y+=12;line(formula,24);y+=12;line(t('Gleiche Wäsche und Restfeuchte: ','Equivalent load and dryness: ')+(x.comparable?t('bestätigt','confirmed'):t('nicht bestätigt','not confirmed')),24,true);line(t('Nur direkte Stromkosten. Kauf, Raumwärme, Lüftung und Zeit nicht in den Balken.','Direct electricity only. Bars exclude purchase, room heat, ventilation and time.'),24);y+=8;line('getecoback.com',23,true);line(location.pathname,17);line(t('Deine Eingaben · keine verifizierte Produktmessung','Your inputs · not a verified product test'),23);
 if(y>1250){q('[data-export-status]').textContent=t('Diese Werte sind zu lang für die Karte. Bitte CSV verwenden.','These values do not fit the card. Use CSV instead.');return;}
 canvas.toBlob(blob=>{if(!blob)return;download(blob,'ecoback-laundry.png');emit('laundry_export','card',x);},'image/png');
 });
 q('[data-share]').addEventListener('click',async()=>{const url='https://getecoback.com'+location.pathname+'#laundry-check';q('[data-share-url]').textContent=url;try{await navigator.clipboard.writeText(url);q('[data-share-url]').textContent=t('Kopiert: ','Copied: ')+url;}catch{}emit('laundry_next','share');});
 q('[data-laundry-next]').addEventListener('click',()=>emit('laundry_next','guide'));
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(rows=>{if(rows.some(r=>r.isIntersecting)){emit('laundry_view','view');observer.disconnect();}},{threshold:.2});observer.observe(form);}
 }
}
