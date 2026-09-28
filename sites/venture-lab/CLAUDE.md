# venture-lab — 商业实验组合(RFQ Desk · ModelMeter · QuerySprint · FilingLens)操作手册(2026-09-18 上线;本骨架 2026-09-21 补)

**本文件是骨架,不是站规。** 四个产品的边界、定价假设、「不做」以 `README.md`、
`docs/portfolio-experiments-2026-09-18.md`(三产品)与 `docs/vertical-agent-expansion-2026-09-19.md`
(FilingLens)为准。owner 授权原话见舰队 CLAUDE.md 顶部两节(「多商业模式并行授权」:
「继续探索多个新站,不能只等一个实验结果」)。**付费一律未开**;匿名兴趣事件不是订单、
线索或订阅;不得从事件推算收入。

## 机器结构(照实记,改了要同步)
- **一个 Worker(`agi-venture-lab`)四个主机**:`rfqdesk.` / `modelmeter.` / `querysprint.` /
  `filinglens.agiscorecard.com`(`experiments.json` 是主机与产品的唯一映射)。四主机共享一次
  发布与回滚;URL、内容、事件类别各自独立。
- D1:专用测量库,一张按 site 分区的事件表。**统计默认关闭,只测勾选同意者**;事件白名单
  (event/mode/source),随机访问标识,无跨会话持久化,35 天保留,5 000 行/站/日上限。
  API:`POST /api/event` · `GET /api/pulse`(28d,`mode!='qa'`,按 event/source 分组——**这是
  opt-in 事件计数,不是访客**;与舰队 14 站的 `/api/pulse` 不同形状,所以不接 `ai_referrals.py`)
  · `GET /api/config`(`sales_enabled:false` 由部署冒烟断言)· FilingLens 另有
  `GET /api/sec-concept`(SEC 官方 companyfacts 直查)。
- 部署:`deploy-venture-lab.yml`(push 到 main 或 `codex/venture-lab-*`,path 含 `tools/discovery/**`
  与两个 `agents/*-mcp/**`)。闸门 = 14 项本地测试 + MCP 包校验 + SQL 运行时测试 + 主机归属;
  部署后 `scripts/smoke.mjs` 遍历 `experiments.json` 四主机(11 条路径、pulse 形状、config、
  QA 事件写路径、WASM content-type、TradeCheck 下载包 SHA256、FilingLens SEC 查询)。
  **2026-09-21 起守卫改为舰队标准形态**(此前是 `checkout --detach origin/main`,fetch 一失败就挡部署)。
- 「Commercial experiment funnel report」workflow:只读 28 天聚合,人工触发。

## 舰队仪器(2026-09-21 接入)
- heartbeat:`rfqdesk.` 一行带部署链(探活 + 重发),其余三主机只探活(第三列为空)。
- `ai_access_probe.py` 探 `rfqdesk.`(zone 级 bot 规则,同 worker 其它主机答案相同);首读 09-21 全 200。
- `sitemap_guard.py` 四主机全在(首读 0 重定向);`page_patterns.py` 以 `rfqdesk.` 入周矩阵。
- **不在 `ai_referrals.py` / `traffic_sources.py`**:opt-in 事件不是 page_view,口径不可比。

## 判定线(2026-09-21 补登进 `data/fleet-bets.json`,此前只写在文档里 = 等于没预登记)
- `venture-rfqdesk-1016` / `venture-modelmeter-1016` / `venture-querysprint-1016`:28d 落地访问
  ≥100 才允许解读;完成 ≥20 且价格兴趣 ≥5;收费前 3 位无关联真实买家 + 2 位续费。
- `venture-filinglens-1019`:100 次相关落地 + 20 次自有任务完成 + 5 次价格兴趣,或 30 天到期先复盘。
- **读数不足只说明分发未验证,不得下「市场不需要」的结论**(portfolio 文档原话)。

## 2026-09-21 深度优化(舰队 CLAUDE.md 同日节有全文)
- **`scripts/pages.py` 以前会整个覆盖 `experiments.json`**(丢掉手工加的 filinglens、€ 变 `\u20ac`),而部署冒烟
  与 `/api/pulse` 都按它遍历主机——已改为合并写入。本地重生成顺序:`python3 scripts/pages.py && python3 scripts/render.py`,
  然后**必须**再跑 `python3 tools/discovery/build.py --only venture`(它给每页注入 discovery-head、可见日期与 sitemap)。
- sitemap `<lastmod>` / JSON-LD `dateModified` / 可见「Updated」行由 `tools/discovery/lastmod-<site>.json` 驱动
  (内容哈希,`tools/fleet/lastmod.py`);CI 是 check 模式,内容变了要 `LASTMOD_MODE=update python3 tools/discovery/build.py`
  并提交清单。三站 `/guide` 的 description 改为真描述(此前照抄标题);`/agent` 标题缩短;发现页标题超 60 字符不加品牌后缀。
