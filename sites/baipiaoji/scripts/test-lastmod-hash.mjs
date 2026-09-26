// Zero-network test for the page-change hash (scripts/lastmod-hash.mjs). Two directions, both must hold:
//   chrome that moves with any single edit elsewhere (rail counts, footer directory size, the subscribe box's "latest entry" line,
//   dates) must NOT change a page's hash — otherwise one new tool restamps all 1 700 pages and IndexNow re-pushes the whole site;
//   the page's own content (a quota number, a heading, a link) MUST change it — otherwise real edits never reach search engines.
// Uses a real built page when dist/ exists (the --dist mode CI runs after the build), else a fixture shaped like one.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { lmHashOf } from './lastmod-hash.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distPage = path.join(root, 'dist/vs/deepseek-vs-kimi.html');   // a page that carries all three kinds of chrome
const useDist = process.argv.includes('--dist');
const fixture = `<nav class="rail-jump">
    <a href="/agents/"><b>Agent 与 MCP</b><span>900+</span></a>
    <a href="/vs/"><b>两两对照</b><span>218</span></a>
  </nav>
  <nav class="rail-nav">
    <button class="rail-item is-on" data-cat="all">全部工具<span>219</span></button>
    <button class="rail-item" data-cat="coding">编程开发<span>28</span></button>
  </nav>
  <main><h1>Grok 免费额度</h1><p class="quota">每 2 小时 10 次</p><p>核实于 2026-09-21</p></main>
  <section class="sub sub-inline"><p class="sub-proof">这不是空话——最近一条记录：<b>ChatGPT</b> 的免费额度条目于 2026-08-07 有变更，<a href="/changes">逐条记在公开的变更日志里 →</a></p></section>
  <footer><p>白嫖计 · 不花冤枉钱，用上最好的 AI · 共收录 219 个真有免费额度的 AI 工具</p></footer>`;
const page = useDist ? fs.readFileSync(distPage, 'utf8') : fixture;
const h = lmHashOf(page);
let n = 0;
const same = (label, next) => { assert.ok(next !== page, `test setup: ${label} did not edit the page`); assert.ok(lmHashOf(next) === h, `chrome must not change the hash: ${label}`); n++; };
const differs = (label, next) => { assert.ok(next !== page, `test setup: ${label} did not edit the page`); assert.ok(lmHashOf(next) !== h, `content must change the hash: ${label}`); n++; };

same('rail category count', page.replace(/(data-cat="all">[^<]*<span>)\d+/, (m, a) => a + '999'));
same('rail section count', page.replace(/(<nav class="rail-jump">[\s\S]*?<span>)(\d+)(<\/span>)/, (m, a, d, c) => a + (Number(d) + 4) + c));
same('footer directory size', page.replace(/(共收录|Listing) \d+ /, '$1 888 '));
// The account CTA replaced subscription proof. Keep the historical normalizer contract using its fixture.
assert.equal(lmHashOf(fixture),lmHashOf(fixture.replace(/<p class="sub-proof">[\s\S]*?<\/p>/,'<p class="sub-proof">Changed legacy proof</p>')));n++;
assert.equal(lmHashOf(page+'<script src="/account.js?v=old"></script>'),lmHashOf(page+'<script src="/account.js?v=new"></script>'));n++;
same('a date anywhere', page.replace(/\d{4}-\d{2}-\d{2}/, '2031-01-01'));
differs('a quota sentence in the answer', page.replace(/<p class="(answer|quota)">/, '<p class="$1">每天 7 次。'));
differs('only a number in the body changes (not a date)', page.replace(/(<(?:p|td|li|b|strong)[^>]*>[^<]*?)(?<![\d.-])(\d+)(?![\d.:-])/, (m, a, d) => a + (Number(d) + 1)));
differs('a heading', page.replace(/<h1>/, '<h1>X '));
differs('a count outside the rail (page body)', page.replace(/<\/main>/, '<p>共 219 个</p></main>'));
console.log(`✅ test-lastmod-hash: ${n} checks — rail counts, footer size, the latest-entry line and dates leave the hash alone; content edits change it${useDist ? ' (real dist page)' : ' (fixture)'}`);
