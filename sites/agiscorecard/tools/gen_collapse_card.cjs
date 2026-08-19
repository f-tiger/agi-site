// One-off OG share card (1200x630) for /aschenbrenner-fund-collapse.
// Same pipeline as gen_share_cards.cjs: render HTML in headless Chromium, screenshot PNG.
// Run: NODE_PATH=/opt/node22/lib/node_modules node tools/gen_collapse_card.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SCORE = String(JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8')).thesisTracker.score);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Noto Sans CJK SC','Noto Sans SC','DejaVu Sans',-apple-system,sans-serif}
body{width:1200px;height:630px;background:radial-gradient(1200px 630px at 20% 0%,#1a1830,#0e0e14);color:#f4f4f8;overflow:hidden}
.wrap{padding:60px 72px;height:630px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;justify-content:space-between;font-size:22px;letter-spacing:.1em;text-transform:uppercase;color:#a8a4c4}
.badge{color:#e05555;font-weight:700}
.emo{font-family:'Noto Color Emoji',sans-serif}
.arc{display:flex;align-items:baseline;gap:28px;margin:6px 0 2px}
.n1{font-size:96px;font-weight:800;color:#4fc3a1;letter-spacing:-.02em}
.arrow{font-size:64px;color:#8888a0}
.n2{font-size:96px;font-weight:800;color:#e05555;letter-spacing:-.02em}
.sub{font-size:30px;color:#cfcde0;margin-top:2px}
.q{font-size:44px;font-weight:800;line-height:1.15;margin-top:20px;max-width:1020px}
.a{font-size:32px;font-weight:700;color:#4fc3a1;margin-top:14px}
.bottom{display:flex;align-items:center;justify-content:space-between;font-size:24px}
.score{color:#a8a4c4}.score b{color:#f4f4f8}
.brand{color:#e05555;font-weight:700}
</style></head><body><div class="wrap">
<div class="top"><div class="badge"><span class="emo">🧨</span> July 2026 · Verdict check</div><div>agiscorecard.com</div></div>
<div>
  <div class="arc"><span class="n1">+439%</span><span class="arrow">&rarr;</span><span class="n2">&minus;67%</span></div>
  <div class="sub">The AGI-2027 fund: YTD through June &rarr; one month later</div>
  <div class="q">Did the collapse prove Aschenbrenner wrong about AGI?</div>
  <div class="a">Zero of the 8 graded verdicts moved. Here's why &rarr;</div>
</div>
<div class="bottom"><div class="score">AGI-2027 Thesis Tracker <b>${SCORE}/100</b> &middot; unchanged</div><div class="brand">The receipts &rarr;</div></div>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ROOT, 'share', 'fund-collapse.png') });
  await browser.close();
  console.log('share/fund-collapse.png written');
})();
