// 学什么 worker:静态资产 + /e 白名单事件 + 服务端 page_view + ua_audit + /api/pulse。
// 舰队铁律:每次 D1 写都 try/catch + waitUntil,统计永远不能 500 站点。表名带前缀 l——本站与 after35 共用一个 D1 库
// (账号 10 库上限),两站的行永远不混在同一张表里。
const ALLOWED = new Set(["page_view", "tool_result", "bridge_click", "resource_click", "share_click", "faq_open"]);
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady || !db) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS lev (day TEXT, ts TEXT, name TEXT, label TEXT, value INTEGER, path TEXT, ref TEXT, ua_class TEXT, country TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS lua_audit (day TEXT, ua_prefix TEXT, ua_class TEXT, hits INTEGER, PRIMARY KEY (day, ua_prefix, ua_class))"),
  ]);
  schemaReady = true;
}
function uaClass(ua) {
  if (!ua) return "none";
  if (/bot|crawler|spider|slurp|scrap|crawl|fetch|monitor|uptime|lighthouse|pagespeed|preview|headless|phantom|selenium|puppeteer|playwright|curl|wget|python|java|go-http|okhttp|libwww|httpclient|http-client|axios|node-fetch|undici|^node$|^node\/|feed|rss|validator|archive|semrush|ahrefs|dataforseo|mj12|dotbot|bytespider|petalbot|applebot|amazonbot|facebookexternalhit|embedly|gptbot|chatgpt|oai-search|claude|perplexity|ccbot|google-extended|panscient|censys|inspect|shodan|expanse|masscan|zgrab|scan|probe/i.test(ua)) return "bot";
  if (/mozilla/i.test(ua)) return "human";
  return "other";
}
function auditUa(env, ctx, ua, cls) {
  if (!env.EV) return;
  ctx.waitUntil((async () => { try { await ensureSchema(env.EV); await env.EV.prepare("INSERT INTO lua_audit (day, ua_prefix, ua_class, hits) VALUES (date('now'), ?, ?, 1) ON CONFLICT(day, ua_prefix, ua_class) DO UPDATE SET hits = hits + 1").bind((ua || "").slice(0, 48) || "(none)", cls).run(); } catch (e) {} })());
}
function logRow(env, ctx, row) {
  if (row && row.ci) return;
  if (!env.EV) return;
  ctx.waitUntil((async () => {
    try {
      await ensureSchema(env.EV);
      await env.EV.prepare("INSERT INTO lev (day, ts, name, label, value, path, ref, ua_class, country) VALUES (date('now'), datetime('now'), ?, ?, ?, ?, ?, ?, ?)")
        .bind(row.name, row.label || "", row.value | 0, row.path || "", row.ref || "", row.ua_class || "", row.country || "").run();
    } catch (e) { /* analytics must never break the site */ }
  })());
}
const JSONH = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" };
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url); const p = url.pathname; const ci = url.searchParams.get("ci") === "1";
    if (p === "/e" && request.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST", "access-control-allow-headers": "content-type" } });
    if (p === "/e" && request.method === "POST") {
      try { const b = await request.json(); if (ALLOWED.has(b.n)) logRow(env, ctx, { name: b.n, label: String(b.l || "").slice(0, 80), path: String(b.p || "").slice(0, 80), ref: (request.headers.get("referer") || "").slice(0, 120), ua_class: "js", country: (request.cf && request.cf.country) || "" }); } catch (e) {}
      return new Response("ok", { headers: { "access-control-allow-origin": "*" } });
    }
    if (p === "/api/pulse" && request.method === "GET") {
      const headers = { ...JSONH, "cache-control": "public, max-age=3600" };
      if (!env.EV) return new Response(JSON.stringify({ ok: false, error: "no_db" }), { status: 503, headers });
      try {
        await ensureSchema(env.EV);
        const q = await env.EV.prepare("SELECT '_total' AS host, COUNT(*) AS n FROM lev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') UNION ALL SELECT ref AS host, COUNT(*) AS n FROM lev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') AND (ref LIKE '%chatgpt%' OR ref LIKE '%chat.openai%' OR ref LIKE '%perplexity%' OR ref LIKE '%claude.ai%' OR ref LIKE '%copilot%' OR ref LIKE '%gemini.google%' OR ref LIKE '%you.com%' OR ref LIKE '%kagi%' OR ref LIKE '%poe.com%' OR ref LIKE '%mistral%' OR ref LIKE '%deepseek%' OR ref LIKE '%kimi%' OR ref LIKE '%doubao%' OR ref LIKE '%yiyan%' OR ref LIKE '%metaso%') GROUP BY ref ORDER BY n DESC").all();
        let human_pv = 0; const by_host = {};
        for (const r of (q.results || [])) { if (r.host === "_total") human_pv = r.n | 0; else if (r.host) by_host[r.host] = r.n | 0; }
        const ai_ref = Object.values(by_host).reduce((a, b) => a + b, 0);
        return new Response(JSON.stringify({ ok: true, days: 28, human_pv, ai_ref, by_host, generated: new Date().toISOString() }), { headers });
      } catch (e) { return new Response(JSON.stringify({ ok: false, error: "query_failed" }), { status: 500, headers }); }
    }
    const res = await env.ASSETS.fetch(request);
    if (request.method === "GET" && res.status === 200) {
      const type = res.headers.get("content-type") || "";
      if (type.includes("text/html") || ["/llms.txt", "/llms-full.txt", "/sitemap.xml"].includes(p) || p.endsWith(".md")) {
        const ua = request.headers.get("user-agent") || ""; const cls = uaClass(ua);
        if (!ci) auditUa(env, ctx, ua, cls);
        logRow(env, ctx, { ci, name: "page_view", path: p.slice(0, 80), ref: (request.headers.get("referer") || "").slice(0, 120), ua_class: cls, country: (request.cf && request.cf.country) || "" });
      }
    }
    return res;
  },
};
