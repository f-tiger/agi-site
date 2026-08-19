// getecoback.com — Cloudflare Worker in front of the static assets.
//
// Two jobs:
//   1. Canonical-URL 301s. Google indexed this site under 4 URL shapes per
//      page (http/https × www/bare × with/without .html), splitting ranking
//      signals. Canonical tags and the sitemap point at
//      https://getecoback.com/...*.html, so we 301 every variant onto that.
//   2. POST /api/subscribe — the "Hitze-Radar" alert subscription. Inserts the
//      email into the public.ecoback_subscribers table via PostgREST with the
//      public anon key. RLS lets anon INSERT only (with consent=true) and never
//      SELECT, so the list can never be read back with this key. No KV/D1
//      binding — just an outbound fetch — so this adds zero deploy risk. The
//      anon-insert path (RLS + email-normalising trigger) is verified.

const SUPABASE_URL = "https://uoijvtfrwlgixuogkyrz.supabase.co";
// Legacy anon JWT — accepted by PostgREST (/rest/v1) under the RLS policy.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvaWp2dGZyd2xnaXh1b2dreXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODg0NjIsImV4cCI6MjA5NzY2NDQ2Mn0.TVYuRNyW17Qh_L58Mk6KCrUqUnOg98F6k0BlY9WlCFM";
const ALLOWED_ORIGINS = new Set([
  "https://getecoback.com",
  "https://www.getecoback.com",
]);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...(extraHeaders || {}) },
  });
}

async function handleSubscribe(request) {
  const origin = request.headers.get("Origin") || "";
  const cors = ALLOWED_ORIGINS.has(origin)
    ? { "access-control-allow-origin": origin, "vary": "Origin" }
    : {};

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
      },
    });
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400, cors);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const consent = body.consent === true;
  const locale = body.locale === "en" ? "en" : "de";
  const topics = Array.isArray(body.topics)
    ? body.topics.filter((t) => typeof t === "string").slice(0, 6)
    : [];
  const region = typeof body.region === "string" ? body.region.slice(0, 80) : null;
  const source = typeof body.source === "string" ? body.source.slice(0, 200) : null;
  const consentText = typeof body.consent_text === "string" ? body.consent_text.slice(0, 500) : null;

  if (!EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400, cors);
  if (!consent) return json({ error: "consent_required" }, 400, cors);

  const row = { email, locale, source, topics, region, consent, consent_text: consentText };

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/ecoback_subscribers`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "content-type": "application/json",
      // Don't return the row (anon has no SELECT), and treat a duplicate email
      // as success rather than an error.
      prefer: "return=minimal,resolution=ignore-duplicates",
    },
    body: JSON.stringify(row),
  });

  if (resp.ok) return json({ ok: true }, 200, cors);
  // Duplicate email (unique violation) — already subscribed, still a success.
  if (resp.status === 409) return json({ ok: true, duplicate: true }, 200, cors);

  const detail = await resp.text().catch(() => "");
  return json({ error: "store_failed", status: resp.status, detail: detail.slice(0, 300) }, 502, cors);
}

const ONE_YEAR = 31536000;

// Cache-Control by asset type. The Worker runs in front of ASSETS (run_worker_first)
// and by default no explicit Cache-Control reaches the browser, so repeat visits and
// the edge revalidate more than they need to. HTML is refreshed on every deploy
// (often daily), so it stays ETag-revalidated (always fresh, but 304s are cheap);
// fingerprint-free static files get long/immutable caching to speed repeat loads —
// a Core Web Vitals win with no staleness risk for content pages.
function cacheControlFor(pathname) {
  if (pathname === "/" || pathname === "/en/" || pathname.endsWith("/") || pathname.endsWith(".html")) {
    return "public, max-age=0, must-revalidate";
  }
  if (/\.(svg|ico|png|jpe?g|webp|gif|woff2?)$/.test(pathname)) {
    return `public, max-age=${ONE_YEAR}, immutable`;
  }
  if (pathname.endsWith(".js") || pathname.endsWith(".css")) {
    // Filenames aren't fingerprinted, so cap at a day rather than immutable.
    return "public, max-age=86400";
  }
  if (/\.(xml|txt|json|webmanifest)$/.test(pathname)) {
    // sitemap / robots / feed / manifest — rebuilt per deploy, keep crawler-fresh.
    return "public, max-age=3600";
  }
  return "public, max-age=3600";
}

// Cloudflare sells "Markdown for Agents" as a Pro-plan toggle: serve the same
// page as Markdown when the client negotiates for it. On this domain AI
// crawlers outnumber human visitors several times over, and a crawler that
// gets clean Markdown quotes the text instead of guessing at it — so the
// feature is worth having. The Worker can do it without the plan, reusing the
// converter the MCP read tool already relies on. Editorial links survive as
// Markdown links (they point at our own guides); the injected commerce and
// interactive layers are stripped, exactly as in ratgeber_lesen, so no
// affiliate link is laundered through a surface that carries no page around it.
function htmlToMarkdown(html, path) {
  const titleM = html.match(/<title>([\s\S]*?)<\/title>/i);
  const descM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const artM = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainM = artM ? null : html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let body = artM ? artM[1] : (mainM ? mainM[1] : html);
  // The homepage has no <article>, so without this the whole <head> — title,
  // meta, JSON-LD — lands in the body and the title prints twice. It is also
  // the most-crawled path on the domain, so it is the one that must read well.
  body = body.replace(/<head[\s\S]*?<\/head>/i, " ")
    .replace(/<!--EB_[A-Z]+-->[\s\S]*?<!--\/EB_[A-Z]+-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (m, lvl, t) => `\n\n${"#".repeat(Number(lvl))} ${t}\n`)
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, t) => {
      const text = t.replace(/<[^>]+>/g, "").trim();
      if (!text) return "";
      // Keep our own pages as links; anything external becomes plain text so a
      // stripped-down surface never ships an outbound link without its context.
      return /^\/(?!\/)/.test(href) ? `[${text}](https://getecoback.com${href})` : text;
    })
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (m, tag, t) => `**${t.replace(/<[^>]+>/g, "").trim()}**`)
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|tr|table|ul|ol|section)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n")
    // Stripped navigation and icon-only links leave behind empty bullets.
    .replace(/^-\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n").trim();
  const head = [
    `# ${titleM ? titleM[1].trim() : path}`,
    descM ? `\n> ${descM[1].trim()}` : "",
    `\nQuelle: https://getecoback.com${path}`,
  ].filter(Boolean).join("\n");
  return `${head}\n\n${body}\n\n---\n${MCP_DISCLOSURE}\n`;
}

function wantsMarkdown(request, pathname) {
  if (!(pathname === "/" || pathname === "/en/" || pathname.endsWith(".html"))) return false;
  const accept = request.headers.get("accept") || "";
  // Only an explicit ask. Browsers send text/html and */* and must never be
  // handed Markdown by accident.
  return /\btext\/markdown\b/i.test(accept);
}

