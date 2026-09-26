#!/usr/bin/env node
// AGI 行情板取数端 — 2026-09-26 重写(第一版 2026-09-07,owner:「扩展一个类似polymarket的平台…抽佣」)。
//
// 裁定见 docs/prediction-market-platform-2026-09.md:**不做市场,做市场旁边那层**。
// 本站不运营、不撮合、不招揽、不放投注入口;只引用公开行情并注明取数时间——这是
// 可发布的公开数据,不是博彩行为。
//
// 为什么重写(2026-09-26 实测,两处一起把这页拖成了三周 404):
//   ① Polymarket 的 events 列表按成交量只回前 100 条,最低也有 $3.9M——AGI 合约
//      ($275k)结构上永远不会出现;而 /public-search?q=AGI 一次就能找到它。
//   ② Kalshi 把价格字段改成了 *_dollars(last_price / yes_bid / yes_ask 现在恒为
//      null),旧解析器因此一行都不产出;Kalshi 其实有整个 AGI 系列
//      (KXAGICO「Will any company announce that it has achieved AGI before <date>?」12 个季度合约)。
//   两条都是「取数步 continue-on-error,失败显示绿色」藏起来的。
//
// 纪律不变:**先列后筛**。四家来源都先拉它们自己的搜索/列表结果,再用关键词在
// **返回的真实数据**上过滤;本文件不写死任何没有在返回数据里核对过的问题名。
// Metaculus 的两个问题 id 是例外(该 API 未登录 403,沙箱验证不了),所以运行时
// 用标题正则核对,对不上就整站 ok:false,**绝不产出一行**。取不到就 ok:false 并写明原因,
// 全部来源都失败才退非零;绝不沿用旧价冒充新鲜。
//
// 输出 market-board.json 的每一行统一为:
//   { venue, question, kind: 'announcement'|'achievement', before: 'YYYY-MM-DD'|null,
//     yes: 0..1, volume, bettors, money: 'real'|'play'|'none', url }
// `before` 是「在此日期之前」的判定日(Jan 1 of the named year 等),由问题文本机械解析;
// 解析不出就 null,该行只进「其他 AGI 市场」不进共识表。共识本身在 gen_market_board.py
// 里从这个文件确定性重算(--check 能复核),这里只取数。

const UA = { 'User-Agent': 'AGI Scorecard research (https://agiscorecard.com/about)', 'Accept': 'application/json' };
const KEY = /\b(agi|artificial general intelligence|superintelligence|asi)\b/i;
const MAX_ROWS = 40;

async function getJSON(url, extra = {}) {
  const r = await fetch(url, { headers: { ...UA, ...extra }, signal: AbortSignal.timeout(30000) });
  const body = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} · ${body.slice(0, 120)}`);
  return JSON.parse(body);
}
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const iso = (y, m = 1, d = 1) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// 「before <date>」的机械解析。只认这几种写法,认不出返回 null(宁缺毋错):
//   before 2028 / before Jan 1, 2031 / before July 1st 2029 / before July 2027 / by 2030 / in 2026 (=by end of 2026)
export function parseBefore(q) {
  const s = String(q);
  let m = s.match(/\b(?:before|by(?: the end of)?)\s+([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return iso(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]);
  m = s.match(/\b(?:before|by(?: the end of)?)\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/i);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return iso(+m[2], MONTHS[m[1].slice(0, 3).toLowerCase()], 1);
  m = s.match(/\bbefore\s+(\d{4})\b/i);
  if (m) return iso(+m[1]);
  // 「by …」是截止,优先于顺带出现的「in YYYY」;「by end of 2027」与「by the end of 2027」同义
  m = s.match(/\bby(?: the)?(?: end of)?\s+(\d{4})\b/i);
  if (m) return iso(+m[1] + 1);
  m = s.match(/\bin\s+(\d{4})\b/i);
  if (m) return iso(+m[1] + 1);
  return null;
}
const kindOf = (q) => (/\bannounc/i.test(q) ? 'announcement' : 'achievement');

// ── Polymarket ────────────────────────────────────────────────────────────────
// /public-search 是 2026-09-26 沙箱实测能找到 AGI 合约的形态;旧的 events 列表阶梯
// 留作兜底(它能连上但结构上找不到小合约)。
async function polymarket() {
  const base = 'https://gamma-api.polymarket.com/';
  const attempts = [
    ['public-search?q=AGI&limit_per_type=50', 'public-search q=AGI'],
    ['events?limit=200&active=true&closed=false', 'events 列表(兜底,小合约找不到)'],
  ];
  for (const [path, via] of attempts) {
    try {
      const j = await getJSON(base + path);
      const events = Array.isArray(j) ? j : (j?.events ?? []);
      const rows = [];
      for (const e of events) {
        for (const m of (e.markets ?? [e])) {
          const q = m.question || e.title || '';
          if (!KEY.test(q) || m.closed === true || m.active === false) continue;
          let outcomes = m.outcomes, prices = m.outcomePrices;
          if (typeof outcomes === 'string') { try { outcomes = JSON.parse(outcomes); } catch { continue; } }
          if (typeof prices === 'string') { try { prices = JSON.parse(prices); } catch { continue; } }
          const i = Array.isArray(outcomes) ? outcomes.findIndex((o) => /^yes$/i.test(o)) : -1;
          const yes = i >= 0 && Array.isArray(prices) ? num(prices[i]) : null;
          if (yes === null) continue;
          const slug = e.slug || m.slug;
          rows.push({ venue: 'Polymarket', question: q, kind: kindOf(q), before: parseBefore(q), yes,
                      volume: num(m.volume ?? e.volume), bettors: null, money: 'real',
                      url: slug ? `https://polymarket.com/event/${slug}` : null });
        }
      }
      console.log(`✅ Polymarket ← ${via}:命中 ${rows.length} 条`);
      if (rows.length) return { ok: true, via, rows };
    } catch (e) { console.log(`❌ Polymarket ${via} · ${e.message}`); }
  }
  return { ok: false, reason: '没有一条调用形态返回可解析的开放 AGI 市场', rows: [] };
}

