/* Publishes the two site capabilities that were readable but not callable.

   The pattern this repo settled on: a tool is only worth exposing if its
   answer already exists as published, dated, sourced data. So rather than
   reimplementing the scam check and the country rules inside the MCP
   endpoint, they become datasets — which makes them citable on their own AND
   callable through /mcp, from one source.

   Both are EXTRACTED, never retyped:

     scam signals  — from the HowTo JSON-LD already on scam-check.html, so the
                     page and the dataset cannot disagree about what the ten
                     checks are.
     import costs  — from content/importing.json, the same file the country
                     pages are generated from.

   The import one carries a warning the others do not need. These are legal
   statuses, they change, and getting one wrong could contribute to somebody
   importing something illegal. Every country row therefore keeps its own
   sources and its own "verify before ordering" line, and the dataset states
   that it is not legal advice — in the data, not only on the page, because a
   caller may never see the page. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync("data", { recursive: true });

/* ---- scam signals, extracted from the page's own structured data ---- */
const html = readFileSync("scam-check.html", "utf8");
const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const howto = (ld["@graph"] || []).find((n) => n["@type"] === "HowTo");
if (!howto || !(howto.step || []).length) {
  console.error("Could not read the HowTo steps out of scam-check.html — refusing to publish an empty checklist.");
  process.exit(1);
}
const signals = howto.step.map((s, i) => ({
  order: i + 1,
  name: s.name,
  whatToCheck: s.text,
}));

writeFileSync(
  "data/scam-signals.json",
  JSON.stringify(
    {
      name: "Doll shop scam-check signals",
      description:
        "The ten checks to run against an unfamiliar shop before entering a card number. Built from documented " +
        "complaint threads, chargeback cases and counterfeit reports — the recurring patterns in them.",
      license: "https://creativecommons.org/licenses/by/4.0/",
      publisher: "https://thedollscout.com/",
      documentation: "https://thedollscout.com/scam-check.html",
      signalCount: signals.length,
      limitations: [
        "Passing all ten is not a guarantee. It means none of the known patterns fired, not that the shop is safe.",
        "Failing one is not proof of fraud either — it is a reason to look harder before paying.",
        "These describe patterns in reported complaints, not a count of shops.",
      ],
      signals,
    },
    null,
    2
  ) + "\n"
);

/* ---- import rules, from the same file the country pages are built from ---- */
const src = JSON.parse(readFileSync("content/importing.json", "utf8"));
const list = Array.isArray(src) ? src : Object.values(src);
const countries = list.map((c) => ({
  slug: c.slug,
  country: c.country,
  adultFormLegalToImport: c.legalOk,
  summary: c.short,
  status: c.status,
  duty: c.duty,
  customs: c.customs,
  /* Carried deliberately. Every jurisdiction here treats childlike dolls as a
     serious criminal matter, and a tool answering "can I import a doll"
     without that is answering a different question than the one asked. */
  childlikeDollsProhibited: c.childlike,
  sources: c.sources,
  page: `https://thedollscout.com/importing/${c.slug}.html`,
}));

writeFileSync(
  "data/import-costs.json",
  JSON.stringify(
    {
      name: "Adult doll import rules and charges by country",
      description:
        "Legal status, duty and customs treatment for importing adult-form dolls, by destination. Each row keeps " +
        "its own sources.",
      license: "https://creativecommons.org/licenses/by/4.0/",
      publisher: "https://thedollscout.com/",
      documentation: "https://thedollscout.com/importing/",
      countryCount: countries.length,
      notLegalAdvice:
        "This is a reading of published rules, not legal advice. Import law changes, enforcement varies, and a " +
        "summary cannot cover your circumstances. Verify with the destination's customs authority before ordering.",
      universalProhibition:
        "Childlike dolls are prohibited in every jurisdiction covered here and carry serious criminal penalties. " +
        "This site covers adult-form products only and will not help anyone import otherwise.",
      countries,
    },
    null,
    2
  ) + "\n"
);

console.log(`data/scam-signals.json: ${signals.length} signals (extracted from the page's HowTo, not retyped)`);
console.log(`data/import-costs.json: ${countries.length} countries`);
