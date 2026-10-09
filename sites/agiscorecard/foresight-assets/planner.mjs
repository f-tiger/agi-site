// Editorial action recipes, not model output or forecasts. Saved plans keep the
// existing plain-text note format so older local/cloud backups remain portable.
const pair=(en,zh)=>({en,zh});
const task=(id,en,zh,inputEn,inputZh,outputEn,outputZh)=>({id,label:pair(en,zh),input:pair(inputEn,inputZh),output:pair(outputEn,outputZh)});
export const scenarios={
 work:[
  task('weekly-report','Weekly work report','每周工作汇报','this week’s work notes','本周工作素材','a concise weekly report','一份简洁周报'),
  task('meeting-notes','Meeting follow-up','整理会议记录','one meeting transcript','一份会议记录','decisions and follow-up tasks','决策与待办清单'),
  task('customer-reply','Customer reply','回复客户问题','one sample customer question','一个示例客户问题','a useful reply','一份可用的答复')],
 learn:[
  task('new-concept','Understand a new concept','理解一个新知识','one unfamiliar concept','一个不熟悉的知识点','an explanation and a worked example','一段解释和一个应用例子'),
  task('new-tool','Learn an AI tool','学会一个 AI 工具','one small task for a new tool','新工具中的一个小任务','a working example','一个可运行的示例'),
  task('language-practice','Practise a language','练习外语表达','one everyday conversation topic','一个日常对话主题','a short spoken or written response','一段口头或书面表达')],
 earn:[
  task('content-service','Content production service','内容制作服务','one sample content brief','一份示例内容需求','a sample script or post','一份脚本或图文样稿'),
  task('workflow-service','Workflow improvement service','工作流优化服务','one repetitive work process','一项重复工作流程','a before-and-after demonstration','一份前后对比演示'),
  task('small-product','A small digital product','一个小型数字产品','one frequently repeated problem','一个反复出现的问题','a one-page prototype','一个单页原型')],
 family:[
  task('homework-review','Review a homework mistake','复习一道错题','one already marked homework mistake','一道已经批改的错题','a corrected solution with reasoning','一份带思路的订正'),
  task('reading-together','Read together','一起阅读和复述','one short, age-appropriate passage','一篇适龄短文','a retelling with supporting details','一段带依据的复述'),
  task('curiosity','Explore a child’s question','探索孩子的一个问题','one question raised by the learner','一个孩子主动提出的问题','an explanation grounded in a checkable example','一段有可核对例子的解释')],
 understand:[
  task('ai-news','Check an AI news story','看懂一条 AI 新闻','one AI news story','一条 AI 新闻','a short evidence summary','一份简短的证据摘要'),
  task('capability-demo','Check a capability demo','判断一个能力演示','one publicly described AI demonstration','一个公开介绍的 AI 演示','a list of what it does and does not show','一份能力与边界清单'),
  task('industry-change','Understand an industry change','理解一个行业变化','one claim about change in an industry','一条关于行业变化的说法','a map of affected tasks and open questions','一份受影响任务与待查问题清单')],
 forecast:[
  task('agi-timeline','An AGI timeline forecast','AGI 到来时间','one dated AGI forecast','一条带日期的 AGI 预测','a checkable forecast record','一份可查证的预测记录'),
  task('job-change','A forecast about work','工作变化预测','one claim about jobs changing','一条关于工作变化的预测','a list of observable changes to watch','一份可观察变化清单'),
  task('adoption','A forecast about AI adoption','AI 普及预测','one claim about AI adoption','一条关于 AI 普及的预测','a comparison of the claim and adoption evidence','一份预测与实际采用证据的对照')]
};
const a=(id,en,zh,make)=>({id,label:pair(en,zh),make});
export const actions={
 work:[
  a('compare','Compare manual and AI-assisted work','对比人工与 AI 辅助',s=>pair(`Use ${s.input.en} to make ${s.output.en} once manually and once with AI. Include checking time; compare total time and omissions.`,`用${s.input.zh}，分别人工完成和 AI 辅助完成${s.output.zh}。把复核计入总耗时，比较时间与遗漏。`)),
  a('draft','Let AI make a first draft','先让 AI 生成初稿',s=>pair(`Ask AI to turn ${s.input.en} into ${s.output.en}. Check each factual statement and record what needed correction.`,`让 AI 将${s.input.zh}整理成${s.output.zh}。逐项核对事实，记录哪些地方需要修正。`)),
  a('check','Use AI only as a reviewer','只让 AI 检查遗漏',s=>pair(`Create ${s.output.en} yourself from ${s.input.en}. Ask AI to identify omissions, then verify each suggestion.`,`先根据${s.input.zh}独立完成${s.output.zh}，再让 AI 找出遗漏，逐条核对建议。`))],
 learn:[
  a('explain','Explain it without AI','脱离 AI 自己解释',s=>pair(`Use ${s.input.en} to produce ${s.output.en} with AI help. Close the assistant and explain the result in your own words.`,`借助 AI，围绕${s.input.zh}完成${s.output.zh}。关闭助手后，用自己的话解释结果。`)),
  a('transfer','Try a new example independently','换个例子独立尝试',s=>pair(`Practise with ${s.input.en}, then attempt a different example without AI. Check whether you can produce ${s.output.en} independently.`,`先练习${s.input.zh}，再换一个例子，不用 AI 尝试完成${s.output.zh}。检查能否独立应用。`)),
  a('feedback','Attempt first, then get feedback','先尝试，再看反馈',s=>pair(`Attempt ${s.output.en} for ${s.input.en} before asking AI for feedback. Correct one gap and try again without hints.`,`针对${s.input.zh}先独立尝试${s.output.zh}，再让 AI 反馈。修正一个薄弱点后，关掉提示再做一次。`))],
 earn:[
  a('sample','Make one small sample','先做一份小样',s=>pair(`Use ${s.input.en} to create ${s.output.en}. Show it to one willing potential user and ask what they would actually use. Interest alone is not a payment.`,`围绕${s.input.zh}制作${s.output.zh}，请一位愿意交流的潜在用户试看，了解哪些部分真会使用。感兴趣不等于付费。`)),
  a('demand','Check the current alternative','了解用户现有做法',s=>pair(`Before building ${s.output.en}, ask a willing potential user how they handle ${s.input.en} today, what it costs them and which result is missing.`,`制作${s.output.zh}前，先请愿意交流的潜在用户说明：现在如何处理${s.input.zh}、付出什么成本、还缺少什么结果。`)),
  a('cost','Measure delivery effort','算清交付耗时',s=>pair(`Produce ${s.output.en} from ${s.input.en}. Count your time, tool costs, checks and one revision before deciding whether to offer it as a service.`,`用${s.input.zh}完成${s.output.zh}，把人工、工具费用、复核和一次修改都计入成本，再判断是否值得提供服务。`))],
 family:[
  a('teach-back','Ask the learner to explain','请孩子讲出思路',s=>pair(`Work together on ${s.input.en} to make ${s.output.en}. Let the learner explain the reasoning without AI before checking it together.`,`围绕${s.input.zh}一起完成${s.output.zh}。先让孩子不用 AI 讲出推理过程，再一起核对。`)),
  a('new-example','Check a different example','换个例子检验理解',s=>pair(`After working on ${s.input.en}, choose a different example and ask for ${s.output.en} without AI. Check the reasoning, not only the final answer.`,`练习${s.input.zh}后，换一个新例子，请孩子不用 AI 完成${s.output.zh}。关注思路，而不只看答案。`)),
  a('question','Let AI ask guiding questions','让 AI 只给提示问题',s=>pair(`For ${s.input.en}, ask AI for guiding questions instead of a completed answer. Have the learner develop ${s.output.en} and check it with you.`,`围绕${s.input.zh}，让 AI 只给引导问题。请孩子自己形成${s.output.zh}，再由你一起核对。`))],
 understand:[
  a('source','Trace the original source','找到原始出处',s=>pair(`Trace ${s.input.en} to its original source and date. Create ${s.output.en}, separating observed results from expectations.`,`找到${s.input.zh}的原始出处与日期，整理${s.output.zh}，分清已经观察到的结果和未来期待。`)),
  a('compare','Compare independent evidence','对照独立证据',s=>pair(`Compare ${s.input.en} with one independent source. Make ${s.output.en}, checking whether their dates, definitions and conditions match.`,`用一份独立来源对照${s.input.zh}，整理${s.output.zh}，检查双方日期、定义与条件是否相同。`)),
  a('limits','Find the missing conditions','找出尚未说明的条件',s=>pair(`Inspect ${s.input.en} for missing conditions and failure cases. Create ${s.output.en} that states what still needs checking.`,`检查${s.input.zh}中缺失的前提和失败情况，整理${s.output.zh}，明确哪些地方仍需查证。`))],
 forecast:[
  a('criteria','Define what would count as evidence','明确什么算作证据',s=>pair(`Turn ${s.input.en} into ${s.output.en}: retain its date, definition and original source, and identify one observable condition that would support or weaken it.`,`把${s.input.zh}整理成${s.output.zh}，保留日期、定义与原始来源，并找出一条可以观察、支持或削弱它的条件。`)),
  a('opposite','Compare an opposing view','对照一个相反观点',s=>pair(`Compare ${s.input.en} with an opposing view. Create ${s.output.en}, noting differences in deadlines, definitions and evidence.`,`用一个相反观点对照${s.input.zh}，整理${s.output.zh}，区分期限、定义与证据上的差异。`)),
  a('revisit','Recheck the original evidence','回看原始证据的变化',s=>pair(`Return to the original source for ${s.input.en}. Create ${s.output.en} using new observable results; separate changed evidence from repeated opinions.`,`回到${s.input.zh}的原始来源，用新增的可观察结果整理${s.output.zh}，区分证据变化与观点重复。`))]
};
const criteria=(...rows)=>rows.map(([id,en,zh])=>({id,label:pair(en,zh)}));
export const counters={
 work:criteria(['slower','Checking and rework erase the time saving','复核与返工抵消了节省的时间'],['errors','The result contains a critical factual error','结果出现关键事实错误'],['handoff','It still needs intervention at most steps','多数步骤仍需要人工介入']),
 learn:criteria(['independent','I cannot repeat it without AI','离开 AI 仍然无法独立完成'],['transfer','I cannot apply it to a different example','换一个例子就不会应用'],['explain','I cannot explain why the result is right','无法解释结果为什么正确']),
 earn:criteria(['need','Potential users do not need the result','潜在用户并不需要这个结果'],['cost','Delivery costs exceed a realistic price','交付成本超过用户可接受的价格'],['alternative','The existing alternative works better','用户现有的做法更合适']),
 family:criteria(['reasoning','The learner can repeat an answer but not explain it','孩子能复述答案，却讲不清思路'],['independent','The learner cannot attempt a new example alone','孩子无法独立尝试新例子'],['source','An explanation conflicts with a checked source','解释与核对过的来源相冲突']),
 understand:criteria(['source','The original source does not support the claim','原始来源并不支持这条说法'],['conditions','The result only holds under narrow conditions','结果只在很有限的条件下成立'],['counter','A credible independent result contradicts it','可信的独立结果与之相反']),
 forecast:criteria(['deadline','The stated deadline passes without the result','期限已过，但约定的结果未出现'],['measure','New evidence weakens a key condition','新证据削弱了一个关键前提'],['definition','The definition changes after the prediction','预测之后又改变了判定定义'])
};
export const reviewChoices=[['3','In 3 days','3 天后'],['7','In 1 week','1 周后'],['14','In 2 weeks','2 周后'],['30','In 1 month (30 days)','1 个月后（30 天）'],['1','Tomorrow','明天'],['0','Today','今天'],['none','No date yet','暂不安排']];
export function reviewDate(choice,now=new Date()){
 if(!reviewChoices.some(r=>r[0]===choice))throw Error('review choice');if(choice==='none')return '';
 const date=new Date(now);if(!Number.isFinite(date.getTime()))throw Error('date');
 return new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()+Number(choice))).toISOString().slice(0,10);
}
export function makePlan({goal,task:taskId,action:actionId,counter:counterId,review='7',done=false},lang,now=new Date()){
 if(!['en','zh'].includes(lang))throw Error('language');
 const scenario=scenarios[goal]?.find(s=>s.id===taskId),action=actions[goal]?.find(a=>a.id===actionId),counter=counters[goal]?.find(c=>c.id===counterId);
 if(!scenario||!action||!counter||typeof done!=='boolean')throw Error('choices');
 return {task:scenario.label[lang],action:action.make(scenario)[lang],counter:counter.label[lang],review:reviewDate(review,now),done};
}
export const defaultChoices=goal=>({goal,task:scenarios[goal][0].id,action:actions[goal][0].id,counter:counters[goal][0].id,review:'7',done:false});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function plannerMarkup(lang,goals,claim){
 const t=(en,zh)=>lang==='zh'?zh:en,goal=claim.goals.includes('work')?'work':claim.goals[0],plan=makePlan(defaultChoices(goal),lang),options=(rows)=>rows.map(r=>`<option value="${r.id}">${esc(r.label[lang])}</option>`).join('');
 return `<section class="plan" id="plan" data-planner-version="20261003-select1"><h2>${t('Choose my next step','选一选，找到我的下一步')}</h2><p class="planner-intro">${t('Choose your situation. Your plan takes shape below—no writing required.','选择你的场景，下方自动生成小计划，不用填写文字。')}</p><form id="plan-form"><div class="planner-grid"><label class="field">${t('My direction','我关心的方向')}<select id="plan-goal">${goals.map(g=>`<option value="${g.id}"${g.id===goal?' selected':''}>${esc(g[lang][0])}</option>`).join('')}</select></label><label class="field">${t('My situation','我正在面对的任务')}<select id="note-task">${options(scenarios[goal])}</select></label><label class="field">${t('What I will try','我先尝试哪一步')}<select id="note-action">${options(actions[goal])}</select></label><label class="field">${t('When I would change the plan','出现什么结果就调整方案')}<select id="note-counter">${options(counters[goal])}</select></label><label class="field">${t('When to review','多久后复查')}<select id="note-review">${reviewChoices.map(([id,en,zh])=>`<option value="${id}"${id==='7'?' selected':''}>${esc(t(en,zh))}</option>`).join('')}</select></label><label class="field">${t('My progress','目前的进度')}<select id="note-done"><option value="planned">${t('Ready to try','准备尝试')}</option><option value="tried">${t('I have tried this','已经尝试过')}</option></select></label></div><section class="plan-output" aria-live="polite" aria-atomic="true" aria-labelledby="plan-preview-title"><h3 id="plan-preview-title">${t('My action plan','我的行动计划')}</h3><dl>${[['task',t('Task','任务')],['action',t('First step','行动')],['counter',t('Change course if','调整条件')],['review',t('Review','复查')]].map(([k,label])=>`<div><dt>${label}</dt><dd data-plan-output="${k}">${esc(k==='review'?t('In 1 week','1 周后'):plan[k])}</dd></div>`).join('')}</dl></section><p class="planner-evidence"><strong>${t('Check against this perspective: ','结合本条观点检验：')}</strong>${esc(claim[lang].test)}</p><div class="actions"><button type="submit" class="primary">${t('Save my plan','保存这个计划')}</button><button type="button" id="export-plan">${t('Export plan','导出计划')}</button><button type="button" id="export-calendar">${t('Add to calendar','加入日历')}</button></div>${claim.id==='distribution-opportunity'?`<section class="plan-output"><h3>${t('Continue with this one plan','继续推进这一条计划')}</h3><p>${t('Attach the business evidence above, then prepare a reviewable draft in Jarvis. This only opens a preview; no task is submitted and no trial is used. Your original plan is unchanged.','先在上方明确附加经营证据，再用贾维斯准备可审阅草稿。这里只打开预览，不提交任务、不消耗试用，也不改变原计划。')}</p><div class="actions"><button type="button" id="plan-jarvis">${t('Prepare this plan in Jarvis','带着此计划准备草稿')}</button><a id="plan-csv" href="${lang==='zh'?'/zh':''}/earn/delivery-lab">${t('I have CSV execution records','我已有 CSV 执行记录')}</a></div><p class="meta">${t('For CSV, choose workflow mode in the existing local checker: it flags counts, repeated run IDs and empty outputs. It does not reconcile individual business records, diagnose causes or repair a workflow. No CSV is sent to Jarvis.','CSV 请在已有本地检查器选择工作流模式：检查次数、重复执行编号与空输出；不逐条核对业务记录，不诊断原因或修复流程，也不把 CSV 发给贾维斯。')}</p></section>`:''}<p class="inline-status" id="plan-status" role="status"></p><p class="meta">${t('Free to use. Saved on this device when you choose Save; the site does not send reminders.','免费使用，点击保存后保留到本机；本站不会自动发送提醒。')}</p></form><p class="embed-return"><a href="https://agiscorecard.com${lang==='zh'?'/zh':''}/future-guide/${claim.id}">${t('Read the interview and evidence on AGI','回到 AGI 查看访谈与证据')} ↗</a></p></section>`;
}
