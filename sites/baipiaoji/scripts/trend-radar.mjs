#!/usr/bin/env node
// 趋势雷达：把站内每天已经在产生的五路信号，聚合成一份排序后的行动队列。
//
// 「预判趋势」在本站语境下的诚实定义：对**领先指标**排序，不是预言。
// 五路信号各自都太弱，聚在一起才有形状——
//   1. 外部热度（discovery.json）：HN 上正在冒头的新工具，分数是可核实的热度证据
//   2. 厂商异动（limits-history.json）：同类目 14 天内 ≥2 条变更 = 这个类目在动，
//      通常意味着竞价换档期——该把整类都复核一遍，而不是等 30 天阈值慢慢到期
//   3. 内容衰减（tools.json 的 checked 老化）：本站卖的就是新鲜度，核实日期是保质期
//   4. 需求缺口（backlog.json）：用户搜了、站内没有——最直接的行动理由
//   5. 来源复猎（no-source.json 轮询）：「查不到官方数字」不是永久判决，
//      厂商随时可能把数字挂出来；按日轮换每天复查两条，拒绝清单才不会变成化石
//
// 噪音守则（照抄 scout 框架的教训）：每路信号有门槛（低于门槛宁可空手），
// 队列上限 12 条（塞 50 条垃圾进去，三天后就没人再看它），
// 每条注明来源与依据——行动项必须可追问「凭什么」。
//
// 边界不变：雷达只排队，不写事实。所有核实动作仍由人或会话按硬规则执行。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = new Date().toISOString().slice(0, 10);
const read = (f, fb) => (existsSync(join(root, f)) ? JSON.parse(readFileSync(join(root, f), 'utf8')) : fb);

const tools = read('data/tools.json', []);
const bySlug = new Map(tools.map((t) => [t.slug, t]));
const discovery = read('data/discovery.json', { items: [] });
const history = read('data/limits-history.json', { log: [] });
const backlog = read('data/backlog.json', { items: [] });
const nosrc = read('data/no-source.json', { items: [] });

const items = [];
const daysBetween = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);

// ── 1. 外部热度：HN 候选 ──
// 候选必须能退休：2026-08-17 发现 Ante 上一轮已收录，雷达却仍以 55 分挂着
// 「站内尚未收录」——那句话已经是假的。与前几条修正同源：**行动做完后信号必须消失**，
// 否则待办队列会把已完成的事一直摆在最前面，把真正没做的挤下去。
// 匹配取候选名的第一段（逗号/破折号/冒号之前）做**全等**比较，不用包含匹配——
// 包含匹配会把「Ante」误伤成任何含 ante 的名字，宁可漏退休也不能错杀候选。
const headName = (n) => String(n || '').split(/[,，:：\u2013\u2014—-]/)[0].trim().toLowerCase();
const knownNames = new Set(tools.flatMap((t) => [String(t.name || '').toLowerCase(), String(t.slug || '').toLowerCase()]));
for (const c of discovery.items.filter((x) => x.status === 'candidate' && !knownNames.has(headName(x.name)))) {
  items.push({
    id: `candidate:${c.host}`,
    type: 'verify_candidate',
    title: `核实候选：${c.name}`,
    why: `HN ${c.points} 分 / ${c.comments} 评论（${c.found} 发现）——外部热度已验证，站内尚未收录`,
    action: `按收录标准核实 ${c.url}；合格则中英同步入库，limits 走 limits-edit.mjs`,
    refs: [c.url, c.src],
    score: Math.min(60, Math.round((c.points || 0) / 3) + Math.round((c.comments || 0) / 5)),
  });
}

