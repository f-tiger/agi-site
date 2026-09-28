#!/usr/bin/env node
// Pull candidates from the official MCP registry (registry.modelcontextprotocol.io) into
// data/agent-watch-candidates-registry.json (2026-09-22). Zero AI. This is DISCOVERY only — nothing here enters
// data/agent-watch.json; scripts/agent-watch-admit.mjs still has to reach each candidate's official page (2xx).
//
// Why this source: the registry authenticates namespaces (GitHub OAuth for io.github.*, DNS/HTTP for domains), so
// every listing was published by whoever controls that namespace — a source-backed discovery signal, unlike a rumor
// feed. What we keep is exactly what the publisher wrote: name, title, description, repository URL, website URL,
// package registries and remote endpoints. We do not rank, rate or summarise.
//
// Selection (deterministic): latest version only, status active, MUST have a repository URL or a website URL
// (no official page → nothing to verify → not a candidate), then newest updatedAt first, capped at --cap (default 720)
// so the registry does not swamp the curated records. A description with CJK text goes to zh_description and the
// English side gets a fixed sentence (the en pages carry a no-CJK gate); numbers in a publisher's description are the
// publisher's words and are rendered as such, never as our claim.
//
// Fail-open: an API error mid-pagination keeps what was fetched; the file is rewritten only when the new list is at
// least half the size of the previous one (a half-broken API must not wipe the queue).
// Usage: node scripts/agent-watch-registry-pull.mjs [--selftest] [--cap N] [--max-pages N]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { UA } from './agent-watch-verify.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'agent-watch-candidates-registry.json');
const API = 'https://registry.modelcontextprotocol.io/v0/servers?limit=100&version=latest';
const CJK = /[一-鿿]/;
const PLACEHOLDER = /暂无|待补|TBD|TODO|undefined|\[object /;
const EN_FALLBACK = 'MCP server listed in the official MCP registry; the publisher did not provide an English description.';
const ZH_FALLBACK = '官方 MCP 注册表收录的 MCP 服务器；描述以发布者的英文原文为准。';

export const kebab = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
export function slugOf(name) {
  const [ns, ...rest] = String(name).split('/');
  const tail = rest.join('/');
  const owner = ns.startsWith('io.github.') ? ns.slice('io.github.'.length) : ns.split('.').filter((p) => !['com', 'io', 'org', 'net', 'dev', 'ai', 'app', 'co', 'me', 'sh', 'ac', 'www'].includes(p)).join('-');
  const base = kebab(`${owner}-${tail}`);
  // "acme/acme-mcp" → "acme-mcp", not "acme-acme-mcp"
  return base.replace(/^([a-z0-9-]+?)-\1-/, '$1-');
}
const cleanText = (s, max) => { let t = String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(); if (t.length > max) t = t.slice(0, max - 1).trimEnd() + '…'; return PLACEHOLDER.test(t) ? '' : t; };

// Map one registry entry to a candidate, or null when it has nothing verifiable.
export function candidateOf(entry, today) {
  const s = entry?.server; const meta = entry?._meta?.['io.modelcontextprotocol.registry/official'] || {};
  if (!s || !s.name || meta.status !== 'active' || meta.isLatest === false) return null;
  const repo = /^https:\/\/(github\.com|gitlab\.com|codeberg\.org|bitbucket\.org)\/[^/\s]+\/[^/\s]+/.test(s.repository?.url || '') ? s.repository.url.replace(/\/+$/, '').replace(/\.git$/, '') : null;
  let web = /^https:\/\/.+\..+/.test(s.websiteUrl || '') ? s.websiteUrl : null;
  if (web && repo && web.replace(/\/+$/, '').replace(/\.git$/, '').toLowerCase() === repo.toLowerCase()) web = null;   // "website" that is just the repo again
  if (!repo && !web) return null;
  const hasLocal = (s.packages || []).length > 0, hasRemote = (s.remotes || []).length > 0;
  const transport = hasLocal && hasRemote ? 'mcp-stdio-or-remote' : hasRemote ? 'mcp-remote' : 'mcp-stdio';
  const desc = cleanText(s.description, 240);
  const en = desc && !CJK.test(desc) ? desc : EN_FALLBACK;
  const zh = desc && CJK.test(desc) ? desc : ZH_FALLBACK;
  // A publisher's Chinese title goes to zh_name; the English side gets the registry name's tail (en pages carry a no-CJK gate).
  const title = cleanText(s.title || '', 80); const tail = s.name.split('/').pop();
  const name = title && !CJK.test(title) ? title : tail;
  return {
    slug: slugOf(s.name), name, ...(title && CJK.test(title) ? { zh_name: title } : {}), category: 'mcp',
    source_url: web || repo, repo_url: repo,
    keys: { transport, capabilities: ['mcp-server'], pricing: repo ? 'open-source' : 'unstated', evidence: web && repo ? 'official-and-repo' : repo ? 'repo-only' : 'official-only' },
    description: en, zh_description: zh, origin: 'mcp-registry',
    registry: { name: s.name, version: s.version || null, updated: (meta.updatedAt || '').slice(0, 10) || null, packages: (s.packages || []).map((p) => p.registryType).filter(Boolean).slice(0, 4), remotes: hasRemote },
    _updated: meta.updatedAt || '',
  };
}

export function dedupe(cands) {
  const bySlug = new Map(), byRepo = new Set(); const out = [];
  for (const c of cands) {
    const rk = String(c.repo_url || '').toLowerCase();
    if (rk && byRepo.has(rk)) continue;
    let slug = c.slug, n = 2; while (bySlug.has(slug)) slug = `${c.slug}-${n++}`;
    bySlug.set(slug, true); if (rk) byRepo.add(rk);
    out.push({ ...c, slug });
  }
  return out;
}

function selftest() {
  const e = (name, extra = {}, meta = {}) => ({ server: { name, description: 'A server', ...extra }, _meta: { 'io.modelcontextprotocol.registry/official': { status: 'active', isLatest: true, updatedAt: '2026-09-01T00:00:00Z', ...meta } } });
  const cases = [
    ['io.github slug drops the prefix', slugOf('io.github.acme/widget-mcp') === 'acme-widget-mcp'],
    ['domain namespace reversed without tld/junk', slugOf('com.example.tools/foo') === 'example-tools-foo'],
    ['owner repeated in tail is collapsed', slugOf('io.github.acme/acme-mcp') === 'acme-mcp'],
    ['no repo and no website → not a candidate', candidateOf(e('io.github.a/b', { remotes: [{ url: 'https://x/mcp' }] })) === null],
    ['inactive / not latest → skipped', candidateOf(e('io.github.a/b', { repository: { url: 'https://github.com/a/b' } }, { status: 'deprecated' })) === null],
    ['repo only → source==repo, evidence repo-only, stdio', (() => { const c = candidateOf(e('io.github.a/b', { repository: { url: 'https://github.com/a/b.git' }, packages: [{ registryType: 'npm' }] })); return c && c.source_url === 'https://github.com/a/b' && c.keys.evidence === 'repo-only' && c.keys.transport === 'mcp-stdio' && c.registry.packages[0] === 'npm'; })()],
    ['website + repo + remotes → official-and-repo, stdio-or-remote', (() => { const c = candidateOf(e('io.github.a/b', { repository: { url: 'https://github.com/a/b' }, websiteUrl: 'https://a.b/', packages: [{ registryType: 'pypi' }], remotes: [{ url: 'https://a.b/mcp' }] })); return c && c.source_url === 'https://a.b/' && c.keys.evidence === 'official-and-repo' && c.keys.transport === 'mcp-stdio-or-remote'; })()],
    ['CJK description goes to zh side, en gets the fixed sentence', (() => { const c = candidateOf(e('io.github.a/b', { description: '中文描述', repository: { url: 'https://github.com/a/b' } })); return c.zh_description === '中文描述' && c.description === EN_FALLBACK; })()],
    ['placeholder-looking description dropped', (() => { const c = candidateOf(e('io.github.a/b', { description: 'TODO write', repository: { url: 'https://github.com/a/b' } })); return c.description === EN_FALLBACK; })()],
    ['dedupe: same repo twice keeps first; same slug gets suffix', (() => { const d = dedupe([{ slug: 'x', repo_url: 'https://github.com/a/b' }, { slug: 'x', repo_url: 'https://github.com/A/B' }, { slug: 'x', repo_url: 'https://github.com/c/d' }]); return d.length === 2 && d[1].slug === 'x-2'; })()],
  ];
  let bad = 0; for (const [n, p] of cases) { console.log(`${p ? '✅' : '❌'} ${n}`); if (!p) bad++; } return bad;
}

async function main() {
  if (process.argv.includes('--selftest')) process.exit(selftest() ? 1 : 0);
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? Number(process.argv[i + 1]) || d : d; };
  const cap = arg('--cap', 720), maxPages = arg('--max-pages', 80);
  const today = new Date().toISOString().slice(0, 10);
  let cursor = '', pages = 0, seen = 0, err = null; const cands = [];
  while (pages < maxPages) {
    const u = API + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
    let j;
    try { const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'application/json' } }); if (!r.ok) { err = `HTTP ${r.status} at page ${pages + 1}`; break; } j = await r.json(); }
    catch (e) { err = `${e.message} at page ${pages + 1}`; break; }
    pages++;
    for (const s of j.servers || []) { seen++; const c = candidateOf(s, today); if (c) cands.push(c); }
    cursor = j.metadata?.nextCursor || ''; if (!cursor) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  const withRepo = cands.filter((c) => c.repo_url), webOnly = cands.filter((c) => !c.repo_url);
  // Repository-backed first (a repo is the stronger verification target), newest first within each group.
  const ordered = [...withRepo.sort((a, b) => b._updated.localeCompare(a._updated)), ...webOnly.sort((a, b) => b._updated.localeCompare(a._updated))];
  const list = dedupe(ordered).slice(0, cap).map(({ _updated, ...c }) => c);
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  if (prev && list.length < (prev.candidates || []).length / 2) { console.error(`agent-watch-registry-pull: only ${list.length} candidates vs ${prev.candidates.length} before (${err || 'short read'}) — keeping the previous file`); process.exit(0); }
  writeFileSync(OUT, JSON.stringify({ version: '1.0.0', pulled: today, source: API, pages, seen, eligible: cands.length, cap, error: err, note: 'Generated by scripts/agent-watch-registry-pull.mjs from the official MCP registry. Discovery only: a candidate enters data/agent-watch.json only after agent-watch-admit.mjs reaches its official page. Descriptions are the publishers’ own words.', candidates: list }, null, 1) + '\n');
  console.log(`agent-watch-registry-pull: ${pages} pages, ${seen} servers seen, ${cands.length} eligible (${withRepo.length} with repo), wrote ${list.length}${err ? ` — stopped early: ${err}` : ''}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('agent-watch-registry-pull failed:', e.message); process.exit(process.argv.includes('--selftest') ? 1 : 0); });
}
