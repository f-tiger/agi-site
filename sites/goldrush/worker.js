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

// /fetchlog.json (2026-09-22): the consumption number is COMPUTED from this worker's own D1 on
// every read, not hand-typed. site/fetchlog.json stays as the template (definitions, history,
// the one number this D1 cannot see) and as the fallback when D1 is unreachable — served with
// live:false so a stale snapshot can never pass as current. Why: the file promised "updated as
// it moves" and then sat at 0 for 22 days while the true count reached 31, and three static
// pages repeated the stale zero to AI readers. The 2026-11-30 adoption line is settled on THIS
// query, so t0 and settlement share one instrument (tools/test_fetchlog.mjs pins it).
// Exclusions, matching the file's definitions: (a) a goldrush referrer = our own registry page
// fetching the file; (b) ?ci=1 rows are never written (logRow drops them); (c) the single
// 2026-08-30 no-UA row was our own MCP server before it learned to tag itself — excluded by
// date+class, nothing wider.
export const FETCHLOG_SQL_CLASSES =
  "SELECT ua_class, COUNT(*) AS n FROM ev WHERE name='page_view' AND path='/claimledger.json'" +
  " AND (ref IS NULL OR ref='' OR ref NOT LIKE '%goldrush.agiscorecard.com%')" +
  " AND NOT (day='2026-08-30' AND ua_class='none') GROUP BY ua_class";
export const FETCHLOG_SQL_EVIDENCE =
  "SELECT name, COUNT(*) AS n FROM ev WHERE name IN ('ledger_click','audit_click','fork_click','grader_use','grader_copy')" +
  " OR (name='ledger_render' AND label NOT LIKE '%goldrush.agiscorecard.com%') GROUP BY name";

export function summarizeFetchlog(template, classRows, evidenceRows, today) {
  const t = template && typeof template === "object" ? template : {};
  const cls = { bot: 0, human: 0, other: 0 };
  for (const r of (Array.isArray(classRows) ? classRows : [])) {
    if (!r || typeof r !== "object") continue;
    const n = Number(r.n) || 0;
    if (r.ua_class === "bot") cls.bot += n;
    else if (r.ua_class === "human") cls.human += n;
    else cls.other += n; // 'other' / 'none' / '' — no browser token and no crawler token
  }
  const ev = { ledger_click: 0, audit_click: 0, fork_click: 0, grader_use: 0, grader_copy: 0, ledger_render: 0 };
  for (const r of (Array.isArray(evidenceRows) ? evidenceRows : [])) {
    if (r && typeof r === "object" && Object.prototype.hasOwnProperty.call(ev, r.name)) ev[r.name] = Number(r.n) || 0;
  }
  const sc = (t.counts && typeof t.counts === "object") ? t.counts : {};
  const se = (t.consumption_evidence && typeof t.consumption_evidence === "object") ? t.consumption_evidence : {};
  const out = Object.assign({}, t);
  out.live = true;
  out.computed_from = "D1 goldrush-events, this worker, on every read (edge-cached 1 h); the static file is only the fallback";
  out.dateModified = today;
  out.counts = {
    ledgers_listed: Number(sc.ledgers_listed) || 0,
    ledgers_validating: Number(sc.ledgers_validating) || 0,
    outside_fetches_of_our_claimledger: cls.bot + cls.human + cls.other,
    outside_fetches_crawler_ua: cls.bot,
    outside_fetches_browser_ua: cls.human,
    outside_fetches_other_ua: cls.other,
    as_of: today,
    period: sc.period || "site lifetime (from 2026-08-29)"
  };
  out.consumption_evidence = {
    ledger_click_lifetime: ev.ledger_click,
    audit_click_lifetime: ev.audit_click,
    fork_click_lifetime: ev.fork_click,
    grader_use_lifetime: ev.grader_use,
    grader_copy_lifetime: ev.grader_copy,
    registry_ledger_render_external: ev.ledger_render,
    mcp_get_claim_ledger_calls_lifetime: (typeof se.mcp_get_claim_ledger_calls_lifetime === "number") ? se.mcp_get_claim_ledger_calls_lifetime : null,
    mcp_calls_note: "counted on agiscorecard's D1, not this one — a session-refreshed snapshot dated static_snapshot_as_of",
    static_snapshot_as_of: sc.as_of || null,
    note: typeof se.note === "string" ? se.note : ""
  };
  return out;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/fetchlog.json" && request.method === "GET") {
      const ci = url.searchParams.get("ci") === "1";
      const pvUa = request.headers.get("user-agent") || "";
      const pvCls = uaClass(pvUa);
      if (!ci) auditUa(env, ctx, pvUa, pvCls);
      logRow(env, ctx, { ci, name: "page_view", path: "/fetchlog.json", ref: (request.headers.get("referer") || "").slice(0, 120), ua_class: pvCls, country: (request.cf && request.cf.country) || "" });
      const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" };
      let template = {};
      try { template = await (await env.ASSETS.fetch(new Request(url.origin + "/fetchlog.json"))).json(); } catch (e) { template = {}; }
      if (!env.EV) return new Response(JSON.stringify(Object.assign({}, template, { live: false, live_error: "no_db" }), null, 2), { headers });
      try {
        const [a, b] = await env.EV.batch([env.EV.prepare(FETCHLOG_SQL_CLASSES), env.EV.prepare(FETCHLOG_SQL_EVIDENCE)]);
        const body = summarizeFetchlog(template, a && a.results, b && b.results, new Date().toISOString().slice(0, 10));
        return new Response(JSON.stringify(body, null, 2), { headers });
      } catch (e) {
        return new Response(JSON.stringify(Object.assign({}, template, { live: false, live_error: "query_failed" }), null, 2), { headers });
      }
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
      if (type.includes("text/html") || ["/ledger.json", "/llms.txt", "/protocol.md", "/agix.md", "/skill/claim-ledger/SKILL.md", "/claimledger.schema.json"].includes(url.pathname)) {
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
