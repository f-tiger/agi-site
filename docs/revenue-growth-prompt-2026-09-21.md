# 舰队营收目标增长:先优化 prompt,再执行(2026-09-21)

owner 原话:「先优化prompt再执行:调用技能实现舰队各个站点的营收目标增长」。本文按舰队惯例:三轮 prompt 收敛 →
钱线台账(D1 现查)→ 逐站「技能怎么用、用在哪」→ 今天做掉的 → owner 决策卡 → 判定线 → 事实表。
**数字全部是 2026-09-21 D1 现查或 owner 截图,带口径;没有一个数字是推算的。**

## 〇、三轮 prompt(展示第 3 轮;前两轮改掉了什么)

**第 1 轮(原话)**:调用技能实现舰队各个站点的营收目标增长。

**第 2 轮(对抗:这句话里有五个会把执行带偏的假设)**
1. 「营收目标」没有定义。舰队今天只有**一条在赚钱的线**(eco 的 amazon.de 联盟,30 天 €11,20,owner 09-14 截图),
   其余是**通了电没人买**的收款面(四站会员、agi 广告位)和**建了没通电**的收款面(bpj 广告位、SR Packs、venture /
   localebatch 付费)。把「增长」平均分给 14 个站等于把力气花在没有钱线的站上。
2. 「调用技能」:pricing / offers / paywalls / cro 四个技能读完,共同的前提是**已经有买家在门口**——技能回答的是
   「怎么定价、怎么包装、什么时候索取」。舰队的第一方读数说的是**没有买家出现在任何一条已建收款轨上**。技能是方法论
   不是仪器;先把仪器架好,技能才有东西可读。
3. 杀单与红线不因这句话失效:不开新站、只走 Amazon 联盟、零编造、机器不外联、判定线必须预登记、台账里没有 won 的行就没有扩张槽。
4. 每分钟产出最高的动作全在 owner 侧(付款/税务信息、两个密钥、一个 key、五个 Stripe 值),会话做不了,只能把它们
   写成带 € 金额的卡片。
5. 钱线仪表盘此前只有「有 Cloudflare MCP 的会话手查 D1」才有——runner 没有 D1 读权限,heartbeat 从来没读到过一条钱线。
   「营收目标增长」如果不能每天被机器读出来,就永远只能被会话宣布。

**第 3 轮(定稿,本文按它执行)**
> 对舰队 5 个有钱线的站(eco / agi / bpj / tds / SR)与 4 类收款面(Amazon 联盟、bpj 广告位、四站会员、SR Packs):
> ① D1 现查 28 天钱线读数,把每条线分成「在赚 / 通了没人买 / 建了没通电」三类;
> ② 每站只回答一个问题:**绑定约束是什么**(流量 / 收款轨未通电 / 无需求 / 付款侧);
> ③ 用技能的方法(pricing 的价值单位、offers 的价值方程、paywalls 的「先价值后索取」、cro 的八维、citation-growth 的
>   零点击钩子)给每站**一个**不违反杀单的动作:能今天做的做掉;需要 owner 的写成 ≤3 分钟卡片并标 € 金额;
> ④ 营收目标 = **已预登记判定线的数字**,不另编;本轮新增的线只允许是仪器线;
> ⑤ 把钱线仪表盘变成第①层自动仪器(五站 pulse/reach 出 `money` 对象 → heartbeat 每日快照 → demand-digest)。

## 一、钱线台账(28 天窗,D1 现查 2026-09-21;剔 CI;各站口径见注)

