# MCP 目录站提交件（可直接粘贴 · 2026-08-13）

给 owner 用的单页粘贴稿：Smithery / PulseMCP / mcp.so 这类**表单提交**，
本会话的出口代理不放行（实测 `smithery.ai`、`www.pulsemcp.com`、`mcp.so`、`glama.ai`
全部返回 HTTP 000），只能由 owner 在浏览器里完成。

> **一句必须说清的话**：我**没有读到这几家表单的真实字段**（域名不可达）。
> 所以下面不是「逐字段对照表」——那会是编的。下面是**一份规范事实清单**：
> 任何一家表单要什么，从这里取对应长度的那一段粘贴即可。
> 遇到清单里没有的字段，宁可留空，也不要现填一个没核实的数。

---

## 0. 提交前的唯一前置条件

镜像仓库 `f-tiger/verified-ai-free-tiers` 的 **description 与 topics 必须先设好**，
因为 Smithery / Glama / PulseMCP 都按 GitHub topics 爬远程 MCP server——
先设 topics 再提交，等于同一件事做一次收两份效果。

- **Description**（仓库 Settings → 顶部 Description 框）：
  ```
  Verified AI free-tier limits and commercial-use verdicts — 218 tools, every figure sourced and dated. MCP server included.
  ```
- **Topics**（About 齿轮 → Topics）：
  ```
  mcp  mcp-server  ai-tools  free-tier  dataset
  ```

---

## 1. 身份字段

| 字段 | 值 |
|---|---|
| Registry 规范名 | `io.github.f-tiger/verified-ai-free-tiers` |
| 展示名（长） | Verified AI Free-Tier Data (Baipiaoji) |
| 展示名（短，≤30 字符） | Verified AI Free Tiers |
| Slug / ID | `verified-ai-free-tiers` |
| 维护者 GitHub | `f-tiger` |
| 仓库 | https://github.com/f-tiger/verified-ai-free-tiers |
| 主页 / 文档 | https://baipiaoji.com/mcp.html |
| 数据许可 | CC BY 4.0（署名「白嫖计 baipiaoji.com」并回链） |

命名一律用**描述词而非品牌词**：用户在目录里搜的是 "free tier"，不是「白嫖计」。

## 2. 连接字段

| 字段 | 值 |
|---|---|
| Server URL / Endpoint | `https://baipiaoji.com/api/mcp` |
| Transport | Streamable HTTP（无 SSE、无 stdio） |
| Authentication | **None**（无需 API key、无需 OAuth） |
| 是否需要安装 | 否（远程服务，无 npm 包） |
| 是否有状态 | 无状态（stateless，每次请求自足） |
| 版本 | 1.3.0 |

安装片段（表单常有 "installation" 或 "config" 框）：

```
claude mcp add --transport http baipiaoji https://baipiaoji.com/api/mcp
```

```json
{ "mcpServers": { "baipiaoji": { "type": "http", "url": "https://baipiaoji.com/api/mcp" } } }
```

## 3. 描述（按字数取用，都已核实过数字）

**≤60 字符**
```
Verified AI free-tier limits, with sources and check dates.
```

**≤100 字符**（官方 Registry 用的就是这条）
```
Verified AI free-tier limits, quota comparisons, commercial-use verdicts and zero-cost workflows.
```

**≤250 字符**
```
Free-tier limits, quotas and commercial-use verdicts for 218 AI tools. Every figure is traced to an official vendor page and carries the date it was checked; where a vendor publishes no figure, the entry says so instead of a guess.
```

**长版（About / README 类的框）**
```
A no-auth remote MCP server over a hand-verified dataset of AI free-tier limits.

A number is published only when an official vendor page states it, and the date it
was checked travels with it. Where a vendor publishes no figure, the entry says so
instead of repeating a number that circulates without a source — of 218 listed
tools, 115 have a verified ceiling and the rest deliberately carry none.

Agents can search the directory, read a single verified ceiling, compare a whole
category side by side, fact-check a circulating claim, check whether free-tier
output may be used commercially, or audit an entire stack in one call.

Streamable HTTP, no authentication, nothing to install. Data is CC BY 4.0.
```

