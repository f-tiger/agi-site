/* Rewrites the figures on /data/ and the pricing guide from the dataset.
   Hand-written numbers on those two pages had gone stale, and staleness here is
   not cosmetic: the whole offer is "every number is checkable", so a page that
   says 54 rows above a file containing 53 disproves the claim it exists to
   make.

   How it went wrong is worth recording, because it is the same failure twice.
   A scrape on 2026-08-11 landed in content/, but the workflow that regenerates
   from it could never commit (see scripts/commit-generated.sh), so the prose
   kept quoting the 7 August scrape. The existing test caught only three of the
   drifted figures, because it asks whether a number appears ANYWHERE in the
   file — "50" is a substring of "$2,500", so a wrong count can pass. It never
   looked at /data/'s composition sentence at all, which read "33 rows are
   full-size dolls, 9 are partial bodies" against 50 and 3.

   So the numbers stop being written by hand. Every replacement below is
   anchored and MUST match: a pattern that stops matching throws instead of
   silently doing nothing, because a generator that quietly no-ops is how a page
   goes stale while its build stays green.

   Run: node scripts/build-data-page.mjs */

import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("data/doll-specs.json", "utf8"));
const rows = data.rows;
const full = rows.filter((r) => !r.isPartialBody);
const torso = rows.filter((r) => r.isPartialBody);

const nums = (list, key) => list.map((r) => r[key]).filter((v) => typeof v === "number").sort((a, b) => a - b);
const fullPrices = nums(full, "priceUsd");
const fullWeights = nums(full, "weightLb");
const allPrices = nums(rows, "priceUsd");
const torsoPrices = nums(torso, "priceUsd");
const median = fullPrices.length % 2
  ? fullPrices[(fullPrices.length - 1) / 2]
  : (fullPrices[fullPrices.length / 2 - 1] + fullPrices[fullPrices.length / 2]) / 2;

const usd = (n) => "$" + Number(n).toLocaleString("en-US");
const F = {
  recorded: data.recorded,                       // 2026-08-11
  rows: rows.length,
  full: full.length,
  torso: torso.length,
  floor: fullPrices[0],
  median,
  top: fullPrices[fullPrices.length - 1],
  heaviest: fullWeights[fullWeights.length - 1],
  underThousand: fullPrices.filter((p) => p < 1000).length,
  allLow: allPrices[0],
  allHigh: allPrices[allPrices.length - 1],
  torsoLow: torsoPrices[0],
};

/* "2026-08-11" -> "11 August 2026". Built from the parts rather than a locale
   call so the output cannot shift with the runner's environment. */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];
const [y, m, d] = F.recorded.split("-").map(Number);
const longDate = `${d} ${MONTHS[m - 1]} ${y}`;

/* Height with the largest sample — the guide cites it as the build-not-height
   evidence, so it has to be derived, not remembered. */
const byHeight = new Map();
for (const r of full) {
  if (typeof r.heightCm !== "number" || typeof r.weightLb !== "number") continue;
  if (!byHeight.has(r.heightCm)) byHeight.set(r.heightCm, []);
  byHeight.get(r.heightCm).push(r.weightLb);
}
const [bigHeight, bigWeights] = [...byHeight.entries()].sort((a, b) => b[1].length - a[1].length)[0];
bigWeights.sort((a, b) => a - b);
const spreadPct = Math.round(((bigWeights[bigWeights.length - 1] / bigWeights[0]) - 1) * 100);

/* The build-not-height evidence for the homepage: the shortest height class we
   have a real sample of, against the tallest one it beats on weight. Derived
   rather than remembered, because the previous hand-written version cited a
   height the dataset no longer contains. */
const heightsWithSample = [...byHeight.entries()].filter(([, w]) => w.length >= 3).sort((a, b) => a[0] - b[0]);
const [shortHeight, shortWeights] = heightsWithSample[0];
const shortHeavy = Math.max(...shortWeights);
const beaten = heightsWithSample.filter(([h, w]) => h > shortHeight && Math.max(...w) < shortHeavy);
const [tallHeight] = beaten.length ? beaten[beaten.length - 1] : [];

let changed = 0;
const edits = [];

/* Anchored, and fatal when it stops matching. The alternative — a replace that
   finds nothing and moves on — is indistinguishable from a page that was
   already correct, which is precisely the bug being fixed. */
