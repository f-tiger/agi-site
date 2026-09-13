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

// ── Opportunity packs (2026-09-13, owner: 付费的包 → 营收) ──────────────────────────
// Stripe Payment Link → Stripe webhook here → order row + HMAC token → gated pack JSON.
// Zero PII: we store the Stripe session id, event id, amount and week — never an email.
// Fails closed: without PACK_TOKEN_SECRET / STRIPE_WEBHOOK_SECRET every paid route is 503.
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
function tEqual(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function stripeVerify(secret, header, raw) {
  const parts = Object.fromEntries(String(header || "").split(",").map((p) => p.split("=")).filter((p) => p.length === 2));
  if (!parts.t || !parts.v1) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(parts.t));
  if (!Number.isFinite(age) || age > 300) return false;
  return tEqual(await hmacHex(secret, `${parts.t}.${raw}`), parts.v1);
}
const jsonNoStore = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });
async function ensurePackTable(env) {
  await env.EV.prepare("CREATE TABLE IF NOT EXISTS pack_orders (session TEXT PRIMARY KEY, event_id TEXT, paid_at TEXT, amount TEXT, week TEXT, refunded INTEGER DEFAULT 0)").run();
}
// token = <session>.<hmac(secret, session)>; verified statelessly, then the order row must exist and not be refunded.
async function packToken(env, session) { return `${session}.${await hmacHex(env.PACK_TOKEN_SECRET, session)}`; }
async function packTokenValid(env, token) {
  const i = String(token || "").lastIndexOf(".");
  if (i < 1) return false;
  const session = token.slice(0, i), sig = token.slice(i + 1);
  if (!tEqual(sig, await hmacHex(env.PACK_TOKEN_SECRET, session))) return false;
  const row = await env.EV.prepare("SELECT refunded FROM pack_orders WHERE session = ?").bind(session).first().catch(() => null);
  return !!row && !row.refunded;
}
const PACK_PUBLIC = new Set(["/packs/index.json", "/packs/sample.json"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Beacon truth test (PRD P0-1): the deploy self-check POSTs /e with label "__ci" and reads it back here.
    // Aggregate count only; CI rows are excluded from /api/pop by label below.
    if (url.pathname === "/api/selftest" && request.method === "GET") {
      const label = (url.searchParams.get("label") || "").slice(0, 40);
      if (!label || !env.EV) return jsonNoStore({ ok: false, error: "no label or no db" }, 400);
      try {
        const r = await env.EV.prepare("SELECT COUNT(*) n FROM ev WHERE label = ? AND day >= date('now','-2 days')").bind(label).first();
        return jsonNoStore({ ok: true, label, n: (r && r.n) | 0 });
      } catch (e) { return jsonNoStore({ ok: false, error: "query_failed" }, 500); }
    }

    // Public status for the sales page: is checkout configured, what does it cost, which week is current.
    if (url.pathname === "/api/pack/status" && request.method === "GET") {
      let latest = null;
      try { const r = await env.ASSETS.fetch(new Request(url.origin + "/packs/index.json")); if (r.ok) latest = (await r.json()).latest || null; } catch (e) {}
      return jsonNoStore({ ok: true, configured: !!(env.PACK_PAYMENT_LINK && env.STRIPE_WEBHOOK_SECRET && env.PACK_TOKEN_SECRET),
        payment_link: env.PACK_PAYMENT_LINK || null, price_cents: Number(env.PACK_PRICE_CENTS || 0) || null, currency: env.PACK_CURRENCY || "USD", latest });
    }

    // Stripe → paid. Verified on the raw body; idempotent on session id; amount must match PACK_PRICE_CENTS.
    if (url.pathname === "/api/pack/webhook" && request.method === "POST") {
      if (!env.STRIPE_WEBHOOK_SECRET || !env.PACK_TOKEN_SECRET || !env.EV) return jsonNoStore({ ok: false, code: "not_configured" }, 503);
      const raw = await request.text();
      if (!(await stripeVerify(env.STRIPE_WEBHOOK_SECRET, request.headers.get("Stripe-Signature"), raw).catch(() => false))) return jsonNoStore({ ok: false, code: "badsig" }, 400);
      let ev; try { ev = JSON.parse(raw); } catch (e) { return jsonNoStore({ ok: false, code: "badjson" }, 400); }
      if (ev.type !== "checkout.session.completed") return jsonNoStore({ ok: true, code: "ignored" });
      const so = (ev.data && ev.data.object) || {};
      const session = String(so.id || "").slice(0, 80);
      if (!session) return jsonNoStore({ ok: true, code: "nosession" });
      if (so.payment_status && so.payment_status !== "paid") return jsonNoStore({ ok: true, code: "unpaid" });
      const want = Number(env.PACK_PRICE_CENTS || 0);
      if (want && Number(so.amount_total) !== want) return jsonNoStore({ ok: true, code: "amount_mismatch" });
      try {
        await ensurePackTable(env);
        let week = null;
        try { const r = await env.ASSETS.fetch(new Request(url.origin + "/packs/index.json")); if (r.ok) week = (await r.json()).latest || null; } catch (e) {}
        const amount = so.amount_total != null ? `${so.amount_total} ${String(so.currency || "").toUpperCase()}` : "";
        await env.EV.prepare("INSERT OR IGNORE INTO pack_orders (session, event_id, paid_at, amount, week) VALUES (?,?,?,?,?)")
          .bind(session, String(ev.id || "").slice(0, 80), new Date().toISOString(), amount, week).run();
        logRow(env, ctx, { name: "pack_paid", label: week || "", value: 0, path: "/api/pack/webhook", ref: "", ua_class: "human", country: "" });
        return jsonNoStore({ ok: true, code: "recorded" });
      } catch (e) { return jsonNoStore({ ok: false, code: "db_failed" }, 500); }
    }

    // Success page exchanges the Stripe session id for the token. Only works once the webhook has landed.
    if (url.pathname === "/api/pack/claim" && request.method === "GET") {
      if (!env.PACK_TOKEN_SECRET || !env.EV) return jsonNoStore({ ok: false, code: "not_configured" }, 503);
      const session = (url.searchParams.get("session") || "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 80);
      if (!session) return jsonNoStore({ ok: false, code: "nosession" }, 400);
      try {
        await ensurePackTable(env);
        const row = await env.EV.prepare("SELECT week, refunded FROM pack_orders WHERE session = ?").bind(session).first();
        if (!row) return jsonNoStore({ ok: false, code: "pending" }, 404);
        if (row.refunded) return jsonNoStore({ ok: false, code: "refunded" }, 403);
        return jsonNoStore({ ok: true, token: await packToken(env, session), week: row.week });
      } catch (e) { return jsonNoStore({ ok: false, code: "db_failed" }, 500); }
    }

    // Pack files are static assets, but only index.json and sample.json are public; everything else needs a token.
    if (url.pathname.startsWith("/packs/") && url.pathname.endsWith(".json") && !PACK_PUBLIC.has(url.pathname)) {
      const auth = request.headers.get("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : (url.searchParams.get("t") || "");
      if (!env.PACK_TOKEN_SECRET || !env.EV) return jsonNoStore({ ok: false, code: "not_configured" }, 503);
      if (!(await packTokenValid(env, token).catch(() => false))) return jsonNoStore({ ok: false, code: "forbidden" }, 403);
      const r = await env.ASSETS.fetch(new Request(url.origin + url.pathname));
      if (!r.ok) return jsonNoStore({ ok: false, code: "no_such_pack" }, 404);
      logRow(env, ctx, { name: "pack_open", label: url.pathname.slice(7, 30), value: 0, path: url.pathname.slice(0, 80), ref: "", ua_class: "human", country: request.cf && request.cf.country || "" });
      return new Response(r.body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" } });
    }

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
          "AND label != '' AND label != '__ci' GROUP BY label"
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