// ── Kalshi ────────────────────────────────────────────────────────────────────
// 先列系列(Science and Technology 类目 ~400 条,一次请求),在标题上过滤,再逐系列拉开放合约。
// 价格字段 2026-09-26 实测为 *_dollars 字符串;last 为空时用买卖中价,两者都空则该行不计价。
async function kalshi() {
  const base = 'https://api.elections.kalshi.com/trade-api/v2/';
  let series;
  try {
    const j = await getJSON(base + 'series?limit=200&category=Science%20and%20Technology');
    series = (j.series ?? []).filter((s) => KEY.test(`${s.title ?? ''} ${s.ticker ?? ''}`));
    console.log(`   Kalshi 系列命中:${series.map((s) => s.ticker).join(', ') || '无'}`);
  } catch (e) { return { ok: false, reason: `series 列表取不到 · ${e.message}`, rows: [] }; }
  if (!series.length) return { ok: false, reason: 'Science and Technology 类目里没有标题命中关键词的系列', rows: [] };
  const rows = []; let unpriced = 0;
  for (const s of series) {
    try {
      const j = await getJSON(base + `markets?series_ticker=${encodeURIComponent(s.ticker)}&status=open&limit=100`);
      for (const m of (j.markets ?? [])) {
        const q = [m.title, m.yes_sub_title].filter(Boolean).join(' — ');
        if (!KEY.test(q)) continue;
        const last = num(m.last_price_dollars);
        const bid = num(m.yes_bid_dollars), ask = num(m.yes_ask_dollars);
        const yes = last ?? (bid !== null && ask !== null && ask > 0 ? (bid + ask) / 2 : null);
        if (yes === null) { unpriced++; continue; }
        rows.push({ venue: 'Kalshi', question: q, kind: kindOf(q), before: parseBefore(q) ?? parseBefore(m.yes_sub_title ?? ''),
                    yes: yes > 1 ? yes / 100 : yes, volume: num(m.volume_fp), bettors: null, money: 'real',
                    url: `https://kalshi.com/markets/${String(s.ticker).toLowerCase()}` });
      }
    } catch (e) { console.log(`❌ Kalshi ${s.ticker} · ${e.message}`); }
  }
  console.log(`✅ Kalshi ← series+markets:命中 ${rows.length} 条(无报价跳过 ${unpriced})`);
  return rows.length ? { ok: true, via: 'series → markets?series_ticker', rows, unpriced }
                     : { ok: false, reason: `系列存在但没有一条带报价的开放合约(无报价 ${unpriced})`, rows: [] };
}

