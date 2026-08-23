/* Thermometers client — tap a cell to fill its thermometer from the bulb up
   to that cell; tap the top of the mercury to drain back below it. Row and
   column clues count filled cells. Same Gridlings contract as the others. */
(function () {
  "use strict";
  var L = window.THERMO_LANG || {};
  var PATH = window.THERMO_PATH || "/thermo";
  var EMBED = /(^|[?&])embed=1/.test(location.search);
  var CLEAN = window.GL_CLEAN === true || /(^|[?&])clean=1/.test(location.search);
  var CH = (function () {
    var m = location.search.match(/[?&]ct=(\d{1,5})/);
    return m ? parseInt(m[1], 10) : 0;
  })();
  var state = null;
  var $ = function (id) { return document.getElementById(id); };

  function gev(n, l, v) {
    if (CLEAN) return;
    try {
      var b = JSON.stringify({ n: n, l: (l || "").slice(0, 80), v: v || 0, p: PATH });
      navigator.sendBeacon ? navigator.sendBeacon("/e", b)
        : fetch("/e", { method: "POST", body: b, keepalive: true });
    } catch (e) {}
    try { window.gtag && gtag("event", n, { event_category: "thermo", event_label: l || "", value: v || 0 }); } catch (e) {}
  }

  function utcToday() { return new Date().toISOString().slice(0, 10); }
  function dayNum(epoch, iso) { return Math.round((Date.parse(iso) - Date.parse(epoch)) / 864e5) + 1; }

  function loadPuzzle(cb) {
    var m = location.search.match(/[?&]p=(easy|medium|hard)-(\d+)/);
    if (m) {
      fetch("thermo-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
        var arr = pools[m[1]] || [];
        var i = Math.min(parseInt(m[2], 10), arr.length - 1);
        cb(arr[i], "pool", "th-" + m[1] + "-" + i, m[1] + " #" + (i + 1));
      });
      return;
    }
    var dm = location.search.match(/[?&]d=(\d{4}-\d{2}-\d{2})/);
    fetch("thermo-daily.json").then(function (r) { return r.json(); }).then(function (d) {
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
    fetch("thermo-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
      var arr = pools[diff];
      var i = Math.floor(Math.random() * arr.length);
      history.replaceState(null, "", location.pathname + "?p=" + diff + "-" + i + (EMBED ? "&embed=1" : ""));
      start({ p: arr[i], mode: "pool", key: "th-" + diff + "-" + i, label: diff + " #" + (i + 1) });
    });
  }

  function start(o) {
    var p = o.p, n = p.n;
    var thermos = p.t.split(";").map(function (seg) {
      var t = [];
      for (var i = 0; i < seg.length; i += 2) t.push([+seg[i], +seg[i + 1]]);
      return t;
    });
    // per cell: which thermo, position in it
    var cellT = {}, cellPos = {};
    thermos.forEach(function (t, ti) {
      t.forEach(function (rc, pi) { cellT[rc[0] * n + rc[1]] = ti; cellPos[rc[0] * n + rc[1]] = pi; });
    });
    state = {
      n: n, p: p, thermos: thermos, cellT: cellT, cellPos: cellPos,
      level: thermos.map(function () { return 0; }),
      rowCl: p.r.split(",").map(Number), colCl: p.c.split(",").map(Number),
      solLevel: thermos.map(function (t) {
        var lv = 0;
        while (lv < t.length && p.sol[t[lv][0] * n + t[lv][1]] === "1") lv++;
        return lv;
      }),
      mode: o.mode, key: o.key, num: o.label,
      startT: 0, ticker: null, hints: 0, moved: false, done: false
    };
    $("pnum").textContent = (o.mode === "daily" ? (L.daily || "Daily") : (L.free || "Free play")) + " " + o.label + " · " + n + "×" + n;
    $("timer").textContent = "0:00";
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
    gev("play_start", o.mode === "daily" ? "th-daily:" + o.key : "pool:" + o.key);
  }

  function tick() {
    if (!state || state.done || !state.startT) return;
    var s = Math.floor((Date.now() - state.startT) / 1000);
    $("timer").textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
  }

  function counts() {
    var n = state.n;
    var rf = [], cf = [];
    for (var x = 0; x < n; x++) { rf.push(0); cf.push(0); }
    state.thermos.forEach(function (t, ti) {
      for (var i = 0; i < state.level[ti]; i++) { rf[t[i][0]]++; cf[t[i][1]]++; }
    });
    return { r: rf, c: cf };
  }

  function glyph(t, pi) {
    // box-drawing connector from the cells this one links to
    if (pi === 0) return "●";
    var cell = t[pi], prev = t[pi - 1], next = pi + 1 < t.length ? t[pi + 1] : null;
    var sides = {};
    function side(o) {
      if (o[0] < cell[0]) return "u"; if (o[0] > cell[0]) return "d";
      if (o[1] < cell[1]) return "l"; return "r";
    }
    sides[side(prev)] = 1;
    if (next) sides[side(next)] = 1;
    if (sides.l && sides.r) return "─";
    if (sides.u && sides.d) return "│";
    if (sides.l && sides.d) return "┐";
    if (sides.r && sides.d) return "┌";
    if (sides.l && sides.u) return "┘";
    if (sides.r && sides.u) return "└";
    return sides.l || sides.r ? "─" : "│";
  }

  function render() {
    var n = state.n, ct = counts();
    var g = $("grid");
    g.innerHTML = "";
    g.style.gridTemplateColumns = "repeat(" + (n + 1) + ",1fr)";
    g.appendChild(document.createElement("div"));
    for (var c0 = 0; c0 < n; c0++) {
      var t0 = document.createElement("div");
      t0.style.cssText = "display:flex;align-items:center;justify-content:center;font-weight:800;";
      t0.textContent = String(state.colCl[c0]);
      t0.style.color = ct.c[c0] > state.colCl[c0] ? "#C8102E" : "var(--mut)";
      g.appendChild(t0);
    }
    for (var r = 0; r < n; r++) {
      var lft = document.createElement("div");
      lft.style.cssText = "display:flex;align-items:center;justify-content:center;font-weight:800;";
      lft.textContent = String(state.rowCl[r]);
      lft.style.color = ct.r[r] > state.rowCl[r] ? "#C8102E" : "var(--mut)";
      g.appendChild(lft);
      for (var c = 0; c < n; c++) {
        var i = r * n + c;
        var ti = state.cellT[i], pi = state.cellPos[i];
        var t = state.thermos[ti];
        var filled = pi < state.level[ti];
        var d = document.createElement("button");
        d.className = "cell";
        d.textContent = glyph(t, pi);
        d.style.fontSize = pi === 0 ? "clamp(18px,6vw,30px)" : "clamp(20px,7vw,34px)";
        if (filled) {
          d.style.background = "var(--acc)";
          d.style.color = "#fff";
          d.style.borderColor = "var(--acc)";
        } else {
          d.style.color = "var(--mut)";
        }
        (function (idx) { d.onclick = function () { tap(idx); }; })(i);
        g.appendChild(d);
      }
    }
  }

  function tap(i) {
    if (state.done) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    var ti = state.cellT[i], pi = state.cellPos[i];
    // fill up to and including this cell; if it is the current top, drain it
    state.level[ti] = state.level[ti] === pi + 1 ? pi : pi + 1;
    state.moved = true;
    render();
    check();
  }

  function check() {
    if (!state.moved) return;
    var n = state.n, ct = counts();
    for (var x = 0; x < n; x++) {
      if (ct.r[x] !== state.rowCl[x] || ct.c[x] !== state.colCl[x]) return;
    }
    state.done = true;
    clearInterval(state.ticker);
    var secs = state.startT ? Math.floor((Date.now() - state.startT) / 1000) : 0;
    var t = Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2);
    $("wtime").textContent = t;
    var streak = 0;
    if (state.mode === "daily") {
      try { localStorage.setItem("th_done_" + state.key, String(secs)); } catch (e) {}
    }
    if (state.mode === "daily" && state.key === utcToday()) {
      try {
        var st = JSON.parse(localStorage.getItem("th_streak") || "{}");
        var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        streak = (st.last === y ? (st.n || 0) : (st.last === utcToday() ? (st.n || 1) - 1 : 0)) + 1;
        localStorage.setItem("th_streak", JSON.stringify({ last: utcToday(), n: streak }));
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
    gev("solve", "th:" + state.key + (state.hints ? ":h" + state.hints : ":clean"), secs);
    window._share = (L.name || "Thermometers") + " " + state.num + " ⏱ " + t +
      (state.hints ? " (" + state.hints + " 💡)" : " 🧠") +
      (streak > 1 ? " 🔥" + streak : "") + (CLEAN ? "" : "\nhttps://play.agiscorecard.com" + PATH);
  }

  function hint() {
    if (!state || state.done) return;
    var wrong = [];
    for (var ti = 0; ti < state.thermos.length; ti++) {
      if (state.level[ti] !== state.solLevel[ti]) wrong.push(ti);
    }
    if (!wrong.length) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    var pick = wrong[Math.floor(Math.random() * wrong.length)];
    state.level[pick] = state.solLevel[pick];
    state.hints++;
    state.moved = true;
    render();
    gev("hint_used", "th:" + state.key, state.hints);
    check();
  }

  function share() {
    var txt = window._share || ("Thermometers\nhttps://play.agiscorecard.com" + PATH);
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
      $("sharebtn").textContent = L.copied || "Copied!";
      setTimeout(function () { $("sharebtn").textContent = L.share || "Share result"; }, 1600);
    }).catch(function () { prompt("Copy:", txt); });
    gev("share_copy", "th:" + (state ? state.key : "none"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (EMBED || CLEAN) document.documentElement.classList.add("embed");
    $("hintbtn").onclick = hint;
    $("sharebtn").onclick = share;
    var chb = $("chbtn");
    if (chb) chb.onclick = function () {
      var u = window._challenge || (location.origin + location.pathname);
      var txt = (L.ch_text || "I solved this puzzle — can you beat my time?") + "\n" + u;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        chb.textContent = L.copied || "Copied!";
        setTimeout(function () { chb.textContent = L.ch_btn || "⚔️ Challenge a friend"; }, 1600);
      }).catch(function () { prompt("Copy:", txt); });
      gev("challenge_copy", state ? state.key : "");
    };
    $("again").onclick = function () {
      var diff = state && state.mode === "pool" ? state.key.split("-")[1] : "medium";
      gev("play_again", "th:" + diff);
      randomPool(diff);
    };
    ["easy", "medium", "hard"].forEach(function (diff) {
      var el = $("d-" + diff);
      if (el) el.onclick = function (ev) { ev.preventDefault(); randomPool(diff); };
    });
    var sub = $("subcta");
    if (sub) sub.addEventListener("click", function () { gev("sub_click", "thermo_win"); });
    loadPuzzle(function (p, mode, key, label) { start({ p: p, mode: mode, key: key, label: label }); });
  });
})();
