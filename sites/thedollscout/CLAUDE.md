# CLAUDE.md — thedollscout.com(Labubu 导购站)

## 2026-08-30 重大转向(owner 原话:「下架掉这个站点,风险太大,更换为卖labubu的站点」)

- **旧站(18+ 成人 doll 导购)整体下架**。归档 = git 历史 + 旧私有仓 f-tiger/sexweb;
  旧页面线上一律 404,deploy 自检会断言这一点。**不要从 git 历史恢复任何旧页面。**
- owner 同轮确认:**复用本域名与全部基建**(Cloudflare Pages 项目 dollscout、D1
  `dollscout-events`、GA4、IndexNow key),商业模式 = **联盟导购**(不自营、零库存)。
- 旧站的安全楔子判定线、快反规则等条目随站废止;可复用的方法论已沉淀在下方。

## 定位

Labubu / The Monsters 收藏品的**真伪优先导购站**。差异化 = 旧站验证过的
「evidence-standard」基因平移:假货(Lafufu)是这个品类第一痛点,通用打分站
无垂直知识,官方不做第三方比较——这个交叉点是我们的。

- **主变现:双 tag 分市场**(owner 2026-08-30:「联盟id用我的德国和美国id,
  分别做多语言」):
  - **EN 页 → amazon.com + `ecoback0d-20`**(thedollscout.com 已在 US Associates
    站点列表,2026-08-28 截图确认)。
  - **/de/ 页 → amazon.de + `getecoback-21`**(归属 owner,2026-08-25 截图确认)。
    **⚠️ 悬置项(每次报告带出,直到解除)**:amazon.de PartnerNet 后台的站点
    列表需包含 **thedollscout.com**——同 eco/US 那条的教训,未列可致 DE 侧佣金
    作废(owner ~1 分钟)。列表完成前 DE 链接照常在线(owner 明示决策),
    但营收判定按「未确权」记。
  - 串 tag = 零佣金:deploy 有构建闸门,.de 链挂 US tag 或 .com 链挂 DE tag
    直接拒绝构建。两个 storefront 链接都是**实测存在**的官方 POPMART 店铺页
    (amazon.com 与 amazon.de 各自的,2026-08-30 WebSearch 核实)。
- **页面**:/ + /fake-check + /where-to-buy,及其 /de/ 德语对(hreflang 语言组,
  x-default=EN;eco 模型)。德语页价格只引 US 区间 + 指官方 popmart.com/de 在售页,
  **不发明 EUR 数字**。新增语言照此模式(页对 + hreflang + 对应市场 tag +
  该市场 Associates 站点列表先行)。

## 硬内容规则(继承舰队,零妥协)

1. **零编造**:每条事实具名信源 + 日期,查不到就写 "we could not verify"。
   沙箱对 popmart.com/snkrdunk/izoate/demandsage 等均 egress 拦截(2026-08-30
   实测)——**只具名链接让读者自查,不复述抓不到的原文细节**;WebSearch 多源
   一致的要点可用,单源孤证不落页。
2. **不印具体价格**:价格随系列/库存轮动,页面只写区间(有源)+ 链官方在售页。
   「价格地板」逻辑(远低于零售的全新"正品"=假货带)是结构判断,可写。
3. **商标纪律**:每页页脚 + 首页正文声明与 Pop Mart / Kasing Lung 无关联;
   产品名仅作识别用途;**不盗用官方产品图**(旧站规矩延续:要图用原创插画)。
4. **不荐二手/代购渠道,不做转售炒价内容**:本站立场是买到真品,不是投机。
5. **Pop Mart 官方现行指引与本站冲突时,以官方为准**——这句话写在页面上,
   也是对自己的约束。

## 技术与部署

- 纯静态多页,零构建;共享 css/main.css + js/(config/analytics/main)。
- **D1 埋点契约不变**(库/表/ev 口径同旧站,数据连续):`ev=''` 真人 JS pv、
  `ev='bot'` 已知 AI 爬虫、`ev='affiliate_click'` 联盟点击(ref=目标域名)。
  台账读数照旧剔 `/__ci`。**2026-08-30 前的 D1 行属旧站,跨站对比无意义。**
- deploy-thedollscout.yml:防回滚守卫(铁律,checkout 后第一步)→ 下架闸门
  (publishable 文件出现 rating-adult/age-gate/ds_age_ok/yourdoll 即失败)→
  assemble-dist → wrangler pages deploy → **自检**(新页 200+零重定向,
  旧成人页断言 404)→ IndexNow → beacon 自测。
- 保留 workflows:tds-traffic(D1 快照)、tds-indexnow(周推)。其余 9 条旧站
  workflow 已删,别恢复。
- 趋势输入:content/trends-us.json(词表 labubu/lafufu/pop mart/the monsters/
  kasing lung/blind box)+ content/trends-rising.json(种子 labubu / fake labubu /
  pop mart)——首轮数据等 runner(沙箱对 Google 403)。快反出页判据沿用 eco 模式:
  rising v≥200 + 属 niche + 真伪/渠道/系列角度可落 → 当天一页,14 天冷却,
  1 页/天;**转售炒价词、儿童向内容角度不出页**。

## 判定线(预登记,防事后两头解释)

- **搜索引擎清理期**:本域有 6 周 18+ 历史(RTA 头、adult meta、成人语义)。
  已全部移除并重推 IndexNow,但 SafeSearch 分类残留多久无法预测——**诚实
  记录,不许把早期零流量归因于内容**。基线:2026-08-30 起 D1 周报。
- **60 天线(2026-10-29)**:D1 28 天窗真人 pv ≥ 旧站基线(~6/天)× 3,或
  affiliate_click ≥ 1,或 search/assistant 引荐 ≥ 5 → 转向初步成立,继续投入;
  全部未达 → 把「域名历史包袱」假设升级为主因,报 owner 议新域名。
- 旧站教训延续:任何漏斗事件读数前先剔 CI;insert-only injector 禁止;
  判定线一律带日期与查询口径。