// ── 2. 厂商异动：类目 14 天窗口 ──
const recent = (history.log || []).filter((e) => daysBetween(TODAY, e.d) <= 14 && bySlug.get(e.slug));
const byCat = {};
for (const e of recent) {
  const cat = bySlug.get(e.slug).category;
  (byCat[cat] = byCat[cat] || []).push(e);
}
for (const [cat, evs] of Object.entries(byCat)) {
  // 三条修正，起因是 chat 类连续三天霸榜、而推高它的其实是我们自己：
  // ① 按「动了几个工具」计，不按日志行数——同一工具同日的 new+changed 是两行，
  //    却只代表一次异动（grok 2026-08-08 就是这样被算成两条的）。
  // ② 只改了 source/checked 的行不算异动：那是我们例行复核，事实本身没变，
  //    把它算进去等于自己的动作把自己的待办分数越推越高。
  // ③ 行动做完后信号必须消失：待复核 peers 只取「上次核实早于该类最近一次异动」的，
  //    都复核过就说明这条已经执行完了，不再排队。
  // ④ 2026-08-17 加的第四条，起因与②同源、形态是新的：
  //    08-15 我们给 14 个工具**新增**了 paid 字段（此前根本不追踪付费档），
  //    limits-history 如实记成 changed，于是视频类与 API 类同日被抬成 category_hot 95/65 分。
  //    但厂商什么都没做——动的是我们自己新开了一个维度。
  //    这条信号问的是「免费档动了、同类会不会跟进」，所以只认免费档核心字段的异动；
  //    paid 是另一回事（撞墙之后买哪档），它变不构成「免费额度在动」的证据。
  const FREE_CORE = new Set(['quota', 'wall', 'free', 'how']);
  const real = evs.filter((e) => {
    const f = e.f || [];
    if (f.every((x) => x === 'source' || x === 'checked')) return false;   // ② 例行复核
    if (f.length && f.every((x) => !FREE_CORE.has(x))) return false;       // ④ 只动了非免费档字段
    return true;
  });
  const movedSlugs = [...new Set(real.map((e) => e.slug))];
  if (movedSlugs.length < 2) continue;   // 单个工具变动是常态，两个以上才算「类目在动」
  const lastMove = real.map((e) => e.d).sort().pop();
  const names = movedSlugs.map((s) => bySlug.get(s).name);
  // 「落后」必须落后得有意义：我们自己复核一轮会把 lastMove 推到当天，
  // 若 peers 只要求 checked < lastMove，昨天刚对抗复核过的条目立刻又变成「待复核」——
  // 信号被自己的行动抬高（2026-08-14 实例：gemini 昨日确认无变化，今日又被点名）。
  // 改为至少落后 3 天才算没跟进。
  const staleBefore = new Date(new Date(lastMove) - 3 * 86400000).toISOString().slice(0, 10);
  const peers = tools.filter((t) => t.category === cat && t.limits
    && !movedSlugs.includes(t.slug)
    && String(t.limits.checked || '') < staleBefore);
  if (!peers.length) continue;   // 其余同类都已在异动之后复核过——这条已完成
  items.push({
    id: `cathot:${cat}`,
    type: 'category_hot',
    title: `类目异动：${cat}（14 天内 ${movedSlugs.length} 个工具实质变更）`,
    why: `${names.join('、')}接连变动——同类厂商通常跟进换档，等 30 天复核阈值会慢半拍`,
    action: `提前复核 ${cat} 类尚未跟进的 ${peers.length} 条已核实额度（上次核实落后异动 3 天以上（早于 ${staleBefore}）），重点看定价页与帮助中心`,
    refs: peers.slice(0, 8).map((t) => t.slug),
    score: 20 + movedSlugs.length * 15,
  });
}

// ── 3. 内容衰减：核实日期老化 ──
// decay 框架的原话照办：不给没病的内容开药。30 天内的一律不出现在队列里。
const stale = tools
  .filter((t) => t.limits && daysBetween(TODAY, t.limits.checked) > 30)
  .sort((a, b) => Date.parse(a.limits.checked) - Date.parse(b.limits.checked))
  .slice(0, 5);
for (const t of stale) {
  const age = daysBetween(TODAY, t.limits.checked);
  items.push({
    id: `stale:${t.slug}`,
    type: 'refresh',
    title: `复核过期：${t.name}（${age} 天未核实）`,
    why: `核实日期是判定的保质期，本站卖的就是新鲜度${t.hot ? '；该工具带 hot 标记，流量优先' : ''}`,
    action: `复核官方页面，走 limits-edit.mjs 两步写入；数字未变也要刷新 checked`,
    refs: [t.slug],
    score: Math.min(50, age - 30 + (t.hot ? 12 : 0)),
  });
}

