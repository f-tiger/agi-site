/* Generates page families for every category that qualifies — and only those.

   The height family has its own generator (build-weight-pages.mjs) because it
   carries copy written for that specific question. This handles every OTHER
   dimension, so a category that qualifies next month gets pages without anyone
   writing a generator for it. That is the point: the bottleneck was a human
   deciding, and the decision is now a test.

   Qualification lives in categories.mjs — sample, variance, distinctness. This
   file only renders what already passed, and prints the failing test for what
   did not, because "why this category does not exist yet" is the half a person
   actually needs.

   A dimension that has been live and STOPS qualifying is reported, never
   silently deleted: published URLs are promises, and quietly removing them
   trades one problem for a worse one. */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { DIMENSIONS, MIN_SAMPLE, qualify, groupBy, median } from "./categories.mjs";

const DATA = JSON.parse(readFileSync("data/doll-specs.json", "utf8"));
const RECORDED = DATA.recorded;
const rows = DATA.rows.filter((r) => !r.isPartialBody);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (v, unit) => (unit === "USD" ? "$" + Number(v).toLocaleString("en-US") : `${v} ${unit}`);

const NAV = `<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/">Doll<b>Scout</b></a>
    <button class="nav-toggle" aria-label="Menu">☰</button>
    <nav class="nav">
      <a href="/quiz.html">60-Sec Finder</a>
      <a href="/scam-check.html">Scam-Check</a>
      <a href="/cost-calculator.html">True Cost</a>
      <a href="/after-you-order.html">After You Order</a>
      <a href="/weight/">Weight</a>
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

const live = DIMENSIONS.filter((d) => d.live);
/* Height has a bespoke generator; this file must not also write those pages
   or the two would fight over the same files every run. */
const HANDLED_ELSEWHERE = new Set(["height"]);

let generated = 0;
const report = [];

for (const dim of DIMENSIONS) {
  if (HANDLED_ELSEWHERE.has(dim.id)) {
    report.push({ id: dim.id, state: "bespoke generator", detail: "scripts/build-weight-pages.mjs" });
    continue;
  }

  const q = qualify(rows, dim, live);
  const alreadyPublished = existsSync(dim.dir) && readdirSync(dim.dir).some((f) => f.endsWith(".html"));

  if (!q.ok) {
    report.push({
      id: dim.id,
      state: alreadyPublished ? "PUBLISHED BUT NO LONGER QUALIFIES" : "not yet",
      reasons: q.reasons,
      published: alreadyPublished,
    });
    continue;
  }

  mkdirSync(dim.dir, { recursive: true });
  const built = [];

  for (const [value, group] of q.values) {
    const metrics = group.map(dim.metric).filter((v) => typeof v === "number").sort((a, b) => a - b);
    const s = {
      n: group.length,
      lo: metrics[0],
      hi: metrics[metrics.length - 1],
      med: median(metrics),
      spread: metrics[metrics.length - 1] - metrics[0],
    };
    const canonical = `/${dim.dir}/${dim.slug(value)}.html`;
    const title = dim.pageTitle(value, s);
    const desc = `${s.n} live listings recorded ${RECORDED}: ${dim.metricName} from ${fmt(s.lo, dim.unit)} to ${fmt(s.hi, dim.unit)}, median ${fmt(s.med, dim.unit)}. Measured from listings, with the sample size stated.`;

    /* Written once, reused verbatim in the schema, so a reader and an
       extractor cannot be shown different things. */
    const answer =
      `Across ${s.n} live listings for ${dim.label(value)} recorded on ${RECORDED}, ` +
      `${dim.metricName} ranged from ${fmt(s.lo, dim.unit)} to ${fmt(s.hi, dim.unit)}, median ${fmt(s.med, dim.unit)}. ` +
      `It is a sample of what we could reach on one date, not a market survey.`;

    const tableRows = group
      .slice()
      .sort((a, b) => (dim.metric(a) ?? 0) - (dim.metric(b) ?? 0))
      .map((r) => `      <tr><td>${r.heightCm ? r.heightCm + " cm" : "—"}</td><td>${r.weightLb ? r.weightLb + " lb" : "—"}</td><td>${r.priceUsd ? "$" + r.priceUsd.toLocaleString("en-US") : "—"}</td><td>${esc(r.title.slice(0, 60))}</td></tr>`)
      .join("\n");

    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", "@id": "https://thedollscout.com/#org", name: "DollScout", url: "https://thedollscout.com/" },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://thedollscout.com/" },
            { "@type": "ListItem", position: 2, name: dim.hubHeading, item: `https://thedollscout.com/${dim.dir}/` },
            { "@type": "ListItem", position: 3, name: dim.label(value), item: `https://thedollscout.com${canonical}` },
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
          mainEntity: [{ "@type": "Question", name: dim.question(value), acceptedAnswer: { "@type": "Answer", text: answer } }],
        },
      ],
    };

    writeFileSync(
      `${dim.dir}/${dim.slug(value)}.html`,
      `${head(title, desc, canonical)}
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

<p class="breadcrumb"><a href="/${dim.dir}/">${esc(dim.hubHeading)}</a> / ${esc(dim.label(value))}</p>

<h1>${esc(dim.question(value))}</h1>

<p class="byline">${s.n} listings recorded ${RECORDED} · <a href="/trust.html">every number sourced, or marked unverified</a></p>

<div class="callout warn"><p><strong>${fmt(s.lo, dim.unit)} – ${fmt(s.hi, dim.unit)}, median ${fmt(s.med, dim.unit)}.</strong> ${esc(answer)}</p></div>

<p>${esc(dim.why)} The spread across these ${s.n} listings is
${fmt(s.spread, dim.unit)} — which is the part a single "typical" figure hides,
and the reason we publish the rows instead of a summary.</p>

<h2>Every listing in the sample</h2>

<table>
  <thead><tr><th>Height</th><th>Weight</th><th>Listed price</th><th>Listing</th></tr></thead>
  <tbody>
${tableRows}
  </tbody>
</table>

<p class="meta">Vendor-stated figures, not independently weighed. Recorded
${RECORDED} from live product pages; prices as displayed that day and they
drift. <strong>${s.n} listings is a sample, not a market survey.</strong>
<a href="/data/">Download the full dataset</a> (JSON or CSV, CC BY 4.0) and
check this table yourself.</p>

<p><a href="/${dim.dir}/">See every ${esc(dim.id)} we have enough data for →</a></p>

</div>
</section>
</main>

${FOOT}
`
    );
    built.push({ value, ...s });
    generated++;
  }

  const hubRows = built
    .map((b) => `      <tr><th scope="row"><a href="/${dim.dir}/${dim.slug(b.value)}.html">${esc(dim.label(b.value))}</a></th><td>${b.n}</td><td>${fmt(b.lo, dim.unit)} – ${fmt(b.hi, dim.unit)}</td><td>${fmt(b.med, dim.unit)}</td></tr>`)
    .join("\n");

  writeFileSync(
    `${dim.dir}/index.html`,
    `${head(dim.hubTitle, `${dim.metricName} by ${dim.id} from ${rows.length} live listings recorded ${RECORDED}. Pages only where the sample supports one.`, `/${dim.dir}/`)}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="notice-bar">🛡️ <b>Evidence-standard buyer's guide.</b> Every number sourced — or marked unverified. We sell nothing ourselves. 18+ only.</div>
${NAV}

<main id="main" tabindex="-1">
<section>
<div class="wrap prose">

<h1>${esc(dim.hubHeading)}</h1>

<p class="byline">Recorded ${RECORDED} · <a href="/trust.html">every number sourced, or marked unverified</a></p>

<p class="lede">${esc(dim.why)} These are measured from live listings, with the
sample size next to every range.</p>

<table>
  <thead><tr><th>${esc(dim.id)}</th><th>Listings</th><th>${esc(dim.metricName)} range</th><th>Median</th></tr></thead>
  <tbody>
${hubRows}
  </tbody>
</table>

<p class="meta">A page exists only where we have ${MIN_SAMPLE} or more listings.
Values below that are not shown as pages, because a page per value regardless
of sample is a template rather than a finding.
<a href="/data/">Download the dataset</a> (CC BY 4.0).</p>

</div>
</section>
</main>

${FOOT}
`
  );

  report.push({ id: dim.id, state: "QUALIFIED — pages generated", detail: `${built.length} page(s) in /${dim.dir}/` });
}

console.log("=== category qualification ===");
let blockedPublished = 0;
for (const r of report) {
  console.log(`  ${r.id.padEnd(9)} ${r.state}${r.detail ? ` — ${r.detail}` : ""}`);
  for (const why of r.reasons || []) console.log(`      · ${why}`);
  if (r.published && r.state.startsWith("PUBLISHED")) blockedPublished++;
}
console.log(`\n${generated} page(s) generated by the generic builder.`);

/* A live category that stops qualifying is a content problem needing a human,
   not something to fix by deleting URLs. */
if (blockedPublished) {
  console.error(
    `\n${blockedPublished} published categor(y/ies) no longer qualify. Their pages were NOT deleted — ` +
    `published URLs are promises. Decide whether to refresh the data or retire them deliberately.`
  );
  process.exit(1);
}
