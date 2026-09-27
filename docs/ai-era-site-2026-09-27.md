# 「AI 时代站点」第五轮:AI 读得多、送得少,页型规律没有找到(2026-09-27)

owner 原话:「ai时代站点继续探索」。

这是同一主题的第五轮(09-12 信任层 + 飞轮仪表 → 09-25 创业楔子 = 预测记录 → 09-26/27 共识板、OTS 锚定、
评分者共识、承诺-揭示账本)。本文只回答一个前几轮没问过的问题:**AI 到底怎样和这个舰队打交道,
以及它会不会因为页面长成某种样子就多送人来。** 数字全部为 2026-09-27 现查(Cloudflare D1 直读),
每处注明是 JS 表还是服务端表;外部数字逐条带来源与发布日期,只收研究员实际抓取核对过的条目。

**本文经过两轮对抗审查。** 第一轮三位审查员推翻了草稿结论(「AI 只把人送到清单页和实操页」);
第二轮(合并前)三位审查员又抓出了第一版改写里的过头说法、一条不是赌注的判定线和一处换了分母的更正。
下文是两轮修正后的版本,关键数字都由本会话用 D1 或 git 快照独立复核过。

## 一、三轮 prompt

**第 1 轮(字面)**:「AI 时代站点继续探索。」
问题:四轮已经建了信任层、仪表、共识板、OTS、评分者面板。没有新问题的「继续」,要么重开已杀的形态
(新站、聊天机器人、AI 生成内容、市场),要么再加一个没人用的面。不可执行。

**第 2 轮(从今天的数据出题)**:AI 和舰队有三种关系——**读**我们(agi 八月 Copilot 引用 564 次)、
**替人读**(用户触发的抓取)、**把人送来**(引荐,仪器 78 → 59/28d)。查清 AI 把人送到哪种页、只读不送的是哪种页、
为什么在掉。问题:还是没有交付物、验收标准和决策规则。

**第 3 轮(执行版)**:把三种 AI 读者的普查变成舰队第五份 AI 时代结论,并据此只动一次。
输入:三站 AI 引荐落地页、全部 ua_audit 站 28 天用户触发抓取、agi 活数字胶囊点击、`fleet-ai-referrals.json`、
agi 八月 Bing AI Performance、外部带日期证据。做:①落地页普查 + 书面页型标准 + 每行带 n;②10-24 线预读,阈值不动;
③一次读数 ≈0 的东西不建仪表;④只登记 t0 不满足、结算读得出来的判定线;⑤最多一个动作,只在过三门与站规时做;
⑥更新舰队与 agi 手册。不做:新站/子域、聊天机器人、AI 生成内容、爬虫收费、改 10-24 阈值、
动 bpj/eco 正在被别的会话并发修改的内容。

## 二、三种 AI 读者:今天的读数

| 关系 | 读数 | 口径与出处 |
|---|---|---|
| **读**(引用) | agi 564 次 / 30 天,前十页 502 次,全是英文定义/现状/对比页 | Bing Webmaster AI Performance 截图,Microsoft Copilots & Partners,窗口至 **2026-08-16**(Bing 标注为抽样),`sites/agiscorecard/analytics-notes.md`;**已陈旧 6 周**;bpj/eco 从没有过引用数据 |
| **替人读**(用户触发抓取) | agi:Claude-User **29**(25 次带 claude-code UA,版本 2.1.141–2.1.281,本会话是 2.1.283;4 次是裸「Claude-User」)、Perplexity-User 1、**ChatGPT-User 0**、Google-NotebookLM 2(被判成 human);gamesledger Claude-User 4(均为 claude-code);eco、SR、gridlings、goldrush、after35 组 **0** | D1 `ua_audit`,08-30→09-27 |
| **送**(引荐) | 三站自有数据起(bpj 08-03、agi/eco 08-05):agi **36**、bpj **45**、eco **43**(JS 口径);舰队仪器 28 天:09-13 **78** → 09-23 **59** → 09-24 58 → 09-26 渠道构成快照 56 | D1 agi `events` / bpj `hits` / eco `ev`;`data/fleet-ai-referrals.json` 历次快照(09-25、09-26 两份 ok:false,不能读) |

**「替人读」不建仪表**:agi 之外只有 gamesledger 4 次(全是 claude-code),agi 的 29 次里 25 次是 claude-code,
很可能大部分是舰队自己的会话;而 ChatGPT 08-05→09-22 送 eco 28 次,同窗 ChatGPT-User 0——用户触发抓取既不跟引用走,
也不跟点击走,量它主要是在量我们自己。

