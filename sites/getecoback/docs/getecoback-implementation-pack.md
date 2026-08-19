> ⚠️ 2026-07-11 更新：本文写于找到站点源码之前。源码现已并入本仓库（site/ + wrangler.jsonc），
> 301 规范化已按“裸域 + .html”方向实施于 src/worker.js 并接入 CI 健康检查；
> 本文其余内容（披露、商品卡、hreflang）经审计确认站点已具备，保留作参考。

# getecoback.com 实施包（Cloudflare Worker "ecoback" 可直接套用）

> 站点为 Cloudflare Worker（脚本名 ecoback，账号内可见）。以下代码按 Worker
> fetch handler 形态给出；拿到源码仓库后按现有结构对号入座。
> 规范域按 `https://www.getecoback.com` + 无 .html 后缀设定；如站点实际以裸域为主，
> 把方向反过来即可，关键是**只留一种**。

## 1. URL 规范化中间件（放在 fetch handler 最前面）

```js
function canonicalRedirect(request) {
  const url = new URL(request.url);
  let changed = false;

  // http -> https（Worker 后面到不了这步的话，在 Cloudflare 开 Always Use HTTPS 也行）
  if (url.protocol === 'http:') { url.protocol = 'https:'; changed = true; }

  // 裸域 -> www
  if (url.hostname === 'getecoback.com') { url.hostname = 'www.getecoback.com'; changed = true; }

  // 去 .html 后缀
  if (url.pathname.endsWith('.html')) {
    url.pathname = url.pathname.slice(0, -5);
    changed = true;
  }

  // 去尾部斜杠（首页除外）
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
    changed = true;
  }

  return changed ? Response.redirect(url.toString(), 301) : null;
}

// fetch handler 里：
// const redirect = canonicalRedirect(request);
// if (redirect) return redirect;
```

## 2. 每页 head 模板（canonical + hreflang）

德英对照页互指，未配对的页面只输出 canonical 和 x-default：

```html
<link rel="canonical" href="https://www.getecoback.com{PATH}">
<!-- 有语言对照时： -->
<link rel="alternate" hreflang="de" href="https://www.getecoback.com/guide/klimaanlage-kippfenster">
<link rel="alternate" hreflang="en" href="https://www.getecoback.com/en/guide/portable-ac-tilt-and-turn-windows">
<link rel="alternate" hreflang="x-default" href="https://www.getecoback.com/en/guide/portable-ac-tilt-and-turn-windows">
```

已知语言配对（按现有页面推断，实施时核对）：

| 德语 | 英语 |
|---|---|
| /guide/klimaanlage-kippfenster | /en/guide/portable-ac-tilt-and-turn-windows |
| /guide/zimmer-kuehlen-ohne-installation | /en/guide/best-portable-air-conditioner-europe-heatwave |
| /guide/klimaanlage-vs-luftkuehler | /en/guide/portable-ac-vs-air-cooler |
| /guide/bei-hitze-schlafen | /en/guide/how-to-sleep-in-a-heatwave-without-ac |

## 3. 合规披露组件（每个含联盟链接页面的首屏或首个商品卡上方）

```html
<p class="affiliate-disclosure">
  <!-- 德语页 -->
  Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.
  Diese Seite enthält Affiliate-Links.
</p>
<p class="affiliate-disclosure">
  <!-- 英语页 -->
  As an Amazon Associate, I earn from qualifying purchases.
  This page contains affiliate links.
</p>
```

要求：正文可见（非页脚/弹窗）、字号不小于正文 80%、位于第一个联盟链接之前。

## 4. 商品卡（直链 + GA4 事件，不准用短链/中转）

```html
<a class="product-card"
   href="https://www.amazon.de/dp/{ASIN}?tag={ASSOCIATE_TAG}"
   target="_blank" rel="sponsored noopener"
   onclick="gtag('event','affiliate_click',{item_id:'{ASIN}',page_path:location.pathname,position:'{SLOT}'})">
  <span class="product-name">{商品名}</span>
  <span class="product-cta">Aktuellen Preis auf Amazon prüfen →</span>
  <!-- 英语页 CTA: Check current price on Amazon → -->
</a>
```

- `rel="sponsored"`：Google 对付费链接的要求，缺了影响 SEO 评估
- 不写死价格；如要显示价格必须走 PA-API 实时取
- 英语页访客多在德国境外：接 Amazon OneLink（Associates 后台开通）或按
  Accept-Language 分发到 amazon.com/amazon.co.uk 对应 ASIN，否则点击无法成交

## 5. GA4 关键事件

GA4 管理界面 → 数据显示 → 事件 → 将 `affiliate_click` 标记为关键事件。
（顺带把 agiscorecard 的 subscribe_click 也标了。）

## 6. tilt-and-turn 主力页加固清单（EN + DE 同步做）

目标词：portable air conditioner for tilt and turn windows（现排名 11）、
fensterabdichtung klimaanlage kippfenster anleitung（现排名 24）。

内容结构（SERP 上没有任何一篇同时做到以下几点）：
1. 30 秒答案框（能/不能 + 三种方案一句话）
2. 三方案对比表：布艺密封套件（Klett）· 亚克力板开孔 · Eurom Window Way-Out 转接件
   —— 每行：适用窗型 / 是否留痕（租房友好）/ 价格档 / 商品卡
3. 分步安装指导（每步一张图，实拍或示意）
4. 常见错误（V 形缝隙漏风、魔术贴脱胶）
5. FAQ schema：

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
 {"@type":"Question","name":"Can you use a portable air conditioner with tilt and turn windows?",
  "acceptedAnswer":{"@type":"Answer","text":"Yes. Use a fabric window seal kit with hook-and-loop fastening, a cut acrylic panel, or a purpose-built tilt-window outlet adapter to vent the exhaust hose without leaving residue."}},
 {"@type":"Question","name":"Does a window seal kit work on tilt-only openings?",
  "acceptedAnswer":{"@type":"Answer","text":"Fabric kits made for Kippfenster cover the V-shaped side gaps of a tilted window. Standard sliding-window kits do not fit."}}
]}
</script>
```

6. 从首页、heatwave 页、BTU 页各加一条内链，锚文本用目标词
7. 德英互挂 hreflang（见第 2 节）

## 7. 验证步骤（改完后）

1. `curl -I http://getecoback.com/en/guide/best-portable-air-conditioner-europe-heatwave.html`
   应一跳 301 到 `https://www.getecoback.com/en/guide/best-portable-air-conditioner-europe-heatwave`
2. GSC URL 检查工具对 4 个旧变体请求重新抓取
3. 重新提交只含规范 URL 的 sitemap.xml
4. GA4 DebugView 里点一次商品卡确认 affiliate_click 带 item_id 参数
