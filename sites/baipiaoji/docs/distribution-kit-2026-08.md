# 分发套件 2026-08 — baipiaoji.com（reddit-engagement + hacker-news-strategy 技能产出）

**性质**：复制即发的帖子草稿 + 热身清单。**绝不自动发帖**——两个技能的共同铁律是
社区把营销当敌人，自动发帖 = 账号与域名双毁；发布是 owner 的分钟级手动动作。
本文件不触碰冻结令：零新页、零新功能，分发的全部是已上线资产。

**一句话给 owner**：先发 HN Show HN（官方许可的自荐通道，无需养号），V2EX 可同周发；
Reddit 两个 sub 先按热身清单评论 2 周再发。

**分发的三件资产（全部已上线、已核实）**：
1. **数据集**：219 个工具的免费额度，逐条对官方来源核实、带出处与核查日期，
   CC BY 4.0（镜像仓 f-tiger/verified-ai-free-tiers；MCP server 已在官方 registry）。
2. **拒绝清单**（/no-source 数据 `data/no-source.json`）：16 个工具因**查无官方出处**
   而拒绝填数——「缺席本身就是信息」。这是全网 listicle 都没有的负空间资产。
3. **纠错发现**：Sourcegraph Cody 免费档 2025-07-23 停服（官方博客为源），
   死了 13 个月后仍被编程工具 listicle 推荐——竞对的系统性错误就是本站的证词。

## 诚实的前置判断

- **HN**：Show HN 允许自荐新作品，数据集+MCP server 是 HN 喜欢的形状 → 第一优先。
- **V2EX /create（分享创造）**：允许发自己的项目，中文受众与本站重合度最高 →
  与 HN 同周。
- **r/LocalLLaMA**：开放数据/agent 工具容忍度中等，但仍要 10:1 与账号历史。
- **r/ChatGPT**：体量大、自荐容忍度低；只发「发现」不发「产品」，链接放评论区。
- **10:1 纪律**：发 1 个自家链接前，账号近期要有 ~10 条与自家无关的真实参与。
- 若 owner 的 Reddit 账号全新且零热身：**不如不发**，0 分沉底还可能被标记。

## 帖子 1 — Hacker News（Show HN）

- **URL**：`https://baipiaoji.com/en/`（英文首页；若 mod 改链到根域也无妨）
- **标题**（≤80 字符，两版任选）：
  - A: `Show HN: Verified free-tier limits of 219 AI tools – every figure sourced and dated`
  - B: `Show HN: A dataset of AI free-tier limits, incl. 16 tools we refused to publish`
- **发布时间**：周二/三/四，13:00–16:00 UTC（美东早晨）。发完 2–3 小时在场回评论。
- **首条自评**：

```
Hi HN — maintainer here. The origin story: every "best free AI tools" listicle
hands you numbers, and when we tried to trace them, a lot had no official
source at all. So we built the boring version: 219 tools, every free-tier
figure verified against an official page, with the source URL and the date we
checked it. When a vendor publishes nothing verifiable, we refuse to print a
number — 16 tools currently sit on that refusal list, with the reason each one
failed verification. The absence is the information.

One concrete find: Sourcegraph shut down Cody's free tier in July 2025 (their
own blog). Thirteen months later, coding-tool listicles still recommend
"Cody Free". Vendors don't announce free-tier deaths; our daily re-check
cycle exists because of exactly this.

The dataset is CC BY 4.0 (github.com/f-tiger/verified-ai-free-tiers) and
there's an MCP server on the official registry if you want your agent to
query it directly (no auth, streamable HTTP). Corrections welcome — a figure
with a source can be wrong too, and we publish the fix with the diff.
```

- **预期与失败信号**：目标是评论区出现纠错与补充（那就是这个资产的复利）。
  90 分钟 <5 分且无评论 = 死帖；24 小时后可用另一版标题重投一次；两次死 = 停。
- **红线**：不拉票；被指出错误立刻认领并现场修数据——这正是本站的卖点。

