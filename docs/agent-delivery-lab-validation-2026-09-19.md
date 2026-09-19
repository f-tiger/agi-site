# Agent Delivery Lab：二轮验证与发布边界

日期：2026-09-19。Owner 本轮明确要求“再完善一轮整体方案的验证，验证完了，再上线部署新站”。本文件记录证据、否证、范围与可复盘标准，不把上线等同于商业成功。

## 优化后的执行任务

基于 agi-site 现有域名、部署与商业约束，复核 Web3 × AI 方向的用户任务、替代品、收费依据和技术边界；选择一个无新增付费供应商依赖、可独立使用的最小产品；实现、测试、发布并验收真实线上版本。保留原始证据与局限，不伪造客户、收入、算法创新、协议认证或支付能力。直接执行用户已授权的发布。

## 二轮结论

**发布免费工具的技术条件成立；付费监控产品的商业条件尚未成立。** 首站选 `verify.agiscorecard.com`，独立 Worker `agi-agent-delivery-lab`。人群假设：开发会购买 API 输出的 Agent 的工程师，初始任务是结构化提取返回值的验收。用户、频率、预算、付费人和可触达渠道都尚未通过独立客户观察验证。

| 验证问题 | 本轮证据 / 反证 | 决策 |
|---|---|---|
| 协议复杂性是真问题吗 | x402 官方 v2 与 HTTP transport 明确分开 PaymentRequired、PaymentPayload、SettlementResponse；字段检查不能替代签名和结算验证 | 产品必须拆开“条件检查”和“结果验收”，不得输出付款安全保证 |
| 一个发现目录有差异吗 | x402scan 官方 README 已提供生态浏览、服务器发现、交易信息与资源注册 | 不建目录、交易量排行榜或钱包入口 |
| 链标识 / 小数位有实际踩坑吗 | x402scan issue #1209 于 2026-09-18 更新，开发者报告 MPP evm/charge 的链命名与小数位解析问题 | 这是单个未由本会话复现的报告，不是统计需求证据。首版未知协议明确 unsupported，绝不猜链和 decimals |
| AI 判定能直接证明输出真实吗 | 字段齐全、类型正确、声明规则通过，都不能证明事实、来源、时间新鲜度 | 不加未经评测的 LLM 评分。不消耗付费模型；先提供可解释的确定性规则 |
| 持续监控有人付费吗 | 现有研究只有市场信号和替代品，没有独立购买记录。台账中现有站流量也不能自动成为此 ICP 的需求 | €29/月只作为匿名调研假设，checkout / 订阅 / 自动监控均未提供 |
| 是否必须现在做新算法 | 缺少真实任务、成功结果与成本反馈数据，无法验证任务信誉或采购路由优于基线 | 将新算法保留为研究方向，不作当前产品卖点 |
| 能否用现有设施发布 | 现有 GitHub Actions + Cloudflare Worker + 域名 zone + owner 管理的 D1 绑定可复用 | 独立 worker、独立 hostname、独立反馈表；部署前检测域名冲突，不覆盖已有记录 |

首轮的稳定币对账方向继续留在 RFQDesk 后续研究，不在此次另建支付产品。任务信誉与按合格结果成本路由需要实际重复任务数据。此次避免同时部署多个缺乏观察依据的站点。

## 已实现范围

1. 付款条件检查：接受 x402 v2 PaymentRequired JSON 或 HTTP PAYMENT-REQUIRED base64；仅 exact/EVM profile。金额使用 uint256 字符串校验，展示 atomic units；不推断小数位。未知版本 / 网络 / scheme 显式 unsupported。
2. 交付验收：自有小规则格式（非 JSON Schema），JSON Pointer + type / equals / min / max；空规则、未知关键字与错误配置拒绝，不静默忽略。全程浏览器内计算。
3. 条件对比：两份通过 profile 的快照对比，忽略对象键顺序及支付选项顺序；选项变化完整展示 old/new，不伪造跨选项身份匹配。
4. 导出报告 + 同引擎 Node runner：可在用户自己的 CI 对已保存的 fixture 执行；失败 / 变化 / 不支持 exit 1，输入错误 exit 2。
5. 英文工作台、中文快速上手、公开协议来源、SEO 基础、隐私说明。
6. 自愿匿名反馈：仅频率、价格兴趣、是否完成 own-task、随机去重 ID、QA 标识；不传输入、不传邮箱、不连接钱包。频率包含 0，兴趣包含不需要和只用免费版。

