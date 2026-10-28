(() => {
 const input=document.querySelector('#mj-query'),form=document.querySelector('#mj-search-form'),box=document.querySelector('#mj-search-results');if(!input||!form||!box)return;
 const status=document.querySelector('#mj-search-status'),list=document.querySelector('#mj-search-list'),retry=document.querySelector('#mj-search-retry'),works=JSON.parse(document.querySelector('#mj-works')?.textContent||'[]'),S=globalThis.ManjuSearch;
 let timer,revision=0,controller,lastQuery='',composing=false,phase='idle',cooldownUntil=0;
 // Tab-memory only: never persist search text or send it to analytics.
 const recent=new Map(),queryKey=q=>q.trim().toLocaleLowerCase();
 function cooldown(){const seconds=Math.ceil((cooldownUntil-Date.now())/1000);if(seconds<=0)return false;phase='cooldown';status.textContent='查询较频繁，请在 '+seconds+' 秒后重试；已有推荐仍可浏览。';retry.hidden=false;return true;}
 function showRemote(data){const records=Array.isArray(data.records)?data.records:[];phase='done';retry.hidden=true;if(records.length){status.textContent='新找到 '+records.length+' 条来源资料'+(data.cached?'（近期缓存）':'')+'，可立即查看；符合目录标准的条目将在每日同步后入库。';for(const r of records){if(!/^https:\/\/www\.duanjubaike\.net\/manju\/info-\d+\.html$/.test(r.source))continue;add({title:r.title,url:r.source},'第三方目录资料 · '+(r.reportedTags||[]).join(' / ')+' · '+r.checkedAt+' 核查；非官方播放入口',true);}}else status.textContent='已查询公开来源，暂未找到可核验资料。可换用完整剧名，或浏览下方相关题材推荐。';}
 let searchStarted=false,lastSuggestionQuery='',lastOutcome='',outcomeTimer;
 const track=action=>document.dispatchEvent(new CustomEvent('manju:action',{detail:action}));
 function outcome(kind,q,immediate=false){const key=kind+':'+S.norm(q);const send=()=>{if(composing||input.value.trim()!==q||key===lastOutcome)return;if(!searchStarted){searchStarted=true;track('search_start');}lastOutcome=key;track(kind);};if(immediate)send();else outcomeTimer=setTimeout(send,500);}
 function add(work,reason,external=false){const a=document.createElement('a');a.href=work.url;const name=document.createElement('strong'),why=document.createElement('small');name.textContent=work.title;why.textContent=reason;a.append(name,why);if(external){a.target='_blank';a.rel='noopener noreferrer';a.dataset.mjAction='source';a.dataset.mjId='catalog';}if(!external){a.dataset.mjAction='recommend_select';a.dataset.mjId=work.id||'catalog';}list.append(a);}
 function recommend(q,hits){const similar=hits.length?S.related(hits[0],works).filter(x=>!hits.some(h=>h.id===x.id)).slice(0,4):S.suggestions(works,q);for(const x of similar)add(x,'推荐 · '+x.reason);}
 async function remote(q,ticket,attempt=0){
  if(ticket!==revision||phase==='fetching')return;
  const key=queryKey(q),saved=recent.get(key);
  if(saved&&saved.until>Date.now()){showRemote(saved.data);return;}
  if(cooldown())return;
  phase='fetching';status.textContent='本站暂未匹配，正在查询公开资料来源……';retry.hidden=true;
  const requestController=new AbortController();controller=requestController;
  const timeout=setTimeout(()=>requestController.abort(),45000);
  try{
   if(!attempt)track('discover_start');
   const response=await fetch('/api/manju-discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:q.trim()}),signal:requestController.signal}),data=await response.json();
   if(ticket!==revision)return;
   if(data.status==='pending'){phase='pending';if(attempt<3){status.textContent='相同关键词正在查询，稍后自动取回结果……';timer=setTimeout(()=>remote(q,ticket,attempt+1),3000);return;}phase='retry';status.textContent='查询仍在进行，可稍后重试。';retry.hidden=false;return;}
   if(!response.ok){phase='retry';track(data.status==='rate_limited'?'discover_limited':'discover_error');if(data.status==='rate_limited'){const seconds=Number(data.retryAfter);cooldownUntil=Date.now()+1000*(Number.isFinite(seconds)&&seconds>0?Math.min(seconds,3600):600);cooldown();return;}status.textContent=data.status==='invalid'?'请输入 2—60 字的剧名或题材，请勿填写网址、联系方式或私人信息。':'资料来源暂时不可用，不能据此判断作品不存在。';retry.hidden=data.status==='invalid';return;}
   const records=Array.isArray(data.records)?data.records:[];
   if(data.cached)track('discover_cached');track(records.length?'discover_found':'discover_empty');
   // Small bounded cache. Reusing a result is not another discovery outcome.
   recent.delete(key);recent.set(key,{until:Date.now()+15*60*1000,data});if(recent.size>20)recent.delete(recent.keys().next().value);
   showRemote(data);
  }catch{if(ticket===revision){phase='retry';track('discover_error');status.textContent='查询未完成，请稍后重试；已有目录仍可使用。';retry.hidden=false;}}
  finally{clearTimeout(timeout);if(controller===requestController)controller=null;}
 }
 function render(immediate=false){
  if(composing)return;const q=input.value.trim();
  // Enter/click during an automatic lookup must not abort and spend another quota.
  if(phase==='done'&&!(recent.get(queryKey(q))?.until>Date.now()))phase='idle';
  if(q&&q===lastQuery&&['queued','fetching','pending','done','cooldown'].includes(phase)){
   if(phase==='queued'&&immediate){clearTimeout(timer);void remote(q,revision);}
   else if(phase==='cooldown'&&immediate){if(!cooldown())void remote(q,revision);}
   return;
  }
  const ticket=++revision;lastQuery=q;clearTimeout(timer);clearTimeout(outcomeTimer);controller?.abort();phase='idle';retry.hidden=true;list.replaceChildren();
  if(!q){box.hidden=true;lastOutcome='';lastSuggestionQuery='';return;}
  box.hidden=false;const hits=works.map(w=>({...w,match:S.score(w,q)})).filter(w=>w.match>0).sort((a,b)=>b.match-a.match);recommend(q,hits);
  if(hits.length){outcome('search_results',q,immediate);status.textContent='找到 '+hits.length+' 条作品，封面列表已更新。'+(list.children.length?'你也可能喜欢：':'');return;}
  status.textContent='本站暂无匹配，正在准备查询公开资料……';
  if(q.length<2||q.length>60||! /^[\p{L}\p{N}\s《》：:，,。.!！?？、·（）()—-]+$/u.test(q)){status.textContent='请输入剧名或题材；请勿填写网址、联系方式或私人信息。';return;}
  outcome('search_empty',q,immediate);phase='queued';timer=setTimeout(()=>remote(q,ticket),immediate?0:1200);
 }
 // Input suggestions stay local. Selecting a suggestion reuses the full search flow.
 const suggest=document.createElement('div');suggest.id='mj-autocomplete';suggest.className='mj-autocomplete';suggest.hidden=true;suggest.setAttribute('role','listbox');suggest.setAttribute('aria-label','搜索联想');form.append(suggest);
 const announcement=document.createElement('span');announcement.className='mj-sr-only';announcement.setAttribute('role','status');form.append(announcement);
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',suggest.id);input.setAttribute('aria-expanded','false');input.setAttribute('aria-haspopup','listbox');
 let choices=[],active=-1,suggestionTimer;
 function closeSuggestions(){clearTimeout(suggestionTimer);suggest.hidden=true;active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
 function pick(index){const choice=choices[index];if(!choice)return;track('suggest_select');input.value=choice.value;input.dispatchEvent(new Event('input',{bubbles:true}));closeSuggestions();form.requestSubmit();input.focus();closeSuggestions();}
 function highlight(index){active=index;const options=[...suggest.children];options.forEach((e,i)=>e.setAttribute('aria-selected',String(i===index)));if(index>=0){input.setAttribute('aria-activedescendant',options[index].id);options[index].scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');}
 function complete(){clearTimeout(suggestionTimer);if(composing||document.activeElement!==input||!input.value.trim())return closeSuggestions();if(!searchStarted){searchStarted=true;track('search_start');}const q=input.value.trim(),heat=w=>Math.min(w.aiRank<0?1e9:w.aiRank,w.comicRank<0?1e9:w.comicRank),hits=works.map(w=>({...w,match:S.score(w,q)})).filter(w=>w.match>0).sort((a,b)=>b.match-a.match||heat(a)-heat(b));choices=[];
  const titles=hits.slice(0,q?4:3);for(const w of titles)choices.push({value:w.title,label:w.title,kind:q?'剧名':'热榜作品',note:[w.genre,...(w.tags||[]).slice(0,2)].filter(Boolean).join(' / ')});
  const topics=[...new Set(works.flatMap(w=>[w.genre,...(w.tags||[])]))].filter(t=>t&&t!=='待分类'&&t!=='其他'&&(q?S.score({title:t,genre:t,tags:[t],search:'AI漫剧 '+t},q)>0:['重生','逆袭','甜宠'].includes(t))).slice(0,2);
  for(const t of topics)choices.push({value:t,label:t,kind:'题材',note:'按题材查看作品与推荐'});
  const related=hits.length?S.related(hits[0],works):S.suggestions(works,q);for(const w of related.filter(w=>!titles.some(t=>t.id===w.id)).slice(0,2))choices.push({value:w.title,label:w.title,kind:'相似推荐',note:w.reason});
  if(q&&!hits.length)choices.push({value:q,label:'搜索“'+q+'”',kind:'继续找',note:'查询完整目录，未命中时补查公开资料'});
  suggest.replaceChildren();active=-1;input.removeAttribute('aria-activedescendant');for(const [i,c] of choices.entries()){const row=document.createElement('div');row.id='mj-suggestion-'+i;row.setAttribute('role','option');row.setAttribute('aria-selected','false');row.dataset.suggestion=String(i);const kind=document.createElement('span'),body=document.createElement('span'),title=document.createElement('strong'),note=document.createElement('small');kind.className='mj-suggestion-kind';kind.textContent=c.kind;title.textContent=c.label;note.textContent=c.note;body.append(title,note);row.append(kind,body);suggest.append(row);}suggest.hidden=!choices.length;input.setAttribute('aria-expanded',String(!!choices.length));if(choices.length&&lastSuggestionQuery!==S.norm(q)){lastSuggestionQuery=S.norm(q);track('suggest_view');}announcement.textContent=choices.length?'有 '+choices.length+' 条联想，可用上下方向键选择。':'';
 }
 input.addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer);clearTimeout(outcomeTimer);controller?.abort();phase='idle';revision++;closeSuggestions();},true);
 input.addEventListener('compositionend',()=>{composing=false;render();complete();});
 input.addEventListener('input',()=>{closeSuggestions();if(!composing)suggestionTimer=setTimeout(complete,90);});input.addEventListener('focus',complete);input.addEventListener('blur',closeSuggestions);
 input.addEventListener('keydown',e=>{if(composing||e.isComposing||e.keyCode===229)return;if(e.key==='Escape'){e.preventDefault();closeSuggestions();return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(suggest.hidden)complete();if(!choices.length)return;highlight(e.key==='ArrowDown'?(active+1)%choices.length:(active<=0?choices.length-1:active-1));}else if(e.key==='Enter'&&!suggest.hidden&&active>=0){e.preventDefault();pick(active);}});
 suggest.addEventListener('pointerdown',e=>{const row=e.target.closest('[data-suggestion]');if(row)e.preventDefault();});suggest.addEventListener('click',e=>{const row=e.target.closest('[data-suggestion]');if(row)pick(Number(row.dataset.suggestion));});
 form.addEventListener('submit',closeSuggestions);document.addEventListener('manju:catalog-change',()=>{if(!input.value.trim()||document.activeElement!==input)closeSuggestions();});
 document.addEventListener('manju:catalog-change',()=>{if(input.value.trim()!==lastQuery)render();});input.addEventListener('input',()=>{if(input.value.trim()!==lastQuery)render();});form.addEventListener('submit',e=>{e.preventDefault();if(composing)return;if(input.value.trim()){if(!searchStarted){searchStarted=true;track('search_start');}track('search_submit');}render(true);});retry.addEventListener('click',()=>{if(['fetching','pending'].includes(phase)||cooldown())return;clearTimeout(timer);phase='idle';void remote(lastQuery,++revision);});document.querySelectorAll('[data-mj-query]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.mjQuery;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}));
 if(input.value)render();
})();