function edit(file, label, pattern, replacement) {
  edits.push({ file, label, pattern, replacement });
}

function apply(file) {
  let html = readFileSync(file, "utf8");
  const before = html;
  for (const e of edits.filter((e) => e.file === file)) {
    /* Replacements go in as FUNCTIONS, never as strings. A string replacement
       treats "$1,000" as capture group 1 — which turned the price-band table
       into a copy of its own <thead> before this was caught. A function
       receives the groups as arguments and substitutes nothing. */
    const replacer = typeof e.replacement === "function" ? e.replacement : () => e.replacement;
    const hits = html.match(new RegExp(e.pattern.source, e.pattern.flags.replace("g", "") + "g"));
    if (!hits || hits.length === 0) {
      console.log(`FAIL  ${file}: the anchor for "${e.label}" matched nothing.`);
      console.log(`        ${e.pattern}`);
      console.log(`        The page was edited by hand in a way this generator no longer recognises.`);
      console.log(`        Fix the anchor — do NOT delete it, or the figure silently goes stale again.`);
      process.exitCode = 1;
      continue;
    }
    html = html.replace(new RegExp(e.pattern.source, e.pattern.flags.includes("g") ? e.pattern.flags : e.pattern.flags + "g"), replacer);
  }
  if (html !== before) {
    writeFileSync(file, html);
    changed++;
    console.log(`  rewrote ${file}`);
  } else {
    console.log(`  ${file} already current`);
  }
}

