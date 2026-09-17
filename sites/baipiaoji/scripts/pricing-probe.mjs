#!/usr/bin/env node
// 付费档缺口的抓取探针（2026-09-16,owner:「增加新的工具解决方案」+「把工具站做到极致」）。
//
// 为什么存在:本站 219 个工具里,**111 个已经满足判定页的全部条件、只差 limits.paid 一个字段**。
// 差这一个字段,`is-<tool>-still-free` 与 `/upgrade/<tool>` 两种页型就都不生成——而 D1 现查
// 说读者 68% 落在工具页上、问的正是「X 还免费吗、撞墙之后怎么办」。所以这是本站最大的内容缺口。
//
// 缺口一直填不动的原因不是没人想填,是**会话沙箱抓不到官方定价页**:2026-09-16 实测
// x.ai 403、quillbot 403、kimi 连接重置、feishu 与 haiper 只返回 SPA 壳。同一批 URL,
// CI runner 的出网能抓到(与 source-drift、verify 每天抓 219 条来源页是同一条链路)。
// 于是把「猜 URL → 手抓 → 抓不到就放弃」这个每轮重来的动作,变成 runner 每天推进的一条队列。
//
// 边界一次说死（与 source-drift.mjs 同一条纪律,不重复犯「机器写事实」这个头号禁忌）:
//   ✅ 只做发现与取证:哪个官方定价 URL 是活的、页面上有没有真价格、价格段长什么样。
//   ❌ 一个字都不写进 tools.json。新数字永远只走 scripts/limits-edit.mjs 两步核实。
//   ✅ 抓不到就如实写状态与原因,绝不复用旧结果冒充新鲜,更不允许「读不到」被当成「没有付费档」。
//   ✅ 预算有界:每次只推进 PROBE_TOOLS 个工具 × 最多 3 个候选 URL,串行 1.5s 间隔,
//      游标轮转,约 10 天覆盖一轮 111 个。绝不并发轰对方站点。
//
//   node scripts/pricing-probe.mjs              # 每日 CI（schedule,不挂 push）
//   node scripts/pricing-probe.mjs --selftest   # 内置夹具,零网络
//   PROBE_TOOLS=3 node scripts/pricing-probe.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data/pricing-probe.json');
const SELFTEST = process.argv.includes('--selftest');
const TODAY = process.env.PROBE_DATE || new Date().toISOString().slice(0, 10);
// 预算 8 个/天:最坏 8 × 3 个候选 × (抓取 ~2s + 礼貌间隔 1.5s) ≈ 1.4 分钟/次 ≈ 42 分钟/月,
// 挂在已有的每日 schedule 上,不新增 cron。命中价目表即提前跳出,实际远低于最坏值。
// 109 个缺口按这个速度约 14 天覆盖一轮,与 limits 的 30 天复核节奏同量级。
const BUDGET = Math.max(1, parseInt(process.env.PROBE_TOOLS || '8', 10));
// 每行记下它是在哪种网络下抓的。这个脚本存在的**全部理由**就是沙箱与 runner 的出网不一样,
// 所以一份混了两种来源的文件如果不标注,读的人会把沙箱的 403 当成「这家没有定价页」——
// 那正是本脚本要消灭的那个误判。blocked 只有在 runner 行上才值得当结论看。
const ENV = process.env.GITHUB_ACTIONS === 'true' ? 'runner' : 'sandbox';

// ── 判定页资格 ──
// 与 build.mjs 生成 `is-<slug>-still-free` 的条件逐字对齐:差一个 paid 就差一整页。
// 对齐是有意的——队列里每一行都等于「填上就多两种页」,不是泛泛的待办清单。
export function needsPaid(t) {
  const l = t && t.limits;
  return !!(l && l.quota && l.wall && l.source && l.checked && !l.paid);
}

