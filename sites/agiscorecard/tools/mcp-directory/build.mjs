#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';

const snapshotPath = new URL('../../../baipiaoji/data/agent-watch.json', import.meta.url);
const featuredPath = new URL('./featured.json', import.meta.url);
const catalogPath = new URL('../../mcp-directory-assets/catalog.json', import.meta.url);
const source = 'https://github.com/f-tiger/agi-site/blob/main/sites/baipiaoji/data/agent-watch.json';
export const CAP = 1000;
const MAX_BYTES = 1_000_000;
const MAX_SOURCE_AGE = 90;
const DAY = 24 * 60 * 60 * 1000;

const transportsByKey = {
  'mcp-remote': ['remote'],
  'mcp-stdio': ['local'],
  'mcp-stdio-or-remote': ['remote', 'local'],
};

const taskPatterns = {
  developer: /\b(?:api documentation|javascript|typescript|python code|git(?:hub|lab)?|bitbucket|npm|commit|pull request|lint|compiler|sdk|debug|source code|code review|repository|repos?|coding|developer docs)\b/gi,
  data: /\b(?:database|sql|sqlite|postgres(?:ql)?|mysql|mongodb|redis|bigquery|snowflake|data warehouse|csv|analytics|dashboards?|financial data|market data|metrics|spreadsheets?|table schema|filings|statistics|prices|price data|registry data|records)\b/gi,
  search: /\b(?:web search|search engine|search the web|web research|search results|scrap(?:er|ing)|crawl(?:er|ing)|serp|news|discover(?:y)?|search)\b/gi,
  productivity: /\b(?:notion|office|e-?mail|calendars?|scheduling|slack|teams|tickets?|jira|asana|trello|project management|meetings?|to-do|notes|communication|contacts?|workspace|invoices?|contracts?|timesheets?|task tracking)\b/gi,
  design: /\b(?:figma|illustrations?|images?|video|audio|tts|voice|visual|design|graphics|blender|3d|render|media|canvas|animations?|typography|art|sprites|music|layout)\b/gi,
  knowledge: /\b(?:knowledge|memory|rag|retrieval|vector|wikipedia|wiki|docs|documents?|citations?|research|papers|semantic|embeddings?|reference|flashcards?|public sources)\b/gi,
  infrastructure: /\b(?:kubernetes|docker|terraform|cloudflare|aws|azure|observability|cloud|logs?|monitoring|devops|deploy(?:ments?|ing)?|infrastructure|servers|hosting|network|sre|traces|dns|telemetry|runtime|provision)\b/gi,
  automation: /\b(?:workflow|automate|automation|zapier|pipedream|n8n|webhooks?|browser|playwright|connectors?|orchestrate|integrations?|agents?|pipeline|automations)\b/gi,
};
export const categories = [...Object.keys(taskPatterns), 'other'];

const sampleIdentity = /(?:^|[\s._/-])(?:test\d*|hello(?:[-_]?(?:world|server|mcp))?|example|placeholder|mock|demo|sample|exam|smoke[-_]?test|homework|hw\d+|keyprobe)(?:[\s._/-]|$)/i;
const emptyDescription = /^(?:mcp server listed in the official mcp registry|(?:an? )?(?:mcp (?:server|tool)|test server)[.!]?$)|\b(?:placeholder description|hello world|test server|test mcp server|example server|mock server|testing only|pirate (?:mode|flair)|(?:send|compose|craft) (?:quick, )?personalized greetings)\b/i;
const excludedScope = /\b(?:ransomware|malware|keyloggers?|metasploit|sqlmap|phishing|credential theft|exploit (?:development|execution)|vulnerability exploitation|adversarial tactics and techniques|automatic intrusion|autonomous penetration testing|account takeover|mass email|mass dm|bulk unsolicited|contact scraping|self.driving linkedin prospecting|spamming|adult (?:image|apps|videos?|content)|nsfw|sports betting|bet confidence|nfl props|gambling|(?:crypto|forex|stock|options) trading bot|trade stock, crypto)\b/i;

