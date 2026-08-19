#!/usr/bin/env node
// 新工具自动发现：让「找候选」这一环脱离人工与 AI 会话，由每日流水线自主完成。
//
// 定位必须先说清楚：这个脚本**只产候选队列，不上站**。
// 收录一个工具需要官方 URL 确认、每页 ≥3 项独立数据、limits 只认官方来源——
// 这些判断无法在无人流水线里安全完成，机器擅自写事实正是本站的头号禁忌。
// 所以自动化的边界画在这里：机器每天把「值得看的新东西」排好队（带来源与热度证据），
// 人或会话来了直接从队列拿，而不是每次从零搜起。发现自动化，核实不自动化。
//
// 数据源选 Hacker News 的 Algolia 公开 API：无需鉴权、稳定可抓、带可核实的热度信号
//（分数与评论数），而且 Show HN 本身就是「新工具首发」密度最高的公开信息流。
// deep-research 那轮的教训也在这里落地：需求侧调研要用「可抓取的一手源」，
// 搜索摘要不算数——HN API 返回的是结构化原始数据，正是一手源。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// 注意不要用 data/backlog.json——那是 growth-loop 的需求词积压（term/demand 结构），
// 两种形态混一个文件，迟早有一方把另一方的数据当自己的旧格式清理掉。
const FILE = join(root, 'data/discovery.json');
const TODAY = new Date().toISOString().slice(0, 10);

const tools = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));
const backlog = existsSync(FILE)
  ? JSON.parse(readFileSync(FILE, 'utf8'))
  : { items: [], updated: TODAY };

// 站内已收录工具的域名集合：候选与它们撞域名就是重复，不进队列
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
// 去重键：一般站点按域名；github.com 按 owner/repo——否则第一个 GitHub 候选进队后，
// 域名去重会把之后所有 GitHub 仓库永久挡在门外（开源工具恰恰常住在那里）。
const keyOf = (u) => {
  const h = hostOf(u);
  if (h !== 'github.com') return h;
  try { return `github.com${new URL(u).pathname.split('/').slice(0, 3).join('/')}`.toLowerCase(); }
  catch { return h; }
};
const known = new Set(tools.map((t) => keyOf(t.url)).filter(Boolean));
for (const it of backlog.items) if (it.url) known.add(keyOf(it.url));

// 内容平台与社区的域名不是工具本身——Show HN 链到博客文章的情况很常见，
// 那是「关于工具的内容」，不是工具。宁可漏（正文里的工具下次还会再出现），不可脏。
const CONTENT_HOSTS = new Set([
  'github.io', 'youtube.com', 'youtu.be', 'twitter.com', 'x.com', 'reddit.com',
  'medium.com', 'substack.com', 'dev.to', 'hashnode.dev', 'notion.site',
  'news.ycombinator.com', 'wikipedia.org', 'arxiv.org', 'huggingface.co',
  'npmjs.com', 'pypi.org', 'producthunt.com', 'techcrunch.com', 'theverge.com',
]);
const isContentHost = (h) => CONTENT_HOSTS.has(h) || [...CONTENT_HOSTS].some((c) => h.endsWith(`.${c}`));

// 抓取窗口 7 天、热度门槛有意偏高（Show HN ≥ 40 分）：
// 队列的价值在信噪比——每天塞 50 条垃圾进去，三天后就没人再看这个队列了。
const WINDOW_DAYS = 7;
const MIN_POINTS = 40;
const MAX_ADD_PER_RUN = 8;
const MAX_QUEUE = 60;
const STALE_DAYS = 45;   // 候选放 45 天还没人核实 = 热度已过，不再值得排队

async function fetchHits() {
  // 离线自测通道：CI 之外的环境（如出口受限的容器）用固定样本验证逻辑
  if (process.env.BPJ_DISCOVER_FIXTURE) {
    return JSON.parse(readFileSync(process.env.BPJ_DISCOVER_FIXTURE, 'utf8'));
  }
  const since = Math.floor(Date.now() / 1000) - WINDOW_DAYS * 86400;
  const qs = [
    // Show HN 是主信号；再补一路关键词搜索，接住不走 Show HN 的发布帖
    `tags=show_hn&numericFilters=created_at_i>${since},points>${MIN_POINTS}&hitsPerPage=50`,
    `query=${encodeURIComponent('AI free tier')}&tags=story&numericFilters=created_at_i>${since},points>${MIN_POINTS}&hitsPerPage=20`,
  ];
  const hits = [];
  for (const q of qs) {
    const r = await fetch(`https://hn.algolia.com/api/v1/search_by_date?${q}`, {
      headers: { 'User-Agent': 'baipiaoji.com discover-tools (contact: site owner)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`HN API HTTP ${r.status}`);
    hits.push(...(await r.json()).hits);
  }
  return hits;
}

// AI 相关性判定走标题关键词。有意从宽：queue 里多几条非 AI 工具的代价是浏览时跳过一行，
// 从严漏掉改名换姓的新品类（比如当年的 "agent"）代价更大。
const AI_RE = /\b(ai|llm|gpt|agent|copilot|rag|diffusion|transcrib|generat|model)\b|智能|生成/i;

let hits;
try {
  hits = await fetchHits();
} catch (e) {
  // 数据源失联不阻塞流水线：发现是增益项，断一天没有损失，明天还会再跑
  console.log(`⚠ 发现源不可达（${e.message}），本轮跳过——不阻塞流水线`);
  process.exit(0);
}

const added = [];
for (const h of hits) {
  if (added.length >= MAX_ADD_PER_RUN) break;
  const url = h.url || '';
  const host = hostOf(url);
  const key = keyOf(url);
  if (!host || known.has(key) || isContentHost(host)) continue;
  const title = h.title || '';
  if (!AI_RE.test(title)) continue;
  known.add(key);
  added.push({
    name: title.replace(/^Show HN:\s*/i, '').slice(0, 120),
    url,
    host,
    src: `https://news.ycombinator.com/item?id=${h.objectID}`,
    points: h.points || 0,
    comments: h.num_comments || 0,
    found: TODAY,
    status: 'candidate',
  });
}

// 过期清理：热度是易腐品。45 天没被核实的候选说明当时的热度没有变成持续存在，
// 留着只会让队列越来越难读。清理要出声——静默截断会被读成「队列就这么多」。
const before = backlog.items.length;
const fresh = backlog.items.filter((it) =>
  it.status !== 'candidate'
  || !it.found
  || (Date.now() - Date.parse(it.found)) / 86400000 <= STALE_DAYS);
const pruned = before - fresh.length;

const items = [...added, ...fresh].slice(0, MAX_QUEUE);
if (before - pruned + added.length > MAX_QUEUE) {
  console.log(`⚠ 队列已达上限 ${MAX_QUEUE}，最旧的候选被挤出`);
}

writeFileSync(FILE, `${JSON.stringify({ items, updated: TODAY }, null, 2)}\n`);

console.log(`🔭 工具发现：新候选 ${added.length} 条，过期清理 ${pruned} 条，队列现有 ${items.length} 条`);
for (const a of added) console.log(`   + ${a.name}（${a.host}，${a.points} 分）→ ${a.src}`);
if (!added.length) console.log('   本轮无新候选——门槛有意偏高，空手而归是常态不是故障');
