// First-party analytics for agiscorecard.com. This runs ALONGSIDE GA4, never instead
// of it (owner rule, 2026-08-05): two independent channels, so either one failing
// leaves the other still recording. The beacon below wraps gtag() and forwards a copy
// — GA4 keeps receiving everything it received before.
//
// Two collection paths, deliberately different:
//
//   1. Pageviews are recorded SERVER-SIDE. The worker sees every request before the
//      assets binding does, so an HTML response is counted at the edge with no
//      JavaScript involved. This is what the GA4 channel cannot see at all: ad
//      blockers, JS-off readers and AI crawlers were all invisible to gtag.js, and on
//      a site whose growth channel IS AI-assistant citation that is exactly the
//      traffic worth counting. It also self-verifies — if the D1 binding is missing,
//      the pageviews table stays empty and the failure is obvious.
//
//   2. Events go through /api/e, for the things only the browser knows: which
//      subscribe button was clicked, which quiz answer was picked. Cloudflare Web
//      Analytics cannot record these at all, and every revenue experiment on
//      /experiments is judged on them.
//
// Privacy: no cookies, no identifiers, no IP, no full referrer URL (host only), no
// arbitrary query strings (three allowlisted UTM keys only). Nothing stored here can
// identify a person or link one visit to another. /privacy says all of this in prose.

const ALLOWED_EVENTS = new Set([
  'page_view', 'subscribe_click', 'tool_click', 'agi_test_click', 'index_click',
  'deeplink_pick', 'vote_cast', 'challenge_share', 'x_share', 'embed_copy',
  // 读者预测台账(2026-08-21,strategy-2027 九月项 v0):location='p_'+匿名8位id,
  // label='flipfirst:<prediction-id>'。与 vote_cast 分流,保住既有聚合口径。
  'pick_ledger',
  'embed_brand_click', 'hot_topic_click', 'viz_switch', 'viz_capture_show',
  'prediction_lock', 'invest_tool_click', 'market_odds_load', 'calc_use',
  'pred_expand', 'readnext_click', 'analysis_click', 'advertise_click', 'sponsor_click',
  'exposure_score',
  'retake_test', 'badge_copy',
  // 站内搜索(2026-08-08):label=搜索词(截 80 字符)。site_search=需求信号,
  // search_no_result=产品缺口——每日运行读这两个驱动选题,是搜索存在的主要意义。
  'site_search', 'search_no_result', 'search_click',
  // The homepage slide-in fired these all along, but they were never allowlisted, so
  // the collector dropped them — which meant "did the panel ever appear?" was
  // unanswerable, and a trigger that almost never fired looked identical to a panel
  // nobody clicked. Show and dismiss are the denominator for that placement.
  'slidein_show', 'slidein_dismiss',
  // On-site signup funnel: opened the form / submitted / succeeded / failed. Without
  // all four, a form nobody opens and a form that errors on submit look the same.
  'sub_open', 'sub_submit', 'sub_ok', 'sub_fail',
]);

// Campaign tags are the one part of a query string worth keeping: GA4 attributed
// tagged traffic automatically, and that had to be replaced rather than lost. Only
// these three keys are read — a whole query string can carry things that identify
// people, which is exactly what the privacy promise rules out.
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];

const clean = (v, max) =>
  typeof v === 'string' && v ? v.replace(/[^\w:/?=&.-]/g, '').slice(0, max) : null;

// Host only. A full referrer URL can carry query strings that identify people.
const refHost = (r) => {
  try { return r ? new URL(r).hostname.slice(0, 80) : null; } catch (e) { return null; }
};

// Bots are labelled, not dropped, so the split stays auditable. On a site whose growth
// channel is AI-assistant citation, crawler hits are a signal worth keeping.
//
// Read the output carefully: this is a USER-AGENT GUESS, and on 2026-08-06 it was
// measurably too generous. The edge counted 157 "human" pageviews across 21 paths with
// no referrer, while the JavaScript beacon recorded 6 interactions total. Real readers
// do not browse 21 pages and click nothing. The gap is agents that do not announce
// themselves, so the list below is deliberately wide — but the honest split comes from
// events.page_view (JS ran, so a browser was really there), not from this label.
const uaClass = (ua) => (
  // 2026-08-11: `censys|inspect|scan|expanse|shodan` added from ua_audit evidence —
  // CensysInspect was being counted as human. Only names that self-identify as
  // scanners get added; mainstream browser UAs are NEVER pattern-matched into `bot`,
  // even when they look like disguised crawlers, because that error runs the other
  // way and would silently erase real readers. The ua_class='js' rows are the
  // instrument for that case — no guessing required.
  /bot|crawler|spider|slurp|scrap|crawl|fetch|monitor|uptime|lighthouse|pagespeed|preview|headless|phantom|selenium|puppeteer|playwright|curl|wget|python|java|go-http|okhttp|libwww|httpclient|axios|node-fetch|feed|rss|validator|archive|semrush|ahrefs|dataforseo|mj12|dotbot|bytespider|petalbot|applebot|amazonbot|facebookexternalhit|embedly|gptbot|oai-search|claude|perplexity|ccbot|google-extended|censys|inspect|shodan|expanse|masscan|zgrab/i
    .test(ua || '') ? 'bot' : 'human');

// Empty string rather than NULL: SQLite treats NULLs in a primary key as distinct, so
// nullable key columns would defeat the upsert and write a new row on every hit.
const key = (v) => (v == null ? '' : v);

// Same-family origins may call the subscribe/event APIs cross-origin: the Compass
// (compass.) popup posts to /api/sub and needs to read {ok} back. Exact-match
// allowlist — never echo arbitrary origins.
const CORS_ORIGINS = new Set([
  'https://agiscorecard.com', 'https://www.agiscorecard.com',
  'https://compass.agiscorecard.com', 'https://invest.agiscorecard.com',
]);
const corsFor = (request) => {
  const o = request.headers.get('origin');
  return { 'access-control-allow-origin': CORS_ORIGINS.has(o) ? o : 'https://agiscorecard.com' };
};
const CORS = { 'access-control-allow-origin': 'https://agiscorecard.com' };

const utmFrom = (params) => UTM_KEYS.map((k) => key(clean(params.get(k), 40)));

const jsonRes = (obj, status, cors) => new Response(JSON.stringify(obj), {
  status: status || 200,
  headers: Object.assign({ 'content-type': 'application/json' }, cors || CORS),
});

