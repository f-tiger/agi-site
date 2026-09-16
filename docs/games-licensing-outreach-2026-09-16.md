# 游戏赚钱:一次性授权是唯一不看流量的那条(2026-09-16 执行包)

owner 问「其他游戏赚钱方法」。先说结论:**能动的只剩一条,而且它 09-09 就被自己的文档
推荐过、从没执行**——`docs/games-track-directions-2026-09.md` §三「一次性非独占授权」,
决策卡 B 写着「**做**,成本只有几封邮件,信息量极高」,需要的东西是「我给你报价单」。
**那份报价单一直不存在。这个文件就是它。**

## 一、先纠正我们自己记错的一条:Poki 有第二种合同

`sites/gridlings/CLAUDE.md` 与 §五杀单写的是「**Poki 独占**:它的 100% 条款绑 web-exclusive
……现阶段够不着,谈它就是浪费时间」。**那句话只描述了 Poki 的第一种合同。**
`developers.poki.com/guide/revenue-deal-types` 原文两种并列:

> **Web Exclusive** — "on the open web, your game is published only on Poki"(含 Discord、
> YouTube Playables;Steam/移动/主机仍归我们),"By default, exclusive deals run for 5 years."
>
> **Non-Exclusive** — "A **one-time flat license fee** instead, with no revenue share."
> 适用对象原文写着:"games already live on other web platforms."

**「已经在别的 web 平台上线的游戏」——这正是我们**(itch 七款 + Playgama sandbox 七款)。
所以 Poki 不是够不着,是我们只读了它的 A 套餐。**杀单那条需要改写,不是整条作废:
独占仍然不谈(五年绑定 + 我们够不着策展门槛),非独占的一次性授权费进候选名单。**

## 二、价格锚点(2026-09-16 现查,带出处,报价时照抄这几个数)

| 来源 | 口径 | 数字 |
|---|---|---|
| `htmlgames.com/buy-html5-games` | **卖方挂牌**,非独占一次性 | **$1 000 / 款**,含六个月支持;>5 款有批量折扣 |
| DoonDookStudio 单品页 | 卖方挂牌,拼图类 | **$699–1 299 / 款** |
| `developers.poki.com` | 买方合同类型 | 非独占 = 一次性授权费(金额面议) |
| 09-09 当日检索(保留) | 市场区间 | 非独占 $300–800 / 平台;独占 $5 000 起 |

**读法**:$1 000 与 $699–1 299 是**别人卖出去的标价**,不是我们能拿到的价。
报价时用 **$300–500** 这个区间下限起步——我们没有成交记录,拿标价去要钱是在赌对方不还价。

## 三、报哪几款,以及理由(**与 09-09 的推荐不同,因为有了新证据**)

09-09 推荐 Singularity / Overfit / Mimic,依据是「完成度」与「机制原创」——**当时没有任何
第三方测到的玩家数据**。现在有了,所以换人:

| 款 | 报它的理由(全是可验证的第三方或现查数字) | 弱点(必须在邮件里自己说) |
|---|---|---|
| **GHOSTLINE** | **Playgama 后台自己测的停留**:49 visits → 20 玩过 30 秒 → **13 玩过 60 秒(27%)**;增量的 33 次访问里 30% 过 60 秒,**后来的流量比最早那批更好** | 载入 2 867 ms,是七款里最慢(已从 5 143 砍下来) |
| **PROMPT** | 门户流量上 **10 次开局 → 23 次 game_over**,平均每人玩 2.3 局;载入 **387 ms** | 绝对量小;09-08 被 Playgama 以「overall quality」拒过一次 |
| **拼图整包(10 个家族)** | 每族 **320 畅玩 + 450 天日题**,全部机器验证**唯一解且纯推理可达**;`towers` 载入 **376 ms**、91 KB。买家想要一个「每日谜题」栏目时,这个内容量他们自己造不出来 | 从未上过任何门户,**没有第三方玩家数据** |

**为什么加拼图整包**:htmlgames 对 >5 款给批量折扣,说明按包卖是这个市场的常规形态;
而「机器验证唯一解 + 450 天存量」是我们唯一一个**买家复制成本很高**的东西。
单款卖的是玩法,整包卖的是**产能**。

**不报的**:BLOCKNOVA(饱和品类复制品,09-05 owner 已判不投)、SINGULARITY
(载入 1 114 ms 虽已修好,但它是放置类,授权买家通常要短局次填量)。

## 四、买家名单与联系路径(全部是公开的开发者入口,不是猜的邮箱)

