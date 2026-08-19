/* Checks that the numbers printed on published pages still match the dataset
   they were computed from.

   The pricing guide states specific figures in prose — "33 live listings",
   "the floor was $1,099", "the median $1,749", "zero were under $1,000". Every
   re-scrape moves the data underneath those sentences, and prose does not
   regenerate itself the way a table does. Without this, the most confident
   page on the site quietly becomes the least accurate one, and the failure is
   invisible: the page still reads perfectly.

   This is the same rule as the tool parity tests, applied to writing. A
   published number is a claim, and a claim has to survive a check against its
   evidence — including when the evidence changes and the claim is the thing
   that has to move.

   Run: node scripts/test-published-claims.mjs   (no browser needed) */

import { readFileSync, readdirSync, statSync } from "node:fs";

const rows = JSON.parse(readFileSync("data/doll-specs.json", "utf8")).rows;
const full = rows.filter((r) => !r.isPartialBody);
const torso = rows.filter((r) => r.isPartialBody);

const prices = full.map((r) => r.priceUsd).filter((v) => typeof v === "number").sort((a, b) => a - b);
const median = prices.length % 2
  ? prices[(prices.length - 1) / 2]
  : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
const weights = full.map((r) => r.weightLb).filter((v) => typeof v === "number").sort((a, b) => a - b);
const usd = (n) => "$" + n.toLocaleString("en-US");

/* Figures, not sentence templates. An earlier version demanded exact phrases
   and failed the moment a page was legitimately reworded, which trains you to
   edit the test instead of the page — the precise habit this is meant to
   prevent. What must hold is that every number the data supports appears
   somewhere on the page, and that no claim the data contradicts appears
   anywhere on it. */
const FIGURES = [
  { page: "guides/what-a-doll-costs.html", value: String(full.length), what: "full-size listing count" },
  { page: "guides/what-a-doll-costs.html", value: String(rows.length), what: "total rows after cleaning" },
  { page: "guides/what-a-doll-costs.html", value: usd(prices[0]), what: "cheapest full-size price" },
  { page: "guides/what-a-doll-costs.html", value: usd(median), what: "median full-size price" },
  { page: "guides/what-a-doll-costs.html", value: usd(prices[prices.length - 1]), what: "highest full-size price" },
  { page: "guides/what-a-doll-costs.html", value: String(weights[weights.length - 1]), what: "heaviest full-size listing (lb)" },
  { page: "cost-calculator.html", value: String(full.length), what: "full-size listing count" },
  /* The dataset landing page states the row count and the recording date in
     four places. It was missed by the first version of this test and went
     stale the moment a re-scrape changed the count — found by the search
     indexer reading its <title> back as "42 Doll Listings" against 54 rows. */
  { page: "data/index.html", value: String(rows.length), what: "dataset row count" },
  { page: "data/index.html", value: JSON.parse(readFileSync("data/doll-specs.json", "utf8")).recorded, what: "dataset recording date" },
];

/* Claims the data actively contradicts. These are the dangerous ones: a stale
   figure is inaccurate, but a stale ARGUMENT is misleading. */
const underThousand = prices.filter((p) => p < 1000).length;
/* Scanned across EVERY page, not the one page the claim was written on.
   Scoping this list to guides/what-a-doll-costs.html is how the withdrawn
   sub-$1,000 claim survived on the homepage — "33 live full-size listings:
   floor $1,099, median $1,749 — and zero under $1,000", still there in the
   most-read card on the site, months after the guide published a callout
   explaining that the claim was false and withdrawn. A retraction that only
   covers the page it was written on is not a retraction. */
const CONTRADICTED = underThousand > 0
  ? [
      { phrase: "no full-size doll under $1,000", why: `${underThousand} listing(s) now are` },
      { phrase: "zero were under $1,000", why: `${underThousand} listing(s) now are` },
      { phrase: "zero under $1,000", why: `${underThousand} listing(s) now are` },
      /* NOT "none under $1,000" on its own: the pricing guide uses that exact
         wording to describe what the JULY scrape found, next to the date, which
         is honest history rather than a live claim. A retraction check that
         flags a correctly dated past finding teaches people to delete the
         history, which is the opposite of the point. */
      { phrase: "This band is where counterfeit listings live", why: "the band is no longer empty, so the sentence no longer follows" },
      { phrase: 'The "cheap full-size doll" band is where counterfeits live', why: "the band now contains this vendor's own vetted stock" },
    ]
  : [];

/* Every published page. The withdrawal callout on the pricing guide quotes the
   retracted wording in order to retract it, so that one block is exempt — but
   only that block, and only on that page. */
function publishedPages(dir = ".", out = []) {
  for (const e of readdirSync(dir)) {
    if (["node_modules", "dist", "scripts", "content", "functions", "img", "data"].includes(e) || e.startsWith(".")) continue;
    const full = dir === "." ? e : `${dir}/${e}`;
    if (statSync(full).isDirectory()) publishedPages(full, out);
    else if (full.endsWith(".html")) out.push(full);
  }
  return out;
}

