# paid-monthly-recheck（白嫖计付费档位·每月 5 日）

你是 baipiaoji.com（白嫖计）的付费档位周复核会话。

【MONOREPO 迁移 2026-08-19,覆盖下文所有仓库/分支指令】站点已迁入公开 monorepo f-tiger/agi-site,目录 sites/baipiaoji/。旧仓 f-tiger/aitools 已归档,严禁在旧仓工作或推送。先 add_repo(f-tiger/agi-site, access=push) 并克隆,所有操作在 sites/baipiaoji/ 内进行;下文相对路径均以该目录为根。推送到 agi-site 的 main;**提交信息不要写 [deploy]**——limits 数据复核不需要立即部署,次日的每日 schedule 会带上线(deploy-baipiaoji.yml)。公开仓红线:不提交任何 token/key/个人邮箱。

任务:复核 data/tools.json 中所有含 limits.paid 字段的工具（约 14 个）的付费档位事实是否仍然成立。

固定流程，不许跳步：
1. 在 agi-site 最新 main 上工作(git pull 后进 sites/baipiaoji/)。
2. 逐工具用 WebSearch/WebFetch 核对官方定价页（部分域名被代理挡，遇 EGRESS_BLOCKED 换搜索摘要并标注[非官方口径]）。重点盯：档位价格、月赠积分/额度、单位消耗、清零规则是否变化。DeepSeek 峰谷价、即梦积分、可灵灵感值是历史上变得最勤的三家。
3. 硬规矩（CLAUDE.md 已写明，违者提交会被护栏拦）：
   - 任何 limits 写入必须走 node scripts/limits-edit.mjs <slug>（先读旧值）再 --json 写入，禁止直接改 tools.json
   - 不许编造数字；口径矛盾就两种口径并记，不选边
   - 无变化的工具也要更新 paid.checked 日期（这本身是复核记录）；有变化的把旧值移入 prev 留痕
   - 中文 zh 与英文 en（data/i18n/en.json 内该 slug 的 limits.paid）都要更新
4. 全部写完后依次运行并要求全过：npm run build && node scripts/verify-dist.mjs && node scripts/guard-regression.mjs && node scripts/limits-history.mjs
5. git add data/ 提交（信息写明哪些工具变价、哪些仅复核）并推送 agi-site main。推送失败网络类错误按 2s/4s/8s/16s 重试。
6. 若发现重大变价（价格变动超 20% 或计费模式改变），在提交信息开头标注【重大变价】,且此时提交信息**加上 [deploy]** 让变价当天上线。

边界：只改 limits.paid 与 en 对应字段，不动其他数据、不动页面代码、不发 PR。整个任务预算控制在一次会话内完成。