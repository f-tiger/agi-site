/* Check a LIVE Playgama sandbox page the way a player gets it, in a real browser.
 *
 *   node tools/verify-playgama-live.js <siteId> [<siteId> ...]        # health only
 *   node tools/verify-playgama-live.js --ad <siteId>                  # + one interstitial call
 *
 * Site ids come from the cabinet (get_sandbox_state), never guessed — the address
 * depends on the deployment. Until 2026-09-15 these four answers were unknowable from
 * a sandboxed session, so every one of them was carried as an assumption:
 *   - platform.id is "playgama", not the offline "mock";
 *   - the ad chain reaches "opened" (offline it always died at "loading → failed",
 *     which proves nothing about fill);
 *   - the /e beacon survives CORS from a third-party portal domain (the 2026-09-07 fix
 *     was only ever verified on a runner);
 *   - zero console errors on their host page, which is itself a rejection risk.
 *
 * Behind an egress proxy that re-terminates TLS, export PW_PROXY (the proxy URL) and
 * PW_SPKI (base64 sha256 of that CA's SubjectPublicKeyInfo — pins that one CA instead
 * of turning certificate checking off):
 *   openssl x509 -in <ca>.crt -pubkey -noout | openssl pkey -pubin -outform der \
 *     | openssl dgst -sha256 -binary | openssl enc -base64
 */
const PW = require(process.env.PW_MODULE || "playwright");

const AD = process.argv.includes("--ad");
const SITES = process.argv.slice(2).filter(a => a !== "--ad");
const BEACON_HOST = "play.agiscorecard.com";

const launchOpts = () => {
  const args = ["--no-sandbox"];
  if (process.env.PW_SPKI) args.push(`--ignore-certificate-errors-spki-list=${process.env.PW_SPKI}`);
  const o = { args };
  if (process.env.PW_BROWSER) o.executablePath = process.env.PW_BROWSER;
  if (process.env.PW_PROXY) o.proxy = { server: process.env.PW_PROXY };
  return o;
};

const check = async (browser, siteId) => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [], beacons = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
  page.on("pageerror", e => errors.push("pageerror: " + String(e).slice(0, 160)));
  page.on("requestfinished", async r => {
    if (!r.url().includes(BEACON_HOST)) return;
    const resp = await r.response().catch(() => null);
    beacons.push(`${r.method()} ${new URL(r.url()).pathname} -> ${resp ? resp.status() : "?"}`);
  });
  page.on("requestfailed", r => { if (r.url().includes(BEACON_HOST)) beacons.push(`FAILED ${new URL(r.url()).pathname} ${r.failure() && r.failure().errorText}`); });

  const out = { siteId, url: `https://playgama.ai/play/${siteId}` };
  await page.goto(out.url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(10000);

  const game = page.frames().find(f => /games\.playgama\.(net|com)/.test(f.url()));
  if (!game) { out.fail = "no game frame under games.playgama.net"; }
  else {
    Object.assign(out, await game.evaluate(() => ({
      title: document.title,
      initialized: !!(window.bridge && window.bridge.isInitialized),
      platform: window.bridge && window.bridge.platform && window.bridge.platform.id,
      sdk: window.bridge && window.bridge.version,
      /* the red banner and these two globals are our own failure reporters; a silent
       * page is what a swallowed error looks like, so read them, not just the console */
      sdkMissingBanner: !!Array.from(document.querySelectorAll("div")).find(d => /SDK NOT LOADED/.test(d.textContent || "")),
      pgErr: window.GL_PG_ERR || null,
      adErr: window.GL_AD_ERR || null,
    })));
    if (AD) out.adChain = await game.evaluate(() => new Promise(res => {
      const seen = [];
      window.bridge.advertisement.on("interstitial_state_changed", s => seen.push(s));
      try { window.bridge.advertisement.showInterstitial(); } catch (e) { seen.push("throw: " + e); }
      setTimeout(() => res(seen.join(" → ") || "(no state change in 30s)"), 30000);
    }));
  }
  out.consoleErrors = errors;
  out.beacons = beacons;
  await page.context().close();
  return out;
};

(async () => {
  if (!SITES.length) { console.error("usage: verify-playgama-live.js [--ad] <siteId> ..."); process.exit(2); }
  const browser = await PW.chromium.launch(launchOpts());
  let bad = 0;
  for (const s of SITES) {
    const r = await check(browser, s).catch(e => ({ siteId: s, fail: String(e).slice(0, 200) }));
    const ok = !r.fail && r.initialized && r.platform === "playgama" && !r.sdkMissingBanner
      && !r.pgErr && !r.adErr && r.consoleErrors.length === 0
      && (!AD || /opened/.test(r.adChain || ""));
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${JSON.stringify(r)}`);
  }
  await browser.close();
  console.log(bad ? `${bad}/${SITES.length} FAILED` : `all ${SITES.length} ok`);
  process.exit(bad ? 1 : 0);
})();
