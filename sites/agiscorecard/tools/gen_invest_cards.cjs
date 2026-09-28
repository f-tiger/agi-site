// 投资簇的分享预览图（1200x630 PNG），2026-09-27。
// 只做一张有自己数字的卡：/does-copying-13f-work（+ zh）。数字全部读 invest-data.json 的
// copyHomework —— 它由 gen_invest_data.py 从 invest.html 解析，而 invest.html 受「每季 13F 同步义务」约束，
// 所以卡片与页面同源，不会各写各的。每季重算后重跑本脚本（写进季度同步清单，第七处）。
// Run: NODE_PATH=/opt/node22/lib/node_modules node tools/gen_invest_cards.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'invest-data.json'), 'utf8')).copyHomework;
if (!d || !Array.isArray(d.returns) || d.returns.length < 2 || !d.benchmark || !d.asOf) {
  console.error('invest-data.json copyHomework missing or malformed — refusing to render a card without its numbers');
  process.exit(1);
}

const ZH_NAMES = { 'Stanley Druckenmiller': '德鲁肯米勒', 'Cathie Wood': '木头姐', 'David Tepper': '泰珀', 'Warren Buffett': '巴菲特' };
const L = {
  en: {
    q: 'Does copying 13F filings actually work?',
    sub: `AI holdings bought at each filing-day close, ${d.rebalances} rebalances since ${d.since}`,
    bench: `${d.benchmark.name}, same window`,
    foot: `AI slice only, not whole portfolios · as of ${d.asOf} · agiscorecard.com`,
    name: (n) => n,
  },
  zh: {
    q: '抄大佬的 13F 作业，到底赚不赚钱？',
    sub: `按申报日收盘价买入 AI 持仓，${d.rebalances} 次调仓（自 ${d.since.replace('August', '8 月')}）`,
    bench: `${d.benchmark.name}（同一窗口）`,
    foot: `只算 AI 切片，不是整个组合 · 截至 ${d.asOf} · agiscorecard.com`,
    name: (n) => ZH_NAMES[n] || n,
  },
};

function card(lang) {
  const x = L[lang];
  const rows = [...d.returns.map((r) => ({ n: x.name(r.investor), v: r.pct, bench: false })), { n: x.bench, v: d.benchmark.pct, bench: true }]
    .sort((a, b) => b.v - a.v);
  const max = Math.max(...rows.map((r) => r.v));
  const bars = rows
    .map(
      (r) => `<div class="row"><div class="n${r.bench ? ' b' : ''}">${r.n}</div><div class="track"><div class="bar${r.bench ? ' b' : ''}" style="width:${(r.v / max) * 100}%"></div></div><div class="v${r.bench ? ' b' : ''}">+${r.v.toFixed(1)}%</div></div>`
    )
    .join('');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Segoe UI','Noto Sans CJK SC','Noto Serif CJK SC',Roboto,sans-serif}
  body{width:1200px;height:630px;background:radial-gradient(1200px 630px at 20% 0%,#1a1830,#0e0e14);color:#f4f4f8;overflow:hidden}
  .wrap{padding:56px 72px;height:630px;display:flex;flex-direction:column;justify-content:space-between}
  h1{font-size:${lang === 'zh' ? 54 : 52}px;line-height:1.15;font-weight:800;letter-spacing:-.01em}
  .sub{font-size:24px;color:#a8a4c4;margin-top:12px}
  .row{display:flex;align-items:center;gap:18px;margin:9px 0}
  .n{width:${lang === 'zh' ? 250 : 300}px;font-size:26px;color:#e8e6f4}
  .n.b,.v.b{color:#a8a4c4}
  .track{flex:1;height:26px;background:#1f1d2e;border-radius:6px;overflow:hidden}
  .bar{height:26px;background:#7c6af5;border-radius:6px}
  .bar.b{background:#4a4760}
  .v{width:130px;text-align:right;font-size:28px;font-weight:700;font-variant-numeric:tabular-nums}
  .foot{font-size:20px;color:#8f8ba8}
  </style></head><body><div class="wrap"><div><h1>${x.q}</h1><div class="sub">${x.sub}</div></div><div>${bars}</div><div class="foot">${x.foot}</div></div></body></html>`;
}

(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  fs.mkdirSync(path.join(ROOT, 'share'), { recursive: true });
  for (const lang of ['en', 'zh']) {
    await p.setContent(card(lang), { waitUntil: 'load' });
    const out = path.join(ROOT, 'share', `copy-13f-${lang}.png`);
    await p.screenshot({ path: out });
    console.log('wrote', path.relative(ROOT, out));
  }
  // SunWatch（invest.agiscorecard.com）的分享卡：只放品牌与它自己公开的承诺原话，不放任何会过期的数字。
  // SunWatch worker 在出口给没有 og:image 的页面统一补这两张图（sunPredition src/index.js addShareTags）。
  const SW = {
    en: { h: 'SunWatch', s: 'AI-cycle market calls you can audit', l: ['Every call logged before the outcome', 'Misses stay published', 'Not investment advice'], f: 'invest.agiscorecard.com · AGI Scorecard Invest' },
    zh: { h: 'SunWatch', s: 'AI 周期市场判断，公开可查', l: ['每条判断在结果出来之前入档', '失误照样公开，不删', '研究框架，非投资建议'], f: 'invest.agiscorecard.com · AGI 记分牌 · 投资' },
  };
  for (const lang of ['en', 'zh']) {
    const x = SW[lang];
    await p.setContent(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Segoe UI','Noto Sans CJK SC','Noto Serif CJK SC',Roboto,sans-serif}
    body{width:1200px;height:630px;background:radial-gradient(1200px 630px at 20% 0%,#1a1830,#0e0e14);color:#f4f4f8;overflow:hidden}
    .w{padding:64px 72px;height:630px;display:flex;flex-direction:column;justify-content:space-between}
    h1{font-size:88px;font-weight:800;letter-spacing:-.02em}.s{font-size:36px;color:#c9c5e6;margin-top:10px}
    ul{list-style:none;font-size:32px;line-height:1.75}li::before{content:'';display:inline-block;width:14px;height:14px;background:#7c6af5;margin-right:18px;vertical-align:middle}
    .f{font-size:22px;color:#8f8ba8}</style></head><body><div class="w"><div><h1>${x.h}</h1><div class="s">${x.s}</div></div>
    <ul>${x.l.map((t) => `<li>${t}</li>`).join('')}</ul><div class="f">${x.f}</div></div></body></html>`, { waitUntil: 'load' });
    const out = path.join(ROOT, 'share', `sunwatch-${lang}.png`);
    await p.screenshot({ path: out });
    console.log('wrote', path.relative(ROOT, out));
  }
  await b.close();
})();
