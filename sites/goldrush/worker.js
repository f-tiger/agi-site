// goldrush worker: static assets + /e event whitelist + server-side pageview.
// Fleet pattern (same as buysomething/gridlings): every D1 write is try/catch +
// waitUntil — analytics must never be able to 500 the site.
const ALLOWED = new Set(["ledger_click", "fork_click", "audit_click", "sub_click"]);

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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

    const res = await env.ASSETS.fetch(request);
    if (request.method === "GET" && res.status === 200) {
      const type = res.headers.get("content-type") || "";
      if (type.includes("text/html") || url.pathname === "/ledger.json" || url.pathname === "/llms.txt") {
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
