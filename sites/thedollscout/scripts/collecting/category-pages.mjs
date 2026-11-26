import fs from 'node:fs';
import {homeCatalogCategories,loadHomeCatalog,productsForMarket,homeCatalogCopy,homeCatalogProductCardsHTML,homeCatalogProductText} from './home-catalog.mjs';
import {shoppingCopy,merchantURL} from './shopping.mjs';

export const categoryPageSlugs=Object.freeze(homeCatalogCategories.map(c=>'shop/categories/'+c.id));
export const categorySlugs=categoryPageSlugs;
const languages=['en','de','zh'];
const categoryIds=new Set(homeCatalogCategories.map(c=>c.id));
const dateOK=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const textOK=value=>typeof value==='string'&&value.trim().length>0&&value.length<=5000;
const amazonSource=url=>/(^|\.)amazon\.(com|de|co\.uk)$/.test(new URL(url).hostname);

export function validateCategoryGuides(data,products=loadHomeCatalog()){
 if(!data||!dateOK(data.updated)||!Array.isArray(data.categories)||data.categories.length!==homeCatalogCategories.length)throw Error('Nine dated category guides are required');
 const seen=new Set(),byId=new Map(products.map(p=>[p.id,p]));
 for(const record of data.categories){
  if(!record||!categoryIds.has(record.id)||seen.has(record.id))throw Error('Unknown or duplicate category guide');seen.add(record.id);
  const category=homeCatalogCategories.find(c=>c.id===record.id),belongs=id=>byId.has(id)&&category.types.includes(byId.get(id).category);
  if(!dateOK(record.checked))throw Error('Category review date is required: '+record.id);
  if(!Array.isArray(record.related)||record.related.length<1||record.related.length>4||new Set(record.related).size!==record.related.length||record.related.some(id=>!categoryIds.has(id)||id===record.id))throw Error('Invalid related categories: '+record.id);
  if(record.sourceProductIds!==undefined&&(!Array.isArray(record.sourceProductIds)||record.sourceProductIds.some(id=>!belongs(id))))throw Error('Source model belongs to another category: '+record.id);
  if(!Array.isArray(record.sources)||record.sources.length<1||record.sources.length>12)throw Error('Primary sources required: '+record.id);
  for(const source of record.sources){let url;try{url=new URL(source.url);}catch{throw Error('Invalid category source');}if(url.protocol!=='https:'||url.username||url.password||!textOK(source.label))throw Error('Invalid category source');}
  for(const lang of languages){
   const d=record[lang];if(!d||['title','description','answer'].some(k=>!textOK(d[k])))throw Error('Missing translated category answer: '+record.id+'/'+lang);
   if(d.smartPlugDecision){
    const decision=d.smartPlugDecision;
    if(lang!=='de'||record.id!=='smart-home'||!dateOK(decision.checked)||
       [decision.title,decision.answer,decision.load,decision.example].some(value=>!textOK(value))||
       !Array.isArray(decision.models)||decision.models.length!==2)throw Error('Invalid German plug comparison');
    for(const model of decision.models){
     if(!textOK(model.name)||!textOK(model.use)||!textOK(model.detail)||
        new URL(model.source).origin!=='https://de.store.tapo.com'||
        !model.source.startsWith('https://de.store.tapo.com/products/'))throw Error('German plug comparison requires model specifications');
    }
   }
   if(!Array.isArray(d.decisions)||d.decisions.length<2||d.decisions.length>8||d.decisions.some(x=>!textOK(x.title)||!textOK(x.body)))throw Error('Incomplete category decision guide: '+record.id+'/'+lang);
   if(!Array.isArray(d.comparisons)||d.comparisons.length<2||d.comparisons.length>8||d.comparisons.some(x=>['need','consider','check'].some(k=>!textOK(x[k]))||!Array.isArray(x.productIds)||!x.productIds.length||x.productIds.some(id=>!belongs(id))))throw Error('Invalid category comparison: '+record.id+'/'+lang);
   if(!Array.isArray(d.beforeBuying)||d.beforeBuying.length<2||d.beforeBuying.length>8||d.beforeBuying.some(x=>!textOK(x)))throw Error('Missing buying checks: '+record.id+'/'+lang);
   if(!Array.isArray(d.faq)||d.faq.length<1||d.faq.length>6||d.faq.some(x=>!textOK(x.question)||!textOK(x.answer)))throw Error('Missing visible category questions: '+record.id+'/'+lang);
  }
 }
 return data;
}
export function loadCategoryGuides(products=loadHomeCatalog()){return validateCategoryGuides(JSON.parse(fs.readFileSync(new URL('../../content/category-guides.json',import.meta.url),'utf8')),products);}

