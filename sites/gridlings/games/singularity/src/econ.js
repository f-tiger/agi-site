/* ===== the economy, homepage-grade =====
   Four generators with milestone doublings, twenty model tiers with real
   training time, a research tree bought with research points, achievements that
   pay a permanent bonus, a daily streak, offline progress with an "away report",
   and the game's own idea: models that go rogue, and alignment as prestige. */
export const TIERS = ["v0.1", "v0.5", "v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9", "v10", "v11", "v12", "AGI-1", "AGI-2", "AGI-3", "ASI-1", "ASI-2", "ASI-3"];
export const MILES = [25, 50, 100, 250, 500];
export const GENS = {
  agent: { name: "Labeling agent", base: 15, growth: 1.15, unit: "data/s", desc: "labels data on its own" },
  gpu: { name: "GPU rack", base: 60, growth: 1.62, unit: "", desc: "+1 tier unlocked · +revenue" },
  dataset: { name: "Proprietary dataset", base: 200, growth: 1.9, unit: "", desc: "+20% to all data gains" },
  researcher: { name: "Researcher", base: 500, growth: 1.7, unit: "RP/s", desc: "produces research points" }
};
export const RESEARCH = [
  { id: "synthetic", name: "Synthetic data", cost: 20, desc: "agents label 2× faster" },
  { id: "active", name: "Active learning", cost: 35, desc: "every tap is worth 3×" },
  { id: "mixedp", name: "Mixed precision", cost: 60, desc: "training runs take half the time" },
  { id: "flash", name: "Flash attention", cost: 100, desc: "+50% revenue" },
  { id: "rlhf", name: "RLHF", cost: 150, desc: "models go rogue half as often" },
  { id: "interp", name: "Interpretability", cost: 220, desc: "shutting a rogue model down gives +2 alignment" },
  { id: "scaling", name: "Scaling laws", cost: 320, desc: "each GPU rack gives +14% revenue instead of +8%" },
  { id: "flywheel", name: "Data flywheel", cost: 480, desc: "datasets give +40% each" },
  { id: "moe", name: "Mixture of experts", cost: 700, desc: "revenue ×2" },
  { id: "distill", name: "Distillation", cost: 1000, desc: "training runs take half the time, again" },
  { id: "constitution", name: "Constitutional training", cost: 1500, desc: "a rogue model left running eats data only 10% of the time" },
  { id: "autoresearch", name: "Automated research", cost: 2200, desc: "researchers produce 2×" },
  { id: "agentic", name: "Agentic labeling", cost: 3200, desc: "agents label 3× faster" },
  { id: "inference", name: "Inference optimisation", cost: 4800, desc: "revenue ×2" },
  { id: "selfimprove", name: "Recursive self-improvement", cost: 7000, desc: "every trained tier adds +5% revenue to all" },
  { id: "taxcut", name: "Alignment dividend", cost: 10000, desc: "each alignment point gives +12% instead of +8%" }
];
export const ACH = [
  { id: "c100", name: "100 labels", test: s => s.clicks >= 100 }, { id: "c1k", name: "1,000 labels", test: s => s.clicks >= 1000 },
  { id: "c10k", name: "10,000 labels", test: s => s.clicks >= 10000 }, { id: "c100k", name: "100,000 labels", test: s => s.clicks >= 100000 },
  { id: "a10", name: "10 agents", test: s => s.gen.agent >= 10 }, { id: "a100", name: "100 agents", test: s => s.gen.agent >= 100 },
  { id: "g10", name: "10 GPU racks", test: s => s.gen.gpu >= 10 }, { id: "g50", name: "50 GPU racks", test: s => s.gen.gpu >= 50 },
  { id: "m5", name: "Five models", test: s => s.models >= 5 }, { id: "m10", name: "Ten models", test: s => s.models >= 10 }, { id: "m20", name: "ASI-3 trained", test: s => s.models >= 20 },
  { id: "e1e5", name: "$100K earned", test: s => s.lifetime >= 1e5 }, { id: "e1e7", name: "$10M earned", test: s => s.lifetime >= 1e7 },
  { id: "e1e9", name: "$1B earned", test: s => s.lifetime >= 1e9 }, { id: "e1e12", name: "$1T earned", test: s => s.lifetime >= 1e12 },
  { id: "al5", name: "Alignment 5", test: s => s.align >= 5 }, { id: "al25", name: "Alignment 25", test: s => s.align >= 25 }, { id: "al100", name: "Alignment 100", test: s => s.align >= 100 },
  { id: "sh1", name: "First release", test: s => s.prestige >= 1 }, { id: "sh5", name: "Five releases", test: s => s.prestige >= 5 },
  { id: "rs5", name: "Shut down 5 rogue models", test: s => s.stat.shutdown >= 5 }, { id: "rr5", name: "Let 5 rogue models run", test: s => s.stat.run >= 5 },
  { id: "rp8", name: "8 research papers", test: s => s.research.length >= 8 }, { id: "rp16", name: "The whole tree", test: s => s.research.length >= RESEARCH.length },
  { id: "off1", name: "Collected offline earnings", test: s => s.stat.offline >= 1 }, { id: "d7", name: "7-day streak", test: s => s.streak >= 7 }
];
export const MILESTONES = [
  { id: "knowledge-work", name: "Agents do the knowledge work", test: s => s.gen.agent >= 10 },
  { id: "compute-scaling", name: "Compute scaled 10×", test: s => s.gen.gpu >= 10 },
  { id: "capex", name: "The capex is real", test: s => s.lifetime >= 1e6 },
  { id: "open-source-fades", name: "Five proprietary datasets", test: s => s.gen.dataset >= 5 },
  { id: "the-project", name: "The Project ships its first model", test: s => s.prestige >= 1 },
  { id: "intelligence-explosion", name: "Revenue past $10K/s", test: s => revenue(s) >= 1e4 },
  { id: "agi-2027", name: "AGI trained", test: s => s.models >= 15 },
  { id: "superintelligence", name: "ASI trained", test: s => s.models >= 18 }
];
export const SKINS = [
  { id: "core", name: "Core", req: s => true, how: "default" },
  { id: "prism", name: "Prism", req: s => s.models >= 3, how: "train 3 models" },
  { id: "shard", name: "Shard", req: s => s.prestige >= 1, how: "ship a model" },
  { id: "knot", name: "Knot", req: s => s.gen.gpu >= 25, how: "25 GPU racks" },
  { id: "sun", name: "Sun", req: s => s.align >= 10, how: "alignment 10" },
  { id: "void", name: "Void", req: s => s.stat.run >= 5, how: "let 5 rogue models run" },
  { id: "halo", name: "Halo", req: s => s.research.length >= 8, how: "8 research papers" },
  { id: "apex", name: "Apex", req: s => s.models >= 15, how: "train AGI" }
];
/* short missions: three at a time, replaced on completion; the reward scales with
   the run so they never go stale */
