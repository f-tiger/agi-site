# TradeCheck 与商业实验发布验收

2026-09-18，UTC。用户已授权推送上线，主仓保持 private。

## 已发布

- [TradeCheck 浏览器演示](https://rfqdesk.agiscorecard.com/agent)
- [MCP 新手安装教程](https://rfqdesk.agiscorecard.com/agent-guide)
- [MCP beta 下载](https://rfqdesk.agiscorecard.com/downloads/tradecheck-mcp-0.1.0.tar.gz)
- [RFQDesk](https://rfqdesk.agiscorecard.com/)
- [ModelMeter](https://modelmeter.agiscorecard.com/)
- [QuerySprint](https://querysprint.agiscorecard.com/)
- [LocaleBatch 新版](https://localebatch.agiscorecard.com/)；[Learn 相关入口](https://learn.agiscorecard.com/adult-what-to-learn)此前部署成功。

代码提交：`efd8a49284b699280261759a6a66c9f631f9901e`。D1 prepared statement 修复：`d59713ea356ee4ff64b8a3c3ae785a52bbef037a`。

最终完整流程：[GitHub Actions 35368837241](https://github.com/f-tiger/agi-site/actions/runs/35368837241) **success**；包括 MCP 编译 / 测试 / 评估 / 打包、站点构建、Cloudflare 部署、线上页面 / 数据持久化 / 下载校验和检查、真实基线汇总。

## 验收证据

| 层次 | 结果 |
|---|---|
| MCP 引擎与真实 stdio 客户端 | 14/14 测试通过；工具发现、调用、分页、草稿、资源、prompt、错误输入均有实际协议检查 |
| 独立工具复核 | 10/10 问题，230/230 契约断言；发现并修复一处累计数量证据引用错误 |
| 原三工具与统计 Worker | 15/15 测试通过，包括真实 SQLite、跨站拒绝、去重、QA 排除、已有表保留 |
| 公网部署 | 三站页面、资源、404、收费关闭、QA 事件写入与重复写入、伪造 Origin 拒绝、WASM MIME 全部通过 |
| 公开 Agent 浏览器 | 首屏与结果布局检查；一键例子显示 2 异常 / 0 缺口 / EUR 44.00；来源明确；报告与未发送草稿的下载链接实际生成；QA 价格兴趣反馈显示成功 |
| 采购工具浏览器 | 样例实际结果 B=825、A=1350、C=2330，按已知现金支出排序 |
| 成本工具浏览器 | 样例实际支出 $140、30 天线性 pace $300；明确不作预测 |
| SQL 工具浏览器 | 实际 WebAssembly 执行 paid-orders 查询，两个数据集评分通过，进度到 1/3；全三题的双数据集逻辑另有自动测试 |
| 公网包重新安装 | 已从公网下载 90,433 bytes，核对 SHA-256 后解压到独立目录；重新 npm ci，包内 14 项测试全通过 |

本次安装验证的包 SHA-256：`e446bfcb1a3195f38df271530309a8c3414e7694f1d6a9dd3a0cb2a888c72e72`。后续重新构建可能改变归档时间及评估时间，校验应使用同次发布的 `SHA256SUMS`。发布切换期间曾遇到一次包与校验文件不匹配，验证阻止了安装；部署稳定后重新下载匹配并通过安装测试。不能把失败的一次下载报告成成功。

浏览器日志中的错误来自浏览器扩展；所检查页面未发现业务脚本错误。不声称做过独立移动设备视觉验证、每种桌面 MCP host 验证或 PDF/OCR / LLM 质量评估。

## 部署阻塞的实际解决

1. D1 管理 API 对 CI token 返回 401。使用 Learn 已有的 `after35-events` 运行时绑定；Cloudflare 接受绑定。只创建、清理和聚合 `venture_events`。
2. 账户的 5 个免费 cron 已占满。没有升级套餐或删除其他站的 cron；本实验改为请求时清理，隐私页写明空闲数据可能延迟删除。
3. 线上 D1 对多行 `exec` 初始化的行为与本地 SQLite 不同。改用 `batch` 执行两条完整 prepared statement，最终线上数据写入和报表验证通过。参考 [Cloudflare D1 API](https://developers.cloudflare.com/d1/worker-api/d1-database/)。

## 当前商业基线

16:31 UTC 完整部署汇总：排除 QA 后 **0 条自愿分享的非 QA 事件**。这不是零访客的证明，也不支持推算用户、成交、留存或营收。价格兴趣是匿名意向；下载点击不是安装；没有新增已验证付费买家或营收。

公开 beta 与本地 MCP 已交付，支付保持关闭。团队空间、托管 MCP 计费、PDF/OCR、ERP、付款、收货核对尚未实现。下一阶段按[商业评审门槛](vertical-agent-commercial-review-2026-09-18.md)验证真实任务总耗时、漏报、重复使用和付款，而不是把技术验收当市场成功。
