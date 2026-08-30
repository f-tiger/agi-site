/* Series Finder — shared by /finder and /de/finder. Every recommendation
   card and advisory line is baked in the HTML per language; this file only
   reads the three answers and toggles which blocks show. With JS off the
   page degrades to all recommendations visible — still useful, still
   crawlable.

   Mapping (no scores, no pretend precision):
     vibe    -> exactly one primary recommendation card [data-rec="<vibe>"]
     use     -> zero or one advisory line  [data-advice-use="<use>"]
     chase   -> zero or one advisory line  [data-advice-chase="<chase>"]

   The finder_use D1 event fires on the first USER answer only. */
(function () {
  "use strict";
  function init(root) {
    var selects = {
      vibe: root.querySelector("[data-f-vibe]"),
      use: root.querySelector("[data-f-use]"),
      chase: root.querySelector("[data-f-chase]"),
    };
    var out = root.querySelector("[data-finder-out]");
    if (!selects.vibe || !selects.use || !selects.chase || !out) return;
    var sent = false;
    /* The recommendation blocks ship VISIBLE in the HTML so a no-JS crawler
       (which is most AI crawlers) reads all three series recommendations and
       every advisory line instead of three empty dropdowns. JS takes over on
       load and filters. Before 2026-08-30 they shipped `hidden`, so the page
       contributed nothing at all to llms-full.txt or to any crawler. */
    function recalc() {
      var vibe = selects.vibe.value, use = selects.use.value, chase = selects.chase.value;
      var any = Boolean(vibe || use || chase);
      out.hidden = !vibe;
      root.querySelectorAll("[data-rec]").forEach(function (el) {
        el.hidden = el.getAttribute("data-rec") !== vibe;
      });
      root.querySelectorAll("[data-advice-use]").forEach(function (el) {
        el.hidden = el.getAttribute("data-advice-use") !== use;
      });
      root.querySelectorAll("[data-advice-chase]").forEach(function (el) {
        el.hidden = el.getAttribute("data-advice-chase") !== chase;
      });
      if (!sent && any) { sent = true; try {
        var payload = JSON.stringify({ p: location.pathname, r: "", e: "finder_use" });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/ev", payload);
      } catch (e) {} }
    }
    root.addEventListener("change", recalc);
    recalc();
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-finder]").forEach(init);
  });
})();
