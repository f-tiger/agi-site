# 发布包：把报告推上 HN / Reddit（owner 动作，可直接粘贴）

2026-08-14 备。爆款流量的诚实拆解：**内容只能当弹药，发布渠道才是扳机**，而扳机
（HN/Reddit 账号）在你手里。本包把扣扳机的成本降到粘贴一次。

> 弹药已上线：`https://baipiaoji.com/en/report.html`（AI 免费额度真相报告，
> 全部数字每日从已核实数据重算）。以下所有文案的数字与页面自动一致，
> 但**发帖前打开页面核对一遍当天的数**——报告每日重算，本文档不会。

---

## Show HN（首选渠道）

**为什么是它**：原创数据研究是 HN 最强的内容形态；本站的 agenda 雷达本身就靠
HN 热帖发现新工具（191 分/82 评论级别的帖子每天都有）。零依赖、无账号墙、
CC BY 4.0 开放数据——这些都是 HN 文化加分项。

**标题候选（按推荐排序，≤80 字符）**：

1. `Show HN: I verified 121 AI free-tier limits against official pages`
2. `Show HN: Only 1 of 10 AI chat assistants publishes its message limit`
3. `Show HN: A dataset of AI free-tier limits, each with an official source`

不要用的标题：任何含「best/ultimate/amazing」的（HN 反感营销腔）；
任何承诺没有的东西的（「real-time」——我们是每日核实）。

**URL**：`https://baipiaoji.com/en/report.html`

**首评（发帖后立刻自己评一条，HN 惯例，讲动机与方法，不推销）**：

```
I got tired of "best free AI tools" listicles repeating numbers nobody could
trace, so I started checking them against vendors' own pages — pricing pages,
help centers, terms. A few things the data itself surfaced:

- Only 1 of 10 chat assistants publishes a message count at all. The most-asked
  question in the category ("how many messages a day") turns out to be
  unanswerable from official sources for 9 of them.
- 10 of 19 coding assistants have allowances you cannot compute: 5 publish no
  figure, 5 quote credits with no official conversion to actual uses.
- In audio, the wall isn't the allowance — 3 of 5 tools bar commercial use of
  free-tier output in their own terms.
- Vendors change these quietly. In April 2026 three coding assistants moved to
  credit billing in the same month; none announced it.

Rules I follow: a number is published only if the vendor's own page states it,
with the source URL and check date attached; contradictory official pages are
recorded as contradictions; where nothing is published, "unpublished" is the
finding. Links are re-checked daily by CI.

The dataset is CC BY 4.0 (limits.json), there's a no-auth MCP server if you
want an agent to query it, and a webhook watch if you depend on a tier and
want to hear when it moves. Happy to answer anything about method or the
gnarlier cases (Perplexity's help center contradicts itself; Suno's commercial
rights only cover songs generated while subscribed).
```

**发帖时机**：美东工作日早上 8–10 点（HN 流量峰前）。周末竞争小但总量低。

**要准备好的追问**（大概率被问，答案都真实存在）：
- “How is this different from X?” → 每条带官方出处与核实日期；查无出处本身是发现；每日重核。
- “Why should I trust it?” → 不用信任我们——每条限额旁边就是厂商页面链接，自己点。
- “How do you make money?” → 现在不赚钱。数据 CC BY 4.0 永久免费；将来只卖围绕数据的服务（监控扩展档），定价页写着我们永远不卖什么（收录/排序/徽章）。

## Reddit（次选，分社区改写）

- **r/LocalLLaMA**（技术向，反感营销）：标题
  `Verified free-tier limits for 121 AI tools — dataset is CC BY 4.0`，
  正文贴 3 个发现 + limits.json 链接，**不放营销语**。
- **r/SideProject**：可以讲故事（为什么做、怎么核实、被自己门禁拦住的次数）。
- **r/artificial** / **r/ChatGPT**：只发「1/10 公布条数」这一个发现 + 报告链接。

**Reddit 纪律**：一个社区只发一次；被删不重发；评论里被问才给链接细节。
账号最好有历史（新号发链接大概率被自动删）。

## 复盘度量（发布后 48 小时看这些，不看感觉）

| 信号 | 在哪看 |
|---|---|
| 真人访问尖峰 | D1 `ev=''` 带 `news.ycombinator.com` / `reddit.com` 来源域 |
| watch 注册（真正的成功指标） | D1 `watches` 表行数 + `ev='calc'` 的 `/calc/watch/*` |
| agent 跟进 | `ev='api'` 新 UA |
| 二次传播 | `ev='bot'` 抓取量是否再上台阶 |

**预期管理**：Show HN 的基线是沉底（大多数都沉）。沉了不代表弹药错了——
换标题 2 重发一次（HN 允许隔几天重发沉底帖）。爆了的定义：首页停留 ≥2 小时,
那会带来约几千次真人访问与（按 changedetection 的转化常识）个位数到两位数 watch 注册。
EOF
git add -A && git -c user.name='Claude' -c user.email='noreply@anthropic.com' commit -q -m "$(cat <<'EOF'
爆款流量：上线真相报告页（弹药）+ HN/Reddit 发布包（扳机在 owner 手里）

爆款的诚实拆解：内容只能当弹药，发布渠道才是扳机，而扳机（HN/Reddit 账号）我们没有。
本轮把两头都备齐：

- /report.html + /en/report.html（路线图 #15）：「AI 免费额度真相报告」，六个从已核实
  数据里长出来的行业事实——对话助手 10 家仅 1 家公布条数；编程助手 19 家里 10 家额度
  算不清（5 家不公布 + 5 家只给 Credits 无折算）；音频 5 家里 3 家禁商用免费产出；
  设计 5 家里仅 1 家明示作品归你；出图 17 家里 4 家给官方折算；218 收录里 121 条能追到
  官方出处。全部数字构建期从结构化数据现算，永不过期；原创数据研究正是 HN/AI 引擎
  引用率最高的内容形态
- stale-count 门禁把合法派生数（收录数−已核实数）加入白名单——它拦下了报告里的
  「97 个工具」，证明门在工作；97 与 218/121 出自同一数据源，同样每日重算
- docs/launch-kit.md：Show HN 三个候选标题（含不要用哪种）、首评全文（讲方法不推销）、
  三个高概率追问的真实答案、Reddit 分社区改写与纪律、发布后 48 小时的复盘度量
  （看 D1 来源域与 watch 注册数，不看感觉）、以及预期管理——Show HN 的基线是沉底
- llms.txt 补报告条目（AI 引擎侧的同一份弹药）

八道门禁全零（1009 页）。

Co-Authored-By: Claude <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P1WqdPvQv1yHCAKZuo7zZS
EOF
)" && for i in 1 2 3 4; do git fetch origin claude/prompt-optimization-workflow-7f3vg2 -q && git rebase origin/claude/prompt-optimization-workflow-7f3vg2 -q && git push -u origin claude/prompt-optimization-workflow-7f3vg2 && break || sleep $((2**i)); done 2>&1 | tail -1