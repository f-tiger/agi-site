/* Produce every asset a portal submission needs, from the live game itself.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node tools/capture-store-assets.js overfit
 *
 * Outputs into dist-store/<slug>/ : three covers (landscape / portrait / square)
 * and two gameplay videos (landscape 1920x1080, portrait 1080x1920, H.264).
 *
 * Why this exists: the covers and the trailer must be RECORDED FROM THE REAL
 * GAME, and the trailer must demonstrate the signature mechanic — a bot that
 * just survives produces a clip that sells nothing. So each game ships a config
 * under tools/store-assets/<slug>.js providing an autopilot (drives the real
 * input state, no cheats) and a staged frame for the covers.
 *
 * Two environment facts learned the hard way (2026-09-05):
 *  - Playwright's bundled ffmpeg is a stripped build: VP8/webm only, NO h264.
 *    Portals want mp4, so this needs `npm i ffmpeg-static` (a one-off download;
 *    the repo itself stays dependency-free).
 *  - crazygames.com AND docs.crazygames.com are both blocked by the sandbox
 *    egress proxy, so specs can only be checked via WebSearch, never read.
 */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.dirname(__dirname);
const SITE = path.join(ROOT, "site");
const slug = process.argv[2];
if (!slug) { console.error("usage: node tools/capture-store-assets.js <slug>"); process.exit(1); }
const cfg = require(path.join(ROOT, "tools", "store-assets", slug + ".js"));
const OUT = path.join(ROOT, "dist-store", slug);
const SECONDS = Number(process.env.SECONDS || 16);
const TRIM = Number(process.env.TRIM || 1.2);   // drop the pre-start beat

function ffmpegPath() {
  try { return require("ffmpeg-static"); } catch (e) {
    console.error("ffmpeg-static not installed. Run:  npm i ffmpeg-static\n" +
                  "(Playwright's own ffmpeg cannot encode h264 — webm only.)");
    process.exit(1);
  }
}
function serve(dir) {
  const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
                  ".png": "image/png", ".txt": "text/plain", ".xml": "application/xml" };
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
function run(bin, args) {
  return new Promise((res, rej) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", d => (err += d));
    p.on("close", c => (c === 0 ? res() : rej(new Error(err.slice(-800)))));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = await serve(SITE);
  const base = `http://127.0.0.1:${port}/${slug}.html`;
  const FF = ffmpegPath();
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const report = [];

  /* ---------- covers: a staged frame of the real game, no mockups ---------- */
  for (const c of cfg.covers) {
    const page = await browser.newPage({ viewport: { width: c.w, height: c.h } });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForFunction(cfg.readyExpr);
    await page.evaluate(cfg.stage(c));
    await page.waitForTimeout(180);
    const f = path.join(OUT, `${slug}-cover-${c.name}-${c.w}x${c.h}.png`);
    await page.screenshot({ path: f });
    await page.close();
    report.push(`${path.basename(f)}  ${(fs.statSync(f).size / 1024) | 0}KB`);
  }

  /* ---------- videos: real gameplay driven by the game's own autopilot ---------- */
  for (const v of cfg.videos) {
    const raw = path.join(OUT, "_raw_" + v.name);
    fs.rmSync(raw, { recursive: true, force: true });
    const ctx = await browser.newContext({
      viewport: { width: v.rec.w, height: v.rec.h },
      recordVideo: { dir: raw, size: { width: v.rec.w, height: v.rec.h } }
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => errs.push(e.message));
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForFunction(cfg.readyExpr);
    if (cfg.startSelector) await page.click(cfg.startSelector);
    await page.evaluate(cfg.autopilot);
    const t0 = Date.now();
    let last = null;
    while ((Date.now() - t0) / 1000 < SECONDS + TRIM) {
      await page.waitForTimeout(500);
      last = await page.evaluate(cfg.probeExpr);
      if (last && last.over) break;
    }
    await ctx.close();
    if (errs.length) throw new Error("page errors during capture: " + errs.join(" | "));
    const webm = fs.readdirSync(raw).find(f => f.endsWith(".webm"));
    const mp4 = path.join(OUT, `${slug}-gameplay-${v.name}-${v.out.w}x${v.out.h}.mp4`);
    await run(FF, ["-v", "error", "-y", "-ss", String(TRIM), "-t", String(SECONDS),
      "-i", path.join(raw, webm),
      "-vf", `scale=${v.out.w}:${v.out.h}:flags=lanczos,fps=30`,
      "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", "-an", mp4]);
    fs.rmSync(raw, { recursive: true, force: true });
    report.push(`${path.basename(mp4)}  ${(fs.statSync(mp4).size / 1024) | 0}KB  ${SECONDS}s  probe=${JSON.stringify(last)}`);
  }
  await browser.close();
  srv.close();
  console.log("\n" + OUT);
  report.forEach(r => console.log("  " + r));
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
