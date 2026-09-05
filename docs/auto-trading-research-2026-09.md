# 自动化股票交易子站?——调研、裁定与已建之物(2026-09-05)

owner 原话:「优化prompt再执行:做一个自动化交易股票子站点?如果自动化交易成功后,也是非常好的
商业机会点,另外自动化交易是否有竞对?如何能够赢?先调研再实施」

**一句话结论**:**不开子站,不碰真钱,不卖信号**。这个赛道里赚钱的是平台(卖工具)、券商(吃流水)
和有资本有速度的做市机器人——三者一个人做不成;而「机器人真赚到钱」在德/美/中三地都不是商机,
是牌照问题(BaFin WpIG、SEC RIA/BD、证监会证券投资咨询 + 2026 年 AI 荐股严打)。舰队能做、
也是唯一有差异化的一件事,本轮已建好:**一份预登记、每日公开重算、六个臂的纸面交易台账**
——`/do-ai-trading-agents-work` 向厂商索要的「可核验实盘台账」,本站自己先交出来。

---

## 一、Prompt 三轮收敛(展示第 3 轮;前两轮改掉了什么)

**第 1 轮**照字面读:「建一个自动交易子站 + 找竞品 + 想怎么赢」→ 会去写策略、接券商 API、
做一个 trading.agiscorecard.com。**第 2 轮**对照手册与证据自我质询,砍掉三样:
①「子站」——根手册三条铁律(独立技术形态 / 完全不同受众 / 自带变现闭环)一条都不中:交易引擎是一个
workflow 不是站,受众就是 invest 板块现有读者,变现闭环需要牌照;②「如果成功就是商机」——成功的
定义是「一个人自己的钱赚了」,那是收益不是营收;要把它变成营收只有卖信号/代操作/引流开户三条路,
前两条在三地都要牌照,第三条撞 owner 08-29「只走 Amazon」;③「怎么赢」——速度、数据、资本三项
一个人都没有,唯一能比的是**透明**(预登记、不删败绩)。**第 3 轮**据此把问题改写为:

> 在「不开子站、不碰真钱、不卖信号、不代注册、零编造」约束下,舰队在「AI 自动交易」这个需求面上
> 有什么**可以零 owner 动作建好、与现有资产(判定纪律 + 13F 抄作业 + Tracker)同构、并且是别人
> 拿不出来的东西**?竞对是谁、他们靠什么赚钱、哪一片是一个非专家 solo 能站住的?
> 建好的东西要过三门,带预登记判定线,并且写明它永远不会变成什么。

**输入**:D1 28 天投资意图现查(§三)、本站既有判定页 `/do-ai-trading-agents-work`(08-24,已含
四条基率一手源)、外部代理调研(竞品/基率/监管/技术/谁在赚钱,12–20 次检索,来源与可信度见 §七)。
**交付物**:本文 + `sites/agiscorecard/tools/paper_ledger.py` + `agi-paper-ledger.yml` +
`/ai-trading-ledger` 页 + 接线 + 判定线写进手册。**不做**:子域、券商 API、真钱、信号、订阅、
zh 镜像(§四 中国监管一节)、任何「买 X」的措辞。

## 二、竞对与他们怎么赚钱(2026-09,信源见 §七)

