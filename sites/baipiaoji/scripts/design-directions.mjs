#!/usr/bin/env node
// 三方向设计初稿生成器（huashu-design Fallback Phase 4）
//
// 三版共用同一份**真实内容**（data/*.json），只换设计逻辑，方便横向对比。
// 三版的布局骨架必须互异——不是换色换字体的换皮。
//
//   A · 秒数轮盘 #5   Pure-CSS Art（Lynn Fisher）        无侧栏 · 不对称全幅网格 · 内容即几何插画
//   B · 现实参照      Anthropic 暖色出版物（DBCo+Geist） 无侧栏 · 居中单栏阅读流 · 衬线×无衬线混排
//   C · 最佳设计师    Massimo Vignelli · Unigrid         窄字导航 + 时刻表式密排网格 · 颜色只作编码
//
// 输出：design-demos/*.html（自包含，双击可开，零外部字体/图片依赖）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'design-demos');
mkdirSync(out, { recursive: true });

const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const site = read('data/site.json');
const tools = read('data/tools.json');
const solutions = read('data/solutions.json');
const hustles = read('data/hustles.json');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TODAY = tools.map((t) => t.last_verified).sort().pop();
const freeN = tools.filter((t) => (t.tags || []).includes('完全免费')).length;
const dailyN = tools.filter((t) => (t.tags || []).includes('每日福利')).length;
const first = (s) => String(s).replace(/\*\*/g, '').split('。')[0] + '。';

// 三版共用的真实内容切片
const H = hustles;
const P = solutions.slice(0, 6);
const T = tools.filter((t) => t.hot).slice(0, 8);

const page = (title, css, body) => `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}img{max-width:100%}a{color:inherit;text-decoration:none}
${css}</style></head><body>${body}</body></html>`;

/* ══════════════════════════════════════════════════════════════════
   A · 秒数轮盘 #5 —— Pure-CSS Art 几何构成（参照 Lynn Fisher）
   色彩推导：主色不凭空发明，从站内已有的朱红收敛而来——
   oklch 压低 chroma 到油墨区间得赭橙 #E5502E（不是货架红，是印刷红）；
   深墨 #141414 承担全部文字；纸灰 #EFECE6 做底，避免纯白的实验室感；
   信号蓝 #1B4DE4 **只用于事实标记**（核实日期），不做装饰。
   视觉母题：步骤条——每份作业几步，就画几根条。内容自己长成插画，零图片。
   ══════════════════════════════════════════════════════════════════ */
