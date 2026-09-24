(function () {
'use strict';
const $ = id => document.getElementById(id);
const ids = ['energy','tender','compliance'];
let active = 'energy', report = '';
const money = n => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n);
function tab(id) {
  if (!ids.includes(id)) return;
  active = id;
  document.querySelectorAll('.tab').forEach(t => {const selected=t.dataset.tab===id;t.classList.toggle('active',selected);t.setAttribute('aria-pressed',String(selected));});
  document.querySelectorAll('.workspace').forEach(w=>w.classList.toggle('active',w.id===id));
}
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{tab(t.dataset.tab);history.replaceState(null,'','#'+active);}));
window.addEventListener('hashchange',()=>tab(location.hash.slice(1)));
tab(ids.includes(location.hash.slice(1))?location.hash.slice(1):'energy');
// Tools audit 2026-09-22: one beacon per intentional run; probes never count.
function ev(n,m){try{if(new URLSearchParams(location.search).has('__probe'))return;if(window.ebSend)return window.ebSend(n,m);navigator.sendBeacon('/api/ev',new Blob([JSON.stringify({n:n,p:location.pathname,r:document.referrer,m:m||null})],{type:'text/plain'}));}catch(e){}}
function value(id) {return $(id).value;}
function output(id, text) {const el=$(id);el.className='output';el.style.whiteSpace='pre-line';el.setAttribute('role','status');el.textContent=text;report=text;}
function persist(ids) {try {localStorage.setItem('eb_pro_tools_v2',JSON.stringify(Object.fromEntries(ids.map(id=>[id,value(id)]))));} catch (_) {}}
const fields=['eBill','eCost','eType','eSave','eRegion','eYears','tKey','tRegion','tDays','tSize','tSet','tValue','cType','cOrigin','cData','cSales'];
try {const saved=JSON.parse(localStorage.getItem('eb_pro_tools_v2')||'{}');fields.forEach(id=>{if(typeof saved[id]==='string' && saved[id].length<300) $(id).value=saved[id];});} catch (_) {}
['eBill','eCost'].forEach(id=>{$(id).required=true;$(id).max='1000000000';});
$('eSave').outerHTML='<input id="eSave" type="number" required min="0" max="100" step="0.1" value="27">';
$('eType').maxLength=120;$('tKey').maxLength=120;
$('energyRun').addEventListener('click',()=>{
  if(!['eBill','eCost','eSave'].every(id=>$(id).reportValidity())) return;
  const bill=+value('eBill'),cost=+value('eCost'),pct=+value('eSave'),years=+value('eYears');
  if(![bill,cost,pct,years].every(Number.isFinite)||bill<=0||cost<=0||pct<0||pct>100||![5,10,15].includes(years)) return;
  const annual=bill*12*pct/100;
  const scenarios=[Math.max(0,pct-10),pct,Math.min(100,pct+10)];
  ev('pro_tool_run',{tool:'energy'});output('energyOut',`${value('eType')} · ${value('eRegion')} (Beschriftung, keine Regionaldaten)\nJährliche Einsparung: ${money(annual)}\nEinfache Amortisation: ${annual?(cost/annual).toFixed(1)+' Jahre':'nicht erreichbar bei 0 % Einsparung'}\nSaldo nach ${years} Jahren: ${money(annual*years-cost)}\n\nSensitivität (Annahme ±10 Prozentpunkte):\n${scenarios.map(p=>`${p} %: ${p?(cost/(bill*12*p/100)).toFixed(1)+' Jahre':'keine Amortisation'}`).join('\n')}\n\nFormel: Monatskosten × 12 × Reduktion / 100. Keine Förderung, Zinsen, Wartung oder Alterung. Nächster Schritt: Verbrauch und Einsparungsannahme mit vergleichbaren Angeboten prüfen.`);
  persist(fields);
});
$('tenderRun').addEventListener('click',()=>{
  const keyword=value('tKey').trim();if(!keyword){$('tKey').focus();return;}
  ev('pro_tool_run',{tool:'tender'});output('tenderOut',`Suchprofil, keine Trefferliste\nFähigkeit: ${keyword}\nRegion: ${value('tRegion')}\nGewünschte Frist: höchstens ${value('tDays')} Tage\nUnternehmensprofil: ${value('tSize')}\nSME-Präferenz: ${value('tSet')}\nMindestwert: ${money(+value('tValue')*1000)}\n\nIm Originalportal prüfen: genaue Leistungsbeschreibung, CPV/NAICS, Frist mit Zeitzone, Währung, Mindestumsatz, Referenzen und Ausschlussgründe. Diese Angaben werden hier nicht automatisch gefiltert oder verifiziert.`);
  const portals={EU:['TED','https://ted.europa.eu/'],USA:['SAM.gov','https://sam.gov/content/opportunities'],UK:['Find a Tender','https://www.find-tender.service.gov.uk/']};
  const regions=value('tRegion')==='Alle'?Object.keys(portals):[value('tRegion')];
  regions.forEach(r=>{const a=document.createElement('a');a.href=portals[r][1];a.textContent='\n'+portals[r][0]+' öffnen →';$('tenderOut').appendChild(a);});persist(fields);
});
const documents=['Produktidentifikation / SKU und Beschreibung','Materialdaten und Gewicht','Lieferanten- und Herkunftsunterlagen','Verantwortliche Kontaktperson und Lieferkette'];
const group=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Welche Unterlagen liegen laut deiner Angabe vor?';group.appendChild(legend);
documents.forEach((name,i)=>{const label=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.id='evidence'+i;input.style.width='auto';input.style.display='inline';label.append(input,document.createTextNode(' '+name));label.style.display='block';group.appendChild(label);});
$('complianceRun').before(group);
$('complianceRun').addEventListener('click',()=>{
  const lines=documents.map((name,i)=>`${$('evidence'+i).checked?'Laut Eingabe vorhanden (ungeprüft)':'Noch zu klären'}: ${name}`);
  ev('pro_tool_run',{tool:'compliance'});output('complianceOut',`Dokumentenliste · ${value('cType')}\nHerkunft: ${value('cOrigin')} · Vertrieb: ${value('cSales')}\nDatenstand (Selbstauskunft): ${value('cData')}\n\n${lines.join('\n')}\n\nKeine Rechtsrisiko-Punktzahl. Keine automatische Prüfung von Dokumenten oder Vorschriften. Nächster Schritt: Produkt und Zolltarifnummer genau bestimmen; Quellen, Versionsstand und Zuständigkeit dokumentieren.`);persist(fields);
});
$('exportResult').addEventListener('click',()=>{
  if(!report){$('shareStatus').textContent='Bitte zuerst ein Ergebnis erstellen.';return;}
  const text=`EcoBack Projekt-Werkzeuge · Methodik v2026-09-21\nExport: ${new Date().toISOString()}\n${report}\n\nQuelle: https://getecoback.com/pro-werkzeuge.html#methodik\nUnverifizierte Eingaben; keine Empfehlung oder Konformitätsbescheinigung.`;
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ecoback-ergebnis.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('copySource').addEventListener('click',async()=>{const url='https://getecoback.com/pro-werkzeuge.html#'+active;try{await navigator.clipboard.writeText(url);$('shareStatus').textContent='Quellenlink kopiert; keine Eingaben enthalten.';}catch(_){$('shareStatus').textContent='Quellenlink: '+url;}});
})();
