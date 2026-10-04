// One-click illustrative scenarios and user-initiated sharing. No automatic posting.
const lang=document.documentElement.lang.split('-')[0];
const strings={
 en:['Try it without typing','Start with an illustrative scenario. It is not a measurement, current tariff or personal recommendation. Change the fields below when you have your own data.','Original example','Inputs and assumptions','Illustrative scenario','Edited assumptions · not independently verified','Prepare result to share','Share this tool','Copy draft','Download image','The draft and scenario link include the calculation inputs. Review them before sharing. Posting remains your choice; check each community’s rules.','Scenario link','Copied','Copy unavailable — select the draft or link.','Inputs changed. Calculate again to share a current result.','Shared scenario · not your measurements','Invalid or outdated scenario link. The original example is shown.','Source and method','Open the linked tool for the full assumptions, method and limitations.','Preview for sharing','No current result. Check the inputs and calculate again.'],
 de:['Ohne Tippen ausprobieren','Starte mit einem Rechenbeispiel. Es ist keine Messung, kein aktueller Tarif und keine persönliche Empfehlung. Eigene Werte kannst du unten ändern.','Originalbeispiel','Werte und Annahmen','Rechenbeispiel','Geänderte Annahmen · nicht unabhängig geprüft','Ergebnis zum Teilen vorbereiten','Dieses Tool teilen','Text kopieren','Bild herunterladen','Text und Szenario-Link enthalten die Rechenwerte. Vor dem Teilen prüfen. Du entscheidest über die Veröffentlichung; beachte die Regeln der Community.','Szenario-Link','Kopiert','Kopieren nicht verfügbar — Text oder Link markieren.','Werte geändert. Für ein aktuelles Ergebnis neu berechnen.','Geteiltes Szenario · keine eigenen Messwerte','Ungültiger oder veralteter Szenario-Link. Das Originalbeispiel wird angezeigt.','Quelle und Rechenweg','Der verlinkte Rechner enthält alle Annahmen, den Rechenweg und die Grenzen.','Vorschau zum Teilen','Kein aktuelles Ergebnis. Werte prüfen und neu berechnen.'],
 fr:['Essayer sans rien saisir','Commencez par un scénario illustratif : ni mesure, ni tarif actuel, ni recommandation personnelle. Ajustez les champs ci-dessous avec vos données.','Exemple initial','Valeurs et hypothèses','Scénario illustratif','Hypothèses modifiées · non vérifiées indépendamment','Préparer le résultat à partager','Partager cet outil','Copier le texte','Télécharger l’image','Le texte et le lien du scénario incluent les valeurs du calcul. Vérifiez-les avant de partager. Vous choisissez de publier ; respectez les règles de la communauté.','Lien du scénario','Copié','Copie indisponible : sélectionnez le texte ou le lien.','Valeurs modifiées. Recalculez avant de partager.','Scénario partagé · pas vos mesures','Lien invalide ou ancien. L’exemple initial est affiché.','Source et méthode','L’outil lié présente les hypothèses, la méthode et les limites.','Aperçu du partage','Aucun résultat actuel. Vérifiez les valeurs et recalculez.'],
 it:['Prova senza digitare','Inizia da uno scenario illustrativo: non è una misura, una tariffa attuale o un consiglio personale. Modifica i campi sotto con i tuoi dati.','Esempio iniziale','Valori e ipotesi','Scenario illustrativo','Ipotesi modificate · non verificate indipendentemente','Prepara il risultato da condividere','Condividi questo strumento','Copia testo','Scarica immagine','Il testo e il link includono i valori del calcolo. Controllali prima di condividere. Decidi tu se pubblicare; rispetta le regole della comunità.','Link dello scenario','Copiato','Copia non disponibile: seleziona il testo o il link.','Valori modificati. Ricalcola prima di condividere.','Scenario condiviso · non sono le tue misure','Link non valido o precedente. Viene mostrato l’esempio iniziale.','Fonte e metodo','Lo strumento collegato contiene ipotesi, metodo e limiti.','Anteprima di condivisione','Nessun risultato attuale. Controlla i valori e ricalcola.'],
 es:['Prueba sin escribir','Empieza con un ejemplo ilustrativo: no es una medición, una tarifa actual ni una recomendación personal. Ajusta los campos con tus datos.','Ejemplo inicial','Valores y supuestos','Escenario ilustrativo','Supuestos modificados · sin verificación independiente','Preparar resultado para compartir','Compartir esta herramienta','Copiar texto','Descargar imagen','El texto y el enlace incluyen los valores del cálculo. Revísalos antes de compartir. Tú decides si publicas; respeta las normas de la comunidad.','Enlace del escenario','Copiado','Copia no disponible: selecciona el texto o el enlace.','Valores modificados. Calcula de nuevo antes de compartir.','Escenario compartido · no son tus mediciones','Enlace inválido o antiguo. Se muestra el ejemplo inicial.','Fuente y método','La herramienta enlazada incluye los supuestos, el método y los límites.','Vista previa para compartir','Sin resultado actual. Revisa los valores y vuelve a calcular.'],
 zh:['无需输入，先看示例','从示例场景开始。它不是实测数据、当前报价或个人建议。有自己的数据后，再调整下方参数。','原始示例','参数与假设','示例场景','已调整的假设 · 未独立核实','准备分享结果','分享这个工具','复制文案','下载图片','分享文案和场景链接包含计算参数，请先检查。是否发布由你决定，并请遵守社区规则。','场景链接','已复制','无法自动复制，请选中文案或链接。','参数已变化，请重新计算后分享。','分享的场景 · 不是你的实测数据','场景链接无效或已过期，已显示原始示例。','来源与方法','完整假设、计算方法和适用边界见链接中的工具。','分享预览','当前没有有效结果，请检查参数并重新计算。']};
