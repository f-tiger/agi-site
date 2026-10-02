import {matchesTool,githubSearchURL} from './github-tools-core.mjs';
const root=document.querySelector('[data-github-tools]');
if(root){
 const zh=root.dataset.lang==='zh',data=JSON.parse(document.getElementById('github-tool-data').textContent),cards=[...root.querySelectorAll('[data-tool-id]')],byId=new Map(data.tools.map(t=>[t.id,t]));
 const form=root.querySelector('form'),query=root.querySelector('#github-query'),grid=root.querySelector('.gh-grid'),count=root.querySelector('#github-count'),empty=root.querySelector('#github-empty'),expand=root.querySelector('#github-expand'),status=root.querySelector('#github-status'),more=root.querySelector('#github-more');
 const fields=Object.fromEntries(['mode','platform','topic','kind','sort'].map(key=>[key,root.querySelector('#github-'+key)]));
 const params=new URLSearchParams(location.search);query.value=(params.get('q')||'').slice(0,160);
 for(const [key,field] of Object.entries(fields))if([...field.options].some(o=>o.value===params.get(key)))field.value=params.get(key);
 const canTrack=!navigator.webdriver&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl&&!/[?&](?:__ci|__probe|qa)(?:=|&|$)/.test(location.search)&&location.hostname==='baipiaoji.com';
 const event=(action,id='catalog')=>{if(canTrack)fetch('/api/hit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({e:'github_tools',p:'/github-tools/'+action+'/'+id,l:zh?'zh':'en'}),keepalive:true}).catch(()=>{});};
 const stateURL=()=>{const u=new URL(location.pathname,location.origin);if(query.value.trim())u.searchParams.set('q',query.value.trim());for(const [key,field] of Object.entries(fields))if(field.value)u.searchParams.set(key,field.value);return u;};
 const batch=18;let limit=batch,matched=[],timer;
 function update({track=false,reset=true,keepHash=false}={}){
  if(reset)limit=batch;
  const filters=Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,f.value]));
  const ordered=fields.sort.value==='stars'?cards.slice().sort((a,b)=>byId.get(b.dataset.toolId).github.stars-byId.get(a.dataset.toolId).github.stars):cards;
  matched=ordered.filter(card=>matchesTool(byId.get(card.dataset.toolId),query.value,filters));
  const visible=new Set(matched.slice(0,limit));
  for(const card of ordered){card.hidden=!visible.has(card);grid.append(card);}
  const total=matched.length,shown=visible.size;count.dataset.total=total;count.dataset.shown=shown;
  count.textContent=zh?`${total} / ${cards.length} 个项目 · 已显示 ${shown} 个`:`${total} of ${cards.length} projects · showing ${shown}`;
  more.hidden=shown>=total;more.textContent=zh?`再显示 ${Math.min(batch,total-shown)} 个项目`:`Show ${Math.min(batch,total-shown)} more projects`;
  empty.hidden=total>0;expand.href=githubSearchURL(query.value);
  root.querySelectorAll('[data-topic-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topicFilter===fields.topic.value)));
  const next=stateURL();for(const key of ['__probe','__ci','qa'])if(params.has(key))next.searchParams.set(key,params.get(key));history.replaceState(null,'',next.href+(keepHash?location.hash:''));
  clearTimeout(timer);if(track&&query.value.trim())timer=setTimeout(()=>event(total?'search-hit':'search-miss'),900);
 }
 function clearFilters(){query.value='';for(const field of Object.values(fields))field.value='';status.textContent='';}
 form.addEventListener('submit',e=>{e.preventDefault();update({track:true});});query.addEventListener('input',()=>update({track:true}));
 Object.values(fields).forEach(f=>f.addEventListener('change',()=>update({track:true})));
 root.querySelectorAll('[data-topic-filter]').forEach(b=>b.addEventListener('click',()=>{clearFilters();fields.topic.value=b.dataset.topicFilter;update();}));
 root.querySelectorAll('[data-task-query]').forEach(b=>b.addEventListener('click',()=>{clearFilters();query.value=b.dataset.taskQuery;update({track:true});query.focus();}));
 root.querySelector('#github-reset').addEventListener('click',()=>{clearFilters();update();query.focus();});
 more.addEventListener('click',()=>{const next=matched[limit];limit+=batch;update({reset:false,keepHash:true});if(next){next.querySelector('h2 a').focus({preventScroll:true});next.scrollIntoView({block:'start'});}});
 root.querySelector('#github-share').addEventListener('click',async()=>{const url=stateURL().href;try{await navigator.clipboard.writeText(url);status.textContent=zh?'已复制当前筛选链接。':'Filter link copied.';event('share');}catch{status.textContent=(zh?'请复制链接：':'Copy this link: ')+url;}});
 root.querySelectorAll('details[data-guide]').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)event('guide',d.dataset.guide);}));
 root.addEventListener('click',e=>{const a=e.target.closest('a[data-gh-event]');if(a)event(a.dataset.ghEvent,a.dataset.id||'catalog');});
 function showAnchor(){const id=location.hash.slice(1),card=cards.find(c=>c.id===id);if(!card)return;if(!matched.includes(card)){clearFilters();update({keepHash:true});}limit=Math.max(limit,Math.ceil((matched.indexOf(card)+1)/batch)*batch);update({reset:false,keepHash:true});card.querySelector('details').open=true;card.scrollIntoView({block:'start'});}
 update({keepHash:true});showAnchor();window.addEventListener('hashchange',showAnchor);event('view');
}
