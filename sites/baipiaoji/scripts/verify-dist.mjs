#!/usr/bin/env node
// 全量出厂检验：内链断裂 / JSON-LD 可解析 / EN 中文残留 / 占位符——四项全零才算通过。
// 每轮发布前运行；退出码非零表示不许提交。
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const root = 'dist';
const pages = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    const s = statSync(p);
    s.isDirectory() ? walk(p) : f.endsWith('.html') && pages.push(p);
  }
})(root);

// 语言切换按钮与专有应用名是刻意保留的中文，不算残留
const ZH_ALLOW = new Set(['中文', '国家反诈中心']);

let broken = 0, ldErr = 0, leak = 0, placeholder = 0, md = 0, contradiction = 0;
const exists = (href) => {
  let h = href.split('#')[0];
  if (!h) return true;
  if (h.startsWith('http') || h.startsWith('mailto')) return true;
  h = h.replace(/^\//, '');
  return [join(root, h), join(root, h, 'index.html'), join(root, h.replace(/\/$/, '') + '/index.html')]
    .some((c) => { try { statSync(c); return true; } catch { return false; } });
};

for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    if (m[1].startsWith('/') && !exists(m[1])) { console.log('BROKEN', p, m[1]); broken++; }
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { console.log('LD-ERR', p); ldErr++; }
  }
  if (/暂无|待补|TBD|TODO|undefined|\[object /.test(html)) { console.log('PLACEHOLDER', p); placeholder++; }
  // 数据里用 **…** 标重点，渲染时必须转成 <strong>。漏一处，星号就出现在页面和搜索摘要里——
  // 这个洞曾经在 43 个工具页上活了很久，加个门禁堵死。
  if (html.includes('**')) { console.log('RAW MARKDOWN', p); md++; }
  if (p.includes('/en/')) {
    const body = html.replace(/<script[\s\S]*?<\/script>/g, '');
    const zh = (body.match(/[一-鿿]{2,}/g) || []).filter((s) => !ZH_ALLOW.has(s));
    if (zh.length) { console.log('ZH-LEAK', p, [...new Set(zh)].slice(0, 4).join(' | ')); leak++; }
  }
}


// 一致性门禁：同一个工具不能既有已核实数字、又出现在「查无官方来源」的拒绝清单里。
// 这两处会同时渲染到站上（工具页给数字 / 拒绝页说查不到），互相打脸——
// 而「厂商自相矛盾」正是本站用来拒绝写数字的理由之一，自己犯同样的错就没有立场了。
// 实测确实发生过：siliconflow 早期因只有第三方口径被拒，后来核实到官方定价页补上了数字，
// 拒绝条目却没撤，两个说法在站上并存。靠人记不住，改成构建时拦。
{
  const tools = JSON.parse(readFileSync(join(repoRoot, 'data/tools.json'), 'utf8'));
  const nsPath = join(repoRoot, 'data/no-source.json');
  if (existsSync(nsPath)) {
    const ns = JSON.parse(readFileSync(nsPath, 'utf8')).items;
    const bySlug = new Map(tools.map((t) => [t.slug, t]));
    const conflict = ns.filter((x) => bySlug.get(x.slug)?.limits).map((x) => x.slug);
    const ghost = ns.filter((x) => !bySlug.has(x.slug)).map((x) => x.slug);
    if (conflict.length) {
      console.log('CONTRADICTION 同时有 limits 又在拒绝清单：' + conflict.join(', '));
      contradiction += conflict.length;
    }
    if (ghost.length) {
      console.log('GHOST 拒绝清单指向不存在的工具：' + ghost.join(', '));
      contradiction += ghost.length;
    }
  }
}

