#!/usr/bin/env node
// 舰队创业产品雷达(2026-08-24,owner:「每天自动化任务也要把创业网站如
// producthunt等内容进行输入,不能只依赖Google trends」)。
// 跑在 runner 上(会话沙箱出网受阻),每日随 fleet-trends 提交
// data/startup-radar.json;会话每日循环读它做选题判断——采集自动化,判断不自动化。
// 只用免鉴权公开接口(PH 公开 Atom feed + HN Algolia API),零 owner 动作、零密钥。
// 诚实规则同 fleet_trends:每个源抓不到就写 ok:false + 原因,绝不静默复用旧数据。
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';

const OUT = 'data/startup-radar.json';
const today = new Date().toISOString().slice(0, 10);
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; agi-site-startup-radar; +https://github.com/f-tiger/agi-site)' };

// 板块名单外置(2026-09-13,owner:「监控好板块比什么都合适」):tools/fleet/reddit_watchlist.json。
// 每个板块每天的产出落到 board_stats,名单按产出淘汰(机器只标 demote,会话来删);404 原样记录不猜。
export const WL = JSON.parse(readFileSync('tools/fleet/reddit_watchlist.json', 'utf8'));
// 「求做」句式:用来数每个板块里真正是请求的帖子(不是晒作品、不是新闻)。只用于计数与摘要,不做判断。
export const WISH_RE = /\b(is there (a|an|any)\b|i wish (there was|someone)|does anyone know (a|an|of)|looking for (a|an) (tool|app|site|website|program|service)|someone should (build|make)|why (isn'?t|doesn'?t) there|anyone know (a|an) (tool|app|site)|recommend (a|an) (tool|app|site))/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastReq = 0;
// Reddit 未鉴权公开 JSON 的限速很紧;所有 reddit 请求串行并保持 throttle_ms 间隔,绝不并发、绝不换 IP。
// Reddit access path (2026-09-13, owner: 「不用等 14 天,直接测试或者更换方法」):
//   * With REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET (a Reddit "script" app the owner registers), we use the
//     official Data API: app-only OAuth token → oauth.reddit.com. That is the sanctioned route and the only
//     one that is not affected by Reddit's datacenter-IP 403 on public .json (first run 2026-09-13: every
//     board 403). Free tier: non-commercial, 100 QPM per client — our ~36 requests/day is far below.
//   * Without them we still try the public .json path so the 403 stays visible in board_stats, but we never
//     change UA to look like a browser, never rotate IPs, never use a proxy — that would be circumvention.
let REDDIT = { base: 'https://www.reddit.com', headers: UA, mode: 'public-json' };
export async function redditAuth() {
  const id = process.env.REDDIT_CLIENT_ID, secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return REDDIT;
  try {
    const r = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: { ...UA, Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials', signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) { REDDIT.mode = `oauth-failed HTTP ${r.status}`; return REDDIT; }
    const d = await r.json();
    if (!d.access_token) { REDDIT.mode = 'oauth-failed no token'; return REDDIT; }
    REDDIT = { base: 'https://oauth.reddit.com', headers: { ...UA, Authorization: `bearer ${d.access_token}` }, mode: 'oauth' };
  } catch (e) { REDDIT.mode = `oauth-failed ${String(e.message || e).slice(0, 40)}`; }
  return REDDIT;
}
async function rfetch(u) {
  const wait = lastReq + (WL.throttle_ms || 6500) - Date.now();
  if (wait > 0) await sleep(wait);
  lastReq = Date.now();
  const url = u.replace('https://www.reddit.com', REDDIT.base).replace(/\.json(\?|$)/, REDDIT.mode === 'oauth' ? '$1' : '.json$1');
  return fetch(url, { headers: REDDIT.headers, signal: AbortSignal.timeout(20000) });
}
export const boardStats = {};   // sub → { list, ok, status, items, requests }
const noteBoard = (sub, list, ok, status, items) => {
  boardStats[sub] = { list, ok, status, items: items.length, requests: items.filter((i) => WISH_RE.test(i.title)).length };
};

// 站点匹配词表:只是给每日循环省一眼的便签,判断(三门)仍在会话侧。
const NICHES = {
  agiscorecard: ['agi', 'llm', 'agent', 'trading', 'benchmark', 'eval', 'anthropic', 'openai', 'claude', 'gpt', 'gemini', 'superintelligence', 'quant'],
  baipiaoji: ['free tier', 'pricing', 'api credit', 'rate limit', 'ai tool', 'chatgpt', 'copilot', 'gemini', 'deepseek', 'kimi'],
  getecoback: ['energy', 'cooling', 'heat pump', 'klimaanlage', 'home appliance', 'sustainability'],
  buysomething: ['sourcing', 'alibaba', 'import', 'tariff', 'dropship', 'supply chain', 'landed cost'],
  gridlings: ['puzzle', 'game', 'sudoku', 'nonogram', 'daily game'],
};
const SHORT = new Set(['agi', 'gpt', 'llm']);
const hit = (t, kw) => SHORT.has(kw)
  ? new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`, 'i').test(t)
  : t.toLowerCase().includes(kw);

async function fetchProductHunt() {
  // 官方公开 Atom feed,当日 featured 产品;无需 GraphQL token。
  const r = await fetch('https://www.producthunt.com/feed', { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const xml = await r.text();
  const items = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
    const g = (re) => (m[1].match(re) || [])[1]?.trim() || '';
    const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
    return {
      title: strip(g(/<title[^>]*>([\s\S]*?)<\/title>/)),
      url: g(/<link[^>]*href="([^"]+)"/),
      blurb: strip(g(/<content[^>]*>([\s\S]*?)<\/content>/)).slice(0, 200),
      published: g(/<published>([\s\S]*?)<\/published>/).slice(0, 10),
    };
  }).filter((i) => i.title);
  if (!items.length) throw new Error('Atom parsed but zero entries');
  return items.slice(0, 30);
}

async function fetchHN(tags, hours) {
  // Algolia 公开 API;/search 按热度排序。show_hn = 当天创业者自发布的产品。
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const u = `https://hn.algolia.com/api/v1/search?tags=${tags}&numericFilters=created_at_i>${since}&hitsPerPage=30`;
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (!Array.isArray(d.hits)) throw new Error('no hits array');
  return d.hits.map((h) => ({
    title: h.title || '', url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    points: h.points | 0, comments: h.num_comments | 0,
  })).filter((i) => i.title);
}

