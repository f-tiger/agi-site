/* Publishes the recorded product dataset as machine-readable files.

   Why this exists. This site's positioning is that every number is sourced —
   and until now the numbers only existed inside HTML tables. An AI assistant,
   an agent, or a researcher wanting the underlying data had to scrape our
   prose. That is the opposite of an evidence standard, and it is the single
   most citable artifact this site can offer: nobody else in the category
   publishes their data at all.

   Reads content/doll-specs.json (internal, never published) and writes
   data/doll-specs.json + data/doll-specs.csv (public). Accessories are dropped
   here as well as in the scraper, because a hoodie carrying the spec table of
   the doll it fits once produced a "$129 full-size doll" row — the exact
   counter-example to our own published finding.

   The published file carries its own limitations. A dataset that hides its
   weaknesses is marketing; one that states them is evidence. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ACCESSORY, isPartialBody, implausibleWeight } from "./classify.mjs";

const SRC = "content/doll-specs.json";
const OUTDIR = "data";

const src = JSON.parse(readFileSync(SRC, "utf8"));
const rows = [];
const dropped = [];
const reclassified = [];
for (const r of src.specs || []) {
  if (!r.title || ACCESSORY.test(r.title)) continue;
  /* Same guard as the scraper, applied here too so rows collected before it
     existed cannot reach the published dataset. A 160cm doll at 2.5 kg is a
     failed parse that returned a number, and a number survives every check a
     null would have failed. */
  /* Recomputed from the title, never read from the stored flag: rows
     collected before the classifier was fixed carry a wrong isPartial — a
     150cm whole doll was filed as a torso because "Ready to Ship" matched
     "hip". Trusting the stored value would publish that mistake. */
  const partial = isPartialBody(r.title);
  if (implausibleWeight({ title: r.title, heightCm: r.heightCm, weightKg: r.weightKg })) {
    dropped.push(`${r.heightCm}cm at ${r.weightKg}kg — ${r.title.slice(0, 55)}`);
    continue;
  }
  if (partial !== !!r.isPartial) reclassified.push(`${r.isPartial ? "torso→doll" : "doll→torso"}: ${r.title.slice(0, 58)}`);
  /* Accepts both shapes: rows scraped before the price parse was rewritten
     hold a string ("$1,099.00"), rows after it hold a number. */
  const m = String(r.price ?? "").match(/([\d,]+(?:\.\d+)?)/);
  /* The column is named priceUsd, so a price in another currency cannot go in
     it. Older rows carry no currency field at all and are from a US vendor
     quoting dollars; a row that states a currency has to state USD. */
  const usd = !r.priceCurrency || r.priceCurrency === "USD";
  rows.push({
    title: r.title,
    url: r.url,
    heightCm: r.heightCm ?? null,
    weightKg: r.weightKg ?? null,
    weightLb: r.weightLb ?? null,
    priceUsd: m && usd ? Number(m[1].replace(/,/g, "")) : null,
    isPartialBody: partial,
  });
}
rows.sort((a, b) => (a.priceUsd ?? 0) - (b.priceUsd ?? 0));

mkdirSync(OUTDIR, { recursive: true });

/* Read from the source file, never hardcoded. A constant here survived one
   re-scrape already and would have published 2026-08-07 data under a
   2026-07-27 date — a dataset whose whole value is that its numbers are
   dated and checkable. */
const RECORDED = src.recorded;
if (!RECORDED) {
  console.error(`${SRC} has no "recorded" date. Re-scrape before publishing — an undated price dataset is not evidence.`);
  process.exit(1);
}
writeFileSync(
  `${OUTDIR}/doll-specs.json`,
  JSON.stringify(
    {
      name: "DollScout adult doll specification dataset",
      description:
        "Height, weight and listed price for every adult doll and torso reachable " +
        "at one vetted vendor on the recording date. Published so the findings on " +
        "thedollscout.com can be checked against the underlying rows.",
      license: "https://creativecommons.org/licenses/by/4.0/",
      publisher: "https://thedollscout.com/",
      documentation: "https://thedollscout.com/data/",
      recorded: RECORDED,
      rowCount: rows.length,
      source: {
        vendor: "yourdoll.com",
        method:
          "Headless-browser scrape of popularity-sorted listings across height bands, " +
          "then each product page's specification block. " + (src.visited || 0) +
          " product pages visited.",
      },
      limitations: [
        "Figures are vendor-stated, not independently weighed or measured.",
        "One vendor only. It is a sample of that catalogue, not of the market.",
        "Prices are as displayed on the recording date, including any sale price, and drift.",
        "Material is NOT included: the scraper could not distinguish TPE from silicone " +
          "reliably on these listings, so publishing a material column would be a guess. " +
          "The omission is deliberate.",
        "Products whose stated height is under 140 cm are excluded unless the listing is " +
          "explicitly a partial body — an editorial safety rule, not a data-quality one.",
        "Accessory listings are excluded: their pages carry the spec table of the doll " +
          "they fit, which once produced a spurious full-size row at accessory pricing.",
      ],
      fields: {
        title: "Vendor's product title, verbatim",
        url: "Product page URL (no referral parameters)",
        heightCm: "Vendor-stated height in centimetres",
        weightKg: "Vendor-stated weight in kilograms",
        weightLb: "Vendor-stated weight in pounds",
        priceUsd: "Listed price in USD on the recording date",
        isPartialBody: "True for torsos and other partial bodies",
      },
      rows,
    },
    null,
    2
  ) + "\n"
);

const cols = ["title", "url", "heightCm", "weightKg", "weightLb", "priceUsd", "isPartialBody"];
const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
writeFileSync(
  `${OUTDIR}/doll-specs.csv`,
  cols.join(",") + "\n" + rows.map((r) => cols.map((c) => csvCell(r[c])).join(",")).join("\n") + "\n"
);

if (reclassified.length) {
  console.log(`Re-classified ${reclassified.length} row(s) from the title:`);
  for (const d of reclassified) console.log(`  ${d}`);
}
if (dropped.length) {
  console.log(`Dropped ${dropped.length} physically implausible row(s):`);
  for (const d of dropped) console.log(`  ${d}`);
}
console.log(`data/doll-specs.json + .csv: ${rows.length} rows (recorded ${RECORDED})`);
