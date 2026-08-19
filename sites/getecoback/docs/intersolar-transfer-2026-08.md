# Intersolar-2026 调研结论迁移记录（2026-08-17）

来源：`/home/user/intersolar/Intersolar-2026-机会点扫描.md`（2026-06-21 编制，B2B 能源软件视角）。
任务：把其中**消费者相关**的结论迁移到 getecoback.com（德语 Raumklima + 能源导购站）。
原文档自注「部分数字来自搜索引文，商用前建议回溯一手原文」——因此本次迁移对每条候选
都重新做了来源核实（沙箱 curl 对 gesetze-im-internet.de / bundesnetzagentur.de /
pv-magazine.de 均 000 不可达，改用 WebSearch 多源交叉验证 + 一手法条链接照常外挂，
链接本身不需要沙箱可达）。

## 一、采纳清单（3 条，落到 3 个既有页，0 新页）

### a. §41a EnWG 动态电价供给义务 + 智能电表覆盖瓶颈 → `site/guide/strompreis-radar.html`
- **迁移形态**：新章「Dein gutes Recht seit 2025: Jeder Anbieter muss einen dynamischen
  Tarif anbieten」+ FAQ「Muss mein Stromanbieter einen dynamischen Tarif anbieten?」
  （可见与 FAQPage schema 逐字一致）。
- **为什么值得**：radar 页是全站意图最贵的一页（实验 E8 tariff_click 探针所在），
  「每个供应商都必须提供」是читатель不知道的消费者知情权事实，直接强化换电价说服层；
  同时诚实给出瓶颈（智能电表覆盖极低）避免过度承诺。
- **回源情况**：
  - 义务本身（2025-01-01 起、10 万户门槛取消、前提是 iMSys）：多源一致
    （dejure/bpc/stadtwerk.digital/bofest 等），页面外链一手法条
    gesetze-im-internet.de/enwg_2005/__41a.html。
  - 覆盖率：**未照抄** intersolar 文档的「5.5% / 310 万」（无法回源到该口径）；
    改用 pv-magazine（2025-12-29，数据基础 BNetzA）的「全部计量点 3.8%（文中写
    knapp 4 Prozent）/ 强制安装场景约 20%，Stand Ende 2025」，页面外链该文。

### b. Solarspitzengesetz（2025-02-25）→ `balkonspeicher-rechner.html` + `balkonkraftwerk-lohnt-sich-rechner.html`
- **迁移形态**：
  - balkonspeicher-rechner：新章「Einspeisen wird gesetzlich immer unattraktiver —
    Speichern nicht」——负电价 15 分钟时段新装机零 EEG 补偿（§51 EEG）+ ≥2 kWp 无
    iMSys 馈电上限 60%，并明确 **<2 kWp 的 Balkonkraftwerk 两条规则都豁免**、但
    BKW 本来就几乎全部无偿馈电 → 引出本页的核心论证「价值在 Eigenverbrauch，
    Speicher 是把 kWh 从 0 价值搬到全价值的工具」。内链 strompreis-radar。
  - lohnt-sich-rechner：信息盒「Warum dieser Rechner Einspeisung mit 0 € ansetzt」
    （把计算器一直隐含的假设显式化 + 法律依据）+ FAQ「Bekomme ich für eingespeisten
    Strom vom Balkonkraftwerk Geld?」（可见与 schema 逐字一致；FAQ 只放这一页，
    避免两页 FAQ 互相蚕食）。
- **关键修正**：intersolar 文档把 60% 上限写成「未装智能电表的 2–100 kW 系统」，
  核实无误，但**对本站受众必须补充豁免边界**（BKW <2 kWp 不受影响）——照抄会吓错人。
  编辑线因此从「新规打击你」改为「新规印证方向：馈电越来越不值钱，自用为王」。
- **回源情况**：生效日 2025-02-25、负价零补偿、<2 kWp 豁免、60%/2–100 kWp 无 iMSys：
  多源一致（Öko-Zentrum NRW / Klimaschutz Niedersachsen / solarwirtschaft.de FAQ /
  energie-experten.org / sfv.de 等）。页面外链一手 §51 EEG 法条 +
  Bundesverband Solarwirtschaft 官方 FAQ。

### d. §14a EnWG / Modul 3 时变电网费 → `strompreis-radar.html`
- **迁移形态**：新章「Zweites Preissignal: zeitvariable Netzentgelte (§ 14a Modul 3)」
  + FAQ（逐字同步）。与既有「Kühlen ist mittags am billigsten」预冷内容互补：
  两个价格信号奖励同一批时段。
