# MCP 主动分发手册（2026-08-08）

被动等待 = 没有分发。MCP 的发现面分四层，前两层已自动化，后两层需要用户侧账号/授权，
提交件已备好可直接粘贴。

## 已自动化（站点自带，每日构建更新）

| 面 | 位置 |
|---|---|
| .well-known 清单 | https://baipiaoji.com/.well-known/mcp.json（含 keywords） |
| OpenAPI 规范 | https://baipiaoji.com/openapi.json（GPT Actions / agent 框架自动装配用） |
| robots.txt 指路 | 尾注三行：llms.txt / MCP / OpenAPI |
| llms.txt 广播 | MCP + API + lang 参数 |
| REST 响应内嵌广告 | /api/tools 与 /api/limits 每个响应带 mcp 字段 |
| 镜像仓库注册资产 | mirror/server.json（MCP Registry schema）+ README MCP 段 |

## 规范关键字集（所有提交统一用这套，搜索发现靠它）

`ai-tools` `free-tier` `limits` `quota` `pricing` `rate-limits` `commercial-use` `licence` `directory` `verified`

命名用描述词不用品牌词：**verified-ai-free-tiers**（用户在注册表搜 "free tier"，不搜「白嫖计」）。

## 需用户侧一次性动作（提交件已备好；Registry 已不在此列）

### 1. 官方 MCP Registry —— 已自动化（v2 关键解锁，无需 owner 密钥）
io.github.f-tiger 命名空间可由本仓库 Actions 的 **GitHub OIDC** 直接认证：
`.github/workflows/mcp-publish.yml` 在 server.json 变更时自动
`mcp-publisher login github-oidc && publish`（权限只需 id-token: write）。
名称：io.github.f-tiger/verified-ai-free-tiers；server.json 在仓库根（单一事实源，镜像复制它）。
**首跑即验证**：remotes-only 服务器在 io.github.* 下的校验细则以首跑日志为准，
被拒则错误原文在 Actions 里显式可见，不静默。手动触发：Actions → Publish MCP server → Run。

### 2. GitHub topics（爬虫饵，零成本）
镜像仓库设 topics：`mcp` `mcp-server` `ai-tools` `free-tier` `dataset`
（smithery/glama/pulsemcp 均按 topics 爬取远程 MCP server）

### 3. 目录站提交（各一条表单）
**完整粘贴稿见 [`mcp-submission-packet.md`](./mcp-submission-packet.md)**——
身份 / 连接 / 三种长度的描述 / 标签 / 分类选法 / 13 工具清单，按表单要哪段取哪段。
（此处原先留的一句式描述写着「162 AI tools」，早已过期；数字统一以 packet 为准，
且 packet 里写明了怎么现数一遍，避免再次凭记忆填。）

### 4. 一句话社区帖（HN Show / r/mcp，发不发由用户定）
> Show HN: An MCP server for verified AI free-tier limits — every figure traced to an official vendor page with a check date, tools with no official number deliberately absent. No auth: `claude mcp add --transport http baipiaoji https://baipiaoji.com/api/mcp`

## 度量

所有 MCP 调用落 D1（ev='api'，path=/api/mcp/<tool>，ref=UA 片段）。
哪个目录带来第一个真实 agent，UA 与时间会说话。

## 2026-08-13 提交执行记录（哪些做了、哪些做不了、为什么）

**已自动完成**
- ✅ **官方 MCP Registry**：`io.github.f-tiger/verified-ai-free-tiers` 已收录，
  当前 v1.3.0 且 `isLatest: true`，经 GitHub OIDC 全自动重发布（零密钥）。
  **这是最重要的一条**——见下面「为什么它顶半个渠道」。
- ✅ **Glama**：其官方方法论写明「摄取并转发官方 Registry 的全部内容，
  再叠加自己的沙箱行为分析与质量评分」。因此收录路径本就通了；
  本轮在镜像仓库根加了 `glama.json`（`$schema` + `maintainers: ["f-tiger"]`，
  格式取自 Glama 官方 schema 与线上真实样例），用于认领所有权与控制呈现。
- ✅ **镜像仓库 README 同步**：此前停留在「5 工具 / 5 资源」，与实际能力不符；
  目录站爬到的正是这份，已同步为 13 工具 / 9 资源 / 3 提示词。

