/* Verify the ZIP that will actually be uploaded to the portal — not the site copy.
 * Unpacks each build, serves it as the portal would, and asserts the things the
 * portal's automatic check looks at: gameplayStart with ZERO interaction, a clean
 * console, and no request leaving the package.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node tools/cg-package-smoke.js
 */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.dirname(__dirname);
const CG = path.join(ROOT, "site", "downloads", "cg");
const GAMES = process.argv.slice(2).length ? process.argv.slice(2)
  : ["overfit", "mimic", "overseer", "prompt", "minima", "singularity"];

function serve(dir) {
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split("?")[0]);
    if (u === "/") u = "/index.html";
    const f = path.join(dir, u);
    fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); r.end(b); });
  });
  return new Promise(res => srv.listen(0, "127.0.0.1", () => res({ srv, port: srv.address().port })));
}

(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  for (const g of GAMES) {
    const zip = path.join(CG, g + "-cg.zip");
    const size = fs.statSync(zip).size;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-" + g + "-"));
    execFileSync("unzip", ["-q", "-o", zip, "-d", dir]);
    const files = execFileSync("find", [dir, "-type", "f"]).toString().trim().split("\n");
    const { srv, port } = await serve(dir);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    const errs = [], external = [];
    p.on("pageerror", e => errs.push("pageerror " + e.message));
    p.on("console", m => { if (m.type() === "error") errs.push("console " + m.text().slice(0, 100)); });
    p.on("request", r => { const u = r.url();
      if (!u.startsWith(`http://127.0.0.1:${port}`) && !u.startsWith("data:")) external.push(u.split("?")[0]); });
    await p.addInitScript(() => {
      window.__cg = [];
      window.CrazyGames = { SDK: { init: () => Promise.resolve(), game: {
        loadingStart(){}, loadingStop(){}, addSettingsChangeListener(){}, settings: {},
        gameplayStart(){ window.__cg.push(["start", Math.round(performance.now())]); },
        gameplayStop(){ window.__cg.push(["stop", 0]); }, happytime(){ window.__cg.push(["happy", 0]); } },
        ad: { requestAd(){} } } };
    });
    await p.route("**/crazygames-sdk-v3.js", r => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await p.route("**/play.agiscorecard.com/e", r => r.fulfill({ status: 204, body: "" }));
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    const cg = await p.evaluate("window.__cg || []");
    const start = cg.find(e => e[0] === "start");
    const fails = [];
    if (!start) fails.push("gameplayStart NEVER fired without interaction");
    if (errs.length) fails.push(errs.slice(0, 2).join(" | "));
    /* the beacon and the SDK are the only two hosts a build is allowed to reach */
    const strays = [...new Set(external)].filter(u => !/sdk\.crazygames\.com|play\.agiscorecard\.com\/e/.test(u));
    if (strays.length) fails.push("unexpected external request: " + strays.join(", "));
    if (size > 50 * 1024 * 1024) fails.push("package over 50MB");
    if (files.length > 1500) fails.push(files.length + " files (portal cap 1500)");
    await ctx.close(); srv.close();
    fs.rmSync(dir, { recursive: true, force: true });
    if (fails.length) { bad++; console.log(`FAIL ${g}`); fails.forEach(f => console.log("      " + f)); }
    else console.log(`ok   ${g.padEnd(9)} ${(size/1024).toFixed(1)}KB, ${files.length} files, gameplayStart at ${start[1]}ms`);
  }
  await browser.close();
  console.log(bad ? `\n${bad} package(s) not ready to upload` : "\nall packages ready to upload");
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
