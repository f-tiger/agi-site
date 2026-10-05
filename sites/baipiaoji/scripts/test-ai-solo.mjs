import {comparisonGroups} from './ai-solo-compare.mjs';
// Public build/live integration and offline privacy contracts. Never posts live analytics.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {buildModel, generatePlan, planMarkdown} from '../lib/ai-solo-core.mjs';
import {AI_SOLO_ACTIONS} from '../lib/ai-solo-events.mjs';
import {onRequestPost} from '../functions/api/hit.js';

const args = process.argv.slice(2);
assert(args.every(arg => ['--dist', '--live'].includes(arg)), 'Use --dist (default) or --live');
assert(!(args.includes('--dist') && args.includes('--live')), 'Choose one verification mode');
const live = args.includes('--live');
const origin = 'https://baipiaoji.com';
const read = relative => readFileSync(new URL('../' + relative, import.meta.url), 'utf8');
const raw = JSON.parse(read('data/ai-solo-cases.json'));
const original = Array.isArray(raw) ? raw : raw.cases || raw.items || [];
assert(original.length > 0, 'The researched case corpus must not be empty');
for (const outcome of ['success', 'failure']) assert(original.some(item => item.outcome === outcome), 'Missing researched outcome: ' + outcome);
assert.equal(new Set(original.map(item => item.id)).size, original.length, 'Duplicate case IDs');
for (const item of original) {
  for (const key of ['summary', 'category', 'soloRelevance']) for (const suffix of ['', 'En']) assert(typeof item[key + suffix] === 'string' && item[key + suffix].trim(), 'Missing bilingual research field: ' + item.id + '/' + key + suffix);
  assert(Array.isArray(item.sources) && item.sources.length, 'Case lacks public evidence: ' + item.id);
  for (const source of item.sources) assert(source.supports && source.supportsEn, 'Source lacks bilingual support scope: ' + item.id);
  for (const driver of item.drivers || []) assert(driver.text && driver.textEn, 'Interpretation lacks translation: ' + item.id);
  assert.equal(item.risksEn?.length, item.risks?.length, 'Limitations lack translation: ' + item.id);
}
const refreshPath = new URL('../data/ai-solo-refresh.json', import.meta.url);
const refresh = existsSync(refreshPath) ? JSON.parse(readFileSync(refreshPath, 'utf8')) : {};
const drift = new Set((refresh.queue || []).filter(item => item.reason === 'source-content-changed').map(item => item.caseId));
const unreachable = new Set((refresh.queue || []).filter(item => item.reason === 'source-unreachable').map(item => item.caseId));
const expectedCases = original.map(item => ({...item,
  ...(drift.has(item.id) ? {evidenceStatus: 'pending-review', freshnessStatus: 'review-required'} : {}),
  ...(unreachable.has(item.id) ? {sourceHealth: 'retrieval-risk'} : {})
}));
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const local = (item, key, lang, fallback = '') => {
  const value = item?.[lang === 'zh' ? key : key + 'En'];
  return value && typeof value === 'object' && !Array.isArray(value) ? String(value[lang] ?? fallback) : String(value ?? fallback);
};
const visible = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const decodeEntities = value => String(value).replace(/&(?:amp|lt|gt|quot|apos|#39|#x27);/gi, entity => ({'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&#x27;': "'"}[entity.toLowerCase()]));
const hasText = (html, value, label) => assert(decodeEntities(html).includes(String(value ?? '')), label);
const pending = new Set(['draft', 'pending', 'pending-review', 'review-required', 'change-pending', 'unverified', 'disputed', 'retracted']);
const cache = new Map();
let reads = 0;
async function get(path) {
  if (!cache.has(path)) cache.set(path, (async () => {
    reads++;
    if (!live) return read('dist/' + path.replace(/^\//, '') + (path.endsWith('/') ? 'index.html' : ''));
    const response = await fetch(origin + path, {headers: {'User-Agent': 'bpj-ci-selfcheck'}, signal: AbortSignal.timeout(25000)});
    assert.equal(response.status, 200, 'Public asset unavailable: ' + path);
    assert.equal(new URL(response.url).origin, origin, 'Public verification redirected off-site: ' + path);
    return response.text();
  })());
  return cache.get(path);
}
async function pool(items, fn, concurrency = 6) {
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(items.length, concurrency)}, async () => {
    while (cursor < items.length) await fn(items[cursor++]);
  }));
}
function assertPage(html, path, lang) {
  assert(/<!doctype html>/i.test(html), 'Missing complete HTML document: ' + path);
  assert(html.includes('rel="canonical" href="' + origin + path + '"'), 'Incorrect canonical: ' + path);
  const counterpart = path.replace(/^\/en\//, '/');
  assert(html.includes('hreflang="zh-Hans" href="' + origin + counterpart + '"'), 'Missing Chinese alternate: ' + path);
  assert(html.includes('hreflang="en" href="' + origin + '/en' + counterpart + '"'), 'Missing English alternate: ' + path);
  assert(html.includes('data-ai-solo') && html.includes('data-language="' + lang + '"'), 'Missing localized AI Solo root: ' + path);
  assert(html.includes('ai-solo.js') && html.includes('ai-solo.css'), 'Missing interactive assets: ' + path);
  assert(html.includes('FAQPage') && html.includes('application/ld+json'), 'Missing structured discovery: ' + path);
  const main = html.match(/<main\b[^>]*data-ai-solo[\s\S]*?<\/main>/i)?.[0];
  assert(main && visible(main).length > 900, 'Empty or thin AI Solo content: ' + path);
  if (lang === 'en') {
    // Original publisher titles and source quotations may retain their native language.
    const withoutSources = main.replace(/<ul\b[^>]*class="solo-source-list"[^>]*>[\s\S]*?<\/ul>/gi, '');
    assert(!/[\u3400-\u9fff]/u.test(visible(withoutSources)), 'Chinese fallback in English visible content: ' + path);
  }
  return main;
}
function assertMarkdown(markdown, path) {
  assert(markdown.startsWith('# ') && /^## /m.test(markdown), 'Incomplete Markdown: ' + path);
  assert(markdown.includes('\n\n'), 'Markdown needs real paragraph newlines: ' + path);
  assert(!/^# [^\n]*\\n\\n/m.test(markdown), 'Literal escaped Markdown line separators: ' + path);
  assert(markdown.includes('/ai-solo-cases.json'), 'Markdown has no machine-data discovery link: ' + path);
}

const publishedCases = JSON.parse(await get('/ai-solo-cases.json'));
assert(Array.isArray(publishedCases), 'Public case asset must be an array');
assert.deepEqual(publishedCases, expectedCases, 'Published corpus or source-monitor overlay is stale');
const model = JSON.parse(await get('/ai-solo-model.json'));
const expectedModel = buildModel(expectedCases);
assert.equal(model.version, expectedModel.version, 'Unexpected model version');
assert.equal(model.contentHash, expectedModel.contentHash, 'Model hash does not describe the published case corpus');
assert(/^[a-f0-9]{16,64}$/.test(model.contentHash), 'Invalid public model hash');
assert.equal(model.trained, true, 'The published model has not trained');
assert.equal(model.training.caseCount, expectedModel.training.caseCount, 'Wrong training count');
assert.equal(model.training.excludedCaseCount, expectedModel.training.excludedCaseCount, 'Pending cases were not excluded');
assert.equal(model.training.caseCount + model.training.excludedCaseCount, expectedCases.length, 'Unaccounted cases in model training');
assert.deepEqual(model.caseIds, expectedModel.caseIds, 'The model trained on the wrong cases');
assert.deepEqual(model.documents.map(item => item.id), model.caseIds, 'Model documents and IDs disagree');
assert.equal(model.embeddings.length, model.training.caseCount, 'Missing trained embeddings');
for (const key of ['initialLoss', 'finalLoss', 'weightDelta']) assert(Number.isFinite(model.training[key]), 'Nonfinite model training metric: ' + key);
assert(model.training.finalLoss >= 0 && model.training.finalLoss < model.training.initialLoss, 'Training did not improve reconstruction loss');
assert(model.training.weightDelta > 0 && model.training.epochs > 0, 'No actual learned weight updates');
for (const key of ['encoder', 'decoder', 'encoderBias', 'decoderBias']) {
  assert.equal(model.weights[key].length, expectedModel.weights[key].length, 'Wrong learned tensor size: ' + key);
  assert(model.weights[key].every(Number.isFinite), 'Nonfinite learned tensor: ' + key);
  if (!live) assert(model.weights[key].every((value, index) => Math.abs(value - expectedModel.weights[key][index]) < 1e-10), 'Dist weights do not match the deterministic trained model: ' + key);
}
for (const item of expectedCases.filter(item => pending.has(item.status || item.evidenceStatus))) assert(!model.caseIds.includes(item.id), 'Pending case leaked into training: ' + item.id);

const sitemap = await get('/sitemap.xml');
const llms = await get('/llms.txt');
for (const target of ['/ai-solo/', '/en/ai-solo/', '/ai-solo/agent/', '/ai-solo/method/', '/ai-solo-cases.json']) assert(llms.includes(target), 'Missing llms discovery: ' + target);
for (const lang of ['zh', 'en']) {
  const prefix = lang === 'en' ? '/en' : '';
  const home = await get(prefix + '/');
  const search = JSON.parse(await get(prefix + '/search-index.json'));
  const journeys = JSON.parse(await get(prefix + '/site-journeys.json'));
  const searchURLs = new Set(search.map(item => item.u));
  assert.equal(journeys.language, lang, 'Wrong journey-map language');
  for (const [id, route] of [['ai-solo', '/ai-solo/'], ['ai-solo-agent', '/ai-solo/agent/']]) {
    const item = journeys.items.find(item => item.id === id);
    assert(item && item.url === origin + prefix + route, 'Missing localized journey: ' + id + '/' + lang);
    assert.equal(item.requiresRegistration, false, 'Public AI Solo reading or consulting incorrectly gated');
    assert(searchURLs.has(item.url), 'Missing search discovery: ' + item.url);
  }
  for (const route of ['/ai-solo/', '/ai-solo/success/', '/ai-solo/failure/', '/ai-solo/agent/']) assert(home.includes('href="' + origin + prefix + route + '"'), 'Homepage lacks AI Solo entry: ' + lang + route);
  const pages = new Map();
  for (const leaf of ['', 'success/', 'failure/', 'agent/', 'method/', 'compare/', ...comparisonGroups.map(g=>'compare/'+g.id+'/')]) {
    const path = prefix + '/ai-solo/' + leaf;
    const html = await get(path);
    pages.set(leaf, assertPage(html, path, lang));
    assert(sitemap.includes('<loc>' + origin + path + '</loc>'), 'Missing sitemap page: ' + path);
    const markdownPath = path.replace(/\/$/, '') + '.md';
    assertMarkdown(await get(markdownPath), markdownPath);
  }
  for (const group of comparisonGroups) {
    const html=pages.get('compare/'+group.id+'/');
    const ids=[...html.matchAll(/<th scope="col" data-compare-case="([a-z0-9-]+)"/g)].map(m=>m[1]);
    assert.deepEqual(ids,group.ids,'Comparison membership must use explicit customer-job groups');
    for(const id of ids){const c=expectedCases.find(c=>c.id===id);hasText(html,local(c,'summary',lang),'Missing comparison evidence '+id);for(const source of c.sources)assert(html.includes(escape(source.url)),'Missing comparison citation '+id);}
  }
  for (const outcome of ['success', 'failure']) {
    const html = pages.get(outcome + '/');
    const expected = expectedCases.filter(item => item.outcome === outcome);
    const ids = [...html.matchAll(/data-solo-case="([a-z0-9-]+)"/g)].map(match => match[1]);
    assert.deepEqual(ids.sort(), expected.map(item => item.id).sort(), 'Wrong directory membership: ' + lang + '/' + outcome);
    for (const item of expected) hasText(html, local(item, 'summary', lang), 'Catalogue summary missing: ' + item.id + '/' + lang);
    for (const id of ['solo-query', 'solo-category', 'solo-scope', 'solo-evidence', 'solo-reset', 'solo-empty']) assert(html.includes('id="' + id + '"'), 'Unavailable catalogue filter: ' + id);
  }
  const agent = pages.get('agent/');
  for (const name of ['question', 'skill', 'customer', 'budget', 'hours', 'stage', 'price', 'variableCost', 'fixedCost']) assert(agent.includes('name="' + name + '"'), 'Missing consult input: ' + name);
  for (const id of ['solo-agent-form', 'solo-generate', 'solo-result', 'solo-example', 'solo-save', 'solo-load', 'solo-clear']) assert(agent.includes('id="' + id + '"'), 'Missing consult interaction: ' + id);
  assert(pages.get('method/').includes(model.contentHash), 'Method page describes an outdated model');
  await pool(expectedCases, async item => {
    const path = prefix + '/ai-solo/case/' + item.id + '/';
    const html = await get(path);
    const main = assertPage(html, path, lang);
    const markdownPath = path.replace(/\/$/, '') + '.md';
    const markdown = await get(markdownPath);
    assertMarkdown(markdown, markdownPath);
    assert(html.includes('"@type":"Article"'), 'Case lacks Article metadata: ' + item.id);
    for (const key of ['summary', 'category', 'soloRelevance']) hasText(main, local(item, key, lang), 'Missing translated case content: ' + item.id + '/' + key + '/' + lang);
    assert(markdown.includes(local(item, 'summary', lang)), 'Missing Markdown summary: ' + item.id);
    assert(markdown.includes(local(item, 'soloRelevance', lang)), 'Missing Markdown applicability: ' + item.id);
    for (const source of item.sources) {
      assert(main.includes('href="' + escape(source.url) + '"'), 'Missing case source link: ' + item.id);
      assert(markdown.includes('](' + source.url + ')'), 'Missing Markdown source link: ' + item.id);
      hasText(main, local(source, 'supports', lang), 'Missing source support scope: ' + item.id);
    }
    for (const metric of item.metrics || []) for (const key of ['label', 'value', 'period']) {
      const value = local(metric, key, lang, metric[key]);
      hasText(main, value, 'Missing case metric: ' + item.id + '/' + key + '/' + lang);
      assert(markdown.includes(value), 'Missing Markdown metric: ' + item.id + '/' + key + '/' + lang);
    }
    for (const driver of item.drivers || []) {
      hasText(main, local(driver, 'text', lang), 'Missing case interpretation: ' + item.id);
      assert(markdown.includes(local(driver, 'text', lang)), 'Missing Markdown interpretation: ' + item.id);
    }
    for (const risk of item[lang === 'zh' ? 'risks' : 'risksEn'] || []) hasText(main, risk, 'Missing case limitation: ' + item.id);
    assert(searchURLs.has(origin + path), 'Case absent from localized search: ' + item.id);
    assert(sitemap.includes('<loc>' + origin + path + '</loc>'), 'Case absent from sitemap: ' + item.id);
    if (item.evidenceStatus === 'pending-review') assert(main.includes(lang === 'zh' ? '当前不进入咨询指导' : 'excluded from current consulting guidance'), 'Invisible pending-review exclusion: ' + item.id);
  });
}

// Exercise the public corpus/model pair through the same core used by the browser.
for (const lang of ['zh', 'en']) {
  const plan = generatePlan(publishedCases, model, {
    question: lang === 'zh' ? '为软件开发者做代码补全编程助手，如何验证付费需求和留存？' : 'How can I validate paid code completion and coding assistance for software developers?',
    skill: lang === 'zh' ? '编程代码补全' : 'coding and code completion',
    customer: lang === 'zh' ? '软件开发者' : 'software developers', language: lang,
    budget: 0, hours: 5, stage: 'idea', price: 100, variableCost: 30, fixedCost: 140
  });
  assert.equal(plan.caseVersion, model.contentHash, 'Consulting silently used another corpus');
  assert.equal(plan.status, 'matched', 'Production evidence cannot support a relevant consult');
  assert(plan.evidence.success.length && plan.evidence.failure.length, 'Consult lacks both outcome comparisons');
  assert(plan.matchedCases.every(item => model.caseIds.includes(item.id) && item.sources.length), 'Consult used excluded or unsourced evidence');
  assert.equal(plan.steps14days.length, 4, 'Missing 14-day validation sequence');
  assert(plan.steps14days.every(step => step.gate && step.stopRule && step.measure), 'Consult lacks decision and stop gates');
  assert.equal(plan.unitEconomics.breakEvenCustomers, 2, 'Incorrect contribution-margin integration');
  const exported = planMarkdown(plan);
  assert(exported.includes(plan.matchedCases[0].sources[0].url), 'Plan export lost evidence');
  if (lang === 'en') assert(!/[\u3400-\u9fff]/u.test(plan.summary + plan.steps14days.map(step => step.action).join('')), 'Chinese fallback in English production guidance');
}

// Execute the built page's actual global page-view script without sending network traffic.
const pageViewPath = '/en/ai-solo/case/sitegpt/';
const pageViewHTML = await get(pageViewPath);
const pageViewScripts = [...pageViewHTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(script => script.includes('window.SITE_EDITION') && script.includes('navigator.sendBeacon'));
assert.equal(pageViewScripts.length, 1, 'Missing or ambiguous built global analytics script');
for (const referrer of [origin + '/en/ai-solo/success/?q=PRIVATE_AUDIT_FIXTURE', '']) {
  const sends = [];
  runInNewContext(pageViewScripts[0], {
    window: {}, document: {referrer, addEventListener: () => {}},
    location: {hostname: 'baipiaoji.com', pathname: pageViewPath, search: '', href: origin + pageViewPath},
    navigator: {sendBeacon: (...values) => { sends.push(values); return true; }}, URL
  }, {timeout: 1500});
  assert.equal(sends.length, 1, 'Built global analytics must issue one public page view');
  assert.equal(sends[0][0], '/api/hit');
  const body = JSON.parse(sends[0][1]);
  assert(body.r === (referrer ? origin : ''), 'Built global analytics leaked referrer path or query');
  assert.equal(body.p, pageViewPath); assert.equal(body.l, 'en');
}
if (!live) {
  const headers = read('dist/_headers').split(/\r?\n/);
  for (const route of ['/ai-solo/*', '/en/ai-solo/*']) {
    const start = headers.indexOf(route);
    assert(start >= 0, 'Missing localized AI Solo security-header route: ' + route);
    const block = [];
    for (let index = start + 1; index < headers.length && /^[ \t]/.test(headers[index]); index++) block.push(headers[index].trim());
    assert(block.includes('Referrer-Policy: strict-origin'), 'AI Solo referrer policy must strip paths and queries: ' + route);
  }
}

// Stub only the browser surface needed for initial/click analytics; no form inputs are sent.
const client = await get('/ai-solo.js');
const coreAsset = await get('/ai-solo-core.mjs');
assert(client.includes("'/ai-solo-core.mjs'"), 'Client does not load the published local core');
if (!live) assert.equal(coreAsset, read('lib/ai-solo-core.mjs'), 'Published browser core is stale');
function browserEvents(options = {}) {
  const sends = [], listeners = new Map();
  const root = {dataset: {language: options.lang || 'zh', base: origin}, addEventListener: (name, fn) => listeners.set(name, fn), contains: () => true, querySelectorAll: () => [], querySelector: () => null};
  runInNewContext(client.replace(/^import\s+[^;]+;\s*/u, ''), {
    document: {querySelector: () => root}, location: {hostname: options.hostname || 'baipiaoji.com', search: options.search || ''},
    navigator: {webdriver: !!options.webdriver, doNotTrack: options.dnt ? '1' : '0', globalPrivacyControl: !!options.gpc, sendBeacon: (...values) => sends.push(values)},
    localStorage: {getItem: () => options.denied ? 'denied' : null},
    window: {dispatchEvent: () => {}}, CustomEvent: class {}, Blob, setTimeout, clearTimeout,
    retrieveCases: () => [], generatePlan: () => {}, planMarkdown: () => ''
  }, {timeout: 1500});
  listeners.get('click')?.({target: {closest: () => ({dataset: {soloEvent: 'source-open'}})}});
  return sends;
}
for (const options of [{webdriver: true}, {dnt: true}, {gpc: true}, {denied: true}, {search: '?qa=1'}, {search: '?__ci=1'}, {search: '?__probe=1'}, {hostname: 'preview.example'}]) assert.equal(browserEvents(options).length, 0, 'Suppressed browser traffic produced analytics');
for (const lang of ['zh', 'en']) {
  const events = browserEvents({lang});
  assert.equal(events.length, 2, 'Fixed browser view and source actions should be recorded');
  for (const [url, blob] of events) {
    assert.equal(url, '/api/hit');
    const body = JSON.parse(await blob.text());
    assert.deepEqual(Object.keys(body).sort(), ['e', 'l', 'p', 'r'], 'Client analytics payload includes private context');
    assert.equal(body.e, 'ai_solo'); assert.equal(body.l, lang); assert.equal(body.r, '');
    assert(['/ai-solo/view/workspace', '/ai-solo/source-open/workspace'].includes(body.p), 'Client sent an unbounded action');
  }
}
const inserts = [];
const env = {HITS: {prepare: sql => ({bind: (...values) => ({run: async () => inserts.push({sql, values})})})}};
async function send(body, headers = {}) {
  const request = new Request(origin + '/api/hit', {method: 'POST', headers: {'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', Referer: origin + '/ai-solo/agent/', ...headers}, body: JSON.stringify(body)});
  assert.equal((await onRequestPost({request, env})).status, 204, 'Analytics must never block product use');
}
for (const lang of ['zh', 'en']) for (const action of AI_SOLO_ACTIONS) await send({e: 'ai_solo', p: '/ai-solo/' + action + '/workspace', l: lang, r: 'https://private.example/context', question: 'private-input-test-marker', customer: 'private-input-test-marker', amount: 999});
assert.equal(inserts.length, AI_SOLO_ACTIONS.length * 2, 'Valid fixed actions were dropped');
for (const row of inserts) {
  assert.equal(row.values.length, 6, 'Unexpected analytics persistence columns');
  assert.equal(row.values[4], '', 'Input referrer was stored');
  assert.equal(row.values[5], 'ai_solo');
  assert(!JSON.stringify(row).includes('private-input-test-marker') && !JSON.stringify(row).includes('private.example'), 'Private analytics input was persisted');
}
const baseline = inserts.length;
const valid = {e: 'ai_solo', p: '/ai-solo/view/workspace', l: 'zh'};
for (const p of ['/ai-solo/unknown/workspace', '/ai-solo/view/customer-id', '/ai-solo/view/workspace?input=x', '/en/ai-solo/view/workspace', '/ai-solo/view/workspace/', '/ai-solo/view/../workspace', '/ai-solo/view/%77orkspace', '/ai-solo/VIEW/workspace', 'ai-solo/view/workspace']) await send({...valid, p});
for (const l of ['', 'ci', 'ZH', 'en-US', 'fr', 'zh/private']) await send({...valid, l});
for (const headers of [{DNT: '1'}, {'Sec-GPC': '1'}, {Referer: origin + '/ai-solo/?qa=1'}, {Referer: origin + '/ai-solo/?__ci=1'}, {Referer: origin + '/ai-solo/?__probe=1'}, {'User-Agent': 'bpj-ci-selfcheck'}, {'User-Agent': 'HeadlessChrome'}, {'User-Agent': 'Playwright'}, {'User-Agent': 'Googlebot'}]) await send(valid, headers);
await send({...valid, e: 'ai_solo_arbitrary'});
assert.equal(inserts.length, baseline, 'Forged or suppressed requests entered first-party counts');
console.log(`PASS AI Solo ${live ? 'live' : 'dist'}: ${expectedCases.length} bilingual cases and Markdown, ${model.training.caseCount} trained / ${model.training.excludedCaseCount} excluded, finite improving loss, discovery and ${reads} public assets; offline action/privacy contracts exclude private inputs and QA/DNT/GPC/WebDriver traffic.`);
