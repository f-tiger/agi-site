// Editorial groups use the customer job, not neural similarity or outcome labels.
export const comparisonGroups = [
 ['ai-clients','小型 AI 客户端','Small AI clients','比较个人用户的多模型入口：原生 Mac、网页客户端与全能助手不同；买断销售不是订阅 MRR，停止单款产品不等于创始人退出。','Compare multi-model access for individuals: native Mac, web clients and all-in-one assistants differ. License sales are not subscription MRR; product closure is not founder exit.',['boltai','typingmind','super-ai']],
 ['beauty-analysis','自拍美妆与形象建议','Selfie beauty and appearance','比较自拍后的建议交付与获客，分别注明个人或团队证据；不视为医学检测。','Compare selfie advice and acquisition with explicit staffing evidence; these are not medical diagnostics.',['glam-up','glow-ai','glowly-ai']],
 ['color-analysis','自拍色彩分析','Selfie color analysis','对照季型色彩报告：小额一次性收入、订阅 MRR 与历史峰值不能直接排名。','Compare seasonal-color reports; tiny one-off revenue, subscription MRR and historical peaks are not directly rankable.',['glam-up','glamour-color','solo-color-microcase']],
 ['coding','编程助手','Coding assistants','补全、编辑器与 Agent 的交付不同；时期、平台与团队也不同。','Completion, editors and agents differ in deliverable, period, platform and team.',['cursor','windsurf','github-copilot','kite']],
 ['app-building','应用开发','App building','对照软件交付；自助建站与代开发服务不是同一种成本结构。','Compare software delivery; self-service builders and managed development have different costs.',['bolt','lovable','replit','builder-ai']],
 ['legal','法律工作辅助','Legal assistance','专业律所与消费者的需求不同；监管受挫、停运与客户增长分别记录。','Professional and consumer buyers differ; regulatory setbacks, closure and adoption remain distinct.',['casetext','harvey','ross-intelligence','donotpay']],
 ['meetings','会议记录','Meeting notes','同为会议工作流；用户数与 ARR 无法直接排名。','Both serve meeting workflows; users and ARR cannot be ranked together.',['otter-ai','fireflies']],
 ['support','知识库与客服','Knowledge-grounded support','比较知识库回答与客服交付；待复核资料不能作为当前指导依据。','Compare grounded answers and support delivery; pending evidence cannot support current guidance.',['sitegpt','docsbot','chatbase','my-askai','customgpt']],
 ['content','营销内容生产','Marketing content','企业营销、内容复用和流量获取的客户及渠道不同，需先看交付范围。','Enterprise marketing, repurposing and traffic acquisition differ in customers, channels and deliverables.',['jasper','castmagic','contenda-studio','content-goblin']],
 ['presentations','演示文稿','Presentations','对照演示交付；单一产品退出不代表公司整体倒闭。','Compare presentation delivery; product retirement is not company-wide failure.',['gamma','tome-slides']],
 ['voice','语音生成','Voice generation','闭源商业产品与开源团队的收入和研发条件不同。','Commercial products and open-source teams differ in revenue and research conditions.',['elevenlabs','coqui']],
 ['portraits','写真与头像','Portraits and headshots','比较人物照片交付；历史收入仍需注明统计周期。','Compare portrait deliverables while preserving historical revenue periods.',['photo-ai','headshotpro']],
 ['video','视频生成','Video generation','企业培训与营销视频用途可能不同，用户口径不自动相同。','Training and marketing video jobs may differ; adoption measures are not automatically equivalent.',['synthesia','heygen']],
 ['analysis','数据分析','Data analysis','表格操作与交互分析的使用门槛、用户群和交付不同。','Spreadsheet tasks and interactive analysis differ in entry barriers, users and deliverables.',['formula-bot','julius-ai']],
 ['robots','陪伴机器人','Companion robots','比较软硬件持续交付；本组目前只有失败记录，不能计算失败率。','Compare ongoing hardware/software delivery. Only failure records are currently included; no failure rate can be inferred.',['embodied','anki']],
 ['autonomy','自动驾驶','Autonomous driving','乘用车方案与无人出租车运营不同；本组不是完整市场样本。','Passenger-car technology and robotaxi operations differ; this group is not a market-wide sample.',['ghost-autonomy','argo-ai','cruise-robotaxi']],
 ['health-workflow','医疗工作流','Health workflows','文书与流程自动化属于相邻任务，需核对具体交付与人工审核。','Documentation and process automation are adjacent jobs; inspect deliverables and human review.',['cydoc','olive-ai']],
].map(([id,zh,en,note,noteEn,ids])=>({id,zh,en,note,noteEn,ids}));

