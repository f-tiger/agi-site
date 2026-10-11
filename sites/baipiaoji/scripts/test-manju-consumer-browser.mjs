import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { MANJU } from './manju-pages.mjs';
import { INSIGHTS } from './manju-insights.mjs';
import { workURL } from './manju-work-urls.mjs';

const { chromium } = createRequire(new URL('../../../tools/revenue-studio/package.json', import.meta.url))('playwright');
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const origin = 'https://baipiaoji.com', home = origin + '/manju/';
const sync = JSON.parse(fs.readFileSync(new URL('../data/manju-sync-status.json', import.meta.url), 'utf8'));
const privateInput = 'CONSUMER_PRIVATE_QUERY@example.test';
const knownIds = new Set(MANJU.items.map(item => item.id));
const browser = await chromium.launch({ headless: true, executablePath: process.env.WORKBENCH_CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// No production request or analytics event leaves these contexts. The Google tag
// is an empty script; we inspect only the isolated, local GA4 command queue.
async function harness(mode = 'normal') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const hits = [], requests = [], tags = [], errors = [];
  await context.addInitScript(mode => {
    Object.defineProperty(navigator, 'webdriver', { get: () => mode === 'webdriver' });
    if (mode === 'dnt') Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
    if (mode === 'gpc') Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });
    if (mode === 'denied') localStorage.setItem('fleet_ga4_choice_v1', 'denied');
    window.__consumer = { native: [], clipboard: [], nativeMode: 'success', clipboardMode: 'success' };
    const nativeShare = async payload => {
      window.__consumer.native.push(payload);
      if (window.__consumer.nativeMode === 'cancel') throw new DOMException('User cancelled', 'AbortError');
      if (window.__consumer.nativeMode === 'error') throw new DOMException('Unavailable', 'NotAllowedError');
    };
    Object.defineProperty(navigator, 'share', { configurable: true, get: () => window.__consumer.nativeMode === 'unavailable' ? undefined : nativeShare });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => {
      window.__consumer.clipboard.push(text);
      if (window.__consumer.clipboardMode === 'denied') throw new DOMException('Denied', 'NotAllowedError');
    } } });
  }, mode);
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    requests.push({ url: request.url(), method: request.method(), body: request.postData() });
    if (url.hostname === 'www.googletagmanager.com') {
      tags.push(url.href);
      return route.fulfill({ contentType: 'application/javascript', body: '' });
    }
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/api/hit') {
      hits.push(request.postDataJSON());
      return route.fulfill({ status: 204 });
    }
    if (url.pathname === '/api/manju-discover') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'not_found', records: [] }) });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ contentType: 'application/json', body: '{}' });
    const relative = url.pathname.endsWith('/') ? url.pathname + 'index.html' : path.extname(url.pathname) ? url.pathname : url.pathname + '.html';
    const file = path.join(dist, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: 'Missing consumer test asset' });
    const mime = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
    return route.fulfill({ body: fs.readFileSync(file), contentType: mime[path.extname(file)] || 'application/octet-stream' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, hits, requests, tags, errors };
}

const gaEvents = page => page.evaluate(() => Array.from(document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer || []).map(event => Array.from(event)));
const ready = page => page.waitForFunction(() => document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length > 0);
const visibleIds = page => page.locator('[data-item]:visible').evaluateAll(rows => rows.map(row => row.dataset.item));
const sharingState = page => page.evaluate(() => ({ native: window.__consumer.native, clipboard: window.__consumer.clipboard }));
const shareCount = hits => hits.filter(hit => /\/manju\/share(?:_native|_copy)?\//.test(hit.p)).length;
const gaShareCount = events => events.filter(event => /^manju_share(?:_native|_copy)?$/.test(event[1])).length;
const setShare = (page, nativeMode, clipboardMode = 'success') => page.evaluate(({ nativeMode, clipboardMode }) => Object.assign(window.__consumer, { nativeMode, clipboardMode }), { nativeMode, clipboardMode });
const clickWithoutNavigation = async locator => {
  await locator.evaluate(element => element.addEventListener('click', event => event.preventDefault(), { once: true }));
  await locator.click();
};
function publicShare(url, expectedIds) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, origin);
  assert.ok(!url.includes(privateInput) && !url.includes('SECRET_URL'), 'Share must not contain private query text');
  for (const name of ['q', 'qa', '__ci', '__probe', 'private']) assert.equal(parsed.searchParams.has(name), false, 'No inherited query: ' + name);
  if (expectedIds) {
    assert.equal(parsed.pathname, '/manju/');
    const ids = parsed.searchParams.get('list').split(',');
    assert.deepEqual(ids, expectedIds, 'Share exactly this page in its visible order');
    assert.ok(ids.every(id => knownIds.has(id)), 'Share only public catalogue IDs');
  }
}

