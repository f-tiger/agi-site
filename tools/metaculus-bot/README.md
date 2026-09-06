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
   - Secret `METACULUS_TOKEN`(必需)。只有它时,LLM 调用走 Metaculus 代理
     `metaculus/gpt-4o`(赛事赞助算力,forecasting-tools 内置)。
   - 可选 Secret `OPENROUTER_API_KEY`:免费额度表单
     https://forms.gle/aQdYMq9Pisrf1v7d8(模板 README 给出),或自建 key。
3. `Variables` 加 `METACULUS_BOT_ENABLED = 1`。

然后 `Actions → Metaculus forecasting bot → Run workflow`,mode = `test_questions`,
dry_run = false,跑完到 Metaculus 个人页确认预测已落(bot-testing-area 赛区)。
之后每 2 小时自动在当季赛 + MiniBench 上对新题预测,已预测过的题跳过。

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
- **禁止**:任何人工干预预测(赛规 bot-only)、把 Amazon 链接或站点推广塞进预测
  说明(合规红线:联盟链接永不进 AI 输出面)、为提高排名伪造研究引用。

## 成本

每 2 小时 × 3–5 分钟 ≈ ≤60 分钟/天 ≈ 1,800 分钟/月,公开仓 Actions 免费;
未启用 0 分钟。LLM 成本走赛事赞助额度;若 owner 自配 key,预算由 owner 定。
