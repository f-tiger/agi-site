// Run production page assets in Chromium with all network traffic intercepted.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const dependencies = path.resolve(process.env.AGI_PLAYWRIGHT_ROOT || 'tools/revenue-studio/node_modules');
const {chromium} = require(require.resolve('playwright', {paths: [dependencies]}));
const root = fileURLToPath(new URL('../../', import.meta.url));
const snapshot = JSON.parse(await readFile(path.join(root, 'mcp-directory-assets/catalog.json'), 'utf8'));
const origin = 'https://agiscorecard.com';
const contentType = {'.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript',
  '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml'};
const posts = [];
const thirdParty = [];
let unavailable = false;

async function fixture(route) {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin !== origin) {
    thirdParty.push(url.hostname);
    return route.abort();
  }
  if (url.pathname.startsWith('/api/')) {
    if (request.method() === 'POST') posts.push(request.postData() || '');
    return route.fulfill({status: 204});
  }
  if (unavailable && url.pathname === '/mcp-directory-assets/catalog.json') {
    return route.fulfill({status: 503});
  }
  const relative = url.pathname.replace(/^\/+/, '');
  const rawPath = path.resolve(root, relative);
  assert.ok(rawPath.startsWith(root));
  for (const file of [rawPath, rawPath + '.html', path.join(rawPath, 'index.html')]) {
    if (!(await stat(file).catch(() => null))?.isFile()) continue;
    return route.fulfill({body: await readFile(file), contentType: contentType[path.extname(file)] || 'text/plain'});
  }
  return route.fulfill({status: 404});
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.AGI_BROWSER_EXECUTABLE || undefined,
});
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}});
  await context.route('**/*', fixture);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(8_000);
  const results = page.locator('#catalog-results > li');
  const form = page.locator('#catalog-filters');
  const query = form.locator('[name=q]');
  const search = form.locator('[type=submit]');
  const reset = form.locator('[type=reset]');
  for (const [route, width, heading] of [
    ['/agents/', 1440, /Browse MCP servers/],
    ['/zh/agents/', 360, /浏览 MCP 服务/],
  ]) {
    await page.setViewportSize({width, height: 900});
    await page.goto(origin + route + '?__ci=1');
    await page.getByRole('heading', {name: heading}).waitFor();
    await form.waitFor();
    await results.first().waitFor();
    const renderedCount = await page.locator('#catalog-status').innerText();
    assert.ok(renderedCount.includes(snapshot.entries.length.toLocaleString('en')), 'actual catalog size is visible');
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), origin + route);
    assert.equal(await page.locator('link[rel=alternate][hreflang=en]').getAttribute('href'), origin + '/agents/');
    assert.equal(await page.locator('link[rel=alternate][hreflang=zh-Hans]').getAttribute('href'), origin + '/zh/agents/');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'catalog fits viewport');
    assert.match(await page.locator('#native-endpoint').innerText(), /https:\/\/agiscorecard\.com\/mcp/);
    const previous = page.locator('#catalog-previous');
    const next = page.locator('#catalog-next');
    const firstRow = await results.first().innerText();
    assert.ok(await previous.isDisabled(), 'starts at first catalog page');
    const sources = await results.first().getByRole('link').evaluateAll(links => links.map(a => ({href: a.href, rel: a.rel})));
    assert.ok(sources.length && sources.every(a => a.href.startsWith('https://') && /noopener|noreferrer/.test(a.rel)),
      'result links have secure external URLs and isolate windows');
    await next.click();
    assert.notEqual(await results.first().innerText(), firstRow, 'pagination changes results');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'browse-title', 'pagination focuses results heading');
    await previous.click();
    assert.equal(await results.first().innerText(), firstRow);
    await query.fill('mcp-catalog-impossible-qa-query');
    await query.press('Enter');
    assert.equal(await results.count(), 0, 'no fabricated result for an unmatched search');
    await reset.click();
    await results.first().waitFor();
    await query.fill('GitHub');
    await search.click();
    assert.match(await results.first().innerText(), /GitHub/i);
    await reset.click();
    await form.locator('[name=category]').selectOption('developer');
    await form.locator('[name=transport]').selectOption('remote');
    await form.locator('[name=featured]').selectOption('yes');
    await search.click();
    await results.first().waitFor();
    const filtered = await results.allTextContents();
    const facets = route === '/agents/' ? ['Hosted', 'Docs checked', 'Developer tools'] : ['远程托管', '已核对文档', '开发工具'];
    assert.ok(filtered.every(text => facets.every(label => text.includes(label))), 'filters keep featured remote developer listings');
  }
  unavailable = true;
  await page.goto(origin + '/agents/?__ci=1');
  await page.locator('#catalog-status').filter({hasText: /unavailable|could not|try again/i}).waitFor();
  const documented = snapshot.entries.filter(entry => entry.featured).slice(0, 6);
  assert.equal(await results.count(), documented.length);
  assert.equal(await page.locator('#native-endpoint').textContent(), origin + '/mcp');
  const basic = await browser.newContext({javaScriptEnabled: false});
  await basic.route('**/*', fixture);
  const basicPage = await basic.newPage();
  for (const [route, field] of [['/agents/', 'note'], ['/zh/agents/', 'noteZh']]) {
    await basicPage.goto(origin + route + '?__ci=1');
    const staticRows = basicPage.locator('#catalog-results > li');
    assert.equal(await staticRows.count(), documented.length);
    assert.equal(await basicPage.locator('#catalog-date time').textContent(), snapshot.asOf);
    for (const [i, entry] of documented.entries()) {
      const row = staticRows.nth(i);
      assert.ok((await row.innerText()).includes(entry[field]));
      assert.deepEqual(await row.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href'))),
        [entry.documentationUrl, entry.sourceUrl]);
    }
    assert.ok(await basicPage.locator('a[href="/mcp-directory-assets/catalog.json"]').isVisible(), 'JSON link remains visible without scripts');
    assert.ok(await basicPage.locator('a[href="/for-agents"]').first().isVisible(), 'connection guide remains visible without scripts');
  }
  await basic.close();
  assert.deepEqual(errors, [], 'browser completed interactions without script errors');
  assert.ok(!posts.some(body => /mcp_catalog_(search|open)/.test(body)), 'QA excluded from app event collector');
  assert.deepEqual(thirdParty, [], 'no third-party page, asset or analytics calls from QA');
  console.log('MCP catalog browser checks passed in English desktop and Chinese mobile fixtures.');
} finally {
  await browser.close();
}