const cssA = `
:root{--ink:#141414;--paper:#EFECE6;--red:#E5502E;--blue:#1B4DE4;--line:#141414}
body{background:var(--paper);color:var(--ink);font:400 16px/1.6 system-ui,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1320px;margin:0 auto;padding:0 40px}
.top{display:flex;align-items:baseline;gap:28px;padding:26px 0;border-bottom:3px solid var(--ink)}
.logo{font-weight:900;font-size:26px;letter-spacing:-1px}
.top nav{display:flex;gap:22px;font-weight:700;font-size:14px;margin-left:auto}
.top nav a:hover{color:var(--red)}

/* 不对称全幅网格：7 列文字 / 5 列几何构成 */
.hero{display:grid;grid-template-columns:7fr 5fr;gap:56px;padding:64px 0 52px;border-bottom:3px solid var(--ink)}
.hero h1{font-weight:900;font-size:clamp(40px,5.2vw,68px);line-height:1.04;letter-spacing:-2.5px;text-wrap:balance}
.hero h1 em{font-style:normal;color:var(--red)}
.hero p{margin-top:22px;font-size:17px;line-height:1.8;max-width:34ch}
.hero p b{background:var(--ink);color:var(--paper);padding:1px 7px;font-weight:700}
.vow{margin-top:26px;display:inline-block;border:3px solid var(--ink);padding:9px 16px;font-weight:800;font-size:14px}

/* 几何构成：六份作业 × 步数，直接画成条 */
.plot{display:flex;flex-direction:column;justify-content:flex-end;gap:14px}
.bar{display:flex;align-items:center;gap:7px}
.bar i{display:block;height:22px;background:var(--ink)}
.bar i:nth-child(2){background:var(--red)}
.bar span{font-size:11px;font-weight:700;margin-left:6px;opacity:.55;white-space:nowrap}
.plot .cap{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.5;margin-bottom:4px}

.band{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:3px solid var(--ink)}
.band div{padding:20px 0}
.band div+div{border-left:1px solid var(--ink);padding-left:20px}
.band dt{font-size:12px;font-weight:700;opacity:.55}
.band dd{font-size:36px;font-weight:900;letter-spacing:-1.5px;font-variant-numeric:tabular-nums}
.band div:first-child dd{color:var(--red)}

h2.sec{font-weight:900;font-size:13px;letter-spacing:2px;padding:36px 0 16px;text-transform:uppercase}
/* 错位卡片：奇偶行下沉，打破规整 */
.works{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--ink);border-left:1px solid var(--ink)}
.work{border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:22px 22px 20px;position:relative;background:var(--paper);transition:background .15s}
.work:nth-child(even){background:#E7E3DA}
.work:hover{background:var(--ink);color:var(--paper)}
.work:hover .glyph i{background:var(--paper)}
.work:hover .fail{border-color:var(--paper)}
.glyph{display:flex;gap:5px;margin-bottom:14px}
.glyph i{width:26px;height:8px;background:var(--ink);display:block}
.glyph i:first-child{background:var(--red);width:38px}
.work h3{font-weight:900;font-size:20px;line-height:1.3;letter-spacing:-.5px}
.work .who{font-size:12.5px;line-height:1.7;margin-top:8px;opacity:.7}
.fail{margin-top:14px;border-top:2px solid var(--ink);padding-top:10px;font-size:12.5px;line-height:1.7}
.fail b{display:block;font-size:10px;letter-spacing:1px;font-weight:800;color:var(--red);margin-bottom:3px}
.work:hover .fail b{color:#FF8C6B}

.recipes{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--ink);border:1px solid var(--ink)}
.rec{background:var(--paper);padding:18px 20px;display:flex;flex-direction:column;gap:8px}
.rec .pain{font-weight:800;font-size:16px;line-height:1.4}
.rec .save{font-size:11px;font-weight:800;color:var(--blue);letter-spacing:.5px}
.rec .steps{margin-top:auto;display:flex;gap:4px;align-items:center}
.rec .steps i{width:16px;height:5px;background:var(--ink)}
.rec .steps span{font-size:11px;font-weight:700;opacity:.5;margin-left:6px}

.tools{display:flex;flex-wrap:wrap;gap:0;border-top:1px solid var(--ink)}
.tool{flex:1 1 240px;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:14px 18px;display:flex;flex-direction:column;gap:4px}
.tool b{font-size:15px;font-weight:800}
.tool span{font-size:12px;opacity:.65;line-height:1.6}
.tool time{font-size:10.5px;font-weight:800;color:var(--blue);letter-spacing:.5px;font-variant-numeric:tabular-nums}
footer{border-top:3px solid var(--ink);margin-top:40px;padding:24px 0 60px;font-size:12.5px;display:flex;gap:20px;flex-wrap:wrap}
`;
const barsA = H.map((h, i) => {
  const n = h.steps.length;
  return `<div class="bar">${Array.from({ length: n }, (_, k) => `<i style="width:${k === 0 ? 44 : 26 + (i * 5) % 18}px"></i>`).join('')}<span>${esc(h.title.slice(0, 9))}</span></div>`;
}).join('');

