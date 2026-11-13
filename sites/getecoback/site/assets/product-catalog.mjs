/* Local directory filtering only. No network calls, storage, URL queries or telemetry. */
const normalize=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('de').replace(/\s+/g,' ').trim();
const root=document.querySelector('[data-product-directory]');
if(root){
 const form=root.querySelector('#product-filters'),query=root.querySelector('#product-query'),category=root.querySelector('#product-category'),status=root.querySelector('#product-filter-status'),empty=root.querySelector('#product-filter-empty');
 const groups=[...root.querySelectorAll('[data-product-category]')],cards=[...root.querySelectorAll('[data-product-card]')].map(node=>({node,text:normalize(node.textContent),category:node.dataset.category}));
 const render=()=>{
  const terms=normalize(query.value).split(' ').filter(Boolean),selected=category.value;let count=0,groupCount=0;
  for(const card of cards){const visible=(!selected||card.category===selected)&&terms.every(term=>card.text.includes(term));card.node.hidden=!visible;if(visible)count++;}
  for(const group of groups){const has=cards.some(card=>card.category===group.dataset.productCategory&&!card.node.hidden);group.hidden=!has;if(has)groupCount++;}
  status.textContent=`${count} von ${cards.length} Modellen · ${groupCount} Produktgruppen.`;empty.hidden=count!==0;
 };
 form.addEventListener('submit',event=>{event.preventDefault();render();});
 query.addEventListener('input',render);category.addEventListener('change',render);
 form.addEventListener('reset',event=>{event.preventDefault();query.value='';category.value='';render();query.focus();});
 root.querySelectorAll('[data-category-link]').forEach(a=>a.addEventListener('click',()=>{query.value='';category.value=a.dataset.categoryLink;render();}));
 const initial=decodeURIComponent(location.hash).match(/^#kategorie-([a-z0-9-]+)$/)?.[1];
 if(initial&&[...category.options].some(option=>option.value===initial))category.value=initial;
 form.hidden=false;render();
}
