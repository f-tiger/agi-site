/* Model Lookup — shared by /lookup and /de/lookup. All entries are baked in
   the HTML as [data-entry] cards with a data-keys attribute (name + aliases,
   lowercase); this file only filters the DOM on input. With JS off the page
   shows every entry — a readable directory, fully crawlable.

   Matching is deliberately dumb: case-insensitive substring over data-keys.
   No fuzzy scoring — a wrong "best match" would be worse than a short list.
   [data-lookup-empty] shows when nothing matches; its text carries the honest
   caveat (not in our index ≠ doesn't exist).

   The lookup_use D1 event fires on the first USER keystroke only. */
(function () {
  "use strict";
  function init(root) {
    var q = root.querySelector("[data-lookup-q]"),
        empty = root.querySelector("[data-lookup-empty]");
    if (!q) return;
    var entries = root.querySelectorAll("[data-entry]");
    var sent = false;
    function refilter() {
      var needle = q.value.trim().toLowerCase();
      var shown = 0;
      entries.forEach(function (el) {
        var hit = !needle || (el.getAttribute("data-keys") || "").indexOf(needle) !== -1;
        el.hidden = !hit;
        if (hit) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      if (!sent && needle) { sent = true; try {
        var payload = JSON.stringify({ p: location.pathname, r: "", e: "lookup_use" });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/ev", payload);
        if (window.dsTrack) window.dsTrack("lookup_use", { page_path: location.pathname });
      } catch (e) {} }
    }
    q.addEventListener("input", refilter);
    refilter();
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-lookup]").forEach(init);
  });
})();