try {
  const { context, page, hits, requests, errors } = await harness();
  await page.goto(home + '?private=SECRET_URL');
  await page.locator('#mj-official').waitFor();
  await ready(page);

  // The first screen remains one useful catalogue. Its visible source action
  // follows each record's verified destination, even for a search-only hot row.
  assert.equal(await page.locator('.mj-grid').count(), 1);
  assert.equal((await visibleIds(page)).length, 24);
  assert.equal(await page.locator('[data-item]:visible .mj-watch-link a').count(), 24);
  assert.ok(await page.locator('[data-item]:visible .mj-watch-link [data-mj-action="official_open"]').count() > 0);
  assert.equal(await page.locator('[data-item][data-official="true"]').count(), await page.locator('.mj-watch-link [data-mj-action="official_open"]').count());
  assert.equal(await page.locator('[data-item]:not([data-official="true"]) .mj-watch-link [data-mj-action="official_open"]').count(), 0);
  assert.equal(await page.locator('.mj-watch-link a').count(), MANJU.items.length);
  assert.equal(await page.locator('[data-item] .mj-record[open]').count(), 0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo(0, 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow at ' + width);
    for (const href of ['/manju/', '/manju/rankings', '/manju/?saved=1']) assert.ok(await page.locator(`.mj-header nav > a[href="${href}"]`).isVisible(), 'Viewer navigation remains visible: ' + href);
    assert.ok((await page.locator('[data-item]:visible .mj-catalog-thumb').first().boundingBox()).y < 650, 'Covers should appear before an extra mobile screen');
    const primary = page.locator('[data-item]:visible .mj-watch-link a').first();
    assert.ok(await primary.isVisible());
    if (process.env.MANJU_CONSUMER_SCREENSHOTS) {
      fs.mkdirSync(process.env.MANJU_CONSUMER_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: path.join(process.env.MANJU_CONSUMER_SCREENSHOTS, 'consumer-' + width + '.png') });
    }
    const primaryHeight = (await primary.boundingBox()).height;
    assert.ok(primaryHeight >= 40, `Official destination has a usable touch target at ${width}px (actual ${primaryHeight}px)`);
  }
  assert.ok(await page.locator('[data-mj-thumbnail]:not([loading="lazy"])').count() <= 6, 'Do not eagerly load the full poster catalogue');

  // Source observation dates, not build dates, follow the selected cohort.
  for (const [mode, suffix] of [['hot-ai', 'ai-drama'], ['hot-comic', 'comic-drama']]) {
    await page.locator(`[data-browse="${mode}"]`).click();
    const cohort = INSIGHTS.cohorts.find(item => item.metric === 'snapshot_heat' && item.id.includes(suffix));
    const date = INSIGHTS.reports.find(report => report.id === cohort.reportId).observedAt;
    assert.ok((await page.locator('#mj-result-note').textContent()).includes(date), 'Selected cohort source date is visible');
    assert.equal(await page.locator('#mj-result-note').getAttribute(mode === 'hot-ai' ? 'data-ai-date' : 'data-comic-date'), date);
    if (sync.status === 'failed') assert.match(await page.locator('#mj-result-note').textContent(), /(?:失败|未成功).*保留|保留.*(?:有效|成功)/, 'Failed refresh retains valid dated data visibly');
  }
  // The two current source dates happen to match. A local-only fixture proves
  // the switch does not silently reuse the AI date for the comic cohort.
  const sourceDates = await page.locator('#mj-result-note').evaluate(element => ({ ai: element.dataset.aiDate, comic: element.dataset.comicDate, sync: element.dataset.syncState }));
  const failedSync = '最近一次自动更新未成功，保留上次有效数据。';
  await page.locator('#mj-result-note').evaluate((element, failedSync) => { element.dataset.aiDate = '2026-09-29'; element.dataset.comicDate = '2026-09-30'; element.dataset.syncState = failedSync; }, failedSync);
  for (const [mode, expected, other] of [['hot-ai', '2026-09-29', '2026-09-30'], ['hot-comic', '2026-09-30', '2026-09-29']]) {
    await page.locator(`[data-browse="${mode}"]`).click();
    const note = await page.locator('#mj-result-note').textContent();
    assert.ok(note.includes(expected) && !note.includes(other), 'Each cohort uses its own observation date');
    assert.ok(note.includes(failedSync), 'Failed-sync fixture remains visible when switching cohorts');
  }
  await page.locator('#mj-result-note').evaluate((element, dates) => { element.dataset.aiDate = dates.ai; element.dataset.comicDate = dates.comic; element.dataset.syncState = dates.sync; }, sourceDates);

  // An official-only toggle is a real filter, survives a shared URL/reload and
  // does not trap the next search, saved list or hash destination inside it.
  await page.locator('[data-browse="all"]').click();
  await page.locator('#mj-official').click();
  assert.equal(await page.locator('#mj-official').getAttribute('aria-pressed'), 'true');
  assert.equal(new URL(page.url()).searchParams.get('official'), '1');
  assert.equal(await page.locator('[data-item]:visible:not([data-official="true"])').count(), 0);
  await page.reload();
  await ready(page);
  assert.equal(await page.locator('#mj-official').getAttribute('aria-pressed'), 'true');
  await page.locator('#mj-reset').click();
  assert.equal(await page.locator('#mj-official').getAttribute('aria-pressed'), 'false');
  assert.equal(new URL(page.url()).searchParams.has('official'), false);
  await page.locator('#mj-official').click();
  const searchWork = MANJU.items.find(item => item.linkType === 'search');
  await page.locator('#mj-query').fill(searchWork.title);
  await page.locator('#mj-query').press('Escape');
  assert.equal(await page.locator('#mj-official').getAttribute('aria-pressed'), 'false');
  const searched = page.locator(`[data-item="${searchWork.id}"]`);
  assert.ok(await searched.isVisible());
  assert.ok(await searched.locator('.mj-watch-link [data-mj-action="platform_search"]').isVisible());
  assert.match(await searched.locator('.mj-watch-link').textContent(), /搜索/);
  await clickWithoutNavigation(searched.locator('.mj-watch-link a'));
  await searched.locator('[data-save]').click();
  await page.locator('#mj-official').click();
  await page.locator('#mj-saved').click();
  assert.equal(await page.locator('#mj-official').getAttribute('aria-pressed'), 'false');
  assert.deepEqual(await visibleIds(page), [searchWork.id]);
  await page.locator('[data-browse="all"]').click();
  await page.locator('#mj-official').click();
  await page.evaluate(id => { location.hash = 'work-' + id; }, searchWork.id);
  await searched.waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mj-official').getAttribute('aria-pressed'), 'false');
  await page.locator('#mj-official').click();
  await page.locator('[data-browse="all"]').click();
  assert.equal(await page.locator('#mj-official').getAttribute('aria-pressed'), 'false');

  // A preview/intro stays visibly distinct from a verified official collection.
  const intro = MANJU.items.find(item => item.linkType === 'intro');
  await page.locator('#mj-query').fill(intro.title);
  await page.locator('#mj-query').press('Escape');
  const introCard = page.locator(`[data-item="${intro.id}"]`);
  assert.equal(await introCard.getAttribute('data-official'), 'false');
  assert.ok(await introCard.locator('.mj-watch-link [data-mj-action="intro_open"]').isVisible());
  await clickWithoutNavigation(introCard.locator('.mj-watch-link a'));
  await page.locator('[data-browse="hot-ai"]').click();
  await clickWithoutNavigation(page.locator('[data-item]:visible .mj-watch-link [data-mj-action="official_open"]').first());

  // Homepage share is always the clean consumer entry, independent of a query
  // or browse filters. Native resolution records only that the API returned.
  await page.locator('#mj-query').fill(privateInput);
  await page.locator('#mj-query').press('Escape');
  await setShare(page, 'success');
  await page.locator('#mj-share-home').click();
  assert.equal((await sharingState(page)).native.at(-1).url, home);
  publicShare((await sharingState(page)).native.at(-1).url);
  await page.waitForFunction(() => Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).some(event => event[1] === 'manju_share_native'));

  // Cancel is neither a successful share nor a reason to copy to clipboard.
  const cancelStart = await sharingState(page), cancelEvents = shareCount(hits), cancelGa = gaShareCount(await gaEvents(page));
  await setShare(page, 'cancel');
  await page.locator('#mj-share-home').click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.mj-share-feedback')).some(element => element.textContent.includes('取消')));
  await page.waitForTimeout(100);
  assert.equal((await sharingState(page)).clipboard.length, cancelStart.clipboard.length);
  assert.equal(shareCount(hits), cancelEvents);
  assert.equal(gaShareCount(await gaEvents(page)), cancelGa);

  // Default hot results exceed 60; the new visible page action shares exactly
  // 24 instead of failing like the deliberate whole-filtered-list action.
  await page.locator('[data-browse="hot-ai"]').click();
  await setShare(page, 'unavailable');
  await page.locator('#mj-share-page').click();
  publicShare((await sharingState(page)).clipboard.at(-1), await visibleIds(page));
  await page.waitForFunction(() => Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).some(event => event[1] === 'manju_share_copy'));
  await page.locator('#mj-next').click();
  await page.locator('#mj-share-page').click();
  publicShare((await sharingState(page)).clipboard.at(-1), await visibleIds(page));
  await page.waitForTimeout(100);
  const beforeLarge = await sharingState(page), beforeLargeEvents = shareCount(hits);
  await page.locator('.mj-library-tools').evaluate(element => { element.open = true; });
  await page.locator('#mj-share').click();
  assert.match(await page.locator('#mj-toast').textContent(), /60/);
  assert.deepEqual(await sharingState(page), beforeLarge);
  assert.equal(shareCount(hits), beforeLargeEvents, 'Rejected large filtered list is not a share');

  // Per-work sharing keeps the published canonical work URL, including its
  // intentional catalogue hash when a dedicated evidence page does not exist.
  const workId = (await visibleIds(page))[0], work = MANJU.items.find(item => item.id === workId);
  await page.locator(`[data-share-work="${workId}"]`).click();
  assert.equal((await sharingState(page)).clipboard.at(-1), workURL(work));
  publicShare((await sharingState(page)).clipboard.at(-1));
  await page.waitForTimeout(100);

  // Permission failure gives a visible, selectable URL, never false success.
  await setShare(page, 'error', 'denied');
  const deniedCount = shareCount(hits), deniedGa = gaShareCount(await gaEvents(page));
  await page.locator('#mj-share-home').click();
  const manual = page.locator('.mj-share-feedback input[readonly]:visible');
  await manual.first().waitFor();
  assert.equal(await manual.first().inputValue(), home);
  await page.waitForTimeout(100);
  assert.equal(shareCount(hits), deniedCount);
  assert.equal(gaShareCount(await gaEvents(page)), deniedGa);
  await manual.first().click();
  assert.ok(await manual.first().evaluate(element => element.selectionStart === 0 && element.selectionEnd === element.value.length), 'Manual URL is selected for copying');

  const events = await gaEvents(page);
  for (const action of ['official_open', 'platform_search', 'intro_open', 'share_native', 'share_copy']) {
    assert.ok(events.some(event => event[1] === 'manju_' + action), 'Missing fixed GA4 action: ' + action);
    assert.ok(hits.some(hit => hit.p?.startsWith('/manju/' + action + '/')), 'Missing first-party action: ' + action);
  }
  const telemetry = JSON.stringify({ events, hits });
  for (const secret of [privateInput, 'SECRET_URL']) assert.ok(!telemetry.includes(secret), 'No private search or URL in measurement');
  assert.ok(!requests.some(request => request.body?.includes(privateInput)), 'Private email-shaped input is not sent to discovery');

  // A footer withdrawal takes effect immediately for both measurement paths.
  await page.locator('[data-analytics-choice="denied"]').click();
  await page.waitForFunction(() => !document.querySelector('iframe[title="Optional analytics"]'));
  const optOutHits = hits.length;
  await setShare(page, 'success');
  await page.locator('#mj-share-home').click();
  await clickWithoutNavigation(page.locator('[data-item]:visible .mj-watch-link a').first());
  await page.waitForTimeout(100);
  assert.equal(hits.length, optOutHits, 'Opt-out also suppresses first-party consumer actions');
  assert.deepEqual(errors, []);
  await context.close();

  // Controls remain usable for excluded traffic, without loading Google or
  // sending first-party counters. Each privacy condition gets fresh storage.
  for (const mode of ['qa', 'dnt', 'gpc', 'denied', 'webdriver']) {
    const excluded = await harness(mode);
    await excluded.page.goto(home + (mode === 'qa' ? '?qa=1&private=SECRET_URL' : ''));
    await excluded.page.locator('#mj-share-home').click();
    const native = (await sharingState(excluded.page)).native.at(-1);
    assert.equal(native.url, home, 'Privacy exclusions do not disable sharing');
    publicShare(native.url);
    await clickWithoutNavigation(excluded.page.locator('[data-item]:visible .mj-watch-link a').first());
    await excluded.page.waitForTimeout(100);
    assert.equal(excluded.tags.length, 0, mode + ' must not load the Google tag');
    assert.equal(excluded.hits.filter(hit => hit.e === 'manju').length, 0, mode + ' must not emit consumer actions');
    assert.equal(await excluded.page.locator('iframe[title="Optional analytics"]').count(), 0);
    assert.deepEqual(excluded.errors, []);
    await excluded.context.close();
  }
  console.log('PASS consumer official destinations, mobile navigation, filter/search/save/hash continuity, dated sources, native/cancel/copy/manual sharing, bounded page lists and private fixed-action measurement. All network intercepted.');
} finally {
  await browser.close();
}
