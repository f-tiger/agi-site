// Serialized into bpj.js; intentionally self-contained.
export function installSearch(searchResults, ZH) {
 const cache=new Map();
 function load(url){if(!cache.has(url))cache.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('index');return r.json()}).catch(e=>{cache.delete(url);throw e}));return cache.get(url)}
 document.querySelectorAll('.gs').forEach((g,index)=>{
  const input=g.querySelector('input'),drop=g.querySelector('.gs-drop');if(!input||!drop)return;
  let timer,measurement,revision=0,active=-1,composing=false,kind='suggestion';
  const id='bpj-search-options-'+index;
  drop.id=id;drop.setAttribute('role','listbox');drop.setAttribute('aria-label',ZH?'搜索推荐与结果':'Search suggestions and results');
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',id);input.setAttribute('aria-expanded','false');
  const live=document.createElement('span');live.className='gs-status';live.setAttribute('role','status');g.append(live);
  const privatePage=/^\/(?:en\/)?(?:account|members)(?:\.html|\/|$)/.test(location.pathname);
  const suppressed=()=>privatePage||navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl||/[?&](?:__ci|__probe|qa)(?:=|&|$)/.test(location.search);
  function track(action,destination=''){if(suppressed())return;window.bpjEv?.(action.endsWith('select')?'gs_go':'gs','/search-ui/'+(g.dataset.tag?'agents':'site')+'/'+action+destination);window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'search_'+action}}))}
  function close(){revision++;clearTimeout(timer);clearTimeout(measurement);drop.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1}
  function highlight(n){const options=[...drop.querySelectorAll('[role=option]')];if(!options.length)return;active=(n+options.length)%options.length;options.forEach((a,i)=>a.setAttribute('aria-selected',String(i===active)));input.setAttribute('aria-activedescendant',options[active].id);options[active].scrollIntoView({block:'nearest'})}
  async function render(){
   const ticket=++revision,query=input.value.trim().toLowerCase();clearTimeout(measurement);active=-1;input.removeAttribute('aria-activedescendant');drop.textContent='';drop.hidden=false;input.setAttribute('aria-expanded','true');live.textContent=ZH?'正在搜索':'Searching';
   try{
    const rows=await load(g.dataset.idx);if(ticket!==revision||document.activeElement!==input)return;
    kind=query?'result':'suggestion';
    // Editorial shortcuts, not measured popularity or personal search history.
    const terms=g.dataset.tag?['claude','cursor','mcp']:['grok','kimi','pdf','image','github','coding'];
    const seen=new Set();const hits=query?searchResults(rows,query):terms.flatMap(t=>searchResults(rows,t,1)).filter(h=>!seen.has(h.u)&&seen.add(h.u));
    drop.textContent='';const title=document.createElement('p');title.className='gs-heading';title.textContent=query?(ZH?'匹配结果':'Matching results'):(ZH?'推荐入口 · 输入可搜全站':'Suggested shortcuts · type to search');drop.append(title);
    if(!hits.length){const p=document.createElement('p');p.className='gs-none';p.textContent=ZH?'没有匹配结果，试试工具名或用途，如 PDF、图片。':'No matches. Try a tool name or task, such as PDF or image.';drop.append(p)}
    hits.forEach((hit,i)=>{const url=new URL(hit.u,location.origin);if(url.origin!==location.origin)return;const a=document.createElement('a');a.href=url.href;a.id=id+'-'+i;a.setAttribute('role','option');a.setAttribute('aria-selected','false');a.tabIndex=-1;const b=document.createElement('b');b.textContent=hit.n;const label=document.createElement('span');label.textContent=hit.k;a.append(b,label);a.addEventListener('click',()=>{track(kind+'_select',url.pathname+url.hash);close()});drop.append(a)});
    live.textContent=hits.length+(ZH?' 个可选结果':' results available');measurement=setTimeout(()=>{if(ticket===revision&&!drop.hidden)track(query?(hits.length?'results':'empty'):'suggestions')},query?700:0);
   }catch{if(ticket!==revision)return;drop.textContent=ZH?'搜索暂时不可用，请重新输入重试。':'Search unavailable. Type again to retry.';live.textContent=drop.textContent;track('error')}
  }
  input.addEventListener('focus',render);
  input.addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer);close()});input.addEventListener('compositionend',()=>{composing=false;render()});
  input.addEventListener('input',()=>{clearTimeout(timer);close();if(!composing)timer=setTimeout(render,120)});
  input.addEventListener('keydown',e=>{if(e.isComposing||composing)return;if(e.key==='Escape'||e.key==='Tab'){if(e.key==='Escape')e.preventDefault();close();return}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(drop.hidden){render();return}highlight(active+(e.key==='ArrowDown'?1:-1))}if(e.key==='Enter'&&!drop.hidden){const a=drop.querySelectorAll('[role=option]')[Math.max(0,active)];if(a){e.preventDefault();a.click()}}});
  g.addEventListener('focusout',e=>{if(!g.contains(e.relatedTarget))setTimeout(()=>{if(!g.contains(document.activeElement))close()},150)});document.addEventListener('click',e=>{if(!g.contains(e.target))close()});
  if(g.closest('.bpj-home-copy')){const q=new URLSearchParams(location.search).get('q');if(q){input.value=q.slice(0,200);input.focus()}}
 });
}
