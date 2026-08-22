/* Gridlings — client. No frameworks, no backend calls except the /e beacon.
   Solvable-by-deduction guarantee lives in the baked JSON (unique solutions). */
(function () {
  "use strict";
  var L = window.GRIDLINGS_LANG || {};
  var ANIMALS = ["🐸", "🦊", "🐼", "🐙", "🐤"];
  var COLORS = ["#FFD166", "#06D6A0", "#79ADDC", "#EF7674", "#CDB4DB"];
  var COLOR_NAMES = L.colors || ["amber", "green", "blue", "red", "purple"];
  var EMBED = /(^|[?&])embed=1/.test(location.search);
  // clean mode: license/portal delivery (Coolmath et al. require no external
  // links, no ads, no stats phoning home). Implies embed chrome, kills the
  // beacon entirely, and strips the URL from share text.
  var CLEAN = window.GL_CLEAN === true || /(^|[?&])clean=1/.test(location.search);

  var state = null; // {n, sol_a, sol_c, given, fill, mode, key, num, start, hints, done}
  var $ = function (id) { return document.getElementById(id); };

  function gev(n, l, v) {
    if (CLEAN) return;
    try {
      var b = JSON.stringify({ n: n, l: (l || "").slice(0, 80), v: v || 0, p: location.pathname + (EMBED ? "?embed" : "") });
      navigator.sendBeacon ? navigator.sendBeacon("/e", b)
        : fetch("/e", { method: "POST", body: b, keepalive: true });
    } catch (e) { /* analytics must never break play */ }
    try { window.gtag && gtag("event", n, { event_category: "gridlings", event_label: l || "", value: v || 0 }); } catch (e) {}
  }

  function utcToday() { return new Date().toISOString().slice(0, 10); }

  function dayNum(epoch, iso) {
    return Math.round((Date.parse(iso) - Date.parse(epoch)) / 864e5) + 1;
  }

  function loadPuzzle(cb) {
    var m = location.search.match(/[?&]p=(easy|medium|hard)-(\d+)/);
    if (m) {
      fetch("puzzles-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
        var arr = pools[m[1]] || [];
        var i = Math.min(parseInt(m[2], 10), arr.length - 1);
        cb(arr[i], "pool", m[1] + "-" + i, m[1] + " #" + (i + 1));
      });
      return;
    }
    var dm = location.search.match(/[?&]d=(\d{4}-\d{2}-\d{2})/);
    fetch("puzzles-daily.json").then(function (r) { return r.json(); }).then(function (d) {
      var iso = utcToday();
      // archive deep link: only dates that have already been published
      if (dm && d.puzzles[dm[1]] && dm[1] <= utcToday()) iso = dm[1];
      var p = d.puzzles[iso];
      if (!p) { // pre-launch or past horizon: latest available
        var keys = Object.keys(d.puzzles).sort();
        iso = keys.filter(function (k) { return k <= utcToday(); }).pop() || keys[0];
        p = d.puzzles[iso];
      }
      cb(p, "daily", iso, "#" + dayNum(d.epoch, iso));
    });
  }

  function randomPool(diff) {
    fetch("puzzles-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
      var arr = pools[diff];
      var i = Math.floor(Math.random() * arr.length);
      var q = location.pathname + "?p=" + diff + "-" + i + (EMBED ? "&embed=1" : "");
      history.replaceState(null, "", q);
      start({ p: arr[i], mode: "pool", key: diff + "-" + i, label: diff + " #" + (i + 1) });
    });
  }

  function start(o) {
    var p = o.p;
    state = {
      n: p.n,
      sol_a: p.a.split("").map(Number),
      sol_c: p.c.split("").map(Number),
      given: p.m.split("").map(function (x) { return x === "1"; }),
      fill: [],
      mode: o.mode, key: o.key, num: o.label,
      startT: 0, ticker: null, hints: 0, done: false, sel: -1
    };
    for (var i = 0; i < p.n * p.n; i++) {
      state.fill.push(state.given[i] ? { a: state.sol_a[i], c: state.sol_c[i] } : null);
    }
    $("pnum").textContent = (o.mode === "daily" ? (L.daily || "Daily") : (L.free || "Free play")) + " " + o.label;
    $("timer").textContent = "0:00";
    $("win").hidden = true;
    render();
    gev("play_start", o.mode + ":" + o.key);
  }

  function tick() {
    if (!state || state.done || !state.startT) return;
    var s = Math.floor((Date.now() - state.startT) / 1000);
    $("timer").textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
  }

  function conflicts() {
    var n = state.n, bad = {};
    function mark(i, j) { bad[i] = bad[j] = true; }
    for (var i = 0; i < n * n; i++) {
      var fi = state.fill[i];
      if (!fi) continue;
      var r = Math.floor(i / n), c = i % n;
      for (var j = i + 1; j < n * n; j++) {
        var fj = state.fill[j];
        if (!fj) continue;
        var r2 = Math.floor(j / n), c2 = j % n;
        var sameRow = r === r2, sameCol = c === c2;
        if ((sameRow || sameCol) && fi.a === fj.a) mark(i, j);
        if ((sameRow || sameCol) && fi.c === fj.c) mark(i, j);
        if (fi.a === fj.a && fi.c === fj.c) mark(i, j);
        if (Math.abs(r - r2) <= 1 && Math.abs(c - c2) <= 1 && fi.a === fj.a) mark(i, j);
      }
    }
    return bad;
  }

  function render() {
    var n = state.n, bad = conflicts();
    var g = $("grid");
    g.style.gridTemplateColumns = "repeat(" + n + ",1fr)";
    g.innerHTML = "";
    for (var i = 0; i < n * n; i++) {
      var d = document.createElement("button");
      d.className = "cell" + (state.given[i] ? " given" : "") + (bad[i] ? " bad" : "") + (state.sel === i ? " sel" : "");
      var f = state.fill[i];
      if (f) {
        d.style.background = COLORS[f.c];
        d.textContent = ANIMALS[f.a];
        d.setAttribute("aria-label", COLOR_NAMES[f.c] + " " + f.a);
      } else {
        d.textContent = "";
        d.setAttribute("aria-label", L.empty || "empty");
      }
      (function (idx) { d.onclick = function () { cellTap(idx); }; })(i);
      g.appendChild(d);
    }
    renderPalette();
  }

  function usedPairs() {
    var u = {};
    state.fill.forEach(function (f) { if (f) u[f.a + "-" + f.c] = true; });
    return u;
  }

  function renderPalette() {
    var n = state.n, pal = $("palette"), u = usedPairs();
    pal.style.gridTemplateColumns = "repeat(" + n + ",1fr)";
    pal.innerHTML = "";
    for (var a = 0; a < n; a++) {
      for (var c = 0; c < n; c++) {
        var b = document.createElement("button");
        b.className = "pal" + (u[a + "-" + c] ? " used" : "");
        b.style.background = COLORS[c];
        b.textContent = ANIMALS[a];
        (function (aa, cc) { b.onclick = function () { pairTap(aa, cc); }; })(a, c);
        pal.appendChild(b);
      }
    }
  }

  function cellTap(i) {
    if (state.done || state.given[i]) return;
    if (state.fill[i]) { state.fill[i] = null; state.sel = i; render(); return; }
    state.sel = (state.sel === i ? -1 : i);
    render();
  }

  function pairTap(a, c) {
    if (state.done || state.sel < 0 || state.given[state.sel]) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.fill[state.sel] = { a: a, c: c };
    var nn = state.n * state.n, next = -1;
    for (var k = 1; k <= nn; k++) {
      var j = (state.sel + k) % nn;
      if (!state.given[j] && !state.fill[j]) { next = j; break; }
    }
    state.sel = next;
    render();
    check();
  }

  function check() {
    var full = state.fill.every(function (f) { return f; });
    if (!full || Object.keys(conflicts()).length) return;
    state.done = true;
    clearInterval(state.ticker);
    var secs = state.startT ? Math.floor((Date.now() - state.startT) / 1000) : 0;
    var t = Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2);
    $("wtime").textContent = t;
    var streak = 0;
    if (state.mode === "daily") {
      try { localStorage.setItem("gl_done_" + state.key, String(secs)); } catch (e) {}
    }
    if (state.mode === "daily" && state.key === utcToday()) {
      // archive replays record a solve but never extend today's streak
      try {
        var st = JSON.parse(localStorage.getItem("gl_streak") || "{}");
        var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        streak = (st.last === y ? (st.n || 0) : (st.last === utcToday() ? (st.n || 1) - 1 : 0)) + 1;
        localStorage.setItem("gl_streak", JSON.stringify({ last: utcToday(), n: streak }));
      } catch (e) { streak = 1; }
    }
    $("wstreak").textContent = streak > 0 ? (L.streak || "Streak") + ": " + streak + "🔥" : "";
    $("whints").textContent = state.hints ? (L.hints_used || "Hints") + ": " + state.hints : (L.no_hints || "No hints 🧠");
    $("win").hidden = false;
    gev("solve", state.mode + ":" + state.key + (state.hints ? ":h" + state.hints : ":clean"), secs);
    window._share = "Gridlings " + state.num + " ⏱ " + t +
      (state.hints ? " (" + state.hints + " 💡)" : " 🧠") +
      (streak > 1 ? " 🔥" + streak : "") + (CLEAN ? "" : "\nhttps://play.agiscorecard.com");
  }

  function hint() {
    if (!state || state.done) return;
    var empt = [];
    for (var i = 0; i < state.n * state.n; i++) if (!state.fill[i]) empt.push(i);
    var wrong = [];
    for (var j = 0; j < state.n * state.n; j++) {
      var f = state.fill[j];
      if (f && !state.given[j] && (f.a !== state.sol_a[j] || f.c !== state.sol_c[j])) wrong.push(j);
    }
    var pick = wrong.length ? wrong[0] : (empt.length ? empt[Math.floor(Math.random() * empt.length)] : -1);
    if (pick < 0) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.fill[pick] = { a: state.sol_a[pick], c: state.sol_c[pick] };
    state.hints++; state.sel = -1;
    render();
    gev("hint_used", state.mode + ":" + state.key, state.hints);
    check();
  }

  function share() {
    var txt = window._share || ("Gridlings — a daily logic grid puzzle\nhttps://play.agiscorecard.com");
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
      $("sharebtn").textContent = L.copied || "Copied!";
      setTimeout(function () { $("sharebtn").textContent = L.share || "Share result"; }, 1600);
    }).catch(function () { prompt("Copy:", txt); });
    gev("share_copy", state ? state.mode + ":" + state.key : "none");
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (EMBED || CLEAN) document.documentElement.classList.add("embed");
    $("hintbtn").onclick = hint;
    $("sharebtn").onclick = share;
    $("again").onclick = function () {
      var diff = state && state.mode === "pool" ? state.key.split("-")[0] : "medium";
      gev("play_again", diff);
      randomPool(diff);
    };
    ["easy", "medium", "hard"].forEach(function (diff) {
      var el = $("d-" + diff);
      if (el) el.onclick = function (ev) { ev.preventDefault(); randomPool(diff); };
    });
    var sub = $("subcta");
    if (sub) sub.addEventListener("click", function () { gev("sub_click", "gridlings_win"); });
    loadPuzzle(function (p, mode, key, label) { start({ p: p, mode: mode, key: key, label: label }); });
  });
})();