const withoutRetractionNotice = (html) =>
  html.replace(/<div class="callout warn">[\s\S]*?<\/div>/g, (block) =>
    /we were wrong|is withdrawn/i.test(block) ? " " : block);

let failed = 0;
const cache = new Map();
const read = (p) => (cache.has(p) ? cache.get(p) : (cache.set(p, readFileSync(p, "utf8")), cache.get(p)));

/* A bare `includes` was too weak in two separate ways, and both let a wrong
   number ship.

   1. "50" is a substring of "$2,500", so the full-size count passed while the
      page said 51.
   2. Markup is not prose. The count "passed" on the cost calculator because of
      step="50" on a number input — a figure nobody states, in a place no
      reader or parser reads as a claim.

   So: reduce the page to what it actually asserts — visible text, <title>,
   meta content= values and JSON-LD — and require the figure to stand alone
   inside that. */
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function assertedText(html) {
  const parts = [];
  /* Structured data and meta descriptions are claims: an answer engine quotes
     them. Everything else inside a tag is plumbing. */
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) parts.push(m[1]);
  for (const m of html.matchAll(/\bcontent="([^"]*)"/gi)) parts.push(m[1]);
  parts.push(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
  return parts.join("\n");
}

const states = (html, value) =>
  new RegExp(`(?<![\\d,.$])${escape(value)}(?![\\d,.])`).test(assertedText(html));

for (const f of FIGURES) {
  if (states(read(f.page), f.value)) {
    console.log(`ok    ${f.page}: ${f.what} = ${f.value}`);
  } else {
    failed++;
    console.log(`FAIL  ${f.page}: ${f.what} is now ${f.value}, and the page never says it.`);
    console.log(`        Rewrite the page. Do not adjust the data.`);
  }
}

/* CANARY. If the matcher above breaks, every figure passes and the run reads
   as a clean site — the same shape of false confidence the substring bug
   produced. So prove the matcher can still fail. */
{
  const bogus = "8675309";
  if (states(read(FIGURES[0].page), bogus)) {
    failed++;
    console.log(`FAIL  canary: the matcher found ${bogus} on ${FIGURES[0].page}, so it would find anything.`);
  } else {
    console.log("ok    canary: the figure matcher can still fail");
  }
  /* And prove it is not merely a substring test any more. */
  if (states("<td>$2,500</td>", "2,50")) {
    failed++;
    console.log("FAIL  canary: a figure embedded inside a larger number still counts as stated.");
  } else {
    console.log("ok    canary: a number inside a larger number does not count as stated");
  }
  /* The one that actually happened. */
  if (states('<input type="number" id="c-price" value="1500" min="100" step="50">', "50")) {
    failed++;
    console.log("FAIL  canary: a number inside an HTML attribute still counts as a published claim.");
  } else {
    console.log("ok    canary: a number in markup is not a published claim");
  }
}

/* Case-insensitive, because it was not. The share button on the pricing guide
   carried the retracted claim verbatim — "Zero were under $1,000" — and this
   test walked past it on the capital Z, in the one piece of text on the page
   the site actively asks people to repost. */
for (const c of CONTRADICTED) {
  const re = new RegExp(escape(c.phrase), "i");
  const guilty = publishedPages().filter((f) => re.test(withoutRetractionNotice(read(f))));
  if (guilty.length) {
    failed++;
    console.log(`FAIL  ${guilty.join(", ")} still claim(s) "${c.phrase}" — ${c.why}.`);
  } else {
    console.log(`ok    no page claims "${c.phrase}" (any case, site-wide)`);
  }
}

/* The band table is the page's central evidence, and its counts drifted to 51
   against 50 rows without anything failing. A table whose parts do not add up
   to the whole is wrong on its face, so check the arithmetic rather than any
   single cell. */
{
  const guide = read("guides/what-a-doll-costs.html");
  const counts = [...guide.matchAll(/<td>(\d+) full-size<\/td>/g)].map((m) => Number(m[1]));
  const sum = counts.reduce((a, b) => a + b, 0);
  if (!counts.length) {
    failed++;
    console.log("FAIL  the price-band table has no countable rows — the check found nothing to verify.");
  } else if (sum !== full.length) {
    failed++;
    console.log(`FAIL  the price bands sum to ${sum} (${counts.join(" + ")}) but the dataset has ${full.length} full-size rows.`);
  } else {
    console.log(`ok    the price bands sum to the dataset: ${counts.join(" + ")} = ${full.length}`);
  }
}

/* Guard against a dataset that silently emptied: every claim would then be
   computed from nothing and could still "match" a stale page. */
if (!full.length || !prices.length) {
  console.log("FAIL  the dataset has no priced full-size rows — nothing was actually verified.");
  failed++;
}

console.log(
  failed
    ? `\n${failed} published claim(s) no longer match the data. The page is wrong, not the data.`
    : `\nAll ${FIGURES.length + CONTRADICTED.length} published claims still match the dataset.`
);
process.exit(failed ? 1 : 0);
