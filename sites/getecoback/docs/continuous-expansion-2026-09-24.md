# eco 持续扩展:队列 + 首页发现面 + 第一批三页(2026-09-24)

owner 原话:「站点应该持续扩展」。

## 一、Prompt(第 3 轮)

- **目标**:eco 不靠 owner 每次开口也能持续长新页。做法是一份预先过了门的扩展队列,由已有的每日舰队任务消费,一天一页。
- **范围**:getecoback 德语区;第一批三页现在就建;首页加一个发现面;撤回当天上午写下的「10-20 前不建新页」;队列里的词每月测一次 Trends。不新增 cron,不改 Routine 的 prompt(规则写进 eco CLAUDE.md,主 Routine 的 C 段按站内手册执行)。
- **不做**:同时铺多个品类;没过 SERP 门的页;没有一手来源的数字;EcoFlow。
- **验收**:队列闸门与部署自检能红;三页过全部 20+ 道闸门与 390 px 浏览器实测;首页块在线上带着新页的链接;两条判定线进台账。

前两轮改掉的:第 1 轮是「一次多写几页」,第 2 轮发现真正的约束是新页不被 Bing 抓,所以把发现面(首页块 + 对照组判定线)和节奏(一天一页、队列可审计)放到了页数前面。

## 二、为什么当天上午的规则要撤回

上午的季节日历那一轮写下「在 `eco-new-page-discovery-1020` 结算前,新品类扩到已排名页上,不建新页」。依据是真实的:09-17/18 发布的 15 张页,bingbot 一张都没抓过(09-10→14 那批是 38/46)。

但这条规则把两件事绑在了一起:**新页值不值得建**,和**新页能不能被发现**。前者由选题法决定,后者是一个可以直接动手的缺陷。D1 读数(2026-09-24):

| 页面 | bingbot 14 天 |
|---|---|
| `/`(首页) | 25 次,14 天里 12 天有 |
| 四个分类枢纽 | 各 2–3 次 |
| 09-17/18 新页 | 0/15 |

首页是本站唯一几乎每天被 bingbot 抓的页,而它此前**没有一条 `<a href>` 指向 09-15 之后发布的任何一页**——`EB_POPLIVE` 只在 JS 里存了一张标题表,爬虫看不见。新页只从分类页(每两周抓两三次)和相关页块(老页互链)被链到。

所以规则改为:**继续建,但同时修发现面,并用对照组把「修发现面有没有用」单独量出来。** 这样 10-20 那条线仍然能结算,而扩展不必停三周。

## 三、机制

### 1. 扩展队列 `sites/getecoback/data/expansion-queue.json`

每一项带:slug、工作标题、簇、证据、SERP 判定(日期 + 看到了谁)、蚕食检查、变现方式、状态、阻塞项、下一步。状态六种:`queued` / `built` / `rejected` / `blocked` / `gated` / `seasonal-hold`。

- **每日任务的 C 段**取第一个 `queued` 且无阻塞的项,按 kgr-page 清单建页,改成 `built` 并写上日期和判定线 id。**一天最多一页。**
- **可建项少于 3 个时**,当天先补货:从 demand-digest 的季节日历里找候选,每个 SERP 判定都写回队列,**被否的也写**——这样同一个词不会被查两次。
- **闸门 `tools/check_expansion_queue.py`**(部署链里,能红):`built` 必须有页面、页面的 datePublished 必须等于记录的日期、必须有台账里的判定线;不是 `built` 的项不许已经有页面;`rejected` 必须带日期的 SERP 判定;slug 不许重复。可建项 <3 只报 warning(那是补货信号,不是部署事故)。自检 7 个用例,两个方向都测。
- **demand-digest 的 getecoback 节**现在在季节日历下面列出队列:各状态计数 + 接下来三个可建项和它们还差什么。

### 2. 首页「Neu im Ratgeber」块(`EB_NEWEST`)

`build_structure.py` 新增:按 datePublished 倒序取最新 12 张德语指南,用 h1 做链接文字,插在首页 `EB_POPLIVE` 之后。原地替换,幂等;新页建好下一次部署就自动进块。

