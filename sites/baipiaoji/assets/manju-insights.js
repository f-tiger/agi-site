(() => {
 'use strict';
 const $=s=>document.querySelector(s),track=action=>document.dispatchEvent(new CustomEvent('manju:action',{detail:action}));
 const rank=$('#mj-rank-cohort');
 if(rank){
  const query=$('#mj-rank-query'),order=$('#mj-rank-order'),sections=[...document.querySelectorAll('[data-rank-cohort]')],params=new URLSearchParams(location.search);
  if([...rank.options].some(x=>x.value===params.get('cohort')))rank.value=params.get('cohort');
  if(['source','asc','desc'].includes(params.get('order')))order.value=params.get('order');
  const anchor=/^#rank-[a-z0-9-]{1,100}$/.test(location.hash)?document.getElementById(location.hash.slice(1)):null;if(anchor?.closest('[data-rank-cohort]'))rank.value=anchor.closest('[data-rank-cohort]').dataset.rankCohort;
  function update(measured=false){let count=0;for(const section of sections){section.hidden=rank.value!=='all'&&rank.value!==section.dataset.rankCohort;const body=section.querySelector('tbody'),rows=[...body.rows];rows.sort((a,b)=>order.value==='source'?Number(a.dataset.rankPosition)-Number(b.dataset.rankPosition):(Number(b.dataset.rankValue)-Number(a.dataset.rankValue))*(order.value==='asc'?-1:1));for(const row of rows){body.append(row);row.hidden=!row.dataset.rankTitle.includes(query.value.trim().toLowerCase());if(!section.hidden&&!row.hidden)count++;}}$('#mj-rank-status').textContent=count+' 条匹配的榜单记录；每个榜单独立排序。';$('#mj-rank-empty').hidden=count>0;const u=new URL(location.href);u.searchParams.set('cohort',rank.value);u.searchParams.set('order',order.value);history.replaceState(null,'',u);if(measured)track('rank_sort');}
  rank.addEventListener('change',()=>update(true));order.addEventListener('change',()=>update(true));query.addEventListener('input',()=>update());update();if(anchor)requestAnimationFrame(()=>anchor.scrollIntoView({block:'center'}));
 }
 const form=$('#mj-topic-form');
 if(form){
  const data=JSON.parse($('#mj-topic-data').textContent),cards=[...document.querySelectorAll('[data-topic-id]')],platform=$('#mj-topic-platform'),production=$('#mj-topic-production'),audience=$('#mj-topic-audience'),button=$('#mj-topic-export'),status=$('#mj-topic-status');let selected=[],ready=false;
  const choice={all:'不限',douyin:'抖音',hongguo:'红果',interior:'少场景对白',outdoor:'山林与年代场景',characters:'多角色与表情',effects:'动作与特效',family:'生活与家庭',warm:'温暖与陪伴',adventure:'冒险与成长'};
  const params=new URLSearchParams(location.search),initial=data.topics.find(t=>t.id===params.get('topic'));if(initial){production.value=initial.production;audience.value=initial.audience;}
  for(const [key,el] of [['platform',platform],['production',production],['audience',audience]])if([...el.options].some(o=>o.value===params.get(key)))el.value=params.get(key);
  function invalidate(){ready=false;button.disabled=true;$('#mj-topic-export-status').textContent='';status.textContent='条件已修改，请重新生成选题参考。';}
  [platform,production,audience].forEach(el=>el.addEventListener('change',invalidate));
  function generate(measured){selected=data.topics.filter(t=>(platform.value==='all'||t.platforms.includes(platform.value))&&(production.value==='all'||t.production===production.value)&&(audience.value==='all'||t.audience===audience.value));for(const card of cards)card.hidden=!selected.some(t=>t.id===card.dataset.topicId);ready=selected.length>0;button.disabled=!ready;$('#mj-topic-empty').hidden=ready;status.textContent=selected.length+' 个方向符合当前条件。每个方向单独标注数据日期与平台，排序为编辑顺序。';$('#mj-topic-export-status').textContent='';const u=new URL(location.href);u.searchParams.delete('topic');for(const [k,el]of [['platform',platform],['production',production],['audience',audience]])u.searchParams.set(k,el.value);history.replaceState(null,'',u);if(measured)track(ready?'topic_complete':'topic_empty');}
  form.addEventListener('submit',e=>{e.preventDefault();generate(true);});$('#mj-topic-reset').addEventListener('click',()=>{platform.value=production.value=audience.value='all';generate(true);});
  button.addEventListener('click',()=>{if(!ready||!selected.length)return;const text='帧选选题参考\n\n条件：'+[platform,production,audience].map(x=>choice[x.value]).join(' / ')+'\n资料核对：'+data.reviewedAt+'\n'+data.notice+'\n\n'+selected.map(t=>t.title+'\n'+(data.reports.find(r=>r.id===t.reportId).kind==='official_snapshot'?'官方快照日期：':'历史统计截止：')+data.reports.find(r=>r.id===t.reportId).periodEnd+'\n来源：'+data.reports.find(r=>r.id===t.reportId).publisher+' '+data.reports.find(r=>r.id===t.reportId).url+'\n数据依据：'+t.evidence+'\n参考作品：'+t.examples.join('、')+'\n编辑判断：'+t.strength+'\n限制：'+t.tradeoff+'\n本站原创构思（未测试）：'+t.originalConcept+'\n开场参考：'+t.hook+'\n先验证：'+t.test+'\nhttps://baipiaoji.com/manju/topic-'+t.id).join('\n\n')+'\n\n各方向来源与日期见对应条目。'+'\nhttps://baipiaoji.com/manju/topics\n';try{const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='帧选选题参考.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#mj-topic-export-status').textContent='选题参考文本已生成，包含出处、日期与限制。';track('topic_export');}catch{$('#mj-topic-export-status').textContent='浏览器未能生成文件，可直接复制页面中的选题与出处。';}});
  if(initial||['platform','production','audience'].some(k=>params.has(k)))generate(false);
 }
})();
