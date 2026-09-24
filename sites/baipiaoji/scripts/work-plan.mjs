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
        return {
          tool: t.slug, name: t.name, action: plain(st.action),
          quota: clip(L.quota || t.free, 150), checked: L.checked || null,
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
// 同一任务里、满足约束、有同单位官方数字的工具：免费容量折成「每周」后相加，与读者的每周量比较。
export function fitTask(t, vol, cn, biz) {
  const PERW = { day: 7, week: 1, month: 7 / 30 };
  const need = vol * (t.per === 'day' ? 7 : 1);
  let rec = 0;
  const once = [], unlimited = [], used = [], excluded = [], nofig = [];
  t.steps.forEach((s, i) => {
    const why = cn && s.cn === 0 ? 'cn' : biz && s.biz === 'no' ? 'biz' : '';
    if (why) { excluded.push({ i, why }); return; }
    if (!s.cap) { nofig.push(i); return; }
    if (s.cap.per === 'unlimited') { unlimited.push(i); used.push(i); return; }
    if (s.cap.per === 'once') { once.push(i); used.push(i); return; }
    rec += s.cap.n * PERW[s.cap.per]; used.push(i);
  });
  // partial：有官方数字的工具加起来不够，但同一任务里还有官方没公布上限的工具——不能判「不够」，只能说「说不准」。
  const status = unlimited.length ? 'ok' : !used.length ? 'unknown' : rec >= need ? 'ok' : nofig.length ? 'partial' : 'short';
  return { need, rec, once, unlimited, used, excluded, nofig, status };
}

const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

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
    ? `选岗位、填你每周的工作量，页面会把每个任务该用的工具按步骤排好，并算出：这些工具的免费额度加起来，够不够你的量。${Object.keys(D.tasks).length} 类任务共用到 ${nTools} 款工具，其中 ${nCap} 款的免费上限有官方公布的同单位数字，直接参与计算；其余如实标「官方未公布」，不估算。数据截至 ${asOf}。`
    : `Pick a role and enter your weekly workload. The page lines up the tools for each task, step by step, and works out whether their free tiers, added together, cover your volume. ${Object.keys(D.tasks).length} kinds of task draw on ${nTools} of the directory's entries; ${nCap} of those have an officially published figure in the same unit and go into the maths, the rest say "not published" instead of an estimate. Data as of ${asOf}.`;

  const FAQ = zh ? [
    { q: '这个规划器是怎么算的？', a: '每个任务的工具与步骤来自本站 26 套 0 元方案；每个工具的免费上限来自本站逐家核实的配额数据（带官方来源与核实日期）。只有当厂商公布了与你的任务同单位的数字（如每天几张图、每月几分钟），才折算到你填的周期并参与加总；按你的约束（国内直连 / 要商用）排除不合格的工具后，把剩下的免费容量相加，与你的工作量比较。' },
    { q: '为什么有的任务显示「官方未公布」？', a: '很多工具（尤其对话类）官方不公布具体条数。本站的规矩是查不到官方数字就不写数字，所以这类任务只给步骤与工具，不给「够 / 不够」的结论。' },
    { q: '免费版和会员有什么区别？', a: '计算、方案、导出 JSON、复制 Markdown 全部免费。会员是本站已上线的云端工作区（9 USDT / 30 天，不自动续费）：把方案存到服务端、保留版本历史、换设备恢复。会员不包含团队账号，也不承诺自动监控。' },
    { q: '岗位和任务是谁定的？', a: '是编辑按常见工作整理的默认值，页面上标明了「示例」。你可以增删任务、改工作量，计算只看你最后填的数。' },
    { q: '会推荐付费工具或带推广链接吗？', a: '不带任何推广或返利链接。某个任务的免费额度不够时，页面会列出该工具官方公布的付费档，供你自己判断。' },
  ] : [
    { q: 'How does the planner calculate?', a: "Each task's tools and steps come from this site's 26 zero-cost plans; each tool's free ceiling comes from our vendor-by-vendor quota data, with official sources and check dates. Only where a vendor publishes a figure in the same unit as your task (images a day, minutes a month) is it converted to your period and added up. Tools that fail your constraints (reachable from mainland China, commercial use) are left out, and the remaining free capacity is compared with your workload." },
    { q: 'Why do some tasks say "not published"?', a: 'Many tools, chat apps especially, publish no count. Our rule is no official number, no number, so those tasks get steps and tools but no covered / not-covered verdict.' },
    { q: 'What does membership add?', a: "Calculation, the plan, JSON export and Markdown copy are all free. Membership is the site's existing cloud workspace (9 USDT for 30 days, no auto-renewal): the plan is stored on the server with version history and can be restored on another device. No team accounts, and no automatic monitoring is promised." },
    { q: 'Who decided the roles and tasks?', a: 'They are editorial defaults for common jobs, marked "example" on the page. Add or remove tasks and change the volumes; the maths only uses what you enter.' },
    { q: 'Does it push paid tools or carry referral links?', a: 'No referral or affiliate links. When a free tier falls short, the page shows the paid tier the vendor itself publishes, for you to judge.' },
  ];

  // 无 JS 也能读的静态层：每个岗位一张表（任务 → 工具 → 官方免费上限）。爬虫与 .md 镜像读到的就是这一层。
  const staticRoles = D.roles.map((r) => `<details class="wp-role" id="role-${esc(r.id)}"><summary><b>${esc(r.name)}</b><span>${r.tasks.length} ${zh ? '个任务' : 'tasks'}</span></summary>
    <div class="lt-scroll"><table><thead><tr><th>${zh ? '任务' : 'Task'}</th><th>${zh ? '按步骤用的工具' : 'Tools, in order'}</th><th>${zh ? '有官方同单位数字的免费上限' : 'Free ceilings with an official figure'}</th></tr></thead><tbody>${r.tasks.map((slug) => {
      const t = D.tasks[slug];
      const caps = t.steps.filter((s) => s.cap).map((s) => `${esc(s.name)}：${s.cap.per === 'unlimited' ? (zh ? '不限' : 'unlimited') : `${s.cap.approx ? '≈' : ''}${s.cap.n} ${esc(D.units[t.unit])} ${perW[s.cap.per]}`}`);
      return `<tr><td><a href="${BASE}/plans/${esc(slug)}.html">${esc(t.label)}</a></td><td>${t.steps.map((s) => `<a href="${BASE}/tools/${esc(s.tool)}.html">${esc(s.name)}</a>`).join(' → ')}</td><td>${caps.length ? caps.join('；') : (zh ? '官方未公布' : 'not published')}</td></tr>`;
    }).join('')}</tbody></table></div></details>`).join('\n');

  const L = zh ? {
    s1: '① 你是做什么的', s2: '② 你每周（或每天）要做多少', s3: '③ 约束', cn: '只要国内能直连的', biz: '产出要商用', go: '算我的方案', example: '示例量，改成你的',
    add: '＋ 加一个任务', none: '先选一个岗位，或加一个任务。', exportJ: '下载 JSON', copyMd: '复制为 Markdown', save: '保存到云端（会员）',
    saveNote: '云端保存、版本历史与换设备恢复属于本站云端工作区会员（9 USDT / 30 天，不自动续费）。计算与导出永远免费。',
    copied: '已复制', popup: '请允许弹出会员工作区标签页，或先下载 JSON。', restored: '已从云端恢复方案，请核对后再用。',
  } : {
    s1: '① What do you do', s2: '② How much of it, per week (or per day)', s3: '③ Constraints', cn: 'Only tools reachable from mainland China', biz: 'Output is for commercial use', go: 'Work out my plan', example: 'example volume — change it',
    add: '+ Add a task', none: 'Pick a role or add a task first.', exportJ: 'Download JSON', copyMd: 'Copy as Markdown', save: 'Save to cloud (members)',
    saveNote: "Cloud saving, version history and restoring on another device are part of this site's cloud workspace membership (9 USDT for 30 days, no auto-renewal). Calculating and exporting stay free.",
    copied: 'Copied', popup: 'Allow the member workspace tab to open, or download the JSON first.', restored: 'Plan restored from the cloud — review it before use.',
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
    <h2 class="group-title">${L.s2}</h2>
    <div id="wpTasks" class="wp-tasks"><p class="gs-none">${L.none}</p></div>
    <p><select id="wpAdd" aria-label="${esc(L.add)}"><option value="">${esc(L.add)}</option>${Object.values(D.tasks).map((t) => `<option value="${esc(t.slug)}">${esc(t.label)}</option>`).join('')}</select></p>
    <h2 class="group-title">${L.s3}</h2>
    <div class="wp-flags"><label><input type="checkbox" id="wpCn"> ${esc(L.cn)}</label> <label><input type="checkbox" id="wpBiz"> ${esc(L.biz)}</label></div>
    <p><button type="button" id="wpGo" class="wp-go">${esc(L.go)}</button></p>
    <div id="wpOut" class="calc-out" aria-live="polite"></div>
    <div id="wpActions" class="wp-actions" hidden><button type="button" id="wpCopy">${esc(L.copyMd)}</button> <button type="button" id="wpJson">${esc(L.exportJ)}</button> <button type="button" id="wpSave">${esc(L.save)}</button>
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
      <li>${zh ? '容量只取厂商公布的、与任务同单位的数字：每天的 ×7，每月的 ×7/30 折成每周；一次性额度单独算「能撑几周」。' : 'Capacity uses only figures the vendor publishes in the same unit as the task: daily ×7, monthly ×7/30 to get a week; one-off grants are shown as how many weeks they last.'}</li>
      <li>${zh ? '同一任务里可用工具的免费容量相加——这是「一整套」的意思：一家不够，几家叠起来可能够。' : 'Free capacity of the usable tools in a task is added up — that is what a whole plan means: one vendor may fall short where several together do not.'}</li>
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
  var ZH=${zh}, BASE=${JSON.stringify(BASE)}, PID=${JSON.stringify(PRODUCT_ID)}, L=${safeJson(L)};
  var D=${safeJson(D)};
  var PER=${safeJson(perW)};
  var BIZ=${safeJson(zh ? { yes: '可商用', no: '不可商用', conditional: '有条件商用', depends: '看模型', unstated: '官方没说', '': '未判定' } : { yes: 'commercial OK', no: 'no commercial use', conditional: 'conditional', depends: 'depends on model', unstated: 'terms silent', '': 'not checked' })};
  var st={role:'',tasks:{},cn:false,biz:false};
  function $(id){return document.getElementById(id)}
  function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function EV(n,p){try{if(window.bpjEv)window.bpjEv(n,p)}catch(e){}}
  function fmt(n){return (Math.round(n*10)/10).toLocaleString(ZH?'zh-CN':'en-US')}
  function setRole(id){
    var r=D.roles.filter(function(x){return x.id===id})[0]; if(!r)return;
    st.role=id; st.tasks={}; r.tasks.forEach(function(s){st.tasks[s]=D.tasks[s].example});
    Array.prototype.forEach.call(document.querySelectorAll('#wpRoles button'),function(b){b.classList.toggle('is-sel',b.dataset.role===id)});
    drawTasks(); $('wpOut').innerHTML=''; $('wpActions').hidden=true;
  }
  function drawTasks(){
    var ks=Object.keys(st.tasks);
    if(!ks.length){$('wpTasks').innerHTML='<p class="gs-none">'+E(L.none)+'</p>';return}
    $('wpTasks').innerHTML=ks.map(function(s){var t=D.tasks[s];
      return '<div class="wp-task"><label>'+E(t.label)+' <small>'+E(t.measure||'')+'</small></label> '+
        '<input type="number" min="0" max="10000000" step="1" data-t="'+E(s)+'" value="'+E(st.tasks[s])+'" aria-label="'+E(t.label)+'"> '+
        '<span>'+E(D.units[t.unit])+' '+E(PER[t.per])+'</span> <small class="wp-ex">'+E(L.example)+'</small> '+
        '<button type="button" class="wp-x" data-x="'+E(s)+'" aria-label="×">×</button></div>'}).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#wpTasks input'),function(i){i.addEventListener('input',function(){var v=Number(i.value);st.tasks[i.dataset.t]=isFinite(v)&&v>=0?Math.min(v,1e7):0})});
    Array.prototype.forEach.call(document.querySelectorAll('#wpTasks .wp-x'),function(b){b.addEventListener('click',function(){delete st.tasks[b.dataset.x];drawTasks()})});
  }
  var fitTask=${fitTask.toString()};
  var WHY={cn:ZH?'需科学上网':'not reachable from mainland China',biz:ZH?'免费档不可商用':'free tier bars commercial use'};
  function compute(){
    var ks=Object.keys(st.tasks); if(!ks.length){$('wpOut').innerHTML='<p class="gs-none">'+E(L.none)+'</p>';return null}
    var res=ks.map(function(s){var t=D.tasks[s];return {t:t,vol:st.tasks[s],f:fitTask(t,st.tasks[s],st.cn,st.biz)}});
    var n={ok:0,short:0,partial:0,unknown:0}; res.forEach(function(r){n[r.f.status]++});
    var H='<p class="answer">'+(ZH?('你选的 '+res.length+' 个任务里：<b>'+n.ok+'</b> 个免费额度够用；<b>'+n.short+'</b> 个按官方数字不够；<b>'+n.partial+'</b> 个说不准（有数字的不够，其余工具官方没公布上限）；<b>'+n.unknown+'</b> 个官方没公布数字，只给步骤。')
      :('Of your '+res.length+' tasks: <b>'+n.ok+'</b> covered by free tiers; <b>'+n.short+'</b> short on the published figures; <b>'+n.partial+'</b> uncertain (the published figures fall short, the other tools publish none); <b>'+n.unknown+'</b> with no published figure — steps only.'))+'</p>';
    res.forEach(function(r){var t=r.t,f=r.f,u=D.units[t.unit];
      var verdict=f.status==='ok'?(f.unlimited.length?(ZH?'够用：有不限量的工具':'Covered: an unlimited tool is available'):(ZH?'够用：免费合计每周约 '+fmt(f.rec)+' '+u+'，你要 '+fmt(f.need):'Covered: about '+fmt(f.rec)+' '+u+' a week free, you need '+fmt(f.need)))
        :f.status==='short'?(ZH?'不够：免费合计每周约 '+fmt(f.rec)+' '+u+'，你要 '+fmt(f.need)+'，差 '+fmt(f.need-f.rec):'Short: about '+fmt(f.rec)+' '+u+' a week free, you need '+fmt(f.need)+' — '+fmt(f.need-f.rec)+' short')
        :f.status==='partial'?(ZH?'说不准：有官方数字的工具每周合计约 '+fmt(f.rec)+' '+u+'，不到你的 '+fmt(f.need)+'；另外 '+f.nofig.length+' 个工具官方没公布上限，能否补足要看它们各自页面':'Uncertain: tools with a published figure add up to about '+fmt(f.rec)+' '+u+' a week, below your '+fmt(f.need)+'; '+f.nofig.length+' other tool(s) publish no cap, so whether they close the gap depends on their own pages')
        :(ZH?'官方未公布同单位数字：按步骤用，额度以各家页面为准':'No published figure in this unit: follow the steps, the allowance is whatever each vendor shows');
      if(f.once.length)verdict+=(ZH?'；另有一次性额度 ':'; plus one-off grants: ')+f.once.map(function(i){var s=t.steps[i];return E(s.name)+' '+fmt(s.cap.n)+' '+u+(f.need?(ZH?'（按你的量约撑 '+fmt(s.cap.n/f.need)+' 周）':' (about '+fmt(s.cap.n/f.need)+' weeks at your volume)'):'')}).join(', ');
      H+='<div class="calc-row '+({ok:'calc-ok',short:'calc-no',partial:'calc-warn'}[f.status]||'calc-un')+'"><h3 class="calc-h"><a href="'+BASE+'/plans/'+E(t.slug)+'.html">'+E(t.label)+'</a><em>'+E(fmt(r.vol))+' '+E(u)+' '+E(PER[t.per])+'</em></h3><p><b>'+verdict+'</b></p><ol>';
      t.steps.forEach(function(s,idx){var ex=f.excluded.filter(function(x){return x.i===idx})[0];
        var cap=s.cap?(s.cap.per==='unlimited'?(ZH?'不限':'unlimited'):(s.cap.approx?'≈':'')+fmt(s.cap.n)+' '+u+' '+PER[s.cap.per]):(ZH?'同单位数字：官方未公布':'same-unit figure: not published');
        H+='<li'+(ex?' class="wp-out"':'')+'><b><a href="'+BASE+'/tools/'+E(s.tool)+'.html">'+E(s.name)+'</a></b> — '+E(s.action)+
          '<br><small>'+E(cap)+(s.cap&&s.cap.note?' · '+E(s.cap.note):'')+' · '+E(BIZ[s.biz]||BIZ[''])+(s.cn===1?(ZH?' · 国内直连':' · works in China'):s.cn===0?(ZH?' · 需科学上网':' · needs a VPN in China'):(ZH?' · 国内可达性未标注':' · China reachability not recorded'))+(s.checked?(ZH?' · 核实于 ':' · checked ')+E(s.checked):'')+'</small>'+
          (ex?'<br><small class="wp-why">'+(ZH?'未计入：':'Left out: ')+E(WHY[ex.why])+'</small>':'')+
          ((f.status==='short'||f.status==='partial')&&s.paid?'<br><small>'+(ZH?'付费档（官方口径）：':'Paid tier (vendor wording): ')+E(s.paid)+'</small>':'')+'</li>'});
      H+='</ol>'+(t.prompt?'<details><summary>'+(ZH?'可以直接用的提示词':'A prompt you can use as is')+'</summary><p>'+E(t.prompt)+'</p></details>':'')+'</div>';
    });
    $('wpOut').innerHTML=H; $('wpActions').hidden=false;
    EV('calc','/plan/'+(st.role||'custom')+'/'+ks.length+(st.cn?'+cn':'')+(st.biz?'+biz':''));
    return res;
  }
  function markdown(){var res=compute();if(!res)return '';var m=['# '+(ZH?'我的 AI 工作方案':'My AI work plan'),''];
    res.forEach(function(r){m.push('## '+r.t.label+' — '+fmt(r.vol)+' '+D.units[r.t.unit]+' '+PER[r.t.per]);r.t.steps.forEach(function(s,i){m.push((i+1)+'. '+s.name+': '+s.action)});if(r.t.prompt)m.push('','> '+r.t.prompt);m.push('')});
    m.push(ZH?'来源：白嫖计 baipiaoji.com/work-plan（额度带核实日期，以官方页为准）':'Source: Baipiaoji baipiaoji.com/en/work-plan (allowances carry check dates; the official page wins)');return m.join('\\n')}
  function snapshot(){return {version:1,product:PID,values:{role:st.role,tasks:st.tasks,cn:st.cn,biz:st.biz}}}
  function restore(data){
    if(!data||data.version!==1||data.product!==PID||!data.values||typeof data.values!=='object')return false;
    var v=data.values, t={};
    if(v.tasks&&typeof v.tasks==='object')Object.keys(v.tasks).forEach(function(s){var n=Number(v.tasks[s]);if(D.tasks[s]&&isFinite(n)&&n>=0)t[s]=Math.min(n,1e7)});
    st.role=D.roles.some(function(r){return r.id===v.role})?v.role:''; st.tasks=t; st.cn=v.cn===true; st.biz=v.biz===true;
    $('wpCn').checked=st.cn; $('wpBiz').checked=st.biz;
    Array.prototype.forEach.call(document.querySelectorAll('#wpRoles button'),function(b){b.classList.toggle('is-sel',b.dataset.role===st.role)});
    drawTasks(); compute(); return true;
  }
  Array.prototype.forEach.call(document.querySelectorAll('#wpRoles button'),function(b){b.addEventListener('click',function(){setRole(b.dataset.role)})});
  $('wpAdd').addEventListener('change',function(){var s=this.value;if(s&&D.tasks[s]&&!(s in st.tasks)){st.tasks[s]=D.tasks[s].example;drawTasks()}this.value=''});
  $('wpCn').addEventListener('change',function(){st.cn=this.checked});
  $('wpBiz').addEventListener('change',function(){st.biz=this.checked});
  $('wpGo').addEventListener('click',compute);
  $('wpCopy').addEventListener('click',function(){var b=this,m=markdown();try{navigator.clipboard.writeText(m).then(function(){b.textContent=L.copied})}catch(e){}});
  $('wpJson').addEventListener('click',function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));a.download=PID+'.json';a.click();EV('calc','/plan-export/json')});
  // 会员云端保存：沿用 BPJ 工作区的同源 postMessage 协议（tools/member-studio）。
  $('wpSave').addEventListener('click',function(){
    var data=snapshot(), u=new URL(BASE+'/members'); u.searchParams.set('tool',PID); u.searchParams.set('from',location.origin);
    var win=window.open(u.href,'_blank'); if(!win){alert(L.popup);return}
    EV('calc','/plan-save/'+(st.role||'custom'));
    function h(e){if(e.source!==win||e.origin!==location.origin||!e.data||e.data.kind!=='workbench-member-ready')return;win.postMessage({kind:'workbench-save',data:data},location.origin);window.removeEventListener('message',h)}
    window.addEventListener('message',h); setTimeout(function(){window.removeEventListener('message',h)},1800000);
  });
  if(window.opener&&new URLSearchParams(location.search).get('restore')==='1'){
    var rh=function(e){if(e.source!==window.opener||e.origin!==location.origin||!e.data||e.data.kind!=='workbench-restore')return;if(restore(e.data.data)){var p=document.createElement('p');p.className='sub-note';p.textContent=L.restored;$('planner').insertBefore(p,$('wpOut'))}window.removeEventListener('message',rh)};
    window.addEventListener('message',rh); window.opener.postMessage({kind:'workbench-ready'},location.origin);
  }
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
