// Read deployed-format files locally. Block all network, analytics and merchant navigation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../site');
const origin = 'https://getecoback.com';
const slugs = ['luftentfeuchter-ratgeber', 'waesche-trocknen-wohnung',
  'homeoffice-warm-bleiben', 'smarte-heizkoerperthermostate-lohnen-sich'];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  try {
    for (const javaScriptEnabled of [true, false]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled });
      await context.route('**/*', route => {
        const u = new URL(route.request().url());
        if (u.origin !== origin || u.pathname.startsWith('/api/')) return route.fulfill({ status: 204, body: '' });
        const file = path.join(root, u.pathname);
        return fs.existsSync(file) && fs.statSync(file).isFile() ? route.fulfill({ path: file }) : route.abort();
      });
      const page = await context.newPage();
      for (const slug of slugs) {
        await page.goto(origin + '/guide/' + slug + '.html?__probe=1');
        const first = page.locator('.winter-picks a[target="_blank"], .cro-scenarios a[target="_blank"]').first();
        const rect = await first.boundingBox();
        assert(rect && rect.y >= 0 && rect.y + rect.height <= 844, slug + ' first CTA outside viewport: ' + JSON.stringify(rect));
        assert.equal(new URL(await first.getAttribute('href')).searchParams.get('tag'), 'getecoback-21');
        assert.equal(await page.locator('.cro-transparency').count(), 1);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      if (javaScriptEnabled) {
        await page.goto(origin + '/guide/infrarotheizung-watt-rechner.html?__probe=1');
        await page.locator('#ir-qm').fill('20');
        await page.locator('.cro-tariffs button').filter({ hasText: '38 ct/kWh' }).click();
        assert.match(await page.locator('#ir-ergebnis').innerText(), /0,61 € pro Stunde/);
        await page.locator('#ir-tariff').fill('0.25');
        assert.match(await page.locator('#ir-ergebnis').innerText(), /0,40 € pro Stunde/);
      }
      await context.close();
    }
    console.log('German winter entries: first CTA, disclosures, marketplace tag, custom and preset tariff passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
