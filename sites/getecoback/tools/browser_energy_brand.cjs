const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8765';
  const dir = process.env.QA_DIR || '/tmp/eco-energy-qa';
  const copy = JSON.parse(await fs.readFile(path.join(__dirname, '../data/energy-workbench.json'), 'utf8'));
  const chrome = JSON.parse(await fs.readFile(path.join(__dirname, '../data/eco-chrome.json'), 'utf8'));
  const toolPaths = new Set(Object.values(copy).map(t => '/' + t.path));
  const terms = {de: 'Stromtarif', en: 'electricity', fr: 'électricité', es: 'tarifas', it: 'tariffe'};
  await fs.mkdir(dir, {recursive: true});
  let checks = 0;
  const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
  for (const [engine, type] of Object.entries({chromium, webkit})) {
    const browser = await type.launch({headless: true});
    try {
      const context = await browser.newContext({viewport: {width: 1280, height: 900}, locale: 'zh-CN'});
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== new URL(base).origin) return route.abort();
        if (url.pathname.startsWith('/api/')) return route.fulfill({status: 200, contentType: 'application/json', body: '{}'});
        return route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', error => { if (toolPaths.has(new URL(page.url()).pathname)) errors.push(error.message); });
      await page.goto(base + '/?__probe=1');
      const reference = await page.evaluate(() => {
        const css = selector => getComputedStyle(document.querySelector(selector));
        return {font: css('body').fontFamily, background: css('body').backgroundColor,
          nav: css('.eb-nav').backgroundColor, footer: css('.eb-footer').backgroundColor,
          button: css('.btn-primary').backgroundColor, radius: css('.btn-primary').borderRadius};
      });
      if (engine === 'chromium') await page.screenshot({path: dir + '/brand-reference-home-desktop.png'});
      await page.goto(base + '/tools.html?__probe=1');
      const referenceCard = await page.locator('.tcard').first().evaluate(e => getComputedStyle(e).borderRadius);
      const referenceHero = await page.locator('header.hero').evaluate(e => getComputedStyle(e).backgroundImage);
      if (engine === 'chromium') await page.screenshot({path: dir + '/brand-reference-tools-desktop.png'});
      for (const [lang, t] of Object.entries(copy)) {
        console.log(`Checking ECO brand and navigation: ${engine} / ${lang}`);
        await page.goto(base + '/' + t.path + '?__probe=1');
        await page.waitForFunction(() => typeof document.querySelector('#csv-file').onchange === 'function');
        const actual = await page.evaluate(() => {
          const css = selector => getComputedStyle(document.querySelector(selector));
          return {font: css('body').fontFamily, background: css('body').backgroundColor,
            nav: css('.eb-nav').backgroundColor, footer: css('.eb-footer').backgroundColor,
            button: css('.primary').backgroundColor, radius: css('.primary').borderRadius};
        });
        equal(actual, reference, `${lang}: shared main-site appearance`);
        equal(await page.locator('.panel').first().evaluate(e => getComputedStyle(e).borderRadius), referenceCard);
        equal(await page.locator('header.hero').evaluate(e => getComputedStyle(e).backgroundImage), referenceHero);
        equal(await page.locator('.eb-nav').count(), 1);
        equal(await page.locator('.eb-footer').count(), 1);
        equal(await page.locator('.eb-logo').getAttribute('href'), chrome[lang].homePath);
        equal(await page.locator('.language-switch a').count(), 5);
        equal(await page.locator('.language-switch [aria-current=page]').getAttribute('hreflang'), lang);
        if (lang === 'de') await page.screenshot({path: `${dir}/brand-${engine}-de-desktop.png`});

        for (const width of [320, 390]) {
          await page.setViewportSize({width, height: 844});
          equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${lang}: ${width}px layout`);
          await page.locator('#eb-search-toggle').click();
          equal(await page.locator('#eb-search-toggle').getAttribute('aria-expanded'), 'true');
          equal(await page.evaluate(() => document.activeElement.id), 'eb-search-query');
          equal(await page.locator('#eb-search-panel').evaluate(e => {
            const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth;
          }), true);
          await page.keyboard.press('Escape');
          equal(await page.isHidden('#eb-search-panel'), true);
          equal(await page.evaluate(() => document.activeElement.id), 'eb-search-toggle');
        }
        await page.screenshot({path: `${dir}/brand-${engine}-${lang}-mobile.png`});
        await page.locator('#eb-search-toggle').click();
        await page.fill('#eb-search-query', terms[lang]);
        await page.waitForSelector('#eb-search-results a');
        const hits = await page.locator('#eb-search-results a').evaluateAll(links => links.map(a => ({path: new URL(a.href).pathname, lang: a.hreflang})));
        equal(hits.some(hit => hit.path === '/' + t.path), true, `${lang}: the actual index finds this tool`);
        equal(hits.every(hit => hit.lang === lang), true);
        await page.fill('#eb-search-query', 'ecoback-no-matching-topic-xyz');
        await page.waitForFunction(expected => document.getElementById('eb-search-status').textContent === expected, chrome[lang].searchEmpty);
        equal(await page.locator('#eb-search-results a').count(), 0);
        await page.keyboard.press('Escape');
        await page.locator('.eb-logo').click();
        await page.waitForURL(base + chrome[lang].homePath);
        equal(await page.locator('h1').count() > 0, true, `${lang}: the home link works`);
        await page.setViewportSize({width: 1280, height: 900});
      }
      // Exercise recovery when the site index cannot be loaded, without losing the calculator.
      await page.route('**/search-index.json', route => route.abort());
      await page.goto(base + '/' + copy.en.path + '?__probe=1');
      await page.locator('#eb-search-toggle').click();
      await page.fill('#eb-search-query', 'electricity');
      await page.waitForFunction(expected => document.getElementById('eb-search-status').textContent === expected, chrome.en.searchError);
      await page.unroute('**/search-index.json');
      await page.locator('#eb-search-query').press('Enter');
      await page.waitForSelector('#eb-search-results a');
      equal(await page.locator('#eb-search-results a').count() > 0, true);
      await page.keyboard.press('Escape');
      await page.check('[name=confirm]');
      await page.click('button[type=submit]');
      await page.waitForSelector('#results:not([hidden])');
      equal((await page.textContent('#first-saving')).includes('124.00'), true);
      await page.emulateMedia({media: 'print'});
      equal(await page.isHidden('.eb-nav'), true);
      equal(await page.isHidden('.eb-footer'), true);
      equal(await page.isVisible('#results'), true);
      equal(errors, []);
    } finally {
      await browser.close();
    }
  }
  console.log(`PASS: ${checks} brand/navigation assertions against the existing ECO homepage and tool directory, five languages, Chromium + WebKit.`);
})().catch(error => { console.error(error); process.exit(1); });