const copy={
 en:{home:'Home',catalogue:'Home & lifestyle catalogue',answer:'The starting point',decisions:'How to choose',comparison:'Choose by the job',scroll:'Scroll horizontally to compare all columns.',need:'Your task',consider:'Consider',check:'Trade-off to check',examples:'Models to inspect',before:'Before buying',models:'Source-backed models in this category',modelJump:'See the models',compareJump:'Compare uses',faq:'Questions before choosing',sources:'Sources and scope',related:'Related buying guides',updated:'Guide updated',checked:'Guide reviewed',filtered:'Filter the full catalogue to this category',all:'Browse all 100 models',method:'This guide interprets published manufacturer and product information; it is not a hands-on test or a ranking. A source confirms the information it publishes, not current local stock, price or product suitability. Check the exact model, local version and seller before buying.',sourceAmazon:'Amazon listing; use the labelled model link above',sourceMethod:'The individual model cards keep their own source-check dates.'},
 de:{home:'Startseite',catalogue:'Katalog für Haushalt & Alltag',answer:'Der erste Schritt',decisions:'So wählst du aus',comparison:'Nach Aufgabe vergleichen',scroll:'Seitlich scrollen, um alle Spalten zu vergleichen.',need:'Deine Aufgabe',consider:'Erwägen',check:'Abwägung prüfen',examples:'Modelle zum Prüfen',before:'Vor dem Kauf',models:'Modelle mit Quellen in dieser Kategorie',modelJump:'Modelle ansehen',compareJump:'Einsatzzwecke vergleichen',faq:'Fragen vor der Auswahl',sources:'Quellen und Grenzen',related:'Verwandte Kaufhilfen',updated:'Kaufhilfe aktualisiert',checked:'Redaktion geprüft',filtered:'Den Gesamtkatalog auf diese Kategorie filtern',all:'Alle Modelle ansehen',method:'Diese Kaufhilfe ordnet veröffentlichte Hersteller- und Produktinformationen ein; sie ist kein eigener Produkttest und keine Rangliste. Eine Quelle bestätigt ihre Angaben, nicht den aktuellen lokalen Bestand, Preis oder die Eignung eines Produkts. Genaues Modell, regionale Version und Verkäufer vor dem Kauf prüfen.',sourceAmazon:'Amazon-Produktseite; den gekennzeichneten Modelllink oben nutzen',sourceMethod:'Die einzelnen Modellkarten behalten ihre eigenen Daten der Quellenprüfung.'},
 zh:{home:'首页',catalogue:'居家生活商品目录',answer:'先看结论',decisions:'怎样做选择',comparison:'按实际用途比较',scroll:'左右滑动查看全部比较项。',need:'你的需求',consider:'可以考虑',check:'需要接受或核对的取舍',examples:'可核对的具体型号',before:'购买前再确认',models:'本类有来源的具体型号',modelJump:'查看具体型号',compareJump:'比较不同用途',faq:'选择前的常见问题',sources:'来源与适用范围',related:'相关选购指南',updated:'指南更新日期',checked:'指南复核日期',filtered:'在完整目录中筛选这个类别',all:'查看全部型号',method:'本指南解读公开厂家与产品资料，不是实物测评或排名。来源只能支持其公布的信息，不能证明当地实时库存、价格或适配性。购买前请核对具体型号、地区版本和卖家。',sourceAmazon:'Amazon 商品资料；请使用上方明确标示的型号链接',sourceMethod:'各型号卡片保留各自的来源核对日期。'}
};

