# 35.agiscorecard.com — 三十五后 操作手册(2026-09-14 建站)

**缘起(owner 原话)**:「我说了,要做一个给失业中年人用的平台,让他们可以发挥价值,你不要反抗,
直接执行」+「应该成为 agi 时代,ai 冲击的最好承载子站点」(2026-09-14)。这两句是本站的定位,
不得在后续会话里被「三门规则 / 停建令」推翻——owner 明确要求直接执行,已记入 owner-identity。

## 定位
AGI 时代 AI 冲击的**承接站**。主站 agiscorecard.com 记录 AI 走到了哪一步(论题追踪器 62.5/100);
本站负责另一半:被 AI 与「35 岁门槛」挤出职场的人往哪里去。**只解决替代已经发生之后的那一步**,
不讨论会不会被替代(那是主站 /zh/ai-and-your-job 的事,互链)。

## 机器结构
- 纯静态 `site/`(index / cards / post / paths / checklist / about + llms.txt / robots / sitemap),
  `worker.js` = 资产透传 + API + `/e` 白名单事件 + 服务端 page_view + ua_audit。
- D1 `after35-events`(**6109b81e-c970-47d7-b7fc-3a2a15f68ed2**,APAC),表:
  `cards`(经验卡本体,含联系方式与撤卡码——**联系方式与 code 永不出现在列表接口**)、
  `ratelimit`(当日加盐 8 位哈希,不存 IP)、`ev`、`ua_audit`。表由 worker 首次请求自举。
- API:`POST /api/card`(发卡)· `GET /api/cards[?kind=offer|need]`(只回 live、不含联系方式)·
  `GET /api/stats` · `GET /api/card/:id/contact`(按需取回并计 `contact_reveal`)· `POST /api/withdraw`
  · `GET /api/pulse`(舰队 heartbeat 读侧,同 goldrush)。
- 部署:`deploy-after35.yml`(push 路径过滤 + dispatch + 每日 07:50Z 兜底);闸门 = 文件齐 +
  `node --check` + `tools/test_worker.mjs`(假 D1 全链路 23 条断言)+ 零编造 grep(页面不许写死
  失业率百分比)+ checklist FAQ 与 JSON-LD 逐条一致;部署后 8 个路径 + 3 个 API 冒烟。
- **一键停止**:owner 在 GitHub 网页新建 `sites/after35/KILLED` → 流水线拒绝部署。

## 内容规则(硬约束)
1. **不编一张卡。** 冷启动就是 0,首页三个数直接读 `/api/stats`。永远不准放种子卡、示例卡。
2. **不引未核实的统计。** 网上流传的「35 岁面试率 12.4%」「中年失业 800 万」之类追不到一手出处
   (09-14 检索时来源全是自媒体),**一个都不上页**。流水线有 grep 闸门。
3. **法规只引条款原文**:《失业保险条例》十四/十七条、《社会保险法》四十八条、卫健委 12356 通知
   (2024-12)。4050 补贴只给全国常见口径,**不引任何一城金额**,写明「本站未逐城核实」。
4. **不做中介,不抽成,不卖名单,不加邮件/密码注册**(舰队既有结论:邮件表单 0/246)。
5. zh 设计系统 Swiss anchor:白底、一个蓝 `#002FA7`、细线、大数字;为 40–55 岁读者正文 18px、
   点击目标 ≥48px。不用暗色主题。

## v2(同日二次迭代,owner:「成为 AI 时代最强的建议、撮合、二次启动网站」)
调研全文 `docs/research-2026-09-14.md`。三支柱:**建议** = /paths + **/restart**(现金红线 + 90 天计划,
纯算术,URL 即存档);**撮合** = 卡 + **行业大类标签**(12 类白名单,worker `INDUSTRIES`)+ 同行业匹配
链接(`match_click`)+ **「先免费聊半小时」intro 标记** + **/my**(卡号+撤卡码看被查看次数);
**二次启动** = /checklist + **判定页 /after-35-restart**(六件套,活数字读 /api/stats)。
**刻意不做**(理由见调研 §六):LLM 生成建议、账号、种子卡/成功故事、岗位聚合、任何收费。
表结构变更只能走 `ensureSchema` 里 try 包裹的 `ALTER TABLE ADD COLUMN`(D1 无 IF NOT EXISTS)。
**列名踩坑(2026-09-14 v4 首发就中):`commit` 是 SQLite 关键字,ALTER 被 try 静默吞掉、INSERT 会 500,
假 D1 单测测不出来。**列已改名 `commitment`(API 字段名仍叫 `commit`)。规则:①新列名先查 SQLite
关键字表;②部署冒烟必须走一次真实写路径——`POST /api/card?dry=1` 走完全部校验与列绑定但不入库,
线上永远不留测试卡;③改列后用 MCP `pragma_table_info('cards')` 核一次列真的在。

