# MCP 主动发现套件（2026-08-08）

> 自动化已覆盖：官方 MCP Registry（GitHub OIDC 自动发布，workflow `publish-mcp.yml`）+ 可索引文档页 `/mcp.html` + `.well-known/mcp.json` + llms.txt 声明。
> 多数社区目录会从官方 Registry 同步——发布一处即级联。以下是**需要账号/表单、我无法代劳**的增量渠道，材料复制即交。

## 通用提交信息
- Name: EcoBack Raumklima MCP Server
- Endpoint: `https://getecoback.com/mcp`（streamable-http，无鉴权）
- Registry name: `io.github.f-tiger/getecoback-climate-weather`
- Docs: https://getecoback.com/mcp.html
- 一句话（EN）: Room-climate tools for Germany/Europe: BTU sizing, portable-AC window-seal length, live German heatwave outlook, AC running-cost math. Formulas mirror getecoback.com's calculators; every result carries its source URL and an honest affiliate disclosure. No auth, no personal data.

## 渠道清单（每处一次，不群发）
1. **mcp.so** — Submit 表单，粘贴上面信息。
2. **PulseMCP** — Submit a server 表单。
3. **Glama MCP 目录** — 需登录提交。
4. **Smithery** — 主要收开源仓库；如愿意可建公开仓 `f-tiger/getecoback-mcp`（只放 README+server.json 指向远程端点），建成后告诉我，我来填内容。
5. **awesome-mcp-servers（GitHub PR）** — 分类 `Weather` 或 `Utilities`，行文：
   `- [getecoback-raumklima](https://getecoback.com/mcp.html) 🇩🇪 ☁️ - Room-climate tools for Germany/Europe: BTU sizing, window-seal length, live heatwave outlook, AC running costs. Remote streamable-http, no auth.`

## 判定
D1 `mcp_call`（排除 CI）出现任何真实第三方调用 → 在雷达与简报中标记里程碑。
