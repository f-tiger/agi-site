# 收款怎么开通（bpj 广告位）· 2026-09-16

owner:「收款如何做？你帮我解决」。这份文档只写你要做的动作，代码侧已经全部就绪。

---

## 零、先看这一段：按「每分钟能拿到多少钱」排序

**在开通 bpj 收款之前，有一笔钱已经赚到了，只差你填资料。**

| 顺序 | 事情 | 你要花的时间 | 背后的钱 |
|---|---|---|---|
| **1** | **Amazon PartnerNet 付款/税务资料**（eco） | **~2 分钟** | **€11,20 已在累积（30 天窗至 14.09.2026），填完才付得出来** |
| 2 | Stripe 账号 + 一个 Payment Link | ~10 分钟 | 同时点亮 **bpj 广告位** 与 **SourceRadar 付费包**（两个站共用一个账号） |
| 3 | 钱包轨（USDT） | ~10 分钟 | 与 2 二选一；免 KYC，但要多配几个值 |

第 1 项不是 bpj 的事，但它是舰队里**唯一已经真实发生的收入**，而 bpj 广告位过去 28 天
的下单数是 **0**。先把已经赚到的钱拿到手，再给还没有买家的货架装收银台——这个顺序更划算。

下面的 2 和 3 **二选一即可**，不必都做。

---

## 一、卡轨（推荐）：Stripe，两个密钥

代码侧需要的四个参数里，有两个非机密的已经写进 `wrangler.toml`（价格 €49/30 天、币种、
周期、到账预计），**你只需要配两个真正的密钥**。

### 1. 在 Stripe 建一个产品与支付链接

1. Stripe 后台 → **Products** → 新建产品，比如「Baipiaoji 板块广告位 / 30 天」，
   价格 **€49.00**（必须与 `wrangler.toml` 里的 `ADS_PRICE_CENTS = "4900"` **完全一致**；
   不一致时服务端会拒绝上架并记一条 `ad_mismatch`，不会静默放行）。
2. 该价格 → 创建 **Payment Link**。复制那条 `https://buy.stripe.com/…` 链接。
   > 代码会自动在链接后面拼 `?client_reference_id=<订单号>`，你不用管。
3. Stripe → **Developers → Webhooks** → 添加端点：
   - URL：`https://baipiaoji.com/api/ad-webhook`
   - 事件：**只勾 `checkout.session.completed`**
   - 建好后复制签名密钥 `whsec_…`

### 2. 把两个值填进 Cloudflare

Cloudflare 控制台 → **Workers & Pages → aiyangmao → Settings → Variables and Secrets**，
类型都选 **Secret**（加密，不会出现在日志里）：

| 名称 | 值 |
|---|---|
| `ADS_PAYMENT_LINK` | 第 2 步那条 `https://buy.stripe.com/…` |
| `STRIPE_WEBHOOK_SECRET` | 第 3 步那个 `whsec_…` |

保存后**重新部署一次**（或等下一次每日构建）才生效。

### 3. 两条建议（与 SourceRadar 那份文档同源，同一个 Stripe 账号）

- 开 **Stripe Tax**：欧盟对数字服务按买家所在国征 VAT，Stripe 代算；Payment Link 里勾「收集账单地址」。
- 广告位买家基本都是公司（厂商），与 SR 的消费者数字商品不同，欧盟 14 天撤回权一般不适用于
  B2B；但**具体怎么开票、要不要反向征收，属于你和税务的事，代码不替你判断**。

---

## 二、钱包轨（备选）：USDT，免 KYC

> ⚠️ **2026-09-16 修掉了一个致命缺陷，先说清楚**：这条轨原来用 Cloudflare D1 REST +
> `CLOUDFLARE_API_TOKEN` 回写订单，而本仓的 token 没有 D1 权限（根手册 09-12、09-13 两次记录，
> deploy workflow 的注释里也写着「CI 直连 D1 的 REST 导出在舰队里从未成功过一次」）。
> 那意味着：**你配好地址、买家真付了钱，轮询会在第一条 SQL 就失败，广告永远不会上架。**
> 现已改走站点自己的 `/api/ad-claim`（Worker 自带 D1 绑定，零 token），并顺带把一个
> 带 D1 写权限的 token 从公开仓的 Secrets 里拿掉了。

### 1. 先生成一个共享密钥

