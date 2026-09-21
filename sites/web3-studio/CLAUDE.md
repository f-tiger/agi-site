# web3.agiscorecard.com — Web3 Workbench(1 hub + 10 工具主机)操作手册(2026-09-19 上线;本骨架 2026-09-21 补)

**本文件是骨架,不是站规。** 十个工具的任务边界与「不做」以 `README.md` 与
`docs/web3-portfolio-research-2026-09-19.md` 为准;owner 原话(台账 source):「明确要求全部剩余
方向研究完善后上线」(2026-09-19)。免费 beta;**不连钱包、不声称结算核验、不给交易建议**。

## 机器结构(照实记,改了要同步)
- **一个 Worker 十一个主机**:hub `web3.agiscorecard.com`(EN + `/zh/`)与 `reconcile.` / `evidence.` /
  `route.` / `protocol.` / `permit.` / `compute.` / `incentives.` / `proof.` / `calls.` /
  `disclosures.agiscorecard.com`;每个主机只服务自己的页(`public/catalog.mjs` 是唯一主机表)。
  静态资产 `html_handling:none`——**目录路径必须由 worker 自己映射到 index.html**
  (2026-09-21 修 `/zh/` 404 就是这一条:`2fc336a` 只把 `/zh/` 加进了清单,worker 没映射,
  于是「清单覆盖每一页」那条测试红在自己加的那一行上;现在 `/zh/`→`/zh/index.html`,
  `/zh/index.html` 308→`/zh/`,与英文根一致;canonical/sitemap/hreflang 声明的都是 `/zh/`)。
- D1:隔离表 `web3_studio_feedback`(匿名反馈);`/api/stats`(排除 qa=1)· `/api/feedback` ·
  `/api/event` · `/api/growth`(`measurement.mjs`)· `/api/health` · hub 另有 `/api/market`(公开
  行情,只引用注明 UTC 取数时间)· `/api/research` · `/api/briefs` · `/mcp`(官方 SDK,pinned)。
  **不记录 page_view,没有 `/api/pulse`**(设计如此)。
- 部署:`deploy-web3-studio.yml`(push 到 main 或 `codex/web3-*`)。闸门 = `npm test`(先构建 dist,
  再 94 条测试,含「部署清单覆盖每一页且每条可解析」)+ `scripts/check_html.py`(64 页)+
  wrangler dry-run;需 Pillow(`requirements-build.txt`)渲染分享卡。部署后四个 smoke
  (`smoke` 遍历 `asset-manifest.generated.json` 逐主机逐路径断言 200、`mcp-smoke`、`market-smoke`、
  `research-smoke`)。**2026-09-21 起守卫改为舰队标准形态。**

## 舰队仪器(2026-09-21 接入)
- heartbeat:hub 一行带部署链;十个工具主机各一行只探活。
- `ai_access_probe.py` 探 hub;首读 09-21 全 200。`sitemap_guard.py` 十一主机全在(首读 0 重定向)。
- **不在 `ai_referrals.py` / `traffic_sources.py`**(没有 page_view)。

## 判定线(main 09-19 预登记,`data/fleet-bets.json`)
- `web3-<tool>-1019` 十条 + `web3-research-1019`:各工具 `/api/stats` 排除 qa=1 后
  own_completed=1 且 usefulness=helped 的提交 ≥5、其中 repeat ≥3 → 只触发人工核实,不放行收费。