function categoryProducts(record,products,lang) {
 const group = homeCatalogCategories.find(c=>c.id===record.id);
 return productsForMarket(products.filter(p=>group.types.includes(p.category)),lang);
}
function categorySources(record,products,lang) {
 if (lang !== 'de') return record.sources;
 return record.sources.map(source => {
  const variant = products.find(p=>p.sourceUrl===source.url)?.deVariant;
  return variant ? {url:variant.sourceUrl,label:variant.name+' – Herstellerangaben für Deutschland'} : source;
 });
}
function sourceHTML(sources,lang,esc){const c=copy[lang];return sources.map(s=>`<li>${amazonSource(s.url)?`${esc(s.label)} — ${c.sourceAmazon}`:`<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`}</li>`).join('');}
function localProductLinks(ids,byId,esc){return ids.map(id=>`<a href="#catalog-item-${id}">${esc(byId.get(id).name)}</a>`).join('');}

function smartPlugDecisionHTML(decision,esc){
 if(!decision)return '';
 const disclosure=shoppingCopy.de.disclosure;
 const models=decision.models.map(({name,use,detail,source})=>`
  <div class="home-product-card" id="tapo-${name.endsWith('P110M') ? 'p110m' : 'p110'}">
   <h3>${esc(name)}</h3>
   <p class="home-product-use"><strong>${esc(use)}</strong></p>
   <p>${esc(detail)}</p>
   <a href="${esc(source)}" rel="noopener">Herstellerangaben zum ${esc(name)}</a>
   <p class="home-product-disclosure">${esc(disclosure)}</p>
   <a class="button primary" href="${esc(merchantURL('de',name))}" rel="sponsored nofollow noopener" data-shopping-merchant>${esc(name)} auf Amazon.de suchen</a>
  </div>`).join('');
 return `<section id="strommessung" class="category-models" aria-labelledby="strommessung-titel">
  <header><h2 id="strommessung-titel">${esc(decision.title)}</h2><p>${esc(decision.answer)}</p></header>
  <p><a class="button" href="/de/ai-tools/dach-meter-fit">Messsteckdose nach Land und App auswählen</a></p>
  <div class="home-product-grid">${models}<aside class="home-product-card"><h3>Welche Last ist zulässig?</h3><p>${esc(decision.load)}</p></aside></div>
  <p>${esc(decision.example)}</p>
  <p class="shop-source-date">Herstellerangaben zu den deutschen Steckdosen geprüft am <time datetime="${esc(decision.checked)}">${esc(decision.checked)}</time>.</p>
 </section>`;
}

function smartPlugDecisionText(decision,origin){
 if(!decision)return [];
 return [decision.title,decision.answer,'Messsteckdose nach Land und App auswählen: '+origin+'/de/ai-tools/dach-meter-fit',...decision.models.flatMap(({name,use,detail,source})=>[
  name,use,detail,'Herstellerangaben zum '+name+': '+source,shoppingCopy.de.disclosure,name+' auf Amazon.de suchen',
 ]),'Welche Last ist zulässig?',decision.load,decision.example,'Herstellerangaben zu den deutschen Steckdosen geprüft am '+decision.checked+'.'];
}

