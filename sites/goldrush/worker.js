// goldrush worker: static assets + /e event whitelist + server-side pageview.
// Fleet pattern (same as buysomething/gridlings): every D1 write is try/catch +
// waitUntil — analytics must never be able to 500 the site.
const ALLOWED = new Set(["page_view", "card_view", "ledger_click", "fork_click", "audit_click", "sub_click", "grader_open", "grader_use", "grader_copy", "protocol_copy", "ledger_render"]);

function uaClass(ua) {
  if (!ua) return "none";
  if (/bot|crawler|spider|slurp|scrap|crawl|fetch|monitor|uptime|lighthouse|pagespeed|preview|headless|phantom|selenium|puppeteer|playwright|curl|wget|python|java|go-http|okhttp|libwww|httpclient|http-client|axios|node-fetch|undici|^node$|^node\/|feed|rss|validator|archive|semrush|ahrefs|dataforseo|mj12|dotbot|bytespider|petalbot|applebot|amazonbot|facebookexternalhit|embedly|gptbot|chatgpt|oai-search|claude|perplexity|ccbot|google-extended|panscient|censys|inspect|shodan|expanse|masscan|zgrab|scan|probe/i.test(ua)) return "bot";
  if (/mozilla/i.test(ua)) return "human";
  return "other";
}

// Our own deploy self-check tags itself ?ci=1 so it can never be counted as demand.
// Our registry page fetches /claimledger.json itself, so its referrer is recorded and
// excluded when the consumption number is computed (see /fetchlog.json definitions).
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

function logRow(env, ctx, row) {
  if (row && row.ci) return;
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

    if (url.pathname === "/e" && request.method === "OPTIONS") {
      return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST", "access-control-allow-headers": "content-type" } });
    }
    if (url.pathname === "/e" && request.method === "POST") {
      try {
        const b = await request.json();
        if (ALLOWED.has(b.n)) {
          logRow(env, ctx, {
            name: b.n,
            label: String(b.l || "").slice(0, 80),
            path: String(b.p || "").slice(0, 80),
            ref: (request.headers.get("referer") || "").slice(0, 120),
            ua_class: "js",
            country: (request.cf && request.cf.country) || ""
          });
        }
      } catch (e) { /* ignore malformed */ }
      return new Response("ok", { headers: { "access-control-allow-origin": "*" } });
    }

    // Protocol well-known alias: /claimledger.json serves the ledger with CORS
    // open, per the protocol's own SHOULD — tools and agents read it from anywhere.
    // /.well-known/claimledger.json (RFC 8615) is an alias; root path stays canonical.
    if (url.pathname === "/claimledger.json" || url.pathname === "/.well-known/claimledger.json") {
      const r = await env.ASSETS.fetch(new Request(url.origin + "/ledger.json"));
      const h = new Headers(r.headers);
      h.set("access-control-allow-origin", "*");
      logRow(env, ctx, { ci: url.searchParams.get("ci") === "1", name: "page_view", path: "/claimledger.json", ref: (request.headers.get("referer") || "").slice(0, 120), ua_class: uaClass(request.headers.get("user-agent")), country: (request.cf && request.cf.country) || "" });
      return new Response(r.body, { status: r.status, headers: h });
    }

    const res = await env.ASSETS.fetch(request);
    if (request.method === "GET" && res.status === 200) {
      const type = res.headers.get("content-type") || "";
      if (type.includes("text/html") || ["/ledger.json", "/llms.txt", "/protocol.md", "/agix.md", "/skill/claim-ledger/SKILL.md", "/fetchlog.json", "/claimledger.schema.json"].includes(url.pathname)) {
        const pvUa = request.headers.get("user-agent") || "";
        const pvCls = uaClass(pvUa);
        if (url.searchParams.get("ci") !== "1") auditUa(env, ctx, pvUa, pvCls);
        logRow(env, ctx, {
          ci: url.searchParams.get("ci") === "1",
          name: "page_view",
          path: url.pathname.slice(0, 80),
          ref: (request.headers.get("referer") || "").slice(0, 120),
          ua_class: pvCls,
          country: (request.cf && request.cf.country) || ""
        });
      }
    }
    return res;
  },
};
