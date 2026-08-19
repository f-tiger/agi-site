/* Is this site EXTRACTABLE by an answer engine, page by page?

   The distinction that matters: traditional SEO gets a page ranked, GEO gets a
   passage CITED. An assistant does not cite a page, it lifts a self-contained
   passage out of one. A page can be accurate, sourced and well written and
   still be unciteable, because the answer is spread across four paragraphs and
   only makes sense with the surrounding prose.

   Retrieval is not the blocker for the AI channel the way indexing is for
   search: robots.txt has welcomed these crawlers from day one and GPTBot is
   verifiably reading the site. What is left is whether what it retrieves is in
   a shape it can quote.

   That sentence used to say "GPTBot, ClaudeBot and PerplexityBot are all
   fetching this site daily", which the Cloudflare crawl log does not support.
   Over 2026-08-12→15, Cloudflare verified 24 of GPTBot's 54 requests as a real
   AI Crawler, and verified NONE of the traffic calling itself ClaudeBot or
   PerplexityBot — 26 requests each, 0% passing the source-IP check the
   operators publish. A user-agent is self-declared. Do not restate the
   three-crawler version without re-reading scripts/cf-crawl-log.mjs output.

   Checked per page, against the Princeton GEO findings (KDD 2024) on what
   actually moves citation rate — cited sources +40%, statistics +37%,
   quotations +30% — plus the structural basics:

     · a direct answer near the top, short enough to lift whole
     · headings phrased as the questions people actually ask
     · a dated freshness signal
     · sourced statistics rather than adjectives
     · FAQ / HowTo / Dataset structured data
     · a comparison table where the page is a comparison

   WHAT ACTUALLY GETS CITED, from two Bing AI Performance panels — the same
   data this project has none of, because the site has never been verified in
   Bing Webmaster Tools.

   agiscorecard.com: /what-is-agi 91, /how-close-is-agi 76,
   /when-will-agi-arrive 37, /who-is-building-agi 13. Root-level, extensionless.

   getecoback.com: /guide/klimaanlage-reinigen.html 109,
   /guide/klimaanlage-40-qm.html 70, /guide/klimaanlage-balkonkraftwerk.html 54,
   /guide/mobile-klimaanlage-tropft-wasser.html 16,
   /guide/wie-viel-btu-brauche-ich.html 15.

   The second one CORRECTS the reading of the first. Those URLs end in .html and
   sit in a subdirectory, and the top one takes 109 citations anyway. URL shape
   is not the driver; it was correlation. Do not migrate URLs for this.

   What the two share is the SUBJECT of each page:

     · maintenance — getecoback's number one is "clean the air conditioner"
     · one parameter per page — 40 qm and 25 qm are separate pages, exactly the
       shape /weight/150cm and /weight/160cm already have
     · compatibility — AC with a balcony solar plant, with a tilt-and-turn
       window, in a camper van
     · a symptom — "portable AC drips water"
     · an operating decision — "run the AC at night"

   Not one of the cited pages is a buying guide. They solve a problem the reader
   already has, or answer one specific parameterised question. So: a new page
   answers ONE narrow question, and its title, h1 and section headings ask that
   question literally. The existing pages closest to this pattern — care and
   cleaning, the per-height weight pages — are worth more than another
   product-selection page.

   Reports rather than gates. A guide page legitimately has no comparison
   table, and failing a deploy over that would be noise.

   Run: node scripts/geo-audit.mjs */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { canonicalPath } from "./canonical-url.mjs";

