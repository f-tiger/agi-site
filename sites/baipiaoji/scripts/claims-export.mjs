#!/usr/bin/env node
// 每日认领导出（2026-09-26）：把 /api/claim?export=1 落进 data/claims.json，
// 构建期据此在工具页上标「厂商已认领（域名验证 <日期>）」，limits-edit 会话据此读排队的厂商更正。
//
//   node scripts/claims-export.mjs              # 取数并写 data/claims.json（取不到 = 保留旧文件 + 警告）
//   node scripts/claims-export.mjs --selftest   # 用内置夹具跑形状检查，零网络
//
// 只搬运，不判断：认领是否有效由 Worker 现场核验决定，更正是否上站由 limits-edit 两步决定。
// 与 reach-export 同一原则：这里一个事实都不写。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data/claims.json');
const SELFTEST = process.argv.includes('--selftest');
const ORIGIN = process.env.CLAIMS_ORIGIN || 'https://baipiaoji.com';

// 落库前的形状门：只留白名单字段，任何多出来的键（将来有人往表里加了列）都不会悄悄进公开仓。
const CLAIM_KEYS = ['slug', 'host', 'method', 'verified_at', 'last_seen'];
const ATT_KEYS = ['id', 'slug', 'field', 'value', 'official_url', 'note', 'created', 'status'];
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k] ?? '']));

export function shape(api) {
  const claims = (api.claims || []).map((c) => pick(c, CLAIM_KEYS)).filter((c) => c.slug && c.verified_at);
  const attestations = (api.attestations || []).map((a) => pick(a, ATT_KEYS)).filter((a) => a.slug && a.field);
  // 邮箱永不落仓：Worker 已抹，这里再拦一道
  for (const a of attestations) a.note = String(a.note).replace(/[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}/gi, '[email]');
  return {
    generated: (api.generated || new Date().toISOString()).slice(0, 10),
    source: '/api/claim?export=1',
    definition: api.definition || '',
    counts: { claims_verified: claims.length, attestations_queued: attestations.filter((a) => a.status === 'queued').length },
    claims, attestations,
  };
}

if (SELFTEST) {
  const out = shape({ generated: '2026-09-26T01:02:03Z', claims: [
    { slug: 'kimi', host: 'kimi.moonshot.cn', method: 'well-known', verified_at: '2026-09-26T00:00:00Z', last_seen: '2026-09-26T00:00:00Z', email: 'leak@x.io' },
    { slug: 'bad', host: 'x', method: '', verified_at: '', last_seen: '' },
  ], attestations: [
    { id: 1, slug: 'kimi', field: 'quota', value: 'v', official_url: 'https://kimi.moonshot.cn/p', note: 'mail me a@b.co', created: '2026-09-26', status: 'queued', ip: '1.2.3.4' },
  ] });
  const assert = (c, m) => { if (!c) { console.error('❌ selftest:', m); process.exit(1); } };
  assert(out.claims.length === 1 && !('email' in out.claims[0]), '白名单外的字段必须被丢掉、未验证的行必须被丢掉');
  assert(!('ip' in out.attestations[0]) && out.attestations[0].note === 'mail me [email]', '更正行同样只留白名单字段且邮箱抹除');
  assert(out.counts.claims_verified === 1 && out.counts.attestations_queued === 1, '计数');
  assert(out.generated === '2026-09-26', 'generated 只留日期');
  console.log('✅ claims-export selftest 通过（字段白名单、邮箱抹除、计数）');
  process.exit(0);
}

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 30000);
try {
  const res = await fetch(`${ORIGIN}/api/claim?export=1`, { signal: controller.signal, headers: { 'User-Agent': 'curl/8.0 bpj-ci-claims' } });
  const api = await res.json();
  if (!res.ok || !api.ok) throw new Error(`HTTP ${res.status} ${api.code || ''}`);
  const out = shape(api);
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`✅ claims.json 已写：已验证认领 ${out.counts.claims_verified}、排队更正 ${out.counts.attestations_queued}`);
} catch (e) {
  const had = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).generated : '（无旧文件）';
  console.log(`::warning::claims 取数失败（${String(e.message || e).slice(0, 120)}）——沿用旧 claims.json ${had}`);
} finally {
  clearTimeout(timer);
}