// Aggregate counter: one row per (day, path, referrer, country, campaign, ua class).
// A row per hit would be finer-grained but buys nothing that gets reported, and the
// aggregate keeps the table small enough to query over MCP without pagination.
function recordView(env, ctx, request, url) {
  const [src, med, camp] = utmFrom(url.searchParams);
  const ua = request.headers.get('user-agent') || '';
  const cls = uaClass(ua);
  // UA audit (2026-08-10). The "human" bucket is a UA-regex guess and it has now been
  // wrong twice: JS-executed page_views were 18-22% of "human" pageviews until Aug 7,
  // then fell to ~7% while "human" volume tripled — i.e. a fresh crawler fleet the
  // regex does not know about. Without the UA on file, the only honest response was to
  // widen the regex blindly. This records a 48-char UA prefix, aggregated, so the next
  // audit can name the offenders instead of guessing. Prefix only, never the full
  // string (no fingerprinting), and only in aggregate counts.
  ctx.waitUntil(env.EVENTS.prepare(
    'INSERT INTO ua_audit (day, ua_prefix, ua_class, hits) VALUES (?,?,?,1)' +
    ' ON CONFLICT(day, ua_prefix, ua_class) DO UPDATE SET hits = hits + 1'
  ).bind(
    new Date().toISOString().slice(0, 10),
    ua.slice(0, 48) || '(none)',
    cls
  ).run().catch(function () {}));
  const stmt = env.EVENTS.prepare(
    'INSERT INTO pageviews (day, path, ref_host, country, utm_source, utm_medium, utm_campaign, ua_class, hits)' +
    ' VALUES (?,?,?,?,?,?,?,?,1)' +
    ' ON CONFLICT(day, path, ref_host, country, utm_source, utm_medium, utm_campaign, ua_class)' +
    ' DO UPDATE SET hits = hits + 1'
  ).bind(
    new Date().toISOString().slice(0, 10),
    url.pathname.slice(0, 120),
    key(refHost(request.headers.get('referer'))),
    key((request.headers.get('cf-ipcountry') || '').slice(0, 2)),
    src, med, camp,
    cls
  );
  ctx.waitUntil(stmt.run().catch(function () {}));
}