**做不了，以及为什么（不是借口，是环境事实）**
- ❌ **表单类提交（Smithery、PulseMCP 的认领页、mcp.so 的 Submit 按钮）**：
  本会话的出口代理只放行 npm / pypi / github 等少数域名，其余一律 403
  （57 个工具链接的可达性实测已经证明过这一点）。表单提交必须由 owner 在浏览器完成。
- ❌ **仓库 description 与 topics**：GitHub MCP 工具集**没有**修改仓库设置的能力
  （只有创建仓库时能带 description）。这两项对自动索引器权重不低，需 owner 手动设置。
- ⏸ **`punkpeye/awesome-mcp-servers`（9.2 万星，社区最大索引）**：
  提交方式是 fork + PR。会话规则写明「不创建 PR」，因此**未执行**，
  等 owner 明确授权后再做——这是目前剩余渠道里价值最高的一个。

**为什么官方 Registry 顶半个渠道**
Glama 明确写了它转发 Registry 全量内容；PulseMCP 属于「爬取生态 + 认领」模式。
也就是说，Registry 收录本身就在把我们推向下游目录，而不是每家都要单独投一次。
这也解释了为什么先打通 OIDC 自动发布是对的：**一次接入，下游持续受益**。

**owner 侧待办（三件，都在浏览器里几分钟）**
1. 仓库 Settings → 填 description（建议：`Verified AI free-tier limits and
   commercial-use verdicts — 218 tools, every figure sourced and dated. MCP server included.`）
2. 仓库 About → 设 topics：`mcp` `mcp-server` `ai-tools` `free-tier` `dataset`
3. 如需铺满：Smithery / PulseMCP / mcp.so 的表单提交（提交件见本文档上方）

## awesome-mcp-servers 提交件（2026-08-13 备好，等 fork 后即可执行）

**目标**：`punkpeye/awesome-mcp-servers`（9.2 万星，社区最大 MCP 索引，多数下游目录从它抓取）

**已核实的关键事实**（读自该仓库 raw 文件，非第三方转述）：
- CONTRIBUTING 明确写道：**「If you are an automated agent... Just add `🤖🤖🤖` to the
  end of the PR title to opt-in. Merging your PR will be fast-tracked.」**
  ——该仓库欢迎 agent 提交，且有快速合并通道。标题必须带这个标记。
- 流程：fork → 建分支 → 改 README.md → 提交 → PR。要求「follow the existing format」。
- 图例：`📇` = TypeScript/JavaScript 代码；`☁️` = Cloud Service（远程 API，我们属此类）；
  `🏠` 是本地服务，不适用。
- 分类选定：**`### 🔎 Search & Data Extraction`**（README 第 2877 行起）。
  依据：该区已有形态几乎相同的邻居 `qinisolabs/icdwise`
  ——「Verified ICD-10-CM medical code lookup... official descriptions, never guessed」。
  条目实际是追加在该区末尾（文件本身并未严格字母序）。

**待插入的条目（一行，追加到 Search & Data Extraction 区末尾）**：

```
- [f-tiger/verified-ai-free-tiers](https://github.com/f-tiger/verified-ai-free-tiers) [![f-tiger/verified-ai-free-tiers MCP server](https://glama.ai/mcp/servers/f-tiger/verified-ai-free-tiers/badges/score.svg)](https://glama.ai/mcp/servers/f-tiger/verified-ai-free-tiers) 📇 ☁️ - Verified free-tier limits and commercial-use verdicts for 218 AI tools. Every figure is traced to an official vendor page and carries the date it was checked; where a vendor publishes no figure, the entry says so instead of carrying a guess. Compare a whole category side by side, fact-check a circulating number against official sources, or audit an entire stack in one call. No auth, streamable HTTP. `claude mcp add --transport http baipiaoji https://baipiaoji.com/api/mcp`
```

**PR 标题**（末尾标记不能省，那是 agent 快速通道的开关）：
```
Add f-tiger/verified-ai-free-tiers to Search & Data Extraction 🤖🤖🤖
```

**PR 正文**：
```
Adds one entry under Search & Data Extraction.

What it is: a no-auth remote MCP server (streamable HTTP) over a hand-verified
dataset of AI free-tier limits and commercial-use terms. Every published figure
is traced to an official vendor page and carries its check date; where a vendor
publishes no figure, the entry says so rather than repeating a circulating
number. Listed in the official MCP Registry as io.github.f-tiger/verified-ai-free-tiers.

Format: follows the existing style in that section (repo link, Glama badge,
📇 for the JS codebase, ☁️ as it talks to a remote API, description, install line).

