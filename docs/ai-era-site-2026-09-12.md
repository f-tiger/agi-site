# 打造「AI 时代的站点」——prompt 三轮 + 裁定 + 已建的两块仪表(2026-09-12)

owner 原话:「先完善prompt再执行:打造ai时代的站点,和阿里巴巴或者字节一样」。
按舰队规矩先做 ≥3 轮 prompt 优化,展示第三轮与被砍掉的东西,再执行。
所有数字均为 2026-09-12 D1 现查(28 天窗,真人 pv,剔 CI),沙箱当日打不到生产域
(代理 CONNECT 403),所以**实测放到 runner 上跑**,见 §五。

## 一、prompt 三轮

**第一轮(owner 字面)**:「做一个 AI 时代的站点,像阿里巴巴或字节跳动。」
问题:阿里与字节是**平台**,不是站点。阿里的护城河是 2003 年的支付宝担保交易——让陌生人
敢交易的**信任层**,不是淘宝的页面;字节的护城河是 2012 年今日头条起的**推荐飞轮**——每次
交互都是下一次分发的训练数据,不是某个 app 的界面。两者都靠双边网络效应与百亿级供给起家;
一个 solo 舰队照抄它们的**形态**(市场、信息流、账号体系)= 09-07 已否的「双边市场冷启动
死循环」(Manifold 先例)。第一轮不可执行。

**第二轮(抽机制不抽形态)**:「把阿里的『信任层』与字节的『飞轮』翻译成舰队尺度:
① 信任层 = 数据可核、带日期、带来源、零编造——这正是 AI 系统决定引用谁的依据;
② 飞轮 = 使用信号 → 缺口 → 页面 → 更多信号(autopilot 需求队列已是它的前半段);
③ AI 时代的『用户』首先是 AI 读者(ChatGPT/Perplexity/Claude 的抓取器与即时取页),
人类经由它们回流。」
问题:还是没有可判定的动作与数字。

**第三轮(可执行,本文采用)**:
> 「舰队 = 八个已被 AI 系统当作一手来源的站。本轮不建新站、不加 cron、不写正文;
> 只做两件让『AI 读者』成为一等公民的**仪表**:(a)每天证明八站对 8 个 AI 爬虫
> 全部可达(否则红);(b)每天数八站 28 天『AI 助手引荐』并进需求摘要——
> 这是飞轮的读侧,此前从未有过。预登记判定线,六周后按数说话。」

**被砍掉的**:新站/新子域(三条铁律无候选)、市场/抽佣(09-07 §284 杀)、推荐信息流
(供给不存在)、用户账号/登录(零 PII 红线)、聊天机器人/站内 AI 对话(每次调用是成本,
无营收对冲,且违反「第①层零 AI」)、AI 生成内容量产(零编造 + 09-12 AI 小说裁定)、
「AI 原生」改版/换壳(防翻炒)。

## 二、事实:八站的 AI 读者面到底怎样(修正上一轮误判)

上一轮审计把 bpj 判成「全缺」——**看错了目录**(它的产物在构建时生成,不在源码树)。
重新以真实产物核对:

| 站 | llms.txt | llms-full | robots 点名 AI 爬虫 | JSON-LD | 机器接口 | 每日爬虫探针 |
|---|---|---|---|---|---|---|
| agiscorecard | ✅ | ✅ | ✅ | 206 页 | 4 个 agent 面 | ❌ |
| baipiaoji | ✅(构建生成) | ✅ | ✅ | ✅ | limits.json + **MCP 14 工具/9 资源** | ✅(唯一) |
| getecoback | ✅ | ✅ | ✅ | 199 页 | MCP + 公开聚合端点 | ❌ |
| thedollscout | ✅ | ✅ | ✅ | 37 页 | — | ❌ |
| goldrush | ✅ | — | ✅ | 4 页 | — | ❌ |
| gridlings | ✅ | — | `*` 通配 | 44 页 | — | ❌ |
| buysomething | ✅ | — | `*` 通配 | 4 页 | 公开聚合端点 | ❌ |
| gamesledger | ✅(生成) | — | `*` 通配 | ✅ | concurrents.json | ❌ |

结论:**内容面早就是「AI 时代」的**——八站全有 llms.txt,bpj 还有 MCP。`*` 通配在
robots 语义上等于放行,**不改**(改了是翻炒)。真正的缺口在两处:

1. **没人证明爬虫进得来。** bpj 的探针注释写得很清楚:Cloudflare 的 Bot Fight /
   Block AI Scrapers 在 robots 之上、应用之下生效,被拦的爬虫**在 D1 里没有任何痕迹**。
   七个站从未探过;舰队手册 09-05 那句「09-15 后若 heartbeat 看到 GPTBot…被 403 先解封」
   ——heartbeat 根本没在看。Cloudflare Pay-Per-Crawl 2026-09-15 起默认拦截,**三天后**。
2. **没人数 AI 送回来多少人。** 引用份额(Bing 数据,33–37.5%)是供给侧;回流是需求侧,
   此前没有任何仪器。

## 三、基线(2026-09-12,28 天,真人 pv 里 referrer 属 AI 助手)

