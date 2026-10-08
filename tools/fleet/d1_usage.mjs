// Which D1 queries spend the account's free-tier row reads (5,000,000 rows read / day, account-wide,
// reset 00:00 UTC). Read-only: bounded Cloudflare GraphQL Analytics calls, nothing written anywhere
// except this run's report. Every site's /api/pulse, event writes and account APIs fail for the rest of the
// UTC day once the budget is gone (2026-09-25 and 09-26), and no session could name the queries doing it —
// the sandbox has no analytics token and D1 itself refuses queries once exhausted.
//
// Needs existing Account → Account Analytics → Read. Stops on authorization denial; no access changes.
// and says which one answered. Output goes to stdout and the job summary. The repo is public, so query text is
// redacted: e-mail addresses, 0x addresses and long opaque tokens are masked before printing.
const TOKEN_VARS = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN_ZONE', 'CF_API_TOKEN'];
const ACCOUNT = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const LIMIT = 5_000_000;
const DAYS = Math.max(1, Math.min(14, Math.floor(Number(process.env.D1_USAGE_DAYS) || 8)));

// Database names from the wrangler configs in this repo; anything else prints its id.
const NAMES = {
  'f84f9d29-3ad9-4b37-b28e-3a78027d2f22': 'agiscorecard-events',
  '1ee08cb8-a174-4ec3-8dbc-89ef5d28aa05': 'baipiaoji-hits',
  '75e45e05-44b5-4c56-9a3b-dd504b5c53f1': 'ecoback-events',
  '6e71ddc6-b58c-49f4-b6f5-207f3778133f': 'dollscout-events',
  '6109b81e-c970-47d7-b7fc-3a2a15f68ed2': 'after35-events (after35/codeword/fanzha/firstjob/learn/powerbill)',
  'bd3b1ca9-e9cb-4b71-9834-df3d67b39504': 'gridlings-events',
  '2bebbaef-aa46-4b75-89ca-77920ad4f863': 'gamesledger-events',
  'f92b6207-90bf-46f6-97c7-cc88195b2ec7': 'sourceradar-events',
  '77a0a152-6345-450e-83eb-6f26f246c0b8': 'goldrush-events',
  '71f9d85f-1363-48f4-85ee-a445fb9dd203': 'agimatch-events',
};
const nameOf = (id) => NAMES[id] || id;

