import fs from 'node:fs';

export const homeCatalogCategories=Object.freeze([
 {id:'storage',types:['display','storage'],en:'Storage & display',de:'Ordnen & Ausstellen',zh:'收纳与展示'},
 {id:'workspace',types:['desk','stationery'],en:'Desk & stationery',de:'Schreibtisch & Papier',zh:'桌面与文具'},
 {id:'lighting',types:['lighting'],en:'Lighting',de:'Beleuchtung',zh:'居家照明'},
 {id:'smart-home',types:['smart-home'],en:'Smart home',de:'Smart Home',zh:'智能家居'},
 {id:'electronics',types:['electronics','photo'],en:'Tech & photography',de:'Technik & Fotografie',zh:'数码与摄影'},
 {id:'kitchen',types:['kitchen'],en:'Kitchen',de:'Küche',zh:'厨房用品'},
 {id:'home-care',types:['cleaning','climate'],en:'Cleaning & indoor climate',de:'Reinigung & Raumklima',zh:'清洁与室内环境'},
 {id:'daily-care',types:['personal-care','bath'],en:'Personal care & bath',de:'Körperpflege & Bad',zh:'个护与浴室'},
 {id:'creative',types:['creative'],en:'Creative hobbies',de:'Kreative Hobbys',zh:'创作与手作'}
]);
const sourceCategories=new Set(homeCatalogCategories.flatMap(c=>c.types));
const exactUS=Object.freeze({'niubee-risers':'B07KN5G9CQ','rub-4l':'B000KN4DQ4'});
const folded=value=>String(value).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export function validateHomeCatalog(input,{expectedCount=100}={}){
 const products=Array.isArray(input)?input:input?.products;
 if(!Array.isArray(products)||products.length!==expectedCount)throw Error('Home catalogue requires '+expectedCount+' products');
 const ids=new Set(),models=new Set();
 for(const p of products){
  if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(p.id)||ids.has(p.id))throw Error('Invalid or duplicate catalogue ID');
  for(const key of ['name','brand','model','useEn','checkEn','useDe','checkDe','useZh','checkZh'])if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>1800)throw Error('Missing catalogue field: '+key);
  const model=folded(p.brand)+'|'+folded(p.model);if(models.has(model))throw Error('Duplicate catalogue model');models.add(model);ids.add(p.id);
  if(!sourceCategories.has(p.category))throw Error('Unknown catalogue category');
  let source;try{source=new URL(p.sourceUrl);}catch{throw Error('Missing product source');}
  if(source.protocol!=='https:'||source.username||source.password)throw Error('Product source must be a public HTTPS URL');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.checked||'')||new Date(p.checked+'T00:00:00Z').toISOString().slice(0,10)!==p.checked)throw Error('Invalid product source date');
  if(p.amazonUSAsin!==undefined&&p.amazonUSAsin!==exactUS[p.id])throw Error('Unverified exact Amazon model');
 }
 return products;
}
export function loadHomeCatalog(){return validateHomeCatalog(JSON.parse(fs.readFileSync(new URL('../../content/amazon-products.json',import.meta.url),'utf8')));}

