/* Secret Pull Calculator — shared by /, /rarity and their /de/ pairs so the
   math can never drift between copies. Pure client math: P(>=1 secret) =
   1 - (1 - 1/N)^boxes, independent single-box model (the honest caveat is
   printed beside every instance). Locale strings come from data-milestones
   on the container: "{n}", "{b50}", "{b90}" are substituted.
   The odds_calc D1 event fires on the first USER interaction only — never
   on initial render, or every pageview would read as a tool use. */
(function () {
  "use strict";
  function init(root) {
    var odds = root.querySelector("[data-odds]"),
        customwrap = root.querySelector("[data-customwrap]"),
        customodds = root.querySelector("[data-customodds]"),
        boxes = root.querySelector("[data-boxes]"),
        result = root.querySelector("[data-result]"),
        milestones = root.querySelector("[data-milestones-out]");
    if (!odds || !boxes || !result) return;
    var tpl = root.getAttribute("data-milestones") || "";
    var sent = false;
    function n() {
      var v = odds.value === "custom" ? parseInt(customodds && customodds.value, 10) : parseInt(odds.value, 10);
      return (v >= 2 && v <= 100000) ? v : NaN;
    }
    function recalc(fromUser) {
      if (customwrap) customwrap.hidden = odds.value !== "custom";
      var N = n(), b = parseInt(boxes.value, 10);
      if (!N || !b || b < 1) { result.textContent = "—"; if (milestones) milestones.textContent = ""; return; }
      var p = 1 / N, atLeastOne = 1 - Math.pow(1 - p, b);
      result.textContent = (atLeastOne * 100).toFixed(atLeastOne < 0.095 ? 1 : 0) + "%";
      if (milestones) {
        var b50 = Math.ceil(Math.log(0.5) / Math.log(1 - p)),
            b90 = Math.ceil(Math.log(0.1) / Math.log(1 - p));
        milestones.textContent = tpl.replace("{n}", N).replace("{b50}", b50).replace("{b90}", b90);
      }
      if (fromUser && !sent) { sent = true; try {
        var payload = JSON.stringify({ p: location.pathname, r: "", e: "odds_calc" });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/ev", payload);
        if (window.dsTrack) window.dsTrack("odds_calc", { page_path: location.pathname });
      } catch (e) {} }
    }
    var onUser = function () { recalc(true); };
    odds.addEventListener("change", onUser);
    if (customodds) customodds.addEventListener("input", onUser);
    boxes.addEventListener("input", onUser);
    recalc(false);
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-odds-tool]").forEach(init);
  });
})();
