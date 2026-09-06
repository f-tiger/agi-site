# 个人镜像交易器(owner 自用;纸面缺省)

owner 2026-09-05:「自动化交易是个人用,类似孙宇晨的实验,目标是自己用来赚钱」
+「不是给别人用,所以为什么不能做,就是要做」+「调研清楚,如何完善这个可以自动交易的
股票平台,这样后续这个平台可以自动化交易,获取交易利润」。
调研与裁定全文:`docs/auto-trading-platform-2026-09.md`。

这不是产品、不是信号、不给任何人用。它做一件事:**每个交易日收盘前,把你自己的一个
Alpaca 账户调整成 `/ai-trading-ledger` 十一臂之一的目标仓位**。策略公开(台账 JSON 里的
`target`),钱和密钥是你的;执行器里没有任何策略逻辑。

## 平台三层

| 层 | 文件 | 谁跑 | 状态 |
|---|---|---|---|
| 策略与台账(公开) | `sites/agiscorecard/tools/paper_ledger.py` → `paper-ledger.json` | `agi-paper-ledger.yml`,每交易日 22:40 UTC | 十一臂,合成夹具全测过;首个真实台账 09-08 |
| 执行(私有账户) | `tools/trader/alpaca_mirror.py` | `agi-trader.yml`,四条错峰 cron | **本会话未运行过**(沙箱分类器拒跑下单代码),首跑你做 |
| 私密汇报 | 同上,`TRADER_TG_TOKEN`/`TRADER_TG_CHAT` | 每次下单后 | 可选;金额只走这里 |

## 先把期望值说清楚(2026-09-05 调研,信源见平台文档)

- **收益超额 ≈ 0,回撤减半才是可得的**:Faber GTAA 发表后样本外 CAGR 6.05%、Sharpe 0.68、
  最大回撤 11.7%(收益边际归零、回撤优势仍在);Antonacci GEM 2014→2026 实盘 8.4%/年 vs
  SPY 13.6%,回撤 −20% vs −24%,**连静态 60/40 都没跑赢**;McLean-Pontiff:策略发表后收益
  平均衰减 58%。波动率管理(Cederburg 2020,103 个策略)实时不系统性跑赢。
- 所以台账里**60/40 是每个择时臂必须跨过的杆**;跨不过就说明「自动化」对你只值一个定投。
- 税是真正的摩擦:德国居民 26.375%(股票 ETF 30% 部分免税、2026 Basiszins 3.20% 预缴);
  中国居民境外所得 20%(2025 起追缴到中产)。月度再平衡每年实现收益,比买入持有的递延
  多交一截——**税后要跑赢买入持有,税前得先有 1–2%/年的边**。
- LLM 选股与日内交易不在候选里:Alpha Arena 六模型四亏;GitHub cron 抖动 15–60 分钟,
  IEX 免费行情 15 分钟延迟。

## 你的三步(≈15 分钟,我无法代注册)

1. **Alpaca 账户**:https://alpaca.markets → 先开 **Paper-Only**(免费、不入金、全功能 API)。
   非美国居民可开(加拿大除外;香港明确支持;德国有评测列为可用 [thin];**中国内地未见公开
   清单,注册页或 support@alpaca.markets 确认**)。生成 **paper** 的 Key ID / Secret。
2. 仓库 `Settings → Secrets and variables → Actions`:
   - Secrets:`ALPACA_KEY_ID`、`ALPACA_SECRET_KEY`;可选 `TRADER_TG_TOKEN`、`TRADER_TG_CHAT`
     (你自己的 bot 与 chat id,金额只发到这里)
   - Variables:`TRADER_ENABLED=1`;`TRADER_ARM`(缺省 **`gtaa5`**,调研排名第一的可得项;
     可选 `sixty_forty` / `sma200_spy` / `spy_voltarget` / `gem_dual_momentum` / `basket_mom5` /
     `agi_basket` / `tracker_mix` / `spy_hold` / `qqq_hold` / `llm_agent`);`TRADER_MAX_NOTIONAL`
     (缺省 1000 美元,是你愿意亏的数,不是账户里的数);**`TRADER_LIVE` 先别设**。
