// Events are actions, not unique people or verified organic traffic. The open
// endpoint can be spoofed; search acquisition must be corroborated with GSC.
const START = '2026-09-25';
const WINDOW = `d >= date('now','-27 days') AND d >= '${START}'`;
const REAL = `${WINDOW} AND ev LIKE 'doc_%' AND ev NOT IN ('doc_ci','doc_sample') AND path NOT LIKE '/__ci%'`;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' } });
export async function onRequestGet({ env }) {
  if (!env.HITS) return json({ ok:false, error:'no_db' }, 503);
  try {
    const queries = [
      `SELECT ev, COUNT(*) AS n FROM hits WHERE ${REAL} GROUP BY ev`,
      `SELECT d, ev, COUNT(*) AS n FROM hits WHERE ${REAL} GROUP BY d, ev ORDER BY d DESC`,
      `SELECT path, COUNT(*) AS n FROM hits WHERE ${REAL} AND ev='doc_view' GROUP BY path ORDER BY n DESC`,
      `SELECT ref, COUNT(*) AS n FROM hits WHERE ${REAL} AND ev='doc_view' GROUP BY ref ORDER BY n DESC LIMIT 100`,
      `SELECT ev, COUNT(*) AS n FROM hits WHERE ${WINDOW} AND ev IN ('doc_ci','doc_sample') GROUP BY ev`,
      `SELECT path, COUNT(*) AS n FROM hits WHERE ${WINDOW} AND ev='bot' AND (path IN ('/','/de/','/zh/') OR path LIKE '%/pdf-%' OR path LIKE '%/compare-pdf-text%' OR path LIKE '%/learn/pdf-%' OR path LIKE '%/learn/scanned-pdf%') GROUP BY path ORDER BY n DESC`,
    ];
    const rows = await Promise.all(queries.map(sql => env.HITS.prepare(sql).all().then(r => r.results || [])));
    return json({ ok:true, since:START, days:28, generated:new Date().toISOString(),
      unit:'Anonymous action counts, deduplicated per event per page load in the browser. Not unique users; not verified buyers. Bots, CI and samples are excluded from task completion. Open endpoint counts can be spoofed.',
      events:Object.fromEntries(rows[0].map(r => [r.ev, Number(r.n)])), daily:rows[1], pages:rows[2], referrers:rows[3],
      tool_views:rows[2].filter(r => /^\/(?:(de|zh)\/)?(?:pdf-accessibility-checker|pdf-batch-audit|pdf-to-text|compare-pdf-text)?$/.test(r.path)).reduce((n,r) => n + Number(r.n),0),
      excluded:Object.fromEntries(rows[4].map(r => [r.ev, Number(r.n)])), crawler_fetches:rows[5],
    });
  } catch { return json({ ok:false, error:'query_failed' }, 500); }
}
