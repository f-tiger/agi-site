# 8 方向、24 工具：第一版上线记录

日期：2026-09-19。原清单：`docs/revenue-portfolio-2026-09-19.md`。Owner 本轮明确要求核对是否全部上线，并继续完成缺项。

## 先纠正状态

原清单是 24 个产品候选，不是 24 个已上线商业服务。本轮实现各候选可操作的第一版，复用四个主站；不另开 24 个低内容域名，也不把此前 Web3 子站算入这份清单。上线与收费是两个不同状态。

只有 LaunchDesk 连接现有 BPJ 赞助位付费链路。其余 23 项免费；原调研的订阅价与报告价仍是待验证假设。前端本地存储不是会员鉴权。自动源监控、跨设备团队空间、托管翻译、账号订阅与高级交付尚未实现，不宣称已开售。没有新增已验证收入、买家、访谈或转化率。

## 实现与分发

`tools/revenue-studio` 是唯一生成器与共享引擎。每个工具有任务专属字段、可运行示例、结果、方法边界和导出。20 个表单工具支持显式保存、加载和 JSON 输入备份；数据只留在用户浏览器。SQL Projects 提供 3 个实际运行的原创 SQLite 项目；PuzzleClub、ClassroomPuzzles、EmbedPuzzles 提供唯一解的原创题目、答题校验、可打印答案或可运行嵌入代码。

各主站首页、AGI 中英工具入口、相关工具互链、sitemap、llms 索引自动接线。营销队列增加 24 个带 UTM 的候选草稿，沿用现有定期准备流程；不向外部发邮件或社交消息。草稿就绪不计作分发，不计作收入。工具结果不上传；当前没有新增“真人自有材料任务完成”的后台统计，不能从页面访问推算该指标。

## 清单与实际交付边界

| 方向 | 工具 | 本轮实际功能 | 未交付的高级功能 |
|---|---|---|---|
| AI 工具 | LaunchDesk | 投放准备、真实库存与现有付款入口 | 不保证流量或销售 |
| AI 工具 | QuotaWatch Pro | 两版配额、单位和周期差异、本地版本 | 自动抓取/持续监控 |
| AI 工具 | CreatorOps | 时间码、证据与权利检查的制作简报 | 视频剪辑/版权核验服务 |
| 研究 | EvidenceWatch | 声明来源、复核日期、ICS 日历 | 自动识别来源变更/发信 |
| 研究 | AgentFit | 任务架构、权限与验收测试简报 | 实际部署与供应商评测 |
| 研究 | FilingLens Workspace | 同口径指标差异、引用与导出 | 多人云项目/自动匹配财报口径 |
| 能源 | BillLens | 首年与续年电费比较 | 供应商签约/阶梯电价模型 |
| 能源 | AppliancePayback | 三种电价下回本与使用期净差 | 设备实测或商品推荐结论 |
| 能源 | HomeEnergy Log | 多电表累计读数、日均用量、重置识别 | 设备连接/云同步 |
| 收藏 | CollectorLedger | 持有量、重复件、分币种成本 | 估值/鉴真/市场价格源 |
| 收藏 | DropCalendar | 带时区的官方公告录入与 ICS | 自动发售新闻源/后续同步 |
| 收藏 | DisplayFit | 两种摆放朝向、前排展示量 | 承重与安装认证 |
| 外贸 | TradeCheck Team | 单行 PO/发票匹配、历史重复标识 | 团队账号/OCR/ERP/付款 |
| 外贸 | LocaleBatch QA | 空译文、占位符、数字、标签、重复字段 | 自动翻译/语义质量保证 |
| 外贸 | RFQ Roundbook | 同币种同数量报价、轮次本地留存 | 多人审批/自动换汇 |
| 商业 | EvidenceBrief | 证据类型、反证、替代、下一测试 | 代做市场访谈/购买意愿结论 |
| 商业 | ModelMeter Reconcile | 标准化账单差异、重复与贷项标记 | 厂商账户接入/自动计价 |
| 商业 | WorkflowCost | 重试概率、执行/人工/固定成本 | 厂商实时价格源 |
| 学习 | QuerySprint Projects | 3 个可执行 SQL 项目与解释 | 付费课程/身份认证 |
| 学习 | JobEvidence | 真实项目与岗位要求映射 | 代造经历/录用保证 |
| 学习 | ScamChecklist | 已知信号对应核实步骤 | 安全判决/欺诈识别模型 |
| 教育 | PuzzleClub | 日种子唯一解题目、校验与分享 | 会员题包 |
| 教育 | ClassroomPuzzles | 1–12 题打印与独立答案页 | 付费授权体系（当前允许教学使用） |
| 教育 | EmbedPuzzles | 自包含 iframe、配置与实际预览 | 托管订阅（当前允许商业嵌入） |

