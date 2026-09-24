#!/usr/bin/env node
// /work-plan 的零网络闸门（2026-09-24）。默认模式查数据与计算；--dist 查构建产物。
//
// 为什么要有它：这个页面唯一的价值是「数字对」。三类会悄悄坏掉的东西在这里各有一条能红的断言：
//   ① 配额文件改了字段名 → 某条容量规则读不出数 → 页面把「官方有数字」的工具显示成「未公布」；
//   ② 有人往 work-roles.json 里手写了一个额度数字 → 数字脱离了带核实日期的来源；
//   ③ 加总逻辑改错 → 「够用 / 不够」判反。计算函数就是页面里嵌的那一个（fitTask.toString()），测到的即是跑的。
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPACITY, PRODUCT_ID, loadQuotas, capacityOf, planData, fitTask } from './work-plan.mjs';
import { EVENTS } from '../functions/api/hit.js';
import { externalProducts } from '../../../tools/revenue-studio/catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
let fails = 0;
const ck = (ok, msg) => { if (!ok) { console.log('❌ ' + msg); fails++; } };

const roles = J('data/work-roles.json');
const tools = J('data/tools.json');
const sols = J('data/solutions.json');
const licence = J('data/licence.json');
const quotas = loadQuotas(root);
const en = J('data/i18n/en.json');

// ── 1. work-roles.json 的形状：只允许编辑字段，额度数字不许进来 ──
ck(JSON.stringify(Object.keys(roles).sort()) === JSON.stringify(['note', 'roles', 'tasks', 'units', 'version']), 'work-roles.json: unexpected top-level keys');
const TASK_KEYS = new Set(['zh', 'en', 'unit', 'per', 'example', 'measure_zh', 'measure_en']);
const solBySlug = new Map(sols.map((s) => [s.slug, s]));
for (const [slug, t] of Object.entries(roles.tasks)) {
  for (const k of Object.keys(t)) ck(TASK_KEYS.has(k), `task ${slug}: key "${k}" is not an editorial field — free-tier figures come from the quota files only`);
  ck(solBySlug.has(slug), `task ${slug}: no such plan in solutions.json`);
  ck(roles.units[t.unit], `task ${slug}: unit ${t.unit} not in units`);
  ck(t.per === 'day' || t.per === 'week', `task ${slug}: per must be day|week`);
  ck(Number.isFinite(t.example) && t.example > 0, `task ${slug}: example volume must be a positive number`);
  ck(t.zh && t.en && !/[一-鿿]/.test(t.en) && !/[一-鿿]/.test(t.measure_en || ''), `task ${slug}: needs zh + en label, en without CJK`);
}
for (const [u, v] of Object.entries(roles.units)) ck(v.zh && v.en && !/[一-鿿]/.test(v.en), `unit ${u}: zh + en, en without CJK`);
const ids = new Set();
for (const r of roles.roles) {
  ck(JSON.stringify(Object.keys(r).sort()) === JSON.stringify(['en', 'id', 'tasks', 'zh']), `role ${r.id}: unexpected keys`);
  ck(!ids.has(r.id), `role ${r.id}: duplicate id`); ids.add(r.id);
  ck(!/[一-鿿]/.test(r.en), `role ${r.id}: en name has CJK`);
  ck(r.tasks.length >= 3, `role ${r.id}: fewer than 3 tasks`);
  for (const s of r.tasks) ck(roles.tasks[s], `role ${r.id}: task ${s} not defined`);
}

// ── 2. 每条容量规则今天都能从配额文件读出数，且确实被某个任务用到 ──
const stepTools = (slug) => (solBySlug.get(slug)?.steps || []).map((x) => x.tool);
for (const rule of CAPACITY) {
  const e = quotas.get(rule.slug);
  ck(!!e, `capacity ${rule.slug}: no quota entry`);
  if (!e) continue;
  const n = rule.read(e);
  ck(Number.isFinite(n) && n >= 0, `capacity ${rule.slug}.${rule.field}: read ${n} — the quota file changed shape; fix the rule, do not type the number in`);
  ck(rule.per !== 'unlimited' ? n > 0 : true, `capacity ${rule.slug}: a zero capacity is only valid for unlimited kinds`);
  const users = Object.entries(roles.tasks).filter(([s, t]) => t.unit === rule.unit && stepTools(s).includes(rule.slug));
  ck(users.length > 0, `capacity ${rule.slug}/${rule.unit}: no task with that unit uses this tool — dead rule`);
}
// 保守取值：可灵用官方付费单价折算，不能高于官方自述的旧口径
{
  const e = quotas.get('kling'), c = capacityOf('kling', 'clip', quotas, true);
  ck(c && c.n === Math.floor(e.per_day / e.alt_rate.credits_per_clip) && c.n <= e.conversion[0].clips, 'kling: capacity must be the conservative per-clip conversion');
  const g = quotas.get('github-models'), gc = capacityOf('github-models', 'request', quotas, true);
  ck(gc && gc.n === Math.min(g.requests_per_day_high, g.requests_per_day_low), 'github-models: capacity must be the lower of the two tiers');
  ck(capacityOf('jimeng', 'clip', quotas, true) === null, 'a rule must not answer for a unit it was not written for');
}