**数字的出处（别人问起时）**：218 = `data/tools.json` 条目数；115 = 其中带已核实 limits 的条数。
两个数会随每日核实变动，粘贴前若隔了很久，用 `node -e` 数一遍再填，**不要凭记忆写**。

## 4. 标签 / 关键字（各家统一用这套）

```
ai-tools  free-tier  limits  quota  pricing  rate-limits  commercial-use  licence  directory  verified
```

## 5. 分类怎么选

表单一般要选一个 category。按已核实的邻居形态选：
- 有 **Search / Data / Knowledge** 类 → 选它（awesome-mcp-servers 里我们就落在
  `🔎 Search & Data Extraction`，邻居是同形态的 `qinisolabs/icdwise`）
- 只有 **Developer Tools / API** 类 → 选它
- 有 **Finance / Pricing** 类 → 也成立（我们答的是「花多少钱」这类问题）

不要选 Automation、Agent Framework——名不副实的分类会被维护者退回。

## 6. 能力清单（表单问 "what does it do" 时按需裁剪）

**13 tools**

| Tool | 回答什么问题 |
|---|---|
| `search_ai_tools` | 按类目 / 是否全免费 / 是否可在中国用 / 能力标签 / 关键词搜整个目录 |
| `get_free_tier_limit` | 某个工具的免费额度到哪为止、到墙了会怎样、官方出处、核实日期 |
| `compare_free_tiers` | 整类横向对比（chat / coding / video / image / api）：计什么量、何时重置、有没有公布数字 |
| `check_free_tier_claim` | 把流传的说法拿去对官方页面核对——很多热门数字根本没有出处 |
| `check_commercial_use` | 免费额度产出能否商用：来自厂商自己条款的五种判定 |
| `audit_ai_stack` | 一次调用审整套技术栈：各自的额度、商用判定、近期变更、以及哪些其实没人公布 |
| `build_free_workflow` | 完全用免费额度完成一件事的完整步骤，外加零预算的赚钱打法 |
| `get_free_tier_changes` | 谁最近改了免费额度——厂商不公告，这来自每日重新核实 |
| `check_api_quota_fit` | 用官方 API 限额去除你的真实负载：哪些扛得住、哪些超、一次性额度能撑多久 |
| `find_free_alternatives` | 到墙之后换什么：同类目里真正全免费的替代 |
| `get_category_playbook` | 比数字之前该先问什么，以及免费额度墙的分类学与已核实实例 |
| `get_china_ai_rules` | 面向中国大陆发布的两道门：厂商条款，以及叠加其上的 AI 内容标识义务 |
| `explain_missing_figure` | 为什么这个数字缺席——厂商拒绝公布 / 官方页面自相矛盾 / 根本没有官方页面 |

**9 resources**（一次拉整份数据集）
`baipiaoji://limits` · `://directory` · `://quotas` · `://myths` · `://workflows` · `://changes` · `://no-source` · `://insights` · `://dataset`

**3 prompts**（会出现在客户端的提示词选择器里）
`audit-my-ai-stack` · `pick-a-free-tier` · `fact-check-a-free-tier-claim`

## 7. 其他常见框

- **Contact / maintainer email**：owner 自填（本会话不代填身份信息）
- **Screenshot / logo**：可用 https://baipiaoji.com/mcp.html 的截图；无专用 logo 时留空
- **Pricing**：Free（数据 CC BY 4.0，服务无鉴权无收费）
- **Source code**：https://github.com/f-tiger/verified-ai-free-tiers
- **Registry listing**：https://registry.modelcontextprotocol.io/v0/servers?search=verified-ai-free-tiers

## 8. 提交后怎么算数（不靠感觉）

收录成功的证据只有一种：**D1 里出现新的来源**。
- 目录站的爬虫来抓 → `ev='bot'` 出现新 UA
- 真实 agent 通过目录发现并调用 → `ev='api'` 且 UA 非 curl，`path=/api/mcp/<tool>`

两者都已在每日循环的三线度量里，**不需要额外动作**。
在这两条出现之前，「提交了」只等于「提交了」，不等于「被收录」，更不等于「被调用」。
