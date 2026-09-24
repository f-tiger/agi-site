#!/usr/bin/env node
// MCP discovery probe (2026-09-22, owner: 「做好 geo，mcp 的自动注册与被发现」). Zero AI, read-only, scheduled.
//
// Answers one question every day and writes it to data/mcp-discovery.json: "is this server actually findable?"
//   ① Official registry (registry.modelcontextprotocol.io) — AUTHORITATIVE: our name is listed, isLatest, and its
//      version equals server.json. bpj-mcp-publish.yml publishes automatically when server.json changes; this is the
//      instrument that says whether that publish took (a version drift here = the publish workflow failed or lagged).
//   ② Third-party directories — INFORMATIONAL: public search pages/APIs are fetched with the plain UA and grepped for
//      our domain. Many render client-side, so `found:false` there means "not seen from here", not "not listed"; only
//      `found:true` is a fact. Owner-side submissions are listed in docs/distribution-staging/bpj-mcp-directories-*.md.
//   ③ Our own discovery files — /.well-known/mcp.json version == server.json, /openapi.json, /llms.txt reachable.
// Exit code: 1 only when ① is wrong (not listed, not latest, or version mismatch) — that is a real regression.
// Usage: node scripts/mcp-discovery-probe.mjs [--selftest]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'mcp-discovery.json');
const UA = 'baipiaoji-mcp-discovery/1.0 (+https://baipiaoji.com/mcp)';
const SITE = 'https://baipiaoji.com';

export const DIRECTORIES = [
  // name, public search URL (our name or domain as the query), how to submit (for the owner kit)
  { id: 'pulsemcp', name: 'PulseMCP', url: 'https://www.pulsemcp.com/servers?q=baipiaoji', submit: 'https://www.pulsemcp.com/submit' },
  { id: 'glama', name: 'Glama', url: 'https://glama.ai/mcp/servers?query=baipiaoji', submit: 'https://glama.ai/mcp/servers' },
  { id: 'mcp-so', name: 'mcp.so', url: 'https://mcp.so/search?q=baipiaoji', submit: 'https://mcp.so/submit' },
  { id: 'smithery', name: 'Smithery', url: 'https://smithery.ai/search?q=baipiaoji', submit: 'https://smithery.ai/new' },
  { id: 'cursor-directory', name: 'Cursor Directory (community)', url: 'https://cursor.directory/mcp?q=baipiaoji', submit: 'https://cursor.directory/' },
];

// Pure: read the official registry answer for our name.
export function officialStatus(payload, serverJson) {
  const rows = (payload && payload.servers) || [];
  const mine = rows.filter((r) => r && r.server && r.server.name === serverJson.name);
  if (!mine.length) return { listed: false, latest_version: null, is_latest: null, version_matches: false, updated_at: null };
  const meta = (r) => (r._meta && r._meta['io.modelcontextprotocol.registry/official']) || {};
  const latest = mine.find((r) => meta(r).isLatest === true) || mine.sort((a, b) => String(meta(b).updatedAt || '').localeCompare(String(meta(a).updatedAt || '')))[0];
  return { listed: true, latest_version: latest.server.version || null, is_latest: meta(latest).isLatest === true, version_matches: latest.server.version === serverJson.version, updated_at: meta(latest).updatedAt || null, status: meta(latest).status || null };
}
// Pure: presence of our domain in a directory page body.
export const seenIn = (body) => /baipiaoji\.com|verified-ai-free-tiers/i.test(String(body || ''));

async function get(url, json) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: json ? 'application/json' : 'text/html,*/*;q=0.5' }, signal: ctl.signal, redirect: 'follow' });
    clearTimeout(t);
    const body = await r.text();
    return { status: r.status, body };
  } catch (e) { return { status: null, body: '', error: e.message }; }
}

function selftest() {
  const sj = { name: 'io.github.x/y', version: '1.2.0' };
  const row = (v, latest, at) => ({ server: { name: 'io.github.x/y', version: v }, _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: latest, updatedAt: at, status: 'active' } } });
  const cases = [
    ['not listed → listed:false, no version', officialStatus({ servers: [] }, sj).listed === false],
    ['listed + latest matches → ok', (() => { const s = officialStatus({ servers: [row('1.1.0', false, '2026-09-01'), row('1.2.0', true, '2026-09-22')] }, sj); return s.listed && s.is_latest && s.version_matches && s.latest_version === '1.2.0'; })()],
    ['registry behind server.json → version_matches:false', officialStatus({ servers: [row('1.1.0', true, '2026-09-01')] }, sj).version_matches === false],
    ['other names ignored', officialStatus({ servers: [{ server: { name: 'io.github.a/b', version: '9.9.9' }, _meta: {} }] }, sj).listed === false],
    ['seenIn: domain or registry tail counts', seenIn('<a href="https://baipiaoji.com/mcp">') && seenIn('verified-ai-free-tiers') && !seenIn('<html>nothing</html>')],
  ];
  let bad = 0; for (const [n, p] of cases) { console.log(`${p ? '✅' : '❌'} ${n}`); if (!p) bad++; } return bad;
}

async function main() {
  if (process.argv.includes('--selftest')) process.exit(selftest() ? 1 : 0);
  const serverJson = JSON.parse(readFileSync(join(ROOT, 'server.json'), 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const tail = serverJson.name.split('/').pop();
  const reg = await get(`https://registry.modelcontextprotocol.io/v0/servers?search=${encodeURIComponent(tail)}&version=latest`, true);
  let official = { listed: false, http: reg.status, error: reg.error || null };
  try { official = { ...officialStatus(JSON.parse(reg.body), serverJson), http: reg.status }; } catch (e) { official.parse_error = e.message; }
  const directories = [];
  for (const d of DIRECTORIES) {
    const r = await get(d.url, false);
    directories.push({ id: d.id, name: d.name, url: d.url, http: r.status, found: r.status === 200 && seenIn(r.body), evidence: 'html-grep (client-rendered pages may hide a real listing; only found:true is a fact)' });
    await new Promise((res) => setTimeout(res, 500));
  }
  const wk = await get(`${SITE}/.well-known/mcp.json`, true);
  let wkVersion = null; try { wkVersion = JSON.parse(wk.body).version || null; } catch {}
  const oa = await get(`${SITE}/openapi.json`, true), ll = await get(`${SITE}/llms.txt`, false);
  const out = {
    checked: today, server: { name: serverJson.name, version: serverJson.version, remote: serverJson.remotes?.[0]?.url || null },
    official_registry: official,
    own_surfaces: { well_known_http: wk.status, well_known_version: wkVersion, well_known_matches: wkVersion === serverJson.version, openapi_http: oa.status, llms_txt_http: ll.status, llms_mentions_mcp: /\/api\/mcp/.test(ll.body) },
    directories,
    note: 'Written by scripts/mcp-discovery-probe.mjs (scheduled). official_registry is authoritative; directories are informational grep results.',
  };
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(out, null, 1));
  const bad = !official.listed || official.version_matches === false || official.is_latest === false;
  if (bad) { console.error(`::error::official MCP registry: listed=${official.listed} latest=${official.latest_version} is_latest=${official.is_latest} server.json=${serverJson.version} — publish did not take`); process.exit(1); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('mcp-discovery-probe failed:', e.message); process.exit(process.argv.includes('--selftest') ? 1 : 0); });
}
