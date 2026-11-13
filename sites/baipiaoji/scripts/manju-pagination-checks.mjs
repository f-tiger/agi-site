import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Called by the existing release browser gate. All requests are intercepted;
// neither production traffic nor analytics events leave these contexts.
export async function checkPagination(browser, dist) {
  const base = 'https://baipiaoji.com', key = 'bpj-manju-saved-v1';
  const works = JSON.parse(fs.readFileSync(path.join(dist, 'manju/directory.js'), 'utf8').replace(/^globalThis.ManjuWorks=/, '').replace(/;$/, ''));
  const distant = works.findLast(w => w.directoryPage > 2 && works.filter(x => x.title === w.title).length === 1);
  const first = works[0], saved = ['beipai', distant.id];
  async function setup(options = {}) {
    const context = await browser.newContext({ javaScriptEnabled: options.js !== false, viewport: { width: 390, height: 844 } });
    const mode = { fail: false, stale: false, pause: null, requests: [], ...options };
    const errors = [];
    await context.addInitScript(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== base) return route.abort();
      assert.ok(!url.pathname.startsWith('/api/'), 'QA must not create business or analytics requests');
      if (mode.indexFailure && url.pathname === '/manju/directory.js') return route.fulfill({ status: 503 });
      if (/^\/manju\/page\/\d+$/.test(url.pathname)) {
        mode.requests.push(url.href);
        if (mode.pause) await mode.pause;
        if (mode.fail) return route.fulfill({ status: 503 });
      }
      const relative = url.pathname.endsWith('/') ? url.pathname + 'index.html' : path.extname(url.pathname) ? url.pathname : url.pathname + '.html';
      const file = path.join(dist, relative);
      if (!fs.existsSync(file)) return route.fulfill({ status: 404 });
      let body = fs.readFileSync(file);
      if (mode.stale && /^\/manju\/page\//.test(url.pathname)) body = Buffer.from(body.toString().replace(/name="manju-catalog-revision" content="[^"]+"/, 'name="manju-catalog-revision" content="old-revision"'));
      return route.fulfill({ body, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json' })[path.extname(file)] || 'application/octet-stream' });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    return { context, page, mode, errors };
  }
  const readSaved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const idle = page => page.waitForFunction(() => document.querySelector('.mj-grid')?.getAttribute('aria-busy') === 'false');

  const plain = await setup({ js: false });
  await plain.page.goto(base + '/manju/');
  assert.equal(await plain.page.locator('[data-item]').count(), 24);
  await plain.page.locator('.mj-crawl-pages [rel="next"]').click();
  assert.equal(new URL(plain.page.url()).pathname, '/manju/page/2');
  assert.equal(await plain.page.locator('[data-item]').count(), 24);
  assert.equal(await plain.page.locator('h1').count(), 1);
  assert.ok(await plain.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await plain.page.locator('[data-related]').first().click();
  assert.match(new URL(plain.page.url()).pathname, /^\/manju\/genre-/);
  await plain.context.close();

  const brokenIndex = await setup({ indexFailure: true });
  await brokenIndex.page.goto(base + '/manju/?__probe=1');
  assert.equal(await brokenIndex.page.locator('[data-item]').count(), 24);
  assert.ok(await brokenIndex.page.locator('[data-save]').first().isDisabled());
  assert.deepEqual(await readSaved(brokenIndex.page), saved, 'Index failure must not erase saved IDs');
  assert.deepEqual(brokenIndex.errors, []);
  await brokenIndex.context.close();

  const test = await setup({ fail: true });
  await test.page.goto(base + '/manju/?__probe=1');
  await test.page.locator('#mj-query').fill(distant.title);
  await test.page.locator('#mj-load-retry').waitFor({ state: 'visible' });
  assert.ok(await test.page.locator('#mj-share-page').isDisabled());
  assert.deepEqual(await readSaved(test.page), saved);
  assert.ok(test.mode.requests.every(url => !url.includes('?') && !url.includes(encodeURIComponent(distant.title))), 'Pagination fetches send no search text or saved list');
  test.mode.fail = false;
  await test.page.locator('#mj-load-retry').click();
  await test.page.locator(`[data-item="${distant.id}"]`).waitFor({ state: 'visible' });
  assert.equal(await test.page.locator(`[data-save="${distant.id}"]`).getAttribute('aria-pressed'), 'true');
  await test.page.locator(`[data-depth-id="${distant.id}"]`).selectOption('watching');
  assert.equal(await test.page.evaluate(id => JSON.parse(localStorage.getItem('bpj-manju-progress-v1')).entries[id], distant.id), 'watching', 'Fetched cards retain the independent watching-state control');
  await test.page.goto(base + '/manju/beipai?__probe=1');
  await test.page.locator('[data-save="beipai"]').click();
  assert.deepEqual(await readSaved(test.page), [distant.id], 'Saving on a detail page retains off-page saved IDs');
  assert.deepEqual(test.errors, []);
  await test.context.close();

  const stale = await setup({ stale: true });
  await stale.page.goto(base + '/manju/?__probe=1');
  await stale.page.locator('#mj-query').fill(distant.title);
  await stale.page.locator('#mj-load-retry').waitFor({ state: 'visible' });
  assert.match(await stale.page.locator('#mj-load-status').textContent(), /目录已更新/);
  assert.deepEqual(await readSaved(stale.page), saved);
  await stale.context.close();

  const race = await setup();
  await race.page.goto(base + '/manju/?__probe=1');
  let release;
  race.mode.pause = new Promise(resolve => { release = resolve; });
  await race.page.locator('#mj-query').fill(distant.title);
  await race.page.locator('.mj-grid[aria-busy="true"]').waitFor();
  await race.page.locator('#mj-query').fill(first.title);
  await idle(race.page);
  release();
  await race.page.waitForLoadState('networkidle');
  assert.ok(await race.page.locator(`[data-item="${first.id}"]`).isVisible(), 'A slow old search must not replace the latest result');
  assert.equal(await race.page.locator(`[data-item="${distant.id}"]`).count(), 0);
  assert.ok(await race.page.locator('[data-item]').count() <= 24);
  assert.equal(await race.page.locator('.mj-card-actions select[data-depth-id]').count(), await race.page.locator('[data-item]').count(), 'Exactly one watching-state control per mounted card');
  assert.deepEqual(race.errors, []);
  await race.context.close();
  console.log('PASS crawlable pagination: no-JS/mobile, bounded DOM, index/page failures, retry, revision mismatch, cross-page saves and search races.');
}
