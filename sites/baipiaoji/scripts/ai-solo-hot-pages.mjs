import {readFileSync} from 'node:fs';
import {publicURL} from './ai-solo-hot.mjs';

// Launch observations are published separately from reviewed commercial evidence.
export function buildHotPages({render,write,BASE,zh,esc,snapshot}) {
 const data=snapshot??JSON.parse(readFileSync(new URL('../data/ai-solo-hot.json',import.meta.url),'utf8'));
 const t=(a,b)=>zh?a:b,root=BASE+'/ai-solo/',origin=BASE.replace(/\/en$/,''),total=data.sources.reduce((n,s)=>n+s.items.length,0);
 const date=value=>value?esc(new Date(value).toISOString().replace('T',' ').slice(0,16)+' UTC'):t('尚无成功采样','No successful sample');
 const signed=n=>n>0?'+'+n:String(n);
 const external=(url,label)=>publicURL(url)?`<a href="${esc(publicURL(url))}" target="_blank" rel="noopener noreferrer" data-solo-event="source-open">${label}</a>`:label;
 const movement=(item,hn)=>!item.comparisonDate?t('首次基线；有跨日采样后显示变化。','Baseline sample; changes require a later sampling day.'):
  !item.seenBefore?t('相对 '+item.comparisonDate+' 采样首次出现；不代表刚成立。','New to the sample since '+item.comparisonDate+'; not necessarily a new business.'):
  hn?t('对照 '+item.comparisonDate+'：票数 '+signed(item.pointsChange)+'，排名 '+signed(item.rankChange)+'（正值为上升）。','Since '+item.comparisonDate+': votes '+signed(item.pointsChange)+', rank '+signed(item.rankChange)+' (positive means up).'):
  t('在 '+item.comparisonDate+' 采样中也出现过。','Also observed in the '+item.comparisonDate+' sample.');
 const sections=data.sources.map(source=>{
  const hn=source.id==='hn',failed=source.status!=='ok',stale=!source.observedAt||Date.now()-Date.parse(source.observedAt)>48*3600000;
  const cards=source.items.map(item=>`<article class="solo-card solo-hot-card" data-hot-item="${esc(item.id)}" data-hot-source="${esc(source.id)}" data-hot-ai="${item.aiSignal?'1':'0'}" data-hot-consumer="${item.consumerSignal?'1':'0'}">
   <p class="solo-outcome">${hn?'#'+item.rank+' · '+t('HN 采样内排序','Rank within HN sample'):t('新发布观察','Launch observation')}</p>
   <div data-source-original><h3>${external(item.sourceUrl,esc(item.title))}</h3>${item.summary?`<p>${esc(item.summary)}</p>`:''}</div>
   <p class="solo-hot-metrics">${hn?t(item.points+' 票 · '+item.comments+' 条评论',item.points+' votes · '+item.comments+' comments'):t('订阅源未提供票数或排名','Feed does not supply votes or ranks')}</p>
   <p class="solo-note">${t('原帖发布时间：','Source published: ')}${date(item.publishedAt)}</p>
   <p>${esc(movement(item,hn))}</p>
   <p class="solo-hot-tags">${item.consumerSignal?`<span>${t('消费场景词命中','Consumer keyword match')}</span>`:''}${item.aiSignal?`<span>${t('AI 词命中','AI keyword match')}</span>`:''}<span>${t('商业结果待核实','Commercial outcome unverified')}</span></p>
   <div class="solo-actions">${external(item.sourceUrl,t('查看讨论／发布来源','Read discussion / launch'))}${hn&&item.url&&item.url!==item.sourceUrl?external(item.url,t('打开项目','Open project')):''}</div>
  </article>`).join('');
  return `<section class="solo-section" data-hot-section="${esc(source.id)}">
   <header class="solo-hot-source"><h2>${hn?t('Show HN · 讨论热度','Show HN · discussion signals'):t('Product Hunt · 新发布','Product Hunt · new launches')}</h2>
   <p>${hn?t('最近 7 天的 Show HN 投稿，按票数降序、评论数打破同票；本轮最多取 100 条。排名仅针对这份采样，不是全网创业项目排名。','Show HN submissions from the last 7 days, ordered by votes with comments as the tie-breaker; at most 100 per sample. Ranks describe this sample, not the entire startup market.'):
    t('读取公开 Atom 订阅源，保留最近 7 天内最多 30 条，按发布时间倒序。这是发布观察，不是票数热榜。','Public Atom feed: up to 30 entries published within 7 days, newest first. This is a launch feed, not a voting leaderboard.')}</p>
   <p class="solo-note">${t('成功采样：','Last successful sample: ')}<time data-hot-observed="${esc(source.observedAt||'')}">${date(source.observedAt)}</time><br>${t('最近尝试：','Last attempt: ')}${date(source.lastAttemptAt)}${hn&&source.available!==null?'<br>'+t('接口返回窗口内投稿总数 '+source.available+'；此处保留 '+source.items.length+' 条。','API reports '+source.available+' submissions in the window; '+source.items.length+' retained here.'):''}</p>
   ${failed?`<p class="solo-hot-warning" role="status">${t('最近一次读取未完成；下方保留上次成功数据，时间没有刷新。','The latest read failed. Any items below retain their last successful observation time.')}</p>`:''}
   <p class="solo-hot-warning" data-hot-stale${stale?'':' hidden'}>${t('尚无采样，或成功采样已超过 48 小时。请以原始来源为准，等待下轮更新。','No successful sample, or the latest one is over 48 hours old. Check the source while awaiting the next update.')}</p>
   <p>${external(source.sourceUrl,t('查看公开数据来源','Open public source'))} · <span data-hot-source-count>${source.items.length}</span> ${t('条显示','shown')}</p></header>
   <div class="solo-grid">${cards}</div>
   ${!source.items.length?`<p>${t('没有可展示的成功采样，请查看原始来源。','No successful sample to show; open the original source.')}</p>`:''}
  </section>`;
 }).join('');
 write('ai-solo-hot.json',JSON.stringify(data,null,2)+'\n');
 render('/ai-solo/hot/',t('创业热度雷达：每日项目发布与讨论变化','Startup radar: daily launches and discussion changes'),t('每天观察 Show HN 与 Product Hunt，优先筛选消费小应用线索，保留来源、采样时间及跨日变化。','Daily Show HN and Product Hunt observations, with consumer-app keyword filters, sources, sampling times and changes between days.'),`
  <header><p class="solo-outcome">${t('每天更新 · 公开来源 · 免费阅读','Daily updates · public sources · free to read')}</p><h1>${t('发现正在被讨论的<br>下一个小项目。','Find the next small project<br>people are talking about.')}</h1>
  <p class="solo-intro">${t('先看新项目和讨论信号，再查团队、客户与付款证据。消费场景词筛选默认开启，帮助独立开发者寻找值得研究的小应用。','Start with new projects and discussion signals, then investigate teams, customers and payments. Consumer keyword filtering starts on to help independent founders find small-app leads.')}</p>
  <p>${total} ${t('条来源记录；同一项目可能在不同平台重复。每天更新一次，调度可能延迟，并非实时监控。','source records; a project may appear on multiple platforms. Updates run once a day and may be delayed, not in real time.')}</p></header>
  <details class="solo-focus"><summary>${t('热度与商业成败如何区分？查看采样口径','How do popularity and commercial results differ? Read the sampling method')}</summary><p>${t('点赞和发布不能证明赚到钱。这里的团队人数、实际 AI 能力和商业结果均未核实；不会自动进入成功／失败案例库或神经网络训练。消费词和 AI 词只匹配标题、简介，可能漏选或误选，AI 也可能仅用于制作过程。','Votes and launches do not establish revenue. Team size, actual AI capability and commercial outcomes are unverified; these records do not automatically enter the success/failure corpus or neural training. Consumer and AI filters only match title/summary words and can miss or misclassify projects; AI may refer only to the build process.')}</p>
  <p>${t('HN 与 Product Hunt 分开展示，不混算热度。先到先得的曝光、推广和平台人群会影响票数；掉出 7 天窗口或排名下降不等于商业失败。','HN and Product Hunt stay separate with no combined popularity score. Age, promotion and platform audiences affect votes; leaving the 7-day window or losing rank is not commercial failure.')}</p></details>
  <section class="solo-search" data-solo-hot><div class="solo-filters">
   <label>${t('优先研究方向','Research focus')}<select id="hot-focus"><option value="consumer" selected>${t('消费场景词','Consumer keywords')}</option><option value="consumer-ai">${t('消费场景词 + AI 词','Consumer + AI keywords')}</option><option value="ai">${t('AI 词','AI keywords')}</option><option value="all">${t('全部项目','All projects')}</option></select></label>
   <label>${t('来源','Source')}<select id="hot-source"><option value="all">${t('全部来源','All sources')}</option><option value="hn">Show HN</option><option value="ph">Product Hunt</option></select></label><button id="hot-reset" type="button">${t('清空筛选，看全部','Reset and show all')}</button></div>
   <p id="hot-count" aria-live="polite">${total} ${t('条记录；启用脚本后应用默认筛选','records; the default filter applies with JavaScript')}</p>
   <p id="hot-empty" class="solo-empty" hidden>${t('本轮没有命中此筛选的项目；可清空筛选查看全部。这不代表没有相关市场。','No projects match this filter in the current sample. Reset to view all; this does not mean the market is absent.')}</p></section>
  ${sections}
  <noscript><p>${t('脚本关闭时显示全部来源记录，来源链接仍可使用。','Without JavaScript, all source records and links remain available.')}</p></noscript>
  <section class="solo-section"><h2>${t('把观察变成可验证的创业判断','Turn an observation into a testable business judgment')}</h2><ol>
   <li>${t('打开原始讨论，找具体使用者、使用频次与抱怨，区分作者宣传和用户反馈。','Read the original discussion for actual users, frequency and complaints; separate maker claims from user feedback.')}</li>
   <li>${t('核实谁在做、如何收费、是否有真实付款，再与同任务的成功和失败案例对照。','Verify the team, pricing and actual payments, then compare reviewed successes and failures for the same job.')}</li>
   <li>${t('在咨询 Agent 中描述自己的客户、技能和成本，制定小规模验证计划。热榜项目的未经核实主张不会作为指导依据。','Describe your customers, skills and costs to the consulting Agent to plan a small test. Unreviewed launch claims are not guidance evidence.')}</li></ol>
   <div class="solo-actions"><a href="${root}categories/?audience=consumer&amp;scope=non-company">${t('消费小应用案例','Reviewed consumer-app cases')}</a><a href="${root}agent/">${t('生成验证计划','Build a validation plan')}</a><a href="${origin}/ai-solo-hot.json">${t('热度采样与历史 JSON','Observations & history JSON')}</a></div>
   <p class="solo-note">${t('保留最近 14 个采样日的来源快照；跨日变化对照最近一次不同日期的成功采样。第一天只建立基线，同日重跑不会伪造每日涨幅。','Up to 14 calendar days of source snapshots are retained. Changes compare with the latest successful sample from a different day. The first day establishes a baseline; same-day reruns do not invent daily growth.')}</p></section>`,{active:'hot/'});
}
