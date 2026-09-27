import { EVENT_ROWS } from './hits-schema.js';

// Separate stage counts, deliberately not a user-level or Google-attributed funnel.
// Reuse the hourly reach cache and the partial event index; never fetch identity fields.
export const STAGE_EVENTS_SQL = `SELECT ev, path, count(*) n FROM hits
 WHERE d >= ? AND d < ? AND ${EVENT_ROWS} AND ev IN ('calc','go','home')
 AND path NOT LIKE '/\\_\\_%' ESCAPE '\\' AND COALESCE(lang,'') != 'ci'
 GROUP BY ev, path`;
export const STAGE_ACCOUNTS_SQL = `SELECT count(*) created,
 COALESCE(SUM(CASE WHEN i.email_verified = 1 THEN 1 ELSE 0 END),0) email_verified
 FROM free_accounts a LEFT JOIN free_account_identities i ON i.account_id = a.id
 WHERE a.qa = 0 AND a.created >= ? AND a.created < ?`;

export function stageCounts(rows) {
  const counts = { tool_results_own: 0, tool_results_demo: 0, tool_download_actions_own: 0,
    tool_download_actions_demo: 0, other_calc_events: 0, directory_outbound_clicks: 0,
    homepage_limit_navigation: 0, video_exports_own: 0, video_exports_demo: 0 };
  for (const row of rows) {
    const n = Number(row.n) || 0, path = String(row.path || '');
    if (row.ev === 'go') { counts.directory_outbound_clicks += n; continue; }
    if (row.ev === 'home') { if (path.startsWith('/home/limit-check/')) counts.homepage_limit_navigation += n; continue; }
    if (row.ev !== 'calc') continue;
    const video = path.match(/^\/studio\/video-variants\/(export-video|export-batch)\/(own|demo)$/);
    if (video) { counts['video_exports_' + video[2]] += n; continue; }
    const m = path.match(/^\/studio\/(pdf-tools|product-images|quote-compare)\/(complete|calculate|download|export-csv|export-report)\/(own|demo)$/);
    if (!m || (m[1] === 'quote-compare' ? !['calculate','export-csv','export-report'].includes(m[2]) : !['complete','download'].includes(m[2]))) {
      counts.other_calc_events += n; continue;
    }
    counts[(m[2] === 'complete' || m[2] === 'calculate' ? 'tool_results_' : 'tool_download_actions_') + m[3]] += n;
  }
  return counts;
}

export async function readConversionStages(db, days, clock = Date.now()) {
  const end = new Date(clock).toISOString().slice(0,10);
  const endSeconds = Date.parse(end + 'T00:00:00Z') / 1000;
  const startSeconds = endSeconds - days * 86400;
  const start = new Date(startSeconds * 1000).toISOString().slice(0,10);
  const [events, accounts] = await Promise.allSettled([
    db.prepare(STAGE_EVENTS_SQL).bind(start,end).all(),
    db.prepare(STAGE_ACCOUNTS_SQL).bind(startSeconds,endSeconds).first(),
  ]);
  const eventsOK = events.status === 'fulfilled';
  const accountsOK = accounts.status === 'fulfilled' && accounts.value != null;
  return {
    ok: eventsOK && accountsOK,
    window: { start, end_exclusive: end, complete_days: days, date_basis: 'UTC' },
    events: eventsOK ? stageCounts(events.value.results || []) : null,
    accounts: accountsOK ? { created: Number(accounts.value.created), new_accounts_currently_email_verified: Number(accounts.value.email_verified) } : null,
    missing: [...(!eventsOK ? ['events'] : []), ...(!accountsOK ? ['accounts'] : [])],
    definitions: {
      acquisition: 'Search clicks and CTR come only from GSC; not supplied by this endpoint. GSC uses Pacific reporting days.',
      usage: 'Client-reported successful result actions from PDF, image and quote tools only; repeats are not deduplicated. Demo and own-input actions are separate. Image completion can include partial batch success. Download means an action, not a verified saved file.',
      other_calc_events: 'Unclassified calc events include navigation, edits and tools without a reviewed success contract; never count the whole calc bucket as completed work.',
      quote_results: 'A rendered quote comparison can contain blocked or unverified quotes; it is an analysis action, not an accepted quote or purchase.',
      video_exports: 'Successful video or batch export actions; one batch is one action, not a clip count or unique user.',
      accounts: 'Surviving server-side accounts created within this UTC window with qa=0. Verified is their current email-ownership state, not a verification event during this window. Deleted accounts are absent; accounts are not unique humans.',
      attribution: 'Independent stages, no shared visitor identifier or channel attribution. Do not divide tool events or accounts by GSC clicks to claim a conversion rate.',
      quality: 'Known CI excluded; unlabelled automation and lost browser events remain possible. Missing tables/read failures return null, never zero.',
    },
  };
}
