/* Generates one page per height for which we actually have a sample.

   The reasoning, from research rather than preference. The site's positioning
   is trust, and trust is a conversion asset — nobody types "trustworthy doll
   guide" into a search box. That is why the content can be genuinely good and
   the traffic still zero: the site had a conversion layer and no discovery
   layer. This is the discovery layer.

   It targets the one query family where three things are true at once:

     1. High intent, and asked constantly — "how much does a 150cm doll weigh"
        is the single most reported source of first-buyer regret.
     2. The SERP is weak — searches return marketplace listings and SEO spam
        hosted on hijacked .edu domains, not answers.
     3. Only we can answer it. Vendors overwhelmingly do not publish weight,
        which is exactly why we scraped it.

   THE GATE: a page is generated only where the sample can carry it. Below
   MIN_SAMPLE the height is listed on the hub with its real count and no page
   is written. A thin page per height would be the programmatic-SEO move that
   gets a domain classified as spam, and it would also be us doing the thing
   this site exists to oppose — publishing a number with nothing behind it. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const DATA = JSON.parse(readFileSync("data/doll-specs.json", "utf8"));
const RECORDED = DATA.recorded;
/* Ten listings is not a market study and the pages say so. It is enough to
   state a range and a spread honestly, which is ten more than anyone else in
   the category publishes. */
const MIN_SAMPLE = 10;

const rows = DATA.rows.filter((r) => !r.isPartialBody && r.weightLb && r.heightCm);
const byHeight = new Map();
for (const r of rows) {
  if (!byHeight.has(r.heightCm)) byHeight.set(r.heightCm, []);
  byHeight.get(r.heightCm).push(r);
}

const stats = (g) => {
  const w = g.map((r) => r.weightLb).sort((a, b) => a - b);
  const p = g.map((r) => r.priceUsd).filter((v) => typeof v === "number").sort((a, b) => a - b);
  const med = (a) => (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2);
  return {
    n: g.length,
    lbMin: w[0], lbMax: w[w.length - 1], lbMed: med(w),
    kgMin: Math.round(w[0] / 2.20462), kgMax: Math.round(w[w.length - 1] / 2.20462),
    priceMin: p[0] ?? null, priceMax: p[p.length - 1] ?? null,
    spread: w[w.length - 1] - w[0],
    spreadPct: Math.round(((w[w.length - 1] - w[0]) / w[0]) * 100),
  };
};

const usd = (n) => "$" + n.toLocaleString("en-US");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const NAV = `<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/">Doll<b>Scout</b></a>
    <button class="nav-toggle" aria-label="Menu">☰</button>
    <nav class="nav">
      <a href="/quiz.html">60-Sec Finder</a>
      <a href="/scam-check.html">Scam-Check</a>
      <a href="/cost-calculator.html">True Cost</a>
      <a href="/after-you-order.html">After You Order</a>
      <a href="/importing/">Importing</a>
      <a href="/guides/">Guides</a>
      <a href="/picks.html">Vetted Picks</a>
    </nav>
  </div>
</header>`;

const FOOT = `<footer class="site-footer">
  <div class="wrap">
    <p class="disclosure">
      <strong>18+ only.</strong> Adult products for adults; we exclusively feature products depicting adults.
      <strong>Affiliate disclosure:</strong> DollScout earns disclosed referral commissions from vetted vendors linked on this site. Commissions never change rankings or the data above.
      · <a href="/trust.html">Methodology</a> · <a href="/legal/affiliate-disclosure.html">Disclosure</a> · <a href="/legal/privacy.html">Privacy</a> · © <span id="year"></span> DollScout
    </p>
  </div>
</footer>

<script src="/js/config.js"></script>
<script src="/js/analytics.js"></script>
<script src="/js/main.js"></script>
<script src="/js/search.js" defer></script>
</body>
</html>`;