const bodyA = `<div class="wrap">
<header class="top"><span class="logo">白嫖计</span><nav><a>赚钱作业</a><a>0 元方案</a><a>免费工具</a><a>English</a></nav></header>
<section class="hero">
  <div>
    <h1>别人卖你<em>月入过万</em>的课<br>我们免费给你作业</h1>
    <p>并且明说：<b>大多数人为什么失败</b>。${H.length} 份可以照抄的赚钱作业、${solutions.length} 套 0 元方案、${tools.length} 个真有免费额度的工具。</p>
    <span class="vow">不卖课 · 不承诺收入 · 全程 ¥0</span>
  </div>
  <div class="plot"><div class="cap">六条路 / 各几步</div>${barsA}</div>
</section>
<dl class="band">
  <div><dt>赚钱作业</dt><dd>${H.length}</dd></div>
  <div><dt>0 元方案</dt><dd>${solutions.length}</dd></div>
  <div><dt>免费工具</dt><dd>${tools.length}</dd></div>
  <div><dt>完全免费</dt><dd>${freeN}</dd></div>
</dl>
<h2 class="sec">赚钱作业 / 每份都写明怎么失败</h2>
<div class="works">${H.map((h) => `<article class="work">
  <div class="glyph">${Array.from({ length: h.steps.length }, () => '<i></i>').join('')}</div>
  <h3>${esc(h.title)}</h3>
  <p class="who">${esc(h.who)}</p>
  <p class="fail"><b>多数人为什么没做成</b>${esc(first(h.reality))}</p>
</article>`).join('')}</div>
<h2 class="sec">0 元方案 / 作业的执行零件</h2>
<div class="recipes">${P.map((s) => `<div class="rec">
  <span class="save">省 ${esc(s.saving || '一笔订阅费')}</span>
  <span class="pain">${esc(s.pain)}</span>
  <span class="steps">${Array.from({ length: s.steps.length }, () => '<i></i>').join('')}<span>${s.steps.length} 步 · ¥0</span></span>
</div>`).join('')}</div>
<h2 class="sec">免费工具 / 每条标核实日期</h2>
<div class="tools">${T.map((t) => `<div class="tool"><b>${esc(t.name)}</b><span>${esc(t.tagline)}</span><time>已核实 ${esc(t.last_verified)}</time></div>`).join('')}</div>
<footer><span>白嫖计 · ${esc(site.tagline)}</span><span>链接每日自动巡检</span><span>核实于 ${TODAY}</span></footer>
</div>`;

/* ══════════════════════════════════════════════════════════════════
   B · 现实参照 —— Anthropic / Claude 暖色出版物
   参照真实存在的获奖级设计（DBCo + Geist Studio，Styrene × Tiempos）。
   迁移逻辑：这个站的差异化是「说真话」，而暖色出版物的气质正是
   「一本平静的、有立场的册子」——恰好是割韭菜美学的解毒剂。
   骨架与 A 完全不同：无侧栏、无网格卡片墙，改为居中单栏阅读流，
   赚钱作业当作书里的编号章节，工具库压成一张密排索引表。
   字体：Tiempos/Styrene 未开源，降级为宋体系 × 系统无衬线，如实标注。
   ══════════════════════════════════════════════════════════════════ */
