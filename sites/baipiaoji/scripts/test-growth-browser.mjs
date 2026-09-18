// npm install --no-save playwright@1.62.1 && npx playwright install chromium
// Run after build.mjs. Every browser request is intercepted; no production writes.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const dist = resolve('dist'), artifacts = resolve('test-results/growth');
mkdirSync(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
let checks = 0;
try {
  for (const lang of ['', '/en']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    let events = [], subscriptions = [], errors = [], redirects = [];
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.hostname !== 'baipiaoji.com') return route.abort();
      if (url.pathname === '/api/hit') {
        events.push(JSON.parse(req.postData() || '{}'));
        return route.fulfill({ status: 204 });
      }
      if (url.pathname === '/api/subscribe') {
        subscriptions.push(JSON.parse(req.postData() || '{}'));
        return route.fulfill({ json: { ok: true, code: 'already' } });
      }
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true } });
      if (url.pathname.endsWith('.html')) {
        redirects.push(url.pathname);
        url.pathname = url.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
        return route.fulfill({ status: 308, headers: { location: url.href } });
      }
      const path = resolve(dist, '.' + url.pathname + (url.pathname.endsWith('/') ? 'index.html' : extname(url.pathname) ? '' : '.html'));
      if (!path.startsWith(dist + '/')) return route.abort();
      try {
        const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }[extname(path)] || 'application/octet-stream';
        return route.fulfill({ status: 200, contentType: mime, body: readFileSync(path) });
      } catch { return route.fulfill({ status: 404, body: 'Not found' }); }
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('https://baipiaoji.com' + lang + '/');
    assert.equal(await page.locator('.task-start a').count(), 5);
    await page.locator('.task-start a').first().click();
    await page.locator('[data-stack-tool]').first().waitFor();
    assert.match(page.url(), /tasks=coding%2Capi/);
    assert.equal(redirects.length, 0, 'homepage task link should reach the result without a redirect');
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://baipiaoji.com' + lang + '/stack-builder');
    await page.waitForTimeout(1700); // Prove that the former load-time calc event is absent.
    assert.equal(events.filter(e => e.e === 'calc').length, 0);
    assert.equal(await page.locator('#bpjSoftFollow').count(), 0);
    assert.equal(await page.locator('#stackCats [aria-pressed=true]').count(), 2);
    await page.locator('#stackCats [data-c=image]').click();
    await page.locator('#bpjSoftFollow').waitFor();
    assert(events.some(e => e.e === 'calc'));
    assert(events.some(e => e.p === '/gate/stack-use/stack-builder'));
    assert(events.some(e => e.p === '/gate/soft-use/stack-builder'));
    await page.locator('#fBiz').click();
    const imageVerdicts = await page.locator('#stackOut .verdict').allTextContents();
    assert(imageVerdicts.length > 0);
    assert(imageVerdicts.every(v => /^(可商用|有条件可商用|Commercial OK|Conditional)$/.test(v)));
    const before = await page.locator('[data-stack-tool]').evaluateAll(es => es.map(e => e.dataset.stackTool));
    const savedUrl = page.url();
    await page.locator('#stackCopy').click();
    await page.waitForFunction(() => /链接已复制|请复制下方|Link copied|Copy the selected/.test(document.getElementById('stackStatus').textContent));
    assert.match(await page.locator('#stackStatus').innerText(), /链接已复制|请复制下方|Link copied|Copy the selected/);
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#stackDownload').click();
    const download = await downloadEvent;
    const file = join(artifacts, (lang ? 'en' : 'zh') + '-plan.txt');
    await download.saveAs(file);
    const downloaded = readFileSync(file, 'utf8');
    assert(downloaded.includes(savedUrl));
    assert(downloaded.includes('/tools/' + before[0]));
    assert(!downloaded.includes('/tools/' + before[0] + '.html'));
    assert.match(downloaded, /来源：|Source:/);
    assert.equal(subscriptions.length, 0, 'export must not require an email');
    await page.locator('#bpjSoftFollow [data-dismiss]').click();
    assert.equal(await page.locator('#bpjSoftFollow').count(), 0);
    await page.goto(savedUrl);
    await page.locator('[data-stack-tool]').first().waitFor();
    assert.deepEqual(await page.locator('[data-stack-tool]').evaluateAll(es => es.map(e => e.dataset.stackTool)), before);
    assert.equal(await page.locator('#bpjSoftFollow').count(), 0);
    // Unknown and HTML-looking task params cannot become a task or markup.
    await page.goto('https://baipiaoji.com' + lang + '/stack-builder.html?tasks=unknown,%3Cscript%3E');
    assert.equal(await page.locator('[data-stack-tool]').count(), 0);
    assert.equal(await page.locator('#stackDownload').isDisabled(), true);
    assert.equal(await page.locator('#stackCopy').isDisabled(), true);
    // Anonymous calculator use is possible before any subscription prompt.
    await page.goto('https://baipiaoji.com' + lang + '/llm-api-calculator.html');
    const calcCount = events.filter(e => e.e === 'calc').length;
    await page.waitForTimeout(1700);
    assert.equal(events.filter(e => e.e === 'calc').length, calcCount, 'calculator load is not usage');
    const original = await page.locator('#calcOut').innerText();
    await page.locator('#calcReq').fill('99000');
    await page.locator('#calcReq').press('Tab');
    await page.locator('#bpjSoftFollow').waitFor();
    assert.notEqual(await page.locator('#calcOut').innerText(), original);
    await page.locator('#bpjSoftFollow input[type=email]').fill('growth-test@example.invalid');
    await page.locator('#bpjSoftFollow button[type=submit]').click();
    await page.locator('#bpjSoftFollow form').waitFor({ state: 'hidden' });
    assert.equal(subscriptions[0].src, 'tool-soft:llm-api-calculator');
    assert(events.some(e => e.p === '/gate/soft-dup/llm-api-calculator'));
    assert(!events.some(e => JSON.stringify(e).includes('growth-test@example.invalid')));
    await page.locator('#calcReq').fill('100');
    assert.notEqual(await page.locator('#calcOut').innerText(), original);
    // The six real entry cohorts have working, crawlable next steps.
    for (const slug of ['grok', 'kimi', 'fireworks', 'haiper', 'feishu-miaoji', 'cline']) {
      await page.goto('https://baipiaoji.com' + lang + '/tools/' + slug + '.html');
      assert(await page.locator('[data-next-tool] a').count() >= 2);
      const target = await page.locator('[data-next-kind]').first().getAttribute('href');
      await page.locator('[data-next-kind]').first().click();
      assert.equal(page.url(), target);
      assert(events.some(e => e.p.startsWith('/gate/next/' + slug + '/')));
    }
    for (const cat of ['coding', 'api']) {
      await page.goto('https://baipiaoji.com' + lang + '/c/' + cat);
      const beforeRedirects = redirects.length;
      await page.locator('[data-next-kind=plan]').click();
      await page.locator('[data-stack-tool]').first().waitFor();
      assert.equal(redirects.length, beforeRedirects, 'category-to-plan should not redirect');
      assert(events.some(e => e.p === '/gate/next/category-' + cat + '/plan'));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('https://baipiaoji.com' + lang + '/');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'homepage overflows on mobile');
    assert(await page.locator('.rail-jump').evaluate(el => el.getBoundingClientRect().height < 80), 'mobile task navigation consumes the first screen');
    await page.screenshot({ path: join(artifacts, (lang ? 'en' : 'zh') + '-home-mobile.png') });
    await page.goto(savedUrl);
    await page.locator('[data-stack-tool]').first().waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'builder overflows on mobile');
    await page.screenshot({ path: join(artifacts, (lang ? 'en' : 'zh') + '-stack-mobile.png'), fullPage: true });
    assert.deepEqual(errors, [], 'browser JavaScript errors');
    await context.close();
    checks++;
  }
  console.log(`Growth browser regression passed in ${checks} languages: anonymous use, URL restoration, export, consent, events, next links, mobile width.`);
} finally { await browser.close(); }
