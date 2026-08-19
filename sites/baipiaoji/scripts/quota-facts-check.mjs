#!/usr/bin/env node
// 结构化「零新增事实」的机器强制检查。
//
// data/<cat>-quotas.json 是已核实散文的机器可读形态，规矩是**一个数字都不许新增**——
// 结构化时顺手把「约 7 分钟」写成「7.5 分钟」，或者把官方没给的折算自己算出来，
// 都不会被任何现有门禁拦住：那些数字长得跟真的一模一样。而这正是本站唯一护城河的破口。
//
// 所以这里做一件很笨但很硬的事：把 quotas 文件里出现的每一个数字，
// 拿去对应工具的**已核实 limits 散文**里找。找不到就报出来，人来解释。
//
//   node scripts/quota-facts-check.mjs            # 全查
//   node scripts/quota-facts-check.mjs audio      # 只查一类
//
// 允许的例外写在 ALLOW 里，每条必须写清理由——例外要显眼、要少、要有人签字。
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tools = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(root, 'data/i18n/en.json'), 'utf8'));
const bySlug = new Map(tools.map((t) => [t.slug, t]));

// 曾经无条件放行 0–5，理由是「散文里常写成中文数字」。那是个洞：
// 小整数恰恰是最容易被凭空写出来的那一类（「每天 3 条视频」「每次 2 张图」），
// 而这道门的全部意义就在拦这个。正确做法不是放行，是把中文数字也当成等价形式去比对——
// 见 cnForms 里的 ZH_DIGIT。ALLOW 只留真正与事实无关的结构性数字。
const ALLOW = new Set([]);

const cats = process.argv[2] ? [process.argv[2]] : ['api', 'video', 'coding', 'chat', 'image', 'audio', 'design', 'office', 'writing', 'search'];
// 只去千分位逗号（后面必须正好跟三位数字），不能无差别去逗号——
// 那会把 JSON 里相邻的两个数 40,80 并成 4080，凭空造出一个不存在的数字来报错。
const norm = (s) => String(s).replace(/(?<=\d)[,，](?=\d{3}(?!\d))/g, '');
// 中文散文常写「100 万 tokens」「2000 万」，与结构化字段里的 1000000 是同一个事实。
// 找不到时再按万/亿换算试一次，避免把语言差异误判成新增事实。
// 单位换算不是新增事实：散文写「128K tokens」「两周」「100 万」，结构化字段写
// 128000 / 14 / 1000000，说的是同一件事。这里把这几类等价形式一并试掉，
// 只留下真正凭空出现的数字——否则告警噪音会让人开始无视这道检查，那比没有检查更糟。
const CN_NUM = { 1: ['一', '1'], 2: ['两', '二', '2'], 3: ['三', '3'], 4: ['四', '4'] };
// 中文数字写法：散文写「每次出两条」，结构化字段写 2——同一个事实。
// 只覆盖 0–10 与整十，再大的数散文里也会用阿拉伯数字。
const ZH_DIGIT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const cnForms = (n) => {
  const v = Number(n), out = [];
  if (!Number.isFinite(v)) return out;
  if (v % 10000 === 0) out.push(String(v / 10000) + '万');
  if (v % 100000000 === 0) out.push(String(v / 100000000) + '亿');
  if (v % 1000 === 0) out.push(String(v / 1000) + 'K', String(v / 1000) + 'k');
  if (Number.isInteger(v) && v >= 0 && v <= 10) {
    out.push(ZH_DIGIT[v]);
    if (v === 2) out.push('两');
  }
  if (Number.isInteger(v) && v > 10 && v < 100 && v % 10 === 0) out.push(ZH_DIGIT[v / 10] + '十');
  if (v % 7 === 0 && CN_NUM[v / 7]) {
    for (const c of CN_NUM[v / 7]) out.push(c + '周');
    out.push(String(v / 7) + 'week', String(v / 7) + 'weeks');
    if (v / 7 === 2) out.push('two-week', 'twoweeks');
  }
  return out;
};
const flat = (s) => s.replace(/[\s-]+/g, '').toLowerCase();
const seen = (src, n) => src.includes(n) || cnForms(n).some((f) => flat(src).includes(flat(f)));
const numsIn = (s) => [...norm(s).matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]);

let bad = 0, checked = 0;
for (const cat of cats) {
  const p = join(root, `data/${cat}-quotas.json`);
  if (!existsSync(p)) continue;
  const { entries } = JSON.parse(readFileSync(p, 'utf8'));
  for (const e of entries || []) {
    const t = bySlug.get(e.slug);
    if (!t || !t.limits) { console.log(`⚠ ${cat}/${e.slug}：没有已核实 limits，结构化条目无所依据`); bad++; continue; }
    const srcZh = norm(`${t.limits.quota || ''} ${t.limits.wall || ''} ${t.limits.source || ''}`);
    const eL = en.tools?.[e.slug]?.limits || {};
    const srcEn = norm(`${eL.quota || ''} ${eL.wall || ''} ${eL.source || ''}`);
    // 字段级来源指向（2026-08-18 加）：默认只比免费档散文（quota/wall/source）——这是对的，
    // 免费额度文件不该被付费页的数字喂饱。但确有一类合法情况：厂商把免费档的换算口径
    // 写在付费单价里（Kling 的「5 秒标准 720p 20 灵感值」就是这样，而它的免费档换算
    // 「66≈6 条」是旧模型口径，两者算出来差一倍）。这种时候不放宽门禁，而是要求条目
    // **显式声明**它多引了哪个已核实字段：_src_extra: ["paid.unit_cost"]。
    // 结果是来源变得可机读、可审计，而不是悄悄扩大语料。
    const pick = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
    const extra = (Array.isArray(e._src_extra) ? e._src_extra : [])
      .map((path) => `${pick(t.limits, path) || ''} ${pick(eL, path) || ''}`).join(' ');
    const both = norm(`${srcZh} ${srcEn} ${extra}`);

    // 数值字段与中文注意栏比中文散文；英文注意栏比英文散文（英文散文缺失时退回两者合并）
    const buckets = [
      ['数值字段', JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !/^(caveat|slug|meter|kind|commercial|_src_extra|why_)/.test(k)))), both],
      ['caveat_zh', e.caveat_zh || '', extra ? `${srcZh} ${extra}` : (srcZh || both)],
      ['caveat_en', e.caveat_en || '', extra ? `${srcEn} ${extra}` : (srcEn || both)],
    ];
    for (const [label, text, src] of buckets) {
      if (!text) continue;
      checked++;
      const miss = [...new Set(numsIn(text))].filter((n) => !ALLOW.has(n) && !seen(src, n));
      if (miss.length) {
        console.log(`❌ ${cat}/${e.slug} ${label}：散文里找不到这些数字 → ${miss.join(', ')}`);
        bad++;
      }
    }
  }
}
console.log(`quota-facts: 检查 ${checked} 组，问题 ${bad} 处`);
process.exit(bad ? 1 : 0);
