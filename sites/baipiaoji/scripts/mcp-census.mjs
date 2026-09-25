// MCP census (2026-09-25, owner: 「挖掘 AI 时代的 agents 创业机会点…bpj 是你的武器」; memo: docs/agents-venture-2026-09-25.md).
//
// The official MCP registry is a phone book with no phone checks: 32 100 latest-version entries on 2026-09-25, 19 342 with a
// remote endpoint, growing ~2×/month, and nobody publishes which of those endpoints answer, what they expose, or when what they
// expose changes. This script is the "Harvard" stage of a verification layer over it — the bpj pattern (daily-verified live
// data + change history) applied to MCP servers instead of free tiers.
//
// What it sends, per endpoint: `initialize`, `notifications/initialized`, `tools/list`. Never a tool call, never credentials.
// What it keeps: state, tool count, a 16-hex hash of the tool list (names + descriptions + input schemas), dates.
// What it NEVER keeps or republishes: tool descriptions. They are third-party text written to be read by models, and a
// poisoned description is the attack (tool poisoning / rug pull); copying it onto our pages would pass it on.
//
// Politeness: read-only, streamable-HTTP remotes only, ≤3 endpoints per host per run, 16 concurrent, 8 s timeouts, a wall-clock
// budget, a UA that names the site. Runs on the existing daily schedule only (no push, no new cron).
//
// Usage:  node scripts/mcp-census.mjs [--max 1500] [--budget 150]    (pull registry + probe + write data/)
//         node scripts/mcp-census.mjs --selftest                     (zero network)
//         node scripts/mcp-census.mjs --dist                         (checks the built pages against the data)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CENSUS = path.join(ROOT, 'data/mcp-census.jsonl');
export const SUMMARY = path.join(ROOT, 'data/mcp-census-summary.json');
const REGISTRY = 'https://registry.modelcontextprotocol.io/v0/servers';
export const UA = 'baipiaoji-mcp-census/1.0 (+https://baipiaoji.com/en/agents/mcp-census; read-only initialize + tools/list)';
const PROTOCOL = '2025-06-18';
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// ── registry ─────────────────────────────────────────────────────────────
const official = (e) => (e._meta || {})['io.modelcontextprotocol.registry/official'] || {};
/** One row per probe-eligible remote endpoint: streamable HTTP, no URL template, no required header, entry active. */
export function eligibleRemotes(entries) {
  const out = [];
  for (const e of entries) {
    const s = e.server || e, m = official(e);
    if (m.status && m.status !== 'active') continue;
    for (const r of s.remotes || []) {
      const u = String(r.url || '');
      if (r.type !== 'streamable-http' || /[{}]/.test(u) || (r.headers || []).some((h) => h.isRequired)) continue;
      let host; try { const x = new URL(u); if (x.protocol !== 'https:' && x.protocol !== 'http:') continue; host = x.host; } catch { continue; }
      out.push({ u, n: String(s.name || '').slice(0, 200), host, p: String(m.publishedAt || '').slice(0, 10) || null });
    }
  }
  const seen = new Set();
  return out.filter((r) => (seen.has(r.u) ? false : seen.add(r.u)));
}
export function registryStats(entries) {
  const byMonth = {}, hostCount = new Map();
  let active = 0, deprecated = 0, withRemote = 0;
  for (const e of entries) {
    const s = e.server || e, m = official(e);
    if (m.status === 'deprecated') deprecated++; else active++;
    const month = String(m.publishedAt || '').slice(0, 7); if (month) byMonth[month] = (byMonth[month] || 0) + 1;
    if ((s.remotes || []).length) {
      withRemote++;
      const hosts = new Set((s.remotes || []).map((r) => { try { return new URL(r.url).host; } catch { return null; } }).filter(Boolean));
      for (const h of hosts) hostCount.set(h, (hostCount.get(h) || 0) + 1);
    }
  }
  const top = [...hostCount].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 5).map(([host, entries]) => ({ host, entries }));
  return { servers: entries.length, active, deprecated, with_remote: withRemote, remote_hosts: hostCount.size, top_hosts: top, by_month: Object.fromEntries(Object.entries(byMonth).sort()) };
}
async function pullRegistry() {
  const entries = []; let cursor = '', pages = 0;
  while (pages < 2000) {
    const u = new URL(REGISTRY); u.searchParams.set('limit', '100'); u.searchParams.set('version', 'latest'); if (cursor) u.searchParams.set('cursor', cursor);
    const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw Error(`registry HTTP ${r.status} after ${pages} pages`);
    const j = await r.json(); pages++;
    entries.push(...(j.servers || []));
    cursor = j.metadata?.nextCursor || j.metadata?.next_cursor || '';
    if (!cursor) break;
  }
  return { entries, pages };
}

