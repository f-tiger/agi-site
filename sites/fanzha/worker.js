// 识骗 worker:静态资产 + /e 白名单事件 + 服务端 page_view + ua_audit + /api/pulse。
// 舰队铁律:每次 D1 写都 try/catch + waitUntil,统计永远不能 500 站点。表名带前缀 f——本站与 after35、learn 共用一个 D1 库
// (账号 10 库上限),两站的行永远不混在同一张表里。
const ALLOWED = new Set(["page_view", "tool_result", "bridge_click", "resource_click", "share_click", "faq_open", "card_print"]);
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady || !db) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS fev (day TEXT, ts TEXT, name TEXT, label TEXT, value INTEGER, path TEXT, ref TEXT, ua_class TEXT, country TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS fua_audit (day TEXT, ua_prefix TEXT, ua_class TEXT, hits INTEGER, PRIMARY KEY (day, ua_prefix, ua_class))"),
  ]);
  schemaReady = true;
}
function uaClass(ua) {
  if (!ua) return "none";
  if (/bot|crawler|spider|slurp|scrap|crawl|fetch|monitor|uptime|lighthouse|pagespeed|preview|headless|phantom|selenium|puppeteer|playwright|curl|wget|python|java|go-http|okhttp|libwww|httpclient|http-client|axios|node-fetch|undici|^node$|^node\/|feed|rss|validator|archive|semrush|ahrefs|dataforseo|mj12|dotbot|bytespider|petalbot|applebot|amazonbot|facebookexternalhit|embedly|gptbot|chatgpt|oai-search|claude|perplexity|ccbot|google-extended|panscient|censys|inspect|shodan|expanse|masscan|zgrab|scan|probe/i.test(ua)) return "bot";
  if (/mozilla/i.test(ua)) return "human";
  return "other";
}
function auditUa(env, ctx, ua, cls) {
  if (!env.EV) return;
  ctx.waitUntil((async () => { try { await ensureSchema(env.EV); await env.EV.prepare("INSERT INTO fua_audit (day, ua_prefix, ua_class, hits) VALUES (date('now'), ?, ?, 1) ON CONFLICT(day, ua_prefix, ua_class) DO UPDATE SET hits = hits + 1").bind((ua || "").slice(0, 48) || "(none)", cls).run(); } catch (e) {} })());
}
function logRow(env, ctx, row) {
  if (row && row.ci) return;
  if (!env.EV) return;
  ctx.waitUntil((async () => {
    try {
      await ensureSchema(env.EV);
      await env.EV.prepare("INSERT INTO fev (day, ts, name, label, value, path, ref, ua_class, country) VALUES (date('now'), datetime('now'), ?, ?, ?, ?, ?, ?, ?)")
        .bind(row.name, row.label || "", row.value | 0, row.path || "", row.ref || "", row.ua_class || "", row.country || "").run();
    } catch (e) { /* analytics must never break the site */ }
  })());
}
const JSONH = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" };
// 引荐来源分类(2026-09-15「舰队相互学习」):tools/fleet/ref_sources.txt 是唯一权威,
// 每个 worker 里的字面量必须与它逐字相同——check_ref_sources.py 挂在 fleet-heartbeat 上断言,
// 漂了就走 GitHub 失败邮件。教训与 bot_ua.txt 同源:各自演化的分类器 = 各站台账不可比。
// 读的是已入库的来源域名,出的仍是聚合计数:无路径、无国家、无 UA、无行级数据。
const REF_SRC = "ai:chatgpt|chat.openai|perplexity|claude.ai|copilot.microsoft|copilot.cloud.microsoft|copilot|gemini.google|you.com|kagi|poe.com|mistral|deepseek|kimi|doubao|yiyan.baidu|yiyan|metaso|phind|felo.ai|genspark|monica.im|tiangong|chatglm|moonshot;;search:google.|bing.|duckduckgo|search.yahoo|yahoo.co|ecosia|yandex|baidu.|sogou|so.com|startpage|brave.com|qwant|naver|seznam|petalsearch|mojeek|lycos|ask.com;;fleet:agiscorecard.com|getecoback.com|baipiaoji.com|thedollscout.com;;social:t.co|twitter.com|x.com|reddit.com|facebook|instagram|linkedin|lnkd.in|news.ycombinator|producthunt|weibo|zhihu|douban|xiaohongshu|telegram|t.me|pinterest|youtube|tiktok|douyin|discord|substack|medium.com|tumblr|vk.com|line.me|whatsapp|quora|mastodon|bsky";
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
    const url = new URL(request.url); const p = url.pathname; const ci = url.searchParams.get("ci") === "1";
    if (p === "/e" && request.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST", "access-control-allow-headers": "content-type" } });
    if (p === "/e" && request.method === "POST") {
      try { const b = await request.json(); if (ALLOWED.has(b.n)) logRow(env, ctx, { name: b.n, label: String(b.l || "").slice(0, 80), path: String(b.p || "").slice(0, 80), ref: (request.headers.get("referer") || "").slice(0, 120), ua_class: "js", country: (request.cf && request.cf.country) || "" }); } catch (e) {}
      return new Response("ok", { headers: { "access-control-allow-origin": "*" } });
    }
    // 信标真值测试(2026-09-16 补,SR 09-13 同款):CI 先 POST 一条 label=__ci 的事件,再从这里读回来。
    // 没有这条,「工具一次都没被用过」和「/e → D1 这根管子断了」在读数上一模一样——本站上线以来
    // 客户端事件恒为 0,必须能证明是前者。只回计数,不回任何行级数据。
    if (p === "/api/selftest" && request.method === "GET") {
      const headers = { ...JSONH, "cache-control": "no-store" };
      const label = (url.searchParams.get("label") || "").slice(0, 40);
      // 只认 __ 开头的自检标签:这个端点是 CI 探针,不是给外人读站内统计的窗口。
      if (!label || !label.startsWith("__") || !env.EV) return new Response(JSON.stringify({ ok: false, error: "ci label required" }), { status: 400, headers });
      try {
        await ensureSchema(env.EV);
        const r = await env.EV.prepare("SELECT COUNT(*) n FROM fev WHERE label = ? AND day >= date('now','-2 days')").bind(label).first();
        return new Response(JSON.stringify({ ok: true, label, n: (r && r.n) | 0 }), { headers });
      } catch (e) { return new Response(JSON.stringify({ ok: false, error: "query_failed" }), { status: 500, headers }); }
    }
    if (p === "/api/pulse" && request.method === "GET") {
      const headers = { ...JSONH, "cache-control": "public, max-age=3600" };
      if (!env.EV) return new Response(JSON.stringify({ ok: false, error: "no_db" }), { status: 503, headers });
      try {
        await ensureSchema(env.EV);
        const q = await env.EV.prepare("SELECT '_total' AS host, COUNT(*) AS n FROM fev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') UNION ALL SELECT ref AS host, COUNT(*) AS n FROM fev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') AND (ref LIKE '%chatgpt%' OR ref LIKE '%chat.openai%' OR ref LIKE '%perplexity%' OR ref LIKE '%claude.ai%' OR ref LIKE '%copilot%' OR ref LIKE '%gemini.google%' OR ref LIKE '%you.com%' OR ref LIKE '%kagi%' OR ref LIKE '%poe.com%' OR ref LIKE '%mistral%' OR ref LIKE '%deepseek%' OR ref LIKE '%kimi%' OR ref LIKE '%doubao%' OR ref LIKE '%yiyan%' OR ref LIKE '%metaso%') GROUP BY ref ORDER BY n DESC").all();
        let human_pv = 0; const by_host = {};
        for (const r of (q.results || [])) { if (r.host === "_total") human_pv = r.n | 0; else if (r.host) by_host[r.host] = r.n | 0; }
        const ai_ref = Object.values(by_host).reduce((a, b) => a + b, 0);
        // 渠道构成(2026-09-15):同一个 human 谓词再 group 一次 ref,在 worker 里按
        // tools/fleet/ref_sources.txt 分桶。sum(by_source) 应等于 human_pv —— 对不上就是
        // 有站把 ref 存成了整条 URL 或分类器漂了,读侧 traffic_sources.py 会把差额打出来。
        const q2 = await env.EV.prepare(
          "SELECT ref AS host, COUNT(*) AS n FROM fev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') GROUP BY ref ORDER BY n DESC LIMIT 1000"
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
      } catch (e) { return new Response(JSON.stringify({ ok: false, error: "query_failed" }), { status: 500, headers }); }
    }
    const res = await env.ASSETS.fetch(request);
    if (request.method === "GET" && res.status === 200) {
      const type = res.headers.get("content-type") || "";
      if (type.includes("text/html") || ["/llms.txt", "/llms-full.txt", "/sitemap.xml"].includes(p) || p.endsWith(".md")) {
        const ua = request.headers.get("user-agent") || ""; const cls = uaClass(ua);
        if (!ci) auditUa(env, ctx, ua, cls);
        logRow(env, ctx, { ci, name: "page_view", path: p.slice(0, 80), ref: (request.headers.get("referer") || "").slice(0, 120), ua_class: cls, country: (request.cf && request.cf.country) || "" });
      }
    }
    return res;
  },
};
