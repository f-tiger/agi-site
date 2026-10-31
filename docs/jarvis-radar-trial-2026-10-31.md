# Jarvis 手动试跑回执 — 2026-10-31

## 实际执行与边界

用户要求再次检查用户雷达并试跑一次 Jarvis。托管任务已启用，但 run_now 在调用前返回 404 NOT_FOUND，最后记录仍是 10-18；本次没有创建新自动运行记录。以下为当前会话手动执行同一配置的有界核验，以及 GitHub Actions 上真实运行的 Python 数据管道检查，两者都不冒称托管自动任务已恢复。

- 核验基线：PR217 已合并，4 条持久痛点。10-31 08:49 的每日 autopilot 成功，但早于 15:49 的接入合并，所以中央生成物尚未出现新痛点。
- 实际重新读取 BPJ 两条原始讨论正文，正文状态从缓存升级为已复核；绝对发布日期仍未知。公开账本只保留派生概括，原帖与细节留私有证据档案。
- 实际 CI： https://github.com/f-tiger/agi-site/actions/runs/41217452028/job/124584867392 ，源提交 f7e99f55b9c512582af6e23f1f58ed0af9ee203b。16 项雷达回归与既有检查通过；check_pain_consumers.py 对真实数据运行 digest、evolution 与站点 manifest 预览通过。
- 结果：4 行、2 个核验动作、0 个扩建动作。BPJ 编程额度优先，AGI 上下文为另一站动作；同站试用规则排后，通用代理商报告维持否决。没有把原帖正文复核冒充日期/买家/付款确认。
- 中央生成物本次仅补痛点摘要、痛点动作及独立 checked_at；其余读数与 as_of 保留。不重算历史、不改收入、没有部署站点。站点 manifest 仅在 CI 预览，等待原有每日生成流程落盘。
- 检查脚本不写仓库，只将 digest 写临时目录，并输出白名单中央文件候选。没有网络测量、IndexNow、会员操作或外联。没有运行完整 autopilot。

## 试跑发现的实际维护任务

现有 BPJ /coding-access 与 /work-plan 已有筛选、来源、复制清单和同单位容量规划；重造选型器重复现有能力。下一项工作应复核套餐事实的适用人群与新旧版本。链接 last_verified 不是 limits.checked / paid.checked，链接今日可打开不能代表额度事实今日复核。

首修候选 Cursor。官方 [定价](https://cursor.com/pricing)、[计费说明](https://cursor.com/docs/models-and-pricing)和[旧套餐专页](https://cursor.com/docs/account/pricing/legacy-cursor-plans)在本轮读取中区分新订阅与旧订阅；现有 Pro / Pro+ 等旧规则继续有效。不能把新订阅价表直接覆盖到所有人，也不能把共享周额度池与旧月度池混算。官方变动支持维护事实，不代表我们验证了新的付费需求。

后续也应检查 [Claude Ultra/Max 20x 迁移](https://support.claude.com/en/articles/17728952-what-is-the-ultra-plan)及 [Codex 当前价表](https://learn.chatgpt.com/docs/pricing) / [Pro 档位](https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers)。这轮未改正式价表，未把所有套餐价格/额度作为新事实写入工具。

可执行下一步：在有执行能力的环境中使用 BPJ 既有 limits-edit.mjs 的先读后写流程，更新 Cursor 的双语事实与来源日期，保留 legacy 规则、历史 prev、unknown 数值和按账户面板确认额度的边界；再过 quota-facts、完整构建、coding-access / work-plan 与浏览器门禁。发布沿用已授权的 outcome-readonly-release 路线，不借诊断运行去调用生产会员生命周期。

## 尚未通过的验收

托管 Jarvis 立即执行与下次运行时间仍未确认；网站功能/价格修订未发布；没有真实客户任务、转化、付款或收益结果。Reddit 定时采集仍停用，本轮网页核验不等于恢复自动采集。
