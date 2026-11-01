// Queries stay in memory. Only fixed navigation actions reach the existing bridge.
export const normalize=value=>String(value).toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFD').replace(/\p{Diacritic}/gu,'');
const stop=new Set('wie kann ich meine mein der die das und im in am zu fuer what how do i my the a an and for to can de la le les un une el los las il lo una di het een ik'.split(' '));
export function searchEntries(index,term,lang){
 const words=normalize(term).match(/[\p{L}\p{N}]+/gu)?.filter(w=>!stop.has(w))||[];
 if(!words.length)return [];
 return index.filter(e=>e.l===lang&&typeof e.t==='string'&&/^\/(?!\/)[^?#\\]*$/.test(e.u)&&!/^\/(auth|api|account|members|widgets)(\/|\.|$)/.test(e.u))
 .map(e=>{const title=normalize(e.t),desc=normalize(e.d||''),alias=normalize(e.a||'');const scores=words.map(w=>title.includes(w)?4:alias.includes(w)?3:desc.includes(w)?1:0);return {entry:e,score:scores.every(Boolean)?scores.reduce((a,b)=>a+b,0):0};})
 .filter(h=>h.score>0).sort((a,b)=>b.score-a.score||a.entry.u.localeCompare(b.entry.u)).slice(0,6);
}
if(typeof document!=='undefined'){
 const root=document.getElementById('eco-discovery');
 if(root){
  const t=JSON.parse(document.getElementById('eco-chrome-copy').textContent);
  const lang=location.pathname.startsWith('/au/')?'en-AU':({'en-GB':'en','de-DE':'de','zh':'zh-CN'}[document.documentElement.lang]||document.documentElement.lang);
  const query=document.getElementById('eb-search-query'),results=document.getElementById('eb-search-results'),status=document.getElementById('eb-search-status'),toggle=document.getElementById('eb-search-toggle'),form=document.getElementById('eb-search-form');
  let pending,timer,sequence=0;
  const emit=name=>window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));
  const close=focus=>{root.open=false;toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus();};
  async function search(){
   const id=++sequence,term=query.value.trim();results.replaceChildren();
   if(term.length<2){status.textContent=t.searchHint;return;}
   status.textContent=t.searchLoading;
   try{
    pending??=fetch('/search-index.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(x=>{if(!Array.isArray(x))throw Error();return x;});
    const index=await pending;if(id!==sequence||query.value.trim()!==term)return;
    for(const {entry} of searchEntries(index,term,lang)){
     const li=document.createElement('li'),a=document.createElement('a'),title=document.createElement('strong');
     a.href=entry.u;a.hreflang=lang;title.textContent=entry.t;a.append(title);
     if(entry.d){const d=document.createElement('span');d.textContent=entry.d.slice(0,120)+(entry.d.length>120?'…':'');a.append(d);}
     a.addEventListener('click',()=>emit('eco_discovery_result'));li.append(a);results.append(li);
    }
    status.textContent=results.children.length?t.searchFound.replace('{n}',results.children.length):t.searchEmpty;
   }catch{pending=undefined;if(id===sequence)status.textContent=t.searchError;}
  }
  toggle.addEventListener('click',e=>{e.preventDefault();root.open=!root.open;toggle.setAttribute('aria-expanded',String(root.open));if(root.open)query.focus();});
  root.addEventListener('toggle',()=>{toggle.setAttribute('aria-expanded',String(root.open));if(root.open){query.focus();emit('eco_discovery_open');}});
  form.addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);search();});
  query.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,150);});
  root.querySelectorAll('[data-eco-task]').forEach(a=>a.addEventListener('click',()=>emit('eco_discovery_task')));
  document.addEventListener('click',e=>{if(!root.contains(e.target))close(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.open)close(true);});
  form.hidden=false;status.textContent=t.searchHint;
 }
}