async function serveMarkdown(request, env, pathname, assetPath) {
  let res;
  try {
    const u = new URL(request.url);
    u.pathname = assetPath;
    res = await env.ASSETS.fetch(new Request(u.toString(), { headers: { accept: "text/html" } }));
  } catch (e) {
    res = null;
  }
  if (!res || !res.ok) return null;
  let html = "";
  try { html = await res.text(); } catch (e) { return null; }
  if (!html) return null;
  let md = "";
  try { md = htmlToMarkdown(html, pathname); } catch (e) { return null; }
  if (!md) return null;
  try {
    const ua = request.headers.get("user-agent") || "";
    // The deploy workflow asserts this route on every build. Day one of md_serve
    // was four rows, all of them that curl — which reads exactly like early AI
    // adoption and is not. The same mistake (an indexer counted as a third-party
    // client) has been made twice before on mcp_call, so the check goes in now.
    const isCi = /^getecoback-ci\b/i.test(ua) || /^curl\//i.test(ua) || /^Wget\//i.test(ua);
    if (env.EVENTS && !isCi) {
      await env.EVENTS.prepare(
        "INSERT INTO ev (day, name, page, ref, meta, country) VALUES (date('now'), 'md_serve', ?, '', ?, ?)"
      ).bind(pathname.slice(0, 120), JSON.stringify({ ua: ua.slice(0, 80) }),
        request.headers.get("cf-ipcountry") || "").run();
    }
  } catch (e) { /* telemetry must never cost a response */ }
  return new Response(md, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      // Without this, a cache could hand the Markdown to a browser.
      "vary": "Accept",
    },
  });
}

async function serveAsset(request, env, pathname) {
  const response = await env.ASSETS.fetch(request);
  // Only strengthen caching for successful hits; leave 404s/errors short-lived.
  if (!response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set("cache-control", cacheControlFor(pathname));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// First-party, cookieless event collection (own D1). Replaces the dependency on
// a third-party analytics subscription: the same events the pages already send
// to GA4 are mirrored here, so the funnel stays measurable even when the
// external tool lapses. Privacy: no cookies, no IP, no user id, no fingerprint
// — only an event name, the page path, a coarse referrer host and the country
// header Cloudflare already provides. That is aggregate, non-personal data, so
// no consent banner is required and nothing here identifies a visitor.
const EV_NAMES = new Set([
  "page_view", "affiliate_click", "b2b_intent", "lead_intent", "outbound_choice",
  "embed_copy", "share", "video_play", "btu_calc", "hitze_check", "heat_check",
  "strom_check", "bkw_calc", "heizkosten_calc", "taupunkt_check",
  "standort_check", "strompreis_api", "widget_view",
  "stromkosten_calc", "speicher_calc", "subscribe", "subscribe_confirmed",
  "profile_save", "profile_use", "profile_clear", "heat_now", "seal_fit",
  "hose_fit", "panel_fit", "popup_view", "popup_click", "popup_close", "site_search",
  "mcp_call", "mcp_probe", "mcp_install_click", "tariff_click", "foerder_check",
  "storage_home",
  // Written server-side by serveMarkdown (crawlers run no JS), listed here so
  // the event vocabulary stays in one place.
  "md_serve",
]);

// Live heat state for the site itself. Demand on this site is event-driven — a
// heatwave multiplies searches for portable cooling — but the seasonal rotation
// only knows the month, so during the days that matter the site said nothing.
// The Worker fetches the forecast (open-meteo, keyless) and caches it at the
// edge for an hour, so the visitor's browser never talks to a third party: no
// consent question, no third-party cost on the page.
// Three cities rather than seven: enough to catch a regional heatwave, few
// enough that the whole thing finishes fast. Every step is guarded — a forecast
// outage, a slow upstream or a Cache API problem must degrade to "nothing to
// report", never to an empty response, because callers treat empty as broken.
const HEAT_CITIES = [
  ["Berlin", 52.52, 13.41], ["Frankfurt", 50.11, 8.68], ["München", 48.14, 11.58],
];
const HEAT_NOTHING = { level: 0, region: "", temp: null, day: "" };

async function cityMax(name, lat, lon) {
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max&forecast_days=3&timezone=Europe%2FBerlin`,
      { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = await r.json();
    const temps = (d && d.daily && d.daily.temperature_2m_max) || [];
    const days = (d && d.daily && d.daily.time) || [];
    let top = null;
    temps.forEach((t, i) => {
      if (typeof t === "number" && (top === null || t > top.temp)) {
        top = { region: name, temp: t, day: days[i] || "" };
      }
    });
    return top;
  } catch (e) {
    return null;
  }
}

// The bare reading, shared by the JSON endpoint and the MCP tool.
async function heatReading() {
  let best = HEAT_NOTHING;
  try {
    const results = await Promise.all(HEAT_CITIES.map(([n, la, lo]) => cityMax(n, la, lo)));
    for (const c of results) {
      if (c && (best.temp === null || c.temp > best.temp)) best = { level: 0, ...c };
    }
    if (best.temp !== null) best.level = best.temp >= 32 ? 2 : best.temp >= 28 ? 1 : 0;
  } catch (e) {
    best = HEAT_NOTHING;
  }
  return best;
}

async function handleHeat() {
  const cacheKey = new Request("https://getecoback.com/__heat");
  let cache = null;
  try {
    cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  } catch (e) {
    cache = null;
  }

  const best = await heatReading();

  const resp = json(best, 200, { "cache-control": "public, max-age=3600" });
  // Only cache a real reading; caching a failure would freeze the site silent
  // for an hour on a day that might actually be hot.
  if (cache && best.temp !== null) {
    try { await cache.put(cacheKey, resp.clone()); } catch (e) { /* cache is optional */ }
  }
  return resp;
}

// --- Exchange electricity prices, fetched on the server instead of in the
// reader's browser. The radar used to call api.awattar.de and smard.de directly
// from the page, which meant (a) every visitor contacted two third parties we
// never asked consent for, and (b) the site's flagship energy tool silently
// fell back to "couldn't load" whenever either host refused a cross-origin
// request. Same shape as /api/heat: two sources with individual timeouts, an
// edge cache, and a response that is always valid JSON — a failure returns
// {ok:false} and is never cached, so a bad minute doesn't freeze the day. ---
function stromHoursFromAwattar(d, t0, t1) {
  const out = [];
  for (const e of (d && d.data) || []) {
    if (e.start_timestamp >= t0 && e.start_timestamp < t1) {
      out.push({ h: new Date(e.start_timestamp).getUTCHours(), ct: e.marketprice / 10 });
    }
  }
  return out;
}

async function stromReading() {
  // Day boundary in German local time — the reader's "today", not UTC's.
  const now = new Date();
  const berlin = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const offset = berlin.getTime() - now.getTime();
  const midnight = new Date(berlin);
  midnight.setHours(0, 0, 0, 0);
  const t0 = midnight.getTime() - offset;
  const t1 = t0 + 86400000;

  try {
    const r = await fetch("https://api.awattar.de/v1/marketdata", {
      signal: AbortSignal.timeout(6000),
      headers: { accept: "application/json" },
    });
    if (r.ok) {
      const hours = stromHoursFromAwattar(await r.json(), t0, t1);
      if (hours.length >= 6) return { ok: true, src: "aWATTar/EPEX", hours };
    }
  } catch (e) { /* fall through to SMARD */ }

  try {
    const idxR = await fetch("https://www.smard.de/app/chart_data/4169/DE/index_hour.json",
      { signal: AbortSignal.timeout(6000) });
    if (idxR.ok) {
      const idx = await idxR.json();
      const ts = idx.timestamps[idx.timestamps.length - 1];
      const dR = await fetch(`https://www.smard.de/app/chart_data/4169/DE/4169_DE_hour_${ts}.json`,
        { signal: AbortSignal.timeout(6000) });
      if (dR.ok) {
        const d = await dR.json();
        const hours = [];
        for (const s of d.series || []) {
          if (s[0] >= t0 && s[0] < t1 && s[1] !== null) {
            hours.push({ h: new Date(s[0]).getUTCHours(), ct: s[1] / 10 });
          }
        }
        if (hours.length >= 6) return { ok: true, src: "SMARD/Bundesnetzagentur", hours };
      }
    }
  } catch (e) { /* both sources down */ }

  return { ok: false, src: null, hours: [] };
}

