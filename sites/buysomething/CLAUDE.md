# buysomething(SourceRadar)— 第六站操作手册(2026-08-22 并舰)

**定位**:面向欧美买家的中国爆款选品情报站(原 f-tiger/buySomething 仓,由
buysomething 会话孵化;owner 2026-08-22 指示并入舰队)。战略与调研底稿在
`docs/`(BRIEF/STRATEGY/research),**改动前先读它们**——选品逻辑、合规红线
(docs/research/07-legal.md:公开数据、无登录、无验证码绕过、限速)是原项目
的立身之本,并舰不改变。

## 机器结构

- `site/` = 纯静态(index/app/data/styles + trends.json);`data.js` 是人工策展的
  选品库,`trends.json` 由 `tools/fetch_trends.py` 每日 05:20 UTC 在 CI 生成
  (trendspy,≥30s/词限速、429 退避、keep-last-good——**失败不碰旧数据,站点
  自动降级到编辑评级**,这个设计不许简化掉)。
- 部署:deploy-buysomething.yml(push 路径过滤 + 每日 schedule);worker 纯资产
  透传;域名 **source.agiscorecard.com**(伞域子域模式)。
- 旧仓 f-tiger/buySomething:原孵化仓,由 buysomething 会话维护;并舰后以
  monorepo 为准。旧仓 GitHub Pages 部署与 trends workflow 与本站互不冲突,
  但**不要**在两边同时改 data.js——冲突时以 monorepo 为准。

## 队列(并舰待办,一轮一项)

1. ~~canonical/OG/sitemap/robots/llms.txt 补齐~~(2026-08-22 完成)
2. ~~D1 埋点~~(2026-08-22 完成:D1 `sourceradar-events` f92b6207-90bf-46f6-97c7-cc88195b2ec7 表 `ev`;服务端 page_view + 白名单 pick_open/calc_use/out_click/search_use)
3. ~~转化钩~~(2026-08-22 完成:STRATEGY.md V1 订阅漏斗——POST /subscribe → D1 `subs` 表,NO-API 模式地址先落库,文案只承诺「下一批选品落地时发一封」;`sub_ok{sourceradar}` 计入舰队订阅证伪线)
4. 周分发循环自动覆盖(monorepo git log 扫描即含本站)

## 自动进化(owner 2026-08-22「新加进来的2个站点也要具备自动扩展，自动进化能力」;
## 同日补充「一个网站自己进化不依赖你，一个是舰队自己的」——两层分开)

**第①层:站点自进化(零 AI 依赖,纯 CI 反馈回路)**
- 每日 05:20 CI:trendspy 刷新 trends.json(需求侧信号,keep-last-good)。
- 读者热度不再走 CI 烤制(2026-08-24 拆除:bake_popularity 需要 D1 读令牌,
  部署凭证没有,天天 403)。改由 **worker `/api/pop` 直读 EV 绑定**(缓存 1h,
  零外部凭证),app.js 消费同一形状 {picks:{id:{o,x}}}。
- 前端:样本 ≥20 次点开后,**默认排序自动从编辑 trendScore 切到真实读者热度**
  (out_click×3 + pick_open)——读者用点击投票,首页自己重排,全程无 AI。
  埋点标签自 2026-08-22 起用 product id(此前 0 行,无历史损失)。
即使所有 Claude 会话永久消失,这一层照常运转:需求数据日更、首页按读者行为
自适应、部署自动。

**第②层:舰队进化(Routine 会话层,做第①层做不了的判断)**
每日进化 Routine(05:40 UTC,自绑舰队会话,与 sellSomething 合用一个 Routine)
每轮做且只做一项,顺序:
1. **读信号**:D1 `sourceradar-events`(f92b6207)——pv 增长、`pick_open`/
   `out_click`/`search_use` 分布、`subs` 表新订阅;CI 的 trends.json 当日热词。
