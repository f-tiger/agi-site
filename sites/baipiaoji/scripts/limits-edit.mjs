#!/usr/bin/env node
// 安全写入 limits：强制「先读旧值、只做增量」，不给覆盖的机会。
//
// 今天三次覆盖事故（Suno、Continue、豆包）都是同一个根因：
// 直接给 by[slug].limits 赋一个新对象，旧事实无声消失。
// 回归护栏只能拦住大幅缩水——豆包那次长度相近就漏过去了。
// 真正的修法是把「读旧值」从人的自觉变成程序的必经步骤：
//
//   node scripts/limits-edit.mjs <slug>            # 打印旧值（含英文覆盖），先看
//   node scripts/limits-edit.mjs <slug> --json <文件>   # 写入：新值必须包含旧值的全部要点
//
// 写入时逐字段比对：任何字段变短超过 15%，或 source/checked/cycle 消失，直接拒绝并打印差异，
// 除非显式 --allow-shrink（撤回失效数字等正当情形，需在提交信息说明）。
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [slug, flag, file] = process.argv.slice(2);
if (!slug) {
  console.error('用法：node scripts/limits-edit.mjs <slug> [--json <文件>] [--allow-shrink]');
  process.exit(2);
}

const toolsPath = join(root, 'data/tools.json');
const enPath = join(root, 'data/i18n/en.json');
const tools = JSON.parse(readFileSync(toolsPath, 'utf8'));
const en = JSON.parse(readFileSync(enPath, 'utf8'));
const t = tools.find((x) => x.slug === slug);
if (!t) { console.error(`找不到 slug：${slug}`); process.exit(2); }

const oldZh = t.limits || null;
const oldEn = en.tools?.[slug]?.limits || null;

if (flag !== '--json') {
  console.log(`【${slug}】${t.name}｜分类 ${t.category}`);
  console.log('\n— 现有中文 limits —');
  console.log(oldZh ? JSON.stringify(oldZh, null, 1) : '（无，属新增）');
  console.log('\n— 现有英文 limits —');
  console.log(oldEn ? JSON.stringify(oldEn, null, 1) : '（无）');
  console.log('\n写入时请把上面的事实全部保留，只做增量。');
  process.exit(0);
}

const payload = JSON.parse(readFileSync(file, 'utf8'));   // { zh: {...}, en: {...} }
const allowShrink = process.argv.includes('--allow-shrink');
const problems = [];
const check = (label, before, after) => {
  if (!before) return;
  for (const f of ['quota', 'wall']) {
    const b = String(before[f] || ''), a = String(after?.[f] || '');
    if (b && !a) problems.push(`${label}.${f}：字段被清空`);
    else if (b && a.length < b.length * 0.85) problems.push(`${label}.${f}：${b.length} → ${a.length} 字，疑似丢信息`);
  }
  for (const f of ['source', 'checked', 'cycle']) {
    if (before[f] && !after?.[f]) problems.push(`${label}.${f}：字段消失（旧值「${before[f]}」）`);
  }
  // paid 字段组（付费档位）与 limits 本体同规矩：有旧值就不许无声覆盖或缩水。
  if (before.paid) {
    if (!after?.paid) { problems.push(`${label}.paid：整组消失（旧值有付费档位事实）`); return; }
    for (const f of ['tiers', 'unit_cost', 'prev']) {
      const b = String(before.paid[f] || ''), a = String(after.paid[f] || '');
      if (b && !a) problems.push(`${label}.paid.${f}：字段被清空`);
      else if (b && a.length < b.length * 0.85) problems.push(`${label}.paid.${f}：${b.length} → ${a.length} 字，疑似丢信息`);
    }
    for (const f of ['source', 'checked', 'effective']) {
      if (before.paid[f] && !after.paid?.[f]) problems.push(`${label}.paid.${f}：字段消失（旧值「${before.paid[f]}」）`);
    }
  }
};
check('zh', oldZh, payload.zh);
check('en', oldEn, payload.en);

if (problems.length && !allowShrink) {
  console.error(`❌ 拒绝写入 ${slug}：新值疑似丢掉旧事实\n`);
  problems.forEach((p) => console.error('  ' + p));
  console.error('\n先运行 `node scripts/limits-edit.mjs ' + slug + '` 读旧值，把要点并进来；');
  console.error('若确属有意撤回，加 --allow-shrink 并在提交信息说明理由。');
  process.exit(1);
}

if (payload.zh) t.limits = payload.zh;
if (payload.en) {
  en.tools[slug] = en.tools[slug] || {};
  en.tools[slug].limits = payload.en;
}
writeFileSync(toolsPath, JSON.stringify(tools, null, 2) + '\n');
writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
console.log(`✅ ${slug} 已写入（${oldZh ? '复核更新' : '新增'}）｜当前 limits 总数：${tools.filter((x) => x.limits).length}`);
