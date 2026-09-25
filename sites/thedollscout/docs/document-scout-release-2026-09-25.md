# TDS Document Scout：转型交付与增长判定

日期：2026-09-25。Owner 明确授权跨行业转型并落地到 TDS。没有把收藏品当作必须保留的业务方向。

## 优化后的执行任务

依据此前 Google Trends 和用户任务调研，把 TDS 重定义为面向内容交付人员的小型专业文档工具站。优先解决「一批 PDF 发布/交付前，不知道问题在哪、哪些仍需人工复核、如何把结果交给下一人」的问题。交付可实际运行的工具、三个语言入口、真实示例、搜索与 AI 可读页面、独立计量、可重复部署和验收。以动作、搜索查询和后续真实购买验证方向，不承诺流量或把趋势指数换算成市场规模。

## 本次交付

- TDS Document Scout 品牌首页，EN/DE/ZH 共 33 页：每种语言含首页、4 工具、3 操作指南、方法、隐私和历史收藏品入口。
- `/pdf-accessibility-checker`：解析标题、默认语言、标记声明、页面结构、文本、图形替代文本线索、标题等级和表单；提示下一步。
- `/pdf-batch-audit`：10 文件批量检查与人工复核记录，CSV/JSON 输出供交接。
- `/pdf-to-text`：按页提取已有文本并下载 TXT。
- `/compare-pdf-text`：按规范化文本对齐页面，显示新增、删除和修改；处理插页造成的位移。
- 三种语言同一路径族 reciprocal hreflang、canonical、可见 FAQ 对应 JSON-LD、sitemap、IndexNow URL 队列和 llms 索引。社交图明确呈现文档定位。
- 全部文件处理在浏览器，PDF.js 6.3.289 与工作线程从本站加载。无付费接口、模型推理费或文档上传。此版本不提供 OCR、标签修复、视觉差异、标准认证。
- 上限：20 MB/文件、10 文件/批、100 MB/批、200 页/文件、600 页/批、每页 10 万字符、每文件 200 万字符、每文件读取 90 秒。超限或失败明确显示部分/未知。
- 旧收藏品 URL 与会员保持各自原有功能，退出文档首页主导航；发布产物标明历史内容。旧会员不售卖 PDF 能力。旧内容移除守卫保留。

## 为什么先做这条任务

先前 Google Trends 调研提供的是相对关注度：美国 5 年窗口中，PDF accessibility 最近 8 个完整周平均 16.25，对前 8 周 12.50；历史峰值后回落，不能解释为持续高速增长。pdf remediation 的低基数变化也不足以证明支付意愿。调研第一候选是专业 PDF 批量审查与交付，而不是泛化的「AI PDF 万能工具」。

本次是把候选做成可验证产品。竞争、获客和用户支付仍待真实结果；没有声称已有客户访谈或订单。可复核来源与前轮完整趋势数据在交付给 owner 的 `TDS-full-pivot-research.md` 中。技术方法引用 Mozilla PDF.js、W3C PDF1/PDF3，页面说明自动线索不能替代人工复核。

## 获客路径

| 搜索/分享意图 | 落地任务 | 下一步 | 可观测结果 |
|---|---|---|---|
| PDF accessibility checker | 检查自带文件 | 读取问题，人工核验 | doc_start / doc_complete / doc_partial |
| batch PDF audit | 同批检查多份材料 | 记录复核并导出 | doc_batch_complete / doc_review / doc_export |
| PDF to text、scanned vs text PDF | 提取文本，确认空结果原因 | 下载文本或转到合适 OCR 工具 | doc_text_complete / doc_export |
| compare PDF text | 比较交付前后版本 | 查看页面变化并导出 | doc_compare_complete / doc_export |
| 实用指南、同事分享 | 了解方法与限制 | 进入相关工具 | doc_view / doc_share |

沿用既有每日发布、IndexNow 和流量报告。趋势采集替换 3 个种子为 pdf accessibility / pdf remediation / compare pdf，保持原请求配额。没有新增定时器，没有把 Product Hunt/Reddit 的发帖或群发当作已完成工作。

## 计量与决定

- 端点：`https://thedollscout.com/api/document-stats`。每日既有工作流把聚合值写回 `content/document-metrics.json`。
- 新工具用独立 `doc_*` 事件；不混入老 `ev=''` PV。工具代码每次页面加载每种事件最多发一次，因此只能读动作数，不能读独立人数、留存率、支付转化率。
- 自带文件必须全部处理且在限制内，才记 doc_complete。部分处理 doc_partial；运行失败 doc_error。示例只记 doc_sample；CI 只写 `/__ci/documents` / doc_ci，统计时单列排除。
- 不记录文件名、文件体、标题、提取文本、人工复核内容或用户 ID。引荐只传来源 origin、仅存 hostname。服务器只接受白名单页面、事件和字段。开放匿名端点仍可被伪造，不是反作弊认证；浏览器自动化、DNT 与 x-probe 会跳过真实事件。
- 2026-09-23 的 304 次旧 QA PV 不作为新产品基线。首次线上读数和实际发布 SHA 记入 `content/growth-log.md`；尚未上线前不预填真实流量。
- 2026-10-23 复盘已登记 `tds-documents-1023`。先达到 100 次工具页访问才解读完成量，再看完整处理 20、导出 5。门槛是学习假设，不是行业标杆。访问不足先解决抓取/索引/分发，不能据此否定需求。
- GSC 查询、展示、点击及新路径抓取与事件交叉核对。统计不到独立复访，需后续访谈或另行定义计量才能作留存结论。

## 商业化边界

当前收费为 0；本版没有收费能力、客户或收入的假设性宣称。未来付费增量候选是团队复核、版本历史、审查交付流程，需先证明重复任务和免费替代不足，再验证 3 位独立买家、支持后贡献为正及续费。

收入天花板现在无法从 Trends 得到。只作算术情景：若未来经验证的价格为 $29/月，100 / 500 / 1,000 个实际付费账户对应 $2,900 / $14,500 / $29,000 MRR，均非预测。每月 $100,000 在同价下约需 3,449 个活跃付费账户；获客、支持和留存必须另证。页面没有挂出这些未经验证的价格或销量。

## 验收与维护

本地：真实压缩 PDF 的文本和 /Lang、实际标签树、无文本页、真实加密 PDF、损坏文件、页数/体积限制、插页对齐、CSV 注入防护、三语言一致性、事件隔离均有测试。既有收藏品和会员隔离测试继续作为发布门。

静态检查涵盖 33 页链接、canonical/hreflang、sitemap、结构化数据与依赖资产；137 条 FAQ/DefinedTerm 的可见正文一致性通过。生产发布另验 33 页与资产、CI 事件写入并从 D1 回读，再用真实浏览器操作示例、文件选择和导出。最终线上验收以增长日志记录为准。

复现（从 `sites/thedollscout`）：

```sh
npm ci --prefix scripts/documents --ignore-scripts
npm test --prefix scripts/documents
node scripts/documents/build.mjs
node scripts/documents/verify.mjs
node scripts/check-structured-data.mjs
```

根仓 workflow 顺序：防回滚 → 文档构建/测试 → 旧内容与来源守卫 → assemble → 旧 workbench 与会员 → 文档最终主页/索引 → Cloudflare Pages → 文档、会员与历史 URL 线上验收 → IndexNow。
