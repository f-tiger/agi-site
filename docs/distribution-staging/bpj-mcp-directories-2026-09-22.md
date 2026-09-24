# bpj MCP 服务器：目录提交清单（owner 手办，2026-09-22）

自动化能做的已经做完：官方注册表由 `bpj-mcp-publish.yml` 在 `server.json` 版本变化时经 GitHub OIDC 自动发布，
发布后断言注册表反映了新版本；`scripts/mcp-discovery-probe.mjs` 每日读官方注册表与下面几个目录的公开搜索页，
写进 `sites/baipiaoji/data/mcp-discovery.json`。**第三方目录没有一个提供免密钥的提交 API**，所以这一步只能由你做。

## 当前事实（2026-09-22 探针）

| 面 | 状态 |
|---|---|
| 官方注册表 registry.modelcontextprotocol.io | **已登记** `io.github.f-tiger/verified-ai-free-tiers` v1.13.0，isLatest，2026-09-22 15:38 UTC 自动发布 |
| `/.well-known/mcp.json` | 200，本轮起带 version / registry 名 / remotes |
| `/openapi.json` · `/llms.txt` | 200 |
| Glama | **已收录**（Glama 同步官方注册表；探针在其搜索页读到 `io.github.f-tiger/verified-ai-free-tiers`，标「Server is responding」，`recentToolCallCount: 0`）——零操作得来的第一个第三方目录 |
| PulseMCP / mcp.so / Smithery / cursor.directory | 探针在公开搜索页里**没有看到**本站（这些页多为客户端渲染，found:false 只表示「从这里没看见」；cursor.directory 对探针回 429） |
| 公开数据集仓 `f-tiger/verified-ai-free-tiers` | **公开**（2026-09-23 核实），含 `server.json` + `glama.json`。README 本轮补上 16 工具 / 10 资源 / Agent 目录链接，`server.json` 改为每日镜像注册表 isLatest（1.13.0）；**仓库 description / website / topics 三项仍为空**（见下「GitHub 仓库设置」） |
| 舰队四个远程 MCP 端点 | bpj / SR / eco / MCP Pulse 2026-09-23 逐个 `initialize` 往返成功；四个 Glama connector 页与徽章均 200 |

## 逐个目录：要什么、本站给不给得了

**先说结论**：「按 URL 收录」的（PulseMCP、mcp.so、cursor.directory）可以直接填；「按 GitHub 仓库收录」的（Smithery）
用已经公开的 `f-tiger/verified-ai-free-tiers`——**09-22 这里写「需要你决定是否建公开镜像仓」是错的，那个仓早就存在且公开**，
只是没人把它当成提交入口。

| 目录 | 提交入口 | 需要什么 | 本站能否满足 | 建议 |
|---|---|---|---|---|
| PulseMCP | https://www.pulsemcp.com/submit | 服务器 URL + 名称 + 描述（表单） | ✅ | 直接填 |
| mcp.so | https://mcp.so/submit | 名称 + URL + 描述（表单/登录） | ✅ | 直接填 |
| cursor.directory | https://cursor.directory/ 页脚 Submit | 名称 + 配置片段 | ✅ | 直接填 |
| Glama | 已自动收录（同步官方注册表） | 认领/编辑条目需 GitHub 登录 | ✅ 已在 | 不用提交；想认领再登录 |
| Smithery | https://smithery.ai/new | GitHub 登录 + 关联仓库（远程服务器也走仓库） | ✅ 用公开的 `f-tiger/verified-ai-free-tiers`（已有 server.json） | 你登录后选这个仓库；本会话登录不了 |
| Docker MCP Catalog | PR 到 docker/mcp-registry | Docker 镜像 | ❌ 本站是远程 HTTP 服务器，无镜像 | 不做 |
| Claude / ChatGPT 官方连接器目录 | 各家合作伙伴表单 | 企业资质 + 审核 | ❌ solo | 不做 |

## 可直接粘贴的字段（三处一致，改一处要同步 server.json）

