# Fleet evolution report — 2026-11-12

Deterministic, aggregate-only report. Missing data remains unknown; no editorial text, payments or membership rights are changed by this job.

## Fleet counters

- Sites: 14 (healthy probes: 31)
- Membership ready: 0 · paid members: 0 · active members: 0
- Opportunity candidates: 8 · stale inputs: 0

## Priority actions

| Priority | Site | Action | Mode | Evidence |
|---:|---|---|---|---|
| 92 | agiscorecard | membership_health | alert | public_ok=True; ready=False |
| 92 | baipiaoji | membership_health | alert | public_ok=True; ready=False |
| 92 | getecoback | membership_health | alert | public_ok=True; ready=False |
| 92 | thedollscout | membership_health | alert | public_ok=True; ready=False |
| 55 | agiscorecard | content_gap | queue | count=1; query=ai stocks crashing; value=1 |
| 55 | getecoback | content_gap | queue | count=18; query=diesel infrarotheizung; value=74650 |
| 55 | thedollscout | content_gap | queue | count=13; query=labubu cat mode; value=73950 |
| 52 | agiscorecard | improve_hot_page | queue | page=/search; n7=436; p7=207 |
| 52 | getecoback | improve_hot_page | queue | page=/; n7=8; p7=6 |
| 48 | goldrush | ai_discovery | queue | human_pv_28d=649; ai_ref_28d=0 |
| 48 | thedollscout | ai_discovery | queue | human_pv_28d=808; ai_ref_28d=0 |

## Input freshness

| Input | Date | Age (days) |
|---|---|---:|
| membership | 2026-11-12T10:13:55.511Z | 0 |
| health | 2026-11-11T15:44:02Z | 1 |
| ai_referrals | 2026-11-11T15:44:29Z | 1 |
| opportunities | 2026-11-11 | 1 |
| autopilot_receipt | 2026-11-12 | 0 |

## Autonomous boundary

- Refresh measured snapshots and derived queues.
- Keep sitemap lastmod tied to content hashes and ping only changed URLs.
- Queue copy, pricing, new products and membership experiments for judgement; do not fabricate evidence.


## 用户痛点雷达 → Jarvis 站点扩展

研究复核记录；不是实时 Reddit 抓取，也不是独立客户或付费验证。原始社区材料保留在私有工作记录。
每站最多一个待执行项；核验不足只派复核，已完成/进行中/阻塞/否决的任务不重复派发。

- **baipiaoji · 编程任务对应的额度、重置周期与续费选择** [hold]
  - ID: bpj-coding-quota-20261031；原帖与日期门通过来源数: 0；复盘: 2026-11-07
  - 下一步: 核对现有选型页的新旧订阅分组、额度单位与重置规则；先确认官方方案适用人群，再补具体事实缺口。
  - 门槛/反证: status is done；原帖回复有相反体验；现有 BPJ 选型器已覆盖多数决策。官方方案可能区分新旧订阅，不能把旧套餐一律判错或批量覆盖。
- **agiscorecard · AI 结论缺少业务背景与来源支撑** [hold]
  - ID: agi-claim-context-20261031；原帖与日期门通过来源数: 1；复盘: 2026-11-07
  - 下一步: 用合成任务复核现有 Jarvis 的证据与不确定性输出；先确认是否存在可复现缺口。
  - 门槛/反证: status is done；来源为代理商报告语境，与 AGI 使用者适配需要单独验证；一个帖子不是普遍需求。
- **baipiaoji · 试用、取消与续费条件核对** [hold]
  - ID: bpj-trial-terms-20261031；原帖与日期门通过来源数: 0；复盘: 2026-11-07
  - 下一步: 核验官方试用、退款和取消规则，与现有 BPJ 数据字段比对后决定是否补齐。
  - 门槛/反证: status is done；可能只需要链接官方帮助页，不需要新工具。
- **agiscorecard · 通用 AI 客户报告生成暂不扩建** [hold]
  - ID: agency-reporting-generic-20261031；原帖与日期门通过来源数: 1；复盘: 2026-11-14
  - 下一步: 仅保存反证；不建立新的代理商报告站或改变现有导师定位。
  - 门槛/反证: status is rejected；Swydo、AgencyAnalytics 与 Whatagraph 已覆盖通用 AI 报告；存在满意用户反证。
