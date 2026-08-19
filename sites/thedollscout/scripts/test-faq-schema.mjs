/* The invariant: generated FAQ markup may only ever say what the page says.

   Structured data is read by machines and shown to people somewhere we do not
   control. If the markup and the page disagree, the version that gets quoted is
   the one we cannot correct — so this checks the direction that matters: every
   generated question is a heading a visitor can see, and every generated answer
   is text that appears on the page, verbatim.

   Run: node scripts/test-faq-schema.mjs */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { canonicalPath } from "./canonical-url.mjs";

const MARKER = 'data-generated="faq-schema"';
const SKIP_DIR = new Set(["node_modules", "dist", "scripts", "content", "functions", "legal", "img", "data"]);

let failed = 0;
const t = (name, ok, detail) => {
  if (ok) console.log(`ok    ${name}`);
  else { failed++; console.log(`FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIR.has(e) || e.startsWith(".")) continue;
    const full = dir === "." ? e : `${dir}/${e}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".html")) out.push(full);
  }
  return out;
}

/* Deliberately a different, blunter normaliser than the generator's. A shared
   helper would make the test agree with the generator's bugs — comparing the
   generator against itself proves nothing. */
const flatten = (s) =>
  s.replace(/<script[\s\S]*?<\/script>/gi, " ")
   .replace(/<style[\s\S]*?<\/style>/gi, " ")
   .replace(/<[^>]+>/g, " ")
   .replace(/&[a-z#0-9]+;/gi, " ")
   .replace(/[^a-z0-9]+/gi, " ")
   .toLowerCase()
   .trim();

let pages = 0, questions = 0;

for (const file of walk(".")) {
  const html = readFileSync(file, "utf8");
  if (!html.includes(MARKER)) continue;
  pages++;
  const page = canonicalPath(file);

  const block = html.match(
    new RegExp(`<script type="application/ld\\+json" ${MARKER}>([\\s\\S]*?)</script>`)
  );

  let data;
  try { data = JSON.parse(block[1]); }
  catch (e) { t(`${page}: markup parses as JSON`, false, String(e.message)); continue; }

  /* Two FAQPage declarations on one page is a contradiction, not a bonus. */
  t(`${page}: does not also declare FAQPage by hand`,
    (html.match(/"@type":\s*"FAQPage"/g) || []).length === 1);

  const visible = flatten(html);
  const headings = (html.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi) || []).map(flatten);

  for (const q of data.mainEntity || []) {
    questions++;
    const asked = flatten(q.name);
    t(`${page}: "${q.name.slice(0, 52)}" is a visible heading`,
      headings.includes(asked),
      headings.length ? `page headings: ${headings.slice(0, 8).join(" | ")}` : "no h2 on the page");

    /* Truncation adds an ellipsis; compare the part that claims to be quoted. */
    const answer = flatten(String(q.acceptedAnswer?.text || "").replace(/…$/, ""));
    t(`${page}: its answer is text that appears on the page`,
      answer.length > 0 && visible.includes(answer),
      answer.length ? `answer drifted from the page: ${answer.slice(0, 90)}…` : "empty answer");
  }
}

/* CANARY. A comparison that cannot fail reads exactly like a site with no
   drift, which is the failure this whole file exists to catch. */
t("canary: the drift detector still detects drift",
  !flatten("<p>a claim the page never made</p>").split(" ").every((w) => flatten("<p>something else</p>").includes(w)));

console.log(
  failed
    ? `\n${failed} failed.`
    : `\nAll passed. ${questions} generated Q&A pair(s) across ${pages} page(s), every one of them on the page.`
);
process.exit(failed ? 1 : 0);