- **名称**：Baipiaoji — Verified AI free tiers + agents/MCP directory
- **登记名**：`io.github.f-tiger/verified-ai-free-tiers`
- **端点**：`https://baipiaoji.com/api/mcp`（streamable HTTP，无鉴权）
- **主页**：`https://baipiaoji.com/mcp` ｜ 文档 `https://baipiaoji.com/developers.html`
- **一句话（≤100 字符，与 server.json 逐字相同）**：`Verified AI free tiers plus source-backed agent and MCP discovery monitoring.`
- **详细描述（英文）**：No-auth remote MCP server exposing Baipiaoji's verified data as 16 tools, 10 resources and 4 prompts: free-tier limits with official sources and check dates for 200+ AI tools, commercial-use verdicts, a change log, and a 900+ record directory of AI agents, MCP servers and agent platforms with per-URL check dates. Data rebuilds daily. Own fields CC BY 4.0 with attribution.
- **详细描述（中文）**：无鉴权的远程 MCP 服务器，把白嫖计的已核实数据变成 16 个工具、10 份资源与 4 条提示词：200+ 个 AI 工具的免费额度（带官方来源与核实日期）、商用判定、变更日志，以及 900+ 条 AI Agent / MCP 服务器 / Agent 平台目录（每条 URL 带核验日期）。数据每日重建。本站字段 CC BY 4.0，引用请注明来源。
- **标签**：ai-tools, free-tier, limits, pricing, commercial-use, agents, mcp-directory, verified, changelog
- **配置片段（Claude Desktop / Cursor / Cline 通用）**：

```json
{ "mcpServers": { "baipiaoji": { "url": "https://baipiaoji.com/api/mcp" } } }
```

## 提交后

不用告诉我；`mcp-discovery.json` 次日会自己读到（只有 `found:true` 算数）。判定线 `bpj-mcp-discovery-1103`：
11-03 前 ≥2 个第三方目录 found:true。数字上的提醒：描述里改用下限写法（200+ / 900+），目录里的描述不会自动更新，写下限就不会过期；16 / 10 / 4 仍会随站点变化，
目录里的描述不会自动更新——这是所有目录提交的通病，半年复核一次即可。

## awesome-remote-mcp-servers：四条可直接粘贴的条目（2026-09-23）

`punkpeye/awesome-remote-mcp-servers`（Glama 维护，只收托管的远程服务器）。规则逐条对过：端点必须答 MCP `initialize`（四个都答了）、
任何人可用（四个都无鉴权）、必须带 Glama connector 徽章（四个都有）、每条三行、说明一句话 ≤120 字符并以句号结尾、分类内按字母序不分大小写。
**它不收的**：本地进程型服务器——那是 `punkpeye/awesome-mcp-servers`，它现在不收托管服务器；如果以前为那张表开过分支或 PR，关掉即可。

**为什么只能你做**：CONTRIBUTING 写明「开 PR 的账号必须先给仓库点星，否则不合并」。本会话没有点星的工具，也不应在第三方仓库上以你的身份提交。
建议**一个服务器一个 PR**（CI 按 PR 打标签，小 PR 合得快）；标题末尾可加 `🤖🤖🤖`（该仓对代理 PR 走快速通道）——只在你用 agent 提交时加。

步骤：点星 → Fork → 在 GitHub 网页上编辑 `README.md` → 把下面一条插到指定位置 → 提 PR，描述写「Adds <Name>, a no-auth remote MCP server: <那一句>」。