export const MISSION_POOL = [
  { id: "tap", text: n => "Label " + n + " data by tapping", n: s => 60 + Math.round(s.clicks * 0.15), key: "clicks" },
  { id: "agents", text: n => "Hire " + n + " labeling agents", n: s => 3 + Math.floor(s.gen.agent * 0.1), key: "gen.agent" },
  { id: "gpus", text: n => "Add " + n + " GPU racks", n: s => 2 + Math.floor(s.gen.gpu * 0.15), key: "gen.gpu" },
  { id: "train", text: n => "Finish " + n + " training run" + (n > 1 ? "s" : ""), n: s => 1, key: "models" },
  { id: "earn", text: n => "Earn $" + fmt(n), n: s => Math.max(500, Math.round(revenue(s) * 120)), key: "lifetime" },
  { id: "rp", text: n => "Collect " + n + " research points", n: s => Math.max(3, Math.round(rpRate(s) * 180 + 3)), key: "rpTotal" },
  { id: "rogue", text: n => "Resolve a rogue model", n: s => 1, key: "rogueTotal" }
];
export const B = { OFFLINE_MAX: 8 * 3600, OFFLINE_RATE: 0.5, trainCost: t => Math.round(20 * Math.pow(3.0, t)), modelRev: t => Math.pow(2.0, t),
  trainTime: t => 3 * Math.pow(1.7, t), shipAt: p => 250000 * Math.pow(4, p), rogueEvery: 150 };
