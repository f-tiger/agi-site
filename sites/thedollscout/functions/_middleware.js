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
  return /\.(html|txt|json|md|xml)$/i.test(p);
}

function botOf(ua) {
  const s = (ua || '').toLowerCase();
  if (!s) return '';
  for (const [name, needle] of AI_BOTS) if (s.includes(needle)) return name;
  return '';
}

export async function onRequest(ctx) {
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
        .bind(d, url.pathname.slice(0, 120), 'en', country, bot, 'bot')
        .run().catch(() => {})
    );
  } catch (e) { /* never let logging surface as a page error */ }
  return res;
}