// ── 3. planData 两种语言都能建，数字等于规则读数 ──
const toolsZh = new Map(tools.map((t) => [t.slug, { ...t, _tags: t.tags || [] }]));
const toolsEn = new Map(tools.map((t) => [t.slug, { ...t, ...(en.tools?.[t.slug] || {}), _tags: t.tags || [] }]));
const solsEn = new Map(sols.map((s) => { const o = en.solutions?.[s.slug]; return [s.slug, o ? { ...s, ...o, steps: s.steps.map((st, i) => ({ ...st, action: o.steps?.[i] ?? st.action })) } : s]; }));
const Dz = planData({ roles, solutions: solBySlug, toolsBySlug: toolsZh, quotas, licence, zh: true });
const De = planData({ roles, solutions: solsEn, toolsBySlug: toolsEn, quotas, licence, zh: false });
ck(Dz.roles.length === roles.roles.length && De.roles.length === roles.roles.length, 'planData: role count');
for (const D of [Dz, De]) for (const t of Object.values(D.tasks)) for (const s of t.steps) {
  if (!s.cap) continue;
  const rule = CAPACITY.find((r) => r.slug === s.tool && r.unit === t.unit);
  ck(rule && s.cap.n === rule.read(quotas.get(s.tool)), `planData ${t.slug}/${s.tool}: capacity differs from the quota file`);
  ck(/-quotas\.json#/.test(s.cap.src), `planData ${t.slug}/${s.tool}: capacity carries no source pointer`);
}
ck(Object.values(De.tasks).every((t) => !/[一-鿿]/.test(t.label)), 'en planData: task labels contain CJK');
ck(Object.values(Dz.tasks).every((t) => t.steps.every((s) => !s.action.includes('**'))), 'planData: raw **markdown** leaked into step text');

// ── 4. 计算：够 / 不够 / 未公布 / 约束排除 / 一次性 / 不限，逐条 ──
{
  const st = (cap, cn = 1, biz = 'yes') => ({ cap, cn, biz });
  const T = { per: 'week', steps: [st({ n: 10, per: 'day' }), st({ n: 30, per: 'month' }, 0, 'no'), st(null)] };
  const a = fitTask(T, 50, false, false);
  ck(Math.abs(a.rec - 77) < 1e-9 && a.status === 'ok', `fit: 10/day + 30/month = 77/week covers 50 (got ${a.rec}, ${a.status})`);
  ck(fitTask({ per: 'week', steps: T.steps.slice(0, 2) }, 100, false, false).status === 'short', 'fit: 77/week does not cover 100 (no unpublished tool left to hope on)');
  ck(fitTask(T, 100, false, false).status === 'partial', 'fit: 77/week vs 100 with an unpublished tool in the plan is partial');
  const c = fitTask(T, 50, true, false);
  ck(Math.abs(c.rec - 70) < 1e-9 && c.excluded.length === 1 && c.excluded[0].why === 'cn', 'fit: China-only drops the VPN tool');
  const b = fitTask(T, 50, false, true);
  ck(b.excluded.some((x) => x.i === 1 && x.why === 'biz'), 'fit: commercial use drops the no-commercial tool');
  ck(fitTask({ per: 'day', steps: [st({ n: 100, per: 'day' })] }, 20, false, false).need === 140, 'fit: per-day volume becomes per-week need');
  ck(fitTask({ per: 'week', steps: [st(null), st(null)] }, 5, false, false).status === 'unknown', 'fit: no published figure means unknown, not short');
  ck(fitTask({ per: 'week', steps: [st({ n: 0, per: 'unlimited' })] }, 1e6, false, false).status === 'ok', 'fit: an unlimited tool covers any volume');
  const o = fitTask({ per: 'week', steps: [st({ n: 1000, per: 'once' })] }, 100, false, false);
  ck(o.status === 'short' && o.once.length === 1 && o.rec === 0, 'fit: a one-off grant is reported separately, never counted as weekly capacity');
  const pT = { per: 'week', steps: [st({ n: 1, per: 'day' }), st(null)] };
  ck(fitTask(pT, 100, false, false).status === 'partial', 'fit: short on published figures but another tool publishes none = partial, never "short"');
  ck(fitTask({ per: 'week', steps: [st({ n: 1, per: 'day' }), st(null, 0)] }, 100, true, false).status === 'short', 'fit: once the no-figure tool is excluded by a constraint, short is short');
  // 真实数据上跑一遍：一个只要 1 张图 / 周的插画任务必须够用
  ck(fitTask(Dz.tasks['free-illustration'], 1, false, false).status === 'ok', 'fit on real data: 1 image a week must be covered');
  // 流水线工序不进加总：商品图方案里没有一个「产出商品图」的工具有官方数字（Upscayl 只放大）
  ck(Dz.tasks['free-ecommerce-image'].steps.every((s) => !s.cap), 'product photos: an upscaler or cut-out tool must not count as product-photo capacity');
}

// ── 5. 会员保存：产品 id 与会员目录一致；事件名在信标白名单里 ──
{
  const ext = externalProducts.find((p) => p.id === PRODUCT_ID);
  ck(ext && ext.site === 'bpj' && ext.urls.zh === 'https://baipiaoji.com/work-plan' && ext.urls.en === 'https://baipiaoji.com/en/work-plan', 'catalog externalProducts must list ai-work-plan with the canonical zh/en URLs (the member page restores to them)');
  const src = readFileSync(join(root, 'scripts/work-plan.mjs'), 'utf8');
  const emitted = new Set([...src.matchAll(/EV\('([a-z_]+)'/g)].map((m) => m[1]));
  ck(emitted.size > 0, 'no EV() call found — the page would be unmeasured');
  for (const e of emitted) ck(EVENTS.has(e), `hit.js EVENTS lacks '${e}' — dropped at the edge`);
}

// ── 6. --dist：产物 ──
if (process.argv.includes('--dist')) {
  const dist = join(root, 'dist');
  for (const [p, zh] of [['work-plan.html', true], ['en/work-plan.html', false]]) {
    ck(existsSync(join(dist, p)), `${p} missing — run npm run build first`);
    if (!existsSync(join(dist, p))) continue;
    const s = readFileSync(join(dist, p), 'utf8');
    ck(s.includes('id="planner"') && s.includes('id="wpGo"'), `${p}: planner UI missing`);
    ck((s.match(/class="wp-role"/g) || []).length === roles.roles.length, `${p}: static role tables must cover every role (readable without JS)`);
    const lds = [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const flat = lds.flatMap((x) => (Array.isArray(x) ? x : x['@graph'] || [x]));
    const faq = flat.find((x) => x['@type'] === 'FAQPage');
    ck(flat.some((x) => x['@type'] === 'WebApplication' && x.isAccessibleForFree === true), `${p}: WebApplication JSON-LD missing`);
    const vis = [...s.matchAll(/<details><summary>([^<]*)<\/summary>/g)].map((m) => m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
    ck(faq && faq.mainEntity.length === 5 && faq.mainEntity.every((q) => vis.includes(q.name)), `${p}: visible FAQ and FAQPage JSON-LD differ`);
    const m = s.match(/var D=(\{[\s\S]*?\});\n/);
    let D = null; try { D = JSON.parse(m[1]); } catch {}
    ck(D && D.roles.length === roles.roles.length && Object.keys(D.tasks).length === Object.keys(roles.tasks).length, `${p}: embedded plan data missing or incomplete`);
    const code = s.match(/<script>\n\(function\(\)\{\n  var ZH=[\s\S]*?\n\}\)\(\);\n<\/script>/);
    ck(!!code, `${p}: planner script block not found`);
    if (code) { try { new Function(code[0].replace(/^<script>|<\/script>$/g, '')); } catch (e) { ck(false, `${p}: planner script does not parse: ${e.message}`); } }
    ck(s.includes(`PID="${PRODUCT_ID}"`) || s.includes(`PID=${JSON.stringify(PRODUCT_ID)}`), `${p}: save product id missing`);
    ck(s.includes('hreflang="en" href="https://baipiaoji.com/en/work-plan"') && s.includes('hreflang="zh-Hans" href="https://baipiaoji.com/work-plan"'), `${p}: zh/en hreflang pair missing`);
    ck(!/\/solutions\/free-/.test(s), `${p}: links to /solutions/<plan> — plan pages live under /plans/`);
    ck(zh || !/[一-鿿]{4,}/.test(s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<a [^>]*>[^<]*<\/a>/g, '')), `${p}: English page carries Chinese prose outside tool names`);
  }
  const sm = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  ck(sm.includes('https://baipiaoji.com/work-plan') && sm.includes('https://baipiaoji.com/en/work-plan'), 'sitemap lacks the work-plan pages');
}

if (fails) { console.log(`\n${fails} failure(s)`); process.exit(1); }
console.log(`✅ test-work-plan: ${roles.roles.length} roles, ${Object.keys(roles.tasks).length} tasks, ${CAPACITY.length} capacity rules read from the quota files, fit arithmetic (covered/short/partial/unknown/excluded/once/unlimited), member product id and events${process.argv.includes('--dist') ? ', built pages (static tables, FAQ = JSON-LD, data, script parses, hreflang, sitemap)' : ''}`);