| 类别 | 代表 | 卖什么 / 价格 | 执行与牌照 | 用户盈利证据 |
|---|---|---|---|---|
| 策略平台 SaaS | QuantConnect | 回测免费,实盘节点 $24–1,000/月;48.3 万注册用户 | 经券商集成执行,自身非券商 | **不公布** |
| 自然语言→执行 | Composer(2026 Q2 被 SoFi 收购) | $40/月;$28B 成交、$200M AUM | 自有 SEC **broker-dealer** 子公司 + SoFi RIA | 无 |
| API 券商 | Alpaca | 免费 API;非美国居民可开(加拿大除外);Paper-Only 账户不用入金 | 券商本身 | — |
| 信号/扫描 | Trade Ideas(Holly) | $89–254/月 | 券商集成分阶段上线 | 只公布「胜率」,无审计 P&L |
| 开源 LLM 代理 | TradingAgents(~10.2 万星)、ai-hedge-fund(~5 万星) | 免费 | 明写「教育/模拟」 | 只有回测 |
| 真钱 LLM 竞赛 | nof1.ai Alpha Arena | 每模型 $1 万实盘(加密永续) | — | **S1 六模型四亏**(GPT-5 −$6,267、Gemini −$5,671、Grok −$4,531、Claude −$3,081;Qwen +$2,232、DeepSeek +$489);2026-05 八模型赛组合亏约 1/3,32 次运行仅 6 次盈利;创始人:「把钱交给 LLM 自己交易,这条路现在走不通」 |
| 预测市场机器人 | Polymarket / Kalshi | — | Polymarket 在德国违法(GGL),Kalshi 屏蔽德国居民 | 前 20 盈利钱包 14 个是 bot;但 **0.51%** 的钱包赚超 $1k,823 个鲸鱼钱包 +$131M = 其余所有人 −$131M |

**谁在赚钱**:①平台(收入与用户是否盈利无关);②券商/交易所(bot = 流水);③券商 CPA
(Scalable Capital €60–150/开户、IBKR $200/客户≥$1 万留存一年);④有资本有速度的 bot 运营者。
**信号卖家**是三地执法对象,没有盈利证据。**小型公开纸面台账**(如 PAT0216/paper-trader,日更
1,161 次提交、动量臂 +17.6% vs SPY +3.9%)——**10 个 star,零流量**。规律:勤奋的台账没人看,
只有真钱 + 大牌模型(Alpha Arena)上了新闻。

## 三、基率与本站已有的判定

- **零售交易基率**:巴西期货日内交易者坚持 300 天以上者 **97% 亏损**(Chague 2020);台湾 15 年
  全市场数据 **~1%** 扣费后可预测盈利(Barber/Odean);印度 SEBI FY25 **91%** 亏损、净亏 ₹1.06 万亿
  (+41% YoY);欧盟 CFD 披露 74–89% 亏损。
- **LLM 代理学术面(2025–26)**:回测窗口中位 1.3 年且与模型知识截止重叠 = 记住了价格(前视偏差);
  同样输入产出发散决策;**唯一实盘证据 = Alpha Arena,多数模型亏损**。
- **本站 08-24 判定**(`/do-ai-trading-agents-work`,28 天真人 pv **127**,是投资簇第四大页):
  「无审计公开证据」,翻转条件 = 厂商拿出**预登记、可核验、不删败绩**的实盘台账。**本轮的建造物
  就是这个标准的自我履行。**
- **投资意图现查(D1,28 天真人 pv)**:/ai-stock-exposure 377(+zh 70)· /invest 171 · /zh/invest 157
  · /do-ai-trading-agents-work 127 · /does-copying-13f-work 43 · cathie/buffett 各 20;事件
  exposure_score 16、invest_tool_click 9;SunWatch Pro(¥199)60 天 0 点击。**需求门过**
  (投资簇 ≈ 全站真人 pv 的三分之一),**商业门不过**(唯一带价格的东西 0 点击)。

## 四、监管:一个公开网站的边界

- **德国 BaFin**:信号跟随 / 社交交易 / 「机器人替你交易」= Finanzportfolioverwaltung /
  Anlagevermittlung,**一般需 §32 KWG → WpIG 牌照**;看似考虑个人情况的推荐 = Anlageberatung。
  **无执行、无个人化推荐的纸面台账(Musterdepot)不是许可业务**,但公开推荐受 MAR 第 20 条
  (客观性 + 利益冲突披露)。实务红线:**show, don't tell**——「机器人做了什么」远比「买 X」安全。
- **美国**:Lowe v. SEC 出版商豁免只覆盖非个人化的定期出版物;**自动执行打破豁免**(Weiss Research),
  个性化辅导亦然。
