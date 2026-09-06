# 商业营收突破调研:新子站还是优化旧站(2026-09-05)

owner 原话:「针对商业营收,突破性调研思考,可以新开子站,或者优化原有的站点」

**一句话结论**:舰队的营收公式是 `流量 × 18,9% × €0,085`,三项里只有流量能变,而流量
两个月没抬起来。所谓突破,只能是**把营收从流量里解耦**——本轮找到并已建好一条:
Metaculus FutureEval 机器人锦标赛(每季 $50k 奖池、按预测准确度付钱、不需要一个访客),
门在 owner 的 10 分钟。**新开子站判负**(理由 §五)。其余可做的都卡在同一件事上:owner
是否愿意在 Amazon 之外再注册一个联盟(§四 #2)。

---

## 一、Prompt 三轮收敛(展示第 3 轮;前两轮改掉了什么)

**第 1 轮**把请求读成「找一个能赚钱的新站点方向 + 给旧站加变现位」,输出会是一份品类/
子站候选清单。**第 2 轮**对照舰队自己的杀单(内部代理从 27 份文档抽出 **50+ 条已判死项**,
§六)自我质询,砍掉三样:①「新子站候选清单」——舰队为「先复制壳、后找需求」交过三次学费
(tds 63pv/0 点击、sourceradar 休眠、gamesledger 零外部互动),子域从零权威起步,新域
4–8 个月死区;②「给旧站加变现位」——eco 2026-08-31 用 258 pv 的样本把「给页面 X 再加一个
产品面」整类提案退役,agi 的算术是 1 sub/368 pv、可行线 ≈950× 流量;③「换联盟拿更高费率」
——owner 2026-08-29 明令只走 Amazon。**第 3 轮**据此把问题改写为:

> 在「流量是瓶颈且短期抬不起来」「变现只走 Amazon」「owner 不做销售、不代注册」三个约束下,
> 哪些营收路径**不以流量为自变量**?每条给三门(数据/需求/商业)、owner 动作(分钟数)、
> 28 天判定线;能零 owner 动作建好的,本轮建好;需要 owner 决策的,只列决策不抢跑。

**输入**:8 站 D1 28 天钱线现查(§二)、PartnerNet 截图台账(根 CLAUDE.md)、内部代理
(27 份文档:营收现实表、杀单、存活项、owner 原话约束、舰队自己的营收理论)、外部代理
(2026 年小站营收路径:lead-gen 费率、预测锦标赛、代理商务归属、爬虫收费、子域继承、
站点买卖、Amazon 费率变动)。**交付物**:本文 + `tools/metaculus-bot/` + workflow(门在变量)
+ owner 决策卡 + 判定线写进根 CLAUDE.md。**不做**:新子站、新域、非 Amazon 链接、改任何
处于判定窗内的页面、机器注册。

## 二、诚实账本(28 天,D1 现查 2026-09-05,剔 CI/扫描器)

| 站 | 真人 pv | 变现事件 | 已验证收入 |
|---|---|---|---|
| getecoback | ~850 | affiliate_click **117**(101 条搜索链接、1 条 /dp/) | **€10,26 / 30d**(PartnerNet 至 08-30;08-28→08-30 三天零新增)——**舰队唯一** |
| baipiaoji | ~1,750 | go 出站 48(散在 ~50 个工具,多为中国平台/API 商)、sub_ok 2 | 0(无联盟账号) |
| agiscorecard | ~1,040 | rev_click 0、sub_ok 2(最后一次 08-19)、affiliate_click{book_*} 0 | 0 |
| thedollscout | ~217 | affiliate_click 1(08-30) | 0 |
| gridlings | play_start 276 / solve 123(itch 43/13,持平多日) | 无收入事件 | 0 |
| gamesledger | 538 | 无收入面 | 0 |
| goldrush | 199「真人」(扫描器灌水,JS 真人 0) | audit_click 0 | 0 |
| buysomething | 45 | 全部交互 0 | 0 |

单位经济(eco,唯一有分母的):€0,085/点击、€0,017/pv、**€1,03/件**(上一期 €1,99,
后五件是更便宜的货)。舰队 6 个月的诚实预期在 08-28 文档里写过:**€30–170/月**。

**这张表说明什么**:不是转化坏(eco pv→Amazon 18,9%,行业个位数),是**没人来**。任何
「加一个变现位」都是在同一个分子上做功;要突破,得换公式。

## 三、三条突破轴(只列不依赖流量的)

| 轴 | 机制 | 本轮判定 |
|---|---|---|
| **A. 把判断力直接卖给付钱的裁判** | 预测锦标赛按准确度付奖金 | ✅ **建好**(§四 #1) |
| **B. 每次点击值 100× 以上** | lead-gen €16,50–20/lead vs €0,085/click | ⏸ owner 决策(与 Amazon-only 冲突,§四 #2) |
| **C. 借已索引域名的权威,不开新域** | 在 eco/agi 主域加子目录,而非子域/新域 | 本轮无新页(eco 09-04 快反杀线已触发:6 页 1 pv;agi 客户视角簇 09-05 刚上线,10-03 判) |

被外部代理排除的轴(证据摘要,详见 §九):代理商务(Amazon Rufus / OpenAI ACP / Google
AP2 / Copilot Checkout)**不给出版商归属**;爬虫收费(Cloudflare PPU / TollBit)在 <10k
访问量级 ≈ €0;买站只有同利基才合规且内容资产类 12 个月缩水 39%,不是 90 天的打法;卖引擎
与 owner「不做销售」不相容。

## 四、排名后的打法

### #1 Metaculus FutureEval 机器人锦标赛 —— **已建,门在 owner 10 分钟**

- **是什么**:Metaculus 一年三季 bot-only 锦标赛,每季 **$50,000 奖池、300–500 题**;官方
  给模板仓 `Metaculus/metac-bot-template`(fork + 两个 secret + 点 Run workflow 即可参赛)、
  `forecasting-tools` 框架、参赛者免费 LLM 额度(OpenRouter 表单)与 Metaculus 自有 LLM 代理。
  另有 $7,500 Market Pulse 赛区。信源:Metaculus 赛事页/公告(WebSearch 摘要,2026-09-05)、
  模板 README 与 `.github/workflows/run_bot_on_tournament.yaml`(raw 直读)。
- **为什么是舰队的形状**:agiscorecard 的全部资产就是「带日期、带一手源、带翻转条件的判定」
  +「赔率 vs 证据」周快照 + 预登记判定线纪律;bot 的研究步把 `agiscorecard.com/llms.txt`
  作为 house prior 喂给 AI 类题目——**别的参赛者没有这份先验**。且它跑在第①层(GitHub
  workflow,零 AI 会话依赖),owner 唯一动作是一次性注册。
- **三门**:数据门 ✓(舰队判定引擎已运转 3 个月,agi 564 次 Bing 引用/30d 证明判定质量被
  第三方采信);需求门 ✓(付钱方是 Metaculus,奖池已公布);商业门 ✓(现金奖,无联盟、无流量)。
- **诚实反面**:①奖金按名次分,零奖金是最常见结果——外部代理称上一季 96 个 bot 中 19 个
  拿到奖金 [thin,代理转述,未能直读排行榜];②模板 bot 是 Metaculus 自己基准用的,大家起点
  相同,house prior 只在 AI 类题目上有增量;③赛规 bot-only,**任何人工干预都违规**,舰队
  也不能为排名伪造研究引用(零编造规则照适用)。
- **已交付**:`tools/metaculus-bot/main.py`(五类题型 + house prior + red-on-empty + dry-run)、
  `requirements.txt`(`forecasting-tools==0.2.92`,内置当季 ID 33022)、
  `.github/workflows/metaculus-bot.yml`(每 2 小时;**job 级门 `vars.METACULUS_BOT_ENABLED`**,
  未设 = 0 分钟 0 副作用;dispatch 可手动冒烟)。沙箱打不到 metaculus.com,只做了
  py_compile + helper 单测 + 本地 llms.txt 组装测试(全过);首次真实运行由 owner 的
  `Run workflow → test_questions` 完成。
- **owner 动作(≈10 分钟)**:见 `tools/metaculus-bot/README.md` 三步。
- **判定线**:启用后 28 天 ≥30 题已提交且 workflow 成功率 ≥80%;当季结算 +45 天奖金/位次
  进台账,零也记;续跑与否按「位次是否进前 1/3」。

### #2 eco 租客契合 lead-gen(Stromwechsel)—— **owner 决策,不抢跑**

- 外部代理复核(2026-09):Check24 Strom/Gas **€16,50–20/lead,stornofrei,提交即计**;Verivox
  ~€20;CONNY Mietrecht €30–50;阳台电站 4–6%。**一条 lead ≈ 200 次 Amazon 点击**。
- 与 08-28 杀掉的 PV/热泵线索**不是同一件事**:那条要业主,本站受众 79% 租客;Stromwechsel
  与 Mietrecht 恰是**租客的事**,08-28 文档把它列为「存活、唯一阻塞 = owner 注册」。
- **冲突**:owner 2026-08-29「亚马逊品牌更大,不注册别的网站」。所以本轮**一行代码不写**
  (eco 铁律「账号到手前不写任何非 Amazon 链接」),只把决策摆出来:**要不要为 Check24 或
  Verivox 破一次例**。若 owner 说不,这条永久归档、不再提第三次。
- 若 owner 说是:挂既有页(strompreis-radar / 租客冬季线 / 湿度簇),`tariff_click` 事件
  已在 worker 白名单;判定线沿用 08-28 预登记:**CTA 上线 60 天首条 lead;0 → 降级为普通
  出站链接**。

### #3 Amazon.de 服务 bounty(Prime 试用 / Audible)—— **预登记,09-29 起,零 owner 动作**

- PartnerNet 对 Prime / Audible / Music Unlimited 等**免费试用**付固定 Prämie(官方帮助页
  已确认机制;**具体金额在登录后的 Vergütungskatalog,沙箱读不到**——外部代理称 Prime ≈€3、
  Audible €10–15 [thin])。用**现有 tag `getecoback-21`**,不需要新账号。
- 为什么不是现在:eco 三条判定线(US 切换 09-25、分体机簇 09-28、湿度活数字 09-28)都在
  测 `affiliate_click`,再加一个抢注意力的钩子会污染被测对象(08-29 对抗审议已否决过同类)。
- **预登记**:09-29 三条线结算后,在**非判定窗**的购买页加一行「Prime 试用免运费」bounty
  链(事件 `bounty_click`),28 天线:≥1 次 PartnerNet「Miscellaneous Referrals」入账 → 留;
  0 → 撤。**owner 1 分钟**:下次截图时顺带截 Vergütungskatalog 的 Prämie 表,不催。

### #4 Apify 付费 Actor / 游戏授权直销 —— 已在 08-22 排名前二,阻塞未变

三个 Actor 已写好、游戏干净构建已出;阻塞 = owner 的 Apify 账号 / 4 个游戏平台账号。**本轮不
重复建**,只记:这两条与 #1 同属「不靠流量」轴,owner 若愿意注册,优先级在 #2 之前。

### #5 Perplexity Comet Plus 出版商池 —— **owner 一封邮件**

代理商务全线不给归属,唯一有出版商分成池的是 Perplexity Comet Plus。eco 的 chatgpt.com
引荐是 GA4 第 3 渠道、agi 33–37,5% 引用份额——舰队恰是「被 AI 引用多、被点击少」的形状。
外部代理给出的联系方式 publishers@perplexity.ai [thin,发前请在 perplexity.ai 出版商页核对]。
邮件草稿见 §七。**判定**:60 天无回复 → 归档。

### #6 PartnerNet 费率复核 —— **owner 下次截图顺带**

Amazon US Associates 2026 年 3–5 月多品类费率下调(外部代理称最高砍半 [thin]);.de 是否同步
未知。eco 的 €1,03/件已比上期腰斩——**若费率也动了,「€0,085/点击」这条基线要重算**。

### #7 Cloudflare 变现网关 / Pay-Per-Use —— 已登记为零成本占位,不变

外部代理:Cloudflare 2026-09-15 起 Pay-Per-Use 默认拦截;舰队保险丝「引用队列爬虫任何时候
不设价不屏蔽」**优先级更高**——确保 GPTBot/OAI-SearchBot/ClaudeBot/PerplexityBot 不被默认拦。
**这是本轮唯一一条要盯的外部变更**,09-15 后 heartbeat 的探活若看到这些 UA 被 403,先解封。

## 五、「新开子站」裁定:**不开**

1. 子域从零权威起步(外部代理:搜索/AI 引用对子域按独立站对待,继承 ≈ 0);舰队实测四个
   子域全部零外部互动,而 33–37,5% 引用份额全长在主域判定页上。
2. 根 CLAUDE.md 三条铁律(独立技术形态 + 完全不同受众 + 自带变现闭环)本轮没有任何候选三条
   全中;唯一保留的子站形状(GEO 可见性监测,DACH)三个前置条件一个都没到。
3. 08-28 已判「新子站现在是稀释,不是杠杆」;本轮没有新证据推翻它。
4. **正确形状**:#1 不是站,是一个 workflow;#2/#3 挂在 eco 既有页;#5 是一封邮件。

## 六、本轮再确认的杀单(别再提)

Boosts/SparkLoop · x402/代理微支付(2026-11 才复核)· 数据集经纪 · 爬虫收费(<10k 访问 ≈ €0)
· 展示广告(<10k pv/月不复议)· 分享按钮 · widgets/嵌入 · 非 Amazon 联盟(owner 令,#2 是唯一
请示例外)· PV/热泵线索 · B2B 冷邮件(§7 UWG)· 新域/新子站 · 先复制壳 · 游戏当营收路径
(>10 万/月前不复议)· 强制广告 SDK 门户 · X 自动发帖 · 无人出镜视频 · KDP 卖书(owner 令)
· 代币/随采纳升值装置(goldrush 宪法)· 买站(非同利基不合规)· 卖引擎(owner 不做销售)。
完整 50+ 条清单与出处由内部代理抽自 27 份文档,已在会话记录;根 CLAUDE.md 只记本节摘要。

## 七、owner 决策卡(全部一次性)

| # | 动作 | 分钟 | 不做的后果 |
|---|---|---|---|
| 1 | Metaculus bot 账号 + token → Secret `METACULUS_TOKEN`;Variable `METACULUS_BOT_ENABLED=1`;Run workflow(test_questions) | ~10 | #1 永远 0 分钟、0 奖金 |
| 2 | **决策**:是否为 Check24 或 Verivox 破一次「只走 Amazon」的例 | 1(答 yes/no) | no → 永久归档;yes → 我挂既有页、60 天判 |
| 3 | 下次 PartnerNet 截图顺带:Vergütungskatalog 的 Prämie 表 + 当前商品费率表 | 1 | #3 金额不明只能盲上;#6 基线可能失真 |
| 4 | 发一封邮件给 Perplexity 出版商池(草稿如下) | 2 | #5 不存在 |
| 5 | (旧)Apify 账号 / 游戏平台账号 / PartnerNet 付款税务信息 | 各 2–15 | 08-22 排名前二的两条继续冻结;€10,26 继续付不出 |

**Comet Plus 邮件草稿**(英文,owner 核对收件地址后原样发):

> Subject: Publisher inquiry — agiscorecard.com & getecoback.com (independent, AI-cited reference sites)
>
> Hi Perplexity publisher team,
>
> I run two small independent reference sites that AI assistants already cite heavily relative to their size: agiscorecard.com (dated, pre-registered verdicts on AGI predictions; ~560 Bing citations/30 days) and getecoback.com (German home-climate buying guides; ChatGPT is our #3 referral channel in GA4). Both publish llms.txt, per-page Markdown mirrors and a public MCP server, and both carry primary-source links for every number.
>
> I'd like to be considered for the Comet Plus publisher pool. What are the eligibility criteria and next steps?
>
> Thanks, [owner name]

## 八、判定线汇总(预登记,写进根 CLAUDE.md)

| 线 | 日期 | 阈值 | 未达 |
|---|---|---|---|
| Metaculus 管道 | 启用 +28d | ≥30 题已提交、成功率 ≥80% | 修管道,不谈奖金 |
| Metaculus 奖金 | 当季结算 +45d | 位次/奖金进台账 | 未进前 1/3 → 下季不续 |
| Comet Plus | 发信 +60d | 有回复 | 归档 |
| Prime bounty | 09-29 上线 +28d | ≥1 次 Miscellaneous Referrals 入账 | 撤 |
| lead-gen | owner 答 yes 后 +60d | 首条 lead | 降级为普通出站链接 |
| 本文整体 | 2026-12-05 | 舰队非 Amazon 收入 >0 **或** eco 联盟 ≥€30/30d | 「营收从流量解耦」判负,回到「把 eco 做厚」 |

## 九、事实表(信源 · 日期 · 可信度)

| 事实 | 来源 | 标记 |
|---|---|---|
| FutureEval 每季 $50k 奖池、300–500 题、一年三季、bot-only、免费 OpenRouter 额度表单 | Metaculus 赛事页/公告 + 模板 README(2026-09-05) | ✓ |
| 模板默认每 20 分钟跑、两个 secret 即可参赛 | `run_bot_on_tournament.yaml` raw 直读 | ✓ |
| `forecasting-tools` 0.2.92 内置 `FE_SUMMER_2026_ID=33022`、Metaculus LLM 代理 | pip 安装后 inspect(2026-09-05) | ✓ |
| 上一季 96 bot / 19 拿奖 | 外部代理转述 | [thin] |
| Check24 €16,50–20/lead stornofrei、Verivox ~€20、CONNY €30–50 | 08-28 文档 + 外部代理复核 | ✓(费率随时变) |
| PartnerNet 对 Prime/Audible/Music 免费试用付固定 Prämie | partnernet.amazon.de 帮助页(搜索摘要) | ✓ 机制 / 金额 [unread] |
| Amazon US 费率 2026 年 3–5 月下调 | 外部代理 | [thin] |
| 代理商务(Rufus/ACP/AP2/Copilot Checkout)无出版商归属;Comet Plus 是唯一出版商池 | 外部代理 | [thin] |
| Cloudflare Pay-Per-Use 2026-09-15 默认拦截 | 外部代理 | [thin,09-15 用 heartbeat 验证] |
| 子域继承 ≈ 0;内容资产类 12 个月缩水 39% | 外部代理 | [thin] |
| eco €10,26/121 点击/10 件(至 08-30)、€1,03/件 | PartnerNet 截图台账(根 CLAUDE.md) | ✓ |
| 8 站 28 天钱线 | D1 现查 2026-09-05 | ✓ |
| 50+ 条杀单及出处 | 内部代理抽自 27 份仓内文档 | ✓ |