const genericNames = /^(?:mcp|server|mcp[-_ ]server|server[-_ ]mcp|gateway|web[-_ ]search)$/i;
const cleanText = (value, limit) => String(value ?? '').replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
const compare = (a, b) => a === b ? 0 : a < b ? -1 : 1;
const dateValid = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) &&
  new Date(date).toISOString().slice(0, 10) === date;

function publicLink(value) {
  if (typeof value !== 'string' || value.length > 512) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        isIP(host.replace(/^\[|\]$/g, '')) || !host.includes('.') ||
        /\.(?:local|localhost|test|invalid|internal|example|onion)$/.test(host) ||
        /^(?:[^.]+\.)?example\.(?:com|org|net)$/.test(host)) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|ref)$/i.test(key)) url.searchParams.delete(key);
      else return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function linkIdentity(link) {
  const url = new URL(link);
  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname.replace(/\/+$/, '').replace(/\.git$/i, '');
  return host + (/^(?:github|gitlab|bitbucket|codeberg)\./.test(host) ? path.toLowerCase() : path);
}

function titleFor(row, description, registryId) {
  const name = cleanText(row.name, 110);
  if (!genericNames.test(name)) return name;
  const [namespace, tail] = (registryId || '').split('/');
  const org = namespace?.replace(/^io\.github\./i, '').split('.').filter(part =>
    !/^(?:com|io|mcp|org|ai|net|app|dev|www|cn|co|cloud)$/i.test(part)).join(' ');
  if (tail && !genericNames.test(tail)) return cleanText(tail, 110);
  if (org) {
    const suffix = name.replace(/[-_]/g, ' ');
    return cleanText(`${org} ${/^(?:gateway|web search)$/i.test(suffix) ? suffix : 'MCP'}`, 110);
  }
  return cleanText(description.split(/[.!?]/)[0], 110) || name;
}

function categoryFor(entry) {
  let category = 'other';
  let score = 0;
  for (const [candidate, pattern] of Object.entries(taskPatterns)) {
    const weight = (entry.title.match(pattern)?.length || 0) * 2 + (entry.description.match(pattern)?.length || 0);
    if (weight > score) {
      category = candidate;
      score = weight;
    }
  }
  return category;
}

function candidateFrom(row, asOf) {
  const transport = transportsByKey[row.keys?.transport];
  const freshDays = (Date.parse(asOf) - Date.parse(row.source_checked)) / DAY;
  if (row.category !== 'mcp' || !['verified', 'updated'].includes(row.status) || !transport ||
      !Number.isInteger(row.source_http) || row.source_http < 200 || row.source_http >= 300 ||
      !dateValid(row.source_checked) || freshDays < 0 || freshDays > MAX_SOURCE_AGE ||
      !/^[a-z0-9-]{1,160}$/.test(row.slug)) return null;

  const registry = row.registry;
  if (registry && !(registry.remotes || registry.packages?.length)) return null;
  const registryId = cleanText(registry?.name, 180);
  const sourceUrl = publicLink(row.source_url);
  const repoUrl = row.repo_http >= 200 && row.repo_http < 300 ? publicLink(row.repo_url) : null;
  const description = cleanText(row.description, 240);
  const title = titleFor(row, description, registryId);
  const identity = [title, registryId, row.slug].join(' ');
  if (!sourceUrl || !title || description.length < 24 ||
      sampleIdentity.test(identity) || emptyDescription.test(description) ||
      excludedScope.test(`${identity} ${description}`)) return null;

  const candidate = {
    id: row.slug, title, description, transports: transport,
    sourceUrl, documentationUrl: repoUrl || sourceUrl, sourceChecked: row.source_checked,
    ...(registryId && { registryId }),
    ...(repoUrl && { repoUrl }),
  };
  candidate.category = categoryFor(candidate);
  return candidate;
}

