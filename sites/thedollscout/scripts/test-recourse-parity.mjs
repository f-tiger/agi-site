/* Drives the real payment-recourse checker for every cell of the published
   matrix and fails if a single verdict disagrees.

   This is the price of publishing the rules twice — once as a table a model
   can quote, once as the JavaScript a visitor actually runs. Two renderings
   of one rule set is fine; two rule sets that drift apart is how a page ends
   up telling a reader one thing and an AI another. The table is the more
   dangerous half, because it is the half that gets quoted somewhere we cannot
   correct.

   It loads the page's own markup and runs its own inline script — the
   verdicts come from the shipped code, not from a re-implementation of it. */

import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { METHODS, PRICE_BANDS, decide } from "./recourse-rules.mjs";

const html = readFileSync("payment-protection.html", "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
/* setContent runs the inline script; the external CSS and JS 404 harmlessly,
   and the checker does not depend on them (dsTrack is behind a guard). */
await page.setContent(html, { waitUntil: "load" });

let checked = 0;
let failed = 0;

for (const country of ["uk", "other"]) {
  for (const m of METHODS) {
    for (const band of PRICE_BANDS) {
      const expected = decide({ country, method: m.id, price: band.sample });

      const headlines = await page.evaluate(
        ({ country, method, price }) => {
          document.getElementById("pp-country").value = country;
          document.getElementById("pp-method").value = method;
          document.getElementById("pp-price").value = String(price);
          document.getElementById("pp-issue").value = "never";
          document.getElementById("pp-date").value = "";
          document.getElementById("pp-go").click();
          return Array.from(document.querySelectorAll("#pp-verdicts .verdict h3")).map((h) => h.textContent.trim());
        },
        { country, method: m.id, price: band.sample }
      );

      checked++;
      const wants = [expected.s75Headline, expected.chargebackHeadline];
      const missing = wants.filter((w) => !headlines.includes(w));
      if (missing.length) {
        failed++;
        console.log(`FAIL  ${country} / ${m.id} / £${band.sample}`);
        console.log(`        table says : ${wants.join("  |  ")}`);
        console.log(`        tool says  : ${headlines.join("  |  ") || "(no verdict rendered)"}`);
      }
    }
  }
}

await browser.close();

/* A run that checks nothing must not pass. The select options are the sort of
   thing an edit can silently rename, and every cell would then "agree". */
if (!checked) {
  console.log("FAIL  no cells were checked — the form selectors did not match the page.");
  process.exit(1);
}

console.log(
  failed
    ? `\n${failed} of ${checked} cells disagree. The published table does not match the tool — fix before deploying.`
    : `\nAll ${checked} cells agree: the published table says exactly what the checker says.`
);
process.exit(failed ? 1 : 0);
