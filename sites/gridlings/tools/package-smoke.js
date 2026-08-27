/* Package deep QA (2026-08-24): extract gridlings-all-11.zip — the exact
   artifact the owner uploads — serve it, and drive EVERY game to a real win
   with zero console/page errors. Also records each game's rendered height so
   the store listing can quote real embed dimensions.
   Usage: node tools/package-smoke.js <extracted-dir> <port> */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { GAME_DRIVERS, dismissIntro } = require("./win-drivers");

const DIR = process.argv[2];
const PORT = process.argv[3] || "8801";
const BASE = "http://127.0.0.1:" + PORT;

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const failures = [], sizes = {};
  for (const [slug, g] of Object.entries(GAME_DRIVERS)) {
    const ctx = await browser.newContext({ viewport: { width: 480, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", e => errs.push(String(e)));
    try {
      const d = JSON.parse(fs.readFileSync(path.join(DIR, slug, g.json), "utf8"));
      // same time-bomb as browser-smoke.firstBoard: the engine loads TODAY's
      // UTC daily, so driving puzzles[0] only worked on the epoch day.
      const keys = Object.keys(d.puzzles).sort();
      const today = new Date().toISOString().slice(0, 10);
      const p = d.puzzles[d.puzzles[today] ? today : keys[0]]; p.n = +p.n;
      await page.goto(`${BASE}/${slug}/`, { waitUntil: "networkidle" });
      await dismissIntro(page);
      await page.waitForFunction(() => document.querySelectorAll("#grid .cell, #grid button").length > 8, null, { timeout: 8000 });
      await g.drive(page, p);
      await page.waitForSelector("#win:not([hidden])", { timeout: 6000 });
      const cta = await page.$("#win a[href*='utm_source=package']");
      if (!cta) throw new Error("win modal missing portal CTA");
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      sizes[slug] = h;
      // beacon 404s (/e is cross-origin here) and portal-CTA hosts are expected noise
      const real = errs.filter(e => !/favicon|501|Unsupported|\/e\b|404|Failed to fetch|ERR_/i.test(e));
      if (real.length) throw new Error("console: " + real.join(" | ").slice(0, 200));
      console.log("WIN ok", slug.padEnd(11), "height", h);
    } catch (e) {
      failures.push(slug + ": " + e.message.slice(0, 220));
      console.log("FAIL  ", slug, e.message.slice(0, 220));
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync("/tmp/pkg-heights.json", JSON.stringify(sizes));
  if (failures.length) { console.log("\nFAILURES:\n" + failures.join("\n")); process.exit(1); }
  console.log("\nALL 11 PACKAGED GAMES: WIN-PATH VERIFIED");
})();