## 三、AI 把人送到哪:页型规律没有找到

### 3.1 普查(三站自有数据起算约 53 天,DuckDuckGo 不计)

分类员读每一页的源码按五类贴标签,合计 123 次(agi 读服务端 `pageviews`,bpj/eco 读 JS 表):清单/对比 38、实操 35、
定义/判定 25、首页/关于 12、其他 13(其他 = bpj 单工具卡)。草稿据此写了「AI 只把人送到清单页和实操页,判定页在聊天里答完」。

### 3.2 为什么撤回,以及撤回之后能说什么

1. **三站的 AI 份额都是个位数,差别不跟页型走。** AI 引荐占外部到达(有 referrer 且非本站),D1 JS 口径:
   agi **36/419 = 8.6%**(剔除 claude.ai 后 24/419 = 5.7%)、bpj **45/580 = 7.8%**、eco **43/514 = 8.4%**;
   09-26 渠道构成快照(pulse 口径,agi 为服务端计数):agi 3.6%、bpj 5.1%、eco 7.0%。**口径与窗口不同,数就不同,
   区间是 3.6–8.6%。** 三站的主力页型完全不同(判定 / 清单 / 实操),份额的排序却随口径变,看不出页型效应。
2. **agi 站内,判定页不比清单页少。** agi 是唯一站内两种页型都有的站:判定/定义页 16 次分布在 10 个路径,
   清单/对比页 9 次分布在 5 个路径(服务端表)。按外部到达(JS 表):`/when-will-agi-arrive` 76 次里 AI 4 次;
   普查里那 10 个判定/定义页合计 80 次里 AI 14 次——这 10 页是因为有过 AI 点击才入选的(按因变量选样),
   **只能说判定页不比清单页差,不能说更好**。
3. **bpj 站内,读法取决于分母。** 按页数:`/tools/` 约 442 页 13 次、`/vs/` 约 444 页 9 次,每页一样少;
   按外部到达份额:`/vs/` 9/11 = 82%、`/c/` 20/87 = 23%、`/tools/` 13/416 = 3%——差别来自工具页有大量搜索流量。
   也就是说,**在 bpj 页面层面,AI 与搜索的落点并不一样**(对比页几乎只有 Perplexity 来客),但 `/vs/` 的 9 次只是约
   8 个访问日,最后一次在 08-30。样本太小,两个方向都不能写成规则。
4. **整个图景由两页撑着。** eco 翻窗便携空调 EN+DE 一对占 eco 43 次里的 24 次(ChatGPT 23 次 = 20 个访问日、13 个国家,
   整个数据集里唯一稳健的信号);bpj `/c/api` 11 次 = 7 个访问日(CN 4 天、US/DE/IN 各 1 天)。拿掉这两页,
   剩下的每页至多 3–5 个访问日(如 bpj `/en/c/image` 5 个、agi `/when-will-agi-arrive` 3 个)。
5. **页型与站点完全混杂。** 按标准,实操只可能出现在 eco,清单几乎只在 bpj——跨站比较页型其实是在比较站点。
6. **计数单位是 hit 不是人。** bpj `/en/c/image` 5 次全部来自加拿大、分布在 5 天;agi 首页的 claude.ai 在服务端表是 6 次 / 5 天,
   JS 表是 8 次 / 7 天,全部来自同一国家。以后一律按访问日(path×day×country)数,与 eco 09-22 起的 btu_calc 做法一致。
7. **外部证据也不支持「清单页拿 AI 点击」。** Seer 的数据里对比类查询 95.4% 出 AI 摘要、问题类 85.9%——对比恰恰是最常被
   原地答完的一类;研究员**没有找到任何一手研究按内容类型拆分 AI 聊天的点击率**。

**能说的只有**:约 53 天里 AI 占三站外部到达的个位数百分比,大约 60 人;两页贡献了大部分,它们的共同点是**读者的下一步
必须在站外完成**(去领 API key、去买密封条)——审查员称之为「交接型页面」。这只是**两页的样本内观察**,不是规律,
本轮**不登记**检验它的判定线(理由见 §七)。

### 3.3 claude.ai 只出现在 agi

claude.ai 引荐(JS 表):agi 36 次里 **12** 次,bpj 0,eco 0。舰队是在 claude.ai/code 里运营的,在那里点链接会带这个
referrer;agi 首页的 claude.ai 访问全部来自同一国家。分不开是读者还是我们自己——**不剔除**(所有已登记判定线都按合计写),
但从今天起**单列**:`ai_referrals.py` 每站多 `ai_ref_claude_ai`,快照多 `fleet_ai_ref_claude_ai` / `fleet_ai_ref_excl_claude_ai`,
需求摘要逐日写出。