export function redact(sql) {
  return String(sql || '')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<email>')
    .replace(/0x[0-9a-fA-F]{20,}/g, '<0x…>')
    .replace(/[A-Za-z0-9_-]{32,}/g, '<token>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Reviewed source: main ce503b8dd64be3a6405b0bfacff2511b5cfafa29.
// Literal query allowlist only; never import/execute membership or database code.
// ensureMembers -> ensureWeb3 -> ensure: 21 initialization statements, then
// admin stats: 3 SELECTs; public status: 1 + up to 1 health SELECTs. Both endpoints
// initialize schema. Identical SQL can have other callers: frequency != requests.
export const MEMBERSHIP_SITES = [
  {site: 'bpj', databaseId: '1ee08cb8-a174-4ec3-8dbc-89ef5d28aa05', offset: 0},
  {site: 'agi', databaseId: 'f84f9d29-3ad9-4b37-b28e-3a78027d2f22', offset: 10000},
  {site: 'eco', databaseId: '75e45e05-44b5-4c56-9a3b-dd504b5c53f1', offset: 20000},
  {site: 'tds', databaseId: '6e71ddc6-b58c-49f4-b6f5-207f3778133f', offset: 30000},
];
export const MEMBERSHIP_SQL = [
  {
    "key": "init:bpj_ad_checkout",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS bpj_ad_checkout (\n id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, pitch TEXT NOT NULL,\n cat TEXT NOT NULL, lang TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>0), currency TEXT NOT NULL,\n days INTEGER NOT NULL CHECK(days>0), livemode INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'creating',\n session TEXT UNIQUE, intent TEXT UNIQUE, created INTEGER NOT NULL, paid_at INTEGER,\n slot INTEGER CHECK(slot BETWEEN 1 AND 3), starts_at INTEGER, ends_at INTEGER, total_cents INTEGER, tax_cents INTEGER\n)"
  },
  {
    "key": "init:bpj_ad_delivery",
    "kind": "init",
    "sql": "CREATE INDEX IF NOT EXISTS bpj_ad_delivery ON bpj_ad_checkout(cat,state,slot,ends_at)"
  },
  {
    "key": "init:bpj_ad_events",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS bpj_ad_events (id TEXT PRIMARY KEY, type TEXT NOT NULL, created INTEGER NOT NULL)"
  },
  {
    "key": "init:bpj_ad_reversals",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS bpj_ad_reversals (intent TEXT PRIMARY KEY, reason TEXT NOT NULL, created INTEGER NOT NULL)"
  },
  {
    "key": "init:bpj_ad_web3",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS bpj_ad_web3 (\n order_id TEXT PRIMARY KEY REFERENCES bpj_ad_checkout(id), chain TEXT NOT NULL, recipient TEXT NOT NULL,\n recipient_hex TEXT NOT NULL, contract TEXT NOT NULL, amount_units INTEGER NOT NULL CHECK(amount_units>0),\n expires INTEGER NOT NULL, cursor INTEGER NOT NULL DEFAULT 0, checked_at INTEGER NOT NULL DEFAULT 0,\n tx TEXT, note TEXT, UNIQUE(chain,recipient,contract,amount_units), UNIQUE(chain,tx))"
  },
  {
    "key": "init:bpj_ad_chain_receipts",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS bpj_ad_chain_receipts (chain TEXT NOT NULL, tx TEXT NOT NULL, order_id TEXT NOT NULL UNIQUE,\n block INTEGER NOT NULL, amount_units INTEGER NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(chain,tx))"
  },
  {
    "key": "init:bpj_ad_web3_health",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS bpj_ad_web3_health (id TEXT PRIMARY KEY, checked_at INTEGER NOT NULL)"
  },
  {
    "key": "init:bpj_ad_web3_limits",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS bpj_ad_web3_limits (key TEXT PRIMARY KEY, n INTEGER NOT NULL)"
  },
  {
    "key": "init:wb_health",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS wb_health(id INTEGER PRIMARY KEY,checked_at INTEGER NOT NULL)"
  },
  {
    "key": "init:wb_support",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS wb_support(id TEXT PRIMARY KEY,member_id TEXT NOT NULL,message TEXT NOT NULL,created INTEGER NOT NULL,resolved INTEGER NOT NULL DEFAULT 0)"
  },
  {
    "key": "init:wb_members",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS wb_members(id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, created INTEGER NOT NULL, ends_at INTEGER NOT NULL DEFAULT 0, suspended INTEGER NOT NULL DEFAULT 0)"
  },
  {
    "key": "init:wb_orders",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS wb_orders(id TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES wb_members(id), chain TEXT NOT NULL, recipient TEXT NOT NULL,recipient_hex TEXT NOT NULL,contract TEXT NOT NULL,amount_units INTEGER NOT NULL CHECK(amount_units>9000000 AND amount_units<9010000),days INTEGER NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL,cursor INTEGER NOT NULL,checked_at INTEGER NOT NULL DEFAULT 0,scan_done INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT 'pending',paid_at INTEGER,tx TEXT,UNIQUE(chain,recipient,contract,amount_units))"
  },
  {
    "key": "init:wb_order_owner",
    "kind": "init",
    "sql": "CREATE INDEX IF NOT EXISTS wb_order_owner ON wb_orders(member_id,created)"
  },
  {
    "key": "init:wb_order_sources",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS wb_order_sources(order_id TEXT PRIMARY KEY REFERENCES wb_orders(id),product TEXT NOT NULL,created INTEGER NOT NULL)"
  },
  {
    "key": "init:wb_spaces",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS wb_spaces(member_id TEXT NOT NULL REFERENCES wb_members(id),id TEXT NOT NULL,name TEXT NOT NULL,product TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,updated INTEGER NOT NULL,PRIMARY KEY(member_id,id))"
  },
  {
    "key": "init:wb_versions",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS wb_versions(member_id TEXT NOT NULL,space_id TEXT NOT NULL,revision INTEGER NOT NULL,body TEXT NOT NULL,bytes INTEGER NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(member_id,space_id,revision),FOREIGN KEY(member_id,space_id) REFERENCES wb_spaces(member_id,id) ON DELETE CASCADE)"
  },
  {
    "key": "init:wb_limits",
    "kind": "init",
    "sql": "CREATE TABLE IF NOT EXISTS wb_limits(key TEXT PRIMARY KEY,n INTEGER NOT NULL,expires INTEGER NOT NULL)"
  },
  {
    "key": "init:wb_paid",
    "kind": "init",
    "sql": "CREATE TRIGGER IF NOT EXISTS wb_paid AFTER UPDATE OF state ON wb_orders WHEN NEW.state='paid' AND OLD.state='pending' BEGIN UPDATE wb_members SET ends_at=MAX(ends_at,NEW.paid_at)+NEW.days*86400 WHERE id=NEW.member_id; END"
  },
  {
    "key": "init:wb_space_quota",
    "kind": "init",
    "sql": "CREATE TRIGGER IF NOT EXISTS wb_space_quota BEFORE INSERT ON wb_spaces WHEN (SELECT COUNT(*) FROM wb_spaces WHERE member_id=NEW.member_id)>=50 BEGIN SELECT RAISE(ABORT,'workspace_quota'); END"
  },
  {
    "key": "init:wb_version_quota",
    "kind": "init",
    "sql": "CREATE TRIGGER IF NOT EXISTS wb_version_quota BEFORE INSERT ON wb_versions WHEN NEW.bytes>65536 OR COALESCE((SELECT SUM(bytes) FROM wb_versions WHERE member_id=NEW.member_id),0)+NEW.bytes>5242880 BEGIN SELECT RAISE(ABORT,'storage_quota'); END"
  },
  {
    "key": "init:wb_pending_quota",
    "kind": "init",
    "sql": "CREATE TRIGGER IF NOT EXISTS wb_pending_quota BEFORE INSERT ON wb_orders WHEN (SELECT COUNT(*) FROM wb_orders WHERE state='pending' AND scan_done=0 AND created>NEW.created-604800)>=20 BEGIN SELECT RAISE(ABORT,'checkout_busy'); END"
  },
  {
    "key": "stats:payments",
    "kind": "stats",
    "sql": "SELECT COUNT(*) paid_orders,COUNT(DISTINCT member_id) paid_members,COALESCE(SUM(amount_units),0) gross_usdt_micro FROM wb_orders WHERE state='paid'"
  },
  {
    "key": "stats:active",
    "kind": "stats",
    "sql": "SELECT COUNT(*) n FROM wb_members WHERE suspended=0 AND ends_at>?"
  },
  {
    "key": "stats:pending",
    "kind": "stats",
    "sql": "SELECT COUNT(*) n FROM wb_orders WHERE state='pending' AND expires>?"
  },
  {
    "key": "public:member_health",
    "kind": "public",
    "sql": "SELECT checked_at FROM wb_health WHERE id=1"
  },
  {
    "key": "public:web3_health",
    "kind": "public",
    "sql": "SELECT checked_at FROM bpj_ad_web3_health WHERE id=?"
  }
];
const MEMBERSHIP_LIMIT = 1000;
const MEMBERSHIP_DAYS = Math.min(7, DAYS);
const membershipNormalize = sql => String(sql).trim().replace(/;$/, '').replace(/\s+/g, ' ');
export function membershipAllowlist(site) {
  return MEMBERSHIP_SQL.map(row => {
    const base = 9000000 + site.offset;
    const sql = row.sql.replace('amount_units>9000000 AND amount_units<9010000', `amount_units>${base} AND amount_units<${base + 10000}`);
    const normalized = membershipNormalize(sql);
    return {...row, sql, variants: [...new Set([sql, normalized, sql + ';', normalized + ';'])]};
  });
}
const Q_MEMBERSHIP_SCHEMA = `query {
  filterType: __type(name:"AccountD1QueriesAdaptiveGroupsFilter_InputObject") {inputFields{name}}
  dimensionType: __type(name:"AccountD1QueriesAdaptiveGroupsDimensions") {fields{name}}
  avgType: __type(name:"AccountD1QueriesAdaptiveGroupsAvg") {fields{name}}
}`;

export function membershipQuery(schema, site, start, end) {
  const filters = new Set(schema.filterType?.inputFields?.map(f => f.name));
  const dimensions = new Set(schema.dimensionType?.fields?.map(f => f.name));
  const averages = new Set(schema.avgType?.fields?.map(f => f.name));
  if (!filters.has('databaseId') || !dimensions.has('query') || !dimensions.has('databaseId') || !dimensions.has('date')) throw Error('exact_filter_schema_unavailable');
  const variants = membershipAllowlist(site).flatMap(row => row.variants);
  // Database/query/date groups fit below the fixed cap before optional error
  // grouping. Error cardinality is unknown: reaching the cap always fails closed.
  if (variants.length * MEMBERSHIP_DAYS >= MEMBERSHIP_LIMIT) throw Error('allowlist_bound_exceeded');
  const exact = filters.has('query_in') ? `query_in:${JSON.stringify(variants)}`
    : filters.has('query') && filters.has('OR') ? `OR:[${variants.map(q => `{query:${JSON.stringify(q)}}`).join(',')}]` : null;
  if (!exact) throw Error('exact_filter_schema_unavailable');
  const window = filters.has('date_geq') && filters.has('date_leq') ? `date_geq:${JSON.stringify(start)},date_leq:${JSON.stringify(end)}`
    : filters.has('datetime_geq') && filters.has('datetime_leq') ? `datetime_geq:"${start}T00:00:00Z",datetime_leq:"${end}T23:59:59Z"` : null;
  if (!window) throw Error('time_filter_schema_unavailable');
  return {sampleInterval: averages.has('sampleInterval'), errorDimension: dimensions.has('error'), query: `query($a:string!){viewer{accounts(filter:{accountTag:$a}){
    d1QueriesAdaptiveGroups(limit:${MEMBERSHIP_LIMIT},filter:{databaseId:${JSON.stringify(site.databaseId)},${window},${exact}}){
      count sum{rowsRead rowsWritten} ${averages.has('sampleInterval') ? 'avg{sampleInterval}' : ''} dimensions{databaseId query date ${dimensions.has('error') ? 'error' : ''}}
    }}}}`};
}

export function membershipEvidence(rows, site, start, end, withSampling = false, withErrors = false) {
  if (!Array.isArray(rows) || rows.length >= MEMBERSHIP_LIMIT) throw Error('query_result_missing_or_truncated');
  const allowed = membershipAllowlist(site), bySql = new Map(allowed.flatMap(row => row.variants.map(sql => [sql, row.key])));
  const groups = new Map(allowed.map(row => [row.key, {...row, calls: 0, rows_read: 0, rows_written: 0, dates: new Set(), samples: [], errorValues: new Set()}]));
  const seen = new Set();
  for (const row of rows) {
    const {databaseId, query, date} = row.dimensions || {}, key = bySql.get(query);
    const error = withErrors ? row.dimensions.error : undefined;
    if (withErrors && error !== null && typeof error !== 'string') throw Error('invalid_error_dimension');
    const signature = JSON.stringify([date, query, error]);
    if (databaseId !== site.databaseId || !key || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date < start || date > end || seen.has(signature)) throw Error('unexpected_query_result');
    if (!Number.isFinite(row.count) || row.count <= 0 || !['rowsRead', 'rowsWritten'].every(k => Number.isFinite(row.sum?.[k]) && row.sum[k] >= 0)) throw Error('invalid_query_metrics');
    if (withSampling && (!Number.isFinite(row.avg?.sampleInterval) || row.avg.sampleInterval < 1)) throw Error('invalid_sampling_metric');
    seen.add(signature);
    const group = groups.get(key);
    group.calls += row.count; group.rows_read += row.sum.rowsRead; group.rows_written += row.sum.rowsWritten; group.dates.add(date);
    if (withSampling) group.samples.push(row.avg.sampleInterval);
    if (withErrors) group.errorValues.add(JSON.stringify(error));
  }
  return [...groups.values()].map(g => ({
    site: site.site, group: g.key, kind: g.kind, status: g.calls ? 'observed_outcome_unknown' : 'unobserved_unknown',
    query_outcome: 'unverified', distinct_error_dimension_values: withErrors ? g.errorValues.size : null,
    calls: g.calls || null, rows_read: g.calls ? g.rows_read : null, rows_written: g.calls ? g.rows_written : null,
    rows_read_per_call: g.calls ? g.rows_read / g.calls : null, rows_written_per_call: g.calls ? g.rows_written / g.calls : null,
    observed_days: g.dates.size, first_day: [...g.dates].sort()[0] || null, last_day: [...g.dates].sort().at(-1) || null,
    max_average_sample_interval: g.samples.length ? Math.max(...g.samples) : null,
  }));
}

export function membershipProjection(evidence) {
  const category = kind => {
    const groups = evidence.filter(row => row.kind === kind);
    return groups.length && groups.every(row => row.status === 'observed_outcome_unknown')
      ? groups.reduce((n, row) => n + row.rows_read_per_call, 0) : null;
  };
  const stats = category('stats'), init = category('init'), health = category('public');
  return {stats_rows_per_call: stats, init_rows_per_call: init, public_health_rows_per_call: health,
    // Query Insights does not establish successful endpoint attribution. Even an
    // empty error dimension has no verified success convention here.
    two_request_rows: null};
}

async function membershipReport(token) {
  const start = day(MEMBERSHIP_DAYS), end = day(1);
  say('### Exact-allowlisted membership cost evidence (metadata only)'); say();
  say(`Window: ${start} 00:00:00 through ${end} 23:59:59 UTC (${MEMBERSHIP_DAYS} complete days). No membership endpoints or SQL execution.`);
  say('Bound: one schema introspection and at most four exact-filtered query-metadata calls, each capped at 1,000 groups. No pagination or broad query fallback.');
  say('Source allowlist: main ce503b8dd64be3a6405b0bfacff2511b5cfafa29; 21 init + 3 stats + 2 public-health statement shapes per site.');
  const schema = await gql(token, Q_MEMBERSHIP_SCHEMA, {}, true);
  if (schema.error) {say(`Membership evidence unavailable: ${schema.error}. Readiness remains CLOSED.`); return 1;}
  let fleet = 0, complete = true;
  for (const site of MEMBERSHIP_SITES) {
    let evidence;
    try {
      const request = membershipQuery(schema.data, site, start, end);
      const result = await gql(token, request.query, {a: ACCOUNT});
      if (result.error) {say(`Membership evidence unavailable for ${site.site}: ${result.error}. Stopped; readiness remains CLOSED.`); return 1;}
      evidence = membershipEvidence(result.data.d1QueriesAdaptiveGroups, site, start, end, request.sampleInterval, request.errorDimension);
    } catch {say(`Membership evidence unavailable for ${site.site}: schema, bounds or returned metrics failed validation. Readiness remains CLOSED.`); return 1;}
    say(); say(`#### ${site.site}`); say();
    say('| group | calls in window | rows read | rows written | read/call | observed days | status |');
    say('|---|---:|---:|---:|---:|---:|---|');
    for (const row of evidence) {
      const value = x => x === null ? 'unknown' : fmt(x);
      say(`| ${row.group} | ${value(row.calls)} | ${value(row.rows_read)} | ${value(row.rows_written)} | ${value(row.rows_read_per_call)} | ${row.observed_days}/${MEMBERSHIP_DAYS} | ${row.status} |`);
      say(`<!-- MEMBERSHIP_COST_EVIDENCE ${JSON.stringify(row)} -->`);
    }
    const projection = membershipProjection(evidence);
    say(`Sum of historical stats statement means (not successful endpoint cost): ${projection.stats_rows_per_call === null ? 'unknown' : fmt(projection.stats_rows_per_call)}.`);
    say(`Historical-mean rows for one public + one stats request (2 x init + health + stats): ${projection.two_request_rows === null ? 'unknown; success/endpoint attribution unverified and/or statement coverage incomplete' : fmt(projection.two_request_rows)}.`);
    if (projection.two_request_rows === null) complete = false; else fleet += projection.two_request_rows;
  }
  say();
  say(`Projection at the 8-request/day cap (one public + one stats request at four sites): ${complete ? fmt(fleet) + ' rows read/day using historical means' : 'UNKNOWN; successful endpoint attribution is unverified; missing observations must not be treated as zero'}.`);
  say('This is not a maximum-row-cost bound: AdaptiveGroups may estimate sampled counts, values are historical means, data/indexes can change, matching SQL has other callers, and query outcomes/success semantics are unverified. Error text is never logged; no null/empty error value is assumed to mean success. Days/calls describe statement observations, not endpoint frequency. No deployment ID, per-request trace, live index/EXPLAIN or cache evidence is supplied by this dataset. Missing samples, alternate query formatting, failed requests or unobserved initialization remain coverage gaps.');
  say('Readiness remains CLOSED. This diagnostic does not change or enable the aggregate collector.');
  say('References: https://developers.cloudflare.com/d1/observability/metrics-analytics/ ; https://developers.cloudflare.com/analytics/graphql-api/sampling/');
  return 0;
}

const out = [];
const say = (s = '') => { out.push(s); console.log(s); };
const fmt = (n) => Number(n || 0).toLocaleString('en-US');

async function gql(token, query, variables, root = false) {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { return { error: `HTTP ${res.status}, invalid JSON` }; }
  const error = body.errors?.map(e => String(e.message || '')).join(' | ');
  if ([401, 403].includes(res.status) || /unauth|forbidden|permission|not authorized/i.test(error || '')) throw Error('Analytics authorization denied; stop without changing access.');
  if (error) return { error: redact(error.split(token).join('<credential>')).slice(0, 300) };
  if (root) return body.data ? {data: body.data} : {error: `HTTP ${res.status}, no schema in response`};
  const acct = body.data?.viewer?.accounts?.[0];
  if (!acct) return { error: `HTTP ${res.status}, no account in response` };
  return { data: acct };
}

const REPORT_NOW = Date.now();
const day = (offset) => new Date(REPORT_NOW - offset * 86400e3).toISOString().slice(0, 10);

const Q_HOURLY = `query($a:string!,$d0:Date!,$d1:Date!){viewer{accounts(filter:{accountTag:$a}){
  d1AnalyticsAdaptiveGroups(limit:10000,filter:{date_geq:$d0,date_leq:$d1},orderBy:[datetimeHour_ASC]){
    sum{readQueries writeQueries rowsRead rowsWritten}
    dimensions{databaseId datetimeHour}
  }}}}`;

// Two filter spellings: the Date filter is documented for *AdaptiveGroups, the Time one is the fallback.
const Q_QUERIES = [
  `query($a:string!,$d0:Date!,$d1:Date!){viewer{accounts(filter:{accountTag:$a}){
    d1QueriesAdaptiveGroups(limit:60,filter:{date_geq:$d0,date_leq:$d1},orderBy:[sum_rowsRead_DESC]){
      count sum{rowsRead rowsWritten rowsReturned queryDurationMs} dimensions{databaseId query}
    }}}}`,
  `query($a:string!,$t0:Time!,$t1:Time!){viewer{accounts(filter:{accountTag:$a}){
    d1QueriesAdaptiveGroups(limit:60,filter:{datetime_geq:$t0,datetime_leq:$t1},orderBy:[sum_rowsRead_DESC]){
      count sum{rowsRead rowsWritten rowsReturned queryDurationMs} dimensions{databaseId query}
    }}}}`,
];

async function topQueries(token, d) {
  const errors = [];
  for (const q of Q_QUERIES) {
    const vars = q.includes('$t0')
      ? { a: ACCOUNT, t0: `${d}T00:00:00Z`, t1: `${d}T23:59:59Z` }
      : { a: ACCOUNT, d0: d, d1: d };
    const r = await gql(token, q, vars);
    if (r.data) return { rows: r.data.d1QueriesAdaptiveGroups || [] };
    errors.push(r.error);
  }
  return { error: errors.join(' || ') };
}

async function main() {
  const tokens = [];
  for (const v of TOKEN_VARS) {
    const t = (process.env[v] || '').trim();
    if (!t) continue;
    const seen = tokens.find((x) => x.value === t);
    if (seen) seen.names.push(v); else tokens.push({ names: [v], value: t });
  }
  say('## D1 row-read usage (account-wide free tier: 5,000,000 rows read per UTC day)');
  say();
  if (!ACCOUNT) { say('**Unavailable:** CLOUDFLARE_ACCOUNT_ID is not set.'); return 0; }
  if (!tokens.length) { say(`**Unavailable:** no token in ${TOKEN_VARS.join(', ')}.`); return 0; }

  let token, hourly;
  for (const t of tokens) {
    const r = await gql(t.value, Q_HOURLY, { a: ACCOUNT, d0: day(DAYS - 1), d1: day(0) });
    if (r.data) { token = t; hourly = r.data.d1AnalyticsAdaptiveGroups || []; break; }
    say(`- ${t.names.join('/')}: ${r.error}`);
  }
  if (!token) {
    say();
    say('**D1 analytics unavailable.** Stop and report the evidence gap; this diagnostic does not change token access.');
    return 1;
  }
  say(`Token that answered: ${token.names.join('/')}. Window: ${day(DAYS - 1)} → ${day(0)} (UTC).`);
  say();

  // Daily totals per database, and the hour each UTC day crossed the limit.
  const perDay = new Map(); // date -> Map(db -> rowsRead)
  const perDayW = new Map(); // date -> Map(db -> rowsWritten)
  const perHour = new Map(); // date -> [[hour, rowsRead]]
  for (const g of hourly) {
    const h = g.dimensions.datetimeHour, d = h.slice(0, 10), db = g.dimensions.databaseId, n = g.sum.rowsRead;
    if (!perDay.has(d)) { perDay.set(d, new Map()); perDayW.set(d, new Map()); }
    perDay.get(d).set(db, (perDay.get(d).get(db) || 0) + n);
    perDayW.get(d).set(db, (perDayW.get(d).get(db) || 0) + (g.sum.rowsWritten || 0));
    if (!perHour.has(d)) perHour.set(d, new Map());
    perHour.get(d).set(h, (perHour.get(d).get(h) || 0) + n);
  }
  const dbs = [...new Set(hourly.map((g) => g.dimensions.databaseId))];
  const dates = [...perDay.keys()].sort();
  const totalByDb = Object.fromEntries(dbs.map((db) => [db, dates.reduce((s, d) => s + (perDay.get(d).get(db) || 0), 0)]));
  dbs.sort((a, b) => totalByDb[b] - totalByDb[a]);
  say('### Rows read per database per UTC day');
  say();
  say(`| database | ${dates.map((d) => d.slice(5)).join(' | ')} |`);
  say(`|---|${dates.map(() => '---:').join('|')}|`);
  for (const db of dbs) say(`| ${nameOf(db)} | ${dates.map((d) => fmt(perDay.get(d).get(db))).join(' | ')} |`);
  say(`| **account total** | ${dates.map((d) => `**${fmt([...perDay.get(d).values()].reduce((a, b) => a + b, 0))}**`).join(' | ')} |`);
  say();
  // Writes have their own account-wide limit (100,000/day). A one-off migration spends from the same pool
  // as every site's event and pageview writes, so size it against this table first.
  say('### Rows written per database per UTC day (limit 100,000, account-wide)');
  say();
  say(`| database | ${dates.map((d) => d.slice(5)).join(' | ')} |`);
  say(`|---|${dates.map(() => '---:').join('|')}|`);
  for (const db of dbs) say(`| ${nameOf(db)} | ${dates.map((d) => fmt(perDayW.get(d).get(db))).join(' | ')} |`);
  say(`| **account total** | ${dates.map((d) => `**${fmt([...perDayW.get(d).values()].reduce((a, b) => a + b, 0))}**`).join(' | ')} |`);
  say();
  say('### When each day hit 5,000,000');
  say();
  for (const d of dates) {
    let cum = 0, crossed = null;
    for (const [h, n] of [...perHour.get(d)].sort()) { cum += n; if (!crossed && cum >= LIMIT) crossed = h; }
    say(`- ${d}: ${crossed ? `crossed at the ${crossed.slice(11, 16)} UTC hour` : 'not crossed'} (day total ${fmt(cum)})`);
  }
  say();

  for (const d of [day(1), day(0)]) {
    const r = await topQueries(token.value, d);
    say(`### Top queries by rows read, ${d}`);
    say();
    if (r.error) { say(`Query-level dataset unavailable: ${r.error}`); say(); continue; }
    const total = r.rows.reduce((s, x) => s + x.sum.rowsRead, 0);
    say('| rows read | calls | rows/call | database | query |');
    say('|---:|---:|---:|---|---|');
    for (const x of r.rows.slice(0, 40)) {
      const q = redact(x.dimensions.query).slice(0, 260).replace(/\|/g, '\\|');
      say(`| ${fmt(x.sum.rowsRead)} | ${fmt(x.count)} | ${fmt(Math.round(x.sum.rowsRead / Math.max(1, x.count)))} | ${nameOf(x.dimensions.databaseId)} | \`${q}\` |`);
    }
    say();
    say(`(top ${Math.min(40, r.rows.length)} shown; these ${r.rows.length} query shapes read ${fmt(total)} rows)`);
    say();
  }
  return membershipReport(token.value);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--selftest')) {
    const s = redact("SELECT * FROM subs WHERE email='a.b+c@example.com' AND w='0x1234567890abcdef1234567890abcdef12345678' AND k='abcdefghijklmnopqrstuvwxyz0123456789'");
    for (const bad of ['example.com', '0x1234567890abcdef', 'abcdefghijklmnopqrstuvwxyz0123456789']) {
      if (s.includes(bad)) { console.error(`redact leaked ${bad}: ${s}`); process.exit(1); }
    }
    if (!s.startsWith("SELECT * FROM subs WHERE email='<email>'")) { console.error(`redact ate the query: ${s}`); process.exit(1); }
    const {strict: assert} = await import('node:assert');
    const site = MEMBERSHIP_SITES[0], start = '2026-10-01', end = '2026-10-07';
    const schema = {
      filterType: {inputFields: ['databaseId', 'query_in', 'date_geq', 'date_leq'].map(name => ({name}))},
      dimensionType: {fields: ['databaseId', 'query', 'date'].map(name => ({name}))},
      avgType: {fields: [{name: 'sampleInterval'}]},
    };
    for (const entry of MEMBERSHIP_SITES) {
      const allow = membershipAllowlist(entry);
      assert.equal(allow.length, 26); assert.equal(allow.filter(row => row.kind === 'init').length, 21);
      assert.equal(allow.filter(row => row.kind === 'stats').length, 3);
      assert(allow.flatMap(row => row.variants).length * 7 < MEMBERSHIP_LIMIT);
      const orders = allow.find(row => row.key === 'init:wb_orders');
      assert(orders.sql.includes(`amount_units>${9000000 + entry.offset} AND amount_units<${9010000 + entry.offset}`));
      const request = membershipQuery(schema, entry, start, end);
      assert(request.query.includes('limit:1000')); assert(request.query.includes('query_in:'));
      assert(request.query.includes(entry.databaseId)); assert.equal(request.sampleInterval, true);
    }
    const noQueries = membershipEvidence([], site, start, end);
    assert(noQueries.every(row => row.rows_read === null && row.calls === null && row.status === 'unobserved_unknown'));
    assert.equal(membershipProjection(noQueries).two_request_rows, null);
    assert.throws(() => membershipQuery({}, site, start, end));
    const fallbackSchema = structuredClone(schema);
    fallbackSchema.filterType.inputFields = ['databaseId', 'query', 'OR', 'datetime_geq', 'datetime_leq'].map(name => ({name}));
    assert(membershipQuery(fallbackSchema, site, start, end).query.includes('OR:[{query:'));
    const fixture = membershipAllowlist(site).map(row => ({
      count: 2, sum: {rowsRead: 6, rowsWritten: 0}, avg: {sampleInterval: 1},
      dimensions: {databaseId: site.databaseId, query: row.sql, date: start},
    }));
    const evidence = membershipEvidence(fixture, site, start, end, true);
    assert.equal(membershipProjection(evidence).stats_rows_per_call, 9);
    assert.equal(membershipProjection(evidence).two_request_rows, null);
    assert(evidence.every(row => row.observed_days === 1 && row.calls === 2 && row.rows_read_per_call === 3));
    const zeros = fixture.map(row => ({...row, sum: {rowsRead: 0, rowsWritten: 0}}));
    assert.equal(membershipProjection(membershipEvidence(zeros, site, start, end)).stats_rows_per_call, 0);
    assert.equal(membershipProjection(membershipEvidence(zeros, site, start, end)).two_request_rows, null);
    assert.equal(membershipProjection(membershipEvidence(fixture.slice(1), site, start, end)).two_request_rows, null);
    for (const mutate of [
      row => {row.dimensions.query = 'SELECT email FROM wb_members';},
      row => {row.dimensions.databaseId = 'other-database';},
      row => {row.dimensions.date = '2026-09-30';},
      row => {row.count = 0;}, row => {row.sum.rowsRead = -1;},
      row => {row.sum.rowsWritten = null;}, row => {row.avg.sampleInterval = 0;},
    ]) {const changed = structuredClone(fixture); mutate(changed[0]); assert.throws(() => membershipEvidence(changed, site, start, end, true));}
    assert.throws(() => membershipEvidence([...fixture, fixture[0]], site, start, end));
    assert.throws(() => membershipEvidence(Array(MEMBERSHIP_LIMIT).fill(fixture[0]), site, start, end));
    assert.throws(() => membershipEvidence(null, site, start, end));
    const errorRows = [null, '', 'opaque-private-error'].map(error => ({...structuredClone(fixture[0]), dimensions: {...fixture[0].dimensions, error}}));
    const errorEvidence = membershipEvidence(errorRows, site, start, end, true, true);
    assert.equal(errorEvidence[0].calls, 6); assert.equal(errorEvidence[0].distinct_error_dimension_values, 3);
    assert.equal(errorEvidence[0].query_outcome, 'unverified');
    assert(!JSON.stringify(errorEvidence).includes('opaque-private-error'));
    assert.equal(membershipProjection(errorEvidence).two_request_rows, null);
    // Even selftests with token-shaped environment values cannot reach a network.
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++; assert.equal(url, 'https://api.cloudflare.com/client/v4/graphql');
      assert.equal(options.redirect, 'error'); assert(options.signal);
      return new Response(JSON.stringify({data: schema}), {status: 200});
    };
    assert.deepEqual((await gql('offline-fixture', Q_MEMBERSHIP_SCHEMA, {}, true)).data, schema);
    globalThis.fetch = async () => {calls++; return new Response(JSON.stringify({errors: [{message: 'permission denied offline-fixture'}]}), {status: 403});};
    await assert.rejects(gql('offline-fixture', Q_MEMBERSHIP_SCHEMA, {}, true), /authorization denied/);
    globalThis.fetch = async () => {calls++; return new Response('private error body offline-fixture', {status: 502});};
    assert.equal((await gql('offline-fixture', Q_MEMBERSHIP_SCHEMA, {}, true)).error, 'HTTP 502, invalid JSON');
    globalThis.fetch = originalFetch; assert.equal(calls, 3);
    console.log('d1_usage selftest ok (redaction, exact allowlist, bounds, missing/zero distinction, projection, adversarial metrics, offline GraphQL)');
    process.exit(0);
  }
  main().then(async (code) => {
    if (process.env.GITHUB_STEP_SUMMARY) {
      const { appendFileSync } = await import('node:fs');
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join('\n') + '\n');
    }
    process.exit(code);
  }, () => { console.error('D1 analytics unavailable or authorization denied; stopped without access changes.'); process.exit(1); });
}

