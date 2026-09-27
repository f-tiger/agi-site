import { cachedAggregate } from '../../lib/aggregate-cache.js';
// /api/pulse (2026-09-13, fleet "AI 时代的站点" flywheel read-side): 28-day human page
// views (JS beacon rows with ev='') and how many arrived from an AI assistant, by referrer
// host. Aggregate counts only — no paths, no countries, no row-level data. The Pages
// function reads its own HITS binding, so the fleet heartbeat needs no token (the repo's
// tokens lack D1 read). Rows before 2026-08-30 belong to the retired site and are excluded.
// Same host list as tools/fleet/ai_referrals.py; cached an hour at the edge.
const HOSTS = ['chatgpt', 'chat.openai', 'perplexity', 'claude.ai', 'copilot', 'gemini.google', 'you.com', 'kagi', 'poe.com', 'mistral', 'deepseek', 'kimi', 'doubao', 'yiyan', 'metaso'];
const AI = '(' + HOSTS.map((h) => `ref LIKE '%${h}%'`).join(' OR ') + ')';
const HUMAN = "ev = '' AND d >= date('now','-28 days') AND d >= '2026-08-30' AND path NOT LIKE '/__ci%'";

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' },
});


// 引荐来源分类(2026-09-15「舰队相互学习」):tools/fleet/ref_sources.txt 是唯一权威,
// 每个 worker 里的字面量必须与它逐字相同——check_ref_sources.py 挂在 fleet-heartbeat 上断言,
// 漂了就走 GitHub 失败邮件。教训与 bot_ua.txt 同源:各自演化的分类器 = 各站台账不可比。
// 读的是已入库的来源域名,出的仍是聚合计数:无路径、无国家、无 UA、无行级数据。
const REF_SRC = 'self:pages.dev|workers.dev;;ai:chatgpt|chat.openai|perplexity|claude.ai|copilot.microsoft|copilot.cloud.microsoft|copilot|gemini.google|you.com|kagi|poe.com|mistral|deepseek|kimi|doubao|yiyan.baidu|yiyan|metaso|phind|felo.ai|genspark|monica.im|tiangong|chatglm|moonshot;;search:google.|bing.|duckduckgo|search.yahoo|yahoo.co|ecosia|yandex|baidu.|sogou|so.com|startpage|brave.com|qwant|naver|seznam|petalsearch|mojeek|lycos|ask.com;;fleet:agiscorecard.com|getecoback.com|baipiaoji.com|thedollscout.com;;social:t.co|twitter.com|x.com|reddit.com|facebook|instagram|linkedin|lnkd.in|news.ycombinator|producthunt|weibo|zhihu|douban|xiaohongshu|telegram|t.me|pinterest|youtube|tiktok|douyin|discord|substack|medium.com|tumblr|vk.com|line.me|whatsapp|quora|mastodon|bsky';
const srcHost = (r) => {
  let h = String(r == null ? '' : r).trim().toLowerCase();
  if (!h) return '';
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  h = h.split('/')[0].split('?')[0].split('#')[0].split('@').pop().split(':')[0];
  return h.replace(/^www\./, '');
};
// self 只认完全相同的主机名:兄弟站属 fleet,不是自己。
const srcBucket = (host, self) => {
  if (!host) return 'direct';
  if (self && host === self) return 'self';
  // 标签对齐 + 尾部只许 TLD 段。两个方向的错都真发生过:裸 includes 会把 netflix.com
  // 判成 x.com(social);只做前缀对齐又会把 agiscorecard.com.spam.example 判成 fleet
  // ——那正是引荐垃圾的常见形状。
  const tld = (rest) => rest === '' || rest.split('.').every((l) => l.length > 0 && l.length <= 4 && /^[a-z]+$/.test(l));
  const dotted = '.' + host;
  for (const grp of REF_SRC.split(';;')) {
    const i = grp.indexOf(':');
    for (const t of grp.slice(i + 1).split('|')) {
      if (!t) continue;
      const at = dotted.indexOf('.' + t);
      if (at < 0) continue;
      let rest = dotted.slice(at + t.length + 1);
      if (rest.startsWith('.')) rest = rest.slice(1);
      if (tld(rest)) return grp.slice(0, i);
    }
  }
  return 'other';
};

async function readPulse({ request, env }) {
  if (!env.HITS) return json({ ok: false, error: 'no_db' }, 503);
  try {
    const q = await env.HITS.prepare(
      `SELECT '_total' AS host, COUNT(*) AS n FROM hits WHERE ${HUMAN} ` +
      `UNION ALL SELECT ref AS host, COUNT(*) AS n FROM hits WHERE ${HUMAN} AND ${AI} GROUP BY ref ORDER BY n DESC`
    ).all();
    let human_pv = 0; const by_host = {};
    for (const r of (q.results || [])) {
      if (r.host === '_total') human_pv = r.n | 0; else if (r.host) by_host[r.host] = r.n | 0;
    }
    const ai_ref = Object.values(by_host).reduce((a, b) => a + b, 0);
    // 渠道构成(2026-09-15):同一个 HUMAN 谓词再 group 一次 ref,按 ref_sources.txt 分桶。
    // sum(by_source) 应等于 human_pv —— 对不上就是 ref 存成了整条 URL 或分类器漂了。
    const q2 = await env.HITS.prepare(
      `SELECT ref AS host, COUNT(*) AS n FROM hits WHERE ${HUMAN} GROUP BY ref ORDER BY n DESC LIMIT 1000`
    ).all();
    const self_host = srcHost(new URL(request.url).hostname);
    const by_source = { search: 0, ai: 0, fleet: 0, social: 0, self: 0, direct: 0, other: 0 };
    const by_search = {}; const by_fleet = {}; const by_other = {};
    for (const r of (q2.results || [])) {
      const h = srcHost(r.host); const n = r.n | 0; const b = srcBucket(h, self_host);
      by_source[b] += n;
      if (b === 'search') by_search[h] = (by_search[h] || 0) + n;
      else if (b === 'fleet') by_fleet[h] = (by_fleet[h] || 0) + n;
      // by_other = 既不是搜索/AI/社交/兄弟站/本站的来源域 —— 真的有人从别处链过来。
      // 这是舰队第一方的外链监测:嵌入件、目录页、awesome-list 里的链接,送来过真人就出现在这里。
      else if (b === 'other') by_other[h] = (by_other[h] || 0) + n;
    }
    // 钱线(2026-09-21 舰队钱线仪表盘,读侧 tools/fleet/money_line.py):只出聚合计数,08-30 前的旧站行不计。
    let money = null;
    try {
      const m = await env.HITS.prepare("SELECT COUNT(*) AS n FROM hits WHERE ev='affiliate_click' AND d >= date('now','-28 days') AND d >= '2026-08-30' AND path NOT LIKE '/__ci%'").all();
      money = { days: 28, affiliate_click_28d: (((m.results || [])[0] || {}).n | 0) };
      try {
        const o = await env.HITS.prepare('SELECT state, COUNT(*) AS n FROM wb_orders GROUP BY state').all();
        money.member_orders_by_state = Object.fromEntries((o.results || []).map((r) => [String(r.state), r.n | 0]));
      } catch (e) { money.member_orders_by_state = null; }
    } catch (e) { money = null; }
    return json({ ok: true, days: 28, human_pv, ai_ref, by_host, by_source, by_search, by_fleet, by_other, money, generated: new Date().toISOString() });
  } catch (e) {
    return json({ ok: false, error: 'query_failed' }, 500);
  }
}

export async function onRequestGet(ctx) { return cachedAggregate(ctx,()=>readPulse(ctx)); }
