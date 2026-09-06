/* One acceptance gate for every game in site/, run before any submission.
 * Checks the things that get a build rejected, not the things that are merely
 * nice: instant playability, a clean console, controls that are actually on
 * screen at phone sizes, and a restart that restarts.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node tools/fleet-smoke.js
 */
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.dirname(__dirname), SITE = path.join(ROOT, "site");
const GAMES = process.argv.slice(2).length ? process.argv.slice(2)
  : ["overfit", "mimic", "overseer", "prompt", "minima", "singularity"];
const READY = { overfit: "OF_READY", mimic: "MC_READY", overseer: "OS_READY", prompt: "PM_READY", minima: "MN_READY", singularity: "SG_READY" };
const VIEWS = [{ w: 844, h: 390, n: "landscape" }, { w: 390, h: 780, n: "portrait" }, { w: 1280, h: 800, n: "desktop" }];

function serve(dir) {
  const srv = http.createServer((q, r) => {
    const f = path.join(dir, decodeURIComponent(q.url.split("?")[0]));
    fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "application/octet-stream" }); r.end(b); });
  });
  return new Promise(res => srv.listen(0, "127.0.0.1", () => res({ srv, port: srv.address().port })));
}

(async () => {
  const { srv, port } = await serve(SITE);
  const browser = await chromium.launch();
  let bad = 0;
  for (const g of GAMES) {
    const fails = [];
    for (const v of VIEWS) {
      const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: true, isMobile: v.n !== "desktop" });
      const p = await ctx.newPage();
      const errs = [];
      p.on("pageerror", e => errs.push("pageerror " + e.message));
      p.on("console", m => { const t = m.text();
        /* the beacon host is unreachable from this sandbox; that is the harness,
           not the game, and it is stubbed below - anything else is real */
        if (m.type() === "error" && !/ERR_TUNNEL|ERR_NAME|Failed to load resource/.test(t)) errs.push("console " + t);
        if (/autoplay|AudioContext was not allowed/i.test(t)) errs.push("audio-before-gesture: " + t.slice(0, 90));
      });
      await p.addInitScript(() => {
        window.__cg = [];
        window.CrazyGames = { SDK: { init: () => Promise.resolve(), game: {
          loadingStart(){}, loadingStop(){}, addSettingsChangeListener(){}, settings: {},
          gameplayStart(){ window.__cg.push("start"); }, gameplayStop(){ window.__cg.push("stop"); },
          happytime(){ window.__cg.push("happy"); } }, ad: { requestAd(){} } } };
        window.GL_CG = true;
      });
      await p.route("**/crazygames-sdk-v3.js", r => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
      await p.route("**/play.agiscorecard.com/e", r => r.fulfill({ status: 204, body: "" }));
      await p.goto(`http://127.0.0.1:${port}/${g}.html`, { waitUntil: "networkidle" });
      await p.waitForFunction(`window.${READY[g]} === true`);
      await p.waitForTimeout(900);

      const cg = await p.evaluate("window.__cg");
      if (!cg.includes("start")) fails.push(`${v.n}: gameplayStart never fired with zero interaction`);
      if (cg.filter(e => e === "happy").length > 3) fails.push(`${v.n}: happytime fired ${cg.filter(e => e === "happy").length}x`);

      const off = await p.evaluate((vh) => {
        const out = [];
        document.querySelectorAll("button, footer, .rack, .pad, .bar").forEach(el => {
          const b = el.getBoundingClientRect();
          if (!(b.height > 0 && b.bottom > vh + 0.5)) return;
          /* inside a scrollable panel that is itself on screen = reachable (idle
             games keep a long shop in a scroll area; that is not a hidden control) */
          for (let a = el.parentElement; a; a = a.parentElement) {
            const ov = getComputedStyle(a).overflowY, r = a.getBoundingClientRect();
            if ((ov === "auto" || ov === "scroll") && r.bottom <= vh + 0.5 && a.scrollHeight > a.clientHeight) return;
          }
          out.push(el.id || el.className || el.tagName);
        });
        return out;
      }, v.h);
      if (off.length) fails.push(`${v.n}: off-screen ${off.join(",")}`);

      const small = await p.evaluate(() => {
        const out = [];
        document.querySelectorAll("button").forEach(el => {
          const b = el.getBoundingClientRect();
          if (b.height > 0 && b.height < 30) out.push((el.id || el.className) + "=" + Math.round(b.height));
        });
        return out;
      });
      if (small.length) fails.push(`${v.n}: tiny targets ${small.join(",")}`);

      if (v.n === "desktop") {
        /* a restart must restart: the board has to come back to life promptly */
        await p.waitForTimeout(6500);
        const btn = await p.$("#brestart") || await p.$("#bretry");
        if (btn) {
          await btn.click();
          await p.waitForTimeout(7000);
          const alive = await p.evaluate(`(() => {
            /* "alive" means different things per game: OVERSEER must have agents on
               the board again, PROMPT is turn-based and is alive when the level is
               accepting input again (over === false), the rest run continuously. */
            if (typeof agents !== 'undefined') return agents.filter(a => !a.done).length > 0;
            if (typeof prog !== 'undefined' && typeof over !== 'undefined') return over === false;
            if (typeof running !== 'undefined') return running === true;
            return true; })()`);
          if (!alive) fails.push("desktop: game did not come back after restart");
          const ghost = await p.evaluate(`!!document.querySelector('.modal.show, #mover.show, #mdone.show')`);
          if (ghost) fails.push("desktop: a result modal is showing over a fresh run");
        }
      }
      if (errs.length) fails.push(`${v.n}: ${errs.slice(0, 3).join(" | ")}`);
      await ctx.close();
    }
    if (fails.length) { bad++; console.log(`FAIL ${g}`); fails.forEach(f => console.log("      " + f)); }
    else console.log(`ok   ${g}`);
  }
  await browser.close(); srv.close();
  console.log(bad ? `\n${bad} game(s) not submittable` : "\nall games pass the submission gate");
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
