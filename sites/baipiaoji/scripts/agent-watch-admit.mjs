#!/usr/bin/env node
// Mechanical admission for data/agent-watch.json (2026-09-22). Zero AI, zero invented facts.
//
// Reads candidates (data/agent-watch-candidates.json — hand-curated seed; data/agent-watch-candidates-registry.json —
// generated from the official MCP registry by agent-watch-registry-pull.mjs), fetches each candidate's official page
// and repository with the verifier's plain UA, and admits a candidate ONLY when its official page answers 2xx today.
// What gets written per record is the candidate's own fields + vocab-rendered en/zh labels + what the fetch proved:
//   official.title / official.description — the page's own <title> and meta description, whitespace-collapsed, dated
//   source_checked / repo_checked / *_http — the same stamps agent-watch-verify.mjs maintains afterwards
// Rejects (non-2xx, timeout, malformed) go to data/agent-watch-admissions.json with the reason and are retried by the
// next scheduled run (--max N per run keeps the daily budget bounded). Nothing is ever admitted on the strength of a
// repository alone: a dead or wrong homepage URL would otherwise become a "verified" record.
//
// Usage: node scripts/agent-watch-admit.mjs [--selftest] [--max N] [--all] [--concurrency N] [--only slug,slug]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { UA } from './agent-watch-verify.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = join(ROOT, 'data', 'agent-watch.json');
const VOCAB = join(ROOT, 'data', 'agent-watch-vocab.json');
const ADMISSIONS = join(ROOT, 'data', 'agent-watch-admissions.json');
const CANDIDATE_FILES = ['agent-watch-candidates.json', 'agent-watch-candidates-registry.json'].map((f) => join(ROOT, 'data', f));
const CJK = /[一-鿿]/;
const PLACEHOLDER = /暂无|待补|TBD|TODO|undefined|\[object /;
const ok = (c) => Number.isInteger(c) && c >= 200 && c < 300;

const decodeEntities = (s) => String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', copy: '©', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' '; }
  return named[e.toLowerCase()] ?? m;
});
const clean = (s, max) => {
  let t = decodeEntities(String(s || '')).replace(/<[^>]+>/g, ' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  if (t.length > max) t = t.slice(0, max - 1).trimEnd() + '…';
  return PLACEHOLDER.test(t) ? '' : t;
};

// The page's own words, nothing else: <title> and the first meta description / og:description.
export function extractOfficial(html) {
  const h = String(html || '');
  const title = clean((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1], 160);
  const metas = [...h.matchAll(/<meta\s+[^>]*>/gi)].map((m) => m[0]);
  const pick = (re) => { for (const m of metas) { if (re.test(m)) { const c = m.match(/\scontent\s*=\s*("([^"]*)"|'([^']*)')/i); if (c) return clean(c[2] ?? c[3], 300); } } return ''; };
  const description = pick(/\sname\s*=\s*["']description["']/i) || pick(/\sproperty\s*=\s*["']og:description["']/i);
  return { title, description };
}

export function renderFields(keys, vocab) {
  const t = vocab.transport[keys.transport], p = vocab.pricing[keys.pricing], e = vocab.evidence[keys.evidence];
  const caps = (keys.capabilities || []).map((k) => vocab.capabilities[k]);
  if (!t || !p || !e || caps.some((c) => !c) || !caps.length) return null;
  return { transport: t.en, zh_transport: t.zh, capabilities: caps.map((c) => c.en), zh_capabilities: caps.map((c) => c.zh), pricing_note: p.en, zh_pricing_note: p.zh, evidence_level: e.en, zh_evidence_level: e.zh };
}

// Candidate shape gate — a malformed candidate is a repo bug, never a network condition.
export function validateCandidate(c, vocab, toolSlugs) {
  const bad = [];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(c.slug || ''))) bad.push('slug');
  if (!c.name || CJK.test(c.name)) bad.push('name');
  if (c.zh_name !== undefined && (typeof c.zh_name !== 'string' || !CJK.test(c.zh_name))) bad.push('zh_name');
  if (!vocab.categories[c.category]) bad.push('category');
  if (!/^https:\/\/.+\..+/.test(String(c.source_url || ''))) bad.push('source_url');
  if (c.repo_url !== null && !/^https:\/\/.+\..+/.test(String(c.repo_url || ''))) bad.push('repo_url');
  if (!c.keys || !renderFields(c.keys, vocab)) bad.push('keys');
  if (!c.description || CJK.test(c.description)) bad.push('description');
  if (!c.zh_description || !CJK.test(c.zh_description)) bad.push('zh_description');
  if (c.tool_slug && toolSlugs && !toolSlugs.has(c.tool_slug)) bad.push('tool_slug');
  if (c.keys && ((c.keys.evidence === 'repo-only') !== (c.repo_url !== null && c.repo_url === c.source_url))) bad.push('evidence/repo-only');
  if (c.keys && (c.keys.evidence === 'official-only') !== (c.repo_url === null)) bad.push('evidence/official-only');
  return bad;
}

// Admission decision from the fetch results. Pure; unit-tested.
export function decide(res) {
  if (!res || !Number.isInteger(res.source)) return { admit: false, reason: 'source unreachable (timeout / network)' };
  if (!ok(res.source)) return { admit: false, reason: `source HTTP ${res.source}` };
  return { admit: true, reason: null };
}

export function recordFrom(c, vocab, res, official, today, toolSlugs) {
  const f = renderFields(c.keys, vocab);
  const cat = vocab.categories[c.category];
  const repoOk = c.repo_url ? ok(res.repo) : null;
  const toolSlug = c.tool_slug || (toolSlugs && toolSlugs.has(c.slug) ? c.slug : null);
  return {
    slug: c.slug, name: c.name, ...(c.zh_name ? { zh_name: c.zh_name } : {}), category: c.category, description: c.description,
    source_url: c.source_url, repo_url: c.repo_url, first_seen: today, last_verified: today, status: 'new',
    ...f, zh_description: c.zh_description, zh_category: cat.zh,
    keys: { ...c.keys }, origin: c.origin || 'curated', ...(toolSlug ? { tool_slug: toolSlug } : {}),
    ...(c.registry ? { registry: c.registry } : {}),
    official: { title: official.title || '', description: official.description || '', checked: today },
    source_checked: today, repo_checked: repoOk ? today : null, source_http: res.source, repo_http: c.repo_url ? (Number.isInteger(res.repo) ? res.repo : null) : null,
  };
}

async function fetchPage(url, withBody) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    const r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': UA, accept: 'text/html,application/json;q=0.9,*/*;q=0.5' } });
    clearTimeout(t);
    let body = '';
    if (withBody && r.ok) { try { body = (await r.text()).slice(0, 400000); } catch { body = ''; } } else { try { await r.body?.cancel(); } catch {} }
    return { status: r.status, body, url: r.url };
  } catch { return { status: null, body: '', url }; }
}

function selftest() {
  const vocab = JSON.parse(readFileSync(VOCAB, 'utf8'));
  const html = '<html><head><title> Foo &amp; Bar — Agents </title><meta property="og:description" content="OG text"><meta name="description" content="Meta  text **bold** here"></head></html>';
  const cases = [
    ['title decoded and collapsed', extractOfficial(html).title === 'Foo & Bar — Agents'],
    ['meta description preferred over og, markdown stars stripped', extractOfficial(html).description === 'Meta text bold here'],
    ['placeholder text is dropped, not published', extractOfficial('<title>TODO fix</title>').title === ''],
    ['no head → empty strings, never null', JSON.stringify(extractOfficial('')) === '{"title":"","description":""}'],
    ['2xx source → admit', decide({ source: 200, repo: 404 }).admit === true],
    ['3xx after redirects is not 2xx (fetch follows, so a final 3xx means a loop) → reject', decide({ source: 301, repo: 200 }).admit === false],
    ['403 source → reject with reason', decide({ source: 403, repo: 200 }).reason === 'source HTTP 403'],
    ['timeout → reject, reason names network', /unreachable/.test(decide({ source: null, repo: 200 }).reason)],
    ['repo alone never admits', decide({ source: 404, repo: 200 }).admit === false],
    ['vocab renders parallel en/zh arrays', (() => { const f = renderFields({ transport: 'cli', capabilities: ['terminal', 'mcp-client'], pricing: 'byok', evidence: 'repo-only' }, vocab); return f && f.capabilities.length === 2 && f.zh_capabilities.length === 2 && CJK.test(f.zh_transport) && !CJK.test(f.transport); })()],
    ['unknown vocab key → null (never a silent blank label)', renderFields({ transport: 'cli', capabilities: ['nope'], pricing: 'byok', evidence: 'repo-only' }, vocab) === null],
    ['candidate gate: repo-only evidence must match source==repo', validateCandidate({ slug: 'x', name: 'X', category: 'mcp', source_url: 'https://a.b/', repo_url: 'https://github.com/a/b', keys: { transport: 'cli', capabilities: ['terminal'], pricing: 'byok', evidence: 'repo-only' }, description: 'd', zh_description: '描述' }, vocab, null).includes('evidence/repo-only')],
    ['candidate gate: CJK in en description rejected', validateCandidate({ slug: 'x', name: 'X', category: 'mcp', source_url: 'https://a.b/', repo_url: null, keys: { transport: 'cli', capabilities: ['terminal'], pricing: 'byok', evidence: 'official-only' }, description: '中文', zh_description: '描述' }, vocab, null).includes('description')],
    ['record carries official text + today stamps + null repo_checked on repo 404', (() => { const r = recordFrom({ slug: 'x', name: 'X', category: 'mcp', source_url: 'https://a.b/', repo_url: 'https://github.com/a/b', keys: { transport: 'cli', capabilities: ['terminal'], pricing: 'byok', evidence: 'official-and-repo' }, description: 'd', zh_description: '描述' }, vocab, { source: 200, repo: 404 }, { title: 'T', description: 'D' }, '2026-09-22', null); return r.official.title === 'T' && r.source_checked === '2026-09-22' && r.repo_checked === null && r.repo_http === 404 && r.status === 'new' && r.zh_category === vocab.categories.mcp.zh && r.origin === 'curated'; })()],
  ];
  let bad = 0;
  for (const [n, p] of cases) { console.log(`${p ? '✅' : '❌'} ${n}`); if (!p) bad++; }
  return bad;
}

async function main() {
  if (process.argv.includes('--selftest')) process.exit(selftest() ? 1 : 0);
  const argv = process.argv;
  const arg = (k, d) => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : d; };
  const max = argv.includes('--all') ? Infinity : Math.max(1, Number(arg('--max', 60)) || 60);
  const conc = Math.min(6, Math.max(1, Number(arg('--concurrency', 3)) || 3));
  const only = arg('--only', '') ? new Set(arg('--only', '').split(',')) : null;
  const vocab = JSON.parse(readFileSync(VOCAB, 'utf8'));
  const reg = JSON.parse(readFileSync(REG, 'utf8'));
  const toolSlugs = new Set(JSON.parse(readFileSync(join(ROOT, 'data', 'tools.json'), 'utf8')).map((t) => t.slug));
  const adm = existsSync(ADMISSIONS) ? JSON.parse(readFileSync(ADMISSIONS, 'utf8')) : { checked: null, rejected: {}, admitted: [] };
  const today = new Date().toISOString().slice(0, 10);
  const have = new Set(reg.agents.map((a) => a.slug));
  const repoKeys = new Set(reg.agents.map((a) => String(a.repo_url || '').toLowerCase().replace(/\/+$/, '').replace(/\.git$/, '')).filter(Boolean));
  let candidates = [];
  for (const f of CANDIDATE_FILES) if (existsSync(f)) candidates.push(...JSON.parse(readFileSync(f, 'utf8')).candidates);
  const seen = new Set();
  candidates = candidates.filter((c) => { if (seen.has(c.slug)) return false; seen.add(c.slug); return true; });
  const invalid = candidates.map((c) => [c.slug, validateCandidate(c, vocab, toolSlugs)]).filter(([, b]) => b.length);
  if (invalid.length) { for (const [s, b] of invalid) console.error(`❌ malformed candidate ${s}: ${b.join(', ')}`); process.exit(1); }
  // Retry order: never-tried first, then the least recently attempted; skip anything already attempted today.
  let queue = candidates.filter((c) => !have.has(c.slug) && (!only || only.has(c.slug)))
    .filter((c) => (adm.rejected[c.slug]?.last_attempt || '') !== today || only)
    .sort((a, b) => (adm.rejected[a.slug]?.last_attempt || '').localeCompare(adm.rejected[b.slug]?.last_attempt || ''));
  queue = queue.slice(0, max);
  console.log(`agent-watch-admit: ${reg.agents.length} in registry, ${candidates.length} candidates, ${queue.length} to check (max ${max === Infinity ? 'all' : max}, ${conc} in flight)`);
  const results = [];
  const worker = async () => {
    while (queue.length) {
      const c = queue.shift();
      const src = await fetchPage(c.source_url, true);
      const repo = !c.repo_url ? { status: null } : (c.repo_url === c.source_url ? src : await fetchPage(c.repo_url, false));
      const res = { source: src.status, repo: repo.status };
      const d = decide(res);
      const rk = String(c.repo_url || '').toLowerCase().replace(/\/+$/, '').replace(/\.git$/, '');
      if (d.admit && rk && repoKeys.has(rk) && !have.has(c.slug)) { d.admit = false; d.reason = 'duplicate repository of an existing record'; }
      results.push({ c, res, d, official: d.admit ? extractOfficial(src.body) : null });
      console.log(`${d.admit ? '✅' : '⛔'} ${String(res.source ?? '---').padStart(3)} ${String(res.repo ?? '---').padStart(3)}  ${c.slug}${d.admit ? '' : '  ' + d.reason}`);
      await new Promise((r) => setTimeout(r, 400));
    }
  };
  await Promise.all(Array.from({ length: conc }, worker));
  let admitted = 0;
  for (const { c, res, d, official } of results) {
    if (d.admit) {
      reg.agents.push(recordFrom(c, vocab, res, official, today, toolSlugs));
      have.add(c.slug); admitted++;
      delete adm.rejected[c.slug];
      adm.admitted.push({ slug: c.slug, date: today, origin: c.origin || 'curated' });
    } else {
      const prev = adm.rejected[c.slug] || { attempts: 0, first_attempt: today };
      adm.rejected[c.slug] = { ...prev, reason: d.reason, source_http: res.source, repo_http: res.repo, last_attempt: today, attempts: prev.attempts + 1 };
    }
  }
  adm.admitted = adm.admitted.slice(-3000);
  adm.checked = today;
  adm.note = 'Written by scripts/agent-watch-admit.mjs. A slug listed under rejected was NOT admitted (reason + last HTTP status); it is retried on later runs. Candidates that were admitted appear in data/agent-watch.json.';
  reg.checked = today;
  writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
  writeFileSync(ADMISSIONS, JSON.stringify(adm, null, 1) + '\n');
  console.log(`agent-watch-admit: admitted ${admitted}, rejected ${results.length - admitted}; registry now ${reg.agents.length}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('agent-watch-admit failed:', e.message); process.exit(process.argv.includes('--selftest') ? 1 : 0); });
}