export function fresh() {
  return { data: 0, money: 0, rp: 0, gen: { agent: 0, gpu: 0, dataset: 0, researcher: 0 }, clickLv: 0, models: 0, training: null,
    research: [], ach: {}, ms: {}, stat: { shutdown: 0, run: 0, offline: 0 }, earned: 0, lifetime: 0, prestige: 0, align: 0, clicks: 0,
    combo: 0, comboT: 0, rogue: null, boost: 0, nextRogue: B.rogueEvery + Math.random() * 90, t: 0, streak: 0, lastDaily: 0, savedAt: Date.now(), started: Date.now(),
    skin: "core", missions: [], missionsDone: 0, nextCache: 90 + Math.random() * 60, tapBoost: 0, rpTotal: 0, rogueTotal: 0, caches: 0 };
}
export const has = (s, id) => s.research.indexOf(id) >= 0;
const mile = (s, g) => Math.pow(2, MILES.filter(m => s.gen[g] >= m).length);
export const achBonus = s => 1 + 0.01 * Object.keys(s.ach).length;
export const alignMult = s => 1 + (has(s, "taxcut") ? 0.12 : 0.08) * s.align;
export const dataMult = s => (1 + (has(s, "flywheel") ? 0.4 : 0.2) * s.gen.dataset) * mile(s, "dataset") * alignMult(s);
export const comboMult = s => Math.min(5, 1 + Math.floor(s.combo / 8));
export const clickPower = s => (1 + s.clickLv) * (has(s, "active") ? 3 : 1) * (s.tapBoost > 0 ? 5 : 1) * dataMult(s);
export const dataRate = s => s.gen.agent * 0.5 * (has(s, "synthetic") ? 2 : 1) * (has(s, "agentic") ? 3 : 1) * mile(s, "agent") * dataMult(s);
export const rpRate = s => s.gen.researcher * 0.05 * (has(s, "autoresearch") ? 2 : 1) * mile(s, "researcher");
export function revenue(s) {
  let r = 0; for (let t = 0; t < s.models; t++) r += B.modelRev(t);
  r *= 1 + (has(s, "scaling") ? 0.14 : 0.08) * s.gen.gpu; r *= mile(s, "gpu");
  if (has(s, "flash")) r *= 1.5; if (has(s, "moe")) r *= 2; if (has(s, "inference")) r *= 2;
  if (has(s, "selfimprove")) r *= 1 + 0.05 * s.models;
  return r * alignMult(s) * achBonus(s) * (s.boost > 0 ? 2 : 1);
}
export const trainTime = (s, t) => B.trainTime(t) * (has(s, "mixedp") ? .5 : 1) * (has(s, "distill") ? .5 : 1);
export const cost = {
  agent: s => Math.round(GENS.agent.base * Math.pow(GENS.agent.growth, s.gen.agent)),
  gpu: s => Math.round(GENS.gpu.base * Math.pow(GENS.gpu.growth, s.gen.gpu)),
  dataset: s => Math.round(GENS.dataset.base * Math.pow(GENS.dataset.growth, s.gen.dataset)),
  researcher: s => Math.round(GENS.researcher.base * Math.pow(GENS.researcher.growth, s.gen.researcher)),
  click: s => Math.round(25 * Math.pow(1.9, s.clickLv))
};
export function nextMile(s, g) { for (const m of MILES) if (s.gen[g] < m) return m; return null; }
export function nextTrain(s) {
  if (s.models >= TIERS.length) return null;
  const t = s.models; return { tier: t, name: TIERS[t], data: B.trainCost(t), gpus: t, time: trainTime(s, t), ok: !s.training && s.data >= B.trainCost(t) && s.gen.gpu >= t };
}
export function buy(s, what) {
  const c = cost[what](s); if (s.money < c) return false;
  s.money -= c; if (what === "click") s.clickLv++; else s.gen[what]++; return true;
}
export function buyResearch(s, id) {
  const r = RESEARCH.find(x => x.id === id); if (!r || has(s, id) || s.rp < r.cost) return false;
  s.rp -= r.cost; s.research.push(id); return true;
}
export function train(s) {
  const n = nextTrain(s); if (!n || !n.ok) return false;
  s.data -= n.data; s.training = { tier: n.tier, left: n.time, total: n.time }; return true;
}
export function canShip(s) { return s.earned >= B.shipAt(s.prestige); }
export const shipGain = s => Math.max(1, Math.floor(Math.sqrt(s.earned / 2000)));
export function ship(s) {
  if (!canShip(s)) return 0;
  const g = shipGain(s); s.align += g; s.prestige++;
  s.data = 0; s.money = 0; s.rp = Math.floor(s.rp * 0.5); s.gen = { agent: 0, gpu: 0, dataset: 0, researcher: 0 }; s.clickLv = 0; s.models = 0; s.training = null; s.earned = 0;
  s.rogue = null; s.boost = 0; s.nextRogue = B.rogueEvery + Math.random() * 90; s.missions = []; return g;
}
export function click(s) {
  s.combo = s.comboT > 0 ? s.combo + 1 : 1; s.comboT = 0.35;
  const p = clickPower(s) * comboMult(s); s.data += p; s.clicks++;
  let cache = false;
  if (s.clicks >= s.nextCache) { s.nextCache = s.clicks + 60 + Math.random() * 100; cache = true; }
  return { p, cache };
}
/* a data cache dropped on the floor: tap it in time for a random reward */
export function openCache(s) {
  s.caches++;
  const roll = s.t < 180 ? 1 : Math.random(), warm = Math.min(1, s.t / 600);
  /* rewards are a slice of the CURRENT run scaled up over the first ten minutes,
     never a lump sum: a cache in the first minute must not buy the first minute
     (the first three minutes only ever drop the tap boost) */
  if (roll < 0.45) { const m = (revenue(s) * 45 + 10 * (s.models + 1)) * warm; s.money += m; s.earned += m; s.lifetime += m; return { kind: "money", amount: m }; }
  if (roll < 0.75) {
    if (s.gen.researcher > 0) { const r = Math.max(1, Math.round(rpRate(s) * 90 * warm)); s.rp += r; s.rpTotal += r; return { kind: "rp", amount: r }; }
    const d = clickPower(s) * 8 * warm; s.data += d; return { kind: "data", amount: d };
  }
  s.tapBoost = 20; return { kind: "boost", amount: 20 };
}
const getKey = (s, key) => key === "gen.agent" ? s.gen.agent : key === "gen.gpu" ? s.gen.gpu : s[key];
export function newMission(s) {
  const used = s.missions.map(m => m.id);
  const pool = MISSION_POOL.filter(m => used.indexOf(m.id) < 0 && (m.id !== "rogue" || s.models >= 3) && (m.id !== "rp" || s.gen.researcher > 0));
  const t = pool[Math.floor(Math.random() * pool.length)];
  const n = t.n(s); return { id: t.id, text: t.text(n), key: t.key, base: getKey(s, t.key), n, reward: { money: Math.round((revenue(s) * 60 + 5 * (s.models + 1)) * Math.min(1, s.t / 600)), rp: s.gen.researcher > 0 ? Math.round((2 + s.research.length) * Math.min(1, s.t / 600)) : 0 } };
}
export function missionProgress(s, m) { return Math.max(0, Math.min(1, (getKey(s, m.key) - m.base) / m.n)); }
export function fillMissions(s) { while (s.missions.length < 3) s.missions.push(newMission(s)); }
export function tick(s, dt) {
  const out = []; s.t += dt;
  s.data += dataRate(s) * dt; s.rp += rpRate(s) * dt;
  const r = revenue(s) * dt; s.money += r; s.earned += r; s.lifetime += r;
  s.rpTotal += rpRate(s) * dt;
  if (s.boost > 0) s.boost = Math.max(0, s.boost - dt);
  if (s.tapBoost > 0) s.tapBoost = Math.max(0, s.tapBoost - dt);
  fillMissions(s);
  for (let i = s.missions.length - 1; i >= 0; i--) {
    const m = s.missions[i];
    if (missionProgress(s, m) >= 1) { s.money += m.reward.money; s.earned += m.reward.money; s.lifetime += m.reward.money; s.rp += m.reward.rp; s.rpTotal += m.reward.rp; s.missionsDone++; s.missions.splice(i, 1); out.push({ type: "mission", m }); }
  }
  if (s.comboT > 0) { s.comboT -= dt; if (s.comboT <= 0) s.combo = 0; }
  if (s.training) { s.training.left -= dt; if (s.training.left <= 0) { s.models = Math.max(s.models, s.training.tier + 1); out.push({ type: "trained", tier: s.training.tier }); s.training = null; } }
  if (s.rogue) { s.rogue.left -= dt; if (s.rogue.left <= 0) { out.push({ type: "rogue-auto" }); resolveRogue(s, "shutdown"); } }
  else if (s.models >= 3) { s.nextRogue -= dt; if (s.nextRogue <= 0) { s.rogue = { tier: Math.floor(Math.random() * s.models), left: 20 }; out.push({ type: "rogue" }); } }
  for (const m of MILESTONES) if (!s.ms[m.id] && m.test(s)) { s.ms[m.id] = Date.now(); out.push({ type: "milestone", m }); }
  for (const a of ACH) if (!s.ach[a.id] && a.test(s)) { s.ach[a.id] = Date.now(); out.push({ type: "ach", a }); }
  return out;
}
export function resolveRogue(s, choice) {
  if (!s.rogue) return null;
  const tier = s.rogue.tier; s.rogue = null; s.rogueTotal++; s.nextRogue = B.rogueEvery * (has(s, "rlhf") ? 2 : 1) + Math.random() * 90;
  if (choice === "shutdown") { const g = has(s, "interp") ? 2 : 1; s.models = Math.max(0, s.models - 1); s.align += g; s.stat.shutdown++; return { choice, tier, align: g }; }
  s.boost = 60; s.stat.run++;
  const ate = Math.random() < (has(s, "constitution") ? 0.1 : 0.3); if (ate) s.data = 0;
  return { choice, tier, ate };
}
/* what happened while the tab was closed */
export function offline(s, now) {
  const dt = Math.max(0, Math.min(B.OFFLINE_MAX, (now - s.savedAt) / 1000));
  if (dt < 60) return null;
  const rep = { dt, gain: revenue(s) * dt * B.OFFLINE_RATE, dgain: dataRate(s) * dt * B.OFFLINE_RATE, rpgain: rpRate(s) * dt * B.OFFLINE_RATE, trained: null, rogues: 0 };
  s.data += rep.dgain; s.rp += rep.rpgain;
  if (s.training) { s.training.left -= dt; if (s.training.left <= 0) { s.models = Math.max(s.models, s.training.tier + 1); rep.trained = s.training.tier; s.training = null; } }
  if (s.models >= 3) { rep.rogues = Math.min(6, Math.floor(dt / (B.rogueEvery * (has(s, "rlhf") ? 2 : 1) + 45))); s.align += rep.rogues; s.stat.shutdown += rep.rogues; }
  return rep;
}
export const dayKey = ms => Math.floor((ms + new Date(ms).getTimezoneOffset() * -60000) / 86400000);
export function daily(s, now) {
  const today = dayKey(now); if (s.lastDaily === today) return null;
  s.streak = s.lastDaily === today - 1 ? Math.min(7, s.streak + 1) : 1; s.lastDaily = today;
  const money = Math.max(100, revenue(s) * 300) * s.streak, rp = 2 * s.streak;
  s.money += money; s.earned += money; s.lifetime += money; s.rp += rp;
  return { streak: s.streak, money, rp };
}
export function fmt(n) {
  if (!isFinite(n)) return "∞";
  const a = Math.abs(n);
  if (a < 1000) return a < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.round(n).toString();
  const u = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No"]; let i = -1, v = n;
  while (Math.abs(v) >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  return (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)) + u[i];
}
export function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? h + "h " + m + "m" : m ? m + "m " + s + "s" : s + "s";
}
