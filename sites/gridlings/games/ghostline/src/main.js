import { makeScene, CARS } from "./scene.js";
import * as TR from "./track.js";
import * as PH from "./physics.js";
import * as AI from "./ai.js";

/* ===== CrazyGames bridge ===== */
/* Portal bridge. One contract — on / ev("start"|"stop"|"happy") / ad(type, done) —
   with two implementations behind it, so nothing else in the game knows or cares
   which portal it is running on:
     · CrazyGames, via their own SDK (window.GL_CG)
     · Playgama Bridge, which also fronts Y8, MSN, Discord, YouTube Playables,
       Xiaomi, Telegram and ~20 more (window.GL_PG)
   Neither loads on our own site or on itch, where the game is genuinely ad-free. */
const PORTAL = (function () {
  if (window.GL_PG === true || /(^|[?&])pg=1/.test(location.search)) return playgama();
  return crazygames();
})();

function crazygames() {
  let on = window.GL_CG === true || /(^|[?&])cg=1/.test(location.search);
  if (!on) { try { on = /crazygames\./.test(document.referrer); } catch (e) {} }
  window.GL_CG = on;
  const q = []; let sdk = null;
  const api = { on, ready: false, ev: e => { if (on) q.push(e); }, ad: (type, done) => done(false) };
  if (!on) return api;
  document.documentElement.classList.add("cg");
  if (/[?&]muteAudio=true/.test(location.search)) window.GL_SDK_MUTE = true;
  const s = document.createElement("script"); s.src = "https://sdk.crazygames.com/crazygames-sdk-v3.js"; s.async = true;
  s.onload = () => { try { window.CrazyGames.SDK.init().then(() => {
    sdk = window.CrazyGames.SDK; const g = sdk.game;
    try { const st = g.settings; if (st && typeof st.muteAudio === "boolean") window.GL_SDK_MUTE = st.muteAudio; g.addSettingsChangeListener(s2 => { if (s2 && typeof s2.muteAudio === "boolean") window.GL_SDK_MUTE = s2.muteAudio; }); } catch (e) {}
    try { g.loadingStart(); } catch (e) {} try { g.loadingStop(); } catch (e) {}
    api.ev = e => { try { if (e === "start") g.gameplayStart(); else if (e === "stop") g.gameplayStop(); else if (e === "happy") g.happytime(); } catch (x) {} };
    q.splice(0).forEach(api.ev);
    api.ready = true;
    api.ad = (type, done) => { let f = false; const end = ok => { if (!f) { f = true; done(ok); } };
      try { sdk.ad.requestAd(type, { adFinished: () => end(true), adError: () => end(false), adStarted: () => {} }); setTimeout(() => end(false), 25000); } catch (e) { end(false); } };
  }).catch(() => {}); } catch (e) {} };
  document.head.appendChild(s);
  return api;
}

