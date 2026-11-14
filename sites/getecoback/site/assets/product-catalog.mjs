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
 const clearFragment=()=>{if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);};
 const filter=()=>{clearFragment();render();};
 const followFragment=()=>{
  let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
  if(!id){query.value='';category.value='';render();return;}
  const target=document.getElementById(id),group=target?.closest('[data-product-category]');
  if(!group||!root.contains(target))return;
  query.value='';category.value=group.dataset.productCategory;render();
  // Reveal before scrolling: a previous local filter may have hidden this model.
  requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
 };
 form.addEventListener('submit',event=>{event.preventDefault();filter();});
 query.addEventListener('input',filter);category.addEventListener('change',filter);
 form.addEventListener('reset',event=>{event.preventDefault();query.value='';category.value='';filter();query.focus();});
 root.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',event=>{
  // Native fragment navigation owns history. Same-fragment clicks still reveal a filtered target.
  if(a.hash===location.hash){event.preventDefault();followFragment();}
 }));
 window.addEventListener('hashchange',followFragment);
 form.hidden=false;render();followFragment();
}
