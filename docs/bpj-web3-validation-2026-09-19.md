# BPJ Web3 收款升级验证

Owner 决策：先使用截图中的币安钱包，BNB Smart Chain USDT（BEP-20）。收款地址做过 EIP-55 校验，不提交到仓库。Stripe 后续仍可补上。

## 本轮代码

- Web3 私有订单、永久不复用精确报价、BSC 18 位 BigInt 核验、最终确认及区块哈希检查。
- 网页自动扫描、可选交易哈希核验、已有每 2 小时后台任务升级入口；不依赖客户持续停留。
- 与 Stripe 共用事务内 3 槽排队、完整投放时长、公开接口到期过滤；重复交易不重复交付。
- 缺配置或后台超过 4 小时未成功，关闭新单。默认 RPC 已读测链 ID 和日志查询；无真实收款声称。
- 中英文付款页展示网络、代币合约、精确金额、支付截止和自动排期状态。

## 已验证

- 18 项 Web3 集成测试：Node 22 和 Node 24，真实 SQLite，模拟 JSON-RPC。
- 13 项原 Stripe 集成测试回归通过；11 项老 ad-claim 测试回归通过。
- 渲染 HTML 的中文/英文 DOM 测试：未配置关闭、Web3 报价、原卡支付跳转、订单凭证恢复及已排期状态。此项是 DOM 模拟测试，不冒充真实浏览器支付验收。
- 构建检查 1,603 HTML：broken、ldErr、zhLeak、placeholder、rawMd、contradiction、enJson、staleCount、hollow、hreflang 全零。
- 只读 BSC 节点交叉验证 chainId=56、USDT decimals=18；公共查询节点支持过滤 eth_getLogs。

## 当前开售验收（2026-09-19 09:24 UTC）

Owner 已保存 GitHub `ADS_WALLET`，runner 校验为已批准的 BSC 收款地址。复用已有 Cloudflare API token 同步生产 Secrets；验款子密钥按 BPJ 专用上下文派生，不将 Cloudflare 原始 token 发送到站点。

[生产 Actions](https://github.com/f-tiger/agi-site/actions/runs/35434576793) 全部成功。线上 `/api/ads?doctor=1` 确认 `selling=true`、`rails.wallet=true`、`web3.configured=true`、`web3.watch_healthy=true`。Stripe 仍未配置。

实测修复：
- 首次部署自定义域传播期间曾读到旧配置并跳过巡检；现在已同步配置的部署必须等待并通过验款，不允许静默跳过。新增三种回归：延迟后成功、持续缺失失败、未配置的定时任务跳过。
- 公共 RPC 在 Cloudflare 返回 HTTP 429，保持新单关闭；改用 `https://rpc-bsc.48.club`，链 ID 56、USDT 18 位精度、finalized 区块及过滤日志查询都通过生产巡检。
- RPC 请求使用显式超时与禁止跟随重定向；后台只输出固定阶段/原因码。对短暂 502/503/504 最多重试两次，不重试鉴权失败。

## 尚未完成

没有执行真实资金付款、钱包转账或退款。自动付款核验和排期的交付规则已有集成测试；首次真实买家付款仍应核对链上到账和实际投放。此功能为一次性赞助投放，不是会员自动续费。

## 首次部署历史（开售前）

PR #9 已合并，部署提交 `854b49b602888215698b3c0f897823f18e560535`；Actions `35432636100` 全部成功。
线上浏览器检查 `https://baipiaoji.com/advertise`：显示 49 USDT / 30 天、匹配尾数和未开售说明，Web3 按钮禁用。
线上 API：`web3.enabled=true`、`chain=bsc`、`token=USDT`，但 `configured=false`、`watch_healthy=false`、`rails.wallet=false`、`selling=false`。未授权私有订单请求返回 401；未配置的后台验款接口返回 503。
直接运行真实 RPC 只读探针通过 chainId、18 位精度、最终确认区块检查。没有真实资金转账。