- **中国**:荐股/投顾需证监会证券投资咨询牌照;2025 协会专项整治「AI 荐股视频/AI 选股软件」,
  2025-12 网信办+证监会联合清理,2026-06-17 吴清陆家嘴讲话「依法从严打击利用人工智能非法荐股」;
  另有八部门打击非法跨境证券经营;富途/老虎/长桥 2025-09 起**不再为内地身份证开户**。
  → **本页不做 zh 镜像,不给任何券商链接**,中文受众在这个题上没有合规漏斗。
- **券商 CPA**(Scalable €60–150、IBKR $200)= 无牌照出版商在德/美唯一能碰的钱;但**非 Amazon**,
  撞 owner 08-29 令 → 只列决策,不抢跑(与 revenue-breakthrough 文档 #2 同一个问题)。

## 五、裁定:子站三条铁律逐条

| 铁律 | 判 | 理由 |
|---|---|---|
| ①独立 Worker/技术形态需隔离 | ✗ | 引擎是一个每日 workflow + 一个 JSON,页面是主域一页 |
| ②受众与品牌完全不同 | ✗ | 就是 invest 簇读者(28 天 ~1,000 真人 pv 已在主域) |
| ③自带独立变现闭环 | ✗ | 合法闭环只有牌照(三地)或非 Amazon CPA(owner 令) |

**→ 并入主域 `/ai-trading-ledger`,挂在 `/do-ai-trading-agents-work` 之下**(面包屑即此)。

## 六、已建之物(零 owner 动作,零 AI 会话依赖)

- **引擎** `sites/agiscorecard/tools/paper_ledger.py`:六臂从 **2026-09-08** 起用同一份复权日线
  **确定性重算**(不存状态,重跑幂等;只有 LLM 臂的决策是追加记录),每臂 $10,000 纸面、每边 5 bp、
  信号在 T 收盘算、**T+1 收盘执行**(无前视)。数据:Yahoo 复权日线(runner 可达,沙箱 403;
  手册记录 Stooq 在 runner 上是 JS 校验页,故 Stooq 只作 CSV 形状校验过的兜底)。**零编造**:
  取不到的 ticker 沿用缓存并写进 `fetch_errors`;SPY 完全取不到 → exit 1。
  - `spy_hold` / `qqq_hold`:买入持有基准(QQQ 与 13F 抄作业页同一基准)。
  - `agi_basket`:`/ai-stock-exposure` 两个预设的 10 只(NVDA AMD TSM AVGO MU MSFT GOOGL AMZN AAPL META)
    等权,每月首个交易日再平衡——**沿用站内已发布的编辑判断,不新造篮子**。
  - `tracker_mix`:篮子权重 = Thesis Tracker 分/100(起始 62.5%),余 SPY,月度——**唯一读本站
    判定的臂**;若本站判定有信息量,应在这里显形。
  - `sma200_spy`:Faber(2007)月末 200 日均线规则,次日执行——公开了十几年的基线,不是发现。
  - `llm_agent`:周频,给模型 60 天价格 + Tracker 分 + 本站 llms.txt,要长仓权重;**门在
    `LEDGER_LLM_KEY`(OpenRouter),未设 = `not_started`,永不回填**。这是「资金潮在卖的那个东西」本身。
- **工作流** `.github/workflows/agi-paper-ledger.yml`:周一至周五 22:40 UTC;自检断言形状、
  SPY 价龄 ≤5 天(陈旧不发)、live 臂数值合理;有变化才提交。成本 ≈22 分钟/月 + 触发 agi 部署
  ≈66 分钟/月,公开仓免费。
- **页面** `/ai-trading-ledger`(EN;`.md` 镜像手写):胶囊 + 指数化权益曲线(六色定序、末端直标、
  十字线 tooltip、表格视图)+ 规则表 + LLM 决策日志 + 预登记判定 + 可见 FAQ(= FAQPage LD 逐字)
  + Dataset LD 指向 `/paper-ledger.json`(CC BY 4.0)。**占位 JSON 已提交**(`status: pre_registered`),
  页面在首个交易日前明确显示「不回填」。本地用合成价格夹具跑通引擎 + Playwright 渲染核对
  (6 行、5 条曲线、tooltip、标签防重叠)。
- **接线**:`/do-ai-trading-agents-work` 的「同一标准」框、`/invest` 工具卡(`invest_tool_click
  {invest_hub_ledger}`)、`/agi-questions` 集线、llms.txt、sitemap、search-index(仅 +1 条)。

## 七、事实表

| 事实 | 来源 | 日期 | 可信度 |
|---|---|---|---|
| Alpha Arena S1 六模型四亏,金额如上 | forklog / iweaver | 2025-11 | 中 |
| 2026-05 八模型赛组合 −⅓、6/32 盈利、创始人原话 | Business Standard | 2026-05-07 | 中 [thin] |
| Composer $40/月、BD 子公司、SoFi 收购 | composer.trade / BusinessWire | 2026-06-23 | 高 |
| QuantConnect 48.3 万用户、$24–1,000/月、无用户 P&L | newtrading.io / quantconnect.com | 2026 | 中 |
| 巴西 97% / 台湾 ~1% / SEBI FY25 91% | SSRN 3423101 / Haas PDF / Business Standard | 2020 / 2017 / 2025-07 | 高 |
| BaFin 信号跟随一般需牌照;Musterdepot 非许可业务 | bafin.de(摘要) | 现行 | 中 [thin] |
| Lowe v. SEC 豁免;自动执行破豁免(Weiss) | IBKR PDF / GRSM 2026-01 | 1985 / 2026 | 高 |
| 吴清 2026-06-17「从严打击 AI 非法荐股」;协会 2025-05 整治 | sina / sac.net.cn | 2026-06 / 2025-05 | 高 |
| 富途/老虎/长桥停开内地身份证 | 第一财经(英文) | 2025-09 | 高 |
| Scalable CPA €60–150;IBKR $200 | financeads.net / interactivebrokers.com | 2026 | 高 |
| Polymarket 0.51% 钱包 >$1k;德国违法;Kalshi 屏蔽 DE | Bloomberg / help.polymarket.com | 2026-04-28 | 高 |
| 公开纸面台账 paper-trader 跑赢 SPY 仍只 10 star | github.com/PAT0216 | 2026-02 | 高 |
| Yahoo v8 对数据中心 IP 限流(yfinance issues) | github yfinance #2658 | 2025–26 | 中(**本舰队 runner 实测可达**,以实测为准,兜底已备) |
| 本站投资簇 28 天 pv、事件 | D1 现查 | 2026-09-05 | 高 |

## 八、判定线与 owner 决策

| 线 | 日期 | 阈值 | 未达 |
|---|---|---|---|
| 管道 | 上线 +10 个交易日 | 台账每日更新、`fetch_errors` 为空或 ≤2 只 | 修数据源(先 Stooq 兜底再议 Twelve Data 免费档) |
| 页面 | 2026-11-04(60 天) | `/ai-trading-ledger` 真人 pv ≥30/28d **或** 任一搜索/AI 引荐 | 页面留着(成本≈0),不再加面;台账继续跑 |
| 读数日 | **2027-03-08** | 六臂收益/回撤/超额如实发布;**不晋升、不出售、不接真钱** | — |
| LLM 臂 | owner 若设 `LEDGER_LLM_KEY` 之日起 +26 周 | 与 SPY 的超额、回撤、换手,与 Alpha Arena 对照写进 `/do-ai-trading-agents-work` | 该臂永远显示 not_started,页面照常 |

**owner 决策(可不做,不催)**:①`LEDGER_LLM_KEY`(OpenRouter 自费 key,周频一次调用,月成本
个位数美元)让 LLM 臂开跑——**不要用 Metaculus 赛事赠送的额度**(用途限定);②券商 CPA
(Scalable/IBKR)与 Check24 是同一个问题:是否为「只走 Amazon」破例——no 则永久归档。

## 九、别再提的

交易子站/子域 · 接券商 API 自动执行 · 卖信号/跟单/订阅 · 中文荐股内容或 zh 券商漏斗 ·
预测市场机器人(德国违法)· 用回测当证据 · 「先跑起来再说」的真钱试验。
