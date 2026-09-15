/* Shared Playgama portal layer for the TEN puzzle games.
 *
 * Same five certification lessons as playgama-portal.js, but a different seam. The
 * hand-written games expose window.<prefix>Cg / window.<prefix>Ad; the puzzle engines
 * expose nothing — and editing seven engine files that also serve the live site, to
 * chase a portal that has rejected us four times, is the wrong trade. So this binds to
 * what every one of the ten pages already has in its markup instead:
 *
 *   #d-easy, #d-medium, #d-hard           the difficulty buttons — visible from first
 *                                         paint, so THIS is the certification breakpoint
 *   #again                                "Play another" — also a breakpoint, but it
 *                                         lives inside #win and is hidden until you
 *                                         solve. Skill-gated, so it can carry the ad
 *                                         but can never be the one certification finds.
 *   #grid                                 fills when a puzzle renders — gameplay_started
 *   #win                                  unhides when solved            — gameplay_stopped
 *
 * Zero changes to any engine. Extending to another puzzle is a line in the packager.
 *
 * Why those buttons are the right breakpoint, and not a timer: certification drives the
 * page by CLICKING, and cannot solve a Skyscrapers board. A skill-gated trigger is
 * therefore never observed and the verdict comes back "no advertising is implemented",
 * which is exactly how GHOSTLINE failed its first pass. Asking for the next puzzle is
 * both reachable by a click and the moment a player already expects a pause.
 *
 * The click is never blocked. The ad is requested and the puzzle loads regardless —
 * a puzzle has no real-time loop to lose, and a portal that fails to fill must not cost
 * the player their next board.
 */
(function () {
  if (!window.GL_PG) return;
  var GAP_MS = 90000, lastAdAt = 0, ready = false, br = null, started = false, stopped = false, queued = [];
  var BREAKPOINTS = ["again", "d-easy", "d-medium", "d-hard"];

  function fail(why) {
    window.GL_PG_ERR = "puzzle portal: " + why;
    try {
      var d = document.createElement("div");
      d.textContent = "SDK NOT LOADED — " + why;
      d.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#c8102e;"
        + "color:#fff;font:12px/1.5 monospace;padding:6px 10px;text-align:center;pointer-events:none";
      var put = function () { (document.body || document.documentElement).appendChild(d); };
      if (document.body) put(); else document.addEventListener("DOMContentLoaded", put);
    } catch (e) {}
  }

  /* The puzzle renders from a local json fetch, which routinely beats initialize() —
     so gameplay_started can be ready to send before the SDK will accept it. Sending
     early earns a console error ("Before using the SDK you must initialize it"), and a
     console error is a rejection risk on every portal. Queue instead of dropping:
     the platform still needs to hear that a play began. */
  function send(msg) {
    if (!ready) { queued.push(msg); return; }
    try { br.platform.sendMessage(msg); } catch (e) {}
  }

  function adBreak() {
    var now = (window.performance && performance.now()) || 0;
    /* not ready means the SDK has not initialised: returning early WITHOUT stamping
       lastAdAt is the point — the pre-init path must not spend the cooldown on nothing */
    if (!ready || (lastAdAt && now - lastAdAt < GAP_MS)) return;
    lastAdAt = now;
    var fired = false;
    var release = function () { window.GL_SDK_PAUSE = false; window.GL_SDK_AD_MUTE = false; };
    var end = function () { if (!fired) { fired = true; release(); } };
    var onState = function (st) {
      if (st === "loading" || st === "opened") { window.GL_SDK_PAUSE = true; window.GL_SDK_AD_MUTE = true; }
      else if (st === "closed" || st === "failed" || st === "rewarded") end();
    };
    try {
      br.advertisement.on("interstitial_state_changed", onState);
      br.advertisement.showInterstitial();
      setTimeout(end, 25000);          /* an ad that never resolves must not freeze the page */
    } catch (e) { window.GL_AD_ERR = String((e && e.stack) || e); end(); }
  }

  function bind() {
    BREAKPOINTS.forEach(function (id) {
      var el = document.getElementById(id);
      /* capture phase so the ad is requested before the engine swaps the board, and
         listen rather than wrap: the engine assigns .onclick later and would overwrite us */
      if (el) el.addEventListener("click", adBreak, true);
    });
    var grid = document.getElementById("grid"), win = document.getElementById("win");
    if (!grid) return;
    /* the engines render asynchronously (they fetch their puzzle json), so watch the
       DOM rather than guess a delay */
    var mo = new MutationObserver(function () {
      if (!started && grid.children.length) { started = true; send("gameplay_started"); }
      if (win && !stopped && started && !win.hidden) { stopped = true; send("gameplay_stopped"); }
      else if (win && stopped && win.hidden) { stopped = false; }
    });
    mo.observe(grid, { childList: true });
    if (win) mo.observe(win, { attributes: true, attributeFilter: ["hidden"] });
    if (grid.children.length && !started) { started = true; send("gameplay_started"); }
  }

  function boot(attempt) {
    br = window.bridge;
    if (!br || typeof br.initialize !== "function") { fail("window.bridge is undefined after the script tag ran"); return; }
    br.initialize().then(function () {
      try {
        br.on("pause_state_changed", function (st) { window.GL_SDK_PAUSE = st === "paused"; });
        br.on("audio_state_changed", function (st) { window.GL_SDK_MUTE = st === "muted"; });
      } catch (e) {}
      ready = true;
      send("game_ready");
      queued.splice(0, queued.length - 1).forEach(send);   /* game_ready first, then the backlog */
    }).catch(function (e) {
      window.GL_PG_ERR = String((e && (e.stack || e.message)) || e);
      if (!attempt) setTimeout(function () { boot(1); }, 1500);
    });
  }

  var go = function () {
    bind();
    if (window.bridge) boot(0);
    else {
      var s = document.createElement("script");
      s.src = "playgama-bridge.js"; s.async = true;
      s.onload = function () { boot(0); };
      s.onerror = function () { fail("the file 404s next to index.html"); };
      document.head.appendChild(s);
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
