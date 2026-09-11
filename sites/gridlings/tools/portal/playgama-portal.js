/* Shared Playgama portal layer for the five hand-written games.
 *
 * Every lesson from GHOSTLINE's certification (2026-09-07) lives here ONCE, instead of
 * being copied into five files that would then have to be fixed five times:
 *   1. The ad must be reachable by CLICKING. An automated certification pass cannot
 *      play a game well enough to reach a skill-gated trigger, so it concludes no
 *      advertising is implemented. Each game's existing restart / next-level button
 *      is that reachable breakpoint.
 *   2. Never burn the cooldown before the SDK is ready — the pre-init stub returns
 *      instantly and would consume the slot on nothing.
 *   3. The SDK's OWN initialInterstitialDelay defaults to 60/30/180s per platform and
 *      refuses every interstitial inside it. playgama-bridge-config.json overrides it.
 *   4. Pause and mute while an ad is on screen: Playgama's overlay states the
 *      expectation, and a race lost behind an ad is a real complaint.
 *   5. Never swallow an init or ad error — a silent failure is indistinguishable from
 *      "the platform never heard from us", which is the exact certification failure.
 *
 * The games already expose their portal seam as window.<prefix>Cg / window.<prefix>Ad,
 * so this rebinds those two globals and touches nothing else in the game.
 */
(function () {
  var prefix = window.GL_PORTAL_PREFIX;
  if (!prefix) return;
  var evName = prefix + "Cg", adName = prefix + "Ad";
  var GAP_MS = 90000, lastAdAt = 0, ready = false, br = null, queued = [];

  function fail(why) {
    window.GL_PG_ERR = "playgama portal: " + why;
    try {
      var d = document.createElement("div");
      d.textContent = "SDK NOT LOADED — " + why;
      d.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#c8102e;"
        + "color:#fff;font:12px/1.5 monospace;padding:6px 10px;text-align:center;pointer-events:none";
      var put = function () { (document.body || document.documentElement).appendChild(d); };
      if (document.body) put(); else document.addEventListener("DOMContentLoaded", put);
    } catch (e) {}
  }

  function send(msg) { try { br.platform.sendMessage(msg); } catch (e) {} }

  /* the game's own event seam: queue until the platform is listening */
  window[evName] = function (e) { queued.push(e); };

  /* the game's own ad seam. done() is called exactly once, always — an ad that never
     resolves must not strand the game on a disabled button. */
  window[adName] = function (done) {
    var now = (window.performance && performance.now()) || 0;
    if (!ready || (lastAdAt && now - lastAdAt < GAP_MS)) { done(); return; }
    lastAdAt = now;
    var fired = false;
    var release = function () { window.GL_SDK_PAUSE = false; window.GL_SDK_AD_MUTE = false; };
    var end = function () { if (!fired) { fired = true; release(); done(); } };
    var onState = function (st) {
      if (st === "loading" || st === "opened") { window.GL_SDK_PAUSE = true; window.GL_SDK_AD_MUTE = true; }
      else if (st === "closed" || st === "failed" || st === "rewarded") end();
    };
    try {
      br.advertisement.on("interstitial_state_changed", onState);
      br.advertisement.showInterstitial();
      setTimeout(end, 25000);
    } catch (e) { window.GL_AD_ERR = String((e && e.stack) || e); end(); }
  };

  function boot(attempt) {
    br = window.bridge;
    if (!br || typeof br.initialize !== "function") { fail("window.bridge is undefined after the script tag ran"); return; }
    br.initialize().then(function () {
      try {
        br.on("pause_state_changed", function (st) { window.GL_SDK_PAUSE = st === "paused"; });
        br.on("audio_state_changed", function (st) { window.GL_SDK_MUTE = st === "muted"; });
      } catch (e) {}
      send("game_ready");
      window[evName] = function (e) {
        if (e === "start") send("gameplay_started");
        else if (e === "stop") send("gameplay_stopped");
        /* "happy" has no Bridge equivalent; dropping it is correct, not a gap */
      };
      queued.splice(0).forEach(window[evName]);
      ready = true;
    }).catch(function (e) {
      window.GL_PG_ERR = String((e && (e.stack || e.message)) || e);
      if (!attempt) setTimeout(function () { boot(1); }, 1500);
    });
  }

  if (window.bridge) boot(0);
  else {
    var s = document.createElement("script");
    s.src = "playgama-bridge.js"; s.async = true;
    s.onload = function () { boot(0); };
    s.onerror = function () { fail("the file 404s next to index.html"); };
    document.head.appendChild(s);
  }
})();
