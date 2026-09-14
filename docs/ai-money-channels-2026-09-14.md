# AI 时代赚钱通道:复核与完善(2026-09-14)

owner 原话:「你调研分析并完善 ai 时代赚钱通道,现在 agi 站点赚不了钱,目标是赚钱」。
前三份底稿(`revenue-breakthrough-2026-09.md`、`ai-money-directions-2026-09.md`、`prediction-market-platform-2026-09.md`)
的杀单全部沿用,本文只做三件事:①把 agi 站「赚不了钱」的原因用数字说清;②按今天的事实复核每条通道的
**堵点与解堵动作**;③把能今天就动的做掉。

## 〇、三轮 prompt

**第一轮(字面)**:「找 AI 时代的赚钱通道,让 agi 站赚钱。」→ 前三份底稿已经找过两遍,再找一遍是翻炒。
**第二轮(先量资产)**:agi 站到底有什么可卖?D1 现查:**服务端「真人」pv 27 550/28d,JS 信标真人 pv 1 157/28d**
——差 24 倍。JS 才是真读者(爬虫不跑 JS)。所以 agi 的真实读者 ≈ **40 人/天**,不是 1 000/天;
「展示广告 <10k pv/月不复议」的杀单是对的,不是保守。agi 唯一超出其体量的资产是 **AI 引用份额**(Bing 33–37,5%),
而引用不付钱。
**第三轮(可执行)**:「不找新通道。把**已建但被堵住**的通道逐条解堵,堵点写成 owner 可做的一步;
凡是解堵后就能产生现金的,今天把代码侧做完。」

## 一、agi 站为什么赚不了钱(数字)

| 事实 | 读数(28 天,2026-09-14) | 含义 |
|---|---|---|
| JS 真人 pv | **1 157**(29 天里天天有) | 真读者约 40/天 |
| 服务端 human pv | 27 550 | 含不自报家门的爬虫,不是读者 |
| 互动 | slidein 138、vote 60+、invest_tool_click 14、subscribe_click 4、calc_use 10 | 有互动的读者约每天 3–5 人 |
| 询单/赞助/订阅 | audits 0、/advertise 0、sub_ok ≈0 | 每条转化件都有读者但没有交易 |
| AI 引用 | 份额 33–37,5%;AI 回流 20 pv/28d | 被引用但读者不点进来 |

结论:**agi 是一个被 AI 系统当作一手来源、但每天只有几十个真人读者的站**。任何按流量计价的通道
(广告、联盟、订阅)在这个体量上都是 €0–5/月量级,这与方案好坏无关。

## 二、通道逐条复核:堵在哪,谁能解

| 通道 | 状态 | 堵点 | 解堵动作(谁) | 本轮做了什么 |
|---|---|---|---|---|
| **① Metaculus FutureEval + MiniBench**(bot-only,$50k/季 + $1k/两周) | 代码通到 LLM 调用前 | ⓐ 赞助额度未批 ⓑ **库常量指向已结束的 Summer 赛季(33022)**,Fall 2026 = 33121 已开赛 | ⓐ **owner 加自己的 `ANTHROPIC_API_KEY`(或 OpenRouter),不等额度** ⓑ 代码已改 | 赛季 id 可变量覆盖、缺省 33121;每次 `$3` 硬停;Anthropic key 缺省 Claude 5;README 四步 |
| ② SR 付费 Opportunity Packs | 链路自检通过 | Stripe 5 个值未设;有证据的 dossier 不足 10 条 | owner 设 Stripe;源侧等 Reddit OAuth(owner 注册 app) | 09-13 建;垃圾包已撤 |
| ③ eco Amazon 联盟 | **唯一有现金的通道**:€10,26/30d(至 08-30) | 付款/税务信息未填,钱到不了账户 | **owner 2 分钟填完 onboarding checklist**(DE 与 US 各一条) | 无代码 |
| ④ agi /audits $499、/advertise $99 | 上线 | 零读者体量下零询单 | 不投入;10-07 判定线到期结算 | 无 |
| ⑤ 红队/安全赏金(OpenAI $1M 池、Gray Swan $140k) | 未开 | 需要 owner 本人时间与技能,禁自动化 | owner 决策卡 A 仍未答 | 无 |
| ⑥ Perplexity Comet Plus 出版商池 | 未开 | owner 一封邮件 | owner | 无 |
| ⑦ Amazon.de 服务 bounty | 预登记 09-29 | 等 eco 判定线结算 | 会话 09-29 做 | 无 |

**堵点的共同形状**:六条里五条的下一步在 owner 手里,且都是分钟级动作。**代码侧今天没有剩余堵点。**

## 三、本轮代码改动(全部可验证)

- `tools/metaculus-bot/main.py`:`BOT_TOURNAMENT_ID`(缺省 33121)/ `BOT_MINIBENCH_ID` 覆盖;`MonetaryCostManager`
  硬上限 `BOT_MAX_USD_PER_RUN`(缺省 $3);ANTHROPIC key → `anthropic/claude-sonnet-5` + Haiku 4.5 解析;
  日志打印 `questions touched: main=N minibench=M; spend this run: $x`;main=0 时打 warning 提示赛季 id。
- `metaculus-bot.yml`:三个变量透传。README 新节「不等赞助额度」。

## 四、owner 今天能做的四件事,按每分钟产出排序

1. **eco PartnerNet / US Associates 的付款与税务信息**(2 分钟)——唯一已经发生的营收从「累计中」变成「到账」。
2. **Metaculus:加 `ANTHROPIC_API_KEY` + `METACULUS_BOT_ENABLED=1`**(3 分钟,预算 ≤$3/次)——唯一不靠访客的奖金线立刻开跑;
   先 dispatch 一次 dry_run 看 `main=N`。
3. **Stripe 五个值**(10 分钟)——付费包的收款开关;首包要等有证据的 dossier ≥10。
4. **Reddit app 两个 Secret**(5 分钟)——撮合层的主源。

## 五、判定线(已在台账的不重复)
- Metaculus:启用 +28d ≥30 题已提交且成功率 ≥80%;MiniBench 首期结束 +7d 名次进台账(零也记)。
- **本文不新增判定线,不新增 cron,不建页。**

## 六、来源
- Fall 2026 FutureEval = project 33121 / `fall-futureeval-2026`,$50k 奖池,MiniBench $1k/两周;Summer 2026 在 2026-09-01 前停止开题:
  [Metaculus FutureEval](https://www.metaculus.com/futureeval/)、[Summer 2026 公告](https://www.metaculus.com/notebooks/43340/summer-futureeval-announcement/)、[EA Forum Summer 2026](https://forum.effectivealtruism.org/posts/ZfLAN557rGWACKtmc/announcing-metaculus-summer-2026-futureeval-bot-tournament)、[MiniBench](https://www.metaculus.com/aib/minibench/)、[Participate](https://www.metaculus.com/futureeval/participate/)
- 2026 Q2 规模(96 bot、$30k、冠军 $7 550):`docs/ai-money-directions-2026-09.md` §一(2026-09-08 检索)。