// ── 4. 需求缺口：搜过但没有 ──
for (const b of (backlog.items || []).filter((x) => x.status === 'todo' && x.term)) {
  items.push({
    id: `demand:${b.term}`,
    type: 'demand_gap',
    title: `需求缺口：「${b.term}」`,
    why: `站内搜索无结果 ${b.demand || '?'} 次（${b.first_seen || '?'} 首见）——用户亲手说了想要什么`,
    action: '评估是否值得成方案/收录；不合适也要在调研文档记下不做的理由',
    refs: [b.term],
    score: Math.min(40, 10 + (b.demand || 0) * 3),
  });
}

// ── 5. 来源复猎：拒绝清单按日轮换 ──
// 「官方未公布」会过期——厂商把数字挂出来的那天，最先发现的站赢。
// 每天固定复查两条，用日期做轮换种子：无状态、可复现、不用记上次查到哪。
if (nosrc.items?.length) {
  const seed = Math.floor(Date.parse(TODAY) / 86400000);
  for (let i = 0; i < Math.min(2, nosrc.items.length); i++) {
    const x = nosrc.items[(seed + i) % nosrc.items.length];
    const t = bySlug.get(x.slug);
    if (!t) continue;
    items.push({
      id: `sourcehunt:${x.slug}`,
      type: 'source_recheck',
      title: `复猎来源：${t.name}`,
      why: '在拒绝清单上——「查不到官方数字」不是永久判决，今天轮到它复查',
      action: '重搜官方定价页/帮助中心；查到则填 limits 并从拒绝清单撤下（contradiction 门禁会盯着）',
      refs: [x.slug],
      score: 10,
    });
  }
}

// ── 7 前置. AI 助手引流监听 ──
// getecoback 对照实验的教训：AI 引用与 Google 排名是两条独立的分发线。
// 本站 Google 线已通、AI 助手线为零——第一个 AI 引流点击是重要的转折信号，
// 出现即置顶提醒（数据来自 CI 每日导出的流量快照；快照断供时静默跳过）。
const AI_REF = /chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google|copilot\.microsoft|bing\.com\/chat|you\.com|phind\.com|kagi\.com/i;
const snap = read('data/traffic-snapshot.json', null);
const snapRows = Array.isArray(snap) ? snap : (snap?.[0]?.results || snap?.results || []);
const aiRefs = (snapRows || []).filter((r) => r.ref && AI_REF.test(r.ref));
if (aiRefs.length) {
  const by = {};
  for (const r of aiRefs) by[r.ref] = (by[r.ref] || 0) + (r.n || 1);
  items.push({
    id: 'aiflow:first',
    type: 'ai_referral',
    title: `AI 助手引流出现：${Object.entries(by).map(([k, v]) => `${k}×${v}`).join('、')}`,
    why: '这是 AI 引用第一次转化为点击——哪些页面被引用、答的是什么问题，决定下一批内容怎么写',
    action: '查快照中这些 ref 的落地页；把被引用页的模式（问题形、数据形、日期形）复制到同类页面',
    refs: [...new Set(aiRefs.map((r) => r.path))].slice(0, 8),
    score: 70,
  });
}

// ── 8 前置. MCP 发现面守望 ──
// 发现不是一次性动作：注册表可能下架条目、发现面可能被某次改动弄坏。
// CI 每日体检写 data/mcp-status.json，这里把异常变成行动项——正常时一行都不出。
const mcpStatus = read('data/mcp-status.json', null);
if (mcpStatus) {
  const bad = [];
  if (!mcpStatus.registry_listed) bad.push('官方 Registry 未收录/掉线');
  if (mcpStatus.well_known !== 200) bad.push(`well-known 清单 HTTP ${mcpStatus.well_known}`);
  if (mcpStatus.mcp_html !== 200) bad.push(`/mcp.html HTTP ${mcpStatus.mcp_html}`);
  if (bad.length) {
    items.push({
      id: 'mcpsurface:bad',
      type: 'mcp_surface',
      title: `MCP 发现面异常：${bad.join('；')}`,
      why: `体检于 ${mcpStatus.checked}——发现面断一天，agent 生态就少看见一天`,
      action: '查 mcp-publish workflow 日志与最近改动；Registry 未收录则核对 server.json 校验错误并重新发布',
      refs: ['server.json', '.github/workflows/mcp-publish.yml'],
      score: 50,
    });
  }
}

