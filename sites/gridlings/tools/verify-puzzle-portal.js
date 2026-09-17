/* Prove a built puzzle package would survive Playgama certification, before uploading it.
 *
 *   node tools/verify-puzzle-portal.js site/downloads/playgama/towers.zip
 *
 * Certification drives a game by CLICKING VISIBLE CONTROLS. It cannot solve a
 * Skyscrapers board, so an ad behind a win is an ad it never sees — that is exactly how
 * GHOSTLINE failed its first pass ("No advertising is implemented"). The assertion that
 * matters here is therefore not "an ad can fire" but "an ad fires from a real click on a
 * control that is visible before anything is solved". Calling .click() in JS on a hidden
 * button passes while certification fails, which this file exists to stop.
 *
 * Offline the chain ends in `failed` — there is no ad inventory on localhost. That is
 * the expected pass: reaching `loading` proves the request left the game. Fill is only
 * observable on the live platform (tools/verify-playgama-live.js --ad).
 */
const { chromium } = require(process.env.PW_MODULE || "playwright");
const http = require("http"), fs = require("fs"), os = require("os"), path = require("path");
const { execFileSync } = require("child_process");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const BREAKPOINTS = ["d-easy", "d-medium", "d-hard"];   /* must be visible unsolved */
const WIN_GATED = ["again"];                            /* may be hidden; not relied on */

(async () => {
  const zip = process.argv[2];
  if (!zip) { console.error("usage: verify-puzzle-portal.js <package.zip>"); process.exit(2); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pgpuz-"));
  execFileSync("unzip", ["-q", path.resolve(zip), "-d", dir]);

  const server = http.createServer((req, res) => {
    const f = path.join(dir, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html");
    fs.readFile(f, (e, data) => {
      if (e) { res.writeHead(404).end(); return; }
      res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }).end(data);
    });
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + "/index.html";

  /* The beacon now posts to an absolute https URL, so behind an egress proxy that
     re-terminates TLS the browser must trust that CA or every beacon becomes a console
     error and this run goes red for the wrong reason. PW_SPKI pins that one CA (base64
     sha256 of its SubjectPublicKeyInfo); it never disables certificate checking. The
     console-error assertion stays strict on purpose — a check that cannot go red is
     worth nothing. */
  const args = ["--no-sandbox"];
  if (process.env.PW_SPKI) args.push(`--ignore-certificate-errors-spki-list=${process.env.PW_SPKI}`);
  const browser = await chromium.launch({
    executablePath: process.env.PW_BROWSER || undefined,
    proxy: process.env.PW_PROXY ? { server: process.env.PW_PROXY } : undefined,
    args,
  });
  const page = await browser.newPage();
  const errs = [];
  page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  page.on("pageerror", e => errs.push("pageerror: " + String(e).slice(0, 140)));

  let bad = 0;
  const say = (label, v, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${String(label).padEnd(34)} ${v}`); if (!ok) bad++; };

  await page.goto(base, { waitUntil: "load" });
  await page.waitForTimeout(4000);

  const s = await page.evaluate(() => ({
    bridge: !!window.bridge,
    init: !!(window.bridge && window.bridge.isInitialized),
    cells: (document.getElementById("grid") || { children: [] }).children.length,
    banner: !!Array.from(document.querySelectorAll("div")).find(d => /SDK NOT LOADED/.test(d.textContent || "")),
    pgErr: window.GL_PG_ERR || null,
    adErr: window.GL_AD_ERR || null,
  }));
  say("bridge initialized", s.init, s.init);
  say("puzzle rendered", s.cells + " cells", s.cells > 0);
  say("no SDK-missing banner", !s.banner, !s.banner);
  say("GL_PG_ERR clear", s.pgErr || "null", !s.pgErr);
  say("GL_AD_ERR clear", s.adErr || "null", !s.adErr);

  for (const id of BREAKPOINTS) {
    const vis = await page.isVisible("#" + id).catch(() => false);
    say("breakpoint #" + id + " visible", vis, vis === true);
  }
  for (const id of WIN_GATED) {
    const vis = await page.isVisible("#" + id).catch(() => false);
    console.log(`note #${id} visible unsolved: ${vis} (win-gated by design; not the certification path)`);
  }

  /* no ad may fire on its own: an unsolicited interstitial on load is its own rejection */
  const idle = await page.evaluate(() => new Promise(r => {
    window.__seen = [];
    window.bridge.advertisement.on("interstitial_state_changed", x => window.__seen.push(x));
    setTimeout(() => r(window.__seen.join(" → ")), 5000);
  }));
  say("no ad without interaction", idle || "(none)", !idle);

  await page.click("#" + BREAKPOINTS[BREAKPOINTS.length - 1]);
  await page.waitForTimeout(6000);
  const chain = await page.evaluate(() => window.__seen.join(" → "));
  say("ad from ONE real click", chain || "(nothing)", /loading/.test(chain));

  /* the cooldown must hold, or a bored player gets an ad per click */
  const again = await page.evaluate(() => new Promise(r => {
    window.__seen = [];
    document.getElementById("d-easy").click();
    setTimeout(() => r(window.__seen.join(" → ")), 4000);
  }));
  say("cooldown holds 2nd click", again || "(suppressed)", !again);

  say("zero console errors", errs.length ? JSON.stringify(errs) : "0", errs.length === 0);

  await browser.close();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(bad ? `${bad} FAILED` : "all checks passed");
  process.exit(bad ? 1 : 0);
})();