async function handleStrom() {
  const cacheKey = new Request("https://getecoback.com/__strom");
  let cache = null;
  try {
    cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  } catch (e) {
    cache = null;
  }
  const data = await stromReading();
  // Day-ahead prices are fixed once published, so half an hour of edge cache
  // costs nothing in accuracy and keeps the upstreams unbothered.
  const resp = json(data, 200, { "cache-control": "public, max-age=1800" });
  if (cache && data.ok) {
    try { await cache.put(cacheKey, resp.clone()); } catch (e) { /* cache is optional */ }
  }
  return resp;
}

async function handleEvent(request, env) {
  // Embeds live on other people's sites, so this endpoint accepts any origin.
  // Safe because it stores no personal data and only whitelisted event names.
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);
  if (!env.EVENTS) return json({ ok: false, error: "no_binding" }, 200, cors);

  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400, cors); }

  const name = String(body.n || "").slice(0, 40);
  if (!EV_NAMES.has(name)) return json({ ok: false, error: "unknown_event" }, 200, cors);

  const page = String(body.p || "").slice(0, 200);
  // Referrer reduced to its host — enough to tell Google from ChatGPT, not
  // enough to reconstruct anyone's browsing.
  let ref = "";
  try { ref = body.r ? new URL(String(body.r)).hostname.slice(0, 100) : ""; } catch { ref = ""; }
  const meta = body.m ? JSON.stringify(body.m).slice(0, 200) : "";
  const country = request.headers.get("CF-IPCountry") || "";
  const day = new Date().toISOString().slice(0, 10);

  try {
    await env.EVENTS.prepare(
      "INSERT INTO ev (day, name, page, ref, meta, country) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(day, name, page, ref, meta, country).run();
  } catch (e) {
    return json({ ok: false }, 200, cors);
  }
  return json({ ok: true }, 200, cors);
}

// Live "most read" ranking from the site's own first-party funnel, so the
// homepage's popular block reorders itself with real demand instead of a list
// hardcoded at build time. Aggregate only — paths and counts, nothing personal.
// Same defensive contract as /api/heat: every step guarded, failure degrades to
// an empty list (never an empty body), failures are never cached.
const TOP_EMPTY = { pages: [] };

async function handleTop(env) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=21600",
    "access-control-allow-origin": "*",
  };
  let cache = null;
  const key = "https://getecoback.com/__top-cache-v1";
  try {
    cache = caches.default;
    const hit = await cache.match(key);
    if (hit) return hit;
  } catch (e) { /* cache is optional, not a dependency */ }
  if (!env.EVENTS) return new Response(JSON.stringify(TOP_EMPTY), { headers });
  try {
    const rs = await env.EVENTS.prepare(
      "SELECT page, COUNT(*) AS n FROM ev WHERE name='page_view' " +
      "AND day >= date('now','-28 day') AND page LIKE '/guide/%' " +
      "AND page NOT LIKE '/__ci%' GROUP BY page ORDER BY n DESC LIMIT 8"
    ).all();
    const pages = (rs.results || [])
      .filter((r) => typeof r.page === "string" && /^\/guide\/[a-z0-9-]+\.html$/.test(r.page))
      .map((r) => ({ page: r.page, n: r.n }));
    const resp = new Response(JSON.stringify({ pages }), { headers });
    try { if (cache) await cache.put(key, resp.clone()); } catch (e) { /* optional */ }
    return resp;
  } catch (e) {
    return new Response(JSON.stringify(TOP_EMPTY), { headers });
  }
}

// Condensation feed for the trend radar: week-over-week event totals, page
// acceleration, and the zero-hit search queue, in one aggregate response. This
// is what the daily radar script reads to write docs/trend-radar.md — the
// standing source material the hourly agent routine judges from. Aggregate
// only, same defensive contract as /api/heat and /api/top.
const TREND_EMPTY = { events: [], pages: [], zero_hits: [] };

