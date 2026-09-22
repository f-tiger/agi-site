import {memberRoute,memberPage,secureMemberPage} from '../../../tools/member-studio/server.mjs';
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


// Which crawler, by name, for HTML requests only. evUaClass() already answers
// "is this a bot", but not "which one" — and that gap is what blocks the single
// biggest open question on this site. Google organic has sent 0 page views for
// weeks while DuckDuckGo, Bing, Ecosia and Yahoo carry the entire search
// channel. "Googlebot never comes" and "Googlebot comes constantly and Google
// ranks us nowhere" call for opposite responses (a technical problem to escalate
// versus a Search Console question), and from the JS beacon they look identical,
// because a crawler that does not run JS never appears in it at all.
//
// Deliberately narrow: a fixed allowlist of coarse names, recorded only for
// requests already classified as bots, never for human traffic. No user agent
// string is stored, so this adds no fingerprinting surface — it answers "did
// Googlebot fetch this page" and nothing else.
const CRAWLERS = [
  ["googlebot", /googlebot/i], ["google-extended", /google-extended/i],
  ["google-other", /googleother|google-inspectiontool|apis-google|mediapartners-google/i],
  ["bingbot", /bingbot|adidxbot|bingpreview/i],
  ["gptbot", /gptbot/i], ["oai-searchbot", /oai-searchbot/i], ["chatgpt-user", /chatgpt-user/i],
  ["claudebot", /claudebot|anthropic-ai|claude-web|claude-searchbot|claude-user/i],
  ["perplexity", /perplexitybot|perplexity-user/i],
  ["applebot", /applebot/i], ["duckduckbot", /duckduckbot|duckassistbot/i],
  ["yandex", /yandexbot/i], ["baidu", /baiduspider/i], ["seznam", /seznambot/i],
  ["petalbot", /petalbot/i], ["ccbot", /ccbot/i], ["amazonbot", /amazonbot/i],
  ["meta-ai", /meta-externalagent|facebookbot|facebookexternalhit/i],
  ["bytespider", /bytespider|tiktokspider/i],
  ["ahrefs", /ahrefsbot/i], ["semrush", /semrushbot/i], ["mj12", /mj12bot/i],
  ["dotbot", /dotbot/i], ["screamingfrog", /screaming frog/i],
  // Self-test bucket, not a real crawler. The deploy probes one page with this
  // agent so the whole path — user-agent match, waitUntil, D1 insert — is proven
  // in production instead of being assumed for a week and then found broken.
  // Probing with a Googlebot agent would have been easier and would have
  // fabricated Googlebot rows in the one dataset the decision depends on.
  // ANALYSIS MUST EXCLUDE bot='_selftest'.
  ["_selftest", /getecoback-crawlprobe/i],
];

function crawlerName(ua) {
  if (!ua) return "";
  for (const [name, re] of CRAWLERS) if (re.test(ua)) return name;
  return "";
}


