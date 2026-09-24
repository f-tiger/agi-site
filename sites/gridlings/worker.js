// Gridlings worker: static assets + /e beacon + server-side pageview log.
// All D1 writes are try/catch + waitUntil — analytics must never 500 the game.
// GEO rules/answer pages: extensionless → .html, one set instead of ten else-ifs.
// (2026-08-24 rules pages; 2026-09-06 /ai-games hub.) There is NO generic extensionless
// fallback in this worker — every new content page MUST be added to this Set or it 404s.
const GEO = new Set(["/ai-games","/futoshiki-rules","/kropki-sudoku-rules","/sandwich-sudoku-rules","/skyscraper-puzzle-rules","/star-battle-rules","/thermometer-puzzle-rules","/nonogram-rules","/6x6-sudoku-rules","/binary-puzzle-rules","/games-like-linkedin-queens"]);
// zh twins of the rules pages (2026-09-22): /zh/<slug> → <slug>-zh.html; /zh/ai-games has no twin.
const GEO_ZH = new Set(["/zh/futoshiki-rules", "/zh/kropki-sudoku-rules", "/zh/sandwich-sudoku-rules", "/zh/skyscraper-puzzle-rules", "/zh/star-battle-rules", "/zh/thermometer-puzzle-rules", "/zh/nonogram-rules", "/zh/6x6-sudoku-rules", "/zh/binary-puzzle-rules", "/zh/games-like-linkedin-queens"]);
// 2026-09-16: GHOSTLINE and SINGULARITY were emitting their engagement events all
// along and this Set was silently dropping every one — the table has never held a
// single race_start, finish, medal, beat_clone, milestone or rogue. That is why those
// two read as "play_start and nothing else" while Playgama's own dwell metric says 27%
// of GHOSTLINE's visitors play past a minute. The gap was ours, not the players'.
//
// Only events BOUNDED PER SESSION are added. SINGULARITY is an idle game: buy, train,
// research, cache, market, skin and mission fire as fast as a player can tap, and
// letting those through would trade one blind spot for a D1 bill.
const ALLOWED = new Set(["play_start", "solve", "game_over", "calc_use", "share_copy", "hint_used", "play_again", "sub_click", "challenge_copy", "challenge_open", "challenge_result", "undo", "hub_click", "sweep_share", "embed_copy", "sub_submit", "sub_ok", "sub_fail",
  /* GHOSTLINE: one per race at most */
  "race_start", "finish", "medal", "beat_clone",
  /* SINGULARITY: one per lab milestone, not per tap */
  "first_click", "milestone", "ship", "rogue", "rewarded"]);

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
    } catch (e) { /* never break the game for analytics */ }
  })());
}

/* CORS for the analytics beacon.
   navigator.sendBeacon sends in credentials mode "include", and a browser REFUSES a
   wildcard allow-origin for a credentialed request. Returning "*" therefore blocked
   every event from every third-party portal — verified on Playgama's QA tool, where
   the console filled with CORS failures and no row ever reached D1. Console errors are
   themselves a rejection risk on these portals, so this cost us twice.
   An allowlist cannot work here: Playgama alone syndicates to 100+ partner domains we
   never see in advance. So the request's own Origin is echoed back. That is safe for
   THIS endpoint specifically: it is append-only, accepts only allowlisted event names,
   returns no data, and holds nothing a cross-site caller could read or abuse — anyone
   can already POST to it with curl. Do not copy this pattern to an endpoint that
   returns data or mutates state. */
function corsHeaders(request) {
  const origin = request.headers.get("origin");
  return origin
    ? { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "vary": "Origin" }
    : { "access-control-allow-origin": "*" };
}