// ── 6. 战略推进（PRD-own-tools v2 的确定性目标）──
// G1（115/115 数值结构化）是工具工厂的进度条：每结构化一类，自动长出一族工具。
// 雷达负责把「下一个该结构化谁」排进队列——顺序按已证实的真实点击优先。
const QUOTA_FILES = {
  api: 'data/api-quotas.json', video: 'data/video-quotas.json', coding: 'data/coding-quotas.json',
  chat: 'data/chat-quotas.json', image: 'data/image-quotas.json', audio: 'data/audio-quotas.json',
  design: 'data/design-quotas.json', office: 'data/office-quotas.json', writing: 'data/writing-quotas.json',
  search: 'data/search-quotas.json', study: 'data/study-quotas.json', agent: 'data/agent-quotas.json',
};
const structuredCats = Object.keys(QUOTA_FILES).filter((c) => existsSync(join(root, QUOTA_FILES[c])));
const g1done = structuredCats.reduce((n, c) => n + (read(QUOTA_FILES[c], { entries: [] }).entries || []).length, 0);
const g1total = tools.filter((t) => t.limits).length;
// 优先级 = 真实点击证据（video/coding 有 Google 点击）> 数据密度
const PRIORITY = ['video', 'coding', 'chat', 'image', 'audio', 'design', 'office', 'writing', 'search', 'study', 'agent'];
const nextCat = PRIORITY.find((c) => !structuredCats.includes(c)) || null;
if (nextCat) {
  const catN = tools.filter((t) => t.category === nextCat && t.limits).length;
  items.push({
    id: `factory:${nextCat}`,
    type: 'factory',
    title: `工厂推进：结构化 ${nextCat} 类 limits 数值（${catN} 条）`,
    why: `PRD-own-tools v2 G1 进度 ${g1done}/${g1total}——每结构化一类，自动长出一族数据驱动工具`,
    action: `产出 ${QUOTA_FILES[nextCat]}（只从已核实散文提取官方数字，无官方折算明说不代算）→ 按 llm-api-calculator 模式复制该类工具页 → 真机验证上线`,
    refs: tools.filter((t) => t.category === nextCat && t.limits).map((t) => t.slug),
    score: 45,
  });
}

items.sort((a, b) => b.score - a.score);
const agenda = {
  generated: TODAY,
  note: '由 scripts/trend-radar.mjs 每日聚合五路站内信号生成。只排队不写事实；核实动作按硬规则执行。分数是领先指标的相对排序，不是预测。',
  counts: { candidate: discovery.items.length, category_hot: Object.values(byCat).filter((v) => v.length >= 2).length, stale: stale.length, demand: (backlog.items || []).filter((x) => x.status === 'todo').length },
  strategy: { g1_structured: g1done, g1_total: g1total, structured_cats: structuredCats, next_structuring: nextCat },
  items: items.slice(0, 12),
};
writeFileSync(join(root, 'data/agenda.json'), `${JSON.stringify(agenda, null, 2)}\n`);

console.log(`📡 趋势雷达：${agenda.items.length} 条行动项（候选 ${agenda.counts.candidate} / 类目异动 ${agenda.counts.category_hot} / 过期 ${agenda.counts.stale} / 需求缺口 ${agenda.counts.demand}）`);
for (const it of agenda.items) console.log(`   [${String(it.score).padStart(2)}] ${it.title}`);
if (!agenda.items.length) console.log('   队列为空——门槛之下宁可空手，不制造假行动项');
