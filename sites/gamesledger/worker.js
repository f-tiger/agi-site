// gamesledger worker:静态资产 + /api/live 实时代理 + /badge SVG + D1 转化埋点。
// 埋点铁律(与 agi 同):写库全部 try/catch + waitUntil,绝不允许把站点打到 500。
const STEAM = "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=";
const ALLOWED = new Set(["quiz_start", "quiz_done", "live_check", "subscribe_click", "embed_copy", "share_click"]);
const BOT = /bot|crawl|spider|slurp|fetch|gpt|claude|perplexi|curl|python|wget|headless/i;

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
  } catch (e) {}
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/e" && request.method === "POST") {
      try {
        const d = await request.json();
        if (ALLOWED.has(d.n)) log(env, ctx, request, d.n, d.l, d.b);
      } catch (e) {}
      return new Response("ok", { status: 202 });
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
        const r = await fetch(STEAM + app, { headers: { "User-Agent": "gamesledger-live/1.0" } });
        const d = await r.json();
        const resp = d && d.response;
        const body = (resp && resp.result === 1)
          ? { ok: true, appid: +app, n: resp.player_count, t: new Date().toISOString().slice(0, 16) + "Z" }
          : { ok: false, error: "no official number for this appid" };
        res = new Response(JSON.stringify(body), {
          status: body.ok ? 200 : 404,
          headers: { "content-type": "application/json", "cache-control": "public, max-age=120" },
        });
        ctx.waitUntil(cache.put(key, res.clone()));
        return res;
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "steam unreachable" }),
          { status: 502, headers: { "content-type": "application/json" } });
      }
    }

    const bm = url.pathname.match(/^\/badge\/(\d{1,8})\.svg$/);
    if (bm) {
      const app = bm[1];
      log(env, ctx, request, "embed_copy", "badge_serve", app);
      const cache = caches.default;
      const key = new Request(url.origin + "/badge/" + app + ".svg");
      let res = await cache.match(key);
      if (res) return res;
      let label = "no official number";
      try {
        const r = await fetch(STEAM + app, { headers: { "User-Agent": "gamesledger-badge/1.0" } });
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
      ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    }

    // 服务端 pageview(HTML 导航请求;JSON/SVG/txt 数据面不计)——JS 关闭者与 AI 爬虫也被如实计数
    const accept = request.headers.get("accept") || "";
    if (request.method === "GET" && accept.includes("text/html")) {
      log(env, ctx, request, "page_view", null, null);
    }
    return env.ASSETS.fetch(request);
  },
};
