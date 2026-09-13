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

export async function onRequestGet({ env }) {
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
    return json({ ok: true, days: 28, human_pv, ai_ref, by_host, generated: new Date().toISOString() });
  } catch (e) {
    return json({ ok: false, error: 'query_failed' }, 500);
  }
}