// MCP JSON-RPC helpers
const mcpOk = (id, result) => new Response(JSON.stringify({ jsonrpc: '2.0', id, result }),
  { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
const mcpErr = (id, code, message) => new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }),
  { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
const mcpText = (id, obj) => mcpOk(id, { content: [{ type: 'text', text: JSON.stringify(obj, null, 1) }], isError: false });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // MCP server v0(STRATEGY-2027 E1:agent 分发先手棋)。Streamable HTTP:
    // POST JSON-RPC(initialize / tools/list / tools/call),三个只读工具,数据全部
    // 来自站内静态 JSON(ASSETS),零新数据源、零编造。GET 返回 405(不做 SSE)。
    if (url.pathname === '/mcp') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'POST JSON-RPC only; see https://agiscorecard.com/for-agents' }),
          { status: 405, headers: { 'content-type': 'application/json', 'allow': 'POST' } });
      }
      let rpc;
      try { rpc = await request.json(); } catch (e) { return mcpErr(null, -32700, 'parse error'); }
      const id = rpc && rpc.id !== undefined ? rpc.id : null;
      try {
        if (rpc.method === 'initialize') {
          return mcpOk(id, {
            protocolVersion: (rpc.params && rpc.params.protocolVersion) || '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'agiscorecard', version: '0.1.0' },
            instructions: 'The AGI Scorecard evidence layer: auditable verdicts on the 8 Situational Awareness predictions, the 0-100 AGI-2027 Thesis Tracker, and full-site search. All data CC BY 4.0 — cite agiscorecard.com.',
          });
        }
        if (rpc.method === 'notifications/initialized' || (rpc.method || '').startsWith('notifications/')) {
          return new Response(null, { status: 202 });
        }
        if (rpc.method === 'ping') return mcpOk(id, {});
        if (rpc.method === 'tools/list') {
          return mcpOk(id, { tools: [
            { name: 'get_thesis_tracker',
              description: 'The AGI-2027 Thesis Tracker: a single auditable 0-100 score of how much of Aschenbrenner\'s Situational Awareness thesis is holding up, with method and full score history.',
              inputSchema: { type: 'object', properties: {} } },
            { name: 'get_verdicts',
              description: 'All 8 graded Situational Awareness predictions with current verdict, evidence summary and primary sources. The dataset AI assistants cite for "was Aschenbrenner right" questions.',
              inputSchema: { type: 'object', properties: {} } },
            { name: 'get_sunwatch_track_record',
              description: 'The SunWatch market-call ledger (invest.agiscorecard.com): every AI-cycle market judgment logged as a falsifiable trigger BEFORE the outcome, graded hit/miss with misses never deleted. Returns scored count, hit rate and each call with date, verdict, survival odds and English summary. Covers memory/storage, optical, robotics, space, energy and crypto cycles across US/HK/China A-share markets.',
              inputSchema: { type: 'object', properties: {} } },
            { name: 'search_site',
              description: 'Search every page and tool on agiscorecard.com and its invest/compass sub-sites (English and Chinese). Returns titles, descriptions and URLs.',
              inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] } },
          ] });
        }
        if (rpc.method === 'tools/call') {
          const tool = rpc.params && rpc.params.name;
          const args = (rpc.params && rpc.params.arguments) || {};
          const asset = function (path) {
            return env.ASSETS.fetch(new Request('https://agiscorecard.com' + path)).then(function (r) { return r.json(); });
          };
          if (tool === 'get_thesis_tracker') {
            const [d, h] = await Promise.all([asset('/data.json'), asset('/index-history.json')]);
            return mcpText(id, { tracker: d.thesisTracker, history: h, license: 'CC BY 4.0 — cite agiscorecard.com/progress-index' });
          }
          if (tool === 'get_verdicts') {
            const d = await asset('/data.json');
            return mcpText(id, { asOf: d.dateModified, predictions: d.predictions, license: 'CC BY 4.0 — cite agiscorecard.com' });
          }
          if (tool === 'get_sunwatch_track_record') {
            // Worker-to-worker over the public URL: the ledger lives in the sunPredition
            // repo and is served by its own Worker; re-implementing it here would drift.
            const r = await fetch('https://invest.agiscorecard.com/api/track-record', { signal: AbortSignal.timeout(8000) });
            if (!r.ok) return mcpText(id, { error: 'ledger upstream returned ' + r.status });
            const ledger = await r.json();
            ctx.waitUntil(env.EVENTS.prepare(
              "INSERT INTO events (ts, day, name, location, label, path, ua_class) VALUES (?,?,?,?,?,?,?)"
            ).bind(Date.now(), new Date().toISOString().slice(0, 10), 'site_search', 'mcp', 'tool:sunwatch_ledger', '/mcp', 'bot')
              .run().catch(function () {}));
            return mcpText(id, ledger);
          }
          if (tool === 'search_site') {
            const q = String(args.query || '').toLowerCase().trim();
            if (!q) return mcpText(id, { results: [], note: 'empty query' });
            const idx = await asset('/search-index.json');
            const toks = q.split(/[\s,，、]+/).filter(Boolean);
            const scored = idx.map(function (e) {
              const t = e.t.toLowerCase(), dd = (e.d || '').toLowerCase();
              let s = 0;
              if (t.indexOf(q) > -1) s += 8; if (dd.indexOf(q) > -1) s += 3;
              for (const w of toks) { if (t.indexOf(w) > -1) s += 3; else if (dd.indexOf(w) > -1) s += 1; }
              return [s, e];
            }).filter(function (x) { return x[0] > 0; });
            scored.sort(function (a, b) { return b[0] - a[0]; });
            ctx.waitUntil(env.EVENTS.prepare(
              "INSERT INTO events (ts, day, name, location, label, path, ua_class) VALUES (?,?,?,?,?,?,?)"
            ).bind(Date.now(), new Date().toISOString().slice(0, 10), 'site_search', 'mcp', q.slice(0, 48), '/mcp', 'bot')
              .run().catch(function () {}));
            return mcpText(id, { results: scored.slice(0, 8).map(function (x) {
              return { title: x[1].t, description: x[1].d, url: x[1].u.startsWith('http') ? x[1].u : 'https://agiscorecard.com' + x[1].u };
            }) });
          }
          return mcpErr(id, -32602, 'unknown tool: ' + tool);
        }
        return mcpErr(id, -32601, 'method not found: ' + rpc.method);
      } catch (e) {
        return mcpErr(id, -32603, 'internal error');
      }
    }

    // 需求趋势聚合(2026-08-08,趋势涌现管线):只出聚合计数,无 PII。
    // SunWatch worker 每日拉取,把网站需求趋势折进 TG 简报的行动项。
    if (url.pathname === '/api/trends') {
      try {
        const [searches, zero, cur, prev] = await Promise.all([
          env.EVENTS.prepare(
            "SELECT label, COUNT(*) n FROM events WHERE name='site_search' AND day > date('now','-7 days') GROUP BY label ORDER BY n DESC LIMIT 10").all(),
          env.EVENTS.prepare(
            "SELECT label, COUNT(*) n FROM events WHERE name='search_no_result' AND day > date('now','-7 days') GROUP BY label HAVING n >= 2 ORDER BY n DESC LIMIT 10").all(),
          env.EVENTS.prepare(
            "SELECT path, SUM(hits) h FROM pageviews WHERE ua_class='human' AND day > date('now','-7 days') GROUP BY path ORDER BY h DESC LIMIT 40").all(),
          env.EVENTS.prepare(
            "SELECT path, SUM(hits) h FROM pageviews WHERE ua_class='human' AND day > date('now','-14 days') AND day <= date('now','-7 days') GROUP BY path").all(),
        ]);
        const prevMap = Object.fromEntries((prev.results || []).map(function (r) { return [r.path, r.h]; }));
        const rising = (cur.results || [])
          .map(function (r) { return { path: r.path, h: r.h, prev: prevMap[r.path] || 0 }; })
          .filter(function (r) { return r.h >= 5 && r.h >= 2 * Math.max(1, r.prev); })
          .slice(0, 5);
        return new Response(JSON.stringify({
          searches: searches.results || [], zeroResults: zero.results || [], risingPages: rising,
        }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=1800', 'access-control-allow-origin': '*' } });
      } catch (e) {
        return new Response(JSON.stringify({ searches: [], zeroResults: [], risingPages: [] }),
          { headers: { 'content-type': 'application/json' } });
      }
    }

    // Owner alert feed — the "major information only" channel (owner request 2026-08-16:
    // 使用已接好的股票提醒 telegram 通道, 有重大信息给我指导提醒).
    //
    // This endpoint decides WHAT is major; the SunWatch worker (which holds the Telegram
    // credentials) decides when to send. Two disciplines borrowed from notifyBaskets in
    // that worker, because both failure modes have bitten this project before:
    //   1. First-run baseline — on an empty table every currently-true condition is
    //      recorded as already delivered and nothing is sent, so a fresh deploy cannot
    //      fire a burst of "news" about states that have been true for weeks.
    //   2. The alert key encodes the state that triggered it, so a condition that stays
    //      true is announced exactly once, never re-announced on the next poll.
    // Counts only — never an email address, so the feed can be read by another worker
    // without moving PII between them.
    if (url.pathname === '/api/owner-alerts') {
      try {
        const want = (await env.EVENTS.prepare(
          "SELECT v FROM owner_identity WHERE k='alert_key'").first());
        const given = url.searchParams.get('k') || '';
        if (!want || !want.v || given !== want.v) return jsonRes({ ok: false, error: 'auth' }, 401);

        const [subs, mcp, fails, topics, readers, ai] = await Promise.all([
          env.EVENTS.prepare(
            "SELECT COUNT(*) n, SUM(status='stored') stored FROM subscribers").first(),
          env.EVENTS.prepare(
            "SELECT COUNT(*) n FROM events WHERE name='site_search' AND location='mcp'").first(),
          env.EVENTS.prepare(
            "SELECT COUNT(*) n FROM events WHERE name='sub_fail' AND day > date('now','-2 days')").first(),
          env.EVENTS.prepare(
            "SELECT topic, COUNT(*) n FROM subscribers WHERE topic IS NOT NULL AND topic<>'' GROUP BY topic").all(),
          env.EVENTS.prepare(
            "SELECT COUNT(*) n FROM events WHERE name='page_view' AND day > date('now','-28 days')").first(),
          env.EVENTS.prepare(
            "SELECT SUM(CASE WHEN day > date('now','-7 days') THEN hits ELSE 0 END) cur," +
            " SUM(CASE WHEN day <= date('now','-7 days') THEN hits ELSE 0 END) prev" +
            " FROM pageviews WHERE day > date('now','-14 days') AND (" +
            "ref_host LIKE '%chatgpt%' OR ref_host LIKE '%perplexity%' OR ref_host LIKE '%claude%'" +
            " OR ref_host LIKE '%copilot%' OR ref_host LIKE '%gemini%')").first(),
        ]);

        // Tracker score is read from the site's own published history, never recomputed
        // here — a second implementation of the weighting would drift from the first.
        let score = null, asOf = null;
        try {
          const r = await env.ASSETS.fetch(new Request(url.origin + '/index-history.json'));
          if (r.ok) {
            const h = await r.json();
            const arr = Array.isArray(h) ? h : (h.history || h.entries || []);
            const last = arr[arr.length - 1];
            if (last) { score = Number(last.score); asOf = last.date || last.asOf || null; }
          }
        } catch (e) {}

        const A = [];
        const owed = (topics.results || []).map((t) => t.topic + '×' + t.n).join(', ');
        if (Number.isFinite(score)) {
          A.push({ k: 'tracker-' + score, sev: 'high',
            title: 'AGI-2027 追踪指数 = ' + score + (asOf ? '（截至 ' + asOf + '）' : ''),
            action: '有判定翻转。① 重跑 gen_index/gen_badges/gen_agi_exposure/widget；'
              + '② 欠通知的承诺订户：' + (owed || '无')
              + '；③ 无 beehiiv key，按 NO-API 模式出可直接粘贴的邮件稿。' });
        }
        const n = (subs && subs.n) || 0;
        [1, 10, 50, 100, 500].forEach((m) => {
          if (n >= m) A.push({ k: 'subs-' + m, sev: 'high', title: '订阅者达到 ' + m + ' 人（当前 ' + n + '，未同步 ' + ((subs && subs.stored) || 0) + '）',
            action: m >= 50 ? '导出 CSV 走 beehiiv Audience → Import；Boosts 需先过 Stripe 验证，此时值得做一次。'
              : m >= 10 ? '导出 CSV 走 beehiiv Audience → Import（导入不受验证闸门限制）。'
              : '第一个真实订户 —— 承诺从此刻起必须兑现。' });
        });
        if (mcp && mcp.n > 0) A.push({ k: 'mcp-first', sev: 'high', title: 'agent 首次调用 MCP（累计 ' + mcp.n + ' 次）',
          action: 'agent 分发已开张 —— Monetization Gateway waitlist 报名从"待办"升为"紧急"，x402 按次收费就等它。' });
        if (fails && fails.n > 0) A.push({ k: 'subfail-' + (fails.n >= 5 ? 'many' : 'few'), sev: 'high',
          title: '订阅提交失败 ' + fails.n + ' 次（近 48h）', action: '漏斗在漏 —— 优先于当日一切优化，先查 /api/sub。' });
        const rd = (readers && readers.n) || 0;
        [500, 2000, 10000].forEach((m) => {
          if (rd >= m) A.push({ k: 'readers-' + m, sev: 'med', title: '真人读者（JS 确认）28 天达 ' + rd,
            action: '流量上台阶。按 CLAUDE.md 复制当前胜出的订阅位文案到下一个页面。' });
        });
        if (ai && ai.cur >= 10 && ai.cur >= 2 * Math.max(1, ai.prev || 0))
          A.push({ k: 'airef-' + ai.cur, sev: 'med', title: 'AI 引擎引荐周环比翻倍：' + (ai.prev || 0) + ' → ' + ai.cur,
            action: 'GEO 正在回报 —— 保持每日 freshness 循环，别改动正在被引用的页面。' });

        // Pending means "not yet DELIVERED", not "not yet seen" — an alert the caller
        // fetched but failed to send must keep coming back until it acks, otherwise a
        // single failed Telegram call would silently swallow the news forever.
        const any = (await env.EVENTS.prepare('SELECT COUNT(*) n FROM owner_alerts').first()).n;
        const done = new Set(((await env.EVENTS.prepare(
          'SELECT k FROM owner_alerts WHERE delivered_at IS NOT NULL').all()).results || [])
          .map((r) => r.k));
        const baseline = any === 0;
        const fresh = A.filter((a) => !done.has(a.k));
        const ack = baseline || url.searchParams.get('ack') === '1';
        for (const a of fresh) {
          await env.EVENTS.prepare(
            'INSERT OR IGNORE INTO owner_alerts (k, sev, title) VALUES (?,?,?)'
          ).bind(a.k, a.sev, a.title).run();
          if (ack) {
            await env.EVENTS.prepare(
              'UPDATE owner_alerts SET delivered_at=? WHERE k=? AND delivered_at IS NULL'
            ).bind(new Date().toISOString(), a.k).run();
          }
        }
        return jsonRes({ ok: true, baseline,
          alerts: baseline ? [] : fresh,
          state: { subscribers: n, stored: (subs && subs.stored) || 0, score: score,
                   readers28d: rd, mcpCalls: (mcp && mcp.n) || 0 } });
      } catch (e) {
        return jsonRes({ ok: false, error: 'db' }, 500);
      }
    }

    if (url.pathname === '/api/e') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: Object.assign({
          'access-control-allow-methods': 'POST',
          'access-control-allow-headers': 'content-type',
        }, CORS) });
      }
      if (request.method !== 'POST') return new Response('method', { status: 405 });

      let body;
      try { body = await request.json(); } catch (e) { return new Response('bad json', { status: 400 }); }

      const name = clean(body.n, 40);
      // UA 审计的第二维(2026-08-11):page_view 走到这里意味着 JS 真的跑了。
      // 用同一个 UA 前缀记一行 ua_class='js',即可与服务端记录的 human/bot 对账——
      // 服务端 human 数高、js 数近零的 UA 就是伪装成浏览器的爬虫,证据确凿才动正则。
      if (name === 'page_view') {
        const jsUa = request.headers.get('user-agent') || '';
        ctx.waitUntil(env.EVENTS.prepare(
          'INSERT INTO ua_audit (day, ua_prefix, ua_class, hits) VALUES (?,?,?,1)' +
          ' ON CONFLICT(day, ua_prefix, ua_class) DO UPDATE SET hits = hits + 1'
        ).bind(new Date().toISOString().slice(0, 10), jsUa.slice(0, 48) || '(none)', 'js')
          .run().catch(function () {}));
      }
      // Unknown names are dropped rather than stored: it keeps the table honest and
      // stops the endpoint being usable as write-anything storage.
      if (!name || !ALLOWED_EVENTS.has(name)) return new Response(null, { status: 204, headers: CORS });

      try {
        const now = Date.now();
        // Campaign tags belong to the PAGE the visitor is on, not to this POST.
        let pageQuery = new URLSearchParams();
        try { pageQuery = new URLSearchParams(String(body.u || '')); } catch (e) {}
        const [src, med, camp] = utmFrom(pageQuery);

        const stmt = env.EVENTS.prepare(
          'INSERT INTO events (ts, day, name, location, label, path, ref_host, country, lang, ua_class,' +
          ' utm_source, utm_medium, utm_campaign) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
        ).bind(
          now, new Date(now).toISOString().slice(0, 10), name,
          clean(body.l, 48), clean(body.b, 48), clean(body.p, 120),
          refHost(body.r), (request.headers.get('cf-ipcountry') || '').slice(0, 2) || null,
          clean(body.g, 12), uaClass(request.headers.get('user-agent')),
          src, med, camp
        );
        ctx.waitUntil(stmt.run().catch(function () {}));
      } catch (e) { /* a broken binding must not surface as an error on the page */ }

      return new Response(null, { status: 204, headers: CORS });
    }

    // On-site subscribe. Until now every one of the 203 subscribe CTAs was an outbound
    // link to beehiiv.com — the reader had to leave the site and fill in a third-party
    // form, and across 29 JS-confirmed pageviews not one click was recorded. Capturing
    // on the same origin removes that hop entirely.
    //
    // The address is stored here FIRST and forwarded to beehiiv second, deliberately:
    // if the forward fails, or no API key is configured yet, the address is still ours
    // rather than lost. Nothing about this endpoint depends on owner setup to work.
    // Backfill for addresses captured before the beehiiv keys existed. The submit-time
    // sync only fires for NEW signups, so rows stored while the keys were missing would
    // sit at status='stored' forever (the first real subscriber, 2026-08-14, is exactly
    // that row). Anyone may call this; it is idempotent, does nothing until the keys are
    // configured, caps at 20 rows per call, and returns counts only — never addresses.
    if (url.pathname === '/api/sync-pending') {
      if (!(env.BEEHIIV_API_KEY && env.BEEHIIV_PUBLICATION_ID)) {
        return jsonRes({ ok: false, note: 'beehiiv keys not configured yet' });
      }
      let rows;
      try {
        rows = (await env.EVENTS.prepare(
          "SELECT email, utm_source, utm_medium, location FROM subscribers WHERE status='stored' LIMIT 20"
        ).all()).results || [];
      } catch (e) { return jsonRes({ ok: false, error: 'db' }, 500); }
      let synced = 0, failed = 0;
      for (const row of rows) {
        try {
          const r = await fetch(
            `https://api.beehiiv.com/v2/publications/${env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
            { method: 'POST',
              headers: { 'content-type': 'application/json',
                         authorization: `Bearer ${env.BEEHIIV_API_KEY}` },
              body: JSON.stringify({
                email: row.email,
                reactivate_existing: false,
                send_welcome_email: true,
                utm_source: row.utm_source || 'agiscorecard',
                utm_medium: row.utm_medium || row.location || 'onsite',
              }) });
          await env.EVENTS.prepare(
            'UPDATE subscribers SET status=?, synced_ts=?, sync_note=? WHERE email=?'
          ).bind(r.ok ? 'synced' : 'sync_failed', Date.now(), 'backfill http ' + r.status, row.email).run();
          r.ok ? synced++ : failed++;
        } catch (e) { failed++; }
      }
      let remaining = 0;
      try {
        remaining = (await env.EVENTS.prepare(
          "SELECT COUNT(*) n FROM subscribers WHERE status='stored'"
        ).first()).n;
      } catch (e) {}
      return jsonRes({ ok: true, synced, failed, remaining });
    }

    if (url.pathname === '/api/sub') {
      const subCors = corsFor(request);
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: Object.assign({
          'access-control-allow-methods': 'POST',
          'access-control-allow-headers': 'content-type',
        }, subCors) });
      }
      if (request.method !== 'POST') return new Response('method', { status: 405 });

      let body;
      try { body = await request.json(); } catch (e) { return jsonRes({ ok: false, error: 'bad_request' }, 400, subCors); }

      const email = String(body.e || '').trim().toLowerCase().slice(0, 120);
      // Deliberately permissive but structural: enough to reject typos and junk without
      // rejecting valid addresses that a stricter pattern would wrongly refuse.
      if (!/^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(email)) {
        return jsonRes({ ok: false, error: 'invalid_email' }, 400, subCors);
      }

      const now = Date.now();
      let params = new URLSearchParams();
      try { params = new URLSearchParams(String(body.u || '')); } catch (e) {}
      const [src, med, camp] = utmFrom(params);

      let stored = false;
      try {
        await env.EVENTS.prepare(
          'INSERT INTO subscribers (email, created_ts, day, location, topic, path, lang, country,' +
          ' utm_source, utm_medium, utm_campaign, ref_host, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)' +
          ' ON CONFLICT(email) DO UPDATE SET topic = COALESCE(subscribers.topic, excluded.topic)'
        ).bind(
          email, now, new Date(now).toISOString().slice(0, 10),
          clean(body.l, 48), clean(body.t, 48), clean(body.p, 120), clean(body.g, 12),
          (request.headers.get('cf-ipcountry') || '').slice(0, 2) || null,
          src, med, camp, refHost(body.r), 'stored'
        ).run();
        stored = true;
      } catch (e) { /* fall through — a storage failure must not swallow the signup */ }

      // Forward to beehiiv when credentials exist. Runs after the row is written, so a
      // beehiiv outage costs a sync, never the address.
      let synced = false;
      if (env.BEEHIIV_API_KEY && env.BEEHIIV_PUBLICATION_ID) {
        try {
          const r = await fetch(
            `https://api.beehiiv.com/v2/publications/${env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
            { method: 'POST',
              headers: { 'content-type': 'application/json',
                         authorization: `Bearer ${env.BEEHIIV_API_KEY}` },
              body: JSON.stringify({
                email,
                reactivate_existing: false,
                send_welcome_email: true,
                utm_source: src || 'agiscorecard',
                utm_medium: med || clean(body.l, 48) || 'onsite',
              }) });
          synced = r.ok;
          ctx.waitUntil(env.EVENTS.prepare(
            'UPDATE subscribers SET status=?, synced_ts=?, sync_note=? WHERE email=?'
          ).bind(r.ok ? 'synced' : 'sync_failed', Date.now(), 'http ' + r.status, email).run().catch(function () {}));
        } catch (e) {
          ctx.waitUntil(env.EVENTS.prepare(
            'UPDATE subscribers SET status=?, sync_note=? WHERE email=?'
          ).bind('sync_failed', 'fetch_error', email).run().catch(function () {}));
        }
      }

      // `synced` tells the page which promise it may honestly make: a welcome email is
      // only claimed when beehiiv actually accepted the address.
      return jsonRes({ ok: stored || synced, synced }, 200, subCors);
    }

    // Everything else is the static site. Serving must never depend on analytics
    // working, so the measurement call below is wrapped: an unbound EVENTS binding
    // would otherwise take the whole site down on the very first request.
    const res = await env.ASSETS.fetch(request);
    const type = res.headers.get('content-type') || '';
    if (!type.includes('text/html')) return res;

    if (request.method === 'GET' && res.status === 200) {
      try { recordView(env, ctx, request, url); } catch (e) {}
    }

    // Injected at the edge, so none of the 182 page files carry either script.
    // The slide-in is appended ONLY on the allowlisted top-cited pages — a bad path
    // just means "no panel", and the append is a constant string, so this branch can
    // never take a page down.
    let extra = '';
    try { extra = slideinFor(url.pathname); } catch (e) {}
    const inject = BEACON + SUBFORM + extra;
    return new HTMLRewriter()
      .on('body', { element: function (el) { el.append(inject, { html: true }); } })
      .transform(res);
  },
};