// Ask HN 里的「is there a tool」:与 Reddit 求做板同形态,Algolia 免鉴权,runner 稳定可达。
async function fetchHNAsk(hours) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const u = `https://hn.algolia.com/api/v1/search_by_date?tags=ask_hn&query=${encodeURIComponent('"is there a"')}&numericFilters=created_at_i>${since}&hitsPerPage=30`;
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (!Array.isArray(d.hits)) throw new Error('no hits array');
  return d.hits.map((h) => ({ title: (h.title || '').replace(/^Ask HN:\s*/i, ''), url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    points: h.points | 0, comments: h.num_comments | 0, sub: 'ask_hn', published: (h.created_at || '').slice(0, 10) })).filter((i) => i.title);
}


// 允许自动访问的「求做」源(2026-09-13,替代/补充 Reddit):
// ① Software Recommendations Stack Exchange:整站就是「有没有一个工具能…」;官方 API v2.3,免密钥 300 次/日,
//    内容 CC BY-SA(我们只做内部计数与匹配,不转载)。响应 gzip,Node fetch 自动解压。
async function fetchSoftwareRecs() {
  const r = await fetch('https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&site=softwarerecs&pagesize=50&filter=default', { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (!Array.isArray(d.items)) throw new Error('no items array');
  const since = Math.floor(Date.now() / 1000) - 8 * 24 * 3600;
  return d.items.filter((q) => (q.creation_date | 0) >= since).map((q) => ({
    title: String(q.title || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').slice(0, 200),
    url: q.link || '', points: q.score | 0, comments: q.answer_count | 0, sub: 'softwarerecs',
    tags: (q.tags || []).slice(0, 6), published: new Date((q.creation_date | 0) * 1000).toISOString().slice(0, 10),
  })).filter((i) => i.title);
}
// ② Bluesky 公开搜索(public.api.bsky.app,无需登录;帖子本就公开且 AT 协议为此设计)。只搜求做句式,周窗。
async function fetchBlueskyWish() {
  const out = [];
  const errors = [];
  for (const q of ['"is there an app that"', '"is there a tool that"', '"i wish there was an app"']) {
    try {
      const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&sort=latest&limit=25`, { headers: UA, signal: AbortSignal.timeout(20000) });
      if (!r.ok) { errors.push(`${q} HTTP ${r.status}`); continue; }
      const d = await r.json();
      const since = Date.now() - 8 * 24 * 3600 * 1000;
      for (const p of (d.posts || [])) {
        const rec = p.record || {};
        const t = String(rec.text || '').replace(/\s+/g, ' ').trim();
        if (!t || Date.parse(rec.createdAt || 0) < since || !WISH_RE.test(t)) continue;
        out.push({ title: t.slice(0, 200), url: p.uri || '', points: p.likeCount | 0, comments: p.replyCount | 0, sub: 'bluesky', published: String(rec.createdAt || '').slice(0, 10) });
      }
      await sleep(1500);
    } catch (e) { errors.push(`${q} ${String(e.message || e).slice(0, 50)}`); }
  }
  if (!out.length) throw new Error(errors.length ? errors.join('; ').slice(0, 160) : 'zero request-shaped posts this week');
  if (errors.length) out.errors = errors;
  return out;
}

// Reddit 的两个「求做」板块(2026-09-12 舰队进化,owner:「Reddit 有没有这种统计需求板块」)。
// r/SomebodyMakeThis 与 r/AppIdeas 是专门让人贴「我希望有个 X」的地方;公开 .json 免鉴权。
// 只读,永不发帖、永不回帖、永不注册(舰队铁律:机器绝不代发)。沙箱对 reddit 实测 000,
// 只有 runner 能取;抓不到就 ok:false + 原因,绝不复用旧数据。
// 口径提醒:这里出现 ≠ 有人在搜。它和 PH/HN 一样是选题输入,不是选题依据,仍要过三门。
export function parseRedditListing(json, hours) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const kids = json && json.data && Array.isArray(json.data.children) ? json.data.children : null;
  if (!kids) throw new Error('no data.children');
  return kids.map((c) => c.data || {}).filter((d) => d.title && (d.created_utc | 0) >= since).map((d) => ({
    title: String(d.title).slice(0, 200),
    blurb: String(d.selftext || '').replace(/\s+/g, ' ').slice(0, 200),
    url: d.permalink ? `https://www.reddit.com${d.permalink}` : '',
    points: d.ups | 0, comments: d.num_comments | 0,
    sub: d.subreddit || '', published: new Date((d.created_utc | 0) * 1000).toISOString().slice(0, 10),
  }));
}


// 垂直板块里的「求做/求推荐」句式(2026-09-12,owner:「Reddit 侧再看用户需求」)。
// 业内共识:比 r/SomebodyMakeThis 更强的信号在**小型垂直板块**里搜 "is there an app/site that",
// 且**同一问题每隔几周重现**才算需求。这里按站给一组板块 + 一组句式,走公开 search.json,
// restrict_sr=1、按新、月窗。板块名若不存在会以 HTTP 404 / 空列表暴露在 ok:false 里,不会静默。
// 只读;永不发帖、永不回帖、永不注册。
export const normTitle = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9äöüß\s]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
const VERTICAL = WL.vertical;   // 名单在 tools/fleet/reddit_watchlist.json,含每个板块的 why

async function fetchRedditVertical() {
  const out = [];
  const errors = [];
  for (const [site, cfg] of Object.entries(VERTICAL)) {
    for (const sub of cfg.subs) {
      const q = encodeURIComponent(cfg.q.join(' OR '));
      const u = `https://www.reddit.com/r/${sub}/search.json?q=${q}&restrict_sr=1&sort=new&t=month&limit=25`;
      try {
        const r = await rfetch(u);
        if (!r.ok) { errors.push(`r/${sub} HTTP ${r.status}`); noteBoard(sub, `vertical:${site}`, false, r.status, []); continue; }
        const items = parseRedditListing(await r.json(), 24 * 31);
        noteBoard(sub, `vertical:${site}`, true, r.status, items);
        for (const it of items) out.push({ ...it, site });
      } catch (e) { errors.push(`r/${sub} ${String(e.message || e).slice(0, 60)}`); noteBoard(sub, `vertical:${site}`, false, 0, []); }
    }
  }
  if (!out.length) throw new Error(errors.length ? errors.join('; ').slice(0, 160) : 'zero posts across all vertical searches');
  if (errors.length) out.errors = errors;   // 部分板块失败也要留痕,不吞
  return out;
}

async function fetchRedditRequests() {
  const out = [];
  const errors = [];
  for (const b of WL.request_boards) {
    try {
      const r = await rfetch(`https://www.reddit.com/r/${b.sub}/new.json?limit=50`);
      if (!r.ok) { errors.push(`r/${b.sub} HTTP ${r.status}`); noteBoard(b.sub, 'request', false, r.status, []); continue; }
      const items = parseRedditListing(await r.json(), b.hours || 48);
      noteBoard(b.sub, 'request', true, r.status, items);
      out.push(...items);
    } catch (e) { errors.push(`r/${b.sub} ${String(e.message || e).slice(0, 60)}`); noteBoard(b.sub, 'request', false, 0, []); }
  }
  if (!out.length) throw new Error(errors.length ? errors.join('; ').slice(0, 160) : 'listings parsed but zero posts in window');
  if (errors.length) out.errors = errors;
  return out.slice(0, 120);
}

// 大板块里用「求做」句式搜(2026-09-13):r/Entrepreneur 这类板块本身不是请求板,但
// 「is there a tool that…」这种帖子是最接近购买意图的需求形态。周窗、按新、每板一次请求。
async function fetchRedditWish() {
  const out = [];
  const errors = [];
  const q = encodeURIComponent(WL.wish_phrases.join(' OR '));
  for (const b of WL.wish_boards) {
    try {
      const r = await rfetch(`https://www.reddit.com/r/${b.sub}/search.json?q=${q}&restrict_sr=1&sort=new&t=week&limit=25`);
      if (!r.ok) { errors.push(`r/${b.sub} HTTP ${r.status}`); noteBoard(b.sub, 'wish', false, r.status, []); continue; }
      const items = parseRedditListing(await r.json(), 24 * 8).filter((i) => WISH_RE.test(i.title));
      noteBoard(b.sub, 'wish', true, r.status, items);
      out.push(...items);
    } catch (e) { errors.push(`r/${b.sub} ${String(e.message || e).slice(0, 60)}`); noteBoard(b.sub, 'wish', false, 0, []); }
  }
  if (!out.length) throw new Error(errors.length ? errors.join('; ').slice(0, 160) : 'zero request-shaped posts across wish boards this week');
  if (errors.length) out.errors = errors;
  return out.slice(0, 120);
}


if (process.argv.includes('--selftest')) {
  const now = Math.floor(Date.now() / 1000);
  const fx = { data: { children: [
    { data: { title: 'Is there an app that tracks free tier limits of AI tools?', selftext: 'I keep hitting the ChatGPT free tier limit', ups: 41, num_comments: 9, permalink: '/r/SomebodyMakeThis/comments/x1/', subreddit: 'SomebodyMakeThis', created_utc: now - 3600 } },
    { data: { title: 'A daily nonogram with a guarantee it never needs guessing', selftext: '', ups: 3, num_comments: 1, permalink: '/r/AppIdeas/comments/x2/', subreddit: 'AppIdeas', created_utc: now - 7200 } },
    { data: { title: 'too old to count', selftext: '', ups: 999, num_comments: 0, permalink: '/r/AppIdeas/comments/x3/', subreddit: 'AppIdeas', created_utc: now - 400 * 3600 } },
    { data: { selftext: 'no title, must be dropped', created_utc: now } },
  ] } };
  const items = parseRedditListing(fx, 48);
  const allSubs = [...WL.request_boards.map((b) => b.sub), ...WL.wish_boards.map((b) => b.sub), ...Object.values(WL.vertical).flatMap((v) => v.subs)];
  const rollup = rollupBoards([{ d: '2026-09-01', boards: { X: { ok: true, n: 5, r: 1 } } }, { d: '2026-09-02', boards: { X: { ok: true, n: 3, r: 0 } } }], { X: { list: 'wish', ok: true, status: 200, items: 3, requests: 0 } }, {});
  const checks = [
    ['watchlist: 名单加载且板块名不重复', allSubs.length > 10 && new Set(allSubs).size === allSubs.length],
    ['watchlist: 每个 vertical 站有 subs 与 q', Object.values(WL.vertical).every((v) => v.subs.length && v.q.length && v.why)],
    ['watchlist: wish 句式非空', WL.wish_phrases.length >= 5],
    ['WISH_RE: 命中求做句式', WISH_RE.test('Is there a tool that tracks free tier limits?') && WISH_RE.test('I wish there was an app for this')],
    ['WISH_RE: 不命中晒作品', !WISH_RE.test('I built a tool that tracks free tier limits') && !WISH_RE.test('Show HN: my new app')],
    ['rollup: 14 天累计与 demote 门(2 天不够 14 → 不 demote)', rollup.X.days_ok_14d === 2 && rollup.X.items_14d === 8 && rollup.X.requests_14d === 1 && rollup.X.demote === false],
    ['48h 窗口 + 无标题过滤 → 2 条', items.length === 2],
    ['permalink 拼成绝对地址', items[0].url === 'https://www.reddit.com/r/SomebodyMakeThis/comments/x1/'],
    ['bpj 词表命中 free tier / chatgpt', NICHES.baipiaoji.some((k) => hit(`${items[0].title} ${items[0].blurb}`, k))],
    ['gridlings 词表命中 nonogram', NICHES.gridlings.some((k) => hit(items[1].title, k))],
    ['坏 JSON 抛错而不是静默空数组', (() => { try { parseRedditListing({}, 48); return false; } catch { return true; } })()],
    ['垂直板块配置:每站至少一个板块与一条句式', Object.values(VERTICAL).every((c) => c.subs.length && c.q.length)],
    ['标题归一化:大小写/标点/空白不影响重现匹配', normTitle('Is there an App that…?') === normTitle('is there an app that')],
  ];
  for (const [n, ok] of checks) console.log((ok ? '  ok   ' : '  FAIL ') + n);
  process.exit(checks.every((c) => c[1]) ? 0 : 1);
}

await redditAuth();
const sources = {};
for (const [name, fn] of [
  ['softwarerecs', fetchSoftwareRecs],
  ['bluesky_wish', fetchBlueskyWish],
  ['producthunt', fetchProductHunt],
  ['reddit_requests', fetchRedditRequests],
  ['reddit_vertical', fetchRedditVertical],
  ['reddit_wish', fetchRedditWish],
  ['hn_ask', () => fetchHNAsk(7 * 24)],
  ['hn_show', () => fetchHN('show_hn', 36)],
  ['hn_top_ai', async () => (await fetchHN('story', 36)).filter((i) => NICHES.agiscorecard.some((k) => hit(i.title, k))).slice(0, 20)],
]) {
  try {
    sources[name] = { ok: true, items: await fn() };
  } catch (e) {
    sources[name] = { ok: false, reason: String(e.message || e).slice(0, 120), items: [] };
  }
}

// 候选 idea 源探针(2026-09-13,owner:「producthunt 等创业网站 idea?」):只报状态不入库。
// 会话读到 200 后再写解析器;零编造——不假设某个 feed 存在。
const feedProbes = {};
for (const [name, u] of Object.entries(WL.feed_probes || {})) {
  if (name === 'note') continue;
  try {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(15000), redirect: 'follow' });
    const ct = r.headers.get('content-type') || '';
    feedProbes[name] = { url: u, status: r.status, type: ct.slice(0, 40), bytes: (await r.text()).length };
  } catch (e) { feedProbes[name] = { url: u, status: 0, error: String(e.message || e).slice(0, 60) }; }
}

