import fs from 'node:fs';
import {siteHeader,navAssets} from '../../site-nav/render.mjs';

const root=new URL('../../',import.meta.url);
const origin='https://agiscorecard.com';
const release='20261031-1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const written=[];

for(const lang of ['en','zh']){
 const zh=lang==='zh',t=(en,cn)=>zh?cn:en;
 const prefix=zh?'/zh':'',route=prefix+'/tianya',canonical=origin+route,home=zh?'/cn':'/';
 const account=`/auth/account?next=${encodeURIComponent(route)}&lang=${lang}`;
 const members=prefix+'/members';
 const title=t('Tianya Echo: validate a business or investment idea','天涯回声：验证创业与投资判断');
 const description=t('Turn an idea into a checkable next step. Compare delivery costs, pricing and paper-position risk, save a free local record, and revisit the evidence with AGI.','把判断变成可检验的下一步。免费比较交付成本、报价盈亏和模拟仓位，保存个人验证记录，再用实际结果与证据复查。');
 const numeric=(name,label,{min=0,max,step='any',hint=''}={})=>`<label class="ty-field" for="ty-${name}"><span>${esc(label)}</span><input id="ty-${name}" name="${name}" type="number" min="${min}"${max===undefined?'':` max="${max}"`} step="${step}" inputmode="decimal" autocomplete="off">${hint?`<small>${esc(hint)}</small>`:''}</label>`;
 const textField=(name,label,{textarea=false,maxlength=1600,type='text',hint=''}={})=>`<label class="ty-field${textarea?' ty-full':''}" for="ty-${name}"><span>${esc(label)}</span>${textarea?`<textarea id="ty-${name}" name="${name}" maxlength="${maxlength}" rows="3"></textarea>`:`<input id="ty-${name}" name="${name}" type="${type}"${type==='date'?'':` maxlength="${maxlength}"`} autocomplete="off">`}${hint?`<small>${esc(hint)}</small>`:''}</label>`;
 const faqs=[
  [t('Does this predict profit or tell me what to buy?','这是盈利预测或买卖建议吗？'),t('No. The workbench calculates scenarios from your inputs. Its thresholds are proposed operating rules, not model-validated success rates. Investment figures are paper-position calculations, not live prices or orders. Your review notes remain self-reported until independently checked.','不是。工作台根据你的输入计算情景；阈值是试验规则，不是经过模型验证的成功率。投资部分计算模拟仓位，不提供实时行情或自动下单。复查记录由你填写，未经独立核验不能称为已验证结果。')],
  [t('What can I use for free?','哪些功能免费？'),t('Reading the research, local calculations, saving one copy in this browser, restoring it, and JSON import/export are free and do not require membership. Saving replaces the existing local copy. Import replaces the draft in the current tab and does not write to local storage until you choose Save. Export a backup first if you want to retain the current draft.','研究资料、本地计算、在本浏览器保存一个副本、恢复副本，以及 JSON 导入导出均免费，无需云端会员。保存会覆盖已有本机副本；导入只替换当前标签页草稿，点击保存后才写入本机。需要保留当前草稿时，请先导出备份。')],
  [t('Is a free AGI account the same as cloud membership?','免费 AGI 账号和云端会员是一回事吗？'),t('No. The shared Fleet registration entry gives you an identity for AGI community and Jarvis features. Registration does not grant paid cloud storage, make a payment, or subscribe you to marketing. The existing cloud membership uses a separate 64-character hexadecimal access key; back up that key.','不是。统一 Fleet 注册入口提供 AGI 社区和贾维斯功能所用的身份。注册不会授予付费云端存储，不会付款，也不会自动订阅营销信息。现有云端会员使用独立的 64 个十六进制字符访问密钥，请务必备份密钥。')],
  [t('What does cloud membership include?','云端会员包含什么？'),t('The existing plan has a base price of 9 USDT for 30 days, plus the order-matching decimal and network fees. It includes 50 workspaces, 10 versions per workspace, 64 KiB per version and 5 MiB in total. There is no automatic renewal or extra AI allowance. Check availability and the exact order amount on the member page.','现有方案基础价为 9 USDT／30 天，另加订单匹配小数与网络费用；包含 50 个工作区、每区 10 个版本、每版本 64 KiB、总计 5 MiB。没有自动续费，也不增加 AI 额度。当前可售状态和准确订单金额以会员页为准。')],
  [t('Does opening the member page upload my record?','打开会员页会自动上传记录吗？'),t('No. The cloud button passes a preview of your record to the existing member page. Review it there and explicitly choose to save. Opening the page does not create an order or claim that a cloud save succeeded. Local calculations do not require an API key.','不会。云端按钮把记录预览交给现有会员页；你需要在该页复核并主动选择保存。打开页面不等于下单，也不代表云端保存成功。本地计算不需要 API 密钥。')],
  [t('How fresh is the Tianya research?','天涯研究资料更新到什么时候？'),t('The retained research snapshot is dated 2026-10-05. All 60 historical candidate statements remain unknown under the strict evidence gate. The separate ledger preserves 20 forecast endpoints; this page does not automatically score them or refresh them as new forecasts. The archive is currently in Chinese.','保留的研究快照日期为 2026-10-05。60 条历史候选判断在严格证据核验下全部保留未知。独立台账固定了 20 个预测终点；本页不自动计分，也不把它们刷新为新预测。资料库目前为中文。')]
 ];
 const hero=`<section class="ty-hero" data-marketing aria-labelledby="ty-page-title">
  <div class="ty-intro"><p class="ty-product-name">${t('Tianya Echo by AGI','AGI · 天涯回声')}</p>
   <h1 id="ty-page-title">${t('Make your next business or investment idea testable.','把创业与投资判断，变成可验证的下一步。')}</h1>
   <p>${t('Write down what you expect, compare the cost or risk, and keep the evidence that could change your mind. Start with a free example, then make the record your own.','写下预期，算清成本或风险，留下能够推翻判断的证据。从免费示例开始，再建立自己的验证记录。')}</p>
   <div class="ty-actions"><a id="account-link" class="primary" href="${esc(account)}" target="_blank" rel="noopener">${t('Create a free AGI account','免费注册 AGI 账号')}</a><a class="secondary" href="#workspace">${t('Try the free workbench','先做免费试算')}</a></div>
   <p class="ty-note">${t('Use the tool without signing in. A free account connects your community and Jarvis identity; cloud storage is a separate membership.','工具无需登录即可使用。免费账号统一社区和贾维斯身份；云端存储属于独立会员服务。')}</p>
  </div>
  <aside class="ty-preview" aria-label="${t('Example validation record','验证记录示例')}"><h2>${t('A judgment you can return to','留下一份可以复查的判断')}</h2>
   <div class="ty-row"><span>${t('Idea','假设')}</span><div>${t('Can assisted work reduce the cost of an accepted result?','工具辅助能否降低合格交付成本？')}</div></div>
   <div class="ty-row"><span>${t('Compare','比较')}</span><div>${t('Count review time, failed work and setup costs.','把复核、失败返工和接入费用一起算。')}</div></div>
   <div class="ty-row"><span>${t('Evidence','证据')}</span><div>${t('Record payment and delivery outcomes separately.','把客户付款与实际交付结果分别记录。')}</div></div>
   <div class="ty-row"><span>${t('Revisit','复查')}</span><div>${t('Choose a date and a reason to stop or continue.','事先写明复查日期和停止条件。')}</div></div>
   <p class="ty-note">${t('Illustration only. No customer, payment or investment result is claimed.','这里只展示使用方式，不代表已有客户、付款或投资成果。')}</p>
  </aside>
 </section>`;
 const startupFields=[
  numeric('tasks',t('Tasks in the same test batch','本轮同一批任务数'),{min:1,step:1}),
  numeric('baseMinutes',t('Manual minutes per task, including rework','人工平均分钟／任务，含返工')),
  numeric('trialMinutes',t('Assisted minutes per task, including review','工具辅助平均分钟／任务，含复核返工')),
  numeric('hourlyCNY',t('Full labor cost, CNY per hour','人工全成本，元／小时')),
  numeric('extraCNY',t('Other recurring cost, CNY per task','工具等持续费用，元／任务'),{hint:t('Include tools, supervision, maintenance, acquisition, taxes and refunds as applicable.','按适用情况计入工具、监督、维护、获客、税费和退款分摊。')}),
  numeric('setupCNY',t('One-time setup cost, CNY','一次接入费用，元'),{hint:t('Include configuration and setup labor.','包含配置及接入人工。')}),
  numeric('monthlyTasks',t('Assumed tasks per month','假设每月任务数'),{min:1,step:1}),
  numeric('basePass',t('Accepted manual results','人工方案合格数'),{step:1}),
  numeric('trialPass',t('Accepted assisted results','工具方案合格数'),{step:1}),
  numeric('majorErrors',t('Assisted tasks with major errors','工具方案重大错误任务数'),{step:1}),
  numeric('quoteCNY',t('Assumed price, CNY per accepted result','假设报价，元／合格件'))
 ].join('\n');
 const investFields=[
  numeric('equity',t('Virtual account equity, USD','虚拟账户权益，美元'),{min:.01}),
  numeric('entry',t('Assumed entry price, USD','假设入场价格，美元'),{min:.01}),
  numeric('exit',t('Planned exit trigger, USD','预定退出触发价，美元'),{min:.01}),
  numeric('riskPct',t('Planned loss budget, % (up to 0.5)','计划损失预算，%（最多 0.5）'),{max:.5}),
  numeric('capPct',t('Entry notional cap, % (up to 5)','入场名义仓位上限，%（最多 5）'),{max:5}),
  numeric('feeBps',t('Assumed cost per side, basis points','假设每边交易成本，基点'),{max:100})
 ].join('\n');
 const workspace=`<section id="workspace" aria-labelledby="workspace-title">
  <div class="ty-row"><div><h2 id="workspace-title">${t('Start with one decision','先验证一个具体判断')}</h2><p class="ty-note">${t('Choose a path and load an example, or fill in your own assumptions. Nothing here is an automatically verified outcome.','选择方向后可载入示例，也可填写自己的假设；这里不会自动生成“已经验证”的成果。')}</p></div><div class="ty-actions"><button id="load-demo" type="button" class="secondary">${t('Load an example','载入示例')}</button></div></div>
  <div class="ty-paths" role="group" aria-label="${t('Choose a validation path','选择验证方向')}"><button type="button" data-kind="startup" aria-pressed="true" aria-controls="startup-fields"><strong>${t('Validate a business idea','验证创业项目')}</strong><span>${t('Separate delivery cost, payment and profit.','分开核算交付成本、收款与利润。')}</span></button><button type="button" data-kind="invest" aria-pressed="false" aria-controls="invest-fields"><strong>${t('Plan an investment review','建立投资观察')}</strong><span>${t('Define a paper position and its exit conditions.','写明模拟仓位与退出条件。')}</span></button></div>
  <div class="ty-workspace">
   <form id="ty-form" class="ty-form" novalidate>
    <input type="hidden" name="kind" value="startup">
    ${textField('title',t('Project title','项目名称'),{maxlength:100})}
    ${textField('reviewDate',t('Review date','复查日期'),{type:'date'})}
    ${textField('hypothesis',t('What do you expect to happen?','你预期会发生什么？'),{textarea:true,maxlength:1200,hint:t('Name a result you can check, not a broad hope.','写一个能检查的结果，避免只有宽泛愿望。')})}
    ${textField('counter',t('What would change your mind or make you stop?','出现什么结果，就应修改判断或停止？'),{textarea:true,maxlength:800})}
    <fieldset id="startup-fields"><legend>${t('Delivery and pricing inputs','交付与报价数据')}</legend>${startupFields}</fieldset>
    <fieldset id="invest-fields" hidden><legend>${t('Paper-position assumptions','模拟仓位假设')}</legend><p class="ty-note ty-full">${t('Prices are your assumptions, not live quotes. The exit trigger is not a guaranteed fill; a gap or slippage can exceed the planned loss.','价格由你假设，不是实时行情。退出触发价不是保证成交价；跳空或滑点可能使损失超过计划。')}</p>${investFields}</fieldset>
    ${textField('outcome',t('Review notes (optional)','复查记录（可稍后补充）'),{textarea:true,maxlength:1600,hint:t('Your observations, up to 1,600 characters. A note does not establish an independently verified result.','记录你自己的观察，最多 1600 字；填写记录不等于结果已独立核验。')})}
    <div class="ty-actions"><button id="calculate" type="submit" class="primary" disabled>${t('Calculate this scenario','计算当前情景')}</button></div>
    <p class="ty-note">${t('Local calculations use fixed rules. A threshold being met is not a model-validated probability of success or proof of profit.','本地计算使用固定规则。达到阈值不是模型验证的成功概率，也不证明项目已经盈利。')}</p>
   </form>
   <div id="ty-result" class="ty-result" aria-live="polite" aria-label="${t('Scenario result','情景计算结果')}"><div class="ty-empty"><h3>${t('Your scenario will appear here','这里会显示你的试算')}</h3><p>${t('Load an example or complete the inputs, then calculate. Business results distinguish ongoing unit cost from setup cost and profit. Investment results show only a hypothetical position and planned loss.','载入示例或填写数据后点击计算。创业结果会区分持续单位成本、接入费用与利润；投资结果只显示假设仓位和计划损失。')}</p><p>${t('No live trade, customer payment or verified result has been recorded.','当前没有实际交易、客户付款或已验证结果。')}</p></div></div>
   <div class="ty-save" aria-label="${t('Keep or move your record','保留与转移记录')}">
    <p class="ty-note">${t('One local copy per browser. Save replaces that copy; import replaces only this tab’s draft. Export the current draft first if you want to keep it.','每个浏览器保留一个本机副本。保存会覆盖副本；导入只替换当前标签页草稿。如需保留当前草稿，请先导出备份。')}</p>
    <button id="save-local" type="button" class="secondary">${t('Save on this device','保存到本机')}</button>
    <button id="restore-local" type="button" class="secondary">${t('Restore local copy','恢复本机副本')}</button>
    <button id="export-json" type="button" class="secondary">${t('Export JSON','导出 JSON')}</button>
    <label class="ty-field" for="import-json"><span>${t('Import JSON backup','导入 JSON 备份')}</span><input id="import-json" type="file" accept="application/json,.json"></label>
    <button id="erase-local" type="button" class="secondary">${t('Delete local copy','删除本机副本')}</button>
    <button id="cloud-save" type="button" class="primary">${t('Open this record in cloud membership','带着记录查看云端会员')}</button>
    <p class="ty-note">${t('The member page opens a preview. Save there explicitly; opening it is not a cloud save or a purchase. Deleting a local copy does not delete exported files or cloud records.','会员页会打开预览，需在该页主动保存；打开不等于云端保存或购买。删除本机副本不会删除已导出的文件或云端记录。')}</p>
    <p id="ty-status" class="ty-status" role="status" aria-live="polite">${t('No scenario has been saved.','尚未保存验证记录。')}</p>
   </div>
  </div>
 </section>`;
 const evidence=`<section class="ty-evidence" data-marketing aria-labelledby="evidence-title"><h2 id="evidence-title">${t('Trace the evidence before trusting the conclusion','先核对依据，再相信结论')}</h2><p>${t('Tianya’s historical discussions are starting points for questions. The retained research snapshot is 2026-10-05, not a live feed or a newly updated prediction.','天涯旧帖为研究提供问题线索。当前保留的研究快照为 2026-10-05，不是实时数据，也不是本次重新生成的预测。')}</p>
  <div class="ty-table-wrap"><table><caption>${t('What the retained material does and does not establish','现有资料能说明什么，以及不能证明什么')}</caption><thead><tr><th scope="col">${t('Material','资料')}</th><th scope="col">${t('Current evidence status','当前证据状态')}</th><th scope="col">${t('How to use it','使用方式')}</th></tr></thead><tbody>
   <tr><th scope="row">${t('60 historical candidate statements','60 条历史候选判断')}</th><td>${t('All remain unknown under the strict evidence gate; they are not 60 successful forecasts.','严格证据核验下全部保留未知；不能当作 60 次预测命中。')}</td><td>${t('Read the source and identify missing evidence or counterexamples.','阅读来源，找出证据缺口与反例。')}</td></tr>
   <tr><th scope="row">${t('20 fixed forecast endpoints','20 个固定预测终点')}</th><td>${t('Original values were retained on 2026-10-05. This workbench does not automatically score future releases.','2026-10-05 固定原始数值。本工作台不会自动对未来发布值计分。')}</td><td>${t('Compare against the preserved baseline using the original timing and rules.','沿用原期限与规则，对照保留的基线核验。')}</td></tr>
   <tr><th scope="row">${t('Your scenario and review notes','你的情景与复查记录')}</th><td>${t('Inputs and observations are self-reported. Example calculations are not measured business results.','输入与观察由你填写。示例计算不等于实测经营结果。')}</td><td>${t('Keep a dated record, then attach real delivery, payment or market evidence yourself.','保留带日期记录，再自行补充真实交付、付款或市场证据。')}</td></tr>
  </tbody></table></div><div class="ty-actions"><a id="research-link" class="secondary" href="/zh/tianya-research">${t('Open the full research archive (Chinese)','查看完整研究资料库')}</a><a class="secondary" href="/tianya-research/practice-ledger.json" download>${t('Download the fixed forecast ledger','下载固定预测台账')}</a></div></section>`;
 const offer=`<section class="ty-offer" id="membership" data-marketing aria-labelledby="offer-title"><h2 id="offer-title">${t('Start free. Pay when you need cloud continuity.','先免费使用，需要跨设备延续时再付费。')}</h2><p class="ty-note">${t('Free account identity and paid cloud storage are separate. Neither comes with a promise of business income or investment return.','免费账号身份与付费云端存储分开；两者都不承诺创业收入或投资回报。')}</p>
  <article><h3>${t('Free workbench','免费验证工作台')}</h3><div class="ty-price">${t('Free','免费')}</div><ul><li>${t('Business cost, pricing and paper-position calculations.','创业成本、报价与模拟仓位计算。')}</li><li>${t('One copy on this device, plus JSON import and export.','本机副本，以及 JSON 导入导出。')}</li><li>${t('Access to the original research and its limitations.','查看原研究资料及其适用边界。')}</li><li>${t('Optional free AGI registration for community and Jarvis identity.','可选注册免费 AGI 账号，用于社区和贾维斯身份。')}</li></ul><a class="secondary" href="#workspace">${t('Use the free workbench','开始免费试算')}</a><p class="ty-note">${t('Registration alone does not activate cloud storage.','仅注册账号不会开通付费云端存储。')}</p></article>
  <article><h3>${t('Existing AGI cloud membership','现有 AGI 云端会员')}</h3><div class="ty-price">9 USDT <small>/ ${t('30 days','30 天')}</small></div><p>${t('Base price, plus the order-matching decimal and network fees. The member page checks current availability and the exact amount.','基础价，另加订单匹配小数与网络费用。会员页会检查当前可售状态与准确金额。')}</p><ul><li>${t('50 workspaces, with 10 versions per workspace.','50 个工作区，每区 10 个版本。')}</li><li>${t('64 KiB per version, 5 MiB total.','每版本 64 KiB，总计 5 MiB。')}</li><li>${t('A separate 64-character hexadecimal access key; keep a backup.','独立的 64 个十六进制字符访问密钥，务必备份。')}</li><li>${t('No automatic renewal and no extra AI allowance.','没有自动续费，不增加 AI 额度。')}</li></ul><a class="secondary" href="${members}" target="_blank" rel="noopener">${t('Check membership details','查看会员详情')}</a><p class="ty-note">${t('To bring a record, use the cloud button above. Review the preview and choose Save on the member page yourself.','携带记录请使用上方云端按钮，进入会员页复核预览后主动保存。')}</p></article>
 </section>`;
 const faq=`<section class="ty-faq" data-marketing aria-labelledby="faq-title"><h2 id="faq-title">${t('Before you start','开始前，你可能想知道')}</h2>${faqs.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}</section>`;
 const schema={'@context':'https://schema.org','@graph':[
  {'@type':'WebPage','@id':canonical+'#page',url:canonical,name:title,description,inLanguage:zh?'zh-Hans':'en',dateModified:'2026-10-31',isPartOf:{'@type':'WebSite',name:'AGI Scorecard',url:origin+'/'},mainEntity:{'@id':canonical+'#application'}},
  {'@type':'WebApplication','@id':canonical+'#application',name:t('Tianya Echo validation workbench','天涯回声验证工作台'),identifier:'tianya-validation',url:canonical,description,inLanguage:zh?'zh-Hans':'en',applicationCategory:'BusinessApplication',operatingSystem:'Web browser',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},featureList:t('Local business-cost scenarios; paper-position sizing; personal validation records; JSON export and import','本地创业成本试算；模拟仓位计算；个人验证记录；JSON 导入导出')},
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:t('AGI Scorecard','AGI 记分牌'),item:origin+home},{'@type':'ListItem',position:2,name:t('Tianya Echo','天涯回声'),item:canonical}]},
  {'@type':'FAQPage',mainEntity:faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
 ]};
 const html=`<!doctype html>
<html lang="${zh?'zh-Hans':'en'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff"><meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(title)} | AGI</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow"><meta name="ty-build" content="${release}">
<link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="${origin}/tianya"><link rel="alternate" hreflang="zh-Hans" href="${origin}/zh/tianya"><link rel="alternate" hreflang="x-default" href="${origin}/tianya">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:locale" content="${zh?'zh_CN':'en_US'}"><meta property="og:image" content="${origin}/tianya-assets/share.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${t('AGI Tianya Echo: sources, hypotheses, actions and reviews','AGI 天涯回声：来源、判断、行动与复查')}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${origin}/tianya-assets/share.png">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23002FA7'/%3E%3Ctext x='16' y='24' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='700' font-size='23'%3EA%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="/tianya-assets/style.css?v=${release}">${navAssets()}<script type="module" src="/tianya-assets/app.mjs?v=${release}"></script><script type="application/ld+json">${json(schema)}</script>
</head><body class="ty-page" data-lang="${lang}" data-product="tianya-validation" data-release="${release}">
${siteHeader(lang,{slug:'tianya',current:'tools'})}
<main id="main"><noscript><p class="ty-empty">${t('The research and membership information can be read without JavaScript. Enable JavaScript to calculate, save or export a personal record.','无需 JavaScript 即可阅读研究与会员说明。计算、保存和导出个人记录需要启用 JavaScript。')}</p></noscript>${hero}${workspace}${evidence}${offer}${faq}</main>
<footer class="ty-footer" data-marketing><p>${t('AGI Scorecard · Tianya Echo. Research snapshot: 2026-10-05.','AGI 记分牌 · 天涯回声。研究快照：2026-10-05。')}</p><nav aria-label="${t('Footer navigation','页脚导航')}"><a href="${prefix}/workbench">${t('More practical tools','更多实用工具')}</a><a href="${members}">${t('Cloud membership','云端会员')}</a><a href="/privacy">${t('Privacy','隐私政策（英文）')}</a></nav></footer>
</body></html>
`;
 const target=new URL(zh?'zh/tianya.html':'tianya.html',root);
 fs.mkdirSync(new URL('.',target),{recursive:true});
 fs.writeFileSync(target,html);
 written.push(target.pathname);
}
console.log(JSON.stringify({product:'tianya-validation',release,written}));