| 站 | 真人 pv | AI 引荐 | 份额 | 来源 |
|---|---|---|---|---|
| agiscorecard | 27 662 | 20 | 0,07% | chatgpt 7 · claude.ai 6 · copilot 4 · perplexity 2 · kagi 1 |
| baipiaoji | 1 888 | 33 | 1,75% | perplexity 20 · chatgpt 12 · kagi 1 |
| getecoback | 381 | 16 | 4,2% | chatgpt 12 · perplexity 4 |
| gridlings | 658 | 0 | — | |
| gamesledger | 632 | 0 | — | |
| goldrush | 289 | 0 | — | |
| buysomething | 58 | 0 | — | |
| thedollscout(08-30 起) | 195 | 0 | — | |
| **舰队** | **31 763** | **69** | 0,22% | |

三条读法:①agi 的引用份额高、回流份额最低——判定页被 AI **答完了**,读者不必点进来,这与
「引用份额不受流量约束」一致,不矛盾;②eco 是回流份额最高的站(产品比较类问题 AI 会给链接);
③五个 0 里,gridlings/gamesledger 是游戏与数据面,AI 助手不引荐游戏;SR/goldrush/tds 是
0 样本,不是「被拦」的证据——**要等探针数据才能分辨**。

## 四、已建(零 AI,零 cron,零副作用)

| 件 | 位置 | 能红吗 |
|---|---|---|
| 八站 AI 爬虫可达性探针 | `tools/fleet/ai_access_probe.py` → `data/fleet-ai-access.json` | 任一站 401/403/429/503 任一 AI UA → 红;对照组不 200 则不判(不制造假阳性);8 条自检夹具 |
| 八站 AI 引荐读数 | `tools/fleet/ai_referrals.py` → `data/fleet-ai-referrals.json` | 三 token 逐个试;读失败保留上一份,>3 天读不到才红;11 条自检 |
| 需求摘要新节 | `tools/fleet/demand_digest.py` | 读上面的快照,>3 天标 STALE |
| 搭载 | `fleet-heartbeat.yml`(08:00 UTC) | 两步 `continue-on-error` + 末尾统一判红,不阻断健康快照回仓 |

成本:探针 8×9×2 = 144 个 GET,8 线程并行 ≈ 5–10 秒;D1 读 9 次请求 ≈ 3 秒。
heartbeat 仍在 1 分钟计费粒度内,**每月增量 0 分钟**。

**已知噪音(诚实记)**:探针请求带 `?__probe=1`,bpj 中间件据此不记账;其余六个 worker
按 UA 正则把它们记作 `bot`(全部 token 在 `bot_ua.txt`),即 `ua_audit` 每站每天多 ≤8 行
bot 计数、发生在 08:00 UTC。不影响 human 口径。

## 五、runner 实测(沙箱打不到生产域)

首跑由本会话 `workflow_dispatch` 触发并读日志;结果写在 §七。

## 六、判定线(预登记)

- **2026-10-24(+6 周)**:舰队 AI 引荐 ≥ **138/28d**(2× 基线)**或** 五个 0 站里 ≥2 个转正,
  且期间探针没有一次「红了不修」。达标 → 下一轮把 llms-full 与 JSON-LD 补到四个只有 llms.txt
  的站;未达标 → AI 读者面进入**只维护不扩建**,结论写回本文,不再以「AI 时代」为由开工。
- **2026-09-16(Pay-Per-Crawl 生效次日)**:读 `data/fleet-ai-access.json`,任一站被拦即
  owner 在 Cloudflare 控制台关开关(1 分钟),会话不能代做。

## 七、首跑记录(2026-09-12 23:23 UTC,heartbeat run 34725258191,workflow_dispatch,SUCCESS 18 秒)

- **探针**:八站对照组 `/` 与 `/llms.txt` 全 200;8 个 AI 爬虫 UA × 2 路径 × 8 站 = **128 个请求全部 200,
  零拦截**(`data/fleet-ai-access.json` 已由 runner 回仓)。探针步骤 2 秒。结论:截至 09-12,五个
  AI 引荐为 0 的站**不是被拦**——是没被引用或被答完;Pay-Per-Crawl 09-15 生效后这份文件才开始有意义。
- **AI 引荐读数**:仓里两个 Cloudflare token(`CLOUDFLARE_API_TOKEN_ZONE`、`CLOUDFLARE_API_TOKEN`)对 D1
  query 端点都是 **HTTP 403**,`CF_API_TOKEN` 未设。脚本按设计写了带日期的 stub、步骤黄不红,
  **2026-09-16 起若仍读不到,heartbeat 每日红一次**(GitHub 邮件)。旁证:`tds-traffic.yml` 自 09-04 起
  同样逐 token 试 D1,`sites/thedollscout/content/d1-snapshot.json` **至今不存在**——同一个根因。
  **owner 一分钟待办**:Cloudflare → My Profile → API Tokens,给现有 token 加 `Account · D1 · Read`,
  或新建只含该权限的 token 存为 `CF_API_TOKEN`(三个名字脚本都会试)。做完后 tds 那条 12 天没成功过的
  导出也会一起活过来。会话不能代做(无控制台权限)。在此之前,AI 引荐数字只能像 §三那样由会话经 MCP 手查。
