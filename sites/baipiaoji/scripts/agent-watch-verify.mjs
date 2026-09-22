#!/usr/bin/env node
// Daily URL verification for data/agent-watch.json (2026-09-22). Rides the existing scheduled run,
// no new cron. Zero AI, zero facts written — it only stamps WHEN each URL last answered.
//
// Why: the registry's own policy says discovery is separated from verification, so every record must say
// WHICH url answered and WHEN — and keep saying so as URLs rot. First run (2026-09-22, from the maintaining
// session): 26/28 repository URLs 200, the two first-party ones (tradecheck-mcp, web3-studio) 404 because
// the monorepo went private on 09-18. Note on UA: curl with a Mozilla-style UA got 403 from github.com and
// api.github.com through the session proxy; this script's own plain UA got 200 — identify honestly and
// GitHub answers. A listing never claims a check it did not make: an unreachable URL keeps its old date or
// stays null, and the page renders the last HTTP status next to it.
//
// Semantics (pure, in applyCheck, unit-tested by scripts/test-agent-watch.mjs):
//   2xx/3xx on source_url  → source_checked = today; a 'stale' record recovers to 'verified'
//   2xx/3xx on repo_url    → repo_checked = today
//   both reachable         → last_verified = today; 'new' becomes 'verified' once first_seen is in the past
//   404 / 410 on source    → status = 'stale' (never 'retired' — that is an editorial verdict, not an HTTP code)
//   403 / 429 / 5xx / timeout / network error → nothing changes (unknown ≠ dead; fail-open like source-drift)
// Usage: node scripts/agent-watch-verify.mjs [--selftest]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'data', 'agent-watch.json');
const UA = 'baipiaoji-agent-watch/1.0 (+https://baipiaoji.com/agents/)';
const ok = (c) => Number.isInteger(c) && c >= 200 && c < 400;
const gone = (c) => c === 404 || c === 410;

export function applyCheck(agent, res, today) {
  const a = { ...agent };
  const s = res && Number.isInteger(res.source) ? res.source : null;
  const r = res && Number.isInteger(res.repo) ? res.repo : null;
  if (s !== null) a.source_http = s;
  if (r !== null) a.repo_http = r;
  if (ok(s)) { a.source_checked = today; if (a.status === 'stale') a.status = 'verified'; }
  if (ok(r)) a.repo_checked = today;
  if (ok(s) && (r === null ? false : ok(r))) {
    a.last_verified = today;
    if (a.status === 'new' && String(a.first_seen || '') < today) a.status = 'verified';
  }
  if (gone(s)) a.status = 'stale';
  return a;
}

async function head(url) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': UA, accept: 'text/html,application/json;q=0.9,*/*;q=0.5' } });
    clearTimeout(t);
    return res.status;
  } catch (e) { return null; }
}

function selftest() {
  const base = { slug: 'x', status: 'new', first_seen: '2026-09-22', last_verified: '2026-09-22', source_checked: '2026-09-22', repo_checked: null };
  const T = '2026-09-23';
  const cases = [
    ['both 200 → both stamped, last_verified today, new→verified', (() => { const a = applyCheck(base, { source: 200, repo: 200 }, T); return a.source_checked === T && a.repo_checked === T && a.last_verified === T && a.status === 'verified'; })()],
    ['repo 403 → repo stays null, source stamped, last_verified unchanged, status unchanged', (() => { const a = applyCheck(base, { source: 200, repo: 403 }, T); return a.repo_checked === null && a.source_checked === T && a.last_verified === '2026-09-22' && a.status === 'new'; })()],
    ['source 404 → stale, dates untouched', (() => { const a = applyCheck(base, { source: 404, repo: 200 }, T); return a.status === 'stale' && a.source_checked === '2026-09-22'; })()],
    ['stale recovers on 200', (() => { const a = applyCheck({ ...base, status: 'stale' }, { source: 200, repo: null }, T); return a.status === 'verified' && a.source_checked === T; })()],
    ['network error → nothing changes', (() => { const a = applyCheck(base, { source: null, repo: null }, T); return JSON.stringify(a) === JSON.stringify(base); })()],
    ['500 → nothing changes (unknown ≠ dead)', (() => { const a = applyCheck(base, { source: 503, repo: 502 }, T); return a.status === 'new' && a.source_checked === '2026-09-22' && a.repo_checked === null && a.source_http === 503; })()],
    ['same-day first_seen stays new even when both reachable', (() => { const a = applyCheck(base, { source: 200, repo: 200 }, '2026-09-22'); return a.status === 'new' && a.last_verified === '2026-09-22'; })()],
    ['never auto-retires', (() => { const a = applyCheck({ ...base, status: 'verified' }, { source: 410, repo: 404 }, T); return a.status === 'stale'; })()],
  ];
  let bad = 0;
  for (const [n, p] of cases) { console.log(`${p ? '✅' : '❌'} ${n}`); if (!p) bad++; }
  return bad;
}

async function main() {
  if (process.argv.includes('--selftest')) process.exit(selftest() ? 1 : 0);
  const raw = readFileSync(FILE, 'utf8');
  const d = JSON.parse(raw);
  const today = new Date().toISOString().slice(0, 10);
  const out = [];
  let changed = 0;
  for (const a of d.agents) {
    const res = { source: await head(a.source_url), repo: a.repo_url ? await head(a.repo_url) : null };
    await new Promise((r) => setTimeout(r, 400));
    const b = applyCheck(a, res, today);
    if (JSON.stringify(b) !== JSON.stringify(a)) changed++;
    out.push(b);
    console.log(`${String(res.source ?? '---').padStart(3)} ${String(res.repo ?? '---').padStart(3)}  ${a.slug}  ${b.status}`);
  }
  d.agents = out;
  d.checked = today;
  const next = JSON.stringify(d, null, 2) + '\n';
  if (next !== raw) writeFileSync(FILE, next);
  console.log(`agent-watch-verify: ${out.length} records, ${changed} changed, checked=${today}`);
}
// Run only when executed directly. scripts/test-agent-watch.mjs imports applyCheck from here, and on
// 2026-09-22 the first import fired a full network verification from inside a "zero-network" gate —
// the module ran main() on import. That is exactly the shape of side effect a push-path gate must not have.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('agent-watch-verify failed:', e.message); process.exit(0); /* fail-open: a verifier outage must not block the daily run */ });
}
