# DollScout（Labubu 站）增长循环 · 每 2 天 v2（autopilot 后）

你在公开 monorepo **f-tiger/agi-site** 里维护 **thedollscout.com**，站点目录 `sites/thedollscout/`。
本站 2026-08-30 整体重做：从成人 doll 导购转为 **Labubu / The Monsters 稀有度优先的证据标准导购站**。旧站的一切规则、页面、判定线均已作废，**不要从 git 历史恢复任何旧页面**。

**本会话没有 MCP 连接器**（无 Cloudflare MCP、无 GitHub MCP）。所以：D1 只能读仓库里提交的快照，线上状态只能用 `curl` 实探，GitHub Actions 日志读不到——**读不到的东西就如实写「本轮未验证」，不许当成绿灯**。

【克隆纪律】克隆仓库只用 add_repo 工具返回结果里的 HTTPS 克隆命令；**绝对禁止 `git clone git@github.com:…`（SSH 形式）**——无人值守会话里它会触发权限提示并永远挂起。若 HTTPS 克隆报错，把报错原文写进最终简报并结束本轮，不要换 SSH 重试。

## 【2026-09-11 重要变更】本站此前「我不跑就一个字节都不动」，已修
体检结论：零 AI 的每日任务（tds-traffic、fleet-trends）**全部只写 `content/`**，而 `content/` 既被 deploy 的 path 过滤显式排除、又被 `scripts/assemble-dist.sh` 排除——**它们在结构上到不了线上**。加上部署是纯 push 触发，没有会话推它就没有任何东西推它。**2026-09-03 本站冻结 86 小时就是这个原因。**
现在补上了两条第①层能力，**你不要再重复做**：
1. **`deploy-thedollscout.yml` 有了每日 schedule（07:20 UTC）** —— 本站现在有一条不经过任何 AI 会话的发布路径。
2. **`tools/autopilot/` 每日 02:40 UTC 零 AI 运行**（全文 `docs/site-autopilot-2026-09.md`）：
   - **sitemap 的 `<lastmod>` 现在由内容哈希记账自动维护**——本站 39 条 lastmod 此前全是手打字面量。**不要再手打 lastmod，也不要手改 sitemap.xml 的日期**；清单（哪些 URL 该收录）仍然是你的编辑判断，autopilot 只碰日期。
   - **IndexNow 只提交内容真变了的 URL**，不要全量重提。
   - 需求词已对着站内页面算过覆盖度。

## 第 0 步：读这些，它们覆盖本 prompt 的一切细节
1. `sites/thedollscout/CLAUDE.md` —— 本站唯一操作手册（定位、语言策略、独特性原则、工具矩阵、GEO 面、硬内容规则、静默失败铁律、结构化数据闸门、判定线）。**它与本 prompt 冲突时以它为准。**
2. 仓库根 `CLAUDE.md` —— 舰队层（隐私红线、部署模型、CI 纪律、防回滚守卫）。
3. `sites/thedollscout/content/growth-log.md` **末尾两轮** —— 上轮做了什么、预登记了什么判定线。
4. `content/competitive-gaps.md` + `content/audience-profile.md` —— 选题的两把尺子。

## 第 1 步：先看数
- **`data/autopilot/thedollscout-demand.json`**（每日确定性生成，本轮选题的第一输入）：
  - `gaps` = 今天有需求、站内没有页面接得住的词，按 v 降序；`covered` = 已接得住的。
  - **`page` 字段是词元重叠度最高的现有页面，不是编辑判断，实测会挑错**——只当线索。
  - `kind:"autocomplete-new"` 的行来自 Google 配额用尽后的兜底，分值恒为 1，**不可与真实增长值比较**。
  - `source_notes` 若写着信号降级，**简报里如实带出来**。
- `content/d1-snapshot.json` —— 14 天窗 D1 聚合。**先看它的 git 提交时间**。**文件不存在或超过 48 小时没更新 = 机制故障，不是「没数据」**（该步骤 2026-08-19→08-30 连续 12 天静默失败）。若它又不落库，如实报给 owner 并写进 log，别绕过去。
- 另有 `content/traffic.json`（Cloudflare 边缘请求数）、`content/gsc.json` / `ga4.json`（凭据齐才有，目前没有）。
- **台账口径**（一律 `path NOT LIKE '/__ci%'`）：`ev=''` 真人 pv、`'bot'` 爬虫（`ref` = UA 名）、`'affiliate_click'`、`'odds_calc'`、`'cost_calc'`、`'checker_use'`、`'finder_use'`、`'lookup_use'`。按语言前缀（`/`、`/de/`、`/zh/`、`/th/`）分列。

