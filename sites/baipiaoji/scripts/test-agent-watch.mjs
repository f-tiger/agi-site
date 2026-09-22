#!/usr/bin/env node
// Zero-network gates for the agents surface (2026-09-22 rebuild).
//   default : registry schema + vocab drift + candidates + admissions log + verifier / admit / pagination / filter
//             semantics + audiences + the hit.js allowlist vs every event name build.mjs actually emits
//   --dist  : after `npm run build` — hub / audience / category pages exist in zh and en with canonical + hreflang,
//             curated record pages are noindex without hreflang, the union of category tables carries every record,
//             the sitemap lists hub + audience + category pages and NO record page, the homepage carries the strip
//             and the block-click beacon, and agents.json agrees with the registry.
// Why each exists: a zh field missing or English renders a Chinese page with holes (2026-08-12 zhLeak, JSON
// edition); a label typed per record instead of taken from the vocab drifts silently across 1 000 rows; a page
// that is noindex but carries hreflang breaks the whole hreflang group (verify-dist rule ⑤); and an event name
// missing from hit.js is dropped at the edge while the page looks fine — exactly how `audit` vanished for weeks and
// how `gate`/`earn`/`gs`/`gs_go`/`ad` were silently dropped from 2026-09-04 until this file started checking.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterAgents, findAgent, verificationOf, paginate, audiencesOf, AUDIENCES } from '../functions/api/_agents.js';
import { EVENTS } from '../functions/api/hit.js';
import { applyCheck, pickBatch } from './agent-watch-verify.mjs';
import { renderFields, validateCandidate, decide, extractOfficial } from './agent-watch-admit.mjs';
import { slugOf, candidateOf, dedupe } from './agent-watch-registry-pull.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let bad = 0;
const ck = (c, m) => { if (!c) { console.error(`❌ ${m}`); bad++; } };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CJK = /[一-鿿]/;
const enText = (s) => s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<nav class="lang">[\s\S]*?<\/nav>/, '');   // 语言切换里的「中文」是刻意保留的（同 verify-dist ZH_ALLOW）
const today = new Date().toISOString().slice(0, 10);
const reg = JSON.parse(readFileSync(join(ROOT, 'data', 'agent-watch.json'), 'utf8'));
const vocab = JSON.parse(readFileSync(join(ROOT, 'data', 'agent-watch-vocab.json'), 'utf8'));
const agents = reg.agents;
const cats = Object.keys(vocab.categories).filter((k) => agents.some((a) => a.category === k));
const curated = agents.filter((a) => a.origin !== 'mcp-registry');
const site = JSON.parse(readFileSync(join(ROOT, 'data', 'site.json'), 'utf8'));