function applyFeatured(candidates, featured) {
  const used = new Set();
  for (const [registryId, details] of Object.entries(featured)) {
    assert(/^[a-z0-9._-]+\/[a-z0-9._/-]+$/i.test(registryId), `Invalid official registry ID: ${registryId}`);
    const documentationUrl = publicLink(details.documentationUrl);
    const note = cleanText(details.note, 360);
    const noteZh = cleanText(details.noteZh, 360);
    assert(documentationUrl && note && noteZh && categories.includes(details.category), `Incomplete editorial evidence: ${registryId}`);
    const repoUrl = publicLink(details.repoUrl);
    let entry = candidates.find(item => item.registryId?.toLowerCase() === registryId.toLowerCase()) ||
      candidates.find(item => item.id === details.watchSlug ||
        (repoUrl && item.repoUrl && linkIdentity(item.repoUrl) === linkIdentity(repoUrl)));
    if (!entry) {
      const sourceUrl = publicLink(details.sourceUrl);
      assert(sourceUrl === `https://registry.modelcontextprotocol.io/v0.1/servers/${encodeURIComponent(registryId)}/versions/latest` &&
        dateValid(details.sourceChecked) && details.transports?.length,
      `Featured MCP needs an eligible watch entry or current registry evidence: ${registryId}`);
      const id = `mcp-${createHash('sha256').update(registryId.toLowerCase()).digest('hex').slice(0, 16)}`;
      entry = {
        id,
        title: cleanText(details.title, 110),
        description: cleanText(details.description || note, 240),
        sourceUrl,
        sourceChecked: details.sourceChecked,
        ...(repoUrl && { repoUrl }),
      };
      candidates.push(entry);
    }
    assert(!used.has(entry.id), `Duplicate featured MCP alias: ${registryId}`);
    used.add(entry.id);
    Object.assign(entry, {
      ...(details.title && { title: cleanText(details.title, 110) }),
      ...(details.transports?.length && { transports: details.transports }),
      category: details.category,
      documentationUrl, registryId, note, noteZh, featured: true,
      ...(dateValid(details.sourceChecked) && { documentationChecked: details.sourceChecked }),
    });
  }
}

function aliasKeys(entry) {
  const keys = new Set([entry.sourceUrl, entry.repoUrl].filter(Boolean).map(linkIdentity));
  if (entry.registryId) keys.add(entry.registryId.toLowerCase());
  const [namespace] = (entry.registryId || '').toLowerCase().split('/');
  const repoOwner = entry.repoUrl ? new URL(entry.repoUrl).pathname.split('/')[1]?.toLowerCase() : '';
  const publisherKeys = [namespace === 'ai.smithery' ? '' : namespace, repoOwner].filter(Boolean);
  for (const publisher of publisherKeys) {
    const task = entry.title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(token =>
      token && token !== publisher && !/^(?:mcp|rmcp|server|api|connector|integration|v\d+)$/.test(token)).join('-');
    if (task) keys.add(`publisher-task:${publisher}:${task}`);
  }
  return keys;
}

function selectDistinct(candidates) {
  // Editorially checked entries first. Within the source-checked group, favor traceable public
  // repositories and contemporary link checks. These are inventory rules, not usage or quality scores.
  candidates.sort((a, b) =>
    (b.featured === true) - (a.featured === true) ||
    Boolean(b.repoUrl) - Boolean(a.repoUrl) ||
    compare(b.sourceChecked, a.sourceChecked) ||
    compare(a.id, b.id));
  const identities = new Set();
  const selected = [];
  for (const entry of candidates) {
    const keys = aliasKeys(entry);
    if ([...keys].some(key => identities.has(key))) continue;
    keys.forEach(key => identities.add(key));
    selected.push(entry);
  }
  return selected.slice(0, CAP);
}

