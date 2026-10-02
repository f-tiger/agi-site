import {matchesTool,githubSearchURL} from './github-tools-core.mjs';
const root=document.querySelector('[data-github-tools]');
if(root){
 const zh=root.dataset.lang==='zh',data=JSON.parse(document.getElementById('github-tool-data').textContent),cards=[...root.querySelectorAll('[data-tool-id]')];
 const form=root.querySelector('form'),query=root.querySelector('#github-query'),mode=root.querySelector('#github-mode'),platform=root.querySelector('#github-platform'),sort=root.querySelector('#github-sort'),grid=root.querySelector('.gh-grid'),count=root.querySelector('#github-count'),empty=root.querySelector('#github-empty'),expand=root.querySelector('#github-expand'),status=root.querySelector('#github-status');
 const params=new URLSearchParams(location.search);query.value=(params.get('q')||'').slice(0,160);
 for(const [key,field] of [['mode',mode],['platform',platform],['sort',sort]])if([...field.options].some(o=>o.value===params.get(key)))field.value=params.get(key);
 const canTrack=!navigator.webdriver&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl&&!/[?&](?:__ci|__probe|qa)(?:=|&|$)/.test(location.search)&&location.hostname==='baipiaoji.com';
 const event=(action,id='catalog')=>{if(canTrack)fetch('/api/hit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({e:'github_tools',p:'/github-tools/'+action+'/'+id,l:zh?'zh':'en'}),keepalive:true}).catch(()=>{});};
 const stateURL=()=>{const u=new URL(location.pathname,location.origin);if(query.value.trim())u.searchParams.set('q',query.value.trim());for(const [k,f] of [['mode',mode],['platform',platform],['sort',sort]])if(f.value)u.searchParams.set(k,f.value);return u;};
 let timer;
 function update(track=false){
  let total=0;const byId=new Map(data.tools.map(t=>[t.id,t]));
  const ordered=sort.value==='stars'?cards.slice().sort((a,b)=>byId.get(b.dataset.toolId).github.stars-byId.get(a.dataset.toolId).github.stars):cards;
  for(const card of ordered){card.hidden=!matchesTool(byId.get(card.dataset.toolId),query.value,{mode:mode.value,platform:platform.value});if(!card.hidden)total++;grid.append(card);}
  count.textContent=zh?`${total} / ${cards.length} 个收录工具`:`${total} of ${cards.length} curated tools`;
  empty.hidden=total>0;expand.href=githubSearchURL(query.value);const next=stateURL();for(const key of ['__probe','__ci','qa'])if(params.has(key))next.searchParams.set(key,params.get(key));history.replaceState(null,'',next.href+location.hash);
  clearTimeout(timer);if(track&&query.value.trim())timer=setTimeout(()=>event(total?'search-hit':'search-miss'),900);
 }
 form.addEventListener('submit',e=>{e.preventDefault();update(true);});query.addEventListener('input',()=>update(true));
 [mode,platform,sort].forEach(f=>f.addEventListener('change',()=>update(true)));
 root.querySelectorAll('[data-task-query]').forEach(b=>b.addEventListener('click',()=>{query.value=b.dataset.taskQuery;mode.value='';platform.value='';update(true);query.focus();}));
 root.querySelector('#github-reset').addEventListener('click',()=>{query.value='';mode.value='';platform.value='';sort.value='';status.textContent='';update();query.focus();});
 root.querySelector('#github-share').addEventListener('click',async()=>{const url=stateURL().href;try{await navigator.clipboard.writeText(url);status.textContent=zh?'已复制当前筛选链接。':'Filter link copied.';event('share');}catch{status.textContent=(zh?'请复制链接：':'Copy this link: ')+url;}});
 root.querySelectorAll('details[data-guide]').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)event('guide',d.dataset.guide);}));
 root.addEventListener('click',e=>{const a=e.target.closest('a[data-gh-event]');if(a)event(a.dataset.ghEvent,a.dataset.id||'catalog');});
 function showAnchor(){const id=location.hash.slice(1),card=cards.find(c=>c.id===id);if(!card)return;if(card.hidden){query.value='';mode.value='';platform.value='';update();}card.querySelector('details').open=true;card.scrollIntoView({block:'start'});}
 update();showAnchor();window.addEventListener('hashchange',showAnchor);event('view');
}
