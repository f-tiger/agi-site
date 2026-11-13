import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

// Exercise the generated release through local interception, never the live site.
const {chromium} = createRequire(new URL('../../../../tools/revenue-studio/package.json', import.meta.url))('playwright');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? path.resolve(args[args.indexOf(name) + 1]) : fallback;
const root = path.resolve(option('--out', fileURLToPath(new URL('../../', import.meta.url))));
const artifacts = option('--artifacts', '/tmp/tds-shortlist-qa');
const origin = 'https://thedollscout.com';
const expectedIDs = ['blaliden', 'baggebo', 'lustigt', 'samla', 'my-bestie', 'niubee-risers'];
const expectedTasks = {'display-cases':['blaliden','baggebo','lustigt','niubee-risers'], 'storage-transport':['samla','my-bestie']};
const types = {'.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.txt':'text/plain'};
const errors = [], missing = [], blocked = [], measurements = [], checks = [], screenshots = [], layoutFailures = [];
fs.mkdirSync(artifacts, {recursive: true});
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
let failure, activePage;

async function context(options = {}) {
  const result = await browser.newContext({viewport:{width:390,height:844}, serviceWorkers:'block', ...options});
  await result.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.pathname.startsWith('/api/')) {
      blocked.push({origin:url.origin, path:url.pathname, kind:url.origin === origin ? 'api' : 'external'});
      return route.abort();
    }
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    else if (!path.extname(file)) file += '.html';
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
      missing.push(url.pathname);
      return route.fulfill({status:404, body:'Local QA fixture not found'});
    }
    return route.fulfill({body:fs.readFileSync(file), contentType:types[path.extname(file)] || 'application/octet-stream'});
  });
  result.on('page', page => {
    activePage = page;
    page.on('pageerror', error => errors.push({url:page.url(), message:error.message}));
  });
  return result;
}

async function open(page, pathname, fragment = '') {
  // Opening a shared link from elsewhere is a fresh document load, not a
  // same-document hash mutation (which is a separate, unrequested behavior).
  if (fragment) await page.goto('about:blank');
  await page.goto(origin + pathname + '?__ci=1' + fragment);
  await page.locator('[data-shopping-products]').first().waitFor();
  await page.locator('[data-shortlist-toolbar]').first().waitFor({state:'visible'});
}
const selectors = {
  card: '[data-shopping-card][data-shopping-item]',
  selected: '[data-shortlist-select]:checked',
  status: '[data-shortlist-status]',
  comparison: '[data-shortlist-comparison]',
};
const checkbox = (page, id) => page.locator(`[data-shortlist-select="${id}"]`).first();
async function selectedIDs(page) {
  const checked = await page.locator(selectors.selected).evaluateAll(inputs => inputs.map(input => input.dataset.shortlistSelect));
  const rendered = await page.locator('[data-shortlist-select]').evaluateAll(inputs => inputs.map(input => input.dataset.shortlistSelect));
  const chosen = await page.locator('[data-shortlist-selected] [data-shortlist-remove]').evaluateAll(chips => chips.map(chip => chip.dataset.shortlistRemove));
  assert.deepEqual([...checked].sort(), chosen.filter(id => rendered.includes(id)).sort(), 'Visible checkboxes agree with the selected product list');
  return chosen;
}
async function noOverflow(page, contextLabel) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), contextLabel + ': document overflow');
}
async function config(page) {
  return JSON.parse(await page.locator('script[data-shortlist-config]').first().textContent());
}
async function compare(page, ids, settings) {
  await page.locator('[data-shortlist-compare]').click();
  const comparison = page.locator(selectors.comparison);
  assert.ok(await comparison.isVisible(), 'Explicit compare reveals the comparison');
  assert.deepEqual(await comparison.locator('[data-shortlist-compared]').evaluateAll(headers => headers.map(header => header.dataset.shortlistCompared)), ids);
  for (const field of ['when','skip','size','source','destination']) {
    const row = comparison.locator(`[data-shortlist-row="${field}"]`);
    assert.equal(await row.count(), 1, 'Real comparison row: ' + field);
    assert.ok((await row.textContent()).trim().length > 10, 'Comparison row contains useful content: ' + field);
  }
  for (const id of ids) {
    const name = settings.items.find(item => item.id === id).name;
    assert.ok((await comparison.textContent()).includes(name), 'Comparison names the selected product: ' + id);
  }
  await noOverflow(page, 'Expanded comparison');
  const scroller = comparison.locator('.shopping-comparison-scroll');
  const horizontal = await scroller.evaluate(element => element.scrollWidth > element.clientWidth);
  if (horizontal) {
    await scroller.evaluate(element => {element.scrollLeft = element.scrollWidth;});
    assert.ok(await scroller.evaluate(element => element.scrollLeft > 0), 'Narrow comparison supports actual horizontal scrolling');
    const bounds = await scroller.boundingBox();
    const lastColumn = await comparison.locator(`[data-shortlist-compared="${ids.at(-1)}"]`).boundingBox();
    assert.ok(lastColumn.x >= bounds.x - 1 && lastColumn.x + lastColumn.width <= bounds.x + bounds.width + 1, 'The final selected product can be brought into view');
    await scroller.evaluate(element => {element.scrollLeft = 0;});
  }
}

