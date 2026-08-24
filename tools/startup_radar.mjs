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

const sources = {};
for (const [name, fn] of [
  ['producthunt', fetchProductHunt],
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
history.push({ d: today, ph_titles: (sources.producthunt.items || []).map((i) => i.title).slice(0, 30) });

mkdirSync('data', { recursive: true });
writeFileSync(OUT, JSON.stringify({ fetched: today, sources, niche_hits: nicheHits, history }, null, 1));
const oks = Object.entries(sources).map(([k, v]) => `${k}:${v.ok ? v.items.length : 'FAIL ' + v.reason}`).join(' | ');
console.log(`startup-radar ${today} → ${oks}`);
