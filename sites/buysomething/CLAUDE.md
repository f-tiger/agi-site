# buysomething(SourceRadar)— 第六站操作手册(2026-08-22 并舰)

**定位**:面向欧美买家的中国爆款选品情报站(原 f-tiger/buySomething 仓,由
buysomething 会话孵化;owner 2026-08-22 指示并入舰队)。战略与调研底稿在
`docs/`(BRIEF/STRATEGY/research),**改动前先读它们**——选品逻辑、合规红线
(docs/research/07-legal.md:公开数据、无登录、无验证码绕过、限速)是原项目
的立身之本,并舰不改变。

## 机器结构

- `site/` = 纯静态(index/app/data/styles + trends.json);`data.js` 是人工策展的
  选品库,`trends.json` 由 `tools/fetch_trends.py` 每日 05:20 UTC 在 CI 生成
  (trendspy,≥30s/词限速、429 退避、keep-last-good——**失败不碰旧数据,站点
  自动降级到编辑评级**,这个设计不许简化掉)。
- 部署:deploy-buysomething.yml(push 路径过滤 + 每日 schedule);worker 纯资产
  透传;域名 **source.agiscorecard.com**(伞域子域模式)。
- 旧仓 f-tiger/buySomething:原孵化仓,由 buysomething 会话维护;并舰后以
  monorepo 为准。旧仓 GitHub Pages 部署与 trends workflow 与本站互不冲突,
  但**不要**在两边同时改 data.js——冲突时以 monorepo 为准。

## 队列(并舰待办,一轮一项)

1. canonical/OG/sitemap/robots/llms.txt 补齐(静态站目前裸奔,GEO 四件套缺失)
2. D1 埋点(舰队模式:服务端 pageview + 转化事件白名单)
3. 转化钩(联盟链接?订阅?按 docs/STRATEGY.md 的营收设计定,不自行发明)
4. 周分发循环自动覆盖(monorepo git log 扫描即含本站)

## 判定线

并舰起 60 天:首个真实转化事件或 JS pv ≥100/28d → 加码;否则维持每日 trends
自刷新的最低维护模式。