async function handleTrend(env) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=3600",
    "access-control-allow-origin": "*",
  };
  if (!env.EVENTS) return new Response(JSON.stringify(TREND_EMPTY), { headers });
  try {
    const ev = await env.EVENTS.prepare(
      "SELECT name, " +
      "SUM(CASE WHEN day >= date('now','-7 day') THEN 1 ELSE 0 END) AS n7, " +
      "SUM(CASE WHEN day < date('now','-7 day') AND day >= date('now','-14 day') THEN 1 ELSE 0 END) AS p7 " +
      "FROM ev WHERE page NOT LIKE '/__ci%' AND day >= date('now','-14 day') " +
      "GROUP BY name ORDER BY n7 DESC LIMIT 30"
    ).all();
    const pg = await env.EVENTS.prepare(
      "SELECT page, " +
      "SUM(CASE WHEN day >= date('now','-7 day') THEN 1 ELSE 0 END) AS n7, " +
      "SUM(CASE WHEN day < date('now','-7 day') AND day >= date('now','-14 day') THEN 1 ELSE 0 END) AS p7 " +
      "FROM ev WHERE name='page_view' AND page NOT LIKE '/__ci%' AND day >= date('now','-14 day') " +
      "GROUP BY page HAVING n7 >= 2 ORDER BY n7 DESC LIMIT 25"
    ).all();
    const zh = await env.EVENTS.prepare(
      "SELECT json_extract(meta,'$.q') AS q, COUNT(*) AS n FROM ev " +
      "WHERE name='site_search' AND json_extract(meta,'$.hits')=0 " +
      "AND page NOT LIKE '/__ci%' AND day >= date('now','-28 day') " +
      "GROUP BY q ORDER BY n DESC LIMIT 20"
    ).all();
    // Discovery layer: where readers come from (the AI-referral share drives
    // the GEO priority rule) and which MCP tools real agents actually call.
    const refs = await env.EVENTS.prepare(
      "SELECT ref, " +
      "SUM(CASE WHEN day >= date('now','-7 day') THEN 1 ELSE 0 END) AS n7, " +
      "SUM(CASE WHEN day < date('now','-7 day') AND day >= date('now','-14 day') THEN 1 ELSE 0 END) AS p7 " +
      "FROM ev WHERE name='page_view' AND ref != '' AND page NOT LIKE '/__ci%' " +
      "AND day >= date('now','-14 day') GROUP BY ref ORDER BY n7 DESC LIMIT 15"
    ).all();
    const mcp = await env.EVENTS.prepare(
      "SELECT json_extract(meta,'$.tool') AS tool, COUNT(*) AS n FROM ev " +
      "WHERE name='mcp_call' AND day >= date('now','-28 day') " +
      "GROUP BY tool ORDER BY n DESC LIMIT 10"
    ).all();
    return new Response(JSON.stringify({
      events: ev.results || [], pages: pg.results || [], zero_hits: zh.results || [],
      refs: refs.results || [], mcp: mcp.results || [],
    }), { headers });
  } catch (e) {
    return new Response(JSON.stringify(TREND_EMPTY), { headers });
  }
}

// ---------------------------------------------------------------------------
// MCP server (Model Context Protocol, stateless Streamable HTTP).
// The AI-native bet made concrete: AI assistants are moving from citing pages
// to calling tools, and the site that provides the tool gets cited on every
// call. These four tools mirror the site's own calculators line for line, so
// the agent and the page can never disagree — and every result carries its
// source URL and the site's honesty line ("not self-tested"), which means the
// disclosure travels with the data. No auth, no state, aggregate-only.
const MCP_TOOLS = [
  {
    name: "btu_empfehlung",
    description: "Empfohlene Kühlleistung (BTU) für einen Raum, mit passender Geräteklasse. — Recommended cooling capacity in BTU for a room, with the matching device class: how many BTU do I need for X m²? Same formula as the calculator on getecoback.com (340 BTU/m² × sun factor), for Germany and Europe.",
    inputSchema: {
      type: "object",
      properties: {
        qm: { type: "number", description: "Raumfläche in m² — room floor area in square metres (4–120)" },
        sonne: { type: "string", enum: ["wenig", "normal", "viel"], description: "Sonneneinstrahlung — sun exposure: wenig = low/shaded, normal, viel = strong (south/west or top floor). Default: normal" },
      },
      required: ["qm"],
    },
  },
  {
    name: "fensterabdichtung_laenge",
    description: "Benötigte Länge einer Fensterabdichtung für mobile Klimaanlagen aus den Flügelmaßen. — Required window-seal length for a portable air conditioner from the sash measurements (perimeter = 2×(width+height)), plus the off-the-shelf size that fits. Covers tilt-and-turn and roof windows.",
    inputSchema: {
      type: "object",
      properties: {
        breite_cm: { type: "number", description: "Flügelbreite in cm (20–300) — der bewegliche Teil, nicht der Rahmen" },
        hoehe_cm: { type: "number", description: "Flügelhöhe in cm (20–300)" },
        fenstertyp: { type: "string", enum: ["kipp", "drehkipp", "dachfenster"], description: "Fenstertyp — window type: kipp/drehkipp = tilt or tilt-and-turn, dachfenster = roof/skylight. Default: kipp" },
      },
      required: ["breite_cm", "hoehe_cm"],
    },
  },
  {
    name: "hitzewelle_vorschau",
    description: "Live-Hitzevorschau für Deutschland (nächste 3 Tage). — Live heatwave outlook for Germany: highest temperature over the next three days across Berlin, Frankfurt and Munich (open-meteo), flagged from 28 °C and 32 °C.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "klimaanlage_stromkosten",
    description: "Stromkosten eines Klimageräts. — Running cost of an air conditioner or any appliance: watts × hours × electricity price × compressor duty cycle. What does it cost to run per hour, per day, per month?",
    inputSchema: {
      type: "object",
      properties: {
        watt: { type: "number", description: "Leistungsaufnahme in Watt (z. B. 1000)" },
        stunden_pro_tag: { type: "number", description: "Betriebsstunden pro Tag" },
        strompreis_euro_kwh: { type: "number", description: "Arbeitspreis in €/kWh (z. B. 0.30)" },
        tage: { type: "number", description: "Anzahl Tage (Default: 30)" },
        auslastung: { type: "number", description: "Kompressor-Auslastung 0–1 (Default: 0.65)" },
      },
      required: ["watt", "stunden_pro_tag", "strompreis_euro_kwh"],
    },
  },
  // Added after btu_empfehlung turned out to be the tool third parties actually
  // call, three days running. Both mirror a calculator the site already ships,
  // and both answer the same shape of question — "what size / is it safe" — so
  // the expansion follows the observed demand instead of guessing at breadth.
  {
    name: "heizleistung_watt",
    description: "Benötigte Heizleistung in Watt für einen Raum (Infrarot/Elektro). — Required heating power in watts for a room, from floor area and insulation standard (60/80/100 W/m² for new build, existing, old building), including running cost per full-load hour.",
    inputSchema: {
      type: "object",
      properties: {
        qm: { type: "number", description: "Raumfläche in m² (1–100)" },
        daemmung: { type: "string", enum: ["gut", "mittel", "schlecht"], description: "Dämmstandard: gut = Neubau (60 W/m²), mittel = Bestand (80), schlecht = Altbau (100). Default: mittel" },
        strompreis_euro_kwh: { type: "number", description: "Arbeitspreis in €/kWh für die Betriebskosten (Default: 0.30)" },
      },
      required: ["qm"],
    },
  },
  {
    name: "taupunkt_lueften",
    description: "Taupunkt der Außenluft und die Antwort auf 'darf ich jetzt lüften?'. — Dew point of the outside air and whether opening the window right now would make a basement or damp room wetter (Magnus formula, walls counted 2 °C below room temperature).",
    inputSchema: {
      type: "object",
      properties: {
        aussen_temp_c: { type: "number", description: "Außentemperatur in °C" },
        aussen_luftfeuchte_prozent: { type: "number", description: "Relative Luftfeuchte außen in % (5–100)" },
        innen_temp_c: { type: "number", description: "Innen-/Kellertemperatur in °C (Wände werden 2 °C kühler gerechnet)" },
      },
      required: ["aussen_temp_c", "aussen_luftfeuchte_prozent", "innen_temp_c"],
    },
  },
  {
    name: "balkonspeicher_foerderung",
    description: "Balkonkraftwerk-/Speicher-Förderung in Deutschland (Stand 08/2026) und wie ein Zuschuss die Amortisation verkürzt. — German subsidies for plug-in balcony solar and storage: which state programmes exist, the ~100 € storage bonus, the apply-BEFORE-buying rule most programmes enforce, and the payback arithmetic with and without a grant. No federal purchase premium — only the VAT exemption.",
    inputSchema: {
      type: "object",
      properties: {
        bundesland: { type: "string", description: "Bundesland, z. B. 'Sachsen' oder 'Berlin' — German federal state (optional; ohne Angabe wird die Gesamtlage beschrieben)" },
        preis_eur: { type: "number", description: "Kaufpreis des Speichers/Sets in € für die Amortisationsrechnung (optional)" },
        zuschuss_eur: { type: "number", description: "Erwarteter Zuschuss in € (optional, Default 0)" },
        ersparnis_eur_jahr: { type: "number", description: "Jährliche Stromersparnis in € (optional, Default 100 — typisch 60–120 € bei 1–1,5 kWh/Tag Verschiebung)" },
      },
    },
  },
  // Retrieval, not arithmetic. The six tools above hand back a number; an
  // assistant answering "welche Klimaanlage bei Kippfenster im Dachgeschoss?"
  // needs the site's actual guides — and a URL it can cite. These two make the
  // 128-guide corpus searchable and readable through the same server, so being
  // installed is enough to be quotable.
  {
    name: "ratgeber_suche",
    description: "Durchsucht die Ratgeber von getecoback.com und gibt Titel, URL und Kurzbeschreibung zurück. — Searches this site's guides on air conditioning, window sealing, ventilation, heating, dehumidifiers and electricity costs, returning title, URL and summary for each match — citable sources for the answer.",
    inputSchema: {
      type: "object",
      properties: {
        frage: { type: "string", description: "Suchbegriff oder Frage — search term or question, German or English, e.g. 'Klimaanlage Kippfenster abdichten' or 'portable ac tilt window'" },
        sprache: { type: "string", enum: ["de", "en"], description: "Nur deutsche oder nur englische Seiten (Default: beide)" },
        max: { type: "number", description: "Anzahl Treffer (1–10, Default: 5)" },
      },
      required: ["frage"],
    },
  },
  {
    name: "ratgeber_lesen",
    description: "Liefert den Volltext eines einzelnen Ratgebers als Klartext. — Returns the full plain text of one guide from getecoback.com so the answer can be written from the source and cited. Pass a path or URL from ratgeber_suche.",
    inputSchema: {
      type: "object",
      properties: {
        pfad: { type: "string", description: "Pfad oder vollständige URL, z. B. /guide/klimaanlage-kippfenster.html" },
      },
      required: ["pfad"],
    },
  },
];

