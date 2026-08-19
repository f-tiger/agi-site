# getecoback.com 优化方案（2026-07-11）

> 数据来源：GA4（媒体资源 544688614）、Google Search Console（sc-domain:getecoback.com）、
> 公开 SERP 调研。诊断区间 2026-06-11 → 2026-07-10。
> 注：本次调研所在环境的网络策略拦截了对 getecoback.com 的直接访问（代理 CONNECT 403），
> 站点现状由 GSC 落地页 title/meta 标签与 GA4 页面路径还原；上线改动前建议人工核对一遍。

## 站点现状（调研还原）

德语 + 英语双语的便携空调联盟站，变现方式为 Amazon.de 联盟链接。

| 板块 | 页面 |
|---|---|
| 德语（根路径 /guide/） | klimaanlage-kippfenster、zimmer-kuehlen-ohne-installation、wie-viel-btu-brauche-ich、bei-hitze-schlafen、homeoffice-buero-kuehlen、klimaanlage-stromkosten、klimaanlage-vs-luftkuehler |
| 英语（/en/guide/） | best-portable-air-conditioner-europe-heatwave、portable-ac-tilt-and-turn-windows、best-portable-air-conditioner-for-bedroom、portable-ac-vs-air-cooler、how-to-sleep-in-a-heatwave-without-ac |

30 天基线：61 会话（97% direct、平均停留 3.6 秒，疑似大量机器流量）；GSC 58 次展示、
1 次点击；affiliate_click 事件 1 次；收入 0。

## P0-1 · URL 规范化（最严重的技术问题）

同一内容以多个 URL 变体被 Google 分别收录，排名信号被稀释。GSC 实测（90 天）：

| URL 变体 | 展示 | 平均排名 |
|---|---|---|
| `https://getecoback.com/en/guide/best-portable-air-conditioner-europe-heatwave.html` | 16 | 9.25 |
| `http://getecoback.com/en/guide/best-portable-air-conditioner-europe-heatwave`（http、无 .html） | 6 | 17.8 |
| 同站其他页面则以 `https://www.getecoback.com/...` 收录 | — | — |

同页四种写法（http/https × www/裸域 × 带/不带 .html）并存。**改法：**

1. 唯一规范形态【已实施】：`https://getecoback.com/...*.html`（跟随站内既有 canonical 标签与 sitemap，避免二次迁移）。
2. 服务器端 301【已实施，src/worker.js】：http→https、www→裸域、无后缀→`.html`，一跳到位。
3. 全站每页加 `<link rel="canonical">` 指向规范 URL。
4. sitemap.xml 只含规范 URL，并在 GSC 重新提交。

预期：heatwave 指南两个变体合并后（16+6 次展示、排名 9.25/17.8）大概率进第 9 名以内，
进入首页可见区。

## P0-2 · 修变现计量

1. GA4 中把 `affiliate_click` 设为关键事件（key event）。
2. 给联盟链接统一加事件参数（商品、位置、页面），否则未来无法判断哪个内容板块出单。
3. 英语页面读者多在德国以外（GSC 有 france/english 查询），Amazon.de 链接对他们不可购——
   接入 Amazon OneLink 或按 hreflang 分发到对应站点，否则英语流量点击也无法成交。

## P1-1 · 集中打两个已进前 11 的页面（7 月制冷季窗口内）

GSC 显示两个页面已经自然爬到首页边缘，是本月唯一现实的流量来源：

**① /en/guide/portable-ac-tilt-and-turn-windows —— 排名 9.3，贡献了全站唯一一次点击**

查询词 "portable air conditioner for tilt and turn windows" 排名 11。SERP 调研显示竞争极弱：
排在前面的是 casement-window 内容农场（doorwinwindows）、一条论坛帖（mrmoneymustache）、
零售商产品页（diy.com 的 Eurom 配件页）——没有一篇针对 tilt-and-turn 的完整指南。可赢。

加固动作：
- 内容扩到覆盖三种方案的对比表：布艺密封套件（Klett 魔术贴）、亚克力/Plexiglas 板开孔、
  Eurom Window Way-Out 型转接件；每种给 Amazon 商品卡。
- 补实拍/示意图与 step-by-step（SERP 上现有内容全是无图长文）。
- 加 FAQPage 结构化数据（"can you use a portable AC with tilt and turn windows" 类问句）。
- 从首页和德语姊妹页内链过来。

**② /en/guide/best-portable-air-conditioner-europe-heatwave —— 排名 9.25（合并变体后更高）**

P0-1 的规范化本身就是对这个页面最大的加固；再补 2026 热浪时效性更新和商品价格刷新。

**德语对应词也已有排名**："fensterabdichtung klimaanlage kippfenster anleitung" 排 24、
"fenster abdichten klimaanlage kippfenster" 排 53。德语 SERP 有专业对手
（klimaanlagen-guru.de、deutsche-thermo.de、hausjournal.net），但也证明这个细分市场
有真实搜索量和联盟价值。klimaanlage-kippfenster 页按上面同样方式加固。

## P1-2 · hreflang 与内链

- 德/英同主题页面互相声明 `hreflang="de"` / `hreflang="en"`（当前 GSC 表现看两个语言版本
  在各自市场独立竞争，没有互相加持）。
- GA4 能看到但 GSC 零展示的德语页（klimaanlage-stromkosten、homeoffice-buero-kuehlen、
  bei-hitze-schlafen、klimaanlage-vs-luftkuehler）：在 GSC URL 检查工具里确认收录状态，
  未收录的排查 sitemap 与内链孤岛。

## P2 · 流量真实性

61 次会话中 59 次 direct、平均 3.6 秒、全部落在首页——与搜索点击落在指南页的行为矛盾，
基本确认是爬虫/监控流量。动作：GA4 定义内部流量过滤；对照托管方访问日志确认来源；
之后所有复盘以"自然搜索点击 + 指南页会话"为真实基线，忽略首页 direct 噪声。

## 验收指标（下一轮 revenue round 对照）

| 指标 | 当前（30 天） | 目标 |
|---|---|---|
| 收录 URL 变体 | 每页最多 4 种 | 每页 1 种规范 URL |
| tilt-and-turn 页排名 | 11 | ≤ 8 |
| 自然搜索点击 | 1 | ≥ 20 |
| affiliate_click（设为关键事件后） | 1 | ≥ 10，且可归因到页面 |

季节提醒：北半球制冷季顶峰就在当下，P0/P1 应在 7 月内完成，8 月后窗口关闭，
届时应转向常青词（BTU 计算、Stromkosten）而非热浪时效词。