/* ---------------- /data/ ---------------- */
const DP = "data/index.html";
edit(DP, "title row count", /<title>Open Data: [\d,]+ Doll Listings/, `<title>Open Data: ${F.rows} Doll Listings`);
edit(DP, "meta description", /height, weight and price for [\d,]+ adult doll listings/, `height, weight and price for ${F.rows} adult doll listings`);
edit(DP, "og:description", /content="[\d,]+ doll listings — height/, `content="${F.rows} doll listings — height`);
edit(DP, "twitter:description", /content="[\d,]+ doll listings as JSON/, `content="${F.rows} doll listings as JSON`);
edit(DP, "Dataset description", /for [\d,]+ adult doll and torso listings recorded at one vetted vendor on \d{4}-\d{2}-\d{2}/,
  `for ${F.rows} adult doll and torso listings recorded at one vetted vendor on ${F.recorded}`);
edit(DP, "dateModified", /"dateModified": "\d{4}-\d{2}-\d{2}"/, `"dateModified": "${F.recorded}"`);
edit(DP, "temporalCoverage", /"temporalCoverage": "\d{4}-\d{2}-\d{2}"/, `"temporalCoverage": "${F.recorded}"`);
edit(DP, "byline", /<strong>Recorded .+? · [\d,]+ rows · CC BY 4\.0<\/strong>/,
  `<strong>Recorded ${longDate} · ${F.rows} rows · CC BY 4.0</strong>`);
edit(DP, "lede row count", /the same [\d,]+\s*\n?listings our price/, `the same ${F.rows}\nlistings our price`);
/* The sentence that was most wrong, and that no test looked at. */
edit(DP, "composition sentence",
  /<p>[\d,]+ rows are full-size dolls, [\d,]+ are partial bodies\. Prices span \$[\d,]+ to \$[\d,]+\./,
  `<p>${F.full} rows are full-size dolls, ${F.torso} are partial bodies. Prices span ${usd(F.allLow)} to ${usd(F.allHigh)}.`);
/* "including the empty one" described the sub-$1,000 band we withdrew. Leaving
   it would keep a retracted finding in the site's own navigation. */
edit(DP, "price-bands link text", /the price\s*\n?bands(?:, including the empty one|[^<]*)<\/a>/, `the price\nbands and what changed between scrapes</a>`);
edit(DP, "share text", /A doll buying guide published its raw dataset — [\d,]+ listings with prices/,
  `A doll buying guide published its raw dataset — ${F.rows} listings with prices`);

/* ---------------- the homepage ----------------

   Added after the homepage was found quoting the 7 August scrape: "33 live
   full-size listings: floor $1,099, median $1,749 — and zero under $1,000",
   against a dataset of 50 with a floor of $899 and two below $1,000. The
   sub-$1,000 sentence is the worse half. The pricing guide had already
   WITHDRAWN that finding, in a paragraph explaining the withdrawal — and the
   most-read page on the site went on asserting it, which is worse than never
   having published the correction.

   The weight card was unsupported in a different way: it cited "a slim 151 cm
   doll", and the current dataset contains no 151 cm doll at all. Its
   replacement is derived, so it cannot outlive the rows it describes. */
const HP = "index.html";
/* The whole paragraph is replaced, not just the numbers. Patching the figures
   and leaving the sentence after them would have produced "two under $1,000.
   The cheap full-size doll band is where counterfeits live" — the site
   describing its own vetted vendor's stock as the counterfeit band. */
edit(HP, "price-bands card",
  /<p>[\d,]+ live full-size listings: floor \$[\d,]+, median \$[\d,]+[^<]*<\/p>/,
  () => `<p>${F.full} live full-size listings: floor ${usd(F.floor)}, median ${usd(F.median)}. The "$299 premium doll" advertised elsewhere is nowhere near the real floor — that gap is where the counterfeits are.</p>`);
/* Refuse rather than approximate. If no taller height class is beaten on
   weight, the claim is not true of this dataset and the card must not make it —
   an unsupported sentence left in place is the failure this file exists for. */
if (tallHeight) {
  edit(HP, "weights card",
    /<p>Height barely predicts weight — build does\. [^<]*<\/p>/,
    () => `<p>Height barely predicts weight — build does. The heaviest ${shortHeight}&nbsp;cm doll we recorded (${shortHeavy}&nbsp;lb) outweighs every ${tallHeight}&nbsp;cm doll in the set.</p>`);
} else {
  console.log(`  NOTE index.html: no height class is out-weighed by a shorter one in this scrape,`);
  console.log(`       so the weights card is left alone. Check it by hand before trusting it.`);
}
edit(HP, "raw dataset card", /<p>All [\d,]+ listings as JSON and CSV/, () => `<p>All ${F.rows} listings as JSON and CSV`);

/* ---------------- the pricing guide ---------------- */
const GP = "guides/what-a-doll-costs.html";
edit(GP, "title", /<title>Sex Doll Prices: What [\d,]+ Live Listings Actually Show<\/title>/,
  `<title>Sex Doll Prices: What ${F.full} Live Listings Actually Show</title>`);
edit(GP, "meta description", /Price bands from [\d,]+ live full-size listings: floor \$[\d,]+, median \$[\d,]+/,
  `Price bands from ${F.full} live full-size listings: floor ${usd(F.floor)}, median ${usd(F.median)}`);
edit(GP, "JSON-LD headline", /"headline": "Sex doll prices: what [\d,]+ live listings actually show"/,
  `"headline": "Sex doll prices: what ${F.full} live listings actually show"`);
edit(GP, "JSON-LD description", /"description": "Price bands built from [\d,]+ current full-size listings/,
  `"description": "Price bands built from ${F.full} current full-size listings`);
edit(GP, "dateModified", /"dateModified": "\d{4}-\d{2}-\d{2}"/, `"dateModified": "${F.recorded}"`);
edit(GP, "FAQ price answer",
  /Across [\d,]+ full-size listings live at a vetted vendor on .+?, the cheapest was \$[\d,]+, the median was \$[\d,]+ and the most expensive was \$[\d,]+\. \w+ of the [\d,]+ were under \$1,000/,
  `Across ${F.full} full-size listings live at a vetted vendor on ${longDate}, the cheapest was ${usd(F.floor)}, the median was ${usd(F.median)} and the most expensive was ${usd(F.top)}. Two of the ${F.full} were under $1,000`);
/* Anchors must match their OWN output as well as the text they replace, or the
   generator works exactly once and every run after it fails. Not hypothetical:
   four of these did precisely that on the second run, which is why they read
   old-or-new. */
edit(GP, "FAQ torso answer date", /Our \d+ \w+ scrape happened to reach only (?:three|[\d,]+) torsos, all large silicone ones at \$[\d,]+ and above/,
  `Our ${d} ${MONTHS[m - 1]} scrape happened to reach only ${F.torso} torsos, all large silicone ones at ${usd(F.torsoLow)} and above`);
edit(GP, "FAQ build answer",
  /In the .+? sample, [\d,]+ listings at \d+ cm ranged from [\d,]+ lb to [\d,]+ lb — a \d+ percent difference/,
  `In the ${longDate} sample, ${bigWeights.length} listings at ${bigHeight} cm ranged from ${bigWeights[0]} lb to ${bigWeights[bigWeights.length - 1]} lb — a ${spreadPct} percent difference`);
edit(GP, "h1", /<h1>What a doll actually costs — from [\d,]+ live listings/, `<h1>What a doll actually costs — from ${F.full} live listings`);
edit(GP, "byline", /<p class="byline">Last updated .+? · <a href="\/trust(?:\.html)?">/,
  `<p class="byline">Last updated ${longDate} · <a href="/trust">`);
edit(GP, "withdrawal paragraph",
  /On \d+ \w+ \d{4} the same\s*\n?\s*scraper reached [\d,]+ full-size listings and found <strong>two at \$[\d,]+<\/strong>/,
  `On ${longDate} the same\n  scraper reached ${F.full} full-size listings and found <strong>${F.underThousand === 2 ? "two" : String(F.underThousand)} at ${usd(F.floor)}</strong>`);
edit(GP, "bands heading", /<h2>The bands, from the .+? data<\/h2>/, `<h2>The bands, from the ${longDate} data</h2>`);
edit(GP, "recorded footnote", /<p class="meta">Recorded \d{4}-\d{2}-\d{2} from live product pages/,
  `<p class="meta">Recorded ${F.recorded} from live product pages`);
/* The dataset's total is quoted here so the guide and /data/ cannot disagree
   about how many rows the site has. The vendor name stays: an earlier version
   of this anchor matched "(yourdoll.com)" and replaced the attribution with a
   row count, which would have published a sourced claim with its source
   deleted. */
edit(GP, "total rows footnote", /at one vetted vendor\n\(yourdoll\.com(?:, [^)]*)?\)/,
  `at one vetted vendor\n(yourdoll.com, ${F.rows} rows in total — ${F.full} full-size and ${F.torso} partial bodies)`);
