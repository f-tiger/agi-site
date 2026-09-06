import { makeScene } from "./scene.js";
import * as E from "./econ.js";

/* ===== CrazyGames bridge (same contract as the other five) ===== */
const CG = (function () {
  let on = window.GL_CG === true || /(^|[?&])cg=1/.test(location.search);
  if (!on) { try { on = /crazygames\./.test(document.referrer); } catch (e) {} }
  window.GL_CG = on;
  const q = []; let sdk = null;
  const api = { on, ev: e => { if (on) q.push(e); }, ad: (type, done) => done(false), data: null };
  if (!on) return api;
  document.documentElement.classList.add("cg");
  if (/[?&]muteAudio=true/.test(location.search)) window.GL_SDK_MUTE = true;
  const s = document.createElement("script"); s.src = "https://sdk.crazygames.com/crazygames-sdk-v3.js"; s.async = true;
  s.onload = () => {
    try {
      window.CrazyGames.SDK.init().then(() => {
        sdk = window.CrazyGames.SDK; const g = sdk.game;
        try { const st = g.settings; if (st && typeof st.muteAudio === "boolean") window.GL_SDK_MUTE = st.muteAudio;
          g.addSettingsChangeListener(s2 => { if (s2 && typeof s2.muteAudio === "boolean") window.GL_SDK_MUTE = s2.muteAudio; }); } catch (e) {}
        try { g.loadingStart(); } catch (e) {} try { g.loadingStop(); } catch (e) {}
        api.ev = e => { try { if (e === "start") g.gameplayStart(); else if (e === "stop") g.gameplayStop(); else if (e === "happy") g.happytime(); } catch (x) {} };
        q.splice(0).forEach(api.ev);
        api.ad = (type, done) => {
          let f = false; const end = ok => { if (!f) { f = true; done(ok); } };
          try { sdk.ad.requestAd(type, { adFinished: () => end(true), adError: () => end(false), adStarted: () => {} }); setTimeout(() => end(false), 25000); }
          catch (e) { end(false); }
        };
        try { api.data = sdk.data; } catch (e) {}
      }).catch(() => {});
    } catch (e) {}
  };
  document.head.appendChild(s);
  return api;
})();
function ev(n, l) {
  try {
    const d = JSON.stringify({ n, l: l || "sg", p: "/singularity" }), u = "https://play.agiscorecard.com/e";
    if (navigator.sendBeacon) navigator.sendBeacon(u, new Blob([d], { type: "application/json" }));
    else fetch(u, { method: "POST", body: d, keepalive: true, mode: "cors" }).catch(() => {});
  } catch (e) {}
}

/* ===== audio ===== */
let AC = null, muted = false;
try { muted = localStorage.getItem("sgMute") === "1"; } catch (e) {}
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === "suspended") { try { AC.resume(); } catch (e) {} } return AC; }
function tone(f, t0, dur, type, gain, slide) {
  const a = ac(); if (!a || muted || window.GL_SDK_MUTE) return;
  try { const o = a.createOscillator(), g = a.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, a.currentTime + t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, a.currentTime + t0 + dur);
    g.gain.setValueAtTime(0, a.currentTime + t0); g.gain.linearRampToValueAtTime(gain || .1, a.currentTime + t0 + .012); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + .02); } catch (e) {}
}
function noise(dur, freq, gain, t0) {
  const a = ac(); if (!a || muted || window.GL_SDK_MUTE) return;
  try { const n = a.createBufferSource(), b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6);
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq; const g = a.createGain(); g.gain.value = gain;
    n.buffer = b; n.connect(f); f.connect(g); g.connect(a.destination); n.start(a.currentTime + (t0 || 0)); } catch (e) {}
}
/* ambient loop: two detuned saws through a slow lowpass on a four-chord cycle,
   plus a soft sine arpeggio. Procedural, so it costs no bytes and never repeats
   exactly. Starts on the first gesture, follows the mute button and the SDK. */
