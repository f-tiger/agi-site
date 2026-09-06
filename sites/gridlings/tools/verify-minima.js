/* Prove MINIMA is winnable — every level, by a policy that only uses information
 * the player can actually see (the local slope and the loss readout), driving the
 * game through its own pointer state rather than a private back door.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node tools/verify-minima.js
 *
 * A level that a competent player cannot finish inside its step budget is a level
 * that should not ship; a level the policy finishes every single time is too easy
 * to be worth playing. Both ends are reported.
 */
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.dirname(__dirname);
const SITE = path.join(ROOT, "site");
const TRIALS = Number(process.env.TRIALS || 12);

function serve(dir) {
  const srv = http.createServer((req, res) => {
    const f = path.join(dir, decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end("404"); }
      res.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "application/octet-stream" }); res.end(b); });
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ srv, port: srv.address().port })));
}

(async () => {
  const { srv, port } = await serve(SITE);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
  const errs = [];
  /* deterministic: the game only advances when the policy ticks it, so the
     verdict is the same on a loaded machine as on an idle one */
  await page.addInitScript(require("./_vclock.js"));
  page.on("pageerror", e => errs.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });

  /* record the portal SDK call without a network round trip */
  await page.addInitScript(() => {
    window.__cg = [];
    window.CrazyGames = { SDK: { init: () => Promise.resolve(), game: {
      loadingStart(){}, loadingStop(){}, addSettingsChangeListener(){}, settings: {},
      gameplayStart(){ window.__cg.push(["start", performance.now()]); },
      gameplayStop(){ window.__cg.push(["stop", performance.now()]); },
      happytime(){ window.__cg.push(["happy", performance.now()]); } }, ad: { requestAd(){} } } };
    window.GL_CG = true;
  });
  /* The bridge only rewires mnCg inside the SDK script's onload. sdk.crazygames.com
     is unreachable from this sandbox, so without stubbing the RESPONSE (not just
     window.CrazyGames) onload never fires and the check reports a false blocker. */
  await page.route("**/crazygames-sdk-v3.js", r => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  /* the analytics beacon is a real host we cannot reach here; let it 204 so its
     failures do not drown the console-error check that actually matters */
  await page.route("**/play.agiscorecard.com/e", r => r.fulfill({ status: 204, body: "" }));
  await page.goto(`http://127.0.0.1:${port}/minima.html`, { waitUntil: "networkidle" });
  await page.waitForFunction("window.MN_READY === true");
  await page.evaluate(() => { for (let i = 0; i < 36; i++) window.__tick(1000 / 60); });

  const cg = await page.evaluate("window.__cg");
  console.log(`gameplayStart with zero interaction: ${cg.some(e => e[0] === "start") ? "YES at " + Math.round(cg.find(e => e[0] === "start")[1]) + "ms" : "NO  <-- BLOCKER"}`);

  const nLevels = await page.evaluate("LEVELS.length");
  let bad = 0;
  for (let i = 0; i < nLevels; i++) {
    const r = await page.evaluate(({ i, TRIALS }) => {
      const tick = () => window.__tick(1000 / 60);
      const out = { wins: 0, stepsLeft: [], heats: [], decoys: 0, note: LEVELS[i].note };

      /* how many distinct local minima sit ABOVE the target — i.e. traps that a
         pure downhill player can fall into and never satisfy the goal */
      loadLevel(i);
      const seen = [];
      for (let sy = 0; sy < 40; sy++) for (let sx = 0; sx < 40; sx++) {
        let x = (sx + .5) / 40, y = (sy + .5) / 40;
        for (let k = 0; k < 900; k++) {
          const g = gradAt(x, y), m = Math.hypot(g[0], g[1]);
          if (m < 1e-4) break;
          x = Math.max(0, Math.min(1, x - g[0] / m * 0.004));
          y = Math.max(0, Math.min(1, y - g[1] / m * 0.004));
        }
        if (!seen.some(p => Math.hypot(p[0] - x, p[1] - y) < .05)) seen.push([x, y]);
      }
      out.basins = seen.length;
      out.decoys = seen.filter(p => fieldAt(p[0], p[1]) > target).length;
      out.target = Math.round(-target * 100);
      out.globalMin = Math.round(-fmin * 100);

      /* TWO policies, because one of them is not enough to judge a level.
         A) "follower" only ever walks downhill and jumps when the ground goes
            flat. A level that beats it is not broken - beating it is the DESIGN
            of levels 3-6, so its win rate is a difficulty reading, not a gate.
         B) "explorer" also does the thing the game is actually asking for: when
            downhill stops paying, it commits to a heading and climbs, ridge and
            all. THIS is the one that gates. If the explorer cannot finish a
            level inside its step budget, no player can, and the level ships
            broken. Neither policy reads anything the player cannot see. */
      function play(kind) {
        loadLevel(i);
        armed = true;
        let heats = 0, guard = 0, stall = 0, mode = "descend", pushA = 0, pushLeft = 0, pushT0 = 0;
        let bestSeen = fieldAt(probe.x, probe.y);
        const startX = probe.x, startY = probe.y;
        while (!over && guard < 3000) {
          /* HEAT is now a visible 0.45s jump during which the game ignores
             movement; that is animation, not level design, so it must not eat
             the iteration budget this verdict is based on */
          if (typeof jump !== "undefined" && jump) { tick(); continue; }
          guard++;
          const lo = fieldAt(probe.x, probe.y);
          if (lo < bestSeen - 1e-4) { bestSeen = lo; stall = 0; } else stall++;
          const g = gradAt(probe.x, probe.y), m = Math.hypot(g[0], g[1]);
          if (kind === "explorer" && mode === "push") {
            ptr.on = true;
            ptr.x = Math.max(0, Math.min(1, probe.x + Math.cos(pushA) * 0.12));
            ptr.y = Math.max(0, Math.min(1, probe.y + Math.sin(pushA) * 0.12));
            /* push length in GAME time, not verifier iterations: iteration
               pacing follows the frame rate, and a heavier draw pass was
               shortening every push (explorer 2/12 on a level it had passed) */
            if (nowT - pushT0 >= 0.26 / SPEED || (m > 0.9 && lo < bestSeen - 0.03)) mode = "descend";
          } else if (m < 0.05 || stall > (kind === "explorer" ? 90 : 60)) {
            if (steps >= 90 && (kind === "follower" || Math.random() < 0.5)) { doHeat(); heats++; stall = 0; }
            else if (kind === "explorer") {
              /* keep going the way you were already heading, then fan out - no
                 privileged knowledge of where the deep basin is */
              if (pushLeft === 0 && pushA === 0) pushA = Math.atan2(probe.y - startY, probe.x - startX) || 0;
              else pushA += 2.399;
              pushLeft = 0.26; pushT0 = nowT; mode = "push"; stall = 0;
            } else break;
          } else if (m > 1e-9) {
            ptr.on = true;
            ptr.x = Math.max(0, Math.min(1, probe.x - g[0] / m * 0.12));
            ptr.y = Math.max(0, Math.min(1, probe.y - g[1] / m * 0.12));
          }
          tick();
        }
        ptr.on = false;
        return { won: won, left: Math.round(steps), heats: heats };
      }

      out.follower = { wins: 0, left: [], heats: [] };
      out.explorer = { wins: 0, left: [], heats: [] };
      for (let t = 0; t < TRIALS; t++) {
        for (const kind of ["follower", "explorer"]) {
          const r = play(kind);
          const bucket = out[kind];
          if (r.won) { bucket.wins++; bucket.left.push(r.left); }
          bucket.heats.push(r.heats);          /* recorded for EVERY trial: the
             first version only pushed on a win, so a level with zero wins always
             printed "heats ~0" and looked like the policy had never tried */
        }
      }
      return out;
    }, { i, TRIALS });

    const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
    const fRate = r.follower.wins / TRIALS, eRate = r.explorer.wins / TRIALS;
    let verdict = "ok";
    if (eRate < 0.5) { verdict = "BROKEN"; bad++; }            /* nobody can finish it */
    else if (i > 1 && fRate === 1) verdict = "trivial?";        /* downhill alone wins it */
    console.log(
      `L${i + 1} ${verdict.padEnd(9)} follower ${r.follower.wins}/${TRIALS} (heats ~${avg(r.follower.heats)})  ` +
      `explorer ${r.explorer.wins}/${TRIALS} (heats ~${avg(r.explorer.heats)}, steps left ~${avg(r.explorer.left)})  ` +
      `basins ${r.basins} (${r.decoys} above target)  target ${r.target}/min ${r.globalMin}  — ${r.note}`);
  }

  if (errs.length) { console.log("\nPAGE ERRORS:"); errs.forEach(e => console.log("  " + e)); }
  await browser.close(); srv.close();
  process.exit(bad || errs.length ? 1 : 0);
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