const cssB = `
:root{--paper:#F5F0E8;--ink:#191919;--clay:#CC785C;--clay-d:#B4593C;--rule:#DED6C8}
body{background:var(--paper);color:var(--ink);font:400 16px/1.75 system-ui,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.serif{font-family:"Songti SC","SimSun",Georgia,"Times New Roman",serif}
.col{max-width:720px;margin:0 auto;padding:0 28px}
.bar{border-bottom:1px solid var(--rule)}
.bar .col{display:flex;align-items:center;gap:18px;padding:20px 28px}
.bar b{font-family:"Songti SC","SimSun",serif;font-size:21px;letter-spacing:1px}
.bar nav{margin-left:auto;display:flex;gap:20px;font-size:13.5px;color:#6B6459}
.bar nav a:hover{color:var(--clay-d)}

.lede{padding:76px 0 8px}
.kicker{font-size:12px;letter-spacing:3px;color:var(--clay-d);font-weight:600;margin-bottom:20px}
.lede h1{font-family:"Songti SC","SimSun",Georgia,serif;font-size:clamp(32px,4.4vw,46px);line-height:1.32;letter-spacing:.5px;text-wrap:balance}
.lede .stand{margin-top:24px;font-size:17.5px;line-height:1.95;color:#3B372F}
.lede .stand em{font-style:normal;border-bottom:2px solid var(--clay);padding-bottom:1px}
.pledge{margin:30px 0 0;padding:18px 22px;background:#EFE7D9;border-left:3px solid var(--clay);font-size:14.5px;line-height:1.9}

.figs{display:flex;gap:44px;padding:34px 0;margin-top:34px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.figs dt{font-size:12.5px;color:#7A7264}
.figs dd{font-family:"Songti SC",serif;font-size:34px;line-height:1.25;font-variant-numeric:tabular-nums}
.figs div:first-child dd{color:var(--clay-d)}

h2.part{font-family:"Songti SC","SimSun",serif;font-size:26px;margin:56px 0 6px;letter-spacing:.5px}
p.part-note{font-size:14px;color:#7A7264;line-height:1.85;margin-bottom:22px}

/* 编号章节，像一本册子的目录展开 */
.chap{display:grid;grid-template-columns:44px 1fr;gap:20px;padding:24px 0;border-top:1px solid var(--rule)}
.chap:last-of-type{border-bottom:1px solid var(--rule)}
.chap .no{font-family:"Songti SC",serif;font-size:19px;color:var(--clay);padding-top:2px;font-variant-numeric:tabular-nums}
.chap h3{font-family:"Songti SC","SimSun",serif;font-size:21px;line-height:1.45}
.chap .who{font-size:14px;color:#5C564C;margin-top:7px;line-height:1.85}
.chap .fail{margin-top:12px;font-size:13.5px;line-height:1.85;color:#3B372F;background:#EFE7D9;padding:11px 15px;border-radius:2px}
.chap .fail b{color:var(--clay-d);font-weight:600;margin-right:7px}
.chap .meta{margin-top:10px;font-size:12px;color:#8A8274;display:flex;gap:14px}

.rlist{border-top:1px solid var(--rule)}
.rrow{display:flex;align-items:baseline;gap:16px;padding:13px 0;border-bottom:1px solid var(--rule);font-size:15px}
.rrow .p{flex:1}
.rrow .s{color:var(--clay-d);font-size:13px;white-space:nowrap}
.rrow .n{color:#8A8274;font-size:12.5px;white-space:nowrap;font-variant-numeric:tabular-nums}
.rrow:hover .p{color:var(--clay-d)}

/* 工具库压成索引表 */
.index{columns:2;column-gap:36px;margin-top:6px;padding-bottom:6px}
.ix{break-inside:avoid;display:flex;align-items:baseline;gap:10px;padding:7px 0;border-bottom:1px dotted var(--rule);font-size:14px}
.ix b{font-weight:600}
.ix span{color:#8A8274;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ix time{font-size:11.5px;color:#A79C88;font-variant-numeric:tabular-nums}
footer{margin-top:52px;padding:26px 0 64px;border-top:1px solid var(--rule);font-size:12.5px;color:#8A8274;line-height:2}
`;
const bodyB = `<div class="bar"><div class="col"><b>白嫖计</b><nav><a>赚钱作业</a><a>0 元方案</a><a>免费工具</a><a>English</a></nav></div></div>
<div class="col">
  <section class="lede">
    <p class="kicker">写给想用 AI 挣到第一笔钱的普通人</p>
    <h1>别人卖你「月入过万」的课，<br>我们免费给你作业。</h1>
    <p class="stand">并且明说：<em>大多数人为什么失败</em>。这个品类里，九成以上的所谓玩法是收割。所以我们把话反过来说——每一条路，先告诉你它怎么死，再告诉你它怎么走。</p>
    <p class="pledge">不卖课 · 不承诺任何收入数字 · 只用已核实免费额度的工具 · 全程 ¥0</p>
  </section>
  <dl class="figs">
    <div><dt>赚钱作业</dt><dd>${H.length}</dd></div>
    <div><dt>0 元方案</dt><dd>${solutions.length}</dd></div>
    <div><dt>免费工具</dt><dd>${tools.length}</dd></div>
    <div><dt>每日领额度</dt><dd>${dailyN}</dd></div>
  </dl>

  <h2 class="part">赚钱作业</h2>
  <p class="part-note">每一份都来自可核实的公开调研，不是从视频里转述的。分几步做、第一周能做完什么、多数人为什么没做成、这条路上的骗局长什么样，四件事都写清楚。</p>
  ${H.map((h, i) => `<article class="chap">
    <span class="no">${String(i + 1).padStart(2, '0')}</span>
    <div>
      <h3>${esc(h.title)}</h3>
      <p class="who">${esc(h.who)}</p>
      <p class="fail"><b>多数人为什么没做成</b>${esc(first(h.reality))}</p>
      <p class="meta"><span>${h.steps.length} 步</span><span>起步成本 ¥0</span><span>核实于 ${TODAY}</span></p>
    </div>
  </article>`).join('')}

  <h2 class="part">0 元方案</h2>
  <p class="part-note">作业里的每个环节，都有一套写好的免费做法。</p>
  <div class="rlist">${P.map((s) => `<div class="rrow"><span class="p">${esc(s.pain)}</span><span class="s">省 ${esc(s.saving || '一笔订阅费')}</span><span class="n">${s.steps.length} 步</span></div>`).join('')}</div>

  <h2 class="part">免费工具索引</h2>
  <p class="part-note">共 ${tools.length} 个，每条标注核实日期，链接每天自动巡检。</p>
  <div class="index">${T.map((t) => `<div class="ix"><b>${esc(t.name)}</b><span>${esc(t.tagline)}</span><time>${esc(t.last_verified)}</time></div>`).join('')}</div>

  <footer>白嫖计 · ${esc(site.tagline)}<br>本页所有免费额度均于 ${TODAY} 核实，链接每日自动巡检。</footer>
</div>`;