// 第七道门：英文侧机器可读资产的中文残留。
// zhLeak 只扫 HTML，而 agent 读的是 JSON——2026-08-12 就漏过一次：
// /en/directory.json 的 tags 一直是中文（用了原始标签而非本地化标签），
// 英文 agent 拿到中文标签等于拿不到，页面上却完全看不出来。
// 例外：source 字段按设计保留厂商官方页的原始中文名（那是出处，翻译反而失真）。
let jsonLeak = 0;
const EN_JSON = ['directory.json', 'limits.json', 'quotas.json', 'myths.json',
  'workflows.json', 'changes.json', 'no-source.json', 'insights.json', 'labeling.json'];
const SOURCE_KEYS = /"(source|official_source)"\s*:/;
for (const f of EN_JSON) {
  const p = join(root, 'en', f);
  if (!existsSync(p)) continue;
  const lines = readFileSync(p, 'utf8').split('\n');
  const bad = lines.filter((l) => /[一-鿿]{2,}/.test(l) && !SOURCE_KEYS.test(l));
  if (bad.length) {
    console.log(`EN JSON LEAK dist/en/${f}（${bad.length} 行含中文，示例：${bad[0].trim().slice(0, 80)}）`);
    jsonLeak += bad.length;
  }
}

// ── 第八道门：收录规模的数字不许写死 ──
// 「162 个 AI 工具」曾被写死在 9 处（.well-known/mcp.json、developers、mcp.html、hub、openapi），
// 目录扩到 218 之后全部变成假档案——而这几处正是目录站、注册表与 AI 引擎读走的登记信息。
// 被注册的前提是登记信息为真，所以这里对**产物**做检验：凡是「N 个工具 / N tools」形态的
// 规模声明，N 必须等于真实收录数或真实已核实数，写死一个旧数就过不了。
let staleCount = 0;
{
  const all = JSON.parse(readFileSync(join(repoRoot, 'data/tools.json'), 'utf8'));
  const nLim = all.filter((t) => t.limits).length;
  // 三个合法的规模数，全部派生自同一数据源：收录数、已核实数、及其差
  // （「其余 N 个工具追不到官方出处」——报告页在用，它和前两者一样每日重算）。
  const ok = new Set([all.length, nLim, all.length - nLim]);
  const RE = /(\d{2,5})\s*(?:个)?\s*(?:AI\s*)?(?:工具|-tool\b|tools\b|verified free tiers|条已核实)/g;
  const files = [...pages];
  for (const f of ['.well-known/mcp.json', 'openapi.json', 'llms.txt', 'llms-full.txt']) {
    if (existsSync(join(root, f))) files.push(join(root, f));
  }
  for (const p of files) {
    const txt = readFileSync(p, 'utf8');
    for (const m of txt.matchAll(RE)) {
      const n = Number(m[1]);
      if (n < 30 || ok.has(n)) continue;   // <30 是 MCP 工具数、每日配额一类的小数字，不在此门管辖
      console.log(`STALE COUNT ${p}：「${m[0]}」——真实收录 ${all.length} / 已核实 ${ok.size > 1 ? [...ok][1] : '?'}，规模数字必须从数据算`);
      staleCount++;
    }
  }
}

// 空壳页（2026-08-16 加）。起因：程序化派生的问题页第一版接错了字段，
// 生成了 72 个 answer 为空、表格 0 行的页面——**八道门禁全过**。
// 门禁此前只查「有没有错」，不查「有没有内容」，而空壳页对 AI 引用是负资产：
// 被抓一次就等于告诉引擎这个站有一堆没内容的 URL。
// 判据取最保守的一条：有 <h1> 但正文可见文本少于 400 字符即判空壳。
let hollow = 0;
for (const p of pages) {
  const txt = readFileSync(p, 'utf8');
  // 功能页豁免：404、提交表单、退订页天生就短，短是设计不是缺陷。
  // 豁免走白名单而不是调低阈值——调低阈值等于把这道门关掉。
  if (/(?:^|\/)(404|submit|unsubscribe)\.html$/.test(p)) continue;
  if (!/<h1[\s>]/.test(txt)) continue;
  const main = (txt.match(/<main[\s\S]*?<\/main>/) || [''])[0]
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (main.length < 400) {
    console.log(`HOLLOW ${p}：正文可见文本仅 ${main.length} 字符`);
    hollow++;
  }
}

