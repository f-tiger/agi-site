/* Portal-only boot layer (strict builds; never shipped to the live site).
   CrazyGames-class QA judges the first 30 seconds:
   1. Cold start on an EASY board — first-time players should not meet the
      daily 10x10 2-star. Runs BEFORE the engine script and rewrites the
      query via replaceState, which the engine then reads as ?p=easy-0.
      Returning players (any *_done_* key) keep the normal daily start.
   2. Stuck-nudge: if no win after 30s on that first board, pulse the Hint
      button once. */
(function () {
  var returning = false;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      if (/_done_/.test(localStorage.key(i))) { returning = true; break; }
    }
  } catch (e) {}
  if (!returning && !/[?&]p=/.test(location.search)) {
    try { history.replaceState(null, "", location.pathname + "?p=easy-0"); } catch (e) {}
    var ms = window.GL_NUDGE_MS || 30000;
    setTimeout(function () {
      var win = document.getElementById("win");
      var hb = document.getElementById("hintbtn");
      if (hb && win && win.hidden !== false) {
        hb.classList.add("nudge");
        setTimeout(function () { hb.classList.remove("nudge"); }, 6000);
      }
    }, ms);
  }
})();
