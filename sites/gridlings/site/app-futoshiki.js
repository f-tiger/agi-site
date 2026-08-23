/* Futoshiki — client. Tap a cell to cycle 1..n → empty; satisfy row/column
   Latin rule and the inequality signs. Same Gridlings contract. */
(function () {
  "use strict";
  var L = window.FUTOSHIKI_LANG || {};
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
      var b = JSON.stringify({ n: n, l: (l || "").slice(0, 80), v: v || 0, p: "/futoshiki" });
      navigator.sendBeacon ? navigator.sendBeacon("/e", b)
        : fetch("/e", { method: "POST", body: b, keepalive: true });
    } catch (e) {}
    try { window.gtag && gtag("event", n, { event_category: "futoshiki", event_label: l || "", value: v || 0 }); } catch (e) {}
  }

  function utcToday() { return new Date().toISOString().slice(0, 10); }
  function dayNum(epoch, iso) { return Math.round((Date.parse(iso) - Date.parse(epoch)) / 864e5) + 1; }

  function loadPuzzle(cb) {
    var m = location.search.match(/[?&]p=(easy|medium|hard)-(\d+)/);
    if (m) {
      fetch("futoshiki-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
        var arr = pools[m[1]] || [];
        var i = Math.min(parseInt(m[2], 10), arr.length - 1);
        cb(arr[i], "pool", "fu-" + m[1] + "-" + i, m[1] + " #" + (i + 1));
      });
      return;
    }
    var dm = location.search.match(/[?&]d=(\d{4}-\d{2}-\d{2})/);
    fetch("futoshiki-daily.json").then(function (r) { return r.json(); }).then(function (d) {
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
    fetch("futoshiki-pool.json").then(function (r) { return r.json(); }).then(function (pools) {
      var arr = pools[diff];
      var i = Math.floor(Math.random() * arr.length);
      history.replaceState(null, "", location.pathname + "?p=" + diff + "-" + i + (EMBED ? "&embed=1" : ""));
      start({ p: arr[i], mode: "pool", key: "fu-" + diff + "-" + i, label: diff + " #" + (i + 1) });
    });
  }

  function start(o) {
    var p = o.p, n = p.n;
    var ineqs = {};
    if (p.iq) p.iq.split(",").forEach(function (tok) {
      ineqs[tok[0] + tok[1] + tok[2]] = tok[3]; // 'L' first<second, 'G' first>second
    });
    state = {
      n: n, sol: p.sol.split("").map(Number),
      given: p.g.split("").map(Number),
      ineqs: ineqs,
      fill: p.g.split("").map(Number),
      mode: o.mode, key: o.key, num: o.label,
      startT: 0, ticker: null, hints: 0, done: false, sel: -1
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
    buildPad();
    gev("play_start", o.mode === "daily" ? "fu-daily:" + o.key : "pool:" + o.key);
  }

  function tick() {
    if (!state || state.done || !state.startT) return;
    var s = Math.floor((Date.now() - state.startT) / 1000);
    $("timer").textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
  }

  function conflicts() {
    var n = state.n, bad = {};
    for (var i = 0; i < n * n; i++) {
      var v = state.fill[i];
      if (!v) continue;
      var r = Math.floor(i / n), c = i % n;
      for (var j = i + 1; j < n * n; j++) {
        if (state.fill[j] !== v) continue;
        var r2 = Math.floor(j / n), c2 = j % n;
        if (r === r2 || c === c2) { bad[i] = true; bad[j] = true; }
      }
    }
    Object.keys(state.ineqs).forEach(function (k) {
      var t = k[0], r = +k[1], c = +k[2];
      var a = state.fill[r * n + c];
      var b = t === "h" ? state.fill[r * n + c + 1] : state.fill[(r + 1) * n + c];
      if (a && b) {
        var okv = state.ineqs[k] === "L" ? a < b : a > b;
        if (!okv) {
          bad[r * n + c] = true;
          bad[t === "h" ? r * n + c + 1 : (r + 1) * n + c] = true;
        }
      }
    });
    return bad;
  }

  function render() {
    var n = state.n, bad = conflicts();
    var g = $("grid");
    // (2n-1)x(2n-1) lattice: cells on even tracks, signs on odd tracks
    var cols = [];
    for (var x = 0; x < 2 * n - 1; x++) cols.push(x % 2 === 0 ? "1fr" : "22px");
    g.style.gridTemplateColumns = cols.join(" ");
    g.classList.add("fu");
    g.innerHTML = "";
    for (var gr = 0; gr < 2 * n - 1; gr++) {
      for (var gc = 0; gc < 2 * n - 1; gc++) {
        var el;
        if (gr % 2 === 0 && gc % 2 === 0) {
          var r = gr / 2, c = gc / 2, i = r * n + c;
          el = document.createElement("button");
          el.className = "cell" + (state.given[i] ? " given" : "") + (bad[i] ? " bad" : "") + (state.sel === i ? " sel" : "");
          el.textContent = state.fill[i] ? String(state.fill[i]) : "";
          (function (idx) { el.onclick = function () { tap(idx); }; })(i);
        } else {
          el = document.createElement("div");
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.fontWeight = "800";
          el.style.opacity = "0.85";
          var sign = "";
          if (gr % 2 === 0 && gc % 2 === 1) { // horizontal edge
            var s0 = state.ineqs["h" + (gr / 2) + ((gc - 1) / 2)];
            if (s0) sign = s0 === "L" ? "‹" : "›";
          } else if (gr % 2 === 1 && gc % 2 === 0) { // vertical edge
            var s1 = state.ineqs["v" + ((gr - 1) / 2) + (gc / 2)];
            if (s1) sign = s1 === "L" ? "∧" : "∨";
          }
          el.textContent = sign;
        }
        g.appendChild(el);
      }
    }
  }

  function tap(i) {
    if (state.done) return;
    state.sel = i;
    if (state.given[i]) { render(); return; }
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.fill[i] = (state.fill[i] + 1) % (state.n + 1);
    render();
    check();
  }

  function check() {
    var n = state.n;
    for (var i = 0; i < n * n; i++) if (!state.fill[i]) return;
    if (Object.keys(conflicts()).length) return;
    state.done = true;
    clearInterval(state.ticker);
    var secs = state.startT ? Math.floor((Date.now() - state.startT) / 1000) : 0;
    var t = Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2);
    $("wtime").textContent = t;
    var streak = 0;
    if (state.mode === "daily") {
      try { localStorage.setItem("fu_done_" + state.key, String(secs)); } catch (e) {}
    }
    if (state.mode === "daily" && state.key === utcToday()) {
      try {
        var st = JSON.parse(localStorage.getItem("fu_streak") || "{}");
        var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        streak = (st.last === y ? (st.n || 0) : (st.last === utcToday() ? (st.n || 1) - 1 : 0)) + 1;
        localStorage.setItem("fu_streak", JSON.stringify({ last: utcToday(), n: streak }));
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
    gev("solve", "fu:" + state.key + (state.hints ? ":h" + state.hints : ":clean"), secs);
    window._share = "Futoshiki " + state.num + " ≶ ⏱ " + t +
      (state.hints ? " (" + state.hints + " 💡)" : " 🧠") +
      (streak > 1 ? " 🔥" + streak : "") + (CLEAN ? "" : "\nhttps://play.agiscorecard.com/futoshiki");
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
    gev("hint_used", "fu:" + state.key, state.hints);
    check();
  }

  function share() {
    var txt = window._share || ("Futoshiki — a daily inequality puzzle\nhttps://play.agiscorecard.com/futoshiki");
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
      $("sharebtn").textContent = L.copied || "Copied!";
      setTimeout(function () { $("sharebtn").textContent = L.share || "Share result"; }, 1600);
    }).catch(function () { prompt("Copy:", txt); });
    gev("share_copy", "fu:" + (state ? state.key : "none"));
  }



  function buildPad() {
    var old = document.getElementById("numpad");
    if (old) old.remove();
    var n = state.n;
    var pad = document.createElement("div");
    pad.id = "numpad";
    pad.style.cssText = "display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:10px auto 0;max-width:440px";
    function mk(label, v) {
      var b = document.createElement("button");
      b.className = "btn";
      b.textContent = label;
      b.style.cssText = "min-width:42px;padding:10px 0;font-size:17px;font-variant-numeric:tabular-nums";
      b.onclick = function () {
        if (!state || state.done) return;
        if (state.sel < 0) {
          for (var i = 0; i < n * n; i++) { if (!state.given[i] && !state.fill[i]) { state.sel = i; break; } }
          if (state.sel < 0) return;
        }
        setCell(state.sel, v);
      };
      return b;
    }
    for (var v = 1; v <= n; v++) pad.appendChild(mk(String(v), v));
    pad.appendChild(mk("\u232b", 0));
    var g = document.getElementById("grid");
    g.parentNode.insertBefore(pad, g.nextSibling);
  }

  function setCell(i, v) {
    if (!state || state.done || state.given[i]) return;
    if (!state.startT) { state.startT = Date.now(); state.ticker = setInterval(tick, 1000); }
    state.fill[i] = v;
    render();
    check();
  }

  // Desktop keyboard: arrows select, 1-9 set, 0/Backspace clears
  document.addEventListener("keydown", function (e) {
    if (!state || state.done) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var n = state.n, k = e.key;
    if (k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight") {
      e.preventDefault();
      if (state.sel < 0) { state.sel = 0; render(); return; }
      var r = Math.floor(state.sel / n), c = state.sel % n;
      if (k === "ArrowUp") r = (r + n - 1) % n;
      if (k === "ArrowDown") r = (r + 1) % n;
      if (k === "ArrowLeft") c = (c + n - 1) % n;
      if (k === "ArrowRight") c = (c + 1) % n;
      state.sel = r * n + c;
      render();
      return;
    }
    if (state.sel < 0) return;
    if (/^[1-9]$/.test(k)) {
      var v = parseInt(k, 10);
      if (v <= n) setCell(state.sel, v);
    } else if (k === "0" || k === "Backspace" || k === "Delete") {
      e.preventDefault();
      setCell(state.sel, 0);
    }
  });

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
      gev("play_again", "fu:" + diff);
      randomPool(diff);
    };
    ["easy", "medium", "hard"].forEach(function (diff) {
      var el = $("d-" + diff);
      if (el) el.onclick = function (ev) { ev.preventDefault(); randomPool(diff); };
    });
    var sub = $("subcta");
    if (sub) sub.addEventListener("click", function () { gev("sub_click", "futoshiki_win"); });
    loadPuzzle(function (p, mode, key, label) { start({ p: p, mode: mode, key: key, label: label }); });
  });
})();
