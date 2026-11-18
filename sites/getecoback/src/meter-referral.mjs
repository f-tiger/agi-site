export const METER_PAGE = '/strommess-protokoll.html';
const FIRST_FULL_DAY = '2026-11-19';
const DAY_MS = 86400000;

export function validMeterEvent(body, request) {
  return body.p === METER_PAGE && Object.keys(body).sort().join(',') === 'n,p' &&
    ['eco_meter_from_guide','eco_meter_guide_view','eco_meter_guide_click'].includes(body.n) &&
    request.headers.get('origin') === 'https://getecoback.com' &&
    request.headers.get('sec-fetch-site') !== 'cross-site';
}

// Human-class page views were already collected before the link was instrumented.
export const METER_QUERY = `SELECT day, name, COUNT(*) AS n FROM ev INDEXED BY idx_ev_day
  WHERE day >= ? AND day < ? AND page = ? AND ua_class='human'
  AND name IN ('page_view','eco_meter_from_guide','eco_meter_guide_view','eco_meter_guide_click')
  GROUP BY day, name`;
export async function meterReferralReport(env, now = new Date()) {
  const end = now.toISOString().slice(0,10);
  const startMs = Math.max(Date.parse('2026-11-15'), Date.parse(end) - 28 * DAY_MS);
  const start = new Date(startMs).toISOString().slice(0,10);
  const headers = {'x-robots-tag':'noindex','cache-control':'public, max-age=300'};
  try {
    const result = await env.EVENTS.prepare(METER_QUERY).bind(start,end,METER_PAGE).all();
    if (result.success !== true || !Array.isArray(result.results)) throw Error('Unreadable aggregate');
    const counts = new Map();
    for (const row of result.results) {
      if (!Number.isSafeInteger(row.n) || row.n < 1) throw Error('Invalid count');
      counts.set(row.day + '/' + row.name, row.n);
    }
    const daily = [];
    for (let t=startMs; t<Date.parse(end); t+=DAY_MS) {
      const date = new Date(t).toISOString().slice(0,10);
      const count = name => counts.get(date + '/' + name) || 0;
      daily.push({date, source_pageviews:count('page_view'),
        humidifier_arrivals:date >= FIRST_FULL_DAY ? count('eco_meter_from_guide') : null,
        link_views:date >= FIRST_FULL_DAY ? count('eco_meter_guide_view') : null,
        link_clicks:date >= FIRST_FULL_DAY ? count('eco_meter_guide_click') : null});
    }
    return Response.json({ok:true, source_path:METER_PAGE, first_full_link_day:FIRST_FULL_DAY,
      end_exclusive:end, generated:now.toISOString(), daily,
      unit:'Stored anonymous events per complete UTC day. Humidifier arrivals require a visible worksheet visit with the same-site guide referrer. Link views require half the link in a visible tab. Link clicks count once per page load. Missing historical link coverage is null.'}, {headers});
  } catch {
    return Response.json({ok:false, error:'source_report_unavailable',daily:null},
      {status:503, headers:{...headers,'cache-control':'no-store'}});
  }
}
