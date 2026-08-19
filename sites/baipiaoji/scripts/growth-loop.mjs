#!/usr/bin/env node
// 每两天跑一次的增长闭环：取数 → 自动优化 → 产出待办 → 出报告。
//
// 设计边界（重要）：只自动执行「可逆、不需要判断」的改动。
// 绝不自动删工具、绝不自动发布 AI 写的正文——那会毁掉「每条都核实过」这个差异化，
// 而这是本站唯一别人抄不动的东西。需要判断的一律进待办清单交给人。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchGa4 } from './ga4.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const write = (p, o) => writeFileSync(join(root, p), JSON.stringify(o, null, 2) + '\n');

const site = read('data/site.json');
const tools = read('data/tools.json');
const solutions = read('data/solutions.json');
const health = existsSync(join(root, 'data/health.json')) ? read('data/health.json') : { results: [] };
const TODAY = process.env.LOOP_DATE || new Date().toISOString().slice(0, 10);

const changes = [];   // 自动执行了什么
const actions = [];   // 需要人做什么
const dropped = [];   // 因为数据不足而没做什么（明说，不静默跳过）

// ---------- 1. 取数 ----------
const ga = await fetchGa4({ days: 14 });
if (!ga) {
  dropped.push('GA4 未取到数据（未配置 GA4_SERVICE_ACCOUNT_JSON / GA4_PROPERTY_ID，或调用失败），本轮仅使用站内信号。');
}

// ---------- 2. 自动优化 A：按真实点击重排各分类推荐位 ----------
// 编辑推荐是主观的，但有了真实点击就该让数据说话。
const MIN_CLICKS = 20; // 单分类点击太少时不动，避免被噪声带偏
if (ga?.toolClicks?.length) {
  const bySlugName = new Map(tools.map((t) => [t.name, t]));
  const clicksByTool = new Map();
  for (const r of ga.toolClicks) {
    const t = bySlugName.get(r['customEvent:tool_name']);
    if (!t) continue;
    clicksByTool.set(t.slug, (clicksByTool.get(t.slug) || 0) + r.eventCount);
  }
  const cats = [...new Set(tools.map((t) => t.category))];
  for (const cat of cats) {
    const list = tools.filter((t) => t.category === cat);
    const total = list.reduce((n, t) => n + (clicksByTool.get(t.slug) || 0), 0);
    if (total < MIN_CLICKS) { dropped.push(`分类「${site.categories[cat] || cat}」14 天仅 ${total} 次点击，低于 ${MIN_CLICKS} 的阈值，推荐位未调整。`); continue; }
    const ranked = [...list].sort((a, b) => (clicksByTool.get(b.slug) || 0) - (clicksByTool.get(a.slug) || 0));
    const top = new Set(ranked.slice(0, 3).map((t) => t.slug));
    for (const t of list) {
      const want = top.has(t.slug);
      if (t.hot !== want) {
        t.hot = want;
        changes.push(`推荐位：${site.categories[cat] || cat} — ${t.name} ${want ? '升为' : '移出'}推荐（14 天 ${clicksByTool.get(t.slug) || 0} 次点击）`);
      }
    }
  }
}

// ---------- 3. 自动优化 B：把真实搜索词回填进方案关键词 ----------
// 用户实际怎么问，就让方案能被那样搜到——这是提升站内匹配率最直接的手段。
if (ga?.searches?.length) {
  const planIndex = solutions.map((s) => ({ s, blob: (s.pain + s.scene + s.keywords.join(' ')).toLowerCase() }));
  for (const r of ga.searches) {
    const term = (r['customEvent:search_term'] || '').trim().toLowerCase();
    if (!term || term.length < 2 || term.length > 12 || r.eventCount < 3) continue;
    const hit = planIndex.find(({ blob }) => blob.includes(term));
    if (hit && !hit.s.keywords.some((k) => k.toLowerCase() === term)) {
      hit.s.keywords.push(term);
      changes.push(`关键词：方案「${hit.s.pain}」补入搜索词「${term}」（14 天被搜 ${r.eventCount} 次）`);
    }
  }
}

