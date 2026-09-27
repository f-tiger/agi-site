#!/usr/bin/env node
// 每日触达导出:把 /api/reach 的聚合数字落进 data/reach.json,让构建期、雷达与每日循环
// 都按文件读流量,而不是各自手写 SQL、各自漂口径（三线度量口径曾经三轮漂三次）。
//
//   node scripts/reach-export.mjs              # 取数并写 data/reach.json（取不到 = 保留旧文件 + 警告）
//   node scripts/reach-export.mjs --selftest   # 用内置夹具跑映射逻辑,零网络
//
// 只做两件事:①取聚合 JSON;②把 path 映射成本站的语义（工具/类目/判定页/枢纽）。
// 不做任何判断,不写任何事实。判断在雷达与循环里,事实只在 tools.json 里。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data/reach.json');
const SELFTEST = process.argv.includes('--selftest');
const ORIGIN = process.env.REACH_ORIGIN || 'https://baipiaoji.com';
const DAYS = parseInt(process.env.REACH_DAYS || '28', 10);

const tools = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));
const catOf = new Map(tools.map((t) => [t.slug, t.category]));

// path → 语义。/en/ 前缀剥掉后同一页中英合并计数（判定线一律按中英合计读）。
function classify(path) {
  let p = String(path || '');
  let lang = 'zh';
  if (p.startsWith('/en/')) { p = p.slice(3); lang = 'en'; }
  else if (p === '/en') { p = '/'; lang = 'en'; }
  p = p.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
  let m;
  if ((m = p.match(/^\/tools\/([a-z0-9-]+)$/))) return { kind: 'tool', key: m[1], cat: catOf.get(m[1]) || '', lang };
  if ((m = p.match(/^\/c\/([a-z-]+)$/))) return { kind: 'category', key: m[1], cat: m[1], lang };
  if ((m = p.match(/^\/is-([a-z0-9-]+)-still-free$/))) return { kind: 'judgement', key: p, cat: catOf.get(m[1]) || '', lang };
  if (/^\/(vs|alternatives|wall|upgrade)\//.test(p)) {
    const seg = p.split('/')[1];
    const slug = p.split('/')[2] || '';
    const first = slug.split('-vs-')[0];
    return { kind: seg, key: p, cat: catOf.get(first) || catOf.get(slug) || '', lang };
  }
  if (/^\/(money|plans|solutions|earn|pipeline)\//.test(p) || p === '/earn/') return { kind: p.split('/')[1], key: p, cat: '', lang };
  return { kind: 'page', key: p, cat: '', lang };
}

function summarise(api) {
  const byCat = {}, byTool = {}, judgement = {}, byKind = {}, pages = {};
  for (const r of api.paths || []) {
    const c = classify(r.path);
    const n = Number(r.n) || 0;
    byKind[c.kind] = (byKind[c.kind] || 0) + n;
    if (c.cat) byCat[c.cat] = (byCat[c.cat] || 0) + n;
    if (c.kind === 'tool') byTool[c.key] = (byTool[c.key] || 0) + n;
    if (c.kind === 'judgement') judgement[c.key] = (judgement[c.key] || 0) + n;
    pages[c.key] = (pages[c.key] || 0) + n;
  }
  const desc = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const days = api.window_days || DAYS;
  return {
    generated: (api.generated || new Date().toISOString()).slice(0, 10),
    source: '/api/reach', window_days: days, since: api.since, until: api.until,
    definition: api.definition,
    humans_referred: api.humans_referred || 0,
    per_day: Math.round(((api.humans_referred || 0) / days) * 10) / 10,
    by_kind: byKind,
    categories: desc(byCat).map(([cat, n]) => ({ cat, n })),
    tools: desc(byTool).slice(0, 40).map(([slug, n]) => ({ slug, cat: catOf.get(slug) || '', n })),
    judgement: desc(judgement).map(([path, n]) => ({ path, n })),
    pages: desc(pages).slice(0, 60).map(([path, n]) => ({ path, n })),
    referrers: (api.referrers || []).slice(0, 20),
    ai_referrals: api.ai_referrals || [],
    events: api.events || {},
    submissions: api.submissions || {},
    ads: api.ads || {},
    commercial_triggers: api.commercial_triggers || {ok:false,counts:null,reason:"not_reported"},
  };
}

if (SELFTEST) {
  const fixture = {
    generated: '2026-09-11T00:00:00Z', window_days: 28, since: '2026-08-14', until: '2026-09-11', humans_referred: 10,
    paths: [{ path: '/en/tools/grok.html', n: 4 }, { path: '/tools/grok.html', n: 2 }, { path: '/en/c/coding', n: 2 },
      { path: '/is-grok-still-free.html', n: 1 }, { path: '/en/vs/deepseek-vs-grok.html', n: 1 }],
    referrers: [{ ref: 'www.google.com', n: 8 }], ai_referrals: [], events: { go: 3 }, submissions: { new: 2, total: 7 }, ads: {},
  };
  fixture.commercial_triggers={ok:true,counts:{'vendor-view':3,'ad-wallet':1}};
  const s = summarise(fixture);
  const grokCat = catOf.get('grok');
  const assert = (c, m) => { if (!c) { console.error('❌ selftest:', m); process.exit(1); } };
  assert(s.tools[0].slug === 'grok' && s.tools[0].n === 6, '中英工具页应合并计数（grok=6）');
  assert(s.categories.find((x) => x.cat === 'coding').n >= 2, 'category 页应计入类目');
  assert(s.categories.find((x) => x.cat === grokCat).n >= 7, 'grok 工具页+vs 页应计入其类目');
  assert(s.judgement[0].path === '/is-grok-still-free' && s.judgement[0].n === 1, '判定页应单列');
  assert(s.commercial_triggers.counts['vendor-view']===3 && s.commercial_triggers.counts['ad-wallet']===1,'商业触发计数必须进入每日快照');
  assert(summarise({...fixture,commercial_triggers:null}).commercial_triggers.counts===null,'缺失的新字段不能伪装成零');
  assert(s.per_day === 0.4, 'per_day 应四舍五入到一位小数');
  console.log('✅ reach-export selftest 通过（映射与合并计数正确）');
  process.exit(0);
}

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 30000);
try {
  let api;
  if (process.env.REACH_FROM_FILE) {
    // 离线来源:同形状的 JSON 文件（首次播种、或会话里用 MCP 现查后喂给同一套映射）
    api = JSON.parse(readFileSync(process.env.REACH_FROM_FILE, 'utf8'));
  } else {
    const res = await fetch(`${ORIGIN}/api/reach?days=${DAYS}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'curl/8.0 bpj-ci-reach' },   // curl 前缀:与 CI 自测同桶,agent 线会剔掉它
    });
    api = await res.json();
    if (!res.ok || !api.ok) throw new Error(`HTTP ${res.status} ${api.code || ''}`);
  }
  const out = summarise(api);
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`✅ reach.json 已写:${out.humans_referred} 次带引荐真人 / ${out.window_days} 天 ≈ ${out.per_day}/日;类目 ${out.categories.length}、工具 ${out.tools.length}、判定页 ${out.judgement.length};投稿 new=${out.submissions.new}`);
} catch (e) {
  const had = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).generated : '（无旧文件）';
  console.log(`::warning::reach 取数失败（${String(e.message || e).slice(0, 120)}）——沿用旧 reach.json ${had};本轮增长算法读到的是陈旧数据,不是「没有流量」`);
} finally {
  clearTimeout(timer);
}
