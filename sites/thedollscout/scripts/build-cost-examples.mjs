/* Publishes the first-year cost model's conclusions as text and as JSON, for
   the same reason the recourse matrix is published: a model answering "what
   does a doll really cost in year one" can quote a worked example, and cannot
   press a button.

   Writes data/first-year-cost.json and injects a worked-examples table into
   cost-calculator.html between markers. Both from scripts/cost-rules.mjs. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { MATERIALS, REGIONS, SCENARIOS, CAVEATS, estimate } from "./cost-rules.mjs";

const START = "<!-- COST-EXAMPLES:START -->";
const END = "<!-- COST-EXAMPLES:END -->";

const money = (n) => "$" + n.toLocaleString("en-US");

const worked = SCENARIOS.map((s) => ({ scenario: s, result: estimate(s) }));

/* ---- machine-readable ---- */
mkdirSync("data", { recursive: true });
writeFileSync(
  "data/first-year-cost.json",
  JSON.stringify(
    {
      name: "First-year ownership cost model for adult dolls",
      description:
        "What a doll costs in its first year beyond the sticker price: import charges, care supplies, " +
        "storage and a repair reserve, by material and destination. Published so the totals can be read " +
        "without running the calculator that produces them.",
      license: "https://creativecommons.org/licenses/by/4.0/",
      publisher: "https://thedollscout.com/",
      documentation: "https://thedollscout.com/cost-calculator.html",
      currency: "USD",
      caveats: CAVEATS,
      model: {
        materials: MATERIALS.map(({ id, label, care, repair, careNote }) => ({ id, label, firstYearCareUsd: care, repairReserveUsd: repair, note: careNote })),
        regions: REGIONS.map(({ id, label, chargeLabel, flat, rate, note }) => ({ id, label, chargeLabel, flatFeeUsd: flat, rateOfPrice: rate, note })),
      },
      workedExamples: worked.map(({ scenario, result }) => ({
        name: scenario.name,
        inputs: scenario,
        lineItems: result.rows,
        firstYearTotalUsd: result.total,
        beyondStickerUsd: result.overSticker,
        beyondStickerPct: result.overStickerPct,
      })),
    },
    null,
    2
  ) + "\n"
);

/* ---- human-readable ---- */
const rows = worked
  .map(
    ({ scenario, result }) => `      <tr>
        <th scope="row">${scenario.name}</th>
        <td>${money(scenario.price)}</td>
        <td><strong>${money(result.total)}</strong></td>
        <td>+${money(result.overSticker)} <span class="pct">(+${result.overStickerPct}%)</span></td>
      </tr>`
  )
  .join("\n");

const table = `${START}
<h2 id="examples">Five worked examples, before you touch the calculator</h2>

<p>The calculator above applies the model below. These are it, worked through
in full — so the answer is readable without using the tool, and so anything
that quotes this page quotes the numbers rather than a screenshot of a form.
Every figure is a <strong>conservative editorial estimate, not a vendor
quote</strong>.</p>

<table class="cost-examples">
  <caption>First-year cost against sticker price. USD.</caption>
  <thead>
    <tr>
      <th scope="col">Scenario</th>
      <th scope="col">Sticker</th>
      <th scope="col">First-year total</th>
      <th scope="col">Beyond sticker</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>

<h3>What the model charges, and why</h3>

<table class="cost-examples">
  <thead><tr><th scope="col">Material</th><th scope="col">First-year care</th><th scope="col">Repair reserve</th><th scope="col">Why</th></tr></thead>
  <tbody>
${MATERIALS.map((m) => `      <tr><th scope="row">${m.label}</th><td>${money(m.care)}</td><td>${money(m.repair)}</td><td>${m.careNote}</td></tr>`).join("\n")}
  </tbody>
</table>

<table class="cost-examples">
  <thead><tr><th scope="col">Destination</th><th scope="col">Import charge modelled</th><th scope="col">The honest caveat</th></tr></thead>
  <tbody>
${REGIONS.map((r) => `      <tr><th scope="row">${r.label}</th><td>${r.flat ? money(r.flat) + " flat" : ""}${r.flat && r.rate ? " + " : ""}${r.rate ? Math.round(r.rate * 100) + "% of price" : r.flat ? "" : "not modelled"}</td><td>${r.note}</td></tr>`).join("\n")}
  </tbody>
</table>

<div class="unconfirmed">
  <strong>The number we refuse to give you.</strong> The United States ended
  its de minimis exemption in 2025, so a customs entry is required at any
  value — that part is settled, and the entry/brokerage fee is in the model.
  The duty <em>rate</em> is not, because the tariff classification for
  full-size dolls is genuinely unsettled and we could not confirm one. Every
  guide quoting you a tidy US percentage is quoting something it cannot
  source. Ask your vendor whether the price is DDP or DDU, in writing.
</div>

<p class="meta">Machine-readable: <a href="/data/first-year-cost.json">first-year-cost.json</a>
(CC BY 4.0). The table and the calculator are generated from one model, and a
parity test drives the live calculator for every scenario — if they disagree,
the build fails rather than shipping a table that flatters the tool.</p>
${END}`;

const file = "cost-calculator.html";
const html = readFileSync(file, "utf8");
if (!html.includes(START) || !html.includes(END)) {
  console.error(`${file}: missing ${START} / ${END} markers — cannot inject without them.`);
  process.exit(1);
}
writeFileSync(file, html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => table));

console.log(`data/first-year-cost.json: ${worked.length} worked examples`);
console.log(`${file}: examples injected`);