### 3.4 下降是真的,原因没查

三站 D1 JS 口径,两段不重叠的 10 天:08-16..08-25 共 **35** 次(30 个访问日)对 09-13..09-22 共 **17** 次(16 个访问日),
z≈2.5(按访问日 ≈2.1)——**下降在统计上站得住**。分站看全在 bpj(13 → 5 个访问日)与 eco(12 → 4),agi 持平(5 → 7);
eco 仪器读数 09-13 为 25、09-23 为 15。季节(eco 空调季结束)、老化(bpj 八月的 Perplexity 批次滑出窗口)、
09-24/25/26 的 D1 写入缺口,三个解释**都没有检验**。(第一版写「78 对 59 重叠 18 天、z≈1.6、未确立」是算错了:
重叠部分在差值里互相抵消,正确算法下显著性更高。)

## 四、外部证据(研究员逐条抓取核对;完整英文原表见附录)

| 来源(日期) | 读数 |
|---|---|
| Pew Research(2025-07-22) | 谷歌 AI 摘要里的链接只在 **1%** 的访问中被点;有摘要时传统结果点击 8%、无摘要 15%(900 名美国成年人、68 879 次搜索) |
| Semrush(2025-07-30) | Google AI Mode **92–94%** 会话零点击(6 900 万会话) |
| Ahrefs(2026-02-04) | 有 AI 摘要时第一名 CTR 低 **58%**(30 万关键词) |
| Seer Interactive(2026-04-24) | 被 AI 摘要引用比不被引用多 **+120%** 点击,但仍比没有摘要低 38%;对比类查询 95.4%、问题类 85.9% 出摘要,交易类 5% |
| Cloudflare(2025-08-28) | 抓取:引荐比 Anthropic ~50 000:1、OpenAI 887:1、Perplexity 118:1(全行业,2025-08 第一周) |
| TollBit via The Register(2026-02-04,二手报道) | AI 应用到出版商站的点击率 2025Q2 **0.8% → Q4 0.27%**;有授权协议的站 1.33%。**报道没有给分母**(抓取、机器人访问、引用还是展示都没说) |
| Similarweb(2026-05-25、07-29) | ChatGPT **2026-05-07 起把品牌名做成可点链接**,落首页的 ChatGPT 引荐份额从 26–32% 升到 **~60%**,此后维持 62–63% |
| SE Ranking(2026-06-18、07-09) | AI 引荐占网站流量 0.32%;ChatGPT 占 AI 引荐 74.78%;**60%** 的 AI 引荐落在首页(自然搜索 17%) |
| Microsoft Bing(2026-02-10、06-16) | AI Performance 报告 2026-02 首发即含引用数、被引页与 **Grounding Queries(AI 检索本站用的查询)**;2026-06 加 Intents / Topics / Citation Share / Compare;**没有官方 API**(Microsoft Q&A 2026-02-19,非官方回答) |
| Microsoft Clarity(2025-11-06) / Adobe via Digital Commerce 360(2026-06-17,二手) / Kaiser & Schulze, Marketing Science(2026-04-21) | AI 访客转化:Clarity 与 Adobe 说更高;唯一同行评审研究(973 个电商站)说 ChatGPT 转化只高于付费社交——**结论不一致** |

## 五、裁定:「AI 时代的站点」对本舰队意味着什么

1. **引用变成点击的比例很小。** agi:564 次引用的窗口里有 D1 数据的 08-05→08-16,Copilot 送来 0 人;Copilot 引荐全部在
   08-18 之后,共 3 个访问日(JS 5 次 / 服务端 4 次)。窗口不重叠,只能说 <1% 量级,与 TollBit 报道的 AI 应用点击率
   (0.27%,分母未公开,且一年内从 0.8% 降下来)同一量级——**不是同一个比率,也不是固定比率**。能确定的是:
   agi 的判定页并不比清单页更「零点击」,要更多 AI 点击,先得有更多引用。
2. **AI 引荐的量级跟着站的总发现面。** 三站 AI 份额都是个位数(3.6–8.6%,随口径变),所以 AI 引荐的绝对数大体随外部到达走;
   但页面层面 AI 与搜索的落点不一定一样(bpj `/vs/`),样本太小。ChatGPT 搜索结果与 Bing 大量重合
   (约 73%,舰队 08-16 旧记录),Copilot 基于 Bing——Bing 收录仍是 AI 读者面的地基。
