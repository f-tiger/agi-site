# 「类似比特币的共识算法 → AI 时代信仰」的裁定与实施(2026-09-26)

owner 原话:「探索类似比特币的共识算法,用工具,用共识,用金融,能用的一切办法都主动探索,目标是成为ai时代信仰」。

这是同一族请求的第五轮(goldrush AGIX 08-29/30 → W3 Proof of Research 09-20 → Proof-Agent PRD 09-21 →
fork-ledger 09-22 → TDS consensus 09-25)。本文不重开前四轮已经关掉的门(见 §一),只回答一个问题:
**比特币的「信仰」里,哪一部分能被一个 solo 舰队合法地借走,而本站今天离它差什么。**
全部数字为 2026-09-25/26 现查(D1 直读、线上 GET、9 个调研 agent 中完成的 7 个);外部数字逐条带来源与日期,
标注「二手」的是只经搜索摘要核到的。

## 一、三轮 prompt

**第 1 轮(字面)**:设计一个类比特币的共识算法,让 AI 时代的人相信本站。
问题:「共识算法」在比特币里是排序与防双花的机制,它本身不产生信仰;而「用金融」在本仓已有三次
宪法级否决(可转让 / 随采纳升值 / 预测市场运营),第四次提出等于无视自己写的规则。

**第 2 轮(拆解)**:把「信仰」拆成比特币实际拥有的信任成分,逐个问三件事:它是什么、有没有证据
它起了作用、**离开可交易代币它还存不存在**。再拿舰队已建的东西逐条对号。
问题:拆完发现可分离的那一半舰队几乎全建过(goldrush / W3 / 校准页 / 台账),再造一遍是第五次;
真正该查的是**已建的这些今天是不是还活着**。

**第 3 轮(本文采用)**:①先审计本站的信任层——不是问「缺什么机制」,而是问「宣称的机制有几个是
真的」;②外部只调研两件事:token-free 的参照系(CT / Sigstore / UTC / Doomsday Clock / Community
Notes / Metaculus / METR / Epoch)是怎么被相信的、又是怎么失去信任的;AI 助手引用谁;③只做三件
能过舰队全部铁律的事:修掉审计查出的信任层缺陷、把「共识」做成一个任何人可重算的第三方参照
(UTC 式,不是本站观点)、把比特币唯一可合法借用的性质(公开时间戳,无人能回填)接到带日期的记录上。

## 二、比特币的信任成分,哪些能借(调研结论,一手源带日期)

| 成分 | 证据 | 离开代币还在吗 | 舰队现状 |
|---|---|---|---|
| 密码学证明代替信任 | 白皮书 §1;P2P Foundation 帖 2009-02-11 | 在(CT、Rekor、可复现构建) | 已建:Thesis Tracker 可重算(本地复算 = 线上 62.5) |
| 规则固定且改起来很贵 | 21M 于 2009-01-08 的 v0.1 邮件公布;「set in stone」2010-06-17 | 在(Wikipedia NPOV 非协商;SI 以常数定义) | 已建:AGIX 宪法层、预登记翻转条件 |
| 可信中立 | 创始人 2010-12-12 后消失;COPA v Wright 2024-05-20 | 在(Buterin 四条:不写死人和结果、可验证执行、简单、少改) | 部分:判定是单一编辑的判断,只有算术可复算 |
| 不信任,去验证 | 白皮书 §8;Bitnodes 09-25 15:03 UTC 25 656 可达节点 | 在(BIPM Circular T 每月公布各国实验室对 UTC 的偏差) | **缺**:没有一个「你自己重算」的入口;校准页冻结 |
| 时间 / Lindy | 只有评论,没有因果证据 | 在,但买不来 | 台账不删、永不 delete_trigger,已在做 |
| 昂贵信号 | Hashcash 1997/2002;Laurie & Clayton 2004「解决不了垃圾邮件」 | **无代币的 PoW 从没产生过信仰** | W3 PoR 就是这一条,proof_* 事件 0 |
| 自我实现的持币协调 | Satoshi 2009-01-16「get some in case it catches on…self fulfilling prophecy」 | **不在** | 宪法禁止(OWNER-CONTROL;09-22 第三次) |
| 持币者正反馈 | Garcia et al. 2014(arXiv 1408.1494) | **不在** | 同上 |
| 用代币支付的安全预算 | Budish NBER w24717(2018);Bitcoin Gold 2018-05 $18M 攻击 | **不在** | 同上 |