**1. Aggregators — 插在 `AgentBIT` 与 `Fatstack` 之间**
```markdown
- [Baipiaoji](https://baipiaoji.com/en/mcp) `https://baipiaoji.com/api/mcp`
  [![Baipiaoji MCP connector](https://glama.ai/mcp/connectors/io.github.f-tiger/verified-ai-free-tiers/badges/score.svg)](https://glama.ai/mcp/connectors/io.github.f-tiger/verified-ai-free-tiers)
  🔓 - Verified free-tier limits of 200+ AI tools with sources and check dates, plus a 900+ record agent and MCP directory.
```

**2. E-Commerce — 插在 `Sense2` 与 `Stienhardt Diamond MCP` 之间**
```markdown
- [SourceRadar](https://source.agiscorecard.com/mcp) `https://source.agiscorecard.com/api/mcp`
  [![SourceRadar MCP connector](https://glama.ai/mcp/connectors/io.github.f-tiger/us-import-duty-facts/badges/score.svg)](https://glama.ai/mcp/connectors/io.github.f-tiger/us-import-duty-facts)
  🔓 - Dated US import facts for sellers: CBP rulings, Section 301 ladder, landed cost, Federal Register changes and recalls.
```

**3. Environment — 插在 `echorune` 与 `FindEnergyRates` 之间**
```markdown
- [EcoBack](https://getecoback.com/mcp.html) `https://getecoback.com/mcp/v1`
  [![EcoBack MCP connector](https://glama.ai/mcp/connectors/io.github.f-tiger/hvac-btu-heat-klimaanlage/badges/score.svg)](https://glama.ai/mcp/connectors/io.github.f-tiger/hvac-btu-heat-klimaanlage)
  🔓 - Room-climate calculators for Germany and the EU: AC BTU sizing, window-seal length, heatwave outlook, running costs.
```

**4. Developer Tools — 插在 `Loadster` 与 `MemorySync Documentation` 之间**
```markdown
- [MCP Pulse](https://mcppulse.agiscorecard.com) `https://mcppulse.agiscorecard.com/mcp`
  [![MCP Pulse MCP connector](https://glama.ai/mcp/connectors/io.github.f-tiger/agentic-commerce-tools/badges/score.svg)](https://glama.ai/mcp/connectors/io.github.f-tiger/agentic-commerce-tools)
  🔓 - Health scans for MCP endpoints, AI-readiness scores for websites, and an llms.txt generator.
```

插入位置按 2026-09-23 的 README 定；提交时若邻居变了，按字母序重新找位置即可。三句都写下限不写精确数，免得半年后变成错的。

## GitHub 仓库设置（约 1 分钟，只有你能改）

`https://github.com/f-tiger/verified-ai-free-tiers` 右上角齿轮（About）：

- **Description**：`Hand-verified free-tier limits of AI tools, with official sources and check dates. Also an MCP server.`
- **Website**：`https://baipiaoji.com/en/`
- **Topics**：`mcp` `mcp-server` `ai-tools` `free-tier` `dataset` `llm` `ai-agents`

GitHub 的搜索、Glama 的仓库索引和按 topic 抓取的目录都读这三项；现在三项全空，README 里那句「仓库 topics 请设置」就是留给你的这件事。

## 本轮自动完成的（不用你做）

- 数据集仓 README：MCP 节改为 16 工具 / 10 资源，新增「AI agents & MCP servers directory」节（中英目录、MCP 类目表、agents.json、RSS），覆盖率句改为 129 / 219；`sync.mjs` 每日自动维护这些数字和 `server.json`。
- 同一维护者互链：bpj `mcp` 页新增「同一维护者的其它 MCP 服务器」表（从 Agent 目录账本里第一方记录生成，每天被核验器盖章）；SR `/mcp` 页脚、eco `mcp.html` 相关链接各加一行指回 bpj；agiscorecard `/agents/` 顶栏链接改为 bpj 的英文 Agent 目录。全部指向规范 URL，不经 308 跳转。
- 三个舰队 MCP 服务器（SR / eco / MCP Pulse）作为第一方托管记录进入 bpj Agent 目录（官方页当日 200 才入账）。
- Agent 目录 RSS：`/agents/feed.xml` 与 `/en/agents/feed.xml`（最新 50 条），在可索引的 agents 页 `<head>` 声明、在 llms.txt 列出，schedule 路径向 Ping-O-Matic 推送。
