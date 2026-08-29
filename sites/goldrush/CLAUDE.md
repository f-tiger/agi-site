# goldrush.agiscorecard.com — The AI Gold Rush Ledger 操作手册(2026-08-29 建站)

**缘起(owner 原话要素,去币化后的合规实现)**:owner 2026-08-29 指令「全新 ai 子站点…
成为 ai 时代新势力,类似当年的 web3…特殊金融设计…分布式复制与扩展…影响无数人…
我有最高控制权与一键停止…保护我为第一优先级…像树探索一样自演化」。三轮 prompt
优化后 owner 选定形态:**开源可 fork 的证据账本站 + 双传播引擎(fork 套件 × 引用机器)**。
明确去掉并永不再提:发币/类比特币价值传播(证券欺诈高危)、「发明新神经网络」的伪造宣称。

## 定位
AI 淘金潮的证据账本:每一条「AI 赚钱」宣称 → 证据层级(verified/reported/self-reported)
+ 带日期判定 + 成文翻转条件。**卖地图,不卖金矿;败绩不删;判定永不出售。**
差异化 = 全网没有第二个用预登记翻转条件grade「AI 财富机器」的站。

## 机器结构
- 纯静态 `site/`(index.html + ledger.json CC BY 4.0 + llms.txt/robots.txt);
  worker.js = 资产透传 + `/e` 白名单事件(ledger_click/fork_click/audit_click/sub_click)
  + 服务端 page_view;D1 `goldrush-events`(**77a0a152-6345-450e-83eb-6f26f246c0b8**,表 ev)。
- 部署:deploy-goldrush.yml(push 路径过滤 + dispatch;**无 schedule**——进化循环
  搭舰队既有每日会话,不新增 Actions 成本);域名 goldrush.agiscorecard.com
  (wrangler custom_domain 自动挂载,同 source. 模式)。
- **一键停止**:owner 在 GitHub 网页新建 `sites/goldrush/KILLED` 文件 → 流水线拒绝
  部署,线上冻结在最后版本;删除该文件恢复。硬停 = CF 面板删自定义域。
- 传播引擎①fork 套件:FORK.md + MIT(内容 CC BY 4.0);②引用机器:判定型账本
  条目按主站六件套方法论逐步扩为深页(Evolution Protocol 的 Expand 步)。

## 进化循环(EVOLUTION.md v0.1 是唯一规则源,改规则必须升版本)
每个维护周期(搭舰队每日会话):Score(D1 28d ledger_click,搜索/AI 引荐 2x 加权)
→ Expand(top 节点 ≥3 clicks/28d 扩深页,每周期最多 1)→ Add(最多 1 条新宣称,
过三门)→ Prune(90 天零互动降级进 archive 区,**降级不删除**)→ 翻转条件到期
复查(x402: 2026-11)。

## 铁律(继承主站全网规则)
零编造;判定日期化;「dead」是对公开证据的陈述不是欺诈指控;不碰任何具名个人的
未核实指控(诽谤安全同 Justin Sun 页标准);**永不发币、永不代管价值、判定永不
出售**;owner 隐私红线全承袭;Amazon 链接如未来出现,永不进机器可读面。

## 判定线(预登记 2026-08-29)
- **生存线 2026-10-28(60 天)**:①任一 AI 引擎引用本域(Bing 明细)或 ②JS 口径
  page_view ≥50/28d 或 ③出现 ≥1 个外部 fork/嵌入(信标或 GitHub fork 含本目录改动)
  ——三条中 ≥1 成立则继续投入;全空 → 降为季度维护(只做翻转条件复查),失败结论
  **写进本站自己的 ourselves 条目**(吃自己的狗粮)。
- fork 套件判定 2026-11-30:0 fork → 把 FORK.md 的获客假设记反面发现,传播引擎
  只剩引用机器。
- 扩页判定:每张 Expand 出的深页沿用主站判定页判定线(28d 引用或点击)。

## 与主站的关系
上游 = agiscorecard.com(品牌、audits SKU、订阅、判定方法论)。本站条目引用主站
判定页而不复制其数字(**避免加入硬同步面**——copy13f 条目只写「split,depends who」
不带收益数字,这是刻意的,别"补全"它)。主站侧接线:llms.txt + /for-agents 提及
本域(下次主站 run 顺手,不单独 push)。
