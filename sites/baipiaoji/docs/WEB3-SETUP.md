# BPJ Web3 收款接入

2026-09-19：Owner 选择币安钱包截图对应的 BNB Smart Chain USDT（BEP-20）。地址已做 EIP-55 校验；实际地址与查询凭据不进仓库。同一个 0x 地址不等于自动支持所有链、币种。

## 开通

代码中已有非秘密配置：`ADS_WEB3_ENABLED=true`、`ADS_WALLET_CHAIN=bsc`、`ADS_WEB3_PRICE_USD=49.00`、`ADS_WEB3_RPC_URL=https://bsc-rpc.publicnode.com`。独立试验价为 **49 USDT / 30 天，加不足 0.01 USDT 的订单匹配尾数**，不是原 EUR49 的汇率换算。

1. Cloudflare Pages → `aiyangmao` → Settings → Variables and Secrets → Production，添加两个 **Secret**：
   - `ADS_WALLET`：Owner 提供的完整收款地址。
   - `ADS_WATCH_SECRET`：本机执行 `openssl rand -hex 32` 生成的随机值。不发到聊天、源码或日志。
2. GitHub `f-tiger/agi-site` → Settings → Secrets and variables → Actions：Secret `ADS_WATCH_SECRET` 填同一个随机值；Variable `ADS_WEB3_ENABLED` 填 `true`。
3. 重新部署 Pages，然后手动运行 Actions **bpj ad watch**，mode=`watch`。它验证 RPC、真实链 ID、USDT 精度、日志接口，并记录巡检健康状态。
4. 查看 `https://baipiaoji.com/api/ads?doctor=1`，确认 `rails.wallet=true`、`web3.watch_healthy=true`。只配置地址、未通过后台验款检查时，网站保持未开售。
5. 用自有资金做一笔真实付款验收，检查只交付一次、赞助位与起止时间正确。测试价应事先明确配置，验收后恢复；模拟测试不计真实营收。

不需要 Stripe 账户，也不需要钱包私钥或助记词。客户主动签名转账，系统核验后交付；本功能不自动扣客户余额，不是订阅自动续费。

## 规则与限制

- 只接受 BSC 主网 `chainId=56`，USDT 合约 `0x55d398326f99059fF775485246999027B3197955`，18 位精度。报价显示 6 位小数，完整链上金额使用 BigInt 精确换算与核对，1 wei 差异也不会自动交付。
- 报价有效 1 小时。每笔增加唯一尾数（0.000001–0.009999 USDT），同一收款配置与基础价格下永久不复用，防止迟到付款匹配到另一客户。每基础价最多 9,999 个报价，耗尽暂停新报价。
- 买家需使用能精确发送 6 位小数的钱包，网络手续费另付。系统校验合约、收款人、金额、付款窗口、成功收据、最终确认区块和区块哈希。同一交易只能交付一次。
- 页面每 15 秒查询，约 20 分钟后可刷新继续。后台复用每 2 小时任务，分批扫描；GitHub 排队或索引延迟可能推迟确认。无需买家提交交易哈希，手动输入仅用于补充核验。
- Stripe 与 Web3 共用每分类 3 个赞助位：满位自动排到最早空档，完整投放天数从排定时刻开始。自然目录排名不出售。
- 初期公共 RPC 保护：每 IP 每小时最多新建 5 单，近 7 天待付订单最多 20 单。报价到期后仍扫描原付款窗口 7 天；更久的到账凭据需人工核对。
- 后台 4 小时未成功巡检即暂停新单。公共 RPC 无商业 SLA；若限流，应换成支持 `eth_getLogs` 与 `finalized` 的 BSC 专用节点。BNB 官方部分公共节点禁用了日志查询，不能直接替换过去。
- 链上退款需站方核对后手动转账并停止投放，未实现自动链上退款。错误网络、币种、少付、多付不会自动交付。
- 存储的限流标识为带服务端秘密盐的小时级摘要，不保存原始 IP。订单凭证只存哈希；公开广告接口不暴露交易或收款配置。

## 验证证据

合约与精度交叉核对 Trust Wallet 注册表及 BSC `decimals()`；对公共 RPC 读测 chainId 和过滤日志查询。集成测试使用真实 SQLite、模拟链上响应；未进行真实资金转账或真实收款验收。

来源：[BNB RPC 接口](https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/)、[最终确认 API](https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/bsc-api-list/)、[Trust Wallet USDT 资产记录](https://github.com/trustwallet/assets/blob/master/blockchains/smartchain/assets/0x55d398326f99059fF775485246999027B3197955/info.json)。
