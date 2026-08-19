---
name: revenue-round
description: 执行一轮 getecoback.com 营收推进循环（目标：Amazon PartnerNet 180 天 3 单）。当用户要求"推进营收/加速流量/继续优化网站/执行一轮循环"，或监控 cron 触发信号时使用。按 测量→诊断→执行→记录 四步走，动作全部自动化、批量执行。
---

# 营收循环（每轮）

完整方法论见仓库根目录 `REVENUE_PLAYBOOK.md`（先读它）。本技能是执行入口，步骤：

## 1. 测量（每轮必做，≤5 分钟）
- WebSearch `site:getecoback.com` → 收录数
- 部署状态：GitHub MCP `actions_list`（断连则跳过并提醒用户重连）
- 信号源：Gmail MCP 搜 amazon/partnernet 邮件；GA4 经 Supermetrics（断连则提醒）
- **有真实信号 → 立即切 playbook 诊断表对应动作，本轮只做那一件事**

## 2. 无信号时的默认动作（按优先级取一）
1. **KGR 批量**：从 playbook 候选队列取 2–3 词 → WebSearch 抽查德语 SERP（论坛/小站占屏=写；vergleich.org/testit.de/大媒体占屏=弃并记录）→ 并行 agent 写页
2. **售卖结构补强**：grep 找缺型号推荐卡/结构缺陷的页面批量修
3. **技术 SEO 修缮**：meta 长度、JSON-LD 完整性、内链回货币页

## 3. 页面标准（agent 写页/改页后必须校验）
- 模板参照 `site/guide/mobile-klimaanlage-zu-laut.html`
- JSON-LD `@graph` 三节点：Article + BreadcrumbList + FAQPage（FAQ 与可见文本逐字一致）
- 所有 amazon.de 链接带 `tag=getecoback-21` + `rel="sponsored noopener"`，按型号名搜索、不伪造 ASIN
- meta description 120–155 字符、关键词前置、含一个具体数字锚点
- 恰好一个 `<!--EB_NAV-->`；含 `affiliate_click` 追踪；文件以 `</html>` 结尾
- 每页内链 1–2 个货币页（对比/预算页）；诚实标注"汇总公开评测、未自测"

## 4. 上线与记录
```bash
python3 tools/build_structure.py && python3 tools/build_sitemap.py && python3 tools/build_feed.py
# 全站校验变更文件（JSON-LD/tag/NAV/EOF）→ git add -A && commit && push
```
push 即触发 CI：部署 + 健康检查 8 端点 + IndexNow 推送。结论写入 REVENUE_PLAYBOOK.md 队列 与 CLAUDE.md 决策记录（重大结论才进 CLAUDE.md）。

## 硬约束
- 不伪造测评/评分/ASIN；不做垃圾外链/自动社群发帖/doorway 页
- 用户侧动作只提醒不代劳：GSC 请求编入索引、PartnerNet 付款/税务、连接器重连
- 半成品不提交：批量动作全部完成并校验通过后一次性 commit/push
