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

// AI 助手引荐主机(与原 /api/pulse SQL 里的 15 个 LIKE 子串逐字相同,改在 JS 里匹配同一结果集)。
const AI_REF = /chatgpt|chat\.openai|perplexity|claude\.ai|copilot|gemini\.google|you\.com|kagi|poe\.com|mistral|deepseek|kimi|doubao|yiyan|metaso/i;
// D1 读预算(2026-09-25 事故:免费档每日 500 万行读取被打满,全舰队 D1 读失败到午夜)。
// 聚合端点从 Cache API 出,按 URL + 部署版本做键,TTL 秒;错误响应永不入缓存。
// 此前的 `cache-control: public, max-age=3600` 只对浏览器有效——Cloudflare 不会仅凭它缓存 Worker 响应,
// 每次轮询都重跑全部扫描。本地单测没有 caches 全局,直接算。
async function cachedJson(request, env, ctx, ttl, compute, params = []) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (!cache) return compute();
  const u = new URL(request.url);
  const version = (env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id) || env.CF_PAGES_COMMIT_SHA || "dev";
  const qs = params.map((p) => p + "=" + encodeURIComponent(u.searchParams.get(p) || "")).join("&");
  const key = new Request(u.origin + u.pathname + "?v=" + encodeURIComponent(version) + (qs ? "&" + qs : ""), { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = await compute();
  if (res.ok && res.headers.get("cache-control") !== "no-store") {
    const stored = new Response(res.clone().body, res);
    stored.headers.set("cache-control", "public, max-age=" + ttl);
    stored.headers.set("x-fleet-cache", "store");
    if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, stored)); else await cache.put(key, stored);
  }
  return res;
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

// /fetchlog.json (2026-09-22): the consumption number is COMPUTED from this worker's own D1 on
// every read (Cache API, 1 h, since 2026-09-26), not hand-typed. site/fetchlog.json stays as the template (definitions, history,
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
      // D1 读预算(2026-09-26):两条 SQL 都是 ev 全表(site lifetime)扫描,每次读都重跑;现在经 cachedJson
      // 缓存 1 小时(page_view 落库在缓存之外,照记)。live:false 的兜底响应带 no-store,永不入缓存。
      const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" };
      const fallbackH = { ...headers, "cache-control": "no-store" };
      return cachedJson(request, env, ctx, 3600, async () => {
        let template = {};
        try { template = await (await env.ASSETS.fetch(new Request(url.origin + "/fetchlog.json"))).json(); } catch (e) { template = {}; }
        if (!env.EV) return new Response(JSON.stringify(Object.assign({}, template, { live: false, live_error: "no_db" }), null, 2), { headers: fallbackH });
        try {
          const [a, b] = await env.EV.batch([env.EV.prepare(FETCHLOG_SQL_CLASSES), env.EV.prepare(FETCHLOG_SQL_EVIDENCE)]);
          const body = summarizeFetchlog(template, a && a.results, b && b.results, new Date().toISOString().slice(0, 10));
          return new Response(JSON.stringify(body, null, 2), { headers });
        } catch (e) {
          return new Response(JSON.stringify(Object.assign({}, template, { live: false, live_error: "query_failed" }), null, 2), { headers: fallbackH });
        }
      });
    }

    // /api/pulse (2026-09-13, fleet "AI 时代的站点" flywheel read-side): 28-day human page
    // views and how many arrived from an AI assistant, by referrer host. Aggregate counts
    // only — no paths, no countries, no UA, no row-level data. Worker reads its own D1
    // binding, so the fleet heartbeat needs no token (the repo's tokens lack D1 read).
    // Same host list as tools/fleet/ai_referrals.py.
    // D1 读预算(2026-09-26):此前同一个 28 天窗口扫三遍(`_total` + AI 主机 UNION,再 GROUP BY ref 一遍),
    // 现在只跑一次 GROUP BY ref,三组数从同一结果集派生:human_pv = 各组 n 之和,AI 主机按 AI_REF 匹配,
    // 渠道构成按 tools/fleet/ref_sources.txt 分桶——每个数字与原来逐个相同。响应经 cachedJson 缓存 1 小时。
    // sum(by_source) 应等于 human_pv —— 对不上就是有站把 ref 存成了整条 URL 或分类器漂了,读侧 traffic_sources.py 会把差额打出来。
    if (url.pathname === "/api/pulse" && request.method === "GET") {
      const errH = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
      if (!env.EV) return new Response(JSON.stringify({ ok: false, error: "no_db" }), { status: 503, headers: errH });
      return cachedJson(request, env, ctx, 3600, async () => {
        try {
          const q = await env.EV.prepare(
            "SELECT ref AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') GROUP BY ref ORDER BY n DESC"
          ).all();
          const self_host = srcHost(url.hostname);
          let human_pv = 0; const by_host = {};
          const by_source = { search: 0, ai: 0, fleet: 0, social: 0, self: 0, direct: 0, other: 0 };
          const by_search = {}; const by_fleet = {}; const by_other = {};
          for (const r of (q.results || [])) {
            const n = r.n | 0; human_pv += n;
            if (r.host && AI_REF.test(String(r.host))) by_host[r.host] = n;
            const h = srcHost(r.host); const b = srcBucket(h, self_host);
            by_source[b] += n;
            if (b === "search") by_search[h] = (by_search[h] || 0) + n;
            else if (b === "fleet") by_fleet[h] = (by_fleet[h] || 0) + n;
            // by_other = 既不是搜索/AI/社交/兄弟站/本站的来源域 —— 真的有人从别处链过来。
            // 这是舰队第一方的外链监测:嵌入件、目录页、awesome-list 里的链接,送来过真人就出现在这里。
            else if (b === "other") by_other[h] = (by_other[h] || 0) + n;
          }
          const ai_ref = Object.values(by_host).reduce((a, b) => a + b, 0);
          return new Response(JSON.stringify({ ok: true, days: 28, human_pv, ai_ref, by_host, by_source, by_search, by_fleet, by_other, generated: new Date().toISOString() }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" } });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: "query_failed" }), { status: 500, headers: errH });
        }
      });
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