/* ══════════════════════════════════════════════════════════════════
   C · 最佳设计师 —— Massimo Vignelli / Vignelli Associates（Unigrid）
   为什么是他：这个站的灵魂是一本不骗人的账本——核实日期、省多少钱、
   几步做完、多少人失败。Vignelli 的 Unigrid（纽约地铁图、美国国家公园手册）
   正是「用一套严格网格承载大量事实、颜色只用来编码含义而非装饰」的最高范式。
   骨架与 A/B 都不同：左侧窄字导航（纯文字＋编号，零图标），右侧时刻表式密排网格。
   字体：Helvetica 一族一种字体多字重，不做字体混搭。
   ══════════════════════════════════════════════════════════════════ */
const cssC = `
:root{--ink:#111;--paper:#fff;--grey:#767676;--hair:#D6D6D6;
      --c-work:#D8232A;--c-plan:#005EB8;--c-tool:#007A53}
body{background:var(--paper);color:var(--ink);font:400 14px/1.55 "Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.shell{display:grid;grid-template-columns:196px 1fr;min-height:100vh}
.side{border-right:2px solid var(--ink);padding:22px 18px;position:sticky;top:0;align-self:start;height:100vh}
.side .mark{font-weight:700;font-size:19px;letter-spacing:-.4px;padding-bottom:14px;border-bottom:2px solid var(--ink)}
.side .mark i{display:block;font-style:normal;font-weight:400;font-size:10.5px;letter-spacing:1.5px;color:var(--grey);margin-top:5px}
.side ol{list-style:none;margin-top:16px}
.side li{display:flex;gap:9px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--hair)}
.side li b{color:var(--grey);font-weight:400;font-variant-numeric:tabular-nums;min-width:16px}
.side li:hover{color:var(--c-plan)}
.side .key{margin-top:18px;font-size:10.5px;line-height:2;color:var(--grey)}
.side .key span{display:flex;align-items:center;gap:7px}
.side .key i{width:11px;height:11px;display:block}

.main{padding:0 0 60px}
.masthead{border-bottom:2px solid var(--ink);padding:26px 30px 22px;display:grid;grid-template-columns:1fr 300px;gap:36px;align-items:end}
.masthead h1{font-weight:700;font-size:34px;line-height:1.18;letter-spacing:-1px}
.masthead h1 span{color:var(--c-work)}
.masthead p{font-size:13px;color:var(--grey);line-height:1.8;margin-top:10px;max-width:52ch}
.stat{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--hair);border:1px solid var(--hair)}
.stat div{background:#fff;padding:8px 10px}
.stat dt{font-size:10px;color:var(--grey);letter-spacing:.5px}
.stat dd{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2}

h2{font-size:11px;font-weight:700;letter-spacing:2px;padding:26px 30px 9px;display:flex;align-items:center;gap:9px}
h2 i{width:13px;height:13px;display:block}
h2 em{font-style:normal;font-weight:400;color:var(--grey);letter-spacing:0;margin-left:auto;font-size:11px}

/* 时刻表：一条一行，事实靠右对齐 */
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
thead th{font-size:10px;font-weight:400;color:var(--grey);text-align:left;letter-spacing:.5px;
  border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:5px 30px}
thead th+th{padding-left:0}
tbody td{border-bottom:1px solid var(--hair);padding:11px 12px 11px 0;vertical-align:top}
tbody td:first-child{padding-left:30px;width:34px;color:var(--grey);font-size:12px}
tbody tr:hover td{background:#F6F6F6}
.t-title{font-weight:700;font-size:15px;line-height:1.35}
.t-sub{color:var(--grey);font-size:12px;line-height:1.7;margin-top:3px;max-width:46ch}
.t-fail{font-size:12px;line-height:1.7;max-width:38ch}
.t-fail b{color:var(--c-work);font-weight:400;display:block;font-size:10px;letter-spacing:.5px;margin-bottom:2px}
td.num{text-align:right;padding-right:30px;white-space:nowrap;font-size:12.5px}
td.num b{font-size:15px;font-weight:700;display:block}
td.num span{color:var(--grey);font-size:11px}
.chip{display:inline-block;font-size:10px;padding:1px 6px;color:#fff;letter-spacing:.5px}
.grid-tools{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--ink)}
.gt{border-right:1px solid var(--hair);border-bottom:1px solid var(--hair);padding:12px 14px}
.gt:nth-child(4n){border-right:0}
.gt b{font-size:14px;display:block}
.gt span{font-size:11.5px;color:var(--grey);line-height:1.65;display:block;margin-top:3px}
.gt time{font-size:10.5px;color:var(--c-tool);margin-top:6px;display:block;font-variant-numeric:tabular-nums}
.foot{padding:20px 30px;border-top:2px solid var(--ink);margin-top:26px;font-size:11px;color:var(--grey);display:flex;gap:24px;flex-wrap:wrap}
`;
const bodyC = `<div class="shell">
<aside class="side">
  <div class="mark">白嫖计<i>BAIPIAOJI.COM</i></div>
  <ol>
    <li><b>01</b>赚钱作业</li><li><b>02</b>0 元方案</li><li><b>03</b>免费工具</li>
    <li><b>04</b>对话助手</li><li><b>05</b>编程开发</li><li><b>06</b>图像设计</li>
    <li><b>07</b>视频创作</li><li><b>08</b>办公效率</li><li><b>09</b>开发者 API</li>
  </ol>
  <div class="key">
    <span><i style="background:var(--c-work)"></i>作业 · 怎么挣</span>
    <span><i style="background:var(--c-plan)"></i>方案 · 怎么做</span>
    <span><i style="background:var(--c-tool)"></i>工具 · 用什么</span>
  </div>
</aside>
<main class="main">
  <div class="masthead">
    <div>
      <h1>别人卖你「月入过万」的课，<br><span>我们免费给你作业。</span></h1>
      <p>并且明说大多数人为什么失败。不卖课、不承诺任何收入数字、只用已核实免费额度的工具，全程 ¥0。</p>
    </div>
    <dl class="stat">
      <div><dt>作业</dt><dd>${H.length}</dd></div>
      <div><dt>方案</dt><dd>${solutions.length}</dd></div>
      <div><dt>工具</dt><dd>${tools.length}</dd></div>
      <div><dt>起步</dt><dd>¥0</dd></div>
    </dl>
  </div>

  <h2><i style="background:var(--c-work)"></i>01 赚钱作业<em>每份都写明怎么失败 · 核实于 ${TODAY}</em></h2>
  <table>
    <thead><tr><th></th><th>路径 / 适合谁</th><th>多数人为什么没做成</th><th style="text-align:right;padding-right:30px">步数 / 成本</th></tr></thead>
    <tbody>${H.map((h, i) => `<tr>
      <td>${String(i + 1).padStart(2, '0')}</td>
      <td><div class="t-title">${esc(h.title)}</div><div class="t-sub">${esc(h.who)}</div></td>
      <td><div class="t-fail"><b>失败原因</b>${esc(first(h.reality))}</div></td>
      <td class="num"><b>${h.steps.length} 步</b><span>¥0</span></td>
    </tr>`).join('')}</tbody>
  </table>

  <h2><i style="background:var(--c-plan)"></i>02 0 元方案<em>作业的执行零件</em></h2>
  <table>
    <thead><tr><th></th><th>痛点</th><th>场景</th><th style="text-align:right;padding-right:30px">省 / 步数</th></tr></thead>
    <tbody>${P.map((s, i) => `<tr>
      <td>${String(i + 1).padStart(2, '0')}</td>
      <td><div class="t-title">${esc(s.pain)}</div></td>
      <td><div class="t-sub">${esc(s.scene)}</div></td>
      <td class="num"><b>${esc(s.saving || '一笔订阅费')}</b><span>${s.steps.length} 步</span></td>
    </tr>`).join('')}</tbody>
  </table>

  <h2><i style="background:var(--c-tool)"></i>03 免费工具<em>共 ${tools.length} 个 · 完全免费 ${freeN} 个 · 链接每日巡检</em></h2>
  <div class="grid-tools">${T.map((t) => `<div class="gt"><b>${esc(t.name)}</b><span>${esc(t.tagline)}</span><time>已核实 ${esc(t.last_verified)}</time></div>`).join('')}</div>

  <div class="foot"><span>白嫖计 · ${esc(site.tagline)}</span><span>颜色只用于分类编码，不作装饰</span><span>核实于 ${TODAY}</span></div>
</main>
</div>`;

writeFileSync(join(out, 'A-轮盘-几何构成.html'), page('方向 A · 几何构成 — 白嫖计', cssA, bodyA));
writeFileSync(join(out, 'B-参照-暖色出版物.html'), page('方向 B · 暖色出版物 — 白嫖计', cssB, bodyB));
writeFileSync(join(out, 'C-设计师-Unigrid.html'), page('方向 C · Unigrid 时刻表 — 白嫖计', cssC, bodyC));
console.log('✅ 三版初稿已生成 → design-demos/（同一份真实内容，三套设计逻辑，骨架互异）');