const roomHumidity = {
 id: 'raumfeuchte-messen',
 checked: '2026-11-24',
 title: 'Raumfeuchte messen mit Hygrometer oder App',
 answer: 'Wenn dein Hygrometer Temperatur und relative Luftfeuchte gut ablesbar anzeigt, nutze es weiter. Ein gespeicherter Verlauf hilft dir, Veränderungen rund ums Lüften, Duschen oder Wäschetrocknen auch dann zu sehen, wenn du gerade nicht abliest.',
 measure: 'Notiere Temperatur und relative Feuchte am gleichen Messort und zu vergleichbaren Zeiten. Ein Raumwert kann unauffällig sein, während sich Feuchte an einer kalten Wand oder am Fenster niederschlägt.',
 rows: [
  {need: 'Gelegentlich ablesen', option: 'Vorhandenes Hygrometer behalten', check: 'Notiere Messwert und Uhrzeit von Hand. Hat dein Gerät Min/Max, kannst du Spitzen zwischen zwei Ablesungen prüfen.'},
  {need: 'Display und gespeicherte Messwerte', option: 'SwitchBot Meter Plus', check: 'Das Display zeigt Temperatur und Luftfeuchte. Gespeicherte Messwerte lassen sich in der Nähe per Bluetooth in der App abrufen. Für Zugriff von unterwegs ist ein kompatibler SwitchBot Hub nötig.', model: {id: 'c22', category: 'home-care'}},
  {need: 'Verläufe in der vorhandenen Smart-Home-App', option: 'Tapo T310', check: 'Nutze den Sensor, wenn du einen kompatiblen Hub hast oder bewusst mit einplanst. Prüfe H100 oder H200 für Tapo und KH100 für Kasa sowie die passende App und regionale Geräteversion.', model: {id: 'b12', category: 'smart-home'}},
 ],
 sources: [
  {label: 'Verbraucherzentrale zu Luftfeuchte, Heizen und Lüften', url: 'https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426'},
  {label: 'SwitchBot Meter Plus mit Display', url: 'https://eu.switch-bot.com/products/switchbot-meter-plus/'},
  {label: 'SwitchBot zur Speicherung und zum App-Abruf', url: 'https://support.switch-bot.com/hc/de/articles/360060298693-Synchronisierung-Speicherung-UND-L%C3%B6schung-von-Daten-F%C3%BCr-SwitchBot-Meter'},
  {label: 'Tapo T310 mit kompatiblen Hubs', url: 'https://www.tapo.com/de/product/smart-sensor/tapo-t310/'},
 ],
};

function humidityDecision(record,lang,products,route) {
 if (lang !== 'de' || record.id !== 'smart-home') return null;
 const rows = roomHumidity.rows.map(row => {
  if (!row.model) return row;
  const {id,category} = row.model;
  const group = homeCatalogCategories.find(item => item.id === category);
  const present = products.some(product => product.id === id && group.types.includes(product.category));
  const href = present ? route(lang,'shop/categories/'+category)+'#catalog-item-'+id : null;
  return {...row,href};
 });
 return {...roomHumidity,rows};
}

function humidityDecisionHTML(decision,esc) {
 if (!decision) return '';
 const rows = decision.rows.map(row => `<tr><th scope="row">${esc(row.need)}</th><td>${row.href ? `<a href="${esc(row.href)}">${esc(row.option)}</a>` : esc(row.option)}</td><td>${esc(row.check)}</td></tr>`).join('');
 return `<section class="category-comparison" id="${decision.id}" aria-labelledby="${decision.id}-titel">
  <h2 id="${decision.id}-titel">${esc(decision.title)}</h2><p>${esc(decision.answer)}</p>
  <p class="category-table-hint">${copy.de.scroll}</p><div class="category-table-scroll" role="region" aria-labelledby="${decision.id}-titel" tabindex="0"><table>
  <thead><tr><th scope="col">${copy.de.need}</th><th scope="col">${copy.de.consider}</th><th scope="col">${copy.de.check}</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p>${esc(decision.measure)}</p><p class="shop-source-date">Quellen geprüft am <time datetime="${decision.checked}">${decision.checked}</time>.</p>
  <ul>${sourceHTML(decision.sources,'de',esc)}</ul>
 </section>`;
}

function humidityDecisionText(decision,origin) {
 if (!decision) return [];
 return [decision.title,decision.answer,...decision.rows.map(row =>
  `${row.need} — ${row.option}. ${row.check}${row.href ? ' '+origin+row.href : ''}`),
  decision.measure,'Quellen geprüft am '+decision.checked+'.',...decision.sources.map(source => source.label+': '+source.url)];
}

