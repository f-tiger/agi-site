# AI 时代，站点如何「被注册」（2026-08-13）

传统时代「被注册」= 被搜索引擎收录，一个动作。
AI 时代它散成了**七层**，每层有各自的注册表、各自的证据、各自的失效方式。
下面按「AI 从不知道你存在 → 主动调用你」的顺序排，每层写清：**现状 / 谁能推进 / 用什么证明**。

> 通篇的硬规矩：**「提交了」不等于「被注册」，「探针能进来」不等于「被抓过」。**
> 唯一算数的证据是 D1 里出现新来源——`ev='bot'` 出现新 UA，或 `ev='api'` 非 curl 调用。

---

## 第 1 层：可抓取（爬虫进得来）

| 项 | 状态 | 证据 |
|---|---|---|
| `robots.txt` 放行 21 家 AI 爬虫 | ✅ | 线上文件 |
| `llms.txt` / `llms-full.txt` | ✅ | 已被抓取 |
| 边缘中间件记 `ev='bot'` | ✅ | 单日约 690 次，OAI-SearchBot / PerplexityBot / Meta-ExternalAgent / Applebot / Googlebot 均在列 |

这一层**已经通了**，且是三线里唯一在指数增长的。它证明 AI 引擎知道我们存在——
但它零收入、零 referral，所以后面六层才是「被注册」真正要解决的事。

## 第 2 层：被索引（进搜索引擎的库）

| 项 | 状态 | 谁能推进 |
|---|---|---|
| sitemap + 真实时钟 lastmod | ✅ | 已自动 |
| IndexNow 主动推送 | ✅ 单次提交 842 个变更 URL（HTTP 200） | 已自动 |
| Google Search Console 站点验证 | ❌ | **owner**（需登录，我做不了） |
| Bing Webmaster Tools | ❌ | **owner** |

GSC 不只是看数据——**它本身就是一次注册动作**（提交 sitemap、请求编入索引）。
Google 点击从 21 掉到 1，这一层没做是可疑因素之一。

## 第 3 层：实体化（AI 把你认成「一个东西」，而不是一堆网页）

AI 引擎回答问题时引用的是**实体**。让它把站点、镜像仓库、MCP server 合并成同一个实体，
靠的是 `sameAs` 互指。

| 项 | 状态 |
|---|---|
| `Organization` JSON-LD | ✅ |
| `Dataset` JSON-LD | ✅ **今日补齐 Google Dataset Search 的推荐字段**：`sameAs`（指镜像仓库）、`version`、`temporalCoverage`（真实核实日期区间）、`variableMeasured`（5 个真实字段）、`measurementTechnique`（我们的核实方法本身） |
| 仓库 → 站点回指 | ✅ README 全篇回链 |
| Wikidata 条目 | ❌ 需真人编辑，且我们目前不够「可被独立来源证实」，**现在做会被删条目**，等外部报道出现再说 |

## 第 4 层：数据集注册表（这是本站最被低估的一层）

我们有的不是「一个网站」，是**一份带出处、带日期、CC BY 4.0 的开放数据集**——
它属于一整套专门的注册体系，而这套体系的收录物**被 AI 引擎当成一等引用源**。

| 注册表 | 怎么进 | 状态 |
|---|---|---|
| **Google Dataset Search** | 靠 schema.org `Dataset` 标注自动收录，**不需要提交** | ✅ 标注今日已补强；能否收录无法从沙箱核实，须 owner 用 datasetsearch 搜 `verified AI free tier` 观察 |
| **Hugging Face Datasets** | 上传 `limits.json`，注明 CC BY 4.0 与回链 | ❌ **owner**（要 HF 账号） |
| **Zenodo → DOI → DataCite/OpenAIRE** | Zenodo 绑定 GitHub 仓库，打一个 release 即自动发 DOI | ❌ **owner**（要 Zenodo 登录，绑定后此后全自动） |

**DOI 这一项值得单独说**：它把数据集注册进学术引用体系，是所有注册动作里
**最不可能被撤销、最容易被 AI 当成权威出处**的一个，而且绑定后每次 release 自动发新版本 DOI。
成本是 owner 点几下，回报是永久的可引用标识符。

## 第 5 层：agent 协议注册表（唯一可计费的那一层）

| 注册表 | 状态 |
|---|---|
| 官方 MCP Registry | ✅ `io.github.f-tiger/verified-ai-free-tiers` v1.3.0，isLatest |
| `/.well-known/mcp.json` | ✅ **今日修掉了里面写死的「162 AI tools」**（真值 218 / 已核实 115）——这份文件正是目录爬虫读走的登记信息，数字错了等于登记了一份假档案 |
| `/openapi.json`（GPT Actions 等靠它自动装配） | ✅ 同样修掉了 162 |
| REST `/api/tools` | ✅ |

## 第 6 层：人肉目录与榜单

| 目标 | 状态 |
|---|---|
| `punkpeye/awesome-mcp-servers` | ✅ PR #12084 已开，检查全通过 |
| Smithery / PulseMCP / mcp.so | ❌ **owner**（域名在本会话不可达，粘贴稿见 [`mcp-submission-packet.md`](./mcp-submission-packet.md)） |
| Glama | 🟡 靠 Registry 摄取 + 仓库根 `glama.json` 认领；是否已评级须 owner 目视 |
| 镜像仓库 topics | ❌ **owner**，且这是前置项——Smithery/Glama/PulseMCP 都按 topics 爬 |

## 第 7 层：被第三方提及（AI 引用你的主要来源其实在这里）

AI 引用一个品牌，**来自第三方来源的概率远高于来自自有域名**。这一层我们几乎是零：
GitHub awesome 列表刚开了第一个 PR，Reddit / HN / 知乎均无真实提及。
这一层无法靠代码解决，也不该靠水军解决——只能靠做出别人愿意主动引用的东西
（我们唯一有这个资格的东西是「查得到出处的数字」）。

---

## 结论：现在最该动的三件事

1. **owner，5 分钟**：GSC + Bing 站点验证并提交 sitemap（第 2 层，唯一在下滑的那条线）。
2. **owner，10 分钟**：仓库 topics → Smithery / PulseMCP / mcp.so 三份表单（第 5/6 层，粘贴稿已备好）。
3. **owner，5 分钟**：Zenodo 绑定镜像仓库并打一个 release（第 4 层，一次动作换永久 DOI）。

我这边已经把**不需要账号的全部做完了**：Dataset 标注补强、`.well-known/mcp.json` 与 `openapi.json` 的假数字修正、
以及一道新门禁——**规模数字（N 个工具 / N tools）不许写死**，写死一个旧数构建就不通过。
「被注册」的前提是登记信息为真，而我们刚刚证明了它会无声地变假。