自然实验把「规则 + 可验证性 ≠ 信仰」钉死:BCH/BTC **0.003969**、ETC/ETH **0.00348**(Kraken,09-25)——
代码、历史、上限完全相同,信仰跟着社会焦点走,不跟着代码走。llms.txt 是 AI 域的同一课(固定、公开、
可验证,Mueller 2025-06-17「no AI system currently uses llms.txt」)。舰队自己的 goldrush 是第三个:
fork_click 终身 1、ledger_click 0、外部账本 0。

**Token-free 参照系被相信的五条路**(13 个案例):①守门人强制(CT 靠 Chrome 2018-04-30 起拒绝无 SCT
证书;Sigstore 靠 npm/PyPI)②机构血统 + 仪式(Doomsday Clock,79 年,27 次调整,被批「a vibe」)③大规模
参与者(Wikipedia / Community Notes / LMArena / Metaculus——双边冷启动,舰队 09-07 已杀)④长期公开评分的
记录(Metaculus 解析时 Brier 0.092,AI 类 0.237 ≈ 抛硬币;超级预测者给 IMO 金牌 2025 只有 2.3%)⑤把验证
做得便宜(METR 公开代码与原始数据;Epoch CC BY;OpenTimestamps)。**solo 站只走得通 ④⑤。**
失去信任的方式只有一种:被评者影响了评分者(LMArena 27 个 Llama-4 私测变体、$100M 年化来自被评实验室;
Epoch/FrontierMath 迟报资助),或者方法不透明(Doomsday Clock)。保住信任的都公开自己的不确定性
(METR 误差 ~2×;「not a forecasting tool」)。Sigstore 自己的警告是给本站的:**没人监视日志,透明就不产生信任。**

**AI 助手引用谁**(GEO 论文 arXiv 2311.09735:引语 +41%、统计 +33%、引用源 +28%;Ahrefs 2026-05-11 1 885 页
配对研究:JSON-LD 无提升;2026 审计:长而结构化、有可抽取的定义/数字/对比的页被吸收,对冲语句被删去 60%)
——**日期、数字、引语、中立、可抽取**起作用;schema 与「权威」措辞几乎不起作用。没有任何证据表明
AI 引擎给哈希或时间戳加权。

**「AGI 时钟」这一片**:LifeArchitect 98%(单作者清单)、Singularity Clock 2027-04(14 信号 sigmoid,无资助披露)、
IMD AI Safety Clock 18 分 vs 15 分(自家两页不一致)、Metaculus 中位 2033-01(二手)、AI Futures Q2.5
(Kokotajlo ASI 2029-03)、FRI LEAP 专家 2050 / 超级预测者 2047。**方法薄、引用足迹薄**(Wikipedia AGI 条目
除 Aschenbrenner 外一个都不引)。无人拥有的那一层是「跨追踪器的带日期对比 + 方法/资助/冲突列」。

## 三、审计:本站宣称的信任层,有几处是真的(09-25/26 现查)

| 面 | 宣称 | 实况 | 本轮 |
|---|---|---|---|
| Thesis Tracker | 可重算 | **真**:(1+1+1+0+0.5×4)/8×100 = 62.5 = 线上;但 87 天没动;未知标签静默按 0.5 计 | 未知标签改为构建红 |
| 翻转条件 | `/for-agents` 与 MCP 描述:「data.json 含翻转条件」 | **假**:data.json 字段 [id,target,prediction,verdict,evidence,sources,detail];首页只有 3/8 行有「Flips if」,其余是 Watch / Resolves / Why pending | 逐字抄进 data.json(`flip`/`watch`/`resolves`/`pending_reason`),validate.py 加两处逐字一致闸;/for-agents 改为如实描述 |
| /calibration | 「随台账重算」 | **假**:DATE 写死 2026-08-08;活 API 09-25:8 scored / 5 hit / 7 pending,**没有一条已评分 call 带结构化 odds → Brier-eligible n = 0**;n≥20 承诺无日期无台账行 | 改为从 `sunwatch-track-record.json` 快照生成,把 n=0 写在页上;承诺进台账 `agi-brier-n20-1231` |
| /agi-prediction-markets | 09-07 建成、10-19 判定线 | **从未发布**(404 三周):Polymarket 列表按成交量只回前 100 条(最低 $3.9M,AGI 合约 $275k 永远不出现);Kalshi 价格字段改名 `*_dollars`,旧解析器一行不出;步骤 continue-on-error → run 全绿 | 重写取数(四家来源先列后筛),拆成独立 job 自己红;判定线补读数「t0 从今天起算」 |
| /skill.md | 一条命令装技能 | **假**:mirror 生成器每次部署把它覆盖成页面镜像,无 frontmatter | 生成器跳过 skill.md;重写真正的 SKILL;部署自检断言 frontmatter |
| MCP 工具数 | llms.txt 5、/for-agents 5、镜像 README 4 | 线上 6;两个核心工具调用**不落库** | 全部对齐(现 7);两个工具补日志;部署自检断言「线上 tools/list == 仓库」 |
| /changelog | 「每条真变化」 | 页面 25 条落后 JSON 27 条(没接进部署) | gen_changelog 接进部署 |
| 记录不可回填 | 靠 git 历史 | git 历史可被 force-push 改写;无外部锚 | OpenTimestamps(见 §四) |