// ── 第十道门：hreflang（2026-08-17 审计加，方法论：seo-hreflang 技能）──
// 起因：en 覆盖与 zh 原始数据不同步时（ante 只有 en limits；gptzero 中文 quota 低于
// 40 字符阈值而英文达标），英文侧生成了中文侧不存在的页，其 zh-Hans / x-default
// alternate 与语言切换链接全部指向 404；另外 404.html（noindex、单语）也在声明
// 不存在的 /en/404.html。生成侧已改为「资格以中文原始数据判 + noindex 不出 hreflang」，
// 这里对产物再验一遍，防回归：
//   ① 语言码只允许 zh-Hans / en / x-default（zh 裸码或 zh-CN 都算错——简体页按规范用 zh-Hans）
//   ② 每组恰好 1 个 x-default；自引用 href 必须逐字等于该页 canonical
//   ③ 每个 alternate 都必须解析到 dist 里真实存在的文件（不许声明不存在的语言版本）
//   ④ 双向回链：A 声明 B，B 必须声明 A（缺回链整组 hreflang 作废）
//   ⑤ noindex 页不许携带 hreflang（alternate 必须是可收录页）
let hreflangErr = 0;
{
  const sets = new Map();   // file -> { canon, tags:[{lang,href}] }
  const toFile = (href) => {
    let p = href.replace(/^https?:\/\/[^/]+/, '');
    if (p === '' || p === '/') p = '/index.html';
    if (p.endsWith('/')) p += 'index.html';
    return join(root, p.replace(/^\//, ''));
  };
  for (const p of pages) {
    const html = readFileSync(p, 'utf8');
    const tags = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)]
      .map((m) => ({ lang: m[1], href: m[2] }));
    const canon = (html.match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
    const noindex = /<meta name="robots" content="noindex/.test(html);
    if (noindex && tags.length) { console.log(`HREFLANG noindex 页不许有 hreflang：${p}`); hreflangErr++; continue; }
    if (!tags.length) continue;
    sets.set(p, { canon, tags });
  }
  for (const [p, { canon, tags }] of sets) {
    for (const { lang } of tags) {
      if (!['zh-Hans', 'en', 'x-default'].includes(lang)) { console.log(`HREFLANG 非法语言码 ${lang}：${p}`); hreflangErr++; }
    }
    if (tags.filter((t) => t.lang === 'x-default').length !== 1) { console.log(`HREFLANG x-default 数量≠1：${p}`); hreflangErr++; }
    if (canon && !tags.some((t) => t.href === canon)) { console.log(`HREFLANG 缺自引用（无 alternate 等于 canonical）：${p}`); hreflangErr++; }
    for (const { lang, href } of tags) {
      const tf = toFile(href);
      if (!existsSync(tf)) { console.log(`HREFLANG 死链 ${lang} -> ${href}：${p}`); hreflangErr++; continue; }
      if (lang === 'x-default' || tf === p) continue;
      const back = sets.get(tf);
      if (back && canon && !back.tags.some((t) => t.href === canon)) {
        console.log(`HREFLANG 缺回链：${p} 声明 ${href}，对方未声明回来`); hreflangErr++;
      }
    }
  }
}

console.log(`${pages.length} pages | broken=${broken} ldErr=${ldErr} zhLeak=${leak} placeholder=${placeholder} rawMd=${md} contradiction=${contradiction} enJson=${jsonLeak} staleCount=${staleCount} hollow=${hollow} hreflang=${hreflangErr}`);
process.exit(broken + ldErr + leak + placeholder + md + contradiction + jsonLeak + staleCount + hollow + hreflangErr ? 1 : 0);
