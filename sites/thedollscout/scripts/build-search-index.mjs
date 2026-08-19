/* Builds the client-side search index from the pages that actually exist.

   Why this became necessary rather than nice: pages are now generated. A new
   height crossing the sample threshold publishes itself, and a category that
   qualifies publishes a whole family. A hand-maintained nav cannot track that,
   and 39 pages is already past the point where a menu is a way of finding
   things rather than a way of listing them.

   Two kinds of entry, and the second is the point:

     PAGE   — title, description and headings, so "chargeback" finds the
              recourse checker.
     ANSWER — rows from the dataset, so typing "150cm" or "WM Doll" returns
              the measured figure itself, not a page that mentions it. That is
              the only asset here nobody else has, and burying it behind a
              document search would waste it.

   Generated, never hand-written, so anything the growth pipeline publishes is
   searchable in the same run that publishes it. */

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { canonicalPath } from "./canonical-url.mjs";

const SKIP_DIRS = new Set([".git", ".github", ".claude", ".agents", "node_modules", "dist", "scripts", "content", "img", "css", "js", "legal"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".html") && name !== "404.html") out.push(full);
  }
  return out;
}

const attr = (html, re) => (html.match(re) || [])[1] || "";
const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

const entries = [];

for (const file of walk(".")) {
  const html = readFileSync(file, "utf8");
  if (/<meta\s+name="robots"[^>]*noindex/i.test(html)) continue;

  const rel = "/" + file.replace(/^\.\//, "");
  /* Cloudflare Pages 308s the .html form to the extensionless path, so
     publishing the .html form here would fill this file with redirects. */
  const url = canonicalPath(rel);
  const title = text(attr(html, /<title>([^<]*)<\/title>/i));
  const desc = attr(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  /* Headings carry the questions a page answers, which is usually closer to
     what someone types than the title is. */
  const heads = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)].map((m) => text(m[1])).slice(0, 8);

  entries.push({
    /* /mcp is API documentation for developers and agents, not an answer a
       visitor is looking for. It describes all six tools, so it is dense in
       every term the tool PAGES use — "chargeback", "section 75", "weight" —
       and it was tying with, and sometimes beating, the page that actually
       answers the question. Marked so scoring can rank it below real content
       rather than by whichever happened to be earlier in the index. */
    kind: canonicalPath(file) === "/mcp" ? "docs" : "page",
    url,
    title,
    desc: desc.slice(0, 180),
    terms: [title, desc, ...heads].join(" ").toLowerCase().slice(0, 600),
  });
}

/* ---- answers from the dataset ---- */
if (existsSync("data/doll-specs.json")) {
  const data = JSON.parse(readFileSync("data/doll-specs.json", "utf8"));
  const full = data.rows.filter((r) => !r.isPartialBody && r.weightLb && r.heightCm);
  const byHeight = new Map();
  for (const r of full) {
    if (!byHeight.has(r.heightCm)) byHeight.set(r.heightCm, []);
    byHeight.get(r.heightCm).push(r);
  }

  for (const [h, g] of [...byHeight.entries()].sort((a, b) => a[0] - b[0])) {
    const w = g.map((r) => r.weightLb).sort((a, b) => a - b);
    const hasPage = existsSync(`weight/${h}cm.html`);
    entries.push({
      kind: "answer",
      /* Only link to a page that exists. A height below the sample threshold
         still answers the question — it just answers it here, with its count
         attached, instead of pretending to a page it did not earn. */
      url: hasPage ? `/weight/${h}cm.html` : "/weight/",
      title: `${h}cm doll weight`,
      desc: `${w[0]}–${w[w.length - 1]} lb across ${g.length} recorded listing${g.length === 1 ? "" : "s"}${hasPage ? "" : " — sample too small for its own page"}`,
      terms: `${h}cm ${h} cm weight how much does a ${h}cm doll weigh heavy lift ${w[0]} ${w[w.length - 1]} lb kg`,
    });
  }
}

writeFileSync("search-index.json", JSON.stringify({ built: data0(), entries }, null, 0) + "\n");
function data0() {
  return existsSync("data/doll-specs.json")
    ? JSON.parse(readFileSync("data/doll-specs.json", "utf8")).recorded
    : null;
}

const bytes = statSync("search-index.json").size;
console.log(`search-index.json: ${entries.length} entries (${entries.filter((e) => e.kind === "answer").length} data answers), ${(bytes / 1024).toFixed(1)} KB`);
/* The index ships to every visitor who opens search. Past a few hundred KB
   that stops being a feature and becomes a tax on mobile data. */
if (bytes > 250 * 1024) {
  console.error(`search-index.json is ${(bytes / 1024).toFixed(0)} KB — too large to ship to a phone. Trim the terms field.`);
  process.exit(1);
}
