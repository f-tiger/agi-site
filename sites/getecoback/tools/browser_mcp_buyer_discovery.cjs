const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require(process.env.NODE_PATH ? 'playwright' : '../../../tools/revenue-studio/node_modules/playwright');

const suppliedBase = process.env.ECO_MCP_DISCOVERY_BASE;
const base = new URL(suppliedBase || 'http://127.0.0.1:8769');
const live = base.origin === 'https://getecoback.com';
assert(live || ['127.0.0.1', 'localhost'].includes(base.hostname), 'Use the local preview or the canonical live site');

const cases = [
  {
    question: 'Passt irgendein 360 Grad Sockel zum Bosch TWK8613P?',
    tool: 'wasserkocher_twk8613p_360_sockel_originalbasis',
    category: 'Wasserkocherbelege',
    guide: '/produkte.html#wasserkocher-bosch-twk8613p',
    heading: 'Bosch TWK8613P im Haushalt prüfen',
  },
  {
    question: 'Unser Versorger nennt 2,4 bis 2,6 mmol Calciumcarbonat pro Liter. Welche Spalte auf der Waschmittelpackung ist das?',
    tool: 'waschmittel_dosiertabelle_wasserhaerte_intervall',
    category: 'Waschmitteldosierung',
    guide: '/guide/waesche-trocknen-wohnung.html#waschmittel-automatische-dosierung',
    heading: 'Vor dem Waschen: Dosiertabelle und Automatik prüfen',
  },
  {
    question: 'Passt die schwarze 170-mm-Ersatzlippe 2.633-104.0 in meinen WV 8?',
    tool: 'fenstersauger_170mm_abziehlippe_geraetefamilie',
    category: 'Fenstersauger',
    guide: '/produkte.html#fenstersauger-belege',
    heading: 'Fenstersauger prüfen: Abziehlippen und Gebrauch',
  },
];

function probePath(path) {
  const url = new URL(path, base);
  url.searchParams.set('__probe', '1');
  return url;
}

async function assertGuideVisible(page, item) {
  const guide = new URL(item.guide, base);
  await page.waitForURL(url => url.pathname === guide.pathname && url.hash === guide.hash);
  const heading = page.getByRole('heading', { name: item.heading, exact: true });
  await heading.waitFor();
  assert.equal(await page.locator(guide.hash).count(), 1, `Unique evidence target ${guide.hash}`);
  await page.evaluate(() => document.fonts.ready);
  const layout = await heading.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, navBottom: document.querySelector('.eb-nav').getBoundingClientRect().bottom, height: innerHeight };
  });
  assert(layout.top >= Math.max(0, layout.navBottom) - 1 && layout.bottom <= layout.height,
    `Guide heading is clipped at ${guide.hash}: ${JSON.stringify(layout)}`);
  if (item.category === 'Fenstersauger') {
    await page.getByRole('link', {name:'Fenstersauger-Modelle und Lieferumfang vergleichen'}).click();
    await page.waitForURL(url => url.hash === '#modelle-fenstersauger');
    await page.getByRole('heading', {name:'Fenstersauger: Modelle und Kaufgrenzen'}).waitFor();
    const modelCards = page.locator('[data-product-card][data-category="fenstersauger"]');
    const targets = await modelCards.locator('a[rel~="sponsored"]').evaluateAll(links => links.map(link => link.href));
    assert.equal(await modelCards.count(), 4);
    assert.equal(targets.length, 4);
    for (const target of targets) {
      const url = new URL(target);
      assert.equal(url.origin, 'https://www.amazon.de');
      assert.equal(url.pathname, '/s');
      assert.equal(url.searchParams.get('tag'), 'getecoback-21');
    }
  }
}

