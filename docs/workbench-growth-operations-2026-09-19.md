# 工具增长运行闭环（2026-09-19）

本轮补齐多语言工具上线后的持续检查，复用已有每日 02:40 UTC 的 fleet-autopilot；不新增定时任务、账号或付费服务。它检查交付与分发入口，不会自动生成真实第三方外链、收录或成交。

## 已交付

- 从 catalog 与语言契约动态生成全部工具和目录清单，不写死未来数量。
- 检查每个 HTML 页的 HTTP、canonical、语言、完整 hreflang、x-default、noindex 与可解析结构化数据。
- 工具页另检查静态方法、引用/嵌入入口、Markdown 来源与独立嵌入文件。
- 从线上 manifest 检查实际母站入口及运行文件；尊重发布文件路径，不擅自把 `/it/index.html` 当作 `/it/`。
- 读取 BPJ 公开就绪状态，只保存布尔结果，不保存钱包、密钥、原始响应或客户数据。
- 营销队列仅引用当天数据，过期就绪信息不复用。已准备的带 UTM 草稿仍为草稿，未外发。
- 每日 JSON/Markdown 报告、30 天滚动健康记录与 30 天 Actions artifact。发现问题先保留诊断，再使运行失败。
- dry_run 不写报告。每个域串行、四域并发；请求带 healthbot 标识。没有浏览器脚本或用户事件信标，不将自测计作使用者。

## 验收

四组故障测试覆盖正常全路由、错误 canonical/重定向/noindex/坏 JSON-LD、单域网络故障隔离、过期队列与隐私字段排除。真实线上检查结果见 [最新运行报告](../data/autopilot/workbench/latest.md) 和 [逐页证据](../data/autopilot/workbench/latest.json)。首次计划触发尚待 GitHub 下一次 schedule；本次报告由同一脚本在会话中真实运行产生，不冒称 CI 首跑。

运行：

```sh
python3 tools/fleet/marketing_queue.py
node --test tools/fleet/workbench_growth.test.mjs
node tools/fleet/workbench_growth.mjs
```

营销取数若网络失败，会保守阻断付费推广草稿。`--doctor-file` 可读取同次真实请求的脱敏状态，不可手工伪造为 ready。部署后的完整浏览器功能验收仍沿用 revenue-studio 的原测试；日检不能代替它。

## 商业结果边界

已开售的是 BPJ 赞助投放，不是 24 工具会员。其余免费工具没有新增云同步、账号订阅或后台监控承诺。真实支付流水、净营收、独立第三方外链、搜索收录和 AI 引用没有本轮可验证数据，报告保留 null。

下一次评估应使用带日期的搜索站长平台、实际引荐与真实付款证据。一次 IndexNow 接收不代表收录；引用入口/自有站互链不等于第三方外链；示例计算或 QA 不算真实用户任务。
