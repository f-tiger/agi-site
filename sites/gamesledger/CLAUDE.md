# gamesledger — 第五站操作手册(2026-08-22 建站)

**定位**:游戏界的证据层。口号刻在页头:**official numbers or no numbers**。
PRD 与调研依据:仓库根 `docs/games-subsite-prd-2026-08.md`(三门证据、killed 清单、
判定线全在里面,动手前必读)。

## 硬规则(零编造在本站的具体形态)

1. **玩家数只有一个来源**:Valve `GetNumberOfCurrentPlayers` 公开 API。API 非 ok
   → 该游戏整页排除,绝不估算、绝不引第三方数字。这条是本站对位
   activeplayer.io 类编造站的全部护城河,松一次就死。
2. **AI 披露只有两层**:自采(CI 直读商店页,unknown 排除出分母)+ 已发表研究
   (带作者/日期引用)。两层永远分开呈现,不混算。
3. **每页平台覆盖声明**(games.json 的 caveat 字段)不许删——OW2/CoD 的 Steam
   少数派口径写明白,是诚实度的展示面。
4. 判定档位(BANDS)是预注册规则:改档位 = 改规则,需在 methodology 页留痕
   (旧档位 + 生效日期),不许静默改。

## 机器结构

- `data/games.json` 人工策展(选游戏标准:真实 is-dead 查询需求,见 PRD);
  `data/concurrents.json` / `data/ai-disclosures.json` **只由 CI 写**。
- `tools/fetch_steam.py` 每日 06:10 UTC(deploy-gamesledger.yml schedule);
  `tools/fetch_ai_disclosures.py` 每周一同 run 加跑;沙箱到不了 Steam,
  一切取数只能在 CI,本地调试用合成数据且**绝不提交**。
- `tools/gen_site.py` 纯静态生成;域名 = **games.agiscorecard.com**(owner
  2026-08-22 决定不买新域;wrangler routes custom_domain 自动挂载成功)。
  若 60 天判定线打响后 owner 要独立品牌域:改 SITE_URL 一行 + routes + 老域 301。
- wrangler:worker.js 纯资产转发(将来 D1 埋点在此扩展);wranglerVersion 必须
  钉 "4"(action 默认 3.90 不识 jsonc,2026-08-22 踩过)。

## 队列(按 PRD 顺序,一轮一项)

1. ~~is-X-dead 台账 16 页~~(2026-08-22 上线,真实首采)
2. ~~Steam AI 披露追踪器~~(2026-08-22 上线,首采 35.0%,全网独家周序列)
3. key 店联盟(Fanatical 12%/Humble 10%——**需 owner 申请账号**;批下来前
   判定页不放任何购买链接,绝不放未生效的联盟链接)
4. 朋友供给线(等 owner 与朋友的三问答案;形状见 PRD「Poki 直达流量套利」)
5. D1 埋点(建库 + worker 扩展,复用 agi 模式;在此之前流量只看 CF dashboard)
6. 游戏扩容(新增游戏必须先验证真实 is-dead 查询需求,不为凑数加游戏)

## 商业模型(owner 问「差异化和如何创造营收」,2026-08-22 答定)

**差异化(三层,全部已上线、可验证,不是口号):**
1. **信任层**:官方数字或不发数字。在位竞品(activeplayer.io 类)靠编造玩家数
   吃流量;本站每个数字可溯源 Valve API,每页写明覆盖盲区。信任是这个品类唯一
   没被占的位。
2. **格式层**:活的(实时查询/徽章/小游戏/每日重判)vs 死的(静态文章)。
   会话时长型工具是 HCU 后唯一被验证幸存的游戏站形态(调研在案)。
3. **数据资产层**:Steam AI 披露周序列全网独家——AI×游戏交叉点,别家没有的
   可引用一手数据集。

**营收路径(按现实顺序,不预支):**
1. **key 店联盟**(近期,需 owner 一次申请):Fanatical 12%/Humble 10%,落点=
   判定页「still alive → cheapest key」模块。**判定页只放已批准的联盟链接。**
2. **朋友 Poki 套利线**(day-one 有对手方,待朋友三问答复):归因流量分成,
   机制已双源验证(外链玩家 100% vs 平台 50%)。
3. **展示广告**(25K PV 后):Raptive 门槛 2025 年已降到 25K,游戏 RPM $2-6,
   是补充不是主菜。
4. **数据授权期权**(远期):AI 披露序列若被媒体/研究引用,B2B 授权可谈。

**站规:不做盲目调研(owner 2026-08-22)。** 选题/扩容只认三个真实信号:
①Google Trends 触发器命中(tools/fetch_trends_games.py,每日)②判定线数据
③朋友供给线需求。不再为本站发起推测性调研轮;trends 发现的新游戏自动入
搜索池(实时可查),**判定页仍须人工策展 caveat 后才建**——自动化到池,
人工守判定,这条分界不许移。

## 判定线(60 天,自 2026-08-22)

首个 AI 引用 / JS pv ≥100/28d / 联盟点击 ≥10 / 朋友线首笔归因结算——
四中其一 → 加码;全空 → 转最低维护(CI 自跑,不投人工)。
