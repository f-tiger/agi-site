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
  const d = JSON.parse(fs.readFileSync(path.join(SITE, file), "utf8"));
  const iso = Object.keys(d.puzzles).sort()[0];
  return d.puzzles[iso];
}

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const failures = [];

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
      await page.goto(BASE + "/" + f, { waitUntil: "networkidle" });
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

  // 2) win-path drives using known solutions
  // 2a) nonogram: click every solution-filled cell once
  {
    const { ctx, page, errs } = await fresh();
    try {
      const p = firstBoard("nonogram-daily.json");
      await page.goto(BASE + "/nonogram.html", { waitUntil: "networkidle" });
      await page.waitForSelector("#grid .cell");
      const cells = await page.$$("#grid button.cell");
      if (cells.length !== p.n * p.n) throw new Error(`cell count ${cells.length} != ${p.n * p.n}`);
      for (let i = 0; i < p.sol.length; i++) {
        if (p.sol[i] !== "1") continue;
        // re-query: the client re-renders the grid on every tap
        const cs = await page.$$("#grid button.cell");
        await cs[i].click();
      }
      await page.waitForSelector("#win:not([hidden])", { timeout: 5000 });
      console.log("ok   nonogram WIN path (board solved, win screen shown)");
    } catch (e) { failures.push("nonogram-win: " + e.message.slice(0, 200)); console.log("FAIL nonogram-win", e.message.slice(0, 200)); }
    await ctx.close();
  }

  // 2b) minisudoku (app-latin): tap each non-given cell sol[i] times
  {
    const { ctx, page } = await fresh();
    try {
      const p = firstBoard("minisudoku-daily.json");
      await page.goto(BASE + "/minisudoku.html", { waitUntil: "networkidle" });
      await page.waitForSelector("#grid .cell");
      const cells = await page.$$("#grid button.cell");
      if (cells.length !== p.n * p.n) throw new Error(`cell count ${cells.length} != ${p.n * p.n}`);
      for (let i = 0; i < p.sol.length; i++) {
        if (p.g[i] !== "0") continue;
        const v = parseInt(p.sol[i], 10);
        for (let k = 0; k < v; k++) {
          // re-query: app-latin re-renders the grid on every tap
          const cs = await page.$$("#grid button.cell");
          await cs[i].click();
        }
      }
      await page.waitForSelector("#win:not([hidden])", { timeout: 5000 });
      console.log("ok   minisudoku WIN path");
    } catch (e) { failures.push("minisudoku-win: " + e.message.slice(0, 200)); console.log("FAIL minisudoku-win", e.message.slice(0, 200)); }
    await ctx.close();
  }

  // 2c) thermo: for each thermometer, click the cell at its solution level
  {
    const { ctx, page } = await fresh();
    try {
      const p = firstBoard("thermo-daily.json");
      await page.goto(BASE + "/thermo.html", { waitUntil: "networkidle" });
      await page.waitForSelector("#grid .cell");
      const thermos = p.t.split(";").map((seg) => {
        const t = []; for (let i = 0; i < seg.length; i += 2) t.push([+seg[i], +seg[i + 1]]); return t;
      });
      for (const t of thermos) {
        let lv = 0;
        while (lv < t.length && p.sol[t[lv][0] * p.n + t[lv][1]] === "1") lv++;
        if (lv === 0) continue;
        const [r, c] = t[lv - 1];
        const cs = await page.$$("#grid button.cell");
        await cs[r * p.n + c].click();
      }
      await page.waitForSelector("#win:not([hidden])", { timeout: 5000 });
      console.log("ok   thermo WIN path");
    } catch (e) { failures.push("thermo-win: " + e.message.slice(0, 200)); console.log("FAIL thermo-win", e.message.slice(0, 200)); }
    await ctx.close();
  }

  await browser.close();
  if (failures.length) { console.log("\nFAILURES:\n" + failures.join("\n")); process.exit(1); }
  console.log("\nALL SMOKE TESTS PASSED");
})();
