#!/usr/bin/env node
// AGI 行情板取数端(2026-09-07,owner:「扩展一个类似polymarket的平台…抽佣」)。
//
// 裁定见 docs/prediction-market-platform-2026-09.md:**不做市场,做市场旁边那层**。
// 本站不运营、不撮合、不招揽、不放投注入口;只引用公开行情并注明取数时间——这是
// 可发布的公开数据,不是博彩行为。
//
// 为什么是发现式而不是写死 slug:fetch_odds.mjs 写死一个 slug 能活,是因为那个合约
// 早已人工核对过。要扩到一块板,写死一串没核对过的 slug = 404 一片,或者更糟——写出
// 一个我没验证过的问题名。所以这里**先列后筛**:拉活跃市场,用关键词在**返回的真实
// 数据**上过滤,一个字都不由本文件杜撰。
//
// 沙箱对 gamma-api.polymarket.com 与 external-api.kalshi.com 实测 connect_rejected
// (2026-09-07),**只有 runner 能取**。取不到就退非零,绝不沿用旧价冒充新鲜。

const UA = { 'User-Agent': 'AGI Scorecard research (https://agiscorecard.com/about)' };
const KEY = /\b(agi|artificial general intelligence|superintelligence|asi)\b/i;
const MIN_MARKETS = 1;          // 低于此 = 板子没意义,直接红
const MAX_ROWS = 12;

async function getJSON(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
  const body = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} · ${body.slice(0, 120)}`);
  return JSON.parse(body);
}

const asArray = (j) => Array.isArray(j) ? j : (j?.data ?? j?.events ?? j?.markets ?? []);
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

// ── Polymarket ────────────────────────────────────────────────────────────────
// 已验证可用的调用形态是 /events?slug=<slug>(fetch_odds.mjs 每周在跑)。列表形态的
// 参数没在会话里验证过,所以按阶梯试,第一个能解析出市场的胜出,并把用了哪一条打出来。
const PM_LADDER = [
  ['events?limit=200&active=true&closed=false&order=volume&ascending=false',
   'events 列表按成交量'],
  ['events?limit=200&active=true&closed=false', 'events 列表'],
  ['markets?limit=200&active=true&closed=false', 'markets 列表'],
];

function pmRows(events) {
  const out = [];
  for (const e of asArray(events)) {
    const mkts = e.markets ?? [e];
    for (const m of mkts) {
      const q = m.question || e.title || '';
      if (!KEY.test(q)) continue;
      if (m.closed === true) continue;
      let outcomes = m.outcomes, prices = m.outcomePrices;
      if (typeof outcomes === 'string') { try { outcomes = JSON.parse(outcomes); } catch { continue; } }
      if (typeof prices === 'string') { try { prices = JSON.parse(prices); } catch { continue; } }
      const i = Array.isArray(outcomes) ? outcomes.findIndex((o) => /^yes$/i.test(o)) : -1;
      const yes = i >= 0 && Array.isArray(prices) ? num(prices[i]) : null;
      if (yes === null) continue;
      const slug = e.slug || m.slug;
      out.push({ venue: 'Polymarket', question: q, yes,
                 volume: num(m.volume ?? e.volume),
                 end: (m.endDate || e.endDate || '').slice(0, 10) || null,
                 url: slug ? `https://polymarket.com/event/${slug}` : null });
    }
  }
  return out;
}

// ── Kalshi ────────────────────────────────────────────────────────────────────
// 公开行情端点免鉴权(docs.kalshi.com quick_start_market_data)。同样没在会话里验证过
// 返回形状,所以解析失败就记 ok:false,**不产出任何猜出来的行**。
const KS_LADDER = [
  ['markets?limit=200&status=open', 'markets?status=open'],
  ['markets?limit=200', 'markets 全量'],
];

function ksRows(j) {
  const out = [];
  for (const m of asArray(j)) {
    const q = m.title || m.subtitle || m.yes_sub_title || '';
    if (!KEY.test(q)) continue;
    // Kalshi 报价是「美分」整数(1–99)
    const c = num(m.last_price ?? m.yes_bid ?? m.yes_ask);
    if (c === null) continue;
    out.push({ venue: 'Kalshi', question: q, yes: c > 1 ? c / 100 : c,
               volume: num(m.volume), end: (m.close_time || '').slice(0, 10) || null,
               url: m.ticker ? `https://kalshi.com/markets/${String(m.ticker).split('-')[0].toLowerCase()}` : null });
  }
  return out;
}

async function venue(name, base, ladder, parse) {
  for (const [path, label] of ladder) {
    try {
      const rows = parse(await getJSON(base + path));
      console.log(`✅ ${name} ← ${label}:命中 ${rows.length} 条`);
      if (rows.length) return { ok: true, via: label, rows };
    } catch (e) { console.log(`❌ ${name} ${label} · ${e.message}`); }
  }
  return { ok: false, reason: `没有一条调用形态返回可解析的 ${name} 行情`, rows: [] };
}

const pm = await venue('Polymarket', 'https://gamma-api.polymarket.com/', PM_LADDER, pmRows);
const ks = await venue('Kalshi', 'https://external-api.kalshi.com/trade-api/v2/', KS_LADDER, ksRows);

const seen = new Set();
const rows = [...pm.rows, ...ks.rows]
  .filter((r) => { const k = r.venue + '|' + r.question; if (seen.has(k)) return false; seen.add(k); return true; })
  .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
  .slice(0, MAX_ROWS);

const board = {
  fetched: new Date().toISOString(),
  venues: { polymarket: { ok: pm.ok, via: pm.via ?? null, reason: pm.reason ?? null, found: pm.rows.length },
            kalshi:     { ok: ks.ok, via: ks.via ?? null, reason: ks.reason ?? null, found: ks.rows.length } },
  keyword: KEY.source,
  rows,
};

if (rows.length < MIN_MARKETS) {
  console.log(`\n只拿到 ${rows.length} 条(下限 ${MIN_MARKETS})→ 不写文件、不出页,绝不编数字`);
  process.exit(1);
}
const { writeFileSync } = await import('node:fs');
writeFileSync('market-board.json', JSON.stringify(board, null, 2) + '\n');
console.log(`\n已写 market-board.json:${rows.length} 条 · PM ${pm.ok ? 'ok' : 'FAIL'} · Kalshi ${ks.ok ? 'ok' : 'FAIL'}`);
