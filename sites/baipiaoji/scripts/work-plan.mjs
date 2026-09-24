// /work-plan — 「按你的岗位，算一套 AI 方案」（2026-09-24，owner：「根据自己的实际工作…自动化计算，然后推荐 ai 的一整套解决方案…试用免费，高阶收费」）。
// PRD：docs/PRD-work-plan-2026-09-24.md。
//
// 三层数据，来源各不相同，页面上也分开标：
//   ① 岗位 → 任务、任务的计量单位与示例量：data/work-roles.json（编辑判断，读者全部可改）；
//   ② 每个任务用哪些工具、按什么顺序、给什么提示词：data/solutions.json（已上线的 26 套方案，同一份事实）；
//   ③ 每个工具的免费上限：data/*-quotas.json 的结构化字段，**构建期逐字读取**，本文件不写任何数字。
// 「自动化计算」= 把 ③ 折算成与读者任务同一单位、同一周期的容量，按读者的约束（国内直连 / 要商用）
// 把可用工具的免费容量加起来，与读者自己的工作量相比。官方没有公布同单位数字的工具不参与加总，
// 页面照实写「官方未公布」，不估算、不猜。
//
// 付费层不新建：保存 / 跨设备恢复走已上线的 BPJ 云端工作区会员（tools/member-studio，9 USDT / 30 天，无自动续费）。
// 计算、导出、复制全部免费——前端锁不是付费墙（09-16 裁定），会员卖的是服务端保存与版本历史。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const PRODUCT_ID = 'ai-work-plan';

// 容量规则：一行 = 一个工具在一个单位上的免费容量，数值由 read(e) 从配额条目里取。
// 只给「产出的正是任务计量的那种东西」的工具写规则：方案里的步骤有的是互相替代（即梦 / LiblibAI 都能出图），
// 有的是流水线上的另一道工序（抠图、放大、排版）。后者不许进加总——Upscayl 放大不限量，不等于商品图不限量。
// read 返回 null 视为规则失效（test-work-plan 断言每条都能读出数）。per: day | week | month | once | unlimited。
const pick = (e, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), e);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
export const CAPACITY = [
  { slug: 'jimeng', unit: 'image', per: 'day', read: (e) => num(e.images_per_day), field: 'images_per_day' },
  { slug: 'liblib', unit: 'image', per: 'day', read: (e) => num(e.images_per_day), field: 'images_per_day' },
  { slug: 'bing-image', unit: 'image', per: 'unlimited', read: (e) => (e.kind === 'unlimited_slow' ? num(e.per_day) : null), field: 'kind=unlimited_slow, per_day',
    note_zh: (n) => `每天 ${n} 次加速，用完变慢但不限量`, note_en: (n) => `${n} fast generations a day, then slower but unlimited` },
  // 可灵：官方自述「66 灵感值≈6 条」是旧模型口径；官方付费单价页 2.x 模型 5 秒标准片 20 灵感值——取保守值。
  { slug: 'kling', unit: 'clip', per: 'day', read: (e) => (num(e.per_day) && num(pick(e, 'alt_rate.credits_per_clip')) ? Math.floor(e.per_day / e.alt_rate.credits_per_clip) : null), field: 'per_day ÷ alt_rate.credits_per_clip',
    note_zh: (n, e) => `按官方付费单价折算（2.x 模型）；官方旧口径为每天约 ${pick(e, 'conversion.0.clips')} 条`, note_en: (n, e) => `From the official per-clip price (2.x model); the vendor's older wording says about ${pick(e, 'conversion.0.clips')} a day` },
  { slug: 'qingying', unit: 'clip', per: 'unlimited', read: (e) => (e.kind === 'unlimited_queued' ? 0 : null), field: 'kind=unlimited_queued',
    note_zh: () => '不限次数，但要排队', note_en: () => 'No cap, but jobs queue' },
  { slug: 'heygen', unit: 'avatar', per: 'month', read: (e) => num(e.clips_per_month), field: 'clips_per_month' },
  { slug: 'opusclip', unit: 'footage', per: 'month', read: (e) => num(e.minutes_per_month), field: 'minutes_per_month' },
  { slug: 'elevenlabs', unit: 'voice', per: 'month', read: (e) => num(pick(e, 'conversion.0.minutes')), field: 'conversion[0].minutes' },
  { slug: 'fish-audio', unit: 'voice', per: 'month', read: (e) => num(pick(e, 'conversion.0.minutes')), field: 'conversion[0].minutes' },
  { slug: 'suno', unit: 'song', per: 'day', read: (e) => num(pick(e, 'conversion.0.songs')), field: 'conversion[0].songs' },
  { slug: 'feishu-miaoji', unit: 'meeting', per: 'month', read: (e) => (e.meter === 'minutes' ? num(e.per_month) : null), field: 'per_month (meter=minutes)' },
  { slug: 'deepl', unit: 'char', per: 'month', read: (e) => num(e.chars_per_month), field: 'chars_per_month' },
  { slug: 'caiyun', unit: 'char', per: 'once', read: (e) => num(e.chars_total), field: 'chars_total',
    note_zh: (n, e) => `一次性发放，${e.valid_months} 个月后清零`, note_en: (n, e) => `Granted once, expires after ${e.valid_months} month(s)` },
  { slug: 'groq', unit: 'request', per: 'day', read: (e) => num(e.req_per_day), field: 'req_per_day' },
  { slug: 'openrouter', unit: 'request', per: 'day', read: (e) => num(e.req_per_day), field: 'req_per_day', note_zh: () => '限 :free 模型', note_en: () => ':free models only' },
  { slug: 'gemini-cli', unit: 'request', per: 'day', read: (e) => num(e.requests_per_day), field: 'requests_per_day' },
  // GitHub Models 按模型分档：低档 150 / 高档 50 次/天——取保守的高档。
  { slug: 'github-models', unit: 'request', per: 'day', read: (e) => num(e.requests_per_day_high), field: 'requests_per_day_high',
    note_zh: (n, e) => `高档模型的数字；低档模型每天 ${e.requests_per_day_low} 次`, note_en: (n, e) => `Figure for high-tier models; low-tier models get ${e.requests_per_day_low} a day` },
  { slug: 'wps-ai', unit: 'use', per: 'day', read: (e) => num(e.per_day_approx), field: 'per_day_approx', approx: true },
  { slug: 'notebooklm', unit: 'question', per: 'day', read: (e) => num(e.chats_per_day), field: 'chats_per_day' },
];

export function loadQuotas(root) {
  const bySlug = new Map();
  for (const f of readdirSync(join(root, 'data')).filter((x) => x.endsWith('-quotas.json')).sort()) {
    const d = JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
    for (const e of d.entries || []) bySlug.set(e.slug, { ...e, _file: f });
  }
  return bySlug;
}