const copy={
 en:{title:'Home essentials, by the job they do',intro:'Source-backed models for everyday spaces. Compare the use and the trade-off, then inspect the current Amazon offer.',featured:'A starting point for each part of the home',all:'All categories',browse:'Browse all models',catalogue:'Explore the catalogue',market:'Shopping destination: Amazon.com · United States',notice:'Product identity checked; local availability unverified. Search results may differ. Check version, voltage, compatibility, seller and returns.',check:'Check before choosing',source:'Source',amazonSource:'Amazon US listing',checked:'Source checked',exact:'Verified US product link',search:'Model search · availability unverified',exactCTA:'Check this model on Amazon US',searchCTA:'Search this model on Amazon US',category:'Category',searchLabel:'Search brand, model or purpose',placeholder:'For example: lamp, OXO, USB',reset:'Clear filters',showing:'Showing',of:'of',models:'models',empty:'No models match. Try another name or clear the filters.',local:'Local search; nothing is uploaded.',nojs:'Every model and source is available below without JavaScript. Category links jump to the relevant section.',collector:'Collector corner',collectorIntro:'Display, carry and gifting guides for your collection, plus your saved comparison shortlist.',homeTitle:'Useful finds for everyday life.',homeIntro:'Browse 100 real home and lifestyle models, with a reason to consider each and a check before buying.',hubTitle:'100 home & lifestyle models',hubIntro:'Explore by room, purpose or model. Verified US product links and model searches are labelled separately.'},
 de:{title:'Nützliche Dinge für deinen Alltag',intro:'Modelle mit überprüfbaren Quellen für verschiedene Wohnbereiche. Nutzen und Grenzen vergleichen, dann das aktuelle Amazon-Angebot prüfen.',featured:'Ein Einstieg für jeden Wohnbereich',all:'Alle Kategorien',browse:'Alle Modelle ansehen',catalogue:'Katalog entdecken',market:'Einkaufsmarkt: Amazon.de · Deutschland',notice:'Produktidentität geprüft, lokale Verfügbarkeit unbestätigt. Suchtreffer können abweichen: Version, Spannung, Kompatibilität, Verkäufer und Rückgabe prüfen.',check:'Vor der Auswahl prüfen',source:'Quelle',amazonSource:'US-Produktseite bei Amazon',checked:'Quelle geprüft',exact:'Geprüfter US-Produktlink',search:'Modellsuche · Verfügbarkeit ungeprüft',exactCTA:'Dieses Modell bei Amazon USA prüfen',searchCTA:'Dieses Modell bei Amazon.de suchen',category:'Kategorie',searchLabel:'Marke, Modell oder Zweck suchen',placeholder:'Zum Beispiel: Lampe, OXO, USB',reset:'Filter zurücksetzen',showing:'Angezeigt:',of:'von',models:'Modelle',empty:'Keine passenden Modelle. Einen anderen Namen suchen oder die Filter zurücksetzen.',local:'Lokale Suche ohne Upload.',nojs:'Alle Modelle und Quellen stehen auch ohne JavaScript unten. Die Kategorien führen direkt zum passenden Abschnitt.',collector:'Bereich für Sammler',collectorIntro:'Kaufhilfen zum Ausstellen, Mitnehmen und Verschenken sowie deine gespeicherte Vergleichsliste.',homeTitle:'Nützliche Dinge fürs tägliche Leben.',homeIntro:'100 reale Modelle für Haushalt und Alltag: jeweils mit einem Einsatzzweck und einem wichtigen Prüfpunkt.',hubTitle:'100 Modelle für Haushalt & Alltag',hubIntro:'Nach Wohnbereich, Aufgabe oder Modell stöbern. Modellsuchen sind klar gekennzeichnet; Verfügbarkeit bitte vor Ort prüfen.'},
 zh:{title:'按居家用途发现具体商品',intro:'为不同生活场景整理有来源的型号。先看用途和取舍，再核对 Amazon 当前商品。',featured:'从家里的不同需求开始',all:'全部分类',browse:'查看全部型号',catalogue:'浏览商品目录',market:'购物地区：Amazon.com · 美国站；不保证向中国或其他地区配送',notice:'身份已核对，当地可购未核实。搜索结果可能不同，请核对版本、电压、兼容性、卖家与退货。',check:'选择前先核对',source:'资料来源',amazonSource:'Amazon 美国商品页',checked:'来源核对日期',exact:'已核实的美国商品链接',search:'型号搜索 · 当地可购未核实',exactCTA:'在 Amazon 美国查看这个型号',searchCTA:'在 Amazon 美国搜索此型号',category:'商品分类',searchLabel:'搜索品牌、型号或用途',placeholder:'例如：台灯、OXO、USB',reset:'清除筛选',showing:'当前显示',of:'／',models:'款',empty:'没有匹配的型号。试试其他名称，或清除筛选。',local:'搜索仅在本页运行，不上传。',nojs:'无需 JavaScript 也能阅读下方全部型号与来源；分类链接可直接跳到对应区域。',collector:'收藏专区',collectorIntro:'继续使用收藏展示、携带和送礼指南，以及已经保存的商品比较清单。',homeTitle:'发现日常生活中用得上的东西。',homeIntro:'100 款真实居家生活型号，每款说明适合的用途和购买前需要核对的条件。',hubTitle:'100 款居家生活商品目录',hubIntro:'按空间、用途或型号寻找。已核实的美国商品链接与型号搜索分别标示。'}
};
export function homeCatalogCopy(lang){return copy[lang];}
const categoryFor=p=>homeCatalogCategories.find(c=>c.types.includes(p.category));
const sourceIsAmazon=p=>/(^|\.)amazon\.(com|de|co\.uk)$/.test(new URL(p.sourceUrl).hostname);
function selectedProducts(products,compact){
 if(!compact)return products;
 const chosen=homeCatalogCategories.map(c=>products.find(p=>c.types.includes(p.category))).filter(Boolean);
 for(const id of ['niubee-risers','rub-4l']){const p=products.find(x=>x.id===id);if(p&&!chosen.includes(p))chosen.push(p);}
 return chosen.slice(0,12);
}
export function homeCatalogFeatured(products){return selectedProducts(products,true);}
function productCard(p,{lang,esc,merchantURL,disclosure}){
 const c=copy[lang],suffix={en:'En',de:'De',zh:'Zh'}[lang],group=categoryFor(p),exact=lang!=='de'&&p.amazonUSAsin&&exactUS[p.id]===p.amazonUSAsin;
 const href=exact?`https://www.amazon.com/dp/${p.amazonUSAsin}?tag=ecoback0d-20`:merchantURL(lang,p.brand+' '+p.model);
 const attrs=exact?`data-shopping-item="${p.id}" data-shopping-placement="card" data-shopping-destination`:'data-shopping-merchant';
 const search=[p.name,p.brand,p.model,p['use'+suffix],group[lang]].join(' ');
 return `<article class="home-product-card" id="catalog-item-${p.id}" data-home-product="${p.id}" data-catalog-category="${group.id}" data-catalog-search="${esc(search)}"><p class="home-product-category">${esc(group[lang])}</p><h3>${esc(p.name)}</h3><p class="home-product-model">${esc(p.brand)} · ${esc(p.model)}</p><p class="home-product-use">${esc(p['use'+suffix])}</p><p class="home-product-link-kind">${exact?c.exact:c.search}</p><p class="home-product-disclosure">${esc(disclosure)}</p><a class="button primary" href="${esc(href)}" rel="sponsored nofollow noopener" data-catalog-link-type="${exact?'exact':'model-search'}" ${attrs}>${exact?c.exactCTA:c.searchCTA}</a><div class="home-product-check"><h4>${c.check}</h4><p>${esc(p['check'+suffix])}</p></div><p class="home-product-source">${c.source}: ${sourceIsAmazon(p)?c.amazonSource:`<a href="${esc(p.sourceUrl)}" rel="noopener" data-catalog-source>${c.source}</a>`}<br>${c.checked}: <time datetime="${p.checked}">${p.checked}</time></p></article>`;
}
function categoryNavigation(products,lang,route,compact){const c=copy[lang];return `<nav class="home-catalog-categories" aria-label="${c.category}" tabindex="0">${homeCatalogCategories.map(g=>{const count=products.filter(p=>g.types.includes(p.category)).length;return count?`<a href="${compact?route(lang,'shop'):''}#catalog-category-${g.id}" data-catalog-category-link="${g.id}"><span>${g[lang]}</span><strong>${count}</strong></a>`:'';}).join('')}</nav>`;}