// ── Manifold(玩钱,无鉴权)──────────────────────────────────────────────────────
// 只收二元题;玩钱与真钱在页面上分列,永不混成一个数。
async function manifold() {
  try {
    const j = await getJSON('https://api.manifold.markets/v0/search-markets?term=AGI&limit=100&filter=open&sort=liquidity');
    const rows = [];
    for (const m of (Array.isArray(j) ? j : [])) {
      const q = m.question || '';
      if (!KEY.test(q) || m.outcomeType !== 'BINARY' || m.isResolved) continue;
      const yes = num(m.probability);
      if (yes === null) continue;
      rows.push({ venue: 'Manifold', question: q, kind: kindOf(q), before: parseBefore(q), yes,
                  volume: num(m.volume), bettors: num(m.uniqueBettorCount), money: 'play', url: m.url || null });
    }
    console.log(`✅ Manifold ← search-markets:命中 ${rows.length} 条`);
    return rows.length ? { ok: true, via: 'search-markets term=AGI', rows } : { ok: false, reason: '搜索结果里没有开放的二元 AGI 题', rows: [] };
  } catch (e) { return { ok: false, reason: `search-markets · ${e.message}`, rows: [] }; }
}

// ── Metaculus(社区中位数,无钱)────────────────────────────────────────────────
// API v2 未登录 403;runner 用 METACULUS_TOKEN(仓库 Secrets,机器人已在用)只读。
// 两个 id 是本站唯一写死的外部标识,所以运行时用标题核对,对不上整站 ok:false。
// 日期题:aggregations.recency_weighted.latest.forecast_values 是 201 点 CDF,
// 位置公式与 forecasting-tools 0.2.92 numeric_report._nominal_location_to_cdf_location 相同。
const METACULUS = [
  { id: 5121, must: /general ai system.*publicly announced/i, label: 'strong AGI' },
  { id: 3479, must: /weakly general ai system.*publicly announced/i, label: 'weak AGI' },
];
const ANCHORS = ['2027-01-01', '2028-01-01', '2030-01-01', '2035-01-01', '2040-01-01'];
export function locationOf(v, min, max, zero) {
  if (zero === null || zero === undefined) return (v - min) / (max - min);
  const ratio = (max - zero) / (min - zero);
  return (Math.log((v - min) * (ratio - 1) + (max - min)) - Math.log(max - min)) / Math.log(ratio);
}
export function nominalOf(x, min, max, zero) {
  if (zero === null || zero === undefined) return min + x * (max - min);
  const ratio = (max - zero) / (min - zero);
  return min + (max - min) * (Math.pow(ratio, x) - 1) / (ratio - 1);
}
export function cdfAt(cdf, x) {
  if (x <= 0) return cdf[0]; if (x >= 1) return cdf[cdf.length - 1];
  const p = x * (cdf.length - 1), i = Math.floor(p), f = p - i;
  return cdf[i] + (cdf[Math.min(i + 1, cdf.length - 1)] - cdf[i]) * f;
}
const toSec = (v) => (typeof v === 'number' ? v : Date.parse(v) / 1000);
async function metaculus() {
  const token = process.env.METACULUS_TOKEN;
  if (!token) return { ok: false, reason: 'METACULUS_TOKEN 未设置(未登录 403;runner 从 Secrets 注入)', rows: [] };
  const rows = [];
  for (const q of METACULUS) {
    try {
      const j = await getJSON(`https://www.metaculus.com/api/posts/${q.id}/`, { Authorization: `Token ${token}` });
      const title = j.title || j.question?.title || '';
      if (!q.must.test(title)) return { ok: false, reason: `post ${q.id} 标题「${title.slice(0, 80)}」与预期不符,拒绝使用`, rows: [] };
      const qq = j.question || {};
      if (qq.type !== 'date') return { ok: false, reason: `post ${q.id} 不是日期题(${qq.type})`, rows: [] };
      const sc = qq.scaling || {};
      const min = toSec(sc.range_min), max = toSec(sc.range_max), zero = sc.zero_point == null ? null : toSec(sc.zero_point);
      const latest = qq.aggregations?.recency_weighted?.latest ?? qq.aggregations?.unweighted?.latest;
      const cdf = latest?.forecast_values;
      if (!Array.isArray(cdf) || cdf.length < 2 || !Number.isFinite(min) || !Number.isFinite(max)) {
        return { ok: false, reason: `post ${q.id} 没有可用的 CDF/scaling`, rows: [] };
      }
      const center = Array.isArray(latest.centers) ? num(latest.centers[0]) : null;
      const median = center === null ? null : new Date(nominalOf(center, min, max, zero) * 1000).toISOString().slice(0, 10);
      for (const d of ANCHORS) {
        const p = cdfAt(cdf, locationOf(Date.parse(d) / 1000, min, max, zero));
        rows.push({ venue: 'Metaculus', question: `${title} — before ${d.slice(0, 4)} (${q.label})`, kind: 'achievement',
                    before: d, yes: Math.round(p * 10000) / 10000, volume: null, bettors: num(qq.forecasters_count ?? j.forecasters_count),
                    money: 'none', url: `https://www.metaculus.com/questions/${q.id}/`, median_date: median, source_question: title });
      }
    } catch (e) { return { ok: false, reason: `post ${q.id} · ${e.message}`, rows: [] }; }
  }
  console.log(`✅ Metaculus ← api/posts:${rows.length} 个锚点读数`);
  return { ok: true, via: 'api/posts/{id} (token, read-only)', rows };
}

