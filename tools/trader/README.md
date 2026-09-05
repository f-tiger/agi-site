# 个人镜像交易器(owner 自用;纸面缺省)

owner 2026-09-05:「自动化交易是个人用,类似孙宇晨的实验,目标是自己用来赚钱」
+「不是给别人用,所以为什么不能做,就是要做」。

这不是产品、不是信号、不给任何人用。它做一件事:**每个交易日收盘前,把你自己的一个
Alpaca 账户调整成 `/ai-trading-ledger` 六臂之一的目标仓位**。策略是公开的(台账 JSON 里的
`target`),钱和密钥是你的。

## 先把期望值说清楚(实验的前提)

- 一个人、日频、美股、公开规则:**扣费后的期望超额 ≈ 0**。这是本站自己那页
  `/do-ai-trading-agents-work` 的结论,也是 Alpha Arena(六个前沿模型四个亏)和巴西 97% /
  台湾 ~1% / SEBI 91% 的基率。
- 六臂里历史上**唯一有文献支撑的**是 Faber 200 日均线规则(降低回撤,不显著提高收益)和
  买入持有 QQQ。LLM 臂是被测对象,不是被推荐对象。
- 所以这个实验的诚实目标是「**用小钱、硬止损、六个月,证明或证伪『自动化对我有效』**」,
  不是「靠它赚钱」。证伪了就改成定投,这本身就是赚钱的答案。

## 你的三步(≈15 分钟,我无法代注册)

1. **Alpaca 账户**:https://alpaca.markets → 先开 **Paper-Only**(免费、不入金、全功能 API;
   非美国居民可开,国家清单以注册页为准 [verify])。生成 **paper** 的 Key ID / Secret。
2. 仓库 `Settings → Secrets and variables → Actions`:
   - Secrets:`ALPACA_KEY_ID`、`ALPACA_SECRET_KEY`
   - Variables:`TRADER_ENABLED=1`;`TRADER_ARM`(缺省 `sma200_spy`;可选
     `spy_hold` / `qqq_hold` / `agi_basket` / `tracker_mix` / `llm_agent`);
     `TRADER_MAX_NOTIONAL`(缺省 1000,美元上限);**`TRADER_LIVE` 先别设**。
3. `Actions → personal mirror trader → Run workflow`,`dry_run=true, force=true` 看一遍日志
   (只会看到计数),再 `dry_run=false, force=true` 在纸面账户真下一次单。之后每个交易日
   15:40 ET 自动跑。

**转实盘**(只有你能做,且建议纸面满 20 个交易日之后):Alpaca 开 live 账户 + 入金 →
换成 live 的 Key/Secret → `TRADER_LIVE=1`。`TRADER_MAX_NOTIONAL` 是你愿意亏掉的数,
不是你账户里的数。

## 预登记护栏(改任何一条前先在台账里记日期)

| 护栏 | 规则 | 触发后 |
|---|---|---|
| 投入上限 | 部署名义 ≤ `TRADER_MAX_NOTIONAL` | 多余现金永不动 |
| 止损 | 镜像臂的**纸面**最大回撤 ≤ −10%(公开指标,不看你的账户) | 全部清仓、run 变红(GitHub 失败邮件 = 告警) |
| 一键停止 | 仓库里存在 `tools/trader/KILLED` 文件 | 全部清仓、run 变红;删除文件即恢复 |
| 陈旧台账 | 目标日期落后今天 >3 个交易日 | 不交易、run 变红 |
| 时间窗 | 只在开市且距收盘 ≤45 分钟 | 其余时段直接退出 |
| 最小交易 | 偏离 <1% 或 <$5 不动 | 避免碎单 |
| 日志 | 只打印计数与状态 | 公开仓日志公开,金额永不出现 |

## 六个月判定(2027-03-08,与台账读数日同一天)

- 成功 = 镜像账户扣费后**跑赢 QQQ 买入持有**且最大回撤更小 → 你决定是否加码(上限翻倍,不多)。
- 失败 = 其余一切 → 关掉 `TRADER_ENABLED`,结论写进 `/do-ai-trading-agents-work`:
  「本站 owner 自己的实验也没跑赢定投」。这条结论对读者比任何胜利都值钱。
- 中途触发止损 = 提前判失败,不重启同一臂。

## 本地测试的限制(诚实记录)

会话沙箱的权限分类器**拒绝执行任何会下单的代码**(连 `py_compile` 都被拦),所以
`alpaca_mirror.py` 在本会话只完成了静态编写,**没有跑过**。第一次运行必须由你在
Actions 里用 `dry_run=true` 完成;若报错,把日志贴回会话我来修。
