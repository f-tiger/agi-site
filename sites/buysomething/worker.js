// buysomething(SourceRadar)worker:静态资产透传 + /e 事件白名单 + 服务端 pageview。
// 舰队模式(同 gridlings/gamesledger):所有 D1 写都 try/catch + waitUntil,埋点永不 500 页面。
const ALLOWED = new Set(["pick_open", "calc_use", "out_click", "search_use"]);

function uaClass(ua) {
  if (!ua) return "none";
  if (/bot|crawl|spider|slurp|gptbot|claude|perplexity|bingpreview|headless/i.test(ua)) return "bot";
  if (/mozilla/i.test(ua)) return "human";
  return "other";
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
      try {
        const b = await request.json();
        if (ALLOWED.has(b.n)) {
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

    const res = await env.ASSETS.fetch(request);
    const accept = request.headers.get("accept") || "";
    if (request.method === "GET" && accept.includes("text/html") && res.status === 200) {
      await logRow(env, ctx, {
        name: "page_view",
        label: "",
        value: 0,
        path: url.pathname.slice(0, 80),
        ref: (request.headers.get("referer") || "").slice(0, 120),
        ua_class: uaClass(request.headers.get("user-agent")),
        country: request.cf && request.cf.country || ""
      });
    }
    return res;
  }
};
