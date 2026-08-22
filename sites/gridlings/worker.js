// Gridlings worker: static assets + /e beacon + server-side pageview log.
// All D1 writes are try/catch + waitUntil — analytics must never 500 the game.
const ALLOWED = new Set(["play_start", "solve", "share_copy", "hint_used", "play_again", "sub_click"]);

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
    } catch (e) { /* never break the game for analytics */ }
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

    let assetReq = request;
    if (url.pathname === "/zh" || url.pathname === "/zh/") {
      assetReq = new Request(new URL("/zh.html", url).toString(), request);
    } else if (url.pathname === "/archive" || url.pathname === "/archive/") {
      assetReq = new Request(new URL("/archive.html", url).toString(), request);
    }
    const res = await env.ASSETS.fetch(assetReq);

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
