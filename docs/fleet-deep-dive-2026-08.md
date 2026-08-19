# 四站舰队深度对比 · 2026-08-19

调用技能:citation-growth(自研,一手数据打法)+ competitor-profiling(结构)。
数据:四站 D1 各 28 天窗口(全一手)、Bing AI Performance 2026-08 明细(agi)、
CF edge(tds)、竞对 WebSearch(2026-08-19)。遵循三门规则:每个建议标注
数据门/需求门/商业门证据;无证据的不进队列。

## 一、四站一张表(28 天,一手数据,口径:JS 真人线)

| | agiscorecard | baipiaoji | getecoback | thedollscout |
|---|---|---|---|---|
| 真人 pv | 482 | **2,198** | 415(531 含 116 次 CI 自检,已剔) | 今日起才可测(D1 08-19 上线) |
| AI 爬虫态势 | Bing 实测 564 引用/30d | bot 3,157 + **ChatGPT-User 59** | md_serve 187 + mcp_call(有 CI 污染) | scam-check/height-weight 被 GPTBot/ClaudeBot/PerplexityBot 每日抓 |
| 离钱事件 | sub_ok **2**(8-14 footer、8-19 post_scorecard) | go 出站 18(niche 无联盟计划) | **affiliate_click 74** | 0(埋点今日上线,此前从未被记录) |
| 真人→钱转化 | 0.4% | ~0.8%(无佣金) | **17.8%**(74/415) | — |
| 引荐结构 | DDG 30 > Google 14;AI 引荐 10(Pplx 5/Claude 3/Copilot 2);**EA Forum 7 + LessWrong 5** | **Google 77**;Pplx 9;registry.mcp 1 | DDG 69 > Bing 45 > Ecosia 26;**Google≈0**;AI 引荐 16(chatgpt 12/copilot 4) | 边缘数据基本是爬虫(读作下限) |
| 订阅/绑定面 | 站内表单(D1 存底)+TG 绑定 | sub_view 59(弹窗曝光,无提交事件) | popup 97 曝光→5 点击 | 无(email 表单已明确不做) |

**舰队级结论(三条,全部有数):**
1. **AI 引用面已建成,且开始回流真人**:四站合计 AI 引擎引荐 ~26 次/28d
   (agi 10 + eco 16,另 bpj ChatGPT-User 59 属于服务端口径)。Ahrefs 一手数据
   (AI 引荐转化率 = 传统搜索 23 倍)在自家应验:agi 今天的 sub_ok 就发生在
   AI/社区引荐增长的同一周。**下一阶段杠杆不是拉新流量,而是把每站「被 AI
   引用的那个决策时刻」接上「离钱最近的动作」。**
2. **eco 是转化率教科书(17.8%),bpj 是流量教科书(2,198),两边互为课本**:
   eco 的「场景页(房型×面积×设备)+页内推荐卡」模式是全舰队最能打的变现形状;
   bpj 的「Google 起量 + 机器可读资产被 AI 大量抓」是最能打的获客形状。
3. **搜索引擎结构分化是风险也是路标**:bpj 靠 Google(77),eco 靠 Bing 系
   (Google≈0),agi 靠 DDG+AI。没有一站双腿走路。谁把另一条腿补上,谁先突破。

## 二、逐站:需求证据 → 对手 → 差距 → 突破口(带判定线)

### agiscorecard —— 引用份额继续吃,订阅位换赢家

- **需求证据(数据门)**:37.5% 引用份额 vs 17 真人/日的结构不变;新增三个信号:
  ①EA Forum(7)+LessWrong(5)出现在引荐源=判定型内容进入高质量社区讨论;
  ②MCP 面 8-18 首次被外部调用 2 次(标签含 reputation-scanner-canary,判定为
  目录验证器/扫描器,**不算 agent 采用**,但证明 Glama 面已被看见);
  ③**今天的 sub_ok 来自 post_scorecard 位**——深页记分卡后的位置首次出单。
- **竞对(2026-08-19 搜索)**:niche 正在拥挤化——lifearchitect.ai(个人品牌
  countdown,被广泛引用)、theaidigest.org/timeline、futuresearch.ai、
  skynetcountdown.com、ai2027tracker.com、ai-2027-timeline.online 等**至少 6 个
  同类 tracker**。多数是薄页/无台账;我方独有:可审计判定+翻转条件+一手数据集。