if (process.argv.includes('--dist')) {
  const dist = join(ROOT, 'dist');
  const read = (p) => readFileSync(join(dist, p), 'utf8');
  const has = (p) => existsSync(join(dist, p));
  for (const p of ['index.html', 'en/index.html']) {
    ck(has(p), `${p} missing — run npm run build first`); if (!has(p)) continue;
    const s = read(p);
    ck(s.includes('data-home-block="agent-watch"'), `${p}: agents strip missing from the homepage`);
    ck(s.includes("bpjEv('home'"), `${p}: block-level click beacon missing — homepage clicks would stay unmeasured`);
    const sec = s.match(/<section class="group" data-cat="agent"[\s\S]*?<\/section>/);
    ck(!!sec && sec[0].includes('agent-watch'), `${p}: strip must live inside the 智能体 section`);
    ck(!/<nav class="lang">[^]*?\/agents\/[^]*?<\/nav>/.test(s.match(/<nav class="lang">[\s\S]*?<\/nav>/)?.[0] || ''), `${p}: agents link must not sit inside the language switch (the 2026-09-22 复列 bug)`);
    ck(/rail-jump[\s\S]*?\/agents\/"/.test(s), `${p}: rail-jump lacks the agents entry`);
    for (const k of AUDIENCES) ck(s.includes(`/agents/for/${k}"`), `${p}: strip lacks the ${k} door`);
    // Third round (owner: 首页不够凸显 / 没有搜索): a top block right under the hero with its own search box.
    const top = s.match(/<section class="agents-home"[\s\S]*?<\/section>/);
    ck(!!top && s.indexOf('<section class="agents-home"') < s.indexOf('<section class="dirs"'), `${p}: agents-home block must sit right after the hero, before the directions block`);
    ck(!!top && top[0].includes('data-home-block="agents"') && top[0].includes('agents-index.json') && top[0].includes('data-tag="agents"'), `${p}: agents-home block needs its beacon id and the agents search box`);
    ck(!!top && AUDIENCES.every((k) => top[0].includes(`/agents/for/${k}"`)), `${p}: agents-home block lacks a door`);
    ck(/class="stats"[\s\S]*?\/agents\/"/.test(s), `${p}: hero stats lack the agents count`);
  }
  const seen = new Set();
  for (const lang of ['', 'en/']) {
    const pre = lang ? `${site.base_url}/en` : site.base_url;
    const hub = `${lang}agents/index.html`;
    ck(has(hub), `${hub} missing`);
    if (has(hub)) {
      const s = read(hub);
      ck(s.includes(`<link rel="canonical" href="${pre}/agents/">`), `${hub}: canonical`);
      ck(s.includes('hreflang="zh-Hans"') && s.includes('hreflang="en"') && s.includes('hreflang="x-default"'), `${hub}: hreflang trio`);
      ck(!s.includes('name="robots" content="noindex'), `${hub}: hub must be indexable`);
      ck(s.includes('<nav class="lang">'), `${hub}: language switch missing`);
      ck(s.includes(`${site.base_url}/style.css`), `${hub}: site stylesheet missing (own-CSS regression)`);
      ck(s.includes('/api/hit'), `${hub}: page-view beacon missing`);
      for (const k of AUDIENCES) ck(s.includes(`/agents/for/${k}"`), `${hub}: door ${k} missing`);
      for (const c of cats) ck(s.includes(`/agents/c/${c}"`), `${hub}: category ${c} missing`);
      ck(s.includes('aw-gs-big') && s.includes('agents-index.json'), `${hub}: hub search box missing`);
      ck(s.includes('id="featured"'), `${hub}: featured (cross-linked free-tier) section missing`);
      if (lang) ck(!CJK.test(enText(s)), `${hub}: CJK on the English hub`);
    }
    // search index: same shape as the site index, every record, curated first, no CJK on the English side
    const ix = `${lang}agents-index.json`; ck(has(ix), `${ix} missing`);
    if (has(ix)) {
      const j = JSON.parse(read(ix));
      ck(Array.isArray(j) && j.length === agents.length, `${ix}: ${j.length} entries ≠ ${agents.length} records`);
      ck(j.every((e) => e.u && e.n && e.k && typeof e.q === 'string' && e.q === e.q.toLowerCase()), `${ix}: entry shape (u/n/k/q lowercase)`);
      ck(j.slice(0, curated.length).every((e) => e.u.includes('/agents/')), `${ix}: curated entries must come first and point at record pages`);
      if (lang) ck(!j.some((e) => CJK.test(e.n + e.k + e.q)), `${ix}: CJK in the English search index`);
      else ck(j.some((e) => CJK.test(e.q)), `${ix}: zh index carries no Chinese text`);
    }
    for (const k of AUDIENCES) {
      const p = `${lang}agents/for/${k}.html`; ck(has(p), `${p} missing`); if (!has(p)) continue;
      const s = read(p);
      ck(s.includes(`<link rel="canonical" href="${pre}/agents/for/${k}">`), `${p}: canonical`);
      ck(s.includes('hreflang="x-default"') && !s.includes('content="noindex'), `${p}: must be indexable with hreflang`);
    }
    const union = new Set();
    for (const c of cats) {
      const p = `${lang}agents/c/${c}.html`; ck(has(p), `${p} missing`); if (!has(p)) continue;
      const s = read(p);
      ck(s.includes(`<link rel="canonical" href="${pre}/agents/c/${c}">`), `${p}: canonical`);
      ck(s.includes('hreflang="x-default"') && !s.includes('content="noindex'), `${p}: must be indexable with hreflang`);
      ck(s.includes('id="aw-filter"') && s.includes('agents-index.json'), `${p}: in-page filter + search box missing`);
      const hasCur = agents.some((x) => x.category === c && x.origin !== 'mcp-registry'), hasReg = agents.some((x) => x.category === c && x.origin === 'mcp-registry');
      if (hasCur) ck(s.includes('id="curated"') && s.includes('class="aw-card'), `${p}: curated records must render as cards`);
      if (hasCur && hasReg) ck(s.indexOf('id="curated"') < s.indexOf('id="registry"'), `${p}: curated section must precede the registry table (重点在前)`);
      for (const a of agents.filter((x) => x.category === c)) {
        const ok = a.origin === 'mcp-registry' ? s.includes(`data-tool="agents/${a.slug}/source"`) : s.includes(`/agents/${a.slug}"`);
        if (ok) union.add(a.slug); else ck(false, `${p}: row for ${a.slug} missing`);
      }
    }
    ck(union.size === agents.length, `${lang || 'zh'}: category tables carry ${union.size}/${agents.length} records`);
    let n = 0;
    for (const a of curated) {
      const p = `${lang}agents/${a.slug}.html`; ck(has(p), `${p} missing`); if (!has(p)) continue; n++;
      const s = read(p);
      ck(s.includes('<meta name="robots" content="noindex,follow">'), `${p}: record page must be noindex,follow`);
      ck(!s.includes('hreflang='), `${p}: noindex page must not carry hreflang (verify-dist rule ⑤)`);
      ck(s.includes(`data-tool="agents/${a.slug}/source"`), `${p}: outbound official link lacks the go beacon`);
      ck(s.includes('<nav class="lang">'), `${p}: language switch missing`);
      if (lang) ck(!CJK.test(enText(s)), `${p}: CJK on an English record page`);
    }
    for (const a of agents.filter((x) => x.origin === 'mcp-registry')) ck(!has(`${lang}agents/${a.slug}.html`), `registry record ${a.slug} must not get a page`);
    seen.add(n);
    const aj = `${lang}agents.json`; ck(has(aj), `${aj} missing`);
    if (has(aj)) {
      const j = JSON.parse(read(aj));
      ck(j.count === agents.length && j.agents.length === agents.length, `${aj}: count ≠ registry`);
      ck(j.agents.every((a) => Array.isArray(a.audiences) && a.audiences.length), `${aj}: every record carries audiences`);
      if (lang) ck(!j.agents.some((a) => Object.keys(a).some((k) => k.startsWith('zh_'))), `${aj}: zh_ fields leaked into the English JSON`);
      else ck(j.agents.every((a) => a.zh_description), `${aj}: zh JSON lost zh fields`);
    }
  }
  const sm = read('sitemap.xml');
  for (const pre of [site.base_url, `${site.base_url}/en`]) {
    ck(sm.includes(`<loc>${pre}/agents/</loc>`), `sitemap lacks ${pre}/agents/`);
    for (const k of AUDIENCES) ck(sm.includes(`<loc>${pre}/agents/for/${k}</loc>`), `sitemap lacks ${pre}/agents/for/${k}`);
    for (const c of cats) ck(sm.includes(`<loc>${pre}/agents/c/${c}</loc>`), `sitemap lacks ${pre}/agents/c/${c}`);
  }
  ck(!curated.some((a) => sm.includes(`/agents/${a.slug}</loc>`)), 'sitemap must not list record pages (noindex)');
  // verify-dist exempts /agents/ from its stale-count gate (publisher descriptions say things like "187 tools");
  // so our OWN copy on the hub must never phrase the directory size as "N tools" — it is records, not tools.
  // Scope: the hub's own <main> minus table bodies and scripts (the site footer's "219 AI tools" is the directory's real count and verify-dist checks it).
  for (const p of ['agents/index.html', 'en/agents/index.html']) if (has(p)) ck(!/\b\d{2,5}\s*(?:个)?\s*(?:AI\s*)?(?:工具|tools\b)/.test(((read(p).match(/<main[\s\S]*?<\/main>/) || [''])[0]).replace(/<tbody>[\s\S]*?<\/tbody>/g, '').replace(/<script[\s\S]*?<\/script>/g, '')), `${p}: hub copy claims "N tools" — say records`);
  if (bad) { console.error(`test-agent-watch --dist: ${bad} failed`); process.exit(1); }
  console.log(`✅ test-agent-watch --dist: hub + ${AUDIENCES.length} doors + ${cats.length} category tables (zh/en, indexable, hreflang), ${curated.length} record pages noindex, ${agents.length} records in tables + JSON, homepage strip + beacon`);
  process.exit(0);
}

// ── 1. registry schema (every record keyed; labels == vocab) ────────────
const REQ = ['slug', 'name', 'category', 'description', 'source_url', 'first_seen', 'last_verified', 'status', 'transport', 'capabilities', 'pricing_note', 'evidence_level',
  'zh_description', 'zh_category', 'zh_transport', 'zh_capabilities', 'zh_pricing_note', 'zh_evidence_level', 'keys', 'origin', 'official'];
const STATUS = new Set(Object.keys(vocab.status));
ck(agents.length >= 28, 'registry lost entries');
const slugs = new Set(), repos = new Set();
for (const a of agents) {
  for (const k of REQ) ck(a[k] !== undefined && a[k] !== '', `${a.slug}: missing ${k}`);
  ck(/^[a-z0-9][a-z0-9-]*$/.test(a.slug), `${a.slug}: slug must be kebab-case`);
  ck(!slugs.has(a.slug), `${a.slug}: duplicate slug`); slugs.add(a.slug);
  ck(/^https:\/\/.+\..+/.test(a.source_url), `${a.slug}: source must be an https URL`);
  ck(a.repo_url === null || /^https:\/\/.+\..+/.test(a.repo_url), `${a.slug}: repo must be null or an https URL`);
  if (a.repo_url) { const rk = a.repo_url.toLowerCase(); ck(!repos.has(rk), `${a.slug}: duplicate repository ${a.repo_url}`); repos.add(rk); }
  ck(STATUS.has(a.status), `${a.slug}: bad status ${a.status}`);
  ck(['curated', 'mcp-registry'].includes(a.origin), `${a.slug}: bad origin`);
  ck(DATE.test(a.first_seen) && DATE.test(a.last_verified), `${a.slug}: dates must be YYYY-MM-DD`);
  ck(a.first_seen <= a.last_verified && a.last_verified <= today, `${a.slug}: first_seen ≤ last_verified ≤ today violated`);
  ck('source_checked' in a && 'repo_checked' in a, `${a.slug}: source_checked/repo_checked must be present (null is a statement)`);
  for (const k of ['source_checked', 'repo_checked']) ck(a[k] === null || (DATE.test(a[k]) && a[k] <= today), `${a.slug}: ${k} must be null or a past/today date`);
  ck(a.repo_url !== null || a.repo_checked === null, `${a.slug}: no repo_url but repo_checked set`);
  ck(vocab.categories[a.category] && a.zh_category === vocab.categories[a.category].zh, `${a.slug}: zh_category must equal the vocab label for ${a.category}`);
  const f = renderFields(a.keys || {}, vocab);
  ck(!!f, `${a.slug}: keys do not resolve in the vocab`);
  if (f) for (const k of Object.keys(f)) ck(JSON.stringify(a[k]) === JSON.stringify(f[k]), `${a.slug}: ${k} drifted from the vocab rendering of its key`);
  ck(!CJK.test(a.description) && !CJK.test(a.name + a.transport + a.pricing_note + a.evidence_level + a.capabilities.join('')), `${a.slug}: CJK in an English field`);
  ck(CJK.test(a.zh_description) && CJK.test(a.zh_category), `${a.slug}: zh_description / zh_category must contain Chinese`);
  ck(a.zh_name === undefined || (typeof a.zh_name === 'string' && CJK.test(a.zh_name)), `${a.slug}: zh_name, when present, is the publisher's Chinese title`);
  if (a.origin === 'curated') ck(!/\d{2,}[kK+]|\d+ ?stars|\$\d/.test(a.description + a.pricing_note), `${a.slug}: no star counts, user counts or prices in curated prose`);
  ck(typeof a.official === 'object' && 'title' in a.official && 'description' in a.official && 'checked' in a.official, `${a.slug}: official block shape`);
  ck(!/\*\*|TODO|undefined|\[object /.test(a.official.title + a.official.description), `${a.slug}: official text carries markup or placeholders`);
  ck(a.keys.evidence !== 'official-only' || a.repo_url === null, `${a.slug}: evidence official-only but repo_url set`);
  ck(a.keys.evidence !== 'repo-only' || a.repo_url === a.source_url, `${a.slug}: evidence repo-only but source ≠ repo`);
  if (a.tool_slug) ck(existsSync(join(ROOT, 'data', 'tools.json')) && JSON.parse(readFileSync(join(ROOT, 'data', 'tools.json'), 'utf8')).some((t) => t.slug === a.tool_slug), `${a.slug}: tool_slug ${a.tool_slug} not in tools.json`);
  ck(audiencesOf(a).length >= 1, `${a.slug}: no audience derived`);
}
ck(typeof reg.policy?.url_checks === 'string' && typeof reg.policy?.admission === 'string', 'policy.url_checks / policy.admission must explain the stamps and the admission rule');
ck(curated.length >= 28, 'curated records lost');
for (const k of AUDIENCES) ck(vocab.audiences[k] && CJK.test(vocab.audiences[k].zh) && !CJK.test(vocab.audiences[k].en), `vocab.audiences.${k} labels`);
for (const [k, v] of Object.entries(vocab.categories)) ck(CJK.test(v.zh) && !CJK.test(v.en) && CJK.test(v.lede_zh) && !CJK.test(v.lede_en), `vocab.categories.${k} labels/ledes`);

// ── 2. candidates + admissions log ──────────────────────────────────────
{
  const tools = new Set(JSON.parse(readFileSync(join(ROOT, 'data', 'tools.json'), 'utf8')).map((t) => t.slug));
  for (const f of ['agent-watch-candidates.json', 'agent-watch-candidates-registry.json']) {
    const p = join(ROOT, 'data', f); if (!existsSync(p)) continue;
    const c = JSON.parse(readFileSync(p, 'utf8')).candidates; const s = new Set();
    for (const x of c) { const b = validateCandidate(x, vocab, tools); ck(!b.length, `${f} ${x.slug}: ${b.join(', ')}`); ck(!s.has(x.slug), `${f}: duplicate ${x.slug}`); s.add(x.slug); }
  }
  const ap = join(ROOT, 'data', 'agent-watch-admissions.json');
  if (existsSync(ap)) {
    const adm = JSON.parse(readFileSync(ap, 'utf8'));
    ck(adm.rejected && typeof adm.rejected === 'object' && Array.isArray(adm.admitted), 'admissions log shape');
    for (const [s, r] of Object.entries(adm.rejected)) { ck(!slugs.has(s), `${s} is both rejected and in the registry`); ck(typeof r.reason === 'string' && DATE.test(r.last_attempt), `${s}: reject entry shape`); }
  }
}

// ── 3. verifier / admit / registry-pull semantics ───────────────────────
const base = { slug: 'x', status: 'new', first_seen: '2026-09-22', last_verified: '2026-09-22', source_checked: '2026-09-22', repo_checked: null, repo_url: 'https://github.com/x/y' };
ck(applyCheck(base, { source: 200, repo: 200 }, '2026-09-23').repo_checked === '2026-09-23', 'verifier: reachable repo gets stamped');
ck(applyCheck(base, { source: 200, repo: 403 }, '2026-09-23').repo_checked === null, 'verifier: 403 never counts as a check');
ck(applyCheck(base, { source: 404, repo: 200 }, '2026-09-23').status === 'stale', 'verifier: 404 on the official page → stale');
ck(applyCheck(base, { source: null, repo: null }, '2026-09-23').status === 'new', 'verifier: network failure changes nothing');
ck(applyCheck({ ...base, repo_url: null }, { source: 200, repo: null }, '2026-09-23').last_verified === '2026-09-23', 'verifier: no repo → source alone verifies');
ck(pickBatch(agents, 5).length === 5, 'verifier: rotation batch');
ck(decide({ source: 404, repo: 200 }).admit === false && decide({ source: 200, repo: null }).admit === true, 'admit: official page decides, repo never does');
ck(extractOfficial('<title>A &amp; B</title>').title === 'A & B', 'admit: official title decoded');
ck(slugOf('io.github.acme/acme-mcp') === 'acme-mcp' && dedupe([{ slug: 'a', repo_url: 'r' }, { slug: 'a', repo_url: 'r' }]).length === 1, 'registry-pull: slug + dedupe');
ck(candidateOf({ server: { name: 'io.github.a/b', description: 'd' }, _meta: { 'io.modelcontextprotocol.registry/official': { status: 'active', isLatest: true } } }) === null, 'registry-pull: nothing verifiable → no candidate');

// ── 4. MCP filters, lookup, pagination, audiences ───────────────────────
const F = [
  { slug: 'a', name: 'Alpha', category: 'agent', status: 'new', first_seen: '2026-09-22', transport: 'Python SDK', description: 'x', capabilities: ['rag'], origin: 'curated', keys: { transport: 'python-sdk', capabilities: ['rag'] } },
  { slug: 'b', name: 'Beta MCP', category: 'mcp', status: 'verified', first_seen: '2026-09-01', transport: 'Local MCP server (stdio)', description: 'y', capabilities: ['fetch'], origin: 'mcp-registry', keys: { transport: 'mcp-stdio', capabilities: ['mcp-server'] } },
  { slug: 'c', name: 'Gamma', category: 'platform', status: 'stale', first_seen: '2026-08-15', transport: 'Hosted product (web app)', description: 'z', capabilities: ['browser automation'], origin: 'curated', keys: { transport: 'hosted-product', capabilities: ['customer-service'], pricing: 'paid' } },
];
ck(filterAgents(F, {}).length === 3, 'no args → everything');
ck(filterAgents(F, { since: '2026-09-01' }).map((x) => x.slug).join() === 'a,b', 'since keeps first_seen ≥ date (inclusive)');
ck(filterAgents(F, { since: 'yesterday' }).length === 3, 'malformed since is ignored');
ck(filterAgents(F, { transport: 'mcp' }).map((x) => x.slug).join() === 'b', 'transport is a case-insensitive substring');
ck(filterAgents(F, { category: 'AGENT', status: 'new' }).map((x) => x.slug).join() === 'a', 'category+status AND together, case-insensitive');
ck(filterAgents(F, { origin: 'mcp-registry' }).map((x) => x.slug).join() === 'b', 'origin filter');
ck(filterAgents(F, { audience: 'teams' }).map((x) => x.slug).join() === 'c', 'audience filter derives audiences when the record has none');
ck(filterAgents(F, { audience: 'mcp' }).map((x) => x.slug).join() === 'b', 'audience mcp');
ck(filterAgents(null, {}).length === 0 && filterAgents([null, 1, 'x'], {}).length === 0, 'junk lists never throw');
ck(findAgent(F, 'B')?.slug === 'b' && findAgent(F, 'beta mcp')?.slug === 'b', 'lookup by slug or exact name');
ck(findAgent(F, 'bet') === null, 'no fuzzy matching');
ck(verificationOf({ status: 'new', source_checked: '2026-09-22' }).repo_url_checked === null, 'verification block exposes null checks');
const big = Array.from({ length: 230 }, (_, i) => ({ slug: `s${i}` }));
ck(paginate(big, {}).returned === 50 && paginate(big, {}).next_offset === 50 && paginate(big, {}).total === 230, 'paginate: default page 50');
ck(paginate(big, { offset: 200, limit: 100 }).returned === 30 && paginate(big, { offset: 200, limit: 100 }).next_offset === null, 'paginate: last page, next null');
ck(paginate(big, { limit: 'all', offset: -5 }).limit === 50 && paginate(big, { limit: 999 }).limit === 100, 'paginate: junk clamped, never thrown');
ck(audiencesOf({ category: 'coding', keys: {} }).join() === 'coders' && audiencesOf({ category: 'agent', keys: {} }).includes('developers'), 'audiences: category rules');
ck(audiencesOf({ category: 'platform', keys: { transport: 'python-sdk', pricing: 'open-source' } }).includes('no-code') === false, 'audiences: an SDK-only platform is not no-code');
ck(filterAgents(agents, { since: '2026-09-22' }).length >= 1 && filterAgents(agents, { audience: 'mcp' }).length >= 1 && findAgent(agents, agents[0].slug)?.slug === agents[0].slug, 'real registry: filters and lookup round-trip');

// ── 5. hit.js allowlist vs the event names build.mjs actually emits ─────
{
  const src = readFileSync(join(ROOT, 'scripts', 'build.mjs'), 'utf8');
  const emitted = new Set([...src.matchAll(/\b(?:bpjEv|EV)\('([a-z_]+)'/g)].map((m) => m[1]));
  for (const e of emitted) ck(EVENTS.has(e), `hit.js EVENTS lacks '${e}' which build.mjs emits — the event is dropped at the edge while the page looks fine`);
  ck(emitted.has('home') && emitted.has('go') && emitted.has('gs'), 'sanity: build.mjs still emits home/go/gs');
  ck(EVENTS.has('home') && EVENTS.has('go'), 'existing events still allowlisted');
}

if (bad) { console.error(`\ntest-agent-watch: ${bad} failed`); process.exit(1); }
console.log(`✅ test-agent-watch: ${agents.length} records (${curated.length} curated) valid — vocab-rendered labels, zh/en parity, dates, checks, official text; candidates + admissions log; verifier/admit/pull semantics; MCP filters/pagination/audiences; ${EVENTS.size} events allowlisted incl. every name build.mjs emits`);
