/* Prove the SINGULARITY INC. economy has the shape the PRD promises, without a
 * browser: a plain greedy player (tap 4x/s while nothing is affordable, buy the
 * cheapest useful thing, train whenever possible, buy the cheapest research)
 * must hit the pacing marks -- and must NOT run out of content in three hours.
 *
 *   node tools/verify-singularity.js
 */
const path = require("path"), fs = require("fs");
const src = fs.readFileSync(path.join(__dirname, "../games/singularity/src/econ.js"), "utf8")
  .replace(/^export const /gm, "const ").replace(/^export function /gm, "function ");
const E = new Function(src + "\nreturn { B, TIERS, MILES, GENS, RESEARCH, ACH, MILESTONES, SKINS, fresh, buy, buyResearch, train, canShip, ship, click, tick, revenue, dataRate, rpRate, nextTrain, cost, fmt, resolveRogue, offline, daily, has, openCache, missionProgress };")();
function play(seconds) {
  const S = E.fresh(); S.nextRogue = 1e9;
  const m = { firstBuy: null, firstTrain: null, models: {}, ship: null, research: {} };
  const dt = 0.25;
  for (let t = 0; t < seconds; t += dt) {
    if (t < 120 || (S.models === 0 && !S.training)) for (let k = 0; k < 4 * dt; k++) { const c = E.click(S); if (c.cache) { E.openCache(S); m.caches = (m.caches || 0) + 1; } }
    const n = E.nextTrain(S);
    if (n && n.ok) E.train(S);
    let bought = true;
    while (bought) {
      bought = false;
      if (n && !n.ok && !S.training && S.gen.gpu < n.gpus && S.money >= E.cost.gpu(S)) { E.buy(S, "gpu"); bought = true; }
      else {
        const opts = ["agent", "gpu", "dataset", "researcher", "click"].map(w => [w, E.cost[w](S)])
          .filter(([w, c]) => S.money >= c && (w !== "gpu" || S.gen.gpu < S.models + 2) && (w !== "click" || S.clickLv < 8));
        if (opts.length) { opts.sort((a, b) => a[1] - b[1]); E.buy(S, opts[0][0]); bought = true; }
      }
      if (bought && m.firstBuy === null) m.firstBuy = t;
    }
    for (const r of E.RESEARCH) if (!E.has(S, r.id) && S.rp >= r.cost) { E.buyResearch(S, r.id); m.research[r.id] = t; break; }
    if (E.canShip(S) && m.ship === null) m.ship = t;
    const before = S.models;
    E.tick(S, dt);
    if (S.models > before) { if (m.firstTrain === null) m.firstTrain = t; m.models[S.models] = t; }
  }
  return { S, m };
}
const r = play(3 * 3600), m = r.m, fails = [];
const say = (label, v, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${label.padEnd(36)} ${v}`); if (!ok) fails.push(label); };
say("first purchase", m.firstBuy === null ? "never" : m.firstBuy.toFixed(0) + "s", m.firstBuy !== null && m.firstBuy <= 60);
say("first model live", m.firstTrain === null ? "never" : m.firstTrain.toFixed(0) + "s", m.firstTrain !== null && m.firstTrain <= 120);
say("fifth model (v3)", m.models[5] === undefined ? "never" : (m.models[5] / 60).toFixed(1) + "min", m.models[5] !== undefined && m.models[5] <= 15 * 60);
say("first ship available", m.ship === null ? "never" : (m.ship / 60).toFixed(1) + "min", m.ship !== null && m.ship >= 15 * 60 && m.ship <= 45 * 60);
say("first research bought", Object.values(m.research).length ? (Math.min(...Object.values(m.research)) / 60).toFixed(1) + "min" : "never", Object.values(m.research).length > 0 && Math.min(...Object.values(m.research)) <= 20 * 60);
const S = r.S, achLeft = E.ACH.filter(a => !S.ach[a.id]).length, rsLeft = E.RESEARCH.length - S.research.length;
say("content left after 3h", `${S.models}/${E.TIERS.length} tiers · ${rsLeft} papers · ${achLeft} achievements`, S.models < E.TIERS.length || rsLeft > 0 || achLeft > 4);
say("revenue at 3h", "$" + E.fmt(E.revenue(S)) + "/s", E.revenue(S) > 1000);
say("missions completed in 3h", S.missionsDone + " (3 always open: " + S.missions.length + ")", S.missionsDone >= 10 && S.missions.length === 3);
say("data caches in first 2 min", (m.caches || 0) + "", (m.caches || 0) >= 1);
say("skins unlocked by 3h", E.SKINS.filter(k => k.req(S)).length + "/" + E.SKINS.length, E.SKINS.filter(k => k.req(S)).length >= 3 && E.SKINS.filter(k => k.req(S)).length < E.SKINS.length);
console.log(`     3h state: agents ${S.gen.agent} · gpus ${S.gen.gpu} · datasets ${S.gen.dataset} · researchers ${S.gen.researcher} · earned $${E.fmt(S.earned)} · research ${S.research.length}`);
const S2 = E.fresh(); S2.models = 5; S2.rogue = { tier: 2, left: 20 }; E.resolveRogue(S2, "run");
say("rogue 'run' doubles revenue 60s", S2.boost + "s", S2.boost === 60);
const S3 = E.fresh(); S3.models = 5; S3.rogue = { tier: 2, left: 20 }; E.resolveRogue(S3, "shutdown");
say("rogue 'shutdown': -1 model, +1 align", S3.models + " models, align " + S3.align, S3.models === 4 && S3.align === 1);
const S4 = E.fresh(); S4.models = 4; S4.gen.agent = 5; S4.savedAt = Date.now() - 3 * 3600 * 1000; const off = E.offline(S4, Date.now());
say("offline 3h report", off ? "$" + E.fmt(off.gain) + ", rogues " + off.rogues : "none", !!off && off.gain > 0 && off.rogues >= 1);
const S5 = E.fresh(); const d1 = E.daily(S5, Date.now()); const d2 = E.daily(S5, Date.now());
say("daily claims once per day", d1 ? "day " + d1.streak + ", second call " + (d2 ? "PAID AGAIN" : "blocked") : "none", !!d1 && !d2);
process.exit(fails.length ? 1 : 0);