export function buildComparisonPages({cases,render,BASE,zh,esc,caseName,scopeLabel,outcomeLabel,outcomeScope,text,reviewNotice}) {
 const t=(a,b)=>zh?a:b, root=BASE+'/ai-solo/', byId=new Map(cases.map(c=>[c.id,c]));
 const link=g=>root+'compare/'+g.id+'/';
 const cards=comparisonGroups.map(g=>`<article class="solo-card"><h2><a href="${link(g)}">${esc(g[zh?'zh':'en'])}</a></h2><p>${esc(g.ids.map(id=>caseName(byId.get(id),zh)).join(' · '))}</p><p>${esc(g[zh?'note':'noteEn'])}</p></article>`).join('');
 const intro=t('按交付任务分组，选择 2–4 个案例并排阅读。先核对团队、日期、指标口径与结果范围，再判断经验能否迁移。','Choose a customer job, then compare 2–4 cases. Check team, dates, metric definitions and outcome scope before transferring a lesson.');
 render('/ai-solo/compare/',t('同类型 AI 商业化案例对比','Compare AI business cases by customer job'),intro,`<header><h1>${t('同一类生意，<br>不同的结果。','Similar jobs.<br>Different outcomes.')}</h1><p class="solo-intro">${intro}</p></header><div class="solo-grid">${cards}</div>`,{active:'compare/',items:[...new Set(comparisonGroups.flatMap(g=>g.ids))].map(id=>byId.get(id))});
 for(const g of comparisonGroups){
  const members=g.ids.map(id=>{if(!byId.has(id))throw new Error('Missing comparison case '+id);return byId.get(id);});
  const fmt=(c,key)=>esc(text(c,key,zh));
  const cellRows=[
   [t('结果与范围','Outcome and scope'),c=>`${esc(outcomeLabel(c,zh))}<p>${esc(outcomeScope(c,zh))}</p>${reviewNotice(c)}`],
   [t('客户任务与证据','Job and evidence'),c=>`<strong>${fmt(c,'category')}</strong><p>${fmt(c,'summary')}</p>`],
   [t('团队与规模','Team and scale'),c=>esc(scopeLabel(c,zh))+(c.teamEvidence?'<p>'+fmt(c,'teamEvidence')+'</p>':'')],
   ...[['businessModel',t('如何收费','Payment model')],['acquisition',t('如何获客','Acquisition')]].map(([key,label])=>[label,c=>c[key]?fmt(c,key)+` <a href="${esc(c[key+'SourceUrl'])}" target="_blank" rel="noopener noreferrer" data-solo-event="source-open">${t('来源','Source')}</a>`:t('未独立记录；不从收入倒推。','Not separately recorded; not inferred from revenue.')]),
   [t('历史指标与周期','Historical metrics and periods'),c=>c.metrics.length?c.metrics.map(m=>`<p><strong>${esc(text(m,'label',zh))}: ${esc(text(m,'value',zh,m.value))}</strong><br>${esc(text(m,'period',zh))}</p>`).join(''):t('未公开可核对数字','No sourced numeric metric')],
   [t('利润证据','Profit evidence'),c=>esc(text(c,'profitStatus',zh,t('未知；上述指标不能证明盈利。','Unknown; the metrics above do not establish profit.')))],
   [t('原因与假设','Explanations and hypotheses'),c=>c.drivers.map(d=>`<p><strong>${d.kind==='reported'?t('来源解释','Reported explanation'):t('编辑推断','Editorial hypothesis')}</strong> — ${esc(text(d,'text',zh))}</p>`).join('')],
   [t('限制与风险','Limits and risks'),c=>(zh?c.risks:c.risksEn).map(r=>`<p>${esc(r)}</p>`).join('')],
   [t('可迁移的实验','A transferable test'),c=>fmt(c,'soloRelevance')],
   [t('来源及发布日期','Sources and publication dates'),c=>c.sources.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" data-solo-event="source-open">${esc(text(s,'title',zh,s.title))}</a><br>${esc(s.publishedAt||t('日期未知','Date unknown'))}</p>`).join('')],
   [t('进一步验证','Next step'),c=>`<a href="${root}case/${c.id}/" data-solo-event="case-open">${t('完整案例','Full case')}</a> · <a href="${root}agent/?case=${c.id}">${t('生成我的计划','Build my plan')}</a>`],
  ];
  const controls=`<form data-solo-compare><fieldset><legend>${t('选择 2–4 个同类案例','Choose 2–4 cases from this group')}</legend>${members.map(c=>`<label><input type="checkbox" name="cases" value="${c.id}" checked> ${esc(caseName(c,zh))}</label>`).join('')}</fieldset><div class="solo-actions"><button type="submit">${t('更新对比','Update comparison')}</button><a data-compare-share href="${link(g)}">${t('当前对比链接','Link to this comparison')}</a></div><p data-compare-status role="status" aria-live="polite">${t('未筛选时展示本组全部案例；更新后可复制链接分享。','All cases are initially visible. Update your selection to get a shareable link.')}</p></form>`;
  const table=`<div class="solo-compare-scroll" role="region" aria-label="${t('案例并排对比，可横向滚动','Side-by-side comparison; scroll horizontally')}" tabindex="0"><table class="solo-compare-table"><caption>${esc(g[zh?'zh':'en'])} — ${t('保留原始口径，不计算胜率','Original definitions preserved; no success-rate estimate')}</caption><thead><tr><th scope="col">${t('对比维度','Dimension')}</th>${members.map(c=>`<th scope="col" data-compare-case="${c.id}"><a href="${root}case/${c.id}/" data-solo-event="case-open">${esc(caseName(c,zh))}</a></th>`).join('')}</tr></thead><tbody>${cellRows.map(([label,fn])=>`<tr><th scope="row">${label}</th>${members.map(c=>`<td data-compare-case="${c.id}">${fn(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  render('/ai-solo/compare/'+g.id+'/',g[zh?'zh':'en']+t('：AI 商业化案例对比',': AI business case comparison'),g[zh?'note':'noteEn'],`<header><a href="${root}compare/">← ${t('所有类型','All groups')}</a><h1>${esc(g[zh?'zh':'en'])}</h1><p class="solo-intro">${esc(g[zh?'note':'noteEn'])}</p><p class="solo-note">${t('这是编辑选择的历史对照，不是控制实验。收入、ARR、客户数、监管救济分别保留；没有同类反面记录时不补造。未知的获客渠道、定价和利润请回到原始来源核对。','This is an editorial historical comparison, not a controlled experiment. Revenue, ARR, customers and regulatory relief remain separate. Missing counterexamples are not invented. Check original sources for unrecorded acquisition channels, pricing and profit.')}</p></header>${controls}${table}`,{active:'compare/',items:members,markdown:members.map(c=>'## '+caseName(c,zh)+'\n\n'+cellRows.map(([label,fn])=>'### '+label+'\n\n'+fn(c).replace(/<br>/g,' ').replace(/<\/p>/g,'\n\n').replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,'[$2]($1)').replace(/<[^>]*>/g,'')).join('\n\n')).join('\n\n')});
 }
}