3. `Actions → personal mirror trader → Run workflow`:先 `dry_run=true, force=true` 看日志
   (只有计数),再 `dry_run=false, force=true` 在纸面账户真下一次单。之后四条 cron 自动跑。

**转实盘**(只有你能做,建议纸面满 20 个交易日之后):Alpaca 开 live 账户 + 入金(Rapyd,
最低 $1)→ 换 live 的 Key/Secret → `TRADER_LIVE=1`。W-8BEN 开户时自动生成,美股股息按
协定税率预扣,资本利得不预扣、自行申报。

## 执行模型(为什么这样下单)

- 整股走 **market-on-close(`cls`)**:成交在官方收盘价,与纸面台账用的同一根线;Alpaca
  在 15:50–19:00 ET 拒收 cls,所以距收盘 ≤10 分钟就跳过并变红。
- 零股余额走 **day 市价单**(Alpaca 只允许这种形式的零股)。
- **四条错峰 cron**(18:45/19:15/19:45/20:15 UTC)覆盖夏令与冬令的 14:45/15:15 ET;GitHub
  高峰可迟到 15–60 分钟;**幂等 = 从 Alpaca 读「今天已有订单」**,第二条 cron 自动空转。
- 基数 = min(账户权益, 上限) × 98%(2% 现金缓冲防整股取整透支);偏离 <1% 或 <$5 不动。
- 全部清仓走 `DELETE /v2/positions/{symbol}`(连零股一起)。
- PDT 规则已由 FINRA 废止,Alpaca 2026-06-04 起用日内保证金框架;本执行器不读任何
  已删除字段,且每日一次再平衡从不构成日内往返。

## 预登记护栏(改任何一条前先在台账里记日期)

| 护栏 | 规则 | 触发后 |
|---|---|---|
| 投入上限 | 部署名义 ≤ `TRADER_MAX_NOTIONAL` × 98% | 多余现金永不动 |
| 止损 | 所选臂的**纸面**最大回撤 ≤ −10%(公开指标,不看你的账户) | 全部清仓、run 变红(GitHub 失败邮件 = 告警) |
| 一键停止 | 仓库里存在 `tools/trader/KILLED` 文件 | 全部清仓、run 变红;删文件即恢复。文件状态跨运行持久,永不自动归零 |
| 陈旧台账 | 目标日期落后今天 >3 个交易日,或目标里的 ticker 在台账 `fetch_errors` 里 | 不交易、run 变红 |
| 时间窗 | 只在开市且距收盘 ≤75 分钟;≤10 分钟太晚 | 其余时段直接退出 / 太晚跳过并变红 |
| 循环检测 | 单次计划订单 >30 | 拒绝、变红 |
| 日志 | 只打印计数与状态 | 金额、仓位、账户号永不出现;Telegram 可选 |

## 六个月判定(2027-03-08,与台账读数日同一天)

- 成功 = 镜像账户**税后**跑赢 60/40 与 QQQ 买入持有,且最大回撤更小 → 你决定是否加码
  (上限最多翻倍)。
- 失败 = 其余一切 → 关掉 `TRADER_ENABLED`,结论写进 `/do-ai-trading-agents-work`:
  「站主自己的实验也没跑赢定投」。这条结论对读者比任何胜利都值钱。
- 中途触发止损 = 提前判失败,不重启同一臂。

## 本地测试的限制(诚实记录)

会话沙箱的权限分类器**拒绝执行任何会下单的代码**(连 `py_compile`、YAML 校验都拦),
所以 `alpaca_mirror.py` 与 `agi-trader.yml` 只完成了静态编写。台账引擎(纸面)用合成价格
夹具跑通了十一臂与 `target`。第一次执行器运行由你用 `dry_run=true` 完成;报错把日志
贴回会话我来修。
