#!/usr/bin/env node
// 额度变更记录：把「我们每天在盯」从一句承诺变成一份可核对的账。
//
// 起因是一次留存审计。订阅区写着「额度变了就说」，而这句话此刻是**空头支票**——
// 发信通道还没接上（没有邮件服务商账号），名单收了也触达不到。
// 更要命的是：站上没有任何**不需要留邮箱**的回访理由，人看完就走，一次性消耗。
//
// 这个脚本补的就是那条唯一没被外部账号卡住的路：把每次 limits 的变化记下来，
// 渲染成公开页面并进 RSS。三重作用——
//   1. 不注册的人也有回访理由（书签 / RSS）；
//   2. 让「我们真的在盯」变得可验证，订阅承诺才有可信度；
//   3. 等发信通道接上，这份日志本身就是信件内容，不用再造一遍。
//
// 只对 limits 的实质字段做哈希（quota/wall/source/checked）。不含 name、tagline 之类，
// 否则改个标题就记一条「额度变更」，日志立刻变成噪音、没人会再看第二次。
//
// 首次运行只建基线、不产出日志：否则第一天会凭空冒出 160 多条「新增」，
// 而它们其实是历史存量。日志从第二次运行起才是真的。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = new Date().toISOString().slice(0, 10);
const FILE = join(root, 'data/limits-history.json');

const tools = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));
const prev = existsSync(FILE)
  ? JSON.parse(readFileSync(FILE, 'utf8'))
  : { seeded: TODAY, hashes: {}, log: [] };

// paid 序列化成一个「虚拟字段」参与哈希：付费档位/单位成本/生效时间任何一处变动都算一次变更事件——
// 这正是「变价提醒」的数据源（PRD-upgrade-decisions）。只取实质字段，不含 checked（复核不算变价）。
const paidOf = (l) => l.paid ? [l.paid.tiers, l.paid.unit_cost, l.paid.effective].map((x) => x || '').join('|') : '';
const BASE_FIELDS = ['quota', 'wall', 'source', 'checked'];
const FIELDS = [...BASE_FIELDS, 'paid'];
const valOf = (l, f) => f === 'paid' ? paidOf(l) : (l[f] || '');
const hashOf = (l) => { const parts = BASE_FIELDS.map((f) => l[f] || ''); const p = paidOf(l); if (p) parts.push(p); return createHash('sha1').update(parts.join(String.fromCharCode(0))).digest('hex').slice(0, 16); };
const perField = (l) => Object.fromEntries(FIELDS.filter((f) => f !== 'paid' || paidOf(l)).map((f) => [f, createHash('sha1').update(String(valOf(l, f))).digest('hex').slice(0, 10)]));

const now = {};
const nowFields = {};
for (const t of tools) {
  if (!t.limits) continue;
  now[t.slug] = hashOf(t.limits);
  nowFields[t.slug] = perField(t.limits);
}

const first = !existsSync(FILE);
const added = [];

if (!first) {
  for (const slug of Object.keys(now)) {
    const before = prev.hashes[slug];
    if (before === now[slug]) continue;
    if (!before) {
      added.push({ d: TODAY, slug, k: 'new', f: [] });
      continue;
    }
    // 逐字段比对，好让页面能说清「变的是额度本身，还是只是又核实了一遍」——
    // 这两件事对读者的意义完全不同，混在一起等于没说。
    const bf = (prev.fields || {})[slug] || {};
    const changed = FIELDS.filter((f) => bf[f] !== nowFields[slug][f]);
    added.push({ d: TODAY, slug, k: 'changed', f: changed });
  }
  for (const slug of Object.keys(prev.hashes)) {
    if (!now[slug]) added.push({ d: TODAY, slug, k: 'gone', f: [] });
  }
}

// 日志上限 400 条：这是一个给人读的页面，不是数据仓库。更早的历史在 git 里。
const log = [...added, ...(prev.log || [])].slice(0, 400);

writeFileSync(FILE, `${JSON.stringify({
  seeded: prev.seeded || TODAY,
  updated: TODAY,
  hashes: now,
  fields: nowFields,
  log,
}, null, 0)}\n`);

if (first) {
  console.log(`📓 额度变更记录：首次运行，已为 ${Object.keys(now).length} 条建立基线（不产出日志，避免把存量当成变更）`);
} else if (!added.length) {
  console.log(`📓 额度变更记录：${Object.keys(now).length} 条 limits 无变化`);
} else {
  const n = added.filter((a) => a.k === 'new').length;
  const c = added.filter((a) => a.k === 'changed').length;
  const g = added.filter((a) => a.k === 'gone').length;
  console.log(`📓 额度变更记录：新增 ${n}、变更 ${c}、下架 ${g}（累计 ${log.length} 条）`);
}