3. **行业里最大的一股 AI 引荐,舰队结构上拿不到。** ChatGPT 5 月起按**品牌名**送人到首页(~60%);舰队 53 天里 ChatGPT
   送到首页:agi 1、bpj 1、eco 0。品牌要先是模型认得的**实体**,这来自第三方提及,是慢变量,而且机器永不外联
   (09-16 外链方案:entity stacking 是 Foundation 期该做的两件事之一,下一步在 owner 侧建真实档案,sameAs 不许编)。
4. **所以没有找到一条独立于发现面、可由页面技巧拉动的 AI 捷径。** 本舰队的 AI 时代资产仍是 09-12 定下的那两件:
   **可核的信任层**(让被引用的东西站得住)与**被引用的量**。`fleet-ai-referrals-1024` 照现速几乎必输,输了就照原文执行
   「AI 读者面只维护不扩建」,不再以「AI 时代」为由单独开工。

## 六、做了什么 / 不做什么

**做了(零新 cron、零 worker 改动、零新增 D1 常规读取)**
- `tools/fleet/ai_referrals.py`:claude.ai 单列(每站 `ai_ref_claude_ai`,快照 `fleet_ai_ref_claude_ai` /
  `fleet_ai_ref_excl_claude_ai`),合计抽成纯函数 `fleet_totals()`,新增五条自检(含接线),变异测试确认能红;合计口径不动。
  heartbeat 的 `airef` 步先跑自检,自检红不挡取数,步骤末尾才判红。
- `tools/fleet/demand_digest.py`:AI 节多两行——claude.ai 占多少、AI 占外部到达的份额(读渠道构成快照,**注明是 pulse 口径**)。
- 台账:`fleet-ai-referrals-1024` 预读(阈值与原文都不动)+ 结算读法 `reading_rule_2026-09-27`(照字面结算,但必须逐站披露
  访问日与日期数);`fleet-ai-landing-shape-1026` 登记后**在窗口开始前撤回**(status withdrawn,理由写在行里)。
- 手册对齐:agi CLAUDE.md 与 `citation-growth` 技能里活数字胶囊的理由改为「可审计 = 信任元素」,引用 08-30 已结的 0
  (**不删任何胶囊,不立新规**);bpj CLAUDE.md 第 18 条 ② 追加双口径补注(原文保留,不判对错);根 CLAUDE.md 09-12 节原位注记。
- `sites/baipiaoji/scripts/ad-configure.mjs`:付款同步失败时打印原因(先前被吞掉,当天 bpj 定时部署红了看不出原因),
  打印前把 Bearer 值、钱包形状和长 token 形状的串打码。

**不做(审查员否决,理由记死)**
- **eco 冬季英文实操页**:已经存在——`/en/guide/tilt-and-turn-windows-winter-condensation` + DE 孪生页,09-15 建,
  判定线 `eco-ai-twin-1013`(另有 `eco-es-winter-en-1116`、`eco-it-winter-en-0115`);再建一页会污染它的检验。
- **bpj `/en/c/api` 对齐**:早已对齐(同 23 个工具、同一张核实上限表);中文页的 ChatGPT 访客是语言与引用选择造成的。
- **`ai_landing` 进 `/api/pulse`**:每站每路径 1–2 次是噪声;每个 pulse 多一次窗口扫描正是 09-25 D1 额度事故的形状;
  人类 pv 行从不删除,任何窗口都能事后用一条 SQL 重建(今天实测 agi 22.9k / bpj 0.4k / eco 1.8k rows_read)。
- **12 个 worker 的用户触发抓取仪表**:agi 之外只有 gamesledger 4 次,且都是 claude-code。
- **Google-NotebookLM 改判为 bot**:2 次,属 `bot_ua.txt` 的同步流程,复现再议。

## 七、判定线

- **`fleet-ai-referrals-1024`**(预读,阈值与原文都不动):最近完整读数 59 / 58 / 56,≥156 需要约 2.6–2.8 倍。
  第一版曾把「0 站转正」收紧为「≥3 个访问日且 ≥2 个日期」——**撤回**:引用的两个先例都是原口径在 t0 已被非目标类别满足
  (自检、重放器、品牌导航、爬虫),这里原口径在 t0 并未满足,收紧的是目标事件本身,是移动球门。改为照字面结算,但 reading
  必须逐站写出访问日数、日期数与来源 host;「字面赢、实质单次点击」要写明,且不得据此做超出 win 分支的扩建。
