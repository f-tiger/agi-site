(() => {
 const root=document.querySelector('[data-access]');if(!root)return;
 const zh=root.lang==='zh',rows=[...root.querySelectorAll('.access-row')],query=root.querySelector('#access-query'),fields=['tool','type','status'].map(k=>root.querySelector('#access-'+k));
 const selectionCopy=root.querySelector('#access-selection-copy'),selectionStatus=root.querySelector('#access-selection-status'),selectionFallback=root.querySelector('#access-selection-fallback'),selectionText=root.querySelector('#access-selection-text');
 const normalize=value=>value.normalize('NFKC').toLowerCase().replace(/[-\u2010-\u2015]/g,' ').replace(/\s+/g,' ').trim();
 let copying=false;
 const params=new URLSearchParams(location.search);query.value=(params.get('q')||'').slice(0,100);fields.forEach(f=>{const v=params.get(f.id.slice(7));if([...f.options].some(o=>o.value===v))f.value=v;});
 const canTrack=()=>location.hostname==='baipiaoji.com'&&!navigator.webdriver&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl&&!/[?&](?:__ci|__probe|qa)(?:=|&|$)/.test(location.search);
 const ga={open:'click_tool',source:'click_tool',filter:'select_category',miss:'search_no_results',checklist:'complete_step',copy:'complete_step',submit:'start_plan',vendor:'start_plan'};
 function event(action,id='catalog') {if(!canTrack())return;fetch('/api/hit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({e:'coding_access',p:'/coding-access/'+action+'/'+id,l:zh?'zh':'en'}),keepalive:true}).catch(()=>{});if(ga[action])window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'legacy:'+ga[action]}}));}
 function filterValues(){return [['q',query.value.trim()],...fields.map(f=>[f.id.slice(7),f.value])];}
 function update(track=false){let n=0;const [tool,type,status]=fields.map(f=>f.value),search=normalize(query.value);for(const row of rows){const match=(!tool||row.dataset.tools.split(' ').includes(tool))&&(!type||row.dataset.type===type)&&(!status||row.dataset.status===status)&&normalize(row.dataset.search).includes(search);row.hidden=!match;if(match)n++;}root.querySelector('#access-count').textContent=zh?`${n} / ${rows.length} 个入口`:`${n} of ${rows.length} entries`;root.querySelector('#access-empty').hidden=n>0;selectionCopy.disabled=!n||copying;selectionStatus.textContent=n?'':(zh?'没有可复制的候选，请调整筛选。':'No candidates to copy. Change the filters.');selectionFallback.hidden=true;selectionText.value='';const u=new URL(location.href);for(const [key,value] of filterValues()){if(value)u.searchParams.set(key,value);else u.searchParams.delete(key);}history.replaceState(null,'',u);if(track)event(n?'filter':'miss');}
 fields.forEach(f=>f.addEventListener('change',()=>update(true)));query.addEventListener('input',()=>update());query.addEventListener('change',()=>event(rows.some(r=>!r.hidden)?'filter':'miss'));
 root.querySelector('#access-reset').addEventListener('click',()=>{query.value='';fields.forEach(f=>f.value='');update();query.focus();});
 function anchor(){const row=rows.find(r=>'#'+r.id===location.hash);if(row){if(row.hidden){query.value='';fields.forEach(f=>f.value='');update();}row.scrollIntoView({block:'center'});}}
 root.addEventListener('click',e=>{const a=e.target.closest('[data-access-action]');if(a)event(a.dataset.accessAction,a.dataset.accessId);});
 const checks=[...root.querySelectorAll('[data-check]')];let complete=false;
 const checklist=()=>(zh?'购买前检查清单（自查，不是认证）':'Purchase checklist (self-review, not certification)')+'\n'+checks.map(c=>(c.checked?'[x] ':'[ ] ')+c.parentElement.textContent.trim()).join('\n');
 checks.forEach(c=>c.addEventListener('change',()=>{const all=checks.every(x=>x.checked);if(all&&!complete)event('checklist');complete=all;}));
 root.querySelector('#access-copy').addEventListener('click',async()=>{const text=checklist(),out=root.querySelector('#access-copy-status');try{await navigator.clipboard.writeText(text);out.textContent=zh?'已复制检查清单。':'Checklist copied.';event('copy');}catch{out.textContent=(zh?'请手动复制：\n':'Copy manually:\n')+text;}});
 selectionCopy.addEventListener('click',async()=>{
  const visible=rows.filter(row=>!row.hidden);if(!visible.length||copying)return;
  const url=new URL(root.dataset.accessUrl);for(const [key,value] of filterValues())if(value)url.searchParams.set(key,value);
  const filters=fields.map(f=>f.parentElement.firstChild.textContent.trim()+': '+f.selectedOptions[0].textContent).concat((zh?'搜索词':'Search')+': '+(query.value.trim()||(zh?'无':'None'))).join(' · ');
  const text=[zh?'BPJ 选型清单（当前筛选候选）':'BPJ selection checklist (current candidates)',url.href,filters,zh?'待核验候选不构成购买推荐。已读公开文档不代表购买、退款、安装、稳定性或模型真伪实测；工具标签仅供导航。':'Pending candidates are not purchase recommendations. Public docs reviewed does not mean payment, refunds, installation, reliability or model identity were tested; tool tags are navigation hints.',...visible.map(row=>[
   row.querySelector('h2').textContent,
   row.querySelector('.access-brand p').textContent+' · '+row.querySelector('.access-state').textContent,
   row.querySelector('.access-facts>p').textContent,
   ...[...row.querySelectorAll('dt')].map(dt=>dt.textContent+': '+dt.nextElementSibling.textContent),
   (zh?'来源':'Source')+': '+row.querySelector('[data-access-action="source"]').href,
   ...[...row.querySelectorAll('.access-actions small')].map(el=>el.textContent)
  ].join('\n')),checklist()].join('\n\n');
  copying=true;selectionCopy.disabled=true;selectionFallback.hidden=true;selectionStatus.textContent='';
  try{await navigator.clipboard.writeText(text);selectionStatus.textContent=zh?`已复制 ${visible.length} 个候选与自查进度。`:`Copied ${visible.length} candidates and checklist progress.`;event('copy','selection');}
  catch{selectionStatus.textContent=zh?'自动复制失败，请使用下方文本手动复制。':'Automatic copy failed. Select and copy the text below.';selectionText.value=text;selectionFallback.hidden=false;selectionText.focus();selectionText.select();}
  finally{copying=false;selectionCopy.disabled=!rows.some(row=>!row.hidden);}
 });
 update();anchor();window.addEventListener('hashchange',anchor);
})();