Nothing else in the file was touched.
```

**执行路径（fork 之后由本会话完成）**
1. owner 在 GitHub 点 Fork（**唯一必须人工的一步**——本会话对第三方仓库无任何读写权限，
   `add_repo` 拒绝跨 owner，`fork_repository` 与 `get_file_contents` 均返回 Access denied）
2. 本会话 `add_repo(f-tiger, awesome-mcp-servers, push)`（同 owner，允许）→ 克隆 → 建分支
   `add-baipiaoji-verified-free-tiers` → 追加上面那一行 → 提交 → 推分支
3. 开 PR：`create_pull_request` 的 base 仍指向 punkpeye 仓库，预计同样被拒；
   届时给出预填好标题与正文的 compare 链接，owner 点一次即可：
   `https://github.com/punkpeye/awesome-mcp-servers/compare/main...f-tiger:awesome-mcp-servers:add-baipiaoji-verified-free-tiers?quick_pull=1`

**红线遵守**：一次诚实提交，只加一行，不动别处，不群发。

### 执行结果（2026-08-13）

- ✅ 分支 `add-baipiaoji-verified-free-tiers` 已推到 `f-tiger/awesome-mcp-servers`
  （commit `74ced68`），diff 经复查为**纯新增一行**、别处零改动。
  过程中修掉一个自己造成的问题：初次插入吃掉了区块与下一个标题之间的空行，
  那等于改动他人文件结构，已恢复。
- ✅ PR 由 owner 于 GitHub 网页提交（标题带 `🤖🤖🤖`，即该仓库 CONTRIBUTING
  写明的 agent 快速合并通道）。
- ⚠️ **本会话无法核实上游 PR 状态**：`punkpeye/awesome-mcp-servers` 不在会话白名单，
  GitHub MCP 工具与 `api.github.com` 均返回 403/Access denied；
  只有 `raw.githubusercontent.com` 可读（这也是当初能拿到真实格式的原因）。
  合并与否需 owner 在网页确认。

**合并后值得观察的**：该列表是多个下游目录的抓取源，合并后应能看到
`ev='bot'` 里出现新的爬虫来源，以及 `/api/mcp` 的非 curl 调用增加——
两者都在每日循环的三线度量里，无需额外动作。

**四类发现入口的最终状态**
| 入口 | 状态 |
|---|---|
| 官方 MCP Registry | ✅ 已收录 v1.3.0（OIDC 自动重发布，零密钥） |
| Glama | ✅ 自动索引官方 Registry + glama.json 已认领维护者 |
| awesome-mcp-servers | ✅ 分支已备、PR 已由 owner 提交，待合并 |
| Smithery / PulseMCP / mcp.so | ⏸ 表单类，受出口代理限制，需 owner 在浏览器完成 |
| 仓库 description / topics | ⏸ GitHub MCP 工具集无此能力，需 owner 设置 |

### PR #12084 已开（2026-08-13）

`punkpeye/awesome-mcp-servers#12084`，状态 **Open**，标题带 `🤖🤖🤖` 快速合并标记。
`f-tiger` wants to merge 1 commit into `punkpeye:main`。
- ✅ All checks have passed（1 skipped, 1 successful）——其中 `Check Glama Link / check-su…` **通过**
- ✅ No conflicts with base branch
- ✅ 1 file changed, 1 addition, 0 deletions

**待观察的一点**：仓库的 github-actions bot 留言「Thank you for adding the Glama badge!
Please make sure the server has been evaluated by Glama and has a quality score」，
而留言里的徽章位显示为破图——说明 **Glama 尚未给出质量分**（我们的 glama.json 刚推不久，
且 Glama 是异步索引）。注意自动检查本身是**通过**的，所以这不构成阻塞，只是观感问题。

**判定与后续（谁来做、什么条件下做）**
- 本会话**永远无法核实**这一项：`glama.ai` 不在出口代理白名单，curl 返回 HTTP 000。
  只能由 owner 在浏览器打开徽章 URL 看是否出图。
- 若 Glama 在合并前完成索引 → 徽章自动变成分数，无需任何动作。
- 若迟迟不出图、或维护者因破图提出修改 → 本会话可向该分支追加一个 commit 去掉徽章
  （PR 会自动同步）。该列表里**本来就有不少条目不带徽章**（如 `zoomeye-ai/mcp_zoomeye`），
  去掉不影响收录格式。
