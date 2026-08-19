// Render per-persona OG share cards (1200x630 PNG) for The Future Bet game, using
// the pre-installed global Playwright/Chromium. Personas map to REAL public
// forecaster positions (from data.json). Run:
//   NODE_PATH=/opt/node22/lib/node_modules node tools/gen_future_cards.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCORE = String(JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8')).thesisTracker.score);

// slug, emoji, name, band (yes-count), timeline, one-liner, tint — all real positions.
const PERSONAS = [
  { slug:'musk', emoji:'🚀', name:'Elon Musk', band:'10–12 bold bets', tl:'AGI by end of 2026', vs:'The most aggressive public call — you bet the future arrives first.', tint:'#e0605e' },
  { slug:'aschenbrenner', emoji:'⏱️', name:'Leopold Aschenbrenner', band:'8–9 bold bets', tl:'AGI by 2027', vs:'Exactly on the Situational Awareness line — “counting the OOMs.”', tint:'#7c6af5' },
  { slug:'hassabis', emoji:'📊', name:'Demis Hassabis', band:'6–7 bold bets', tl:'~50% by 2030', vs:'DeepMind’s measured-bull view — this decade, past the 2027 focal point.', tint:'#4fc3a1' },
  { slug:'metaculus', emoji:'🤔', name:'the Metaculus crowd', band:'4–5 bold bets', tl:'~50% by 2033', vs:'The forecaster consensus — you bet the base rate.', tint:'#e8a040' },
  { slug:'survey', emoji:'🛡️', name:'the academic survey', band:'0–3 bold bets', tl:'50% by 2047', vs:'2,778 AI researchers — you bet the trend lines break first.', tint:'#8888a0' },
];

function card(t) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Segoe UI',Roboto,'Noto Color Emoji',sans-serif}
  body{width:1200px;height:630px;background:radial-gradient(1200px 630px at 20% 0%,#1a1830,#0e0e14);color:#f4f4f8;overflow:hidden}
  .wrap{padding:64px 72px;height:630px;display:flex;flex-direction:column;justify-content:space-between}
  .top{display:flex;align-items:center;justify-content:space-between;font-size:22px;letter-spacing:.1em;text-transform:uppercase;color:#a8a4c4}
  .badge{color:${t.tint};font-weight:700}
  .emoji{font-size:112px;line-height:1;margin-bottom:8px}
  .kicker{font-size:26px;color:#a8a4c4;letter-spacing:.06em;margin-bottom:10px}
  .name{font-size:76px;font-weight:800;line-height:1.03;letter-spacing:-.02em}
  .tl{margin-top:16px;font-size:34px;font-weight:600;color:${t.tint}}
  .vs{margin-top:12px;font-size:26px;color:#cfcde0;max-width:980px;line-height:1.35}
  .bottom{display:flex;align-items:center;justify-content:space-between;font-size:24px}
  .score{color:#a8a4c4}.score b{color:#f4f4f8}
  .brand{color:${t.tint};font-weight:700}
  </style></head><body><div class="wrap">
    <div class="top"><div class="badge">◆ The Future Bet</div><div>agiscorecard.com</div></div>
    <div>
      <div class="emoji">${t.emoji}</div>
      <div class="kicker">Your bets put you closest to</div>
      <div class="name">${t.name}</div>
      <div class="tl">${t.tl}</div>
      <div class="vs">${t.vs.replace(/—/g,'&mdash;')}</div>
    </div>
    <div class="bottom">
      <div class="score">AGI-2027 Thesis Tracker &nbsp;<b>${SCORE}/100</b></div>
      <div class="brand">What's your Future Bet? &rarr;</div>
    </div>
  </div></body></html>`;
}

(async () => {
  const outDir = path.join(ROOT, 'share');
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  // generic entry card for /future-bet itself
  const entry = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Segoe UI',Roboto,'Noto Color Emoji',sans-serif}
  body{width:1200px;height:630px;background:radial-gradient(1200px 630px at 20% 0%,#1a1830,#0e0e14);color:#f4f4f8}
  .wrap{padding:70px 72px;height:630px;display:flex;flex-direction:column;justify-content:space-between}
  .top{display:flex;justify-content:space-between;font-size:22px;letter-spacing:.1em;text-transform:uppercase;color:#a8a4c4}
  .badge{color:#7c6af5;font-weight:700}
  .big{font-size:96px;font-weight:800;line-height:1.03;letter-spacing:-.02em}
  .sub{margin-top:20px;font-size:28px;color:#cfcde0;max-width:1010px;line-height:1.35}
  .bottom{font-size:24px;color:#a8a4c4}.bottom b{color:#f4f4f8}
  </style></head><body><div class="wrap">
    <div class="top"><div class="badge">◆ The Future Bet</div><div>agiscorecard.com</div></div>
    <div><div class="big">What do you bet<br>actually happens?</div><div class="sub">Bet YES/NO on 12 bold predictions — AGI, Mars, robots, fusion — and see which forecaster you are.</div></div>
    <div class="bottom">🚀 ⏱️ 📊 🤔 🛡️ &nbsp; AGI-2027 Thesis Tracker <b>${SCORE}/100</b></div>
  </div></body></html>`;
  let pp = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await pp.setContent(entry, { waitUntil: 'networkidle' });
  await pp.screenshot({ path: path.join(outDir, 'future-bet.png') });
  await pp.close();
  console.log('wrote share/future-bet.png');
  for (const t of PERSONAS) {
    const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
    await p.setContent(card(t), { waitUntil: 'networkidle' });
    await p.screenshot({ path: path.join(outDir, 'future-' + t.slug + '.png') });
    await p.close();
    console.log('wrote share/future-' + t.slug + '.png');
  }
  await b.close();
})();
