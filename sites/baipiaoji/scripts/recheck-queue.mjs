#!/usr/bin/env node
// 复核队列：按 limits.checked 由旧到新排出该重新核实的条目。
//
// 为什么需要它：站点的承诺是「每条数字都有核实日期」，但日期只在核实当天有意义。
// 已有五起过时事故（qoder / codebuddy / marscode / devv / deepinfra）全靠偶然撞见，
// 而链接巡检只能保证网址活着、保证不了描述还对。这个队列把「该复核谁」变成确定性输出，
// 供每日循环取用；不做自动改写——数字必须人工/单轮逐条核实，这是硬规则。
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tools = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));
const today = new Date(process.env.TODAY || new Date().toISOString().slice(0, 10));
const days = (d) => Math.floor((today - new Date(d)) / 86400000);

const withLimits = tools.filter((t) => t.limits?.checked);
const queue = withLimits
  .map((t) => ({ slug: t.slug, name: t.name, cat: t.category, checked: t.limits.checked, age: days(t.limits.checked) }))
  .sort((a, b) => b.age - a.age);

const STALE = 30;   // 超过这个天数视为该复核
const stale = queue.filter((q) => q.age >= STALE);

console.log(`复核队列 / Recheck queue（${withLimits.length} 条已核实，阈值 ${STALE} 天）`);
console.log(`超期 ${stale.length} 条${stale.length ? '：' : '——全部在期内 ✅'}`);
for (const q of stale.slice(0, 15)) {
  console.log(`  ${q.age} 天  ${q.slug}（${q.cat}）  上次核实 ${q.checked}`);
}
if (!stale.length && queue.length) {
  console.log(`最旧的 3 条（尚未超期）：`);
  for (const q of queue.slice(0, 3)) console.log(`  ${q.age} 天  ${q.slug}  ${q.checked}`);
}

// 付费档位（limits.paid）的复核队列：价格比免费额度变得更勤（即梦一月三连涨、
// DeepSeek 公告到生效只隔 4 天），所以阈值更紧。/upgrade/ 页面的可信度整个压在这上面。
const PAID_STALE = 21;
const withPaid = tools.filter((t) => t.limits?.paid?.checked);
const paidQueue = withPaid
  .map((t) => ({ slug: t.slug, checked: t.limits.paid.checked, age: days(t.limits.paid.checked) }))
  .sort((a, b) => b.age - a.age);
const paidStale = paidQueue.filter((q) => q.age >= PAID_STALE);
console.log(`\n付费档位复核队列（${withPaid.length} 条，阈值 ${PAID_STALE} 天）`);
console.log(`超期 ${paidStale.length} 条${paidStale.length ? '：' : '——全部在期内 ✅'}`);
for (const q of paidStale.slice(0, 15)) {
  console.log(`  ${q.age} 天  ${q.slug}  上次核实 ${q.checked}`);
}
