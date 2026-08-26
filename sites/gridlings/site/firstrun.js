/* Shared onboarding + juice (v2, 2026-08-26 — CrazyGames quality pass).
   v1 auto-opened a rules MODAL on first visit; CG's gameplay doc says the
   opposite: "land new users in gameplay immediately … implement the
   onboarding in gameplay, make it skippable". So v2 never blocks the board:
   first visit shows a slim dismissible coach bar above the grid (first rule
   line + full-rules link), gone forever once dismissed or once the player
   wins. The full-rules modal stays available behind "?" and the bar's link.
   Also adds a shared WebAudio SFX engine (window.glSfx) with a persisted
   mute toggle, and plays the win sound from the same #win hook as the
   confetti — every game gets win audio with zero engine edits. */
(function () {
  var KEY = "fr_" + location.pathname.replace(/[^a-z0-9]/gi, "_");
  function seen() { try { return localStorage.getItem(KEY); } catch (e) { return 1; } }
  function mark() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
  var rules = document.querySelector(".rules");
  var zh = (document.documentElement.lang || "").indexOf("zh") === 0;

  /* ---------- SFX engine (shared, lazy AudioContext) ---------- */
  var MUTEKEY = "gl_mute";
  function muted() {
    if (window.GL_SDK_MUTE === true) return true;  // platform override (CG SDK)
    try { return localStorage.getItem(MUTEKEY) === "1"; } catch (e) { return false; }
  }
  var actx = null;
  function ctx() {
    if (actx) return actx;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    return actx;
  }
  function tone(freq, t0, dur, type, gain) {
    var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.1, c.currentTime + t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02);
  }
  window.glSfx = function (kind) {
    if (muted()) return;
    var c = ctx(); if (!c) return;
    if (c.state === "suspended") { try { c.resume(); } catch (e) {} }
    if (kind === "tap") tone(380, 0, 0.05, "triangle", 0.06);
    else if (kind === "place") { tone(523, 0, 0.07, "sine", 0.09); tone(784, 0.055, 0.09, "sine", 0.08); }
    else if (kind === "clear") tone(300, 0, 0.05, "triangle", 0.05);
    else if (kind === "err") { tone(170, 0, 0.1, "sawtooth", 0.05); tone(140, 0.07, 0.12, "sawtooth", 0.04); }
    else if (kind === "win") [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.16, "sine", 0.09); });
  };
  // In embed/clean mode (portal iframes) the header is display:none — the
  // sound toggle and "?" must stay reachable, so they mount on .meta there.
  function mountPoint() {
    // check the URL, not the .embed class — this runs (deferred) before the
    // game script's DOMContentLoaded handler stamps the class on <html>.
    var em = /(^|[?&])(embed|clean|cg)=1/.test(location.search) || window.GL_CLEAN === true || window.GL_CG === true;
    return (em && document.querySelector(".meta")) || document.querySelector("header h1") || document.querySelector(".meta");
  }
  function addMute() {
    var h = mountPoint();
    if (!h || document.getElementById("frmute")) return;
    var b = document.createElement("button");
    b.id = "frmute";
    b.textContent = muted() ? "🔇" : "🔊";
    b.setAttribute("aria-label", zh ? "音效开关" : "Toggle sound");
    b.style.cssText = "margin-left:8px;border:1px solid var(--line,#ccc);background:var(--bg2,#f5f5f5);border-radius:50%;width:26px;height:26px;font-size:12px;cursor:pointer;vertical-align:middle;line-height:1;padding:0";
    b.onclick = function () {
      var m = !muted();
      try { localStorage.setItem(MUTEKEY, m ? "1" : "0"); } catch (e) {}
      b.textContent = m ? "🔇" : "🔊";
      if (!m) window.glSfx("place");
    };
    h.appendChild(b);
  }

  /* ---------- full-rules modal (opt-in only: "?" or the coach bar link) ---------- */
  function showIntro() {
    if (!rules || document.getElementById("frov")) return;
    var ov = document.createElement("div");
    ov.id = "frov";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:60;display:flex;align-items:center;justify-content:center;padding:16px";
    var card = document.createElement("div");
    card.style.cssText = "background:var(--bg,#fff);color:var(--ink,#111);border:1px solid var(--line,#ddd);border-radius:14px;max-width:440px;max-height:80vh;overflow:auto;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.25)";
    card.innerHTML = rules.innerHTML;
    var btn = document.createElement("button");
    btn.className = "btn pri";
    btn.style.cssText = "margin-top:12px;width:100%";
    btn.textContent = zh ? "明白了,开始 →" : "Got it — play →";
    btn.onclick = function () { ov.remove(); };
    card.appendChild(btn);
    ov.appendChild(card);
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  /* ---------- first-visit coach bar: onboarding IN gameplay, skippable ---------- */
  function coachBar() {
    var grid = document.getElementById("grid");
    var li = rules && rules.querySelector("ul li");
    if (!grid || !li || document.getElementById("frcoach")) return;
    var bar = document.createElement("div");
    bar.id = "frcoach";
    bar.style.cssText = "display:flex;align-items:center;gap:8px;margin:.55rem 0;padding:.5rem .7rem;background:var(--bg2,#f5f5f5);border:1px solid var(--line,#ddd);border-radius:10px;font-size:13.5px;line-height:1.4";
    var txt = document.createElement("span");
    txt.style.cssText = "flex:1";
    txt.textContent = "👋 " + li.textContent;
    var more = document.createElement("a");
    more.href = "javascript:void(0)";
    more.textContent = zh ? "完整规则" : "Full rules";
    more.style.cssText = "white-space:nowrap;font-weight:600";
    more.onclick = showIntro;
    var x = document.createElement("button");
    x.textContent = "×";
    x.setAttribute("aria-label", zh ? "关闭" : "Dismiss");
    x.style.cssText = "border:none;background:transparent;color:var(--mut,#666);font-size:18px;cursor:pointer;line-height:1;padding:0 2px";
    x.onclick = function () { mark(); bar.remove(); };
    var ez = document.getElementById("d-easy");
    if (ez) {
      var easy = document.createElement("a");
      easy.href = "javascript:void(0)";
      easy.textContent = zh ? "新手?先来简单盘 →" : "New? Try an easy board →";
      easy.style.cssText = "white-space:nowrap;font-weight:600";
      easy.onclick = function () { ez.click(); };
      bar.appendChild(easy);
    }
    bar.appendChild(txt); bar.appendChild(more); bar.appendChild(x);
    bar.insertBefore(txt, bar.firstChild);
    grid.parentNode.insertBefore(bar, grid);
  }
  function dropCoach() {
    var bar = document.getElementById("frcoach");
    if (bar) { mark(); bar.remove(); }
  }

  // "?" reopen affordance next to the H1
  function addHelp() {
    var h = mountPoint();
    if (!h || !rules || document.getElementById("frhelp")) return;
    var q = document.createElement("button");
    q.id = "frhelp"; q.textContent = "?";
    q.setAttribute("aria-label", zh ? "玩法说明" : "How to play");
    q.style.cssText = "margin-left:8px;border:1px solid var(--line,#ccc);background:var(--bg2,#f5f5f5);color:var(--mut,#666);border-radius:50%;width:24px;height:24px;font-size:13px;cursor:pointer;vertical-align:middle;line-height:1";
    q.onclick = showIntro;
    h.appendChild(q);
  }
  function boot() {
    addHelp();
    addMute();
    if (!seen()) coachBar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  // Mobile: open the native share sheet alongside the clipboard copy. The
  // engine handler still runs (copy + its analytics event); this adds the
  // OS sheet when a coarse pointer + Web Share API are present.
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("#sharebtn, #chbtn");
    if (!t || !navigator.share) return;
    try { if (!matchMedia("(pointer: coarse)").matches) return; } catch (err) { return; }
    var txt = t.id === "chbtn"
      ? ((window._challenge ? (zh ? "敢来挑战吗?" : "I solved this puzzle — can you beat my time?") + "\n" + window._challenge : null))
      : window._share;
    if (!txt) return;
    navigator.share({ text: txt }).catch(function () {});
  }, true);

  // win confetti + win sound: fires when #win loses [hidden]
  var win = null;
  function burst() {
    window.glSfx("win");
    dropCoach();
    var EM = ["🎉", "✨", "⭐", "🎊"];
    for (var i = 0; i < 18; i++) {
      var s = document.createElement("span");
      s.textContent = EM[i % EM.length];
      var x = 8 + Math.floor(84 * ((i * 37) % 100) / 100);
      s.style.cssText = "position:fixed;left:" + x + "vw;top:-4vh;font-size:" + (14 + (i * 7) % 14) + "px;z-index:70;pointer-events:none;transition:transform 1.4s ease-in,opacity 1.5s;transform:translateY(0) rotate(0)";
      document.body.appendChild(s);
      (function (el, i2) {
        requestAnimationFrame(function () {
          el.style.transform = "translateY(" + (60 + (i2 * 13) % 40) + "vh) rotate(" + ((i2 % 2 ? 1 : -1) * (180 + i2 * 23)) + "deg)";
          el.style.opacity = "0";
        });
        setTimeout(function () { el.remove(); }, 1600);
      })(s, i);
    }
  }
  function hook() {
    win = document.getElementById("win");
    if (!win) return;
    new MutationObserver(function () {
      if (!win.hidden) burst();
    }).observe(win, { attributes: true, attributeFilter: ["hidden"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hook); else hook();
})();
