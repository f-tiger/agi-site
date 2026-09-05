// Gridlings worker: static assets + /e beacon + server-side pageview log.
// All D1 writes are try/catch + waitUntil — analytics must never 500 the game.
// GEO rules pages (2026-08-24): extensionless → .html, one set instead of ten else-ifs
const GEO = new Set(["/futoshiki-rules","/kropki-sudoku-rules","/sandwich-sudoku-rules","/skyscraper-puzzle-rules","/star-battle-rules","/thermometer-puzzle-rules","/nonogram-rules","/6x6-sudoku-rules","/binary-puzzle-rules","/games-like-linkedin-queens"]);
const ALLOWED = new Set(["play_start", "solve", "game_over", "calc_use", "share_copy", "hint_used", "play_again", "sub_click", "challenge_copy", "challenge_open", "challenge_result", "undo", "hub_click", "sweep_share", "embed_copy", "sub_submit", "sub_ok", "sub_fail"]);

function uaClass(ua) {
  if (!ua) return "none";
  if (/bot|crawl|spider|slurp|gptbot|claude|perplexity|bingpreview|headless|python-requests|go-http|axios|curl|wget|scan|probe|monitor|uptime|http-client|libwww|okhttp/i.test(ua)) return "bot";
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

    // Inline subscribe: store-first (same lesson as the main site — an
    // address must land in D1 before anything else). NOT waitUntil: a failed
    // store must surface so the client falls back to the beehiiv page.
    if (url.pathname === "/sub" && request.method === "POST") {
      const headers = { "content-type": "application/json", "access-control-allow-origin": "*" };
      try {
        const b = await request.json();
        const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !env.EV) {
          return new Response('{"ok":false}', { status: 400, headers });
        }
        await env.EV.prepare(
          "INSERT OR IGNORE INTO subs (ts, email, topic, lang, status) VALUES (datetime('now'), ?, ?, ?, 'stored')"
        ).bind(email, String(b.topic || "").slice(0, 80), String(b.lang || "").slice(0, 8)).run();
        return new Response('{"ok":true}', { headers });
      } catch (e) {
        return new Response('{"ok":false}', { status: 500, headers });
      }
    }

    let assetReq = request;
    if (url.pathname === "/") {
      // html_handling is "none": nothing is implicit any more, index included
      assetReq = new Request(new URL("/index.html", url).toString(), request);
    } else if (url.pathname === "/zh" || url.pathname === "/zh/") {
      assetReq = new Request(new URL("/zh.html", url).toString(), request);
    } else if (url.pathname === "/archive" || url.pathname === "/archive/") {
      assetReq = new Request(new URL("/archive.html", url).toString(), request);
    } else if (url.pathname === "/mimic" || url.pathname === "/mimic/") {
      assetReq = new Request(new URL("/mimic.html", url).toString(), request);
    } else if (url.pathname === "/overseer" || url.pathname === "/overseer/") {
      assetReq = new Request(new URL("/overseer.html", url).toString(), request);
    } else if (url.pathname === "/prompt" || url.pathname === "/prompt/") {
      assetReq = new Request(new URL("/prompt.html", url).toString(), request);
    } else if (url.pathname === "/overfit" || url.pathname === "/overfit/") {
      assetReq = new Request(new URL("/overfit.html", url).toString(), request);
    } else if (url.pathname === "/blocknova" || url.pathname === "/blocknova/") {
      assetReq = new Request(new URL("/blocknova.html", url).toString(), request);
    } else if (url.pathname === "/balance" || url.pathname === "/balance/") {
      assetReq = new Request(new URL("/balance.html", url).toString(), request);
    } else if (url.pathname === "/zh/balance" || url.pathname === "/zh/balance/") {
      assetReq = new Request(new URL("/balance-zh.html", url).toString(), request);
    } else if (url.pathname === "/starbattle" || url.pathname === "/starbattle/") {
      assetReq = new Request(new URL("/starbattle.html", url).toString(), request);
    } else if (url.pathname === "/zh/starbattle" || url.pathname === "/zh/starbattle/") {
      assetReq = new Request(new URL("/starbattle-zh.html", url).toString(), request);
    } else if (url.pathname === "/trail" || url.pathname === "/trail/") {
      assetReq = new Request(new URL("/trail.html", url).toString(), request);
    } else if (url.pathname === "/zh/trail" || url.pathname === "/zh/trail/") {
      assetReq = new Request(new URL("/trail-zh.html", url).toString(), request);
    } else if (url.pathname === "/futoshiki" || url.pathname === "/futoshiki/") {
      assetReq = new Request(new URL("/futoshiki.html", url).toString(), request);
    } else if (url.pathname === "/zh/futoshiki" || url.pathname === "/zh/futoshiki/") {
      assetReq = new Request(new URL("/futoshiki-zh.html", url).toString(), request);
    } else if (url.pathname === "/towers" || url.pathname === "/towers/") {
      assetReq = new Request(new URL("/towers.html", url).toString(), request);
    } else if (url.pathname === "/zh/towers" || url.pathname === "/zh/towers/") {
      assetReq = new Request(new URL("/towers-zh.html", url).toString(), request);
    } else if (url.pathname === "/minisudoku" || url.pathname === "/minisudoku/") {
      assetReq = new Request(new URL("/minisudoku.html", url).toString(), request);
    } else if (url.pathname === "/zh/minisudoku" || url.pathname === "/zh/minisudoku/") {
      assetReq = new Request(new URL("/minisudoku-zh.html", url).toString(), request);
    } else if (url.pathname === "/kropki" || url.pathname === "/kropki/") {
      assetReq = new Request(new URL("/kropki.html", url).toString(), request);
    } else if (url.pathname === "/zh/kropki" || url.pathname === "/zh/kropki/") {
      assetReq = new Request(new URL("/kropki-zh.html", url).toString(), request);
    } else if (url.pathname === "/sandwich" || url.pathname === "/sandwich/") {
      assetReq = new Request(new URL("/sandwich.html", url).toString(), request);
    } else if (url.pathname === "/zh/sandwich" || url.pathname === "/zh/sandwich/") {
      assetReq = new Request(new URL("/sandwich-zh.html", url).toString(), request);
    } else if (url.pathname === "/thermo" || url.pathname === "/thermo/") {
      assetReq = new Request(new URL("/thermo.html", url).toString(), request);
    } else if (url.pathname === "/zh/thermo" || url.pathname === "/zh/thermo/") {
      assetReq = new Request(new URL("/thermo-zh.html", url).toString(), request);
    } else if (url.pathname === "/nonogram" || url.pathname === "/nonogram/") {
      assetReq = new Request(new URL("/nonogram.html", url).toString(), request);
    } else if (url.pathname === "/zh/nonogram" || url.pathname === "/zh/nonogram/") {
      assetReq = new Request(new URL("/nonogram-zh.html", url).toString(), request);
    } else if (url.pathname === "/bench" || url.pathname === "/bench/") {
      assetReq = new Request(new URL("/bench.html", url).toString(), request);
    } else if (url.pathname === "/nonogram-no-guessing" || url.pathname === "/nonogram-no-guessing/") {
      assetReq = new Request(new URL("/nonogram-no-guessing.html", url).toString(), request);
    } else if (url.pathname === "/download" || url.pathname === "/download/") {
      assetReq = new Request(new URL("/downloads.html", url).toString(), request);
    } else if (GEO.has(url.pathname.replace(/\/$/, ""))) {
      assetReq = new Request(new URL(url.pathname.replace(/\/$/, "") + ".html", url).toString(), request);
    } else if (url.pathname.startsWith("/zh/") && /\.(js|css|json|png|svg|txt|ico|webmanifest)$/.test(url.pathname)) {
      // zh pages are served at /zh/<game> but reference assets relatively,
      // which the browser resolves under /zh/ — fall back to the root asset
      assetReq = new Request(new URL(url.pathname.slice(3), url).toString(), request);
    } else if (!/\.[a-z0-9]+$/i.test(url.pathname)) {
      // generic extensionless → .html (html_handling "none" resolves nothing
      // by itself); also catches legacy canonicalized URLs like /starbattle-zh
      // that the old redirect loop minted into crawlers and history
      assetReq = new Request(new URL(url.pathname.replace(/\/+$/, "") + ".html", url).toString(), request);
    }
    let res = await env.ASSETS.fetch(assetReq);
    // Belt and braces for the 2026-08-26 loop: if the asset layer is (still)
    // in a canonicalizing mode on some edge and bounces our .html rewrite
    // back with a 307/308, absorb it server-side by serving the other URL
    // form — the client must never see the redirect, whatever the config
    // propagation state of the colo handling this request.
    if ((res.status === 307 || res.status === 308) && assetReq !== request) {
      const alt = await env.ASSETS.fetch(request);
      if (alt.status === 200) res = alt;
    }

    const accept = request.headers.get("accept") || "";
    // some crawlers send text/html Accept on asset fetches — keep pv page-only
    const isAsset = /\.(js|css|json|png|svg|txt|ico|xml|webmanifest|map)$/.test(url.pathname);
    if (request.method === "GET" && accept.includes("text/html") && res.status === 200 && !isAsset) {
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
