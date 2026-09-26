// Which D1 queries spend the account's free-tier row reads (5,000,000 rows read / day, account-wide,
// reset 00:00 UTC). Read-only: one Cloudflare GraphQL Analytics call per dataset, nothing written anywhere
// except this run's report. Every site's /api/pulse, event writes and account APIs fail for the rest of the
// UTC day once the budget is gone (2026-09-25 and 09-26), and no session could name the queries doing it —
// the sandbox has no analytics token and D1 itself refuses queries once exhausted.
//
// Needs Account → Account Analytics → Read. Tries every token secret it can see (the cf-analytics.mjs lesson)
// and says which one answered. Output goes to stdout and the job summary. The repo is public, so query text is
// redacted: e-mail addresses, 0x addresses and long opaque tokens are masked before printing.
const TOKEN_VARS = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN_ZONE', 'CF_API_TOKEN'];
const ACCOUNT = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const LIMIT = 5_000_000;
const DAYS = Math.max(1, Math.min(14, Number(process.env.D1_USAGE_DAYS) || 8));

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

const out = [];
const say = (s = '') => { out.push(s); console.log(s); };
const fmt = (n) => Number(n || 0).toLocaleString('en-US');

async function gql(token, query, variables) {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { return { error: `HTTP ${res.status}, not JSON: ${text.slice(0, 160)}` }; }
  if (body.errors?.length) return { error: body.errors.map((e) => e.message).join(' | ') };
  const acct = body.data?.viewer?.accounts?.[0];
  if (!acct) return { error: `HTTP ${res.status}, no account in response` };
  return { data: acct };
}

const day = (offset) => new Date(Date.now() - offset * 86400e3).toISOString().slice(0, 10);

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
    say('**No token can read D1 analytics.** Add *Account → Account Analytics → Read* to CLOUDFLARE_API_TOKEN, or read the same numbers in the dashboard: Workers & Pages → D1 → each database → Metrics / Queries.');
    return 1;
  }
  say(`Token that answered: ${token.names.join('/')}. Window: ${day(DAYS - 1)} → ${day(0)} (UTC).`);
  say();

  // Daily totals per database, and the hour each UTC day crossed the limit.
  const perDay = new Map(); // date -> Map(db -> rowsRead)
  const perHour = new Map(); // date -> [[hour, rowsRead]]
  for (const g of hourly) {
    const h = g.dimensions.datetimeHour, d = h.slice(0, 10), db = g.dimensions.databaseId, n = g.sum.rowsRead;
    if (!perDay.has(d)) perDay.set(d, new Map());
    perDay.get(d).set(db, (perDay.get(d).get(db) || 0) + n);
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
  return 0;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--selftest')) {
    const s = redact("SELECT * FROM subs WHERE email='a.b+c@example.com' AND w='0x1234567890abcdef1234567890abcdef12345678' AND k='abcdefghijklmnopqrstuvwxyz0123456789'");
    for (const bad of ['example.com', '0x1234567890abcdef', 'abcdefghijklmnopqrstuvwxyz0123456789']) {
      if (s.includes(bad)) { console.error(`redact leaked ${bad}: ${s}`); process.exit(1); }
    }
    if (!s.startsWith("SELECT * FROM subs WHERE email='<email>'")) { console.error(`redact ate the query: ${s}`); process.exit(1); }
    console.log('d1_usage selftest ok');
    process.exit(0);
  }
  main().then(async (code) => {
    if (process.env.GITHUB_STEP_SUMMARY) {
      const { appendFileSync } = await import('node:fs');
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join('\n') + '\n');
    }
    process.exit(code);
  }, (e) => { console.error(e); process.exit(1); });
}