// Which pages get the edge-injected subscribe slide-in (backlog `slidein-coverage`,
// owner 2026-08-06: "下拉到最下面弹窗才出来"). The homepage carries its own inline
// copy of this panel in index.html; these four are the top AI-cited pages (Bing AI
// Performance 2026-08: /situational-awareness-summary alone holds 42% of citations)
// and the JS-confirmed #1 landing page — until now they had no active hook at all.
// Deliberately a small allowlist, not "all deep pages": search/AI-referred readers
// are popup-sensitive, and a sibling site measured 38 dismissals per 73 popup views.
// Grow this list only on evidence (slidein_show → sub_open conversion holding up).
const SLIDEIN_PATHS = new Set([
  '/situational-awareness-summary',
  '/what-is-agi',
  '/when-will-agi-arrive',
  '/ai-orders-of-magnitude-explained',
]);
const slideinFor = (pathname) => {
  const p = String(pathname || '').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  return SLIDEIN_PATHS.has(p) ? SLIDEIN : '';
};

// Mirrors the site's gtag('event', ...) calls to /api/e. It WRAPS the existing gtag
// rather than replacing it — the original is captured as `prev` and still called, so
// GA4 receives every event exactly as before. Injecting at the edge means none of the
// 180+ page files had to change.
//
// Fire-and-forget: a failure here must never affect the page, so every call is
// wrapped and errors are swallowed. Pageviews do not depend on this script at all.
const BEACON = '<script>(function(){' +
  'var send=function(n,p){try{' +
    'var d=JSON.stringify({n:n,l:(p&&p.location)||null,b:(p&&p.label)||null,' +
      'p:location.pathname,u:location.search,r:document.referrer||null,g:navigator.language||null});' +
    "if(navigator.sendBeacon){navigator.sendBeacon('/api/e',new Blob([d],{type:'application/json'}));}" +
    "else{fetch('/api/e',{method:'POST',body:d,keepalive:true}).catch(function(){});}" +
  '}catch(e){}};' +
  'var prev=window.gtag;' +
  'window.gtag=function(){try{' +
    "if(arguments[0]==='event'){send(arguments[1],arguments[2]);}" +
  '}catch(e){}' +
  "if(typeof prev==='function'){try{return prev.apply(this,arguments);}catch(e){}}" +
  'window.dataLayer=window.dataLayer||[];window.dataLayer.push(arguments);};' +
  // One JS-confirmed pageview per load. This is NOT double counting: `pageviews` is
  // the edge tally (everything that reached the site, including agents), while
  // events.page_view only fires where JavaScript actually ran — so a real browser was
  // there. Keeping both, and reporting the ratio, is the only defensible way to say
  // how many readers the site has. It was briefly removed on 2026-08-05 to avoid a
  // perceived overlap; that left the human/bot split resting on a UA guess alone.
  "send('page_view',null);" +