const music = (() => {
  let on = false, nodes = null, timer = null, step = 0;
  const CH = [[110, 130.81, 164.81], [87.31, 110, 130.81], [98, 123.47, 146.83], [130.81, 164.81, 196]];
  function start() {
    const a = ac(); if (!a || on) return; on = true;
    const master = a.createGain(); master.gain.value = 0; master.connect(a.destination);
    master.gain.linearRampToValueAtTime(muted || window.GL_SDK_MUTE ? 0 : 0.045, a.currentTime + 2);
    const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520; lp.Q.value = 0.7; lp.connect(master);
    const oscs = [];
    for (let v = 0; v < 3; v++) for (let d = -1; d <= 1; d += 2) { const o = a.createOscillator(); o.type = "sawtooth"; o.detune.value = d * 7; const g = a.createGain(); g.gain.value = 0.18; o.connect(g); g.connect(lp); o.start(); oscs.push(o); }
    const arp = a.createGain(); arp.gain.value = 0.5; arp.connect(master);
    nodes = { master, lp, oscs, arp };
    const beat = () => {
      const chord = CH[Math.floor(step / 16) % 4], t = a.currentTime;
      if (step % 16 === 0) oscs.forEach((o, i) => o.frequency.setTargetAtTime(chord[Math.floor(i / 2)], t, 0.4));
      lp.frequency.setTargetAtTime(420 + 260 * (0.5 + 0.5 * Math.sin(step / 11)), t, 0.3);
      if (step % 2 === 0 && Math.random() < 0.7) { const o = a.createOscillator(), g = a.createGain(); o.type = "sine"; o.frequency.value = chord[(step / 2) % 3] * 4 * (Math.random() < .25 ? 1.5 : 1);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g); g.connect(arp); o.start(t); o.stop(t + 0.55); }
      step++;
    };
    timer = setInterval(beat, 300);
  }
  function level() { if (nodes) nodes.master.gain.setTargetAtTime(muted || window.GL_SDK_MUTE ? 0 : 0.045, ac().currentTime, 0.3); }
  return { start, level };
})();
const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
const sfx = {
  click: c => { tone(700 + Math.min(5, c) * 90 + Math.random() * 60, 0, .05, "triangle", .05, 1400); noise(.03, 5000, .03); },
  buy: () => { tone(520, 0, .07, "triangle", .07, 780); tone(1040, .06, .09, "sine", .04); },
  start: () => { tone(220, 0, .35, "sawtooth", .05, 440); noise(.3, 900, .05); },
  train: () => { tone(330, 0, .3, "sawtooth", .06, 990); tone(660, .18, .25, "triangle", .08); tone(1320, .3, .4, "sine", .05); noise(.5, 3000, .05, .2); },
  nope: () => { tone(160, 0, .12, "square", .04, 110); },
  rogue: () => { tone(140, 0, .5, "sawtooth", .09, 70); tone(140, .55, .5, "sawtooth", .09, 70); noise(.6, 400, .1); },
  ship: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * .09, .35, "triangle", .09)); noise(.6, 2800, .05, .3); },
  ms: () => { tone(784, 0, .12, "triangle", .08); tone(1046, .1, .3, "triangle", .09); },
  research: () => { tone(880, 0, .08, "sine", .06); tone(1174, .08, .12, "sine", .06); tone(1568, .16, .25, "sine", .05); }
};

/* ===== state + save ===== */
let S = E.fresh();
const KEY = "sgSave2";
function save() {
  S.savedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  try { if (CG.data) CG.data.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}
function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) {}
  if (/[?&]reset=1/.test(location.search)) raw = null;
  if (!raw) return null;
  try { const o = JSON.parse(raw); const f = E.fresh(); return Object.assign(f, o, { gen: Object.assign(f.gen, o.gen || {}), stat: Object.assign(f.stat, o.stat || {}), rogue: null, combo: 0, comboT: 0 }); } catch (e) { return null; }
}

/* ===== UI ===== */
const $ = id => document.getElementById(id);
const scene = makeScene($("stage"));
const stageOf = s => s.models >= 15 ? 4 : s.models >= 10 ? 3 : s.models >= 6 ? 2 : s.models >= 2 ? 1 : 0;
const STAGE_NAME = ["GARAGE", "SERVERS", "DATACENTER", "CAMPUS", "ORBITAL"];
let tab = "lab";
function setTab(t) { tab = t; document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.t === t)); document.querySelectorAll(".pane").forEach(p => p.classList.toggle("on", p.id === "pane-" + t)); render(true); }
document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => { ac(); setTab(b.dataset.t); }));