async function main() {
  const [pm, ks, mf, mc] = await Promise.all([polymarket(), kalshi(), manifold(), metaculus()]);
  const seen = new Set();
  const all = [...pm.rows, ...ks.rows, ...mf.rows, ...mc.rows]
    .filter((r) => { const k = r.venue + '|' + r.question; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (b.volume ?? b.bettors ?? 0) - (a.volume ?? a.bettors ?? 0));
  // 锚点行(before 正好是某个锚点日期)永远保留——它们是共识表的输入,不能被成交量截掉
  // (Kalshi 2030/2031 合约成交量小,首跑就被 40 行上限挤掉了);其余按成交量补到上限。
  // 评审 09-26:只留锚点行会把系列的非锚点点位(Kalshi 2028-04/07/10、2029、2031)截掉,而 50% 交点
  // 的插值正需要它们——所以凡是解析出「before 日期」的时间线行一律保留,上限只对其余行生效。
  const anchored = all.filter((r) => r.before);
  const rest = all.filter((r) => !r.before);
  const rows = [...anchored, ...rest.slice(0, Math.max(0, MAX_ROWS - anchored.length))];
  const venue = (v) => ({ ok: v.ok, via: v.via ?? null, reason: v.reason ?? null, found: v.rows.length });
  const board = {
    fetched: new Date().toISOString(),
    venues: { polymarket: venue(pm), kalshi: venue(ks), manifold: venue(mf), metaculus: venue(mc) },
    keyword: KEY.source,
    anchors: ANCHORS,
    rows,
  };
  if (!rows.length) {
    console.log('\n四家来源一行都没拿到 → 不写文件、不出页,绝不编数字');
    process.exit(1);
  }
  const { writeFileSync } = await import('node:fs');
  writeFileSync('market-board.json', JSON.stringify(board, null, 2) + '\n');
  const okv = Object.entries(board.venues).filter(([, v]) => v.ok).map(([k]) => k);
  console.log(`\n已写 market-board.json:${rows.length} 条 · 场所 ok:${okv.join(',') || '无'}`);
}

if (process.argv.includes('--selftest')) {
  const cases = [['Will we get AGI before 2028?', '2028-01-01'], ['Will we get AGI before July 1st 2029?', '2029-07-01'],
    ['… before Jan 1, 2031? — Before Jan 1, 2031', '2031-01-01'], ['OpenAI announces it has achieved AGI in 2026?', '2027-01-01'],
    ['Model released in 2024 achieves AGI by 2027?', '2028-01-01'], ['Will X happen by end of 2027?', '2028-01-01'],
    ['Will X happen by the end of 2027?', '2028-01-01'], ['Are LLMs capable of reaching AGI?', null]];
  let bad = 0;
  for (const [q, want] of cases) { const got = parseBefore(q); if (got !== want) { bad++; console.log(`FAIL parseBefore(${q}) = ${got}, want ${want}`); } }
  const cdf = [0, 0.25, 0.5, 0.75, 1];
  if (Math.abs(cdfAt(cdf, 0.5) - 0.5) > 1e-9 || Math.abs(locationOf(15, 10, 20, null) - 0.5) > 1e-9) { bad++; console.log('FAIL cdf/location'); }
  const x = locationOf(nominalOf(0.3, 10, 1000, 1), 10, 1000, 1); if (Math.abs(x - 0.3) > 1e-9) { bad++; console.log('FAIL log-scale round trip ' + x); }
  console.log(bad ? `selftest: ${bad} failure(s)` : 'selftest: ok'); process.exit(bad ? 1 : 0);
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) await main();