2. **队列有未打勾项** → 做它。
3. **队列空** → 按信号自续 1-3 项,**每项必须挂一个真实信号**(某选品被点开
   最多 → 深化它;某搜索词无结果 → 补它;trends 热词与选品库有交集 → 上新
   一条策展)。没有信号就不硬凑——报告「队列空、信号不足」,只 bump 新鲜度。
4. **零编造红线**:选品数据只来自 data.js 人工策展 + trendspy 一手数据;
   合规红线(docs/research/07-legal.md)不因自动化放松。
5. 判定线到期(~10-21)由 Routine 自动结算:达标加码,不达标降为最低维护
   并在报告里宣布。

## 快反出页规则(2026-08-23,owner:「监控谷歌trends,让站点快速获取流量」)

trends.json 只跟踪**预选**产品词的动量(徽章/排序用),发现不了新需求。新增
`site/rising.json`:六个种子品类词的 rising 关联查询,每日 05:20 与动量同 run
刷新(schedule-only,commit 回写)。**每日进化 Routine Step 1 增读 rising.json**:
某 rising 词 v ≥ 200 或 Breakout,且是真实产品需求(非新闻/明星)→ **当天**动作
二选一:①词与现有选品强相关 → 深化该选品卡(补该角度)②全新品类 → 按策展
规则新增一条 pick(零编造:三层价采集流程不简化)。同词 14 天冷却,当天最多
1 项。判定线:快反项 28 天 pick_open ≥5 → 有效;连续 5 项全空 → 判据回炉。

## 快反日志(每项一行,含判定线追踪)

- **2026-08-31 · 深化 `leg-compression`(选项①,词:「best leg compression sleeves」v=50,350,
  trendspy 抓取 2026-08-30)**。信号是真实产品需求、非品牌非新闻,远超 v≥200 门槛,且与既有选品
  强相关故走深化不新增(不造新品数据)。写入的判断:该种子下的需求**没有收敛到靴子**——第一位是
  结构性更便宜的相邻品类「压缩腿套」(50,350),第二位是品牌型号「therabody jetboots prime」
  (5,250),而通用无品牌词低两个数量级(quinear 120 / therabody leg compression 50)。
  结论:无品牌靴子默认继承不到这波流量,listing 必须正面回答「靴 vs 套」而不是假设买家已经要靴。
  同词 14 天冷却至 2026-09-14。判定线:28 天 `pick_open{leg-compression}` ≥5 → 有效。
  **注意**:本站当前无真实读者(见下),该判定大概率因样本不足而无法结算,到期如实记录为
  「样本不足,不判有效也不判无效」,不得把零读数当成选题失败的证据。

## 中立层扩张(2026-08-23,owner:「相对alibaba有无优势」评估 →「扩大优化优势，包括geo」)

评估结论(记录在案):作为交易平台对 Alibaba 零优势;可防守空位 = Alibaba 因利益
冲突(向供应商收费)结构性做不了的**中立决策层**——①中立验证 ②落地成本判定。
本轮落地(GEO 面从 1 URL 扩到 3):
- **/landed-cost**:2026 关税判定页+交互计算器(de minimis 终结后的三通道:邮政
  $80-200/件、快递 54%-or-$100、正式报关叠加)。全部数字标「as reported, Aug 2026」
  +具名信源+免责声明;**关税政策再变时本页必须同步**,埋点 calc_use{landed_cost}。
- **/is-alibaba-legit**:两栏账式审计页(平台是真的/风险在卖家层/徽章≠审计),
  文档化骗局模式全部引具名 2026 指南(诽谤安全:平台合法性明确肯定)。
  **商业桥**:→ agiscorecard.com/audits SKU2 供应商声明审计 $499,埋点
  out_click{audit_bridge}——这是本站首个通向真实付费产品的漏斗。
- 双边信号雷达深化(抖音/1688 数据工程)未动,等本轮两页的 28 天读数。
KPI:两页 pv、calc_use、audit_bridge 点击;并入周一记分板。

## 判定线

并舰起 60 天:首个真实转化事件或 JS pv ≥100/28d → 加码;否则维持每日 trends
自刷新的最低维护模式。
