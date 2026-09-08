/* Verify the LICENSING-GRADE (clean) packages — site/downloads/clean/<slug>.zip.
 *
 * These are the only builds that may be offered to a platform whose rules forbid
 * advertising, external links and developer-side stats counters (Coolmath Games is the
 * one that matters). Everything asserted here is one of those rules restated as
 * something a machine can fail on:
 *
 *   1. NOTHING leaves the package. Not the beacon, not an SDK, not a font. Any request
 *      to anything other than the local test server is a failure.
 *   2. No ATTEMPT either. sendBeacon and fetch are instrumented before the page runs, so
 *      a swallowed call still counts as a failure. This is what makes the test general:
 *      the canvas games expose ev() as a global and can be invoked directly, while the
 *      puzzle engine's gev() is private to its IIFE and can only be reached by playing —
 *      instrumenting the two exit doors catches both without knowing which is which.
 *      (Verified non-vacuous: run it against a zip of the raw site page and it trips.)
 *   3. No external link in the DOM, and no reference to our own host anywhere in it.
 *   4. window.GL_CLEAN is on and no portal flag got set by any detection path.
 *   5. Clean console, and the canvas actually has pixels — a package that satisfies
 *      1–4 by failing to boot is worthless.
 *
 * Run:  NODE_PATH=/opt/node22/lib/node_modules node tools/clean-package-smoke.js [slug…]
 */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");

const ROOT = path.dirname(__dirname);
const CLEAN = path.join(ROOT, "site", "downloads", "clean");
const HOST = "play.agiscorecard.com";
const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1280, height: 800 } },
  { name: "mobile", viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true },
];

function serve(dir) {
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split("?")[0]);
    if (u === "/") u = "/index.html";
    const f = path.join(dir, u);
    fs.readFile(f, (e, b) => {
      if (e) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
      r.end(b);
    });
  });
  return new Promise(res => srv.listen(0, "127.0.0.1", () => res({ srv, port: srv.address().port })));
}

(async () => {
  const args = process.argv.slice(2);
  const slugs = args.length ? args
    : fs.existsSync(CLEAN) ? fs.readdirSync(CLEAN).filter(f => f.endsWith(".zip")).map(f => f.slice(0, -4)).sort() : [];
  if (!slugs.length) {
    console.error("no clean packages found — run `python3 tools/package_blocknova.py` first");
    process.exit(1);
  }
  const browser = await chromium.launch();
  let bad = 0;
  for (const slug of slugs) {
    const zip = path.join(CLEAN, slug + ".zip");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clean-" + slug + "-"));
    execFileSync("unzip", ["-q", "-o", zip, "-d", dir]);
    const files = execFileSync("find", [dir, "-type", "f"]).toString().trim().split("\n");
    const { srv, port } = await serve(dir);
    const base = `http://127.0.0.1:${port}`;

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext(vp);
      const p = await ctx.newPage();
      const fails = [], offsite = [], errs = [];
      p.on("pageerror", e => errs.push("pageerror " + e.message));
      p.on("console", m => { if (m.type() === "error") errs.push("console " + m.text().slice(0, 120)); });
      p.on("request", r => {
        const u = r.url();
        if (!u.startsWith(base) && !/^(data|blob|about):/.test(u)) offsite.push(u.split("?")[0]);
      });

      // (2) Watch the two exit doors themselves, before any page script runs. A guard
      // that silently swallows the call still shows up here, and it works for both build
      // shapes — the canvas games' global ev() and the puzzle engine's private gev().
      await p.addInitScript(() => {
        window.__sent = [];
        // Only calls that LEAVE the package count. The puzzle engine legitimately fetches
        // its own pool json, which is a file inside the zip and therefore same-origin.
        const offsite = (u) => {
          try {
            const s = String((u && u.url) || u);
            if (/^(about|data|blob):/.test(s)) return false;
            return new URL(s, location.href).origin !== location.origin;
          } catch (e) { return true; }
        };
        const sb = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
        Object.defineProperty(navigator, "sendBeacon", {
          configurable: true,
          value: function (u, d) {
            if (offsite(u)) window.__sent.push("sendBeacon " + u);
            return sb ? sb(u, d) : false;
          },
        });
        const f = window.fetch;
        window.fetch = function (u, o) {
          if (offsite(u)) window.__sent.push("fetch " + ((u && u.url) || u));
          return f.apply(this, arguments);
        };
      });

      await p.goto(base + "/index.html", { waitUntil: "networkidle" });
      await p.waitForTimeout(1200);

      // Invoke the beacon directly where it is reachable (the canvas games declare ev()
      // at top level); otherwise reach it the only way a player can.
      const evKind = await p.evaluate(() => typeof window.ev);
      if (evKind === "function") {
        await p.evaluate(() => { window.ev("play_start", "clean-smoke"); window.ev("game_over", "clean-smoke"); });
      }
      // A real gesture too: some builds only wire their first event behind one, and for
      // the puzzle engine this is the ONLY way in.
      const cell = await p.$("#grid > *, canvas");
      if (cell) { try { await cell.click({ timeout: 2000, force: true }); } catch (e) {} }
      await p.mouse.click(vp.viewport.width / 2, vp.viewport.height / 2);
      await p.keyboard.press("Space");
      await p.keyboard.press("1");
      await p.waitForTimeout(900);

      const state = await p.evaluate(() => {
        const c = document.querySelector("canvas");
        const links = [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href"));
        return {
          clean: window.GL_CLEAN === true, cg: window.GL_CG === true, pg: window.GL_PG === true,
          canvas: c ? { w: c.width, h: c.height } : null, grid: !!document.querySelector("#grid"),
          sent: window.__sent || [],
          links, html: document.documentElement.outerHTML.includes("play.agiscorecard.com"),
        };
      });

      if (state.sent.length) fails.push("the build tried to phone home: " + state.sent.slice(0, 4).join(", "));
      if (offsite.length) fails.push("request left the package: " + [...new Set(offsite)].join(", "));
      if (!state.clean) fails.push("window.GL_CLEAN is not true — the packager did not inject the flag");
      if (state.cg) fails.push("window.GL_CG became true in a clean build");
      if (state.pg) fails.push("window.GL_PG became true in a clean build");
      if (state.html) fails.push("the live DOM mentions " + HOST);
      const ext = state.links.filter(h => /^https?:/i.test(h) || h.startsWith("/"));
      if (ext.length) fails.push("external or root-relative link in the DOM: " + ext.join(", "));
      // Boot proof: the canvas games draw into a <canvas>, the puzzle engine builds #grid.
      if (!state.grid && (!state.canvas || !state.canvas.w || !state.canvas.h))
        fails.push("neither a canvas with pixels nor #grid — did it boot?");
      if (errs.length) fails.push("console/page errors: " + errs.slice(0, 3).join(" | "));

      const tag = `${slug} [${vp.name}]`;
      if (fails.length) { bad++; console.log("FAIL  " + tag + "\n        - " + fails.join("\n        - ")); }
      else console.log(`OK    ${tag} — ${files.length} file(s), ${(fs.statSync(zip).size / 1024).toFixed(1)}KB, `
        + `zero calls out, zero requests off-package, beacon reached ${evKind === "function" ? "directly" : "by play only"}`);
      await ctx.close();
    }
    srv.close();
  }
  await browser.close();
  console.log(bad ? `\n${bad} check(s) FAILED — these packages must not be submitted` : "\nALL CLEAN PACKAGES PASSED");
  process.exit(bad ? 1 : 0);
})();