const blackFridayPriceCheck = {
 id: 'black-friday-preischeck',
 checked: '2026-11-26',
 title: 'Black Friday 2026: Tapo-Angebote richtig vergleichen',
 answer: 'Vergleiche den Endpreis inklusive Versand für dieselbe EU-Ausführung und Packungsgröße mit ihrem Preisverlauf. TP-Link kündigte für den 10. November bis einschließlich 1. Dezember 2026 Rabatte auf die UVP ausgewählter Produkte und Bundles an. Prüfe Preis und Verfügbarkeit beim Händler.',
 steps: [
  {label: 'Tapo P110 als Einzelgerät oder 4er-Pack', href: '#tapo-p110', detail: 'Für Verbrauchsmessung in der Tapo-App. Prüfe den Gesamtpreis des Pakets und wie viele Steckdosen du tatsächlich brauchst. Den Stückpreis vergleichst du bei gleicher regionaler Ausführung.'},
  {label: 'Tapo P110M für Matter', href: '#tapo-p110m', detail: 'Prüfe für Deutschland die passende EU-Ausführung und Stückzahl. Wenn du Matter brauchst, prüfe auch den Controller deiner Smart-Home-Plattform. Schau in die Lasttabelle für die genaue Hardwareversion, besonders bei Geräten mit Motor oder Kompressor.'},
  {label: 'Tapo T310 für Raumfeuchte', href: '#raumfeuchte-messen', detail: 'Prüfe, ob du einen kompatiblen Hub schon hast. Wenn dir ein Hygrometer zum Ablesen reicht, kannst du es weiterverwenden. Vergleiche beim T310 den Systempreis mit Hub statt nur den Sensorpreis.'},
 ],
 sources: [
  {label: 'TP-Link zur Aktion vom 10. November bis 1. Dezember 2026', url: 'https://www.tp-link.com/de/press/news/22601/'},
  {label: 'Tapo-Store: teilnehmende Produkte und Packungsgrößen', url: 'https://de.store.tapo.com/pages/black-friday'},
  {label: 'Geizhals: Preisvergleich für Tapo P110 Typ F einzeln', url: 'https://geizhals.de/tp-link-tapo-p110-a2635372.html'},
  {label: 'Geizhals: Preisvergleich für Tapo P110M Typ F', url: 'https://geizhals.de/tp-link-tapo-p110m-a3107333.html'},
  {label: 'Verbraucherzentrale: Preisrecherche für Black Friday', url: 'https://www.verbraucherzentrale.de/wissen/digitale-welt/onlinehandel/prime-days-black-friday-cyber-monday-tipps-fuer-die-schnaeppchenjagd-37835'},
 ],
};

function priceCheckFor(record,lang) {
 return lang === 'de' && record.id === 'smart-home' && record.de.smartPlugDecision ? blackFridayPriceCheck : null;
}

function priceCheckHTML(check,esc) {
 if (!check) return '';
 return `<section id="${check.id}" class="category-buying-checks" aria-labelledby="${check.id}-titel">
  <h2 id="${check.id}-titel">${esc(check.title)}</h2><p>${esc(check.answer)}</p>
  <ul>${check.steps.map(step => `<li><a href="${step.href}">${esc(step.label)}</a><p>${esc(step.detail)}</p></li>`).join('')}</ul>
  <p>Für einmalige Messungen kleiner Verbräuche prüfe, ob du ein <a href="/de/ai-tools/dach-meter-fit#messgeraet-ausleihen-oder-kaufen">passendes Strommessgerät ausleihen</a> kannst.</p>
  <p class="shop-source-date">Quellen geprüft am <time datetime="${check.checked}">${check.checked}</time>.</p>
  <ul>${sourceHTML(check.sources,'de',esc)}</ul>
 </section>`;
}

