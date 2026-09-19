# Web3 Workbench 发布验收 — 2026-09-19

## 已发布

2026-09-19 10:27 UTC，首轮部署及全部生产检查通过。

- 源码提交：`d0923bc2b52bc91720dcd7939a5379962841553a`
- [成功的部署与验收运行](https://github.com/f-tiger/agi-site/actions/runs/35437382131)
- Cloudflare Worker：`agi-web3-studio`
- 第一版部署版本：`80a12065-06d9-4ed0-a0cf-fb86c61cc0bd`
- 11 个域名逐一验证构建 revision。总入口 21 个文件、每个工具 23 个文件逐字节与构建产物一致，共 251 次文件比对；加上域名就绪、路由、API、QA 反馈等，本轮发起 424 次检查请求。重试属于域名就绪等待，不计作访问增长。
- 50 项引擎与 Worker 测试、33 张 HTML 结构/链接检查、Wrangler dry-run 均通过。
- 每个工具明确标记 qa=true 的重复请求保存测试成功。生产统计区分 QA，匿名提交不能当成独立客户。

| 独立子站 | 线上已核验的示例结果 |
|---|---|
| [Stable Reconcile](https://reconcile.agiscorecard.com/) | 两张发票；一张匹配、一张少付 20；错链付款单列 |
| [Agent Evidence](https://evidence.agiscorecard.com/) | 重复标签合并；有效样本 1/2，Wilson 区间约 9.5%–90.5%；自评排除 |
| [Route Lab](https://route.agiscorecard.com/) | 三条可行路线；A→B 的最坏成本 0.03、期望成本 0.018；禁止的供应商排除 |
| [Protocol Ledger](https://protocol.agiscorecard.com/) | 五条带来源和日期的资料；公开 API、过滤、错误响应、OpenAPI 正常 |
| [Data Permit](https://permit.agiscorecard.com/) | 一个 grant 匹配、一个过期/consent 待核；分配 60、保留 40 |
| [Compute Lens](https://compute.agiscorecard.com/) | 含设置/存储/出站成本；虚构 B 的合格输出成本为 0.00389474 USD |
| [Incentive Lab](https://incentives.agiscorecard.com/) | 奖励 18/12/0，守恒且无超上限；有机贡献 5、奖励后 -25，补贴单列 |
| [Proof Plan](https://proof.agiscorecard.com/) | 100 次任务估算 50.666667 USD、12.025 秒/次，显示工件哈希和证明体积 |
| [Call Lens](https://calls.agiscorecard.com/) | 解码虚构 approve 并识别最大 uint256；安全状态始终未评估 |
| [RWA Notes](https://disclosures.agiscorecard.com/) | 同口径数值变化 +50,000；缺失赎回字段不填零 |

总入口：[Web3 Workbench](https://web3.agiscorecard.com/)。既有 [Agent Delivery Lab](https://verify.agiscorecard.com/) 仍在独立 Worker 运行。

## 浏览器验收

十个生产页面分别打开并实际点击运行按钮，结果与引擎示例一致。表单字段与操作可用；对账页修改金额后，旧结果和下载按钮立即失效，防止导出与当前输入不符的结果。结果 JSON 可在页面展开读取和手动复制。总入口桌面截图检查通过。

复制按钮显示成功；远程浏览器的外部 clipboard 读数为空，因此没有把“外部剪贴板内容已核实”写成结论。浏览器文件选择器与实际下载文件落盘未在本轮完成自动化验证；已确认静态示例和离线 ZIP 的线上字节与本地构建一致，并提供可见报告文本作为备用。手机布局有响应式 CSS，但本轮没有设备实测结论。

## 仍未成立的商业结论

没有由上述 QA 证明的真实访客、复用、付费客户、收益、行业领先表现或护城河。全部是免费首版；真实支付、钱包连接、在线模型调用、ZK 证明验证及跨站自动编排均未提供。不同工具的具体限制在各站指南和研究报告中明确。

十项观察条件已加入 `data/fleet-bets.json`，首轮日期为 2026-10-19。判定依赖相关触达和人工核实，不因上线数量多就默认商业成立。