// UA 家族留痕(2026-09-12 舰队进化,从 agiscorecard 移植)。只存 UA 前 48 字符 + 分类 + 计数;
// 不存完整 UA、不存 IP、不存任何能指到个人的东西。用途只有一个:像 09-12 那次一样,事后能回答
// 「这 288 次 human 到底是谁」,而不是猜。此前只有 agi 留这个痕,同一只探针在这里会以「增长」入日报。
// 写失败静默——统计永远不能影响访问;表由 CREATE TABLE IF NOT EXISTS 幂等建好,缺表也只是丢审计行。
function auditUa(env, ctx, ua, cls) {
  const db = env.EVENTS;
  if (!db) return;
  const p = db.prepare(
    "INSERT INTO ua_audit (day, ua_prefix, ua_class, hits) VALUES (date('now'), ?, ?, 1)" +
    " ON CONFLICT(day, ua_prefix, ua_class) DO UPDATE SET hits = hits + 1"
  ).bind((ua || "").slice(0, 48) || "(none)", cls).run().catch(() => {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
}

function evUaClass(ua) {
  if (!ua) return "none";
  if (/^getecoback-ci\b/i.test(ua) || /^curl\//i.test(ua) || /^Wget\//i.test(ua)) return "ci";
  if (/bot|crawler|spider|slurp|scrap|crawl|fetch|monitor|uptime|lighthouse|pagespeed|preview|headless|phantom|selenium|puppeteer|playwright|curl|wget|python|java|go-http|okhttp|libwww|httpclient|http-client|axios|node-fetch|undici|^node$|^node\/|feed|rss|validator|archive|semrush|ahrefs|dataforseo|mj12|dotbot|bytespider|petalbot|applebot|amazonbot|facebookexternalhit|embedly|gptbot|chatgpt|oai-search|claude|perplexity|ccbot|google-extended|panscient|censys|inspect|shodan|expanse|masscan|zgrab|scan|probe/i.test(ua)) return "bot";
  if (/mozilla/i.test(ua)) return "human";
  return "other";
}

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

async function handleSubscribe(request, env, ctx) {
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

  if (resp.ok) {
    // Mirror the conversion into our own D1 the way handleSub2 does (2026-09-04):
    // the Supabase table cannot be read from CI or the session, so without this
    // row the newsletter path was the one funnel step invisible to the ledger.
    // Same column list as every other ev INSERT; telemetry never costs a response.
    try {
      if (env && env.EVENTS && ctx) {
        ctx.waitUntil(env.EVENTS.prepare(
          "INSERT INTO ev (day, name, page, ref, meta, country, ua_class) VALUES (date('now'), 'subscribe', ?, '', ?, ?, 'human')"
        ).bind(String(source || "").slice(0, 120), '{"source":"supabase"}',
          request.headers.get("cf-ipcountry") || "").run().catch(() => {}));
      }
    } catch (e) { /* never block the reply on telemetry */ }
    return json({ ok: true }, 200, cors);
  }
  // Duplicate email (unique violation) — already subscribed, still a success.
  if (resp.status === 409) return json({ ok: true, duplicate: true }, 200, cors);

  const detail = await resp.text().catch(() => "");
  return json({ error: "store_failed", status: resp.status, detail: detail.slice(0, 300) }, 502, cors);
}


// Fact-check alert capture (2026-08-23): the guide pages carry the traffic but
// had zero email capture; the exit popup is (rightly) occupied by affiliate
// rows. This second layer shows only AFTER the popup has had its shot
// (eb_pu_seen present). Store-first into our own D1 (the Supabase funnel has
// zero recorded conversions and cannot be probed from CI); Supabase stays a
// best-effort mirror via the existing endpoint contract. The promise is
// event-driven and keepable in NO-API mode: one mail when a viral device
// fails our fact-check — drafted by the session, pasted by the owner.
async function handleSub2(request, env, ctx) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400, cors); }
  const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
  if (!EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400, cors);
  if (!body.consent) return json({ error: "consent_required" }, 400, cors);
  let stored = false;
  try {
    if (env.EVENTS) {
      await env.EVENTS.prepare(
        "INSERT OR IGNORE INTO subs (email, page, country, consent_text) VALUES (?,?,?,?)"
      ).bind(email, String(body.page || "").slice(0, 120),
        request.headers.get("cf-ipcountry") || "",
        String(body.consent_text || "").slice(0, 300)).run();
      stored = true;
      ctx.waitUntil(env.EVENTS.prepare(
        "INSERT INTO ev (day, name, page, ref, meta, country, ua_class) VALUES (date('now'), 'subscribe', ?, '', ?, ?, 'human')"
      ).bind(String(body.page || "").slice(0, 120), '{"source":"factcheck-alert"}',
        request.headers.get("cf-ipcountry") || "").run().catch(() => {}));
    }
  } catch (e) { /* fall through */ }
  return json({ ok: stored }, stored ? 200 : 502, cors);
}