- **差距**:他们有的我们没有的只有一样——lifearchitect 的个人实体权威(我方
  73% 引用挂在 Aschenbrenner 实体上,人物依赖风险已在案)。
- **突破口**:①把 post_scorecard 订阅位复制到全部高引用页(现在用的还是
  deep-page CTA 文案);②「tracker 对比」判定页进 CITATION AMPLIFICATION 队列
  **候补**——等 9 月初 Bing 明细核实是否有真实查询,有才做(硬规则)。
- **负面发现(如实记录)**:`index_click{*_live}` 两周判定到期,**0 次**——
  3 次 index_click 全部来自首页 hero/directory。引用页首屏活数字没换来点击,
  按既定规则:该通道判定为品牌资产,**停止再加 *_live 钩子**,已有的保留。
- **判定线**:post_scorecard 复制后 28 天,sub_ok ≥3/28d(当前 2)。

### baipiaoji —— 流量已通,缺一个「值得留邮箱/绑定的对象」

- **需求证据**:Google 引荐 77(SEO 真起来了)+ ChatGPT-User 59(AI 答案的真人
  点击,zero-click 定律在 bpj 失效!)。sub_view 59 次曝光却无一次提交事件——
  与 agi 的 0/246 教训同构:**用户不为「订阅本站」留邮箱,只为「一个属于自己
  的对象的状态变化」留联系方式。**
- **竞对**:free-for.dev(GitHub 型,无商业化)、toolify/futurepedia(泛目录,
  联盟变现,但对中国工具覆盖差)。我方独有:limits 逐条核实+变更历史
  (limits-history)+官方 MCP registry 收录。
- **突破口**:把 **limits-history(额度变更记录)从内部资产变成订阅产品**——
  「你在用的工具免费额度一变,我告诉你」。这是 bpj 版的「verdict flip 邮件」:
  同一形状在 agi 已出 2 单。落点:工具页「额度变更时提醒我」+ 变更 RSS。
- **判定线**:上线后 28 天,首个真实订阅/绑定 ≥1(当前 0)。

### getecoback —— 变现王的季节悬崖,提前 6 周铺秋冬

- **需求证据**:aff 74/28d、17.8% 转化;赢家页形状=「具体场景×面积×设备」
  (意大利便携空调 12、30qm 11、房车 8、Kippfenster 7)。**风险:全部是夏季
  品类,9 月德国降温后这条漏斗会自然枯竭。** 秋冬页已有零星信号
  (heizung-40qm 已有 1 次 aff)。
- **竞对**:testberichte/smart-home-fox 等权威测评站;情报点:Stiftung
  Warentest 自 2021 起不再测 monoblock(法方 Que Choisir 2026 补测)——
  「最权威机构缺位」本身是我方判定页的素材(带日期引一手源)。
- **突破口**:**把夏季赢家模式整体平移到秋冬品类**——Luftentfeuchter(已有
  40qm 页)、Schimmel 防治、Heizkosten 场景页,复用同一「场景×面积×设备+
  推荐卡」模板;季节轮换器(每日 cron 已随迁移恢复)只切首页,内容深度要人工补。
- **判定线**:10 月 aff_click ≥ 8 月的 50%(即 ≥37/28d);低于即说明秋冬线
  没接住,回评模板。

### thedollscout —— 引用面已在,今天起终于能测钱

- **需求证据**:AI 爬虫引用面高度集中在两个判定型页(scam-check、
  height-weight,GPTBot/ClaudeBot/PerplexityBot 每日抓)——与 agi 的 Bing
  实测结论跨站互证:**判定型吃引用**。站内已有竞对缺口分析(08-17):全行业
  把「get factory photos」当四个字说完就走,「工厂照到了怎么核对才批准」这个
  资金杠杆最大的决策时刻无人覆盖。
- **今天的基建补齐**:D1 上线(真人线+爬虫线+affiliate_click,此前营收事件
  在任何系统都没被记录过);CF zone 流量任务恢复;每日 D1 快照回写 git。
- **突破口**:执行在档的「工厂照核对」判定页/清单(吃引用的形状+联盟场景
  的入口),**但先让 D1 跑两周拿到基线**——在零基线上改版会重蹈「没有对照组」
  的错。growth loop(每 2 天)已改指 monorepo,它会按 GROWTH-LOOP 的 Phase
  规则接手。
- **判定线**:D1 上线 28 天内,首次真实 affiliate_click ≥1;scam-check 的
  爬虫抓取不下滑。