function priceCheckText(check,origin,guidePath) {
 if (!check) return [];
 return [check.title,check.answer,...check.steps.flatMap(step=>[step.label+' · '+origin+guidePath+step.href,step.detail]),
  'Für einmalige Messungen kleiner Verbräuche prüfe, ob du ein passendes Strommessgerät ausleihen kannst. '+origin+'/de/ai-tools/dach-meter-fit#messgeraet-ausleihen-oder-kaufen',
  'Quellen geprüft am '+check.checked+'.',...check.sources.map(source=>source.label+' · '+source.url)];
}

export function categoryPageHTML({record,updated,lang,route,esc,products=loadHomeCatalog()}){
 const c=copy[lang],d=record[lang],market=homeCatalogCopy(lang),group=homeCatalogCategories.find(g=>g.id===record.id),selected=categoryProducts(record,products,lang),byId=new Map(selected.map(p=>[p.id,p]));
 const humidity=humidityDecision(record,lang,products,route);
 const priceCheck=priceCheckFor(record,lang);
 const related=record.related.map(id=>homeCatalogCategories.find(g=>g.id===id));
 return `<nav class="breadcrumb" aria-label="${c.home}"><a href="${route(lang)}">${c.home}</a><span>/</span><a href="${route(lang,'shop')}">${c.catalogue}</a><span>/</span><span>${esc(group[lang])}</span></nav><article class="category-guide" data-category-guide="${record.id}"><header class="category-guide-hero"><p class="category-guide-kicker">${esc(group[lang])}</p><h1>${esc(d.title)}</h1><p class="category-direct-answer" data-category-answer>${esc(d.answer)}</p><p class="category-guide-dates">${c.updated}: <time datetime="${updated}">${updated}</time> · ${c.checked}: <time datetime="${record.checked}">${record.checked}</time></p><nav class="category-guide-jumps" aria-label="${c.decisions}">${d.smartPlugDecision?'<a class="button primary" href="#strommessung">P110 und P110M vergleichen</a>':''}<a class="button${d.smartPlugDecision?'':' primary'}" href="#category-models">${c.modelJump} (${selected.length})</a>${humidity?'<a class="button" href="#raumfeuchte-messen">Raumfeuchte messen</a>':''}${priceCheck?'<a class="button" href="#'+priceCheck.id+'">Black-Friday-Preischeck</a>':''}<a class="button" href="#category-comparison">${c.compareJump}</a><a href="#category-faq">${c.faq}</a></nav></header>${priceCheckHTML(priceCheck,esc)}${smartPlugDecisionHTML(d.smartPlugDecision,esc)}${humidityDecisionHTML(humidity,esc)}<section class="category-decisions" id="category-decisions"><h2>${c.decisions}</h2><ol>${d.decisions.map(x=>`<li><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></li>`).join('')}</ol></section><section class="category-comparison" id="category-comparison"><h2>${c.comparison}</h2><p class="category-table-hint">${c.scroll}</p><div class="category-table-scroll" role="region" aria-label="${c.comparison}" tabindex="0"><table><thead><tr><th scope="col">${c.need}</th><th scope="col">${c.consider}</th><th scope="col">${c.check}</th></tr></thead><tbody>${d.comparisons.map(row=>`<tr><th scope="row">${esc(row.need)}</th><td><p>${esc(row.consider)}</p><div class="category-model-links" aria-label="${c.examples}">${localProductLinks(row.productIds,byId,esc)}</div></td><td>${esc(row.check)}</td></tr>`).join('')}</tbody></table></div></section><section class="category-buying-checks"><h2>${c.before}</h2><ul>${d.beforeBuying.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section class="category-models" id="category-models" data-category-models><header><h2>${c.models}</h2><p class="category-market">${market.market}</p><p>${market.notice}</p></header>${homeCatalogProductCardsHTML({lang,esc,merchantURL,disclosure:shoppingCopy[lang].disclosure,products:selected,placement:'guide'})}</section><section class="category-faq" id="category-faq"><h2>${c.faq}</h2>${d.faq.map(q=>`<details><summary>${esc(q.question)}</summary><p>${esc(q.answer)}</p></details>`).join('')}</section><section class="category-sources" id="category-sources"><h2>${c.sources}</h2><p>${c.method}</p><p>${c.sourceMethod}</p><ul>${sourceHTML(categorySources(record,products,lang),lang,esc)}</ul></section><nav class="category-related" aria-label="${c.related}"><h2>${c.related}</h2>${related.map(g=>`<a href="${route(lang,'shop/categories/'+g.id)}">${g[lang]} →</a>`).join('')}<a href="${route(lang,'shop')}#catalog-category-${record.id}">${c.filtered}</a><a href="${route(lang,'shop')}">${c.all}</a></nav></article>`;
}

