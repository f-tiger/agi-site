# 站队的放大效应:agi 能借用什么(2026-09-27)

owner 原话:「先优化prompt再:选agi年份站队最多,和我发现股票交易app如果发投票贴子参与人最积极一样,
不就和polymarket一样,放大了人性?继续这个点研究下如何利用放大优势」

## 〇、Prompt 三轮

1. **原题**:站队是人性放大器,怎么利用?
2. **第一轮收紧**:「人性」太宽。把它拆开:Polymarket 和股票 App 投票帖到底放大了**哪几种**机制?
   每一种在 agi 上**有没有**、**缺哪个**?数据用 D1 的 vote_cast 以及它后面的动作,不能凭印象。
3. **第二轮加约束**:真钱与抽佣已杀(§284 StGB / 刑法 303,09-07 裁定);奖品等于有奖竞猜(sweepstakes,
   也在杀单上);账号体系也在杀单上。所以只能借「不花钱」的那几种机制。另外必须回答:放大之后
   **钱从哪里来**?不能把「互动多了」当成营收。
4. **定稿**:①拆解放大机制;②对照 agi 读数找出缺哪几个;③只做一个最小、可证伪的改动,预登记判定线;
   ④写清楚不做什么、以及它离钱还有多远。

## 一、放大的到底是什么:四个机制

| 机制 | Polymarket | 股票 App 投票(Stocktwits / moomoo) | agi 现状 |
|---|---|---|---|
| ① **押注**(输了有代价) | 真钱 | 部分(moomoo US 已把用户接到 Kalshi 预测市场) | **禁止**(法律 + 杀单) |
| ② **看到众人怎么选**(社会比较) | 实时价格就是众人的判断 | Stocktwits 情绪分、moomoo 多空分布图 | **没有**:投完票只看到 5 位名人的年份,看不到其他读者 |
| ③ **很快揭晓 + 记分** | 合约到期结算 | 「明天涨还是跌」第二天就揭晓 | **没有**:AGI 年份要到 2028 年后才有结果 |
| ④ **身份/阵营** | 持仓方 | 多头/空头 | **有**:五种 AGI 类型 |

外部证据:
- MusicLab 实验(14 341 人):能看到别人的选择后,热门更集中、结果也更不可预测。所以要**先投票,后看众人**;
  先看众人,答案就会跟着众人走,这份数据本身也就废了。
- Good Judgment Open:不给钱,靠**持续的准确度反馈(Brier 分)**留住预测者;表现逐年相关系数 0.65。
- Manifold:2025-02 关掉有奖竞猜(sweepstakes),回到纯游戏币;留人靠声望、排行榜与「进步感」。
- 股票 App 的投票本质是**漏斗**:moomoo US 把社区多空情绪接到 Kalshi 合约上,**钱来自后面的交易佣金**。
  agi 不能也不会接那一段。
- 监管面:Massachusetts 诉 Robinhood「游戏化」案以 750 万美元和解,令中未认定游戏化本身违规;
  SEC 仍在研究「数字互动手段」。结论:纯投票、无钱无奖、不连券商,不在那个射程里。

## 二、agi 的读数(D1,终身,真人)

- 年份投票 **约 117 次**(首页约 50、/agi-test 47、其余零散)。这是全站唯一有量的动作。
- 投票之后:分享(challenge_share + x_share)**终身 0**;锁定预测 **1**;订阅 **0**。
- 诊断:①④ 两个机制在,② ③ 两个缺。读者投完票得到一个类型,然后**没有任何东西可比、可等、可分享**。
  「我是 True Believer」不值得分享;「只有 14% 的读者和我一样」才值得。

## 三、这一轮做了什么(最小改动)

