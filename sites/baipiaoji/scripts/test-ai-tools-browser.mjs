import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SUITE_CATEGORIES, SUITE_TOOLS, runSuiteTool} from '../lib/ai-suite/registry.mjs';

const {chromium} = createRequire(new URL('../../../tools/revenue-studio/package.json', import.meta.url))('playwright');
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const mimeTypes = new Map([
  ['.html', 'text/html'],
  ['.mjs', 'text/javascript'],
  ['.js', 'text/javascript'],
  ['.css', 'text/css'],
  ['.json', 'application/json'],
]);
const server = createServer(async (request, response) => {
  try {
    let filename = new URL(request.url, origin).pathname;
    if (filename === '/api/account') {
      response.setHeader('Content-Type', 'application/json');
      response.end('{"ok":true,"user":null,"favorites":[]}');
      return;
    }
    if (filename.endsWith('/')) filename += 'index.html';
    else if (!path.extname(filename)) filename += '.html';
    const localFile = path.resolve(root, '.' + filename);
    if (!localFile.startsWith(root)) throw Error('Invalid test file path');
    const ext = path.extname(localFile);
    response.setHeader('Content-Type', mimeTypes.get(ext) || 'application/octet-stream');
    const data = await readFile(localFile);
    response.end(ext === '.html' ? data.toString().replaceAll('https://baipiaoji.com', origin) : data);
  } catch {
    response.statusCode = 404;
    response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const toolById = new Map(SUITE_TOOLS.map(tool => [tool.id, tool]));

async function newContext(browser, options) {
  const context = await browser.newContext(options);
  await context.route('**/*', route => (
    route.request().url().startsWith(origin + '/') ? route.continue() : route.abort()
  ));
  return context;
}
const visit = (page, locale, pathname) => page.goto(origin + locale + pathname + '?__ci=1', {waitUntil: 'domcontentloaded'});
const toolPath = id => '/studio/ai/' + id;

async function assertNoOverflow(page, label) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label);
}

async function verifyTaskLoop(page, locale) {
  for (const width of [320, 390, 1024, 1440]) {
    await page.setViewportSize({width, height: 900});
    await visit(page, locale, '/studio/ai/');
    await page.locator('main a[href="' + origin + locale + '/studio/task-loop"]').first().waitFor({state: 'visible'});
    await assertNoOverflow(page, 'hub overflow at ' + width);
    await visit(page, locale, '/studio/task-loop');
    await assertNoOverflow(page, 'task tool overflow at ' + width);
  }
  await page.locator('#tl-goal').fill('Ship signup');
  await page.locator('#tl-acceptance').fill('Live signup passes');
  await page.locator('#tl-blockers').fill('Missing service configuration');
  await page.locator('#tl-state button').click();
  assert.match(await page.locator('#tl-decision').textContent(), /阻塞|blockers/);
  for (const [id, value] of [
    ['action', 'Inspect logs'],
    ['expected', 'Reproduce error'],
    ['when', 'After inspection'],
    ['fallback', 'Check dependencies'],
  ]) {
    await page.locator('#tl-' + id).fill(value);
  }
  await page.locator('#tl-predict button').click();
  await page.reload();
  assert.equal(await page.locator('#tl-pending option').count(), 1);
  await page.locator('#tl-evidence').fill('<em>Service failed again</em>');
  await page.locator('#tl-result').selectOption('fail');
  await page.locator('#tl-outcome button').click();
  assert.equal(await page.locator('#tl-pending option').count(), 0);
  assert((await page.locator('#tl-timeline').textContent()).includes('<em>Service failed again</em>'));
  assert.equal(await page.locator('#tl-timeline em').count(), 0);
  const download = page.waitForEvent('download');
  await page.locator('#tl-export').click();
  const backup = JSON.parse(await readFile(await (await download).path(), 'utf8'));
  assert.equal(backup.events.length, 3);
  await page.locator('#tl-goal').fill('Another goal');
  await page.locator('#tl-state button').click();
  assert.equal(await page.locator('#tl-timeline li').count(), 3);
  await page.locator('#tl-change').fill('User explicitly changed the goal');
  await page.locator('#tl-state button').click();
  assert.equal(await page.locator('#tl-timeline li').count(), 4);
  if (process.env.BPJ_SUITE_SCREENSHOT) {
    await page.screenshot({path: '/tmp/bpj-ai-' + (locale ? 'en' : 'zh') + '.png', fullPage: true});
  }
}

async function assertToolLinks(suite, locale) {
  const toolLinks = await suite.locator('[data-suite-group] [data-suite-keywords] a').evaluateAll(links =>
    links.map(anchor => new URL(anchor.href).pathname)
  );
  assert.equal(toolLinks.length, SUITE_TOOLS.length);
  assert.deepEqual(new Set(toolLinks), new Set(SUITE_TOOLS.map(tool => locale + toolPath(tool.id))));
  assert.equal(await suite.locator('[data-suite-group]').count(), SUITE_CATEGORIES.length);
}

const featuredIds = [
  'ai-eval-export-pair', 'table-review', 'answer-citation-coverage',
  'ai-human-review-queue', 'ai-json-output-contract',
];

async function assertFeatured(page, locale) {
  const featured = page.locator('[data-suite-featured]');
  const cards = featured.locator('[data-suite-featured-tool]');
  assert.deepEqual(await cards.evaluateAll(items => items.map(card => card.dataset.suiteFeaturedTool)), featuredIds);
  const routes = featuredIds.map(id => id === 'table-review' ? '/studio/table-review' : toolPath(id));
  assert.deepEqual(await cards.locator('h3 a, h4 a').evaluateAll(links => links.map(link => link.pathname)),
    routes.map(route => locale + route));
  assert.equal(await cards.locator('[data-bpj-share="copy"]').count(), featuredIds.length);
}

async function assertHomeDiscovery(suite,locale) {
  const browse=suite.locator('[data-suite-browse]');
  assert.equal(await browse.locator('[data-suite-group]').count(),SUITE_CATEGORIES.length);
  assert.equal(await browse.locator('[data-suite-keywords]').count(),2*SUITE_CATEGORIES.length);
  assert.deepEqual(await browse.locator('.suite-category-link').evaluateAll(links=>links.map(link=>link.pathname)),
    SUITE_CATEGORIES.map(group=>locale+'/studio/ai/categories/'+group.id));
  for(const route of ['/studio/ai/','/studio/table-review',toolPath('answer-citation-coverage'),toolPath('ai-json-output-contract')]){
    assert.equal(await suite.locator('a[href="'+origin+locale+route+'"]').first().isVisible(),true,route);
  }
}

async function verifyDirectory(page, locale) {
  const searchIndexRequests=[];
  const noteIndexRead=request=>{
    if(new URL(request.url()).pathname===locale+'/studio/ai/search-index.json') searchIndexRequests.push(request.url());
  };
  page.on('request',noteIndexRead);
  await visit(page, locale, '/');
  const suite = page.locator('#ai-tools');
  await assertFeatured(page, locale);
  const leadCard = page.locator('[data-suite-featured-tool="ai-eval-export-pair"]');
  await leadCard.locator('[data-bpj-share="copy"]').click();
  await leadCard.locator('[role="status"]:not(:empty)').waitFor();
  const shared = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  assert.equal(shared.origin, origin);
  assert.equal(shared.pathname, locale + toolPath('ai-eval-export-pair'));
  assert.equal(shared.hash, '');
  assert.deepEqual(Object.fromEntries(shared.searchParams), {
    utm_source: 'reader_share', utm_medium: 'share', utm_campaign: 'free-tools',
  });
  await assertHomeDiscovery(suite,locale);
  const search = suite.locator('[data-suite-search]');
  await search.waitFor({state:'visible'});
  assert.equal(searchIndexRequests.length,0,'Homepage fetched search data before any interaction');
  const results = suite.locator('[data-suite-results]');
  const resultLinks = results.locator('[data-suite-keywords] a');
  await search.fill('no-result-73261');
  await suite.locator('[data-suite-empty]').waitFor({state: 'visible'});
  assert.equal(await suite.locator('[data-suite-group]:visible').count(), 0);

  await suite.locator('[data-suite-clear]').click();
  assert.equal(await search.inputValue(), '');
  assert.equal(await suite.locator('[data-suite-group]:visible').count(), SUITE_CATEGORIES.length);
  assert.equal(await suite.locator('[data-suite-group][open]').count(), 0);

  await search.fill('bpj_csv_to_json');
  await results.waitFor({state: 'visible'});
  assert.equal(await resultLinks.first().getAttribute('href'), origin + locale + toolPath('csv-to-json'));
  await search.press('Enter');
  assert(await resultLinks.first().evaluate(anchor => anchor === document.activeElement), 'Enter does not focus the strongest match');

  // A displayed title can be searched directly in either language.
  const csv = toolById.get('csv-to-json');
  await search.fill(locale ? csv.title.en : csv.title.zh);
  assert.equal(await resultLinks.first().getAttribute('href'), origin + locale + toolPath(csv.id));
  await search.fill(locale ? csv.title.zh : csv.title.en);
  assert.equal(await resultLinks.first().getAttribute('href'), origin + locale + toolPath(csv.id));

  await search.fill(locale ? 'release rollback check' : 'AI 回退检查');
  assert.equal(await resultLinks.first().getAttribute('href'), origin + locale + toolPath('ai-paired-pass-regression'));
  await search.fill('compare Promptfoo eval exports');
  assert.equal(await resultLinks.first().getAttribute('href'), origin + locale + toolPath('ai-eval-export-pair'));

  await search.fill('');
  const filter = suite.locator('[data-suite-filter]');
  await filter.selectOption('tables');
  await results.waitFor({state: 'visible'});
  const shown = await resultLinks.count();
  const tables = SUITE_CATEGORIES.find(group => group.id === 'tables');
  assert(shown > 0 && shown < tables.tools.length, 'Table results did not paginate');
  const tablePaths = new Set(tables.tools.map(tool => locale + toolPath(tool.id)));
  const before = await resultLinks.evaluateAll(links => links.map(anchor => anchor.pathname));
  assert(before.every(pathname => tablePaths.has(pathname)), 'Category filtering returned a tool from another category');
  await suite.locator('[data-suite-more]').click();
  const after = await resultLinks.evaluateAll(links => links.map(anchor => anchor.pathname));
  assert(after.length > shown, 'More results did not reveal extra tools');
  assert.deepEqual(after.slice(0, shown), before);
  assert.equal(new Set(after).size, after.length);

  await suite.locator('[data-suite-clear]').click();
  assert.equal(await filter.inputValue(), '');
  // The tool is absent from the homepage preview but available in the full index.
  const workflow = toolById.get('ai-json-output-contract');
  assert.equal(await suite.locator('[data-suite-group] a[href="'+origin+locale+toolPath(workflow.id)+'"]').count(),0);
  await search.fill(workflow.name);
  assert.equal(await resultLinks.first().getAttribute('href'),origin+locale+toolPath(workflow.id));
  await resultLinks.first().click();
  await page.waitForURL('**/studio/ai/'+workflow.id);
  assert.equal(searchIndexRequests.length,1,'Repeated searches refetched the index');
  page.off('request',noteIndexRead);

  const indexUrl=origin+locale+'/studio/ai/search-index.json';
  await page.route(indexUrl,route=>route.fulfill({status:503,body:'Temporarily unavailable'}));
  try {
    await visit(page,locale,'/');
    await search.fill('csv-to-json');
    const fallback=suite.locator('[data-suite-unavailable] a');
    await fallback.waitFor({state:'visible'});
    assert.equal(await suite.locator('[data-suite-group]:visible').count(),SUITE_CATEGORIES.length);
    await fallback.click();
    await page.waitForURL('**/studio/ai/');
    await assertFeatured(page, locale);
    await assertToolLinks(page.locator('[data-suite-index]'),locale);
    const completeDirectory=page.locator('[data-suite-index]');
    await completeDirectory.locator('[data-suite-search]').fill(locale ? 'release rollback check' : 'AI 回退检查');
    assert.equal(await completeDirectory.locator('[data-suite-results] a').first().getAttribute('href'),
      origin + locale + toolPath('ai-paired-pass-regression'));
  } finally {
    await page.unroute(indexUrl);
  }
}

async function verifyNoScriptBrowse(browser) {
  const context = await newContext(browser, {javaScriptEnabled: false});
  try {
    const page = await context.newPage();
    for (const locale of ['', '/en']) {
      await visit(page, locale, '/');
      const suite = page.locator('#ai-tools');
      await assertHomeDiscovery(suite,locale);
      assert.equal(await suite.locator('[data-suite-search]').isVisible(), false);
      await suite.locator('a[href="'+origin+locale+'/studio/ai/"]').first().click();
      await page.waitForURL('**/studio/ai/');
      await assertToolLinks(page.locator('[data-suite-index]'), locale);
      await page.locator('[data-suite-index] [data-group-id="text-data"] summary').click();
      const link = page.locator('[data-suite-index] [data-group-id="text-data"] a[href$="/csv-to-json"]');
      await link.waitFor({state: 'visible'});
      await link.click();
      await page.waitForURL('**/studio/ai/csv-to-json');
      assert.equal(await page.locator('[data-suite-tool] fieldset[disabled]').count(), 1);
      assert.equal(await runButton(page).isDisabled(), true);
      const mcpHelp = page.locator('#suite-mcp');
      await mcpHelp.locator('summary').click();
      assert.equal(await mcpHelp.locator('a[href$="/studio/ai/#mcp"]').isVisible(), true);
    }
  } finally {
    await context.close();
  }
}

const resultView = page => page.locator('[data-suite-result-view]');
const rawView = page => page.locator('[data-suite-output]');
const toolInput = (page, key) => page.locator('[data-suite-tool] form [name="' + key + '"]');
const runButton = page => page.locator('[data-suite-tool] form button[type=submit]');
const eventDetails = page => page.evaluate(() => window.suiteBusinessEvents);

async function verifyJsonTransfer(page, expected, id) {
  const rawText = JSON.stringify(expected, null, 2);
  await page.locator('[data-suite-copy]').click();
  await page.waitForFunction(wanted => navigator.clipboard.readText().then(text => text === wanted), rawText);
  const download = page.waitForEvent('download');
  await page.locator('[data-suite-download]').click();
  const file = await download;
  assert.equal(file.suggestedFilename(), id + '.json');
  assert.equal(await readFile(await file.path(), 'utf8'), rawText, id + ' download changed the JSON');
}

async function verifyCsvTool(page, locale) {
  await visit(page, locale, toolPath('csv-to-json'));
  const csv = toolInput(page, 'csv');
  await csv.waitFor({state: 'visible'});
  const helpId = await csv.getAttribute('aria-describedby');
  assert(helpId && await page.locator('#' + helpId).isVisible(), 'The CSV control has no visible input guidance');
  await page.locator('[data-suite-example]').click();
  assert.equal(await csv.inputValue(), toolById.get('csv-to-json').example.csv);
  assert.deepEqual(await eventDetails(page), []);
  await runButton(page).click();
  await resultView(page).getByRole('table').first().waitFor({state: 'visible'});
  assert.equal(await rawView(page).isVisible(), false);
  assert.deepEqual(await eventDetails(page), [{name: 'ai_suite_result_demo'}]);

  const content = 'area,notes\nNorth,"Budget, revised"\nSouth,"Two\nlines"';
  await page.evaluate(text => navigator.clipboard.writeText(text), content);
  await csv.fill('');
  await csv.press('Control+v');
  assert.equal(await csv.inputValue(), content);
  await csv.press('Control+Enter');
  const table = resultView(page).getByRole('table').first();
  await table.getByRole('cell', {name: 'Budget, revised', exact: true}).waitFor({state: 'visible'});
  assert.equal(await table.getByRole('row').count(), 3);
  assert.deepEqual(await eventDetails(page), [{name: 'ai_suite_result_demo'}, {name: 'ai_suite_result_own'}]);

  const expected = {
    columns: ['area', 'notes'],
    rows: [{area: 'North', notes: 'Budget, revised'}, {area: 'South', notes: 'Two\nlines'}],
  };
  await verifyJsonTransfer(page, expected, 'csv-to-json');
  await page.locator('[data-suite-raw]').click();
  await rawView(page).waitFor({state: 'visible'});
  assert.deepEqual(JSON.parse(await rawView(page).textContent()), expected);
  await page.locator('[data-suite-readable]').click();
  await table.waitFor({state: 'visible'});
  assert.equal(await rawView(page).isVisible(), false);

  await page.locator('[data-suite-clear]').click();
  assert.equal(await csv.inputValue(), '');
  assert.equal(await table.isVisible(), false);
  assert.equal(await rawView(page).isVisible(), false);
  assert.equal(await page.locator('[data-suite-download]').isVisible(), false);
  await assertNoOverflow(page, 'CSV tool overflow at 320px');
}

async function verifyNumericAndTextTools(page, locale) {
  await visit(page, locale, toolPath('break-even-units'));
  await toolInput(page, 'fixedCost').fill('100');
  await toolInput(page, 'price').fill('20');
  const cost = toolInput(page, 'unitCost');
  await cost.fill('25');
  await runButton(page).click();
  const error = page.locator('[data-suite-error]');
  await error.waitFor({state: 'visible'});
  assert((await error.textContent()).trim(), 'Invalid unit economics did not explain the error');
  assert.deepEqual(await eventDetails(page), []);
  await cost.fill('10');
  await runButton(page).click();
  await resultView(page).getByText('200', {exact: true}).waitFor({state: 'visible'});
  assert.equal(await error.isVisible(), false);
  assert.deepEqual(await eventDetails(page), [{name: 'ai_suite_result_own'}]);

  await visit(page, locale, toolPath('normalize-whitespace'));
  const source = '  Shift   notes \n       Late   delivery ';
  await page.waitForFunction(() => !document.querySelector('[data-suite-tool] fieldset').disabled);
  await page.locator('[data-suite-file]').setInputFiles({
    name: 'shift.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(source),
  });
  const input = toolInput(page, 'text');
  // Reading the local file resolves asynchronously.
  await page.waitForFunction(wanted => document.querySelector('[data-suite-tool] [name="text"]').value === wanted, source);
  assert.equal(await input.inputValue(), source);
  await toolInput(page, 'keepLines').check();
  await runButton(page).click();
  await resultView(page).getByText(/Shift notes\s+Late delivery/).waitFor({state: 'visible'});
  const text = 'Shift notes\nLate delivery';
  await page.locator('[data-suite-copy-text]').click();
  await page.waitForFunction(wanted => navigator.clipboard.readText().then(value => value === wanted), text);
  await verifyJsonTransfer(page, {text}, 'normalize-whitespace');
  await assertNoOverflow(page, 'Text tool overflow at 320px');

  await visit(page, locale, toolPath('matrix-transpose'));
  await toolInput(page, 'matrix').fill('[[10,20,30],[40,50,60]]');
  await runButton(page).click();
  const matrix = resultView(page).getByRole('table').first();
  await matrix.waitFor({state: 'visible'});
  const values = await matrix.getByRole('row').filter({has: page.getByRole('cell')}).evaluateAll(rows =>
    rows.map(row => [...row.querySelectorAll('td')].map(cell => Number(cell.textContent.trim())))
  );
  assert.deepEqual(values, [[10, 40], [20, 50], [30, 60]]);
  await assertNoOverflow(page, 'Matrix tool overflow at 320px');
}

async function verifyCategorySamples(page, locale) {
  for (const group of SUITE_CATEGORIES) {
    await visit(page, locale, '/studio/ai/categories/' + group.id);
    assert.equal(await page.locator('[data-suite-group] [data-suite-keywords] a').count(), group.tools.length);
    const tool = toolById.get(group.tools[0].id);
    await visit(page, locale, toolPath(tool.id));
    await page.locator('[data-suite-example]').click();
    await runButton(page).click();
    const fetched = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => new URL(entry.name).pathname));
    assert(fetched.includes('/studio-assets/ai-suite/' + group.id + '.mjs'));
    assert(!fetched.includes('/studio-assets/ai-suite/registry.mjs'));
    const expected = runSuiteTool(tool.name, tool.example);
    if (await page.locator('[data-suite-raw]').isVisible()) await page.locator('[data-suite-raw]').click();
    await rawView(page).waitFor({state: 'visible'});
    assert.deepEqual(JSON.parse(await rawView(page).textContent()), expected);
    await assertNoOverflow(page, 'tool overflow: ' + tool.id);
  }
}