| 站 | 在赚 | 通了没人买 | 建了没通电 | 28d 读数 | 绑定约束 |
|---|---|---|---|---|---|
| **eco** | amazon.de `getecoback-21`:owner 截图 30d 至 09-14 **€11,20 / 112 点击**;付款侧未填 → 一分未到手 | 会员(9 USDT/30d,`ready:true`):0 单 | — | affiliate_click **64**(human)/ 139(全 UA);真人 pv 522 → 点击率 12,3%;us-market **1**、amazon.com **1**;top 页 klimaanlage-wohnmobil 6 / dachfenster 5 / kippfenster 4 / 30-qm 4 / fensterabdichtung 4 | **流量 + 付款侧**。点击率已高,新页冷启动 ≈ 0(快反 6 页全史 pv 0),站规已冻结新页 |
| **agi** | — | /advertise($50 / $100):pv **223**,询单 **0**;/audits pv **170**,询单 0;会员 0 单;讨论区 0 账号 0 帖 | Metaculus bot(owner key) | JS 真人 pv 1 199;subscribers 2;invest_tool_click 9、tool_click 19、calc_use 21;vote_cast 95 | **无需求 + owner key**。资产是引用份额(不付钱) |
| **bpj** | — | 会员 0 单;watches 0 | **广告位 €49/30d**:`ads` 0 行、`bpj_ad_checkout` 0 行 —— 收款密钥未设 | 有来源真人 pv 3 133;go 103;**厂商投稿累计 7(3 个提交者)**、biz 4;subs 4 pending + 1 unsub(**0 个 live**);grok 一页 391 pv(Google 72) | **收款轨未通电**。舰队唯一有供给侧敲门的站 |
| **tds** | amazon.com `ecoback0d-20`(US 账号 30d $0,00,08-28 截图) | 会员 0 单 | — | 真人 pv 341,affiliate_click **1**(首页);货架在 picks 页,而 picks 页 28d pv <6 | **流量**(10-29 线) |
| **SR** | — | MCP `/api/mcp`:**24 次非 CI 调用 / 4 天**(09-17 起;check_import_claim 带参数 7 次) | Packs:Stripe 未设 → 503 | 真人 pv 98;subs 0 | **收款轨未通电**(Packs);机器面刚有真实调用 |
| 四站会员 | — | agi / bpj / eco / tds 全部 `ready:true`,9 USDT/30d,BSC:**0 单、0 会员**;/members pv agi 2、bpj 0 | — | 卖的是 24 个免费工具的云端保存,而舰队工具使用 28d 合计 61 次 | **无需求**(paywalls:「先价值后索取」——没有价值时刻) |
| venture ×4 / localebatch / web3 / verify | — | — | 付费关闭(各自发布文档的门) | 非 QA 人类事件 **0**(见 09-21 上一节) | 分发未验证 |

注:eco `affiliate_click` human 口径自 09-12 起收紧,跨窗比较只能用全 UA(139);agi 服务端 human pv 36 571 含不自报爬虫,
报告一律用 JS 口径 1 199(手册 09-14);/advertise 与 /audits 的 pv 是服务端口径,同样偏高。

**舰队已验证营收(累计)**:€11,20(amazon.de,未到账)。**非 Amazon 收入**:€0。

## 二、技能怎么用、用在哪(逐站一个动作)

| 站 | 读的技能 | 技能给出的判断(对照第一方读数) | 今天的动作 |
|---|---|---|---|
| eco | `revenue-round`(舰队自研 eco 循环)+ `cro` 八维 | 循环的诊断表:「有流量、有点击 → 复制成功页面的模式」——成功模式(toppick + inline 双钩、每页 12–16 条联盟链接、1–3 条货币页内链)**已在全部 top 页上**,cro 八维逐条看没有缺项;循环的默认动作(KGR 新页)被站规冻结(新页冷启动 ≈ 0,rising 只准深化既有页)。**结论:eco 的约束不在页面上,在流量与付款侧。** | 代码侧:钱线仪器(下节)。owner 侧:①付款/税务信息(€11,20 到手);②决策:EN 区意大利/法国/西班牙三页 28d 送了 7 次点击去 amazon.de,要不要开 .it/.fr/.es 的 PartnerNet 跟踪 ID(开了再切链,不抢跑) |
| agi | `citation-growth`(舰队自研)+ `pricing` | citation-growth:引用 ≠ 流量,被引页必须带零点击钩子——钩子在(订阅、Future Bet、工具),但 28d 只换来 2 次 subscribe_click。pricing 的价值单位:/advertise 卖的是「触达」,而触达在 JS 口径下是 40 人/天——**不是价格问题,是价值单位为零**。 | 不动 /advertise 定价、不建第五个收款面。唯一不靠流量的钱仍是 Metaculus(owner:key + 变量,3 分钟;Fall 赛季 09-28 开题) |
| bpj | `offers`(价值方程)+ `pricing` | offers:广告位的价值方程 = 梦想结果(被找到)× 可信度(**真实触达表**,已在广告页)÷ 时间 ÷ 努力(自助下单,已建);买家存在(3 个厂商主动投稿);**分子分母都齐了,唯一缺的是收银台没通电**。 | owner:卡轨两个密钥(`docs/OWNER-SETUP-收款.md`)。代码:无——09-16 已把 owner 动作压到最少 |
| tds | `cro` | 首页 125 pv、1 次点击;货架在 picks / care-cleaning 页,而这些页 28d pv <6 —— 是**到达问题不是页面问题**;cro 的「首屏价值主张 / CTA」检查对一个日均 4 人的站没有可判读数。 | 不动;10-29 线照常结算 |
| SR | `paywalls` + `pricing`(按次计量) | pricing 09-16 已算:按次计量 API 是唯一与现状同数量级的模型;09-17 起 `/api/mcp` 出现 **24 次非 CI 调用**(其中带参数的 `check_import_claim` 7 次)= 首次真实机器使用。paywalls:MCP 里不放付费墙(索引器会把它当噪音)。 | 不动 MCP;Packs 等 owner 的 Stripe 五个值;`sr-mcp-calls-1014` 10-14 按读数判 |
| 四站会员 | `paywalls` | 「先价值后索取」——会员卖的是工具的云端保存,而工具本身 28d 全舰队只被主动用了 61 次;付费墙出现在没有 aha 的地方。 | 保留轨道(owner 09-19 建的),**不再加导航或推广**;等 `fleet-tool-use-1014`(10-14)读数再定去留 |

