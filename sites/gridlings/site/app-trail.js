/* Trail — Zip-family path puzzle client. Drag (or tap) to draw one path that
   hits the numbers in order and fills every cell. Same Gridlings contract:
   baked unique-solution boards. */
(function () {
  "use strict";
  var L = window.TRAIL_LANG || {};
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
      var b = JSON.stringify({ n: n, l: (l || "").slice(0, 80), v: v || 0, p: "/trail" });
      navigator.sendBeacon ? navigator.sendBeacon("/e", b)
        : fetch("/e", { method: "POST", body: b, keepalive: true });
    } catch (e) {}
    try { window.gtag && gtag("event", n, { event_category: "trail", event_label: l || "", value: v || 0 }); } catch (e) {}
  }

  function utcToday() { return new Date().toISOString().slice(0, 10); }
  function dayNum(epoch, iso) { return Math.round((Date.parse(iso) - Date.parse(epoch)) / 864e5) + 1; }

  function loadPuzzle(cb) {
    var m = location.search.match(/[?&]p=(easy|medium|hard)-(\d+)/);
    if (m) {
      fetch("trail-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
        var arr = pools[m[1]] || [];
        var i = Math.min(parseInt(m[2], 10), arr.length - 1);
        cb(arr[i], "pool", "tr-" + m[1] + "-" + i, m[1] + " #" + (i + 1));
      });
      return;
    }
    var dm = location.search.match(/[?&]d=(\d{4}-\d{2}-\d{2})/);
    fetch("trail-daily.json").then(function (r) { return r.json(); }).then(function (d) {
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
    fetch("trail-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
      var arr = pools[diff];
      var i = Math.floor(Math.random() * arr.length);
      history.replaceState(null, "", location.pathname + "?p=" + diff + "-" + i + (EMBED ? "&embed=1" : ""));
      start({ p: arr[i], mode: "pool", key: "tr-" + diff + "-" + i, label: diff + " #" + (i + 1) });
    });
  }

  function start(o) {
    var p = o.p;
    var n = p.n;
    var wp = {};
    var maxOrd = 0;
    for (var i = 0; i < n * n; i++) {
      var ch = p.w[i];
      if (ch !== "0") {
        var o2 = parseInt(ch, 16);
        wp[i] = o2;
        if (o2 > maxOrd) maxOrd = o2;
      }
    }
    var startCell = -1;
    for (var j in wp) if (wp[j] === 1) startCell = +j;
    state = {
      n: n, wp: wp, K: maxOrd, startCell: startCell,
      path: [startCell],
      mode: o.mode, key: o.key, num: o.label,
      startT: 0, ticker: null, hints: 0, done: false, drag: false
    };
    $("pnum").textContent = (o.mode === "daily" ? (L.daily || "Daily") : (L.free || "Free play")) + " " + o.label;
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
    gev("play_start", o.mode === "daily" ? "tr-daily:" + o.key : "pool:" + o.key);
  }

  function tick() {
    if (!state || state.done || !state.startT) return;
    var s = Math.floor((Date.now() - state.startT) / 1000);
    $("timer").textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
  }

  function hitOrder() {
    // ordinals encountered along current path, for next-expected computation
    var nxt = 2;
    for (var i = 1; i < state.path.length; i++) {
      var o = state.wp[state.path[i]];
      if (o !== undefined) {
        if (o !== nxt) return -1; // invalid (shouldn't happen; guarded on entry)
        nxt++;
      }
    }
    return nxt;
  }

  function render() {
    var n = state.n;
    var g = $("grid");
    g.style.gridTemplateColumns = "repeat(" + n + ",1fr)";
    g.classList.add("trail");
    g.innerHTML = "";
    var pos = {};
    state.path.forEach(function (cell, idx) { pos[cell] = idx; });
    for (var i = 0; i < n * n; i++) {
      var d = document.createElement("button");
      var inPath = pos[i] !== undefined;
      d.className = "cell" + (inPath ? " onpath" : "");
      if (inPath) {
        d.style.background = "var(--acc, #4fc3a1)";
        d.style.opacity = String(0.55 + 0.45 * (pos[i] / Math.max(1, state.path.length - 1)));
      }
      var o = state.wp[i];
      d.textContent = o !== undefined ? String(o) : "";
      if (o !== undefined) d.style.fontWeight = "800";
      d.dataset.i = i;
      g.appendChild(d);
    }
  }

  function tryExtend(cell) {
    if (state.done) return;
    var n = state.n;
    var last = state.path[state.path.length - 1];
    var idxInPath = state.path.indexOf(cell);
    if (idxInPath >= 0) {
      // truncate back to this cell (undo)
      state.path = state.path.slice(0, idxInPath + 1);
      render();
      return;
    }
    var lr = Math.floor(last / n), lc = last % n;
    var cr = Math.floor(cell / n), cc = cell % n;
    if (Math.abs(lr - cr) + Math.abs(lc - cc) !== 1) return;
    var o = state.wp[cell];
    var nxt = hitOrder();
    if (o !== undefined) {
      if (o !== nxt) return;
      if (o === state.K && state.path.length + 1 !== n * n) return;
    }
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.path.push(cell);
    render();
    check();
  }

  function check() {
    var n = state.n;
    if (state.path.length !== n * n) return;
    var lastOrd = state.wp[state.path[state.path.length - 1]];
    if (lastOrd !== state.K) return;
    state.done = true;
    clearInterval(state.ticker);
    var secs = state.startT ? Math.floor((Date.now() - state.startT) / 1000) : 0;
    var t = Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2);
    $("wtime").textContent = t;
    var streak = 0;
    if (state.mode === "daily") {
      try { localStorage.setItem("tr_done_" + state.key, String(secs)); } catch (e) {}
    }
    if (state.mode === "daily" && state.key === utcToday()) {
      try {
        var st = JSON.parse(localStorage.getItem("tr_streak") || "{}");
        var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        streak = (st.last === y ? (st.n || 0) : (st.last === utcToday() ? (st.n || 1) - 1 : 0)) + 1;
        localStorage.setItem("tr_streak", JSON.stringify({ last: utcToday(), n: streak }));
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
    gev("solve", "tr:" + state.key + (state.hints ? ":h" + state.hints : ":clean"), secs);
    window._share = "Trail " + state.num + " 🐾 ⏱ " + t +
      (state.hints ? " (" + state.hints + " 💡)" : " 🧠") +
      (streak > 1 ? " 🔥" + streak : "") + (CLEAN ? "" : "\nhttps://play.agiscorecard.com/trail");
  }

  function hint() {
    if (!state || state.done) return;
    // reveal: extend the path by the next correct step from the solution
    fetchSol(function (cells) {
      // find longest prefix of solution matching current path; if mismatch, truncate
      var i = 0;
      while (i < state.path.length && i < cells.length && state.path[i] === cells[i]) i++;
      if (i < state.path.length) {
        state.path = state.path.slice(0, Math.max(1, i));
      } else if (i < cells.length) {
        state.path.push(cells[i]);
      }
      state.hints++;
      if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
      render();
      gev("hint_used", "tr:" + state.key, state.hints);
      check();
    });
  }

  var solCache = null;
  function fetchSol(cb) {
    if (solCache) return cb(solCache);
    var src = state.mode === "daily" ? "trail-daily.json" : "trail-pool.json";
    fetch(src).then(function (r) { return r.json(); }).then(function (d) {
      var p;
      if (state.mode === "daily") p = d.puzzles[state.key];
      else {
        var parts = state.key.split("-"); // tr-diff-i
        p = d[parts[1]][+parts[2]];
      }
      var cells = [];
      for (var i = 0; i < p.sol.length; i += 2) cells.push(parseInt(p.sol.slice(i, i + 2), 10));
      solCache = cells;
      cb(cells);
    });
  }

  function share() {
    var txt = window._share || ("Trail — a daily path puzzle\nhttps://play.agiscorecard.com/trail");
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
      $("sharebtn").textContent = L.copied || "Copied!";
      setTimeout(function () { $("sharebtn").textContent = L.share || "Share result"; }, 1600);
    }).catch(function () { prompt("Copy:", txt); });
    gev("share_copy", "tr:" + (state ? state.key : "none"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (EMBED || CLEAN) document.documentElement.classList.add("embed");
    var g = $("grid");
    // tap AND drag both work: pointerdown starts drag, pointerover extends
    g.addEventListener("pointerdown", function (ev) {
      var b = ev.target.closest && ev.target.closest(".cell");
      if (!b) return;
      state.drag = true;
      tryExtend(+b.dataset.i);
      ev.preventDefault();
    });
    g.addEventListener("pointermove", function (ev) {
      if (!state || !state.drag) return;
      var el = document.elementFromPoint(ev.clientX, ev.clientY);
      var b = el && el.closest && el.closest(".cell");
      if (b) tryExtend(+b.dataset.i);
    });
    window.addEventListener("pointerup", function () { if (state) state.drag = false; });
    $("resetbtn").onclick = function () {
      if (!state || state.done) return;
      state.path = [state.startCell];
      render();
    };
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
      gev("play_again", "tr:" + diff);
      randomPool(diff);
    };
    ["easy", "medium", "hard"].forEach(function (diff) {
      var el = $("d-" + diff);
      if (el) el.onclick = function (ev) { ev.preventDefault(); randomPool(diff); };
    });
    var sub = $("subcta");
    if (sub) sub.addEventListener("click", function () { gev("sub_click", "trail_win"); });
    loadPuzzle(function (p, mode, key, label) { solCache = null; start({ p: p, mode: mode, key: key, label: label }); });
  });
})();