**众人分布揭晓(补机制 ②)**,只在读者投票**之后**出现:
- `GET /api/crowd`:五档计数,终身,只算真人,来源是 `/` 与 `/agi-test` 两处投票(历史上三种标签写法都归一;
  认不出的标签直接丢掉,不猜)。走 Cache API 缓存 1 小时;查询走 `idx_events_name`,一次未命中约读 120 行。
  零网络单测 `tools/test_crowd.mjs`,部署后另有线上冒烟检查。
- `/agi-test` 结果页:「x% 的 n 位读者和你答得一样」+ 五档条形图;≤15% 时标「少数派」;
  n 明写,并注明「读者不是抽样调查,这不能裁定任何事,证据才能」。
- 分享文案:如果读者在 ≤35% 的一档,就带上「只有 x% 的读者同意我」。
- 事件 `crowd_view`(label = 自己那一档)。
- **和锁定邮箱表单一起在 2026-10-01 00:00 UTC 生效**(代码里的日期门),不污染 09-30 的订阅判定线。

## 四、判定线 `agi-crowd-reveal-1029`(已进台账)

- 窗口:10-01 → 10-28,/agi-test,真人。
- 指标:(challenge_share + x_share + prediction_lock)÷ vote_cast。
- t0:终身 1 / 117(<1%)。
- **赢**:比例 ≥10% 且绝对数 ≥5 → 社会比较在这个量级上有放大作用,进入第二阶段(补机制 ③)。
- **输**:vote_cast ≥30 而比例 <3% → 在 7 人/天的量级上,放大不出来;不建第二阶段,投票保持现状。
- vote_cast <30 → insufficient。

## 五、第二阶段(只在上面判赢后才做):很快揭晓的题

机制 ③ 才是股票投票帖真正让人回来的东西:**明天就知道对不对**。AGI 年份做不到,但本站自己的管道里
已经有每周会变、可以机器判定的数:
- 例:「下周一 AGI 共识板上『2028 年前』的中位概率会比今天高还是低?」——由 `agi-consensus.json`
  每周自动判定,不需要人来裁决。
- 记分只存在读者自己的浏览器里(匿名 id,同 `pick_ledger` 的做法),连对几次、准确率多少;不建账号。
- 揭晓那天用已有的站内邮箱表单通知(同一个名单)。

**第二阶段不做的**:任何真钱、积分兑换、奖品、抽奖、排行榜实名、券商或预测市场链接。

## 六、离钱还有多远(诚实版)

放大的是**互动**,不是**收入**。股票 App 和 Polymarket 的收入来自后面那一段(交易佣金、抵押品利息),
agi 在法律上接不了。agi 能从放大里得到的只有两样:①**分享带来的新读者**(每次分享都是一条免费分发);
②**邮箱名单**(揭晓时通知)。按 7 人/天的外部读者,即使比例做到 10%,一个月也只是十几次分享、几个订阅。
它的价值在于检验「站队 + 众人对比」能不能让读者**自己把网站带出去**。这是 agi 目前唯一一条不靠
搜索引擎的增长可能。

来源:
[Stocktwits 情绪说明](https://help.stocktwits.com/c/key-features/features/sentiment) ·
[moomoo 社区多空分布图](https://www.moomoo.com/community/feed/insights-from-the-bull-bear-distribution-chart-along-with-follow-116793263652869) ·
[moomoo US 预测市场(Kalshi)](https://www.moomoo.com/us/support/topic4_716) ·
[Salganik, Dodds & Watts 2006, Science](https://www.science.org/doi/10.1126/science.1121066) ·
[Good Judgment Project 证据汇总(AI Impacts)](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/) ·
[Manifold(Wikipedia)](https://en.wikipedia.org/wiki/Manifold_(prediction_market)) ·
[Robinhood 马萨诸塞州和解(InvestmentNews)](https://www.investmentnews.com/regulation-legal-compliance/robinhood-to-pay-75m-to-settle-massachusetts-charges/248214) ·
[Yale Law Journal: Confetti Regulation](https://yalelawjournal.org/essay/on-confetti-regulation-the-wrong-way-to-regulate-gamified-investing)