// ---------- 4. 产出选题待办：无结果查询是最高质量的选题来源 ----------
const backlogPath = 'data/backlog.json';
const backlog = existsSync(join(root, backlogPath)) ? read(backlogPath) : { items: [] };
const known = new Set(backlog.items.map((i) => i.term));
let newTopics = 0;
for (const r of ga?.noResult || []) {
  const term = (r['customEvent:search_term'] || '').trim();
  if (!term || known.has(term)) continue;
  backlog.items.push({ term, demand: r.eventCount, first_seen: TODAY, status: 'todo', note: '用户搜过但站内无对应方案' });
  known.add(term);
  newTopics++;
}
// 把已经写过方案的待办自动关掉
for (const item of backlog.items) {
  if (item.status !== 'todo') continue;
  const covered = solutions.some((s) => (s.pain + s.scene + s.keywords.join(' ')).toLowerCase().includes(item.term.toLowerCase()));
  if (covered) { item.status = 'done'; item.closed = TODAY; changes.push(`待办关闭：「${item.term}」已被现有方案覆盖`); }
}
backlog.items.sort((a, b) => (b.demand || 0) - (a.demand || 0));
backlog.updated = TODAY;
write(backlogPath, backlog);
if (newTopics) changes.push(`待办新增 ${newTopics} 个选题（来自无结果搜索）`);

// ---------- 5. 站内健康：失效链接 ----------
const dead = (health.results || []).filter((r) => !r.ok);
if (dead.length) actions.push(`复核 ${dead.length} 个不可达链接：${dead.map((d) => d.slug).join('、')}`);

// ---------- 6. 生成动作清单 ----------
const todo = backlog.items.filter((i) => i.status === 'todo');
if (todo.length) {
  actions.push(`写方案：需求最高的 3 个待办 — ${todo.slice(0, 3).map((i) => `${i.term}（${i.demand} 次）`).join('、')}`);
}
// 方案完成度：低完成率说明方案本身有问题，不是流量问题
const outcome = new Map();
for (const r of ga?.outcomes || []) {
  const slug = r['customEvent:plan'];
  if (!slug) continue;
  const o = outcome.get(slug) || { done: 0, stuck: 0 };
  if (r.eventName === 'plan_done') o.done += r.eventCount; else o.stuck += r.eventCount;
  outcome.set(slug, o);
}
for (const [slug, o] of outcome) {
  const total = o.done + o.stuck;
  if (total < 10) continue; // 样本太小不下结论
  const rate = (o.done / total) * 100;
  const s = solutions.find((x) => x.slug === slug);
  if (rate < 50) actions.push(`方案「${s?.pain || slug}」完成率仅 ${rate.toFixed(0)}%（${o.done}/${total}），说明步骤本身有问题，不是流量问题`);
}
// 卡在第几步：直接指出该重写哪一段
const worstStep = (ga?.stuckSteps || []).sort((a, b) => b.eventCount - a.eventCount)[0];
if (worstStep && worstStep.eventCount >= 5) {
  const s = solutions.find((x) => x.slug === worstStep['customEvent:plan']);
  actions.push(`重写「${s?.pain || worstStep['customEvent:plan']}」的第 ${worstStep['customEvent:step_no']} 步——${worstStep.eventCount} 人明确反馈卡在这里`);
}

// 四层阶梯通不通：作业被点开了，但没人从作业走到方案，说明作业里的方案指向不够明确
const hustleTotal = (ga?.hustleClicks || []).reduce((n, r) => n + r.eventCount, 0);
const stepClicks = (ga?.toolClicks || []).filter((r) => ['plan_step', 'hustle_step'].includes(r['customEvent:placement']))
  .reduce((n, r) => n + r.eventCount, 0);
