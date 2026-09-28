# agi 股票投资线:使用情况检查与优化(2026-09-27)

owner 原话:「agi股票投资子站点检查使用情况，优化」

## 一、投资线由三块组成,能量到的只有一块

| 部分 | 位置 | 代码在哪 | 用户数据 |
|---|---|---|---|
| 主域 invest 页群 | agiscorecard.com/invest、/ai-stock-exposure、/is-nvidia-overvalued、/does-copying-13f-work 等(含 zh) | 本仓 | agi D1,能读 |
| SunWatch(付费 Pro ¥199/月) | invest.agiscorecard.com | sunPredition 仓 | 不在本账号 D1 列表里,**读不到** |
| Compass(13F 抄作业成绩单) | compass.agiscorecard.com | aistock 仓 | 同上,**读不到** |

两个子站本会话只做了线上检查:都在线;SunWatch `/api/track-record` 正常(已评分 8、命中 5);
Compass 成绩单数字(+187.2% / +59.6% / +37.3%)与主域 invest 页一致;价格 ¥199/月 与主域写的一致。
**它们的访问量、Pro 订单、TG 绑定数只能在各自仓库或后台里看。**

## 二、主域 invest 页群读数(D1,28 天,浏览器端真人)

- page_view 合计 **24**,**外部来源 0**:全部是从 agi 站内点进来的。
- 最常见入口:首页导航(`nav` 5、`nav_compass` 4)、首页成绩单块(3)、起步区(3)——终身合计约 20 次点击流向投资线。
- exposure 工具:终身约 2 个会话在用(`exposure_score` 18 次集中在 08-11 与 09-21 两天)。
- **付费桥(SunWatch Pro)点击终身 0;TG 篮子绑定终身 0。**
- 中文 invest 页(/zh/invest、/zh/ai-stock-exposure、/zh/does-copying-13f-work):浏览器端 0。
- 服务端日志另有 664 次「真人」与 33 次 Google 引荐(主要在 /ai-stock-exposure),浏览器端没有对应记录。
  本轮在本地回放了 5 个线上页面,统计请求全部正常发出、无脚本错误——所以差距来自不自报身份的爬虫
  (舰队已知口径问题),**以浏览器端为准**。

结论:投资线不是「转化差」,是**几乎没有人来**。按这个速度,11-15 的存活线(三条要过两条)会判负。

## 三、本轮修了什么(只修错的,不加新面)

1. `/ai-stock-exposure`(+zh)上「See the public track record / 去看公开战绩」按钮原本指向 SunWatch **首页**,
   现在指向 `/en/track-record` 与 `/track-record`。改在生成器 `tools/gen_agi_exposure.py`,重新生成两页,各 1 行差异。
2. 英文 `/invest` 的「AI Investing Compass」链接指向 Compass 根地址,会被 302 到**中文版**;改为 `/en/`。
3. 补登台账:`agi-invest-survival-1115`(三条合并)与 `agi-invest-zh-p4-1029`(中文扩面止损),
   此前只写在 PRD 里,未进台账。

## 四、没做的,和为什么

- **不加新页、不加新入口**:外部来源是 0,问题在发现面,不在页面;在 11-15 结算前改被测对象也不合规矩。
- **不把 opinion 页的篮子块加回来**:09-26 那条线刚判输(3 次 <8)并已拆除。
- **SunWatch / Compass 本身的优化**:代码不在本仓,本会话也读不到它们的数据。如果要做,需要以那两个仓为源另开会话。
- **钱**:投资线至今 0 笔付费点击,不是 agi 近期营收来源。

## 五、下一次看什么

- 10-29:`/zh/does-copying-13f-work` 28 天 ≥5 次,否则停 zh 投资新页。
- 11-15:三条合并结算;同时是 Q3 13F 申报季,**六处写死数字的季度同步义务照常**
  (invest.html、zh/invest.html、index.html、cn.html、does-copying-13f-work 两页)。

## 六、补全:SunWatch / Compass / Gushen 的使用与订单(同日,四个仓库接入会话后)

owner:「读它们的访问和订单数据，把投资线的使用情况补全；直接在 SunWatch 或 Compass 上做优化」

| 部分 | 访问 | 转化 / 订单 | 读数来源 |
|---|---|---|---|
| SunWatch(invest.) | 累计 pv 5 794、TG 按钮 123、购买按钮 71 —— **三者都含爬虫与部署自检**,不可当读者数 | 询价 **1**、付款回执 **0**、已发码 → Pro 绑定 **0**、免费订户 **1**、TG 篮子 **0** | 线上 `/api/growth`(Telegram 侧计数是真的) |
| Compass(compass.) | 弹窗出现 459 次,其中 **423 次是爬虫**;真人 36 次(26 次来自同一新加坡地址),28 天 107 次里真人更少 | 真人关闭 0、订阅提交 0;订阅库 `count` = **1** | agi D1 `events` 里 `location='compass_popup'`、线上 `/api/subscribe` |
| Gushen(gushen-4g2.pages.dev) | 无计数 | —— | 前端在线,**后端从未部署**:线上 `/api/*` 全部返回网页 HTML,组合推荐/选股器/凯利等功能都用不了 |

**整条投资线的真实状态:四个产品合计,付费 0 笔、真实询价 0 次、订阅 2 个(SunWatch 1 + Compass 1)。**
(同日 owner 确认:SunWatch 的那 1 次询价是 owner 自己的测试,不算买家。)

### 本轮做的
1. **SunWatch 计数改为分真人口径**(sunPredition `ec1ac14`,分支 `claude/sun-yuchen-investment-research-yzz9mx`,推送即部署):
   原键继续累加保证历史连续,新增 `h_pv / h_tgClicks / h_buyClicks / h_proClicks` 只计非机器 UA(词表同 `tools/fleet/bot_ua.txt`);
   `/api/growth` 多出 `human` 块;TG 简报的增长行改报真人数;robots.txt `Disallow: /go/`;页面 5 处 /go/ 链接加 nofollow;
   离线测试 12 条 + 部署后断言。**原因**:`/go/buy` 是普通链接,爬虫顺链就算一次购买点击,部署自检每次也 curl 它 ——
   「购买 71 → 询价 1」读起来像漏斗断了,实际大半是机器。
2. **agi `/invest`(中英)拿掉 Gushen 卡片**:它把读者送进一个功能用不了的原型;该卡片终身点击 0。
3. **Compass 不改代码**:弹窗计数已经在 agi 这边按 UA 分类,读数本身没被污染;真人太少,没有可优化的转化面。

### 仍需 owner 决定
- Gushen:要么部署后端(README / DEPLOY.md 写了步骤,需要能跑 Python 的主机与 `VITE_API_BASE_URL`),要么当作已停产品。
- ~~SunWatch 那 1 次询价后续如何~~ —— owner 确认是自己的测试,真实询价 0。

## 七、Gushen 已改为纯前端服务并恢复入口(同日,owner「gushen改成前端服务，重构一次」→「继续」)

- gushen 仓 `3043d1b`:后端数学全部移植为浏览器端 TypeScript,行情为部署时抓取的 Yahoo 复权收盘价
  (68 个标的、约 1 000 个交易日,每个美股交易日收盘后自动重建);与 Python 原版 36 项对照测试全过,线上真实数据端到端实测全部工具可用。
- 所以 §六 里「Gushen 线上不可用」已不成立,`/invest` 中英两页的卡片按现状重写后恢复
  (去掉了已不存在的「模拟盘」说法,注明中文界面、原型、非投资建议)。事件名沿用 `invest_tool_click{gushen|zh_gushen}`,终身点击 0 为起点。