/* This was the worst one. The share button still carried the retracted claim,
   word for word, in the text the site asks people to repost — and the test
   that checks for retracted claims missed it on a capital letter. */
edit(GP, "share text",
  /data-share-text="We priced [\d,]+ live full-size doll listings\.[^"]*"/,
  `data-share-text="We priced ${F.full} live full-size doll listings. The floor was ${usd(F.floor)} — and we published the earlier scrape that said otherwise."`);
/* A CTA asserting a price is still a price claim, and this one quoted a figure
   from a scrape two weeks older than the page's own data. */
edit(GP, "torso CTA", /(?:Torsos from \$[\d,]+|Browse torsos) →/, `Browse torsos →`);

/* How many rows this recording discarded. The page described two dropped rows
   under a heading giving the current recording date — true of the 7 August run
   and false of this one, which dropped none. A disclosure that migrates onto a
   later date stops being a disclosure and becomes an inaccuracy, so the count
   comes from the raw scrape against the published dataset. */
const raw = JSON.parse(readFileSync("content/doll-specs.json", "utf8"));
const dropped = (raw.specs?.length ?? rows.length) - rows.length;
const droppedSentence = dropped > 0
  ? `${dropped === 1 ? "One row was" : `${dropped} rows were`} dropped from this recording as implausible — the 7 August run dropped two, where a 160&nbsp;cm doll came back at 2.5&nbsp;kg`
  : `No rows were dropped from this recording. The 7 August one dropped two, where a 160&nbsp;cm doll came back at 2.5&nbsp;kg`;

edit(GP, "dropped-rows disclosure",
  /(?:Two rows were dropped\nbecause a 160&nbsp;cm doll came back at 2\.5&nbsp;kg|(?:No rows were dropped from this recording\.|(?:One row was|\d+ rows were) dropped from this recording as implausible —) The 7 August (?:run|one) dropped two, where a 160&nbsp;cm doll came back at 2\.5&nbsp;kg) — a shipping or head weight/,
  `${droppedSentence} — a shipping or head weight`);

