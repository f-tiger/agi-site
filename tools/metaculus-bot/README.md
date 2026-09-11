# Fleet Metaculus bot(FutureEval 机器人锦标赛)

舰队第一条**与流量无关**的营收线。决策与调研:`docs/revenue-breakthrough-2026-09.md`。

## 它是什么

Metaculus 每年三季举办 bot-only 预测锦标赛(FutureEval,原 AI Benchmark),
每季 **$50,000 奖池、300–500 题**,奖金按预测准确度分配;官方提供模板仓
`Metaculus/metac-bot-template` 与 `forecasting-tools` 框架,并为参赛者提供免费
LLM 额度(OpenRouter 表单)/ Metaculus 自有代理。本目录是该模板的舰队改写:

- `main.py`:与模板同构(binary / MC / numeric / date / conditional 五类题),
  加 **house prior**——遇到 AI/AGI 类题目时把 agiscorecard.com 的 `llms.txt`
  (带日期、带翻转条件的判定)喂给研究步;**red-on-empty**——有题但零成功即 exit 1,
  让 GitHub run 变红(自检要能红);`--dry-run` 只推理不提交。
- `requirements.txt`:`forecasting-tools==0.2.92`(2026-09-05 验证,内置
  `FE_SUMMER_2026_ID = 33022`,即当季赛事)。
- 工作流:`.github/workflows/metaculus-bot.yml`,每 2 小时;**job 级门
  `vars.METACULUS_BOT_ENABLED == '1'`,变量不存在 = 0 分钟、0 副作用**。

## owner 三步(≈10 分钟,我无法代注册)

1. https://www.metaculus.com/futureeval/participate/ 注册 **bot 账号**并生成 token
   (规则、一人一 bot、披露要求以该页为准)。
2. 仓库 `Settings → Secrets and variables → Actions`:
   - Secret `METACULUS_TOKEN`(必需,但**不够**)。⚠️ 2026-09-07 run #15 实测证伪了
     「有 token 就有算力」这个假设:代理确实会转发,但**赞助额度要单独申请**,
     没申请就是 `400 no allowance`(连普通 `gpt-4o` 也一样)。见下方「模型额度」。
   - 可选 Secret `OPENROUTER_API_KEY`:免费额度表单
     https://forms.gle/aQdYMq9Pisrf1v7d8(模板 README 给出),或自建 key。
3. `Variables` 加 `METACULUS_BOT_ENABLED = 1`。

然后 `Actions → Metaculus forecasting bot → Run workflow`,mode = `test_questions`,
dry_run = false,跑完到 Metaculus 个人页确认预测已落(bot-testing-area 赛区)。
之后每 2 小时自动在当季赛 + MiniBench 上对新题预测,已预测过的题跳过。

## ⚠️ 模型额度(2026-09-07 首跑踩到,必读)

**Metaculus 代理的赞助额度是按「模型名」发的,不是按账号发的。** 首跑(run #14)token 通、
API 通、成功拉到 10 道题,但 10 道全挂在同一个错上:

```
400 - You don't have an allowance for model <gpt-4o-search-preview> on <Openai>
```

原因是不显式传 `llms=` 时,`forecasting-tools` 会自己挑 `openai/gpt-4o-search-preview`
做研究步 —— 一个谁也没申请过额度的模型。**教训:库的默认值不是我们的默认值。**

现在 `main.py` 的 `_llm_config()` 把四个角色全部钉死,并且每个都能用仓库变量改:

| 变量 | 作用 | 缺省 |
|---|---|---|
| `BOT_MODEL` | 主模型 | `metaculus/gpt-4o`;若设了 `OPENROUTER_API_KEY` 则 `openrouter/openai/gpt-4o` |
| `BOT_PARSER_MODEL` | parser / summarizer | 同主模型 |
| `BOT_RESEARCHER` | 研究步 | 同主模型(**故意不用带 web search 的**——那类模型几乎肯定没额度) |

**run #15 已经证实就是这种情况**:钉死成 `metaculus/gpt-4o` 之后,错误从 `<gpt-4o-search-preview>` 变成 `<gpt-4o>` —— 模型钉死生效了,但这个账号**一个模型的额度都没有**。
(顺带:这一轮也证明了两处修复有效,日志里能看到 `log_report_summary raised … continuing to our own summary`、干净的 `forecasts=0 failures=10` 摘要、以及下面这段诊断被真的打印出来。)
三条出路,
(失败时脚本自己会把这段打出来):
1. 设 `BOT_MODEL` 换成你确实有额度的模型名;
2. 按 Metaculus 说明发邮件给 **ben@metaculus.com** 申请额度(附 bot 用途与所需模型);
3. 设 Secret `OPENROUTER_API_KEY`(免费额度表单 https://forms.gle/aQdYMq9Pisrf1v7d8),
   设了之后脚本自动改走 `openrouter/openai/gpt-4o`,**不需要改代码**。

同一轮还修了一个把诊断藏起来的缺陷:`bot.log_report_summary()` 在有任何失败时会直接抛异常,
于是我们自己的 red-on-empty 与失败诊断永远轮不到跑 —— 首跑看到的是一屏 traceback 而不是
一行「问题在这」。现在它被 try 包住,**它只是打印器,不该决定命运**。

## 本地冒烟(可选)

```
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
printf 'METACULUS_TOKEN=...\n' > .env   # .env 已在根 .gitignore,永不提交
.venv/bin/python main.py --mode test_questions --dry-run
```

沙箱会话打不到 metaculus.com(代理 403),只有 runner 能跑;本地只能做
`py_compile` + helper 单测(2026-09-05 已做:关键词匹配、house prior 组装、
red-on-empty 退出码)。

## 预登记判定线(写进根 CLAUDE.md)

- **启用后 28 天**(以 owner 设变量之日起算):bot 在当季赛至少 **30 题**有已提交预测,
  且 workflow 30 天成功率 ≥ 80%——否则先修管道,不谈奖金。
- **当季赛结算 + 45 天**(Metaculus 说明奖金在题目全部结算并核验后发放):
  Metaculus 排行榜位次与奖金明细进台账;**零奖金也照记**,下一季是否续跑按
  「位次是否进入前 1/3」定,不按感觉。
- **赛季结算后发一篇复盘(2026-09-07 追加,因为算力申请表上勾了 "Publish a blog article
  or similar")**:内容 = house prior 到底帮了还是害了,按题型分开算,**把它让 bot 变差的
  那些题和帮上忙的那些题一起写**。发在主域(判定型内容进主域集群的老规矩),不做 zh 镜像。
  这条勾了就是承诺,**不兑现就等于在申请表上说了假话**;若赛季结束时数据不足以支撑结论,
  就如实发「样本不够,结论待下季」,而不是不发。
- **禁止**:任何人工干预预测(赛规 bot-only)、把 Amazon 链接或站点推广塞进预测
  说明(合规红线:联盟链接永不进 AI 输出面)、为提高排名伪造研究引用。

## 成本

每 2 小时 × 3–5 分钟 ≈ ≤60 分钟/天 ≈ 1,800 分钟/月,公开仓 Actions 免费;
未启用 0 分钟。LLM 成本走赛事赞助额度;若 owner 自配 key,预算由 owner 定。