export function buildCatalog(snapshot, featured = {}) {
  assert(dateValid(snapshot.checked) && Array.isArray(snapshot.agents), 'Invalid upstream watch snapshot');
  const candidates = snapshot.agents.map(row => candidateFrom(row, snapshot.checked)).filter(Boolean);
  applyFeatured(candidates, featured);
  return {
    asOf: candidates.reduce((asOf, entry) => entry.documentationChecked > asOf ? entry.documentationChecked : asOf, snapshot.checked),
    source,
    entries: selectDistinct(candidates),
  };
}

export function validateCatalog(catalog) {
  assert(dateValid(catalog.asOf) && catalog.source === source, 'Invalid snapshot provenance');
  assert(Array.isArray(catalog.entries) && catalog.entries.length > 0 && catalog.entries.length <= CAP,
    'Catalog must have between 1 and 1,000 entries');
  assert(Buffer.byteLength(JSON.stringify(catalog)) < MAX_BYTES, 'Catalog exceeds the static payload limit');
  const ids = new Set();
  const identities = new Set();
  for (const entry of catalog.entries) {
    assert(/^[a-z0-9-]{1,160}$/.test(entry.id) && !ids.has(entry.id), `Invalid or duplicate ID: ${entry.id}`);
    ids.add(entry.id);
    assert(categories.includes(entry.category), `Unknown category: ${entry.id}`);
    assert(entry.title && entry.title.length <= 110 && entry.description?.length >= 24 &&
      entry.description.length <= 240, `Missing or invalid text: ${entry.id}`);
    assert(Array.isArray(entry.transports) && entry.transports.length > 0 &&
      entry.transports.length <= 2 && new Set(entry.transports).size === entry.transports.length &&
      entry.transports.every(t => ['local', 'remote'].includes(t)), `Invalid transport: ${entry.id}`);
    assert(dateValid(entry.sourceChecked) && entry.sourceChecked <= catalog.asOf &&
      Date.parse(catalog.asOf) - Date.parse(entry.sourceChecked) <= MAX_SOURCE_AGE * DAY, `Invalid source date: ${entry.id}`);
    assert(publicLink(entry.sourceUrl) && publicLink(entry.documentationUrl) &&
      (!entry.repoUrl || publicLink(entry.repoUrl)), `Invalid catalog link: ${entry.id}`);
    assert(!entry.featured || (entry.note && entry.noteZh && entry.registryId), `Missing editorial evidence: ${entry.id}`);
    for (const key of aliasKeys(entry)) {
      assert(!identities.has(key), `Duplicate publisher/repository/registry identity: ${entry.id}`);
      identities.add(key);
    }
  }
}

function main(args) {
  assert(args.length < 2 && args.every(arg => ['--check', '--validate'].includes(arg)), 'Use --check or --validate');
  if (args[0] === '--validate') {
    validateCatalog(JSON.parse(readFileSync(catalogPath, 'utf8')));
    return;
  }
  const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
  const catalog = buildCatalog(readJson(snapshotPath), existsSync(featuredPath) ? readJson(featuredPath) : {});
  validateCatalog(catalog);
  // Keep one compact entry per line so the checked-in catalog can be reviewed without increasing the served size.
  const { entries, ...meta } = catalog;
  const body = JSON.stringify(meta).slice(0, -1) + ',\n"entries":[\n' + entries.map(entry => JSON.stringify(entry)).join(',\n') + '\n]}\n';
  if (args[0] === '--check') {
    assert(readFileSync(catalogPath, 'utf8') === body, 'Stale catalog snapshot: rerun tools/mcp-directory/build.mjs');
  } else {
    const tempPath = new URL(`catalog.json.${process.pid}.tmp`, catalogPath);
    writeFileSync(tempPath, body);
    renameSync(tempPath, catalogPath);
  }
  console.log(`${entries.length} eligible MCP servers (${entries.filter(entry => entry.featured).length} editorial entries, ${Buffer.byteLength(body)} bytes, source snapshot ${catalog.asOf})`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main(process.argv.slice(2));