- **诚实边界（页面明写）**：§14a 只适用于 >4,2 kW 的可控设备（热泵/壁挂充电桩/
  家储）——移动空调 ~1 kW **不是**可控设备，不直接享受折扣；预冷策略不依赖
  任何特殊电价也成立。
- **回源情况**：2025-04-01 起 DSO 必须提供 Modul 3（需 iMSys + Modul 1）：多源一致
  （energiemarie/INTENSE/spotmyenergy 等）。落地迟缓的实测数字「169 家网营商中仅
  14 家真正开放 Modul 3（超过法定日一年后）」来自行业媒体 ZfK 的调查报道，页面
  以「laut einer Auswertung der Fachzeitung ZfK」署名外链原文——**未照抄** intersolar
  文档的「2026 全面铺开」（现实恰恰相反，铺开严重滞后，这才是对读者有用的事实）。

## 二、否决清单（不采纳，附理由）

| 候选 | 理由 |
|---|---|
| **c. 户储电池包 ~$70/kWh（BNEF）** | ①无法回源（BNEF 报告付费墙，ess-news 转述属搜索引文）；②口径错位：$70/kWh 是**厂商级电池包**价格，消费者零售 Balkonspeicher 实价 ~215–400 €/kWh，放进导购页会制造「为什么商家卖我 3 倍价」的误导；③本站已有自己的可回源零售价口径（"ab ca. 215 €/kWh"）。qualitative 的「价格还在降」不需要这个数字支撑。 |
| **德国 2025 负电价 573 小时（BNetzA/SMARD）** | radar 页已有自己的负价小时统计口径（2026 年 4 月 123 h / 年内 >400 h，外链 stromauskunft.de）且有 live 数据；再叠一个 2025 年口径的数字属于堆料不是增量，且 SMARD 新闻稿沙箱不可达无法核对。 |
| **PRD-A/B/C、机会 A–J 打分矩阵、VPP/EMS/EEBUS、C&I 储能、资本流向（§1.4–1.9、§2–5）** | 全部是 B2B 软件/从业者视角，与 getecoback 的德国租户/房主受众无交集。EEBUS/Steuerbox 生态成熟度对消费者页无行动含义。 |
| **荷兰/法国/意大利/英国净计量退坡（§1.1 非德国部分）** | 本站是德语德国站（EN 区也定位欧洲但联盟只有 amazon.de）；各国补贴细节无法持续维护，写了必过期。 |
| **AgNES 电网费改革（2026 中裁定/2029 生效）** | 尚未裁定的监管猜想，写进消费者页只能制造焦虑，无可执行建议；等裁定落地再评估。 |
| **新建交叉角度页（如「Balkonkraftwerk negative Strompreise」）** | 蚕食拦截：strompreis-radar（负电价+BKW 关联）与 balkonspeicher-rechner（馈电 vs 自用）已覆盖该交叉意图，本次深化即承载；head 词 dynamischer Stromtarif 由 Verivox/Check24/Finanztip/BNetzA 占屏 = 红海不做。 |

## 三、SERP/KGR 判定摘要

- `dynamischer Stromtarif`（head）：Verivox/Check24/Finanztip/BNetzA/大量供应商内容
  营销 = 红海 → 不新建页，只做既有 radar 页的说服层深化。✔
- `Solarspitzengesetz Balkonkraftwerk` 类交叉：SERP 由厂商博客（sonnen/EWE/inol/
  peak-energy）与协会 FAQ 构成，无消费媒体权威独占，但意图与既有两个 Rechner 页
  完全重叠 → 按蚕食规则深化既有页而非新建。✔
- `zeitvariable Netzentgelte`：能源行业媒体 + 咨询公司占位，搜索者主要是从业者
  → 不值得独立消费者页，作为 radar 页一章恰好。✔

## 四、给每日 Routine 的后续种子

1. **E8 判定口径可能受益**：radar 页新增的 §41a 章直接服务 tariff_click 探针
   （30 天 ≥10 → 通知 owner 做一次 Awin 注册）。观察新章上线后 tariff_click 走势。
2. **秋冬候选**：若 GSC 出现 `Smart Meter beantragen` / `Modul 3` / `§ 14a` 类展示，
   再评估是否值得把 radar 页的两章升级为独立页（当前判定：不值得）。
3. **AgNES 观察项**：BNetzA 预计 2026 年中裁定电网费改革（2029 生效）。裁定落地且
   有一手 BNetzA 文本时，radar 页「Netzentgelte」相关段落需要复核。
4. **年度复核**：Solarspitzengesetz 的 60%→（讨论中的）50% 收紧、<2 kWp 豁免边界，
   每年 Q1 对照 solarwirtschaft.de FAQ 复核一次，三处引用（radar 不涉及、
   balkonspeicher、lohnt-sich-rechner）同步改。