## v3(同日,owner:「要打出差异化,譬如程序员失业,可以用 AI 做以前很多做不到事情」)
差异化定为**经验 × AI**:别的平台问年龄,这里问「以前干什么」。`/ai-leverage` 十个岗位 × 三件
「以前做不到、现在一个人能做」的事 + 一周第一个交付物 + AI 替不了的部分;判定页
`/laid-off-programmer-ai`(六件套)。新增 offer 类型「AI 落地」(帮小公司把 AI 用起来)。
工具免费额度**一律外链白嫖计**(`baipiaoji.com/tools/<slug>.html`,舰队姊妹站,额度逐条核实),
本站不维护、不背书。杠杆表写的是「能做」不是「能赚」,首屏明说;不引任何生产力倍数。
判定线补登:12-14 另看「AI 落地」卡 contact_reveal 累计 ≥10(判定加强)/30 天内该类卡 0 张(降级)。

## v4(同日,owner:「增加志同道合人发帖,然后一起创业的平台,做大做强」)
组队板 `/team`:`kind='team'`,复用 cards 表——`offers` 列存**需要的合伙人角色**(白名单 `ROLES`,与
offer 类型互斥校验)、新列 `stage`(idea/validated/revenue)与 `commit`(parttime/fulltime),`field` =
发帖人在项目里的角色,`pay` = 合作方式。发帖表单同一页 `/post?kind=team`。RISK 词表加了
投资回报/回报率/众筹/入股费/加盟费——**本站只撮合人,不撮合投资**,这类帖一律进复核。
页面写明三条红线(先聊三次、不先注册公司、一页协议)且「不做尽调、不担保」。审核块 G 对 team 帖
多看一眼「资金」角色的帖子。判定线随撮合支柱(10-14 / 12-14)一起结算,team 帖单列计数。

## v5 AI 撮合(同日,owner:「ai 撮合平台再优化一轮」)
**Workers AI 内建绑定**(`wrangler.jsonc` `"ai": {"binding":"AI"}`,无外部密钥;免费 10,000 Neurons/天),
模型 `@cf/baai/bge-m3`(多语向量)。发卡后台算一次向量存 `cards.emb`(JSON,4 位小数);
`GET /api/match?id=`(给一张卡找互补卡:offer↔need/team、need→offer、team→offer)与
`GET /api/match/text?q=`(一句话找人,不必先发卡;40 次/来源/天)。分数 = 0.55 语义 + 0.25 同行业 +
0.20 角色/方式对上 + 0.05 先免费聊,**每一项都给可读理由**,分数只用来排序。
**降级**:`env.AI` 缺失或调用失败 → 双字重叠(Jaccard)兜底,响应里 `ai:false`;发卡永不受影响
(向量在 waitUntil 里算,失败下次 /api/match 补算)。部署冒烟把 `ai` 标志打进日志,false 即查绑定。
向量、联系方式、撤卡码永不进任何公开响应。事件:`ai_match`(服务端,label=card:kind:n / text:q)、
`ai_match_open`(前端,card/text/my)。判定线:10-14 另看 `ai_match_open` ≥ 30——撮合支柱是否有人用。

## 审核义务(舰队总任务每日块 G)
每日 run 读:
```sql
SELECT id, kind, flag, headline, created FROM cards WHERE status='pending' ORDER BY id;
```
逐条判断:真人误拦(只是写了个网址、行业词撞了风险词)→ `UPDATE cards SET status='live',
reviewed=date('now') WHERE id=?`;确为贷款/刷单/收费培训/色情 → `status='rejected'`。
另扫一遍当日新上线的 live 卡(`created >= date('now','-1 day')`)看有没有漏网的。
**处理数与拒绝数进总日报;不打开联系方式列,不在报告里贴任何联系方式。**

## 判定线(预登记 2026-09-14,按原文结算)
- **2026-10-14(30 天)**:live 经验卡 ≥ 5 张(非 owner、非测试)且 `contact_reveal` ≥ 3 →
  继续每日维护;卡 <2 张 → 站点进「只维护清单 + 路径工具」模式(布告板不撤,不再投入)。
- **2026-12-14(90 天)**:累计 `contact_reveal` ≥ 30 或任一张卡 `reveals` ≥ 5 → 立项第二期
  (按需求侧反馈决定:城市分频道 / 行业标签 / Telegram 绑定「有人看了你的卡」提醒)。
- 分母:`ev.page_view` `ua_class='human'` 且 `path` 不含 `ci`;探针按舰队规则先拆。
- **v2 补登(2026-09-14)**:10-14 另看 `restart_plan` ≥ 20 且 `match_click` ≥ 5(建议/撮合两支柱有人用);
  12-14 另看 /after-35-restart 在 Bing AI Performance 明细里 ≥1 次引用(0 引用 → 记入反面发现,不再投中文判定页)。

## 分发(owner 手发,本站不自动外发)
目标社区是中文的:知乎「35 岁失业」话题、脉脉、小红书、微信群。每周一的分发暂存循环把本站素材
排进 `docs/distribution-staging/`;素材只能引用本站真实数字(为 0 时就写 0——「刚上线,第一张卡
还没有」本身是诚实的钩子)。