未实现：在线代理请求、自动付款、签名 / 余额 / 结算验证、通用安全审计、来源真实性核验、MPP / Solana 完整适配、账号、托管历史、定时监控、告警、checkout、退款、模型裁判。不存在新密码学算法或“全协议认证”声明。

## 数据与安全边界

- 输入只在浏览器内存中，未接入 analytics、cookie 或 localStorage；重载清空。报告可能含用户输入中的路径、地址与 URL，导出前后提示自行检查。
- 不读取私钥、API key，不 fetch 用户 URL，消除这一首版的服务端 SSRF 路径。DOM 使用 textContent 渲染输入衍生值。
- CSP 禁止第三方脚本、嵌入与外部连接；禁止 framing；no-referrer；输入大小、深度和规则数量限额。
- 反馈为显式点击提交，不把工具动作自动上传。服务端严格字段白名单、枚举、Origin、Content-Type、1 KiB 实际流大小和 Cloudflare 速率限制。SQL 参数化；只访问 `agent_delivery_feedback` 表。
- 使用现有 `after35-events` 的 D1 绑定；不操作已有表。反馈与 stats 请求清理超过 35 天记录，不承诺无人访问时定时删除。公共统计仅聚合枚举，无随机 ID 与时间明细。
- QA 标识单独保留；匿名提交可被伪造，既不是独立访客数，也不是付费承诺。未加入新 cron、模型供应商或广告支出。

## 验证与发布

- 本地 `npm test`：26 项通过，包含错误 / 非支持协议、大整数、不安全 URL、未知规则、指针转义、继承属性、快照重排、收款人变化、CLI exit code、反馈字段白名单 / 来源 / 大小 / 限流 / 缺失服务失败处理。
- CI 在功能分支执行相同测试与 Wrangler dry-run；main 才部署，部署前同步当前 main，避免旧事件覆盖新代码。
- 线上脚本必须匹配构建 revision、九个静态文件 SHA-256、CSP、404、跨域反馈拒绝、带 QA 标记的真实反馈写入与聚合查询。单独 HTTP 200 不算验收。
- 浏览器另验收三个工作流、错误恢复、报告下载可达、指南、布局与控制台。最终执行结果补充在本文件发布记录中。
- 回滚：回退本次 site/workflow 提交后重新部署，或使用 Cloudflare 已存在的 worker 版本回退。不得删除共享 D1 或覆盖其他 hostname。

## 30 天复盘与停投线（2026-10-19）

台账 ID：`agent-delivery-demand-1019`。读取 `/api/stats`，排除 qa=1。仅在 own_completed=1 的匿名反馈达到 10 条、其中过去 30 天 4 次以上达到 5 条、愿意讨论 €29/月达到 3 条时，启动人工核实与同一人群访谈。它们是操作触发线，不是统计显著性或付费验证。

扩付费功能还需至少 3 个独立真实购买者、交付成本计入后的正贡献和适合该产品的重复购买依据。匿名反馈本身永远不能放行收费。

未达线：停止扩大协议支持、AI 打分和付费监控开发；区分渠道不足与实际拒绝。有相关受众仍仅用一次免费检查，优先保持小工具或并回主站；没有触达证据时记 insufficient，不能宣称市场不需要。

自然入口目前只有可索引工具、指南和 sitemap；现有站访问者不是已证明的获客渠道。本次未擅自发送社区推广、邮件或广告。下一步分发必须面向正在集成付费 API 的开发者，先观察真实任务与免费替代的不足。

## 证据来源

- [x402 v2 specification](https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md)，本轮直接读取官方仓库；实现仅覆盖上述窄 profile。
- [x402 HTTP transport](https://github.com/coinbase/x402/blob/main/specs/transports-v2/http.md)，本轮读取文件 blob `a735f8003209ad372248f21f599d6c4f8f204da2`。
- [x402scan 官方 README](https://github.com/Merit-Systems/x402scan/blob/main/README.md)，本轮读取 blob `bdf62642f15b01e3b18118a889ad809495d8bb4a`。
- [MPP evm/charge issue #1209](https://github.com/Merit-Systems/x402scan/issues/1209)，开放问题、单用户报告、未由本会话复现，不能当成确定的协议漏洞。
- 内部：`.agents/product-marketing.md`、`docs/commercial-skills-review-2026-09-18.md`、`docs/creator-agent-opportunities-2026-09-18.md`、`docs/fleet-automation-map.md`、`data/autopilot/demand-digest.md`、`data/fleet-bets.json`。

## 发布记录

待 CI 与线上验收后补充。本文件中“已实现”指代码已完成，不替代发布成功记录。