**没做的 + 为什么**:不给任何站加新收款面(09-16 裁定:绑定约束不是工具品类);不写 KGR 新页(eco 站规冻结);
不改会员定价(0 单时改价是自我安慰);不发帖不外联;不把「会员 ready:true」记成营收。

## 三、今天做掉的(代码,全部可验证)

1. **钱线仪表盘变成第①层自动仪器**。五个钱线站的 `/api/pulse`(bpj `/api/reach`)多返回一个 `money` 对象
   ——只有聚合计数,零 PII;每站自己的口径,不归一化成假的统一口径:
   eco `affiliate_click_28d / _us_market / _amazon_com / subs_total / member_orders_by_state`;
   agi `subscribers / ev_*_28d(tool_click…)/ pv_advertise|audits|members|workbench_28d / member_orders_by_state / discuss_profiles`;
   bpj `subs_by_status / ads_by_status / ad_checkout_by_state / ad_web3_orders / watches / member_orders_by_state / submissions_total / go_28d / biz_28d`;
   tds `affiliate_click_28d / member_orders_by_state`;SR `mcp_call|pick_open|out_click|calc_use|pack_*_28d`。
   查询各自单独 try:坏了回 `money:null`,pulse 其余部分照常;**五条部署自检断言 `"money":{`**,坏了在部署时红。
   `tools/fleet/money_line.py`(selftest 5 条)随 heartbeat 每日读 → `data/fleet-money.json`;owner 亲报的 PartnerNet
   数字放 `data/fleet-money-owner.json`(带数据窗,只并入永不推算);demand-digest 新增「钱线仪表盘」节。
   判定线 `fleet-money-line-1019`。**合并前 heartbeat 读到的是 `no-money-key`,不红。**
2. 本文 + 舰队 CLAUDE.md 节 + 五站 CLAUDE.md 一行。
3. 技能副作用记录:`conversion-ops` 自带的 `cro_audit.py` 在本仓装的版本**跑不起来**(`re.findall` 分组返回 tuple 却
   直接 `.lower()`,四个 URL 全部同一处崩);八维判据本轮人工逐项对照。技能仓的工具 ≠ 可用仪器,与 09-17
   PROVENANCE 的「先读后装」同一教训。

## 四、owner 决策卡(按每分钟 € 排序;全部一次性)

