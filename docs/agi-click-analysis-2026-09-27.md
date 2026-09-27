# agi 点击分析与商业化下一步(2026-09-27)

owner 原话:「agi要如何继续升级,把商业跑通,先分析点击,再看如何优化」。
数据:D1 `agiscorecard-events` 现查,28 天窗 2026-08-30 → 09-27,`ua_class` 为 human 或空,剔 `/__*` 路径。
六条查询合计读 ~17 000 行(D1 日预算 500 万的 0,3%)。

## 一、点击全貌(28 天,JS 口径)

| 层 | 读数 | 说明 |
|---|---|---|
| JS 真人 page_view | 1 196 | 其中 **约 200 次有外部来源**(≈7 人/天) |
| 外部来源 | Google 88 · DDG 76 · Bing 家族 50 · claude.ai 9 · EA Forum 7 · ChatGPT 5 · Perplexity 3 · Copilot 3 | 搜索占 ~85%;claude.ai 单列(可能含舰队自己) |
| 非读者噪音 | `/progress-index` US 71、`/amodei-…bloodbath` US 65(3 天)、`/about` US 61(2 天) | 0 外部来源、单国、集中在少数几天 = 运维/QA 形状,**不计入任何判定** |
| 互动 | vote_cast 90(agi-test 47 + 首页投票 43)· tool_click 24 · calc_use 21(20 次在同一天)· deeplink_pick 15 · pred_expand 13 · index_click 11 · invest_tool_click 10 | **全站唯一有量的动作是「站队」**:选一个 AGI 年份 |
| 订阅 | slidein_show 166 → dismiss 46 → **sub_open 0 → sub_ok 0**;subscribe_click 2;`subscribers` 表历史总数 **2**(最后一条 08-19) | 28 天 0 新订阅 |
| 钱 | affiliate_click(3 本书,amazon.com)**历史 0 行**;advertise_click 0;/advertise 1 pv;/audits 0 询单 | **priced click = 0** |

**`affiliate_click` 的 0 是真 0,不是测不到**:事件名早在白名单里,同一种 `gtag` 包装在同一页上
记下了 `tool_click` 11 次;而 when 页书单所在的「原文」一节,连两条免费原文链接(readnext_click)
这 28 天也是 0 —— 读者根本没读到页底。

## 二、结论:agi 的商业不是「点击优化」能跑通的

- 7 个外部读者/天。按 eco 的实测单位经济(€0,10/联盟点击、12% 点击率),即使 agi 的点击率追平
  eco,月收入也在 €2 以下。**任何按流量计价的通道,在 agi 这个量级都是 €0–5/月**(与 09-14 结论一致)。
- agi 的资产是 **AI 引用份额** 与 **「站队 → 被打分」这个钩子**,不是流量。读者在 agi 上真正做的事,
  是给出一个年份;网站能独家兑现的承诺,是「证据变了就告诉你」。
- **这个承诺此前是空的**:结果页「🔒 Lock in my prediction — we'll tell you if the Tracker proves you right」
  只把选择写进 `localStorage`,没有收任何联系方式,锁定后的订阅链接出现在**页面顶部**(读者此时在页面中部)。
  28 天 1 次锁定、0 次订阅。

## 三、本轮做了什么

1. **结算过期判定线 `opinion_*_exposure`(09-26,阈值 ≥8)**:窗内 3 次(ai2027 2、will2027 1;
   when 页 0)→ **lost**。按预登记的输分支「停止横铺并回收」,删除 8 页上的观点→持股篮子块
   (how-close / sam-altman / ai-2027 / will-2027 / dario / sa-predictions / ai-progress-2026 / when),
   保留原生特例 sasummary 与早于该家族的 did-open-source-ai-fade。正文未改,不刷 dateModified。
   同时兑现站规第 1 条「每页一条主钱路,不并列摆摊」。
2. **修结果页那个空承诺**:锁定后,邮箱表单直接出现在锁定按钮下方(复用边缘注入的站内表单,
   `/api/sub` → D1 + beehiiv,`location=agi_test_lock`、标题点名读者刚选的年份)。
   选完年份后 URL 写入 `?pick=<type>&self=1`,让表单能叫出读者的类型;`self=1` 使刷新不再计为
   文章深链、也不重复计 vote_cast。
   **在 2026-10-01 00:00 UTC 前休眠**(代码里的日期门):09-30 `sub_ok` 判定线必须在它登记时的漏斗上结算,
   判定期内不改被测对象。
3. **补登台账**:09-26、09-30、10-31 三条线此前只写在 agi CLAUDE.md,没进 `data/fleet-bets.json`;
   本轮补登并结算 09-26,另加新线 `agi-lock-sub-1029`。

## 四、下一步(按顺序,不并行)

1. **09-30** 结算 `agi-sub-ok-0930`(当前累计 2 <5 → 按原文判死,日更降频)。
2. **10-01 起** 锁定表单自动生效;**10-29** 结算 `agi-lock-sub-1029`:
   `prediction_lock` ≥5 且 `sub_ok{agi_test_lock}` ≥2 → 「站队后被打分」是 agi 唯一的留存钩子,
   下一步把同一表单接到首页年份投票(43 次/28d);否则 agi 放弃邮件名单这条线,只保留 flip-day 义务。
3. **10-31** 书单线照原文结算(当前全站 book_* = 0 → 关 Associates 并拆书单)。
4. **不做**:再加变现面、改书单位置(08-29 已按「算术天花板」否决)、新页冲流量、向 AI 爬虫收费。
5. **真正不靠流量的钱仍只有 Metaculus FutureEval**(Fall 主赛 09-28 开题):差 owner 的 key +
   `METACULUS_BOT_ENABLED=1`。这是本报告里唯一一件能在一个月内改变「agi 营收 = 0」的事。