export function homeCatalogHTML({lang,route,esc,merchantURL,disclosure,compact=false,products=loadHomeCatalog()}){
 const c=copy[lang],selected=selectedProducts(products,compact),categories=homeCatalogCategories.filter(g=>products.some(p=>g.types.includes(p.category)));
 const config={categories:categories.map(g=>g.id),labels:{showing:c.showing,of:c.of,models:c.models}};
 const controls=compact?'':`<div class="home-catalog-controls" data-catalog-controls hidden><label>${c.category}<select data-catalog-filter><option value="all">${c.all}</option>${categories.map(g=>`<option value="${g.id}">${g[lang]}</option>`).join('')}</select></label><label class="home-catalog-search">${c.searchLabel}<input type="search" maxlength="80" autocomplete="off" placeholder="${c.placeholder}" data-catalog-query></label><button class="button" type="button" data-catalog-reset disabled>${c.reset}</button><p class="home-catalog-local">${c.local}</p></div><p class="home-catalog-count" data-catalog-count aria-live="polite">${c.showing} ${products.length} ${c.models}</p><p class="home-catalog-empty" data-catalog-empty hidden>${c.empty}</p>`;
 const cards=compact?`<div class="home-product-grid">${selected.map(p=>productCard(p,{lang,esc,merchantURL,disclosure})).join('')}</div>`:categories.map(g=>`<section class="home-catalog-group" id="catalog-category-${g.id}" data-home-category="${g.id}"><header><h2>${g[lang]}</h2><p data-catalog-group-count>${products.filter(p=>g.types.includes(p.category)).length} ${c.models}</p></header><div class="home-product-grid">${selected.filter(p=>g.types.includes(p.category)).map(p=>productCard(p,{lang,esc,merchantURL,disclosure})).join('')}</div></section>`).join('');
 return `<section class="home-catalog${compact?' home-catalog-compact':''}" id="home-catalog" aria-label="${c.title}" data-home-catalog${compact?' data-catalog-compact':''}><header class="home-catalog-intro">${compact?`<h2>${c.featured}</h2>`:''}<p class="home-catalog-market">${c.market}</p><p>${c.notice}</p></header>${categoryNavigation(products,lang,route,compact)}${controls}${cards}${compact?`<a class="button home-catalog-all" href="${route(lang,'shop')}">${c.browse} (${products.length}) →</a>`:`<noscript><p>${c.nojs}</p></noscript><script type="application/json" data-home-catalog-config>${JSON.stringify(config).replace(/</g,'\\u003c')}</script>`}</section>`;
}
export function homeCatalogText({lang,route,origin='https://thedollscout.com',compact=false,products=loadHomeCatalog()}){
 const c=copy[lang],suffix={en:'En',de:'De',zh:'Zh'}[lang];return[c.title,c.notice,...homeCatalogCategories.map(g=>g[lang]+': '+products.filter(p=>g.types.includes(p.category)).length+' — '+origin+route(lang,'shop')+'#catalog-category-'+g.id),...selectedProducts(products,compact).flatMap(p=>[p.name,p.brand+' · '+p.model,p['use'+suffix],c.check+': '+p['check'+suffix],c.checked+': '+p.checked,...(sourceIsAmazon(p)?[]:[p.sourceUrl]),origin+route(lang,'shop')+'#catalog-item-'+p.id])];
}
export function homeCatalogSchema({lang,route,origin='https://thedollscout.com',compact=false,products=loadHomeCatalog()}){
 const list=compact?selectedProducts(products,true):homeCatalogCategories.flatMap(g=>products.filter(p=>g.types.includes(p.category)));
 return {'@type':'ItemList',name:copy[lang].title,numberOfItems:list.length,itemListElement:list.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:origin+route(lang,'shop')+'#catalog-item-'+p.id}))};
}
