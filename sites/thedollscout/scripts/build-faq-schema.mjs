/* Derive FAQPage structured data from what the page already says.

   Why generated rather than hand-written: structured data that disagrees with
   the visible page is the single most common way a site gets its markup
   ignored, and the more expensive failure mode is the one this project cares
   about — an assistant quoting an answer that the page does not actually
   contain, attributed to us, with no way for us to correct it. Deriving the
   markup from the rendered text makes that impossible by construction rather
   than by review.

   What this does NOT buy: FAQ rich results in Google search. Google restricted
   those to well-known authoritative government and health sites in 2023, and
   this site is neither. The reason to emit it anyway is the AI channel — Bing
   and the answer engines still read question/answer pairs, and a labelled Q&A
   block is the shape a passage gets lifted in. Do not re-add this to a plan as
   a rich-snippet play.

   Rules, all of them conservative:
     · only H2s that literally end in a question mark
     · only pages with at least two of them, so a single stray question does not
       turn a product page into a declared FAQ
     · the answer is the visible prose under that heading, verbatim and
       truncated at a sentence boundary — never a rewrite
     · pages that already declare FAQPage by hand are left alone

   Run: node scripts/build-faq-schema.mjs */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { canonicalPath } from "./canonical-url.mjs";

const SKIP_DIR = new Set(["node_modules", "dist", "scripts", "content", "functions", "legal", "img", "data"]);
const SKIP_FILE = new Set(["404.html", "ga-check.html"]);

const MARKER = "data-generated=\"faq-schema\"";
const MIN_QUESTIONS = 2;
const MIN_ANSWER_CHARS = 60;
const MAX_ANSWER_CHARS = 900;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIR.has(e) || e.startsWith(".")) continue;
    const full = dir === "." ? e : `${dir}/${e}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".html") && !SKIP_FILE.has(e)) out.push(full);
  }
  return out;
}

const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–", "&rarr;": "→",
  "&ldquo;": "“", "&rdquo;": "”", "&lsquo;": "‘", "&rsquo;": "’",
  "&hellip;": "…", "&times;": "×", "&deg;": "°", "&euro;": "€",
  "&pound;": "£", "&check;": "✓",
};

const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    /* A list item is a sentence to a reader. Without this, "TPE Silicone Both"
       comes out as one run-on string an assistant would quote as prose. */
    .replace(/<\/(li|p|h3|h4|tr|div|blockquote)>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\.(\s*\.)+/g, ".")
    .trim();

/* Cut at a sentence end so the answer never stops mid-clause — a truncated
   answer reads as a factual claim about something it was about to qualify. */
function truncate(s) {
  if (s.length <= MAX_ANSWER_CHARS) return s;
  const cut = s.slice(0, MAX_ANSWER_CHARS);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return (end > MIN_ANSWER_CHARS ? cut.slice(0, end + 1) : cut.trimEnd() + "…").trim();
}

let wrote = 0;
const skipped = [];

for (const file of walk(".")) {
  let html = readFileSync(file, "utf8");
  if (/name="robots"[^>]*noindex/i.test(html)) continue;

  /* Strip a previous run's block before measuring anything, so this script is
     idempotent and its own output can never be read back as hand-written. */
  const had = html.includes(MARKER);
  html = html.replace(
    new RegExp(`\\n?\\s*<script type="application/ld\\+json" ${MARKER}>[\\s\\S]*?</script>`, "g"),
    ""
  );

  if (/"@type":\s*"FAQPage"/.test(html)) {
    if (had) writeFileSync(file, html);
    skipped.push(`${canonicalPath(file)} — declares FAQPage by hand`);
    continue;
  }

  /* Everything from each h2 to the next one. */
  const sections = [];
  const parts = html.split(/<h2\b/i).slice(1);
  for (const part of parts) {
    const close = part.indexOf("</h2>");
    if (close === -1) continue;
    const headingHtml = part.slice(part.indexOf(">") + 1, close);
    const question = text(headingHtml);
    if (!question.endsWith("?")) continue;
    const bodyHtml = part.slice(close + "</h2>".length).split(/<footer\b|<\/main>/i)[0];
    const answer = truncate(text(bodyHtml));
    if (answer.length < MIN_ANSWER_CHARS) continue;
    sections.push({ question, answer });
  }

  if (sections.length < MIN_QUESTIONS) {
    if (had) { writeFileSync(file, html); wrote++; }
    continue;
  }

  /* Reuse the page's own dates rather than stamping today's — a dateModified
     that moves every time a generator runs is a freshness signal that means
     nothing, and crawlers discount exactly that pattern. */
  const modified = (html.match(/"dateModified":\s*"([\d-]+)"/) || [])[1];
  const published = (html.match(/"datePublished":\s*"([\d-]+)"/) || [])[1];
  const url = `https://thedollscout.com${canonicalPath(file)}`;

  const payload = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url,
    ...(published ? { datePublished: published } : {}),
    ...(modified ? { dateModified: modified } : {}),
    publisher: { "@id": "https://thedollscout.com/#org" },
    inLanguage: "en",
    mainEntity: sections.map((s) => ({
      "@type": "Question",
      name: s.question,
      acceptedAnswer: { "@type": "Answer", text: s.answer },
    })),
  };

  const block =
    `\n  <script type="application/ld+json" ${MARKER}>\n` +
    JSON.stringify(payload, null, 2).split("\n").map((l) => "  " + l).join("\n") +
    `\n  </script>`;

  const head = html.lastIndexOf("</head>");
  if (head === -1) { skipped.push(`${canonicalPath(file)} — no </head>`); continue; }
  html = html.slice(0, head) + block + "\n" + html.slice(head);
  writeFileSync(file, html);
  wrote++;
}

for (const s of skipped) console.log(`  · ${s}`);
console.log(`${wrote} page(s) now carry FAQPage markup derived from their own visible headings.`);
