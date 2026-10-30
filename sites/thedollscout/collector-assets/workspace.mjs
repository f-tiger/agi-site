// Read-only summary of the existing local collection. Search inputs never leave the browser.
export function matchesSeries(search,brand,query,selectedBrand){
 return (!selectedBrand||brand===selectedBrand)&&query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean).every(word=>search.toLocaleLowerCase().includes(word));
}
export function initWorkspace(doc,core,storage){
 const config=doc.querySelector('[data-desk-config]');
 if(!config)return;
 const {labels:c,series}=JSON.parse(config.textContent),cards=[...doc.querySelectorAll('[data-desk-series]')];
 const search=doc.querySelector('#series-search'),brand=doc.querySelector('#series-brand');
 function filter(){let count=0;for(const card of cards){card.hidden=!matchesSeries(card.dataset.search,card.dataset.brand,search.value,brand.value);if(!card.hidden)count++;}doc.querySelector('[data-desk-count]').textContent=count+' '+c.results;doc.querySelector('[data-desk-empty]').hidden=count!==0;}
 doc.querySelector('[data-desk-controls]').hidden=false;
 search.addEventListener('input',filter);brand.addEventListener('change',filter);
 doc.querySelector('[data-desk-clear]').addEventListener('click',()=>{search.value='';brand.value='';filter();search.focus();});
 function refresh(){
  const summary=doc.querySelector('[data-desk-summary]'),resume=doc.querySelector('[data-desk-resume]');resume.replaceChildren();
  for(const card of cards)card.querySelector('[data-desk-progress]').hidden=true;
  try{
   const {items}=core.readCollection(storage());
   const owned=items.filter(i=>i.status==='owned');summary.textContent=owned.length?owned.length+' '+c.owned:c.empty;
   let links=0;
   for(const s of series){const count=s.names.filter(name=>core.seriesOwned(items,{seriesId:s.id,styleId:core.styleId(name),series:s.title,name})).length;
    const card=cards.find(x=>x.dataset.deskSeries===s.id);if(!card||!count)continue;
    const progress=card.querySelector('[data-desk-progress]');progress.hidden=false;progress.textContent=count+'/'+s.names.length;
    if(links++<3){const a=doc.createElement('a');a.href=s.url+'#checklist';a.textContent=c.resume+': '+s.title;resume.append(a);}
   }
  }catch{summary.textContent=c.error;}
 }
 refresh();return refresh;
}
if(typeof document!=='undefined'){
 const refresh=initWorkspace(document,globalThis.DSCollector,()=>localStorage);
 if(refresh)window.addEventListener('storage',refresh);
 for(const button of document.querySelectorAll('[data-checklist-print]')){button.hidden=false;button.addEventListener('click',()=>window.print());}
}
