# 舰队深度体检 — 2026-09-04

owner 指令：「对整个舰队进行一次深度体检优化」。方法论沿用本舰队反复付过学费的那条：
**「全绿」是最危险的状态**——这里出过的从来不是红灯，是静默失败（eco 导出连吞 12 天 stderr、
tds 四个静默故障、goldrush `page_view` 不在事件白名单、agi 来源路径被丢弃、`affiliate_click`
从未入库）。所以每个数字都先问一句：**若它为零，是真没有，还是没被记录？**

---

## 一级发现：三个每日 Routine 的**计划路径**已失效（不是空转，是根本没启动）

| Routine | 最近一次计划运行 | 耗时 | 结果 |
|---|---|---|---|
| DollScout 增长循环 | 2026-09-03 07:15:11.568 | **11 ms** | FAILED |
| 白嫖计 v4 | 2026-09-03 22:03:58.802 | **13 ms** | FAILED |
| getecoback daily v5 | 2026-09-03 05:10:15.589 | **15 ms** | FAILED |

**与 2026-08-25 那次体检的故障形态不同**：那次是「跑起来了但 15–19 秒空转」，这次是
**毫秒级失败 = 会话根本没被创建**。因此 08-25 文档里的「重建 Routine」处方**不适用**，
重建大概率不解决问题，反而丢掉运行历史。

**三条排除性证据**：
1. **同环境、同「新会话」模式的周任务全部正常**——sellSomething 2m19s ✓、舰队分发 4m23s ✓、
   paid-weekly 12m50s ✓、Weekly AI News 4m9s ✓。所以不是环境或模式的问题。
2. **三者的 `last_fired_at` 都停在 09-01/09-02，`last_run` 都是 09-03 失败**——
   **三个在同一天一起开始失败**，是系统性变化，不是三处巧合损坏。
3. **手动触发路径正常**：本轮对三个各手动触发一次，全部成功返回 session_id
   （eco `cse_01YEDw1EVAkdNaojoTZZkfRF`、tds `cse_01Py8p6XFFE9NerFRZP2KSJi`、
   bpj `cse_01Ndd9WitSfZVyYo3sAydweJ`）。**故障只在 schedule 路径。**

**本轮处置**：用可用的路径把失败的活补上——三站当日循环已手动补跑，不是空等下一个 cron。
**未做且刻意不做**：删除重建三个 Routine（形态不匹配 + 丢历史 + 系统性原因重建无效）。
**owner 需要看一眼的**：Routines 界面里这三条的失败详情（本会话只能看到 status/时长，看不到错误原因）。

## 二级发现：tds 是唯一被这次故障**致命**影响的站

| 站 | 最近部署 | 距今 | 定时部署兜底 | 后果 |
|---|---|---|---|---|
| **thedollscout** | 08-31 13:48 | **~86 h** | **无（push-only）** | **内容循环彻底冻结** |
| getecoback | 09-03 08:05 | 19.6 h | 有（每日 03:17） | 自愈，只丢内容更新 |
| baipiaoji | 09-03 04:54 | 22.7 h | 有（每日） | 自愈，只丢内容更新 |

**结构性结论**：「Routine 负责内容 + 部署 push-only」的站，Routine 一死就是整站冻结；
有定时部署的站只丢当天的内容增量。agiscorecard 与 goldrush 同属 push-only，但它们的
Routine 是自绑定到常驻会话的（本会话），故障模式不同，暂未受影响。

## 三级：部署管线（近 100 次运行，2026-08-30 → 09-03）

**无系统性红灯**：16 个 workflow 中仅 2 次失败（eco 1/12、tds 1/13），其余全绿。
计划任务都在跑，**普遍延迟 4–5 小时**（公开仓常态，已在 tds 手册记载为 5–12 小时）——
读运行时间时必须按这个偏移解读，否则会把「延迟」误判成「没跑」。

## 四级：仪器层（各站 D1 是否真在收数）

- **tds**：bot 538（至 09-04）/ 真人 217（至 09-03）/ affiliate_click 1（08-30）——**仪器活着**，
  冻结的只是内容循环，站点在正常服务。
- **goldrush**：186 次 "human"（11 个路径，至 09-03），但 **`ua_class='js'` 一行都没有**——
  08-31 上线的 JS 信标至今零事件。两种解读（真没浏览器 / 信标坏了）指向同一方向，
  **09-30 绊线会裁决，不提前下结论**。
- **agiscorecard**：08-31 新装的同源来源路径捕获**已验证在工作**（首批 20 条 `from:/` 配对）。
- **sourceradar**：28 天仅 `page_view` 40 次全落在 `/`，交互事件全 0；新页 `/sourcing-margins`
  仍 0 访问（判定日 09-28）。

## 五级：全舰队预登记判定线日历（防止到期无人结算）

| 日期 | 站 | 日期 | 站 |
|---|---|---|---|
| 09-09 | agiscorecard | 10-01 | getecoback |
| 09-10 | getecoback | 10-12 | getecoback |
| 09-14 | buysomething | 10-21 | gridlings |
| 09-15 | buysomething | 10-27 | getecoback |
| 09-18 | baipiaoji | 10-28 | goldrush |
| 09-21 | gridlings | 10-29 | thedollscout |
| 09-24 | gridlings（itch 150/25） | 10-31 | getecoback / agi 书单 |
| 09-25 | getecoback | 11-15 | agiscorecard / baipiaoji |
| 09-28 | buysomething / getecoback / agi grade_game | 11-30 | getecoback / goldrush |
| 09-30 | agiscorecard（sub_ok<5）/ baipiaoji | | |

（从八份站点手册机读汇总；agiscorecard 另有若干判定线记在 OPT-LOG.md 而非手册，
上表未穷尽，以各站自己的记录为准。）

## 未验证项（如实交底，不当绿灯）

- **GitHub Actions 用量与账单**：会话读不到 billing 页，**本轮未验证**。公开仓分钟免费，
  月初应≈0；需 owner 在 github.com/settings/billing 自查一眼。
- **三个 Routine 失败的具体错误原因**：只能看到 status 与时长，**本轮未验证**。
- **goldrush 线上信标是否真的在页面上执行**：沙箱够不到线上站点，**本轮未验证**。

## 本轮刻意没做的事

不逐站改内容。八个站各改一遍正是本舰队反复警告的 churn，且各站有自己的防翻炒窗口与
每日轮。体检的产出是**诊断 + 只修机制**，内容层留给各站自己的循环。