// Words that would match half the corpus and only add noise to the scoring.
const SEARCH_STOP = new Set([
  "der", "die", "das", "und", "oder", "für", "von", "mit", "auf", "bei", "ein", "eine", "einen",
  "ist", "sind", "wie", "was", "wann", "wo", "welche", "welcher", "welches", "kann", "man", "im",
  "the", "and", "for", "with", "what", "which", "how", "does", "can", "you", "are", "your",
]);

function searchTokens(q) {
  return String(q || "").toLowerCase().split(/[^a-z0-9äöüß]+/)
    .filter((w) => w.length >= 3 && !SEARCH_STOP.has(w)).slice(0, 12);
}

function scoreEntry(entry, tokens, phrase) {
  const title = (entry.t || "").toLowerCase();
  const desc = (entry.d || "").toLowerCase();
  const url = (entry.u || "").toLowerCase();
  let score = 0;
  for (const w of tokens) {
    if (url.includes(w)) score += 4;
    if (title.includes(w)) score += 3;
    if (desc.includes(w)) score += 1;
  }
  if (phrase.length >= 6 && (title.includes(phrase) || desc.includes(phrase))) score += 5;
  return score;
}

const MCP_DISCLOSURE = "Quelle: getecoback.com — unabhängiger Raumklima-Ratgeber. Empfehlungen fassen öffentliche Tests zusammen (nicht selbst getestet); Kauflinks der Website sind Affiliate-Links.";

function mcpToolResult(text) {
  return { content: [{ type: "text", text }], isError: false };
}

