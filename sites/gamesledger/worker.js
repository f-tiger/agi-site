// gamesledger worker:静态资产 + /api/live 实时代理 + /badge SVG + D1 转化埋点。
// 埋点铁律(与 agi 同):写库全部 try/catch + waitUntil,绝不允许把站点打到 500。
const STEAM = "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=";
const ALLOWED = new Set(["quiz_start", "quiz_done", "live_check", "subscribe_click", "embed_copy", "share_click"]);
const BOT = /bot|crawler|spider|slurp|scrap|crawl|fetch|monitor|uptime|lighthouse|pagespeed|preview|headless|phantom|selenium|puppeteer|playwright|curl|wget|python|java|go-http|okhttp|libwww|httpclient|http-client|axios|node-fetch|undici|^node$|^node\/|feed|rss|validator|archive|semrush|ahrefs|dataforseo|mj12|dotbot|bytespider|petalbot|applebot|amazonbot|facebookexternalhit|embedly|gptbot|chatgpt|oai-search|claude|perplexity|ccbot|google-extended|panscient|censys|inspect|shodan|expanse|masscan|zgrab|scan|probe/i;

// UA 家族留痕(2026-09-12 舰队进化,从 agiscorecard 移植)。只存 UA 前 48 字符 + 分类 + 计数;
// 不存完整 UA、不存 IP、不存任何能指到个人的东西。用途只有一个:像 09-12 那次一样,事后能回答
// 「这 288 次 human 到底是谁」,而不是猜。此前只有 agi 留这个痕,同一只探针在这里会以「增长」入日报。
// 写失败静默——统计永远不能影响访问;表由 CREATE TABLE IF NOT EXISTS 幂等建好,缺表也只是丢审计行。
function auditUa(env, ctx, ua, cls) {
  const db = env.EV;
  if (!db) return;
  const p = db.prepare(
    "INSERT INTO ua_audit (day, ua_prefix, ua_class, hits) VALUES (date('now'), ?, ?, 1)" +
    " ON CONFLICT(day, ua_prefix, ua_class) DO UPDATE SET hits = hits + 1"
  ).bind((ua || "").slice(0, 48) || "(none)", cls).run().catch(() => {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
}

function log(env, ctx, req, name, location, label) {
  try {
    const ua = req.headers.get("user-agent") || "";
    const url = new URL(req.url);
    const ref = req.headers.get("referer");
    let refHost = null;
    try { if (ref) refHost = new URL(ref).hostname; } catch (e) {}
    const stmt = env.EV.prepare(
      "INSERT INTO ev (ts, day, name, location, label, path, ref_host, country, ua_class) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(Date.now(), new Date().toISOString().slice(0, 10), name, location || null,
            (label || "").slice(0, 80) || null, url.pathname.slice(0, 120), refHost,
            (req.cf && req.cf.country) || null, BOT.test(ua) ? "bot" : "human");
    ctx.waitUntil(stmt.run().catch(() => {}));
    if (name === "page_view") auditUa(env, ctx, ua, BOT.test(ua) ? "bot" : "human");
  } catch (e) {}
}

// AI 助手引荐主机(与原 /api/pulse SQL 里的 15 个 LIKE 子串逐字相同,改在 JS 里匹配同一结果集)。
const AI_REF = /chatgpt|chat\.openai|perplexity|claude\.ai|copilot|gemini\.google|you\.com|kagi|poe\.com|mistral|deepseek|kimi|doubao|yiyan|metaso/i;
// D1 读预算(2026-09-25 事故:免费档每日 500 万行读取被打满,全舰队 D1 读失败到午夜)。
// 聚合端点从 Cache API 出,按 URL + 部署版本做键,TTL 秒;错误响应永不入缓存。
// 此前的 `cache-control: public, max-age=3600` 只对浏览器有效——Cloudflare 不会仅凭它缓存 Worker 响应,
// 每次轮询都重跑全部扫描。本地单测没有 caches 全局,直接算。
async function cachedJson(request, env, ctx, ttl, compute, params = []) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (!cache) return compute();
  const u = new URL(request.url);
  const version = (env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id) || env.CF_PAGES_COMMIT_SHA || "dev";
  const qs = params.map((p) => p + "=" + encodeURIComponent(u.searchParams.get(p) || "")).join("&");
  const key = new Request(u.origin + u.pathname + "?v=" + encodeURIComponent(version) + (qs ? "&" + qs : ""), { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = await compute();
  if (res.ok && res.headers.get("cache-control") !== "no-store") {
    const stored = new Response(res.clone().body, res);
    stored.headers.set("cache-control", "public, max-age=" + ttl);
    stored.headers.set("x-fleet-cache", "store");
    if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, stored)); else await cache.put(key, stored);
  }
  return res;
}
// 引荐来源分类(2026-09-15「舰队相互学习」):tools/fleet/ref_sources.txt 是唯一权威,
// 每个 worker 里的字面量必须与它逐字相同——check_ref_sources.py 挂在 fleet-heartbeat 上断言,
// 漂了就走 GitHub 失败邮件。教训与 bot_ua.txt 同源:各自演化的分类器 = 各站台账不可比。
// 读的是已入库的来源域名,出的仍是聚合计数:无路径、无国家、无 UA、无行级数据。
const REF_SRC = "self:pages.dev|workers.dev;;ai:chatgpt|chat.openai|perplexity|claude.ai|copilot.microsoft|copilot.cloud.microsoft|copilot|gemini.google|you.com|kagi|poe.com|mistral|deepseek|kimi|doubao|yiyan.baidu|yiyan|metaso|phind|felo.ai|genspark|monica.im|tiangong|chatglm|moonshot;;search:google.|bing.|duckduckgo|search.yahoo|yahoo.co|ecosia|yandex|baidu.|sogou|so.com|startpage|brave.com|qwant|naver|seznam|petalsearch|mojeek|lycos|ask.com;;fleet:agiscorecard.com|getecoback.com|baipiaoji.com|thedollscout.com;;social:t.co|twitter.com|x.com|reddit.com|facebook|instagram|linkedin|lnkd.in|news.ycombinator|producthunt|weibo|zhihu|douban|xiaohongshu|telegram|t.me|pinterest|youtube|tiktok|douyin|discord|substack|medium.com|tumblr|vk.com|line.me|whatsapp|quora|mastodon|bsky";
const srcHost = (r) => {
  let h = String(r == null ? "" : r).trim().toLowerCase();
  if (!h) return "";
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  h = h.split("/")[0].split("?")[0].split("#")[0].split("@").pop().split(":")[0];
  return h.replace(/^www\./, "");
};
// self 只认完全相同的主机名:play.agiscorecard.com 对主域是兄弟站(fleet),不是自己。
const srcBucket = (host, self) => {
  if (!host) return "direct";
  if (self && host === self) return "self";
  // 标签对齐 + 尾部只许 TLD 段。两个方向的错都真发生过:裸 includes 会把 netflix.com
  // 判成 x.com(social);只做前缀对齐又会把 agiscorecard.com.spam.example 判成 fleet
  // ——那正是引荐垃圾的常见形状。
  const tld = (rest) => rest === "" || rest.split(".").every((l) => l.length > 0 && l.length <= 4 && /^[a-z]+$/.test(l));
  const dotted = "." + host;
  for (const grp of REF_SRC.split(";;")) {
    const i = grp.indexOf(":");
    for (const t of grp.slice(i + 1).split("|")) {
      if (!t) continue;
      const at = dotted.indexOf("." + t);
      if (at < 0) continue;
      let rest = dotted.slice(at + t.length + 1);
      if (rest.startsWith(".")) rest = rest.slice(1);
      if (tld(rest)) return grp.slice(0, i);
    }
  }
  return "other";
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/e" && request.method === "POST") {
      // Cross-origin POSTs are answered but never written: sendBeacon sends an
      // Origin header, and same-site beacons match the request host.
      const origin = request.headers.get("origin");
      let sameOrigin = true;
      if (origin) {
        try { sameOrigin = new URL(origin).hostname === url.hostname; } catch (e) { sameOrigin = false; }
      }
      try {
        const d = await request.json();
        if (sameOrigin && ALLOWED.has(d.n)) log(env, ctx, request, d.n, d.l, d.b);
      } catch (e) {}
      return new Response("ok", { status: 202 });
    }

    // /api/pulse (2026-09-13, fleet "AI 时代的站点" flywheel read-side): 28-day human page
    // views and how many arrived from an AI assistant, by referrer host. Aggregate counts
    // only — no paths, no countries, no UA, no row-level data. Worker reads its own D1
    // binding, so the fleet heartbeat needs no token (the repo's tokens lack D1 read).
    // Same host list as tools/fleet/ai_referrals.py.
    // D1 读预算(2026-09-26):此前同一个 28 天窗口扫三遍(`_total` + AI 主机 UNION,再 GROUP BY ref_host 一遍),
    // 现在只跑一次 GROUP BY ref_host,三组数从同一结果集派生:human_pv = 各组 n 之和,AI 主机按 AI_REF 匹配,
    // 渠道构成按 tools/fleet/ref_sources.txt 分桶——每个数字与原来逐个相同。响应经 cachedJson 缓存 1 小时。
    // sum(by_source) 应等于 human_pv —— 对不上就是有站把 ref 存成了整条 URL 或分类器漂了,读侧 traffic_sources.py 会把差额打出来。
    if (url.pathname === "/api/pulse" && request.method === "GET") {
      const errH = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
      if (!env.EV) return new Response(JSON.stringify({ ok: false, error: "no_db" }), { status: 503, headers: errH });
      return cachedJson(request, env, ctx, 3600, async () => {
        try {
          const q = await env.EV.prepare(
            "SELECT ref_host AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') GROUP BY ref_host ORDER BY n DESC"
          ).all();
          const self_host = srcHost(url.hostname);
          let human_pv = 0; const by_host = {};
          const by_source = { search: 0, ai: 0, fleet: 0, social: 0, self: 0, direct: 0, other: 0 };
          const by_search = {}; const by_fleet = {}; const by_other = {};
          for (const r of (q.results || [])) {
            const n = r.n | 0; human_pv += n;
            if (r.host && AI_REF.test(String(r.host))) by_host[r.host] = n;
            const h = srcHost(r.host); const b = srcBucket(h, self_host);
            by_source[b] += n;
            if (b === "search") by_search[h] = (by_search[h] || 0) + n;
            else if (b === "fleet") by_fleet[h] = (by_fleet[h] || 0) + n;
            // by_other = 既不是搜索/AI/社交/兄弟站/本站的来源域 —— 真的有人从别处链过来。
            // 这是舰队第一方的外链监测:嵌入件、目录页、awesome-list 里的链接,送来过真人就出现在这里。
            else if (b === "other") by_other[h] = (by_other[h] || 0) + n;
          }
          const ai_ref = Object.values(by_host).reduce((a, b) => a + b, 0);
          return new Response(JSON.stringify({ ok: true, days: 28, human_pv, ai_ref, by_host, by_source, by_search, by_fleet, by_other, generated: new Date().toISOString() }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" } });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: "query_failed" }), { status: 500, headers: errH });
        }
      });
    }

    if (url.pathname === "/api/live") {
      const app = url.searchParams.get("app") || "";
      if (!/^\d{1,8}$/.test(app)) {
        return new Response(JSON.stringify({ ok: false, error: "bad appid" }),
          { status: 400, headers: { "content-type": "application/json" } });
      }
      log(env, ctx, request, "live_check", "api", app);
      const cache = caches.default;
      const key = new Request(url.origin + "/api/live?app=" + app);
      let res = await cache.match(key);
      if (res) return res;
      try {
        const r = await fetch(STEAM + app, { headers: { "User-Agent": "gamesledger-live/1.0" }, signal: AbortSignal.timeout(8000) });
        const d = await r.json();
        const resp = d && d.response;
        const body = (resp && resp.result === 1)
          ? { ok: true, appid: +app, n: resp.player_count, t: new Date().toISOString().slice(0, 16) + "Z" }
          : { ok: false, error: "no official number for this appid" };
        res = new Response(JSON.stringify(body), {
          status: body.ok ? 200 : 404,
          headers: { "content-type": "application/json", "cache-control": "public, max-age=120" },
        });
        ctx.waitUntil(cache.put(key, res.clone()).catch(() => {}));
        return res;
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "steam unreachable" }),
          { status: 502, headers: { "content-type": "application/json" } });
      }
    }

    const bm = url.pathname.match(/^\/badge\/(\d{1,8})\.svg$/);
    if (bm) {
      const app = bm[1];
      // 2026-09-04: was logged as embed_copy (≈ pageviews of the badge, not embeds); now its own name.
      log(env, ctx, request, "badge_serve", "badge", app);
      const cache = caches.default;
      const key = new Request(url.origin + "/badge/" + app + ".svg");
      let res = await cache.match(key);
      if (res) return res;
      let label = "no official number";
      try {
        const r = await fetch(STEAM + app, { headers: { "User-Agent": "gamesledger-badge/1.0" }, signal: AbortSignal.timeout(8000) });
        const d = await r.json();
        if (d && d.response && d.response.result === 1) label = d.response.player_count.toLocaleString("en-US") + " in-game";
      } catch (e) {}
      const text = label + " · Steam official";
      const w = 120 + text.length * 7;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="26" role="img" aria-label="${text}">` +
        `<title>live via games.agiscorecard.com</title>` +
        `<rect width="${w}" height="26" rx="5" fill="#0b0c0e"/>` +
        `<circle cx="14" cy="13" r="4" fill="#41d18f"/>` +
        `<text x="26" y="17" font-family="Verdana,sans-serif" font-size="12" fill="#e8e9ec">${text}</text>` +
        `<text x="${w - 8}" y="17" text-anchor="end" font-family="Verdana,sans-serif" font-size="9" fill="#9aa1ad">games ledger</text></svg>`;
      res = new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=600" } });
      ctx.waitUntil(cache.put(key, res.clone()).catch(() => {}));
      return res;
    }

    // 服务端 pageview(HTML 导航请求;JSON/SVG/txt 数据面不计)——JS 关闭者与 AI 爬虫也被如实计数
    const res = await env.ASSETS.fetch(request);
    const accept = request.headers.get("accept") || "";
    if (request.method === "GET" && accept.includes("text/html") && res.status === 200) {
      log(env, ctx, request, "page_view", null, null);
    }
    return res;
  },
};
