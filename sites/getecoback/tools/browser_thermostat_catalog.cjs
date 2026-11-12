// Local files only: neither merchant navigation nor production events are sent.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {assertCatalogCommerce,eligibilitySelftest,thermostatSpec} = require('./browser_dach_buying.cjs');
const root = path.resolve(__dirname, '../site'), origin = 'https://getecoback.com';
const routePath = '/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
(async () => {
  eligibilitySelftest();
  const data=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/thermostat-catalog.json'),'utf8'));
  const today=new Date().toISOString().slice(0,10);
  const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']} : {})});
  let cases = 0, eligibleSearches;
  try {
    for (const enabled of [true, false]) {
      const ctx = await browser.newContext({javaScriptEnabled:enabled, viewport:{width:390,height:844}});
      await ctx.route('**/*', route => {
        const u = new URL(route.request().url());
        if (u.origin !== origin || u.pathname.startsWith('/api/')) return route.fulfill({status:204});
        const file = path.join(root, u.pathname);
        const mime = {'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'};
        return fs.existsSync(file) ? route.fulfill({contentType:mime[path.extname(file)] || 'application/octet-stream', body:fs.readFileSync(file)}) : route.fulfill({status:404});
      });
      const page = await ctx.newPage(), errors=[];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + routePath + '#eb-thermostat-products');
      const catalog = page.locator('#eb-thermostat-products');
      assert(await catalog.isVisible());
      assert.equal(await catalog.locator('.tc-card').count(),3);
      eligibleSearches=await assertCatalogCommerce(catalog,thermostatSpec,data,today);
      assert.match(await catalog.innerText(), /V3\+.*nicht miteinander kompatibel/);
      assert.match(await catalog.innerText(), /vorhandene Köpfe weiter nutzen/);
      for (const a of await catalog.locator('a[rel~="sponsored"]').all()) {
        const u = new URL(await a.getAttribute('href'));
        assert.equal(u.hostname,'www.amazon.de'); assert.equal(u.pathname,'/s');
        assert.equal(u.searchParams.get('tag'),'getecoback-21');
        assert.match(await a.innerText(),/suchen/);
      }
      if (enabled) {
        await page.locator('[data-valve-check][data-ready=true]').waitFor();
        await page.selectOption('[name=valve-model]','tado-x');
        await page.selectOption('[name=valve-connection]','heimeier-m30');
        assert.equal(await page.locator('[data-valve-result]').getAttribute('data-status'),'unverified');
        await page.locator('[data-winter-tool=thermostat] [name=saving]').fill('0');
        await page.locator('[data-winter-tool=thermostat] button[type=submit]').click();
        assert.match(await page.locator('[data-winter-tool] [data-result]').innerText(), /Keine positive jährliche Nettoersparnis; keine Amortisation/);
      }
      for (const width of [320,390,1280]) {
        await page.setViewportSize({width,height:900});
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), 'Document overflows at '+width);
        cases++;
      }
      const dir=process.env.QA_DIR || '/tmp/eco-thermostat-catalog-qa';fs.mkdirSync(dir,{recursive:true});
      await page.setViewportSize({width:390,height:844});await catalog.screenshot({path:path.join(dir,'thermostat-catalog-'+(enabled?'js':'nojs')+'.png')});
      assert.deepEqual(errors,[]);await ctx.close();
    }
    console.log('PASS thermostat catalog: '+cases+' viewport/JS cases, '+eligibleSearches+' exact eligible searches on '+today+', three readable source cards, no-purchase branch, X not validated by V3, zero-savings result.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
