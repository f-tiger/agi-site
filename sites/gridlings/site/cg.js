/* CrazyGames bridge (2026-08-26, resubmission hardening).
   Active ONLY when the page runs with ?cg=1 or inside a crazygames referrer —
   the public site never loads the SDK. When active:
   - stamps .embed + .cg on <html> (portal chrome off, off-platform links off)
   - loads SDK v3, init(), reports loadingStart → loadingStop (grid rendered)
   - exposes window.glCg('start'|'stop'|'happy') for gameplay lifecycle;
     a silent no-op everywhere else, so game code can call it unconditionally.
   Every SDK touch is try/catch-guarded: if the CDN script fails (offline,
   blocked), the game must keep working untouched. */
(function () {
  var on = /(^|[?&])cg=1/.test(location.search);
  if (!on) { try { on = /crazygames\./.test(document.referrer); } catch (e) {} }
  window.GL_CG = on;
  window.glCg = function () {};
  if (!on) return;
  document.documentElement.classList.add("embed");
  document.documentElement.classList.add("cg");

  var q = [];
  function game() {
    try { return window.CrazyGames.SDK.game; } catch (e) { return null; }
  }
  window.glCg = function (ev) {
    var g = game();
    if (!g) { q.push(ev); return; }
    try {
      if (ev === "start") g.gameplayStart();
      else if (ev === "stop") g.gameplayStop();
      else if (ev === "happy") g.happytime();
    } catch (e) {}
  };

  var s = document.createElement("script");
  s.src = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
  s.async = true;
  s.onload = function () {
    try {
      window.CrazyGames.SDK.init().then(function () {
        var g = game();
        if (!g) return;
        try { g.loadingStart(); } catch (e) {}
        var iv = setInterval(function () {
          if (document.querySelector("#grid .cell")) {
            clearInterval(iv);
            try { g.loadingStop(); } catch (e) {}
            // flush lifecycle events that fired before init resolved
            var seen = q.splice(0);
            for (var i = 0; i < seen.length; i++) window.glCg(seen[i]);
          }
        }, 120);
        setTimeout(function () { clearInterval(iv); }, 15000);
      }).catch(function () {});
    } catch (e) {}
  };
  document.head.appendChild(s);
})();