完整 URL 列表由 `catalog.mjs` 生成；集中入口为 `https://agiscorecard.com/workbench`。BPJ `/workbench`、Eco `/en/workbench.html`、TDS `/workbench` 各承载相关 3 项。

## 商业复核

第一方替代与反证（2026-09-19 检索）：[Home Assistant](https://www.home-assistant.io/home-energy-management/) 已提供成熟能源管理；[SQLBolt](https://sqlbolt.com/) 提供免费交互 SQL 学习；[Shopify Translate & Adapt](https://apps.shopify.com/translate-and-adapt) 是商家的原生翻译替代；[Langfuse](https://langfuse.com/pricing) 是模型运行观测替代；[n8n 工作流](https://n8n.io/workflows/) 显示通用流程模板供给已多。不能据竞品存在推导本项目会获客，更不能拿浏览器计算器冒充完整替代。

差异化试验单位：带来源的核验结果、可复用本地记录、输入准备与复核总时间、可立即带走的产物。先用原站已获得的相关搜索访问分发，不增加外部消息量。30 天或 100 次相关任务访问后复核分发；工具使用价值需要真实自有材料与授权反馈，不能用示例测试充数。只有交付、真实付款、退款处理与支持成本经过验证后才开放新收费功能。

## 验收与部署

本地：24 个产品路由/示例合同检查；CSV 结构与公式导出防护；混币种拒绝、读数重置、发票历史缺失、日历 UTC 转换、翻译占位符；100 个种子唯一解；3 个 SQL 项目真实执行。四个站点构建、canonical、schema、sitemap 和运行资源检查通过。

发布复用已有四条 GitHub Actions → Cloudflare 流水线，不读取或输出 secret 值，不修改钱包、不增设收费基础设施。AGI 发布步骤增加 24 工具浏览器交互检查，所有站点增加发布后逐页 HTTP/canonical/资源验收。最终线上结果在实际运行后追加；此段不是预先宣称部署成功。

### 本地交互验收

24 个工具在实际 Chromium 中全部操作通过：20 个表单生成结果、保存版本和下载 CSV；3 个 SQL 项目的正确查询逐一执行通过；谜题答题校验、课堂 8 个题/答案方阵、可运行 iframe 预览通过。全部页面在 390px 宽度无横向页面溢出；浏览器页面错误为 0。已检查 BillLens 桌面截图。

### 正式 URL 清单

- [LaunchDesk](https://baipiaoji.com/workbench/launchdesk)
- [QuotaWatch Pro](https://baipiaoji.com/workbench/quotawatch-pro)
- [CreatorOps](https://baipiaoji.com/workbench/creatorops)
- [EvidenceWatch](https://agiscorecard.com/workbench/evidencewatch)
- [AgentFit](https://agiscorecard.com/workbench/agentfit)
- [FilingLens Workspace](https://agiscorecard.com/workbench/filinglens-workspace)
- [BillLens](https://getecoback.com/en/workbench/billlens.html)
- [AppliancePayback](https://getecoback.com/en/workbench/appliancepayback.html)
- [HomeEnergy Log](https://getecoback.com/en/workbench/homeenergy-log.html)
- [CollectorLedger](https://thedollscout.com/workbench/collectorledger)
- [DropCalendar](https://thedollscout.com/workbench/dropcalendar)
- [DisplayFit](https://thedollscout.com/workbench/displayfit)
- [TradeCheck Team](https://agiscorecard.com/workbench/tradecheck-team)
- [LocaleBatch QA](https://agiscorecard.com/workbench/localebatch-qa)
- [RFQ Roundbook](https://agiscorecard.com/workbench/rfq-roundbook)
- [EvidenceBrief](https://agiscorecard.com/workbench/evidencebrief)
- [ModelMeter Reconcile](https://agiscorecard.com/workbench/modelmeter-reconcile)
- [WorkflowCost](https://agiscorecard.com/workbench/workflowcost)
- [QuerySprint Projects](https://agiscorecard.com/workbench/querysprint-projects)
- [JobEvidence](https://agiscorecard.com/workbench/job-evidence)
- [ScamChecklist](https://agiscorecard.com/workbench/scamchecklist)
- [PuzzleClub](https://agiscorecard.com/workbench/puzzleclub)
- [ClassroomPuzzles](https://agiscorecard.com/workbench/classroompuzzles)
- [EmbedPuzzles](https://agiscorecard.com/workbench/embedpuzzles)