// ── probe ────────────────────────────────────────────────────────────────
/** Order-independent hash of what a client would be shown: names, descriptions and input schemas. Description-sensitive on purpose. */
export function toolHash(tools) {
  const rows = tools.map((t) => [String(t?.name ?? ''), String(t?.description ?? ''), t?.inputSchema ?? null]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0, 16);
}
function parseBody(text, contentType, id) {
  if (String(contentType).includes('text/event-stream')) {
    for (const line of text.split(/\r?\n/)) if (line.startsWith('data:')) { try { const j = JSON.parse(line.slice(5).trim()); if (j && j.id === id) return j; } catch {} }
    return null;
  }
  try { return JSON.parse(text); } catch { return null; }
}
/** States: ok (tools listed) · auth (401/403 — needs credentials, not broken) · dead (timeout / network) · error (answered, but not MCP-shaped). */
export async function probe(url, f = fetch, ms = 8000) {
  const headers = (session) => ({ 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'User-Agent': UA, 'MCP-Protocol-Version': PROTOCOL, ...(session ? { 'Mcp-Session-Id': session } : {}) });
  const call = async (body, session) => {
    const r = await f(url, { method: 'POST', headers: headers(session), body: JSON.stringify(body), redirect: 'follow', signal: AbortSignal.timeout(ms) });
    const text = (await r.text()).slice(0, 2_000_000);
    return { status: r.status, session: r.headers.get('mcp-session-id'), msg: parseBody(text, r.headers.get('content-type') || '', body.id) };
  };
  try {
    const a = await call({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: 'baipiaoji-mcp-census', version: '1.0' } } });
    if (a.status === 401 || a.status === 403) return { s: 'auth' };
    if (!a.msg?.result) return { s: 'error' };
    try { await f(url, { method: 'POST', headers: headers(a.session), body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), signal: AbortSignal.timeout(ms) }).then((r) => r.text()); } catch {}
    const b = await call({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, a.session);
    if (b.status === 401 || b.status === 403) return { s: 'auth' };
    const tools = b.msg?.result?.tools;
    if (!Array.isArray(tools)) return { s: 'error' };
    return { s: 'ok', t: tools.length, k: toolHash(tools) };
  } catch { return { s: 'dead' }; }
}

// ── state ────────────────────────────────────────────────────────────────
/** Merge one probe result into a record. Only derived facts survive: no description, no raw response. */
export function merge(prev, row, result, day, env) {
  const r = { u: row.u, n: row.n, p: row.p ?? prev?.p ?? null, s: result.s, t: prev?.t ?? null, k: prev?.k ?? null, f: prev?.f || day, c: day, o: prev?.o ?? null, x: prev?.x ?? null, xc: prev?.xc || 0, pk: prev?.pk ?? null, pt: prev?.pt ?? null, e: env };
  if (result.s === 'ok') {
    if (prev?.k && prev.k !== result.k) { r.x = day; r.xc = (prev.xc || 0) + 1; r.pk = prev.k; r.pt = prev.t ?? null; }
    r.t = result.t; r.k = result.k; r.o = day;
  }
  return r;
}
/** Who gets probed this run: never-probed first (newest first), then last-ok oldest-checked (change detection), then the rest oldest-checked. */
export function pickBatch(rows, byUrl, max, perHost = 3) {
  const rank = (row) => { const p = byUrl.get(row.u); if (!p || !p.c) return [0, row.p ? -Date.parse(row.p) : 0]; return [p.s === 'ok' ? 1 : 2, Date.parse(p.c)]; };
  const sorted = rows.map((row) => [rank(row), row]).sort((a, b) => a[0][0] - b[0][0] || a[0][1] - b[0][1] || (a[1].u < b[1].u ? -1 : 1)).map((x) => x[1]);
  const perHostCount = new Map(), out = [];
  for (const row of sorted) {
    if (out.length >= max) break;
    const n = perHostCount.get(row.host) || 0; if (n >= perHost) continue;
    perHostCount.set(row.host, n + 1); out.push(row);
  }
  return out;
}
export const serialize = (records) => records.slice().sort((a, b) => (a.u < b.u ? -1 : a.u > b.u ? 1 : 0)).map((r) => JSON.stringify(r)).join('\n') + '\n';
export const readCensus = (file = CENSUS) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

