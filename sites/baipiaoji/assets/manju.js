(() => {
  'use strict';
  const $=s=>document.querySelector(s),key='bpj-manju-saved-v1';
  const works=JSON.parse($('#mj-works')?.textContent||'[]'),workMap=new Map(works.map(x=>[x.id,x])),ids=new Set(workMap.keys());
  let saved=new Set(),storage=true;
  try{const data=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(data))saved=new Set(data.filter(x=>ids.has(x)));}catch{storage=false;}
  const qa=/[?&](?:__ci|__probe|qa)(?:=|&|$)/.test(location.search);
  const canTrack=()=>location.hostname==='baipiaoji.com'&&!qa&&!navigator.webdriver&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl;
  function event(action,id='catalog'){if(!canTrack())return;fetch('/api/hit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({e:'manju',p:'/manju/'+action+'/'+(ids.has(id)?id:'catalog'),l:'zh'}),keepalive:true}).catch(()=>{});window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'manju_'+action}}));}
  document.addEventListener('manju:action',e=>{if(['rank_sort','topic_complete','topic_empty','topic_export'].includes(e.detail))event(e.detail);});
  let timer;function toast(s){$('#mj-toast').textContent=s;clearTimeout(timer);timer=setTimeout(()=>{$('#mj-toast').textContent='';},6000);}
  function renderSaved(){document.querySelectorAll('[data-save]').forEach(b=>{const on=saved.has(b.dataset.save);b.setAttribute('aria-pressed',String(on));b.textContent=on?'✓ 已收藏':'＋ 收藏';});document.querySelectorAll('[data-save-count]').forEach(e=>e.textContent=saved.size);}
  function persist(next){try{localStorage.setItem(key,JSON.stringify([...next]));saved=next;storage=true;renderSaved();return true;}catch{storage=false;toast('浏览器未允许保存。请使用片单分享或导出，收藏没有写入。');return false;}}
  const rows=[...document.querySelectorAll('[data-item]')],params=new URLSearchParams(location.search),shared=(params.get('list')||'').split(',').filter(x=>ids.has(x));
  let sharedActive=params.has('list'),onlySaved=params.get('saved')==='1',currentPage=Math.max(1,Math.min(10000,Number.parseInt(params.get('page'),10)||1)),matches=[];const pageSize=24;
  const content=$('#mj-content');
  if(content&&['plot','preview'].includes(params.get('content')))content.value=params.get('content');
  const fields=['format','platform','link','evidence'].map(k=>$('#mj-'+k)),query=$('#mj-query');
  const channelButtons=[...document.querySelectorAll('[data-channel-choice]')],genreButtons=[...document.querySelectorAll('[data-genre-choice]')],tagButtons=[...document.querySelectorAll('[data-tag-choice]')];
  const oldGenres={'都市成长':'urban','悬疑冒险':'suspense','神话奇幻':'fantasy','科幻想象':'scifi','古风生活':'historical','诗词人文':'humanities'};
  let channel=params.get('channel')||(sharedActive||onlySaved||['genre','format','link','q','content'].some(k=>params.has(k))?'all':'stories'),genre=oldGenres[params.get('genre')]||params.get('genre')||'',tag=params.get('tag')||'';
  if(!['stories','culture','all'].includes(channel))channel='stories';
  if(!genreButtons.some(b=>b.dataset.genreChoice===genre))genre='';
  if(!tagButtons.some(b=>b.dataset.tagChoice===tag))tag='';
  if(query){fields.forEach(f=>{const v=params.get(f.id.slice(3));if([...f.options].some(o=>o.value===v))f.value=v;});query.value=(params.get('q')||'').slice(0,80);if(fields.some(f=>f.value))$('.mj-more').open=true;if(tag)$('.mj-plot').open=true;}
  function scope(r){return (!content?.value||(content.value==='plot'?r.dataset.hasPlot==='true':r.dataset.hasPreview==='true'))&&(channel==='all'||r.dataset.channel===channel)&&(!onlySaved||saved.has(r.dataset.item))&&(!sharedActive||shared.includes(r.dataset.item))&&fields.every(f=>!f.value||r.dataset[f.id.slice(3)]===f.value)&&r.dataset.search.includes(query.value.trim().toLowerCase());}
  function update(track=false,keepPage=false){
    if(!query)return;if(!keepPage)currentPage=1;
    matches=rows.filter(r=>scope(r)&&(!genre||r.dataset.category===genre)&&(!tag||r.dataset.tags.split(' ').includes(tag)));const n=matches.length,pages=Math.max(1,Math.ceil(n/pageSize));currentPage=Math.min(currentPage,pages);const pageRows=new Set(matches.slice((currentPage-1)*pageSize,currentPage*pageSize));for(const r of rows)r.hidden=!pageRows.has(r);
    $('#mj-pagination').hidden=pages===1;$('#mj-prev').disabled=currentPage===1;$('#mj-next').disabled=currentPage===pages;$('#mj-page-state').textContent='第 '+currentPage+' / '+pages+' 页 · 每页 '+pageSize+' 条';
    channelButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.channelChoice===channel)));
    for(const b of genreButtons){const v=b.dataset.genreChoice,count=rows.filter(r=>scope(r)&&(!v||r.dataset.category===v)).length;b.hidden=!!v&&count===0&&genre!==v;b.setAttribute('aria-pressed',String(genre===v));b.querySelector('[data-facet-count]').textContent=count;}
    for(const b of tagButtons){const v=b.dataset.tagChoice,count=rows.filter(r=>scope(r)&&(!genre||r.dataset.category===genre)&&(!v||r.dataset.tags.split(' ').includes(v))).length;b.hidden=!!v&&count===0&&tag!==v;b.setAttribute('aria-pressed',String(tag===v));b.querySelector('[data-facet-count]').textContent=count;}
    const channelName=channelButtons.find(b=>b.dataset.channelChoice===channel)?.querySelector('strong').textContent||'全部作品',genreName=genre?genreButtons.find(b=>b.dataset.genreChoice===genre)?.childNodes[0].textContent:'全部题材';
    $('#mj-result-heading').textContent=channelName+' · '+genreName+(tag?' · '+tag:'');
    $('#mj-result-note').textContent=channel==='culture'?'诗词与典籍等文化内容单独成区。按编辑收录顺序展示。':'按编辑收录顺序展示；题材、剧情标签与观看入口分别筛选。';
    $('#mj-count').textContent=n+' 条匹配记录（含分季）';$('#mj-empty').hidden=n>0;$('#mj-saved').setAttribute('aria-pressed',String(onlySaved));$('#mj-shared').hidden=!sharedActive;
    const u=new URL(location.href);if(!keepPage)u.hash='';currentPage>1?u.searchParams.set('page',currentPage):u.searchParams.delete('page');u.searchParams.delete('q');u.searchParams.set('channel',channel);for(const [k,v]of [['genre',genre],['tag',tag],['content',content?.value||''],...fields.map(f=>[f.id.slice(3),f.value])])v?u.searchParams.set(k,v):u.searchParams.delete(k);onlySaved?u.searchParams.set('saved','1'):u.searchParams.delete('saved');if(!sharedActive)u.searchParams.delete('list');history.replaceState(null,'',u);if(track)event(n?'filter':'empty');
  }
  function reset(){if(content)content.value='';$('#mj-share-note').textContent='收藏存在当前浏览器。分享会生成含公开作品编号的链接；不会带上你的搜索原文。';$('.mj-plot').open=false;$('.mj-more').open=false;query.value='';fields.forEach(f=>f.value='');channel='stories';genre='';tag='';onlySaved=false;sharedActive=false;update();query.focus();}
  channelButtons.forEach(b=>b.addEventListener('click',()=>{channel=b.dataset.channelChoice;if(content)content.value='';$('.mj-plot').open=false;genre='';tag='';sharedActive=false;onlySaved=false;query.value='';fields.forEach(f=>f.value='');update(true);}));
  genreButtons.forEach(b=>b.addEventListener('click',()=>{genre=b.dataset.genreChoice;tag='';$('.mj-plot').open=!!genre;update(true);}));
  tagButtons.forEach(b=>b.addEventListener('click',()=>{tag=b.dataset.tagChoice;update(true);}));
  renderSaved();
  document.addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(b){const next=new Set(saved),id=b.dataset.save;if(!ids.has(id))return;next.has(id)?next.delete(id):next.add(id);if(persist(next)){event(next.has(id)?'save':'unsave',id);update(false,true);toast(next.has(id)?'已收藏到当前浏览器。':'已从本机片单移除。');}}const a=e.target.closest('[data-mj-action]');if(a)event(a.dataset.mjAction,a.dataset.mjId);});
  window.addEventListener('storage',e=>{if(e.key!==key)return;try{const data=JSON.parse(e.newValue||'[]');saved=new Set(Array.isArray(data)?data.filter(x=>ids.has(x)):[]);renderSaved();update();}catch{}});
  if(query){content?.addEventListener('change',()=>{channel='all';update(true);});fields.forEach(f=>f.addEventListener('change',()=>update(true)));query.addEventListener('input',()=>update());query.addEventListener('change',()=>event(rows.some(r=>!r.hidden)?'filter':'empty'));$('#mj-reset').addEventListener('click',reset);$('[data-reset]').addEventListener('click',reset);$('#mj-saved').addEventListener('click',()=>{onlySaved=!onlySaved;if(content)content.value='';sharedActive=false;channel='all';genre='';tag='';fields.forEach(f=>f.value='');query.value='';update(true);});$('#mj-clear').addEventListener('click',()=>{if(!saved.size)return toast('本机片单已经是空的。');if(confirm('清空当前浏览器的所有帧选收藏？')){if(persist(new Set())){update();toast('本机收藏已清空。');}}});
    $('#mj-share').addEventListener('click',async()=>{const visible=matches.map(r=>r.dataset.item);if(!visible.length)return toast('先选择至少一部作品，再分享片单。');if(visible.length>60)return toast('当前片单超过 60 部，请先缩小筛选范围；大量收藏可导出保留。');const u=new URL('/manju/',location.origin);u.searchParams.set('list',visible.join(','));try{await navigator.clipboard.writeText(u.href);toast('片单链接已复制，可粘贴分享。');}catch{$('#mj-share-note').textContent='请手动复制片单链接：'+u.href;}event('share');});
    $('#mj-export').addEventListener('click',()=>{if(!saved.size)return toast('先收藏一部作品，再导出。');const text='我的帧选片单\n\n'+rows.filter(r=>saved.has(r.dataset.item)).map(r=>r.querySelector('h2').textContent+'\n'+r.dataset.url).join('\n\n')+'\n\n收藏为本机数据；此文件不包含视频。';const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='我的帧选片单.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);event('export');toast('片单文本已生成。');});
    for(const [id,delta]of [['mj-prev',-1],['mj-next',1]])$('#'+id).addEventListener('click',()=>{currentPage+=delta;update(false,true);$('#mj-result-heading').scrollIntoView({block:'start'});});
    function revealHash(){const target=location.hash.slice(1),r=rows.find(x=>x.id===target);if(!r)return;if(content)content.value='';channel='all';genre='';tag='';sharedActive=false;onlySaved=false;query.value='';fields.forEach(f=>f.value='');currentPage=Math.floor(rows.indexOf(r)/pageSize)+1;update(false,true);requestAnimationFrame(()=>r.scrollIntoView({block:'start'}));}
    update(false,true);revealHash();window.addEventListener('hashchange',revealHash);
  }
  const form=$('#mj-inquiry');if(form){const kind=form.elements.kind,email=form.elements.email;const initial=params.get('kind');if(['submit','cooperate','correction'].includes(initial))kind.value=initial;const work=params.get('work');if(ids.has(work))form.elements.url.value=workMap.get(work).url;const change=()=>{email.required=kind.value==='cooperate';};change();kind.addEventListener('change',change);let started=false;form.addEventListener('focusin',()=>{if(!started){started=true;event('inquiry_start');}});
    form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('button[type=submit]'),status=$('#mj-form-status');button.disabled=true;status.textContent='正在提交，请稍候……';const data=Object.fromEntries(new FormData(form));data.consent=form.elements.consent.checked;try{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);let r;try{r=await fetch('/api/manju-inquiry'+(qa?'?qa=1':''),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:controller.signal});}finally{clearTimeout(timeout);}const result=await r.json();if(!r.ok||!result.ok)throw Error(result.code||'unavailable');status.textContent=result.code==='validated'?'测试校验通过，未保存为真实投稿。':result.code==='already'?'今天已收到相同作品与类型的请求，请勿重复提交。':'已收到，资料已进入私有审核队列。不会自动公开或创建订单。';if(result.code!=='validated')event('inquiry_ok');form.reset();change();}catch{status.textContent='提交未确认成功，请检查信息与网络后重试。原填写内容已保留。';event('inquiry_error');}finally{button.disabled=false;}});
  }
  if(!storage)toast('本地收藏暂时不可用，仍可浏览作品与分享片单。');
  // A bounded return action is not a unique-user or retention measurement.
  event('view',location.pathname.split('/').filter(Boolean).at(-1));
  if(saved.size)event('return');
})();
