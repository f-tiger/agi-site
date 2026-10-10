import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const ROOT='https://baipiaoji.com/manju/video-fit';
const field=(name,label,options,help='')=>`<label class="vf-field">${label}<select name="${name}">${options.map(([value,text])=>`<option value="${value}">${text}</option>`).join('')}</select>${help?`<small>${help}</small>`:''}</label>`;
const unknown=[['unknown','未确认']];
const checks=[
 ['opening','开头呈现什么',[...unknown,['result','先呈现结果'],['problem','先提出问题'],['conflict','先交代冲突'],['intro','先做背景介绍']]],
 ['proof','内容依据',[...unknown,['demo','真实演示'],['steps','可复现步骤'],['story','完整故事'],['opinion','个人观点'],['none','没有依据']]],
 ['captions','字幕可读性',[...unknown,['yes','已在手机上确认清楚'],['no','没有字幕或难读']]],
 ['audio','人声与音轨',[...unknown,['clear','已确认清楚'],['unclear','不清楚'],['not_applicable','不适用：无语音内容']]],
 ['rights','画面、音乐与素材权利',[...unknown,['confirmed','已确认可用于本次发布'],['uncertain','存在未解决的权利问题']]],
 ['ai','AI 生成内容标识',[...unknown,['labelled','涉及 AI，已准备按平台标识'],['unlabelled','涉及 AI，尚未标识'],['not_applicable','不适用：未使用 AI 生成内容']]],
 ['commercial','商业关系披露',[...unknown,['disclosed','涉及推广，已准备披露'],['undisclosed','涉及推广，尚未披露'],['not_applicable','不适用：无商业关系']]],
 ['claim','效果与事实表述',[...unknown,['supported','已有可核对依据'],['unsupported','有未获支持的效果或事实宣称'],['not_applicable','不适用：无此类宣称']]],
 ['destination','后续承接入口',[...unknown,['approved','已核实本账号获准使用'],['unverified','计划承接，但尚未核实'],['not_applicable','不适用：本条不设承接入口']]]
];
const faqs=[
 ['能判断视频会不会火吗？','不能。工具依据你提供的信息、本机读取的时长与尺寸、公开规则和编辑建议，给出可检验的发布假设。它没有平台推荐权重或账号私有数据，不提供爆款概率，也不保证通过审核。'],
 ['视频会上传或被 AI 理解吗？','不会。选择的视频仅在当前浏览器预览并读取时长、尺寸和文件大小，不上传，不识别画面、台词或内容质量。你填写的文字只在本页计算，本工具不主动保存；导出由你主动触发。统计仅记录固定操作，不包含文件名或输入内容。'],
 ['没有视频文件，只有草稿可以用吗？','可以。选择草稿模式，自行填写预计时长、画幅、受众和内容检查。未确认的信息保留为未确认；缺少关键资料时，工具列出需要补充的信息，不强行给出优先平台。500 MiB 是本工具的本机文件选择边界，不是平台上传限制。'],
 ['为什么不把六个平台排成一个分数榜？','不同平台、账号和内容的分发条件不同，不能用未经校准的统一分数比较。工具分别给出适配理由、修改建议和测试方式，最多列两个优先候选；证据不足或候选并列时，可以没有优先项。'],
 ['发布后怎样判断这一条是否有进步？','手工回填与本条目标一致的指标，并和同账号、同平台、同观察窗口、同流量类型、相近内容的历史中位数比较。样本较少时只作描述，基线为零时不计算增长百分比；一次变化不能证明因果或爆款。'],
 ['平台规则和编辑建议怎样区分？','报告将本机元数据、本人填写、编辑建议和官方规则分开标注。来源核查日期见下方；视频号官方规则全文本轮无法读取，需发布前自行核对当前后台，不将其视为已经审核通过。']
];
const statusText=status=>({official_fulltext:'官方全文已核查',official_search_fulltext:'官方搜索全文证据',official_search_fulltext_dynamic_page:'官方搜索全文；原页动态展示',official_search_indexed_text:'官方搜索索引证据',official_search_indexed_text_dynamic_page:'官方搜索索引；原页动态展示',official_search_indexed_text_direct_open_timeout:'官方搜索索引；原页读取超时',official_url_located_fulltext_inaccessible:'官方入口已定位，全文未读取',official_entry_requires_interactive_access:'官方后台入口，未登录核验'}[status]||'查看来源核查说明');
export function buildVideoFit({publish,page,write}){
 const rules=JSON.parse(readFileSync(new URL('../data/video-platforms.json',import.meta.url),'utf8'));
 const hash=file=>createHash('sha256').update(readFileSync(new URL('../assets/'+file,import.meta.url))).digest('hex').slice(0,12);
 const platforms=rules.platforms||[];
 const sourceMarkup=source=>`<li id="vf-source-${esc(source.id)}"><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a><p>${esc(source.summary)}</p><small>${esc(statusText(source.evidenceStatus))}；核查 ${esc(source.checkedAt||rules.checkedAt)}</small></li>`;
 const sourceHTML=`${rules.globalEvidence?`<h3>共同标识要求</h3><ul class="vf-sources">${sourceMarkup(rules.globalEvidence)}</ul>`:''}${platforms.map(p=>`<details class="vf-source-group"><summary>${esc(p.name)}：公开来源与人工核对</summary><ul class="vf-sources">${p.sources.map(sourceMarkup).join('')}</ul><h4>编辑建议，需用实际发布验证</h4><ul>${p.editorialRules.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p>发布前人工核对：${esc(p.humanChecks.join('；'))}。</p></details>`).join('')}`;
 const body=`<link rel="stylesheet" href="/video-fit.css?v=${hash('video-fit.css')}"><div id="vf-app" class="vf-app">
 <header class="vf-heading"><div><h1>视频发布前，先选一个测试方向</h1><p>比较抖音、快手、小红书、B站、视频号与头条，找到要改什么、怎样测。</p></div><a href="#vf-method">评估依据</a></header>
 <div class="vf-tool"><form id="vf-form" autocomplete="off" novalidate>
 <div class="vf-workbench"><section class="vf-material" aria-labelledby="vf-material-heading"><h2 id="vf-material-heading"><span>1</span> 选择素材</h2><fieldset class="vf-mode"><legend>素材状态</legend><label><input type="radio" name="mode" value="draft" checked> 只有草稿</label><label><input type="radio" name="mode" value="file"> 已有视频</label></fieldset>
 <div class="vf-preview-stage"><video id="vf-preview" controls playsinline preload="metadata" hidden aria-label="本机视频预览"></video><div id="vf-preview-empty"><svg viewBox="0 0 72 56" aria-hidden="true"><rect x="2" y="2" width="68" height="52" rx="7"/><path d="m30 18 16 10-16 10Z"/></svg><strong>在这里预览你的作品</strong><span>本机读取时长与尺寸，不上传文件</span></div></div>
 <label class="vf-file-label" for="vf-file">选择本机视频<input id="vf-file" type="file" accept="video/*"></label><p id="vf-media-status" class="vf-help" role="status">也可以直接填写草稿。文件上限 500 MiB；不会识别画面或台词。</p>
 <div class="vf-two"><label class="vf-field">时长（秒）<input name="durationSeconds" type="number" min="0.1" max="86400" step="0.1" placeholder="未确认"><small>草稿可填写；有视频时可留空使用实测值</small></label>${field('aspect','画幅',[...unknown,['vertical','竖屏'],['horizontal','横屏'],['square','方形']],'有视频时可使用实测尺寸')}</div></section>
 <section class="vf-brief" aria-labelledby="vf-brief-heading"><h2 id="vf-brief-heading"><span>2</span> 说明目的与受众</h2><div class="vf-two">${field('contentType','内容类型',[['general','通用视频'],['app','App／工具演示'],['drama','AI 漫剧／剧情'],['tutorial','教程／知识讲解']])}${field('goal','这条视频最想获得',[['views','有效观看'],['follow','新增关注'],['try','实际使用／激活']])}</div>
 <label class="vf-field">具体给谁看<input name="audience" maxlength="120" placeholder="例如：需要整理会议笔记的职场新人" autocomplete="off"><small>推荐需要明确受众；不填写联系人或个人敏感信息</small></label>
 <label class="vf-field">开头会发生什么<textarea name="hook" rows="2" maxlength="400" placeholder="写出开头画面或第一句话；没有确定可以留空"></textarea></label>
 <details class="vf-details"><summary>补充标题与主要内容 <span>可选</span></summary><label class="vf-field">视频标题<input name="title" maxlength="120" autocomplete="off" placeholder="拟发布的标题"></label><label class="vf-field">主要内容、收益或剧情冲突<textarea name="summary" rows="3" maxlength="1200" placeholder="只填你已确定的信息，工具不会自动理解视频内容"></textarea></label></details>
 <h2 class="vf-check-heading"><span>3</span> 检查发布准备</h2><details id="vf-checks" class="vf-details vf-checks"><summary>展开内容与权利检查 <span id="vf-unknown-count">9 项未确认</span></summary><p class="vf-help">逐项按实际情况填写。“不适用”需主动选择；自报确认不等于平台审核通过。</p><div class="vf-two">${checks.map(args=>field(...args)).join('')}</div></details>
 <p class="vf-help">未确认也可生成待办。不会给出爆款概率；信息不足时不指定优先平台。</p><div class="vf-actions"><button id="vf-evaluate" type="submit" class="vf-primary" disabled>生成评估与测试方案</button><button id="vf-example" type="button">试用示例</button><button id="vf-reset" type="button">清空</button></div><p id="vf-status" class="vf-status" role="status" aria-live="polite"></p>
 </section></div></form><noscript><p>本机评估需要启用 JavaScript；下方方法与官方来源可直接阅读。</p></noscript></div>
 <section id="vf-result" class="vf-report" hidden aria-label="评估报告" tabindex="-1"></section>
 <div id="vf-report-actions" class="vf-actions" hidden><button id="vf-export" type="button" disabled>下载文字报告</button><button id="vf-copy" type="button" disabled>复制报告</button><span id="vf-export-status" role="status"></span></div>
 <details class="vf-performance"><summary>已经发布？回填实际表现</summary><p>用本条视频与可比历史中位数比较。没有数据留空，不填 0；本页不连接平台账号，也不保存输入。</p>
 <form id="vf-performance-form" autocomplete="off" novalidate><div class="vf-three">${field('goal','本条目标',[['views','有效观看'],['follow','新增关注'],['try','实际使用／激活']])}${field('platform','实际发布平台',platforms.map(p=>[p.id,p.name]))}${field('window','统一观察窗口',[['24h','发布后 24 小时'],['72h','发布后 72 小时'],['7d','发布后 7 天']])}${field('metric','本次比较指标',[['views','播放量'],['follows','新增关注数'],['activations','实际激活数']])}<label class="vf-field">本条数值<input name="current" type="number" min="0" max="1000000000000" step="1" placeholder="留空表示缺少数据"></label><label class="vf-field">历史中位数<input name="baseline" type="number" min="0" max="1000000000000" step="any" placeholder="使用同一指标"></label><label class="vf-field">历史样本条数<input name="baselineCount" type="number" min="1" max="10000" step="1" placeholder="用于中位数的作品数量"></label></div>
 <fieldset class="vf-match"><legend>逐项确认可比条件（全部符合才比较）</legend>${[['accountMatch','同一个账号'],['platformMatch','同一个平台、同一指标口径'],['windowMatch','相同观察窗口'],['trafficMatch','相同自然／付费流量类型'],['contentMatch','相近题材、形式与时长']].map(([name,label])=>`<label><input type="checkbox" name="${name}"> ${label}</label>`).join('')}</fieldset><button id="vf-compare" type="submit" disabled>比较实际表现</button><div id="vf-performance-result" role="status" aria-live="polite"></div></form></details>
 <section id="vf-method" class="vf-method"><h2>方法、边界与公开来源</h2><p>这是一款免费的发布准备工具。先比较内容版本与平台适配，再用真实结果验证。编辑建议不等于平台算法；24 小时、72 小时与 7 天是本工具提供的观察窗口，不是官方流量周期。不建议用重复上传、删后重发刷样本。</p><p>来源核查：${esc(rules.checkedAt)}。<a href="/manju/video-fit.md">阅读文字版方法</a> · <a href="/manju/video-fit.json">公开规则 JSON</a>。这些公开资料不包含你的评估报告。</p><div class="vf-faq">${faqs.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>${sourceHTML}</section></div>
 <script type="application/json" id="video-fit-rules">${JSON.stringify(rules).replaceAll('<','\\u003c')}</script><script type="module" src="/video-fit.js?v=${hash('video-fit.js')}"></script>`;
 publish('video-fit',page({title:'视频发布评估工具：平台适配、内容修改与发布测试',description:'免费在本机评估通用视频、App演示和AI漫剧，比较抖音、快手、小红书、B站、视频号、头条的发布准备，生成修改待办与测试方案；不预测爆款，不上传文件。',path:'video-fit',alternates:true,body,schema:[{'@context':'https://schema.org','@type':'WebApplication',name:'帧选视频发布评估工具',url:ROOT,applicationCategory:'MultimediaApplication',operatingSystem:'Web browser',inLanguage:'zh-Hans',description:'基于本人填写的信息、本机媒体元数据和公开规则，生成平台适配检查与发布测试方案，不预测爆款。',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'CNY'},dateModified:rules.checkedAt},{'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}]}));
 const publicData={name:'帧选视频发布评估工具',url:ROOT,description:'本机发布准备与实验工具，不预测爆款或保证审核。',...rules,faq:faqs.map(([question,answer])=>({question,answer}))};
 write('manju/video-fit.json',JSON.stringify(publicData,null,2));
 write('manju/video-fit.md',`# 帧选视频发布评估工具\n\n${ROOT}\n\n核查日期：${rules.checkedAt}。免费、本机计算，不上传视频，不自动理解视频内容，不预测爆款。\n\n## 使用步骤\n\n1. 选择本机视频或填写草稿时长与画幅。\n2. 说明受众、目标与内容。\n3. 确认内容和权利检查；缺项保留未确认。\n4. 按各平台建议测试，再手工回填可比的实际表现。\n\n## 常见问题\n\n${faqs.map(([q,a])=>`### ${q}\n\n${a}`).join('\n\n')}\n\n## 公开来源与编辑建议\n\n${rules.globalEvidence?`[${rules.globalEvidence.title}](${rules.globalEvidence.url})：${rules.globalEvidence.summary}\n\n`:''}${platforms.map(p=>`### ${p.name}\n\n${p.sources.map(s=>`- [${s.title}](${s.url})：${s.summary}（${statusText(s.evidenceStatus)}；核查 ${s.checkedAt||rules.checkedAt}）`).join('\n')}\n\n编辑建议，需实际验证：\n${p.editorialRules.map(x=>'- '+x).join('\n')}\n\n人工核对：${p.humanChecks.join('；')}。`).join('\n\n')}\n`);
}
