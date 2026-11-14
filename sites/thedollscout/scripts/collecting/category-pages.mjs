import fs from 'node:fs';
import {homeCatalogCategories,loadHomeCatalog,homeCatalogCopy,homeCatalogProductCardsHTML,homeCatalogProductText} from './home-catalog.mjs';
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
 de:{home:'Startseite',catalogue:'Katalog für Haushalt & Alltag',answer:'Der erste Schritt',decisions:'So wählst du aus',comparison:'Nach Aufgabe vergleichen',scroll:'Seitlich scrollen, um alle Spalten zu vergleichen.',need:'Deine Aufgabe',consider:'Erwägen',check:'Abwägung prüfen',examples:'Modelle zum Prüfen',before:'Vor dem Kauf',models:'Modelle mit Quellen in dieser Kategorie',modelJump:'Modelle ansehen',compareJump:'Einsatzzwecke vergleichen',faq:'Fragen vor der Auswahl',sources:'Quellen und Grenzen',related:'Verwandte Kaufhilfen',updated:'Kaufhilfe aktualisiert',checked:'Redaktion geprüft',filtered:'Den Gesamtkatalog auf diese Kategorie filtern',all:'Alle 100 Modelle ansehen',method:'Diese Kaufhilfe ordnet veröffentlichte Hersteller- und Produktinformationen ein; sie ist kein eigener Produkttest und keine Rangliste. Eine Quelle bestätigt ihre Angaben, nicht den aktuellen lokalen Bestand, Preis oder die Eignung eines Produkts. Genaues Modell, regionale Version und Verkäufer vor dem Kauf prüfen.',sourceAmazon:'Amazon-Produktseite; den gekennzeichneten Modelllink oben nutzen',sourceMethod:'Die einzelnen Modellkarten behalten ihre eigenen Daten der Quellenprüfung.'},
 zh:{home:'首页',catalogue:'居家生活商品目录',answer:'先看结论',decisions:'怎样做选择',comparison:'按实际用途比较',scroll:'左右滑动查看全部比较项。',need:'你的需求',consider:'可以考虑',check:'需要接受或核对的取舍',examples:'可核对的具体型号',before:'购买前再确认',models:'本类有来源的具体型号',modelJump:'查看具体型号',compareJump:'比较不同用途',faq:'选择前的常见问题',sources:'来源与适用范围',related:'相关选购指南',updated:'指南更新日期',checked:'指南复核日期',filtered:'在完整目录中筛选这个类别',all:'查看全部 100 款',method:'本指南解读公开厂家与产品资料，不是实物测评或排名。来源只能支持其公布的信息，不能证明当地实时库存、价格或适配性。购买前请核对具体型号、地区版本和卖家。',sourceAmazon:'Amazon 商品资料；请使用上方明确标示的型号链接',sourceMethod:'各型号卡片保留各自的来源核对日期。'}
};

function categoryProducts(record,products){const group=homeCatalogCategories.find(c=>c.id===record.id);return products.filter(p=>group.types.includes(p.category));}
function sourceHTML(record,lang,esc){const c=copy[lang];return record.sources.map(s=>`<li>${amazonSource(s.url)?`${esc(s.label)} — ${c.sourceAmazon}`:`<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`}</li>`).join('');}
function localProductLinks(ids,byId,esc){return ids.map(id=>`<a href="#catalog-item-${id}">${esc(byId.get(id).name)}</a>`).join('');}