## 帖子 2 — r/LocalLLaMA（热身后，text post）

- **版规核对**：发前读 sidebar；开源/数据集向内容接受度较高，但直链自站仍要谨慎，
  正文给足内容、链接一条就够。
- **标题**：`I verified the free-tier limits of 219 AI tools against official docs — 16 had no official source at all`
- **正文骨架**：① 动机（listicle 数字查无出处）② 方法（逐条官方来源+核查日期+
  拒绝规则）③ 两个具体发现：Cody 免费档死 13 个月仍被推荐；16 个「查无出处」
  工具名单节选 ④ 数据集 CC BY 4.0 + MCP server 一句话 ⑤ 求纠错。
- **首条自评**：贴拒绝清单全部 16 个 slug + 各自一句原因（素材在
  `data/no-source.json`，中英文都有）。
- **发布时间**：周二–周四 13:00–15:00 UTC。
- **失败信号**：2 小时 0 赞 0 评 = 沉底，不重发；被 mod 移除私信询问，不争论。

## 帖子 3 — r/ChatGPT（与帖子 2 错开 ≥3 天，角度必须换）

- **角度**：纯「发现」帖，不提产品名在标题里。
  标题：`The free-tier numbers in "best AI tools" listicles often have no official source — we tried to trace them`
- **正文**：讲清 Cody 案例（死 13 个月仍被推荐，官方博客链接为证）+ 「16 个工具
  连官方口径都不存在」的发现；结尾一句「整理了一份带出处的对照表，链接在评论区
  （免费、无登录、CC BY 4.0）」。**链接只放评论区**——该 sub 对正文自链容忍度低。
- **发布时间**：工作日 14:00–16:00 UTC 或周末 15:00–17:00 UTC（消费级 sub 周末不弱）。
- **失败信号**：1 小时 <10 赞基本沉底；接受即可，不重发。

## 帖子 4 — V2EX /create 分享创造（中文，可与 HN 同周）

- **标题**：`白嫖计：219 个 AI 工具的免费额度逐条对官方来源核实，查无出处的 16 个我们拒绝填数`
- **正文骨架**：① 起因：中文互联网流传的免费额度数字大多查无出处 ② 方法：每个数字
  带官方来源链接+核查日期，官方没说的直接标「拒绝」 ③ Cody 案例一段 ④ 数据集
  CC BY 4.0 + MCP server（V2EX 技术受众吃这个）⑤ 求纠错、求补工具。
- **发布时间**：工作日北京时间 10:00–12:00（= 02:00–04:00 UTC）。
- **失败信号**：V2EX 首小时无回复常见，24 小时零回复 = 沉底，不顶帖。

## 参与前热身清单（08-17 → 08-30，每天 10 分钟，只评论不发帖）

- [ ] r/LocalLLaMA：在「哪个免费 API/模型额度够用」类提问下用本站已核实的数字
  作答（写数字和官方出处，**不带自家链接**）——这类提问几乎每天都有
- [ ] r/ChatGPT：在「XX 免费版限制是多少」的提问下同上；遇到引用错误数字的
  高赞评论，礼貌给出官方来源纠正
- [ ] HN：账号若全新，先在 AI 工具/定价相关帖下留 2–3 条实质评论
- [ ] V2EX：老账号无需热身；新账号注册有发帖冷却期，提前注册
- [ ] 全程红线：不提站名、不拉票、不开小号、同一内容不同日不同角度才能跨社区

## 判定与回写

- 发布后把帖子链接、时间、结果（24h/72h 分数与评论数）记入 `docs/growth-report.md`
  或本文件末尾；D1 里看 `go`/`sub_view` 与 referrer 构成变化（技能口径：referral
  出现 news.ycombinator.com / reddit.com / v2ex.com 才算真触达）。
- 任何社区帖换来的纠错，按 `scripts/limits-edit.mjs` 两步流程入库——社区分发的
  真正回报是数据集本身变硬。