// ── 候选 URL ──
// 只用**确定性**推导,不猜奇怪路径:①source 散文里已经出现的、看着像定价页的 URL 优先
// （厂商自己在那儿写过价,命中率最高);②官网域 + 三条最常见的定价路径。
// 上限 3 个:再多就是拿对方的服务器做穷举,而收益在第 4 个候选上已经趋近于零。
const PRICEY = /(pricing|price|plans?|billing|订阅|定价|价格)/i;
export function candidates(tool) {
  const out = [];
  const push = (u) => { if (u && !out.includes(u)) out.push(u); };
  for (const m of String(tool.limits?.source || '').matchAll(
    /(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[a-z0-9._~\-\/#?=&%]*)?/gi)) {
    const host = m[1].toLowerCase();
    const path = (m[2] || '').replace(/[。，、）)；;]+$/g, '');
    if (PRICEY.test(path)) push(`https://${host}${path}`);
  }
  try {
    const host = new URL(tool.url).hostname;
    for (const p of ['/pricing', '/price', '/plans']) push(`https://${host}${p}`);
  } catch { /* url 缺失或畸形:只用 source 推出来的候选 */ }
  return out.slice(0, 3);
}

// ── 页面 → 有没有真价格 ──
// 只认「货币符号紧邻数字」与明确的周期/单位词。刻意**不**认裸数字:导航、版本号、
// 年份、统计数字都能凑出假阳性,而这个分数是后面会话决定「值不值得人去读」的唯一依据,
// 假阳性会把人骗去读一个没有价格的页面,比漏掉更糟。
const PRICE_TOKEN = /[$€¥￥£]\s?\d|\d+(?:[.,]\d+)?\s*(?:元|美元)\s*\/\s*(?:月|年|次)|\/\s?mo\b|\/\s?month\b|per month|per 1M|\/\s?1M\b|per million|每月|每年/gi;
export function priceScore(html) {
  const text = String(html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
  const hits = [...text.matchAll(PRICE_TOKEN)].map((m) => m.index);
  if (!hits.length) return { tokens: 0, excerpt: '' };
  // 价格最密集的窗口 = 最可能是真正的价目表,而不是页脚里孤零零一个「$0」
  let best = { n: 0, at: hits[0] };
  for (const h of hits) {
    const n = hits.filter((x) => x >= h && x < h + 1600).length;
    if (n > best.n) best = { n, at: h };
  }
  return { tokens: hits.length, excerpt: text.slice(Math.max(0, best.at - 120), best.at + 680).trim() };
}

// ── 一个工具的结论 ──
// ready 的门槛定在 3 个价格 token:1–2 个几乎总是页脚的「免费」或货币切换器,
// 3 个以上才开始像一张价目表。判错方向优先判「再看看」,不优先判「可以写了」。
export function verdict(tried) {
  const ok = tried.filter((t) => t.status === 200);
  if (!ok.length) return { state: 'blocked', best: null };
  const best = ok.slice().sort((a, b) => b.tokens - a.tokens)[0];
  return { state: best.tokens >= 3 ? 'ready' : 'empty', best };
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      redirect: 'follow', signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIYangmaoBot/1.0; +pricing-probe)',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    const html = res.ok ? (await res.text()).slice(0, 600000) : '';
    return { url, status: res.status, bytes: html.length, html };
  } catch (err) {
    return { url, status: 0, bytes: 0, error: String(err?.cause?.code || err?.name || err), html: '' };
  } finally { clearTimeout(timer); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const tools = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));
  const reachFile = join(root, 'data/reach.json');
  const reach = existsSync(reachFile) ? JSON.parse(readFileSync(reachFile, 'utf8')) : null;
  const rn = new Map(((reach && reach.tools) || []).map((t) => [t.slug, t.n]));
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { tools: {} };

  // 按触达排:先填读者真的在看的那几页。触达相同按 slug,保证顺序确定、游标可复现。
  const queue = tools.filter(needsPaid)
    .sort((a, b) => (rn.get(b.slug) || 0) - (rn.get(a.slug) || 0) || a.slug.localeCompare(b.slug));

  // 游标轮转:每天推进 BUDGET 个,约 10 天覆盖一轮。不从头重扫——重扫会让长尾永远排不上。
  const start = Math.max(0, queue.findIndex((t) => t.slug === prev.cursor) + 1) % Math.max(1, queue.length);
  const batch = [];
  for (let i = 0; i < Math.min(BUDGET, queue.length); i++) batch.push(queue[(start + i) % queue.length]);

  const out = { ...prev.tools };
  for (const tool of batch) {
    const tried = [];
    for (const url of candidates(tool)) {
      const r = await fetchPage(url);
      const s = r.status === 200 ? priceScore(r.html) : { tokens: 0, excerpt: '' };
      tried.push({ url, status: r.status, bytes: r.bytes, tokens: s.tokens, ...(r.error ? { error: r.error } : {}), _ex: s.excerpt });
      await sleep(1500);
      if (s.tokens >= 3) break;   // 已经拿到一张像样的价目表,不必再敲这家第二个 URL
    }
    const v = verdict(tried);
    out[tool.slug] = {
      slug: tool.slug, name: tool.name, cat: tool.category, reach: rn.get(tool.slug) || 0,
      probed: TODAY, env: ENV, state: v.state,
      tried: tried.map(({ _ex, ...rest }) => rest),
      best: v.best ? { url: v.best.url, tokens: v.best.tokens, excerpt: (tried.find((t) => t.url === v.best.url)?._ex || '').slice(0, 700) } : null,
    };
    const tag = { ready: '✅', empty: '⬜', blocked: '⛔' }[v.state];
    console.log(`${tag} ${tool.slug} (触达 ${rn.get(tool.slug) || 0}) ${v.best ? `${v.best.url} tokens=${v.best.tokens}` : tried.map((t) => t.status).join('/')}`);
  }

  const all = Object.values(out);
  const doc = {
    generated: TODAY,
    env: ENV,
    note: '付费档缺口的抓取探针。只做发现与取证，绝不写事实：任何数字仍须经 scripts/limits-edit.mjs 两步核实后才进 tools.json。state=ready 表示该 URL 当天 200 且页面上有像价目表的价格段，不表示数字已被核实。每行的 env 是抓取时的网络环境：sandbox 行的 blocked 很可能只是会话沙箱出网被拒，不能当作「这家没有定价页」，只有 runner 行的 blocked 才值得当结论。',
    gap_total: queue.length,
    batch: batch.map((t) => t.slug),
    cursor: batch.length ? batch[batch.length - 1].slug : prev.cursor || '',
    summary: {
      ready: all.filter((t) => t.state === 'ready').length,
      empty: all.filter((t) => t.state === 'empty').length,
      blocked: all.filter((t) => t.state === 'blocked').length,
      probed_total: all.length,
    },
    tools: out,
  };
  writeFileSync(OUT, `${JSON.stringify(doc, null, 1)}\n`);
  const ready = all.filter((t) => t.state === 'ready').sort((a, b) => b.reach - a.reach).slice(0, 8);
  console.log(`\n付费档缺口 ${queue.length} 个；已探 ${all.length}，可读 ${doc.summary.ready} / 无价 ${doc.summary.empty} / 抓不到 ${doc.summary.blocked}`);
  if (ready.length) console.log(`下一轮优先读：${ready.map((t) => `${t.slug}(${t.reach})`).join('、')}`);
}

