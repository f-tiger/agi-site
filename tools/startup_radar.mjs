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
const VERTICAL = {
  agiscorecard: { subs: ['singularity', 'artificial'], q: ['"when will agi"', '"agi timeline"', '"is agi close"'] },
  baipiaoji:    { subs: ['ChatGPT', 'ClaudeAI', 'LocalLLaMA'], q: ['"free tier" limit', '"is there a" tool free', '"rate limit" free plan'] },
  gridlings:    { subs: ['puzzles', 'sudoku', 'nonograms', 'incremental_games'], q: ['"is there a" daily', '"no guessing"', '"unique solution"'] },
  thedollscout: { subs: ['labubu', 'PopMart'], q: ['fake OR real "how to tell"', '"is this real"', 'authentic check'] },
  buysomething: { subs: ['ecommerce', 'dropship', 'Entrepreneur'], q: ['"landed cost"', '"is there a" sourcing', 'alibaba "how do i"'] },
  getecoback:   { subs: ['de', 'Finanzen'], q: ['Klimaanlage Mietwohnung', 'Luftentfeuchter Empfehlung', 'Heizlüfter Stromkosten'] },
};

async function fetchRedditVertical() {
  const out = [];
  const errors = [];
  for (const [site, cfg] of Object.entries(VERTICAL)) {
    for (const sub of cfg.subs) {
      const q = encodeURIComponent(cfg.q.join(' OR '));
      const u = `https://www.reddit.com/r/${sub}/search.json?q=${q}&restrict_sr=1&sort=new&t=month&limit=25`;
      try {
        const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) });
        if (!r.ok) { errors.push(`r/${sub} HTTP ${r.status}`); continue; }
        for (const it of parseRedditListing(await r.json(), 24 * 31)) out.push({ ...it, site });
      } catch (e) { errors.push(`r/${sub} ${String(e.message || e).slice(0, 60)}`); }
    }
  }
  if (!out.length) throw new Error(errors.length ? errors.join('; ').slice(0, 160) : 'zero posts across all vertical searches');
  if (errors.length) out.errors = errors;   // 部分板块失败也要留痕,不吞
  return out;
}

async function fetchRedditRequests() {
  const out = [];
  for (const sub of ['SomebodyMakeThis', 'AppIdeas']) {
    const r = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=50`, { headers: UA, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`r/${sub} HTTP ${r.status}`);
    out.push(...parseRedditListing(await r.json(), 48));
  }
  if (!out.length) throw new Error('both listings parsed but zero posts in 48h');
  return out.slice(0, 60);
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
  const checks = [
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

const sources = {};
for (const [name, fn] of [
  ['producthunt', fetchProductHunt],
  ['reddit_requests', fetchRedditRequests],
  ['reddit_vertical', fetchRedditVertical],
  ['hn_show', () => fetchHN('show_hn', 36)],
  ['hn_top_ai', async () => (await fetchHN('story', 36)).filter((i) => NICHES.agiscorecard.some((k) => hit(i.title, k))).slice(0, 20)],
]) {
  try {
    sources[name] = { ok: true, items: await fn() };
  } catch (e) {
    sources[name] = { ok: false, reason: String(e.message || e).slice(0, 120), items: [] };
  }
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
  reddit_titles: ((sources.reddit_requests || {}).items || []).map((i) => i.title).slice(0, 30),
  vertical: ((sources.reddit_vertical || {}).items || []).map((i) => ({ s: i.site, t: i.title })).slice(0, 60) });

// 重现计数:同一问题(标题归一化后)在 14 天 history 里出现于 ≥2 个不同日期 = 「每隔几周又问」。
// 这才是需求;单日一条热帖不是。归一化只做小写 + 去标点 + 压空白,不做语义合并——宁可漏,不硬凑。
const seen = {};
for (const h of history) for (const v of (h.vertical || [])) {
  const k = `${v.s}|${normTitle(v.t)}`;
  (seen[k] ||= new Set()).add(h.d);
}
const redditRecurring = {};
for (const [k, days] of Object.entries(seen)) if (days.size >= 2) {
  const [site, t] = k.split('|');
  (redditRecurring[site] ||= []).push({ title: t, days: [...days].sort() });
}

mkdirSync('data', { recursive: true });
writeFileSync(OUT, JSON.stringify({ fetched: today, sources, niche_hits: nicheHits, reddit_recurring: redditRecurring, history }, null, 1));
const oks = Object.entries(sources).map(([k, v]) => `${k}:${v.ok ? v.items.length : 'FAIL ' + v.reason}`).join(' | ');
console.log(`startup-radar ${today} → ${oks}`);
