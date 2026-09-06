/* Chase-Cost Reality calculator — shared by /psychology and /de/psychology so
   the math can never drift between copies. The user supplies their local
   per-box price (we never print prices — site rule 2); the odds come from the
   same reported rates the rarity page sources. Pure client math on the
   independent single-box model:
     expected boxes to first secret = N            (geometric distribution)
     boxes for a 50% chance         = ceil(ln 0.5 / ln(1 - 1/N))
   Locale strings come from data-cost-out on the container: "{exp}", "{b50}",
   "{cexp}", "{c50}" are substituted; currency is echoed exactly as typed —
   the page never invents a currency or a number.
   The cost_calc D1 event fires on the first USER interaction only — never on
   initial render (fleet lesson: a load-fired event reads every pageview as a
   tool use). */
(function () {
  "use strict";
  function init(root) {
    var odds = root.querySelector("[data-codds]"),
        price = root.querySelector("[data-cprice]"),
        out = root.querySelector("[data-cost-result]");
    if (!odds || !price || !out) return;
    var tpl = root.getAttribute("data-cost-out") || "";
    var empty = root.getAttribute("data-cost-empty") || "";
    var sent = false;
    function fmt(x) {
      return x.toLocaleString(document.documentElement.lang || "en", { maximumFractionDigits: 0 });
    }
    function recalc(fromUser) {
      var N = parseInt(odds.value, 10), pr = parseFloat(price.value);
      if (!(N >= 2) || !(pr > 0) || pr > 100000) { out.textContent = empty; return; }
      var p = 1 / N,
          b50 = Math.ceil(Math.log(0.5) / Math.log(1 - p));
      out.textContent = tpl
        .replace("{exp}", fmt(N)).replace("{b50}", fmt(b50))
        .replace("{cexp}", fmt(N * pr)).replace("{c50}", fmt(b50 * pr));
      if (fromUser && !sent) { sent = true; try {
        var payload = JSON.stringify({ p: location.pathname, r: "", e: "cost_calc" });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/ev", payload);
        if (window.dsTrack) window.dsTrack("cost_calc", { page_path: location.pathname });
      } catch (e) {} }
    }
    var onUser = function () { recalc(true); };
    odds.addEventListener("change", onUser);
    price.addEventListener("input", onUser);
    recalc(false);
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-cost-tool]").forEach(init);
  });
})();