function playgama() {
  /* Bridge is LGPL-3.0, so it ships as its own file next to index.html and is
     never inlined into the game — keep it replaceable, as that licence intends. */
  const q = []; let br = null;
  const api = { on: true, ready: false, ev: e => q.push(e), ad: (type, done) => done(false) };
  window.GL_PG = true;
  document.documentElement.classList.add("pg");
  /* The SDK is a plain <script src> in index.html, injected by the packager, so it is
     already parsed by the time this runs and initialize() fires at the earliest
     possible moment. Certification checks for exactly that ("ensure the script is
     connected in index.html"), and a static tag also removes the failure mode where
     a dynamically injected script never fires onload and init silently never happens.
     The dynamic path stays as a fallback for anyone opening the file without it. */
  /* An SDK that never loads fails certification while the game itself plays perfectly —
     the most invisible failure there is. Every path that can end that way reports here,
     on screen, so it can be read (or photographed) without opening devtools. This can
     only appear in the Playgama build, and only when the SDK is genuinely unusable. */
  const sdkMissing = (why) => {
    window.GL_PG_ERR = "playgama-bridge.js unusable: " + why;
    try {
      const d = document.createElement("div");
      d.textContent = "SDK NOT LOADED \u2014 " + why;
      d.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#c8102e;color:#fff;"
        + "font:12px/1.5 monospace;padding:6px 10px;text-align:center;pointer-events:none";
      const put = () => (document.body || document.documentElement).appendChild(d);
      if (document.body) put(); else document.addEventListener("DOMContentLoaded", put);
    } catch (e) {}
  };
  const boot = (attempt) => {
    br = window.bridge;
    if (!br || typeof br.initialize !== "function") { sdkMissing("window.bridge is undefined after the script tag ran"); return; }
    br.initialize().then(() => {
      const send = m => { try { br.platform.sendMessage(m); } catch (e) {} };
      send("game_ready");
      /* happytime has no Bridge equivalent; dropping it is correct, not a gap */
      api.ev = e => { if (e === "start") send("gameplay_started"); else if (e === "stop") send("gameplay_stopped"); };
      q.splice(0).forEach(api.ev);
      try {
        br.on("pause_state_changed", st => { window.GL_SDK_PAUSE = st === "paused"; });
        br.on("audio_state_changed", st => { window.GL_SDK_MUTE = st === "muted"; });
      } catch (e) {}
      api.ready = true;
      api.ad = (type, done) => {
        let fired = false; const end = ok => { if (!fired) { fired = true; done(ok); } };
        const rewarded = type === "rewarded";
        const evt = rewarded ? "rewarded_state_changed" : "interstitial_state_changed";
        /* A rewarded ad only pays out on the "rewarded" state. Closing it early is a
           no-reward close, so it must resolve false — an interstitial closing is a
           normal finish and resolves true. */
        let paid = false;
        /* Do not wait for the platform to tell us: the moment an ad opens, hold the
           game and silence it; release on any terminal state. */
        const release = () => { window.GL_SDK_PAUSE = false; window.GL_SDK_AD_MUTE = false; };
        const onState = st => {
          if (st === "opened" || st === "loading") { window.GL_SDK_PAUSE = true; window.GL_SDK_AD_MUTE = true; }
          else if (st === "rewarded") { paid = true; release(); end(true); }
          else if (st === "closed") { release(); end(rewarded ? paid : true); }
          else if (st === "failed") { release(); end(false); }
        };
        try {
          br.advertisement.on(evt, onState);
          if (rewarded) br.advertisement.showRewarded(); else br.advertisement.showInterstitial();
          setTimeout(() => { release(); end(false); }, 25000);
        } catch (e) { release(); window.GL_AD_ERR = String((e && e.stack) || e); end(false); }
      };
    }).catch(e => {
      /* A swallowed init rejection is indistinguishable from "the platform never
         heard from us", which is exactly the certification failure it causes. Record
         it and retry once — a transient handshake failure should not cost the run. */
      window.GL_PG_ERR = String((e && (e.stack || e.message)) || e);
      if (!attempt) setTimeout(() => boot(1), 1500);
    });
  };
  if (window.bridge) boot(0);
  else {
    const s = document.createElement("script"); s.src = "playgama-bridge.js"; s.async = true;
    s.onload = () => boot(0);
    s.onerror = () => sdkMissing("the file 404s next to index.html");   /* the game stays playable either way */
    document.head.appendChild(s);
  }
  return api;
}
function ev(n, l) { try { const d = JSON.stringify({ n, l: l || "gl", p: "/ghostline" }), u = "https://play.agiscorecard.com/e";
  if (navigator.sendBeacon) navigator.sendBeacon(u, new Blob([d], { type: "application/json" })); else fetch(u, { method: "POST", body: d, keepalive: true, mode: "cors" }).catch(() => {}); } catch (e) {} }

/* ===== audio: engine, skid, blips, a faster music loop ===== */
let AC = null, muted = false; try { muted = localStorage.getItem("glMute") === "1"; } catch (e) {}
/* the context is created ONLY from a user gesture (arm); the countdown at page
   load must stay silent or the portal logs an autoplay warning and rejects */