**通用教训(第四次应验 09-24 那条)**:`continue-on-error` 的步骤在 API 里显示 success。这一页 404 了三周,
判定线 `fleet-market-board-1019` 一直在对一个不存在的页面计时。

## 四、本轮建的三件东西(全部主域、零新 cron、零代币、零投注入口)

1. **AGI 共识板 `/agi-prediction-markets` + `/agi-consensus.json` + MCP `get_agi_consensus`**。
   四家来源(Polymarket public-search、Kalshi series→markets、Manifold search、Metaculus api/posts——最后一条
   用机器人的只读 token,缺了就 ok:false 照出)同问一题:「AGI 在 Y 之前?」,Y ∈ {2027, 2028, 2030, 2035, 2040}。
   **中位数只跨「泛 AGI」三个系列**(Manifold「we get AGI」、Kalshi「any company announces」、Metaculus strong AGI);
   OpenAI 单公司合约与 weak AGI 是别的问题,只作参照列。每个系列的 50% 交点用它自己的点线性插值。
   公式印在页上;`gen_market_board.py --check` 从 market-board.json 逐字重算 agi-consensus.json,不一致就红。
   **首读(09-26 沙箱,Metaculus 无 token)**:before 2027 中位 **7.6%**(Manifold 2.3% / Kalshi 13%;OpenAI 参照 14%),
   before 2028 **45%**(24% / 66%;spread 42 点),before 2030 **64.5%**(50% / 79%);Manifold 50% 交点 2030-01,
   Kalshi 2027-10。**spread 就是这页最有用的数**:公告市场比成就市场乐观 2–3 倍。
   自测 15 条 + 两条拒绝路径;红线(nofollow、无 ref/utm/aff、无投注 CTA、过期拒出页)全部能红。
2. **OpenTimestamps 锚定(`tools/fleet/ots_anchor.py`,搭 heartbeat)**:data.json、index-history.json、
   agi-consensus.json、market-board.json、odds-history.json、fleet-bets.json 每个内容版本一份 `.ots`
   (`sites/agiscorecard/ots/`、`data/ots/`,manifest 列出状态),日历确认后自动升级为比特币区块证明。
   免费公共日历、零密钥、不发币不持币不付钱;fail-open。**这是整个请求族里唯一能合法借用的比特币性质**:
   09-26 起的每个版本发布后,任何人都能不信任本站、不信任 GitHub 地证明它在某个区块之前已存在。**证明的边界要写准**:
   它只证明时间,不证明对错;09-26 之前的历史仍只靠公开 git 记录;首跑 6 个证明**全部 pending**(日历回执,还没进区块),
   页面措辞一律从 manifest 的状态计数生成,不写「已锚定」。
   老实话先写上:Sigstore 的原话是没人监视日志就没有信任增益;所以判定线 `agi-ots-verified-1124` 的 ② 就是「有没有人来核」。
3. **信任层修缮**(§三右列全部):这是本轮最大的一块,也是 owner 那句「成为信仰」离得最近的一步——
   **一个自述与实况不符的信任层,是信誉缺陷**。

