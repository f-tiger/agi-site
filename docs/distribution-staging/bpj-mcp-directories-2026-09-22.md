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

## 逐个目录：要什么、本站给不给得了

**先说结论**：本仓 09-18 转私有后，凡是「按 GitHub 仓库收录」的目录（Glama、Smithery）没有公开仓库就提交不了；
「按 URL 收录」的（PulseMCP、mcp.so、cursor.directory）可以直接填。是否为此建一个只放 README + server.json 的公开镜像仓，
是你的决定——它不含任何代码，但确实是「公开仓」这条线的一次例外。

| 目录 | 提交入口 | 需要什么 | 本站能否满足 | 建议 |
|---|---|---|---|---|
| PulseMCP | https://www.pulsemcp.com/submit | 服务器 URL + 名称 + 描述（表单） | ✅ | 直接填 |
| mcp.so | https://mcp.so/submit | 名称 + URL + 描述（表单/登录） | ✅ | 直接填 |
| cursor.directory | https://cursor.directory/ 页脚 Submit | 名称 + 配置片段 | ✅ | 直接填 |
| Glama | 已自动收录（同步官方注册表） | 认领/编辑条目需 GitHub 登录 | ✅ 已在 | 不用提交；想认领再登录 |
| Smithery | https://smithery.ai/new | GitHub 登录 + 关联仓库（远程服务器也走仓库） | ❌ 私有仓 | 同上 |
| Docker MCP Catalog | PR 到 docker/mcp-registry | Docker 镜像 | ❌ 本站是远程 HTTP 服务器，无镜像 | 不做 |
| Claude / ChatGPT 官方连接器目录 | 各家合作伙伴表单 | 企业资质 + 审核 | ❌ solo | 不做 |

## 可直接粘贴的字段（三处一致，改一处要同步 server.json）

- **名称**：Baipiaoji — Verified AI free tiers + agents/MCP directory
- **登记名**：`io.github.f-tiger/verified-ai-free-tiers`
- **端点**：`https://baipiaoji.com/api/mcp`（streamable HTTP，无鉴权）
- **主页**：`https://baipiaoji.com/mcp` ｜ 文档 `https://baipiaoji.com/developers.html`
- **一句话（≤100 字符，与 server.json 逐字相同）**：`Verified AI free tiers plus source-backed agent and MCP discovery monitoring.`
- **详细描述（英文）**：No-auth remote MCP server exposing Baipiaoji's verified data as 16 tools, 10 resources and 4 prompts: free-tier limits with official sources and check dates for 219 AI tools, commercial-use verdicts, a change log, and a 978-record directory of AI agents, MCP servers and agent platforms with per-URL check dates. Data rebuilds daily. Own fields CC BY 4.0 with attribution.
- **详细描述（中文）**：无鉴权的远程 MCP 服务器，把白嫖计的已核实数据变成 16 个工具、10 份资源与 4 条提示词：219 个 AI 工具的免费额度（带官方来源与核实日期）、商用判定、变更日志，以及 978 条 AI Agent / MCP 服务器 / Agent 平台目录（每条 URL 带核验日期）。数据每日重建。本站字段 CC BY 4.0，引用请注明来源。
- **标签**：ai-tools, free-tier, limits, pricing, commercial-use, agents, mcp-directory, verified, changelog
- **配置片段（Claude Desktop / Cursor / Cline 通用）**：

```json
{ "mcpServers": { "baipiaoji": { "url": "https://baipiaoji.com/api/mcp" } } }
```

## 提交后

不用告诉我；`mcp-discovery.json` 次日会自己读到（只有 `found:true` 算数）。判定线 `bpj-mcp-directories-1103`：
11-03 前 ≥2 个第三方目录 found:true。数字上的提醒：上面描述里的 219 / 978 / 16 / 10 / 4 会随站点变化，
目录里的描述不会自动更新——这是所有目录提交的通病，半年复核一次即可。