let armed = false;
function ac() { if (AC && AC.state === "suspended") { try { AC.resume(); } catch (e) {} } return AC; }
function arm() { if (armed) return; armed = true; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} ac(); engine.start(); music.start(); }
const quiet = () => muted || window.GL_SDK_MUTE || window.GL_SDK_AD_MUTE;
function tone(f, t0, dur, type, gain, slide) { const a = ac(); if (!a || quiet()) return; try { const o = a.createOscillator(), g = a.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, a.currentTime + t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, a.currentTime + t0 + dur); g.gain.setValueAtTime(0, a.currentTime + t0); g.gain.linearRampToValueAtTime(gain || .1, a.currentTime + t0 + .012); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t0 + dur); o.connect(g); g.connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + .02); } catch (e) {} }
function noise(dur, freq, gain, t0) { const a = ac(); if (!a || quiet()) return; try { const n = a.createBufferSource(), b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6); const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq; const g = a.createGain(); g.gain.value = gain; n.buffer = b; n.connect(f); f.connect(g); g.connect(a.destination); n.start(a.currentTime + (t0 || 0)); } catch (e) {} }
const engine = (() => { let o = null, g = null, f = null, sk = null, skg = null;
  function start() { const a = ac(); if (!a || o) return; o = a.createOscillator(); o.type = "sawtooth"; f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600; g = a.createGain(); g.gain.value = 0; o.connect(f); f.connect(g); g.connect(a.destination); o.start();
    sk = a.createBufferSource(); const b = a.createBuffer(1, a.sampleRate, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; sk.buffer = b; sk.loop = true; const sf = a.createBiquadFilter(); sf.type = "bandpass"; sf.frequency.value = 1800; skg = a.createGain(); skg.gain.value = 0; sk.connect(sf); sf.connect(skg); skg.connect(a.destination); sk.start(); }
  function set(v, drift, on) { if (!o) return; const a = ac(), t = a.currentTime; const q = quiet() || !on; o.frequency.setTargetAtTime(55 + v * 4.2, t, 0.05); f.frequency.setTargetAtTime(300 + v * 30, t, 0.05); g.gain.setTargetAtTime(q ? 0 : 0.035 + v / 46 * 0.03, t, 0.08); skg.gain.setTargetAtTime(q || !drift ? 0 : 0.05, t, 0.05); }
  return { start, set }; })();
const music = (() => { let on = false, nodes = null, step = 0; const CH = [[110, 130.81, 164.81], [87.31, 110, 130.81], [98, 123.47, 146.83], [130.81, 164.81, 196]];
  function start() { const a = ac(); if (!a || on) return; on = true; const master = a.createGain(); master.gain.value = 0; master.connect(a.destination); master.gain.linearRampToValueAtTime(quiet() ? 0 : 0.035, a.currentTime + 2);
    const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.connect(master); const oscs = [];
    for (let v = 0; v < 3; v++) for (let d = -1; d <= 1; d += 2) { const o = a.createOscillator(); o.type = "sawtooth"; o.detune.value = d * 8; const g = a.createGain(); g.gain.value = 0.16; o.connect(g); g.connect(lp); o.start(); oscs.push(o); }
    nodes = { master, lp, oscs };
    setInterval(() => { const chord = CH[Math.floor(step / 8) % 4], t = a.currentTime; if (step % 8 === 0) oscs.forEach((o, i) => o.frequency.setTargetAtTime(chord[Math.floor(i / 2)], t, 0.2)); lp.frequency.setTargetAtTime(500 + 400 * (0.5 + 0.5 * Math.sin(step / 5)), t, 0.2);
      if (Math.random() < 0.8) { const o = a.createOscillator(), g = a.createGain(); o.type = "square"; o.frequency.value = chord[step % 3] * 4; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25); } step++; }, 230); }
  function level() { if (nodes) nodes.master.gain.setTargetAtTime(quiet() ? 0 : 0.035, ac().currentTime, 0.3); }
  return { start, level }; })();
