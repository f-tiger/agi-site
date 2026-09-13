# Opportunity Packs — owner 开通清单(2026-09-13)

代码已全部上线并自检;**收款开关在你手里**。没有下面五个值之前,`/packs` 页显示「Checkout is not open yet」,
所有付费路由返回 503,不会收到任何一分钱,也不会泄露任何包。

## 一、Stripe(约 10 分钟,沿用 bpj 广告位那个 Stripe 账号即可)
1. Products → 新建产品「SourceRadar Opportunity Pack」,一次性价格(建议先 **USD 19.00**;价格是你的决定,
   代码只核对金额与 `PACK_PRICE_CENTS` 一致,不一致的订单**记录但不发包**)。
2. 该价格 → 创建 **Payment Link**。After payment → Redirect to your website:
   `https://source.agiscorecard.com/packs-thanks?session_id={CHECKOUT_SESSION_ID}`(花括号占位符原样填)。
3. Developers → Webhooks → 新端点 `https://source.agiscorecard.com/api/pack/webhook`,事件只勾
   `checkout.session.completed`;复制 Signing secret(`whsec_…`)。
4. 建议开 Stripe Tax(数字商品在欧盟按买家所在国征 VAT,Stripe 代算);Payment Link 设置里勾「收集账单地址」。
5. 欧盟消费者对**即时交付的数字内容**有 14 天撤回权,除非在下单时明确同意放弃——在 Payment Link 的
   「自定义文本 / 条款」里加一句:"Digital content delivered immediately; by paying you consent to immediate
   delivery and acknowledge the loss of the 14-day withdrawal right."(bpj 广告位同理,顺手核对)。

## 二、Cloudflare Worker `buysomething` 的 Secrets / Vars(Workers & Pages → buysomething → Settings → Variables)
| 名 | 类型 | 值 |
|---|---|---|
| `STRIPE_WEBHOOK_SECRET` | Secret | 第 3 步的 `whsec_…` |
| `PACK_TOKEN_SECRET` | Secret | 任意 ≥32 字符随机串(`openssl rand -hex 32`);换掉它 = 作废所有已发 token |
| `PACK_PAYMENT_LINK` | Var | 第 2 步的 `https://buy.stripe.com/…` |
| `PACK_PRICE_CENTS` | Var | `1900`(与 Stripe 价格一致) |
| `PACK_CURRENCY` | Var | `USD` |
设完 **Deploy** 一次(或等下一次 push/schedule 部署)。**不要把任何值写进仓库**(公开仓)。

## 三、验证(2 分钟)
1. 打开 `https://source.agiscorecard.com/api/pack/status` → `configured: true`,`payment_link` 非空。
2. Stripe 测试模式下走一遍 Payment Link(测试卡 4242…)→ 回跳 `/packs-thanks` → 5 秒内出现「Pack … dossiers」
   或「Your pack week is not published yet」(首包未出时是后者,属正常)。
3. D1 `sourceradar-events` 的 `pack_orders` 表应有一行(只有 session/event/金额/周,无邮箱)。

## 四、退款与作废
退款在 Stripe 后台做;然后在 D1 把该行 `refunded=1`(会话经 MCP 一条 UPDATE),token 即刻失效。

## 五、首包什么时候出
包由 `tools/gen_idea_packs.py` 在每日 fleet-trends / deploy 里确定性生成,**≥10 条 dossier 才写**;
候选来自 Reddit 求做/wish 板块 × Trends rising 的匹配(09-13 首次接入,今天的计划运行后才有第一批数据)。
出包前 `/packs` 页只卖「当前包」而当前包不存在 → 页面明说,不收钱是对的。
