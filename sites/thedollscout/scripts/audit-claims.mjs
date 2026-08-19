/* Finds quantitative claims on published pages that carry no source.

   Why this exists, from research rather than taste. Every search in this
   category returns the same two things: vendor blogs, and SEO spam on
   hijacked .edu domains. Both circulate numbers with no origin — "a 2026
   sexual wellness consumer survey found 58% store their toys incorrectly",
   named survey absent. A buyer cannot tell who checked anything, which is the
   gap this site exists in.

   That makes "every number sourced — or marked unverified" the only asset we
   have, and it makes an unsourced number of our own worse than a competitor's.
   Theirs is expected. Ours is the promise failing on the page that makes it.

   And we had one, on the flagship trust page: the Scam-Check opened with
   "built from thousands of complaint threads", a quantity nobody counted.

   A claim passes if, within the same block, it is one of:
     - linked to an external source
     - drawn from our own published dataset (linked)
     - explicitly marked as an estimate, or as unverified
     - a figure the reader supplies or the page computes for them

   Run: node scripts/audit-claims.mjs   (exits non-zero on unsourced claims) */

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKIP_DIRS = new Set([".git", ".github", ".claude", ".agents", "node_modules", "dist", "scripts", "content", "img", "css", "js", "legal"]);

/* Quantities that assert something about the world. Deliberately narrow: a
   price we recorded, a date, a version number and a CSS value are not claims,
   and a checker that flags everything gets muted rather than obeyed. */
const CLAIM_PATTERNS = [
  { name: "percentage", re: /\b\d{1,3}(?:\.\d+)?\s*(?:%|per\s*cent|percent)\b/gi },
  { name: "vague magnitude", re: /\b(?:thousands|hundreds|millions|dozens|countless|many thousands)\s+of\b/gi },
  { name: "universal quantifier", re: /\b(?:most|nearly all|the majority of|almost every|virtually all)\s+(?:buyers|owners|shops|vendors|dolls|people|listings|sellers|guides|sites|reviews)\b/gi },
  { name: "survey-shaped claim", re: /\b(?:studies? show|research shows|surveys? found|it is estimated|experts? (?:say|agree))\b/gi },
];

/* Anything that makes a nearby number accountable. */
const SOURCED = [
  /<a[^>]+href="https?:\/\/(?!thedollscout\.com)/i,      // external citation
  /<a[^>]+href="\/data\//i,                              // our published dataset
  /\bunverified\b/i,
  /(?:could not|cannot|can't)\s+(?:confirm|verify)/i,
  /\bwe (?:did not|have not|do not|don't)\s+(?:verify|confirm)/i,
  /\breported for completeness\b/i,
  /\b(?:editorial )?estimates?\b/i,
  /\bnot (?:a )?vendor quotes?\b/i,
  /\brecorded 20\d\d-\d\d-\d\d\b/i,
  /\bconservative\b/i,
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".html") && name !== "404.html") out.push(full);
  }
  return out;
}

/* Blocks, not whole pages: a citation in the footer does not source a
   sentence 40 paragraphs above it, and judging per page would pass almost
   everything. */
const blocksOf = (html) => {
  /* Meta descriptions and social titles are published text — they are what a
     search result shows — and starting at <main> meant they were never
     audited. Found by this checker flagging a claim in a generated page's
     body that also sat, unflagged, in its own description. */
  const meta = [...html.matchAll(/<meta[^>]+(?:name|property)="(?:description|og:title|og:description|twitter:title|twitter:description)"[^>]*content="([^"]*)"/gi)]
    .map((m) => m[1]);
  const main = html.slice(Math.max(0, html.indexOf("<main")));
  return meta.concat(main
    .split(/<\/(?:p|li|td|h2|h3|div|section|figcaption|caption)>/i))
    .map((b) => b.trim())
    .filter(Boolean);
};

const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/* The patterns are the whole check, so a broken pattern reads as a clean
   site. After the first pass fixed every hit, "0 flagged" and "patterns no
   longer match anything" became indistinguishable — so the checker proves it
   still works before reporting that nothing is wrong. */
const CANARIES = [
  "a 2026 survey found 58% of owners store them incorrectly",
  "built from thousands of complaint threads",
  "most buyers do this backwards",
  "studies show that TPE degrades faster",
];
const unmatched = CANARIES.filter((c) => !CLAIM_PATTERNS.some(({ re }) => { re.lastIndex = 0; return re.test(c); }));
if (unmatched.length) {
  console.error("This checker is broken — it no longer recognises claims it is supposed to catch:");
  for (const c of unmatched) console.error(`  missed: "${c}"`);
  process.exit(1);
}

let flagged = 0;
let checked = 0;

for (const file of walk(".")) {
  const html = readFileSync(file, "utf8");
  /* JSON-LD repeats page prose; auditing it separately double-reports the
     same sentence. */
  const withoutLd = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  for (const block of blocksOf(withoutLd)) {
    for (const { name, re } of CLAIM_PATTERNS) {
      re.lastIndex = 0;
      const hits = [...block.matchAll(re)];
      if (!hits.length) continue;
      checked += hits.length;
      if (SOURCED.some((s) => s.test(block))) continue;
      flagged++;
      const text = strip(block);
      console.log(`\nUNSOURCED  ${file}  [${name}]`);
      console.log(`  claim : ${hits.map((h) => `"${h[0]}"`).join(", ")}`);
      console.log(`  block : ${text.slice(0, 190)}${text.length > 190 ? "…" : ""}`);
    }
  }
}

console.log(
  flagged
    ? `\n${flagged} unsourced quantitative claim(s) across ${checked} checked.\n` +
      `Each one needs a source, an "unverified" marking, or removal. A number we cannot\n` +
      `stand behind is worse here than on any other site, because sourcing is the offer.`
    : `\nAll ${checked} quantitative claims carry a source, a dataset link, or an explicit marking.`
);
process.exit(flagged ? 1 : 0);