if (SELFTEST) {
  const assert = (c, m) => { if (!c) { console.error('❌ selftest:', m); process.exit(1); } };
  // 资格门必须与判定页生成条件一致：差 paid 才入队，缺 wall 之类的一律不入队
  assert(needsPaid({ limits: { quota: 'q', wall: 'w', source: 's', checked: '2026-01-01' } }), '差 paid 的应入队');
  assert(!needsPaid({ limits: { quota: 'q', wall: 'w', source: 's', checked: '2026-01-01', paid: { tiers: 't' } } }), '已有 paid 不该入队');
  assert(!needsPaid({ limits: { quota: 'q', source: 's', checked: '2026-01-01' } }), '缺 wall 本来就不生成判定页,不该入队');
  // 候选 URL：source 里的定价页优先，其次官网域三条常见路径，上限 3
  const c = candidates({ url: 'https://example.com/app', limits: { source: 'Foo 官方定价页（example.com/zh/pricing，经核实）' } });
  assert(c[0] === 'https://example.com/zh/pricing', `source 里的定价页应排第一:${c}`);
  assert(c.length <= 3, `候选上限 3:${c}`);
  const c2 = candidates({ url: 'https://vendor.io', limits: { source: '无链接的散文' } });
  assert(c2[0] === 'https://vendor.io/pricing' && c2.length === 3, `无 source URL 时应退化为三条常见路径:${c2}`);
  const c3 = candidates({ url: 'not a url', limits: { source: '' } });
  assert(c3.length === 0, '既无 source URL 又无合法官网时不该编出候选');
  // 价格识别：真价目表要认出来，导航与年份不许凑数
  const good = priceScore('<style>.x{width:20px}</style><h1>Pricing</h1><p>Pro $20/mo</p><p>Team $49/month</p><p>API $0.50 per 1M tokens</p><script>var a="$99"</script>');
  assert(good.tokens >= 3, `真价目表应被认出:${good.tokens}`);
  assert(!good.excerpt.includes('var a'), 'script 内容不该进摘录');
  const bad = priceScore('<p>© 2026 公司 版权所有 · 第 20 版 · 分辨率 1920x1080</p>');
  assert(bad.tokens === 0, `年份/版本/像素不是价格:${bad.tokens}`);
  // 判定：全抓不到 = blocked（绝不能因为「读不到」就说这家没有付费档）
  assert(verdict([{ status: 403, tokens: 0 }, { status: 0, tokens: 0 }]).state === 'blocked', '全失败应为 blocked');
  assert(verdict([{ status: 200, tokens: 0, url: 'u' }]).state === 'empty', '200 但无价格应为 empty');
  assert(verdict([{ status: 200, tokens: 9, url: 'u' }]).state === 'ready', '200 且有价目表应为 ready');
  // 取最高分的那个候选，而不是第一个 200 的
  assert(verdict([{ status: 200, tokens: 1, url: 'a' }, { status: 200, tokens: 7, url: 'b' }]).best.url === 'b', '应取价格最密的候选');
  console.log('✅ pricing-probe selftest 通过（资格门 / 候选推导 / 价格识别 / 三态判定）');
  process.exit(0);
}

main().catch((e) => { console.error('pricing-probe 失败：', e); process.exit(0); });
