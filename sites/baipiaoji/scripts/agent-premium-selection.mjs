// One checked-source selection from the directory snapshot. No external calls,
// installation tests or supplier statements get converted into performance claims.
import {readFileSync} from 'node:fs';

const checkedSources = JSON.parse(readFileSync(new URL('../data/agent-watch-selection-checks.json', import.meta.url), 'utf8'));
const DAY = 86400000;
const RECENT_DAYS = 45;
const CURRENT = new Set(['new', 'verified', 'updated']);
const REPOSITORY_HOSTS = new Set(['github.com', 'gitlab.com', 'codeberg.org', 'bitbucket.org']);
const RECOGNIZED_PACKAGE = new Set(['npm', 'pypi', 'oci', 'mcpb', 'nuget']);
const GENERIC = /^(?:a[n]? |the )?(?:(?:simple|basic|test|demo|example|sample|generic)\s+)?(?:model context protocol|mcp|ai|agent|tool)(?:\s+(?:a |the )?(?:server|client|agent|tool|implementation|service|connector|integration|platform))?(?:\s+for\s+(?:an? )?\w{1,12})?[.!]?$/i;
const PLACEHOLDER = /(?:^|[^a-z])(?:hello world|under construction|lorem ipsum|to be determined|replace[-_ ]me|your[-_ ]server|foobar|TODO|TBD)(?:[^a-z]|$)/i;
const RESEARCH_FIXTURE = /\b(?:my first mcp|mcp practice|mcp tutorial|mcp exercise|course assignment|student assignment|quick greetings|personalized greetings|pirate mode|greeting prompts|hello world)\b/i;
const EXCLUDED_TOPIC = /(?:^|[^a-z])(?:malware|ransomware|credential (?:steal(?:er|ing)?|harvest(?:er|ing)?|dump(?:er|ing)?)|(?:password|credential) crack(?:er|ing)?|phishing(?: kit)?|keylogg(?:er|ing)|botnet|backdoor|c2 framework|command and control|red team(?:ing)?|pentest(?:ing)?|penetration test(?:ing)?|offensive security|vulnerability exploit(?:s|ation|ing)?|exploit(?:s|ation|ing)? (?:development|framework|vulnerabilit(?:y|ies)|targets?)|cve exploit(?:s|ation)?|cyber attacks?|adversarial tactics|credential dumps?|exploitdb|metasploit|sqlmap|hydra password|captcha bypass|bypass (?:authentication|security|captcha|rate limits|bot detection)|dark ?web|deepfake(?:s)?|undress(?:ing)?|nsfw|porn(?:ography)?|weapon(?:s|ization)?|firearms?|gun(?:s|powder)|missiles?|munitions?|bomb(?:s|making)?|pathogen(?:s|ic)?|viral vector(?:s)?|virology|genetic engineering|viral engineering|dna synthes(?:is|ize|izing)|gene edit(?:ing)?|crispr|gain of function|bioweapon(?:s)?|bioterror(?:ism)?|synthetic biology|retrosynthesis|drug discovery)(?:[^a-z]|$)|(?:木马|勒索软件|漏洞利用|钓鱼工具|武器|枪械|炸弹|病毒工程|病原体|基因编辑|生物武器|合成生物)/i;

function dateValue(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const value = Date.parse(date);
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date ? value : null;
}

function recent(date, reference) {
  const value = dateValue(date);
  return value !== null && value <= reference && reference - value <= RECENT_DAYS * DAY;
}

function linkKey(value, repository = false) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (url.protocol !== 'https:' || url.port || url.username || url.password || !/^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]{1,62}$/.test(host) ||
        /^(?:\d+(?:\.\d+){3}|\[.*\])$/.test(host) || /(?:^|\.)(?:local|internal|localhost|test|invalid|example|onion)$/.test(host) ||
        /^(?:[^.]+\.)*example\.(?:com|org|net)$/.test(host)) return null;
    const path = url.pathname.replace(/\/+$/, '').replace(/\.git$/i, '');
    if (repository && (!REPOSITORY_HOSTS.has(host) || !/^\/[^/]+\/[^/]+(?:\/[^/]+)*$/.test(path))) return null;
    return host + (REPOSITORY_HOSTS.has(host) ? path.toLowerCase() : path);
  } catch {
    return null;
  }
}

function usableText(value) {
  const clean = typeof value === 'string' ? value.trim() : '';
  return clean.length >= 30 && !GENERIC.test(clean) && !PLACEHOLDER.test(clean) &&
    !/^MCP server listed in the official MCP registry; the publisher did not provide/i.test(clean) &&
    !/^官方 MCP 注册表收录的 MCP 服务器；描述以发布者的英文原文为准/.test(clean);
}