## 三、执行队列(按杠杆排序,每日 run 逐条领走)

1. **[agi]** post_scorecard 订阅位复制到 5 个高引用页(数据门:今日 sub_ok;
   商业门:订阅=Boosts 营收)——一次提交。
2. **[eco]** 秋冬场景页第一批 2-3 页(Entfeuchter/Schimmel/Heizkosten,
   复用夏季赢家模板;需求门:heizung-40qm 已有 aff 信号)。
3. **[bpj]**「额度变更提醒」订阅面薄 PRD(一页,过三门后自动实施)。
4. **[tds]** 等 D1 两周基线 → 工厂照核对页(已有需求与竞对证据)。
5. **[agi]** 9 月初 Bing 明细到手后:tracker 竞品对比页选题核实(有真实查询
   才做);CITATION AMPLIFICATION 队列补货。
6. **[舰队]** 每周一记分板起,四站统一读 D1(tds 从 content/d1-snapshot.json),
   *_live 钩子停止扩展(负面判定在案)。

---

# 追加:站龄基准判定(2026-08-19 深度调研第二轮,105 agent,22 条存活声明)

## 2026 年的「正常」曲线(全部经 3 票验证)
- 新页面 12 个月内进 Google 前十的比例仅 **1.74%**(2017 年 5.7%);#1 页面平均 5 岁;
  可测结果要 3–6 个月 → **四站(24–50 天)流量端全部属统计正常,营收判决为时过早。**
- 但结构损伤是实的:AIO 查询 #1 位 CTR 7.3%→1.6%(-58%);**无 AIO 的信息型 SERP
  也从 7.6% 腰斩到 3.9%**;发布商 Google 引荐一年 -33%(美国 -38%,欧洲 -17%)。
- HouseFresh/Retro Dodo:单一 Google 依赖可在一个算法周期毁掉 90% 流量与团队;
  HouseFresh 是唯一完全恢复案例(2025-10,靠一手实测+E-E-A-T+降广告密度),
  Retro Dodo 靠会员制+YouTube 活下来而非排名恢复。
- AI 引用的变现杠杆在**单访客转化质量**:Ahrefs 一手数据 0.5% 流量 → 12.1% 注册
  (23x 上界;跨行业常态 2–4x)。
- 订阅变现门槛:免费转付费中位 **0.62%**;~1,000 订阅 ≈ $100–1,000/月;赞助市场
  普遍设 1k+ 门槛 → agi 的 2 订阅距广告/Boosts 路径差 2–3 个数量级
  (与站内 Boosts 判死数学互证)。

## 四站判定(按站龄归一化)
| 站 | 判定 | 依据与指令 |
|---|---|---|
| baipiaoji(24 天) | **流量显著超前** | 79 真人/日在 1.74% 环境里属前几个百分位;但复制了 HouseFresh 风险画像(Google 单依赖)——趁涨立即变现 + 渠道分散(watch 漏斗已接通、API 询价探针已上线) |
| getecoback(49 天) | **正常偏超前,离首笔 $100/月最近(预期 1–3 个月,高置信)** | 唯一已产生商业行为的站(74 联盟点击/28d);德语市场 AIO 冲击暂缓(-17%);**第一任务 = owner 核实 PartnerNet 佣金是否真实入账** |
| agiscorecard(50 天) | **定位超前,变现路径最长(4–8 个月,中置信)** | 37.5% 引用份额稀缺且真实,但变现只能走高价小众(付费提醒/数据产品/赞助),放弃规模化广告幻想;被引页转化钩子路线与 23x 数据吻合,继续 |
| thedollscout(24 天) | **落后,应转型(唯一)** | 同龄 bpj 证明 24 天可有真人流量,≈0 是形态问题;转「高客单联盟决策页」:被 AI 引用的判定/防坑页首屏直接承接购买决策(对比表+联盟深链+防坑工具),用高客单(数百-数千美元)单访客价值弥补近零流量 |

## 诚实的缺口(不装作知道)
- 转型案例基准缺失(唯一候选案例被 3-0 否决)→ tds 转型的时间预期无验证基准;
- 「多少比例新站 12 个月到不了 $100/月」无一手统计(只有 1.74% 排名率作代理);
- lead-gen 纵向 CPL 清单、$5-30/月订阅微产品付费案例、>$50/单联盟纵向:两轮检索
  均无存活声明——这三个方向的排序继续悬置,不编。
