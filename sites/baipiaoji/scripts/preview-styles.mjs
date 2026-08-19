#!/usr/bin/env node
// 视觉化选型：用站点真实内容生成多套风格预览，结构完全一致、只换样式。
// 输出到 dist/preview/，供用户点开对比后选定。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(join(root, 'data/site.json'), 'utf8'));
const tools = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));
const solutions = JSON.parse(readFileSync(join(root, 'data/solutions.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 取真实样本内容
const plans = solutions.slice(0, 3);
const picks = ['doubao', 'metaso', 'openrouter', 'jimeng', 'coze', 'suno'].map((s) => tools.find((t) => t.slug === s)).filter(Boolean);
const cats = Object.entries(site.categories).slice(0, 7);

const STYLES = [
  {
    id: 'a', name: 'A · 朱砂票券', like: '像老式票据与印章：卡片是可撕的福利票，核实日期是盖上去的朱砂章',
    fit: '中式传统 · 强调"经手核验过"的可信感',
  },
  {
    id: 'b', name: 'B · 素纸墨线', like: '像 Linear / Vercel 的中文版：只靠字重、字号与分隔线拉层次，几乎不用颜色',
    fit: '极简克制 · 产品与开发者受众觉得"高级"',
  },
  {
    id: 'c', name: 'C · 终端暗色', like: '像命令行与代码编辑器：等宽字、1px 描边、hover 时边框亮起',
    fit: '开发者向 · API 与编程工具占比高时最贴',
  },
  {
    id: 'd', name: 'D · 榜单促销', like: '像什么值得买：高密度、角标、超大价格数字、红色优惠对比',
    fit: '中式电商 · 薅羊毛场景的原生审美，信息量最大',
  },
];

const CSS = {
  a: `
:root{--bg:#f4f2ef;--card:#fffdfb;--ink:#1d1a19;--ink2:#4a4340;--mute:#857b76;--line:#e4ded7;--acc:#c8352a;--acc-s:#fdf0ed;--ok:#0f7a63;--ok-s:#eaf5f1;--r:10px}
@media(prefers-color-scheme:dark){:root{--bg:#161413;--card:#211d1b;--ink:#ece7e2;--ink2:#c0b7b0;--mute:#8d827b;--line:#322c29;--acc:#f2705f;--acc-s:#2e1c19;--ok:#4fc2a4;--ok-s:#16261f}}
h1,h2,.brand b,.big{font-family:"Songti SC","SimSun",serif;letter-spacing:1.5px}
.tool{border:1px solid var(--line);border-radius:var(--r);background:var(--card);overflow:hidden}
.stub{margin:0 14px;padding:11px 0;border-top:1px dashed var(--line);position:relative}
.stub::before,.stub::after{content:'';position:absolute;top:-6px;width:11px;height:11px;border-radius:50%;background:var(--bg);border:1px solid var(--line)}
.stub::before{left:-20px}.stub::after{right:-20px}
.seal{display:inline-flex;flex-direction:column;align-items:center;line-height:1.15;font-size:9px;color:var(--acc);border:1.5px solid var(--acc);border-radius:4px;padding:3px 5px;transform:rotate(-4deg)}
.seal b{font-size:11px}
.go{display:block;text-align:center;padding:9px;font-size:13px;font-weight:600;color:var(--acc);background:var(--acc-s);border-top:1px solid var(--line)}
.chip{background:var(--ok-s);color:var(--ok);border-radius:3px;padding:1px 6px;font-size:11px}
.plan{border-left:3px solid var(--acc)}
.ask input{border:2px solid var(--acc);border-radius:26px}
`,
  b: `
:root{--bg:#fff;--card:#fff;--ink:#0a0a0a;--ink2:#404040;--mute:#737373;--line:#e5e5e5;--acc:#2563eb;--acc-s:#eff6ff;--ok:#404040;--ok-s:#f5f5f5;--r:6px}
@media(prefers-color-scheme:dark){:root{--bg:#0a0a0a;--card:#0a0a0a;--ink:#fafafa;--ink2:#d4d4d4;--mute:#a3a3a3;--line:#262626;--acc:#60a5fa;--acc-s:#111827;--ok:#a3a3a3;--ok-s:#171717}}
h1{font-weight:700;letter-spacing:-.5px}
h2{font-weight:600;letter-spacing:-.2px}
.tool{border:0;border-top:1px solid var(--line);border-radius:0;background:transparent;padding-top:2px}
.tool:hover{background:var(--ok-s)}
.stub{margin:0 14px;padding:9px 0}
.seal{font-size:11px;color:var(--mute);font-variant-numeric:tabular-nums}
.seal b{font-weight:500}
.go{display:block;text-align:center;padding:9px;font-size:13px;font-weight:500;color:var(--acc)}
.chip{background:transparent;color:var(--mute);border:1px solid var(--line);border-radius:4px;padding:1px 6px;font-size:11px}
.plan{border:1px solid var(--line)}
.ask input{border:1px solid var(--line);border-radius:8px}
.grid{gap:0}
`,
  c: `
:root{--bg:#0d1117;--card:#161b22;--ink:#e6edf3;--ink2:#c9d1d9;--mute:#7d8590;--line:#30363d;--acc:#3fb950;--acc-s:#0f2417;--ok:#58a6ff;--ok-s:#0d1d2f;--r:6px}
body{font-family:ui-monospace,"SF Mono","JetBrains Mono","PingFang SC",monospace}
h1,h2,.big,.seal,.chip{font-family:inherit}
h1{font-weight:600;letter-spacing:-.3px}
h2::before{content:'$ ';color:var(--acc);opacity:.7}
.tool{border:1px solid var(--line);border-radius:var(--r);background:var(--card)}
.tool:hover{border-color:var(--acc)}
.stub{margin:0 14px;padding:11px 0;border-top:1px solid var(--line)}
.seal{font-size:10px;color:var(--acc);border:1px solid var(--acc);border-radius:3px;padding:2px 6px;display:inline-block}
.seal b{font-weight:600}
.go{display:block;text-align:center;padding:9px;font-size:13px;color:var(--acc);border-top:1px solid var(--line)}
.go::before{content:'→ '}
.chip{background:var(--ok-s);color:var(--ok);border:1px solid var(--line);border-radius:3px;padding:1px 6px;font-size:11px}
.plan{border:1px solid var(--line);border-left:2px solid var(--acc)}
.ask input{border:1px solid var(--acc);border-radius:6px;background:var(--card)}
`,
  d: `
:root{--bg:#f5f5f5;--card:#fff;--ink:#222;--ink2:#555;--mute:#999;--line:#eee;--acc:#e63946;--acc-s:#fff1f1;--ok:#ff8f00;--ok-s:#fff8e6;--r:8px}
@media(prefers-color-scheme:dark){:root{--bg:#141414;--card:#1e1e1e;--ink:#f0f0f0;--ink2:#c8c8c8;--mute:#8a8a8a;--line:#2c2c2c;--acc:#ff5a67;--acc-s:#2a1618;--ok:#ffab2e;--ok-s:#2a2010}}
h1,h2{font-weight:800;letter-spacing:0}
.tool{border:1px solid var(--line);border-radius:var(--r);background:var(--card);position:relative;overflow:hidden}
.tool::after{content:'0元';position:absolute;top:0;right:0;background:var(--acc);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:0 0 0 8px}
.stub{margin:0 14px;padding:10px 0;border-top:1px solid var(--line)}
.seal{font-size:10px;color:var(--ok);background:var(--ok-s);border-radius:3px;padding:3px 7px;display:inline-block;font-weight:700}
.seal b{font-size:12px}
.go{display:block;text-align:center;padding:10px;font-size:13.5px;font-weight:700;color:#fff;background:var(--acc)}
.chip{background:var(--acc-s);color:var(--acc);border-radius:3px;padding:1px 6px;font-size:11px;font-weight:600}
.plan{border:1px solid var(--line);border-top:3px solid var(--acc)}
.big{color:var(--acc);font-size:30px;font-weight:800}
.ask input{border:2px solid var(--acc);border-radius:8px}
`,
};

// 结构完全一致，只有 CSS 不同——对比的才是风格本身
function page(style) {
  const nav = STYLES.map((s) => `<a class="nav-item${s.id === style.id ? ' on' : ''}" href="./${s.id}.html">${esc(s.name)}</a>`).join('');
  const catChips = cats.map(([, v], i) => `<span class="cat${i === 0 ? ' on' : ''}">${esc(v)}</span>`).join('');
  const planCards = plans.map((p) => `<div class="plan">
      <div class="plan-pain">${esc(p.pain)}</div>
      <div class="plan-scene">${esc(p.scene)}</div>
      <div class="plan-foot"><span class="mute">${p.steps.length} 步 · 全程免费</span><b class="acc">0 元方案 →</b></div>
    </div>`).join('');
  const toolCards = picks.map((t) => `<div class="tool">
      <div class="tool-top">
        <div class="name">${esc(t.name)}${t.hot ? '<i class="pick">推荐</i>' : ''}</div>
        <div class="mute sm">${esc(t.tagline)}</div>
      </div>
      <div class="stub">
        <p class="benefit">${esc(t.free)}</p>
        <div class="stub-foot">
          <span class="chips">${(t.tags || []).slice(0, 2).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</span>
          <span class="seal">已核实<b>${esc(String(t.last_verified).slice(5))}</b></span>
        </div>
      </div>
      <a class="go">领福利</a>
    </div>`).join('');

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(style.name)} - 白嫖计风格预览</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--ink);line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.bar{position:sticky;top:0;z-index:9;display:flex;gap:6px;flex-wrap:wrap;padding:10px 16px;background:var(--card);border-bottom:1px solid var(--line)}
.nav-item{font-size:12.5px;padding:5px 12px;border:1px solid var(--line);border-radius:20px;color:var(--mute)}
.nav-item.on{background:var(--acc);color:#fff;border-color:var(--acc)}
.wrap{max-width:1000px;margin:0 auto;padding:26px 20px 60px}
.tip{font-size:12.5px;color:var(--mute);border-left:3px solid var(--acc);padding:6px 12px;margin-bottom:22px;background:var(--acc-s)}
h1{font-size:27px;margin-bottom:8px;text-wrap:balance}
.lede{font-size:13.5px;color:var(--ink2);max-width:60ch}
.big{font-variant-numeric:tabular-nums}
.ask{margin:16px 0 6px}
.ask input{width:100%;max-width:520px;padding:12px 18px;font-size:15px;font-family:inherit;background:var(--card);color:var(--ink)}
.cats{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0 26px}
.cat{font-size:13px;padding:5px 13px;border:1px solid var(--line);border-radius:18px;color:var(--ink2);background:var(--card)}
.cat.on{background:var(--acc);color:#fff;border-color:var(--acc)}
h2{font-size:19px;margin:26px 0 13px;padding-bottom:8px;border-bottom:2px solid var(--ink)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:13px}
.plan{border-radius:var(--r);background:var(--card);padding:15px 16px;display:flex;flex-direction:column;gap:6px}
.plan-pain{font-size:15px;font-weight:600}
.plan-scene{font-size:12.5px;color:var(--mute);line-height:1.6}
.plan-foot{display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-size:12px}
.acc{color:var(--acc)}
.mute{color:var(--mute)}.sm{font-size:12.5px}
.tool-top{padding:13px 14px 9px}
.name{font-size:15px;font-weight:600;display:flex;align-items:center;gap:6px}
.pick{font-style:normal;font-size:10.5px;color:var(--acc);border:1px solid var(--acc);border-radius:3px;padding:0 4px}
.benefit{font-size:12.5px;color:var(--ink2);line-height:1.7;margin-bottom:9px}
.stub-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:8px}
.chips{display:flex;gap:4px;flex-wrap:wrap}
.foot{margin-top:34px;padding-top:18px;border-top:1px solid var(--line);font-size:12px;color:var(--mute)}
${CSS[style.id]}
</style></head><body>
<nav class="bar">${nav}</nav>
<div class="wrap">
  <p class="tip"><b>${esc(style.name)}</b> — ${esc(style.like)}。${esc(style.fit)}。上方可切换其他风格对比，内容与结构完全相同，只有样式不同。</p>
  <h1>说说你要做什么，给你一套不花钱的方案</h1>
  <p class="lede">不只是工具列表——<b class="big">${solutions.length}</b> 套按痛点整理的完整方案，告诉你分几步做、每步用哪个免费工具、比付费方案省多少钱。底下还有 <b class="big">${tools.length}</b> 个真有免费额度的工具备查。</p>
  <div class="ask"><input type="search" placeholder="例如：要交 PPT / 想剪视频 / 写论文查文献"></div>
  <div class="cats">${catChips}</div>
  <h2>免费方案</h2>
  <div class="grid">${planCards}</div>
  <h2>对话助手</h2>
  <div class="grid">${toolCards}</div>
  <p class="foot">白嫖计 · 不花冤枉钱，用上最好的 AI · 共收录 ${tools.length} 个真有免费额度的 AI 工具</p>
</div></body></html>`;
}

mkdirSync(join(root, 'dist/preview'), { recursive: true });
for (const s of STYLES) writeFileSync(join(root, 'dist/preview', `${s.id}.html`), page(s));
writeFileSync(join(root, 'dist/preview/index.html'), `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>风格预览</title>
<meta http-equiv="refresh" content="0;url=./a.html"></head><body></body></html>`);
console.log(`✅ 已生成 ${STYLES.length} 套风格预览 → dist/preview/`);