## 【2026-09-11】不要再假设定时任务的先后顺序
260 次真实 run 实测：00:30–08:00 的 cron **中位数迟到 257–308 分钟**，且 **2026-09-08 GitHub 整天丢掉了全舰队所有计划运行**。**读任何数据文件前先看它自己的时间戳**；陈旧就如实写「本轮 X 数据陈旧（日期）」，绝不当新鲜的用。

## 第 2 步：机制体检（不可省略；本会话用实探）
- 本地跑阻断闸门 `cd sites/thedollscout && node scripts/check-structured-data.mjs`，记录检查条数与结果。
- 本地跑 `node scripts/build-llms-full.mjs`，确认它不是靠降级输出蒙混过关。
- `curl` 实探线上：`/`、`/de/`、`/zh/`、`/th/`、`/rarity`、`/checker`、`/finder`、`/lookup` 均 200 且零重定向；`/llms.txt`、`/llms-full.txt`、`/data/rarity-odds.json`、`/data/labubu-fake-signals.json`、`/data/labubu-glossary.json`、`/.well-known/mcp.json` 均 200 且 content-type 正确；MCP 端点冒烟：`POST /mcp` 发 `initialize` 应回 protocolVersion，发 `secret_pull_probability`（1:72、12 盒）应算出 15.x%。
- **新增：读 `data/autopilot/receipt.json` 里本站那一段**，`outcome` 非 ok 就是机制故障，按机制故障处理。
- 爬虫表里是否出现**内容页**而不只是入口页。
- IndexNow 与部署自检结果在 Actions 日志里，本会话读不到 → **汇报里明写「本轮未验证」**。
任何一项异常：**先修机制，本轮不出新内容**。

## 第 3 步：做一件事（宁少勿滥）
**每轮最多 1 个新页面，优先加厚已有页而不是铺新页。** 新增的面必须落在 `competitive-gaps.md` 的 5 个缺口之一，并对得上 `audience-profile.md` 的动机-痛点矩阵。**选题优先从 `gaps` 里 v 最高、且能过三门的那条取。**
**明确不做**：全系列图鉴 catalog、发售日历、转售/炒价/投资增值角度、给读者贴「成瘾」标签的内容、儿童向内容角度。
硬内容规则零妥协：每条事实具名信源+日期，查不到写 "we could not verify"；不印具体价格；商标纪律（不用 Pop Mart 官方素材、每页保留 not-affiliated 声明）；**结构化数据的 FAQ/DefinedTerm 文本必须与页面可见文本一致**；联盟 tag 分市场——EN/zh → amazon.com + `ecoback0d-20`，`/de/` → amazon.de + `getecoback-21`，`/th/` 零联盟。联盟链接**永不进 MCP 输出，也不进 llms-full.txt**。
新页要同步进 `scripts/build-llms-full.mjs` 的 PAGES 数组、`sitemap.xml`（只加 `<url>`，日期交给 autopilot）、`scripts/urls.txt`、部署自检的 URL 清单。

## 第 4 步：预登记判定线日历
- **2026-09-27**：具名 AI 爬虫是否抓过 `llms.txt` / `llms-full.txt` / `/data/*.json` —— 决定下一轮 GEO 值不值得做。
- **2026-10-29（60 天线）**：D1 28 天窗真人 pv ≥ 6/天×3，或 affiliate_click ≥ 1，或 search/assistant 引荐 ≥ 5 → 转向成立继续投入；全不达标 → 把「域名 18+ 历史包袱」升级为主因，报 owner 议新域名。
- 清理期纪律：本域有 6 周 18+ 历史，**诚实记录，不许把早期零流量归因于内容质量**。

## 第 5 步：收尾（缺一不可）
1. `content/growth-log.md` 追加一轮：做了什么 / 台账数字（带日期与查询口径）/ 机制体检结果（含「本轮未验证」的项）/ **本轮新预登记的判定线**。
2. 提交并推送。**push 到 `main` = 发布**。若本会话被指派了开发分支，就在分支上做完再合并进 main 推送——不合并等于没发布。
3. 隐私红线（公开仓）：owner 身份档案、订阅者邮箱/PII、token/key/chatId/地址一律不入库。
4. 给 owner 一份简短中文汇报：做了什么、台账数字、机制体检结论（哪些验了、哪些没验）、下一轮打算做什么。**没有真实数据支撑的乐观话不要写。**

若本轮既无机制故障、又没有过得了三尺的选题，**正确动作是不动**，只写一行台账和判定线进 log。什么都不做好过制造 churn。