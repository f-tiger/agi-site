/* Prove that every program the PROMPT trailer types actually satisfies its spec,
 * by replaying it through the SHIPPED interpreter in the real page — not a
 * re-implementation, which would drift the moment prompt.html changes.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node tools/verify-prompt-reel.js
 *
 * An autopilot that fails its own level is a trailer advertising a broken game.
 */
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.dirname(__dirname);
const SITE = path.join(ROOT, "site");
const REEL = require(path.join(ROOT, "tools", "store-assets", "prompt.js"));

/* the reel lives inside the autopilot string; parse it out so the two can never
   silently disagree about which programs are being shipped */
const m = REEL.autopilot.match(/var REEL = (\[[\s\S]*?\]);/);
if (!m) { console.error("could not find REEL in prompt.js autopilot"); process.exit(1); }
const plans = eval(m[1].replace(/\\\\u/g, "\\u"));
const mt = REEL.autopilot.match(/var TRAPS = (\[[\s\S]*?\]);/);
const traps = mt ? eval(mt[1].replace(/\\\\u/g, "\\u")) : [];

function serve(dir) {
  const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
  const srv = http.createServer((req, res) => {
    const f = path.join(dir, decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404); return res.end("404"); }
      res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
      res.end(buf);
    });
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ srv, port: srv.address().port })));
}

(async () => {
  const { srv, port } = await serve(SITE);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.goto(`http://127.0.0.1:${port}/prompt.html`, { waitUntil: "networkidle" });
  await page.waitForFunction("window.PM_READY === true");

  let bad = 0;
  for (const p of plans) {
    const r = await page.evaluate(({ lvl, ops }) => {
      loadLevel(lvl);
      prog = ops.slice();
      resetBot(); running = true; execIdx = 0; seeking = null; over = false;
      /* SEEK spans several ticks (a thinking beat, then one cell per tick), so
         drive the interpreter until the program is exhausted or the level ends */
      for (let i = 0; i < 600 && !over && (execIdx < prog.length || seeking); i++) stepProgram();
      const onExit = at(bot.x, bot.y) === "X";
      return { par: LEVELS[lvl].par, used: ops.length, onExit, gemsLeft: gems, over, tripped: over && !onExit,
               allowed: ops.every(o => LEVELS[lvl].ops.indexOf(o) >= 0) };
    }, p);
    const ok = r.onExit && r.gemsLeft === 0 && r.allowed && r.used <= r.par;
    if (!ok) bad++;
    console.log(`${ok ? "PASS" : "FAIL"} level ${p.lvl + 1}: ${r.used} ops (par ${r.par}), ` +
                `onExit=${r.onExit} gemsLeft=${r.gemsLeft} opsAllowed=${r.allowed}`);
  }
  for (const t of traps) {
    const r = await page.evaluate(({ lvl, ops }) => {
      loadLevel(lvl); prog = ops.slice(); resetBot(); running = true; execIdx = 0; seeking = null; over = false;
      let shortcut = false; const f = finish; finish = function (reason) { if (reason === "shortcut") shortcut = true; f(reason); };
      for (let i = 0; i < 600 && !over && (execIdx < prog.length || seeking); i++) stepProgram();
      finish = f;
      return { shortcut, onExit: at(bot.x, bot.y) === "X", gemsLeft: gems };
    }, t);
    const ok = r.shortcut;
    if (!ok) bad++;
    console.log(`${ok ? "PASS" : "FAIL"} level ${t.lvl + 1} trap: greedy program ${r.shortcut ? "hit the red tile as designed" : "did NOT trip (onExit=" + r.onExit + ", gemsLeft=" + r.gemsLeft + ")"}`);
  }
  await browser.close(); srv.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
