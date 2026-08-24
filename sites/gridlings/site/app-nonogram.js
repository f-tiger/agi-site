/* Nonogram client — tap cycles empty → filled → X → empty. Row/column clues
   dim when their line matches exactly, turn red when overfilled. Win when the
   filled set equals the solution (X marks are player notes, not answers).
   Same Gridlings contract as every other ruleset. */
(function () {
  "use strict";
  var L = window.NONOGRAM_LANG || {};
  var PATH = window.NONOGRAM_PATH || "/nonogram";
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
    try { window.gtag && gtag("event", n, { event_category: "nonogram", event_label: l || "", value: v || 0 }); } catch (e) {}
  }

  function utcToday() { return new Date().toISOString().slice(0, 10); }
  function dayNum(epoch, iso) { return Math.round((Date.parse(iso) - Date.parse(epoch)) / 864e5) + 1; }

  function loadPuzzle(cb) {
    var m = location.search.match(/[?&]p=(easy|medium|hard)-(\d+)/);
    if (m) {
      fetch("nonogram-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
        var arr = pools[m[1]] || [];
        var i = Math.min(parseInt(m[2], 10), arr.length - 1);
        cb(arr[i], "pool", "ng-" + m[1] + "-" + i, m[1] + " #" + (i + 1));
      });
      return;
    }
    var dm = location.search.match(/[?&]d=(\d{4}-\d{2}-\d{2})/);
    fetch("nonogram-daily.json").then(function (r) { return r.json(); }).then(function (d) {
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
    fetch("nonogram-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
      var arr = pools[diff];
      var i = Math.floor(Math.random() * arr.length);
      history.replaceState(null, "", location.pathname + "?p=" + diff + "-" + i + (EMBED ? "&embed=1" : ""));
      start({ p: arr[i], mode: "pool", key: "ng-" + diff + "-" + i, label: diff + " #" + (i + 1) });
    });
  }

  function start(o) {
    var p = o.p, n = p.n;
    state = {
      n: n, p: p,
      sol: p.sol.split("").map(Number),
      fill: new Array(n * n).fill(0), // 0 empty, 1 filled, 2 X-mark
      rowCl: p.r.split(",").map(function (s) { return s.split(".").map(Number); }),
      colCl: p.c.split(",").map(function (s) { return s.split(".").map(Number); }),
      mode: o.mode, key: o.key, num: o.label,
      startT: 0, ticker: null, hints: 0, done: false
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
    gev("play_start", o.mode === "daily" ? "ng-daily:" + o.key : "pool:" + o.key);
  }

  function tick() {
    if (!state || state.done || !state.startT) return;
    var s = Math.floor((Date.now() - state.startT) / 1000);
    $("timer").textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
  }

  function runsOf(line) {
    var runs = [], k = 0;
    for (var i = 0; i < line.length; i++) {
      if (line[i] === 1) k++;
      else if (k) { runs.push(k); k = 0; }
    }
    if (k) runs.push(k);
    return runs.length ? runs : [0];
  }

  function lineState(line, clue) {
    // "done" = filled pattern matches clue exactly; "over" = too many fills
    var runs = runsOf(line);
    var total = clue.reduce(function (a, b) { return a + b; }, 0);
    var have = line.filter(function (v) { return v === 1; }).length;
    if (have > total) return "over";
    if (have === total && runs.join(",") === clue.join(",")) return "done";
    return "";
  }

  function render() {
    var n = state.n;
    var g = $("grid");
    g.innerHTML = "";
    g.style.gridTemplateColumns = "minmax(34px,auto) repeat(" + n + ",1fr)";
    g.style.gap = n > 10 ? "3px" : "4px";
    // corner + column clue cells
    var corner = document.createElement("div");
    g.appendChild(corner);
    for (var c = 0; c < n; c++) {
      var col = [];
      for (var r0 = 0; r0 < n; r0++) col.push(state.fill[r0 * n + c]);
      var st = lineState(col, state.colCl[c]);
      var t = document.createElement("div");
      t.style.cssText = "display:flex;flex-direction:column;align-items:center;justify-content:flex-end;" +
        "font-weight:700;font-size:clamp(10px,2.6vw,13px);line-height:1.25;font-variant-numeric:tabular-nums;" +
        (st === "over" ? "color:#C8102E;" : st === "done" ? "opacity:.35;" : "color:var(--mut);");
      t.textContent = "";
      state.colCl[c].forEach(function (x) {
        var s = document.createElement("span");
        s.textContent = String(x);
        t.appendChild(s);
      });
      g.appendChild(t);
    }
    for (var r = 0; r < n; r++) {
      var row = state.fill.slice(r * n, r * n + n);
      var rst = lineState(row, state.rowCl[r]);
      var lft = document.createElement("div");
      lft.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:4px;padding-right:4px;" +
        "font-weight:700;font-size:clamp(10px,2.6vw,13px);font-variant-numeric:tabular-nums;" +
        (rst === "over" ? "color:#C8102E;" : rst === "done" ? "opacity:.35;" : "color:var(--mut);");
      lft.textContent = state.rowCl[r].join(" ");
      g.appendChild(lft);
      for (var c2 = 0; c2 < n; c2++) {
        var i = r * n + c2;
        var d = document.createElement("button");
        d.className = "cell";
        d.style.borderRadius = "6px";
        if (state.fill[i] === 1) {
          d.style.background = "var(--acc)";
          d.style.borderColor = "var(--acc)";
        } else if (state.fill[i] === 2) {
          d.textContent = "×";
          d.style.color = "var(--mut)";
          d.style.fontSize = "clamp(13px,3.5vw,18px)";
        }
        // thicker guide line every 5 cells keeps big grids countable
        if (c2 % 5 === 0 && c2 > 0) d.style.borderLeft = "2px solid var(--mut)";
        if (r % 5 === 0 && r > 0) d.style.borderTop = "2px solid var(--mut)";
        (function (idx) { d.onclick = function () { tap(idx); }; })(i);
        g.appendChild(d);
      }
    }
  }

  function tap(i) {
    if (state.done) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.fill[i] = (state.fill[i] + 1) % 3;
    render();
    check();
  }

  function check() {
    var n = state.n;
    for (var i = 0; i < n * n; i++) {
      if ((state.fill[i] === 1 ? 1 : 0) !== state.sol[i]) return;
    }
    state.done = true;
    clearInterval(state.ticker);
    var secs = state.startT ? Math.floor((Date.now() - state.startT) / 1000) : 0;
    var t = Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2);
    $("wtime").textContent = t;
    var streak = 0;
    if (state.mode === "daily") {
      try { localStorage.setItem("ng_done_" + state.key, String(secs)); } catch (e) {}
    }
    if (state.mode === "daily" && state.key === utcToday()) {
      try {
        var st = JSON.parse(localStorage.getItem("ng_streak") || "{}");
        var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        streak = (st.last === y ? (st.n || 0) : (st.last === utcToday() ? (st.n || 1) - 1 : 0)) + 1;
        localStorage.setItem("ng_streak", JSON.stringify({ last: utcToday(), n: streak }));
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
    gev("solve", "ng:" + state.key + (state.hints ? ":h" + state.hints : ":clean"), secs);
    window._share = (L.name || "Nonogram") + " " + state.num + " ⏱ " + t +
      (state.hints ? " (" + state.hints + " 💡)" : " 🧠") +
      (streak > 1 ? " 🔥" + streak : "") + (CLEAN ? "" : "\nhttps://play.agiscorecard.com" + PATH);
  }

  function hint() {
    if (!state || state.done) return;
    var n = state.n, wrong = [], empty = [];
    for (var i = 0; i < n * n; i++) {
      var f = state.fill[i] === 1 ? 1 : 0;
      if (f !== state.sol[i]) {
        if (state.fill[i] === 0 && state.sol[i] === 1) empty.push(i);
        else if (state.fill[i] === 1 && state.sol[i] === 0) wrong.push(i);
        else empty.push(i); // X on a filled cell counts as missing
      }
    }
    var pick = wrong.length ? wrong[0] : (empty.length ? empty[Math.floor(Math.random() * empty.length)] : -1);
    if (pick < 0) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.fill[pick] = state.sol[pick] === 1 ? 1 : 2;
    state.hints++;
    render();
    gev("hint_used", "ng:" + state.key, state.hints);
    check();
  }

  function share() {
    var txt = window._share || ("Nonogram\nhttps://play.agiscorecard.com" + PATH);
    window.glCopy(txt).then(function () {
      $("sharebtn").textContent = L.copied || "Copied!";
      setTimeout(function () { $("sharebtn").textContent = L.share || "Share result"; }, 1600);
    }).catch(function () { window.glCopyShow(txt); });
    gev("share_copy", "ng:" + (state ? state.key : "none"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (EMBED || CLEAN) document.documentElement.classList.add("embed");
    $("hintbtn").onclick = hint;
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
      gev("play_again", "ng:" + diff);
      randomPool(diff);
    };
    ["easy", "medium", "hard"].forEach(function (diff) {
      var el = $("d-" + diff);
      if (el) el.onclick = function (ev) { ev.preventDefault(); randomPool(diff); };
    });
    var sub = $("subcta");
    if (sub) sub.addEventListener("click", function () { gev("sub_click", "nonogram_win"); });
    loadPuzzle(function (p, mode, key, label) { start({ p: p, mode: mode, key: key, label: label }); });
  });
})();