const goodStatus = code => Number.isInteger(code) && code >= 200 && code < 300;

function qualifyingRecord(record, reference) {
  if (!record || !CURRENT.has(record.status) || !recent(record.source_checked, reference) ||
      !goodStatus(record.source_http) || typeof record.slug !== 'string' ||
      !/^[a-z0-9][a-z0-9-]*$/.test(record.slug) || typeof record.name !== 'string' || !record.name.trim()) return null;
  const source = linkKey(record.source_url);
  if (!source) return null;
  // Honor a later, successful check from the scheduled directory refresh, or a
  // changed source that has passed its normal admission checks.
  const recentFailure = checkedSources.confirmed_source_failures.some(check =>
    check.slug === record.slug && linkKey(check.source_url) === source &&
    [404, 410].includes(check.http) && record.source_checked <= check.checked);
  if (recentFailure) return null;
  const corpus = [record.slug?.replace(/-/g, ' '), record.name, record.zh_name, record.description,
    record.zh_description, record.official?.title, record.official?.description, record.registry?.name]
    .filter(Boolean).join(' ');
  if (EXCLUDED_TOPIC.test(corpus) || RESEARCH_FIXTURE.test(corpus)) return null;
  const repo = linkKey(record.repo_url, true);
  const repoVerified = repo && goodStatus(record.repo_http) && recent(record.repo_checked, reference);
  const editedDescription = [record.description, record.zh_description].some(usableText);
  const checkedDescription = recent(record.official?.checked, reference) && usableText(record.official?.description);
  const curated = record.origin === 'curated';
  let identity;
  let publisherRelease = 0;
  if (curated) {
    if (!editedDescription || !record.category || !record.keys?.transport) return null;
    if (record.repo_url && !repoVerified) return null;
  } else {
    const registry = record.registry;
    identity = typeof registry?.name === 'string' ? registry.name.trim().toLowerCase() : null;
    const installEvidence = registry?.remotes === true ||
      (Array.isArray(registry?.packages) && registry.packages.some(type => RECOGNIZED_PACKAGE.has(type)));
    publisherRelease = dateValue(registry?.updated);
    if (record.origin !== 'mcp-registry' || !repoVerified || !identity || !identity.includes('/') ||
        typeof registry?.version !== 'string' || !registry.version.trim() || !installEvidence || publisherRelease === null || publisherRelease > reference ||
        !editedDescription) return null;
  }
  return {record, source, repo, identity, curated, checkedDescription, publisherRelease,
    sourceCheck: dateValue(record.source_checked)};
}

/**
 * Returns up to the requested count with one entry per identifiable source or
 * repository. Every check date belongs to this snapshot, including scheduled
 * rebuilds. If fewer records qualify, the displayed count is the true count.
 */
export function selectPremiumAgents(registry, target = 1000) {
  if (!Number.isInteger(target) || target < 1 || target > 1000) throw new RangeError('Invalid curated target');
  const checked = registry?.checked ?? registry?.generated ?? null;
  const reference = dateValue(checked);
  const rows = reference === null || !Array.isArray(registry?.agents) ? [] :
    registry.agents.map(record => qualifyingRecord(record, reference)).filter(Boolean);
  rows.sort((left, right) =>
    Number(right.curated) - Number(left.curated) ||
    Number(right.checkedDescription) - Number(left.checkedDescription) ||
    right.sourceCheck - left.sourceCheck ||
    right.publisherRelease - left.publisherRelease ||
    (left.record.slug < right.record.slug ? -1 : left.record.slug > right.record.slug ? 1 : 0));
  const seenLinks = new Set(), seenRegistry = new Set(), seenSlugs = new Set();
  const counts = {curated: 0, registry: 0, eligible: 0, selected: 0};
  const selected = [];
  for (const row of rows) {
    const {record, source, repo, identity, curated} = row;
    if (seenSlugs.has(record.slug) || seenLinks.has(source) || (repo && seenLinks.has(repo)) ||
        (identity && seenRegistry.has(identity))) continue;
    seenSlugs.add(record.slug);
    seenLinks.add(source);
    if (repo) seenLinks.add(repo);
    if (identity) seenRegistry.add(identity);
    counts.eligible++;
    if (selected.length === target) continue;
    selected.push(record);
    counts[curated ? 'curated' : 'registry']++;
  }
  counts.selected = selected.length;
  return {target, selected, counts, checked};
}