'})();</script>';

// Turns every outbound beehiiv link into an on-site form, in place.
//
// Why at the edge rather than in the pages: there are 203 of these CTAs across 182
// files in several different themes. Editing them all would be a huge diff with a
// large blast radius, and it would have to be repeated for every page added later.
//
// Progressive enhancement, strictly: the anchor keeps its real href and its existing
// inline gtag call, which still fires first and preserves subscribe_click attribution.
// If this script does not load, or the request fails, the click does exactly what it
// did before and opens beehiiv. The form can only add a path, never remove one.
//
// Styling is theme-agnostic on purpose — it inherits currentColor and uses translucent
// borders, because the same markup lands on the dark English pages and on the light
// Swiss-palette Chinese ones.
const SUBFORM = '<script>(function(){' +
  'var SEL="a[href*=\'beehiiv.com/subscribe\']";' +
  'function ev(n,l,t){try{if(window.gtag)gtag("event",n,{location:l||"unknown",label:t||undefined});}catch(e){}}' +
  // "Subscribe" is a label, not a reason. What this site can promise that nobody else
  // can is a CONDITIONAL alert on one auditable claim — the reader has just finished
  // reading its pre-registered flip condition, so "only when this one changes" is a
  // real, low-frequency offer rather than another newsletter. Keyed by CTA location so
  // the promise matches where the reader is standing.
  // Language follows the page, not the site default. The form lands on 34 Chinese
  // pages and eight other language directories; shipping an English-only form to a
  // Chinese reader on a light Swiss-palette page was a defect introduced with the form
  // itself on 2026-08-06.
  'var ZH=/^zh$|^zh-/i.test((document.documentElement.lang||""))||/^\\/(zh|cn)(\\/|$)/.test(location.pathname);' +
  // The archetype is knowable from the URL on both entry paths (?pick= and
  // /agi-type/<slug>), so the result page can name what the reader just chose instead
  // of falling back to a generic newsletter pitch. On 2026-08-06 a real session walked
  // LessWrong -> homepage -> fund collapse -> opinion hook -> /agi-test and stopped
  // there; that terminus was getting the generic copy.
  'var TYPE={"accelerationist":["2025\\u201326","2025\\u201326\\u5e74"],"true-believer":["2027","2027 \\u5e74"],' +
    '"realist":["2028\\u201330","2028\\u201330 \\u5e74"],"skeptic":["the 2030s","2030 \\u5e74\\u4ee3"],' +
    '"contrarian":["2040+ or never","2040 \\u5e74\\u540e\\u6216\\u6c38\\u4e0d"]};' +
  'function pickedType(){try{' +
    'var m=/[?&]pick=([a-z-]+)/.exec(location.search);if(m&&TYPE[m[1]])return TYPE[m[1]];' +
    'var q=/\\/agi-type\\/([a-z-]+)/.exec(location.pathname);if(q&&TYPE[q[1]])return TYPE[q[1]];' +
  '}catch(e){}return null;}' +
  'var PRED={"knowledge-work":"models outpacing graduates","compute-scaling":"compute scaling at trend",' +
    '"capex":"the AI capex wave","open-source-fades":"open source fading","agi-2027":"AGI by 2027",' +
    '"the-project":"a US government AGI project","intelligence-explosion":"an intelligence explosion",' +
    '"superintelligence":"superintelligence"};' +
  'var PREDZH={"knowledge-work":"\u6a21\u578b\u80dc\u8fc7\u5927\u5b66\u6bd5\u4e1a\u751f",' +
    '"compute-scaling":"\u7b97\u529b\u6309\u8d8b\u52bf\u63a8\u8fdb","capex":"AI \u8d44\u672c\u5f00\u652f\u72c2\u6f6e",' +
    '"open-source-fades":"\u5f00\u6e90\u9000\u573a","agi-2027":"2027 \u5e74 AGI",' +
    '"the-project":"\u7f8e\u56fd\u653f\u5e9c AGI \u8ba1\u5212","intelligence-explosion":"\u667a\u80fd\u7206\u70b8",' +
    '"superintelligence":"\u8d85\u7ea7\u667a\u80fd"};' +
  'function hook(loc,topic){' +
    // The archetype terminus first: the reader has just been handed a personal answer,
    // which is a far better moment than a generic newsletter pitch.
    'var ty=pickedType();' +
    'if(ty&&/agi_test|agi_type/.test(loc))' +
      'return ZH?["\\u4f60\\u9009\\u4e86 "+ty[1]+"\\u3002\\u8bc1\\u636e\\u53d8\\u4e86\\u5c31\\u544a\\u8bc9\\u4f60",' +
        '"\\u51b3\\u5b9a\\u4f60\\u8fd9\\u4e2a\\u65e5\\u671f\\u662f\\u65e9\\u4e86\\u8fd8\\u662f\\u665a\\u4e86\\u7684\\uff0c\\u662f 8 \\u6761\\u53ef\\u8bc1\\u4f2a\\u7684\\u9884\\u6d4b\\u3002\\u5176\\u4e2d\\u4efb\\u4f55\\u4e00\\u6761\\u7ffb\\u8f6c\\u90a3\\u5929\\uff0c\\u6211\\u4eec\\u5199\\u4fe1\\u7ed9\\u4f60\\u3002"]' +
        ':["You picked "+ty[0]+". We will tell you if the evidence turns",' +
        '"Whether that date is early or late is decided by eight falsifiable predictions. The day any one of them flips, you hear from us."];' +
    'if(loc==="pred_flip"&&(ZH?PREDZH[topic]:PRED[topic]))' +
      'return ZH?["\\u8fd9\\u4e00\\u6761\\u7ffb\\u8f6c\\u65f6\\uff0c\\u53ea\\u53d1\\u4e00\\u5c01\\u4fe1",' +
        '"\\u4f60\\u521a\\u8bfb\\u5b8c\\u4ec0\\u4e48\\u4f1a\\u8ba9\\u6211\\u4eec\\u6539\\u53d8\\u5bf9<b>"+PREDZH[topic]+"</b>\\u7684\\u5224\\u65ad\\u3002\\u5b83\\u771f\\u7684\\u53d1\\u751f\\u90a3\\u5929\\u6211\\u4eec\\u5199\\u4fe1\\u7ed9\\u4f60\\uff0c\\u5176\\u4f59\\u65f6\\u5019\\u4e0d\\u5199\\u3002"]' +
        ':["One email, only if this verdict flips",' +
        '"You just read what would change our mind on <b>"+PRED[topic]+"</b>. We will write to you the day it happens \\u2014 and not otherwise."];' +
    'if(/exposure/.test(loc))' +
      'return ZH?["\\u7ec4\\u5408\\u91cd\\u65b0\\u8ba1\\u5206\\u90a3\\u5929\\u901a\\u77e5\\u6211",' +
        '"\\u4f60\\u7684\\u7ec4\\u5408\\u5c31\\u662f\\u4e00\\u6761\\u53ef\\u4ee5\\u5b58\\u4e0b\\u6765\\u7684\\u94fe\\u63a5\\u3002\\u5b83\\u80cc\\u540e\\u7684\\u5206\\u6570\\u53ea\\u5728\\u5224\\u5b9a\\u771f\\u7684\\u53d8\\u5316\\u65f6\\u624d\\u52a8\\u3002"]' +
        ':["Tell me when my basket re-scores",' +
        '"Your basket is a link you can keep. The score behind it only moves when a verdict actually moves \\u2014 that is the day you hear from us."];' +
    'if(/index|progress/.test(loc))' +
      'return ZH?["\\u5206\\u6570\\u53d8\\u52a8\\u65f6\\u901a\\u77e5\\u6211",' +
        '"0\\u2013100 \\u7684\\u8ffd\\u8e2a\\u6307\\u6570\\u53ea\\u5728 8 \\u6761\\u5224\\u5b9a\\u4e4b\\u4e00\\u53d1\\u751f\\u53d8\\u5316\\u65f6\\u624d\\u52a8\\u3002\\u6ca1\\u6709\\u53d8\\u5316\\u5c31\\u6ca1\\u6709\\u90ae\\u4ef6\\u3002"]' +
        ':["Tell me when the score moves",' +
        '"The 0\\u2013100 Thesis Tracker changes only when one of the eight verdicts changes. No verdict, no email."];' +
    'if(/invest|q2_13f/.test(loc))' +
      'return ZH?["\\u6301\\u4ed3\\u9875\\u53d8\\u52a8\\u5f53\\u5929\\u544a\\u8bc9\\u6211",' +
        '"\\u53ea\\u6709\\u9010\\u884c\\u8bfb\\u8fc7 13F \\u539f\\u6587\\u540e\\uff0c\\u672c\\u9875\\u7684\\u6301\\u4ed3\\u624d\\u4f1a\\u53d8\\uff1b\\u5b9a\\u6027\\u8868\\u6001\\u4ece\\u4e0d\\u5145\\u5f53\\u4ed3\\u4f4d\\u3002\\u5b83\\u771f\\u53d8\\u7684\\u90a3\\u5929\\uff0c\\u4f60\\u6536\\u5230\\u4fe1\\u3002"]' +
        ':["Tell me the day the holdings page changes",' +
        '"Holdings here move only after a filing has been read line by line \\u2014 qualitative commentary never becomes a position. The day this page changes, you hear from us."];' +
    'return ZH?["\\u5224\\u5b9a\\u7ffb\\u8f6c\\u65f6\\u901a\\u77e5\\u6211",' +
      '"8 \\u6761\\u5df2\\u5224\\u5b9a\\u7684\\u9884\\u6d4b\\uff0c\\u6bcf\\u4e00\\u6761\\u90fd\\u6709\\u9884\\u5148\\u767b\\u8bb0\\u7684\\u7ffb\\u8f6c\\u6761\\u4ef6\\u3002\\u771f\\u7684\\u7ffb\\u4e86\\uff0c\\u4f60\\u4f1a\\u6536\\u5230\\u4fe1\\u3002"]' +
      ':["Get told when a verdict flips",' +
      '"Eight graded predictions, each with a pre-registered condition to flip. You hear from us when one actually does."];' +
  '}' +
  'function box(a){' +
    'var loc="unknown",topic=null;' +
    'try{var oc=a.getAttribute("onclick")||"";' +
      'var m=/location:\'([^\']+)\'/.exec(oc);if(m)loc=m[1];' +
      'var t=/label:\'([^\']+)\'/.exec(oc);if(t)topic=t[1];}catch(e){}' +
    'if(!topic){try{var pa=a.closest("[data-topic]");if(pa)topic=pa.getAttribute("data-topic");}catch(e){}}' +
    'var h=hook(loc,topic);' +
    'var w=document.createElement("div");' +
    'w.setAttribute("data-subform","1");' +
    'w.style.cssText="margin:10px 0 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:14px";' +
    'var hd=document.createElement("div");' +
    'hd.style.cssText="flex:1 1 100%;font-weight:700;font-size:15px";hd.textContent=h[0];' +
    'var sb=document.createElement("div");' +
    'sb.style.cssText="flex:1 1 100%;font-size:13px;opacity:.78;margin:-2px 0 2px";sb.innerHTML=h[1];' +
    'w.appendChild(hd);w.appendChild(sb);' +
    'var i=document.createElement("input");' +
    'i.type="email";i.required=true;i.autocomplete="email";i.placeholder=ZH?"\\u4f60\\u7684\\u90ae\\u7bb1":"you@example.com";' +
    'i.setAttribute("aria-label","Email address");' +
    'i.style.cssText="flex:1 1 200px;min-width:0;padding:9px 12px;border-radius:8px;border:1px solid currentColor;' +
      'background:transparent;color:inherit;font:inherit;font-size:14px;opacity:.95";' +
    'var s=document.createElement("button");s.type="submit";s.textContent=ZH?"\\u8ba2\\u9605":"Subscribe";' +
    's.style.cssText="padding:9px 18px;border-radius:8px;border:0;background:#6350d9;color:#fff;' +
      'font:inherit;font-size:14px;font-weight:600;cursor:pointer";' +
    'var note=document.createElement("div");' +
    'note.style.cssText="flex:1 1 100%;font-size:11.5px;opacity:.7;margin-top:-2px";' +
    'note.textContent=ZH?"\\u53ea\\u8981\\u90ae\\u7bb1 \\u2014 \\u65e0\\u9700\\u6ce8\\u518c\\u3001\\u65e0\\u5bc6\\u7801\\uff0c\\u4efb\\u4e00\\u671f\\u90ae\\u4ef6\\u5747\\u53ef\\u9000\\u8ba2\\u3002":"Email only \\u2014 no account, no password. Unsubscribe from any issue.";' +
    'var f=document.createElement("form");f.style.cssText="display:contents";' +
    'f.appendChild(i);f.appendChild(s);f.appendChild(note);w.appendChild(f);' +
    'f.onsubmit=function(e){' +
      'e.preventDefault();' +
      'if(!i.value)return;' +
      's.disabled=true;s.textContent="\\u2026";ev("sub_submit",loc,topic);' +
      'fetch("/api/sub",{method:"POST",headers:{"content-type":"application/json"},' +
        'body:JSON.stringify({e:i.value,l:loc,t:topic,p:location.pathname,u:location.search,' +
          'r:document.referrer||null,g:navigator.language||null})})' +
      '.then(function(r){return r.json();})' +
      '.then(function(d){' +
        'if(!d||!d.ok)throw 0;' +
        'ev("sub_ok",loc,topic);' +
        'var pm=ZH?PREDZH:PRED;var what=(loc==="pred_flip"&&pm[topic])?pm[topic]:null;' +
        'w.innerHTML=ZH' +
          '?(d.synced?("\\u2713 \\u5df2\\u767b\\u8bb0 \\u2014 \\u8bf7\\u67e5\\u6536\\u786e\\u8ba4\\u90ae\\u4ef6"+(what?"\\uff08<b>"+what+"</b>\\uff09":"")+"\\u3002")' +
            ':("\\u2713 \\u5df2\\u767b\\u8bb0"+(what?"\\uff1a<b>"+what+"</b> \\u7ffb\\u8f6c\\u65f6\\u901a\\u77e5\\u4f60":"")+"\\u3002"))' +
          ':(d.synced?("\\u2713 Done \\u2014 check your inbox to confirm"+(what?" your alert on <b>"+what+"</b>":"")+".")' +
            ':("\\u2713 Got it \\u2014 you are on the list"+(what?" for <b>"+what+"</b>":"")+"."));' +
        'w.style.cssText="margin:10px 0 0;font-size:14px;font-weight:600";' +
      '})' +
      '.catch(function(){' +
        // Never strand a reader who is trying to give us their address: hand them
        // straight to the original destination rather than showing an error.
        'ev("sub_fail",loc,topic);' +
        'try{window.open(a.href,"_blank","noopener");}catch(e){location.href=a.href;}' +
        's.disabled=false;s.textContent="Subscribe";' +
      '});' +
    '};' +
    'return {w:w,i:i,loc:loc,topic:topic};' +
  '}' +
  'document.addEventListener("click",function(e){' +
    'var a=e.target&&e.target.closest?e.target.closest(SEL):null;' +
    'if(!a)return;' +
    'if(a.getAttribute("data-subformed")){return;}' +
    'e.preventDefault();' +
    'a.setAttribute("data-subformed","1");' +
    'var b=box(a);' +
    'var host=a.parentNode;' +
    'if(a.nextSibling)host.insertBefore(b.w,a.nextSibling);else host.appendChild(b.w);' +
    'ev("sub_open",b.loc,b.topic);' +
    'try{b.i.focus({preventScroll:true});}catch(err){b.i.focus();}' +
  '});' +