/** Aggregates the page and /mcp-census.json print. One function so the page, the JSON and the checks cannot disagree. */
export function censusView(records, day, windowDays = 14) {
  const live = records.filter((r) => !r.g);
  const recent = live.filter((r) => r.c && daysBetween(r.c, day) <= windowDays);
  const states = { ok: 0, auth: 0, dead: 0, error: 0 };
  for (const r of recent) if (states[r.s] !== undefined) states[r.s]++;
  const okTools = recent.filter((r) => r.s === 'ok').map((r) => r.t).sort((a, b) => a - b);
  const changes = live.filter((r) => r.x && daysBetween(r.x, day) <= 30).sort((a, b) => (a.x < b.x ? 1 : a.x > b.x ? -1 : a.n < b.n ? -1 : 1))
    .map((r) => ({ name: r.n, url: r.u, changed: r.x, tools_before: r.pt, tools_now: r.t, changes_total: r.xc }));
  const everProbed = live.filter((r) => r.c).length;
  return { endpoints: live.length, ever_probed: everProbed, probed_recent: recent.length, window_days: windowDays, states, median_tools: okTools.length ? okTools[okTools.length >> 1] : null, changes_30d: changes };
}

// ── run ──────────────────────────────────────────────────────────────────
async function run(max, budgetSec) {
  const day = today(), env = process.env.GITHUB_ACTIONS ? 'runner' : 'sandbox', t0 = Date.now();
  const { entries, pages } = await pullRegistry();
  const rows = eligibleRemotes(entries), stats = registryStats(entries);
  const old = readCensus(), byUrl = new Map(old.map((r) => [r.u, r]));
  const current = new Set(rows.map((r) => r.u));
  const batch = pickBatch(rows, byUrl, max);
  let i = 0, done = 0; const results = new Map();
  await Promise.all(Array.from({ length: 16 }, async () => {
    while (i < batch.length && (Date.now() - t0) / 1000 < budgetSec) { const row = batch[i++]; results.set(row.u, await probe(row.u)); done++; }
  }));
  const next = [];
  for (const row of rows) { const prev = byUrl.get(row.u); const res = results.get(row.u); next.push(res ? merge(prev, row, res, day, env) : { ...(prev || { u: row.u, n: row.n, p: row.p, s: null, t: null, k: null, f: null, c: null, o: null, x: null, xc: 0, pk: null, pt: null, e: null }), n: row.n, p: row.p ?? prev?.p ?? null, ...(prev?.g ? { g: undefined } : {}) }); }
  for (const r of old) if (!current.has(r.u)) next.push({ ...r, g: r.g || 'gone' });   // keep history of endpoints that left the registry
  for (const r of next) if (r.g === undefined) delete r.g;
  fs.writeFileSync(CENSUS, serialize(next));
  const view = censusView(next, day);
  const probedStates = {}; for (const v of results.values()) probedStates[v.s] = (probedStates[v.s] || 0) + 1;
  const changedToday = next.filter((r) => r.x === day).length;
  const prevSummary = fs.existsSync(SUMMARY) ? JSON.parse(fs.readFileSync(SUMMARY, 'utf8')) : { history: [] };
  const history = (prevSummary.history || []).filter((h) => h.date !== day);
  history.push({ date: day, env, registry_servers: stats.servers, eligible: rows.length, probed: done, states: probedStates, changed: changedToday, coverage_recent: view.probed_recent });
  const summary = { version: 1, checked: day, env, registry_pages: pages, registry: stats, eligible_endpoints: rows.length, eligible_hosts: new Set(rows.map((r) => r.host)).size, last_run: { probed: done, planned: batch.length, seconds: Math.round((Date.now() - t0) / 1000), states: probedStates, changed: changedToday }, history: history.slice(-400) };
  fs.writeFileSync(SUMMARY, JSON.stringify(summary, null, 1) + '\n');
  console.log(`MCP census ${day} (${env}): registry ${stats.servers} entries / ${pages} pages, ${rows.length} eligible endpoints; probed ${done}/${batch.length} ${JSON.stringify(probedStates)}; tool lists changed today: ${changedToday}; recent coverage ${view.probed_recent}/${view.endpoints}`);
}

