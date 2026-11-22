import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
const dependencies = path.resolve(process.env.AGI_PLAYWRIGHT_ROOT || 'tools/revenue-studio/node_modules');
const {chromium} = require(require.resolve('playwright', {paths: [dependencies]}));
const browser = await chromium.launch({executablePath: process.env.AGI_BROWSER_EXECUTABLE || undefined});
const origin = 'https://agiscorecard.com';
const testReleaseUrl = 'https://github.com/openai/codex/releases/tag/rust-v1.0.0';
const marker = 'fictional-local-only-answer';
const observedRequests = [];
const snapshot = JSON.parse(await readFile(path.join(root, 'futures-assets/release-checks/releases.json'), 'utf8'));

async function intercept(route) {
  const request = route.request();
  observedRequests.push(request.url() + ' ' + (request.postData() || ''));
  const url = new URL(request.url());
  if (url.origin !== origin || request.method() !== 'GET') return route.abort();
  let file = url.pathname.slice(1);
  if (file === 'ai-tools' || file === 'zh/ai-tools') file += '.html';
  if (file !== 'ai-tools.html' && file !== 'zh/ai-tools.html' && !file.startsWith('futures-assets/release-checks/')) return route.abort();
  const now = new Date().toISOString();
  const source = {id: 'codex', name: 'Codex CLI', sourceUrl: 'https://github.com/openai/codex/releases',
    status: 'ok', lastSuccessAt: now, checkedAt: now, releases: [{version:'1.0.0', publishedAt: now, url: testReleaseUrl}]};
  const fixtures = {
    'releases.json': {version: 1, sources:[source]},
    'models.json': {version: 1, models:[], sources:[]},
    'runs.json': {version: 1, runs:[{trigger:{url:testReleaseUrl,label:'Test release'},model:null,cliVersion:'1.0.0',checkedAt:now,
      status:'incomplete',cases:[{id:'privacy',status:'unverified'}]}]},
    'advisories.json': {version: 1, sources:[{id:'codex',package:'example-package',status:'ok',lastSuccessAt:now,
      sourceUrl:'https://github.com/advisories',versions:{'1.0.0':{status:'affected',matches:['TEST-ID']}},
      advisories:[{id:'TEST-ID',url:'https://github.com/advisories',severity:'moderate',ranges:[{affected:'< 1.0.1',fixed:'1.0.1'}]}]}]},
  };
  if (fixtures[path.basename(file)]) return route.fulfill({json: fixtures[path.basename(file)]});
  const mime = {'.html':'text/html','.mjs':'text/javascript','.css':'text/css'};
  return route.fulfill({body: await readFile(path.join(root, file)), contentType: mime[path.extname(file)]});
}

try {
  for (const [routePath, width] of [['/ai-tools', 1200], ['/zh/ai-tools', 390]]) {
    const context = await browser.newContext({viewport:{width,height:850}});
    await context.route('**/*', intercept);
    await context.addInitScript(() => {
      window.observedEvents = [];
      window.addEventListener('fleet:business', event => window.observedEvents.push(event.detail));
    });
    const page = await context.newPage();
    await page.goto(origin + routePath + '?__ci=1#release-checks');
    await page.locator('#rc-version').selectOption(testReleaseUrl);
    const latest = page.locator('[data-repo=codex] .rc-latest a');
    assert.equal(await latest.count(), 1);
    assert.equal(await latest.getAttribute('href'), testReleaseUrl);
    const evidence = page.locator('#rc-selected-evidence');
    assert.match(await evidence.innerText(), /TEST-ID/);
    assert.match(await evidence.innerText(), /1\.0\.1/);
    assert.match(await evidence.innerText(), /Model ID unknown|模型 ID 未核实/);
    await page.locator('#rc-practice summary').click();
    await page.locator('#rc-task').selectOption('privacy');
    assert.match(await page.locator('#rc-prompt').inputValue(), /R-17/);
    await page.locator('#rc-answer').fill(marker);
    await page.locator('#rc-evaluate').click();
    assert.match(await page.locator('#rc-result').innerText(), /did not match|未达/);
    await page.locator('#rc-answer').fill('["R-17","resolved"]');
    await page.locator('#rc-evaluate').click();
    assert.match(await page.locator('#rc-result').innerText(), /answer matched|符合/);
    assert.deepEqual(await page.evaluate(() => window.observedEvents), [
      {name:'legacy:verify_run'}, {name:'legacy:verify_run'},
    ]);
    await page.locator('#rc-task').selectOption('approval');
    assert.equal(await page.locator('#rc-answer').inputValue(), '');
    assert.equal(await page.locator('#rc-result').innerText(), '');
    const fits = await page.locator('#release-checks').evaluate(element =>
      element.scrollWidth <= element.clientWidth + 1);
    assert.ok(fits);
    await context.close();
    const basic = await browser.newContext({javaScriptEnabled: false, viewport:{width,height:850}});
    await basic.route('**/*', intercept);
    const basicPage = await basic.newPage();
    await basicPage.goto(origin + routePath + '?__ci=1#release-checks');
    for (const source of snapshot.sources) {
      const card = basicPage.locator('.rc-client[data-repo="' + source.id + '"]');
      assert.equal(await card.locator('.rc-latest a').getAttribute('href'), source.releases[0].url);
      assert.ok(await card.locator('.rc-freshness').isVisible());
      assert.ok(await card.locator('.rc-advisory a').isVisible());
    }
    await basic.close();
  }
  assert.ok(observedRequests.every(request => !request.includes(marker)));
  console.log('Bilingual release checks passed with isolated advisory/run fixtures and private local scoring.');
} finally {
  await browser.close();
}