export function categoryPageText({record,updated,lang,route,origin,products=loadHomeCatalog()}){
 const c=copy[lang],d=record[lang],selected=categoryProducts(record,products,lang),byId=new Map(selected.map(p=>[p.id,p])),slug='shop/categories/'+record.id;
 return[d.title,d.description,d.answer,c.updated+': '+updated,c.checked+': '+record.checked,...priceCheckText(priceCheckFor(record,lang),origin,route(lang,slug)),...smartPlugDecisionText(d.smartPlugDecision,origin),...humidityDecisionText(humidityDecision(record,lang,products,route),origin),c.decisions,...d.decisions.flatMap(x=>[x.title,x.body]),c.comparison,...d.comparisons.flatMap(x=>[x.need,x.consider,x.check,...x.productIds.map(id=>byId.get(id).name+': '+origin+route(lang,slug)+'#catalog-item-'+id)]),c.before,...d.beforeBuying,c.models,homeCatalogCopy(lang).notice,shoppingCopy[lang].disclosure,...homeCatalogProductText({lang,route,origin,slug,products:selected}),c.faq,...d.faq.flatMap(q=>[q.question,q.answer]),c.sources,c.method,c.sourceMethod,...categorySources(record,products,lang).map(s=>s.label+(amazonSource(s.url)?' — '+c.sourceAmazon:': '+s.url)),c.related,...record.related.map(id=>homeCatalogCategories.find(g=>g.id===id)[lang]+': '+origin+route(lang,'shop/categories/'+id)),c.filtered+': '+origin+route(lang,'shop')+'#catalog-category-'+record.id,c.all+': '+origin+route(lang,'shop')];
}

export function categoryPageSchema({record,lang,route,origin,products=loadHomeCatalog()}){
 const c=copy[lang],d=record[lang],url=origin+route(lang,'shop/categories/'+record.id),selected=categoryProducts(record,products,lang);
 return [
  {'@type':'BreadcrumbList','@id':url+'#breadcrumbs',itemListElement:[{name:c.home,item:origin+route(lang)},{name:c.catalogue,item:origin+route(lang,'shop')},{name:d.title,item:url}].map((p,i)=>({'@type':'ListItem',position:i+1,...p}))},
  {'@type':'ItemList','@id':url+'#models',name:d.title,numberOfItems:selected.length,itemListElement:selected.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:url+'#catalog-item-'+p.id}))}
 ];
}
export function buildCategoryPages({emit,route,esc,locales,origin,products=loadHomeCatalog(),guides=loadCategoryGuides(products)}){
 validateCategoryGuides(guides,products);
 for(const lang of Object.keys(locales))for(const category of homeCatalogCategories){
  const record=guides.categories.find(c=>c.id===category.id),d=record[lang];
  const updated=[guides.updated,d.smartPlugDecision ? '2026-11-22' : null,d.smartPlugDecision?.checked,lang==='de'&&record.id==='smart-home' ? roomHumidity.checked : null,priceCheckFor(record,lang)?.checked,...categoryProducts(record,products,lang).map(p=>p.checked)].filter(Boolean).sort().at(-1);
  const args={record,updated,lang,route,esc,origin,products};
  emit(lang,'shop/categories/'+record.id,d.title,d.description,categoryPageHTML(args),categoryPageText(args),categoryPageSchema(args),updated);
 }
}