async function verifyAllFixtures(page) {
  const ids = await page.evaluate(async categories => {
    const {executeSuiteTool} = await import('/studio-assets/ai-suite/runtime.mjs');
    const {renderSuiteResult} = await import('/studio-assets/ai-suite-result.mjs');
    const view = document.createElement('div');
    const completed = [];
    for (const id of categories) {
      const {tools} = await import('/studio-assets/ai-suite/' + id + '.mjs');
      for (const tool of tools) {
        try {
          const value = executeSuiteTool(tool, tool.example);
          if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected a structured result.');
          const before = JSON.stringify(value);
          const shown = renderSuiteResult(view, value, {lang: 'zh', toolId: tool.id});
          if (shown && !view.textContent.trim()) throw Error('Empty result view');
          if (JSON.stringify(value) !== before) throw Error('Result view changed the output');
          completed.push(tool.id);
        } catch (error) {
          throw Error(tool.id + ': ' + error.message);
        }
      }
    }
    return completed;
  }, SUITE_CATEGORIES.map(group => group.id));
  assert.deepEqual(ids, SUITE_TOOLS.map(tool => tool.id));
}

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PILOT_CHROMIUM
      ? {executablePath: process.env.PILOT_CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote']}
      : {}),
  });
  const errors = [];
  for (const locale of ['', '/en']) {
    const context = await newContext(browser);
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], {origin});
      await context.addInitScript(() => {
        window.suiteBusinessEvents = [];
        window.addEventListener('fleet:business', event => {
          if (event.detail?.name?.startsWith('ai_suite_result_')) window.suiteBusinessEvents.push(event.detail);
        });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push({path: page.url(), message: error.message}));
      await verifyTaskLoop(page, locale);
      await page.setViewportSize({width: 320, height: 900});
      await verifyDirectory(page, locale);
      if (process.env.BPJ_SUITE_SCREENSHOT) {
        await page.screenshot({path: '/tmp/bpj-suite-' + (locale ? 'en' : 'zh') + '.png', fullPage: true});
      }
      await verifyCsvTool(page, locale);
      await verifyNumericAndTextTools(page, locale);
      await page.setViewportSize({width: 390, height: 900});
      await verifyCategorySamples(page, locale);
      if (!locale) await verifyAllFixtures(page);
    } finally {
      await context.close();
    }
  }
  await verifyNoScriptBrowse(browser);
  assert.deepEqual(errors, []);
  console.log(`PASS EN/ZH: Task Loop, ${SUITE_TOOLS.length} crawlable tools, ranked search and filters, readable results, input recovery, JSON transfer and every tool example.`);
} finally {
  await browser?.close();
  server.close();
}
