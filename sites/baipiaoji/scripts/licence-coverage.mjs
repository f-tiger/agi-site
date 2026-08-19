#!/usr/bin/env node
// 授权维度覆盖率：PRD-publish-check.md 的 Phase 0 验收指标。
//
// 「产出能不能商用」是本站选定的细分赛道，但实测发现弹药不足——
// 113 条已核实 limits 里只有 11 条明确写了商用授权。
// 覆盖率必须可测量，否则「补得差不多了」永远是个感觉。
//
// 判定标准（有意从严）：limits 文本里必须出现**关于商用/授权的明确表述**，
// 包括明确写「官方未说明」——「说不清楚」也是一种结论，空着才不是。
// 只提水印不算：水印是外观，授权是权利，这正是本赛道要拆开的那个混淆。
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tools = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));

// 产出会被交出去的类目：这四类的读者才会问「我能不能发」
const SCOPE = ['video', 'audio', 'image', 'design'];

// 商用/授权的明确表述。既认「可以/不可以」，也认「官方未说明」——后者同样是结论。
const LICENCE = /商用|商业用途|非商业|可商用|授权|版权|使用权|所有权|归属|commercial|licen[cs]|copyright|ownership/i;
// 明确的「官方没说」也算有结论
const EXPLICIT_UNKNOWN = /(商用|授权|版权|commercial|licen[cs])[^。.]{0,40}(未(公布|说明|明示)|没有说明|not stated|does not state|no.{0,10}statement)/i;

const rows = tools
  .filter((t) => SCOPE.includes(t.category) && t.limits)
  .map((t) => {
    const s = `${t.limits.quota || ''} ${t.limits.wall || ''}`;
    return { slug: t.slug, name: t.name, cat: t.category, ok: LICENCE.test(s) || EXPLICIT_UNKNOWN.test(s) };
  });

const byCat = {};
for (const r of rows) {
  byCat[r.cat] = byCat[r.cat] || { total: 0, ok: 0, todo: [] };
  byCat[r.cat].total++;
  if (r.ok) byCat[r.cat].ok++; else byCat[r.cat].todo.push(r.slug);
}

console.log('授权维度覆盖率（PRD-publish-check Phase 0 验收：≥ 80%）\n');
let T = 0, K = 0;
for (const c of SCOPE) {
  const v = byCat[c];
  if (!v) continue;
  T += v.total; K += v.ok;
  const pct = Math.round((v.ok / v.total) * 100);
  console.log(`  ${c.padEnd(7)} ${String(v.ok).padStart(2)}/${String(v.total).padEnd(2)} ${String(pct).padStart(3)}%${v.todo.length ? '   待补：' + v.todo.join(' ') : ''}`);
}
const pct = T ? Math.round((K / T) * 100) : 0;
console.log(`\n  合计    ${K}/${T} ${pct}%  ${pct >= 80 ? '✅ 达标' : `❌ 未达标，还差 ${Math.max(0, Math.ceil(T * 0.8) - K)} 个`}`);
process.exitCode = 0;   // 报告用，不阻塞构建
