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
- 同一 run:`tools/bake_popularity.py` 查 D1 REST API 取 28 天真实读者行为
  (pick_open/out_click)→ 烤进 site/popularity.json(失败不碰旧文件)。
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

## 判定线

并舰起 60 天:首个真实转化事件或 JS pv ≥100/28d → 加码;否则维持每日 trends
自刷新的最低维护模式。
