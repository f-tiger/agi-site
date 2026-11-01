import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const { chromium } = createRequire(new URL('../../../tools/revenue-studio/package.json', import.meta.url))('playwright');
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.WORKBENCH_CHROMIUM,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  for (const [locale, prefix, planLabel, legacyLabel] of [
    ['zh', '', '当前 The X Subscription', '旧订阅继续有效'],
    ['en', '/en', 'Current The X Subscription', 'Still-active legacy subscriptions'],
  ]) {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://baipiaoji.com') return route.abort();
        const file = path.join(root, url.pathname.endsWith('/') ? `${url.pathname}index.html` : path.extname(url.pathname) ? url.pathname : `${url.pathname}.html`);
        if (!fs.existsSync(file)) return route.fulfill({ status: 404 });
        const contentType = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'text/html';
        return route.fulfill({ body: fs.readFileSync(file), contentType });
      });

      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto(`https://baipiaoji.com${prefix}/tools/cursor?__ci=1`);
      assert.match(await page.locator('h1').innerText(), /Cursor/);
      assert.ok(await page.locator('#sources').count(), `${locale}: source section missing`);
      assert.ok((await page.locator('main').innerText()).includes('2026-11-01'), `${locale}: review date missing`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale}: tool page overflows at ${width}px`);

      await page.goto(`https://baipiaoji.com${prefix}/upgrade/cursor?__ci=1`);
      const copy = await page.locator('main').innerText();
      assert.ok(copy.includes(planLabel), `${locale}: current plan label missing`);
      assert.ok(copy.includes(legacyLabel), `${locale}: legacy plan label missing`);
      assert.match(copy, /\$8/);
      assert.match(copy, /\$20/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale}: upgrade page overflows at ${width}px`);
      assert.deepEqual(errors, [], `${locale}: page errors`);
      await context.close();
    }
  }
  console.log('PASS: bilingual Cursor tool and upgrade decisions render without overflow in a real browser');
} finally {
  await browser.close();
}
