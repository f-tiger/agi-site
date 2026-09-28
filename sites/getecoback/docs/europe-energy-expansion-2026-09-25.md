# ECO 欧洲工具扩展：电费决策工作台

日期：2026-09-25。目标是从联盟内容入口增加用户可反复使用的任务工具。调研、竞争判断和实现范围沿用本会话第一轮结论；中断恢复后重新实现与测试。

## 真实需求与证据边界

这些公开讨论代表可观察到的具体问题，不代表人口比例、市场规模、付费意愿或对 ECO 的需求验证：

- 法国用户询问 HP/HC 是否应改为 Base：[AskFrance 讨论](https://www.reddit.com/r/AskFrance/comments/1pyinxv/contrat_elec_passer_de_heures_creusespleines_%C3%A0/)。任务不是看单一 kWh 报价，而是结合时段占比与订阅费。
- 西班牙用户寻找比较供应商的工具：[askspain 讨论](https://www.reddit.com/r/askspain/comments/1php4mz/herramientas_para_empersas_empresas_de/)。需要把能量费与合同功率费用放进同一张账。
- 意大利用户讨论固定与浮动报价：[ItaliaPersonalFinance](https://www.reddit.com/r/ItaliaPersonalFinance/comments/1nth6lw/tariffa_fissa_o_variabile_su_luce_e_gas/)。本轮提供用户给定价格的情景比较，不预测未来现货价。
- 德国用户问储能值不值得买：[Balkonkraftwerk](https://www.reddit.com/r/Balkonkraftwerk/comments/1swd7as/lohnt_sich_f%C3%BCr_mich_ein_speicher/)。ECO 已有储能工具，HTW 已有专业模拟工具，因此不重复扩大这一簇。

官方材料支持计算口径：

- [Verbraucherzentrale：奖金电价合同](https://www.verbraucherzentrale.de/wissen/energie/preise-tarife-anbieterwechsel/was-sie-bei-bonustarifen-fuer-strom-und-gas-beachten-sollten-6435)：首年奖金和续期价格需要区分。
- [Energie-Info：比较电气报价](https://www.energie-info.fr/fiche_pratique/comment-comparer-les-offres-delectricite-et-de-gaz-naturel/)及[峰谷使用说明](https://www.energie-info.fr/fiche_pratique/bien-utiliser-les-heures-creuses/)：用消费分布和固定费用共同比较。
- [CNMC：理解电费账单](https://www.cnmc.es/prensa/entiende-tu-factura-20231002)：消费、功率、税费等项目不可混为裸能源价格。
- [ARERA：Portale Offerte](https://www.arera.it/consumatori/il-portale-offerte)：已有公共报价比较服务，ECO 应主动链接可信替代方案。

## 竞对调研结论

CHECK24 已有成熟免费电价比较，法国 Energie-Info、西班牙 CNMC、意大利 Portale Offerte 已承担官方报价查找。没有依据称“欧洲缺电价比较器”。本轮不自建供应商实时数据库，也不承诺最低价。

可验证的差异化假设是：一个用户自行输入、解释全部费用、分开首年与续年、保留自己的对比方案的轻量工具，能够比读完商品推荐就离开的访问更有用。官方服务负责当前报价发现，ECO 帮用户解释手上两份报价。站内历史工具审计显示使用量薄弱，因此本轮是一个完整决策任务，包含现有页面入口和使用事件，而非继续堆积孤立计算器。

## 实现范围

四国账单模型、德英法西意五种语言。德国默认单一用电价格；法国提供 Base 与 HP/HC 的续年盈亏阈值；西班牙三档消费与两档合同功率；意大利三档消费与年度功率费用。所有费率由用户输入，示例不冒充实时报价。

- 年度经常费用 = 各档 kWh × 含全部适用税费的单价 + 年固定费用 + 功率费用。
- 西班牙功率 = Σ(kW × €/kW/日) × 365；意大利 = kW × €/kW/年。
- 首年扣一次性奖金；B 加一次性切换成本。两年节省 = 首年节省 + 续年节省。
- 法国 A 为单价、B 为 HP/HC 且 HP>HC 时，阈值 = [固定费差 + Q×(HP−A单价)] / [Q×(HP−HC)]。不把奖金纳入续年阈值。
- 移时消费是 B 内部的独立情景，不与换供应商节省直接相加。压力测试仅变化 B 的能量费，不改变固定或功率费用。
- 本地最多保存五个方案，JSON 导入导出，URL 片段分享，打印。CSV 严格使用模板列，最多 366 行，只累加、不自动年化。
- 用户必须确认全部适用税费已纳入且没有重复。真实合同条款、峰谷时段、奖金资格与退出条件仍需供应商确认。

明确限制：不处理真实小时负荷、浮动价格预测、光伏余电、社会电价、闰年或特殊合同。分享 URL 的片段包含数字，分享前明确提示。不会收集账单号码、姓名或地址。

## 验证和衡量

核心数值：DE 首年节省 €124、续年 €24、两年 €148；FR 两方案均 €840，阈值 30%，移时 300 kWh 节省 €24；ES €803.90 对 €719.90；IT €948 对 €945。这些全部是模型示例。

纯模型测试覆盖上述例子、奖金陷阱、一次性费用、严格输入验证、分享和 CSV。浏览器 CI 覆盖五语言、390px、显式费用确认、旧结果失效、保存、导入导出、共享还原、无存储模式及事件隐私。CI 未完成前不将浏览器验收写成通过。

复用既有事件 solution_calc（计算）和 share（分享），按五个工作台页面路径单独统计，避免与旧工具混读。事件只发送语言、市场、example/own 自报来源，绝不发送账单数字。保存和导出是纯本地功能，本轮不发送统计事件。相同输入重复计算在当前页面去重。`__probe=1` 不发任何事件；自动加载不计计算。事件不是去重用户、经核实的真实账单或收入。

本轮只建立按页面、市场、语言及示例/自有输入区分的计算与分享读数。功能上线不能证明采用或收入。先观察入口访问和实际完成情况，再决定是否扩展；暂不新增组合运营台账中的量化判定线。

## 维护契约

构建脚本在 tools hub 前生成页面，`link_energy_workbench.py` 在 household 入口后执行。页面由 `data-energy-workbench` 标记，自有本地化导航与事件实现。链接脚本在通用注入器之后重新渲染这五页，确保最终产物只有自己的 page_view。部署保留既有回滚保护，完整索引在部署时重建。模型实现、八项单测及浏览器 CI 是费用口径的依据。不要把样本运行、QA 或模拟输出写成真实采用和收入。
