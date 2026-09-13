// buysomething(SourceRadar)worker:静态资产透传 + /e 事件白名单 + 服务端 pageview。
// 舰队模式(同 gridlings/gamesledger):所有 D1 写都 try/catch + waitUntil,埋点永不 500 页面。
const ALLOWED = new Set(["pick_open", "calc_use", "out_click", "search_use"]);

function uaClass(ua) {
  if (!ua) return "none";
  if (/bot|crawler|spider|slurp|scrap|crawl|fetch|monitor|uptime|lighthouse|pagespeed|preview|headless|phantom|selenium|puppeteer|playwright|curl|wget|python|java|go-http|okhttp|libwww|httpclient|http-client|axios|node-fetch|undici|^node$|^node\/|feed|rss|validator|archive|semrush|ahrefs|dataforseo|mj12|dotbot|bytespider|petalbot|applebot|amazonbot|facebookexternalhit|embedly|gptbot|chatgpt|oai-search|claude|perplexity|ccbot|google-extended|panscient|censys|inspect|shodan|expanse|masscan|zgrab|scan|probe/i.test(ua)) return "bot";
  if (/mozilla/i.test(ua)) return "human";
  return "other";
}

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

async function logRow(env, ctx, row) {
  if (!env.EV) return;
  ctx.waitUntil((async () => {
    try {
      await env.EV.prepare(
        "INSERT INTO ev (day, ts, name, label, value, path, ref, ua_class, country) VALUES (date('now'), datetime('now'), ?, ?, ?, ?, ?, ?, ?)"
      ).bind(row.name, row.label || "", row.value | 0, row.path || "", row.ref || "", row.ua_class || "", row.country || "").run();
    } catch (e) { /* analytics must never break the site */ }
  })());
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
        const b = await request.json();
        if (sameOrigin && ALLOWED.has(b.n)) {
          await logRow(env, ctx, {
            name: b.n,
            label: String(b.l || "").slice(0, 80),
            value: b.v | 0,
            path: String(b.p || "").slice(0, 80),
            ref: (request.headers.get("referer") || "").slice(0, 120),
            ua_class: "human",
            country: request.cf && request.cf.country || ""
          });
        }
      } catch (e) { /* ignore malformed */ }
      return new Response("ok", { headers: { "access-control-allow-origin": "*" } });
    }

    if (url.pathname === "/subscribe" && request.method === "POST") {
      // V1 newsletter funnel per docs/STRATEGY.md. NO-API mode (fleet-wide):
      // the address lands in D1 first; there is no mail-sending capability, so
      // the on-page promise must stay "one send when the next radar lands",
      // pasted manually by the owner. status='stored' is the NORMAL state.
      try {
        const b = await request.json();
        const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { "content-type": "application/json" } });
        }
        if (env.EV) {
          await env.EV.prepare("INSERT OR IGNORE INTO subs (email, day, ref) VALUES (?, date('now'), ?)")
            .bind(email, (request.headers.get("referer") || "").slice(0, 120)).run();
        }
        await logRow(env, ctx, { name: "sub_ok", label: "sourceradar", value: 0, path: "/subscribe", ref: "", ua_class: "human", country: request.cf && request.cf.country || "" });
        return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { "content-type": "application/json" } });
      }
    }

    // Reader-heat feed for the self-evolution sort (replaces the CI bake,
    // which needed a D1-read token the deploy credential does not have).
    // Worker reads its own EV binding — zero external credentials involved.
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
          "SELECT '_total' AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') UNION ALL SELECT ref AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') AND (ref LIKE '%chatgpt%' OR ref LIKE '%chat.openai%' OR ref LIKE '%perplexity%' OR ref LIKE '%claude.ai%' OR ref LIKE '%copilot%' OR ref LIKE '%gemini.google%' OR ref LIKE '%you.com%' OR ref LIKE '%kagi%' OR ref LIKE '%poe.com%' OR ref LIKE '%mistral%' OR ref LIKE '%deepseek%' OR ref LIKE '%kimi%' OR ref LIKE '%doubao%' OR ref LIKE '%yiyan%' OR ref LIKE '%metaso%') GROUP BY ref ORDER BY n DESC"
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

    if (url.pathname === "/api/pop" && request.method === "GET") {
      const headers = { "content-type": "application/json", "cache-control": "public, max-age=3600" };
      try {
        const q = await env.EV.prepare(
          "SELECT label, SUM(name='pick_open') o, SUM(name='out_click') x FROM ev " +
          "WHERE name IN ('pick_open','out_click') AND ts > datetime('now','-28 days') " +
          "AND label != '' GROUP BY label"
        ).all();
        const picks = {};
        for (const r of q.results) picks[r.label] = { o: r.o | 0, x: r.x | 0 };
        return new Response(JSON.stringify({ days: 28, picks }), { headers });
      } catch (e) {
        return new Response('{"days":28,"picks":{},"degraded":true}', { headers });
      }
    }

    let res = await env.ASSETS.fetch(request);
    const accept = request.headers.get("accept") || "";
    // Static css/js get a day of edge/browser cache; JSON (trends.json/rising.json
    // refresh daily at 05:20 UTC) only 10 minutes so a reader never sees a day-old
    // trend badge; HTML stays uncached so content changes are visible immediately.
    const ctype = res.headers.get("content-type") || "";
    if (res.status === 200 && !ctype.includes("text/html")) {
      res = new Response(res.body, res);
      res.headers.set("cache-control", ctype.includes("json") ? "public, max-age=600" : "public, max-age=86400");
    }
    if (request.method === "GET" && accept.includes("text/html") && res.status === 200) {
      const pvUa = request.headers.get("user-agent") || "";
      const pvCls = uaClass(pvUa);
      auditUa(env, ctx, pvUa, pvCls);
      await logRow(env, ctx, {
        name: "page_view",
        label: "",
        value: 0,
        path: url.pathname.slice(0, 80),
        ref: (request.headers.get("referer") || "").slice(0, 120),
        ua_class: pvCls,
        country: request.cf && request.cf.country || ""
      });
    }
    return res;
  }
};
