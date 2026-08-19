/* Drives the real first-year cost calculator for every published worked
   example and fails if a total disagrees.

   Same contract as scripts/test-recourse-parity.mjs. Publishing a tool's
   conclusions as text is what makes them citable; keeping those conclusions
   true to the tool is what makes publishing them safe. A quoted total that
   the calculator no longer produces is worse than no table, because it is
   repeated somewhere we cannot correct. */

import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { SCENARIOS, ADDONS, STORAGE, estimate } from "./cost-rules.mjs";

const html = readFileSync("cost-calculator.html", "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
/* The calculator's CTA reads window.DS_CONFIG, which lives in an external
   script that will not load here. Stub it so the click handler completes —
   the arithmetic under test runs before the CTA is built, but an exception
   would still abort the handler and leave the table empty. */
await page.addInitScript(() => {
  window.DS_CONFIG = { yourdollBase: "https://example.com/", yourdollRefParam: "ref", yourdollRef: "x" };
});
await page.setContent(html, { waitUntil: "load" });

let checked = 0;
let failed = 0;

for (const s of SCENARIOS) {
  const expected = estimate(s);
  const addonValue = ADDONS.find((a) => a.amount === s.addons)?.amount ?? s.addons;
  const storageValue = STORAGE.find((x) => x.amount === s.storage)?.amount ?? s.storage;

  const total = await page.evaluate(
    ({ price, material, region, addons, storage }) => {
      document.getElementById("c-price").value = String(price);
      document.getElementById("c-material").value = material;
      document.getElementById("c-region").value = region;
      document.getElementById("c-options").value = String(addons);
      document.getElementById("c-storage").value = String(storage);
      document.getElementById("c-go").click();
      const row = document.querySelector("#c-table tr.total td:last-child");
      return row ? Number(row.textContent.replace(/[^0-9.]/g, "")) : null;
    },
    { ...s, addons: addonValue, storage: storageValue }
  );

  checked++;
  if (total !== expected.total) {
    failed++;
    console.log(`FAIL  ${s.name}`);
    console.log(`        published table : ${expected.total}`);
    console.log(`        calculator      : ${total === null ? "(no total rendered)" : total}`);
  }
}

await browser.close();

/* A run that checks nothing must not pass. */
if (!checked) {
  console.log("FAIL  no scenarios were checked — the form selectors did not match the page.");
  process.exit(1);
}

console.log(
  failed
    ? `\n${failed} of ${checked} worked examples disagree with the calculator. Fix before deploying.`
    : `\nAll ${checked} worked examples match what the calculator produces.`
);
process.exit(failed ? 1 : 0);