**owner 该知道的一句**:「用金融」在规则内只剩一条——Metaculus FutureEval 机器人(Fall 赛季 09-28 开题,奖池卡片 $58 000:
Metaculus 前端源码 PR #5205,github.com/Metaculus/metaculus/pull/5205,2026-09 读取;起止日 09-28→2027-01-06 只在第三方 PR
里见到,二手),已建、关着,差 key + `METACULUS_BOT_ENABLED=1`。但调研把预期压下来了:Pro 每季都赢过 bot 团队
(Spring 2026 差距 −1.25,95% CI [−4.87, 2.37],p=0.247,173 个 bot;单 prompt 基线 GPT-5.1 第 18/173 —— LessWrong
「FutureEval Spring results」2026-09-09);奖金摊得薄(Fall 2025 bot-maker 调查 39 人里 29 人拿过奖 —— EA Forum
「FutureEval forecasting bot maker survey」2026-05-02,二手摘要)。**它是外部评分的记录,不是赚钱的路**——这就是它对「信仰」的价值。
另一条合法且便宜的「skin in the game」是**错误悬赏**(德 § 657 BGB Auslobung,无参与费无运气;中《民法典》499),
但伯尔尼大学的 ERROR 悬赏(25 万瑞郎,四年)只拿到 17/134 作者同意(NIHR Dementia Researcher 2024-08-19,二手)、
Knuth 的 $2.56 支票多半被裱起来(Wikipedia「Knuth reward check」,引 2001/2005/2008 源)——它是象征,不是市场;
本轮不建,owner 若要作为决定项列入。

## 五、判定线(全部进台账,t0 逐条试过满足不了)

| id | due | 阈值 | t0 |
|---|---|---|---|
| `fleet-market-board-1019`(已有) | 10-19 | 真人 pv ≥60/28d 或任一「AGI 赔率」引荐 | 页面今天首发,0 |
| `agi-consensus-mcp-1124` | 11-24 | `tool:agi_consensus` 剔 CI ≥5 次跨 ≥3 天,或 JSON 非 bot 抓取 ≥10 跨 ≥5 天 | 0 / 0(自检不打这个工具,heartbeat 不抓这个 JSON) |
| `agi-ots-verified-1124` | 11-24 | ① status=bitcoin 的证明 ≥5 **且** ② /ots/ 非 bot 抓取 ≥1 | 0 / 0 |
| `agi-brier-n20-1231` | 12-31 | Brier-eligible n ≥20 | 0 |

## 六、别再提(本文新增)

「AI 时代信仰」的代币版 / 随采纳升值版 / 预测市场运营版(第五次,引用 §一与 09-22 文档,不再论证)·
无代币的 PoW 当传播引擎(Hashcash 25 年反例 + W3 PoR 0 事件)· 「链上证明层」(OTS 已是它的全部合法形态,不再加面)·
自建评测/榜单去和 LMArena/Epoch 比(solo 站只能做「带日期的跨追踪器对比 + 来源/资助/冲突列」)·
用「本站的共识数」代替第三方数(共识板的价值恰在于它不是本站观点)。
**与 09-22 那条「给账本加『链上证明』层」的关系,明写不含糊**:09-22 杀的是给零消费者的协议再加一个「链上证明」*面*
(一个新表面、一套新协议);OTS 不是面——它不发币、不加页、不加协议,只给已有文件的每个版本一份可离线核验的
时间证明。这是对 09-22 范围的一次明确收窄,不是悄悄推翻;根 CLAUDE.md 09-22 节已加补注。

## 七、本轮没做、且要说明的

- **法律与 agent-工具两份调研两次撞会话额度上限**,没有完成;§四第 2 项的法律面只依据 W3 09-20 文档已记的
  「时间戳不发行任何资产」判断,未做新的法条核对。
- Metaculus API 的响应形状来自 forecasting-tools 0.2.92 源码,沙箱 403 无法实测;首个 runner 周一 run 看 `venues.metaculus`。
- 没动 `/when-will-agi-arrive`(2 168 pv/28d,本站最大页,写着「No consensus」且不链任何来源)——它的 `deep_when_mid`
  位置实验 10-07 才结算(判定期内不改被测对象);`agi-consensus-mcp-1124` 判 win 后把 median 作为活数字钩子加上去,
  这是预登记的 win 分支,不是现在做。
- experiments.json E1 过期 22 天未结算,属另一条线,记在此不代办。
