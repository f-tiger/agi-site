# TDS 收藏分发入口准备 · 2026-10-11

## 已完成的工程工作

三条已审核收藏入口此前被明确标记 `tracking_not_registered`，而通用草稿生成器会使用未登记的 source、medium 和 campaign。本轮仅对 Museum、Snack、收藏备份三条候选启用 `tds_collection_v1`：站内 URL 保持 canonical；外部候选使用 Pinterest/Reddit 的 `social`、YouTube 的 `organic_video`，统一已有 `free-tools` campaign。每条入口对应三条外部候选，共九条，不添加 `utm_content` 或改共享统计解析器。

`data/marketing/tds-collector-drafts.json` 为本日可复现快照，不是实时发布队列。`draft_ready` 只表示文案和归因链接已准备。外部变体始终是 `prepared_not_authorized`，保留账号/网站认领、社区规则、视频看听/入口和具体发布授权的阻塞；没有发帖、排期或费用。过期入口的阻塞传递到全部变体。其他历史活动沿用原行为和审核日期。

Pinterest 官方建议素材内容与落地页一致、避免重复 Pin，并使用网站认领后的分析；YouTube 官方明确普通 Shorts 描述和评论中的 URL 不可点击。因此当前 YouTube URL 只是待放入已验证频道入口的候选，不能写成已可点击。

- https://help.pinterest.com/en/business/article/pin-performance-and-distribution （2026-10-11读取）
- https://support.google.com/youtube/answer/13748639 （2026-10-11读取）

## 验收与边界

- Python 营销队列9项测试通过；对每个外部变体实际运行生产 `campaignFields`，确认三项标签全部被保留。未知 policy、错误站点/路径、端口、预带查询/fragment 均拒绝；原活动回归、过期阻塞和未发送状态通过。
- 现有 GA4 integrity 7项测试通过。已有 autopilot PR检查加入营销测试与对应路径；无新增 cron。
- 三个生产入口 HTTP200、canonical一致、正确GA4标记。两个系列页有现有PNG分享模块。此次没有新增页面、前端或MCP契约，不需要Registry登记或额外IndexNow通知。站内产品说明路径可能触发既有部署，届时仍按工作流和线上构建SHA验收。
- 产品说明移除旧版“保存次数/会话低于10%”判断，与已确定的独立绝对门槛一致；不改门槛，不声称有用户增长。
- 当前main已包含日更持久化修复和8个系列。仍打开的旧PR147采用不同持久化方案，不能当成当前主干修复缺失而重复合并。旧master维护记录没有本日相同动作回执。原生任务按实际运行核验，本轮不补跑、不抓官方系列、不改配额。

两轮自检：第一轮排除“链接准备=发布授权”和“查询行缺失=没有展示”；第二轮检验生产解析器、过期传播、政策作用范围和旧活动回归。自检不是独立外部评审。账号统计、收益和素材访问情况仅保存在私有记录。

## 复现本日快照（无网络请求）

```python
import json, pathlib, sys
sys.path.insert(0, 'tools/fleet')
from marketing_queue import compile_plan
catalog = json.loads(pathlib.Path('data/marketing/campaigns.json').read_text())
report = compile_plan(catalog, {}, '2026-10-11')
report['campaigns'] = [row for row in report['campaigns'] if 'external_drafts' in row]
pathlib.Path('data/marketing/tds-collector-drafts.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
```

下一步优先补齐具体渠道的账号、可点击入口和素材验收；获得对应授权后再外发并保存平台回执。从实际发布开始观察分发，不从草稿创建日计算效果。