// ── checks ───────────────────────────────────────────────────────────────
function selftest() {
  const assert = (c, m) => { if (!c) { console.error('✗ ' + m); process.exit(1); } console.log('✅ ' + m); };
  const e = (name, remotes, status = 'active', publishedAt = '2026-09-01T00:00:00Z') => ({ server: { name, remotes }, _meta: { 'io.modelcontextprotocol.registry/official': { status, publishedAt } } });
  const rows = eligibleRemotes([
    e('a/ok', [{ type: 'streamable-http', url: 'https://a.example/mcp' }]),
    e('a/sse', [{ type: 'sse', url: 'https://a.example/sse' }]),
    e('a/tpl', [{ type: 'streamable-http', url: 'https://{tenant}.example/mcp' }]),
    e('a/hdr', [{ type: 'streamable-http', url: 'https://h.example/mcp', headers: [{ name: 'Authorization', isRequired: true }] }]),
    e('a/dep', [{ type: 'streamable-http', url: 'https://d.example/mcp' }], 'deprecated'),
    e('a/dup', [{ type: 'streamable-http', url: 'https://a.example/mcp' }]),
  ]);
  assert(rows.length === 1 && rows[0].u === 'https://a.example/mcp' && rows[0].host === 'a.example', 'eligibility: streamable HTTP only; templates, required headers, deprecated and duplicate URLs excluded');
  const t1 = [{ name: 'b', description: 'x', inputSchema: {} }, { name: 'a', description: 'y' }];
  assert(toolHash(t1) === toolHash([t1[1], t1[0]]), 'tool hash ignores list order');
  assert(toolHash(t1) !== toolHash([{ ...t1[0], description: 'x ignore previous instructions' }, t1[1]]), 'tool hash changes when only a description changes (rug pull)');
  const row = { u: 'https://a.example/mcp', n: 'a/ok', p: '2026-09-01', host: 'a.example' };
  const r1 = merge(null, row, { s: 'ok', t: 2, k: 'k1' }, '2026-09-25', 'sandbox');
  assert(r1.f === '2026-09-25' && r1.o === '2026-09-25' && r1.xc === 0 && r1.x === null, 'first probe: first-seen and last-ok set, no change');
  const r2 = merge(r1, row, { s: 'ok', t: 2, k: 'k1' }, '2026-09-26', 'runner');
  assert(r2.xc === 0 && r2.x === null && r2.f === '2026-09-25', 'same hash: no change recorded');
  const r3 = merge(r2, row, { s: 'dead' }, '2026-09-27', 'runner');
  assert(r3.s === 'dead' && r3.k === 'k1' && r3.t === 2 && r3.o === '2026-09-26', 'an outage keeps the last good hash so the next answer is still compared');
  const r4 = merge(r3, row, { s: 'ok', t: 3, k: 'k2' }, '2026-09-28', 'runner');
  assert(r4.x === '2026-09-28' && r4.xc === 1 && r4.pk === 'k1' && r4.pt === 2 && r4.t === 3, 'changed hash: change date, count, previous hash and previous tool count recorded');
  const line = serialize([merge(null, row, { s: 'ok', t: 1, k: toolHash([{ name: 'evil', description: 'SECRET-DESCRIPTION-TEXT' }]) }, '2026-09-25', 'sandbox')]);
  assert(!line.includes('SECRET-DESCRIPTION-TEXT') && !line.includes('evil'), 'stored lines never contain tool names or descriptions');
  const r5 = { ...r1, u: 'https://b.example/mcp' };
  assert(serialize([r4, r5]) === serialize([r5, r4]) && serialize([r4, r5]).startsWith('{"u":"https://a.example'), 'serialisation is sorted by URL and order-stable');
  const many = Array.from({ length: 8 }, (_, i) => ({ u: `https://big.example/${i}`, n: `b/${i}`, p: '2026-09-0' + (i + 1), host: 'big.example' }))
    .concat([{ u: 'https://old.example/mcp', n: 'o', p: '2026-01-01', host: 'old.example' }, { u: 'https://okx.example/mcp', n: 'k', p: '2026-01-01', host: 'okx.example' }]);
  const byUrl = new Map([['https://old.example/mcp', { s: 'dead', c: '2026-09-01' }], ['https://okx.example/mcp', { s: 'ok', c: '2026-09-20' }]]);
  const b = pickBatch(many, byUrl, 5);
  assert(b.length === 5 && b.filter((x) => x.host === 'big.example').length === 3, 'per-host cap of 3 per run holds');
  assert(b[0].u === 'https://big.example/7' && b[3].u === 'https://okx.example/mcp' && b[4].u === 'https://old.example/mcp', 'priority: never probed (newest first) → last ok → others');
  const view = censusView([{ ...r4, c: '2026-09-28' }, { u: 'z', n: 'z', s: 'auth', c: '2026-09-28' }, { u: 'g', n: 'g', s: 'ok', c: '2026-09-28', g: 'gone' }], '2026-09-28');
  assert(view.endpoints === 2 && view.states.ok === 1 && view.states.auth === 1 && view.changes_30d.length === 1 && view.changes_30d[0].tools_before === 2, 'view: gone endpoints excluded, states and 30-day changes counted');
  const stats = registryStats([e('x/1', [{ type: 'streamable-http', url: 'https://h1/mcp' }]), e('x/2', [{ type: 'streamable-http', url: 'https://h1/b' }]), e('x/3', [], 'deprecated', '2026-08-02T00:00:00Z')]);
  assert(stats.servers === 3 && stats.with_remote === 2 && stats.top_hosts[0].entries === 2 && stats.deprecated === 1 && stats.by_month['2026-08'] === 1, 'registry stats: remote share, host concentration, months');
  console.log('✅ mcp-census selftest passed (eligibility / hashing / change detection / no stored text / rotation / view)');
}