const SUB2_SNIPPET = `<div id="eb-s2" style="display:none;position:fixed;left:0;right:0;bottom:0;z-index:205;padding:0 10px 10px;pointer-events:none;"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #cfe0ea;border-radius:14px 14px 12px 12px;box-shadow:0 -6px 28px rgba(10,45,70,.22);padding:14px 16px 12px;pointer-events:auto;"><div style="display:flex;align-items:flex-start;gap:10px;"><strong style="flex:1;font-size:15px;line-height:1.35;">\u26a0\ufe0f Alarm statt Newsletter</strong><button type="button" id="eb-s2-x" aria-label="Schlie\u00dfen" style="background:none;border:none;font-size:20px;line-height:1;color:#8a99a6;cursor:pointer;padding:0 2px;">\u00d7</button></div><p style="margin:4px 0 9px;font-size:13px;color:#4a5a67;">Wenn ein virales Ger\u00e4t in unserem Faktencheck durchf\u00e4llt (wie der EpiCooler), schicken wir genau <strong>eine</strong> Mail. Sonst nichts.</p><form id="eb-s2-f" style="display:flex;gap:7px;flex-wrap:wrap;"><input id="eb-s2-e" type="email" required placeholder="deine@mail.de" style="flex:1 1 180px;min-width:0;padding:9px 11px;border:1px solid #cfe0ea;border-radius:8px;font-size:14px;"><button type="submit" style="background:#0f6ba8;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:14px;font-weight:700;cursor:pointer;">Eintragen</button><label style="flex:1 1 100%;font-size:11px;color:#8a99a6;display:flex;gap:6px;align-items:flex-start;"><input id="eb-s2-c" type="checkbox" required style="margin-top:2px;">Einverstanden, diese Hinweis-Mails zu erhalten. Jederzeit abmeldbar. <a href="/datenschutz.html" target="_blank" rel="noopener" style="color:#8a99a6;">Datenschutz</a></label></form><p id="eb-s2-ok" style="display:none;margin:6px 0 0;font-size:13.5px;font-weight:700;color:#0f7a52;">\u2713 Eingetragen \u2014 du h\u00f6rst nur von uns, wenn es ernst ist.</p></div></div><script>(function(){var K2="eb_s2_seen";try{if(localStorage.getItem(K2))return;if(!localStorage.getItem("eb_pu_seen"))return;}catch(e){return;}var box=document.getElementById("eb-s2");if(!box)return;var shown=false,start=Date.now();function ev(n,m){try{if(window.gtag)gtag("event",n,m||{});}catch(e){}}function hide(){box.style.display="none";try{localStorage.setItem(K2,String(Date.now()));}catch(e){}}function show(){if(shown)return;shown=true;box.style.display="block";ev("popup_view",{trigger:"s2"});}document.getElementById("eb-s2-x").addEventListener("click",hide);window.addEventListener("scroll",function(){var d=document.documentElement;if((window.scrollY+window.innerHeight)/Math.max(1,d.scrollHeight)>0.6&&(Date.now()-start)>20000)show();},{passive:true});document.getElementById("eb-s2-f").addEventListener("submit",function(e){e.preventDefault();var em=document.getElementById("eb-s2-e").value;var c=document.getElementById("eb-s2-c").checked;if(!em||!c)return;fetch("/api/sub2",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:em,consent:true,consent_text:"Faktencheck-Alarm DE v1 2026-08",page:location.pathname})}).then(function(r){return r.json();}).then(function(d){if(d&&d.ok){document.getElementById("eb-s2-f").style.display="none";document.getElementById("eb-s2-ok").style.display="block";try{localStorage.setItem(K2,String(Date.now()+31536000000));}catch(e){}}});});})();</script>`;

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
        "INSERT INTO ev (day, name, page, ref, meta, country, ua_class) VALUES (date('now'), 'md_serve', ?, '', ?, ?, ?)"
      ).bind(pathname.slice(0, 120), JSON.stringify({ ua: ua.slice(0, 80) }),
        request.headers.get("cf-ipcountry") || "", evUaClass(ua)).run();
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

