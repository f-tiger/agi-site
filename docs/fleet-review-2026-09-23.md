# 舰队数据梳理与改进(2026-09-23)

owner 指令:「整个舰队梳理数据与改进」。三轮 prompt 后的范围:用各站 `/api/pulse` 与 D1 现查出一张同口径的舰队表,与 heartbeat、AI 引荐快照、台账交叉对账;只修两类东西:**仪器之间对不上的地方**与**到期未结的判定线**。不建页、不加 cron、不动任何站的货架与文案。

## 0. 一句话

**舰队文件报的 44 549 次「真人 pv」里,约 41 400 次不是读者**:agi 的服务端计数是 JS 实测的 24 倍,六个新站的 1 977 次「真人」28 天里一个外部来源、一个事件都没有,其中每天 2 行是舰队自己的 AI 访问探针。另有**四个在线站不在任何舰队仪器里**。这三件都已修;五条押在被污染 pv 上的判定线改了判据、原文保留。

## 一、舰队表(28 天,2026-09-23 现查)

| 站 | pulse「真人 pv」 | 可信口径 | AI 引荐 | 钱相关信号 |
|---|---|---|---|---|
| agiscorecard | 39 454(服务端) | **JS page_view 1 641**;外部来源 750 | 21 | calc_use 22、vote_cast 96、订阅点击 2 |
| baipiaoji | 387(有来源的真人) | 同左 | 22 | subs 表新增 3(状态均非 confirmed)、厂商投稿 9、watches 0、付费广告 0、会员订单 0 |
| getecoback | 583(JS) | 同左 | 15 | affiliate_click 79;PartnerNet €11,20/30d(截图 14.09) |
| thedollscout | 321 | D1 pv 348,外部来源 15 | 0 | affiliate_click **1** |
| gridlings | 838 | 未核 | 0 | Playgama 门户 play_start 155(投放已结束) |
| goldrush / buysomething / gamesledger | 448 / 103 / 527 | 未核 | 0 / 0 / 1 | — |
| after35 / learn / fanzha / firstjob / codeword / powerbill | 456 / 280 / 273 / 245 / 383 / 340 | **外部来源 0,事件 0** | 0 | 0 |
| localebatch / verify / rfqdesk / web3 | 无 pulse(rfqdesk 有,rows 空) | — | — | 不在任何舰队仪器里 |

**剔除已标记噪音站后的合计:3 207**(bpj、eco、tds、gridlings、goldrush、SR、gamesledger),再加 agi 的 JS 1 641 ≈ **4 850**。这是「没被证伪」的数,不是「已证实」的数:gridlings / goldrush / SR / gamesledger 本轮没有逐一核来源。

**钱**:舰队唯一验证过的收入仍只有 eco 的 Amazon 联盟(€11,20 / 30 天,至 14.09,未到账,差 owner 的付款与税务信息)。bpj 与 SR 的四个收款面(广告、会员、watches、Packs)28 天全部 0 笔。

## 二、发现与修复

1. **四个在线站没有任何监控**。localebatch、verify(agent-delivery-lab)、rfqdesk(venture-lab)、web3 都是 push-only 部署、没有 schedule,也不在 heartbeat、AI 访问探针、AI 引荐三个仪器里。heartbeat 是整条链上唯一不经过 AI 会话的告警通道,这四站挂了没人会知道。**已加进 heartbeat(探活 + 超 7 天自动重发)与 AI 访问探针**;四站的部署 workflow 都有 dispatch 与防回滚守卫,最近一次成功部署在 09-19 到 09-21,不会被立刻重发。AI 引荐没加:三站没有 `/api/pulse`,rfqdesk 的 pulse 形状不同,加进去只会产生读取错误。
2. **舰队的 AI 访问探针在污染六个新站的读数**。探针每天用浏览器 UA 请求 `/` 与 `/llms.txt` 作对照,只给 goldrush 带 `ci=1`,其余只带 `__probe=1`;after35-events 上的六个 worker 不认 `__probe`,于是每站每天 2 行被记成真人。**探针现在对所有站都带 `ci=1`**;当天实测 18 站带不带 `ci=1` 返回码完全一致,拦截发生在边缘,不受查询串影响。自检加了一条「每个站都带 ci=1」。
3. **舰队总数被 agi 的服务端计数撑大**。`ai_referrals.py` 给 7 个站写 `pv_caveat`(原因与读数写在代码注释里),新增 `fleet_human_pv_excl_flagged`;demand-digest 两个数并列打印,被标记的站后面挂一句「pv 不是读者数」。**各站 pulse 的定义没改**:改六个 worker 会动已登记判定线的仪器。
4. **evolution 会据噪音派出假理由的动作**。它的规则「pv ≥100 且 AI 引荐 0 → 排队 ai_discovery,理由:已有引荐流量」对六个新站全部成立,而前提是假的。被标记的 pv 不再触发这条规则。

## 三、判定线

- **五条新站线的 pv 那一半今天已被噪音字面满足**(learn 280 ≥100、fanzha 273 ≥100、firstjob 245 ≥150、codeword 383 ≥200、powerbill 340 ≥200)。它们与「工具事件 ≥20」是「且」关系,不会误判赢,但 pv 那一半等于没打赌。按舰队 09-16 规矩到期前改判据:**pv 只计外部来源真人 page_view,阈值数字不变**,t0 全部为 0,原文保留在 `metric_original`。
- **gridlings-playgama-traffic-0922(过期 1 天)**:投放 09-22 结束,①终值 155(≥150)。②只有 owner 后台能读。本线自己写明 09-29 前结算、届时无新截图就按 ① + 09-16 截图(26,5 %)结算,所以只记读数,不提前结。
- **gridlings-playgama-five-0925**:五款仍全部 REJECTED,0/5,09-25 按原文结算。
- eco 的 12 条提前读数见 `sites/getecoback/docs/affiliate-clicks-analysis-2026-09-23.md`。

## 四、没做的

- 不改任何站的 pulse 定义,不给三个无 pulse 的站补端点(各站自己的轮次再做)。
- 不核 gridlings / goldrush / SR / gamesledger 的 pv 来源(本轮只核了异常最大的两处)。
- 不建页、不加 cron。heartbeat 每次多探 4 站,耗时增加约 10 秒,仍在 1 分钟计费粒度内。
