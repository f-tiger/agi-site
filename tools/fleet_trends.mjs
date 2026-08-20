#!/usr/bin/env node
// 舰队触发器数据面(2026-08-20,owner:「其他几个站点一样要有自己的触发器,
// 站点不应该依赖你进化」)。一次抓取 Google Trends US,按三张站点词表分发:
//   baipiaoji   → sites/baipiaoji/data/trends-us.json      (AI 工具名)
//   agiscorecard→ sites/agiscorecard/trends-us.json        (AGI 实体,公开可引用)
//   thedollscout→ sites/thedollscout/content/trends-us.json(niche 词,content/ 不发布)
// eco 的德国区触发器独立在 sites/getecoback/tools/fetch_trends_de.mjs。
// 诚实规则同 eco:抓不到写 ok:false,绝不复用旧数据;短词用词边界防误配(agi≠magic)。
import { writeFileSync, mkdirSync } from 'node:fs';

const MAPS = {
  'sites/baipiaoji/data/trends-us.json': ['chatgpt', 'openai', 'claude', 'anthropic', 'gemini',
    'midjourney', 'suno', 'sora', 'grok', 'deepseek', 'kimi', 'qwen', 'copilot', 'perplexity',
    'runway', 'notebooklm', 'stable diffusion', 'llama', 'mistral', 'artificial intelligence',
    'gpt', 'veo', 'nano banana'],
  'sites/agiscorecard/trends-us.json': ['agi', 'openai', 'anthropic', 'claude', 'gpt', 'gemini',
    'superintelligence', 'altman', 'aschenbrenner', 'deepmind', 'artificial general intelligence',
    'ai benchmark', 'gpt-6', 'sam altman'],
  'sites/thedollscout/content/trends-us.json': ['sex doll', 'love doll', 'tpe doll',
    'silicone doll', 'realdoll'],
};
const SHORT = new Set(['agi', 'gpt', 'veo', 'sora', 'kimi', 'suno', 'grok', 'qwen']); // 词边界匹配,防 magic/sorana/kimi-antonelli 误配

const today = new Date().toISOString().slice(0, 10);
const url = 'https://trends.google.com/trending/rss?geo=US';
let items = null, reason = '';
try {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; agi-site-trend-probe; +https://github.com/f-tiger/agi-site)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const xml = await r.text();
  items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const g = (tag) => (m[1].match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [])[1]?.trim() || '';
    const cd = (s) => s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
    return { title: cd(g('title')), traffic: cd(g('ht:approx_traffic')) };
  }).filter((i) => i.title);
  if (!items.length) throw new Error('RSS parsed but zero items');
} catch (e) { reason = String(e.message || e).slice(0, 120); }

const hit = (title, kw) => SHORT.has(kw)
  ? new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`, 'i').test(title)
  : title.toLowerCase().includes(kw);

// history = 冷却状态。「同词 7 天冷却」需要记忆;只留 14 天,文件永不膨胀。
import { readFileSync, existsSync } from 'node:fs';
const cutoff = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);

for (const [out, kws] of Object.entries(MAPS)) {
  mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true });
  let history = [];
  try {
    if (existsSync(out)) history = JSON.parse(readFileSync(out, 'utf8')).history || [];
  } catch (e) { /* 坏文件不阻塞今天 */ }
  history = history.filter((h) => h.d >= cutoff && h.d !== today);
  const payload = items
    ? { ok: true, fetched: today, geo: 'US',
        matched: items.filter((i) => kws.some((k) => hit(i.title, k))),
        top: items.slice(0, 25) }
    : { ok: false, fetched: today, geo: 'US', reason };
  if (payload.ok) history.push({ d: today, matched: payload.matched.map((m) => m.title) });
  payload.history = history;
  writeFileSync(out, JSON.stringify(payload, null, 1) + '\n');
  console.log(`${out}: ${payload.ok ? `命中 ${payload.matched.length}` : `失败 ${reason}`}`);
}