async function serveAsset(request, env, pathname, ctx) {
  const response = await env.ASSETS.fetch(request);
  // Only strengthen caching for successful hits; leave 404s/errors short-lived.
  if (!response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set("cache-control", cacheControlFor(pathname));
  // Agent surfaces (2026-08-29): per-page .md mirrors are for reading and
  // citing by assistants, never for ranking — the HTML page stays canonical.
  if (pathname.endsWith(".md")) {
    headers.set("x-robots-tag", "noindex");
    headers.set("content-type", "text/markdown; charset=utf-8");
  }
  const out = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  // Second-layer capture only on German guide pages (the traffic), never on
  // legal pages or the EN mirror; edge-injected so no page rebuild is needed.
  // Server-side crawler log. HTML only, allowlisted crawlers only, one row per
  // fetch, written after the response via waitUntil so it can never slow a
  // request or fail one. Everything else — humans, assets, unknown agents — is
  // not logged at all.
  if ((headers.get("content-type") || "").includes("text/html")) {
    const bot = crawlerName(request.headers.get("user-agent") || "");
    if (bot && env.EVENTS && ctx && ctx.waitUntil) {
      ctx.waitUntil(env.EVENTS.prepare(
        "INSERT INTO ev (day, name, page, ref, meta, country, ua_class) VALUES (date('now'), 'crawl', ?, '', ?, ?, 'bot')"
      ).bind(pathname.slice(0, 200), JSON.stringify({ bot }),
        request.headers.get("cf-ipcountry") || "").run().catch(() => {}));
    }
  }
  const isGuide = /^\/guide\//.test(pathname) &&
    (headers.get("content-type") || "").includes("text/html") &&
    !/impressum|datenschutz|kontakt/.test(pathname);
  if (isGuide) {
    return new HTMLRewriter().on("body", {
      element(el) { el.append(SUB2_SNIPPET, { html: true }); },
    }).transform(out);
  }
  return out;
}

// First-party, cookieless event collection (own D1). Replaces the dependency on
// a third-party analytics subscription: the same events the pages already send
// to GA4 are mirrored here, so the funnel stays measurable even when the
// external tool lapses. Privacy: no cookies, no IP, no user id, no fingerprint
// — only an event name, the page path, a coarse referrer host and the country
// header Cloudflare already provides. That is aggregate, non-personal data, so
// no consent banner is required and nothing here identifies a visitor.
const EV_NAMES = new Set([
  "crawl",
  "page_view", "affiliate_click", "b2b_intent", "lead_intent", "outbound_choice", "cold_now", "strom_now",
  "feuchte_now",
  "embed_copy", "share", "video_play", "btu_calc", "hitze_check", "heat_check",
  "strom_check", "bkw_calc", "heizkosten_calc", "taupunkt_check",
  "standort_check", "strompreis_api", "widget_view",
  "stromkosten_calc", "speicher_calc", "subscribe", "subscribe_confirmed",
  "profile_save", "profile_use", "profile_clear", "heat_now", "seal_fit",
  "hose_fit", "panel_fit", "popup_view", "popup_click", "popup_close", "site_search",
  "mcp_call", "mcp_probe", "mcp_install_click", "tariff_click", "foerder_check",
  "storage_home",
  // Autumn home block + self-updating rising rail (2026-08-25/26).
  "herbst_home", "rising_guide",
  // Season bridge, instrumented 2026-08-27: the block existed on 13 pages and
  // fired nothing, so "nobody crosses the seasons" and "the component is inert"
  // were indistinguishable. check_events.py fails the build if this drifts.
  "season_bridge",
  // Tools audit 2026-09-22: three calculators fired nothing at all, so "nobody used it"
  // and "it never reported" were the same reading. Country calculators (5 pages),
  // pro-werkzeuge (3 runs), infrarot Watt-Rechner.
  "solution_calc", "pro_tool_run", "watt_calc",
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

// Cold counterpart (2026-08-20, owner: winter trigger). Same three cities,
// 7-day minimum instead of 3-day maximum — a heating purchase has a longer
// decision runway than a fan. Thresholds: 0 °C = level 1 (Frost), -6 °C =
// level 2 (strenger Frost). Same defensive contract: failure degrades to
// level 0, never to a broken response.
async function cityMin(name, lat, lon) {
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_min&forecast_days=7&timezone=Europe%2FBerlin`,
      { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = await r.json();
    const temps = (d && d.daily && d.daily.temperature_2m_min) || [];
    const days = (d && d.daily && d.daily.time) || [];
    let low = null;
    temps.forEach((t, i) => {
      if (typeof t === "number" && (low === null || t < low.temp)) {
        low = { region: name, temp: t, day: days[i] || "" };
      }
    });
    return low;
  } catch (e) {
    return null;
  }
}

async function coldReading() {
  let worst = { level: 0, region: "", temp: null, day: "" };
  try {
    const results = await Promise.all(HEAT_CITIES.map(([n, la, lo]) => cityMin(n, la, lo)));
    for (const c of results) {
      if (c && (worst.temp === null || c.temp < worst.temp)) worst = { level: 0, ...c };
    }
    if (worst.temp !== null) worst.level = worst.temp <= -6 ? 2 : worst.temp <= 0 ? 1 : 0;
  } catch (e) {
    worst = { level: 0, region: "", temp: null, day: "" };
  }
  return worst;
}

// Autumn live number (2026-08-31). EB_HEATNOW renders only from 28 °C and sits
// on 11 of the 12 top-earning pages, so the site's one "a chat answer cannot
// hold this" hook goes dark for eight months exactly as the humidity season
// starts, and luftentfeuchter-40-qm (the best autumn converter) never had one.
//
// Dew point is the right autumn counterpart because the verdict genuinely
// flips on it — but against the COLD SURFACE, not the room air. A first draft
// here compared it to 20 °C indoor air and was wrong: at 15 °C / 95 % outside
// the dew point is 14.2 °C, which still dries a 20 °C room. Condensation forms
// on the coldest surface — the corner behind a wardrobe on an exterior wall, an
// unheated cellar wall — and that is why airing a cellar on a mild damp day
// makes it wetter, the classic mistake this site already documents.
//
// Two references, because the answer differs by room and both are honest
// approximations the page states out loud (and links to the Taupunkt tool for
// the reader's own measured surface):
//   ~15 °C — cold corner on an exterior wall in a heated room
//   ~13 °C — wall in an unheated cellar
// Above both, airing cannot dry anything and a dehumidifier is not an upsell,
// it is the only remaining physical answer.
const DEW_WALL = 15;         // cold corner, heated room
const DEW_CELLAR = 13;       // unheated cellar wall
const DEW_NOTHING = { ok: false, level: 0, region: "", temp: null, rh: null, dew: null };

// Magnus formula (a = 17.62, b = 243.12 °C). Checked against published dew
// point tables at six points, all within 0.1 K.
function dewPoint(t, rh) {
  if (typeof t !== "number" || typeof rh !== "number" || rh <= 0 || rh > 100) return null;
  const a = 17.62, b = 243.12;
  const g = Math.log(rh / 100) + (a * t) / (b + t);
  const d = (b * g) / (a - g);
  return Number.isFinite(d) ? Math.round(d * 10) / 10 : null;
}

async function cityDew(name, lat, lon) {
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m&timezone=Europe%2FBerlin`,
      { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = await r.json();
    const t = d && d.current && d.current.temperature_2m;
    const rh = d && d.current && d.current.relative_humidity_2m;
    const dew = dewPoint(t, rh);
    return dew === null ? null : { region: name, temp: t, rh, dew };
  } catch (e) {
    return null;
  }
}

async function dewReading() {
  try {
    const results = await Promise.all(HEAT_CITIES.map(([n, la, lo]) => cityDew(n, la, lo)));
    // Worst case of the three. Reporting the friendliest city would tell a
    // reader to open the window on a day their own region cannot afford it.
    let worst = null;
    for (const c of results) if (c && (worst === null || c.dew > worst.dew)) worst = c;
    if (!worst) return DEW_NOTHING;
    // 1: airing dries everywhere. 2: fine in the room, wets the cellar.
    // 3: airing dries nothing — only a dehumidifier removes water now.
    const level = worst.dew <= DEW_CELLAR ? 1 : worst.dew <= DEW_WALL ? 2 : 3;
    return { ok: true, level, wall_ref: DEW_WALL, cellar_ref: DEW_CELLAR, ...worst };
  } catch (e) {
    return DEW_NOTHING;
  }
}

// Which marketplace a reader can actually buy from. The US switch used to
// decide this from the browser clock alone (Intl timezone starting "America/"),
// and on 2026-09-08 a click proved that wrong: a reader Cloudflare geolocated to
// the United States, on a page that carries the switch, clicking a term the rules
// do cover ("pinguino"), still went to amazon.de. A browser that reports UTC —
// Firefox with resistFingerprinting does exactly that, and so do VPNs and
// travellers — never matches "America/" and never gets switched.
//
// The country is known here, at the edge, for free. It deliberately does NOT go
// into the HTML: guide pages are served "public, max-age=0, must-revalidate", so
// a per-country value baked into the body could be held by a shared cache and
// handed to the wrong country. This endpoint is no-store instead, and the page
// only calls it when the clock is genuinely ambiguous — never for the European
// visitors who are 84 % of the traffic.
function handleGeo(request) {
  const c = (request.headers.get("CF-IPCountry") || "").toUpperCase();
  return new Response(JSON.stringify({ c: /^[A-Z]{2}$/.test(c) ? c : "" }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

async function handleFeuchte() {
  const cacheKey = new Request("https://getecoback.com/__feuchte");
  let cache = null;
  try {
    cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  } catch (e) {
    cache = null;
  }
  const payload = await dewReading();
  const resp = json(payload, 200, { "cache-control": "public, max-age=3600" });
  // Same rule as handleHeat: never freeze a failure into the cache for an hour.
  if (cache && payload.ok) {
    try { await cache.put(cacheKey, resp.clone()); } catch (e) { /* cache is optional */ }
  }
  return resp;
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

  const [best, cold] = await Promise.all([heatReading(), coldReading()]);
  const payload = { ...best, cold };

  const resp = json(payload, 200, { "cache-control": "public, max-age=3600" });
  // Only cache a real reading; caching a failure would freeze the site silent
  // for an hour on a day that might actually be hot.
  if (cache && (best.temp !== null || cold.temp !== null)) {
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

async function handleEvent(request, env, ctx) {
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

  const evUa = request.headers.get("user-agent") || "";
  const evCls = evUaClass(evUa);
  if (name === "page_view") auditUa(env, ctx, evUa, evCls);
  try {
    await env.EVENTS.prepare(
      "INSERT INTO ev (day, name, page, ref, meta, country, ua_class) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(day, name, page, ref, meta, country, evCls).run();
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
      // ua_class filter added 2026-09-05: this endpoint is listed in llms.txt
      // and read by assistants, and it was publishing mcp_call n7:87 while real
      // third-party use was zero — the 87 were a daily canned-args replay plus
      // the registry validator, classified 'other'/'bot'. An AI-facing surface
      // that overstates its own adoption is the one lie this site cannot afford.
      "FROM ev WHERE page NOT LIKE '/__ci%' AND (ua_class IS NULL OR ua_class='human') " +
      "AND day >= date('now','-14 day') " +
      "GROUP BY name ORDER BY n7 DESC LIMIT 30"
    ).all();
    const pg = await env.EVENTS.prepare(
      "SELECT page, " +
      "SUM(CASE WHEN day >= date('now','-7 day') THEN 1 ELSE 0 END) AS n7, " +
      "SUM(CASE WHEN day < date('now','-7 day') AND day >= date('now','-14 day') THEN 1 ELSE 0 END) AS p7 " +
      "FROM ev WHERE name='page_view' AND page NOT LIKE '/__ci%' AND (ua_class IS NULL OR ua_class='human') " +
      "AND day >= date('now','-14 day') " +
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
  // AI-era round 2026-08-29: the decision LAYER above the per-device
  // calculators. Assistants keep asking "which device class solves X" before
  // any sizing question makes sense; this router answers it with the same
  // honest physics the pages use, then hands over to the sizing tools/guides.
  {
    name: "geraet_wahl",
    description: "Welches Gerät löst mein Raumklima-Problem? — Which device family solves a given indoor-climate problem (too hot, damp/mould, too cold, stale air), with the honest physics, the right size for the room and the matching guide. The decision layer above btu_empfehlung/heizleistung_watt.",
    inputSchema: {
      type: "object",
      properties: {
        problem: { type: "string", enum: ["zu_heiss", "feucht_schimmel", "zu_kalt", "stickige_luft"], description: "Das Problem — the problem: zu_heiss = room too hot, feucht_schimmel = damp air / condensation / mould risk, zu_kalt = room too cold (no fixed heating), stickige_luft = stale air / odours" },
        qm: { type: "number", description: "Raumfläche in m² — room floor area in square metres (4–120). Default: 20" },
      },
      required: ["problem"],
    },
  },
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
  if (name === "geraet_wahl") {
    const qm = Math.max(4, Math.min(120, Number(a.qm) || 20));
    const qp = qm <= 12 ? 10 : qm <= 17 ? 15 : qm <= 22 ? 20 : qm <= 27 ? 25 : qm <= 35 ? 30 : 40;
    // Same rules as the pages: 340 BTU/m² · dehum ladder (l/day) · 60–100 W/m².
    let text;
    if (a.problem === "zu_heiss") {
      const btu = Math.round((qm * 340) / 500) * 500;
      text = `Für "Raum zu heiß" ist die einzige Gerätefamilie, die netto kühlt, die mobile Klimaanlage mit Abluftschlauch (Wärme muss den Raum verlassen; Luftkühler/Ventilatoren kühlen nur die Person, nicht den Raum).\n` +
        `Faustregel für ${qm} m²: ca. ${btu.toLocaleString("de-DE")} BTU. Ohne dichte Fensterabdichtung verliert jeder Monoblock den Großteil seiner Wirkung.\n` +
        `Geräteklasse & Modelle: https://getecoback.com/guide/klimaanlage-${qp}-qm.html\n` +
        `Feinrechnung (Decke, Personen, Sonne): Tool btu_empfehlung oder https://getecoback.com/guide/btu-rechner.html`;
    } else if (a.problem === "feucht_schimmel") {
      const liter = qm <= 12 ? "10–12" : qm <= 17 ? "12–16" : qm <= 22 ? "16–20" : qm <= 27 ? "20" : qm <= 35 ? "20–25" : "25–30";
      const dq = qm <= 12 ? 10 : qm <= 17 ? 15 : qm <= 22 ? 20 : qm <= 27 ? 25 : qm <= 35 ? 30 : 40;
      text = `Für "feuchte Luft / Kondens / Schimmelrisiko" ist der Kompressor-Luftentfeuchter mit Hygrostat die richtige Familie: unter ca. 60 % relativer Feuchte fehlt Schimmel die Grundlage.\n` +
        `Faustregel für ${qm} m²: ${liter} Liter/Tag Entzugsleistung (Herstellerangaben sind Idealbedingungen, real ≈ die Hälfte).\n` +
        `Geräteklasse & Modelle: https://getecoback.com/guide/luftentfeuchter-${dq}-qm.html\n` +
        `Physik-Check für die eigene Wand: Tool taupunkt_lueften`;
    } else if (a.problem === "zu_kalt") {
      const wl = Math.round(qm * 60), wh = Math.round(qm * 100);
      text = `Für "Raum zu kalt ohne feste Heizung" sind Infrarot-/Elektropaneele mit Thermostat die installationsfreie Familie (Zusatz-/Übergangsheizung; als alleinige Winterheizung ist eine Wärmepumpe wirtschaftlicher — Strom-Direktheizung macht aus 1 kWh Strom genau 1 kWh Wärme).\n` +
        `Faustregel für ${qm} m² (gedämmter Raum): ${wl.toLocaleString("de-DE")}–${wh.toLocaleString("de-DE")} W.\n` +
        `Geräteklasse & Modelle: https://getecoback.com/guide/heizung-${qp}-qm.html\n` +
        `Feinrechnung: Tool heizleistung_watt`;
    } else {
      text = `Für "stickige Luft / Gerüche" ist die ehrliche Reihenfolge: erst richtig lüften (kostet nichts), dann je nach Ursache Luftreiniger (Partikel/Pollen) oder Luftentfeuchter (wenn die Ursache Feuchte ist — Muffgeruch ist oft ein Feuchteproblem).\n` +
        `Einordnung Reiniger vs. Entfeuchter: https://getecoback.com/guide/luftentfeuchter-oder-luftreiniger.html\n` +
        `Richtig lüften: https://getecoback.com/guide/richtig-lueften-bei-hitze.html`;
    }
    return mcpToolResult(text + `\n${MCP_DISCLOSURE}`);
  }
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
    const lang = ["de", "en", "fr", "es", "it"].includes(a.sprache) ? a.sprache : null;
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
    if (!/^\/(guide|en\/guide|it\/guide|kategorie)\/[a-z0-9-]+\.html$/i.test(path)) {
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
        // The daily eco-mcp-smoke workflow calls every tool with canned args;
        // it now identifies itself (getecoback-ci UA) and is not adoption.
        const mcpUa = request.headers.get("user-agent") || "";
        if (env.EVENTS && evUaClass(mcpUa) !== "ci") {
          await env.EVENTS.prepare(
            "INSERT INTO ev (day, name, page, ref, meta, country, ua_class) VALUES (date('now'), ?, '/mcp', '', ?, '', ?)"
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
              // 2026-09-05: a daily caller replaying the smoke's canned args
              // took two sessions to rule out as adoption because nothing
              // recorded who it was. The UA is not personal data; capped.
              ua: mcpUa.slice(0, 80),
            }),
            evUaClass(mcpUa)
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
  async fetch(request, env, ctx) {
    const memberResponse=await memberRoute(request,env,'eco');if(memberResponse)return memberResponse;
    if(memberPage(new URL(request.url).pathname))return secureMemberPage(await env.ASSETS.fetch(request));
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
      return handleSubscribe(request, env, ctx);
    }
    if (url.pathname === "/api/sub2") {
      return handleSub2(request, env, ctx);
    }
    if (url.pathname === "/api/top") {
      return handleTop(env);
    }
    // /api/pulse (2026-09-13, fleet "AI 时代的站点" flywheel read-side): 28-day human page
    // views and how many arrived from an AI assistant, by referrer host. Aggregate counts
    // only — no paths, no countries, no UA, no row-level data. Worker reads its own D1
    // binding, so the fleet heartbeat needs no token (the repo's tokens lack D1 read).
    // Same host list as tools/fleet/ai_referrals.py; cached an hour at the edge.
    if (url.pathname === "/api/pulse" && request.method === "GET") {
      const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" };
      if (!env.EVENTS) return new Response(JSON.stringify({ ok: false, error: "no_db" }), { status: 503, headers });
      try {
        const q = await env.EVENTS.prepare(
          "SELECT '_total' AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND (ua_class IS NULL OR ua_class='human') AND page NOT LIKE '/__ci%' AND day >= date('now','-28 days') UNION ALL SELECT ref AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND (ua_class IS NULL OR ua_class='human') AND page NOT LIKE '/__ci%' AND day >= date('now','-28 days') AND (ref LIKE '%chatgpt%' OR ref LIKE '%chat.openai%' OR ref LIKE '%perplexity%' OR ref LIKE '%claude.ai%' OR ref LIKE '%copilot%' OR ref LIKE '%gemini.google%' OR ref LIKE '%you.com%' OR ref LIKE '%kagi%' OR ref LIKE '%poe.com%' OR ref LIKE '%mistral%' OR ref LIKE '%deepseek%' OR ref LIKE '%kimi%' OR ref LIKE '%doubao%' OR ref LIKE '%yiyan%' OR ref LIKE '%metaso%') GROUP BY ref ORDER BY n DESC"
        ).all();
        let human_pv = 0; const by_host = {};
        for (const r of (q.results || [])) {
          if (r.host === "_total") human_pv = r.n | 0; else if (r.host) by_host[r.host] = r.n | 0;
        }
        const ai_ref = Object.values(by_host).reduce((a, b) => a + b, 0);
        return new Response(JSON.stringify({ ok: true, days: 28, human_pv, ai_ref, by_host, generated: new Date().toISOString() }), { headers });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "query_failed" }), { status: 500, headers });
      }
    }

    if (url.pathname === "/api/trend") {
      return handleTrend(env);
    }
    if (url.pathname === "/api/heat") {
      return handleHeat();
    }
    if (url.pathname === "/api/feuchte") {
      return handleFeuchte();
    }
    if (url.pathname === "/api/geo") {
      return handleGeo(request);
    }
    if (url.pathname === "/api/strom") {
      return handleStrom();
    }
    if (url.pathname === "/api/ev") {
      return handleEvent(request, env, ctx);
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
      return serveAsset(new Request(url.toString(), request), env, "/", ctx);
    }
    if (url.pathname === "/en/") {
      url.pathname = "/en/index.html";
      return serveAsset(new Request(url.toString(), request), env, "/en/", ctx);
    }
    return serveAsset(request, env, url.pathname, ctx);
  },
};