/* ---- the price-band table ----
   Every cell in it is arithmetic over the dataset, and every cell was stale:
   the four band counts summed to 51 against 50 full-size rows, and one band's
   "weight reality" column had drifted far enough to describe a different set
   of dolls. A first attempt at this patched one cell and put the WHOLE
   dataset's weight range into a single band's row — a wrong claim replacing a
   stale one. So the rows are generated together or not at all.

   The prose in "what it buys" carries no numbers on purpose. A qualitative
   sentence cannot go stale; a number in an editorial aside can, and will. */
const BANDS = [
  { lo: 0, hi: 999, buys: "Clearance stock already sitting in a regional warehouse — not a market price" },
  { lo: 1000, hi: 1499, buys: "The compact and mid builds" },
  { lo: 1500, hi: 1999, buys: "Mixed builds and materials" },
  { lo: 2000, hi: Infinity, buys: "The silicone end of the catalogue" },
];

/* min–max, collapsing to one figure when every row agrees. "150–150 cm" reads
   as a range that happens to be flat, which is not what it means. */
const range = (list) =>
  list[0] === list[list.length - 1] ? String(list[0]) : `${list[0]}–${list[list.length - 1]}`;

const cell = (b) => {
  const rowsIn = full.filter((r) => typeof r.priceUsd === "number" && r.priceUsd >= b.lo && r.priceUsd <= b.hi);
  const w = nums(rowsIn, "weightLb");
  const h = nums(rowsIn, "heightCm");
  const p = nums(rowsIn, "priceUsd");
  /* The band's stated edges are the band's DEFINITION at the low end and the
     observed maximum at the top, so the last band cannot claim a ceiling the
     catalogue never reached. */
  const low = b.lo === 0 ? p[0] : b.lo;
  const high = b.hi === Infinity ? p[p.length - 1] : Math.min(b.hi, p[p.length - 1]);
  const label = low === high ? usd(low) : `${usd(low)}–${usd(high)}`;
  return `    <tr>
      <td><strong>${label}</strong></td>
      <td>${rowsIn.length} full-size</td>
      <td>${b.buys}${h.length ? `, ${range(h)}&nbsp;cm` : ""}</td>
      <td>${w.length ? `${range(w)}&nbsp;lb` : "no weight recorded"}</td>
    </tr>`;
};

const underFive = full.filter((r) => typeof r.priceUsd === "number" && r.priceUsd < 500).length;
const bandRows =
  BANDS.filter((b) => full.some((r) => typeof r.priceUsd === "number" && r.priceUsd >= b.lo && r.priceUsd <= b.hi))
    .map(cell)
    .join("\n") +
  `\n    <tr>
      <td><strong>Under $500, full-size</strong></td>
      <td><strong>${underFive}</strong>, on every date recorded</td>
      <td colspan="2"><strong>Never seen at a vetted vendor.</strong> This is where counterfeit listings live — see below.</td>
    </tr>`;

edit(GP, "price-band table",
  /(<thead><tr><th>Band<\/th><th>Listings<\/th><th>What it buys<\/th><th>Weight reality<\/th><\/tr><\/thead>\n  <tbody>\n)[\s\S]*?(\n  <\/tbody>)/,
  (_m, head, tail) => head + bandRows + tail);

/* ---------------- the cost calculator's cross-reference ---------------- */
/* It quoted the listing count and the recording date of the pricing guide, and
   both had drifted. The claims test passed this page anyway, because the only
   thing on it that matched "50" was step="50" on a number input. */
const CC = "cost-calculator.html";
edit(CC, "cross-reference to the price bands",
  /We banded <a href="\/guides\/what-a-doll-costs(?:\.html)?">[\d,]+ live listings by price<\/a> — the floor for full-size was \$[\d,]+ and the median \$[\d,]+, recorded .+?\./,
  `We banded <a href="/guides/what-a-doll-costs">${F.full} live listings by price</a> — the floor for full-size was ${usd(F.floor)} and the median ${usd(F.median)}, recorded ${longDate}.`);

console.log(`Rewriting published figures from data/doll-specs.json (recorded ${F.recorded}, ${F.rows} rows)`);
apply(DP);
apply(GP);
apply(CC);
apply(HP);

console.log(
  process.exitCode
    ? "\nAt least one anchor failed. The pages may now be partly regenerated — fix the anchors before deploying."
    : `\n${changed} page(s) rewritten. ${F.full} full-size, ${F.torso} partial, floor ${usd(F.floor)}, median ${usd(F.median)}, heaviest ${F.heaviest} lb.`
);