| # | 动作 | 时间 | 直接影响 | 现状证据 |
|---|---|---|---|---|
| 1 | partnernet.amazon.de 补完付款/税务信息 | 2 分钟 | **€11,20 到手**(舰队唯一已发生的营收) | 截图右下「Complete your onboarding checklist」 |
| 2 | bpj 广告位卡轨两个密钥 `ADS_PAYMENT_LINK` + `STRIPE_WEBHOOK_SECRET`(`docs/OWNER-SETUP-收款.md`) | 5 分钟 | 唯一有买家敲门的收款面通电:7 条投稿 / 3 个厂商 | `ads` 0 行不是没人要,是没法付 |
| 3 | Metaculus:`ANTHROPIC_API_KEY`(或 OpenRouter)+ `METACULUS_BOT_ENABLED=1`,先 dispatch `dry_run=true` | 3 分钟 | 每季 $50k 奖池,零访客需求;Fall 主赛题 **09-28** 开放 | 09-14 干跑已验证管道 |
| 4 | SR Packs:Stripe Payment Link + webhook + 5 个 Secrets/Vars(`docs/PACKS-OWNER-SETUP.md`) | 10 分钟 | 第二条 Stripe 轨;MCP 09-17 起有真实调用 | 现 `/packs` 503 |
| 5 | 决策:是否为 eco EN 区意/法/西三页开 amazon.it/.fr/.es 跟踪 ID | 决策 | 28d 7 次点击现在落 .de;开了再按页切链(EU 访客照旧走 .de) | D1 top 页表 |
| 6 | 决策:四站会员 0/4 —— 保留不推广,还是从导航撤下直到工具有人用 | 决策 | 不影响钱;影响页面噪音 | `fleet-tool-use-1014` 10-14 读数 |

## 五、判定线(全部已在 `data/fleet-bets.json`;本轮只新增 1 条仪器线)

- eco:`eco-us-market-0925`(现 1/5)· `eco-named-model-cards-0925` · `eco-rv-cluster-0925` · `eco-tenant-winter-0925` ·
  `eco-kuehlt-nicht-0925` · `eco-dp-share-0928` · `eco-split-cluster-0928` · `eco-feuchte-now-0928` · `eco-us-switch-1005` ·
  十月线(站内 CLAUDE.md:10 月 affiliate_click ≥64)
- bpj:`bpj-ad-inventory-1014` · `bpj-paid-tier-series-1014` · `bpj-pricing-probe-1014`
- SR:`sr-mcp-calls-1014`(t0 已从 0 变成 24 次/4 天)· `sr-packs-first-order-1112`
- 舰队:`fleet-tool-use-1014` · `metaculus-enable-plus28`(条件线)· **2026-12-05 总线**(非 Amazon 收入 >0 或 eco ≥€30/30d)
- **新增**:`fleet-money-line-1019`(五站经端点读到 money 且快照不 STALE)

## 六、事实表

| 事实 | 来源 | 日期 |
|---|---|---|
| eco 30d 佣金 €11,20 / 112 点击 / 付款侧未完成 | owner PartnerNet 截图 | 窗至 2026-09-14 |
| eco affiliate_click 64(human)/ 139(全 UA);pv 522;us-market 1 | D1 ecoback-events | 2026-09-21 |
| agi /advertise 223 pv、/audits 170 pv、subscribers 2、会员 0、讨论区 0 | D1 agiscorecard-events | 2026-09-21 |
| bpj 投稿 7(3 个提交者)、ads/ad_checkout/ad_web3 0、subs live 0、go 103、biz 4 | D1 baipiaoji-hits | 2026-09-21 |
| tds pv 341、affiliate_click 1 | D1 dollscout-events | 2026-09-21 |
| SR mcp_call 非 CI 24 次 / 4 天 | D1 sourceradar-events | 2026-09-21 |
| 四站 `/api/member` 全部 `ready:true`、9 USDT/30d;wb_orders 0 | 线上端点 + D1 | 2026-09-21 |
| 会员/广告/Packs 均「未产生真实付费」 | `docs/independent-memberships-release-2026-09-19.md`、bpj CLAUDE.md 第 17 条、SR PRD | 2026-09-19 / 09-16 / 09-13 |

## 七、继续执行(同日第二轮,owner:「继续执行」)

按 §四的槽位表只剩一件能在规则内做的事:bpj 判定系列(优化槽,已有 09-11/09-16 扩张令)。
读 `sites/baipiaoji/data/pricing-probe.json`,runner `state=ready` 9 家 → 沙箱复抓官方定价页 → 7 家经
`limits-edit.mjs` 写入付费档(fastgpt / bolt / deepl / replit / runway / windsurf / anythingllm),
判定页 21 → 28 组;tongyi-lingma(两官方源冲突)与 github-models(无模型价)不补。
不新增判定线;10-14 结算 `bpj-paid-tier-series-1014` 时列出这 7 页读数作参考,阈值不改。
钱线台账(§二)与 owner 决策卡(§五)不变——这一轮增加的是**可被搜索到的购买意图页**,不是收入。
