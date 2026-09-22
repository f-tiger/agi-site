// Pure helpers for the agent-watch registry, shared by the MCP server and the zero-network tests.
// No I/O here on purpose: mcp.js loads /agents.json through env.ASSETS and hands the list in, so the
// filter semantics can be unit-tested without a Worker runtime. Files starting with "_" are not routed
// by Pages Functions, so this never becomes an endpoint.
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// monitor_new_agents filters. All optional, all AND-ed; every string is matched case-insensitively.
//   query     — substring over name / slug / category / description / capabilities
//   category  — exact match (agent, coding, mcp, automation, trade, web3 …)
//   status    — exact match of the lifecycle status
//   transport — substring over the transport field ("mcp", "python", "cli" …)
//   since     — YYYY-MM-DD; keep records first seen ON OR AFTER that date (poll like a changelog)
export function filterAgents(list, args = {}) {
  let xs = Array.isArray(list) ? list.filter((x) => x && typeof x === 'object') : [];
  const q = String(args.query || '').toLowerCase().trim();
  const cat = String(args.category || '').toLowerCase().trim();
  const st = String(args.status || '').toLowerCase().trim();
  const tr = String(args.transport || '').toLowerCase().trim();
  const since = String(args.since || '').trim();
  const aud = String(args.audience || '').toLowerCase().trim();
  const origin = String(args.origin || '').toLowerCase().trim();
  if (aud) xs = xs.filter((x) => (Array.isArray(x.audiences) ? x.audiences : audiencesOf(x)).includes(aud));
  if (origin) xs = xs.filter((x) => String(x.origin || 'curated').toLowerCase() === origin);
  if (cat) xs = xs.filter((x) => String(x.category || '').toLowerCase() === cat);
  if (st) xs = xs.filter((x) => String(x.status || '').toLowerCase() === st);
  if (tr) xs = xs.filter((x) => String(x.transport || '').toLowerCase().includes(tr));
  if (since && DATE.test(since)) xs = xs.filter((x) => String(x.first_seen || '') >= since);
  if (q) xs = xs.filter((x) => `${x.name} ${x.slug} ${x.category} ${x.description} ${(x.capabilities || []).join(' ')}`.toLowerCase().includes(q));
  return xs;
}

// Audiences (2026-09-22, owner: "agents 要面向不同的用户分类清晰"). A record belongs to every audience whose rule
// matches — derived deterministically from category + vocab keys, never hand-assigned, so 1 000 records stay
// consistent and a reader picks a door by WHO THEY ARE rather than by what a framework calls itself.
//   developers  — you write code and want a framework / SDK / memory / runtime / eval layer
//   coders      — you want an agent that writes or reviews code for you
//   no-code     — you want to use or assemble agents without writing code
//   mcp         — you want to give any agent new abilities (MCP servers, clients, registries, gateways)
//   teams       — hosted enterprise / customer-facing platforms bought by a company
//   research    — research, data and evaluation work
export const AUDIENCES = ['developers', 'coders', 'no-code', 'mcp', 'teams', 'research'];
const NO_CODE_TRANSPORT = new Set(['hosted-product', 'web-ui', 'desktop-app', 'cloud-service', 'browser', 'browser-extension', 'registry-web']);
export function audiencesOf(a) {
  const k = (a && a.keys) || {}; const caps = new Set(k.capabilities || []); const out = new Set();
  const cat = String(a?.category || '');
  if (['agent', 'memory', 'runtime', 'observability'].includes(cat)) out.add('developers');
  if (cat === 'mcp' && (caps.has('mcp-sdk') || caps.has('mcp-client') || caps.has('mcp-gateway'))) out.add('developers');
  if (cat === 'coding') out.add('coders');
  if (cat === 'mcp') out.add('mcp');
  if (['platform', 'automation', 'browser', 'voice'].includes(cat) && (NO_CODE_TRANSPORT.has(k.transport) || caps.has('no-code'))) out.add('no-code');
  if (cat === 'platform' && ['paid', 'usage-billed'].includes(k.pricing)) out.add('teams');
  if (caps.has('customer-service') || caps.has('enterprise-integration')) out.add('teams');
  if (cat === 'research' || caps.has('evaluation') || caps.has('deep-research') || caps.has('data-analysis') || caps.has('research-papers')) out.add('research');
  if (!out.size) out.add(cat === 'trade' || cat === 'web3' ? 'developers' : 'developers');
  return AUDIENCES.filter((x) => out.has(x));
}

// Pagination for monitor_new_agents (2026-09-22, registry grew past 200). offset ≥ 0, limit 1..100 (default 50).
// Junk is clamped, never thrown: an agent passing limit:"all" gets the default page, not an error.
export const PAGE_DEFAULT = 50, PAGE_MAX = 100;
export function paginate(list, args = {}) {
  const xs = Array.isArray(list) ? list : [];
  let limit = Number.parseInt(args.limit, 10); if (!Number.isFinite(limit) || limit < 1) limit = PAGE_DEFAULT; if (limit > PAGE_MAX) limit = PAGE_MAX;
  let offset = Number.parseInt(args.offset, 10); if (!Number.isFinite(offset) || offset < 0) offset = 0;
  const page = xs.slice(offset, offset + limit);
  const next = offset + page.length < xs.length ? offset + page.length : null;
  return { total: xs.length, offset, limit, returned: page.length, next_offset: next, page };
}

// get_agent: exact slug first, then a case-insensitive name match. Never fuzzy beyond that —
// an agent asking for "goose" must not silently receive "openhands".
export function findAgent(list, needle) {
  const n = String(needle || '').toLowerCase().trim();
  if (!n || !Array.isArray(list)) return null;
  return list.find((x) => x && String(x.slug || '').toLowerCase() === n)
      || list.find((x) => x && String(x.name || '').toLowerCase() === n)
      || null;
}

// The verification block every agent-facing answer carries: which URL was last confirmed reachable and
// when. A null is a statement ("not checked from a network that can reach it"), not a missing field.
export function verificationOf(a) {
  return {
    status: a.status || null,
    first_seen: a.first_seen || null,
    last_verified: a.last_verified || null,
    source_url_checked: a.source_checked || null,
    repo_url_checked: a.repo_checked || null,
    evidence_level: a.evidence_level || null,
  };
}