async function run() {
  const site = process.env.ECO_MCP_DISCOVERY_SITE || resolve(__dirname, '../site');
  const preview = suppliedBase ? null : spawn('python3', ['-m', 'http.server', base.port, '--bind', base.hostname, '--directory', site], { stdio: 'ignore' });
  let browser;
  try {
    if (preview) {
      let ready = false;
      for (let attempt = 0; attempt < 25 && !ready && preview.exitCode === null; attempt++) {
        ready = await fetch(probePath('/mcp.html')).then(response => response.ok, () => false);
        if (!ready) await delay(100);
      }
      assert(ready, 'Local static preview did not start');
    }
    browser = await chromium.launch({
      headless: true,
      ...(process.env.ECO_QA_CHROMIUM ? { executablePath: process.env.ECO_QA_CHROMIUM } : {}),
    });
    for (const width of [320, 390]) {
      for (const javaScriptEnabled of [true, false]) {
        const context = await browser.newContext({
          viewport: { width, height: 844 },
          javaScriptEnabled,
          userAgent: 'getecoback-ci/mcp-buyer-discovery',
          extraHTTPHeaders: { 'x-probe': '1', DNT: '1', 'Sec-GPC': '1' },
          serviceWorkers: 'block',
        });
        let catalogueReads = 0;
        let dynamicCatalogueReads = 0;
        await context.route('**/*', route => {
          const request = route.request();
          const url = new URL(request.url());
          if (url.origin !== base.origin || request.method() !== 'GET') return route.abort();
          if (url.pathname === '/assets/mcp-catalogue.json') {
            assert.equal(url.searchParams.has('q'), false, 'The search phrase stays in the browser');
            catalogueReads++;
          } else if (url.pathname.startsWith('/api/')) {
            if (url.pathname === '/api/mcp-tools') dynamicCatalogueReads++;
            return route.abort();
          }
          if (live && (request.isNavigationRequest() || url.pathname === '/assets/mcp-catalogue.json')) {
            return route.continue({ url: probePath(url).href });
          }
          return route.continue();
        });
        const page = await context.newPage();
        assert.equal((await page.goto(probePath('/mcp.html').href)).status(), 200);
        const catalog = page.locator('#mcp-catalog');

        if (javaScriptEnabled) {
          const search = catalog.getByRole('searchbox', { name: 'Aufgabe oder Werkzeugname' });
          const category = catalog.getByRole('combobox', { name: 'Kategorie' });
          await category.waitFor();
          assert.equal(await category.evaluate(element => element.tagName), 'SELECT');
          assert.equal(await catalog.locator('#mcp-categories button').count(), 0);
          await search.waitFor();
          const searchTop = await search.evaluate(element => element.getBoundingClientRect().top);
          assert(searchTop < 844, `Tool search starts below the first mobile viewport at ${width}px (${searchTop})`);

          for (const item of cases) {
            await search.fill(item.question);
            const cards = catalog.locator('#mcp-results .tool');
            const result = cards.filter({ has: page.getByText(item.tool, { exact: true }) });
            await result.waitFor();
            assert((await cards.locator('strong').allTextContents()).slice(0, 3).includes(item.tool));
            const distance = await cards.first().evaluate((element, searchInput) =>
              element.getBoundingClientRect().top - document.querySelector(searchInput).getBoundingClientRect().bottom,
            '#mcp-catalog input[type=search]');
            assert(distance >= 0 && distance <= 240, `Results are separated from the search by ${distance}px at ${width}px`);
            await category.selectOption(item.category);
            assert.equal(await result.count(), 1);
            const link = result.getByRole('link', { name: 'Ratgeber und Annahmen' });
            assert.equal(await link.getAttribute('href'), item.guide);
            await link.click();
            await assertGuideVisible(page, item);
            assert.equal((await page.goto(probePath('/mcp.html').href)).status(), 200);
          }
          assert(catalogueReads >= 1);
        } else {
          assert.equal(await catalog.isVisible(), false);
          assert(await page.locator('a[href="/api/mcp-tools"]').first().isVisible(), 'Static JSON catalogue is discoverable');
          assert(await page.locator('#wasserkocher-fuellsplitt-beispiel').isVisible(), 'Static worked example survives');
          assert.equal(catalogueReads, 0, 'No-script page must not fetch the interactive catalogue');
          for (const item of cases) {
            assert.equal((await page.goto(probePath(item.guide).href)).status(), 200);
            await assertGuideVisible(page, item);
          }
        }
        assert.equal(dynamicCatalogueReads, 0, 'Browser discovery must not request the dynamic catalogue');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${width}px`);
        await context.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    if (preview) preview.kill();
  }
  console.log('PASS MCP buyer discovery: 320/390px, German queries, anchored evidence, no-script fallback, GET-only probes');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
