#!/usr/bin/env node
// 回归护栏：防止「复核」把已核实的事实写没了。
//
// 今天两次事故（Suno、Continue）都是同一个动作导致的：写 limits 时没先读旧值，
// 整段覆盖，结果丢掉了之前核实过的事实。两次都靠人工发现——不可接受。
// 这个脚本把「先读旧值、只做增量」从口头规矩变成构建门禁：
// 与上一次提交比较，任何 limits 条目的 quota/wall 显著变短，或字段消失，就报错。
//
// 允许变短的正当情形（撤回失效数字，如 Perplexity）请在提交信息里说明，
// 并用 ALLOW_SHRINK=slug1,slug2 显式放行——放行是有意识的动作，不是默认行为。
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allow = new Set((process.env.ALLOW_SHRINK || '').split(',').map((s) => s.trim()).filter(Boolean));
const SHRINK_RATIO = 0.7;   // 短于原来的 70% 即视为可疑

const now = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));
let prev;
try {
  prev = JSON.parse(execSync('git show HEAD:data/tools.json', { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
} catch {
  console.log('回归护栏：无法读取上一版本（首次提交？），跳过。');
  process.exit(0);
}

const byPrev = new Map(prev.map((t) => [t.slug, t]));
const problems = [];

for (const t of now) {
  const p = byPrev.get(t.slug);
  if (!p?.limits) continue;              // 旧版没有 limits，新增不受限
  if (!t.limits) {
    problems.push(`${t.slug}：limits 整块消失（旧版有）`);
    continue;
  }
  if (allow.has(t.slug)) continue;
  for (const f of ['quota', 'wall']) {
    const before = String(p.limits[f] || '');
    const after = String(t.limits[f] || '');
    if (!before) continue;
    if (!after) { problems.push(`${t.slug}.${f}：字段被清空（旧值 ${before.length} 字）`); continue; }
    if (after.length < before.length * SHRINK_RATIO) {
      problems.push(`${t.slug}.${f}：从 ${before.length} 字缩到 ${after.length} 字（疑似覆盖式写入丢信息）`);
    }
  }
  for (const f of ['source', 'checked', 'cycle']) {
    if (p.limits[f] && !t.limits[f]) problems.push(`${t.slug}.${f}：字段消失（旧值「${p.limits[f]}」）`);
  }
}

if (problems.length) {
  console.error('❌ 回归护栏拦截：以下改动疑似把已核实的事实写没了\n');
  problems.forEach((x) => console.error('  ' + x));
  console.error(`\n复核的规矩是「先读旧值、只做增量」。若确属有意撤回（如官方已不再公布该数字），`);
  console.error(`请在提交信息里说明理由，并显式放行：ALLOW_SHRINK=${[...new Set(problems.map((x) => x.split(/[.．：]/)[0]))].join(',')} node scripts/guard-regression.mjs`);
  process.exit(1);
}
console.log(`✅ 回归护栏：${now.filter((t) => t.limits).length} 条 limits 无信息丢失`);
