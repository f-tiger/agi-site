/* Shared first-run onboarding + win juice (2026-08-24, pre-portal audit).
   Zero engine edits: the overlay clones the page's own .rules block (so it is
   always in the page's language and never drifts from the real rules), and the
   confetti hooks #win via MutationObserver. Storage key is per-path, so each
   game and language shows its intro once. Relative asset — works from the
   live site, /zh/ pages (worker fallback), and the standalone zips alike. */
(function () {
  var KEY = "fr_" + location.pathname.replace(/[^a-z0-9]/gi, "_");
  function seen() { try { return localStorage.getItem(KEY); } catch (e) { return 1; } }
  function mark() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
  var rules = document.querySelector(".rules");
  var zh = (document.documentElement.lang || "").indexOf("zh") === 0;

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
    btn.onclick = function () { mark(); ov.remove(); };
    card.appendChild(btn);
    ov.appendChild(card);
    ov.addEventListener("click", function (e) { if (e.target === ov) { mark(); ov.remove(); } });
    document.body.appendChild(ov);
  }

  if (!seen()) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showIntro);
    else showIntro();
  }
  // "?" reopen affordance next to the H1
  function addHelp() {
    var h = document.querySelector("header h1");
    if (!h || !rules || document.getElementById("frhelp")) return;
    var q = document.createElement("button");
    q.id = "frhelp"; q.textContent = "?";
    q.setAttribute("aria-label", zh ? "玩法说明" : "How to play");
    q.style.cssText = "margin-left:8px;border:1px solid var(--line,#ccc);background:var(--bg2,#f5f5f5);color:var(--mut,#666);border-radius:50%;width:24px;height:24px;font-size:13px;cursor:pointer;vertical-align:middle;line-height:1";
    q.onclick = showIntro;
    h.appendChild(q);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addHelp); else addHelp();

  // Mobile: open the native share sheet alongside the clipboard copy.
  // Clipboard-only sharing is where portal virality dies on phones — the
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

  // win confetti: fires when #win loses [hidden]
  var win = null;
  function burst() {
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
