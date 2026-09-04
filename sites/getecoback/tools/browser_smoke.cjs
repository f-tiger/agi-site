// Browser-level truth test for the money-line components, run against the
// built site/ (not production — the session sandbox cannot reach getecoback.com).
// 2026-09-04: D1 showed 0 affiliate_click{source:us-market} and 0 season_bridge
// since both shipped on 08-28; this is how "zero because nobody clicked" was
// separated from "zero because the beacon never fires". Every event the page
// would send to /api/ev is captured in-page (sendBeacon + fetch are wrapped),
// navigation is prevented, and /api/* is stubbed with ok:false.
//
// Usage (one-off, not in CI):
//   cd sites/getecoback/site && python3 -m http.server 8791 &
//   cd /tmp/x && npm i playwright-core@1.55.0 && node /path/to/tools/browser_smoke.cjs
// Expectations: America/* renders #eb-usmarket with amazon.com+ecoback0d-20 links and a
// click yields exactly one affiliate_click{source:"us-market"}; Europe/* renders nothing
// (html=0); data-eb-sb click yields one season_bridge; pageerrors must be 0.
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const PAGES = [
  ['/guide/klimaanlage-wohnmobil.html', 'DE cooling page (US bridge on DE)'],
  ['/guide/luftentfeuchter-20-qm.html', 'DE dehumidifier page'],
  ['/en/guide/dehumidifier-20-sqm.html', 'EN qm page (USSWITCH)'],
  ['/en/guide/portable-ac-tilt-and-turn-windows.html', 'EN top page'],
  ['/guide/klimaanlage-dachfenster.html', 'DE top converter'],
];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(async e => {
    return chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  });
  for (const tz of ['America/New_York', 'Europe/Berlin']) {
    console.log(`\n===== timezone ${tz}`);
    const ctx = await browser.newContext({ timezoneId: tz, locale: tz.startsWith('America') ? 'en-US' : 'de-DE' });
    await ctx.addInitScript(() => {
      window.__beacons = [];
      const rec = (u, b) => { try { if (String(u).indexOf('/api/ev') >= 0) window.__beacons.push(typeof b === 'string' ? b : (b && b.text ? null : String(b))); } catch (e) {} };
      const origSB = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (u, b) { if (b instanceof Blob) { b.text().then(t => window.__beacons.push(t)); } else rec(u, b); return true; };
      const origFetch = window.fetch;
      window.fetch = function (u, o) { if (String(u).indexOf('/api/ev') >= 0) { window.__beacons.push(o && o.body ? String(o.body) : ''); return Promise.resolve(new Response('', { status: 204 })); } return origFetch.apply(this, arguments); };
    });
    for (const [path, label] of PAGES) {
      const page = await ctx.newPage();
      const beacons = []; const errors = [];
      page.on('pageerror', e => errors.push(String(e.message).slice(0, 120)));
      await page.route('**/*', async route => {
        const u = route.request().url();
        if (u.startsWith('http://127.0.0.1:8791/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false}' });
        if (!u.startsWith('http://127.0.0.1:8791/')) return route.abort();
        return route.continue();
      });
      await page.goto('http://127.0.0.1:8791' + path, { waitUntil: 'load' });
      await page.waitForTimeout(800);
      const getB = async () => (await page.evaluate(() => window.__beacons.slice())).filter(Boolean);
      beacons.length = 0; beacons.push(...await getB());
      const usm = await page.evaluate(() => { const el = document.getElementById('eb-usmarket'); return el ? el.innerHTML.length : -1; });
      const comLinks = await page.evaluate(() => document.querySelectorAll('a[href*="amazon.com"]').length);
      const ussw = await page.evaluate(() => document.querySelectorAll('a[data-eb-ussw]').length);
      const sb = await page.evaluate(() => document.querySelectorAll('a[data-eb-sb]').length);
      const deLinks = await page.evaluate(() => document.querySelectorAll('a[href*="amazon.de"]').length);
      console.log(`\n-- ${label} ${path}\n   usmarket html=${usm} amazon.com anchors=${comLinks} ussw-rewritten=${ussw} season-bridge anchors=${sb} amazon.de anchors=${deLinks} pageerrors=${errors.length ? errors.join(' | ') : 0}`);
      console.log(`   beacons on load: ${beacons.map(b => JSON.parse(b).n).join(',')}`);
      // click first amazon.com link inside usmarket (if any), else first amazon.de link in article
      const before = beacons.length;
      const clicked = await page.evaluate(() => {
        const a = document.querySelector('#eb-usmarket a[href*="amazon.com"]') || document.querySelector('a[data-eb-ussw]') || document.querySelector('article a[href*="amazon.de"]');
        if (!a) return null; a.addEventListener('click', e => e.preventDefault()); a.click(); return a.href;
      });
      await page.waitForTimeout(1500);
      beacons.length = 0; beacons.push(...await getB());
      const aff = beacons.slice(before).map(b => JSON.parse(b)).filter(x => x.n === 'affiliate_click');
      console.log(`   clicked: ${clicked}\n   affiliate_click rows: ${aff.length} ${aff.map(x => JSON.stringify(x.m)).join(' || ')}`);
      if (sb) {
        const b2 = beacons.length;
        await page.evaluate(() => { const a = document.querySelector('a[data-eb-sb]'); a.addEventListener('click', e => e.preventDefault()); a.click(); });
        await page.waitForTimeout(900);
        beacons.length = 0; beacons.push(...await getB());
        console.log(`   season_bridge rows after click: ${beacons.slice(b2).map(b => JSON.parse(b)).filter(x => x.n === 'season_bridge').length}`);
      }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
