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
import { MANJU_ACTIONS } from '../lib/manju.mjs';

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

// Only fixed aggregate keys cross into the public snapshot. Missing values are
// unknown, not zero; never replace the API/cache timestamp with the export time.
function sourceTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)
    && Number.isFinite(Date.parse(value)) ? value : null;
}

function manjuSnapshot(api) {
  const raw = api.manju_signals;
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const counts = (value, keys) => object(value) ? Object.fromEntries(keys.map(key =>
    [key, Object.hasOwn(value, key) && Number.isSafeInteger(value[key]) && value[key] >= 0 ? value[key] : null])) : null;
  const ok = raw?.ok === true && !!object(raw.actions);
  const actions = ok ? counts(raw.actions, MANJU_ACTIONS) : null;
  const inquiries = ok ? counts(raw.inquiries, ['submit', 'cooperate', 'correction']) : null;
  const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  return {
    schema_version: 1,
    measurement_version: 'legacy-manju-actions-v1',
    source_generated_at: sourceTimestamp(api.generated),
    window: {
      requested_days: Number.isSafeInteger(api.window_days) ? api.window_days : null,
      since: date(api.since), until: date(api.until), timezone: 'UTC',
      includes_current_partial_utc_day: true,
    },
    ok,
    partial: !ok || !inquiries || [...Object.values(actions || {}), ...Object.values(inquiries || {})].includes(null),
    reason: raw == null ? 'not_reported' : raw.ok === false ? 'source_unavailable' : !ok ? 'invalid_shape' : null,
    actions, inquiries,
    definition: 'Fixed action and inquiry counts, not unique users, qualified customers, retention or revenue. Legacy view includes non-title pages and is not a tool-exposure denominator. video_complete means a non-example report rendered, including incomplete input; video_export combines download initiation and successful copy. official_open is an official-entry click, not a play or commission. Missing reads or fields are null; rolling-window differences are not daily additions. Known QA exclusions do not prove human traffic.',
  };
}