const sfx = { cp: () => { tone(880, 0, .08, "triangle", .07, 1320); }, wall: () => { noise(.12, 500, .12); tone(90, 0, .12, "square", .06, 50); }, go: () => { tone(660, 0, .25, "square", .07); tone(1320, .02, .3, "triangle", .06); },
  count: () => { tone(440, 0, .12, "square", .06); }, finish: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * .08, .35, "triangle", .08)); noise(.5, 2500, .05, .2); }, medal: () => { tone(1046, 0, .12, "triangle", .08); tone(1318, .1, .3, "triangle", .08); }, click: () => { tone(700, 0, .04, "triangle", .05, 1000); } };
const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

/* ===== save ===== */
const KEY = "glSave";
let S = { best: {}, medals: {}, clones: {}, pb: {}, ref: {}, car: "ion", plays: 0, finishes: 0, streak: 0, lastDaily: 0, lastSeed: null };
try { const raw = /[?&]reset=1/.test(location.search) ? null : localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
const medalCount = () => Object.values(S.medals).reduce((a, m) => a + (m === "gold" ? 3 : m === "silver" ? 2 : m === "bronze" ? 1 : 0), 0);
const fmtT = t => t >= 1e8 ? "--" : (Math.floor(t / 60) ? Math.floor(t / 60) + ":" : "") + (t % 60 < 10 && t >= 60 ? "0" : "") + (t % 60).toFixed(2);

/* ===== UI refs ===== */
const $ = id => document.getElementById(id);
const scene = makeScene($("stage"));
let T = null, seed = null, level = 1, me = null, gh = null, ghPol = null, pb = null, pbPol = null, ref = null, state = "menu", count = 0, rec = [], lastCp = 0, splitTxtT = 0, finishes = 0, cpFlash = 0;
const inp = { l: false, r: false, b: false, tl: false, tr: false, tb: false };

function setCar(id) { const c = CARS.find(x => x.id === id) || CARS[0]; S.car = c.id; scene.setCar(c.col); }
function loadTrack(sd, lv) {
  seed = sd; level = lv; T = TR.makeTrack(sd, lv); scene.setTrack(T, sd);
  /* the medal lines are the model's first study of the track, computed once and kept */
  if (!S.ref[sd]) { const o = AI.optimize(T, AI.baseline(T), 500, TR.rng(sd * 7 + 3)); S.ref[sd] = o.t; S.clones[sd] = { target: Array.from(o.pol.target), brake: Array.from(o.pol.brake), t: o.t }; save(); }
  ref = AI.medals(S.ref[sd]);
  const cl = S.clones[sd]; ghPol = { target: Float32Array.from(cl.target), brake: Uint8Array.from(cl.brake), t: cl.t };
  /* your own best lap rides along as a second, gold ghost -- the line you are trying to beat */
  const p = (S.pb || {})[sd]; pbPol = p ? { target: Float32Array.from(p.target), brake: Uint8Array.from(p.brake), t: p.t } : null;
  $("tname").textContent = T.name; $("tmeta").textContent = T.length + " m · " + T.cps.length + " checkpoints";
  $("tmedals").innerHTML = `<i class="g">◆ ${fmtT(ref.gold)}</i><i class="s">◆ ${fmtT(ref.silver)}</i><i class="b">◆ ${fmtT(ref.bronze)}</i>`;
  $("tclone").textContent = "MODEL " + fmtT(ghPol.t) + (S.best[sd] ? " · YOU " + fmtT(S.best[sd]) : "");
}
/* Ads run at natural breakpoints only — a finished race, or the moment the player
   chooses a different track — and share one cooldown so the two triggers cannot
   stack. The track-change trigger matters twice over: it is the honest breakpoint
   AND the only one reachable by clicking, so a portal's automated certification
   pass (which cannot drive a car well enough to finish a lap) can still observe
   that advertising is implemented. */
const AD_GAP_MS = 90000;
let lastAdAt = 0;
function adBreak(then) {
  const now = performance.now();
  /* ready matters as much as on: before the portal SDK finishes initialising, ad()
     is a stub that returns instantly. Counting that as a shown ad would burn the
     cooldown on nothing — which is exactly what happened to the first certification
     run, and to any player who changes track in the first few seconds. */
  if (!PORTAL.on || !PORTAL.ready || (lastAdAt && now - lastAdAt < AD_GAP_MS)) { then(); return; }
  lastAdAt = now;
  PORTAL.ad("midgame", then);
}
function go(sd, lv) { adBreak(() => { loadTrack(sd, lv); startRace(); }); }
function startRace() {
  me = PH.fresh(); gh = PH.fresh(); pb = pbPol ? PH.fresh() : null; rec = []; lastCp = 0; state = "count"; count = 3.2; cpFlash = 0;
  $("menu").classList.remove("show"); $("result").classList.remove("show"); $("hud").classList.add("show"); $("count").classList.add("show");
  scene.snapCamera(me); if (armed) { engine.start(); music.start(); } S.plays++; S.lastSeed = seed; save(); ev("race_start", "s" + seed);
  PORTAL.ev("start");
}
function endRace() {
  state = "done"; $("hud").classList.remove("show"); PORTAL.ev("stop"); sfx.finish(); buzz(30);
  const t = me.t, prev = S.best[seed], isBest = !prev || t < prev; if (isBest) S.best[seed] = t;
  /* a personal best is kept as a replayable line, not just a number: next run it drives beside you */
  if (isBest && me.cp >= T.cps.length) { const bp = AI.learn(T, rec); S.pb = S.pb || {}; S.pb[seed] = { target: Array.from(bp.target), brake: Array.from(bp.brake), t }; }
  const medal = t <= ref.gold ? "gold" : t <= ref.silver ? "silver" : t <= ref.bronze ? "bronze" : null;
  const rank = { gold: 3, silver: 2, bronze: 1 }; const prevMedal = S.medals[seed];
  if (medal && (!prevMedal || rank[medal] > rank[prevMedal])) { S.medals[seed] = medal; sfx.medal(); PORTAL.ev("happy"); ev("medal", medal); }
  const beat = t < ghPol.t;
  /* the model studies the run: it learns your line, then tries to improve it.
     It only ever gets faster; a bad run cannot make it worse. */
  const learned = AI.optimize(T, AI.learn(T, rec), 60, Math.random), old = ghPol.t;
  let studied = "";
  if (learned.t < ghPol.t) { S.clones[seed] = { target: Array.from(learned.pol.target), brake: Array.from(learned.pol.brake), t: learned.t }; studied = `The model studied your line and found <b>−${(old - learned.t).toFixed(2)}s</b>. It now runs ${fmtT(learned.t)}.`; }
  else studied = `The model studied your line and kept its own: ${fmtT(ghPol.t)}.`;
  S.finishes++; finishes++; save();
  $("rt").textContent = fmtT(t); $("rbest").textContent = isBest ? "NEW BEST" : "best " + fmtT(S.best[seed]);
  $("rmedal").className = "medal " + (medal || "none"); $("rmedal").textContent = medal ? medal.toUpperCase() : "NO MEDAL · bronze at " + fmtT(ref.bronze);
  $("rclone").innerHTML = (beat ? `<b class="ok">YOU BEAT THE MODEL</b> by ${(ghPol.t - t).toFixed(2)}s.<br>` : `<b class="bad">THE MODEL WON</b> by ${(t - ghPol.t).toFixed(2)}s.<br>`) + studied;
  $("rwalls").textContent = me.walls ? me.walls + " wall hit" + (me.walls > 1 ? "s" : "") + " — each one costs more than a brake tap" : "clean run — no walls";
  ev("finish", "s" + seed + ":" + t.toFixed(1)); if (beat) ev("beat_clone", "s" + seed);
  const show = () => { $("result").classList.add("show"); refreshGarage(); };
  if (finishes % 3 === 0) adBreak(show); else show();
}
/* ===== menu ===== */
function buildMenu() {
  const grid = $("grid"); grid.innerHTML = "";
  TR.CAMPAIGN.forEach((c, i) => { const b = document.createElement("button"); b.className = "tk"; const m = S.medals[c.seed];
    b.innerHTML = `<b>${i + 1}</b><span>${TR.trackName(c.seed)}</span><em class="${m || "none"}">${m ? "◆ " + fmtT(S.best[c.seed]) : (S.best[c.seed] ? fmtT(S.best[c.seed]) : "—")}</em>`;
    b.addEventListener("click", () => { arm(); sfx.click(); go(c.seed, c.level); }); grid.appendChild(b); });
  const d = TR.dailySeed(new Date()); $("bdaily").querySelector("span").textContent = TR.trackName(d) + (S.best[d] ? " · " + fmtT(S.best[d]) : "");
  refreshGarage();
}
function refreshGarage() {
  const g = $("garage"); g.innerHTML = ""; const mc = medalCount(); $("mcount").textContent = mc + " medal pts";
  CARS.forEach(c => { const b = document.createElement("button"); b.className = "carb" + (S.car === c.id ? " on" : "") + (mc >= c.req ? "" : " lock"); b.style.setProperty("--c", "#" + c.col.toString(16).padStart(6, "0"));
    b.innerHTML = `<i></i><span>${c.name}</span><small>${mc >= c.req ? "" : c.req + " pts"}</small>`;
    b.addEventListener("click", () => { arm(); if (mc < c.req) { sfx.wall(); return; } sfx.click(); setCar(c.id); save(); refreshGarage(); }); g.appendChild(b); });
}
$("bdaily").addEventListener("click", () => { arm(); sfx.click(); go(TR.dailySeed(new Date()), 4); });
$("brandom").addEventListener("click", () => { arm(); sfx.click(); go(200000 + Math.floor(Math.random() * 800000), 2 + Math.floor(Math.random() * 5)); });
$("bretry").addEventListener("click", () => { arm(); sfx.click(); go(seed, level); });
$("bnext").addEventListener("click", () => { arm(); sfx.click(); const i = TR.CAMPAIGN.findIndex(c => c.seed === seed); const n = TR.CAMPAIGN[(i + 1) % TR.CAMPAIGN.length]; go(n.seed, n.level); });
$("bmenu").addEventListener("click", () => { arm(); sfx.click(); state = "menu"; $("result").classList.remove("show"); buildMenu(); $("menu").classList.add("show"); });
$("bmenu2").addEventListener("click", () => { state = "menu"; $("hud").classList.remove("show"); $("count").classList.remove("show"); PORTAL.ev("stop"); buildMenu(); $("menu").classList.add("show"); });
$("bmute").addEventListener("click", () => { muted = !muted; $("bmute").textContent = muted ? "🔇" : "🔊"; try { localStorage.setItem("glMute", muted ? "1" : "0"); } catch (e) {} music.level(); });
$("bmute").textContent = muted ? "🔇" : "🔊"; setInterval(() => music.level(), 1500);
$("hublink").addEventListener("click", () => ev("hub_click"));

/* ===== input: keys, touch zones ===== */
window.addEventListener("keydown", e => { arm(); const c = e.code; if (c === "ArrowLeft" || c === "KeyA") inp.l = true; else if (c === "ArrowRight" || c === "KeyD") inp.r = true; else if (c === "Space" || c === "ArrowDown" || c === "KeyS" || c === "ShiftLeft") inp.b = true; else if (c === "KeyR" && (state === "race" || state === "done")) { $("bretry").click(); } else if ((c === "Enter") && state === "done") $("bnext").click(); else return; e.preventDefault(); });
window.addEventListener("keyup", e => { const c = e.code; if (c === "ArrowLeft" || c === "KeyA") inp.l = false; else if (c === "ArrowRight" || c === "KeyD") inp.r = false; else if (c === "Space" || c === "ArrowDown" || c === "KeyS" || c === "ShiftLeft") inp.b = false; });
const zone = (id, key) => { const el = $(id); const on = e => { inp[key] = true; el.classList.add("on"); e.preventDefault(); }, off = e => { inp[key] = false; el.classList.remove("on"); e.preventDefault(); };
  el.addEventListener("pointerdown", e => { arm(); on(e); }, { passive: false }); el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("pointerleave", off); };
zone("zl", "tl"); zone("zr", "tr"); zone("zb", "tb");

/* ===== loop ===== */
let last = performance.now(), acc = 0; const DT = 1 / 120;
function loop(now) {
  /* Portals pause the game while an ad covers it — Playgama's own ad overlay states
     the expectation outright ("the game should be paused and audio muted"). Holding
     the clock here rather than only silencing audio means a race is not quietly lost
     behind an interstitial. */
  if (window.GL_SDK_PAUSE) { last = now; requestAnimationFrame(loop); return; }
  const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
  if (state === "count") { const prev = Math.ceil(count); count -= dt; const cur = Math.ceil(count); $("count").textContent = count > 0 ? String(cur) : "GO"; if (cur !== prev && count > 0) sfx.count();
    if (count <= 0) { state = "race"; sfx.go(); setTimeout(() => $("count").classList.remove("show"), 500); } scene.tick(dt, me, gh, pb); engine.set(0, false, true); }
  else if (state === "race") {
    const steer = (inp.l || inp.tl ? -1 : 0) + (inp.r || inp.tr ? 1 : 0), brake = inp.b || inp.tb;
    acc += dt; let e = null;
    while (acc >= DT) { acc -= DT; const r = PH.step(T, me, { steer, brake }, DT); if (r) e = r; if (gh && !gh.done) PH.step(T, gh, AI.driverFor(ghPol)(T, gh), DT);
      if (pb && !pb.done) PH.step(T, pb, AI.driverFor(pbPol)(T, pb), DT);
      if (rec.length === 0 || me.s - rec[rec.length - 1].s >= 2) rec.push({ s: me.s, d: me.d, brake }); }
    if (e) { if (e.type === "cp") { sfx.cp(); cpFlash = 1; const gt = gh.splits[e.i - 1]; if (gt !== undefined) { const dlt = e.t - gt; $("split").textContent = (dlt <= 0 ? "" : "+") + dlt.toFixed(2); $("split").className = "split show " + (dlt <= 0 ? "ok" : "bad"); splitTxtT = 2; } }
      else if (e.type === "wall") { sfx.wall(); buzz(20); $("wallflash").classList.remove("go"); void $("wallflash").offsetWidth; $("wallflash").classList.add("go"); }
      else if (e.type === "finish") { endRace(); } }
    if (splitTxtT > 0) { splitTxtT -= dt; if (splitTxtT <= 0) $("split").classList.remove("show"); }
    $("time").textContent = fmtT(me.t); $("speed").textContent = Math.round(me.v * 3.6) + " km/h"; $("cps").textContent = me.cp + "/" + T.cps.length;
    const dlt = gh.done ? null : (gh.s - me.s); $("vs").textContent = gh.done ? "MODEL FINISHED " + fmtT(gh.t) : (dlt > 0 ? "MODEL +" + dlt.toFixed(0) + " m" : "YOU +" + (-dlt).toFixed(0) + " m"); $("vs").className = "chip vs " + (gh.done || dlt > 0 ? "bad" : "ok");
    $("lines").style.opacity = Math.max(0, (me.v - 26) / 24) * 0.7;
    engine.set(me.v, me.drift > 0, true); scene.tick(dt, me, gh, pb);
  } else { scene.tick(dt, me || PH.fresh(), null, null); engine.set(0, false, false); }
  requestAnimationFrame(loop);
}
/* boot: the last track (or the opener) starts by itself after the countdown --
   the portal's zero-interaction gameplayStart, and the player's first 20 seconds */
setCar(S.car);
const first = TR.CAMPAIGN.find(c => c.seed === S.lastSeed) || TR.CAMPAIGN[0];
loadTrack(first.seed, first.level); ev("play_start"); startRace();
requestAnimationFrame(loop);
window.addEventListener("resize", () => scene.resize());
window.addEventListener("pointerdown", () => arm(), { once: true });
window.addEventListener("beforeunload", save);
requestAnimationFrame(() => requestAnimationFrame(() => { const b = $("boot"); b.classList.add("gone"); setTimeout(() => b.remove(), 700); }));
window.GL = { get PORTAL() { return PORTAL; }, get adAt() { return lastAdAt; }, get S() { return S; }, get me() { return me; }, get gh() { return gh; }, get T() { return T; }, get state() { return state; }, inp, loadTrack, startRace, endRace, TR, PH, AI };
window.GL_READY = true;