// 引荐来源分类(2026-09-15「舰队相互学习」):tools/fleet/ref_sources.txt 是唯一权威,
// 每个 worker 里的字面量必须与它逐字相同——check_ref_sources.py 挂在 fleet-heartbeat 上断言,
// 漂了就走 GitHub 失败邮件。教训与 bot_ua.txt 同源:各自演化的分类器 = 各站台账不可比。
// 读的是已入库的来源域名,出的仍是聚合计数:无路径、无国家、无 UA、无行级数据。
const REF_SRC = "self:pages.dev|workers.dev;;ai:chatgpt|chat.openai|perplexity|claude.ai|copilot.microsoft|copilot.cloud.microsoft|copilot|gemini.google|you.com|kagi|poe.com|mistral|deepseek|kimi|doubao|yiyan.baidu|yiyan|metaso|phind|felo.ai|genspark|monica.im|tiangong|chatglm|moonshot;;search:google.|bing.|duckduckgo|search.yahoo|yahoo.co|ecosia|yandex|baidu.|sogou|so.com|startpage|brave.com|qwant|naver|seznam|petalsearch|mojeek|lycos|ask.com;;fleet:agiscorecard.com|getecoback.com|baipiaoji.com|thedollscout.com;;social:t.co|twitter.com|x.com|reddit.com|facebook|instagram|linkedin|lnkd.in|news.ycombinator|producthunt|weibo|zhihu|douban|xiaohongshu|telegram|t.me|pinterest|youtube|tiktok|douyin|discord|substack|medium.com|tumblr|vk.com|line.me|whatsapp|quora|mastodon|bsky";
const srcHost = (r) => {
  let h = String(r == null ? "" : r).trim().toLowerCase();
  if (!h) return "";
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  h = h.split("/")[0].split("?")[0].split("#")[0].split("@").pop().split(":")[0];
  return h.replace(/^www\./, "");
};
// self 只认完全相同的主机名:play.agiscorecard.com 对主域是兄弟站(fleet),不是自己。
const srcBucket = (host, self) => {
  if (!host) return "direct";
  if (self && host === self) return "self";
  // 标签对齐 + 尾部只许 TLD 段。两个方向的错都真发生过:裸 includes 会把 netflix.com
  // 判成 x.com(social);只做前缀对齐又会把 agiscorecard.com.spam.example 判成 fleet
  // ——那正是引荐垃圾的常见形状。
  const tld = (rest) => rest === "" || rest.split(".").every((l) => l.length > 0 && l.length <= 4 && /^[a-z]+$/.test(l));
  const dotted = "." + host;
  for (const grp of REF_SRC.split(";;")) {
    const i = grp.indexOf(":");
    for (const t of grp.slice(i + 1).split("|")) {
      if (!t) continue;
      const at = dotted.indexOf("." + t);
      if (at < 0) continue;
      let rest = dotted.slice(at + t.length + 1);
      if (rest.startsWith(".")) rest = rest.slice(1);
      if (tld(rest)) return grp.slice(0, i);
    }
  }
  return "other";
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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
        // 渠道构成(2026-09-15):同一个 human 谓词再 group 一次 ref,在 worker 里按
        // tools/fleet/ref_sources.txt 分桶。sum(by_source) 应等于 human_pv —— 对不上就是
        // 有站把 ref 存成了整条 URL 或分类器漂了,读侧 traffic_sources.py 会把差额打出来。
        const q2 = await env.EV.prepare(
          "SELECT ref AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') GROUP BY ref ORDER BY n DESC LIMIT 1000"
        ).all();
        const self_host = srcHost(url.hostname);
        const by_source = { search: 0, ai: 0, fleet: 0, social: 0, self: 0, direct: 0, other: 0 };
        const by_search = {}; const by_fleet = {}; const by_other = {};
        for (const r of (q2.results || [])) {
          const h = srcHost(r.host); const n = r.n | 0; const b = srcBucket(h, self_host);
          by_source[b] += n;
          if (b === "search") by_search[h] = (by_search[h] || 0) + n;
          else if (b === "fleet") by_fleet[h] = (by_fleet[h] || 0) + n;
          // by_other = 既不是搜索/AI/社交/兄弟站/本站的来源域 —— 真的有人从别处链过来。
          // 这是舰队第一方的外链监测:嵌入件、目录页、awesome-list 里的链接,送来过真人就出现在这里。
          else if (b === "other") by_other[h] = (by_other[h] || 0) + n;
        }
        return new Response(JSON.stringify({ ok: true, days: 28, human_pv, ai_ref, by_host, by_source, by_search, by_fleet, by_other, generated: new Date().toISOString() }), { headers });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "query_failed" }), { status: 500, headers });
      }
    }

    if (url.pathname === "/e" && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: Object.assign(corsHeaders(request), {
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400"
      }) });
    }
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
      return new Response("ok", { headers: corsHeaders(request) });
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
    } else if (url.pathname === "/ghostline" || url.pathname === "/ghostline/") {
      assetReq = new Request(new URL("/ghostline.html", url).toString(), request);
    } else if (url.pathname === "/singularity" || url.pathname === "/singularity/") {
      assetReq = new Request(new URL("/singularity.html", url).toString(), request);
    } else if (url.pathname === "/minima" || url.pathname === "/minima/") {
      assetReq = new Request(new URL("/minima.html", url).toString(), request);
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
    } else if (GEO_ZH.has(url.pathname.replace(/\/$/, ""))) {
      assetReq = new Request(new URL(url.pathname.replace(/\/$/, "").slice(3) + "-zh.html", url).toString(), request);
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