function summarise(api, exportedAt = new Date().toISOString()) {
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
    generated: sourceTimestamp(api.generated)?.slice(0, 10) || null,
    source_generated_at: sourceTimestamp(api.generated), exported_at: exportedAt,
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
    conversion_stages: api.conversion_stages || {ok:false,events:null,accounts:null,reason:'not_reported'},
    homepage_signals: api.homepage_signals || {ok:false,clicks:null,entries:null,daily:null,reason:'not_reported'},
    quote_signals: api.quote_signals || {ok:false,actions:null,builder_entries:null,entry_sources:null,reason:'not_reported'},
    manju_signals: manjuSnapshot(api),
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
  fixture.conversion_stages={ok:true,events:{tool_results_own:2},accounts:{created:1}};
  fixture.quote_signals={ok:true,actions:{builder_open:3,own_ready:1},builder_entries:{'video-guide':3}};
  fixture.homepage_signals={ok:true,clicks:2,entries:[{language:'zh',block:'hero',destination:'toolbox',n:2}],daily:[{date:'2026-10-01',complete:false,clicks:2}]};
  fixture.manju_signals={ok:true,actions:Object.fromEntries(MANJU_ACTIONS.map(k=>[k,0])),inquiries:{submit:0,cooperate:0,correction:0}};
  fixture.manju_signals.actions.video_complete=2;
  const s = summarise(fixture);
  const grokCat = catOf.get('grok');
  const assert = (c, m) => { if (!c) { console.error('❌ selftest:', m); process.exit(1); } };
  assert(s.tools[0].slug === 'grok' && s.tools[0].n === 6, '中英工具页应合并计数（grok=6）');
  assert(s.categories.find((x) => x.cat === 'coding').n >= 2, 'category 页应计入类目');
  assert(s.categories.find((x) => x.cat === grokCat).n >= 7, 'grok 工具页+vs 页应计入其类目');
  assert(s.judgement[0].path === '/is-grok-still-free' && s.judgement[0].n === 1, '判定页应单列');
  assert(s.commercial_triggers.counts['vendor-view']===3 && s.commercial_triggers.counts['ad-wallet']===1,'商业触发计数必须进入每日快照');
  assert(summarise({...fixture,commercial_triggers:null}).commercial_triggers.counts===null,'缺失的新字段不能伪装成零');
  assert(s.conversion_stages.accounts.created===1 && s.conversion_stages.events.tool_results_own===2,'分层指标必须进入每日快照');
  assert(summarise({...fixture,conversion_stages:null}).conversion_stages.accounts===null,'缺失的注册数据不能伪装成零');
  assert(s.quote_signals.actions.own_ready===1 && s.quote_signals.builder_entries['video-guide']===3,'报价使用信号必须进入每日快照');
  assert(summarise({...fixture,quote_signals:null}).quote_signals.actions===null,'缺失报价信号不能伪装成零');
  assert(s.homepage_signals.entries[0].n===2 && !s.homepage_signals.daily[0].complete,'首页明细与部分日标记进入快照');
  assert(summarise({...fixture,homepage_signals:null}).homepage_signals.clicks===null,'首页数据缺失不能当零');
  assert(s.per_day === 0.4, 'per_day 应四舍五入到一位小数');
  assert(s.manju_signals.actions.video_complete===2 && s.manju_signals.actions.official_open===0 && !s.manju_signals.partial, '帧选完整聚合和真实零必须保存');
  assert(s.manju_signals.window.timezone==='UTC' && s.manju_signals.window.includes_current_partial_utc_day && s.manju_signals.window.since===fixture.since && s.manju_signals.window.until===fixture.until && s.manju_signals.window.requested_days===28, '保留真实 UTC 起止和部分日口径');
  const replay=summarise(fixture,'2026-10-12T00:00:00.000Z');
  assert(replay.source_generated_at===fixture.generated && replay.manju_signals.source_generated_at===fixture.generated && replay.exported_at==='2026-10-12T00:00:00.000Z', '重读缓存不得冒充新来源');
  const undated=summarise({...fixture,generated:null,since:null,until:null,window_days:null});
  assert(undated.generated===null && undated.manju_signals.source_generated_at===null && undated.manju_signals.window.since===null && undated.manju_signals.window.requested_days===null, '未知来源时间和窗口不得借用监测时间');
  for (const raw of [undefined,null,{ok:false,actions:{video_complete:99}},{ok:true,actions:[]}]) {
    const missing=summarise({...fixture,manju_signals:raw}).manju_signals;
    assert(!missing.ok && missing.partial && missing.actions===null && missing.inquiries===null, '缺失或失败的帧选聚合不能伪装成零或沿用失败计数');
  }
  const incomplete=summarise({...fixture,manju_signals:{ok:true,actions:{view:0,video_complete:'2',video_export:-1,open:1.5,source:Number.MAX_SAFE_INTEGER+1},inquiries:null}}).manju_signals;
  assert(incomplete.ok && incomplete.partial && incomplete.actions.view===0 && incomplete.actions.video_complete===null && incomplete.actions.video_export===null && incomplete.actions.open===null && incomplete.actions.source===null && incomplete.inquiries===null, '无效计数和缺少的单项必须保留未知');
  const privateMarker='PRIVATE_FIXTURE_MARKER';
  const extra=summarise({...fixture,manju_signals:{...fixture.manju_signals,customer:privateMarker,definition:privateMarker,actions:{...fixture.manju_signals.actions,[privateMarker]:99},inquiries:{...fixture.manju_signals.inquiries,[privateMarker]:99}}}).manju_signals;
  assert(!JSON.stringify(extra).includes(privateMarker), '不复制任意私有字段、自由文本或未登记计数键');
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
  console.log(`✅ reach.json 已写:${out.humans_referred} 次带外部引荐页面事件（非独立人数）;请求窗口 ${out.window_days} 天，含当前 UTC 部分日;来源 ${out.source_generated_at || '未知'};导出 ${out.exported_at};帧选 ${out.manju_signals.ok ? (out.manju_signals.partial ? 'partial' : 'ok') : 'unknown'}`);
} catch (e) {
  const had = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).generated : '（无旧文件）';
  console.log(`::warning::reach 取数失败（${String(e.message || e).slice(0, 120)}）——沿用旧 reach.json ${had};本轮增长算法读到的是陈旧数据,不是「没有流量」`);
} finally {
  clearTimeout(timer);
}
