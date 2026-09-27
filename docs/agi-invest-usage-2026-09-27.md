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