**它是发现面,不是流量赌注。** 用对照组量:处理组 = 块里那 9 张此前 bingbot 0 次的 09-17/18 页;对照组 = 其余 09-10 之后首次出现、到 09-24 仍 0 次、且不在块里的 19 张页。

**已知的弱点**:块只列 12 张,每新建一页就挤掉最旧的一张,所以处理组的暴露天数不一样。结算时按每页在块里的天数(git log 可复原)对照首次被抓日期读。

### 3. 队列词每月测一次

`fetch_seasonality.py` 新增 `DE-QUEUE` 篮子(锚 heizlüfter,与 `seasonality-de.json` 同一刻度),挂在 `eco-trends.yml` 已有的月度步骤里,有自己的 28 天新鲜度判断。2 批,约每月多 1 分钟。**队列变了就改这个篮子**——没有读数的队列项正是它存在要补的缺口。

## 四、第一批三页

全部 2026-09-24 发布,SERP 判定当天做,事实全部有一手出处或可在页上复算。

| 页 | SERP 看到的 | 页面的核心 | 货架 |
|---|---|---|---|
| `/guide/beheizter-waeschestaender.html` | otto、pro-idee、silvergear(店铺);wohlig-wohnen、wäscheprofis 等小站 → 可写 | 100/200/300 W × 4/6/8 h 的电费表(0,30 €/kWh);**一间 12 m² 的屋子在 18 °C 时只能再吸 207 g 水**(从 55 % 起),多出来的都凝在最冷的墙上;20 °C/50 % 的空气碰到 14 °C 的墙 = 73 %;加热晾衣架对比除湿机;带容量计算器 | 定时加热晾衣架 / 晾衣用除湿机 / 湿度计 |
| `/guide/infrarotheizung-thermostat.html` | Bosch(厂商)、heizung.de、heizungsfinder(门户);几家垂直小站 → 可写 | 600 W × 8 h = 4,8 kWh = 1,44 €;四种调节方式对比;传感器摆放规则(出处 heizung.de、heizungsfinder);负载额定值检查(不写具体数);租客一节 | 插座恒温器 / 无线恒温器 / 电量计 |
| `/guide/fenster-beschlagen-aussen.html` | 全是窗厂与窗店 → 可写 | 四个早晨的露点表(8 °C/95 % → 只差 0,8 K 就结露);外 / 内 / 夹层三种情况各是什么、该做什么;出处 rumpfinger、fensterversand、fenster-schmidinger | **无**(设计如此:这里没有东西可卖,SKIP_MODELS + POPUP_SKIP) |

**写页时改掉的三处**:两条 meta description 超 155 字符(162/165 → 149/152);外侧结露页初稿里有一句「燃气暖炉永远不要进室内」没有出处,删了;晾衣架页把「Viele」改成「Manche」(说的是部分产品的盖罩警告,不是多数)。夹层结露那句(Randverbund 漏气)有 fenster-schmidinger 出处,保留。

**浏览器实测(390 px)**:四页(三页 + 首页)都是单 h1、零横滚、零页面错误、amazon 链接全部带 tag;外侧页 0 条 amazon 链接;晾衣架计算器默认值 → 207 g、`taupunkt_check` 恰 1 条;外侧页 5 °C/90 % → 3,5 °C / 1,5 Grad;首页块 12 条链接。

## 五、这一轮否掉的(已写进队列,别再查)

| 词 | SERP 看到的 | 结论 |
|---|---|---|
| heizkörper entlüften | dein-heizungsbauer、heizung.de、Viessmann、badenova … | 红海;需求是真的(峰值 6,3,11 月),但租客角度已有好几家在写 |
| richtig heizen | LichtBlick、Vonovia、OBI、Vattenfall、co2online … | 红海 |
| zugluft abdichten winter | Verivox、Utopia、myhomebook … | 红海;租客页已有这一行,那行起量再加深 |
| wärmeunterbett oder heizdecke | bett1、MediaMarkt、EnBW … | 红海;属于 heizdecke-stromverbrauch 的一段 |
| luftentfeuchter reinigen | Dyson、Levoit、Dreo(厂商)、hausjournal … | 红海;清洁步骤已在 luftentfeuchter-stinkt |
| ölradiator stromverbrauch | heizung.de、giga、thermondo、ADAC … | 红海;一行进 heizluefter-stromverbrauch 的表就够 |