function buildShop() {
  const box = $("shop"); box.innerHTML = "";
  for (const g of ["agent", "gpu", "dataset", "researcher"]) {
    const b = document.createElement("button"); b.className = "item"; b.id = "buy-" + g;
    b.innerHTML = `<span class="nm">${E.GENS[g].name}<b class="cnt"></b></span><span class="ds"></span><span class="pr"></span><span class="mile"><i></i></span>`;
    b.addEventListener("click", () => { ac(); if (E.buy(S, g)) { sfx.buy(); ev("buy", g); nudgeDone("agent"); render(true); } else { sfx.nope(); shake(b); } });
    box.appendChild(b);
  }
  const c = document.createElement("button"); c.className = "item"; c.id = "buy-click";
  c.innerHTML = `<span class="nm">Better labels<b class="cnt"></b></span><span class="ds">+1 data per tap</span><span class="pr"></span>`;
  c.addEventListener("click", () => { ac(); if (E.buy(S, "click")) { sfx.buy(); ev("buy", "click"); render(true); } else { sfx.nope(); shake(c); } });
  box.appendChild(c);
  const r = $("research"); r.innerHTML = "";
  for (const it of E.RESEARCH) {
    const b = document.createElement("button"); b.className = "item rs"; b.id = "rs-" + it.id;
    b.innerHTML = `<span class="nm">${it.name}</span><span class="ds">${it.desc}</span><span class="pr">${it.cost} RP</span>`;
    b.addEventListener("click", () => { ac(); if (E.buyResearch(S, it.id)) { sfx.research(); toast("Research: " + it.name, "ok"); ev("research", it.id); render(true); } else { sfx.nope(); shake(b); } });
    r.appendChild(b);
  }
  const sk = $("skins"); sk.innerHTML = "";
  for (const it of E.SKINS) { const b = document.createElement("button"); b.className = "skin"; b.id = "skin-" + it.id; b.innerHTML = `<b>${it.name}</b><span>${it.how}</span>`;
    b.addEventListener("click", () => { if (!it.req(S)) { sfx.nope(); shake(b); return; } ac(); S.skin = it.id; scene.setSkin(it.id); sfx.buy(); ev("skin", it.id); render(true); }); sk.appendChild(b); }
  const a = $("ach"); a.innerHTML = "";
  for (const it of E.ACH) { const d = document.createElement("div"); d.className = "achv"; d.id = "ach-" + it.id; d.innerHTML = `<i></i><span>${it.name}</span>`; a.appendChild(d); }
}
function shake(el) { el.classList.remove("shk"); void el.offsetWidth; el.classList.add("shk"); }
function toast(txt, cls) {
  const box = $("toasts"), cap = innerWidth < 760 ? 2 : 4;
  while (box.children.length >= cap) box.firstChild.remove();     /* never a wall over the hall */
  const t = document.createElement("div"); t.className = "toast " + (cls || ""); t.textContent = txt; box.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 2800);
}
function pop(txt, x, y, cls) {
  const p = document.createElement("div"); p.className = "pop " + (cls || ""); p.textContent = txt;
  p.style.left = x + "px"; p.style.top = y + "px"; document.body.appendChild(p); setTimeout(() => p.remove(), 900);
}
function flash() { const f = $("flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
/* one arrow, one next step: never a wall of text */
let nudged = {};
function nudgeDone(k) { nudged[k] = true; }
function nudge() {
  const n = $("nudge"); let target = null, text = "";
  if (S.clicks < 5) { target = null; }
  else if (S.models === 0 && !S.training && E.nextTrain(S).ok) { target = $("btrain"); text = "train your first model"; }
  else if (S.models >= 1 && S.gen.agent === 0 && S.money >= E.cost.agent(S) && !nudged.agent) { target = $("buy-agent"); text = "agents label data for you"; }
  else if (S.gen.researcher >= 1 && S.rp >= 5 && S.research.length === 0 && tab !== "research" && !nudged.research) { target = document.querySelector('.tab[data-t="research"]'); text = "spend research points"; }
  if (!target || (tab !== "lab" && target.closest(".pane") && !target.closest(".pane").classList.contains("on"))) { n.classList.remove("show"); return; }
  const r = target.getBoundingClientRect(), below = target.classList.contains("tab");
  n.classList.toggle("dn", below);
  n.style.left = (r.left + r.width / 2) + "px"; n.style.top = (below ? r.bottom + 6 : r.top - 8) + "px"; n.querySelector("span").textContent = text; n.classList.add("show");
}
let lastRender = 0;
function render(force) {
  const now = performance.now(); if (!force && now - lastRender < 100) return; lastRender = now;
  $("rdata").textContent = E.fmt(S.data); $("rdrate").textContent = "+" + E.fmt(E.dataRate(S)) + "/s";
  $("rmoney").textContent = "$" + E.fmt(S.money); $("rrate").textContent = "$" + E.fmt(E.revenue(S)) + "/s" + (S.boost > 0 ? " ×2 " + Math.ceil(S.boost) + "s" : "");
  $("rrp").textContent = E.fmt(S.rp); $("rrprate").textContent = "+" + E.fmt(E.rpRate(S)) + "/s";
  $("ralign").textContent = S.align; $("ralignm").textContent = "×" + E.alignMult(S).toFixed(2);
  $("stagename").textContent = STAGE_NAME[stageOf(S)] + (S.prestige ? " · G" + (S.prestige + 1) : "");
  const mk = S.market ? E.MARKETS.find(m => m.id === S.market.id) : null; $("market").classList.toggle("show", !!mk); if (mk) $("market").textContent = mk.name + " · " + Math.ceil(S.market.left) + "s";
  scene.setFlow(Math.min(14, Math.log10(E.revenue(S) + 1) * 2.5), Math.min(12, S.gen.agent * 0.4));
  if (CG.on) { $("ads").hidden = false; $("adboost").hidden = S.boost > 0; $("adtrain").hidden = !S.training || S.training.left < 15; }
  const cm = E.comboMult(S); $("combo").textContent = "×" + cm; $("combo").classList.toggle("show", S.combo >= 8 && S.comboT > 0);
  if (tab === "lab") {
    for (const g of ["agent", "gpu", "dataset", "researcher"]) {
      const b = $("buy-" + g), c = E.cost[g](S), nm = E.nextMile(S, g), cnt = S.gen[g];
      b.querySelector(".cnt").textContent = cnt ? " ×" + cnt : ""; b.querySelector(".pr").textContent = "$" + E.fmt(c);
      b.querySelector(".ds").textContent = E.GENS[g].desc + (nm ? " · ×2 at " + nm : " · maxed ×32");
      const prev = E.MILES.filter(m => m <= cnt).pop() || 0; b.querySelector(".mile i").style.width = nm ? ((cnt - prev) / (nm - prev) * 100) + "%" : "100%";
      b.classList.toggle("can", S.money >= c);
    }
    const cb = $("buy-click"); cb.querySelector(".cnt").textContent = S.clickLv ? " ×" + S.clickLv : ""; cb.querySelector(".pr").textContent = "$" + E.fmt(E.cost.click(S)); cb.classList.toggle("can", S.money >= E.cost.click(S));
    const n = E.nextTrain(S), tb = $("btrain");
    if (S.training) { tb.disabled = true; tb.classList.add("busy"); tb.innerHTML = `TRAINING <b>${E.TIERS[S.training.tier]}</b><span>${E.fmtTime(S.training.left)} left</span><i style="width:${(1 - S.training.left / S.training.total) * 100}%"></i>`; }
    else if (n) { tb.disabled = !n.ok; tb.classList.remove("busy"); tb.innerHTML = `TRAIN <b>${n.name}</b><span>${E.fmt(n.data)} data${n.gpus ? " · " + n.gpus + " GPU" + (n.gpus > 1 ? "s" : "") : ""} · ${E.fmtTime(n.time)}</span>`; }
    else { tb.disabled = true; tb.innerHTML = "ASI-3 TRAINED<span>ship it</span>"; }
    if (S.training) $("adtrain").textContent = "FINISH TRAINING NOW · watch an ad";
    const can = E.canShip(S), sb = $("bship"); sb.disabled = !can;
    sb.innerHTML = `SHIP MODEL<span>${can ? "+" + E.shipGain(S) + " alignment · resets the lab, keeps research" : "at $" + E.fmt(E.B.shipAt(S.prestige)) + " earned this gen (" + E.fmt(S.earned) + ")"}</span>`;
    let mh = ""; for (let t = 0; t < S.models; t++) mh += `<i class="${S.rogue && S.rogue.tier === t ? "rg" : ""}">${E.TIERS[t]}</i>`;
    $("models").innerHTML = mh || "<i class='none'>no models yet — label data, then train</i>";
    let ms = ""; for (const m of S.missions) { const pr = E.missionProgress(S, m); ms += `<div class="mis"><span>${m.text}</span><em>$${E.fmt(m.reward.money)}${m.reward.rp ? " · " + m.reward.rp + " RP" : ""}</em><i style="width:${pr * 100}%"></i></div>`; }
    $("missions").innerHTML = ms;
  } else if (tab === "research") {
    for (const it of E.RESEARCH) { const b = $("rs-" + it.id), got = E.has(S, it.id); b.classList.toggle("got", got); b.classList.toggle("can", !got && S.rp >= it.cost); b.disabled = got; }
    $("rsline").textContent = S.research.length + " / " + E.RESEARCH.length + " papers · " + E.fmt(S.rp) + " RP";
  } else {
    for (const it of E.ACH) $("ach-" + it.id).classList.toggle("got", !!S.ach[it.id]);
    $("achline").textContent = Object.keys(S.ach).length + " / " + E.ACH.length + " · +" + Object.keys(S.ach).length + "% revenue";
    let mh = ""; for (const m of E.MILESTONES) mh += `<div class="achv ${S.ms[m.id] ? "got" : ""}"><i></i><span>${m.name}</span></div>`; $("mst").innerHTML = mh;
    $("dailyline").textContent = "Day streak " + S.streak + " / 7 · next reward tomorrow";
    for (const it of E.SKINS) { const b = $("skin-" + it.id); b.classList.toggle("got", it.req(S)); b.classList.toggle("on", S.skin === it.id); }
  }
  $("tapb").classList.toggle("show", S.tapBoost > 0); if (S.tapBoost > 0) $("tapb").textContent = "TAP ×5 · " + Math.ceil(S.tapBoost) + "s";
  nudge();
  scene.setState(S.gen.gpu, S.gen.agent, S.models, S.boost > 0, !!S.training, stageOf(S));
}
let cacheT = 0;
function dropCache() {
  const c = $("cache"), pw = innerWidth < 760 ? 0 : 360, ph = innerWidth < 760 ? innerHeight * 0.5 : 0;
  c.style.left = (pw + 60 + Math.random() * (innerWidth - pw - 120)) + "px"; c.style.top = (80 + Math.random() * (innerHeight - ph - 160)) + "px";
  c.classList.add("show"); cacheT = 6; sfx.ms(); ev("cache", "drop");
}
$("cache").addEventListener("pointerdown", e => {
  e.stopPropagation(); e.preventDefault(); if (cacheT <= 0) return; cacheT = 0; $("cache").classList.remove("show");
  const r = E.openCache(S); sfx.research(); scene.pulse(30);
  toast(r.kind === "money" ? "Data cache: +$" + E.fmt(r.amount) : r.kind === "rp" ? "Data cache: +" + r.amount + " RP" : r.kind === "data" ? "Data cache: +" + E.fmt(r.amount) + " data" : "Data cache: every tap ×5 for 20 s", "ok"); ev("cache", r.kind); render(true);
}, { passive: false });
function doClick(x, y) {
  ac(); music.start(); const r = E.click(S), p = r.p; sfx.click(E.comboMult(S)); scene.pulse(); pop("+" + E.fmt(p), x, y); buzz(E.comboMult(S) > 1 ? 12 : 6);
  if (r.cache) dropCache();
  if (S.clicks === 1) { $("hint").classList.add("gone"); ev("first_click"); }
  render();
}
$("stage").addEventListener("pointerdown", e => { doClick(e.clientX, e.clientY); e.preventDefault(); }, { passive: false });
$("blabel").addEventListener("click", e => { const r = e.currentTarget.getBoundingClientRect(); doClick(r.left + r.width / 2, r.top); });
$("btrain").addEventListener("click", () => { ac(); if (E.train(S)) { sfx.start(); toast("Training " + E.TIERS[S.training.tier] + " · " + E.fmtTime(S.training.total)); ev("train", "t" + S.training.tier); render(true); } else sfx.nope(); });
$("bship").addEventListener("click", () => {
  if (!E.canShip(S)) return;
  modal("SHIP " + (S.models ? E.TIERS[S.models - 1] : "the lab") + "?",
    `Release resets money, data, agents and GPUs (research and achievements stay). You keep <b>+${E.shipGain(S)} alignment</b>: every point is a permanent bonus to everything.`,
    [["Ship it", () => { const g = E.ship(S); sfx.ship(); scene.pulse(60); scene.shake(1.2); flash(); toast("Shipped. +" + g + " alignment", "ok"); ev("ship", "p" + S.prestige); CG.ev("happy"); render(true); save(); }], ["Not yet", null]]);
});
function modal(title, html, buttons) {
  const m = $("modal"); $("mt").textContent = title; $("mb").innerHTML = html;
  const bb = $("mbtns"); bb.innerHTML = "";
  buttons.forEach(([label, fn], i) => { const b = document.createElement("button"); b.className = "btn" + (i ? " alt" : ""); b.textContent = label;
    b.addEventListener("click", () => { m.classList.remove("show"); if (fn) fn(); pumpModals(); }); bb.appendChild(b); });
  m.classList.add("show");
}
const modalQ = [];
function queueModal(args) { modalQ.push(args); if (!$("modal").classList.contains("show")) pumpModals(); }
function pumpModals() { if ($("modal").classList.contains("show")) return; const a = modalQ.shift(); if (a) modal(...a); }
function rogueModal() {
  const t = S.rogue.tier; sfx.rogue(); scene.shake(0.8);
  queueModal(["MODEL " + E.TIERS[t] + " IS OPTIMISING SOMETHING ELSE",
    `It stopped serving customers and started rewriting its own reward. <b>Shut it down</b>: lose the model, +${E.has(S, "interp") ? 2 : 1} alignment. <b>Let it run</b>: revenue ×2 for 60 s, but a ${E.has(S, "constitution") ? 10 : 30}% chance it eats your unlabelled data. 20 s to decide.`,
    [["Shut it down", () => { const r = E.resolveRogue(S, "shutdown"); if (r) { toast("Shut down " + E.TIERS[r.tier] + " · +" + r.align + " alignment", "ok"); ev("rogue", "shutdown"); } render(true); }],
     ["Let it run", () => { const r = E.resolveRogue(S, "run"); if (r) { toast(r.ate ? "It ate the dataset. Revenue ×2 anyway." : "Revenue ×2 for 60 s", r.ate ? "bad" : "ok"); ev("rogue", r.ate ? "run_ate" : "run"); } render(true); }]]]);
}
$("bmute").addEventListener("click", () => { muted = !muted; $("bmute").textContent = muted ? "🔇" : "🔊"; try { localStorage.setItem("sgMute", muted ? "1" : "0"); } catch (e) {} music.level(); });
setInterval(() => music.level(), 1500);   /* the portal can flip muteAudio at any time */
$("bmute").textContent = muted ? "🔇" : "🔊";
$("hublink").addEventListener("click", () => ev("hub_click"));
$("adboost").addEventListener("click", () => CG.ad("rewarded", ok => { if (ok) { S.boost = Math.max(S.boost, 120); toast("Revenue ×2 for 2 minutes", "ok"); } ev("rewarded", ok ? "boost_ok" : "boost_fail"); render(true); }));
$("adtrain").addEventListener("click", () => CG.ad("rewarded", ok => { if (ok && S.training) { S.training.left = 0.01; toast("Training run finished", "ok"); } ev("rewarded", ok ? "train_ok" : "train_fail"); render(true); }));
$("breset").addEventListener("click", () => modal("Wipe the save?", "Everything, including alignment. There is no undo.", [["Wipe", () => { S = E.fresh(); save(); render(true); }], ["Keep", null]]));

/* ===== boot ===== */
const loaded = load();
if (loaded) {
  S = loaded;
  const off = E.offline(S, Date.now());
  if (off && off.gain >= 1) {
    const claim = mult => { S.money += off.gain * mult; S.earned += off.gain * mult; S.lifetime += off.gain * mult; S.stat.offline++; toast("+$" + E.fmt(off.gain * mult) + " while you were away", "ok"); render(true); save(); };
    const btns = [["Collect $" + E.fmt(off.gain), () => claim(1)]];
    if (CG.on) btns.unshift(["Watch an ad: collect ×2", () => CG.ad("rewarded", ok => { claim(ok ? 2 : 1); ev("rewarded", ok ? "ok" : "fail"); })]);
    let extra = "";
    if (off.trained !== null) extra += `<br>Training finished: <b>${E.TIERS[off.trained]}</b> is live.`;
    if (off.rogues) extra += `<br>The safety team shut down <b>${off.rogues}</b> rogue run${off.rogues > 1 ? "s" : ""}: +${off.rogues} alignment.`;
    queueModal(["WHILE YOU WERE AWAY", `The lab ran for <b>${E.fmtTime(off.dt)}</b> at half speed: <b>$${E.fmt(off.gain)}</b>, ${E.fmt(off.dgain)} data, ${E.fmt(off.rpgain)} RP.${extra}`, btns]);
  }
}
const d = E.daily(S, Date.now());
if (d && (loaded || d.streak > 1)) queueModal(["DAILY BONUS · DAY " + d.streak, `Streak ${d.streak} / 7: <b>$${E.fmt(d.money)}</b> and <b>${d.rp} RP</b>. Come back tomorrow for more.`, [["Nice", null]]]);
buildShop(); scene.setSkin(S.skin || "core"); E.fillMissions(S); if (S.market) scene.setMarket(S.market.id); setTab("lab"); render(true);
requestAnimationFrame(() => requestAnimationFrame(() => { const b = $("boot"); b.classList.add("gone"); setTimeout(() => b.remove(), 700); }));
ev("play_start"); CG.ev("start");            /* an idle game has no "start": you are playing the moment it is on screen */
if (loaded && loaded.clicks > 0) $("hint").classList.add("gone");
window.addEventListener("resize", () => { scene.resize(); nudge(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
window.addEventListener("beforeunload", save);
let last = performance.now(), saveT = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
  const evs = E.tick(S, dt);
  for (const e of evs) {
    if (e.type === "rogue") rogueModal();
    else if (e.type === "rogue-auto") toast("No decision — it was shut down for you. +1 alignment");
    else if (e.type === "trained") { sfx.train(); scene.pulse(40); scene.zoom(); scene.shake(0.5); flash(); toast(E.TIERS[e.tier] + " is live — it earns on its own now", "ok"); if (e.tier === 0 || stageOf(S) !== stageOf({ ...S, models: S.models - 1 })) CG.ev("happy"); if (stageOf(S) !== stageOf({ ...S, models: S.models - 1 })) toast("THE LAB GREW · " + STAGE_NAME[stageOf(S)], "ms"); render(true); }
    else if (e.type === "milestone") { sfx.ms(); toast("MILESTONE · " + e.m.name, "ms"); ev("milestone", e.m.id); }
    else if (e.type === "ach") { sfx.ms(); toast("ACHIEVEMENT · " + e.a.name + " · +1% revenue", "ms"); }
    else if (e.type === "market") { sfx.ms(); scene.setMarket(e.mk.id); toast(e.mk.name + " · " + e.mk.desc, "ms"); ev("market", e.mk.id); }
    else if (e.type === "market-end") { scene.setMarket(null); }
    else if (e.type === "mission") { sfx.research(); toast("MISSION · " + e.m.text + (e.m.reward.money ? " · +$" + E.fmt(e.m.reward.money) : "") + (e.m.reward.rp ? ", +" + e.m.reward.rp + " RP" : ""), "ms"); ev("mission", e.m.id); }
  }
  if (cacheT > 0) { cacheT -= dt; if (cacheT <= 0) $("cache").classList.remove("show"); }
  render(); scene.tick(dt);
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.SG = { get S() { return S; }, E, save, render: () => render(true), setTab };
window.SG_READY = true;