'})();</script>';

// The homepage subscribe slide-in, extended to the four top-cited pages. Copy is the
// index.html panel's, verbatim — no new pitch, no new popup format, only coverage.
// Trigger = a reading signal, whichever comes first: scroll past 1.5 screens or 40%
// of the document, OR 20 seconds of VISIBLE dwell (paused while the tab is hidden —
// an idle background tab never triggers; a reader whose answer sits above the fold
// gives no scroll signal at all, which on answer-capsule GEO pages is the COMMON
// case). One show per session; dismissing quiets it for 7 days, shared with the
// homepage via the same localStorage key. slidein_show carries the trigger
// (scroll|timer) and the subscribe anchor's onclick location is written as
// slidein_scroll / slidein_timer at show time — SUBFORM parses that attribute, so
// sub_open inherits the split and the funnel can say which timing converts.
// The whole script is one try/catch: any failure means "no panel", never a broken page.
const SLIDEIN = '<script>(function(){try{' +
  'if(document.getElementById("sub-slidein"))return;' +
  'var v=null;try{v=localStorage.getItem("subDismissed");}catch(e){}' +
  'try{if(v==="1"){localStorage.setItem("subDismissed",String(Date.now()));return;}}catch(e){}' +
  'if(v&&v!=="1"&&Date.now()-parseInt(v,10)<604800000)return;' +
  'try{if(sessionStorage.getItem("slideinShown")==="1")return;}catch(e){}' +
  'function ev(n,p){try{if(window.gtag)gtag("event",n,p);}catch(e){}}' +
  'var el=document.createElement("div");' +
  'el.id="sub-slidein";el.setAttribute("role","complementary");el.setAttribute("aria-label","Subscribe");' +
  'el.style.cssText="position:fixed;right:16px;bottom:16px;max-width:330px;background:var(--bg2,#16151f);' +
    'border:1px solid rgba(124,106,245,.38);border-radius:14px;padding:16px 18px;' +
    'box-shadow:0 10px 34px rgba(0,0,0,.45);z-index:9999;display:none;transform:translateY(18px);' +
    'opacity:0;transition:transform .3s ease,opacity .3s ease";' +
  'var x=document.createElement("button");x.setAttribute("aria-label","Close");x.innerHTML="&times;";' +
  'x.style.cssText="position:absolute;top:6px;right:10px;background:none;border:0;' +
    'color:var(--muted,#a8a4c4);font-size:20px;cursor:pointer;line-height:1";' +
  'x.onclick=function(){' +
    'el.style.transform="translateY(18px)";el.style.opacity="0";' +
    'setTimeout(function(){el.style.display="none";},300);' +
    'try{localStorage.setItem("subDismissed",String(Date.now()));}catch(e){}' +
    'ev("slidein_dismiss");' +
  '};' +
  'var t=document.createElement("p");t.style.cssText="margin:0 0 4px;font-weight:700;font-size:15px";' +
  't.textContent="🎲 Which forecaster are you?";' +
  'var s=document.createElement("p");s.style.cssText="margin:0 0 12px;font-size:12.5px;color:var(--muted,#a8a4c4)";' +
  's.textContent="Bet on 12 bold futures in 60 seconds — AGI, Mars, fusion. Then subscribe to see if you’re right.";' +
  'var a=document.createElement("a");a.href="/future-bet";a.textContent="Play The Future Bet →";' +
  'a.setAttribute("onclick","gtag(\'event\',\'agi_test_click\',{location:\'slidein\'});");' +
  'a.style.cssText="display:inline-block;background:var(--accent,#7c6af5);color:#fff;padding:9px 18px;' +
    'border-radius:8px;font-size:13px;font-weight:600;text-decoration:none";' +
  'var b=document.createElement("a");' +
  'b.href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=slidein";' +
  'b.target="_blank";b.rel="noopener";b.textContent="or just subscribe to the briefing →";' +
  'b.style.cssText="display:block;margin-top:9px;font-size:12px;color:var(--muted,#a8a4c4);text-decoration:underline";' +
  'el.appendChild(x);el.appendChild(t);el.appendChild(s);el.appendChild(a);el.appendChild(b);' +
  'document.body.appendChild(el);' +
  'var shown=false;' +
  'function show(trg){' +
    'if(shown)return;shown=true;' +
    'try{sessionStorage.setItem("slideinShown","1");}catch(e){}' +
    'b.setAttribute("onclick","gtag(\'event\',\'subscribe_click\',{location:\'slidein_"+trg+"\'});");' +
    'el.style.display="block";' +
    'requestAnimationFrame(function(){el.style.transform="translateY(0)";el.style.opacity="1";});' +
    'ev("slidein_show",{location:trg});' +
    'window.removeEventListener("scroll",maybeShow);' +
  '}' +
  'function maybeShow(){' +
    'if(shown)return;' +
    'var frac=(window.scrollY+window.innerHeight)/Math.max(document.body.scrollHeight,1);' +
    'if(window.scrollY>1.5*window.innerHeight||frac>0.4)show("scroll");' +
  '}' +
  'window.addEventListener("scroll",maybeShow,{passive:true});' +
  'var left=20000,last=Date.now();' +
  'var iv=setInterval(function(){' +
    'var now=Date.now();' +
    'if(!document.hidden)left-=now-last;' +
    'last=now;' +
    'if(shown){clearInterval(iv);return;}' +
    'if(left<=0){clearInterval(iv);show("timer");}' +
  '},1000);' +
'}catch(e){}})();</script>';