另有:`heizkostenzuschuss-oesterreich` 仍 blocked(oesterreich.gv.at 维护中,九个州没有联邦入口,金额年年变);`schimmel-schlafzimmer` 挂在 `eco-schimmel-fenster-1213` 上;储能那页 2027-02 再看。

## 六、建完之后才测到的读数(如实记)

DE-QUEUE 首跑(2026-09-24,锚 heizlüfter 峰值 29,0):

| 词 | 九月 | 峰值 | 峰值月 |
|---|---|---|---|
| heizkörper entlüften | 3,7 | 6,3 | 11 月 |
| fenster beschlagen außen | 0,7 | 1,8 | **10 月** |
| infrarotheizung thermostat | 1,1 | 1,1 | 11 月 |
| luftfeuchtigkeit messen | 0,5 | 1,0 | 11 月 |
| beheizter wäscheständer | 0,0 | 0,0 | — |
| heizlüfter riecht | 0,0 | 0,0 | — |

**加热晾衣架在德国没有搜索需求。**单独拿「wäscheständer」做锚再测一批:wäscheständer 峰值 53,0(8 月),beheizbarer 0,1、beheizter 0,2、elektrischer 0,2、heizwäscheständer 0,1——每一种写法都不到普通晾衣架的 0,5 %。这一页是照英国的读数(heated airer 15,5)选的,建之前没测德国。页面保留(判定线已登记,它讲的「水去哪了」和 waesche-trocknen-wohnung 是同一个角度),但**不再建第二张加热晾衣架页、不做德语尺寸梯**。标题不改:没有哪种写法有量。

**外侧结露页正好在峰值月上线。**

**hygrometer 那一项改了方向**:hygrometer 本身峰值 53,0(11 月,以它自己为锚),「luftfeuchtigkeit messen」在 heizlüfter 刻度上 1,0(和已建的 infrarotheizung thermostat 同一量级),而「kalibrieren / testen / genauigkeit」全部 ≤0,3。读者问的是「怎么测湿度」,不是「怎么校准」。队列项改为「Luftfeuchtigkeit richtig messen」,盐水测试降为其中一节;建之前先对这个词做 SERP 判定。

**「heizlüfter riecht」是 0**,这对故障短语是预期内的(长尾故障词在 Trends 的地板下面,页型证据来自第一方)。

**教训**:队列项在建之前就该有读数。现在 DE-QUEUE 篮子每月跟着队列走,以后建页前先看它。

## 七、判定线

- **`eco-expansion-batch1-1122`**(11-22,窗 10-26→11-22):前提 bingbot 至少抓过其中 2 页;搜索 + AI 引荐 ≥10 或 page_view ≥30。输 → 选题法改为第一方信号优先、季节性只作平局打破;扩展照常。前提不成立 → insufficient,是发现面问题。
- **`eco-newest-block-1008`**(10-08):处理组 ≥5/9 被抓,且比对照组高 ≥30 个百分点。赢 → 同一个块搬到 `/en/`;两组都是 0 → Bing 现在根本不抓本域的新 URL,别在页面上找原因。
- **`eco-new-page-discovery-1020`** 照常结算,但读数写明了:09-24 起有第二个干预,两者由上面那条对照组分开。

## 八、没做的

- 没改 Routine 的 prompt:C 段本来就说「站内 CLAUDE.md 为准」,规则写进手册就生效。
- 没把首页块做成 `/en/` 版:等 10-08 的读数。
- 没给首页块加埋点:它的作用对象是爬虫,读数在 D1 的 crawl 表里。