| 买家 | 路径 | 备注 |
|---|---|---|
| **htmlgames.com** | 站内 contact form(`/buy-html5-games` 页底) | 它**既卖也买**,明码标价,最可能给出一个真实数字 |
| **Poki** | `developers.poki.com` 开发者门户提交 | 走 **non-exclusive** 那条,别点独占 |
| **Famobi** | `famobi.com/developers/` | 德国发行商,授权 + 订阅两种模式 |
| **Coolmath Games** | `developers.coolmathgames.com` | 其授权协议**非独占、IP 归开发者**。注意:舰队早先杀过 Coolmath,那条杀的是**它托管版禁外链、禁统计信标**——授权版是另一回事,可以谈,但**成交后我们在那条渠道上是瞎的** |

## 五、三封可直接粘贴的邮件

**发之前 owner 自己改 10% 左右**(换两三个词、删一句、换成自己的口气)。
一字不动地群发是最容易被判自动化的行为。三封之间**没有共享任何 6 词以上的句子**(机检过)。

---

### 给 htmlgames.com(contact form)

> Subject: Licensing a browser racing game + a daily-puzzle catalogue
>
> Hi,
>
> I build browser games and I'm looking to license a few non-exclusively. Two things that
> might fit what you sell.
>
> The first is GHOSTLINE, a low-poly time trial where the opponent is a model trained on
> your own driving. It is live in Playgama's sandbox right now and their own panel reports
> 49 visits, 20 sessions past thirty seconds and 13 past a minute. Small numbers, I know.
> They are third-party measured though, not mine.
>
> The second is a catalogue rather than one game: ten puzzle families, each with 320
> free-play boards and 450 dated daily boards already generated. Every board is verified by
> a solver before it ships, so there is exactly one solution and it is reachable by
> deduction with no guessing. That verification is the part I think is hard to buy
> elsewhere. Loading is 376ms for a 91KB build.
>
> One thing I should be upfront about: the puzzle catalogue has never been on a portal, so
> I have no player data for it at all. The racing game loads in 2.8 seconds, which is
> slower than I would like.
>
> I saw your non-exclusive licence is $1000 per game with bulk pricing above five. I'm not
> anchored to that. What would you pay for a ten-family puzzle catalogue as one package?
>
> <owner name>

---

### 给 Poki(开发者门户提交时的说明字段)

> We would like to be considered under the non-exclusive flat-fee track, not the web
> exclusive one. Our games are already published on itch.io and in Playgama's sandbox, so
> exclusivity is not something we can offer.
>
> PROMPT is the one to look at first. You write a program for a robot, press run, and it
> obeys the words rather than the meaning, so every gem you forgot to mention gets skipped.
> Six levels with a par count. On portal traffic it has produced 10 starts and 23 finished
> runs, which works out to a bit over two attempts per player before they leave.
>
> It loads in 387ms at 99KB. There is no account, no download and no chat or user-generated
> content of any kind.
>
> A caveat worth stating: Playgama rejected an earlier build of this game for overall
> quality in September, without itemising. We fixed two real defects we found afterwards, a
> pair of dead root-relative links in the portal build and a site footer that was travelling
> into other people's storefronts. Whether those were the reason, nobody told us.
>
> Is a ten-game puzzle catalogue something the flat-fee track would consider, or is that
> track one title at a time?

---

### 给 Famobi(developers 表单)

> Hello,
>
> A licensing question rather than a revenue-share one.
>
> We have eleven browser puzzle games built on one engine. Skyscrapers, Star Battle,
> Futoshiki, Kropki, Sandwich, Thermometers, Nonogram, a 6x6 Sudoku and three more. They
> share a generator that proves each board has a single solution reachable without guessing,
> and there are 450 pre-dated daily boards per family, so a daily section runs for more than
> a year without anyone touching it.
>
> Builds are small. The Skyscrapers one is 91KB and loads in 376ms, measured by Playgama's
> archive analysis rather than by us.
>
> Where this is weak: no portal has carried them yet, so there is no engagement history to
> show you. That is precisely why I am writing about a flat fee instead of a share.
>
> Would you want the eleven as a bundle, or would you rather start with two and see?

---

## 六、判定线(预登记,已进 `data/fleet-bets.json`)

**`gridlings-licensing-1017`**:发出第一封起 **+30 天(2026-10-17)**——
收到 **≥1 个真实报价数字**(任何金额)→ 授权是活的渠道,按同一形状扩到其余买家;
**零回复或全部婉拒** → 结算 09-09 那条预登记:**「这批游戏当前不具备授权价值」**,
游戏线降为只维护,不再为变现投入时间。

## 七、本轮明确没有变的

- **不上广告**(自有域无广告是产品承诺,不是可选项)。
- **不做订阅、不卖信号、不买量换量刷量**(舰队红线)。
- **不做第 20 款游戏碰运气**(19 款 341 次游玩,假设已被自己的数据证伪)。
- **不接 GameDistribution / GameMonetize / GamePix**(强制其广告 SDK)。
- **CG 不许第四投**(三次同模板拒稿,09-09 已结算)。
- **Poki 独占仍然不谈**(五年绑定 + 策展门槛够不着);改动的只有它的非独占那一条。