// 便签:各站词表命中(仅扫标题+简介;空命中很正常,不硬凑)
const all = Object.values(sources).flatMap((s) => s.items);
const nicheHits = {};
for (const [site, kws] of Object.entries(NICHES)) {
  const m = all.filter((i) => kws.some((k) => hit(`${i.title} ${i.blurb || ''}`, k)));
  if (m.length) nicheHits[site] = m.map((i) => i.title).slice(0, 10);
}

// history 保 14 天,供「同一产品连续多日出现=真热度」判断;文件永不膨胀。
let history = [];
try {
  if (existsSync(OUT)) history = JSON.parse(readFileSync(OUT, 'utf8')).history || [];
} catch (e) { /* 坏文件不阻塞今天 */ }
const cutoff = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
history = history.filter((h) => h.d >= cutoff && h.d !== today);
history.push({ d: today, ph_titles: (sources.producthunt.items || []).map((i) => i.title).slice(0, 30),
  reddit_titles: [...((sources.reddit_requests || {}).items || []), ...((sources.reddit_wish || {}).items || []), ...((sources.softwarerecs || {}).items || []), ...((sources.bluesky_wish || {}).items || [])].map((i) => i.title).slice(0, 100),
  vertical: ((sources.reddit_vertical || {}).items || []).map((i) => ({ s: i.site, t: i.title, b: i.sub })).slice(0, 80),
  boards: Object.fromEntries(Object.entries(boardStats).map(([k, v]) => [k, { ok: v.ok, n: v.items, r: v.requests }])) });

