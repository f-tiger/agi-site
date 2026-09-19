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

## 尚未完成

Cloudflare 管理后台在当前浏览器持续触发安全验证，重试一次仍未进入；未修改后台秘密配置。没有可用的 Cloudflare 配置连接器或 GitHub Secrets 写入接口，因此未设置 ADS_WALLET、两端 ADS_WATCH_SECRET 或 GitHub ADS_WEB3_ENABLED 变量。没有执行任何真实付款、钱包转账或退款。

开通步骤见 `sites/baipiaoji/docs/WEB3-SETUP.md`。代码发布与真实收款开通分开记录。此功能为一次性赞助投放，不是会员自动续费。

## 生产部署结果

PR #9 已合并，部署提交 `854b49b602888215698b3c0f897823f18e560535`；Actions `35432636100` 全部成功。
线上浏览器检查 `https://baipiaoji.com/advertise`：显示 49 USDT / 30 天、匹配尾数和未开售说明，Web3 按钮禁用。
线上 API：`web3.enabled=true`、`chain=bsc`、`token=USDT`，但 `configured=false`、`watch_healthy=false`、`rails.wallet=false`、`selling=false`。未授权私有订单请求返回 401；未配置的后台验款接口返回 503。
直接运行真实 RPC 只读探针通过 chainId、18 位精度、最终确认区块检查。没有真实资金转账。
