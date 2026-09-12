#!/usr/bin/env node
// 官方来源漂移监测（2026-09-11,owner:「为站点构建算法的后端能力,可以更新工具」）。
//
// 本站的承诺是「每条数字都有核实日期」,而核实至今只能由 AI 会话逐条做——会话不跑,
// 数字就在原地变旧;更糟的是**厂商改了页面我们不知道**,直到 30 天复核阈值慢慢到期。
// 这个脚本把「厂商改没改」从等待变成每日观测:每天抓一次每条 limits 的官方来源页,
// 把页面里的「数字+单位」提取成一个集合;集合变了 = 官方页面上的事实可能变了。
//
// 它能做什么、不能做什么,边界一次说死:
//   ✅ 标记:在 data/drift.json 记「哪条工具的来源页数字变了、变了什么」,
//      推进复核队列与雷达,工具页上如实写「官方页面 X 日有变动,本站这条待复核」。
//   ❌ 不写事实:一个字都不写进 tools.json。新数字必须由会话按 limits-edit 两步核实。
//      机器擅自写事实是本站头号禁忌;这里只负责「什么时候该去核」。
//   ✅ 自愈:limits.checked 推进到漂移确认日之后,标记自动消失——行动做完信号必须消失。
//   ✅ 防抖:同一变化连续两天观测到才「确认」,单日出现只记 pending——很多定价页 A/B 轮换、
//      带随机推荐块,单次差异不能当事实变动报。
//   ✅ 失败即放行:抓不到（403/超时/出网封锁）只记状态,不比对、不报漂移。
//      「读不到」永远不能被解释成「变了」或「没变」。
//
//   node scripts/source-drift.mjs              # 全量（每日 CI）
//   node scripts/source-drift.mjs --selftest   # 内置夹具,零网络
//   SOURCE_DRIFT_LIMIT=20 node scripts/source-drift.mjs   # 只抓前 N 条（调试）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP = join(root, 'data/source-snapshots.json');
const OUT = join(root, 'data/drift.json');
const SELFTEST = process.argv.includes('--selftest');
const TODAY = process.env.DRIFT_DATE || new Date().toISOString().slice(0, 10);
const LIMIT = parseInt(process.env.SOURCE_DRIFT_LIMIT || '0', 10);

