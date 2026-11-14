export const CATALOG_QUERY_LIMIT=80;
const foldSearch=value=>String(value??'').normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
export function normalizeCatalogSearch(value){return foldSearch(String(value??'').slice(0,CATALOG_QUERY_LIMIT));}
export function filterCatalogItems(items,{category='all',query=''}={}){const terms=normalizeCatalogSearch(query).split(' ').filter(Boolean);return items.filter(item=>(category==='all'||item.category===category)&&terms.every(term=>foldSearch(item.searchText).includes(term)));}
const initialized=new WeakSet();
export function installHomeCatalog(root){
 if(!root||initialized.has(root)||root.hasAttribute('data-catalog-compact'))return null;
 let config;try{const raw=root.querySelector('[data-home-catalog-config]')?.textContent;if(!raw||raw.length>5000)return null;config=JSON.parse(raw);if(!Array.isArray(config.categories)||config.categories.length>14||config.categories.some(x=>typeof x!=='string'||!/^[a-z-]+$/.test(x))||!config.labels||['showing','of','models'].some(k=>typeof config.labels[k]!=='string'))return null;}catch{return null;}
 const controls=root.querySelector('[data-catalog-controls]'),select=root.querySelector('[data-catalog-filter]'),input=root.querySelector('[data-catalog-query]'),reset=root.querySelector('[data-catalog-reset]'),count=root.querySelector('[data-catalog-count]'),empty=root.querySelector('[data-catalog-empty]');
 if(![controls,select,input,reset,count,empty].every(Boolean))return null;
 const cards=Array.from(root.querySelectorAll('[data-home-product]')).map(el=>({el,id:el.dataset.homeProduct,category:el.dataset.catalogCategory,searchText:el.dataset.catalogSearch})),groups=Array.from(root.querySelectorAll('[data-home-category]'));
 const allowed=new Set(['all',...config.categories]);
 function render(){
  if(!allowed.has(select.value))select.value='all';
  if(input.value.length>CATALOG_QUERY_LIMIT)input.value=input.value.slice(0,CATALOG_QUERY_LIMIT);
  const visible=filterCatalogItems(cards,{category:select.value,query:input.value}),ids=new Set(visible.map(c=>c.id));
  for(const card of cards)card.el.hidden=!ids.has(card.id);
  for(const group of groups){const total=visible.filter(c=>c.category===group.dataset.homeCategory).length;group.hidden=!total;const label=group.querySelector('[data-catalog-group-count]');if(label)label.textContent=total+' '+config.labels.models;}
  count.textContent=config.labels.showing+' '+visible.length+' '+config.labels.of+' '+cards.length+' '+config.labels.models;empty.hidden=visible.length!==0;reset.disabled=select.value==='all'&&!input.value;
  return visible.map(c=>c.id);
 }
 input.addEventListener('input',render);select.addEventListener('change',render);reset.addEventListener('click',()=>{select.value='all';input.value='';render();input.focus();});
 root.addEventListener('click',event=>{const link=event.target?.closest?.('[data-catalog-category-link]');if(!link||!root.contains(link)||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;const href=link.getAttribute('href');if(href&&!href.startsWith('#catalog-category-'))return;const category=link.dataset.catalogCategoryLink;if(!allowed.has(category))return;select.value=category;input.value='';render();});
 const view=root.ownerDocument.defaultView;
 function applyFragment(){
  const hash=view?.location?.hash||'',match=hash.match(/^#catalog-category-([a-z-]+)$/);
  if(match&&allowed.has(match[1])){select.value=match[1];input.value='';render();return;}
  const item=cards.find(card=>hash==='#catalog-item-'+card.id);
  if(hash==='#home-catalog'||item){select.value='all';input.value='';render();}
 }
 applyFragment();view?.addEventListener?.('hashchange',applyFragment);
 render();controls.hidden=false;initialized.add(root);return{render};
}
if(typeof document!=='undefined')for(const root of document.querySelectorAll('[data-home-catalog]'))installHomeCatalog(root);