async function mcpCallTool(name, args, env) {
  const a = args || {};
  if (name === "btu_empfehlung") {
    const qm = Math.max(4, Math.min(120, Number(a.qm) || 20));
    const sun = a.sonne === "wenig" ? 0.9 : (a.sonne === "viel" ? 1.2 : 1);
    // Identical to /guide/btu-rechner.html and the homepage tool.
    const btu = Math.round((qm * 340 * sun) / 500) * 500;
    let klasse, seite;
    if (btu <= 9000) { klasse = "bis ca. 9.000 BTU (z. B. Comfee MPPH-09CRN7)"; }
    else if (btu <= 11000) { klasse = "ca. 10.000–11.000 BTU (z. B. De'Longhi Pinguino PAC EX105)"; }
    else { klasse = "ab 12.000 BTU (z. B. Klarstein Kraftwerk Smart 12K)"; }
    seite = "https://getecoback.com/guide/btu-rechner.html";
    // Point at the guide for this room size, not just the calculator: an
    // assistant citing us should land the reader on the page that actually
    // answers "welches Gerät für 25 m²" — that page is what AI clients have
    // been linking to.
    const qp = qm <= 12 ? 10 : qm <= 17 ? 15 : qm <= 22 ? 20 : qm <= 27 ? 25 : qm <= 35 ? 30 : 40;
    return mcpToolResult(
      `Empfohlene Kühlleistung für ${qm} m² (Sonne: ${a.sonne || "normal"}): ca. ${btu.toLocaleString("de-DE")} BTU.\n` +
      `Passende Geräteklasse: ${klasse}.\n` +
      `Wichtig: Ohne dichte Fensterabdichtung verliert jeder Monoblock den Großteil seiner Wirkung.\n` +
      `Geräte-Empfehlungen für diese Raumgröße: https://getecoback.com/guide/klimaanlage-${qp}-qm.html\n` +
      `Vollständiger Rechner (Decke, Personen, offene Küche): ${seite}\n${MCP_DISCLOSURE}`);
  }
  if (name === "fensterabdichtung_laenge") {
    const W = Math.max(20, Math.min(300, Number(a.breite_cm) || 60));
    const H = Math.max(20, Math.min(300, Number(a.hoehe_cm) || 140));
    // Identical to the EB_SEALFIT calculator: perimeter of the sash.
    const need = (2 * (W + H)) / 100;
    const sizes = [2.0, 2.8, 3.0, 4.0, 5.0];
    const fit = sizes.find((s) => s >= need);
    const size = fit ? `Passende Konfektionsgröße: ${Math.round(fit * 100)} cm.`
      : "Größer als übliche Konfektionsgrößen — hier hilft nur Maßanfertigung.";
    // Window sealing is the topic AI assistants already cite this site for, so
    // the answer carries the guide for the window type that was actually asked
    // about rather than one generic link.
    const typGuide = a.fenstertyp === "dachfenster"
      ? "Dachfenster/Velux: https://getecoback.com/guide/klimaanlage-dachfenster.html"
      : "Kipp- & Dreh-Kipp-Fenster: https://getecoback.com/guide/klimaanlage-kippfenster.html";
    return mcpToolResult(
      `Benötigte Abdichtungslänge für einen Flügel ${W}×${H} cm: mindestens ${need.toFixed(2).replace(".", ",")} m (Umfang 2×(B+H)). ${size}\n` +
      `Gemessen wird der bewegliche Flügel, nicht der Rahmen. Üblicher Schwachpunkt ist das Klebeband — wo möglich klemmen statt kleben.\n` +
      `${typGuide}\n` +
      `Kaufberatung nach Bauart: https://getecoback.com/guide/fensterabdichtung-klimaanlage.html\n${MCP_DISCLOSURE}`);
  }
  if (name === "hitzewelle_vorschau") {
    const d = await heatReading();
    let head;
    if (!d || !d.level) head = "Keine Hitze in Sicht: In Berlin/Frankfurt/München bleibt es die nächsten 3 Tage unter 28 °C.";
    else if (d.level >= 2) head = `Hitzewelle im Anmarsch: bis ${Math.round(d.temp)} °C in ${d.region} (${d.day}). Erfahrungsgemäß sind mobile Klimageräte dann innerhalb weniger Tage vergriffen — vor der Welle entscheiden.`;
    else head = `Es wird warm: bis ${Math.round(d.temp)} °C in ${d.region} (${d.day}).`;
    return mcpToolResult(`${head}\nDatenquelle: open-meteo (3 Städte, 3 Tage). Ratgeber: https://getecoback.com/\n${MCP_DISCLOSURE}`);
  }
  if (name === "klimaanlage_stromkosten") {
    const watt = Math.max(1, Number(a.watt) || 1000);
    const h = Math.max(0, Math.min(24, Number(a.stunden_pro_tag) || 8));
    const price = Math.max(0, Number(a.strompreis_euro_kwh) || 0.3);
    const days = Math.max(1, Math.min(365, Number(a.tage) || 30));
    const duty = Math.max(0, Math.min(1, a.auslastung === undefined ? 0.65 : Number(a.auslastung)));
    // Identical to /guide/stromkosten-rechner.html: perHour = kW × price × duty.
    const perH = (watt / 1000) * price * duty;
    const total = perH * h * days;
    return mcpToolResult(
      `Stromkosten für ${watt} W, ${h} h/Tag, ${price.toFixed(2).replace(".", ",")} €/kWh, Auslastung ${(duty * 100).toFixed(0)} %:\n` +
      `≈ ${perH.toFixed(2).replace(".", ",")} €/Betriebsstunde · ≈ ${total.toFixed(2).replace(".", ",")} € über ${days} Tage.\n` +
      `Vollständiger Rechner: https://getecoback.com/guide/stromkosten-rechner.html\n${MCP_DISCLOSURE}`);
  }
  if (name === "heizleistung_watt") {
    const qm = Math.max(1, Math.min(100, Number(a.qm) || 20));
    const wPerQm = a.daemmung === "gut" ? 60 : (a.daemmung === "schlecht" ? 100 : 80);
    const price = Math.max(0, Number(a.strompreis_euro_kwh) || 0.3);
    // Identical to /guide/infrarotheizung-watt-rechner.html.
    const watt = Math.round((qm * wPerQm) / 10) * 10;
    const split = watt > 2000
      ? `\nÜber 2.000 W besser auf zwei Panels verteilen, z. B. 2 × ${(Math.round(watt / 2 / 50) * 50).toLocaleString("de-DE")} W an verschiedenen Wänden.`
      : "";
    return mcpToolResult(
      `Heizleistung für ${qm} m² (Dämmung: ${a.daemmung || "mittel"}, ${wPerQm} W/m²): ca. ${watt.toLocaleString("de-DE")} Watt.${split}\n` +
      `Betriebskosten bei ${price.toFixed(2).replace(".", ",")} €/kWh: ca. ${((watt / 1000) * price).toFixed(2).replace(".", ",")} € pro Stunde Volllast — Infrarot heizt Flächen, läuft aber selten durchgehend.\n` +
      `Vollständiger Rechner: https://getecoback.com/guide/infrarotheizung-watt-rechner.html\n${MCP_DISCLOSURE}`);
  }
  if (name === "taupunkt_lueften") {
    const t = Number(a.aussen_temp_c);
    const rh = Math.max(5, Math.min(100, Number(a.aussen_luftfeuchte_prozent)));
    const ti = Number(a.innen_temp_c);
    if (!isFinite(t) || !isFinite(rh) || !isFinite(ti)) {
      return { content: [{ type: "text", text: "Bitte Außentemperatur, Außenluftfeuchte und Innentemperatur als Zahlen angeben." }], isError: true };
    }
    // Magnus formula, identical to the Taupunkt-Check widget.
    const g = Math.log(rh / 100) + (17.62 * t) / (243.12 + t);
    const td = (243.12 * g) / (17.62 - g);
    const ok = td < ti - 2;
    return mcpToolResult(
      `Taupunkt der Außenluft: ${td.toFixed(1).replace(".", ",")} °C (bei ${t} °C und ${rh} % rel. Feuchte).\n` +
      (ok
        ? `Lüften ist jetzt sinnvoll: Der Taupunkt liegt unter der gerechneten Wandtemperatur (${(ti - 2).toFixed(1).replace(".", ",")} °C), es schlägt sich nichts nieder.`
        : `Jetzt nicht lüften: Der Taupunkt liegt über der gerechneten Wandtemperatur (${(ti - 2).toFixed(1).replace(".", ",")} °C) — die warme Außenluft würde an den kühlen Wänden kondensieren und die Feuchte erhöhen.`) +
      `\nGerechnet wird mit Wänden 2 °C unter Raumtemperatur. Im Sommer sind das oft die frühen Morgenstunden.\n` +
      `Hintergrund & Check im Browser: https://getecoback.com/guide/keller-lueften-sommer.html\n${MCP_DISCLOSURE}`);
  }
  if (name === "balkonspeicher_foerderung") {
    // Mirrors the table on /guide/balkonspeicher-foerderung.html — same data,
    // same caveats. Programme pots empty mid-year, so the answer names the
    // magnitude and the rule, never a guaranteed amount.
    const LAND = {
      "mecklenburg-vorpommern": "Mecklenburg-Vorpommern hat ein Landesprogramm (Größenordnung 300–500 €).",
      "sachsen": "Sachsen fördert speziell Mietende — befristetes Programm, Größenordnung 300–500 €.",
      "hamburg": "Hamburg hat ein Landesprogramm (Größenordnung 300–500 €).",
      "berlin": "Berlin fördert an den Bezug von Sozialleistungen geknüpft (Größenordnung 300–500 €).",
    };
    const raw = String(a.bundesland || "").trim().toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/\s+/g, "-");
    const key = raw === "mv" ? "mecklenburg-vorpommern" : raw;
    const landLine = key
      ? (LAND[key] || `Für ${a.bundesland}: kein landesweites Programm bekannt (Stand 08/2026).`)
      : "Landesprogramme gibt es u. a. in Mecklenburg-Vorpommern, Sachsen (Mietende, befristet), Hamburg und Berlin (an Sozialleistungen geknüpft) — Größenordnung 300–500 €.";
    let calc = "";
    const preis = Number(a.preis_eur);
    if (isFinite(preis) && preis > 0) {
      const zuschuss = Math.max(0, Math.min(preis, Number(a.zuschuss_eur) || 0));
      const sparen = Math.max(10, Number(a.ersparnis_eur_jahr) || 100);
      const ohne = preis / sparen;
      const mit = (preis - zuschuss) / sparen;
      calc = `\nAmortisation bei ${sparen.toFixed(0)} € Ersparnis/Jahr: ohne Zuschuss ca. ${ohne.toFixed(1).replace(".", ",")} Jahre` +
        (zuschuss > 0 ? `, mit ${zuschuss.toFixed(0)} € Zuschuss ca. ${mit.toFixed(1).replace(".", ",")} Jahre. Der Zuschuss ändert nichts am Nutzen pro Jahr — er verkürzt nur die Zeit bis zur schwarzen Null.` : ".");
    }
    return mcpToolResult(
      `Balkonkraftwerk-/Speicher-Förderung in Deutschland (Stand 08/2026):\n` +
      `Bundesweit gibt es KEINE Kaufprämie — nur die Mehrwertsteuer-Befreiung, die im Preis bereits enthalten ist.\n` +
      `${landLine}\n` +
      `Dazu rund 20 kommunale Programme (u. a. Leipzig, Dresden, Chemnitz) mit 100–500 €; einige zahlen ca. +100 € extra, wenn ein Speicher dazukommt.\n` +
      `Wichtigste Regel: ERST Antrag stellen, DANN kaufen — eine Rechnung von vor der Bewilligung kippt den Zuschuss in fast allen Programmen.${calc}\n` +
      `Fördertöpfe sind begrenzt und ändern sich unterjährig — verbindlich ist nur die Richtlinie des eigenen Programms (Kommune/Stadtwerke prüfen).\n` +
      `Details & Rechenweg: https://getecoback.com/guide/balkonspeicher-foerderung.html\n${MCP_DISCLOSURE}`);
  }
  if (name === "ratgeber_suche") {
    if (!env || !env.ASSETS) {
      return { content: [{ type: "text", text: "Suchindex derzeit nicht erreichbar." }], isError: true };
    }
    const tokens = searchTokens(a.frage);
    if (!tokens.length) {
      return { content: [{ type: "text", text: "Bitte einen Suchbegriff mit mindestens drei Buchstaben angeben." }], isError: true };
    }
    let index = [];
    try {
      const r = await env.ASSETS.fetch(new Request("https://getecoback.com/search-index.json"));
      if (r.ok) index = await r.json();
    } catch (e) { index = []; }
    if (!Array.isArray(index) || !index.length) {
      return { content: [{ type: "text", text: "Suchindex derzeit nicht erreichbar." }], isError: true };
    }
    const phrase = String(a.frage || "").toLowerCase().trim();
    const max = Math.max(1, Math.min(10, Number(a.max) || 5));
    const lang = a.sprache === "de" || a.sprache === "en" ? a.sprache : null;
    const hits = index
      .filter((e) => e && e.u && (!lang || e.l === lang))
      .map((e) => ({ e, s: scoreEntry(e, tokens, phrase) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s)
      .slice(0, max);
    if (!hits.length) {
      return mcpToolResult(
        `Keine passende Seite zu „${a.frage}" gefunden. Übersicht aller Ratgeber: https://getecoback.com/llms.txt\n${MCP_DISCLOSURE}`);
    }
    const lines = hits.map(({ e }) =>
      `- ${e.t}\n  https://getecoback.com${e.u}\n  ${e.d || ""}`).join("\n");
    return mcpToolResult(
      `${hits.length} Treffer zu „${a.frage}":\n${lines}\n\n` +
      `Volltext einer Seite: Tool ratgeber_lesen mit dem Pfad aufrufen.\n${MCP_DISCLOSURE}`);
  }
  if (name === "ratgeber_lesen") {
    if (!env || !env.ASSETS) {
      return { content: [{ type: "text", text: "Seite derzeit nicht erreichbar." }], isError: true };
    }
    // Only this site's own guide pages — a path from ratgeber_suche. Anything
    // else (other hosts, /api/, traversal) is refused rather than fetched.
    let path = String(a.pfad || "").trim();
    if (/^https?:\/\//i.test(path)) {
      let u = null;
      try { u = new URL(path); } catch (e) { u = null; }
      if (!u || !/(^|\.)getecoback\.com$/i.test(u.hostname)) {
        return { content: [{ type: "text", text: "Nur Seiten von getecoback.com können gelesen werden." }], isError: true };
      }
      path = u.pathname;
    }
    if (!/^\/(guide|en\/guide|kategorie)\/[a-z0-9-]+\.html$/i.test(path)) {
      return { content: [{ type: "text", text: "Bitte einen Ratgeber-Pfad angeben, z. B. /guide/klimaanlage-kippfenster.html (aus ratgeber_suche)." }], isError: true };
    }
    let html = "";
    try {
      const r = await env.ASSETS.fetch(new Request("https://getecoback.com" + path));
      if (r.ok) html = await r.text();
    } catch (e) { html = ""; }
    if (!html) {
      return { content: [{ type: "text", text: `Seite nicht gefunden: ${path}` }], isError: true };
    }
    const titleM = html.match(/<title>([\s\S]*?)<\/title>/i);
    const artM = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    let body = artM ? artM[1] : html;
    // Drop the injected commerce/interactive layers — an assistant should quote
    // the editorial text, not our shop cards or scripts.
    body = body.replace(/<!--EB_[A-Z]+-->[\s\S]*?<!--\/EB_[A-Z]+-->/g, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (m, t) => `\n\n## ${t}\n`)
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (m, t) => `\n\n### ${t}\n`)
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|tr|table|ul|ol|section)>/gi, "\n")
      .replace(/<\/t[dh]>/gi, " | ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    const LIMIT = 7000;
    const cut = body.length > LIMIT;
    if (cut) body = body.slice(0, LIMIT);
    return mcpToolResult(
      `${titleM ? titleM[1].trim() : path}\nQuelle: https://getecoback.com${path}\n\n${body}` +
      (cut ? "\n\n[gekürzt — vollständiger Text unter der Quell-URL]" : "") +
      `\n\n${MCP_DISCLOSURE}`);
  }
  return { content: [{ type: "text", text: `Unbekanntes Tool: ${name}` }], isError: true };
}

