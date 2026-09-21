# verify.agiscorecard.com — Agent Delivery Lab 操作手册(2026-09-19 上线;本骨架 2026-09-21 补)

**本文件是骨架,不是站规。** 站的定位、边界与「不做」全部以 `README.md` 与
`docs/agent-delivery-lab-validation-2026-09-19.md`(含 30 天决策门)为准;本文件只记
舰队层怎么看这个站、仪器接在哪里、判定线登在哪里。owner 授权见舰队 CLAUDE.md
顶部「2026-09-18 vertical Agent update / commercial review context」两节。

## 机器结构(照实记,改了要同步)
- 一个独立 Worker,单主机 `verify.agiscorecard.com`;`worker.mjs` = 静态资产透传 + API。
- D1:舰队共用库里的**隔离表 `agent_delivery_feedback`**(匿名反馈,不是用户、不是转化)。
  API:`POST /api/feedback` · `GET /api/stats`(排除 qa=1 的分组计数)· `GET /api/health`。
  **不记录 page_view,没有 `/api/pulse`**——这是 09-19 发布时的设计(README:「Feedback rows
  are anonymous submissions, not verified users or conversions」),不是漏埋点。
- 部署:`deploy-agent-delivery-lab.yml`(push 到 main 或 `codex/agent-delivery-*`,path 过滤;
  main 上才部署)。闸门 = `npm test`(引擎/CLI/worker)+ 主机归属检查;部署后 `scripts/smoke.mjs`
  对线上做 12 条断言(revision、资产、feedback 写路径)。**2026-09-21 起防回滚守卫改为舰队标准
  形态**(只在 push 到 main 时生效、fetch 失败 fail-open、reset 不 checkout)。

## 舰队仪器(2026-09-21 接入)
- `fleet-heartbeat.yml`:每日探活 + 超 7 天未成功部署自动重发;非 200 → run 红 → GitHub 邮件。
- `tools/fleet/ai_access_probe.py`:9 个 AI/搜索爬虫 UA × `/` 与 `/llms.txt`,首读 09-21 全 200。
- `tools/fleet/sitemap_guard.py`(sitemap 4 条 loc,首读 0 重定向)、`page_patterns.py`(周矩阵)。
- **不在 `ai_referrals.py` / `traffic_sources.py` 里**:没有 page_view 就没有引荐可读。舰队
  10-24 的 AI 引荐判定线(≥156/28d)**只覆盖记录 page_view 的 14 站**,本站不计入分母。

## 判定线
- `agent-delivery-demand-1019`(`data/fleet-bets.json`,main 09-19 预登记):`/api/stats` 排除 qa=1
  后 own_completed ≥10,其中 frequency=4plus ≥5、interest=discuss ≥3 → 只触发人工核实,不放行收费。
- 结算时:读 `/api/stats`,把读数写进台账 `reading`,结论写回本文件。

## 2026-09-21 深度优化(舰队 CLAUDE.md 同日节有全文)
- sitemap `<lastmod>` 与页面 `dateModified`/可见「Updated」行由 `lastmod.json`(内容哈希清单)驱动,
  `scripts/build.mjs` 末尾调用 `tools/fleet/lastmod.py`;**CI 是 check 模式**:改了页面内容而没跑
  `LASTMOD_MODE=update npm run build` 会把构建打红(信息里有修法),改完把 `lastmod.json` 一起提交。
- 4 页此前零 JSON-LD、零 og:image:首页加 `WebApplication`,4 页加 og/twitter + `public/share.png`
  (`scripts/share_card.py` 用页面自己的文案渲染;改文案时重跑)。
- 进每周 IndexNow(`tools/indexnow-subdomains.mjs`),密钥文件 `public/16507d8e….txt` 由 worker 的资产透传直接服务。
