// Protected responses only. No analytics, third-party scripts, or persisted data.
const $ = id => document.getElementById(id);
const sectors = {agents:'AI Agent',models:'基础模型',robotics:'机器人',infrastructure:'基础设施',applications:'AI 应用'};
let snapshot = null;
const number = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('zh-CN',{maximumFractionDigits:2}) : '—';
const date = value => { const parsed = new Date(value); return value && Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('zh-CN',{timeZone:'UTC',hour12:false}) + ' UTC' : '尚无记录'; };
const safeUrl = value => {try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}};
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function link(text,url){const node=el('a',text);const safe=safeUrl(url);if(safe){node.href=safe;node.target='_blank';node.rel='noopener noreferrer';}return node;}
function renderItems(){
  const items=Array.isArray(snapshot?.items)?snapshot.items:[];
  const query=$('search').value.trim().toLocaleLowerCase();
  const filtered=items.filter(item=>(!query||`${item.title} ${item.summary||''}`.toLocaleLowerCase().includes(query))&&($('kind').value==='all'||item.kind===$('kind').value)&&($('sector').value==='all'||item.sector===$('sector').value)&&($('geography').value==='all'||item.geography===$('geography').value));
  $('visible-count').textContent=`显示 ${filtered.length} / ${items.length} 条`;
  const list=$('signal-list');list.replaceChildren();
  if(!filtered.length){const box=el('div',undefined,'empty-state');box.append(el('h3',items.length?'没有符合筛选条件的线索':'等待第一批真实线索'),el('p',items.length?'调整关键词、类型或地域条件，再查看已有记录。':'采集成功后，这里会显示来源、发布日期与待核实事项。'));list.append(box);return;}
  for(const item of filtered){
    const article=el('article',undefined,'signal-row');
    const published=el('time',String(item.publishedAt||'日期待核实').slice(0,10),'signal-date');if(item.publishedAt)published.dateTime=item.publishedAt;
    const body=el('div'),heading=el('h3');heading.append(link(item.title||'未命名线索',item.url));body.append(heading);
    if(item.summary)body.append(el('p',item.summary));
    const meta=el('div',undefined,'signal-meta');meta.append(el('span',item.kind==='funding'?'融资报道':'创业动态'),el('span',sectors[item.sector]||'赛道待核实'),el('span',item.geography==='sf-bay-area'?'明确提及湾区':'地域待核实'),el('span','规则匹配 · 待核对原文'));body.append(meta);
    const source=el('div',undefined,'signal-source');source.append(el('span',item.source||'来源待核实'),link('打开原始报道 ↗',item.url));article.append(published,body,source);list.append(article);
  }
}
function renderSources(sources){
  const box=$('source-list');box.replaceChildren();if(!sources.length){box.append(el('p','尚无来源状态。','subtle'));return;}
  for(const source of sources){const row=el('div',undefined,'source-row'),left=el('div'),right=el('div');left.append(link(source.name||source.id,source.url));if(source.error)left.append(el('p',source.error));right.append(el('span',source.ok?'采集成功':'本轮不可用',source.ok?'source-ok':'source-error'),el('p',date(source.fetchedAt)));row.append(left,right);box.append(row);}
}
function svgElement(tag,attributes={}){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));return node;}
function renderChart(history,forecast){
  const box=$('chart'),table=$('history-table');table.replaceChildren();
  const rows=history.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)).slice(-90);
  for(const row of [...rows].reverse()){const tr=el('tr');tr.append(el('td',row.date),el('td',number(row.count)),el('td',row.complete?'完整观察日':'采集不完整，不进入训练'));table.append(tr);}
  const actual=rows.filter(x=>x.complete&&Number.isFinite(x.count));
  if(!actual.length){const empty=el('div',undefined,'chart-empty');empty.append(el('span',undefined,'empty-orbit'),el('h3','让历史先积累起来。'),el('p','没有可用时间序列时，不绘制模拟曲线。'));box.replaceChildren(empty);return;}
  box.replaceChildren();const points=forecast.status==='ready'&&Array.isArray(forecast.points)?forecast.points.filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&[p.estimate,p.low,p.high].every(Number.isFinite)):[];
  const allDates=[...rows.map(x=>x.date),...points.map(x=>x.date)];
  const minTime=new Date(allDates[0]).getTime(),maxTime=new Date(allDates.at(-1)).getTime();const ymax=Math.max(1,...actual.map(x=>x.count),...points.map(x=>x.high));
  const x=d=>45+(new Date(d).getTime()-minTime)/Math.max(86400000,maxTime-minTime)*610;
  const y=n=>230-n/ymax*195;
  const svg=svgElement('svg',{viewBox:'0 0 690 275',role:'img','aria-labelledby':'chart-title chart-description'});
  const title=svgElement('title',{id:'chart-title'});title.textContent='日度 AI 融资与创业报道线索';
  const description=svgElement('desc',{id:'chart-description'});description.textContent=`图表包含 ${actual.length} 个完整观察日${points.length?'和未来七日预测':''}。缺失或采集不完整的日期不连线。详细数据在下方表格。`;svg.append(title,description);
  for(let i=0;i<5;i++){const amount=ymax*i/4,label=svgElement('text',{x:34,y:y(amount)+4,'text-anchor':'end',fill:'#586174','font-size':11});label.textContent=number(amount);svg.append(label);}
  if(points.length){const polygon=svgElement('polygon',{points:[...points.map(p=>`${x(p.date)},${y(p.high)}`),...[...points].reverse().map(p=>`${x(p.date)},${y(p.low)}`)].join(' '),fill:'#dce5fb'});svg.append(polygon);const line=svgElement('polyline',{points:points.map(p=>`${x(p.date)},${y(p.estimate)}`).join(' '),fill:'none',stroke:'#002fa7','stroke-width':2,'stroke-dasharray':'5 4'});svg.append(line);}
  let path='';let previous=null;for(const row of rows){if(!row.complete||!Number.isFinite(row.count)){previous=null;continue;}const gap=previous?new Date(row.date)-new Date(previous.date):0;path+=`${previous&&gap===86400000?'L':'M'}${x(row.date)},${y(row.count)} `;previous=row;}
  svg.append(svgElement('path',{d:path,fill:'none',stroke:'#002fa7','stroke-width':2}));
  for(const row of actual){const circle=svgElement('circle',{cx:x(row.date),cy:y(row.count),r:3,fill:'#002fa7'});const tip=svgElement('title');tip.textContent=`${row.date}：${row.count} 条`;circle.append(tip);svg.append(circle);}
  for(const [value,anchor] of [[allDates[0],'start'],[allDates.at(-1),'end']]){const label=svgElement('text',{x:x(value),y:259,'text-anchor':anchor,fill:'#586174','font-size':11});label.textContent=value;svg.append(label);}
  box.append(svg);
}
function render(data){
  snapshot=data;const items=data?.items||[],sources=data?.sources||[],history=data?.history||[],forecast=data?.forecast||{},model=data?.model||{},notifications=data?.notifications||{};
  $('item-count').textContent=number(items.length);$('source-count').textContent=`${sources.filter(x=>x.ok).length} / ${sources.length}`;$('history-count').textContent=number(forecast.observedDays||0);
  $('updated-at').textContent=data?.generatedAt?`更新于 ${date(data.generatedAt)}`:'尚未完成首次采集';
  const stale=data?.generatedAt&&Date.now()-new Date(data.generatedAt).getTime()>36*3600000;
  $('collection-status').textContent=!data?'等待首次采集':stale?'快照需要更新':sources.some(x=>!x.ok)?'部分来源不可用':'已读取最近快照';$('collection-status').className=`status-pill ${data&&!stale&&sources.length&&sources.every(x=>x.ok)?'ok':'warning'}`;
  const minimum=forecast.minimumDays||56,observed=forecast.observedDays||0;$('training-progress').style.width=`${Math.min(100,Math.max(0,observed/minimum*100))}%`;$('training-label').textContent=`${observed} / ${minimum} 个连续完整观察日`;
  if(forecast.status==='ready'){$('forecast-title').textContent=stale?'历史预测 · 快照已过期':'未来 7 天信号量预测';const total=forecast.points?.reduce((sum,p)=>sum+(Number.isFinite(p.estimate)?p.estimate:0),0);const dates=forecast.points?.length?`${forecast.points[0].date} 至 ${forecast.points.at(-1).date}`:'原预测窗口';$('forecast-copy').textContent=stale?`这份预测生成于 ${date(data.generatedAt)}，预测窗口为 ${dates}。请等待刷新，不将过期快照当作当前未来判断。`:`预测窗口 ${dates}：合计约 ${number(total)} 条符合规则的报道线索。包括地域未确认记录，不代表硅谷独立交易数量、金额或投资收益。`;}else{$('forecast-title').textContent=forecast.status==='insufficient_variation'?'等待更有变化的数据':'等待足够的历史';$('forecast-copy').textContent=forecast.status==='insufficient_variation'?'当前数据变化不足，模型暂不发布预测。继续保留观察记录。':`模型需要至少 ${minimum} 个连续完整观察日。条件未满足时，不发布预测数字。`;}
  $('model-name').textContent=model.status==='candidate_promoted'?'神经网络（通过回测）':model.status==='baseline_retained'?'时序基线（候选未通过）':'待训练';$('baseline-mae').textContent=number(model.baselineMAE);$('candidate-mae').textContent=number(model.candidateMAE);$('validation-count').textContent=number(model.validationPoints);
  $('chart-note').textContent='趋势包含全部已覆盖来源及地域待核实记录，不随下方筛选变化；不是硅谷融资笔数或金额。'+(forecast.intervalNote?' '+forecast.intervalNote:'');
  const status=notifications.deliveryStatus;$('notification-status').textContent=!notifications.configured?'尚未接通 Telegram 通知。':status==='sent'?'最近一条核心摘要已发送。':status==='delivery_unknown'?'发送结果未确认，为避免重复不会自动重发。':status==='sending'?'已开始发送，等待回执确认。':'通知配置已就绪；尚无成功发送记录。';$('notification-time').textContent=notifications.lastSentAt?`上次成功发送：${date(notifications.lastSentAt)}。通知仅面向站主。`:'通知面向站主；注册不会订阅任何营销消息。';
  renderItems();renderSources(sources);renderChart(history,forecast);
}
async function load(){
  const button=$('refresh'),message=$('load-message');button.disabled=true;button.textContent='读取中…';message.hidden=false;message.className='notice';message.textContent='正在读取最新监控快照…';
  try{const response=await fetch('/api/capital-radar',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});if(response.status===401){snapshot=null;render(null);message.replaceChildren(el('span','登录状态已失效。 '));const a=el('a','重新登录后继续');a.href='/auth/account?next=%2Fcapital-radar&lang=zh';message.append(a);return;}if(!response.ok)throw new Error('unavailable');const payload=await response.json();if(!payload.ok)throw new Error('invalid');render(payload.snapshot);message.textContent=payload.snapshot?'线索通过自动规则匹配，请核对原始报道；地域待核实的记录单独标注。':'首次采集尚未完成。这里将保留真实的空状态，不生成示范融资或预测。';}
  catch{message.className='notice error';message.textContent='暂时无法读取监控数据。请稍后刷新；页面中已有记录不会被误标为最新。';}
  finally{button.disabled=false;button.textContent='刷新看板';}
}
const initialParams=new URLSearchParams(location.search);for(const key of ['kind','sector','geography']){const value=initialParams.get(key);if(value&&[...$(key).options].some(option=>option.value===value))$(key).value=value;}
$('filters').addEventListener('submit',event=>event.preventDefault());for(const id of ['search','kind','sector','geography'])$(id).addEventListener(id==='search'?'input':'change',renderItems);$('refresh').addEventListener('click',load);load();
