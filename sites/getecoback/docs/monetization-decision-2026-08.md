# 网站如何盈利 — 调研与决定（2026-08-14）

Anlass：owner 判断"联盟点击也不行"。先纠正前提，再给方案。

## 0. 先把前提说准

点击这一环**没有坏**：9 天约 50 次 affiliate_click，好的两天点击率 30–46 %（行业常态 2–5 %）。
坏的是它后面的两环：① 每次点击都落在 Amazon **搜索页**而非产品页（ASIN 被 PA-API 锁住）；
② 50 次点击的**期望成交本来就不足 1 单**——3 单需要 150–300 次点击。
所以"点击不行"实际是"点击的量级和落点不行"，这决定了下面每个方案的评法。

## 1. 候选盈利模型 × 本站真实数字

以近 28 天 ≈ 230 pv、~50 clicks 为基准，把每个模型换算成"每千次浏览的期望收入（RPM）"：

| 模型 | 单价 | 本站 RPM 估算 | 月收入 @ 当前流量 | 阻塞点 |
|---|---|---|---|---|
| 展示广告 (AdSense 等) | 1–3 € RPM | 1–3 € | **< 1 €** | owner 开户；且伤 CWV。08-05 已否决，本轮复核维持 |
| **Amazon 联盟（现役）** | ~18 €/单 | 点击率 17 % × 转化 2–4 % × 18 € ≈ **60–120 €** | 期望 1–2 €/月，样本期方差极大 | 已武装。落点(ASIN)与 PartnerNet 核实在 owner |
| **电价切换引荐** | Ostrom **17,50 €/合约**（Awin 实测在售）；Tibber 在 Awin（Merchant 57405）；客户内推普遍 ~50 € | 单页意图极强：radar 页读者=正在研究动态电价的人 | 当前为 0（未注册） | **一次 Awin 注册**（owner KYC） |
| PV/BKW 线索转售 | 25–200 €/条（既有调研） | 理论最高 | 0（未注册） | 线索市场注册（owner KYC）+ 流量 |
| 工具订阅 | 19–49 €/月 | — | 0 | 08-14 已评估：**搁置**（报价页 0 浏览，市场价为零） |
| 数字产品/打赏/软文 | — | — | 0 | 全部需要 owner 收款账户或人身外联 |

**结构性结论**：每一条收入路径 = 流量 × 每访客价值。各模型的差别在"每访客价值"上是 10–100 倍，
但**没有一个模型在 25 pv/天下能付房租**；且所有高价值模型的开关（网络注册、收款 KYC）都在 owner 手里。
我能自动做的只有两件：把**已武装的通道**（Amazon）的流量与落点做满；把**每访客价值最高的候选通道**
的需求先量出来，让 owner 的一次注册"值得"。

## 2. 本轮实施（实验 8：电价切换意向探针）

为什么选它：radar 页是全站**意图最贵**的一页——读者就是在研究"要不要换动态电价"，而正文提了
Tibber/aWATTar/Ostrom 三次却**一个链接都没有**。Ostrom 每份合约 17,50 €（≈ 一单 Amazon），
Tibber 也在 Awin 上——**一次 Awin 注册就能全部武装**。但按本仓方法论（实验 1/2/7 同款）：
先量需求，再劳驾 owner。

**落地**：radar 页"Profitiere ich davon?"章节后新增诚实探针盒——Tibber / Ostrom / Rabot Energy
三个**普通链接**（`rel="noopener nofollow"`，不是 sponsored，因为确实没有付费关系），显著标注
「**keine Partnerschaft** — wir verdienen an diesen Links nichts」；点击埋 `tariff_click{provider}`
（已进 worker 白名单）。漏斗上游已存在：50 个制冷页的 EB_HEATENERGY 盒本就导向 radar。

**预注册判定**：30 天内 `tariff_click` ≥ 10 → 通知 owner"一次 Awin 注册，Ostrom 17,50 €/约 + Tibber
即刻武装，链接替换只改三个 href"；3–9 次 → 再观察 30 天；< 3 → 撤盒，此路证伪。
诚实预期：radar 页当前流量极低，探针大概率先量出"流量不足"而非"意图不足"——那也是答案的一部分。

## 3. 维持不变的主线（自动可做）

1. **EN 扩张**（转化几乎全在 EN，27 页 vs DE 103 页）+ 秋冬 Heizen 簇 —— 唯一不需要任何人批准的增长路径。
2. **既定证伪日期不动**：2026-10-15，≥200 clicks 且 0 成交 → 转化假设死；不足 200 clicks → 流量假设死。
3. owner 三件套优先级不变：PartnerNet 付款/税务核实（2 分钟）→ ASIN 填表（10 分钟）→ 是否打 B2B 电话。
   现在加了第四件（**条件触发**）：`tariff_click` 达标时做一次 Awin 注册。

## 4. 来源

- Ostrom Awin 佣金 17,50 €/合约、Tibber Awin Merchant 57405：balkonkraftwerk-kompendium.de 2026 对比页
- Rabot/Tibber/Ostrom 价格结构（margin 1,2/2,15/1,9 ct/kWh）：smartstromvergleich.de、stromdiagnose.de
- 计算器订阅市场价（对照）：involve.me/Calconic/Outgrow 定价页，见 `docs/tool-subscription-assessment-2026-08.md`
- 本站数据：D1 `ecoback-events`（查询见 `docs/analytics-first-party-d1.md`）
