#!/usr/bin/env node
// 「赔率 vs 证据」周更的数据取用端。
//
// 硬规则是「赔率必核实、必带日期、严禁写『当前价』」。会话沙箱够不到预测市场
// (gamma-api.polymarket.com 实测 000),所以这件事只能在 runner 上做——和 EDGAR、
// glama 同一个「替身执行器」模式。
//
// 本次先当探针跑:能取到就打印,并落 odds-snapshot.json 供 gen_odds.py 消费;
// 取不到就非零退出,**绝不回落到编一个数**。
const SLUG = 'openai-announces-it-has-achieved-agi-before-2027';
const UA = { 'User-Agent': 'AGI Scorecard research (https://agiscorecard.com/about)' };

async function tryUrl(label, url, pick) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
    const body = await r.text();
    if (!r.ok) { console.log(`❌ ${label} HTTP ${r.status} · ${body.slice(0,120)}`); return null; }
    const out = pick(JSON.parse(body));
    console.log(out ? `✅ ${label} → ${JSON.stringify(out)}` : `❌ ${label} 200 但解析不出赔率 · ${body.slice(0,200)}`);
    return out;
  } catch (e) { console.log(`❌ ${label} ${e.message}`); return null; }
}

const ev = await tryUrl('polymarket events?slug', `https://gamma-api.polymarket.com/events?slug=${SLUG}`,
  (j) => {
    const e = Array.isArray(j) ? j[0] : j;
    const m = e?.markets?.[0];
    if (!m) return null;
    let prices = m.outcomePrices;
    if (typeof prices === 'string') { try { prices = JSON.parse(prices); } catch {} }
    return { question: m.question || e?.title, outcomes: m.outcomes, outcomePrices: prices,
             closed: m.closed, volume: m.volume };
  });

if (!ev) { console.log('\n取不到赔率 → 本期不发,绝不编数字'); process.exit(1); }

const snap = { fetched: new Date().toISOString(), source: 'Polymarket gamma-api', slug: SLUG, ...ev };
const { writeFileSync } = await import('node:fs');
writeFileSync('odds-snapshot.json', JSON.stringify(snap, null, 2) + '\n');
console.log('\n已写 odds-snapshot.json');