// ── 1. 从 source 散文里挖 URL ──
// 129 条 source 里 0 条是 http:// 形式,124 条是「kimi.com/zh-cn/help/membership」这种裸域+路径,
// 夹在中文括号与顿号之间。只取带路径或明显是域名的片段;泛域名（openai.com）也收,
// 抓到首页至少能看出「这家把定价页挪了没」。
const URL_RE = /(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[a-z0-9._~\-\/#?=&%]*)?/gi;
const SKIP_HOST = /^(?:e\.g|i\.e|etc|vs|v\d|node\.js|next\.js|vue\.js)$/i;
export function urlsOf(source) {
  const out = [];
  for (const m of String(source || '').matchAll(URL_RE)) {
    const host = m[1].toLowerCase();
    if (SKIP_HOST.test(host) || host.endsWith('.html') || host.endsWith('.json')) continue;
    if (!/[a-z]/.test(host.split('.').pop())) continue;
    let path = (m[2] || '').replace(/[。，、）)；;]+$/g, '');
    const u = `https://${host}${path}`;
    if (!out.includes(u)) out.push(u);
  }
  return out.slice(0, 3);   // 一条 source 最多三个页面,够了
}

// ── 2. 页面 → 事实令牌 ──
// 只看「数字紧邻单位/货币/额度词」的片段;年份、纯序号、像素值之类不算事实。
// 令牌太宽会把版面数字当事实（误报),太窄会漏掉真变动（漏报)——宁可偏窄:
// 漏报的代价是回到 30 天阈值,误报的代价是把复核队列塞满噪音,后者更伤。
const UNIT = '(?:tokens?|token|k|m|b|gb|mb|min(?:ute)?s?|hours?|hrs?|days?|weeks?|months?|mo|yr|years?|requests?|req|rpm|rpd|tpm|tps|calls?|credits?|images?|videos?|messages?|msgs?|prompts?|queries|seconds?|secs?|s|chars?|characters?|words?|pages?|次|条|张|个|分钟|小时|天|周|月|年|积分|点|元|美元|字|页|秒|条\/天|次\/天|万|千|亿|%)';
const CURRENCY = '(?:\\$|€|£|¥|￥|usd|eur|rmb|cny)';
const TOKEN_RE = new RegExp(`(?:${CURRENCY}\\s?\\d[\\d,.]*(?:\\s?\\/\\s?(?:mo|month|yr|year|月|年|user|seat))?|\\d[\\d,.]*\\s?${UNIT}(?![a-z]))`, 'gi');
export function factsOf(html) {
  let t = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  const set = new Set();
  for (const m of t.matchAll(TOKEN_RE)) {
    const tok = m[0].replace(/\s+/g, '');
    if (/^(19|20)\d\d(年|s)?$/.test(tok)) continue;              // 年份
    if (/^\d+(px|em|rem|s)$/.test(tok) && !/\d+s$/.test(tok)) continue;
    if (/^\d{1,2}s$/.test(tok)) continue;                          // css 动画秒数之类
    set.add(tok);
  }
  return [...set].sort();
}
const hashOf = (arr) => createHash('sha256').update(arr.join('\n')).digest('hex').slice(0, 16);
const diff = (a, b) => ({ added: b.filter((x) => !a.includes(x)), removed: a.filter((x) => !b.includes(x)) });

// ── 3. 状态机 ──
// snapshot[slug] = { url, fetched, status, hash, facts, pending?, drift? }
//   pending = { seen, hash, added, removed }         首次观测到差异
//   drift   = { confirmed, hash, added, removed }     连续两天同一差异 → 确认
// 确认后基线换成新集合;此后 limits.checked ≥ confirmed 时标记自动清除。
export function step(prev, fetched, tool, today) {
  const s = { ...(prev || {}) };
  s.url = fetched.url;
  s.fetched = today;
  s.status = fetched.status;
  if (!fetched.ok) {
    s.note = fetched.error || `HTTP ${fetched.status}`;
    return s;   // 失败即放行:基线、pending、drift 全部原样保留
  }
  delete s.note;
  const facts = factsOf(fetched.html);
  const h = hashOf(facts);
  if (!s.hash) {                       // 首次成功抓取:只建基线,不报
    s.hash = h; s.facts = facts; s.baseline = today;
    return s;
  }
  if (h === s.hash) {                  // 与基线一致:清掉未确认的 pending
    delete s.pending;
    return s;
  }
  const d = diff(s.facts || [], facts);
  if (!d.added.length && !d.removed.length) { s.hash = h; s.facts = facts; return s; }
  if (s.pending && s.pending.hash === h && s.pending.seen < today) {
    // 第二天同一差异:确认漂移,基线换新
    s.drift = { confirmed: today, first_seen: s.pending.seen, added: d.added.slice(0, 12), removed: d.removed.slice(0, 12), checked_then: (tool.limits && tool.limits.checked) || null };
    s.hash = h; s.facts = facts;
    delete s.pending;
    return s;
  }
  s.pending = { seen: s.pending && s.pending.hash === h ? s.pending.seen : today, hash: h, added: d.added.slice(0, 12), removed: d.removed.slice(0, 12) };
  return s;
}
// 自愈:核实日期推进到确认日当天或之后,标记撤下（数字已经被人按硬规则核过了)
export function heal(s, tool) {
  if (s && s.drift && tool.limits && tool.limits.checked && tool.limits.checked >= s.drift.confirmed) delete s.drift;
  return s;
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      redirect: 'follow', signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIYangmaoBot/1.0; +source-drift-check)', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
    });
    const html = res.ok ? (await res.text()).slice(0, 600000) : '';
    return { url, ok: res.ok && html.length > 200, status: res.status, html };
  } catch (err) {
    return { url, ok: false, status: 0, error: String(err?.cause?.code || err?.name || err) };
  } finally { clearTimeout(timer); }
}

