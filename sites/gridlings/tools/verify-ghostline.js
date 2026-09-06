/* Prove every GHOSTLINE campaign track is drivable and its medal lines are sane,
 * in node, on the same track / physics / AI code the game ships.
 *   node tools/verify-ghostline.js
 */
const path = require("path");
(async () => {
  const base = "file://" + path.join(__dirname, "../games/ghostline/src/");
  const TR = await import(base + "track.js"), PH = await import(base + "physics.js"), AI = await import(base + "ai.js");
  let bad = 0;
  const say = (label, v, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${label.padEnd(30)} ${v}`); if (!ok) bad++; };
  /* a player who only aims at the centre and never brakes: must finish, must lose */
  const naive = (T, c) => { const P = T.P[Math.min(T.P.length - 1, Math.floor(c.s) + 6)]; return { steer: Math.max(-1, Math.min(1, P.k * c.v / (PH.CAR.steer / (1 + Math.pow(c.v / PH.CAR.vmax, 2) * 2.2)) + (0 - c.d) * 0.35 - c.h * 1.2)), brake: false }; };
  for (const [i, cfg] of TR.CAMPAIGN.entries()) {
    const T = TR.makeTrack(cfg.seed, cfg.level);
    const r = TR.rng(cfg.seed * 3 + 1);
    const base = AI.baseline(T), b0 = AI.simulate(T, base);
    const opt = AI.optimize(T, base, 1500, r);
    const nv = PH.run(T, naive);
    const m = AI.medals(opt.t);
    const ok = b0.done && opt.t < 1e8 && nv.done && nv.t <= m.bronze * 1.5 && nv.t > opt.t - 0.3 && T.length >= 400;   /* a near-straight opener may tie */
    say(`L${i + 1} ${T.name} (${T.length}m, ${T.cps.length} cps)`, `baseline ${b0.done ? b0.t.toFixed(1) : "DNF"}s · clone ${opt.t.toFixed(1)}s · naive ${nv.done ? nv.t.toFixed(1) : "DNF"}s (${nv.walls} walls) · gold ${m.gold.toFixed(1)} bronze ${m.bronze.toFixed(1)}`, ok);
  }
  const D = TR.makeTrack(TR.dailySeed(new Date()), 4), od = AI.optimize(D, AI.baseline(D), 60, TR.rng(5));
  say("daily track drivable", `${D.name} ${D.length}m · clone ${od.t.toFixed(1)}s`, od.t < 1e8);
  /* learning must not make the clone slower than what it learned from */
  const T = TR.makeTrack(TR.CAMPAIGN[3].seed, TR.CAMPAIGN[3].level), h = AI.simulate(T, AI.baseline(T));
  const samples = []; { const c = PH.fresh(); const drv = AI.driverFor(AI.baseline(T)); while (!c.done && c.t < 200) { const inp = drv(T, c); PH.step(T, c, inp, 1 / 60); if (Math.floor(c.s) % 2 === 0) samples.push({ s: c.s, d: c.d, brake: inp.brake }); } }
  const learned = AI.optimize(T, AI.learn(T, samples), 150, TR.rng(9));
  say("clone learns from a run", `teacher ${h.t.toFixed(1)}s · clone after study ${learned.t.toFixed(1)}s`, learned.t <= h.t + 0.3);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
