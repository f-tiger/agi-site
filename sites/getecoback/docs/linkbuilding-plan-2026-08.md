# 链接建设执行方案（linkbuilding 技能，2026-08-17）

来源：agiscorecard 仓 `.claude/skills/linkbuilding`（阶段分类法 + 9 个 tactic
playbook），按本站现实过滤：零预算、零批量人工外联、零灰帽；德国法域下
冷邮件违法（§7 UWG，见 b2b-outreach-kit），一切「外联型」战术默认降级。

## 阶段判定：Foundation 期（DR 0-15）

- 站龄 ~1.5 个月（2026-07 上线），156 页德语导购 + 24 页英语；
- 无品牌信号（无 knowledge panel、无媒体提及），已知外链 ≈0；
- 内容量达标但阶段看站龄 + 品牌信号 + 外链画像 → **Foundation**。
- 推论：Growth 期战术（guest posting / skyscraper 外联 / competitor gap）
  现在做是空转；技能明说 DR 0-10 时说服别人换链接的可信度不存在。

## 战术选择（三档标注）

| 技能战术 | 判定 | 本站落地形态 |
|---|---|---|
| New site launch（linkable asset 半） | **全自动，已建成** | 技能的 #1 案例正是免费计算器（Backlinko 工具 3000+ 外链）。本站 10 个计算器 + 3 个可嵌入 widget + 自助配置器 = linkable asset 层已齐；EB_EMBED 已把「嵌到你的网站」入口铺到 10 个计算器页。剩余工作是可发现性微调（本轮已做，见下） |
| Strategic partnerships（integration 形态） | **全自动引擎已在转** | 免费 widget 的唯一条件 = 可见 Quellenlink → 每个外部嵌入就是一条 iframe 内回链；/fuer-betriebe 免费档同理。这是本站唯一不需要人的外链机器，判定线在 revenue-experiments 实验 3（90 天 ≥3 个外部域名嵌入） |
| Entity stacking | **owner 分钟级（且要过滤）** | 本站是匿名运营的线上 Ratgeber：GBP/本地 NAP 类平台不适用（无对外营业地址，硬凑反而伤 NAP 一致性）。真实可做：为 EcoBack 建一个平台档案时用与 Impressum 一致的运营者信息；X/LinkedIn 页各 ~15 分钟，做不做由 owner 定，不催 |
| Citations/directories | **owner 分钟级** | 德语博客/工具目录逐个人工注册。选择标准照技能：有编辑审核、真实流量，拒绝 500 站群发。候选自查算子：`Ratgeber Verzeichnis eintragen`、`Blogverzeichnis [Energie/Wohnen]`——先核实再投，本文档不预列未核实站名 |
| Resource pages | **不适用（外联）→ 物料已备** | 德语算子留档：`Energie sparen intitle:linktipps`、`Schimmel vermeiden "nützliche Links"`、`site:.de inurl:links Raumklima`。widget 就是现成 pitch（「给你的读者一个能用的计算器」），owner 想做外联时直接用 |
| Guest posting | 不适用 | 人工写作+外联；且德国冷邮件违法，合规路径（电话→同意→邮件）成本远超分钟级 |
| Competitor backlink gap | 不适用 | 需 Ahrefs/Moz 订阅；无预算，沙箱也出不了网 |
| Skyscraper | 不适用 | 外联半违反过滤规则；内容半与 KGR 管线重复，不另立 |
| Podcast guesting | 不适用 | owner 真人出镜 |

## 本轮已落地（零 owner 依赖）

**widgets.html 新增「Kein iframe möglich? Text-Link zum Kopieren」块**
（HTML + Markdown 两种，复制即用，埋点 `embed_copy{c5|c6}`）。
理由：newsletter、论坛与部分建站工具免费档（WordPress.com Free 等）会剥掉
iframe——此前这些场景的访客想推荐也没有现成物料，流失的是**正文文本链接**
（比 iframe 内链接权重传递更标准）。预期来源：博客/论坛的编辑型文本链，
量级 = 随 widgets.html 流量个位数/季度；c5/c6 的 embed_copy 计数就是需求探针，
60 天为 0 则此块不再扩展。

## 尚可全自动的待办（后续 run 逐个做）

- [ ] 英语侧对应块：/en 区无 widgets 页，若英语流量继续起量再评估（勿预建）
- [ ] 首页 Organization JSON-LD 补 `sameAs`（owner 建了任何平台档案后同 run 补）

## Owner 分钟级动作（不催；与既有清单合并读）

1. GSC「请求编入索引」仍是最高杠杆的收录开关（既有清单项，此处不重复展开）。
2. Bing Webmaster Tools 一次性验证 + sitemap 提交（~10 分钟）：ChatGPT 检索走
   Bing 索引，姊妹站 agi/bpj 已验证此路径的引用回报。
3. 想投目录时按上表算子先核实编辑标准，一次投 1-2 个，勿批量。

## 度量与速度红线

- 度量走 D1 `ev` 表：`embed_copy`（c1-c6 分桶）、`widget_view` 的 Referrer 主机
  数（实验 3 判定口径）、referrer 出现新域名 = 外链真的产生了。
- Foundation 期安全速度：月 15-25 条 foundation 链接为上限，本站远低于线。
- 红线：不买链接、不进 PBN、不做互链农场、不伪装用户发链接（站规既有）。