async function measure(page, locale, pathname, width) {
  const positions = await page.evaluate(({card}) => {
    const visible = element => !!(element && element.getClientRects().length);
    const top = element => element ? Math.round(element.getBoundingClientRect().top + scrollY) : null;
    const cards = [...document.querySelectorAll(card)].filter(visible);
    const first = cards[0];
    const productLinks = cards.flatMap(item => [...item.querySelectorAll('a[data-shopping-destination]')]).filter(link => visible(link) && new URL(link.href).origin !== location.origin);
    const productAffiliateLinks = productLinks.filter(link => link.rel.split(/\s+/).includes('sponsored'));
    const affiliateLinks = [...document.querySelectorAll('a[rel~="sponsored"]')].filter(visible);
    const amazon = document.querySelector('[data-amazon-shopping]');
    const firstAmazon = amazon && [...amazon.querySelectorAll('a[rel~="sponsored"]')].find(link => visible(link) && /^https:\/\/www\.amazon\.(com|de)\//.test(link.href));
    const supplement = document.querySelector('.amazon-supplement');
    const sourceBlocks = [...document.querySelectorAll('.shopping-product-source,.shop-sources,.official-panel,[data-shopping-source],.shop-method')].filter(visible).map(element => ({selector:element.className || element.tagName, top:top(element)}));
    return {amazonTop:top(amazon), firstAmazonDestinationTop:top(firstAmazon), firstAmazonDestination:firstAmazon?.href || null, supplementTop:top(supplement), firstNamedCardTop:top(first), firstProductDestinationTop:top(productLinks[0]), firstProductDestination:productLinks[0]?.href || null, firstProductAffiliateLinkTop:top(productAffiliateLinks[0]), firstAffiliateLinkTop:top(affiliateLinks[0]), sourceBlocks};
  }, {card:selectors.card});
  measurements.push({locale, pathname, width, ...positions});
  if (pathname.endsWith('/shop') && width === 390) {
    if (positions.amazonTop === null || positions.supplementTop === null || positions.amazonTop >= positions.supplementTop) layoutFailures.push({locale,check:'Amazon main area precedes supplementary references',actual:positions});
    if (positions.firstAmazonDestinationTop === null || positions.firstNamedCardTop === null || positions.firstAmazonDestinationTop >= positions.supplementTop || positions.firstAmazonDestinationTop >= positions.firstNamedCardTop) layoutFailures.push({locale,check:'a usable Amazon destination precedes the original six reference cards',actual:positions});
  }
}

try {
  // The matrix catches translated controls and responsive comparison overflow.
  for (const width of [320, 390, 1440]) {
    for (const [locale, prefix, market] of [['en','','US'], ['de','/de','DE'], ['zh','/zh','US']]) {
      const ctx = await context({viewport:{width,height:width <= 390 ? 844 : 1000}, permissions:['clipboard-read','clipboard-write']});
      const page = await ctx.newPage();
      for (const suffix of ['/', '/shop', '/shop/display-cases']) {
        const pathname = prefix + suffix;
        await open(page, pathname);
        await noOverflow(page, locale + ' ' + pathname + ' ' + width);
        await measure(page, locale, pathname, width);
        if (suffix === '/shop') {
          const settings = await config(page);
          assert.equal(settings.market, market);
          assert.deepEqual(settings.items.map(item => item.id).sort(), [...expectedIDs].sort());
          assert.equal(await page.locator(selectors.card).count(), 6, 'Hub shows six named choices');
          for (const item of settings.items) assert.ok((await page.locator(`article[data-shopping-item="${item.id}"]`).textContent()).includes(item.name));
          if (market === 'DE') {
            const unsupported = page.locator('article[data-shopping-item="niubee-risers"]');
            assert.equal(await unsupported.locator('[data-shortlist-select]').count(), 0, 'US-only item cannot enter the DE shortlist');
            assert.ok(await unsupported.locator('[data-shortlist-unavailable]').isVisible());
            assert.ok((await unsupported.locator('[data-shortlist-unavailable]').textContent()).trim().length > 8, 'Unavailable item has an explanation');
          }
          const filter = page.locator('[data-shortlist-filter]');
          for (const task of ['display-cases','storage-transport']) {
            await filter.selectOption(task);
            const actual = await page.locator(selectors.card + ':visible').evaluateAll(cards => cards.map(card => card.dataset.shoppingItem).sort());
            const expected = [...expectedTasks[task]].sort();
            assert.ok(expected.length > 0 && expected.length < 6, 'Task produces a useful subset');
            assert.deepEqual(actual, expected, 'Task filter actually changes visible products');
          }
          await filter.selectOption('all');
          const eligible = settings.items.filter(item => item.eligible).map(item => item.id);
          await checkbox(page, eligible[0]).check();
          assert.ok(await page.locator('[data-shortlist-compare]').isDisabled(), 'One choice cannot create a comparison');
          assert.equal(await page.locator('[data-shortlist-dock-hint]').textContent(), settings.labels.oneMore, 'A single choice explains how to proceed');
          await checkbox(page, eligible[1]).check();
          if (width <= 390) {
            const bounds = await page.locator('[data-shortlist-compare]').boundingBox();
            assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 844, 'Compare remains reachable after selecting a lower product without scrolling back');
            const countBounds = await page.locator('[data-shortlist-dock-count]').boundingBox();
            assert.ok(countBounds.x + countBounds.width <= bounds.x, 'Selection count does not overlap the translated compare button');
            const countFits = await page.locator('[data-shortlist-dock-count]').evaluate(el => el.scrollWidth <= el.clientWidth);
            assert.ok(countFits, 'Selection count fits at narrow widths');
          }
          await compare(page, eligible.slice(0, 2), settings);
          await page.locator('[data-shortlist-edit]').press('Enter');
          assert.equal(await page.evaluate(() => document.activeElement.dataset.shortlistRemove), eligible[0], 'Edit comparison returns keyboard focus to the selection');
          await checkbox(page, eligible[2]).check();
          assert.equal(await page.locator(selectors.comparison).isVisible(), false, 'Changed selection invalidates the old comparison');
          await compare(page, eligible.slice(0, 3), settings);
          const fourth = checkbox(page, eligible[3]);
          if (!await fourth.isDisabled()) {
            await fourth.click();
            assert.equal(await page.locator(selectors.status).getAttribute('data-shortlist-state'), 'limit');
            assert.ok((await page.locator(selectors.status).textContent()).trim().length > 8, 'Selection limit explains the next action');
            assert.equal(await page.locator('[data-shortlist-dock-hint]').textContent(), settings.labels.limit, 'Limit feedback is also present beside the reachable action');
          }
          assert.deepEqual(await selectedIDs(page), eligible.slice(0, 3), 'A fourth selection never enters the list');
          await page.reload();
          await page.locator('[data-shortlist-toolbar]').waitFor({state:'visible'});
          assert.deepEqual(await selectedIDs(page), eligible.slice(0, 3), 'Three actual choices survive reload');
          const envelope = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), 'tds_shopping_shortlist_v1:' + market);
          assert.equal(envelope.version, 1);
          assert.deepEqual(envelope.ids, eligible.slice(0, 3));
          await page.locator(`[data-shortlist-remove="${eligible[2]}"]`).press('Enter');
          assert.deepEqual(await selectedIDs(page), eligible.slice(0, 2), 'Remove updates actual selection');
          assert.equal(await page.evaluate(() => document.activeElement.dataset.shortlistRemove), eligible[1], 'Removing the last chip keeps focus on the previous chip');
          await compare(page, eligible.slice(0, 2), settings);
          const screenshot = path.join(artifacts, `shortlist-${locale}-${width}.png`);
          await page.locator(selectors.comparison).evaluate(element => element.scrollIntoView({behavior:'instant',block:'start'}));
          await page.screenshot({path:screenshot, fullPage:false});
          screenshots.push(screenshot);
          await page.locator('[data-shortlist-copy]').click();
          await page.locator('[data-shortlist-status][data-shortlist-state="copied"]').waitFor();
          const shared = await page.evaluate(() => navigator.clipboard.readText());
          const shareURL = new URL(shared);
          assert.equal(shareURL.origin, origin, 'Share is on the canonical origin');
          assert.equal(shareURL.pathname, prefix + '/shop');
          assert.equal(shareURL.search, '', 'QA and campaign queries do not leak into share links');
          assert.equal(shareURL.hash, '#shortlist=' + eligible.slice(0, 2).join(','));
          assert.ok(shared.length < 300, 'Share is bounded, without arbitrary user content');
          assert.equal(await page.locator(selectors.status).getAttribute('data-shortlist-state'), 'copied');
          const success = await page.locator(selectors.status).textContent();
          await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async () => {throw new DOMException('QA clipboard permission denial','NotAllowedError');}}}));
          await page.locator('[data-shortlist-copy]').click();
          await page.locator('[data-shortlist-status][data-shortlist-state="copy-failed"]').waitFor();
          assert.equal(await page.locator(selectors.status).getAttribute('data-shortlist-state'), 'copy-failed');
          const errorText = (await page.locator(selectors.status).textContent()).trim();
          assert.ok(errorText.length > 8 && errorText !== success, 'Clipboard rejection produces distinct, nonempty user feedback');
          assert.ok(await page.locator('[data-shortlist-share-link]').isVisible(), 'Clipboard failure retains a usable manual link');
          assert.equal(await page.locator('[data-shortlist-share-link]').getAttribute('href'), shared);
          await page.locator('[data-shortlist-clear]').press('Enter');
          assert.deepEqual(await selectedIDs(page), [], 'Clear removes the selection');
          assert.ok(await page.evaluate(() => document.activeElement.matches('[data-shortlist-toolbar]')), 'Clearing moves focus out of hidden controls');
          assert.equal(await page.locator('[data-shortlist-dock]').isVisible(), false, 'No empty sticky action after clearing');
          assert.equal(await page.locator(selectors.comparison).isVisible(), false);
          await page.reload();
          assert.deepEqual(await selectedIDs(page), [], 'Clear survives reload');
          checks.push({locale,width,filters:true,comparison:'2 and 3 named products',reachableCompare:true,keyboardEditRemoveClear:true,max3:true,persistence:true,removeClear:true,realClipboard:true,clipboardFailure:true});
          await page.evaluate(() => scrollTo(0, 0));
          const hubScreenshot = path.join(artifacts, `hub-${locale}-${width}.png`);
          await page.screenshot({path:hubScreenshot, fullPage:false});
          screenshots.push(hubScreenshot);
        }
      }
      await ctx.close();
    }
  }

  const landscape = await context({viewport:{width:667,height:375}});
  const landscapePage = await landscape.newPage();
  await open(landscapePage, '/de/shop', '#shortlist=blaliden,samla');
  assert.equal(await landscapePage.locator('[data-shortlist-dock]').evaluate(el => getComputedStyle(el).position), 'static', 'Short landscape viewports retain room for product content');
  await compare(landscapePage, ['blaliden','samla'], await config(landscapePage));
  await noOverflow(landscapePage, 'Landscape');
  await landscape.close();
  checks.push({shortLandscape:true});

  const keyboard = await context();
  const keyboardPage = await keyboard.newPage();
  await open(keyboardPage, '/shop', '#shortlist=blaliden,samla');
  await keyboardPage.locator('[data-shortlist-remove="blaliden"]').press('Enter');
  assert.equal(await keyboardPage.evaluate(() => document.activeElement.dataset.shortlistRemove), 'samla', 'Removing the first chip focuses its successor');
  await keyboardPage.locator('[data-shortlist-remove="samla"]').press('Enter');
  assert.ok(await keyboardPage.evaluate(() => document.activeElement.matches('[data-shortlist-toolbar]')), 'Removing the only chip focuses the selection container');
  await keyboard.close();
  checks.push({firstAndOnlyChipFocus:true});

  // Share and storage inputs are an untrusted boundary, separate from happy-path controls.
  const edge = await context();
  const page = await edge.newPage();
  await open(page, '/shop');
  const key = 'tds_shopping_shortlist_v1:US';
  await page.evaluate(key => localStorage.setItem(key, '{invalid JSON'), key);
  await page.reload();
  assert.deepEqual(await selectedIDs(page), [], 'Malformed stored data is ignored');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), '{invalid JSON', 'Unreadable saved data is preserved until an explicit change');
  await checkbox(page, 'blaliden').check();
  assert.deepEqual(await selectedIDs(page), ['blaliden'], 'Malformed storage does not disable current-page choices');
  for (const fragment of ['#shortlist=unknown-id', '#shortlist=blaliden,blaliden', '#shortlist=blaliden,baggebo,lustigt,samla', '#shortlist=' + 'x'.repeat(2000)]) {
    await open(page, '/shop', fragment);
    assert.deepEqual(await selectedIDs(page), ['blaliden'], 'Invalid shared list does not replace valid saved choices');
  }
  await open(page, '/shop', '#shortlist=blaliden,samla');
  assert.deepEqual(await selectedIDs(page), ['blaliden','samla'], 'A valid fragment restores actual choices');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).ids, key), ['blaliden'], 'Opening a shared preview does not silently replace an existing saved list');
  await compare(page, ['blaliden','samla'], await config(page));
  await open(page, '/shop/display-cases');
  const settings = await config(page);
  const chips = await page.locator('[data-shortlist-selected]').textContent();
  for (const id of ['blaliden','samla']) assert.ok(chips.includes(settings.items.find(item => item.id === id).name), 'A category page preserves cross-category names');
  await compare(page, ['blaliden','samla'], settings);
  await open(page, '/zh/shop');
  assert.deepEqual(await selectedIDs(page), ['blaliden','samla'], 'EN and ZH share their US market list');
  await open(page, '/de/shop');
  assert.deepEqual(await selectedIDs(page), [], 'DE starts with its separate market list');
  await open(page, '/de/shop', '#shortlist=niubee-risers,blaliden');
  assert.deepEqual(await selectedIDs(page), ['blaliden'], 'A shared URL cannot introduce a US-only item into the DE market');
  await edge.close();

  const blockedStorage = await context();
  await blockedStorage.addInitScript(() => {
    for (const name of ['getItem','setItem']) {
      const original = Storage.prototype[name];
      Storage.prototype[name] = function(key, ...values) {
        if (String(key).startsWith('tds_shopping_shortlist_v1:')) throw new DOMException('QA storage unavailable','SecurityError');
        return original.call(this, key, ...values);
      };
    }
  });
  const restricted = await blockedStorage.newPage();
  await open(restricted, '/shop');
  await checkbox(restricted, 'blaliden').check();
  await checkbox(restricted, 'samla').check();
  assert.deepEqual(await selectedIDs(restricted), ['blaliden','samla']);
  assert.equal(await restricted.locator('[data-shortlist-persistence]').getAttribute('data-shortlist-storage'), 'unavailable', 'Blocked storage is disclosed instead of claiming a saved selection');
  await compare(restricted, ['blaliden','samla'], await config(restricted));
  await blockedStorage.close();
  checks.push({invalidStorage:true,invalidFragments:true,validSharedRestore:true,crossGuideComparison:true,marketIsolation:true,blockedStorageUsable:true});

  const nojs = await context({javaScriptEnabled:false});
  const staticPage = await nojs.newPage();
  for (const prefix of ['', '/de', '/zh']) {
    await staticPage.goto(origin + prefix + '/shop?__ci=1');
    assert.equal(await staticPage.locator(selectors.card).count(), 6);
    assert.equal(await staticPage.locator('[data-shortlist-toolbar]').isVisible(), false, 'JS-only controls do not become dead no-JS controls');
    const cards = staticPage.locator(selectors.card);
    for (let index = 0; index < 6; index++) {
      const card = cards.nth(index);
      const id = await card.getAttribute('data-shopping-item');
      const externalLinks = await card.locator('a[href]').evaluateAll(links => links.filter(link => new URL(link.href).origin !== location.origin).map(link => ({url:link.href,text:link.textContent.trim()})));
      if (prefix === '/de' && id === 'niubee-risers') {
        assert.ok(await card.locator('[data-shortlist-unavailable]').isVisible());
      } else {
        assert.ok(externalLinks.length > 0, 'Useful official or exact merchant destinations remain without JS: ' + id);
        for (const link of externalLinks) {
          assert.equal(new URL(link.url).protocol, 'https:');
          assert.ok(link.text.length > 0);
          assert.notEqual(new URL(link.url).pathname, '/s', 'Named choice does not disguise an Amazon category search as its product destination');
        }
        const destination = card.locator('a[data-shopping-destination]');
        const href = new URL(await destination.getAttribute('href'));
        if (['blaliden','baggebo','lustigt','samla'].includes(id)) {
          assert.equal(href.hostname, 'www.ikea.com');
          assert.ok(href.pathname.startsWith(prefix === '/de' ? '/de/de/p/' : '/us/en/p/'), 'IKEA destination follows the selected shopping market');
        } else if (id === 'my-bestie') {
          assert.equal(href.hostname, 'www.sonnyangelstore.com');
          assert.equal(href.pathname, '/en/products/mybestiecase2');
        } else if (id === 'niubee-risers') {
          assert.equal(href.hostname, 'www.amazon.com');
          assert.equal(href.pathname, '/dp/B07KN5G9CQ');
          assert.deepEqual(href.searchParams.getAll('tag'), ['ecoback0d-20']);
          for (const rel of ['sponsored','nofollow','noopener']) assert.ok((await destination.getAttribute('rel')).split(/\s+/).includes(rel));
        }
      }
    }
    await noOverflow(staticPage, 'No-JS ' + prefix);
  }
  await nojs.close();
  checks.push({noJavaScript:'All three locales retain six named cards and useful product destinations'});
  assert.deepEqual(errors, [], 'No uncaught JavaScript errors');
  assert.deepEqual(missing, [], 'Every requested same-origin static asset exists');
  assert.deepEqual(blocked.filter(request => request.kind === 'api' && request.path === '/api/ev'), [], 'QA comparisons and clicks must not attempt business-event submission');
  assert.deepEqual(layoutFailures, [], 'Mobile hub prioritizes usable Amazon destinations before supplementary references');
} catch (error) {
  failure = {message:error.message, stack:error.stack};
  if (activePage && !activePage.isClosed()) {
    const screenshot = path.join(artifacts, 'failure.png');
    try {await activePage.screenshot({path:screenshot,fullPage:false});screenshots.push(screenshot);} catch {}
  }
} finally {
  await browser.close();
  const report = {status:failure ? 'failed' : 'passed', generatedAt:new Date().toISOString(), root, viewports:[320,390,1440], locales:['en','de','zh'], checks, measurements, layoutFailures, screenshots, javascriptErrors:errors, missingAssets:missing, blockedRequests:blocked, productionNetworkRequests:0, backendReceiptVerified:false, failure};
  const reportPath = path.join(artifacts, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report,null,2) + '\n');
  console.log(JSON.stringify({status:report.status, reportPath, checks:checks.length, measurements:measurements.length, screenshots:screenshots.length, javascriptErrors:errors.length, missingAssets:missing.length, blockedRequests:blocked.length, productionNetworkRequests:0, backendReceiptVerified:false, failure:failure?.message}));
}
if (failure) process.exitCode = 1;