const SKIP = new Set(["node_modules", "dist", "scripts", "content", "functions", "legal"]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e) || e.startsWith(".")) continue;
    const full = dir === "." ? e : `${dir}/${e}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".html") && full !== "404.html" && full !== "ga-check.html") out.push(full);
  }
  return out;
}

const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* The single most liftable thing on a page: the first substantial paragraph
   after the h1. 40-60 words is the documented sweet spot for snippet
   extraction — long enough to be a real answer, short enough to quote whole. */
function leadAnswer(html) {
  const afterH1 = html.split(/<\/h1>/i)[1] || "";
  /* Skip breadcrumbs, bylines and disclaimers. They sit between the h1 and the
     real opening paragraph, and counting one as the lead answer measures the
     wrong string — which it did on all twelve import pages until the answer
     block was moved above the not-legal-advice line. */
  const paras = [...afterH1.matchAll(/<p([^>]*)>([\s\S]*?)<\/p>/gi)]
    .filter((m) => !/class="[^"]*\b(meta|breadcrumb|byline)\b/i.test(m[1]))
    .map((m) => text(m[2]))
    .filter((t) => t.length > 40);
  return paras[0] || "";
}

const rows = [];
for (const file of walk(".")) {
  const html = readFileSync(file, "utf8");
  if (/name="robots"[^>]*noindex/i.test(html)) continue;
  const body = text(html);
  const lead = leadAnswer(html);
  const words = lead ? lead.split(/\s+/).length : 0;
  const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => text(m[1]));

  rows.push({
    page: canonicalPath(file),
    /* A lead answer of the right length, present at all. */
    lead: words,
    /* Headings phrased as questions get matched to queries far more often
       than noun-phrase headings. */
    /* A QUESTION, not a heading that opens with an interrogative word. This
       counted "What customs actually does" and "How we sourced this" — both
       statements — and reported 83% of pages as question-phrased when the real
       figure is 10%. An inflated metric is worse than no metric: it retires a
       problem that is still there. A question ends in a question mark. */
    questionHeadings: headings.filter((h) => h.endsWith("?")).length,
    headings: headings.length,
    /* Princeton's top two levers. */
    sourceLinks: (html.match(/rel="[^"]*noopener[^"]*"[^>]*target="_blank"|<a[^>]+href="https?:\/\/(?!thedollscout)/gi) || []).length,
    stats: (body.match(/\b\d[\d,.]*\s*(?:%|lb|kg|cm|listings?|rows?|days?)\b|\$\d/gi) || []).length,
    dated: /Last updated|Recorded \d|datePublished|dateModified/i.test(html),
    faq: /"@type":\s*"FAQPage"/.test(html),
    howto: /"@type":\s*"HowTo"/.test(html),
    dataset: /"@type":\s*"Dataset"/.test(html),
    table: /<table[\s>]/i.test(html),
    isComparison: /\bvs\b|versus|compare/i.test(file) || /\bvs\.?\b/i.test((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ""),
  });
}

const pct = (n) => `${Math.round((n / rows.length) * 100)}%`;
const count = (fn) => rows.filter(fn).length;

console.log(`GEO extractability across ${rows.length} indexable pages\n`);

const checks = [
  ["Lead answer present at all", (r) => r.lead > 0],
  ["Lead answer liftable whole (25-80 words)", (r) => r.lead >= 25 && r.lead <= 80],
  ["At least one question-phrased H2", (r) => r.questionHeadings > 0],
  ["Carries a visible date", (r) => r.dated],
  ["Cites an external source", (r) => r.sourceLinks > 0],
  ["Contains numbers, not just adjectives", (r) => r.stats >= 3],
  ["FAQPage / HowTo / Dataset schema", (r) => r.faq || r.howto || r.dataset],
  ["Comparison pages have a table", (r) => !r.isComparison || r.table],
];

console.log("| Check | Pages | Share |");
console.log("|---|---|---|");
for (const [label, fn] of checks) console.log(`| ${label} | ${count(fn)} / ${rows.length} | ${pct(count(fn))} |`);

/* Ranked worst-first, because the point is what to fix next. */
const weakest = rows
  .map((r) => ({ r, misses: checks.filter(([, fn]) => !fn(r)).map(([l]) => l) }))
  .filter((x) => x.misses.length)
  .sort((a, b) => b.misses.length - a.misses.length);

if (weakest.length) {
  console.log(`\n--- pages by how much they are leaving on the table ---`);
  for (const { r, misses } of weakest.slice(0, 14)) {
    console.log(`  ${r.page}`);
    console.log(`      lead ${r.lead}w · ${r.questionHeadings}/${r.headings} question headings · ${r.stats} figures · ${r.sourceLinks} external cites`);
    console.log(`      missing: ${misses.join("; ")}`);
  }
}

/* The closing line reports whichever check is currently WORST, computed. It
   used to hard-code "no liftable passage is the biggest gap" and, underneath
   that, "GPTBot, ClaudeBot and PerplexityBot fetch this site daily" — the exact
   sentence the header of this file says not to restate, because Cloudflare
   verified none of the ClaudeBot or PerplexityBot traffic. A stale summary is
   worse than none: it kept naming a gap that had already been closed while the
   real worst check drifted somewhere else. */
const ranked = checks
  .map(([label, fn]) => ({ label, missing: rows.length - count(fn) }))
  .filter((c) => c.missing > 0)
  .sort((a, b) => b.missing - a.missing);

if (!ranked.length) {
  console.log(`\nEvery check passes on every page. Re-read the checks before believing that.`);
} else {
  const worst = ranked[0];
  console.log(
    `\nBiggest remaining gap: ${worst.label.toLowerCase()} — ${worst.missing} of ${rows.length} pages.\n` +
    `Then: ${ranked.slice(1, 3).map((c) => `${c.label.toLowerCase()} (${c.missing})`).join(", ")}.\n\n` +
    `Retrieval is not the blocker. robots.txt has welcomed the AI crawlers from day one and\n` +
    `Cloudflare verifies GPTBot against its published ranges. What is left is whether what\n` +
    `they retrieve is in a shape that can be quoted. Do not restate a per-crawler claim from\n` +
    `here — re-read scripts/cf-crawl-log.mjs output for that.`
  );
}
