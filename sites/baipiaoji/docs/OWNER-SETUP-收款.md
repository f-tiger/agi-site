> 2026-09-19 更新：Web3 开通优先走已有 GitHub Cloudflare Key。只需添加 GitHub Secret `ADS_WALLET`，其余由部署流水线同步、部署和检查；详见 [WEB3-SETUP.md](WEB3-SETUP.md)。下方手动 Cloudflare 设置属于备用方式。

> 2026-09-19 更新：Owner 先使用 BNB Smart Chain USDT。新版开通步骤见 [WEB3-SETUP.md](WEB3-SETUP.md)；下文 Stripe 方案保留作后续银行卡入口。新版已实现独立 Web3 验款，覆盖下文历史“需要升级”的状态说明。

# BPJ 自动收款与投放接入

更新：2026-09-19。本版本用服务端 Stripe Checkout 取代新订单的通用 Payment Link / 裸钱包模式。旧订单保留处理路径。

## 当前状态

本轮改造前线上体检：selling=false；支付链接、回调密钥、钱包和认领密钥均未配置。没有已连接 Stripe 工具，不能代建商户、取得密钥或声称真实支付验收通过。

## 最少接入动作

在 Cloudflare Workers & Pages → aiyangmao → Settings → Variables and Secrets 设置：

| 名称 | 位置/含义 |
|---|---|
| STRIPE_SECRET_KEY | Stripe 后端密钥；生产用 live，测试环境用 test。只放 Secret，不发到聊天或提交仓库 |
| STRIPE_WEBHOOK_SECRET | 对应环境 webhook 的签名密钥；只放 Secret |
| ADS_PUBLIC_ORIGIN | 默认 https://baipiaoji.com；独立Preview设置为该HTTPS预览域，确保付款返回同一测试环境 |
| ADS_STRIPE_MODE | live / test，必须与密钥环境一致；生产仓默认 live |
| ADS_PRICE_CENTS / ADS_CURRENCY / ADS_DAYS | 仓库已有 4900 / EUR / 30；价格是假设。订单保存下单时版本 |
| ADS_AUTOMATIC_TAX | 默认 false。需要自动计税时先完成商户相应配置并测试，才置 true；代码单独校验小计与税额 |

Stripe 配置端点 `https://baipiaoji.com/api/ad-webhook`，订阅：

- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed
- checkout.session.expired
- charge.refunded
- charge.dispute.created

重新部署配置。无需人工创建产品和 Payment Link；每单由后端固定价格。D1 新表由幂等建表在运行时建立，不依赖旧 CI token 的 D1 REST 权限。端点 `/api/ads?doctor=1` 仅显示布尔、价格与模式，不泄漏密钥。

## 真实验收顺序

1. Preview 独立环境、独立测试 D1 绑定、test keys/mode；切勿将生产改成 test 来做体验演示。
2. 从中英文投放页下单，付款后返回；只有服务端状态 live/queued 才算交付，URL中 payment=returned 不是支付证明。
3. 覆盖四笔同分类成功单、延迟到账、重复回调、取消/过期、退款/争议、DB失败重试。第4单应排队，不吞掉时长。订单查询只在本浏览器保存能力令牌，不在地址栏或统计路径中带 token。
4. 在生产配置 live keys后，由 Owner完成一笔已授权的小额真实交易与退款，核对 Stripe到账、bpj_ad_checkout、前台展示。不要把 test events 计入营收。

## 交付规则和异常

3个新赞助位/分类，按付款回调处理顺序分配最早空档；不出售自然推荐名次，不承诺流量/销量。排队在下单前明确接受；起止时刻与位次在付款返回后自动显示。一次性付款，不自动续费。

重复请求复用浏览器订单令牌与 Stripe idempotency key。网络失败后应重试原订单；新订单按钮提示不得重复支付。浏览器查询令牌丢失时凭Stripe付款凭据人工恢复查询；目前没有账户登录/跨设备恢复功能。

任何已成功退款（包括部分退款）或新争议，自动暂停整笔投放。争议胜诉后不自动重新激活，避免旧事件重新扣时间；需确认剩余交付再人工处理。退款动作仍在Stripe后台发起，代码不会擅自退款。

队列不因退款自动挪动其他人的已承诺日期；新付款会使用可用的最早档期。新价格不更改旧订单。错误金额/币种/环境返回409，DB临时故障503供Stripe重试，不返回假成功。运营需在Stripe后台关注失败事件并重投；本版本未建设自动对账补偿任务。

历史 Payment Link / 钱包订单继续原路径，不把老系统的日期精度、退款能力和唯一金额限制声称为本次完整改造已覆盖。当前线上没有配置历史收款通道；若未来启用钱包，需独立升级并验收，不能仅填地址就开售。

## 数据与财务口径

付款和交付只保留订单、公开广告、金额/币种、付款引用及期间。卡号/账单由Stripe处理，浏览器不可取得后端密钥。公开ads接口没有支付标识或查询令牌。net revenue、税、退款、费用、利润分开；一次性广告费不计MRR。价格和月会员候选仍待买家验证。

参考：[Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/create)、[Stripe webhooks](https://docs.stripe.com/webhooks)、[D1 batch transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/)。
