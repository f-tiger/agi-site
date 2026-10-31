import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(new URL('../../../tools/revenue-studio/package.json', import.meta.url))('playwright');
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const origin = 'https://baipiaoji.com', home = origin + '/manju/';
const browser = await chromium.launch({ headless: true, executablePath: process.env.WORKBENCH_CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// No production request or analytics event leaves these contexts. The Google tag
// is an empty script; we inspect only the isolated, local GA4 command queue.
async function harness(mode = 'normal') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const hits = [], requests = [], tags = [], errors = [];
  await context.addInitScript(mode => {
    Object.defineProperty(navigator, 'webdriver', { get: () => mode === 'webdriver' });
    if (mode === 'dnt') Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
    if (mode === 'gpc') Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });
    if (mode === 'denied') localStorage.setItem('fleet_ga4_choice_v1', 'denied');
    window.__consumer = { native: [], clipboard: [], nativeMode: 'success', clipboardMode: 'success' };
    const nativeShare = async payload => {
      window.__consumer.native.push(payload);
      if (window.__consumer.nativeMode === 'cancel') throw new DOMException('User cancelled', 'AbortError');
      if (window.__consumer.nativeMode === 'error') throw new DOMException('Unavailable', 'NotAllowedError');
    };
    Object.defineProperty(navigator, 'share', { configurable: true, get: () => window.__consumer.nativeMode === 'unavailable' ? undefined : nativeShare });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => {
      window.__consumer.clipboard.push(text);
      if (window.__consumer.clipboardMode === 'denied') throw new DOMException('Denied', 'NotAllowedError');
    } } });
  }, mode);
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    requests.push({ url: request.url(), method: request.method(), body: request.postData() });
    if (url.hostname === 'www.googletagmanager.com') {
      tags.push(url.href);
      return route.fulfill({ contentType: 'application/javascript', body: '' });
    }
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/api/hit') {
      hits.push(request.postDataJSON());
      return route.fulfill({ status: 204 });
    }
    if (url.pathname === '/api/manju-discover') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'not_found', records: [] }) });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ contentType: 'application/json', body: '{}' });
    const relative = url.pathname.endsWith('/') ? url.pathname + 'index.html' : path.extname(url.pathname) ? url.pathname : url.pathname + '.html';
    const file = path.join(dist, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: 'Missing consumer test asset' });
    const mime = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
    return route.fulfill({ body: fs.readFileSync(file), contentType: mime[path.extname(file)] || 'application/octet-stream' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, hits, requests, tags, errors };
}


try {
 const h=await harness();const {page,context,hits,errors}=h;
 await page.goto(origin+'/tools/kimi');await page.locator('#depth-task').selectOption('compare');
 await page.locator('#depth-steps input').first().check();await page.locator('#depth-save').click();
 assert.match(await page.locator('#depth-feedback').textContent(),/已保存/);
 await page.reload();assert.equal(await page.locator('#depth-task').inputValue(),'compare');assert.equal(await page.locator('#depth-steps input').first().isChecked(),true);
 assert.equal(await page.locator('#depth-account').isVisible(),true);
 await page.locator('#kimi-task summary').click();await page.locator('#depth-copy').click();assert.match(await page.locator('#depth-feedback').textContent(),/已复制/);
 await page.waitForFunction(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer||[]).some(event=>event[1]==='bpj_depth_plan_copy'));
 const dl=page.waitForEvent('download');await page.locator('#depth-export').click();const download=await dl;assert.match(fs.readFileSync(await download.path(),'utf8'),/已自行核对/);
 await page.locator('#kimi-task').screenshot({path:'/tmp/bpj-depth-kimi.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.goto(home);const sel=page.locator('.mj-card-actions select[data-depth-id]:visible').first();const id=await sel.getAttribute('data-depth-id');
 await page.evaluate(()=>localStorage.setItem('bpj-manju-saved-v1',JSON.stringify(['preserve-legacy'])));
 await sel.selectOption('watching');await page.goto(origin+'/manju/rankings');
 await page.locator('#watch-progress').scrollIntoViewIfNeeded();assert.match(await page.locator('#depth-watch-list').textContent(),/打开资料与观看入口/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('bpj-manju-saved-v1')),'["preserve-legacy"]');
 const saved=page.locator('#depth-watch-list select');await saved.selectOption('watched');await page.locator('#depth-watch-filter').selectOption('watching');assert.match(await page.locator('#depth-watch-list').textContent(),/还没有/);await page.locator('#depth-watch-filter').selectOption('all');
 const exported=page.waitForEvent('download');await page.locator('#depth-watch-export').click();assert.match(fs.readFileSync(await (await exported).path(),'utf8'),/看完/);
 await page.locator('#watch-progress').screenshot({path:'/tmp/bpj-depth-watch.png'});
 const other=await context.newPage();await other.goto(home);await other.locator('select[data-depth-id="'+id+'"]').first().selectOption('want');await page.waitForFunction(()=>document.querySelector('#depth-watch-list select')?.value==='want');
 await page.locator('#depth-watch-list a').click();await page.waitForTimeout(200);
 assert.ok(hits.some(h=>h.e==='depth'&&h.p==='/depth/watch_resume'));assert.ok(hits.some(h=>h.e==='depth'&&h.p==='/depth/plan_save'));
 assert.ok(hits.filter(h=>h.e==='depth').every(h=>Object.keys(h).sort().join(',')==='e,l,p'));
 assert.deepEqual(errors,[]);await context.close();
 for(const mode of ['qa','webdriver','dnt','gpc','denied']){const h=await harness(mode);await h.page.goto(origin+'/tools/kimi'+(mode==='qa'?'?qa=1':''));await h.page.locator('#depth-save').click();await h.page.waitForTimeout(100);assert.equal(h.hits.filter(x=>x.e==='depth').length,0,mode);await h.context.close();}
 const broken=await harness();await broken.context.addInitScript(()=>localStorage.setItem('bpj-kimi-steps-v1','CORRUPT'));await broken.page.goto(origin+'/tools/kimi');await broken.page.locator('#depth-save').click();assert.equal(await broken.page.evaluate(()=>localStorage.getItem('bpj-kimi-steps-v1')),'CORRUPT');assert.match(await broken.page.locator('#depth-feedback').textContent(),/未覆盖/);await broken.context.close();
 console.log('Depth browser PASS: restore, export, cross-tab, legacy preservation, privacy, QA and corrupt storage');
} finally {await browser.close();}