const head = (title, desc, canonical) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="rating" content="adult">
<link rel="canonical" href="https://thedollscout.com${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="DollScout">
<meta property="og:url" content="https://thedollscout.com${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/css/main.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">`;

mkdirSync("weight", { recursive: true });

const built = [];
const tooThin = [];

for (const [h, g] of [...byHeight.entries()].sort((a, b) => a[0] - b[0])) {
  const s = stats(g);
  if (s.n < MIN_SAMPLE) { tooThin.push({ h, ...s }); continue; }

  const canonical = `/weight/${h}cm.html`;
  const title = `How Much Does a ${h}cm Sex Doll Weigh? ${s.n} Real Listings`;
  const desc = `${s.n} live ${h}cm listings recorded ${RECORDED}: ${s.lbMin}–${s.lbMax} lb (${s.kgMin}–${s.kgMax} kg), median ${s.lbMed} lb. Shops routinely omit weight — these are measured from live listings, with the sample size stated.`;

  /* The answer sentence is written once and reused verbatim in the FAQ
     schema, so what a reader sees and what an extractor quotes cannot
     diverge. */
  const answer =
    `Across ${s.n} live ${h}cm full-size listings recorded on ${RECORDED} at a vetted vendor, ` +
    `weight ranged from ${s.lbMin} lb to ${s.lbMax} lb (${s.kgMin}–${s.kgMax} kg), with a median of ${s.lbMed} lb. ` +
    `That is a ${s.spread} lb spread — ${s.spreadPct}% — between the lightest and heaviest doll at one identical height, ` +
    `because build, not height, drives weight. It is a sample of one catalogue on one date, not a market survey.`;

  const rowsHtml = g
    .slice()
    .sort((a, b) => a.weightLb - b.weightLb)
    .map((r) => `      <tr><td>${r.weightLb} lb</td><td>${Math.round(r.weightLb / 2.20462)} kg</td><td>${r.priceUsd ? usd(r.priceUsd) : "—"}</td><td>${esc(r.title.slice(0, 62))}</td></tr>`)
    .join("\n");

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "https://thedollscout.com/#org", name: "DollScout", url: "https://thedollscout.com/" },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://thedollscout.com/" },
          { "@type": "ListItem", position: 2, name: "Weight by height", item: "https://thedollscout.com/weight/" },
          { "@type": "ListItem", position: 3, name: `${h}cm`, item: `https://thedollscout.com${canonical}` },
        ],
      },
      {
        "@type": "Article",
        headline: title,
        description: desc,
        author: { "@id": "https://thedollscout.com/#org" },
        publisher: { "@id": "https://thedollscout.com/#org" },
        datePublished: RECORDED,
        dateModified: RECORDED,
        isBasedOn: "https://thedollscout.com/data/doll-specs.json",
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: `How much does a ${h}cm sex doll weigh?`, acceptedAnswer: { "@type": "Answer", text: answer } },
          {
            "@type": "Question",
            name: `Can one person lift a ${h}cm doll?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `At ${s.lbMin}–${s.lbMax} lb (${s.kgMin}–${s.kgMax} kg) it is dead weight with no grip points, which handles very differently from a barbell or a suitcase of the same mass. We have not tested handling and will not pretend otherwise; what the data supports is that a ${h}cm doll is heavy enough that storage and repositioning need planning before purchase, and that the heaviest ${h}cm listing weighs ${s.spread} lb more than the lightest.`,
            },
          },
        ],
      },
    ],
  };

  const html = `${head(title, desc, canonical)}
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="notice-bar">🛡️ <b>Evidence-standard buyer's guide.</b> Every number sourced — or marked unverified. We sell nothing ourselves. 18+ only.</div>
${NAV}

<main id="main" tabindex="-1">
<section>
<div class="wrap prose">

<p class="breadcrumb"><a href="/weight/">Weight by height</a> / ${h}cm</p>

<h1>How much does a ${h}cm doll weigh?</h1>

<p class="byline">${s.n} listings recorded ${RECORDED} · <a href="/trust.html">every number sourced, or marked unverified</a></p>

<div class="callout warn"><p><strong>${s.lbMin}–${s.lbMax} lb (${s.kgMin}–${s.kgMax} kg), median ${s.lbMed} lb.</strong> ${esc(answer.slice(answer.indexOf("That is a")))}</p></div>

<h2>Why two ${h}cm dolls differ by ${s.spread} lb</h2>

<p>Height is the number every shop prints and it is the wrong one to plan
around. Across these ${s.n} listings at exactly ${h}&nbsp;cm, the heaviest is
${s.spreadPct}% heavier than the lightest. Build — cup size, hip volume, whether
the bust is solid or gel — decides both the mass and how much material the
factory uses, which is why it moves the price too${s.priceMin ? `: these same listings run ${usd(s.priceMin)} to ${usd(s.priceMax)}` : ""}.</p>

<p>This matters before you buy, not after. Weight is the most reported source
of first-buyer regret, and it is the specification shops are least likely to
print next to the photo.</p>

<h2>Every ${h}cm listing in the sample</h2>

<table>
  <thead><tr><th>Weight</th><th>Metric</th><th>Listed price</th><th>Listing</th></tr></thead>
  <tbody>
${rowsHtml}
  </tbody>
</table>

<p class="meta">Vendor-stated figures, not independently weighed. Recorded
${RECORDED} from live product pages at one vetted vendor; prices as displayed
that day and they drift. <strong>${s.n} listings is a sample of one catalogue,
not a market survey</strong> — we say so because the alternative is the
unsourced "typical weight" figure this category runs on.
<a href="/data/">Download the full dataset</a> (JSON or CSV, CC BY 4.0) and
check this table yourself.</p>

<h2>What to do with the number</h2>

<ul>
  <li><strong>Plan storage before you order.</strong> A closet rod is not rated
  for ${s.lbMed} lb of dead weight. The <a href="/cost-calculator.html">True Cost
  Calculator</a> puts a real storage figure into your first-year total.</li>
  <li><strong>Compare against a torso</strong> if this is a first purchase —
  <a href="/guides/torso-vs-full-size.html">the honest trade-off</a> is mostly
  about weight.</li>
  <li><strong>See the full curve</strong> across every height we have recorded
  in <a href="/guides/height-weight.html">the weight chart</a>.</li>
  <li><strong>Before any money moves</strong>, check
  <a href="/payment-protection.html">what recourse survives</a> — that page
  carries no affiliate links at all.</li>
</ul>

</div>
</section>
</main>

${FOOT}
`;

  writeFileSync(`weight/${h}cm.html`, html);
  built.push({ h, ...s });
}

/* ---- hub ---- */
const hubRows = built
  .map((b) => `      <tr><th scope="row"><a href="/weight/${b.h}cm.html">${b.h}cm</a></th><td>${b.n}</td><td>${b.lbMin}–${b.lbMax} lb</td><td>${b.lbMed} lb</td><td>${b.spread} lb (${b.spreadPct}%)</td></tr>`)
  .join("\n");
const thinRows = tooThin
  .map((b) => `      <tr><th scope="row">${b.h}cm</th><td>${b.n}</td><td>${b.lbMin}–${b.lbMax} lb</td><td colspan="2"><em>No page: ${b.n} listings is not enough to state a range we would defend.</em></td></tr>`)
  .join("\n");

const hubTitle = "Sex Doll Weight by Height: Real Listings, Sample Sizes Stated";
const hubDesc = `What dolls actually weigh at each height, from ${rows.length} live listings recorded ${RECORDED}. Pages only where the sample supports one — the counts are printed either way.`;

writeFileSync(
  "weight/index.html",
  `${head(hubTitle, hubDesc, "/weight/")}
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "https://thedollscout.com/#org", name: "DollScout", url: "https://thedollscout.com/" },
    {
      "@type": "CollectionPage",
      name: hubTitle,
      description: hubDesc,
      url: "https://thedollscout.com/weight/",
      isBasedOn: "https://thedollscout.com/data/doll-specs.json",
      dateModified: RECORDED,
    },
  ],
}, null, 2)}
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="notice-bar">🛡️ <b>Evidence-standard buyer's guide.</b> Every number sourced — or marked unverified. We sell nothing ourselves. 18+ only.</div>
${NAV}

