// Render per-archetype OG share cards (1200x630 PNG) for the "What's your AGI type?"
// game, using the pre-installed global Playwright/Chromium (no image libs on this box).
// Run: NODE_PATH=/opt/node22/lib/node_modules node tools/gen_share_cards.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const types = JSON.parse(fs.readFileSync(path.join(__dirname, 'agi_types.json'), 'utf8'));
// AGI-2027 Thesis Tracker score — read from data.json so cards never drift.
const SCORE = String(JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8')).thesisTracker.score);

const L = {
  en: {badge:'◆ The AGI Test', kicker:'Your AGI type', score:'AGI-2027 Thesis Tracker', cta:"What's your AGI type? &rarr;",
       name:t=>t.name, tl:t=>t.timeline, vs:t=>t.vs},
  zh: {badge:'◆ AGI 类型测试', kicker:'你的 AGI 类型', score:'AGI-2027 命题追踪指数', cta:'你是哪种 AGI 类型？&rarr;',
       name:t=>t.name_zh, tl:t=>t.timeline_zh, vs:t=>t.vs_zh},
};

function card(t, lang) {
  const x = L[lang];
  const nameSize = lang === 'zh' ? 92 : 82;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Segoe UI','Noto Sans CJK SC','Noto Sans SC',Roboto,'Noto Color Emoji',sans-serif}
  body{width:1200px;height:630px;background:radial-gradient(1200px 630px at 20% 0%,#1a1830,#0e0e14);color:#f4f4f8;overflow:hidden}
  .wrap{padding:64px 72px;height:630px;display:flex;flex-direction:column;justify-content:space-between}
  .top{display:flex;align-items:center;justify-content:space-between;font-size:22px;letter-spacing:.1em;text-transform:uppercase;color:#a8a4c4}
  .badge{color:${t.tint};font-weight:700}
  .emoji{font-size:120px;line-height:1;margin-bottom:8px}
  .kicker{font-size:26px;color:#a8a4c4;letter-spacing:.08em;margin-bottom:10px}
  .name{font-size:${nameSize}px;font-weight:800;line-height:1.02;letter-spacing:-.02em}
  .tl{margin-top:18px;font-size:34px;font-weight:600;color:${t.tint}}
  .vs{margin-top:12px;font-size:26px;color:#cfcde0;max-width:960px;line-height:1.35}
  .bottom{display:flex;align-items:center;justify-content:space-between;font-size:24px}
  .score{color:#a8a4c4}.score b{color:#f4f4f8}
  .brand{color:${t.tint};font-weight:700}
  </style></head><body><div class="wrap">
    <div class="top"><div class="badge">${x.badge}</div><div>agiscorecard.com</div></div>
    <div>
      <div class="emoji">${t.emoji}</div>
      <div class="kicker">${x.kicker}</div>
      <div class="name">${x.name(t)}</div>
      <div class="tl">${x.tl(t)}</div>
      <div class="vs">${x.vs(t).replace(/—/g,'&mdash;')}</div>
    </div>
    <div class="bottom">
      <div class="score">${x.score} &nbsp;<b>${SCORE}/100</b></div>
      <div class="brand">${x.cta}</div>
    </div>
  </div></body></html>`;
}

(async () => {
  const outDir = path.join(ROOT, 'share');
  fs.mkdirSync(outDir, { recursive: true });
  // Generic "test prompt" cards for the game entry pages (agi-test / zh/agi-test).
  const prompt = (lang) => {
    const zh = lang === 'zh';
    const eyebrow = zh ? '◆ AGI 类型测试' : '◆ The AGI Test';
    const big = zh ? '你是哪种<br>AGI 类型？' : "What's your<br>AGI type?";
    const sub = zh ? '30 秒测出你的立场，看你与马斯克、Aschenbrenner、Metaculus 谁更接近。'
                   : 'A 30-second test: see where you land vs Musk, Aschenbrenner & Metaculus.';
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,'Segoe UI','Noto Sans CJK SC',Roboto,'Noto Color Emoji',sans-serif}
    body{width:1200px;height:630px;background:radial-gradient(1200px 630px at 20% 0%,#1a1830,#0e0e14);color:#f4f4f8}
    .wrap{padding:70px 72px;height:630px;display:flex;flex-direction:column;justify-content:space-between}
    .top{display:flex;justify-content:space-between;font-size:22px;letter-spacing:.1em;text-transform:uppercase;color:#a8a4c4}
    .badge{color:#7c6af5;font-weight:700}
    .big{font-size:100px;font-weight:800;line-height:1.03;letter-spacing:-.02em}
    .sub{margin-top:20px;font-size:28px;color:#cfcde0;max-width:1000px;line-height:1.35}
    .bottom{font-size:24px;color:#a8a4c4}.bottom b{color:#f4f4f8}
    </style></head><body><div class="wrap">
      <div class="top"><div class="badge">${eyebrow}</div><div>agiscorecard.com</div></div>
      <div><div class="big">${big}</div><div class="sub">${sub}</div></div>
      <div class="bottom">🚀 ⏱️ 📊 🤔 🛡️ &nbsp; AGI-2027 ${zh ? '命题追踪指数' : 'Thesis Tracker'} <b>${SCORE}/100</b></div>
    </div></body></html>`;
  };
  const b = await chromium.launch();
  for (const lang of ['en', 'zh']) {
    const pp = await b.newPage({ viewport: { width: 1200, height: 630 } });
    await pp.setContent(prompt(lang), { waitUntil: 'networkidle' });
    await pp.screenshot({ path: path.join(outDir, (lang === 'zh' ? 'zh-' : '') + 'agi-test.png') });
    await pp.close();
    console.log('wrote share/' + (lang === 'zh' ? 'zh-' : '') + 'agi-test.png');
  }
  for (const lang of ['en', 'zh']) {
    for (const t of types) {
      const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
      await p.setContent(card(t, lang), { waitUntil: 'networkidle' });
      const fn = (lang === 'zh' ? 'zh-' : '') + t.slug + '.png';
      await p.screenshot({ path: path.join(outDir, fn) });
      await p.close();
      console.log('wrote share/' + fn);
    }
  }
  await b.close();
})();
