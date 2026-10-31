(() => {
 'use strict';
 const $=s=>document.querySelector(s),taskRoot=$('#kimi-task'),watchRoot=$('#watch-progress');
 const works=JSON.parse($('#mj-works')?.textContent||'[]'),ids=new Set(works.map(w=>w.id));
 const labels={want:'想看',watching:'在看',watched:'看完'};
 function track(name){
  try{if(location.hostname!=='baipiaoji.com'||/[?&](?:__ci|__probe|qa)(?:=|&|$)/.test(location.search)||navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl||localStorage.getItem('fleet_ga4_choice_v1')==='denied')return;}catch{return;}
  fetch('/api/hit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({e:'depth',p:'/depth/'+name,l:'zh'}),keepalive:true}).catch(()=>{});
  const forward=()=>window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'bpj_depth_'+name}}));
  const loader=document.querySelector('script[data-ga4-host="baipiaoji.com"][src^="/analytics-assets/consent.mjs?"]');
  if(loader)import(loader.src).then(forward).catch(()=>{});else forward();
 }
 function storage(key,valid){
  let raw=null,data=null,error='';
  function read(){try{raw=localStorage.getItem(key);data=raw===null?null:JSON.parse(raw);if(data!==null&&!valid(data))throw Error();error='';}catch{data=null;error='本机记录无法读取，未覆盖原内容。可在确认后删除记录重新开始。';}}
  read();return {get data(){return data;},get error(){return error;},read,
   save(next){if(error)throw Error(error);if(localStorage.getItem(key)!==raw)throw Error('另一个页面已更新记录，请刷新后重试。');localStorage.setItem(key,JSON.stringify(next));raw=JSON.stringify(next);data=next;},
   clear(){localStorage.removeItem(key);raw=null;data=null;error='';}
  };
 }
 function download(text,name){const u=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 const plans={
  read:{title:'读懂一份文档',note:'先核对原文，再决定能否采用 AI 的回答；扫描件可能需要识别，支持格式与大小以 Kimi 当前页面为准。',steps:['准备有权使用的资料，移除不必要的个人或客户信息','到 Kimi 提交资料，要求标注原文位置并列出不确定项','逐条对照原文检查关键数字、结论与引用'],prompt:'请先说明你能读取的资料范围。按“关键结论—原文位置—不确定项”整理。找不到依据时明确写无法确认，不补写事实。最后列出需要我核对的三项内容。'},
  compare:{title:'比较两份资料',note:'先确定比较标准；缺失的信息保留为未知，不让模型替你猜。',steps:['准备有权使用的两份资料，明确要比较的维度','到 Kimi 按同一维度列出差异和各自出处','回到两份原文核对差异，标记仍无法判断的部分'],prompt:'请按相同维度比较资料 A 与资料 B。每项列出 A 的依据、B 的依据、差异以及无法确认之处。不要把缺失信息当作零或不支持，不要替我补充未提供的事实。'},
  write:{title:'修改一段文字',note:'把读者、用途和限制说清楚；涉及事实和引用的部分仍需你核对。',steps:['准备有权修改的文字，确定读者、用途与长度','到 Kimi 请求修改稿和修改理由，要求保留事实边界','逐段核对事实、语气和遗漏，再决定是否采用'],prompt:'请先询问这段文字的读者、用途与长度限制，再提供修改稿和主要修改理由。保留原有事实，不增加未核实的数据、客户案例或引用；有歧义时标记出来让我确认。'}
 };
 if(taskRoot){
  const select=$('#depth-task'),feedback=$('#depth-feedback');let dirty=false;
  const state=storage('bpj-kimi-steps-v1',x=>x?.version===1&&Object.hasOwn(plans,x.task)&&Array.isArray(x.checked)&&x.checked.length===3&&x.checked.every(v=>typeof v==='boolean'));
  function render(task,checked=[false,false,false]){select.value=task;$('#depth-task-note').textContent=plans[task].note;$('#depth-prompt').textContent=plans[task].prompt;$('#depth-steps').replaceChildren();plans[task].steps.forEach((step,i)=>{const li=document.createElement('li'),label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.checked=checked[i];box.addEventListener('change',()=>{dirty=true;feedback.textContent='步骤已修改，点击保存后下次可继续。';});label.append(box,document.createTextNode(step));li.append(label);$('#depth-steps').append(li);});dirty=false;}
  render(state.data?.task||'read',state.data?.checked);
  feedback.textContent=state.error||(state.data?'已恢复上次保存的步骤。':'先选择任务，再按实际情况勾选步骤。');
  $('#depth-account').hidden=!state.data;
  select.addEventListener('change',()=>{const previous=$('#depth-prompt').textContent;if(dirty&&!confirm('尚有未保存的步骤。切换任务并放弃这些修改？')){select.value=Object.keys(plans).find(k=>plans[k].prompt===previous);return;}render(select.value);dirty=true;feedback.textContent='已切换任务，保存后替换本机步骤。';track('plan_select');});
  $('#depth-save').addEventListener('click',()=>{try{state.save({version:1,task:select.value,checked:[...$('#depth-steps').querySelectorAll('input')].map(x=>x.checked)});dirty=false;feedback.textContent='已保存到当前浏览器，下次打开本页可继续。';$('#depth-account').hidden=false;track('plan_save');}catch{feedback.textContent=state.error||'保存失败或记录已被另一页面修改。原记录未覆盖，请刷新后重试。';}});
  $('#depth-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(plans[select.value].prompt);feedback.textContent='提问模板已复制。请到 Kimi 执行，随后核对结果。';track('plan_copy');}catch{feedback.textContent='未能复制，可展开模板手动选择文字。';}});
  $('#depth-export').addEventListener('click',()=>{const plan=plans[select.value],checked=[...$('#depth-steps').querySelectorAll('input')].map(x=>x.checked);download(plan.title+'\n自查步骤；不代表系统验证了任务完成。\n\n'+plan.steps.map((s,i)=>(checked[i]?'[已自行核对] ':'[待处理] ')+s).join('\n')+'\n\n提问模板：\n'+plan.prompt+'\n\n继续：https://baipiaoji.com/tools/kimi\n额度与条件以该页列明的官方来源为准。','kimi-task-steps.txt');feedback.textContent='已发起步骤清单下载，请在浏览器确认文件。';track('plan_export');});
  $('#depth-clear').addEventListener('click',()=>{if(!confirm('删除当前浏览器保存的 Kimi 步骤？账户工具清单不受影响。'))return;try{state.clear();render('read');feedback.textContent='本机步骤已删除。';$('#depth-account').hidden=true;}catch{feedback.textContent='未能删除，请在浏览器设置中管理站点数据。';}});
 }
 if(works.length){
  const valid=x=>x?.version===1&&x.entries&&typeof x.entries==='object'&&!Array.isArray(x.entries)&&Object.keys(x.entries).length<=2000&&Object.entries(x.entries).every(([id,v])=>/^[a-z0-9-]{1,100}$/.test(id)&&Object.hasOwn(labels,v));
  const state=storage('bpj-manju-progress-v1',valid);let entries={...(state.data?.entries||{})};
  const message=text=>{const target=$('#depth-watch-feedback')||$('#mj-toast');if(target)target.textContent=text;};
  function control(id){const wrap=document.createElement('label');wrap.className='depth-watch-control';wrap.append(document.createTextNode('观看记录 '));const sel=document.createElement('select');sel.dataset.depthId=id;sel.setAttribute('aria-label',(works.find(w=>w.id===id)?.title||'作品')+'的观看记录');sel.append(new Option('未记录',''),...Object.entries(labels).map(([k,v])=>new Option(v,k)));sel.value=entries[id]||'';sel.addEventListener('change',()=>{try{const next={...entries};if(sel.value)next[id]=sel.value;else delete next[id];state.save({version:1,entries:next});entries=next;track('watch_save');render();message('观看记录已保存在本机；收藏片单不变。');}catch{sel.value=entries[id]||'';message(state.error||'保存失败或记录已在别页更新，请刷新重试。');}});wrap.append(sel);return wrap;}
  const placed=new Set();document.querySelectorAll('[data-save], [data-depth-work]').forEach(el=>{const id=el.dataset.save||el.dataset.depthWork;if(!ids.has(id))return;const parent=el.parentElement;if(placed.has(parent))return;placed.add(parent);parent.append(control(id));});
  function render(){document.querySelectorAll('select[data-depth-id]').forEach(s=>s.value=entries[s.dataset.depthId]||'');if(!watchRoot)return;const list=$('#depth-watch-list'),filter=$('#depth-watch-filter').value;list.replaceChildren();const selected=works.filter(w=>entries[w.id]&&(!filter||filter==='all'||entries[w.id]===filter));
   for(const w of selected){const row=document.createElement('div');row.className='depth-watch-row';const a=document.createElement('a');const u=new URL(w.url,location.origin);if(u.origin!==location.origin||!u.pathname.startsWith('/manju/'))continue;a.href=u.pathname+u.hash;a.textContent=w.title+' · 打开资料与观看入口';a.addEventListener('click',()=>track('watch_resume'));row.append(a,control(w.id));list.append(row);}
   if(!selected.length)list.textContent=state.error||'还没有这类记录。在作品旁选择观看状态，或到找剧页挑选一部。';
   $('#depth-watch-export').disabled=!works.some(w=>entries[w.id]);
  }
  if(watchRoot){$('#depth-watch-filter').addEventListener('change',render);$('#depth-watch-export').addEventListener('click',()=>{download('我的观看记录（本人标记，非播放证明）\n仅本机保存，不自动追更。\n\n'+works.filter(w=>entries[w.id]).map(w=>labels[entries[w.id]]+' · '+w.title+'\n'+w.url).join('\n\n'),'framepick-watchlist.txt');track('watch_export');message('已发起下载，请在浏览器确认。导出包含全部当前可识别记录。');});$('#depth-watch-clear').addEventListener('click',()=>{if(!confirm('清空本机所有观看记录？原收藏片单保留。'))return;try{state.clear();entries={};render();message('观看记录已清空，原收藏片单未修改。');}catch{message('未能清空，请在浏览器设置中管理站点数据。');}});}
  window.addEventListener('storage',e=>{if(e.key!=='bpj-manju-progress-v1')return;state.read();entries={...(state.data?.entries||{})};render();message(state.error||'已更新另一个页面保存的观看记录。');});render();if(state.error)message(state.error);
 }
})();