if (hustleTotal >= 20 && stepClicks / hustleTotal < 0.3) {
  actions.push(`赚钱作业被点开 ${hustleTotal} 次，但只带出 ${stepClicks} 次方案/工具点击（${((stepClicks / hustleTotal) * 100).toFixed(0)}%）——作业读起来动人却落不了地，给步骤补更明确的方案指向`);
} else if (hustleTotal > 0 && hustleTotal < 20) {
  dropped.push(`赚钱作业点击仅 ${hustleTotal} 次（阈值 20），样本太小，本轮不对四层阶梯下结论`);
}
const coldHustle = (ga?.hustleClicks || []).length && hustleTotal >= 20
  ? [...(ga.hustleClicks || [])].sort((a, b) => a.eventCount - b.eventCount)[0]
  : null;
if (coldHustle) actions.push(`最冷的赚钱作业是「${coldHustle['customEvent:hustle']}」（${coldHustle.eventCount} 次），检查它的标题是否说清了「适合谁」`);

if (ga?.editions?.length) {
  const en = ga.editions.find((e) => e['customEvent:site_edition'] === 'en');
  const zh = ga.editions.find((e) => e['customEvent:site_edition'] === 'zh');
  if (en && zh && zh.sessions >= 50) {
    const share = (en.sessions / (en.sessions + zh.sessions)) * 100;
    if (share < 5) actions.push(`英文版仅占 ${share.toFixed(1)}% 流量，暂不值得继续投入翻译，把精力放回中文内容`);
    else if (share > 25) actions.push(`英文版已占 ${share.toFixed(1)}% 流量，值得单独做英文外链与分发（Product Hunt、Reddit、Hacker News）`);
  }
}
// 2026-08-15 核对生产库后更正：订阅采集早已直连 D1（functions/api/subscribe.js，subs 表在收），
// subscribe_action 字段实际未被前端使用。真正缺的只有发信通道。
if (!site.subscribe_action) actions.push('接入邮件服务商（Resend/SES 任一，取 API key）打通发信——订阅采集已在 D1 正常积累，变更日志即信件内容，接上即可发');
if (!tools.some((t) => t.affiliate)) actions.push('尚无任何联盟链接生效，`click_tool` 的点击暂时无法变现（见 docs/affiliate-playbook.md）');

if (ga) {
  const delta = ga.prevSessions ? ((ga.sessions - ga.prevSessions) / ga.prevSessions) * 100 : null;
  if (delta !== null && delta < 0) actions.push(`流量环比下降 ${Math.abs(delta).toFixed(1)}%，检查是否有页面掉出索引或外链失效`);
  const weak = (ga.landing || []).filter((l) => l.sessions >= 10 && l.bounceRate > 0.75);
  if (weak.length) actions.push(`跳出率 >75% 的落地页：${weak.slice(0, 3).map((l) => l.landingPagePlusQueryString).join('、')} — 首屏答案可能没答对问题`);
} else {
  actions.push('配置 GA4 服务账号后本闭环才能按真实数据优化（步骤见 docs/growth-loop.md）');
}

// ---------- 7. 落盘 ----------
if (changes.length) {
  write('data/tools.json', tools);
  write('data/solutions.json', solutions);
}

