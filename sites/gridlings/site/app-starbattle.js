/* Star Battle — client. Same contract as the other Gridlings puzzles:
   baked unique-solution boards; tap cycles empty → ★ → ✕ → empty. */
(function () {
  "use strict";
  var L = window.STARBATTLE_LANG || {};
  var EMBED = /(^|[?&])embed=1/.test(location.search);
  var CLEAN = window.GL_CLEAN === true || /(^|[?&])clean=1/.test(location.search);
  var CH = (function () {
    var m = location.search.match(/[?&]ct=(\d{1,5})/);
    return m ? parseInt(m[1], 10) : 0;
  })();
  // region palette: 10 muted hues that keep the star glyph readable
  var RCOLORS = ["#3d4f6b", "#5b3d6b", "#6b3d4a", "#6b5a3d", "#4a6b3d",
                 "#3d6b62", "#3d5a6b", "#553d6b", "#6b473d", "#44506b"];
  var state = null;
  var $ = function (id) { return document.getElementById(id); };

  function gev(n, l, v) {
    if (CLEAN) return;
    try {
      var b = JSON.stringify({ n: n, l: (l || "").slice(0, 80), v: v || 0, p: "/starbattle" });
      navigator.sendBeacon ? navigator.sendBeacon("/e", b)
        : fetch("/e", { method: "POST", body: b, keepalive: true });
    } catch (e) {}
    try { window.gtag && gtag("event", n, { event_category: "starbattle", event_label: l || "", value: v || 0 }); } catch (e) {}
  }

  function utcToday() { return new Date().toISOString().slice(0, 10); }
  function dayNum(epoch, iso) { return Math.round((Date.parse(iso) - Date.parse(epoch)) / 864e5) + 1; }

  function loadPuzzle(cb) {
    var m = location.search.match(/[?&]p=(easy|medium|hard)-(\d+)/);
    if (m) {
      fetch("starbattle-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
        var arr = pools[m[1]] || [];
        var i = Math.min(parseInt(m[2], 10), arr.length - 1);
        cb(arr[i], "pool", "sb-" + m[1] + "-" + i, m[1] + " #" + (i + 1));
      });
      return;
    }
    var dm = location.search.match(/[?&]d=(\d{4}-\d{2}-\d{2})/);
    fetch("starbattle-daily.json").then(function (r) { return r.json(); }).then(function (d) {
      var iso = utcToday();
      if (dm && d.puzzles[dm[1]] && dm[1] <= utcToday()) iso = dm[1];
      var p = d.puzzles[iso];
      if (!p) {
        var keys = Object.keys(d.puzzles).sort();
        iso = keys.filter(function (k) { return k <= utcToday(); }).pop() || keys[0];
        p = d.puzzles[iso];
      }
      cb(p, "daily", iso, "#" + dayNum(d.epoch, iso));
    });
  }

  function randomPool(diff) {
    fetch("starbattle-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
      var arr = pools[diff];
      var i = Math.floor(Math.random() * arr.length);
      history.replaceState(null, "", location.pathname + "?p=" + diff + "-" + i + (EMBED ? "&embed=1" : ""));
      start({ p: arr[i], mode: "pool", key: "sb-" + diff + "-" + i, label: diff + " #" + (i + 1) });
    });
  }

  function start(o) {
    var p = o.p;
    state = {
      n: p.n, s: p.s,
      reg: p.g.split("").map(function (ch) { return ch.charCodeAt(0) - 97; }),
      sol: p.sol.split("").map(Number),
      fill: [], // 0 empty, 1 star, 2 mark
      mode: o.mode, key: o.key, num: o.label,
      startT: 0, ticker: null, hints: 0, done: false,
      hist: [], lastTap: -1, savedElapsed: 0
    };
    for (var i = 0; i < p.n * p.n; i++) state.fill.push(0);
    // resume an unfinished board (quality pass 2026-08-26): fill + elapsed
    // are saved per-puzzle on every move and cleared on solve.
    try {
      var sv = JSON.parse(localStorage.getItem("sb_prog_" + state.key) || "null");
      if (sv && sv.f && sv.f.length === p.n * p.n) {
        state.fill = sv.f.split("").map(Number);
        state.savedElapsed = sv.e || 0;
      }
    } catch (e) {}
    $("pnum").textContent = (o.mode === "daily" ? (L.daily || "Daily") : (L.free || "Free play")) + " " + o.label +
      " · " + p.s + "★";
    var se = state.savedElapsed;
    $("timer").textContent = Math.floor(se / 60) + ":" + ("0" + se % 60).slice(-2);
    $("win").hidden = true;
    if (CH && !CLEAN) {
      var ban = $("chbanner");
      if (ban) {
        ban.hidden = false;
        ban.textContent = "⚔️ " + (L.ch_banner || "Someone solved this puzzle in") + " " +
          Math.floor(CH / 60) + ":" + ("0" + CH % 60).slice(-2) + " — " + (L.ch_beat || "beat them!");
        gev("challenge_open", String(CH));
      }
    }
    render();
    gev("play_start", o.mode === "daily" ? "sb-daily:" + o.key : "pool:" + o.key);
  }

  function tick() {
    if (!state || state.done || !state.startT) return;
    var s = Math.floor((Date.now() - state.startT) / 1000);
    $("timer").textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
  }

  function conflicts() {
    var n = state.n, S = state.s, bad = {};
    var rows = [], cols = [], regs = [];
    for (var i = 0; i < n; i++) { rows.push([]); cols.push([]); regs.push([]); }
    for (var j = 0; j < n * n; j++) {
      if (state.fill[j] !== 1) continue;
      var r = Math.floor(j / n), c = j % n;
      rows[r].push(j); cols[c].push(j); regs[state.reg[j]].push(j);
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          var rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < n && cc >= 0 && cc < n && state.fill[rr * n + cc] === 1) {
            bad[j] = true; bad[rr * n + cc] = true;
          }
        }
      }
    }
    [rows, cols, regs].forEach(function (lines) {
      lines.forEach(function (line) {
        if (line.length > S) line.forEach(function (j) { bad[j] = true; });
      });
    });
    return bad;
  }

  function render() {
    var n = state.n, bad = conflicts();
    var g = $("grid");
    g.style.gridTemplateColumns = "repeat(" + n + ",1fr)";
    g.classList.add("sb");
    g.innerHTML = "";
    for (var i = 0; i < n * n; i++) {
      var d = document.createElement("button");
      d.className = "cell" + (bad[i] ? " bad" : "");
      d.style.background = RCOLORS[state.reg[i] % RCOLORS.length];
      // region borders: thicker edge where neighbor region differs
      var r = Math.floor(i / n), c = i % n;
      var bs = [];
      bs.push(r === 0 || state.reg[i - n] !== state.reg[i] ? "2px solid rgba(255,255,255,.55)" : "1px solid rgba(0,0,0,.25)");
      bs.push(c === n - 1 || state.reg[i + 1] !== state.reg[i] ? "2px solid rgba(255,255,255,.55)" : "1px solid rgba(0,0,0,.25)");
      bs.push(r === n - 1 || state.reg[i + n] !== state.reg[i] ? "2px solid rgba(255,255,255,.55)" : "1px solid rgba(0,0,0,.25)");
      bs.push(c === 0 || state.reg[i - 1] !== state.reg[i] ? "2px solid rgba(255,255,255,.55)" : "1px solid rgba(0,0,0,.25)");
      d.style.borderTop = bs[0]; d.style.borderRight = bs[1];
      d.style.borderBottom = bs[2]; d.style.borderLeft = bs[3];
      d.textContent = state.fill[i] === 1 ? "★" : (state.fill[i] === 2 ? "×" : "");
      if (state.fill[i] === 2) d.style.opacity = "0.75";
      if (i === state.lastTap && state.fill[i] === 1) d.classList.add("pop");
      (function (idx) { d.onclick = function () { tap(idx); }; })(i);
      g.appendChild(d);
    }
    state.lastTap = -1;
  }

  function sfx(k) { try { window.glSfx && window.glSfx(k); } catch (e) {} }

  function saveProg() {
    try {
      if (state.done) { localStorage.removeItem("sb_prog_" + state.key); return; }
      var e = state.startT ? Math.floor((Date.now() - state.startT) / 1000) : state.savedElapsed;
      localStorage.setItem("sb_prog_" + state.key, JSON.stringify({ f: state.fill.join(""), e: e }));
    } catch (e) {}
  }

  function startClock() {
    if (state.startT) return;
    state.startT = Date.now() - state.savedElapsed * 1000;
    state.ticker = setInterval(tick, 1000);
  }

  function tap(i) {
    if (state.done) return;
    startClock();
    var before = Object.keys(conflicts()).length;
    state.hist.push({ i: i, v: state.fill[i] });
    if (state.hist.length > 400) state.hist.shift();
    state.fill[i] = (state.fill[i] + 1) % 3;
    state.lastTap = i;
    var after = Object.keys(conflicts()).length;
    sfx(after > before ? "err" : (state.fill[i] === 1 ? "place" : (state.fill[i] === 2 ? "tap" : "clear")));
    saveProg();
    render();
    check();
  }

  function undo() {
    if (!state || state.done || !state.hist.length) return;
    var m = state.hist.pop();
    state.fill[m.i] = m.v;
    state.lastTap = -1;
    sfx("clear");
    saveProg();
    render();
    gev("undo", "sb:" + state.key);
  }

  function check() {
    var n = state.n, S = state.s;
    var stars = 0;
    for (var i = 0; i < n * n; i++) if (state.fill[i] === 1) stars++;
    if (stars !== n * S) return;
    if (Object.keys(conflicts()).length) return;
    // full count check per row/col/region
    var rows = Array(n).fill(0), cols = Array(n).fill(0), regs = Array(n).fill(0);
    for (var j = 0; j < n * n; j++) {
      if (state.fill[j] !== 1) continue;
      rows[Math.floor(j / n)]++; cols[j % n]++; regs[state.reg[j]]++;
    }
    for (var k = 0; k < n; k++) if (rows[k] !== S || cols[k] !== S || regs[k] !== S) return;
    state.done = true;
    clearInterval(state.ticker);
    saveProg();
    var secs = state.startT ? Math.floor((Date.now() - state.startT) / 1000) : 0;
    var t = Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2);
    $("wtime").textContent = t;
    var streak = 0;
    if (state.mode === "daily") {
      try { localStorage.setItem("sb_done_" + state.key, String(secs)); } catch (e) {}
    }
    if (state.mode === "daily" && state.key === utcToday()) {
      try {
        var st = JSON.parse(localStorage.getItem("sb_streak") || "{}");
        var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        streak = (st.last === y ? (st.n || 0) : (st.last === utcToday() ? (st.n || 1) - 1 : 0)) + 1;
        localStorage.setItem("sb_streak", JSON.stringify({ last: utcToday(), n: streak }));
      } catch (e) { streak = 1; }
    }
    $("wstreak").textContent = streak > 0 ? (L.streak || "Streak") + ": " + streak + "🔥" : "";
    $("whints").textContent = state.hints ? (L.hints_used || "Hints") + ": " + state.hints : (L.no_hints || "No hints 🧠");
    if (CH && !CLEAN) {
      var beat = secs < CH;
      var cb = $("chresult");
      if (cb) {
        cb.hidden = false;
        cb.textContent = beat ? (L.ch_won || "🏆 You beat their time!") : (L.ch_lost || "They were faster — rematch?");
      }
      gev("challenge_result", beat ? "win" : "lose");
    }
    try {
      var cu = location.origin + location.pathname + (location.search ? location.search.replace(/[?&]ct=\d+/, "") : "");
      cu += (cu.indexOf("?") > -1 ? "&" : "?") + "ct=" + secs;
      window._challenge = cu;
    } catch (e) {}
    $("win").hidden = false;
    gev("solve", "sb:" + state.key + (state.hints ? ":h" + state.hints : ":clean"), secs);
    window._share = "Star Battle " + state.num + " ★ ⏱ " + t +
      (state.hints ? " (" + state.hints + " 💡)" : " 🧠") +
      (streak > 1 ? " 🔥" + streak : "") + (CLEAN ? "" : "\nhttps://play.agiscorecard.com/starbattle");
  }

  function hint() {
    if (!state || state.done) return;
    var n = state.n, wrong = [], missing = [];
    for (var i = 0; i < n * n; i++) {
      if (state.fill[i] === 1 && !state.sol[i]) wrong.push(i);
      if (state.fill[i] !== 1 && state.sol[i]) missing.push(i);
    }
    startClock();
    if (wrong.length) {
      state.hist.push({ i: wrong[0], v: state.fill[wrong[0]] });
      state.fill[wrong[0]] = 0;
    } else if (missing.length) {
      var mi = missing[Math.floor(Math.random() * missing.length)];
      state.hist.push({ i: mi, v: state.fill[mi] });
      state.fill[mi] = 1;
      state.lastTap = mi;
    } else return;
    state.hints++;
    sfx("place");
    saveProg();
    render();
    gev("hint_used", "sb:" + state.key, state.hints);
    check();
  }

  function share() {
    var txt = window._share || ("Star Battle — a daily two-star logic puzzle\nhttps://play.agiscorecard.com/starbattle");
    window.glCopy(txt).then(function () {
      $("sharebtn").textContent = L.copied || "Copied!";
      setTimeout(function () { $("sharebtn").textContent = L.share || "Share result"; }, 1600);
    }).catch(function () { window.glCopyShow(txt); });
    gev("share_copy", "sb:" + (state ? state.key : "none"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (EMBED || CLEAN) document.documentElement.classList.add("embed");
    $("hintbtn").onclick = hint;
    var ub = $("undobtn");
    if (ub) ub.onclick = undo;
    $("sharebtn").onclick = share;
    var chb = $("chbtn");
    if (chb) chb.onclick = function () {
      var u = window._challenge || (location.origin + location.pathname);
      var txt = (L.ch_text || "I solved this puzzle — can you beat my time?") + "\n" + u;
      window.glCopy(txt).then(function () {
        chb.textContent = L.copied || "Copied!";
        setTimeout(function () { chb.textContent = L.ch_btn || "⚔️ Challenge a friend"; }, 1600);
      }).catch(function () { window.glCopyShow(txt); });
      gev("challenge_copy", state ? state.key : "");
    };
    $("again").onclick = function () {
      var diff = state && state.mode === "pool" ? state.key.split("-")[1] : "medium";
      gev("play_again", "sb:" + diff);
      randomPool(diff);
    };
    ["easy", "medium", "hard"].forEach(function (diff) {
      var el = $("d-" + diff);
      if (el) el.onclick = function (ev) { ev.preventDefault(); randomPool(diff); };
    });
    var sub = $("subcta");
    if (sub) sub.addEventListener("click", function () { gev("sub_click", "starbattle_win"); });
    loadPuzzle(function (p, mode, key, label) { start({ p: p, mode: mode, key: key, label: label }); });
  });
})();
