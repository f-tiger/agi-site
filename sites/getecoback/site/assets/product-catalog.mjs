/* Local directory filtering and answer copying. No network calls, storage, URL queries or telemetry. */
const normalize=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/\s+/g,' ').trim();
function searchText(value){
 const umlauts={ä:'ae',ö:'oe',ü:'ue'};
 const alternative=value.replace(/[äöü]/gi,letter=>umlauts[letter.toLocaleLowerCase('de')]);
 return normalize(alternative===value?value:value+' '+alternative);
}
const root=document.querySelector('[data-product-directory]');
if(root){
 const form=root.querySelector('#product-filters'),query=root.querySelector('#product-query'),category=root.querySelector('#product-category'),status=root.querySelector('#product-filter-status'),empty=root.querySelector('#product-filter-empty');
 const groups=[...root.querySelectorAll('[data-product-category]')];
 const categoryNames=new Map([...category.options].map(option=>[option.value,option.textContent]));
 const cards=[...root.querySelectorAll('[data-product-card]')].map(node=>({
  node,
  text:searchText([categoryNames.get(node.dataset.category),node.dataset.category,node.textContent].join(' ')),
  category:node.dataset.category
 }));
 const guideSection=root.querySelector('[data-specialist-guides]');
 const guides=[...root.querySelectorAll('[data-specialist-guide]')].map(node=>({
  node,
  text:searchText(node.textContent+' '+(node.dataset.searchTerms||''))
 }));
 const partResults=root.querySelector('[data-part-results]');
 const partGuides=[...root.querySelectorAll('[data-part-guide]')].map(node=>({
  node, category:node.dataset.category,
  text:searchText(node.textContent+' '+node.dataset.searchTerms)
 }));
 const render=()=>{
  const terms=normalize(query.value).split(' ').filter(Boolean),selected=category.value;let count=0,groupCount=0;
  const matches=text=>terms.every(term=>text.includes(term));
  for(const card of cards){const visible=(!selected||card.category===selected)&&matches(card.text);card.node.hidden=!visible;if(visible)count++;}
  for(const group of groups){const has=cards.some(card=>card.category===group.dataset.productCategory&&!card.node.hidden);group.hidden=!has;if(has)groupCount++;}
  let guideCount=0;
  for(const guide of guides){
   guide.node.hidden=Boolean(selected)||!matches(guide.text);
   if(!guide.node.hidden)guideCount++;
  }
  if(guideSection)guideSection.hidden=guideCount===0;
  if(partResults){
   const parts=terms.length ? partGuides.filter(part=>(!selected||part.category===selected)&&matches(part.text)) : [];
   partResults.replaceChildren(...parts.map(({node})=>node.parentElement.cloneNode(true)));
   partResults.hidden=parts.length===0;
   guideCount+=parts.length;
  }
  const guideStatus=selected&&!guideCount?'':` · ${guideCount} ${guideCount===1?'Kaufhilfe':'Kaufhilfen'}`;
  status.textContent=`${count} von ${cards.length} Modellen · ${groupCount} ${groupCount===1?'Produktgruppe':'Produktgruppen'}${guideStatus}.`;
  empty.hidden=count+guideCount>0;
 };
 const clearFragment=()=>{if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);};
 const filter=()=>{clearFragment();render();};
 const followFragment=()=>{
  let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
  if(!id){query.value='';category.value='';render();return;}
  const target=document.getElementById(id),group=target?.closest('[data-product-category]');
  if(!target||!root.contains(target))return;
  if(group||target===guideSection){
   query.value='';category.value=group?.dataset.productCategory||'';render();
  }
  // Reveal filtered model targets before scrolling and preserve same-page history.
  requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
 };
 form.addEventListener('submit',event=>{event.preventDefault();filter();});
 query.addEventListener('input',filter);category.addEventListener('change',filter);
 form.addEventListener('reset',event=>{event.preventDefault();query.value='';category.value='';filter();query.focus();});
 root.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',event=>{
  // Native fragment navigation owns history. Same-fragment clicks still reveal a filtered target.
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  if(a.hash===location.hash){event.preventDefault();followFragment();}
 }));
 window.addEventListener('hashchange',followFragment);
 form.hidden=false;render();followFragment();

 const share = root.querySelector('[data-product-share]');
 if (share) {
  const text = share.querySelector('textarea');
  const copy = share.querySelector('[data-product-share-copy]');
  const notice = share.querySelector('[role="status"]');
  copy.addEventListener('click', async () => {
   try {
    await navigator.clipboard.writeText(text.value);
    notice.textContent = 'Antwort kopiert.';
   } catch {
    text.focus();
    text.select();
    notice.textContent = 'Der Text ist markiert. Bitte manuell kopieren.';
   }
  });
  copy.hidden = false;
 }
}
