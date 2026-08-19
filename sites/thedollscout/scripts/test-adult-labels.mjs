/* Guards the adult-labelling decision.

   Removing the SafeSearch label from the legal, customs, data and tooling pages
   is only defensible while two things stay true: the 18+ age gate still covers
   every page without exception, and no page showing or recommending the product
   ever loses its label. Both would fail silently — a missing age gate looks
   like a page that simply loads, and a missing rating tag looks like nothing at
   all — so both are asserted here rather than trusted.

   Run: node scripts/test-adult-labels.mjs */

import { readFileSync, existsSync } from "node:fs";
import { ADULT_SURFACES, NON_EXPLICIT, RTA_LABEL, adultPaths } from "./adult-labels.mjs";
import { filePathFor } from "./canonical-url.mjs";

const META = '<meta name="rating" content="adult">';
let failed = 0;
const t = (name, ok, detail) => {
  if (ok) console.log(`ok    ${name}`);
  else { failed++; console.log(`FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

const nonExplicitPages = NON_EXPLICIT.map((n) => n.page);
const all = [...ADULT_SURFACES, ...nonExplicitPages];

/* ---- 1. THE COMPLIANCE INVARIANT ----
   The age gate is what makes this site lawful to operate, and it is injected by
   js/main.js. If a page ever ships without that script it has no gate at all,
   and de-labelling that page would then be indefensible rather than merely
   wrong. This is the assertion that must never be relaxed. */
const ungated = all.filter((p) => existsSync(p) && !/src="\/js\/main\.js"/.test(readFileSync(p, "utf8")));
t("every page still loads js/main.js, so the 18+ gate is site-wide",
  ungated.length === 0,
  ungated.length ? `no age gate on: ${ungated.join(", ")}` : "");

/* ---- 2. no page may be silently unclassified ----
   A page added later and put in neither list would inherit whatever the
   template happened to carry. Sitemap is the definition of "published". */
/* The sitemap now lists the URL the host serves, which is no longer the file
   name — /picks, not /picks.html — so it has to be mapped back. */
const published = [...readFileSync("sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => filePathFor(m[1]));
const unclassified = published.filter((p) => !all.includes(p));
t("every published page appears in exactly one list",
  unclassified.length === 0,
  unclassified.length ? `not classified: ${unclassified.join(", ")}` : "");

const both = ADULT_SURFACES.filter((p) => nonExplicitPages.includes(p));
t("no page appears in both lists", both.length === 0, both.join(", "));

/* ---- 3. the labels match the lists ---- */
const missingLabel = ADULT_SURFACES.filter((p) => existsSync(p) && !readFileSync(p, "utf8").includes(META));
t("every adult surface still carries the rating tag",
  missingLabel.length === 0,
  missingLabel.length ? `unlabelled: ${missingLabel.join(", ")}` : "");

const strayLabel = nonExplicitPages.filter((p) => existsSync(p) && readFileSync(p, "utf8").includes(META));
t("no non-explicit page carries the rating tag",
  strayLabel.length === 0,
  strayLabel.length ? `still labelled: ${strayLabel.join(", ")}` : "");

/* ---- 4. _headers ---- */
const headers = readFileSync("_headers", "utf8");
const globalBlock = headers.split(/\n(?=\S)/).find((b) => b.startsWith("/*")) || "";

/* The regression this whole exercise exists to prevent. Putting Rating: back
   under /* re-labels the dataset, llms.txt, the sitemap and /mcp in one line,
   and nothing about the site would look different. */
t("the Rating: header is NOT applied to /*",
  !/Rating:/i.test(globalBlock),
  "Rating: is back on /* — that re-labels /data/*.json, /llms.txt, /sitemap.xml and /mcp");

/* Narrowing the SECURITY headers while narrowing the rating one would be a
   silent downgrade of every page's protection. */
for (const h of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
  t(`${h} still applies to /*`, new RegExp(`${h}:`).test(globalBlock));
}

const labelled = adultPaths().filter((p) => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n\\s+Rating: ${RTA_LABEL}`, "m").test(headers));
t(`all ${adultPaths().length} adult paths carry the Rating: header`,
  labelled.length === adultPaths().length,
  `missing: ${adultPaths().filter((p) => !labelled.includes(p)).join(", ")}`);

/* Discovery surfaces are the point of the change: they are not pages, they
   cannot contain explicit content, and they were labelled anyway. */
for (const surface of ["/data/doll-specs.json", "/llms.txt", "/sitemap.xml", "/mcp", "/server.json"]) {
  t(`${surface} is not declared adult`, !adultPaths().includes(surface));
}

console.log(failed ? `\n${failed} failed.` : "\nAll passed.");
process.exit(failed ? 1 : 0);
