/* Shared Latin-family client: minisudoku | kropki | sandwich.
   Page sets window.LATIN_GAME = {type, path, file, name, langVar}.
   Tap cells to cycle 1..n → empty. Same Gridlings contract throughout. */
(function () {
  "use strict";
  var CFG = window.LATIN_GAME;
  var L = window[CFG.langVar] || {};
  var EMBED = /(^|[?&])embed=1/.test(location.search);
  var CLEAN = window.GL_CLEAN === true || /(^|[?&])clean=1/.test(location.search);
  var CH = (function () {
    var m = location.search.match(/[?&]ct=(\d{1,5})/);
    return m ? parseInt(m[1], 10) : 0;
  })();
  var PRE = { minisudoku: "ms", kropki: "kr", sandwich: "sa" }[CFG.type];
  var state = null;
  var $ = function (id) { return document.getElementById(id); };

  function gev(n, l, v) {
    if (CLEAN) return;
    try {
      var b = JSON.stringify({ n: n, l: (l || "").slice(0, 80), v: v || 0, p: CFG.path });
      navigator.sendBeacon ? navigator.sendBeacon("/e", b)
        : fetch("/e", { method: "POST", body: b, keepalive: true });
    } catch (e) {}
    try { window.gtag && gtag("event", n, { event_category: CFG.type, event_label: l || "", value: v || 0 }); } catch (e) {}
  }

  function utcToday() { return new Date().toISOString().slice(0, 10); }
  function dayNum(epoch, iso) { return Math.round((Date.parse(iso) - Date.parse(epoch)) / 864e5) + 1; }

  function loadPuzzle(cb) {
    var m = location.search.match(/[?&]p=(easy|medium|hard)-(\d+)/);
    if (m) {
      fetch(CFG.file + "-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
        var arr = pools[m[1]] || [];
        var i = Math.min(parseInt(m[2], 10), arr.length - 1);
        cb(arr[i], "pool", PRE + "-" + m[1] + "-" + i, m[1] + " #" + (i + 1));
      });
      return;
    }
    var dm = location.search.match(/[?&]d=(\d{4}-\d{2}-\d{2})/);
    fetch(CFG.file + "-daily.json").then(function (r) { return r.json(); }).then(function (d) {
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
    fetch(CFG.file + "-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
      var arr = pools[diff];
      var i = Math.floor(Math.random() * arr.length);
      history.replaceState(null, "", location.pathname + "?p=" + diff + "-" + i + (EMBED ? "&embed=1" : ""));
      start({ p: arr[i], mode: "pool", key: PRE + "-" + diff + "-" + i, label: diff + " #" + (i + 1) });
    });
  }

  function start(o) {
    var p = o.p, n = p.n;
    state = {
      n: n, p: p,
      sol: p.sol.split("").map(Number),
      given: p.g.split("").map(Number),
      fill: p.g.split("").map(Number),
      mode: o.mode, key: o.key, num: o.label,
      startT: 0, ticker: null, hints: 0, done: false
    };
    if (CFG.type === "kropki") {
      state.dots = {};
      if (p.d) p.d.split(",").forEach(function (tok) { state.dots[tok[0] + tok[1] + tok[2]] = tok[3]; });
    }
    if (CFG.type === "sandwich") {
      state.rc = p.rc.split(",").map(Number);
      state.cc = p.cc.split(",").map(Number);
    }
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
    gev("play_start", o.mode === "daily" ? PRE + "-daily:" + o.key : "pool:" + o.key);
  }

  function tick() {
    if (!state || state.done || !state.startT) return;
    var s = Math.floor((Date.now() - state.startT) / 1000);
    $("timer").textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
  }

  function dotRel(a, b) {
    if (a === 2 * b || b === 2 * a) return "B";
    if (Math.abs(a - b) === 1) return "W";
    return "N";
  }

  function sandwichSum(seq, n) {
    var i = seq.indexOf(1), j = seq.indexOf(n);
    if (i < 0 || j < 0) return null;
    var lo = Math.min(i, j), hi = Math.max(i, j), s = 0;
    for (var k = lo + 1; k < hi; k++) s += seq[k];
    return s;
  }

  function conflicts() {
    var n = state.n, bad = {}, badClue = {};
    for (var i = 0; i < n * n; i++) {
      var v = state.fill[i];
      if (!v) continue;
      var r = Math.floor(i / n), c = i % n;
      for (var j = i + 1; j < n * n; j++) {
        if (state.fill[j] !== v) continue;
        var r2 = Math.floor(j / n), c2 = j % n;
        var clash = r === r2 || c === c2;
        if (!clash && CFG.type === "minisudoku") {
          var br = state.p.br, bc = state.p.bc;
          clash = (Math.floor(r / br) === Math.floor(r2 / br)) && (Math.floor(c / bc) === Math.floor(c2 / bc));
        }
        if (clash) { bad[i] = true; bad[j] = true; }
      }
    }
    if (CFG.type === "kropki") {
      Object.keys(state.dots).forEach(function (k) {
        // present dots checked here; missing-dot (negative) violations checked on full lines only
        var t = k[0], r = +k[1], c = +k[2];
        var a = state.fill[r * n + c];
        var b = t === "h" ? state.fill[r * n + c + 1] : state.fill[(r + 1) * n + c];
        if (a && b && dotRel(a, b) !== state.dots[k]) {
          bad[r * n + c] = true;
          bad[t === "h" ? r * n + c + 1 : (r + 1) * n + c] = true;
        }
      });
      for (var r3 = 0; r3 < n; r3++) {
        for (var c3 = 0; c3 < n; c3++) {
          var a1 = state.fill[r3 * n + c3];
          if (!a1) continue;
          if (c3 + 1 < n) {
            var b1 = state.fill[r3 * n + c3 + 1];
            if (b1 && !state.dots["h" + r3 + c3] && dotRel(a1, b1) !== "N") {
              bad[r3 * n + c3] = true; bad[r3 * n + c3 + 1] = true;
            }
          }
          if (r3 + 1 < n) {
            var b2 = state.fill[(r3 + 1) * n + c3];
            if (b2 && !state.dots["v" + r3 + c3] && dotRel(a1, b2) !== "N") {
              bad[r3 * n + c3] = true; bad[(r3 + 1) * n + c3] = true;
            }
          }
        }
      }
    }
    if (CFG.type === "sandwich") {
      for (var r4 = 0; r4 < n; r4++) {
        var row = [];
        for (var c4 = 0; c4 < n; c4++) row.push(state.fill[r4 * n + c4]);
        if (row.every(function (x) { return x > 0; }) && sandwichSum(row, n) !== state.rc[r4]) badClue["L" + r4] = true;
      }
      for (var c5 = 0; c5 < n; c5++) {
        var col = [];
        for (var r5 = 0; r5 < n; r5++) col.push(state.fill[r5 * n + c5]);
        if (col.every(function (x) { return x > 0; }) && sandwichSum(col, n) !== state.cc[c5]) badClue["T" + c5] = true;
      }
    }
    return { cells: bad, clues: badClue };
  }

  function render() {
    var n = state.n, cf = conflicts();
    var g = $("grid");
    g.innerHTML = "";
    if (CFG.type === "sandwich") {
      g.style.gridTemplateColumns = "repeat(" + (n + 1) + ",1fr)";
      // top-left empty + column clues row, then rows with left clue + cells
      var corner = document.createElement("div");
      g.appendChild(corner);
      for (var cc0 = 0; cc0 < n; cc0++) {
        var t0 = document.createElement("div");
        t0.style.cssText = "display:flex;align-items:center;justify-content:center;font-weight:800;";
        t0.textContent = String(state.cc[cc0]);
        t0.style.color = cf.clues["T" + cc0] ? "#e05555" : "var(--mut,#888)";
        g.appendChild(t0);
      }
      for (var rr0 = 0; rr0 < n; rr0++) {
        var lft = document.createElement("div");
        lft.style.cssText = "display:flex;align-items:center;justify-content:center;font-weight:800;";
        lft.textContent = String(state.rc[rr0]);
        lft.style.color = cf.clues["L" + rr0] ? "#e05555" : "var(--mut,#888)";
        g.appendChild(lft);
        for (var cc1 = 0; cc1 < n; cc1++) addCell(g, rr0 * n + cc1, cf);
      }
      return;
    }
    if (CFG.type === "kropki") {
      var cols = [];
      for (var x = 0; x < 2 * n - 1; x++) cols.push(x % 2 === 0 ? "1fr" : "16px");
      g.style.gridTemplateColumns = cols.join(" ");
      for (var gr = 0; gr < 2 * n - 1; gr++) {
        for (var gc = 0; gc < 2 * n - 1; gc++) {
          if (gr % 2 === 0 && gc % 2 === 0) {
            addCell(g, (gr / 2) * n + gc / 2, cf);
          } else {
            var dv = document.createElement("div");
            dv.style.cssText = "display:flex;align-items:center;justify-content:center;";
            var key = null;
            if (gr % 2 === 0 && gc % 2 === 1) key = "h" + (gr / 2) + ((gc - 1) / 2);
            else if (gr % 2 === 1 && gc % 2 === 0) key = "v" + ((gr - 1) / 2) + (gc / 2);
            var s = key && state.dots[key];
            if (s) {
              var dotEl = document.createElement("span");
              dotEl.style.cssText = "width:11px;height:11px;border-radius:50%;border:2px solid var(--ink,#333);" +
                (s === "B" ? "background:var(--ink,#333);" : "background:transparent;");
              dv.appendChild(dotEl);
            }
            g.appendChild(dv);
          }
        }
      }
      return;
    }
    // minisudoku: plain n×n with box borders
    g.style.gridTemplateColumns = "repeat(" + n + ",1fr)";
    for (var i2 = 0; i2 < n * n; i2++) addCell(g, i2, cf, true);
  }

  function addCell(g, i, cf, boxBorders) {
    var n = state.n;
    var d = document.createElement("button");
    d.className = "cell" + (state.given[i] ? " given" : "") + (cf.cells[i] ? " bad" : "");
    d.textContent = state.fill[i] ? String(state.fill[i]) : "";
    if (boxBorders) {
      var br = state.p.br, bc = state.p.bc;
      var r = Math.floor(i / n), c = i % n;
      if (r % br === 0) d.style.borderTop = "2px solid var(--mut)";
      if (c % bc === 0) d.style.borderLeft = "2px solid var(--mut)";
      if (r === n - 1) d.style.borderBottom = "2px solid var(--mut)";
      if (c === n - 1) d.style.borderRight = "2px solid var(--mut)";
    }
    (function (idx) { d.onclick = function () { tap(idx); }; })(i);
    g.appendChild(d);
  }

  function tap(i) {
    if (state.done || state.given[i]) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.fill[i] = (state.fill[i] + 1) % (state.n + 1);
    render();
    check();
  }

  function check() {
    var n = state.n;
    for (var i = 0; i < n * n; i++) if (!state.fill[i]) return;
    var cf = conflicts();
    if (Object.keys(cf.cells).length || Object.keys(cf.clues).length) return;
    state.done = true;
    clearInterval(state.ticker);
    var secs = state.startT ? Math.floor((Date.now() - state.startT) / 1000) : 0;
    var t = Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2);
    $("wtime").textContent = t;
    var streak = 0;
    if (state.mode === "daily") {
      try { localStorage.setItem(PRE + "_done_" + state.key, String(secs)); } catch (e) {}
    }
    if (state.mode === "daily" && state.key === utcToday()) {
      try {
        var st = JSON.parse(localStorage.getItem(PRE + "_streak") || "{}");
        var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        streak = (st.last === y ? (st.n || 0) : (st.last === utcToday() ? (st.n || 1) - 1 : 0)) + 1;
        localStorage.setItem(PRE + "_streak", JSON.stringify({ last: utcToday(), n: streak }));
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
    gev("solve", PRE + ":" + state.key + (state.hints ? ":h" + state.hints : ":clean"), secs);
    window._share = CFG.name + " " + state.num + " ⏱ " + t +
      (state.hints ? " (" + state.hints + " 💡)" : " 🧠") +
      (streak > 1 ? " 🔥" + streak : "") + (CLEAN ? "" : "\nhttps://play.agiscorecard.com" + CFG.path);
  }

  function hint() {
    if (!state || state.done) return;
    var n = state.n, wrong = [], empty = [];
    for (var i = 0; i < n * n; i++) {
      if (state.given[i]) continue;
      if (!state.fill[i]) empty.push(i);
      else if (state.fill[i] !== state.sol[i]) wrong.push(i);
    }
    var pick = wrong.length ? wrong[0] : (empty.length ? empty[Math.floor(Math.random() * empty.length)] : -1);
    if (pick < 0) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.fill[pick] = state.sol[pick];
    state.hints++;
    render();
    gev("hint_used", PRE + ":" + state.key, state.hints);
    check();
  }

  function share() {
    var txt = window._share || (CFG.name + "\nhttps://play.agiscorecard.com" + CFG.path);
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
      $("sharebtn").textContent = L.copied || "Copied!";
      setTimeout(function () { $("sharebtn").textContent = L.share || "Share result"; }, 1600);
    }).catch(function () { prompt("Copy:", txt); });
    gev("share_copy", PRE + ":" + (state ? state.key : "none"));
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
      gev("play_again", PRE + ":" + diff);
      randomPool(diff);
    };
    ["easy", "medium", "hard"].forEach(function (diff) {
      var el = $("d-" + diff);
      if (el) el.onclick = function (ev) { ev.preventDefault(); randomPool(diff); };
    });
    var sub = $("subcta");
    if (sub) sub.addEventListener("click", function () { gev("sub_click", CFG.type + "_win"); });
    loadPuzzle(function (p, mode, key, label) { start({ p: p, mode: mode, key: key, label: label }); });
  });
})();
