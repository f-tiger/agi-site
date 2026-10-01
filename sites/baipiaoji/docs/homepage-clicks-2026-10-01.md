# 首页点击明细修复

目标来自 owner「检查改版后首页点击」后要求「下一步」。三轮需求优化：①只回答首页入口点击；②按日、来源页语言、板块与公开目标拆分，排除全站分享；③保留历史记录并接入现有缓存、每日快照和发布验证，正式部署后再读真实数据。

第一轮对抗检查：`home` 事件也含 `/discovery/`，全量相加不能代表首页；历史 `other` 无法可靠推断首屏位置，不补造。今天不是完整日，不能直接与完整日期比较。没有同口径曝光分母，不计算 CTR；点击次数不是人数，也不是完成任务。

第二轮对抗检查：直接公开原始事件路径可能带任意字符串，因此只输出固定板块/目标标签；工具详情、分类和外链归入公开类型。查询必须走 `hits_events` 部分索引；缓存升版且部分失败不缓存。实际 SQLite、缓存和浏览器测试覆盖零/未知、日期边界、重复点击、语言、历史标签、QA、webdriver、DNT/GPC；模拟流量不写生产。

`/api/reach?days=7|28` 新增 `homepage_signals`，提供 clicks、daily、entries、daily_entries 及按语言/板块/目标汇总。只统计 ev=home 且 /home/ 前缀。窗口沿用 UTC，包括当前部分日；2026-09-22 以前未部署首页仪器，coverage 从这天起。旧标签原样保留，hero/site-header/site-footer 仅从本次发布起明确。数据库故障返回 null，不伪装成零。公开明细没有国家、来源、用户标识、原始网址、查询串或输入。

继续使用现有每日 `reach-export.mjs`，不加定时任务、不加表、不换 GA4。普通 JSON 客户端沿用旧字段；缓存版本 v7。

```sh
node sites/baipiaoji/scripts/homepage-report.mjs --days 28
# 指定日期只在同一次缓存快照内筛选，不按日期反复查库。
node sites/baipiaoji/scripts/homepage-report.mjs --days 28 --start 2026-09-27 --end 2026-09-30
# 本机读取保存的 /api/reach 响应：
node sites/baipiaoji/scripts/homepage-report.mjs --file /tmp/reach.json
```

报告默认排除当天，指定到当天会明确标记 partial。结果表示已记录的点击动作；未标记自动化、站长自访、拦截和历史丢包仍可能存在。旧时间窗没有按用户连接的数据，不能由入口点击反推注册、营收或改版因果效果。

本地验收：新增聚合/缓存/导出测试和中英文浏览器检查通过；既有 38 项核心、14 项构建产物、10 组浏览器门禁，以及账户 workerd、ProposalDeck、分发、报价离线/在线模拟流程通过。最终 GA4 覆盖保留既有隔离名单。正文 lastmod 仅两个首页变化，未批量刷新长尾内容。部署后 `verify-homepage-live.mjs` 只读核验标签、加总与字段形状。