export function categoryPageHTML({record,updated,lang,route,esc,products=loadHomeCatalog()}){
 const c=copy[lang],d=record[lang],market=homeCatalogCopy(lang),group=homeCatalogCategories.find(g=>g.id===record.id),selected=categoryProducts(record,products),byId=new Map(selected.map(p=>[p.id,p]));
 const related=record.related.map(id=>homeCatalogCategories.find(g=>g.id===id));
 return `<nav class="breadcrumb" aria-label="${c.home}"><a href="${route(lang)}">${c.home}</a><span>/</span><a href="${route(lang,'shop')}">${c.catalogue}</a><span>/</span><span>${esc(group[lang])}</span></nav><article class="category-guide" data-category-guide="${record.id}"><header class="category-guide-hero"><p class="category-guide-kicker">${esc(group[lang])}</p><h1>${esc(d.title)}</h1><p class="category-direct-answer" data-category-answer>${esc(d.answer)}</p><p class="category-guide-dates">${c.updated}: <time datetime="${updated}">${updated}</time> · ${c.checked}: <time datetime="${record.checked}">${record.checked}</time></p><nav class="category-guide-jumps" aria-label="${c.decisions}"><a class="button primary" href="#category-models">${c.modelJump} (${selected.length})</a><a class="button" href="#category-comparison">${c.compareJump}</a><a href="#category-faq">${c.faq}</a></nav></header><section class="category-decisions" id="category-decisions"><h2>${c.decisions}</h2><ol>${d.decisions.map(x=>`<li><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></li>`).join('')}</ol></section><section class="category-comparison" id="category-comparison"><h2>${c.comparison}</h2><p class="category-table-hint">${c.scroll}</p><div class="category-table-scroll" role="region" aria-label="${c.comparison}" tabindex="0"><table><thead><tr><th scope="col">${c.need}</th><th scope="col">${c.consider}</th><th scope="col">${c.check}</th></tr></thead><tbody>${d.comparisons.map(row=>`<tr><th scope="row">${esc(row.need)}</th><td><p>${esc(row.consider)}</p><div class="category-model-links" aria-label="${c.examples}">${localProductLinks(row.productIds,byId,esc)}</div></td><td>${esc(row.check)}</td></tr>`).join('')}</tbody></table></div></section><section class="category-buying-checks"><h2>${c.before}</h2><ul>${d.beforeBuying.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section class="category-models" id="category-models" data-category-models><header><h2>${c.models}</h2><p class="category-market">${market.market}</p><p>${market.notice}</p></header>${homeCatalogProductCardsHTML({lang,esc,merchantURL,disclosure:shoppingCopy[lang].disclosure,products:selected,placement:'guide'})}</section><section class="category-faq" id="category-faq"><h2>${c.faq}</h2>${d.faq.map(q=>`<details><summary>${esc(q.question)}</summary><p>${esc(q.answer)}</p></details>`).join('')}</section><section class="category-sources" id="category-sources"><h2>${c.sources}</h2><p>${c.method}</p><p>${c.sourceMethod}</p><ul>${sourceHTML(record,lang,esc)}</ul></section><nav class="category-related" aria-label="${c.related}"><h2>${c.related}</h2>${related.map(g=>`<a href="${route(lang,'shop/categories/'+g.id)}">${g[lang]} →</a>`).join('')}<a href="${route(lang,'shop')}#catalog-category-${record.id}">${c.filtered}</a><a href="${route(lang,'shop')}">${c.all}</a></nav></article>`;
}

export function categoryPageText({record,updated,lang,route,origin,products=loadHomeCatalog()}){
 const c=copy[lang],d=record[lang],selected=categoryProducts(record,products),byId=new Map(selected.map(p=>[p.id,p])),slug='shop/categories/'+record.id;
 return[d.title,d.description,d.answer,c.updated+': '+updated,c.checked+': '+record.checked,c.decisions,...d.decisions.flatMap(x=>[x.title,x.body]),c.comparison,...d.comparisons.flatMap(x=>[x.need,x.consider,x.check,...x.productIds.map(id=>byId.get(id).name+': '+origin+route(lang,slug)+'#catalog-item-'+id)]),c.before,...d.beforeBuying,c.models,homeCatalogCopy(lang).notice,shoppingCopy[lang].disclosure,...homeCatalogProductText({lang,route,origin,slug,products:selected}),c.faq,...d.faq.flatMap(q=>[q.question,q.answer]),c.sources,c.method,c.sourceMethod,...record.sources.map(s=>s.label+(amazonSource(s.url)?' — '+c.sourceAmazon:': '+s.url)),c.related,...record.related.map(id=>homeCatalogCategories.find(g=>g.id===id)[lang]+': '+origin+route(lang,'shop/categories/'+id)),c.filtered+': '+origin+route(lang,'shop')+'#catalog-category-'+record.id,c.all+': '+origin+route(lang,'shop')];
}

export function categoryPageSchema({record,lang,route,origin,products=loadHomeCatalog()}){
 const c=copy[lang],d=record[lang],url=origin+route(lang,'shop/categories/'+record.id),selected=categoryProducts(record,products);
 return [
  {'@type':'BreadcrumbList','@id':url+'#breadcrumbs',itemListElement:[{name:c.home,item:origin+route(lang)},{name:c.catalogue,item:origin+route(lang,'shop')},{name:d.title,item:url}].map((p,i)=>({'@type':'ListItem',position:i+1,...p}))},
  {'@type':'ItemList','@id':url+'#models',name:d.title,numberOfItems:selected.length,itemListElement:selected.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:url+'#catalog-item-'+p.id}))}
 ];
}
export function buildCategoryPages({emit,route,esc,locales,origin,products=loadHomeCatalog(),guides=loadCategoryGuides(products)}){
 validateCategoryGuides(guides,products);
 for(const lang of Object.keys(locales))for(const category of homeCatalogCategories){const record=guides.categories.find(c=>c.id===category.id),d=record[lang],args={record,updated:guides.updated,lang,route,esc,origin,products};emit(lang,'shop/categories/'+record.id,d.title,d.description,categoryPageHTML(args),categoryPageText(args),categoryPageSchema(args),guides.updated);}
}
