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
    // Same host list as tools/fleet/ai_referrals.py; cached an hour at the edge.
    if (url.pathname === "/api/pulse" && request.method === "GET") {
      const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" };
      if (!env.EV) return new Response(JSON.stringify({ ok: false, error: "no_db" }), { status: 503, headers });
      try {
        const q = await env.EV.prepare(
          "SELECT '_total' AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') UNION ALL SELECT ref_host AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') AND (ref_host LIKE '%chatgpt%' OR ref_host LIKE '%chat.openai%' OR ref_host LIKE '%perplexity%' OR ref_host LIKE '%claude.ai%' OR ref_host LIKE '%copilot%' OR ref_host LIKE '%gemini.google%' OR ref_host LIKE '%you.com%' OR ref_host LIKE '%kagi%' OR ref_host LIKE '%poe.com%' OR ref_host LIKE '%mistral%' OR ref_host LIKE '%deepseek%' OR ref_host LIKE '%kimi%' OR ref_host LIKE '%doubao%' OR ref_host LIKE '%yiyan%' OR ref_host LIKE '%metaso%') GROUP BY ref_host ORDER BY n DESC"
        ).all();
        let human_pv = 0; const by_host = {};
        for (const r of (q.results || [])) {
          if (r.host === "_total") human_pv = r.n | 0; else if (r.host) by_host[r.host] = r.n | 0;
        }
        const ai_ref = Object.values(by_host).reduce((a, b) => a + b, 0);
        return new Response(JSON.stringify({ ok: true, days: 28, human_pv, ai_ref, by_host, generated: new Date().toISOString() }), { headers });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "query_failed" }), { status: 500, headers });
      }
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