const t=strings[lang]||strings.en,canonical=document.querySelector('link[rel=canonical]')?.href||new URL(location.pathname,location.origin).href;
const emit=name=>{if(!/[?&]__(probe|ci)(?:=|&|$)/.test(location.search))window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'eco_tool_'+name}}));};
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,fn)=>{const b=node('button',text);b.type='button';b.addEventListener('click',fn);return b;};
const clean=s=>s.replace(/\s+/g,' ').trim();
const title=clean(document.querySelector('h1')?.textContent||document.title);
async function init(){
let earlyInput=false;const noticeInput=e=>{if(e.isTrusted)earlyInput=true;};document.addEventListener('input',noticeInput,true);document.addEventListener('change',noticeInput,true);

// Await the existing calculators' top-level imports before submitting any example.
// The load event can precede completion of an asynchronously evaluated module.
await Promise.all([...document.querySelectorAll('script[type=module][src]')].filter(s=>/\/(winter-tools|au-cooling|household|energy-workbench|laundry-check)\.mjs(?:\?|$)/.test(s.src)).map(s=>import(s.src)));

let adapter=null;
const guard=document.querySelector('script[src*="/assets/legacy-tool-guard.mjs"]');
if(guard){const {config}=await import(guard.src),c=config[location.pathname];if(c){const go=document.getElementById(c.button);adapter={go,fields:Object.keys(c.inputs).map(id=>document.getElementById(id)),result:document.getElementById(c.result),error:document.getElementById('legacy-tool-error'),anchor:go.closest('form,.calc,.calculator,.tool')||go.parentElement};const box=go.closest('form,.calc,.calculator,.tool')||go.parentElement;adapter.fields.push(...box.querySelectorAll('select,input[type=checkbox],input[type=range]'));}}
const modern=document.querySelector('[data-winter-tool],[data-au-cost]');
if(modern)adapter={form:modern.querySelector('form'),result:modern.querySelector('[data-result]'),error:modern.querySelector('[data-error]'),anchor:modern.querySelector('form')};
const household=document.querySelector('[data-household]');if(household)adapter={form:household,result:document.querySelector('#result'),anchor:household};
const country=document.querySelector('#country-form');if(country)adapter={form:country,result:document.querySelector('#result'),error:document.querySelector('#form-error'),anchor:country.closest('.workspace')};
const tariff=document.querySelector('#tariff-form');if(tariff)adapter={form:tariff,result:document.querySelector('#results'),error:document.querySelector('#status'),anchor:tariff.closest('.workspace')||tariff};
const laundry=document.querySelector('#laundry-check');if(laundry)adapter={form:laundry.querySelector('form'),result:laundry.querySelector('[data-results]'),error:laundry.querySelector('[data-error]'),anchor:laundry.querySelector('form')};
if(adapter?.form)adapter.fields=[...adapter.form.querySelectorAll('input,select')].filter(e=>['number','range','checkbox','select-one'].includes(e.type));
if(adapter)adapter.fields=[...new Set(adapter.fields)].filter(Boolean);
const panel=node('section',null,'eco-experience');panel.id='eco-tool-experience';panel.setAttribute('aria-label',t[0]);
const heading=node('h2',adapter?t[0]:t[7]);panel.append(heading);
const shareArea=node('div',null,'eco-actions');
const genericDraft=node('section',null,'eco-draft');genericDraft.hidden=true;
const status=node('p',null,'eco-note');status.setAttribute('role','status');
let snapshot=null,kind='example',inRun=false;
const preview=node('div',null,'eco-preview');preview.setAttribute('aria-live','polite');preview.hidden=true;
const assumptionBox=node('details',null,'eco-assumptions'),assumptions=node('dl');assumptionBox.append(node('summary',t[3]),assumptions);
const resultShare=button(t[6],()=>openShare(true));resultShare.disabled=true;
function key(e){return e.name||e.id;}
function read(){return Object.fromEntries(adapter.fields.map(e=>[key(e),e.type==='checkbox'?e.checked:e.value]));}
function label(e){const l=e.labels?.[0];if(!l)return key(e);const c=l.cloneNode(true);c.querySelectorAll('input,select,button').forEach(x=>x.remove());return clean(c.textContent)||key(e);}
function checked(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length!==adapter.fields.length)throw Error('schema');
 const out={};for(const e of adapter.fields){const k=key(e),v=raw[k];if(e.type==='checkbox'){if(typeof v!=='boolean')throw Error('boolean');out[k]=k==='own'||(tariff&&k==='confirm')?false:v;}else if(e.tagName==='SELECT'){if(typeof v!=='string'||![...e.options].some(o=>o.value===v))throw Error('enum');out[k]=k==='purpose'?'example':v;}else{if(typeof v!=='string'||v.trim()===''||v.length>32||!Number.isFinite(Number(v)))throw Error('number');if(e.min!==''&&Number(v)<Number(e.min)||e.max!==''&&Number(v)>Number(e.max))throw Error('range');out[k]=v;}}
 if(Object.keys(raw).some(k=>!Object.hasOwn(out,k)))throw Error('extra');return out;
}
function invalidate(){if(inRun)return;snapshot=null;resultShare.disabled=true;preview.hidden=true;genericDraft.hidden=true;status.textContent=t[14];kind='edited';}
function capture(){
 const a=adapter;if(a.error?.textContent.trim()||a.result.hidden||getComputedStyle(a.result).display==='none'||!clean(a.result.textContent))return;
 let values;try{values=checked(read());}catch{return;}
 const controls=[...a.result.querySelectorAll('button,a')].map(e=>clean(e.textContent));const sizing=/\/(?:btu-rechner|btu-calculator)\.html$/.test(location.pathname);const rawText=sizing?[...[...a.result.querySelectorAll(':scope > p')].slice(0,2).map(e=>e.innerText),lang==='de'?'Grobe Dimensionierung. Wärmebelastung, Montage und Komfort vor dem Kauf prüfen.':'Indicative sizing. Check heat load, installation and comfort before buying.'].join('\n'):country?[a.result.querySelector('.callout')?.innerText,...[...a.result.querySelectorAll('.metric')].map(e=>e.querySelector('span').innerText+': '+e.querySelector('b').innerText),...[...a.result.querySelectorAll(':scope > p')].map(e=>e.innerText)].filter(Boolean).join('\n'):a.result.innerText;const text=rawText.split('\n').filter(line=>!controls.includes(clean(line))).join('\n').trim();if(/NaN|Infinity/.test(text))return;
 snapshot={values,text,kind};preview.replaceChildren(node('strong',kind==='example'?t[4]:kind==='shared'?t[15]:t[5]),node('p',text));preview.hidden=false;assumptions.replaceChildren();
 for(const e of a.fields){if(key(e)==='own')continue;assumptions.append(node('dt',label(e)),node('dd',String(values[key(e)])));}
 resultShare.disabled=false;status.textContent='';
}
function run(raw,source){
 const values=checked(raw);inRun=true;window.__ecoToolExample=true;kind=source;snapshot=null;genericDraft.hidden=true;
 const x=scrollX,y=scrollY,originalURL=location.href;
 try{for(const e of adapter.fields){if(e.type==='checkbox')e.checked=values[key(e)];else e.value=values[key(e)];e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}if(adapter.form===tariff){tariff.elements.namedItem('purpose').value='example';/* Preview hypothetical data without claiming the user's required confirmation. The model and checked() still validate all numbers. */tariff.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}else if(adapter.form)adapter.form.requestSubmit();else adapter.go.click();capture();}
 finally{window.__ecoToolExample=false;inRun=false;history.replaceState(null,'',originalURL);window.scrollTo(x,y);}
 if(!snapshot){resultShare.disabled=true;preview.hidden=true;status.textContent=t[20];}
}
function shareURL(values,channel){const u=new URL(canonical);u.search='';u.hash='';u.searchParams.set('utm_source',channel);u.searchParams.set('utm_medium','community');u.searchParams.set('utm_campaign','eco-tools');if(values)u.hash='eco-v1='+encodeURIComponent(JSON.stringify({path:location.pathname,values}));return u.href;}
function openShare(withResult){
 if(withResult&&!snapshot)return;
 const s=withResult?snapshot:null,url=shareURL(s?.values,'copy'),provenance=s?(s.kind==='example'?t[4]:s.kind==='shared'?t[15]:t[5]):'';
 const lines=[title,provenance,s?.text||'',...(s?['',t[3]+':',...adapter.fields.filter(e=>key(e)!=='own').map(e=>label(e)+': '+s.values[key(e)])]:[]),'',t[18],t[17]+': '+url].filter(Boolean);
 const text=lines.join('\n');genericDraft.replaceChildren(node('h3',t[19]),node('p',t[10],'eco-note'));
 const area=node('textarea');area.value=text;area.readOnly=true;area.setAttribute('aria-label',t[19]);genericDraft.append(area);
 const links=node('div',null,'eco-links');
 for(const platform of ['reddit','x']){const u=shareURL(s?.values,platform),target=new URL(platform==='reddit'?'https://www.reddit.com/submit':'https://x.com/intent/post');target.searchParams.set('url',u);target.searchParams.set(platform==='reddit'?'title':'text',platform==='reddit'?title.slice(0,180)+(provenance?' · '+provenance:''):[title.slice(0,65),provenance,s?clean(s.text).slice(0,85):t[18]].filter(Boolean).join(' · ').slice(0,210));const a=node('a',platform==='reddit'?'Reddit':'X');a.href=target.href;a.target='_blank';a.rel='noopener noreferrer';a.addEventListener('click',()=>emit('share_'+platform));links.append(a);}
 links.append(button(t[8],async()=>{try{await navigator.clipboard.writeText(text);status.textContent=t[12];emit('copy');}catch{area.focus();area.select();status.textContent=t[13];}}));
 if(s)links.append(button(t[9],()=>downloadCard(s,provenance)));
 const fallback=node('a',t[11],'eco-fallback');fallback.href=url;fallback.setAttribute('aria-label',t[11]);genericDraft.append(links,fallback);genericDraft.hidden=false;emit(withResult?'share_prepare':'tool_share');
}
function downloadCard(s,provenance){
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1200+adapter.fields.length*36;const c=canvas.getContext('2d');c.fillStyle='#edf5f8';c.fillRect(0,0,1200,canvas.height);c.fillStyle='#0a4d7a';c.fillRect(0,0,1200,18);let y=65;
 const wrap=(text,font,maxLines)=>{c.font=font;c.fillStyle='#142330';const words=text.split(/\s+/);let line='',n=0;for(const word of words){if(c.measureText(line+' '+word).width>1070&&line){c.fillText(line,60,y);y+=38;n++;line='';if(n>=maxLines){c.fillText('…',60,y);y+=38;return;}}line+=(line?' ':'')+word;}if(line){c.fillText(line,60,y);y+=38;}};
 wrap('EcoBack · '+title,'700 30px system-ui',3);y+=18;wrap(provenance,'600 24px system-ui',2);y+=18;wrap(clean(s.text),'24px system-ui',10);y=Math.max(y+35,790);wrap(t[3],'600 22px system-ui',1);for(const e of adapter.fields){if(key(e)==='own')continue;c.font='18px system-ui';c.fillStyle='#142330';c.fillText(label(e),60,y,900);c.textAlign='right';c.fillText(String(s.values[key(e)]),1140,y,160);c.textAlign='left';y+=32;}y+=26;wrap(t[18],'20px system-ui',3);c.fillStyle='#0a4d7a';c.font='18px system-ui';c.fillText(new URL(canonical).host+new URL(canonical).pathname,60,canvas.height-45,1080);
 const a=node('a');a.href=canvas.toDataURL('image/png');a.download='ecoback-scenario.png';a.click();emit('image');
}
if(adapter){
 panel.append(node('p',t[1]));const choices=node('div',null,'eco-actions');let original=read();if(Object.hasOwn(original,'own'))original.own=false;
 const presets=[{name:t[2],values:original}];const add=(name,patch)=>presets.push({name,values:{...original,...Object.fromEntries(Object.entries(patch).map(([k,v])=>[k,String(v)]))}});
 const k=Object.keys(original);const price=k.find(x=>['price','rate','hk-price','sv-price','cents1'].includes(x));
 if(k.includes('rhin')){add('20 °C / 30 % · 17 °C / 20 %',{ta:20,rh:30,tk:17,rhin:20,wall:15});add('20 °C / 30 % · 17 °C / 70 %',{ta:20,rh:30,tk:17,rhin:70,wall:15});}
 else if(k.includes('tw')){add('20 °C / 65 % · 24 °C',{tr:20,rh:65,tw:24});add('20 °C / 65 % · 10 °C',{tr:20,rh:65,tw:10});}
 else if(k.includes('qm')){add('20 m²',{qm:20});add('40 m²',{qm:40});}
 else if(k.includes('saving')&&k.includes('base')){add('0 %',{saving:0});add('10 %',{saving:10});}
 else if(k.includes('minutes')){add('5 min',{minutes:5});add('10 min',{minutes:10});}
 else if(k.includes('hours1')){add('4 h + 0 h',{hours1:4,hours2:0});add('8 h + 0 h',{hours1:8,hours2:0});}
 else if(price){const cents=['hk-price','sv-price','cents1'].includes(price);add(cents?'20 ct/kWh':new Intl.NumberFormat(lang,{minimumFractionDigits:2}).format(.2)+' '+(original.currency||'EUR')+'/kWh',{[price]:cents?20:0.2});add(cents?'40 ct/kWh':new Intl.NumberFormat(lang,{minimumFractionDigits:2}).format(.4)+' '+(original.currency||'EUR')+'/kWh',{[price]:cents?40:0.4});}
 else if(k.includes('rh')){add('50 % RH',{rh:50});add('80 % RH',{rh:80});}
 else if(k.includes('rhnow')){add('50 % RH',{rhnow:50});add('70 % RH',{rhnow:70});}
 for(const p of presets){try{checked(p.values);}catch{continue;}const b=button(p.name,()=>{run(p.values,'example');choices.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));emit('example');});b.setAttribute('aria-pressed','false');choices.append(b);}
 panel.append(choices,preview,assumptionBox);shareArea.append(resultShare);
 for(const e of adapter.form?[adapter.form]:adapter.fields){e.addEventListener('input',invalidate);e.addEventListener('change',invalidate);}
 const calculate=adapter.form||adapter.go;calculate.addEventListener(adapter.form?'submit':'click',()=>{if(inRun)return;snapshot=null;resultShare.disabled=true;genericDraft.hidden=true;queueMicrotask(capture);});
 // Existing reset/import controls can invalidate output without dispatching input.
 const watch=new MutationObserver(()=>{if(!snapshot||inRun)return;try{if(adapter.result.hidden||getComputedStyle(adapter.result).display==='none'||adapter.error?.textContent.trim()||JSON.stringify(checked(read()))!==JSON.stringify(snapshot.values))invalidate();}catch{invalidate();}});
 watch.observe(adapter.result,{attributes:true,attributeFilter:['hidden','style'],childList:true,subtree:true,characterData:true});if(adapter.error)watch.observe(adapter.error,{childList:true,subtree:true,characterData:true});
 adapter.anchor.before(panel);
 function loadScenario(){let incoming=null,bad=false;if(location.hash.startsWith('#eco-v1=')){try{if(location.hash.length>8000)throw Error();const parsed=JSON.parse(decodeURIComponent(location.hash.slice(8)));if(parsed.path!==location.pathname)throw Error();incoming=checked(parsed.values);}catch{bad=true;}}
 run(incoming||original,incoming?'shared':'example');if(bad)status.textContent=t[16];}
 if(!earlyInput)loadScenario();else{kind='edited';status.textContent=t[14];}window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#eco-v1='))loadScenario();});
 panel.dataset.quick='true';
}else{const h=document.querySelector('main h1,article h1,h1');if(h)h.after(panel);}
shareArea.append(button(t[7],()=>openShare(false)));panel.append(shareArea,genericDraft,status);panel.dataset.ready='true';document.removeEventListener('input',noticeInput,true);document.removeEventListener('change',noticeInput,true);

}
init();
