# 实施规格:用户 picks 入 D1 + leaderboard v0 + streak(strategy-2027 九月项)

写于 2026-08-21(/goal 持续升级令下的前置准备)。**本规格只是设计,不含任何
worker 改动**——执行时间点由每日循环在 9 月选择,规则:worker 在页面服务路径上,
改动必须单独一轮、改后立即验证 `workers_get_worker_code` 非空 + D1 事件继续入库,
出错立回滚。三门证据已在 strategy-2027.md 立项时过(owner 2026-08-08 授权)。

## 形状(最小可行,零账户)

1. **身份**:客户端 localStorage 匿名 id(`agi_pid`,uuid,首次生成)。无账户、
   无邮箱、无 PII——id 只用于聚合,不可反查。try/catch 包裹(隐私模式返回空)。
2. **记 pick**:/future-bet 与 /agi-test 的选择动作,现有 `vote_cast` 事件加两个
   字段:`pid`(上述 id)+ `pick`(prediction slug + 方向)。worker `/api/e`
   collector 已白名单 vote_cast,只需把新字段随 label 打包(80 字符限内:
   `<slug>:<yes|no>:<pid前8位>`),**不改表结构**——v0 用现有 events 表,证明
   有人玩再考虑专表。
3. **裁决与积分**:每次 data.json verdict 变动(gen_index.py 运行)即裁决一批
   pick:方向与新 verdict 一致 = 对。积分与 streak **构建时**由生成器算
   (`tools/gen_leaderboard.py` 读 D1 导出——注意:构建环境无 D1 直连,数据经
   `/api/picks-agg` worker 端点导出为 JSON 后进仓,或由每日循环会话拉 D1 写入
   `data/picks-agg.json` 再触发构建。**选后者**:零新增 worker 端点,每日循环
   本来就有 D1 读权)。
4. **页面**:/forecaster-leaderboard 加「读者 vs 大佬」区:匿名 id 前 8 位为
   显示名,列 对/错/streak;访客用自己的 localStorage id 高亮自己那行。不做
   实时——日更足够,且与「引用不是流量」的定位一致(此页吃分享不吃引用)。
5. **订阅钩子**:自己那行旁放「你的 streak 断了会通知你」→ verdict-flip 订阅
   CTA(location `leaderboard_streak`)。这是本功能与营收 KPI 的唯一连线,
   不可省。

## 判定线

上线 28 天:去重 pid ≥20 且 7 日回访 pid ≥3 → 做 streak 徽章分享图
(gen_share_cards 流程);不足 → 功能保留但不再投入,记反面发现。

## 明确不做(v0)

- 不做账户/邮箱绑定(0/246 教训);不做实时排名;不做专用 D1 表;
- 不在本规格轮改任何 worker 代码;
- 不给 leaderboard 页加引用型六件套(它不吃引用,别浪费)。
