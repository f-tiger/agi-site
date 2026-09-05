/* Interactive Lafufu Checker — shared by /checker and /de/checker. All
   question text, verdict strings and check names live in the HTML (baked per
   language); this file only counts answers and toggles verdict blocks, so the
   logic can never drift between languages and the page still reads fully as
   static content for crawlers with JS off.

   Verdict logic is deliberately blunt and honest:
     - any "fail" answer            -> red-flag verdict, failing checks listed
     - no fails, 3+ "unsure"        -> inconclusive verdict
     - otherwise                    -> no-red-flags verdict (never "authentic":
                                       the dataset's own limitation — no single
                                       cosmetic check is proof — is printed
                                       inside the verdict block itself)
   The checker never scores or weights: pretending precision the source
   signals don't have would be fabrication by arithmetic.

   The checker_use D1 event fires on the first USER answer only — never on
   page load (fleet lesson). */
(function () {
  "use strict";
  function init(root) {
    var result = root.querySelector("[data-checker-result]"),
        red = root.querySelector("[data-verdict-red]"),
        unsure = root.querySelector("[data-verdict-unsure]"),
        clear = root.querySelector("[data-verdict-clear]"),
        list = root.querySelector("[data-fail-list]"),
        count = root.querySelector("[data-fail-count]");
    if (!result || !red || !unsure || !clear) return;
    var sent = false;
    function recalc() {
      var fields = root.querySelectorAll("fieldset[data-check]");
      var fails = [], unsures = 0, answered = 0;
      fields.forEach(function (f) {
        var v = (f.querySelector("input:checked") || {}).value;
        if (!v) return;
        answered++;
        if (v === "fail") {
          var legend = f.querySelector("legend");
          fails.push(legend ? legend.textContent.replace(/^\d+\.\s*/, "").trim() : "?");
        }
        if (v === "unsure") unsures++;
      });
      result.hidden = answered === 0;
      red.hidden = fails.length === 0;
      unsure.hidden = !(fails.length === 0 && unsures >= 3);
      clear.hidden = !(fails.length === 0 && unsures < 3 && answered === fields.length);
      if (count) count.textContent = String(fails.length);
      if (list) list.textContent = fails.join(" · ");
      if (!sent && answered > 0) { sent = true; try {
        var payload = JSON.stringify({ p: location.pathname, r: "", e: "checker_use" });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/ev", payload);
        if (window.dsTrack) window.dsTrack("checker_use", { page_path: location.pathname });
      } catch (e) {} }
    }
    root.addEventListener("change", recalc);
    recalc();
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-checker]").forEach(init);
  });
})();