if (SELFTEST) {
  const assert = (c, m) => { if (!c) { console.error('❌ selftest:', m); process.exit(1); } };
  // URL 提取
  const u1 = urlsOf('Kimi 官方帮助中心（会员套餐价格与权益对比等页，kimi.com/zh-cn/help/membership，经搜索索引引文核实）');
  assert(u1[0] === 'https://kimi.com/zh-cn/help/membership', `URL 提取错:${u1}`);
  const u2 = urlsOf('xAI 官方 Grok FAQ 与定价页（docs.x.ai/grok/faq、x.ai/pricing，经搜索索引引文核实）');
  assert(u2.length === 2 && u2[1] === 'https://x.ai/pricing', `多 URL 提取错:${u2}`);
  assert(urlsOf('Qoder 官方发布的定价方案，经腾讯新闻、知乎等多方独立报道交叉印证').length === 0, '无 URL 的散文不应提取出东西');
  // 事实令牌
  const f = factsOf('<html><style>.a{width:12px}</style><h1>Pricing</h1><p>Pro $20/mo · 5 hours window · 40 messages every 5 hours</p><p>© 2026</p><script>var x=1000;</script></html>');
  assert(f.includes('$20/mo') && f.includes('5hours') && f.includes('40messages'), `令牌提取错:${f}`);
  assert(!f.includes('12px') && !f.includes('2026') && !f.some((x) => x.includes('1000')), `噪音未被剔除:${f}`);
  // 状态机:首抓建基线 → 次日差异 pending → 第三日同差异确认 → 复核后自愈;失败放行
  const tool = { limits: { checked: '2026-09-01' } };
  const A = '<p>Free: 40 messages per day. Pro $20/mo</p>';
  const B = '<p>Free: 20 messages per day. Pro $20/mo</p>';
  let s = step(null, { url: 'u', ok: true, status: 200, html: A }, tool, '2026-09-10');
  assert(s.hash && !s.pending && !s.drift && s.baseline === '2026-09-10', '首抓应只建基线');
  s = step(s, { url: 'u', ok: false, status: 403, error: 'blocked' }, tool, '2026-09-11');
  assert(s.hash && s.note && !s.pending, '抓取失败应放行且保留基线');
  s = step(s, { url: 'u', ok: true, status: 200, html: B }, tool, '2026-09-12');
  assert(s.pending && !s.drift && s.pending.seen === '2026-09-12', '首次差异应记 pending');
  s = step(s, { url: 'u', ok: true, status: 200, html: A }, tool, '2026-09-13');
  assert(!s.pending && !s.drift, '差异消失应清 pending（A/B 轮换不报）');
  s = step(s, { url: 'u', ok: true, status: 200, html: B }, tool, '2026-09-14');
  s = step(s, { url: 'u', ok: true, status: 200, html: B }, tool, '2026-09-14');
  assert(s.pending && !s.drift, '同日重复观测不算第二天');
  s = step(s, { url: 'u', ok: true, status: 200, html: B }, tool, '2026-09-15');
  assert(s.drift && s.drift.confirmed === '2026-09-15' && s.drift.removed.includes('40messages') && s.drift.added.includes('20messages'), `连续两日应确认:${JSON.stringify(s.drift)}`);
  s = heal(s, { limits: { checked: '2026-09-14' } });
  assert(s.drift, '复核日早于确认日不应自愈');
  s = heal(s, { limits: { checked: '2026-09-15' } });
  assert(!s.drift, '复核日 ≥ 确认日应自愈');
  console.log('✅ source-drift selftest 通过（URL 提取 / 令牌 / 防抖状态机 / 自愈 / 失败放行）');
  process.exit(0);
}

const tools = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));
const snap = existsSync(SNAP) ? JSON.parse(readFileSync(SNAP, 'utf8')) : { note: '', items: {} };
snap.note = '由 scripts/source-drift.mjs 每日生成:每条 limits 的官方来源页「数字+单位」令牌集合与基线。只用于判断「该不该去复核」,不含任何本站对外发布的事实。';
let targets = tools.filter((t) => t.limits && t.limits.source).map((t) => ({ t, urls: urlsOf(t.limits.source) })).filter((x) => x.urls.length);
if (LIMIT) targets = targets.slice(0, LIMIT);

let okN = 0, failN = 0, pendingN = 0, confirmedN = 0;
const CONC = 6;
for (let i = 0; i < targets.length; i += CONC) {
  await Promise.all(targets.slice(i, i + CONC).map(async ({ t, urls }) => {
    const url = urls[0];   // 只盯第一个来源页;多页合并会把两页的版面差异混成一个集合
    const r = await fetchPage(url);
    r.ok ? okN++ : failN++;
    const before = snap.items[t.slug];
    let s = step(before, r, t, TODAY);
    s = heal(s, t);
    snap.items[t.slug] = s;
    if (s.pending) pendingN++;
    if (s.drift) confirmedN++;
    console.log(`${r.ok ? '✅' : '⚠️ '} ${t.slug} ${r.status}${s.drift ? '  🔴 漂移已确认 ' + s.drift.confirmed : s.pending ? '  🟡 待二次观测' : ''}`);
  }));
}
// 不再有来源或工具被删的条目退休
for (const slug of Object.keys(snap.items)) if (!targets.find((x) => x.t.slug === slug) && !LIMIT) delete snap.items[slug];
snap.generated = TODAY;
writeFileSync(SNAP, JSON.stringify(snap, null, 1) + '\n');

const drift = Object.entries(snap.items).filter(([, s]) => s.drift).map(([slug, s]) => ({
  slug, url: s.url, confirmed: s.drift.confirmed, first_seen: s.drift.first_seen,
  added: s.drift.added, removed: s.drift.removed, checked_then: s.drift.checked_then,
})).sort((a, b) => (a.confirmed < b.confirmed ? 1 : -1));
writeFileSync(OUT, JSON.stringify({
  generated: TODAY,
  note: '官方来源页令牌集合连续两日与基线不同 = 漂移确认。只是「该去核」的信号,不是事实;limits.checked 推进到确认日后自动撤下。',
  fetched_ok: okN, fetched_fail: failN, pending: pendingN, items: drift,
}, null, 2) + '\n');
console.log(`\n漂移监测:${targets.length} 条来源页,抓到 ${okN} / 失败 ${failN}(失败=放行,不比对);待二次观测 ${pendingN},已确认漂移 ${drift.length}${drift.length ? ':' + drift.map((d) => d.slug).join(', ') : ''}`);
