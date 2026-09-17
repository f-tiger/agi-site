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

/* read a PNG's real dimensions straight from the IHDR chunk -- the covers are
   hard-gated on exact pixel sizes by the portals, so assert instead of trusting */
function sizeOf(f) {
  const b = fs.readFileSync(f);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = await serve(SITE);
  const base = `http://127.0.0.1:${port}/${slug}.html`;
  /* resolved only when videos will actually run: covers are pure screenshots, and
     ONLY=covers should not be blocked by a missing video encoder */
  const FF = process.env.ONLY === "covers" ? null : ffmpegPath();
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const report = [];

  /* ---------- covers: a staged frame of the real game, no mockups ---------- */
  /* itch.io wants a 630x500 cover; same poster recipe, one more size */
  const covers = cfg.poster ? cfg.covers.concat([{ name: "itch", w: 630, h: 500, title: 70, tag: 22 }]) : cfg.covers;
  for (const c of (process.env.ONLY === "videos" ? [] : covers)) {
    /* Render at HALF the target in CSS pixels and screenshot at 2x, instead of
       opening a literal 1920px-wide window. Every game caps its playfield with
       `max-width` (900-1400px), so a 1920 viewport does not make the game
       bigger -- it just adds gutters, and the first covers came out as a small
       cluster of art marooned in a field of empty background. At 960 CSS px
       the playfield fills the frame and deviceScaleFactor 2 restores the pixel
       count. The in-page canvas honours devicePixelRatio, so it is genuinely
       sharper, not upscaled. */
    const dsf = c.dsf || 2;
    const page = await browser.newPage({
      viewport: { width: Math.round(c.w / dsf), height: Math.round(c.h / dsf) },
      deviceScaleFactor: dsf
    });
    if (cfg.poster) {
      /* A POSTER, not a screenshot. On the portal's home page the tile is the
         entire pitch, and every tile that ranks there is the same recipe: a
         saturated full-bleed ground, a heavy outlined wordmark across half the
         width, one hero object blown up large, no HUD, no small text. A
         screenshot with a title band is invisible next to that. The game itself
         stays quiet; only the tile is loud. */
      await page.setContent(cfg.poster({ ...c, w: c.w / dsf, h: c.h / dsf }), { waitUntil: "load" });
    } else {
      await page.goto(base, { waitUntil: "networkidle" });
      await page.waitForFunction(cfg.readyExpr);
      /* title/tag sizes in the config are stated in FINAL pixels, so convert */
      await page.evaluate(cfg.stage({ ...c, title: c.title / dsf, tag: c.tag / dsf }));
    }
    await page.waitForTimeout(180);
    const f = path.join(OUT, `${slug}-cover-${c.name}-${c.w}x${c.h}.png`);
    await page.screenshot({ path: f });
    await page.close();
    const got = await sizeOf(f);
    if (got.w !== c.w || got.h !== c.h) throw new Error(`${path.basename(f)} came out ${got.w}x${got.h}, wanted ${c.w}x${c.h}`);
    report.push(`${path.basename(f)}  ${got.w}x${got.h}  ${(fs.statSync(f).size / 1024) | 0}KB`);
  }

  /* ---------- videos: real gameplay driven by the game's own autopilot ----------
     Frame-stepped, not screen-recorded. Playwright's recordVideo is a debugging
     screencast (JPEG frames -> low-bitrate VP8), and the first trailers were
     shot at 1280x720 then upscaled -- on the portal's hover preview they were
     visibly soft. Here the page runs on a VIRTUAL clock (rAF + timers + now()
     all advance only when __tick() is called), every frame is a lossless PNG
     screenshot at the FINAL pixel size (half-size viewport, deviceScaleFactor 2,
     same recipe as the covers), and ffmpeg encodes the sequence. Deterministic
     and sharp; costs ~1-2 minutes per video. */
  const FPS = 30;
  const CLOCK = require("./_vclock.js");
  for (const v of (process.env.ONLY === "covers" ? [] : cfg.videos)) {
    const frames = path.join(OUT, "_frames_" + v.name);
    fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
    /* TRANSCODE-PROOF framing. The portal re-encodes every upload into a small,
       low-bitrate hover preview, so what survives is big shapes and high
       contrast, not detail. Landscape is therefore laid out at 768x432 CSS px
       (2.5x pixels): the hero objects come out ~2x larger than at 1280x720. */
    const dsf = v.dsf || (v.name === "landscape" ? 2.5 : 2);
    if (!Number.isInteger(v.out.w / dsf) || !Number.isInteger(v.out.h / dsf)) throw new Error(`${v.name}: ${v.out.w}x${v.out.h} not divisible by dsf ${dsf}`);
    const ctx = await browser.newContext({
      viewport: { width: v.out.w / dsf, height: v.out.h / dsf }, deviceScaleFactor: dsf
    });
    await ctx.addInitScript(CLOCK);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => errs.push(e.message));
    /* a real console error is a rejection at the portal; a beacon that cannot
       reach the collector from this sandbox is not (same filter as fleet-smoke) */
    page.on("console", m => { const t = m.text(); if (m.type() === "error" && !/ERR_TUNNEL|ERR_NAME|Failed to load resource/.test(t)) errs.push(t); });
    await page.route("**/play.agiscorecard.com/e", r => r.fulfill({ status: 204, body: "" }));
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForFunction(cfg.readyExpr);
    if (cfg.startSelector) await page.click(cfg.startSelector);
    /* Confetti is the enemy of a low-bitrate transcode: hundreds of moving
       fragments eat the whole bitrate budget and everything else turns to
       blocks. Hint sub-lines and keycaps are unreadable at preview size and
       only add noise. Both are stripped for the trailer only -- the game is
       untouched. */
    await page.evaluate(() => { ["confettiBurst", "squareBurst"].forEach(n => { if (typeof window[n] === "function") window[n] = function () {}; }); });
    await page.addStyleTag({ content: "kbd{display:none!important}footer{display:none!important}#intro .s{display:none!important}" + (cfg.trailerCss || "") });
    await page.evaluate(cfg.autopilot);
    /* let the intro settle without filming it */
    await page.evaluate(ms => { for (let i = 0; i < ms / (1000 / 30); i++) window.__tick(1000 / 30); }, TRIM * 1000);
    let last = null, n = 0;
    const total = SECONDS * FPS;
    while (n < total) {
      await page.evaluate(ms => window.__tick(ms), 1000 / FPS);
      await page.screenshot({ path: path.join(frames, String(n).padStart(5, "0") + ".png"), type: "png" });
      n++;
      if (n % 15 === 0) { last = await page.evaluate(cfg.probeExpr); if (last && last.over) break; }
    }
    await ctx.close();
    if (errs.length) throw new Error("page errors during capture: " + errs.join(" | "));
    const mp4 = path.join(OUT, `${slug}-gameplay-${v.name}-${v.out.w}x${v.out.h}.mp4`);
    await run(FF, ["-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(frames, "%05d.png"),
      "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", "-an", mp4]);
    fs.rmSync(frames, { recursive: true, force: true });
    report.push(`${path.basename(mp4)}  ${(fs.statSync(mp4).size / 1024) | 0}KB  ${(n / FPS).toFixed(1)}s ${n}f  probe=${JSON.stringify(last)}`);
  }
  await browser.close();
  srv.close();
  console.log("\n" + OUT);
  report.forEach(r => console.log("  " + r));
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
