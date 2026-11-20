import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {HOME_PATHS} from '../../collector-assets/site-locale.mjs';
const {chromium} = createRequire(new URL('../../../../tools/revenue-studio/package.json', import.meta.url))('playwright');
const args = process.argv.slice(2);
const root = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : fileURLToPath(new URL('../../', import.meta.url));
const artifacts = args.includes('--artifacts') ? path.resolve(args[args.indexOf('--artifacts') + 1]) : '/tmp/tds-shopping-journey';
fs.mkdirSync(artifacts, {recursive:true});
const origin = 'https://thedollscout.com';
const homeByMarket = {'':HOME_PATHS.en,'/de':HOME_PATHS.de,'/zh':HOME_PATHS.zh};
const categories = ['display-cases', 'storage-transport', 'plush-display', 'collector-gifts'];
const types = {'.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain'};
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
const errors = [], missing = [], apiRequests = [], external = [];
const journeys = [];
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
    assert.ok((url.pathname === '/s' && url.searchParams.get('k')) || (!german && ['/dp/B07KN5G9CQ','/dp/B000KN4DQ4'].includes(url.pathname)), 'Explicit searches or the source-verified US product');
    for (const value of ['sponsored', 'nofollow', 'noopener']) assert.ok(link.rel.split(/\s+/).includes(value), value);
    assert.ok(link.text.length > 0);
  }
}
async function checkJourney(page, prefix, slug, width, javascript=true) {
  const top = async locator => locator.evaluate(el => Math.round(el.getBoundingClientRect().top + scrollY));
  if (slug === '/') {
    const catalogue = page.locator('[data-home-catalog]'), tasks = page.locator('#collector-corner .shop-task-nav');
    const models = await catalogue.locator('[data-home-product]').count();
    assert.ok(models >= 8 && models <= 12, 'Homepage selects 8–12 real home models');
    assert.equal(await catalogue.locator('[data-catalog-category-link]').count(), 9, 'Nine home-life categories');
    assert.equal(await tasks.locator('a').count(), 4, 'Four collector tasks remain in their corner');
    const catalogueTop=await top(catalogue), taskTop = await top(tasks), productTop = await top(page.locator('[data-shopping-card]').first());
    assert.ok(catalogueTop < taskTop && taskTop < productTop, 'Home catalogue is primary; collector tasks and saved comparison remain below');
    if (width === 390) assert.ok(catalogueTop < 900, 'Mobile catalogue begins within the first viewport area');
    for (const category of categories) assert.equal(await tasks.locator(`a[href="${prefix}/shop/${category}"]`).count(), 1);
    journeys.push({prefix,slug,width,javascript,catalogueTop,taskTop,productTop,models});
  } else if (slug.startsWith('/shop/')) {
    const start = page.locator('.shop-decision-start'), details = page.locator('.shop-measure-details');
    assert.ok(await start.locator('[data-shopping-decision]').isVisible(), 'Task-specific advice is visible before expanding details');
    const decisionTop = await top(start), summaryTop = await top(details.locator('summary'));
    const firstExit = page.locator('a[data-shopping-destination],a[data-shopping-merchant]').first();
    assert.ok(decisionTop < await top(firstExit), 'Advice precedes the merchant exit');
    assert.equal(await details.getAttribute('open'), null, 'Full checklist does not push products down until requested');
    await details.locator('summary').press('Enter');
    assert.notEqual(await details.getAttribute('open'), null, 'Keyboard opens native checklist');
    assert.ok(await details.locator('.shop-measure').isVisible());
    assert.ok(await details.locator('.shop-no-buy').isVisible(), 'No-purchase option stays available');
    assert.ok(await details.locator('.shop-measure li').count() >= 2);
    const tool = start.locator('a[href^="/"]').last(), href = await tool.getAttribute('href');
    assert.ok(href.startsWith('/') && !href.startsWith('//'));
    const toolFile = path.join(root, href + '.html');
    assert.ok(fs.existsSync(toolFile), 'The measurement or budget tool exists');
    await details.locator('summary').press('Enter');
    const target = await start.locator('[data-shopping-compare-jump]').getAttribute('href');
    assert.equal(await page.locator(target).count(), 1, 'Compare link resolves exactly once');
    await start.locator('[data-shopping-compare-jump]').click();
    assert.equal(new URL(page.url()).hash, target);
    assert.ok(await page.locator(target).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    journeys.push({prefix,slug,width,javascript,decisionTop,summaryTop,target,tool:href});
    if (width === 390) {
      await page.goto(origin + prefix + slug + '?__ci=1');
      await page.screenshot({path:path.join(artifacts, `${prefix.slice(1) || 'en'}-${slug.split('/').at(-1)}.png`)});
      // Navigate the verified tool destination with QA exclusion retained.
      // APIRequestContext is not used: it bypasses the local browser interception.
      await page.goto(origin + href + '?__ci=1');
      assert.equal(await page.locator('h1').count(), 1, 'Existing tool page loads');
      await page.goto(origin + prefix + slug + '?__ci=1');
    }
  }
}
async function verifyExpandedCatalogue(page, prefix, interactive) {
  const catalogue = page.locator('[data-home-catalog]');
  assert.equal(await catalogue.locator('[data-home-product]').count(),1000,'Full catalogue contains 1,000 distinct models');
  const item = catalogue.locator('[data-home-product]').filter({has:page.locator('[data-catalog-model-guide]')}).first();
  const id = await item.getAttribute('data-home-product');
  const category = await item.getAttribute('data-catalog-category');
  const link = await item.locator('[data-catalog-model-guide]').getAttribute('href');
  assert.equal(link,prefix+'/shop/categories/'+category+'#catalog-item-'+id);
  if (interactive) {
    await catalogue.locator('[data-catalog-filter]').selectOption(category);
    assert.ok(await item.isVisible(),'New indexed model is reachable by category');
    assert.equal(await catalogue.locator('[data-home-product]:visible').count(),await catalogue.locator(`[data-catalog-category="${category}"]`).count());
    const title = await item.locator('h3').textContent();
    const probe = title.trim().slice(0,32);
    await catalogue.locator('[data-catalog-query]').fill(probe);
    assert.ok(await item.isVisible(),'Added model is findable by its title');
    await catalogue.locator('[data-catalog-query]').fill('missing-brand-881614229');
    assert.equal(await catalogue.locator('[data-home-product]:visible').count(),0);
    await catalogue.locator('[data-catalog-reset]').click();
    assert.equal(await catalogue.locator('[data-home-product]:visible').count(),1000);
  }
  return link;
}
if (args.includes('--catalogue-only')) {
  try {
    for (const javaScriptEnabled of [true,false]) {
      const context = await browser.newContext({javaScriptEnabled,viewport:{width:390,height:844}});
      await serve(context);
      const page = await context.newPage();
      page.on('pageerror',error=>errors.push(error.message));
      for (const prefix of ['/de','','/zh']) {
        await page.goto(origin+prefix+'/shop?__ci=1');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),'No horizontal page overflow');
        const link = await verifyExpandedCatalogue(page,prefix,javaScriptEnabled);
        await checkMerchants(page,prefix);
        const destination = new URL(link,origin);
        destination.searchParams.set('__ci','1');
        await page.goto(destination.href);
        assert.equal(await page.locator(destination.hash).count(),1);
        assert.equal(await page.locator(destination.hash+' [data-catalog-source]').count(),1);
        assert.ok(await page.locator(destination.hash+' a[data-catalog-link-type]').count());
      }
      await context.close();
    }
    assert.deepEqual(errors,[]);
    assert.deepEqual(missing,[]);
    assert.ok(!apiRequests.includes('/api/ev'));
    console.log('1,000 products verified in EN, DE and ZH at 390px with and without JavaScript. No production requests.');
  } finally {await browser.close();}
  process.exit(0);
}
try {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  await serve(context);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push({url: page.url(), message: error.message}));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({width, height: width <= 390 ? 844 : 1000});
    for (const prefix of ['', '/de', '/zh']) {
      for (const slug of ['/', '/shop', ...categories.map(id => '/shop/' + id)]) {
        const pathname = slug === '/' ? homeByMarket[prefix] : prefix + slug;
        await page.goto(origin + pathname + '?__ci=1');
        await page.waitForLoadState('networkidle');
        assert.equal(await page.locator('h1').count(), 1, pathname);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), origin + pathname);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), pathname + ' overflow at ' + width);
        await checkMerchants(page, prefix);
        const amazon = page.locator('[data-amazon-shopping]');
        assert.equal(await amazon.count(), 1, 'One Amazon primary section');
        assert.ok(await amazon.locator('a[rel~="sponsored"]').count() > 0, 'Primary section has Amazon exits');
        if (slug === '/shop') {
          const catalogue=page.locator('[data-home-catalog]');
          await verifyExpandedCatalogue(page, prefix, width === 390);
          assert.ok(await catalogue.evaluate(el=>el.getBoundingClientRect().top+scrollY) < await amazon.evaluate(el=>el.getBoundingClientRect().top+scrollY),'Home catalogue precedes collector Amazon guides');
        }
        const supplemental = page.locator('[data-shopping-products]');
        if(await supplemental.count()) assert.ok(await amazon.evaluate(el=>el.getBoundingClientRect().top+scrollY) < await supplemental.evaluate(el=>el.getBoundingClientRect().top+scrollY), 'Amazon path precedes supplementary sources');
        await checkJourney(page, prefix, slug, width);
        if (slug.startsWith('/shop/')) {
          await page.locator('details.shop-method > summary').click();
          assert.notEqual(await page.locator('details.shop-method').getAttribute('open'), null);
          assert.equal(await page.locator('.shop-table-wrap').getAttribute('tabindex'), '0');
        }
        if (slug === '/') {
          await page.screenshot({path: path.join(artifacts, `home-${prefix.slice(1) || 'en'}-${width}.png`), fullPage: false});
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
      // Keep QA exclusion on every local navigation; a URL without it could
      // make a functional test attempt a business event.
      await page.goto(origin + prefix + '/shop/display-cases?__ci=1');
      assert.equal(await page.locator('h1').count(), 1);
    }
  }
  // Existing series and display tools must still load with the shared shopping stylesheet.
  for (const pathname of ['/series/smiski-museum', '/de/brands/skullpanda', '/zh/brands/jellycat']) {
    await page.goto(origin + pathname + '?__ci=1');
    assert.equal(await page.locator('h1').count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), pathname);
  }
  // Native details focus can keep smooth scrolling while the next click awaits stability.
  const nojs = await browser.newContext({javaScriptEnabled: false, reducedMotion: 'reduce'});
  await serve(nojs);
  const staticPage = await nojs.newPage();
  await staticPage.goto(origin + '/shop?__ci=1');
  for (const category of categories) assert.ok(await staticPage.locator(`a[href="/shop/${category}"]`).count() > 0);
  const staticCatalogue = staticPage.locator('[data-home-catalog]');
  assert.equal(await staticCatalogue.locator('[data-home-product]').count(),1000);
  const model = staticCatalogue.locator('[data-home-product]').filter({has:staticPage.locator('[data-catalog-model-guide]')}).first();
  const card = '#catalog-item-'+await model.getAttribute('data-home-product');
  const detail = new URL(await model.locator('[data-catalog-model-guide]').getAttribute('href'),origin);
  detail.searchParams.set('__ci','1');
  await staticPage.goto(detail.href);
  assert.equal(await staticPage.locator(card).count(),1,'Expanded model works through its category without JavaScript');
  assert.ok(await staticPage.locator(card+' [data-catalog-source]').count());
  for (const prefix of ['', '/de', '/zh']) {
    for (const slug of ['/', ...categories.map(id => '/shop/' + id)]) {
      const pathname = slug === '/' ? homeByMarket[prefix] : prefix + slug;
      await staticPage.goto(origin + pathname + '?__ci=1');
      await checkJourney(staticPage, prefix, slug, 1280, false);
      await checkMerchants(staticPage, prefix);
    }
  }
  assert.deepEqual(errors, [], 'No runtime JavaScript errors');
  assert.deepEqual(missing, [], 'Every requested local asset exists');
  assert.ok(!apiRequests.includes('/api/ev'), 'QA must never submit business events');
  const report = {status: 'passed', viewports: [320,390,1440], languages: ['en', 'de', 'zh'], shoppingPages: 18, journeys, merchantTags: 'verified', workspace: 'preserved', javascriptErrors: errors.length, externalRequestsBlocked: external.length, apiRequestsBlocked: apiRequests.length, productionTraffic: false};
  fs.writeFileSync(path.join(artifacts,'report.json'), JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,journeys:journeys.length}));
} finally {await browser.close();}
