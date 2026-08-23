/* Balance — 6×6 binary balance puzzle client. Same contract as Gridlings:
   baked unique-solution boards, tap to cycle ☀️/🌙, no guessing ever needed. */
(function () {
  "use strict";
  var L = window.BALANCE_LANG || {};
  var SYM = ["☀️", "🌙"];
  var N = 6, HALF = 3;
  var EMBED = /(^|[?&])embed=1/.test(location.search);
  // clean mode: license/portal delivery (Coolmath et al. require no external
  // links, no ads, no stats phoning home). Implies embed chrome, kills the
  // beacon entirely, and strips the URL from share text.
  var CLEAN = window.GL_CLEAN === true || /(^|[?&])clean=1/.test(location.search);
  // Async challenge link (2026-08-23): ?ct=<seconds> — evidence-top viral
  // mechanic (async beats live for small sites). No prizes ever; times are
  // friendly-competition trust + a sanity floor server-side someday.
  var CH = (function () {
    var m = location.search.match(/[?&]ct=(\d{1,5})/);
    return m ? parseInt(m[1], 10) : 0;
  })();
  var state = null;
  var $ = function (id) { return document.getElementById(id); };

  function gev(n, l, v) {
    if (CLEAN) return;
    try {
      var b = JSON.stringify({ n: n, l: (l || "").slice(0, 80), v: v || 0, p: "/balance" });
      navigator.sendBeacon ? navigator.sendBeacon("/e", b)
        : fetch("/e", { method: "POST", body: b, keepalive: true });
    } catch (e) {}
    try { window.gtag && gtag("event", n, { event_category: "balance", event_label: l || "", value: v || 0 }); } catch (e) {}
  }

  function utcToday() { return new Date().toISOString().slice(0, 10); }
  function dayNum(epoch, iso) { return Math.round((Date.parse(iso) - Date.parse(epoch)) / 864e5) + 1; }

  function loadPuzzle(cb) {
    var m = location.search.match(/[?&]p=(easy|medium|hard)-(\d+)/);
    if (m) {
      fetch("balance-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
        var arr = pools[m[1]] || [];
        var i = Math.min(parseInt(m[2], 10), arr.length - 1);
        cb(arr[i], "pool", "bal-" + m[1] + "-" + i, m[1] + " #" + (i + 1));
      });
      return;
    }
    var dm = location.search.match(/[?&]d=(\d{4}-\d{2}-\d{2})/);
    fetch("balance-daily.json").then(function (r) { return r.json(); }).then(function (d) {
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
    fetch("balance-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
      var arr = pools[diff];
      var i = Math.floor(Math.random() * arr.length);
      history.replaceState(null, "", location.pathname + "?p=" + diff + "-" + i + (EMBED ? "&embed=1" : ""));
      start({ p: arr[i], mode: "pool", key: "bal-" + diff + "-" + i, label: diff + " #" + (i + 1) });
    });
  }

  function start(o) {
    var p = o.p;
    state = {
      sol: p.s.split("").map(Number),
      given: p.m.split("").map(function (x) { return x === "1"; }),
      fill: [], mode: o.mode, key: o.key, num: o.label,
      startT: 0, ticker: null, hints: 0, done: false
    };
    for (var i = 0; i < N * N; i++) state.fill.push(state.given[i] ? state.sol[i] : null);
    $("pnum").textContent = (o.mode === "daily" ? (L.daily || "Daily") : (L.free || "Free play")) + " " + o.label;
    $("timer").textContent = "0:00";
    $("win").hidden = true;
    if (CH && !CLEAN) {
      var ban = $("chbanner");
      if (ban) {
        ban.hidden = false;
        ban.textContent = "\u2694\uFE0F " + (L.ch_banner || "Someone solved this puzzle in") + " " +
          Math.floor(CH / 60) + ":" + ("0" + CH % 60).slice(-2) + " \u2014 " + (L.ch_beat || "beat them!");
        gev("challenge_open", String(CH));
      }
    }
    render();
    gev("play_start", o.mode === "daily" ? "bal-daily:" + o.key : "pool:" + o.key);
  }

  function tick() {
    if (!state || state.done || !state.startT) return;
    var s = Math.floor((Date.now() - state.startT) / 1000);
    $("timer").textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
  }

  function conflicts() {
    var bad = {};
    function seq(cells) {
      for (var i = 0; i + 2 < cells.length; i++) {
        var a = cells[i], b = cells[i + 1], c = cells[i + 2];
        if (state.fill[a] !== null && state.fill[a] === state.fill[b] && state.fill[b] === state.fill[c]) {
          bad[a] = bad[b] = bad[c] = true;
        }
      }
    }
    for (var r = 0; r < N; r++) {
      var row = [], col = [];
      for (var c = 0; c < N; c++) { row.push(r * N + c); col.push(c * N + r); }
      seq(row); seq(col);
      [row, col].forEach(function (line) {
        for (var v = 0; v <= 1; v++) {
          var cnt = line.filter(function (i) { return state.fill[i] === v; });
          if (cnt.length > HALF) cnt.forEach(function (i) { bad[i] = true; });
        }
      });
    }
    return bad;
  }

  function render() {
    var bad = conflicts();
    var g = $("grid");
    g.style.gridTemplateColumns = "repeat(" + N + ",1fr)";
    g.innerHTML = "";
    for (var i = 0; i < N * N; i++) {
      var d = document.createElement("button");
      d.className = "cell" + (state.given[i] ? " given" : "") + (bad[i] ? " bad" : "");
      d.textContent = state.fill[i] === null ? "" : SYM[state.fill[i]];
      (function (idx) { d.onclick = function () { tap(idx); }; })(i);
      g.appendChild(d);
    }
  }

  function tap(i) {
    if (state.done || state.given[i]) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.fill[i] = state.fill[i] === null ? 0 : (state.fill[i] === 0 ? 1 : null);
    render();
    check();
  }

  function check() {
    if (state.fill.some(function (f) { return f === null; })) return;
    if (Object.keys(conflicts()).length) return;
    state.done = true;
    clearInterval(state.ticker);
    var secs = state.startT ? Math.floor((Date.now() - state.startT) / 1000) : 0;
    var t = Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2);
    $("wtime").textContent = t;
    var streak = 0;
    if (state.mode === "daily") {
      try { localStorage.setItem("bal_done_" + state.key, String(secs)); } catch (e) {}
    }
    if (state.mode === "daily" && state.key === utcToday()) {
      try {
        var st = JSON.parse(localStorage.getItem("bal_streak") || "{}");
        var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        streak = (st.last === y ? (st.n || 0) : (st.last === utcToday() ? (st.n || 1) - 1 : 0)) + 1;
        localStorage.setItem("bal_streak", JSON.stringify({ last: utcToday(), n: streak }));
      } catch (e) { streak = 1; }
    }
    $("wstreak").textContent = streak > 0 ? (L.streak || "Streak") + ": " + streak + "🔥" : "";
    $("whints").textContent = state.hints ? (L.hints_used || "Hints") + ": " + state.hints : (L.no_hints || "No hints 🧠");
    $("win").hidden = false;
    gev("solve", "bal:" + state.key + (state.hints ? ":h" + state.hints : ":clean"), secs);
    if (CH && !CLEAN) {
      var beat = secs < CH;
      var cb = $("chresult");
      if (cb) {
        cb.hidden = false;
        cb.textContent = beat ? (L.ch_won || "\uD83C\uDFC6 You beat their time!") : (L.ch_lost || "They were faster \u2014 rematch?");
      }
      gev("challenge_result", beat ? "win" : "lose");
    }
    try {
      var cu = location.origin + location.pathname + (location.search ? location.search.replace(/[?&]ct=\d+/, "") : "");
      cu += (cu.indexOf("?") > -1 ? "&" : "?") + "ct=" + secs;
      window._challenge = cu;
    } catch (e) {}
    window._share = "Balance " + state.num + " ⏱ " + t +
      (state.hints ? " (" + state.hints + " 💡)" : " 🧠") +
      (streak > 1 ? " 🔥" + streak : "") + (CLEAN ? "" : "\nhttps://play.agiscorecard.com/balance");
  }

  function hint() {
    if (!state || state.done) return;
    var wrong = [], empty = [];
    for (var i = 0; i < N * N; i++) {
      if (state.given[i]) continue;
      if (state.fill[i] === null) empty.push(i);
      else if (state.fill[i] !== state.sol[i]) wrong.push(i);
    }
    var pick = wrong.length ? wrong[0] : (empty.length ? empty[Math.floor(Math.random() * empty.length)] : -1);
    if (pick < 0) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.fill[pick] = state.sol[pick];
    state.hints++;
    render();
    gev("hint_used", "bal:" + state.key, state.hints);
    check();
  }

  function share() {
    var txt = window._share || ("Balance — a daily sun/moon logic puzzle\nhttps://play.agiscorecard.com/balance");
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
      $("sharebtn").textContent = L.copied || "Copied!";
      setTimeout(function () { $("sharebtn").textContent = L.share || "Share result"; }, 1600);
    }).catch(function () { prompt("Copy:", txt); });
    gev("share_copy", "bal:" + (state ? state.key : "none"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (EMBED || CLEAN) document.documentElement.classList.add("embed");
    $("hintbtn").onclick = hint;
    $("sharebtn").onclick = share;
    var chb = $("chbtn");
    if (chb) chb.onclick = function () {
      var u = window._challenge || (location.origin + location.pathname);
      var txt = (L.ch_text || "I solved this puzzle \u2014 can you beat my time?") + "\n" + u;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        chb.textContent = L.copied || "Copied!";
        setTimeout(function () { chb.textContent = L.ch_btn || "\u2694\uFE0F Challenge a friend"; }, 1600);
      }).catch(function () { prompt("Copy:", txt); });
      gev("challenge_copy", state ? state.key : "");
    };
    $("again").onclick = function () {
      var diff = state && state.mode === "pool" ? state.key.split("-")[1] : "medium";
      gev("play_again", "bal:" + diff);
      randomPool(diff);
    };
    ["easy", "medium", "hard"].forEach(function (diff) {
      var el = $("d-" + diff);
      if (el) el.onclick = function (ev) { ev.preventDefault(); randomPool(diff); };
    });
    var sub = $("subcta");
    if (sub) sub.addEventListener("click", function () { gev("sub_click", "balance_win"); });
    loadPuzzle(function (p, mode, key, label) { start({ p: p, mode: mode, key: key, label: label }); });
  });
})();
