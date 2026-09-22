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
  if (cat) xs = xs.filter((x) => String(x.category || '').toLowerCase() === cat);
  if (st) xs = xs.filter((x) => String(x.status || '').toLowerCase() === st);
  if (tr) xs = xs.filter((x) => String(x.transport || '').toLowerCase().includes(tr));
  if (since && DATE.test(since)) xs = xs.filter((x) => String(x.first_seen || '') >= since);
  if (q) xs = xs.filter((x) => `${x.name} ${x.slug} ${x.category} ${x.description} ${(x.capabilities || []).join(' ')}`.toLowerCase().includes(q));
  return xs;
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