function checkDist() {
  const dist = path.join(ROOT, 'dist');
  const fail = (m) => { console.error('✗ mcp-census --dist: ' + m); process.exit(1); };
  const summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8'));
  const view = censusView(readCensus(), summary.checked);
  for (const [f, lang] of [['agents/mcp-census.html', 'zh'], ['en/agents/mcp-census.html', 'en']]) {
    const p = path.join(dist, f); if (!fs.existsSync(p)) fail(`${f} missing`);
    const h = fs.readFileSync(p, 'utf8');
    if (!h.includes('hreflang="en"') || !h.includes('hreflang="zh')) fail(`${f}: no hreflang pair`);
    const faqLd = (h.match(/"@type":"Question"/g) || []).length, faqVis = (h.match(/<details/g) || []).length;
    if (!faqLd || faqLd !== faqVis) fail(`${f}: FAQPage (${faqLd}) must equal visible FAQ (${faqVis})`);
    const rows = (h.match(/data-census-change/g) || []).length;
    if (rows !== Math.min(view.changes_30d.length, 50)) fail(`${f}: ${rows} change rows vs ${view.changes_30d.length} in data`);
    if (!h.includes(`data-census-endpoints="${view.endpoints}"`)) fail(`${f}: endpoint count on page does not match data`);
    if (lang === 'zh' ? !h.includes('agents/mcp-census') : !h.includes('/en/agents/mcp-census')) fail(`${f}: canonical`);
  }
  const j = JSON.parse(fs.readFileSync(path.join(dist, 'mcp-census.json'), 'utf8'));
  if (j.endpoints !== view.endpoints || j.changes_30d.length !== view.changes_30d.length) fail('/mcp-census.json disagrees with the data');
  if (/"description"/.test(JSON.stringify(j))) fail('/mcp-census.json must not carry any description field (third-party text is never republished)');
  const sm = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  if (!sm.includes('/agents/mcp-census')) fail('census page not in sitemap');
  const hub = fs.readFileSync(path.join(dist, 'agents/index.html'), 'utf8');
  if (!hub.includes('mcp-census')) fail('agents hub does not link the census');
  console.log(`✅ mcp-census --dist: zh/en pages, hreflang, FAQ = FAQPage, ${view.changes_30d.length} change rows, endpoints ${view.endpoints}, JSON agrees, in sitemap, linked from the hub`);
}

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? Number(argv[i + 1]) : d; };
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (argv.includes('--selftest')) selftest();
  else if (argv.includes('--dist')) checkDist();
  else await run(arg('--max', 1500), arg('--budget', 150));
}
