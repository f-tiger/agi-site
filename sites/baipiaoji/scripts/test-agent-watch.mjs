#!/usr/bin/env node
// Zero-network gates for the agent-watch surface (2026-09-22).
//   default : registry schema + verifier semantics + MCP filter/lookup + the `home` beacon allowlist
//   --dist  : after `npm run build`, the homepage really carries the agents strip and the block-click beacon,
//             and the built /agents/ pages agree with the registry (线上 == 仓库 is asserted post-deploy in CI)
// Why each exists: an entry with a missing zh field renders a Chinese page with English holes (the
// 2026-08-12 zhLeak lesson, JSON edition); a filter that silently ignores `since` turns a changelog poll into
// a full dump; and a `home` event name missing from hit.js is dropped at the edge while the page looks fine —
// exactly how the `audit` event vanished for weeks.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterAgents, findAgent, verificationOf } from '../functions/api/_agents.js';
import { EVENTS } from '../functions/api/hit.js';
import { applyCheck } from './agent-watch-verify.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let bad = 0;
const ck = (c, m) => { if (!c) { console.error(`❌ ${m}`); bad++; } };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const today = new Date().toISOString().slice(0, 10);
const reg = JSON.parse(readFileSync(join(ROOT, 'data', 'agent-watch.json'), 'utf8'));
const agents = reg.agents;

if (process.argv.includes('--dist')) {
  for (const p of ['dist/index.html', 'dist/en/index.html']) {
    const f = join(ROOT, p);
    ck(existsSync(f), `${p} missing — run npm run build first`);
    if (!existsSync(f)) continue;
    const s = readFileSync(f, 'utf8');
    ck(s.includes('data-home-block="agent-watch"'), `${p}: agents strip missing from the homepage`);
    ck(s.includes("bpjEv('home'"), `${p}: block-level click beacon missing — homepage clicks would stay unmeasured`);
    ck(/href="[^"]*\/agents\/"/.test(s), `${p}: no link to /agents/`);
    const sec = s.match(/<section class="group" data-cat="agent"[\s\S]*?<\/section>/);
    ck(!!sec && sec[0].includes('agent-watch'), `${p}: strip must live inside the 智能体 section, not float elsewhere`);
  }
  const zh = join(ROOT, 'dist', 'agents', 'index.html');
  ck(existsSync(zh), 'dist/agents/index.html missing');
  if (existsSync(zh)) {
    const s = readFileSync(zh, 'utf8');
    for (const a of agents) ck(s.includes(`/agents/${a.slug}"`), `built /agents/ lacks ${a.slug}`);
  }
  const aj = join(ROOT, 'dist', 'agents.json');
  ck(existsSync(aj) && JSON.parse(readFileSync(aj, 'utf8')).count === agents.length, 'dist/agents.json count ≠ registry');
  if (bad) { console.error(`test-agent-watch --dist: ${bad} failed`); process.exit(1); }
  console.log(`✅ test-agent-watch --dist: homepage strip + home beacon present (zh/en), /agents/ carries all ${agents.length} records`);
  process.exit(0);
}

// ── 1. registry schema ──────────────────────────────────────────────────
const REQ = ['slug', 'name', 'category', 'description', 'source_url', 'repo_url', 'first_seen', 'last_verified', 'status', 'transport', 'capabilities', 'pricing_note', 'evidence_level',
  'zh_description', 'zh_category', 'zh_transport', 'zh_capabilities', 'zh_pricing_note', 'zh_evidence_level'];
const STATUS = new Set(['new', 'verified', 'updated', 'stale', 'retired']);
ck(agents.length >= 6, 'registry lost entries');
const slugs = new Set();
for (const a of agents) {
  for (const k of REQ) ck(a[k] !== undefined && a[k] !== '', `${a.slug}: missing ${k}`);
  ck(/^[a-z0-9][a-z0-9-]*$/.test(a.slug), `${a.slug}: slug must be kebab-case`);
  ck(!slugs.has(a.slug), `${a.slug}: duplicate slug`); slugs.add(a.slug);
  ck(/^https:\/\/.+\..+/.test(a.source_url) && /^https:\/\/.+\..+/.test(a.repo_url), `${a.slug}: source/repo must be https URLs`);
  ck(STATUS.has(a.status), `${a.slug}: bad status ${a.status}`);
  ck(DATE.test(a.first_seen) && DATE.test(a.last_verified), `${a.slug}: dates must be YYYY-MM-DD`);
  ck(a.first_seen <= a.last_verified && a.last_verified <= today, `${a.slug}: first_seen ≤ last_verified ≤ today violated`);
  ck(Array.isArray(a.capabilities) && a.capabilities.length && Array.isArray(a.zh_capabilities) && a.zh_capabilities.length === a.capabilities.length, `${a.slug}: capabilities/zh_capabilities must be parallel arrays`);
  ck('source_checked' in a && 'repo_checked' in a, `${a.slug}: source_checked/repo_checked must be present (null is a statement)`);
  for (const k of ['source_checked', 'repo_checked']) ck(a[k] === null || (DATE.test(a[k]) && a[k] <= today), `${a.slug}: ${k} must be null or a past/today date`);
  ck(!/\d{2,}[kK+]|\d+ ?stars|\$\d/.test(a.description + a.pricing_note), `${a.slug}: no star counts, user counts or prices in prose — those are numbers we did not verify`);
}
ck(typeof reg.policy?.url_checks === 'string', 'policy.url_checks must explain what the check dates mean');

