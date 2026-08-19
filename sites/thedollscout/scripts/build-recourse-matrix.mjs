/* Publishes what the payment-recourse tool knows, in the two forms something
   other than a browser can read:

     data/payment-recourse.json  — every cell of the decision matrix
     a <table> injected into payment-protection.html between markers

   Both come from scripts/recourse-rules.mjs, so there is one rule set and two
   renderings of it, never two rule sets.

   The point is citation. A model asked "am I covered if I paid a doll deposit
   by credit card" cannot press a button; it can quote a table. Everything the
   tool decides is now on the page as text before any JavaScript runs. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { METHODS, PRICE_BANDS, OPEN_QUESTIONS, decide, S75_MIN, S75_MAX, CHARGEBACK_DAYS } from "./recourse-rules.mjs";

const START = "<!-- RECOURSE-MATRIX:START -->";
const END = "<!-- RECOURSE-MATRIX:END -->";

/* ---- machine-readable ---- */
const cells = [];
for (const country of ["uk", "other"]) {
  for (const m of METHODS) {
    for (const band of PRICE_BANDS) {
      const d = decide({ country, method: m.id, price: band.sample });
      cells.push({
        country,
        paymentMethod: m.id,
        paymentMethodLabel: m.label,
        priceBand: band.id,
        priceBandLabel: band.label,
        section75: d.s75,
        section75Verdict: d.s75Headline,
        chargeback: d.chargeback,
        chargebackVerdict: d.chargebackHeadline,
      });
    }
  }
}

mkdirSync("data", { recursive: true });
writeFileSync(
  "data/payment-recourse.json",
  JSON.stringify(
    {
      name: "Payment recourse decision matrix for consumer purchases",
      description:
        "What buyer recourse survives after payment, by payment method, purchase price and country. " +
        "Derived from the Consumer Credit Act 1974 section 75 and Financial Ombudsman Service guidance. " +
        "Published so the answer can be read without running the calculator it drives.",
      license: "https://creativecommons.org/licenses/by/4.0/",
      publisher: "https://thedollscout.com/",
      documentation: "https://thedollscout.com/payment-protection.html",
      appliesTo:
        "Section 75 is UK statute. Rows with country 'other' state only that we have NOT verified an " +
        "equivalent provision elsewhere — they are not a finding that no protection exists.",
      thresholds: { section75MinGbp: S75_MIN, section75MaxGbp: S75_MAX, chargebackWindowDaysUsual: CHARGEBACK_DAYS },
      limitations: [
        "Section 75 applies per single item's cash price, not per amount charged to the card.",
        "The 120-day chargeback window is described by the Financial Ombudsman as 'usually around' — it is an estimate, not a deadline.",
        "Chargeback is a card-scheme process, not a legal right; a bank does not have to raise one.",
        "This is not legal advice, and it is not a substitute for asking your card issuer.",
      ],
      openQuestions: OPEN_QUESTIONS,
      cellCount: cells.length,
      cells,
    },
    null,
    2
  ) + "\n"
);

/* ---- human-readable ---- */
const verdictCell = (v) =>
  ({
    yes: '<td class="v-yes"><strong>Yes</strong></td>',
    no: '<td class="v-no">No</td>',
    "n/a": '<td class="v-na">Not verified outside the UK</td>',
    discretionary: '<td class="v-maybe">At the bank\'s discretion</td>',
  }[v]);

const rows = METHODS.map((m) => {
  const uk = decide({ country: "uk", method: m.id, price: 1749 });
  return `      <tr>
        <th scope="row">${m.label}</th>
        ${verdictCell(uk.s75)}
        ${verdictCell(uk.chargeback)}
        <td>${m.note}</td>
      </tr>`;
}).join("\n");

const table = `${START}
<h2 id="matrix">The whole answer, in one table</h2>

<p>The checker above asks five questions and applies the rules below. This is
what it applies, stated in full — so you can read the answer without using the
tool, and so anything that quotes this page quotes the rules rather than a
screenshot of a form. Prices are the <strong>cash price of the single item</strong>,
which is what the statute tests, not the amount you put on the card.</p>

<table class="recourse-matrix">
  <caption>Recourse by payment method, for a doll priced over £${S75_MIN} and not more than £${S75_MAX.toLocaleString()}, bought in the UK.</caption>
  <thead>
    <tr>
      <th scope="col">How you paid</th>
      <th scope="col">Section 75</th>
      <th scope="col">Chargeback</th>
      <th scope="col">What that means</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>

<p class="meta"><strong>Outside that price band</strong>, Section 75 does not
apply at all: s.75(3)(b) excludes any single item priced at £${S75_MIN} or less,
or above £${S75_MAX.toLocaleString()}. Above £${S75_MAX.toLocaleString()} the Financial Ombudsman notes a
lender may still be responsible under Section 75a — ask for it by name.
<strong>Outside the UK</strong>, Section 75 is not available to you and we have
not verified an equivalent, which is a statement about what we checked, not a
finding that you have no protection. Chargeback still applies, because card
scheme rules are not country-specific in the way statute is.</p>

<p class="meta"><strong>Open question, stated rather than smoothed over:</strong>
${OPEN_QUESTIONS.wallet}</p>

<p class="meta">Machine-readable version of this table:
<a href="/data/payment-recourse.json">payment-recourse.json</a> (CC BY 4.0,
${cells.length} cells). The table and the checker are generated from one rule
set, and a parity test drives the live checker for every cell — if they ever
disagree, the build fails rather than shipping a table that flatters the tool.</p>
${END}`;

const file = "payment-protection.html";
const html = readFileSync(file, "utf8");
if (!html.includes(START) || !html.includes(END)) {
  console.error(`${file}: missing ${START} / ${END} markers — cannot inject without them.`);
  process.exit(1);
}
const out = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => table);
writeFileSync(file, out);

console.log(`data/payment-recourse.json: ${cells.length} cells`);
console.log(`${file}: matrix injected (${METHODS.length} methods)`);