- **`fleet-ai-landing-shape-1026`**(登记后撤回):①标签只贴了已有 AI 点击的页,用前半窗贴标签去算后半窗,一半访问日落在
  未标注页,结算只会是 insufficient;②bpj 模板规则自动计分几百页,agi/eco 只有列出的路径能计分,偏向判赢;③输分支
  (撤回页型结论)当天已在手册里执行,只剩赢分支有后果;④标签文件没有哈希与锚定,改几个标签就能翻转结果。
  要重新检验页型,须先按源码给 agi/eco 全部内容页贴标签、按页数归一,并用前半窗定标、后半窗计分回测 t0,再登记。
  赢分支的回报(在技能里加一句)不值这份工作量,本轮不做。

## 八、owner 卡(新增一张)

**Bing Webmaster → AI Performance,每月截一次图或导出一次(约 3 分钟)**。它是整条链上唯一的「读」的分母:
564 这个数已经陈旧 6 周,bpj 与 eco 从来没有过。报告 2026-02 首发就有 **Grounding Queries**(AI 检索本站时用的查询),
2026-06 又加了 Intents 与 Citation Share——这是舰队能拿到的最接近「人们问 AI 什么时用到了我们」的需求信号。
没有官方 API;第三方有调用网页内部接口的办法,需要 owner 的登录凭据,**本会话不做**。

其余 owner 卡不变,按每分钟产出排序:①PartnerNet 付款/税务(€11,20 在累计)②Metaculus key + `METACULUS_BOT_ENABLED=1`
(Fall 主赛 09-28 开题;**赛季中别重新生成 `METACULUS_TOKEN`**)③SR Packs Stripe 五个值 ④Reddit app 两个 Secret。

## 附:普查的已知缺陷(分类员自述,原样保留)

- 「主要内容」不是机械判据:几乎每页都是混合体;三页 eco 购物指南被塞进「定义/判定」,挪到清单则变成清单 43 / 判定 20;
  agi 三个预测汇总页(7 次)是最大的摇摆项,改判后清单 31 / 判定 32。
- 实操只允许物理产品,所以只有 eco 能填;bpj 单工具卡有「怎么领」步骤,放宽定义就会进实操。
- `/` 在 agi 是旗舰计分卡(判定页),按规则进了首页类。
- kagi(6 次)与 copilot(9 次)可能部分是搜索而非助手;舰队分类表 `tools/fleet/ref_sources.txt` 把 kagi 放在 ai 桶,本文沿用,不另立口径。
- eco `/guide/balkonkraftwerk-ohne-bohren.html` 已于 2026-09-27 下线(410),从上一提交读取。

## 附:外部证据完整表(研究员原文)

研究员未能核实、因此正文没有引用的条目(Cloudflare Radar 2026 各比值、TollBit 原报告、Adobe 假日数据等)不列入。

