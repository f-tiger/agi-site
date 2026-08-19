# Backlink / directory kit（2026-07-12，robots 已屏蔽）

来源：应用 marketingskills 的 `directory-submissions` + `ai-seo` skill。核心逻辑
（研究支撑）：高 DR 目录的 dofollow 外链会抬升全站 DR → 所有页面更易排名；且
**ChatGPT/Claude/Perplexity/Google AI Overviews 在回答"最好的 X 是什么"时大量
从高 DR 目录抓取**，AI 引荐流量转化率是普通搜索的 6–27 倍。

## ⚠️ 诚实定位（skill 的硬规则：错位提交会被拒、烧掉首次提交优势）

agiscorecard **不是 SaaS 工具**，是一个**免费的 AGI 预测追踪数据资源**。所以跳过
所有要求"产品 + 定价页"的 SaaS/AI-工具目录（TAAFT/Futurepedia 的工具库会拒），
只投**真正契合"免费数据/资源/追踪器"品类**的目标。我们最强的可引用资产是
`/data.json`（CC BY 4.0 原始数据集）——这是 skill 说的"原创研究 = 头号引用磁铁"。

## Tier A — GitHub awesome-lists（免费、高 DR、正是 AI 抓取源，最高 ROI）

机制：给相关 awesome 仓库提 PR 加一行链接。每个被合并 = 一条高 DR dofollow 外链
+ 进入 LLM 训练语料。你（或让我）用带权限的会话对这些外部仓库发 PR：

| 目标仓库 | 加在哪个分区 | 建议文案 |
|---|---|---|
| awesome-agi / awesome-artificial-general-intelligence | Resources / Trackers | `- [AGI Scorecard](https://agiscorecard.com) — independent scorecard grading Aschenbrenner's "Situational Awareness" AGI-by-2027 predictions against live evidence; machine-readable dataset (CC BY 4.0).` |
| awesome-ai-safety | Forecasting / Monitoring | 同上，强调 8 项预测的判定与翻转条件 |
| awesome-forecasting / awesome-prediction | Datasets | 强调 /data.json + forecaster timeline 表 |
| awesome-llm / awesome-ai（大列表的 "Resources" 分区）| Resources | 强调 AGI 时间表追踪 |

> 找列表：GitHub 搜 `awesome agi`、`awesome ai safety`、`awesome forecasting`；
> 选 star>200、近 3 月有更新、README 有"Contributing"的。每个仓库只提一次 PR。

## ✅ 已核实的具体高 DR 目标（2026-07-12 调研）

| 仓库 | Star | 契合分区 | 加的那一行 | 状态 |
|---|---|---|---|---|
| **awesomedata/awesome-public-datasets** | 76.9k | Machine Learning | `- [AGI Scorecard](https://agiscorecard.com/data.json) — verdicts + a 0–100 Thesis Tracker score for the 8 Situational Awareness AGI-by-2027 predictions, with score history. CC BY 4.0.` | 待提 PR（仓库需加入会话 scope）|
| **ComposioHQ/awesome-claude-skills** | 67k | Skills | 加 /skill（我们的可安装 agent skill）| 待提 PR |
| **sindresorhus/awesome** | 484k | 需先进某个二级 awesome-list | 间接 | 低优先 |

> 提 PR 的自动化路径：把目标仓库加入会话 scope（add_repo），我即可 fork→加行→提 PR，全程无需你写字。或由每日运行触发器按此清单逐个尝试。数据集类列表对 /data.json 是最诚实的契合点（它就是一个 CC BY 4.0 开放数据集）。

## Tier B — 数据集 / 资源目录（契合 /data.json）

| 目标 | 提交方式 | 备注 |
|---|---|---|
| Product Hunt | 发布（tracker/resource 可发）| 用下方 PH 文案；配 60–90s 录屏最佳 |
| Hacker News（Show HN）| 提交链接 | 见 distribution-kit.md §1（已备好）|
| data.world / Kaggle Datasets | 上传 data.json 镜像 + 指回站点 | CC BY 4.0，天然契合 |
| Awesome Public Datasets（GitHub）| PR | 归到 "Machine Learning" 分区 |

## Tier C — AI 资源/新闻目录（契合"资源"而非"工具"品类的那些）

只投接受"AI 资源/新闻/追踪器"的：aitools.inc 的 Resources、There's An AI For That
的 "AI news" 类目（若接受非工具）、Futurepedia 的 "AI Resources"。**逐个看品类是否
真的匹配，不匹配就跳过**（宁缺毋滥，skill 的 triage 规则）。

## 每处提交用的定位文案（skill：每个平台变体不同，避免 AI 判重复内容降权）

**Tagline（<10 词）**：`Is AGI on track? A live scorecard of the 2027 bet.`

**Short（60 字符）**：`Live scorecard grading AGI-by-2027 predictions.`

**Long（~150 词，GitHub/PH 用）**：
```
The AGI Scorecard independently grades every major prediction from Leopold
Aschenbrenner's 2024 essay "Situational Awareness" against real-world evidence.
Two years in: 3 on track, 1 wrong, 2 open, 2 too early — each verdict carries a
pre-registered condition that would flip it. The headline "AGI by 2027" claim
resolves by January 2028. Everything is free and machine-readable: a CC BY 4.0
dataset at /data.json, an Atom feed, an llms.txt index, README badges, and an
installable agent skill. 135 pages across 9 languages. Not affiliated with any
AI lab. Built to be cited — original verdict data is the point.
```

**Product Hunt tagline**：`Track whether AGI is actually on track for 2027`

## 提交后（skill 的测量法，每月一次，可让我做）
- 分别问 ChatGPT / Claude / Perplexity「what are the best AGI-tracking resources?」
  记录是否出现 agiscorecard；进展写进 analytics-notes.md。
- GA4 Referral 渠道会自动记录各目录带来的流量。

## 我能替你自动做的部分
- Tier A 的 awesome-list PR：给我目标仓库名，我用带权限会话起草并提 PR（外部仓库
  需你确认加入会话 scope）。
- 每月 AI 引用抽查 + 记录。
- 任何目录的定位文案变体，随时生成。
