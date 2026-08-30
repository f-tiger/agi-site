// agimatch worker: static assets + /e event whitelist + server-side pageview
// + /api/request demand intake (D1) + /api/pay-info (reads Cloudflare secrets;
// no payment address ever lives in this public repo).
// Fleet pattern (goldrush/buysomething/gridlings): every D1 write is try/catch +
// waitUntil — analytics must never be able to 500 the site.
const ALLOWED = new Set([
  "triage_use", "triage_result", "route_click", "tool_click",
  "request_open", "request_submit", "pay_open", "pay_copy", "sub_click", "brief_copy"
]);

function uaClass(ua) {
  if (!ua) return "none";
  if (/bot|crawl|spider|slurp|gptbot|claude|perplexity|bingpreview|headless/i.test(ua)) return "bot";
  if (/mozilla/i.test(ua)) return "human";
  return "other";
}

function logRow(env, ctx, row) {
  if (!env.EV) return;
  ctx.waitUntil((async () => {
    try {
      await env.EV.prepare(
        "INSERT INTO ev (day, ts, name, label, value, path, ref, ua_class, country) VALUES (date('now'), datetime('now'), ?, ?, ?, ?, ?, ?, ?)"
      ).bind(row.name, row.label || "", row.value | 0, row.path || "", row.ref || "", row.ua_class || "", row.country || "").run();
    } catch (e) { /* analytics must never break the site */ }
  })());
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST", "access-control-allow-headers": "content-type" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && (url.pathname === "/e" || url.pathname === "/api/request")) {
      return new Response(null, { headers: CORS });
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
            ua_class: "human",
            country: (request.cf && request.cf.country) || ""
          });
        }
      } catch (e) { /* ignore malformed */ }
      return new Response("ok", { headers: { "access-control-allow-origin": "*" } });
    }

    // Demand intake. Contact is optional; stored only in D1 (never in the repo),
    // and any reporting of these rows must redact contact per fleet privacy rules.
    if (url.pathname === "/api/request" && request.method === "POST") {
      let ok = false, err = "invalid";
      try {
        const b = await request.json();
        const need = String(b.need || "").trim().slice(0, 2000);
        const category = String(b.category || "").trim().slice(0, 60);
        const budget = String(b.budget || "").trim().slice(0, 40);
        const contact = String(b.contact || "").trim().slice(0, 120);
        const route = String(b.route || "").trim().slice(0, 60);
        const hp = String(b.website || ""); // honeypot: real form leaves it empty
        if (hp === "" && need.length >= 20 && env.EV) {
          await env.EV.prepare(
            "CREATE TABLE IF NOT EXISTS requests (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT, ts TEXT, category TEXT, need TEXT, budget TEXT, contact TEXT, route TEXT, country TEXT, status TEXT DEFAULT 'new')"
          ).run();
          await env.EV.prepare(
            "INSERT INTO requests (day, ts, category, need, budget, contact, route, country) VALUES (date('now'), datetime('now'), ?, ?, ?, ?, ?, ?)"
          ).bind(category, need, budget, contact, route, (request.cf && request.cf.country) || "").run();
          ok = true;
          logRow(env, ctx, { name: "request_submit", label: category || "uncat", path: "/api/request", ua_class: "human", country: (request.cf && request.cf.country) || "" });
        } else if (hp !== "") { ok = true; /* silently accept honeypot hits */ }
        else if (need.length < 20) { err = "too_short"; }
      } catch (e) { err = "error"; }
      return new Response(JSON.stringify(ok ? { ok: true } : { ok: false, err }), {
        status: ok ? 200 : 400,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
      });
    }

    // Payment channel info. Addresses come from Cloudflare Worker secrets
    // (PAY_USDT_TRC20 / PAY_USDC_EVM), set by the owner in the dashboard —
    // by design this public repo contains no address. Until secrets are set,
    // the page shows "channel pending".
    if (url.pathname === "/api/pay-info" && request.method === "GET") {
      const body = {
        usdt_trc20: env.PAY_USDT_TRC20 || null,
        usdc_evm: env.PAY_USDC_EVM || null,
        configured: Boolean(env.PAY_USDT_TRC20 || env.PAY_USDC_EVM)
      };
      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" }
      });
    }

    const res = await env.ASSETS.fetch(request);
    if (request.method === "GET" && res.status === 200) {
      const type = res.headers.get("content-type") || "";
      if (type.includes("text/html") || ["/routes.json", "/llms.txt"].includes(url.pathname)) {
        logRow(env, ctx, {
          name: "page_view",
          path: url.pathname.slice(0, 80),
          ref: (request.headers.get("referer") || "").slice(0, 120),
          ua_class: uaClass(request.headers.get("user-agent")),
          country: (request.cf && request.cf.country) || ""
        });
      }
    }
    return res;
  },
};