const pct = (n) => (n > 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`);
const trend = ga && ga.prevSessions
  ? `近 14 天 ${ga.sessions} 次会话，环比 ${pct(((ga.sessions - ga.prevSessions) / ga.prevSessions) * 100)}`
  : ga ? `近 14 天 ${ga.sessions} 次会话（无上一周期可比）` : '暂无 GA4 数据';

const md = `# 增长闭环报告

运行于 ${TODAY} ｜ 每两天自动执行 ｜ 数据窗口：近 14 天

## 流量

${trend}

${ga?.editions?.length ? `### 分语言

| 版本 | 会话 | 用户 |
|---|---|---|
${ga.editions.map((e) => `| ${{ zh: '中文 /', en: '英文 /en/' }[e['customEvent:site_edition']] || e['customEvent:site_edition'] || '未标记'} | ${e.sessions} | ${e.totalUsers} |`).join('\n')}
` : ''}
${ga?.channels?.length ? `| 来源 | 会话 |\n|---|---|\n${ga.channels.slice(0, 6).map((c) => `| ${c.sessionDefaultChannelGroup} | ${c.sessions} |`).join('\n')}` : '_接入 GA4 后此处显示渠道分布。_'}

${ga?.landing?.length ? `## 表现最好的落地页\n\n| 页面 | 会话 | 跳出率 |\n|---|---|---|\n${ga.landing.slice(0, 8).map((l) => `| ${l.landingPagePlusQueryString} | ${l.sessions} | ${(l.bounceRate * 100).toFixed(0)}% |`).join('\n')}` : ''}

${outcome.size ? `## 方案完成度（点击 ≠ 做成）\n\n| 方案 | 做成 | 卡住 | 完成率 |\n|---|---|---|---|\n${[...outcome.entries()].sort((a, b) => (b[1].done + b[1].stuck) - (a[1].done + a[1].stuck)).slice(0, 10).map(([slug, o]) => { const t = o.done + o.stuck; const s = solutions.find((x) => x.slug === slug); return `| ${s?.pain || slug} | ${o.done} | ${o.stuck} | ${t ? ((o.done / t) * 100).toFixed(0) : 0}% |`; }).join('\n')}` : ''}

${ga?.stuckSteps?.length ? `### 卡点分布\n\n${ga.stuckSteps.sort((a, b) => b.eventCount - a.eventCount).slice(0, 8).map((r) => { const s = solutions.find((x) => x.slug === r['customEvent:plan']); return `- 「${s?.pain || r['customEvent:plan']}」第 ${r['customEvent:step_no']} 步：${r.eventCount} 人卡住`; }).join('\n')}` : ''}

${ga?.hustleClicks?.length ? `## 赚钱作业热度（四层阶梯的顶层）\n\n| 作业 | 点击 |\n|---|---|\n${[...ga.hustleClicks].sort((a, b) => b.eventCount - a.eventCount).slice(0, 10).map((r) => `| ${r['customEvent:hustle']} | ${r.eventCount} |`).join('\n')}\n\n作业共被点开 ${hustleTotal} 次，带出方案/工具点击 ${stepClicks} 次。**看这个比值**：低于 30% 说明作业写得动人但落不了地，该补步骤里的方案指向；高说明阶梯是通的，可以继续加作业。` : ''}

${ga?.toolClicks?.length ? `## 出站点击（离营收最近的信号）\n\n共 ${ga.toolClicks.reduce((n, r) => n + r.eventCount, 0)} 次。按位置分布：\n\n${Object.entries(ga.toolClicks.reduce((m, r) => { const k = r['customEvent:placement'] || '未标记'; m[k] = (m[k] || 0) + r.eventCount; return m; }, {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}：${v} 次`).join('\n')}` : ''}

## 本轮自动执行

${changes.length ? changes.map((c) => `- ${c}`).join('\n') : '- 无（数据不足以支撑安全的自动调整）'}

## 需要人做的

${actions.length ? actions.map((a, i) => `${i + 1}. ${a}`).join('\n') : '- 暂无'}

${dropped.length ? `## 本轮跳过的（明示，不静默）\n\n${dropped.map((d) => `- ${d}`).join('\n')}` : ''}

## 选题积压

待办 ${todo.length} 个${todo.length ? `，需求最高的：\n\n| 关键词 | 被搜次数 | 首次出现 |\n|---|---|---|\n${todo.slice(0, 10).map((i) => `| ${i.term} | ${i.demand} | ${i.first_seen} |`).join('\n')}` : '（用户搜索都能匹配到方案，说明覆盖到位）'}

---

_由 \`scripts/growth-loop.mjs\` 自动生成。自动改动只限推荐位排序与关键词回填；内容创作与工具增删一律走人工判断。_
`;

writeFileSync(join(root, 'docs/growth-report.md'), md);

console.log(`✅ 增长闭环完成 ｜ 自动改动 ${changes.length} 项 ｜ 待人处理 ${actions.length} 项 ｜ 选题积压 ${todo.length} 个`);
if (changes.length) console.log(changes.map((c) => `   · ${c}`).join('\n'));