// ── 2. verifier semantics (the pure part of agent-watch-verify.mjs) ─────
const base = { slug: 'x', status: 'new', first_seen: '2026-09-22', last_verified: '2026-09-22', source_checked: '2026-09-22', repo_checked: null };
ck(applyCheck(base, { source: 200, repo: 200 }, '2026-09-23').repo_checked === '2026-09-23', 'verifier: reachable repo gets stamped');
ck(applyCheck(base, { source: 200, repo: 403 }, '2026-09-23').repo_checked === null, 'verifier: 403 never counts as a check');
ck(applyCheck(base, { source: 404, repo: 200 }, '2026-09-23').status === 'stale', 'verifier: 404 on the official page → stale');
ck(applyCheck(base, { source: null, repo: null }, '2026-09-23').status === 'new', 'verifier: network failure changes nothing');

// ── 3. MCP filters & lookup ─────────────────────────────────────────────
const F = [
  { slug: 'a', name: 'Alpha', category: 'agent', status: 'new', first_seen: '2026-09-22', transport: 'Python SDK', description: 'x', capabilities: ['rag'] },
  { slug: 'b', name: 'Beta MCP', category: 'mcp', status: 'verified', first_seen: '2026-09-01', transport: 'stdio MCP server', description: 'y', capabilities: ['fetch'] },
  { slug: 'c', name: 'Gamma', category: 'agent', status: 'stale', first_seen: '2026-08-15', transport: 'CLI', description: 'z', capabilities: ['browser automation'] },
];
ck(filterAgents(F, {}).length === 3, 'no args → everything');
ck(filterAgents(F, { since: '2026-09-01' }).map((x) => x.slug).join() === 'a,b', 'since keeps first_seen ≥ date (inclusive)');
ck(filterAgents(F, { since: 'yesterday' }).length === 3, 'malformed since is ignored, not treated as a filter that matches nothing');
ck(filterAgents(F, { transport: 'mcp' }).map((x) => x.slug).join() === 'b', 'transport is a case-insensitive substring');
ck(filterAgents(F, { category: 'AGENT', status: 'stale' }).map((x) => x.slug).join() === 'c', 'category+status AND together, case-insensitive');
ck(filterAgents(F, { query: 'browser' }).map((x) => x.slug).join() === 'c', 'query searches capabilities too');
ck(filterAgents(null, {}).length === 0 && filterAgents([null, 1, 'x'], {}).length === 0, 'junk lists never throw');
ck(findAgent(F, 'B')?.slug === 'b' && findAgent(F, 'beta mcp')?.slug === 'b', 'lookup by slug or exact name, case-insensitive');
ck(findAgent(F, 'bet') === null, 'no fuzzy matching — a wrong record is worse than none');
ck(findAgent(F, '') === null && findAgent(null, 'a') === null, 'empty needle / null list → null');
ck(verificationOf({ status: 'new', source_checked: '2026-09-22' }).repo_url_checked === null, 'verification block exposes null checks as null');
// The filters must work on the real registry too (guards against a schema drift that only shows up on real rows).
ck(filterAgents(agents, { since: '2026-09-22' }).length >= 1, 'real registry: since filter finds this batch');
ck(filterAgents(agents, { transport: 'mcp' }).length >= 1, 'real registry: at least one MCP-transport record');
ck(findAgent(agents, agents[0].slug)?.slug === agents[0].slug, 'real registry: lookup round-trips');

// ── 4. the home beacon is on the allowlist ──────────────────────────────
ck(EVENTS.has('home'), "hit.js EVENTS must include 'home' — otherwise the homepage block clicks are dropped at the edge while the page looks fine");
ck(EVENTS.has('go') && EVENTS.has('star'), 'existing events still allowlisted');

if (bad) { console.error(`\ntest-agent-watch: ${bad} failed`); process.exit(1); }
console.log(`✅ test-agent-watch: ${agents.length} registry records valid (zh parity, dates, checks), verifier semantics, MCP filters/lookup, home beacon allowlisted`);
