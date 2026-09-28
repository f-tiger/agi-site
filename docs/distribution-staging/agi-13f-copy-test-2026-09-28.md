# 「抄 13F 作业」实测：给 owner 手发的两份稿（2026-09-28）

**机器不发帖。** 这两份稿由你自己发、自己改。发之前请**自己改动 10% 左右**（换两三个词、删一句、换成你的口气）；
一字不动地跨平台粘贴，最容易被判成自动化发帖。

## 数字来源（全部出自 `sites/agiscorecard/invest-data.json` 的 `copyHomework`，与页面同源）

| 项 | 值 |
|---|---|
| 截至 | 2026-08-16，8 次调仓，自 2024 年 8 月起 |
| 德鲁肯米勒 AI 切片 | +187.2% |
| 木头姐 | +170.0% |
| 泰珀 | +108.2% |
| 巴菲特 AI 切片 | +37.3%（跑输基准） |
| QQQ 同窗口（逐期复利） | +59.6% |
| 页面 | https://agiscorecard.com/does-copying-13f-work ・ 中文 https://agiscorecard.com/zh/does-copying-13f-work |

**时效提醒**：Q3 的 13F 截止日是 9-30 之后第 45 天，也就是 2026-11-14（周六），实际截止顺延到 11-16（周一）。
aistock 的 `edgar-13f.yml` 在这之后重算，页面数字随之更新。**11-16 之后再发，就先打开页面，按新数字改稿**，
稿里任何一个数和页面对不上都别发。

## 发在哪（按规则风险排序，你来定）

- **雪球**：用中文稿。长文或帖子都行，链接放文末。
- **r/ValueInvesting / r/investing**：两个版块都**限制自我推广**，发前读一遍各自的置顶规则。稳妥做法是正文不放链接，
  有人问方法时在评论里给。**别在同一天把英文稿发两个版块**，那正是反 AI 味第 8 条要防的事。
- 不建议：r/wallstreetbets（语气不合）、任何你没有发帖历史的版块。

---

## 稿 A：英文（Reddit 用）

**标题：** I backtested copying 13F AI holdings at filing-day prices instead of quarter-end. Buffett's slice lost to QQQ.

Most 13F backtests I've seen price the copy at quarter-end. Nobody can trade there. The filing shows up about 45 days later, so that number is measuring a trade you could not have made.

So I rebuilt it. Each basket gets bought at the close of the day the 13F was filed, and held until the next filing, using adjusted daily closes and holdings pulled line by line from EDGAR.

Only the AI-related holdings, re-weighted as filed. Not whole portfolios.

Results through 2026-08-16, 8 rebalances since August 2024:

- Druckenmiller: +187.2%
- Cathie Wood: +170.0%
- Tepper: +108.2%
- Buffett (AI slice only): +37.3%
- QQQ, same window, compounded per leg: +59.6%

The Buffett result stopped surprising me once I looked at what his AI slice actually holds, which is Apple and then Alphabet added through 2026, businesses that sit next to AI and throw off cash rather than accelerator names.

Where this is weak. Which tickers count as "AI" is my call, and someone could draw that line differently and get different numbers. 13F can't see shorts or option hedges, so a hedged book looks naked. Eight rebalances is short. And any period where I had prices for less than half the basket just gets skipped rather than filled in, which I think is right but it does make the record thinner.

Full table and method: https://agiscorecard.com/does-copying-13f-work (there's a calculator where you pick investors and a start date).

For people who've done this with the full portfolio instead of one sector: did the filing-day entry change your results much versus quarter-end, or is the lag mostly noise?

---

## 稿 B：中文（雪球用）

**标题：** 按 13F 申报当天的收盘价抄作业，巴菲特那部分反而跑输了 QQQ

网上抄 13F 的回测，大多拿季度末价格算。可季度末那天谁也看不到持仓，申报要晚 45 天左右才出来，拿季度末价格等于假设自己提前一个半月知道了答案。

我换了个算法。申报日收盘买入，拿到下一次申报，用复权日线，持仓逐行从 EDGAR 原文里取。只算 AI 相关的持仓。

截至 2026-08-16，自 2024 年 8 月起共调仓 8 次：

德鲁肯米勒 +187.2%，木头姐 +170.0%，泰珀 +108.2%。巴菲特 AI 那一块 +37.3%，同期 QQQ（每段窗口逐期复利）+59.6%。

巴菲特跑输，看一眼持仓就不奇怪了。他那一块是苹果，2026 年又加了 Alphabet，都是挨着 AI、自己能赚现金的公司，不是加速器芯片那类股票。

几个我自己也没把握的地方先说在前面。哪只股票算「AI」是我定的，换个人划线结果就会变。13F 看不到做空和期权对冲，对冲过的组合在这里像是裸多。8 次调仓不算长。某一期如果能拿到价格的持仓不到一半，那一期我直接跳过，不去估，所以记录会更短一些。

完整表格和方法在这里：https://agiscorecard.com/zh/does-copying-13f-work ，页面上有个计算器，可以自己选人、选起始日期。

想请教抄过整个组合的朋友：按申报日买，和按季度末买，差得多吗？

---

## 反 AI 味自查（机检 + 人工）

写稿后逐条过了一遍；另删掉两句数据里没有的说法（「QQQ 靠芯片拉动」「另外三位在买芯片」），零编造同样适用于分发稿。

1. 破折号：两稿 0 处。
2. 句长方差：英文稿句长 2–46 词（机检），有碎句也有 Buffett 那段拖着说的长句。
3. 三拍排比：删掉了「A、B、和 C」式的节奏。数字清单是数据，不算。
4. 揭晓式结构：没有「真正的重点是」一类的句子。
5. 缺点与不确定：两稿都有一整段写局限（AI 划线是编辑判断、看不到对冲、样本短、覆盖不足就跳过）。
6. 营销形容词：无。
7. 结尾：一个具体问题，然后停。
8. 跨稿撞句：两稿语言不同；英文稿只发一个版块，所以不存在同批撞句。**如果你想把英文稿发两个版块，第二个版块请重写，
   不要只改标题。**