// 重现计数:同一问题(标题归一化后)在 14 天 history 里出现于 ≥2 个不同日期 = 「每隔几周又问」。
// 这才是需求;单日一条热帖不是。归一化只做小写 + 去标点 + 压空白,不做语义合并——宁可漏,不硬凑。
const seen = {};
const boardOf = {};
for (const h of history) for (const v of (h.vertical || [])) {
  const k = `${v.s}|${normTitle(v.t)}`;
  (seen[k] ||= new Set()).add(h.d);
  if (v.b) boardOf[k] = v.b;
}
const redditRecurring = {};
const recurringByBoard = {};
for (const [k, days] of Object.entries(seen)) if (days.size >= 2) {
  const [site, t] = k.split('|');
  (redditRecurring[site] ||= []).push({ title: t, days: [...days].sort(), sub: boardOf[k] || '' });
  if (boardOf[k]) recurringByBoard[boardOf[k]] = (recurringByBoard[boardOf[k]] || 0) + 1;
}
// 板块产出榜(14 天 history):按数据淘汰名单。demote 只是标记,删除由会话执行并记进 watchlist。
export function rollupBoards(history, stats, recurringByBoard) {
  const out = {};
  for (const [sub, v] of Object.entries(stats)) {
    let daysOk = 0, items = 0, requests = 0;
    for (const h of history) { const b = (h.boards || {})[sub]; if (b && b.ok) { daysOk++; items += b.n | 0; requests += b.r | 0; } }
    const rec = recurringByBoard[sub] || 0;
    out[sub] = { list: v.list, today_ok: v.ok, today_status: v.status, days_ok_14d: daysOk, items_14d: items, requests_14d: requests, recurring_14d: rec,
      demote: daysOk >= 14 && rec === 0 && requests < 10 };
  }
  return out;
}
const boardRollup = rollupBoards(history, boardStats, recurringByBoard);

mkdirSync('data', { recursive: true });
writeFileSync(OUT, JSON.stringify({ fetched: today, sources, reddit_access: REDDIT.mode, niche_hits: nicheHits, reddit_recurring: redditRecurring, board_stats: boardRollup, feed_probes: feedProbes, watchlist_updated: WL.updated, history }, null, 1));
const oks = Object.entries(sources).map(([k, v]) => `${k}:${v.ok ? v.items.length : 'FAIL ' + v.reason}`).join(' | ');
console.log(`startup-radar ${today} → ${oks}`);
