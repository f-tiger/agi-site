// Server-side crawler visibility (added 2026-08-19, pattern proven on
// baipiaoji 08-11 and agiscorecard 08-05): AI retrieval crawlers — GPTBot,
// ClaudeBot, PerplexityBot and friends — do not execute JavaScript, so the
// GA4 tag and any client beacon record none of their fetches. This edge log
// is the only place "did the AI engines actually crawl us" has an answer.
//
// Only known AI/search bots are recorded here (ev='bot'); ordinary browsers
// are covered by the /api/ev client beacon (ev=''), and recording them twice
// would double-count the funnel. Writes go through waitUntil and fail silent:
// analytics must never be able to break a page.
const AI_BOTS = [
  ['GPTBot', 'gptbot'], ['OAI-SearchBot', 'oai-searchbot'], ['ChatGPT-User', 'chatgpt-user'],
  ['ClaudeBot', 'claudebot'], ['Claude-User', 'claude-user'], ['Claude-SearchBot', 'claude-searchbot'],
  ['anthropic-ai', 'anthropic-ai'],
  ['PerplexityBot', 'perplexitybot'], ['Perplexity-User', 'perplexity-user'],
  ['Google-Extended', 'google-extended'], ['Googlebot', 'googlebot'],
  ['Bingbot', 'bingbot'],
  ['Amazonbot', 'amazonbot'], ['Applebot', 'applebot'], ['Bytespider', 'bytespider'],
  ['DuckAssistBot', 'duckassistbot'], ['MistralAI-User', 'mistralai'], ['cohere-ai', 'cohere-ai'],
  ['YandexBot', 'yandex'], ['CCBot', 'ccbot'], ['Meta-ExternalAgent', 'meta-external'],
];

// Content assets only: pages, the AI-readable indexes, machine-readable data.
// Static images/CSS/JS are skipped — one page fetch drags in dozens of
// subresources, and logging them inflates one visit into a crowd.
function isContentPath(p) {
  if (p.startsWith('/api/')) return false;
  if (p === '/' || p.endsWith('/')) return true;
  // Extensionless paths ARE the site's pages (/rarity, /de/glossary, /checker).
  // Until 2026-08-30 this function only matched '/' , trailing-slash and known
  // extensions, so 20 of 25 published pages could never produce an ev='bot' row
  // and the AI-crawl log looked as if engines only ever touched the entry
  // points. That was a measurement artefact, not crawler behaviour. Anything
  // with a dot in its last segment is a static asset and still skipped.
  var last = p.slice(p.lastIndexOf('/') + 1);
  if (last && last.indexOf('.') === -1) return true;
  return /\.(html|txt|json|md|xml)$/i.test(p);
}

function botOf(ua) {
  const s = (ua || '').toLowerCase();
  if (!s) return '';
  for (const [name, needle] of AI_BOTS) if (s.includes(needle)) return name;
  return '';
}

// Retired-site paths (2026-08-30 pivot). The adult site's pages were removed
// from the deployment, but its hottest URLs kept flapping back as stale 200s
// from warm edge caches (run #21/#25 self-checks caught /scam-check doing it).
// Answering 410 Gone here makes the takedown deterministic at the function
// layer — and 410 tells search engines to deindex faster than a 404 would,
// which is exactly what the SafeSearch-cleanup needs. Prefixes, not exact
// paths: the old site had ~40 URLs and every one of them is gone.
// '/mcp' and '/llms-full.txt' were on this list until 2026-08-30 evening:
// both paths came back to life for the Labubu site (functions/mcp.js and a
// generated llms-full.txt) and must not be 410'd here.
const RETIRED_PREFIXES = [
  '/scam-check', '/picks', '/quiz', '/guides', '/importing', '/weight',
  '/vendors', '/after-you-order', '/payment-protection', '/cost-calculator',
  '/price-check', '/checklist', '/faq', '/for-creators', '/trust',
  '/ga-check', '/feed.xml', '/search-index.json', '/server.json',
];

export async function onRequest(ctx) {
  try {
    const path = new URL(ctx.request.url).pathname;
    for (const p of RETIRED_PREFIXES) {
      if (path === p || path.startsWith(p + '/') || path === p + '.html') {
        return new Response('Gone. This site now hosts the Labubu buyer\'s guide: https://thedollscout.com/', {
          status: 410,
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' },
        });
      }
    }
  } catch (e) { /* fall through to normal serving */ }
  const res = await ctx.next();
  try {
    const url = new URL(ctx.request.url);
    if (ctx.request.method !== 'GET' || !isContentPath(url.pathname)) return res;
    // Our own weekly crawl-check impersonates these exact UAs from a runner.
    // It marks itself with this header; letting it through would hand the
    // "are the AI engines coming" table dozens of fake rows a week — the
    // same self-test-as-growth trap both sibling sites fell into once.
    if (ctx.request.headers.get('x-probe')) return res;
    // Success only: UA-spoofing vulnerability scanners 404 on credential
    // paths all day (measured on bpj 08-15: 64% of "Google-Extended" was
    // fake) — letting 404s in waters the leading indicator.
    if (!res.ok) return res;
    const bot = botOf(ctx.request.headers.get('user-agent'));
    if (!bot || !ctx.env.HITS) return res;
    const d = new Date().toISOString().slice(0, 10);
    const country = (ctx.request.headers.get('cf-ipcountry') || '').slice(0, 2);
    ctx.waitUntil(
      ctx.env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
        .bind(d, url.pathname.slice(0, 120), (/^\/(de|zh|th)(\/|$)/.exec(url.pathname) || [,'en'])[1], country, bot, 'bot')
        .run().catch(() => {})
    );
  } catch (e) { /* never let logging surface as a page error */ }
  return res;
}