| # | 来源(发布日期) | 读数 | 对本文的意义 |
|---|---|---|---|
| 1 | [Pew Research Center](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)(2025-07-22) | Google users clicked a link inside an AI summary in 1% of visits. They clicked a traditional result in 8% of visits when a summary appeared and in 15% when none did. Sessions ended after 26% of summary pages and 16% of non-summary pages. — 1% in-summary clicks; 8% vs 15%; 26% vs 16%; n=900 US adults, 68,879 searches, March 1-31 2025 | Q1. The only independent, panel-based (non-vendor) measurement found of clicks on cited sources inside a Google AI answer. |
| 2 | [Pew Research Center](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)(2025-07-22) | How often a Google AI summary appeared depended on query shape: 8% for 1-2 word searches, 53% for 10+ words, 60% for question-format and 36% for full-sentence searches. 18% of all searches produced one. .gov sites were 6% of summary sources vs 2% of standard results. — 8% / 53% / 60% / 36%; 18% overall | Q2. Question-style and long, definitional-style queries are the ones that get answered in place. |
| 3 | [Semrush](https://www.semrush.com/blog/google-ai-mode-seo-impact/)(2025-07-30) | About 6-8% of Google AI Mode sessions led to a visit to an external domain, so 92-94% were zero-click. For comparison, zero-click was ~34% for classic search without an AI Overview and ~43% with one. The study gives no breakdown by intent or content type. — 92-94% zero-click; 69M sessions, US desktop, May 1-Jul 5 2025 | Q1. Clickstream measurement of the full chat-style Google surface. |
| 4 | [Ahrefs (Ryan Law, Xibeijia Guan)](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update)(2026-02-04) | The presence of an AI Overview correlates with a 58% lower CTR for the position-1 page. On AI Overview keywords, position-1 CTR fell from 0.073 (Dec 2023) to 0.016 (Dec 2025). On informational keywords without an AI Overview it fell from 0.076 to 0.039. — -58%; 300,000 keywords, aggregated GSC data | Q1. Informational queries lose most of their clicks when an AI answer is shown. |
| 5 | [Seer Interactive](https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-2026-update)(2026-04-24) | In Feb 2026, organic CTR was 2.36% when an AI Overview showed and 3.82% when none did. Being cited in the Overview gave +120% organic clicks per impression vs not being cited, but still 38% below no-AIO. Full-year 2025 informational averages: cited 2.07%, not cited 0.94%, no AIO 3.35%. — 2.36% vs 3.82%; cited +120%; 53 brands, 5.47M queries, 2.43B organic impressions, Jan 2025-Feb 2026 | Q1/Q2. Being cited is worth about 2x the clicks of not being cited, but still below the no-AI baseline. Correlational: Seer earlier noted it cannot prove the citation causes the uplift. |
| 6 | [Seer Interactive](https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-2026-update)(2026-04-24) | AI Overview rates by query type: comparison queries 95.4%, question queries 85.9%, 'near me' 76.9%, single-word 27.3%. By intent: informational 36%, commercial 8%, transactional 5%. Transactional queries that had a cited AI Overview rose from 0.7% CTR in Jan to 1.7% in Dec 2025. — 95.4% / 85.9% / 76.9% / 36% / 8% / 5% | Q2. The clearest dated split found: comparison and question queries are almost always answered in place, while transactional and commercial queries mostly still get a classic SERP. |
| 7 | [Cloudflare (David Belson, Sam Rhea)](https://blog.cloudflare.com/ai-search-crawl-refer-ratio-on-radar/)(2025-07-01) | Crawl-to-refer ratios for June 19-26, 2025 ranged from Anthropic 70,900:1 down to Mistral 0.1:1. Caveat: native-app traffic often carries no referer header, so ratios for Anthropic and OpenAI may be overstated. — 70,900:1 (Anthropic); 0.1:1 (Mistral) | Q1. Network-level launch of the crawl-to-refer metric. |
| 8 | [Cloudflare (David Belson)](https://blog.cloudflare.com/ai-crawler-traffic-by-purpose-and-industry/)(2025-08-28) | Crawl-to-refer ratios for the first week of August 2025. All industries: Anthropic ~50,000:1, OpenAI 887:1, Perplexity 118:1. News & Publications: Anthropic 2,500:1, OpenAI 152:1, Perplexity 32.7:1. Computer & Electronics: Anthropic 8,800:1, OpenAI 401.7:1, Perplexity 88:1. | Q1/Q2. Referral yield per crawl differs by industry. News gets far more referrals per crawl than tech/electronics. |
| 9 | [Cloudflare Radar 2025 Year in Review](https://blog.cloudflare.com/radar-2025-year-in-review/)(2025-12 (covers 2025-01-01 to 2025-12-02; exact post date not shown on the fetched page)) | 2025 trends by platform. Anthropic peaked at up to 500,000:1, then held ~25,000-100,000:1. OpenAI reached up to 3,700:1 in March. Perplexity had the lowest ratios of the AI platforms (mostly <400:1, <200:1 from September). Microsoft peaked at 50-70:1 on a weekly cycle. Google ran ~3:1 to 30:1. DuckDuckGo stayed <1:1 until mid-October (1.5:1). | Q1. By platform, Perplexity and Microsoft return far more visits per crawl than Anthropic or OpenAI. |
| 10 | [The Register reporting TollBit State of the Bots Q3-Q4 2025](https://www.theregister.com/2026/02/04/ai_bot_traffic_web_browsers/)(2026-02-04) | Click-through from AI apps to TollBit publisher sites fell from 0.8% in Q2 2025 to 0.27% in Q4 2025. Sites with AI licensing deals were at 1.33% in Q4. By Q4 there was about one AI bot visit per 31 human visits. — 0.8% -> 0.27%; licensed 1.33% | Q1. Publisher-side CTR from AI answers. This is secondary reporting: TollBit's own report pages are JS-rendered and were unreadable by fetch. |
| 11 | [Similarweb (Adelle Kehoe)](https://aisearch.similarweb.com/blog/chatgpt-referral-traffic-triples/)(2026-05-25) | On May 7, 2026 ChatGPT made brand names clickable inside its answers. The homepage share of ChatGPT referrals went from ~26-32% to ~60%. Week on week, total ChatGPT referrals rose 157.7% and homepage referrals 354.7%. — 26-32% -> ~60%; +157.7% WoW; desktop panel Apr 30-May 20 2026 | Q1/Q2. Most ChatGPT clicks now go to a named entity's homepage rather than to the specific cited page. |
| 12 | [Similarweb](https://aisearch.similarweb.com/blog/gen-ai-stats/)(2026-07-29) | The homepage share of ChatGPT referrals went from 26-29% before the May 2026 update to 62-63% by late May, and it has held since. — 62-63% | Q2. Confirms the shift persisted and was not a one-week novelty. |
| 13 | [SE Ranking (Yulia Deda)](https://seranking.com/blog/chatgpt-referral-traffic-may-2026/)(2026-07-09) | ChatGPT referrals rose from 0.23% of site traffic in April 2026 to 0.32% in May 2026. 60% of AI-referred traffic lands on homepages, compared with 17% of organic search traffic. — 0.32%; 60% vs 17%; 101,574 GA-connected sites, Jan 2025-May 2026 | Q1/Q2. First-party analytics aggregate with a large n. |
| 14 | [SE Ranking](https://seranking.com/blog/ai-traffic-research-study/)(2026-06-18) | 2026 AI referral share by platform: ChatGPT 74.78%, Gemini 11.56%, Perplexity 7.23%, Copilot 3.51%, Claude 2.62%. All AI referrals were 0.32% of website traffic in 2026 (0.24% in 2025). Average AI sessions lasted 9:19 vs 5:33 for organic (medians 2:24 vs 1:53; engagement data Jan-Apr 2025). — see claim; 101,574 sites | Q1/Q4. Copilot is only ~3.5% of AI referrals, so citations in Bing's AI Performance report will rarely turn into visits. |
| 15 | [Similarweb (Maayan Zohar Basteker)](https://aisearch.similarweb.com/blog/ai-referral-traffic-by-industry/)(2026-09-03) | AI platforms drove an average of 770.7M referral visits per month worldwide (Jun 2025-May 2026), +117.4% YoY. Leading industries: Marketplaces 46.8M/month, News 44.5M, Travel 44.5M, Finance 19.1M, Consumer Electronics 17.1M. Fastest growth: Beauty +312.5%, Fashion +278.2%. — 770.7M/month | Q2. Clicks concentrate in categories where the next step (buy, book, compare prices) has to happen on the site. |
| 16 | [Microsoft Bing Webmaster blog (Madhavan, Merchant, Canel, Nigam)](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)(2026-02-10) | The Bing Webmaster Tools AI Performance public preview launched Feb 10, 2026. It reports Total Citations, Average Cited Pages (per day), Grounding Queries (the phrases the AI used to retrieve content), Page-level Citation Activity and Visibility Trends. It covers Microsoft Copilot, AI summaries in Bing and select partner integrations. The announcement mentions no clicks or traffic, no API and no export. — launch 2026-02-10 | Q3. The report measures citations, not clicks. |
| 17 | [Search Engine Roundtable (Barry Schwartz)](https://www.seroundtable.com/bing-webmaster-tools-ai-performance-more-41103.html)(2026-03-24) | A Grounding Query-Page Mapping view was added: pick a grounding query to see which pages it cited, or a page to see its grounding queries. | Q3. |
| 18 | [Microsoft Bing blog](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/)(2026-06-16) | Four preview features were added. Intents classifies grounding queries as Informational, Commercial, Navigational, Learn and Solve, Research, Creation, Local, and others. Topics groups queries into clusters. Citation Share is your share of all citations for the same grounding query. Compare overlays earlier periods. The post mentions no API, export or click data. | Q3/Q2. Intents gives a first-party way to see which intent types cite a site. It still measures citations, not clicks. |
| 19 | [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5780844/bing-webmaster-tools-ai-performance-report-is-ther)(2026-02-19) | The accepted answer on Microsoft Q&A says no API exists for AI Performance data. The answer came from an independent advisor, not Microsoft staff. | Q3. Weak evidence of absence. No official API documentation was found. |
| 20 | [Nick Blazer (independent practitioner)](https://www.nickblazer.com/blog/ai-citation-data-exports-bing-webmaster-tools/)(2026-04-27 (updated)) | The native export button produces aggregate CSVs only. Getting page-level daily data needs a filter per page. There is no official API; the author's workaround calls the UI's internal endpoint (aiperformance/citationstats/filtered/export) using the session's CSRF token. | Q3. Export exists in the UI. Any automation would depend on an undocumented internal endpoint that needs a logged-in session. |
| 21 | [Ahrefs (Patrick Stox)](https://ahrefs.com/blog/ai-search-traffic-conversions-ahrefs/)(2025-06-16) | On Ahrefs' own site over the last 30 days, AI search was 0.5% of visits and 12.1% of signups, which Ahrefs reports as 23x the conversion rate of organic. Absolute visit and signup counts are not disclosed. Ahrefs also says AI search users click links 75% less than traditional organic users. — 0.5% visits -> 12.1% signups; 23x | Q4. First-party data, but the n is not disclosed and it is one SaaS brand with a strong brand. |
| 22 | [Microsoft Clarity (Ihab Rizk)](https://clarity.microsoft.com/blog/ai-traffic-converts-at-3x-the-rate-of-other-channels-study/)(2025-11-06) | Across 1,277 publisher/news domains, AI was under 1% of traffic. Over one month, sign-up conversion was 1.66% for LLM referrals vs 0.15% search, 0.13% direct and 0.46% social. Subscription conversion was 1.34% vs 0.55% / 0.41% / 0.37%. Copilot converted subscriptions at 17x direct and 15x search. 52% of domains converted any AI traffic. — 1.66% vs 0.15%; 1.34% vs 0.55%; n=1,277 domains | Q4. Publisher-site first-party data with n stated. |
| 23 | [Marketing Science (INFORMS), Kaiser & Schulze](https://www.maximiliankaiser.org/publication/organic-llm-traffic/)(2026-04-21) | Across 973 e-commerce sites ($20B revenue) over 12 months, the study compared 50,000+ ChatGPT-referral transactions with 164M from other channels. ChatGPT's conversion rate and revenue per session were above paid social but below every other traditional channel. Results were stronger for complex products. Bounce was favorable, but session duration and pageviews were lower. — 973 sites; 50k+ vs 164M transactions | Q4. The only peer-reviewed dataset found. It contradicts the 'AI converts better' vendor narrative for e-commerce. |
| 24 | [Digital Commerce 360 reporting Adobe Digital Insights](https://www.digitalcommerce360.com/2026/06/17/adobe-ai-referred-traffic-to-retail-sites-doubles-in-a-year/)(2026-06-17) | Adobe Analytics (>1 trillion visits to US retail sites) reports AI-referred traffic up 138% YoY in May 2026. AI traffic converted 54% better than non-AI traffic, reversing the prior year, when it converted at roughly half the rate. AI visitors spent 53% more time on site and viewed 23% more pages. — +54% conversion vs non-AI | Q4. Secondary reporting: Adobe's own blog and PDF returned 503 on fetch. |
| 25 | [Profound (Davis McCain)](https://www.tryprofound.com/blog/commercial-conversations-in-chatgpt-more-than-doubled-in-a-year)(2026-08-13) | The share of en-US ChatGPT conversations with commercial intent rose from 13.9% (Jun 2025) to 19.2% (Jun 2026), from an estimated 243M to 533M per week. Informational stayed in the mid-teens. No click data by intent. — 13.9% -> 19.2%; 7.5M conversations | Q2. Shows the intent mix of chat usage (vendor data), not click-through. |
| 26 | [NBER working paper w34255 (Chatterji et al., OpenAI/Harvard)](https://www.nber.org/papers/w34255)(2025-09) | Practical Guidance, Seeking Information and Writing together make up nearly 80% of ChatGPT conversations. Non-work messages grew from 53% to over 70%. — ~80% | Q2. Most chat usage is advice, information or writing that is completed in the chat. |
| 27 | [Chartbeat (originally on INMA.org)](https://chartbeat.com/resources/articles/pageviews-down-ai-impact/)(undated page (data Dec 2024-Dec 2025)) | AI chatbots are under 1% of pageviews across the Chartbeat network, and ChatGPT referrals grew >200% YoY. Google Search pageviews fell 34% from Dec 2024 to Dec 2025. The article says AI acts 'more like a research assistant than a news reader', favoring evergreen, problem-solving content, with 4.8 pageviews per article. — <1%; +200%; -34% | Q2. Qualitative content-type signal. The article's date is not shown. |
| 28 | [Analyze AI](https://www.tryanalyze.ai/blog/ai-traffic-research)(2026-05-06) | In a vendor analysis of 83,670 citations across ChatGPT, Claude and Perplexity, product/feature pages led ChatGPT citations (60%+) and in-depth how-to guides led Claude citations (43.8%). This measures citations, not clicks. — 83,670 citations | Q2. Low confidence. The page-type definitions come from a vendor and the data is citations, not click-through. |