```bash
openssl rand -hex 32
```
同一个值要填两个地方（下面表里的 `ADS_WATCH_SECRET`）。它是链上轮询回写订单时的唯一凭证。

### 2. Cloudflare（Workers & Pages → aiyangmao → Variables and Secrets）

| 名称 | 类型 | 值 |
|---|---|---|
| `ADS_WALLET` | **Secret** | 你的收款地址（公开仓红线：地址永不入库，只能放这里） |
| `ADS_WATCH_SECRET` | **Secret** | 上一步生成的随机串 |
| `ADS_WALLET_CHAIN` | Var | `tron` / `ethereum` / `base` / `arbitrum` / `optimism` / `polygon` 之一 |
| `ADS_WALLET_TOKEN` | Var | `USDT` |

### 3. GitHub（仓库 → Settings → Secrets and variables → Actions）

| 名称 | 类型 | 值 |
|---|---|---|
| `ADS_WALLET` | Secret | 同上，同一个地址 |
| `ADS_WALLET_CONTRACT` | Secret | 该链上 USDT 的**合约地址**。不配就报错退出——不核对合约等于任何人扔一个山寨币都能白拿广告位 |
| `ADS_WATCH_SECRET` | Secret | 与 Cloudflare 那个**完全一致** |
| `ADS_SCAN_API_KEY` | Secret | 区块浏览器 API key（TRON 用 TronGrid，EVM 用 Etherscan v2；不配也能跑，但会被限流） |
| `ADS_WALLET_CHAIN` | **Variable** | 与 Cloudflare 一致。**这个变量还兼任开关**：不设的话整条轮询任务直接跳过 |
| `ADS_WALLET_TOKEN` | Variable | `USDT` |

轮询每 2 小时跑一次（`bpj-ad-watch.yml`），认领方式是**唯一金额**：下单时每笔在基准价上加一个
由订单号派生的分位尾数，链上按「金额完全相等」匹配。**不用 memo**——EVM 与 TRON 根本没这个字段，
而买家漏填 memo 是这类方案最常见的卡单原因。少付一分都不上架，多付也不上架，挂起等你处理。

---

## 三、怎么确认真的通了（一个 URL）

打开：**<https://baipiaoji.com/api/ads?doctor=1>**

```json
{ "selling": true, "rails": { "card": true, "wallet": false },
  "configured": { "payment_link": true, "stripe_webhook": true, "wallet": false, "claim_secret": false },
  "price_cents": 4900, "currency": "EUR", "days": 30, "blockers": [] }
```

- `selling: true` = 已通电，投放页开始收单。
- `selling: false` = 未开通，投放页会**如实显示「未开售」**，不会假装能收钱。
- `blockers` 会直接用中文说缺哪一个。
- **这个端点只回布尔值和本来就印在页面上的价格，绝不回显任何密钥的值、前缀或长度。**

另外每次部署的自检里都会跑一遍这个体检，并且**半通电会让部署直接变红**——
比如支付链接配了、webhook 没配（买家付得了钱但位子永远不会上架，这是最坏的结局）。

---

## 四、日常会遇到的三件事

| 情况 | 会发生什么 | 你要做什么 |
|---|---|---|
| 买家付款金额不符 | 不上架，记一条 `ad_mismatch` 事件 | 决定退款还是补差；代码不替你猜 |
| 链上收到钱但对不上任何订单 | 轮询日志打印「⚠️ N 笔入账对不上任何待付订单」 | 人工核对 |
| 要改价格 | — | 改 `sites/baipiaoji/wrangler.toml` 里的 `ADS_PRICE_CENTS` 一行，**同时改 Stripe 那边的价格**。已下单的买家不受影响（金额按下单时存下的值校验） |

退款在 Stripe 后台做；然后把该 `ads` 行的 `status` 改回非 `live`（会话经 MCP 一条 UPDATE 即可）。

---

## 五、诚实提醒

广告位过去 28 天的下单数是 **0**，`ads` 与 `ad_orders` 两张表都是空的。
通电不会自己带来买家——它只是把「有人想买时买不了」这个障碍去掉。
判定线 `bpj-ad-inventory-1014` 已预登记：到期看 `/ad/house/tool/*` 点击与 `ads` 草稿数，
读数为 0 就按规矩撤回工具页库存，而不是继续加功能。
