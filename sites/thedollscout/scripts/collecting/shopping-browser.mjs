import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {chromium} = createRequire(new URL('../../../../tools/revenue-studio/package.json', import.meta.url))('playwright');
const args = process.argv.slice(2);
const root = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : fileURLToPath(new URL('../../', import.meta.url));
const origin = 'https://thedollscout.com';
const categories = ['display-cases', 'storage-transport', 'plush-display', 'collector-gifts'];
const types = {'.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain'};
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
const errors = [], missing = [], apiRequests = [], external = [];
async function serve(context) {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {external.push(url.origin);return route.abort();}
    if (url.pathname.startsWith('/api/')) {apiRequests.push(url.pathname);return route.abort();}
    let file = path.join(root, url.pathname);
    if (url.pathname.endsWith('/')) file += 'index.html';
    else if (!path.extname(file)) file += '.html';
    if (!file.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(file)) {missing.push(url.pathname);return route.fulfill({status: 404});}
    return route.fulfill({body: fs.readFileSync(file), contentType: types[path.extname(file)] || 'application/octet-stream'});
  });
}
async function checkMerchants(page, prefix) {
  const links = await page.locator('a[rel~="sponsored"]').evaluateAll(anchors => anchors.map(a => ({href: a.href, rel: a.rel, text: a.textContent.trim()})));
  assert.ok(links.length > 0, page.url() + ' needs a usable merchant link');
  for (const link of links) {
    const url = new URL(link.href), german = prefix === '/de';
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname.replace(/^www\./, ''), german ? 'amazon.de' : 'amazon.com', page.url());
    assert.equal(url.searchParams.get('tag'), german ? 'getecoback-21' : 'ecoback0d-20');
    assert.deepEqual(url.searchParams.getAll('tag'), [german ? 'getecoback-21' : 'ecoback0d-20']);
    assert.ok((url.pathname === '/s' && url.searchParams.get('k')) || (!german && url.pathname === '/dp/B07KN5G9CQ'), 'Explicit searches or the source-verified US product');
    for (const value of ['sponsored', 'nofollow', 'noopener']) assert.ok(link.rel.split(/\s+/).includes(value), value);
    assert.ok(link.text.length > 0);
  }
}
try {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  await serve(context);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push({url: page.url(), message: error.message}));
  for (const width of [390, 1440]) {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000});
    for (const prefix of ['', '/de', '/zh']) {
      for (const slug of ['/', '/shop', ...categories.map(id => '/shop/' + id)]) {
        const pathname = prefix + slug;
        await page.goto(origin + pathname + '?__ci=1');
        await page.waitForLoadState('networkidle');
        assert.equal(await page.locator('h1').count(), 1, pathname);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), origin + pathname);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), pathname + ' overflow at ' + width);
        if (slug !== '/shop') await checkMerchants(page, prefix);
        if (slug.startsWith('/shop/')) {
          await page.locator('details.shop-method > summary').click();
          assert.notEqual(await page.locator('details.shop-method').getAttribute('open'), null);
          assert.ok(await page.locator('.shop-no-buy').isVisible());
          assert.equal(await page.locator('.shop-table-wrap').getAttribute('tabindex'), '0');
        }
        if (slug === '/') {
          await page.screenshot({path: `/tmp/tds-shopping-${prefix.slice(1) || 'en'}-${width}.png`, fullPage: false});
          const workspace = page.locator('.shopping-workspace');
          assert.equal(await workspace.getAttribute('open'), null);
          await workspace.locator('summary').first().click();
          await page.locator('#series-search').fill('museum');
          assert.equal(await page.locator('[data-desk-series]:visible').count(), 1);
          await page.locator('[data-desk-clear]').click();
          assert.ok(await page.locator('[data-desk-series]:visible').count() > 5);
          await workspace.locator('summary').first().click();
        }
      }
      await page.goto(origin + prefix + '/shop?__ci=1');
      const guide = page.locator(`a[href="${prefix}/shop/display-cases"]`).first();
      await guide.click();
      await page.waitForURL(origin + prefix + '/shop/display-cases');
      assert.equal(await page.locator('h1').count(), 1);
    }
  }
  // Existing series and display tools must still load with the shared shopping stylesheet.
  for (const pathname of ['/series/smiski-museum', '/de/brands/skullpanda', '/zh/brands/jellycat']) {
    await page.goto(origin + pathname + '?__ci=1');
    assert.equal(await page.locator('h1').count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), pathname);
  }
  const nojs = await browser.newContext({javaScriptEnabled: false});
  await serve(nojs);
  const staticPage = await nojs.newPage();
  await staticPage.goto(origin + '/shop?__ci=1');
  for (const category of categories) assert.ok(await staticPage.locator(`a[href="/shop/${category}"]`).count() > 0);
  await staticPage.goto(origin + '/shop/display-cases?__ci=1');
  await checkMerchants(staticPage, '');
  assert.deepEqual(errors, [], 'No runtime JavaScript errors');
  assert.deepEqual(missing, [], 'Every requested local asset exists');
  assert.ok(!apiRequests.includes('/api/ev'), 'QA must never submit business events');
  console.log(JSON.stringify({status: 'passed', viewports: [390, 1440], languages: ['en', 'de', 'zh'], shoppingPages: 18, merchantTags: 'verified', workspace: 'preserved', javascriptErrors: errors.length, externalRequestsBlocked: external.length, apiRequestsBlocked: apiRequests.length, productionTraffic: false}));
} finally {await browser.close();}
