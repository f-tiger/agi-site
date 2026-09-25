---
name: kgr-page
description: 按 KGR（Keyword Golden Ratio）方法论为 getecoback.com 产出一篇德语长尾页。当需要写新的 SEO 内容页、消化候选队列关键词、或用户要求"扩充内容/铺长尾"时使用。含竞争度判定标准和逐项验收清单。
---

# KGR 长尾页产出流程

## 1. 竞争度判定（写之前，一词一查）
WebSearch 该德语关键词，看首屏：
- **可写（low）**：gutefrage/论坛/小型利基站/电商店铺占屏
- **弃（红海）**：vergleich.org、testit.de、expertentesten、home&smart、Stiftung Warentest 等大评测媒体占满首屏 → 记入 playbook"已弃"，防重复调研
- **角度切分**：大词红海时找更窄切角（例：Klimaanlage tropft→移动机角度；Schimmel Geruch→避开汽车空调内容）
- **蚕食检查**：若与既有页意图重叠（grep site/guide/ 标题），增强既有页而不是新写

## 2. 写页规格
- 文件：`site/guide/<slug>.html`，模板逐块复制 `site/guide/mobile-klimaanlage-zu-laut.html`（head/CSS/GA4/eb-chrome/NAV 标记/affiliate_click 脚本原样，仅内容变）
- 900–1200 词，问题解决型+诚实建议（包括"什么不管用"一节，信任即转化）
- 结构：TL;DR"Kurz gesagt"盒（GEO/AI 搜索提取）→ 正文 H2 分节 → FAQ 3 问 → related 盒 3 内链
- 型号卡：只用站内背书型号或经 WebSearch 确认公开评测共识的型号；卡内 ✓/✕ 一行优缺点 + 橙色按钮
- 内链 1–2 个货币页（KGR 页=流量入口，货币页=成交主力）

## 3. 验收清单（python3 逐项过）
1. JSON-LD `@graph` = Article + BreadcrumbList + FAQPage，可 json.loads，FAQ 答案与可见文本逐字一致
2. 全部 amazon.de 链接含 `tag=getecoback-21`、`rel="sponsored noopener"`、`target="_blank"`，按型号名/品类词搜索
3. meta description 120–155 字符，关键词前置+一个数字锚点
4. 恰好一个 `<!--EB_NAV-->`；`affiliate_click` 存在；`</html>` 结尾
5. canonical/hreflang/og 指向 `https://getecoback.com/guide/<slug>.html`

## 4. 收尾
`build_structure.py && build_sitemap.py && build_feed.py` → 校验 → commit/push（CI 自动部署+IndexNow）→ playbook 队列标记"已写"。
