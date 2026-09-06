/* The autopilot and stage scripts run in the page's GLOBAL scope, so a top-level
 * `var draw` REPLACES the game's own draw(). That happened once and produced a
 * trailer where the render loop was dead and the score silently stopped moving,
 * which looked almost right. This asserts no config declares a name the game
 * already owns.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node tools/check-autopilot-globals.js
 */
const { chromium } = require("playwright");
const http = require("http"); const fs = require("fs"); const path = require("path");
const ROOT = path.dirname(__dirname), SITE = path.join(ROOT, "site");
const SLUGS = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(path.join(ROOT, "tools", "store-assets")).map(f => f.replace(/\.js$/, ""));

function serve(dir) {
  const srv = http.createServer((req, res) => {
    const f = path.join(dir, decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "application/octet-stream" }); res.end(b); });
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ srv, port: srv.address().port })));
}
/* top-level `var x` / `function x` in the injected source (crude but it only has
   to see declarations that are not nested, which is what column 0-6 indent means) */
function declared(src) {
  const out = new Set();
  src.split("\n").forEach(l => {
    const m = l.match(/^\s{0,7}(?:var|let|const)\s+([A-Za-z_$][\w$]*)/) ||
              l.match(/^\s{0,7}function\s+([A-Za-z_$][\w$]*)/);
    if (m) out.add(m[1]);
  });
  return out;
}

(async () => {
  const { srv, port } = await serve(SITE);
  const browser = await chromium.launch();
  let bad = 0;
  for (const slug of SLUGS) {
    const cfg = require(path.join(ROOT, "tools", "store-assets", slug + ".js"));
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    await page.goto(`http://127.0.0.1:${port}/${slug}.html`, { waitUntil: "networkidle" });
    await page.waitForFunction(cfg.readyExpr);
    const own = new Set(await page.evaluate("Object.keys(window)"));
    await page.close();
    const names = new Set([...declared(cfg.autopilot),
                           ...declared(cfg.stage({ title: 1, tag: 1, w: 1, h: 1, name: "x" }))]);
    const clash = [...names].filter(n => own.has(n));
    if (clash.length) { bad++; console.log(`CLASH ${slug}: ${clash.join(", ")}`); }
    else console.log(`ok    ${slug}: ${names.size} declarations, none shadow a game global`);
  }
  await browser.close(); srv.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