function mcpJson(id, result) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
  });
}

function mcpError(id, code, message, status) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id === undefined ? null : id, error: { code, message } }), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
  });
}

async function handleMcp(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type, accept, mcp-session-id, mcp-protocol-version",
      },
    });
  }
  if (request.method !== "POST") {
    return new Response("MCP endpoint. POST JSON-RPC 2.0 (Streamable HTTP, stateless). Docs: https://getecoback.com/llms.txt", {
      status: 405, headers: { allow: "POST, OPTIONS", "content-type": "text/plain" },
    });
  }
  let msg;
  try { msg = await request.json(); } catch { return mcpError(null, -32700, "parse error", 400); }
  if (Array.isArray(msg)) return mcpError(null, -32600, "batching not supported", 400);
  const { id, method, params } = msg || {};
  if (method === "initialize") {
    return mcpJson(id, {
      protocolVersion: (params && params.protocolVersion) || "2025-03-26",
      capabilities: { tools: {} },
      // Keep in step with mcp/server.json — a client that reads one version
      // from the registry and another from initialize has no way to tell which
      // is stale.
      serverInfo: { name: "getecoback-raumklima", version: "1.1.0" },
      instructions: "Raumklima-Tools von getecoback.com: BTU-Empfehlung, Fensterabdichtungs-Länge, Live-Hitzevorschau (DE), Stromkosten. Formeln identisch mit den Rechnern der Website; Antworten enthalten Quell-URLs.",
    });
  }
  if (method === "notifications/initialized" || (typeof method === "string" && method.startsWith("notifications/"))) {
    return new Response(null, { status: 202 });
  }
  if (method === "tools/list") {
    return mcpJson(id, { tools: MCP_TOOLS });
  }
  if (method === "tools/call") {
    const name = params && params.name;
    const args = params && params.arguments;
    try {
      const result = await mcpCallTool(name, args, env);
      // Count real agent usage — same pipeline, same no-PII contract. Only
      // successful executions of a tool we actually publish count: the registry
      // validates listings by calling a randomly named tool
      // (__verifymcp_auth_probe_<hex>__) to check the auth behaviour, and three
      // of those had already landed in the funnel as "usage". Left as-is, the
      // pre-registered "any real third-party call expands the tool set" would
      // have fired on health probes. Probes are recorded separately so the
      // listing's liveness stays visible without polluting the adoption metric.
      const known = MCP_TOOLS.some((t) => t.name === name);
      try {
        if (env.EVENTS) {
          await env.EVENTS.prepare(
            "INSERT INTO ev (day, name, page, ref, meta, country) VALUES (date('now'), ?, '/mcp', '', ?, '')"
          ).bind(
            known && !result.isError ? "mcp_call" : "mcp_probe",
            // The arguments are what tells adoption from automation. A crawler
            // sends the same canned values every run; a person's questions
            // vary. Without them, "someone called btu_empfehlung again" is
            // unreadable — which is exactly how a daily indexer got mistaken
            // for a third-party client twice in a row. Capped, and no free
            // text beyond the search query the caller typed themselves.
            JSON.stringify({
              tool: known ? name : "unknown",
              args: JSON.stringify(args || {}).slice(0, 160),
            })
          ).run();
        }
      } catch (e) { /* telemetry must never break the tool */ }
      return mcpJson(id, result);
    } catch (e) {
      return mcpError(id, -32603, "tool execution failed");
    }
  }
  if (method === "ping") return mcpJson(id, {});
  return mcpError(id, -32601, `method not found: ${method}`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API routes run before the canonical-URL rewriting (which would otherwise
    // append .html to the extensionless /api path).
    // /mcp is the canonical endpoint humans copy from the docs page. The
    // registry enforces globally unique remote URLs and keeps holding the URL
    // of a deprecated entry, so each renamed listing needs a fresh path —
    // /mcp/v1 today. They are the same server; the alias exists only to satisfy
    // that uniqueness rule, and matching the whole subtree keeps future
    // listings from needing another worker change. /mcp.html stays a page.
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      return handleMcp(request, env);
    }
    if (url.pathname === "/api/subscribe") {
      return handleSubscribe(request);
    }
    if (url.pathname === "/api/top") {
      return handleTop(env);
    }
    if (url.pathname === "/api/trend") {
      return handleTrend(env);
    }
    if (url.pathname === "/api/heat") {
      return handleHeat();
    }
    if (url.pathname === "/api/strom") {
      return handleStrom();
    }
    if (url.pathname === "/api/ev") {
      return handleEvent(request, env);
    }

    let changed = false;

    if (url.protocol === "http:") {
      url.protocol = "https:";
      changed = true;
    }

    if (url.hostname === "www.getecoback.com") {
      url.hostname = "getecoback.com";
      changed = true;
    }

    const path = url.pathname;
    if (path === "/en") {
      url.pathname = "/en/";
      changed = true;
    } else if (path !== "/" && path !== "/en/") {
      const lastSegment = path.slice(path.lastIndexOf("/") + 1);
      if (path.endsWith("/")) {
        url.pathname = path.slice(0, -1) + ".html";
        changed = true;
      } else if (!lastSegment.includes(".")) {
        url.pathname = path + ".html";
        changed = true;
      }
    }

    if (changed) {
      return Response.redirect(url.toString(), 301);
    }

    if (wantsMarkdown(request, url.pathname)) {
      const assetPath = url.pathname === "/" ? "/index.html"
        : (url.pathname === "/en/" ? "/en/index.html" : url.pathname);
      const md = await serveMarkdown(request, env, url.pathname, assetPath);
      // A conversion failure falls through to the normal HTML response rather
      // than handing a crawler an error.
      if (md) return md;
    }

    if (url.pathname === "/") {
      url.pathname = "/index.html";
      return serveAsset(new Request(url.toString(), request), env, "/");
    }
    if (url.pathname === "/en/") {
      url.pathname = "/en/index.html";
      return serveAsset(new Request(url.toString(), request), env, "/en/");
    }
    return serveAsset(request, env, url.pathname);
  },
};