<main id="main" tabindex="-1">
<section>
<div class="wrap prose">

<h1>What dolls actually weigh, by height</h1>

<p class="byline">${rows.length} listings recorded ${RECORDED} · <a href="/trust.html">every number sourced, or marked unverified</a></p>

<p class="lede">Shops routinely print the height and not the weight, so buyers
plan around the one number that does not tell them whether they can move the
thing.
These are measured from live listings, with the sample size shown next to every
range — including the heights where the sample is too small and we say so
instead of writing a page.</p>

<table>
  <thead><tr><th>Height</th><th>Listings</th><th>Weight range</th><th>Median</th><th>Spread at one height</th></tr></thead>
  <tbody>
${hubRows}
${thinRows}
  </tbody>
</table>

<p class="meta">A page exists only where we have ${MIN_SAMPLE} or more listings
at that height. <strong>The rest are shown with their real counts and no
page</strong> — generating one per height regardless is how a site ends up
publishing "typical weight" figures with nothing behind them, which is the
practice this site exists to argue against.
<a href="/data/">Download the dataset</a> (CC BY 4.0) ·
<a href="/guides/height-weight.html">the full weight chart and method</a>.</p>

</div>
</section>
</main>

${FOOT}
`
);

console.log(`weight/: ${built.length} page(s) generated — ${built.map((b) => b.h + "cm (n=" + b.n + ")").join(", ") || "none"}`);
if (tooThin.length) console.log(`Refused (n < ${MIN_SAMPLE}): ${tooThin.map((b) => b.h + "cm (n=" + b.n + ")").join(", ")}`);
console.log(`weight/index.html: hub listing all ${byHeight.size} heights, pages for ${built.length}`);
