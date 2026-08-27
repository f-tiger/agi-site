/* Browser smoke test for all Gridlings game pages: every page must load its
   puzzle with zero console/page errors; three representative clients are
   driven to an actual win using the known solution from the baked JSON. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SITE = "/workspace/agi-site/sites/gridlings/site";
const BASE = "http://127.0.0.1:8777";

const PAGES = [
  "index.html", "zh.html", "balance.html", "balance-zh.html",
  "starbattle.html", "starbattle-zh.html", "trail.html", "trail-zh.html",
  "futoshiki.html", "futoshiki-zh.html", "towers.html", "towers-zh.html",
  "minisudoku.html", "minisudoku-zh.html", "kropki.html", "kropki-zh.html",
  "sandwich.html", "sandwich-zh.html", "thermo.html", "thermo-zh.html",
  "nonogram.html", "nonogram-zh.html", "archive.html",
];

function firstBoard(file) {
  // The engines load TODAY's UTC daily (app.js utcToday), so the driver has to
  // solve today's board — taking puzzles[0] made every win-path test pass on
  // the epoch day (2026-08-24) and time-bomb the day after, which is exactly
  // what happened: on 2026-08-27 all 11 win drivers timed out on a harness
  // bug, not a game bug (real players solved 2026-08-27 boards in D1 the same
  // day). Fall back to the earliest board the way app.js falls back.
  const d = JSON.parse(fs.readFileSync(path.join(SITE, file), "utf8"));
  const keys = Object.keys(d.puzzles).sort();
  const today = new Date().toISOString().slice(0, 10);
  const iso = d.puzzles[today] ? today : keys[0];
  return d.puzzles[iso];
}

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const failures = [];

  async function dismissIntro(page) {
    try {
      const ov = await page.$("#frov");
      if (ov) { await page.click("#frov button.btn.pri"); await page.waitForSelector("#frov", { state: "detached", timeout: 2000 }); }
    } catch (e) {}
  }
  async function fresh() {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push(String(e)));
    return { ctx, page, errs };
  }

  // 1) load every page, require a rendered grid (or archive list) and no errors
  for (const f of PAGES) {
    const { ctx, page, errs } = await fresh();
    try {
      await page.goto(BASE + "/" + f, { waitUntil: "networkidle" }); await dismissIntro(page);
      if (f === "archive.html") {
        await page.waitForFunction(() => document.querySelectorAll("#list a.day, #tabs button").length > 5, null, { timeout: 8000 });
      } else {
        await page.waitForFunction(() => document.querySelectorAll("#grid .cell, #grid button, #grid td").length > 8, null, { timeout: 8000 });
        const pnum = await page.textContent("#pnum");
        if (!pnum || !pnum.trim()) throw new Error("empty #pnum");
      }
      const realErrs = errs.filter((e) => !/favicon|501|Unsupported method/i.test(e));
      if (realErrs.length) throw new Error("console: " + realErrs.join(" | ").slice(0, 300));
      console.log("ok  ", f);
    } catch (e) {
      failures.push(f + ": " + e.message.slice(0, 200));
      console.log("FAIL", f, e.message.slice(0, 200));
    }
    await ctx.close();
  }

  // 2) win-path drives for ALL 11 games via the shared driver module
  const { GAME_DRIVERS } = require("./win-drivers");
  const PAGE_OF = { gridlings: "index.html", balance: "balance.html", starbattle: "starbattle.html",
    trail: "trail.html", futoshiki: "futoshiki.html", towers: "towers.html", minisudoku: "minisudoku.html",
    kropki: "kropki.html", sandwich: "sandwich.html", thermo: "thermo.html", nonogram: "nonogram.html" };
  for (const [slug, g] of Object.entries(GAME_DRIVERS)) {
    const { ctx, page, errs } = await fresh();
    try {
      const p = firstBoard(g.json); p.n = +p.n;
      await page.goto(BASE + "/" + PAGE_OF[slug], { waitUntil: "networkidle" });
      await dismissIntro(page);
      await page.waitForSelector("#grid .cell");
      await g.drive(page, p);
      await page.waitForSelector("#win:not([hidden])", { timeout: 6000 });
      const realErrs = errs.filter((e) => !/favicon|501|Unsupported method/i.test(e));
      if (realErrs.length) throw new Error("console: " + realErrs.join(" | ").slice(0, 200));
      console.log("ok   WIN " + slug);
    } catch (e) { failures.push(slug + "-win: " + e.message.slice(0, 200)); console.log("FAIL " + slug + "-win", e.message.slice(0, 200)); }
    await ctx.close();
  }

  await browser.close();
  if (failures.length) { console.log("\nFAILURES:\n" + failures.join("\n")); process.exit(1); }
  console.log("\nALL SMOKE TESTS PASSED");
})();