// 一个工具在给定单位下的容量；null = 官方没有这个单位的数字（或没有规则）。
export function capacityOf(slug, unit, quotas, zh) {
  const e = quotas.get(slug);
  const rule = CAPACITY.find((r) => r.slug === slug && r.unit === unit);
  if (!e || !rule) return null;
  const n = rule.read(e);
  if (n == null) return null;
  const note = zh ? rule.note_zh?.(n, e) : rule.note_en?.(n, e);
  return { n, per: rule.per, approx: !!rule.approx, ...(note ? { note } : {}), src: `${e._file}#${slug}.${rule.field}` };
}

const commercialOf = (slug, licence, quotas) => {
  const v = licence[slug]?.verdict;
  if (v) return v; // yes | no | conditional | depends | unstated
  const q = quotas.get(slug)?.commercial;
  return q === 'yes' || q === 'no' ? q : q === 'personal_only' ? 'no' : '';
};
const cnOf = (t) => ((t._tags || []).includes('国内直连') ? 1 : (t._tags || []).includes('需科学上网') ? 0 : -1);
const plain = (s) => String(s || '').replace(/\*\*/g, '').trim();
const clip = (s, n) => { s = String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// 页面与测试共用的数据：只含派生事实与编辑文字，不含任何 PII。
export function planData({ roles, solutions, toolsBySlug, quotas, licence, zh }) {
  const T = (o, k = '') => (zh ? o[k ? `${k}_zh` : 'zh'] : o[k ? `${k}_en` : 'en']) || '';
  const tasks = {};
  for (const [slug, meta] of Object.entries(roles.tasks)) {
    const s = solutions.get(slug);
    if (!s) throw Error(`work-roles: task ${slug} has no solution`);
    tasks[slug] = {
      slug, label: T(meta), unit: meta.unit, per: meta.per, example: meta.example,
      measure: T(meta, 'measure') || null,
      pain: plain(s.pain), prompt: plain(s.prompt), tip: plain(s.tip),
      steps: s.steps.map((st) => {
        const t = toolsBySlug.get(st.tool);
        if (!t) throw Error(`work-roles: ${slug} step tool ${st.tool} missing`);
        const L = t.limits || {};
        // v = 1：额度文字来自逐家核实的 limits（带核实日期）；v = 0：只是目录简介，页面必须照此标注，不能和核实过的数字混在一起。
        return {
          tool: t.slug, name: t.name, action: plain(st.action),
          quota: clip(L.quota || t.free, 150), v: L.quota && L.checked ? 1 : 0, checked: L.checked || null,
          paid: clip(L.paid?.tiers || '', 110),
          cap: capacityOf(t.slug, meta.unit, quotas, zh),
          biz: commercialOf(t.slug, licence, quotas), cn: cnOf(t),
        };
      }),
    };
  }
  return {
    units: Object.fromEntries(Object.entries(roles.units).map(([k, v]) => [k, T(v)])),
    roles: roles.roles.map((r) => ({ id: r.id, name: T(r), tasks: r.tasks })),
    tasks,
  };
}

// 核心计算，页面脚本里嵌的就是这一个函数的源码（fitTask.toString()），所以测试测到的就是浏览器跑的。
// 同一任务里、确定满足约束、有同单位官方数字的工具：免费容量折成「每周」后相加，与读者的每周量比较。
// days = 每周工作几天（1–7，缺省 7）：每日额度不结转，只在工作日用得上；每日任务量也按工作日算。每月额度 ×7/30 不受影响。
// 约束是三值的（2026-09-24 第二轮）：明确不满足 → 排除；明确满足 → 计入确定容量；**没标注 / 条款没写明 → 不计入确定容量**，
// 只能让结论变成「说不准」并写明原因。第一版把未标注的工具也算进「够用」，勾了「要商用」照样拿「商用条款官方没说」的即梦凑数。
export function fitTask(t, vol, cn, biz, days) {
  const w = days >= 1 && days <= 7 ? Math.round(days) : 7;
  const PERW = { day: w, week: 1, month: 7 / 30 };
  const need = vol * (t.per === 'day' ? w : 1);
  let rec = 0, maybe = 0, maybeUnl = false, anyFig = false;
  const once = [], unlimited = [], used = [], excluded = [], unsure = [], nofig = [];
  t.steps.forEach((s, i) => {
    const out = cn && s.cn === 0 ? 'cn' : biz && s.biz === 'no' ? 'biz' : '';
    if (out) { excluded.push({ i, why: out }); return; }
    const q = cn && s.cn !== 1 ? 'cn' : biz && s.biz !== 'yes' && s.biz !== 'conditional' ? 'biz' : '';
    if (q) unsure.push({ i, why: q });
    if (!s.cap) { nofig.push(i); return; }
    anyFig = true;
    if (s.cap.per === 'once') { once.push(i); if (!q) used.push(i); return; }
    if (s.cap.per === 'unlimited') { if (q) maybeUnl = true; else { unlimited.push(i); used.push(i); } return; }
    const c = s.cap.n * PERW[s.cap.per];
    if (q) maybe += c; else { rec += c; used.push(i); }
  });
  const covered = unlimited.length > 0 || (used.length > 0 && rec >= need);
  const could = maybeUnl || (maybe > 0 && rec + maybe >= need);
  // blocked：约束把全部工具都排除了。partial：确定的不够，但「条件没确认的工具」（cond）或「官方没公布上限的工具」（nofig）可能补上——不能判「不够」。
  const status = t.steps.length && excluded.length === t.steps.length ? 'blocked' : covered ? 'ok' : could ? 'partial' : !anyFig ? 'unknown' : nofig.length ? 'partial' : 'short';
  return { need, rec, maybe, maybeUnl, w, once, unlimited, used, excluded, unsure, nofig, status, why: status === 'partial' ? (could ? 'cond' : 'nofig') : '' };
}

// ── 以下四个纯函数同样以源码嵌进页面：分享链接的编码 / 解析，与「保存之后额度变了什么」的对比。──
export const DEFAULT_DAYS = 5;
export function hashText(x) { let h = 5381; x = String(x || ''); for (let i = 0; i < x.length; i++) h = ((h << 5) + h + x.charCodeAt(i)) >>> 0; return h.toString(36); }
// 一个步骤的「指纹」：[同单位数字, 周期, 核实日期, 厂商原话的哈希]。存进方案快照，恢复时与当天数据逐条比。
export function sigOf(s) { const c = s.cap; return [c ? c.n : null, c ? c.per : null, s.checked || null, hashText(s.quota)]; }
export function planHash(st) {
  const p = [];
  if (st.role) p.push('role=' + encodeURIComponent(st.role));
  Object.keys(st.tasks).forEach((s) => p.push(s + '=' + encodeURIComponent(st.tasks[s])));
  p.push('days=' + st.days);
  if (st.cn) p.push('cn=1');
  if (st.biz) p.push('biz=1');
  return p.join('&');
}
// 只认页面已知的岗位与任务；数字不合法就回退到示例量——链接是任何人都能改的输入。
export function parsePlanHash(h, D) {
  h = String(h || '').replace(/^#/, '');
  if (!h) return null;
  const m = /^role-([a-z0-9-]{1,40})$/.exec(h);
  if (m) return D.roles.some((r) => r.id === m[1]) ? { select: m[1] } : null;
  const p = new URLSearchParams(h), tasks = {};
  let n = 0;
  Object.keys(D.tasks).forEach((s) => {
    if (!p.has(s)) return;
    const raw = p.get(s), v = Number(raw);
    tasks[s] = raw !== '' && Number.isFinite(v) && v >= 0 ? Math.min(v, 1e7) : D.tasks[s].example;
    n++;
  });
  const r = D.roles.filter((x) => x.id === p.get('role'))[0];
  if (!n && !r) return null;
  if (!n) r.tasks.forEach((s) => { tasks[s] = D.tasks[s].example; });
  const d = Number(p.get('days'));
  return { role: r ? r.id : '', tasks, cn: p.get('cn') === '1', biz: p.get('biz') === '1', days: d >= 1 && d <= 7 ? Math.round(d) : DEFAULT_DAYS };
}
// seen 来自读者自己的文件或云端备份：逐字段校验后才比较；结果里唯一回显的是通过 slug 格式校验的工具名（渲染时仍转义）。
export function diffPlan(D, tasks, seen, sameLang) {
  if (!seen || typeof seen !== 'object' || Array.isArray(seen)) return null;
  const PERS = ['day', 'week', 'month', 'once', 'unlimited'];
  const clean = (a) => (Array.isArray(a) && a.length === 4 ? [
    typeof a[0] === 'number' && Number.isFinite(a[0]) && a[0] >= 0 ? a[0] : null,
    PERS.indexOf(a[1]) >= 0 ? a[1] : null,
    typeof a[2] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a[2]) ? a[2] : null,
    typeof a[3] === 'string' && /^[0-9a-z]{1,8}$/.test(a[3]) ? a[3] : null,
  ] : null);
  const rows = [];
  let same = 0, rechecked = 0;
  Object.keys(tasks).forEach((k) => {
    const t = D.tasks[k];
    if (!t) return;
    const here = {};
    t.steps.forEach((s) => {
      const key = k + '/' + s.tool, o = clean(seen[key]), n = sigOf(s);
      here[key] = 1;
      if (!o) { rows.push({ kind: 'new', task: k, tool: s.tool }); return; }
      if (o[0] !== n[0] || o[1] !== n[1]) { rows.push({ kind: 'cap', task: k, tool: s.tool, was: [o[0], o[1]], checked: n[2] }); return; }
      if (sameLang && o[3] !== n[3]) { rows.push({ kind: 'text', task: k, tool: s.tool, checked: n[2] }); return; }
      if (o[2] !== n[2]) rechecked++; else same++;
    });
    Object.keys(seen).forEach((key) => {
      if (key.indexOf(k + '/') !== 0 || here[key]) return;
      const tool = key.slice(k.length + 1);
      if (/^[a-z0-9-]{1,60}$/.test(tool)) rows.push({ kind: 'gone', task: k, tool });
    });
  });
  return { rows, same, rechecked };
}

const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

// 方案页 → 规划器的入口（2026-09-24 第三轮）：只给 work-roles.json 里有计量单位的方案出链接，带上示例量，
// 落地即重算。用 # 片段而不是查询串：片段不产生新 URL，不会被当成 21 个重复页去抓，也不经服务器。
export function workPlanLinks(root) {
  const roles = JSON.parse(readFileSync(join(root, 'data/work-roles.json'), 'utf8'));
  return new Map(Object.entries(roles.tasks).map(([slug, t]) => [slug, `/work-plan.html#${slug}=${t.example}`]));
}

export function buildWorkPlan({ root, layout, railOf, esc, crumbLd, faqLd, BASE, NAME, LOCALE, site, toolsBySlug, planBySlug, licence, write, pushPage }) {
  const zh = LOCALE.code === 'zh';
  const roles = JSON.parse(readFileSync(join(root, 'data/work-roles.json'), 'utf8'));
  const quotas = loadQuotas(root);
  const D = planData({ roles, solutions: planBySlug, toolsBySlug, quotas, licence, zh });
  const nCap = new Set(Object.values(D.tasks).flatMap((t) => t.steps.filter((s) => s.cap).map((s) => s.tool))).size;
  const nTools = new Set(Object.values(D.tasks).flatMap((t) => t.steps.map((s) => s.tool))).size;
  const asOf = Object.values(D.tasks).flatMap((t) => t.steps.map((s) => s.checked)).filter(Boolean).sort().pop();
  const path = '/work-plan.html';
  const url = `${BASE}${path}`;
  const perW = { day: zh ? '每天' : 'a day', week: zh ? '每周' : 'a week', month: zh ? '每月' : 'a month', once: zh ? '一次性' : 'once' };

  const h1 = zh ? '按你的工作，算一套能用的 AI 方案' : 'An AI plan for the job you actually do';
  const answer = zh
    ? `选岗位、填你每周的工作量，页面会把每个任务该用的工具按步骤排好，并算出：这些工具的免费额度加起来，够不够你的量。${Object.keys(D.tasks).length} 类任务共用到 ${nTools} 款工具，其中 ${nCap} 款的免费上限有官方公布的同单位数字，直接参与计算；其余照录厂商原话（多为 tokens、积分这类别的单位），不换算、不估算。数据截至 ${asOf}。`
    : `Pick a role and enter your weekly workload. The page lines up the tools for each task, step by step, and works out whether their free tiers, added together, cover your volume. ${Object.keys(D.tasks).length} kinds of task draw on ${nTools} of the directory's entries; ${nCap} of those have an officially published figure in the same unit and go into the maths. For the rest the vendor's own wording is quoted (often in tokens or credits), with no conversion and no estimate. Data as of ${asOf}.`;

  const FAQ = zh ? [
    { q: '这个规划器是怎么算的？', a: '每个任务的工具与步骤来自本站 26 套 0 元方案；每个工具的免费上限来自本站逐家核实的配额数据（带官方来源与核实日期）。只有当厂商公布了与你的任务同单位的数字（如每天几张图、每月几分钟），才折算到你填的周期并参与加总；按你的约束（国内直连 / 要商用）排除不合格的工具后，把剩下的免费容量相加，与你的工作量比较。' },
    { q: '为什么有的任务没有「够 / 不够」的结论？', a: '很多厂商只用别的单位公布额度（tokens、积分、credits），或者根本不公布。本站不做单位换算——换算要用官方没给的折算口径，那就是编。这类任务照录各家原话，并标明它是逐家核实过的官方口径，还是未逐条核实的目录简介。勾了「国内直连」或「要商用」时，可达性没标注、商用条款没写明的工具也不算进确定容量，结论会写「说不准」并说明原因。' },
    { q: '免费版和会员有什么区别？', a: '计算、导出与导入 JSON、复制 Markdown、分享链接全部免费。会员是本站已上线的云端工作区（9 USDT / 30 天，不自动续费）：方案存在服务端、保留最近 10 个版本、换设备恢复。无论从云端还是从 JSON 恢复，页面都会逐条对比「你保存之后哪些额度变了」。会员不包含团队账号，也不会主动发提醒。' },
    { q: '岗位和任务是谁定的？', a: '是编辑按常见工作整理的默认值，页面上标明了「示例」。你可以增删任务、改工作量，计算只看你最后填的数。' },
    { q: '会推荐付费工具或带推广链接吗？', a: '不带任何推广或返利链接。某个任务的免费额度不够时，页面会列出该工具官方公布的付费档，供你自己判断。' },
  ] : [
    { q: 'How does the planner calculate?', a: "Each task's tools and steps come from this site's 26 zero-cost plans; each tool's free ceiling comes from our vendor-by-vendor quota data, with official sources and check dates. Only where a vendor publishes a figure in the same unit as your task (images a day, minutes a month) is it converted to your period and added up. Tools that fail your constraints (reachable from mainland China, commercial use) are left out, and the remaining free capacity is compared with your workload." },
    { q: 'Why do some tasks get no covered / not-covered verdict?', a: "Many vendors publish their allowance only in another unit (tokens, credits) or not at all. The site does not convert units: that would need a conversion rate the vendor never gave, which means making one up. Those tasks quote each vendor's wording and say whether it is a verified official figure or an unverified directory blurb. With the China or commercial-use constraint on, tools whose reachability is unrecorded or whose terms are silent are kept out of the firm total too, and the verdict says uncertain, with the reason." },
    { q: 'What does membership add?', a: "Calculating, JSON export and import, Markdown copy and share links are all free. Membership is the site's existing cloud workspace (9 USDT for 30 days, no auto-renewal): the plan is stored on the server, the last 10 versions are kept, and it can be restored on another device. Whether a plan comes back from the cloud or from a JSON file, the page lists what changed in the allowances since it was saved. No team accounts, and no alerts are sent." },
    { q: 'Who decided the roles and tasks?', a: 'They are editorial defaults for common jobs, marked "example" on the page. Add or remove tasks and change the volumes; the maths only uses what you enter.' },
    { q: 'Does it push paid tools or carry referral links?', a: 'No referral or affiliate links. When a free tier falls short, the page shows the paid tier the vendor itself publishes, for you to judge.' },
  ];

  // 无 JS 也能读的静态层：每个岗位一张表（任务 → 工具 → 官方免费上限）。爬虫与 .md 镜像读到的就是这一层。
  const staticRoles = D.roles.map((r) => `<details class="wp-role" id="role-${esc(r.id)}"><summary><b>${esc(r.name)}</b><span>${r.tasks.length} ${zh ? '个任务' : 'tasks'}</span></summary>
    <div class="lt-scroll"><table><thead><tr><th>${zh ? '任务' : 'Task'}</th><th>${zh ? '按步骤用的工具' : 'Tools, in order'}</th><th>${zh ? '有官方同单位数字的免费上限' : 'Free ceilings with an official figure'}</th></tr></thead><tbody>${r.tasks.map((slug) => {
      const t = D.tasks[slug];
      const caps = t.steps.filter((s) => s.cap).map((s) => `${esc(s.name)}：${s.cap.per === 'unlimited' ? (zh ? '不限' : 'unlimited') : `${s.cap.approx ? '≈' : ''}${s.cap.n} ${esc(D.units[t.unit])} ${perW[s.cap.per]}`}`);
      return `<tr><td><a href="${BASE}/plans/${esc(slug)}.html">${esc(t.label)}</a></td><td>${t.steps.map((s) => `<a href="${BASE}/tools/${esc(s.tool)}.html">${esc(s.name)}</a>`).join(' → ')}</td><td>${caps.length ? caps.join('；') : (zh ? '无同单位官方数字（各家原话见方案页）' : 'no official figure in this unit (vendor wording on the plan page)')}</td></tr>`;
    }).join('')}</tbody></table></div><p><a class="wp-open" href="#role=${esc(r.id)}">${zh ? '在上面的规划器里按你的量算 →' : 'Run it with your own volumes above →'}</a></p></details>`).join('\n');

  const L = zh ? {
    s1: '① 你是做什么的', s2: '② 你每周（或每天）要做多少', s3: '③ 约束', cn: '只要国内能直连的', biz: '产出要商用', go: '算我的方案', example: '示例量，改成你的',
    add: '＋ 加一个任务', none: '先选一个岗位，或加一个任务。', exportJ: '下载 JSON', copyMd: '复制为 Markdown', save: '保存到云端（会员）', link: '复制分享链接',
    saveNote: '云端保存、最近 10 个版本与换设备恢复属于本站云端工作区会员（9 USDT / 30 天，不自动续费）。计算、导出、导入与分享永远免费；无论从哪里恢复，页面都会列出保存之后变了的额度。',
    copied: '已复制', popup: '请允许弹出会员工作区标签页，或先下载 JSON。', restored: '已恢复方案，请核对后再用。',
    days: '每周工作', daysUnit: '天', daysNote: '每日额度不结转，只按工作日计；每月额度不受影响。',
    importQ: '以前下载过这页的 JSON？', importB: '导入并对比额度变化', badFile: '这不是本页导出的方案文件。',
  } : {
    s1: '① What do you do', s2: '② How much of it, per week (or per day)', s3: '③ Constraints', cn: 'Only tools reachable from mainland China', biz: 'Output is for commercial use', go: 'Work out my plan', example: 'example volume — change it',
    add: '+ Add a task', none: 'Pick a role or add a task first.', exportJ: 'Download JSON', copyMd: 'Copy as Markdown', save: 'Save to cloud (members)', link: 'Copy share link',
    saveNote: "Cloud saving, the last 10 versions and restoring on another device are part of this site's cloud workspace membership (9 USDT for 30 days, no auto-renewal). Calculating, exporting, importing and sharing stay free; wherever a plan is restored from, the page lists the allowances that changed since it was saved.",
    copied: 'Copied', popup: 'Allow the member workspace tab to open, or download the JSON first.', restored: 'Plan restored. Review it before use.',
    days: 'Working days a week', daysUnit: '', daysNote: 'Daily allowances do not carry over, so they count only on working days; monthly ones are unaffected.',
    importQ: 'Downloaded this page\'s JSON before?', importB: 'Import it and compare allowances', badFile: 'That is not a plan file exported from this page.',
  };

  const body = `${railOf()}
<main class="stage">
  <nav class="crumb"><a href="${BASE}/">${esc(NAME)}</a><i>/</i><span>${zh ? '按岗位算方案' : 'Plan by job'}</span></nav>
  <header class="hero"><div class="hero-inner">
    <h1>${esc(h1)}</h1>
    <p class="answer">${esc(answer)}</p>
    <p class="coverage">${zh ? '只想按任务配工具？' : 'Just want tools by task?'} <a href="${BASE}/stack-builder.html">${zh ? '免费工具栈组装器 →' : 'Free stack builder →'}</a></p>
  </div></header>
  <section class="limits-table" id="planner" data-home-block="work-plan">
    <h2 class="group-title">${L.s1}</h2>
    <div class="ask-hint" id="wpRoles">${D.roles.map((r) => `<button type="button" data-role="${esc(r.id)}">${esc(r.name)}</button>`).join('')}</div>
    <p class="sub-note wp-import">${esc(L.importQ)} <button type="button" id="wpImport" class="wp-link">${esc(L.importB)}</button><input type="file" id="wpFile" accept=".json,application/json" hidden></p>
    <h2 class="group-title">${L.s2}</h2>
    <div id="wpTasks" class="wp-tasks"><p class="gs-none">${L.none}</p></div>
    <p><select id="wpAdd" aria-label="${esc(L.add)}"><option value="">${esc(L.add)}</option>${Object.values(D.tasks).map((t) => `<option value="${esc(t.slug)}">${esc(t.label)}</option>`).join('')}</select></p>
    <p class="wp-days"><label>${esc(L.days)} <input type="number" id="wpDays" min="1" max="7" step="1" value="${DEFAULT_DAYS}"> ${esc(L.daysUnit)}</label> <small>${esc(L.daysNote)}</small></p>
    <h2 class="group-title">${L.s3}</h2>
    <div class="wp-flags"><label><input type="checkbox" id="wpCn"> ${esc(L.cn)}</label> <label><input type="checkbox" id="wpBiz"> ${esc(L.biz)}</label></div>
    <p><button type="button" id="wpGo" class="wp-go">${esc(L.go)}</button></p>
    <div id="wpMsg" aria-live="polite"></div>
    <div id="wpDiff" class="calc-row calc-warn" hidden></div>
    <div id="wpOut" class="calc-out" aria-live="polite"></div>
    <div id="wpActions" class="wp-actions" hidden><button type="button" id="wpCopy">${esc(L.copyMd)}</button> <button type="button" id="wpLink">${esc(L.link)}</button> <button type="button" id="wpJson">${esc(L.exportJ)}</button> <button type="button" id="wpSave">${esc(L.save)}</button>
      <p class="sub-note">${esc(L.saveNote)} <a href="${BASE}/members">${zh ? '会员说明 →' : 'About membership →'}</a></p></div>
  </section>
  <section class="limits-table" id="roles">
    <h2 class="group-title">${zh ? '12 个岗位的默认方案（不开 JS 也能看）' : 'Default plans for 12 roles (readable without JavaScript)'}</h2>
    <p class="sub-note">${zh ? '岗位与任务是编辑整理的默认值；工具与步骤来自 0 元方案；数字来自官方公布并带核实日期。' : 'Roles and tasks are editorial defaults; tools and steps come from the zero-cost plans; figures are officially published and carry check dates.'}</p>
    ${staticRoles}
  </section>
  <section class="limits-table" id="method">
    <h2 class="group-title">${zh ? '怎么算的（不怎么算的也写上）' : 'How it is calculated — and what it will not do'}</h2>
    <ul class="wp-method">
      <li>${zh ? '容量只取厂商公布的、与任务同单位的数字：每天的 × 你每周的工作天数（每日额度不结转），每月的 ×7/30 折成每周；一次性额度单独算「能撑几周」。' : 'Capacity uses only figures the vendor publishes in the same unit as the task: daily figures × your working days a week (daily allowances do not carry over), monthly ×7/30 to get a week; one-off grants are shown as how many weeks they last.'}</li>
      <li>${zh ? '同一任务里可用工具的免费容量相加——这是「一整套」的意思：一家不够，几家叠起来可能够。' : 'Free capacity of the usable tools in a task is added up — that is what a whole plan means: one vendor may fall short where several together do not.'}</li>
      <li>${zh ? '约束分三种情况：明确不满足的排除；明确满足的计入；可达性没标注、商用条款没写明的不计入确定容量，结论写「说不准」并列出是哪几个工具。' : 'Constraints have three outcomes: tools that clearly fail are left out, tools that clearly pass are counted, and tools with unrecorded reachability or silent terms stay out of the firm total, so the verdict says uncertain and names them.'}</li>
      <li>${zh ? '不做单位换算：tokens、积分、字符不折成张数或分钟。没有同单位数字的工具，照录厂商原话，并标明是否逐家核实过。' : 'No unit conversion: tokens, credits and characters are never turned into images or minutes. Tools without a same-unit figure get the vendor wording, marked verified or not.'}</li>
      <li>${zh ? '保存的方案会记下每个工具当时的数字与核实日期；以后从云端或 JSON 恢复，页面逐条列出变了什么——额度每个月都在变，方案也会过期。' : 'A saved plan records each tool\'s figure and check date; when it is restored later, from the cloud or a JSON file, the page lists what changed. Allowances move every month, and plans go stale with them.'}</li>
      <li>${zh ? '不算「能省几小时」：那要看你的工作，本站没有可核实的数字。' : 'No "hours saved" figure: that depends on your work and there is no verifiable number for it.'}</li>
      <li>${zh ? '厂商随时会改额度；每个数字旁都有核实日期，本站每天巡检官方页。' : 'Vendors change allowances at any time; every figure carries its check date and the official pages are re-checked daily.'}</li>
    </ul>
  </section>
  <section class="faq">
    <h2>${zh ? '常见问题' : 'FAQ'}</h2>
    ${FAQ.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
  </section>
</main>
<script>
(function(){
  var ZH=${zh}, BASE=${JSON.stringify(BASE)}, PID=${JSON.stringify(PRODUCT_ID)}, L=${safeJson(L)}, DAYS=${DEFAULT_DAYS};
  var D=${safeJson(D)};
  var PER=${safeJson(perW)};
  var BIZ=${safeJson(zh ? { yes: '可商用', no: '不可商用', conditional: '有条件商用', depends: '看模型', unstated: '官方没说', '': '未判定' } : { yes: 'commercial OK', no: 'no commercial use', conditional: 'conditional', depends: 'depends on model', unstated: 'terms silent', '': 'not checked' })};
  var STATUS=${safeJson(zh ? { ok: '够用', short: '不够', partial: '说不准', unknown: '无同单位数字', blocked: '约束排除了全部工具' } : { ok: 'covered', short: 'short', partial: 'uncertain', unknown: 'no same-unit figure', blocked: 'every tool excluded' })};
  var st={role:'',tasks:{},cn:false,biz:false,days:DAYS}, last=null;
  function $(id){return document.getElementById(id)}
  function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function EV(n,p){try{if(window.bpjEv)window.bpjEv(n,p)}catch(e){}}
  function fmt(n){return (Math.round(n*10)/10).toLocaleString(ZH?'zh-CN':'en-US')}
  function flash(b){var t=b.textContent;b.textContent=L.copied;setTimeout(function(){b.textContent=t},1800)}
  function msg(t){$('wpMsg').innerHTML=t?'<p class="sub-note">'+E(t)+'</p>':''}
  function selRoles(){Array.prototype.forEach.call(document.querySelectorAll('#wpRoles button'),function(b){b.classList.toggle('is-sel',b.dataset.role===st.role)})}
  function setRole(id){
    var r=D.roles.filter(function(x){return x.id===id})[0]; if(!r)return;
    st.role=id; st.tasks={}; r.tasks.forEach(function(s){st.tasks[s]=D.tasks[s].example});
    selRoles(); drawTasks(); $('wpOut').innerHTML=''; $('wpActions').hidden=true; $('wpDiff').hidden=true; last=null;
  }
  function drawTasks(){
    var ks=Object.keys(st.tasks);
    if(!ks.length){$('wpTasks').innerHTML='<p class="gs-none">'+E(L.none)+'</p>';return}
    $('wpTasks').innerHTML=ks.map(function(s){var t=D.tasks[s];
      return '<div class="wp-task"><label>'+E(t.label)+' <small>'+E(t.measure||'')+'</small></label> '+
        '<input type="number" min="0" max="10000000" step="1" data-t="'+E(s)+'" value="'+E(st.tasks[s])+'" aria-label="'+E(t.label)+'"> '+
        '<span>'+E(D.units[t.unit])+' '+E(PER[t.per])+'</span> <small class="wp-ex">'+E(L.example)+'</small> '+
        '<button type="button" class="wp-x" data-x="'+E(s)+'" aria-label="×">×</button></div>'}).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#wpTasks input'),function(i){i.addEventListener('input',function(){var v=Number(i.value);st.tasks[i.dataset.t]=isFinite(v)&&v>=0?Math.min(v,1e7):0;live()})});
    Array.prototype.forEach.call(document.querySelectorAll('#wpTasks .wp-x'),function(b){b.addEventListener('click',function(){delete st.tasks[b.dataset.x];drawTasks();live()})});
  }
  // 结果已经显示时，改任何输入都静默重算——不然屏幕上是旧数字。事件只在点「算」时记一次。
  function live(){if(!$('wpActions').hidden)compute(true)}
  var fitTask=${fitTask.toString()};
  var hashText=${hashText.toString()};
  var sigOf=${sigOf.toString()};
  var planHash=${planHash.toString()};
  var parsePlanHash=${parsePlanHash.toString()};
  var diffPlan=${diffPlan.toString()};
  var DEFAULT_DAYS=DAYS;
  var WHY={cn:ZH?'需科学上网':'not reachable from mainland China',biz:ZH?'免费档不可商用':'free tier bars commercial use'};
  var UNSURE={cn:ZH?'国内可达性未标注':'China reachability not recorded',biz:ZH?'商用条款未确认':'commercial terms not confirmed'};
  function capTxt(n,per,u){return per==='unlimited'?(ZH?'不限':'unlimited'):n==null?(ZH?'无同单位数字':'no figure in this unit'):fmt(n)+' '+u+' '+(PER[per]||'')}
  function verdictOf(t,f){var u=D.units[t.unit];
    if(f.status==='blocked')return ZH?'你的约束排除了这个任务的全部 '+t.steps.length+' 个工具：放宽约束再算，或换别的工具':'Your constraints rule out all '+t.steps.length+' tools for this task: loosen them or look elsewhere';
    if(f.status==='ok')return f.unlimited.length?(ZH?'够用：有不限量的工具':'Covered: an unlimited tool is available'):(ZH?'够用：免费合计每周约 '+fmt(f.rec)+' '+u+'，你要 '+fmt(f.need):'Covered: about '+fmt(f.rec)+' '+u+' a week free, you need '+fmt(f.need));
    if(f.status==='short')return ZH?'不够：免费合计每周约 '+fmt(f.rec)+' '+u+'，你要 '+fmt(f.need)+'，差 '+fmt(f.need-f.rec):'Short: about '+fmt(f.rec)+' '+u+' a week free, you need '+fmt(f.need)+', '+fmt(f.need-f.rec)+' short';
    if(f.status==='partial'&&f.why==='cond'){var rs={};f.unsure.forEach(function(x){if(t.steps[x.i].cap)rs[UNSURE[x.why]]=1});var names=f.unsure.filter(function(x){return t.steps[x.i].cap}).map(function(x){return t.steps[x.i].name}).join(ZH?'、':', ');
      return ZH?'说不准：确定满足你约束的工具每周合计约 '+fmt(f.rec)+' '+u+'，不到你的 '+fmt(f.need)+'；'+names+'（'+Object.keys(rs).join('、')+'）'+(f.maybeUnl?'里有不限量的':'加上后每周约 '+fmt(f.rec+f.maybe)+' '+u)+'——先去它们的页面确认再用'
        :'Uncertain: tools that clearly meet your constraints add up to about '+fmt(f.rec)+' '+u+' a week, below your '+fmt(f.need)+'; '+names+' ('+Object.keys(rs).join(', ')+') '+(f.maybeUnl?'include an unlimited one':'would bring it to about '+fmt(f.rec+f.maybe)+' '+u)+'. Check their pages first'}
    if(f.status==='partial')return ZH?'说不准：有官方数字的工具每周合计约 '+fmt(f.rec)+' '+u+'，不到你的 '+fmt(f.need)+'；另外 '+f.nofig.length+' 个工具没有同单位的官方数字，能否补足看它们各自的原话':'Uncertain: tools with a published figure add up to about '+fmt(f.rec)+' '+u+' a week, below your '+fmt(f.need)+'; '+f.nofig.length+' other tool(s) have no figure in this unit, so whether they close the gap depends on their own wording';
    return ZH?'没有同单位的官方数字：按步骤用，额度见每个工具下面的原话':'No official figure in this unit: follow the steps; each tool\\'s own wording is below it'}
  function compute(silent){
    var ks=Object.keys(st.tasks); if(!ks.length){$('wpOut').innerHTML='<p class="gs-none">'+E(L.none)+'</p>';return null}
    var res=ks.map(function(s){var t=D.tasks[s];return {t:t,vol:st.tasks[s],f:fitTask(t,st.tasks[s],st.cn,st.biz,st.days)}});
    var n={ok:0,short:0,partial:0,unknown:0,blocked:0}; res.forEach(function(r){n[r.f.status]++});
    var H='<p class="answer">'+(ZH?('你选的 '+res.length+' 个任务里（每周工作 '+st.days+' 天）：<b>'+n.ok+'</b> 个免费额度够用；<b>'+n.short+'</b> 个按官方数字不够；<b>'+n.partial+'</b> 个说不准；<b>'+n.unknown+'</b> 个没有同单位的官方数字，只给步骤与原话'+(n.blocked?'；<b>'+n.blocked+'</b> 个被你的约束排除了全部工具':'')+'。')
      :('Of your '+res.length+(res.length===1?' task (':' tasks (')+st.days+' working days a week): <b>'+n.ok+'</b> covered by free tiers; <b>'+n.short+'</b> short on the published figures; <b>'+n.partial+'</b> uncertain; <b>'+n.unknown+'</b> with no same-unit figure, steps and vendor wording only'+(n.blocked?'; <b>'+n.blocked+'</b> with every tool ruled out by your constraints':'')+'.'))+'</p>';
    res.forEach(function(r){var t=r.t,f=r.f,u=D.units[t.unit];
      var verdict=E(verdictOf(t,f));
      if(f.once.length)verdict+=(ZH?'；另有一次性额度 ':'; plus one-off grants: ')+f.once.map(function(i){var s=t.steps[i];return E(s.name)+' '+fmt(s.cap.n)+' '+E(u)+(f.need?(ZH?'（按你的量约撑 '+fmt(s.cap.n/f.need)+' 周）':' (about '+fmt(s.cap.n/f.need)+' weeks at your volume)'):'')}).join(', ');
      H+='<div class="calc-row '+({ok:'calc-ok',short:'calc-no',partial:'calc-warn',blocked:'calc-no'}[f.status]||'calc-un')+'"><h3 class="calc-h"><a href="'+BASE+'/plans/'+E(t.slug)+'.html">'+E(t.label)+'</a><em>'+E(fmt(r.vol))+' '+E(u)+' '+E(PER[t.per])+'</em></h3><p><b>'+verdict+'</b></p><ol>';
      t.steps.forEach(function(s,idx){var ex=f.excluded.filter(function(x){return x.i===idx})[0], un=f.unsure.filter(function(x){return x.i===idx})[0];
        var cap=s.cap?(s.cap.approx?'≈':'')+capTxt(s.cap.n,s.cap.per,u):(ZH?'无同单位数字':'no figure in this unit');
        H+='<li'+(ex?' class="wp-out"':'')+'><b><a href="'+BASE+'/tools/'+E(s.tool)+'.html">'+E(s.name)+'</a></b> — '+E(s.action)+
          '<br><small>'+E(cap)+(s.cap&&s.cap.note?' · '+E(s.cap.note):'')+' · '+E(BIZ[s.biz]||BIZ[''])+(s.cn===1?(ZH?' · 国内直连':' · works in China'):s.cn===0?(ZH?' · 需科学上网':' · needs a VPN in China'):(ZH?' · 国内可达性未标注':' · China reachability not recorded'))+(s.checked?(ZH?' · 核实于 ':' · checked ')+E(s.checked):'')+'</small>'+
          (!s.cap&&s.quota?'<br><small class="wp-q">'+(s.v?(ZH?'官方口径：':'Vendor wording: '):(ZH?'目录简介（未逐条核实）：':'Directory blurb (not individually verified): '))+E(s.quota)+'</small>':'')+
          (ex?'<br><small class="wp-why">'+(ZH?'未计入：':'Left out: ')+E(WHY[ex.why])+'</small>':'')+
          (!ex&&un&&s.cap?'<br><small class="wp-why">'+(ZH?'没算进确定容量：':'Not in the firm total: ')+E(UNSURE[un.why])+'</small>':'')+
          ((f.status==='short'||f.status==='partial')&&s.paid?'<br><small>'+(ZH?'付费档（官方口径）：':'Paid tier (vendor wording): ')+E(s.paid)+'</small>':'')+'</li>'});
      H+='</ol>'+(t.prompt?'<details><summary>'+(ZH?'可以直接用的提示词':'A prompt you can use as is')+'</summary><p>'+E(t.prompt)+'</p></details>':'')+'</div>';
    });
    $('wpOut').innerHTML=H; $('wpActions').hidden=false; last=res;
    if(!silent){EV('calc','/plan/'+(st.role||'custom')+'/'+ks.length+(st.cn?'+cn':'')+(st.biz?'+biz':''));remember()}
    return res;
  }
  function remember(){try{history.replaceState(null,'',location.pathname+location.search+'#'+planHash(st))}catch(e){}}
  function shareUrl(){return location.origin+location.pathname+'#'+planHash(st)}
  function markdown(){var res=last||compute(true);if(!res)return '';var m=['# '+(ZH?'我的 AI 工作方案':'My AI work plan'),'',(ZH?'每周工作 '+st.days+' 天':st.days+' working days a week')+(st.cn?(ZH?' · 只要国内直连':' · mainland-China reachable only'):'')+(st.biz?(ZH?' · 产出要商用':' · commercial use'):''),''];
    res.forEach(function(r){m.push('## '+r.t.label+' — '+fmt(r.vol)+' '+D.units[r.t.unit]+' '+PER[r.t.per]);m.push((ZH?'判定：':'Verdict: ')+STATUS[r.f.status]+(ZH?'。':'. ')+verdictOf(r.t,r.f),'');r.t.steps.forEach(function(s,i){m.push((i+1)+'. '+s.name+': '+s.action)});if(r.t.prompt)m.push('','> '+r.t.prompt);m.push('')});
    m.push((ZH?'在线重算：':'Recalculate online: ')+shareUrl(),'',ZH?'来源：白嫖计 baipiaoji.com/work-plan（额度带核实日期，以官方页为准）':'Source: Baipiaoji baipiaoji.com/en/work-plan (allowances carry check dates; the official page wins)');return m.join('\\n')}
  function seenOf(){var o={};Object.keys(st.tasks).forEach(function(k){D.tasks[k].steps.forEach(function(s){o[k+'/'+s.tool]=sigOf(s)})});return o}
  function snapshot(){var res=last||compute(true)||[],v={};res.forEach(function(r){v[r.t.slug]=r.f.status});
    return {version:1,product:PID,values:{v:2,lang:ZH?'zh':'en',saved:new Date().toISOString().slice(0,10),role:st.role,tasks:st.tasks,cn:st.cn,biz:st.biz,days:st.days,seen:seenOf(),verdicts:v}}}
  function apply(v){
    st.role=D.roles.some(function(r){return r.id===v.role})?v.role:''; st.tasks=v.tasks; st.cn=v.cn===true; st.biz=v.biz===true;
    var d=Number(v.days); st.days=d>=1&&d<=7?Math.round(d):DAYS;
    $('wpCn').checked=st.cn; $('wpBiz').checked=st.biz; $('wpDays').value=st.days; selRoles(); drawTasks(); $('wpDiff').hidden=true; compute(true);
  }
  function showDiff(v){
    var saved=typeof v.saved==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(v.saved)?v.saved:'';
    var d=diffPlan(D,st.tasks,v.seen,v.lang===(ZH?'zh':'en')); if(!d)return;
    var vch=[]; if(v.verdicts&&typeof v.verdicts==='object'&&last)last.forEach(function(r){var o=v.verdicts[r.t.slug];if(typeof o==='string'&&STATUS.hasOwnProperty(o)&&o!==r.f.status)vch.push(E(r.t.label)+(ZH?'：':': ')+E(STATUS[o])+' → <b>'+E(STATUS[r.f.status])+'</b>')});
    var LP=ZH?'（':' (', RP=ZH?'）':')', CO=ZH?'：':': ';
    var nm=function(x){var t=D.tasks[x.task],s=t.steps.filter(function(y){return y.tool===x.tool})[0];return E(s?s.name:x.tool)+LP+E(t.label)+RP};
    var li=d.rows.map(function(x){var t=D.tasks[x.task],u=D.units[t.unit],s=t.steps.filter(function(y){return y.tool===x.tool})[0];
      if(x.kind==='cap')return nm(x)+CO+E(capTxt(x.was[0],x.was[1],u))+' → <b>'+E(s.cap?capTxt(s.cap.n,s.cap.per,u):capTxt(null,null,u))+'</b>'+(x.checked?LP+(ZH?'核实于 ':'checked ')+E(x.checked)+RP:'');
      if(x.kind==='text')return nm(x)+(ZH?'：厂商原话有更新':': vendor wording updated')+(x.checked?LP+(ZH?'核实于 ':'checked ')+E(x.checked)+RP:'');
      if(x.kind==='new')return nm(x)+(ZH?'：新加入这套方案':': newly added to this plan');
      return E(x.tool)+LP+E(t.label)+RP+(ZH?'：已移出这套方案':': removed from this plan')});
    var H='<h3 class="calc-h">'+(ZH?(saved?'你在 '+E(saved)+' 保存这份方案之后':'你保存这份方案之后'):(saved?'Since you saved this plan on '+E(saved):'Since you saved this plan'))+'</h3>';
    if(!li.length&&!vch.length)H+='<p>'+(ZH?'额度没有变化':'No allowance has changed')+(d.rechecked?(ZH?'；其中 '+d.rechecked+' 个工具之后又核实过一次':'; '+d.rechecked+' tool(s) were re-checked in the meantime'):'')+(ZH?'。':'.')+'</p>';
    else H+=(vch.length?'<p><b>'+(ZH?'判定变了：':'Verdicts that changed: ')+'</b>'+vch.join(ZH?'；':'; ')+'</p>':'')+(li.length?'<ul><li>'+li.join('</li><li>')+'</li></ul>':'')+'<p class="sub-note">'+(ZH?'其余 '+(d.same+d.rechecked)+' 个工具没变。':'The other '+(d.same+d.rechecked)+' tool(s) are unchanged.')+'</p>';
    $('wpDiff').innerHTML=H; $('wpDiff').hidden=false;
  }
  function restore(data,src){
    if(!data||data.version!==1||data.product!==PID||!data.values||typeof data.values!=='object'||Array.isArray(data.values))return false;
    var v=data.values, t={};
    if(v.tasks&&typeof v.tasks==='object')Object.keys(v.tasks).forEach(function(s){var n=Number(v.tasks[s]);if(D.tasks.hasOwnProperty(s)&&isFinite(n)&&n>=0)t[s]=Math.min(n,1e7)});
    if(!Object.keys(t).length)return false;
    apply({role:v.role,tasks:t,cn:v.cn,biz:v.biz,days:v.days}); showDiff(v); msg(L.restored);
    EV('calc','/plan-restore/'+src); return true;
  }
  function fromHash(){
    var p=parsePlanHash(location.hash,D); if(!p)return;
    if(p.select){setRole(p.select);return}
    apply(p); msg('');
    EV('calc','/plan-link/'+(p.role||'custom')+'/'+Object.keys(p.tasks).length);
    $('planner').scrollIntoView();
  }
  Array.prototype.forEach.call(document.querySelectorAll('#wpRoles button'),function(b){b.addEventListener('click',function(){setRole(b.dataset.role)})});
  $('wpAdd').addEventListener('change',function(){var s=this.value;if(s&&D.tasks[s]&&!(s in st.tasks)){st.tasks[s]=D.tasks[s].example;drawTasks();live()}this.value=''});
  $('wpCn').addEventListener('change',function(){st.cn=this.checked;live()});
  $('wpBiz').addEventListener('change',function(){st.biz=this.checked;live()});
  $('wpDays').addEventListener('input',function(){var d=Number(this.value);if(d>=1&&d<=7){st.days=Math.round(d);live()}});
  $('wpGo').addEventListener('click',function(){compute(false)});
  $('wpCopy').addEventListener('click',function(){var b=this,m=markdown();try{navigator.clipboard.writeText(m).then(function(){flash(b)})}catch(e){}});
  $('wpLink').addEventListener('click',function(){var b=this,u=shareUrl();remember();try{navigator.clipboard.writeText(u).then(function(){flash(b)})}catch(e){}EV('calc','/plan-share/'+(st.role||'custom'))});
  $('wpJson').addEventListener('click',function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));a.download=PID+'.json';a.click();EV('calc','/plan-export/json')});
  $('wpImport').addEventListener('click',function(){$('wpFile').click()});
  $('wpFile').addEventListener('change',function(){var f=this.files&&this.files[0];this.value='';if(!f)return;if(f.size>200000){msg(L.badFile);return}
    var rd=new FileReader();rd.onload=function(){var d=null;try{d=JSON.parse(rd.result)}catch(e){}if(!restore(d,'file'))msg(L.badFile)};rd.readAsText(f)});
  // 会员云端保存：沿用 BPJ 工作区的同源 postMessage 协议（tools/member-studio）。
  $('wpSave').addEventListener('click',function(){
    var data=snapshot(), u=new URL(BASE+'/members'); u.searchParams.set('tool',PID); u.searchParams.set('from',location.origin);
    var win=window.open(u.href,'_blank'); if(!win){alert(L.popup);return}
    EV('calc','/plan-save/'+(st.role||'custom'));
    function h(e){if(e.source!==win||e.origin!==location.origin||!e.data||e.data.kind!=='workbench-member-ready')return;win.postMessage({kind:'workbench-save',data:data},location.origin);window.removeEventListener('message',h)}
    window.addEventListener('message',h); setTimeout(function(){window.removeEventListener('message',h)},1800000);
  });
  window.addEventListener('hashchange',function(){fromHash()});
  if(window.opener&&new URLSearchParams(location.search).get('restore')==='1'){
    var rh=function(e){if(e.source!==window.opener||e.origin!==location.origin||!e.data||e.data.kind!=='workbench-restore')return;restore(e.data.data,'cloud');window.removeEventListener('message',rh)};
    window.addEventListener('message',rh); window.opener.postMessage({kind:'workbench-ready'},location.origin);
  } else fromHash();
})();
</script>`;

  write(layout({
    title: zh ? `按岗位算 AI 方案：你的工作量，免费额度够不够（带核实日期） - ${NAME}` : `AI plan by job: do free tiers cover your workload? (verified limits) - ${NAME}`,
    description: answer.slice(0, 160),
    path,
    wide: true,
    body,
    schema: [
      crumbLd([{ name: NAME, url: `${BASE}/` }, { name: h1, url }]),
      { '@context': 'https://schema.org', '@type': 'WebApplication', name: h1, url, applicationCategory: 'BusinessApplication', operatingSystem: 'Any', isAccessibleForFree: true, dateModified: asOf, description: answer,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: zh ? '计算与导出免费；云端保存属会员' : 'Calculation and export are free; cloud saving is part of membership' } },
      faqLd(FAQ),
    ],
  }));
  pushPage(url, '0.9');
  return { tasks: Object.keys(D.tasks).length, roles: D.roles.length, tools: nTools, withCap: nCap, asOf };
}
