#!/usr/bin/env node
/* Builds llms-full.txt — the whole site's readable text in one file, the
   llms.txt convention's "full" companion. AI engines that fetch one URL to
   understand a site get every page's actual content, not just the index.

   Runs in CI before assemble-dist, writing llms-full.txt into the site root
   so rsync publishes it.

   HARD RULE (2026-08-30, learned at the cost of an 8-day deploy freeze on
   this exact site): a generator on the deploy path must NEVER be able to
   fail the deploy. Every failure here degrades the output — a page that
   won't parse is listed as unavailable — and the process still exits 0.
   If this file is missing entirely the site still works; a stale or partial
   llms-full.txt is strictly better than no deploy. */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://thedollscout.com";

/* Page list is explicit, not a glob: legal boilerplate and any stray file a
   future round leaves behind should not leak in by accident. Order = the
   reading order we'd hand a person. */
const PAGES = [
  ["index.html", "/"],
  ["start.html", "/start"],
  ["rarity.html", "/rarity"],
  ["how-blind-boxes-work.html", "/how-blind-boxes-work"],
  ["psychology.html", "/psychology"],
  ["fake-check.html", "/fake-check"],
  ["where-to-buy.html", "/where-to-buy"],
  ["glossary.html", "/glossary"],
  ["data/index.html", "/data/"],
  ["checker.html", "/checker"],
  ["finder.html", "/finder"],
  ["lookup.html", "/lookup"],
  ["odds/index.html", "/odds/"],
  ["odds/one-box.html", "/odds/one-box"],
  ["odds/six-boxes.html", "/odds/six-boxes"],
  ["odds/twelve-boxes-full-case.html", "/odds/twelve-boxes-full-case"],
  ["odds/twenty-four-boxes.html", "/odds/twenty-four-boxes"],
  ["odds/seventy-two-boxes.html", "/odds/seventy-two-boxes"],
  ["de/index.html", "/de/"],
  ["de/start.html", "/de/start"],
  ["de/rarity.html", "/de/rarity"],
  ["de/how-blind-boxes-work.html", "/de/how-blind-boxes-work"],
  ["de/psychology.html", "/de/psychology"],
  ["de/fake-check.html", "/de/fake-check"],
  ["de/where-to-buy.html", "/de/where-to-buy"],
  ["de/glossary.html", "/de/glossary"],
  ["de/checker.html", "/de/checker"],
  ["de/finder.html", "/de/finder"],
  ["de/lookup.html", "/de/lookup"],
  ["zh/index.html", "/zh/"],
  ["th/index.html", "/th/"],
  ["de/odds/index.html", "/de/odds/"],
  ["de/odds/one-box.html", "/de/odds/one-box"],
  ["de/odds/six-boxes.html", "/de/odds/six-boxes"],
  ["de/odds/twelve-boxes-full-case.html", "/de/odds/twelve-boxes-full-case"],
  ["de/odds/twenty-four-boxes.html", "/de/odds/twenty-four-boxes"],
  ["de/odds/seventy-two-boxes.html", "/de/odds/seventy-two-boxes"],
];

function stripHiddenSubtrees(html) {
  /* Elements shipped with the `hidden` attribute are conditional UI states,
     not content. /checker holds three MUTUALLY EXCLUSIVE verdicts in the DOM
     at once ("red flags" / "inconclusive" / "no red flags found"); dumping all
     three into llms-full.txt produced a self-contradicting passage that an
     assistant could quote as our verdict. Nesting-aware on purpose — the
     verdict blocks live inside a hidden wrapper. */
  let out = html, guard = 0;
  const open = /<(div|p|span|section)\b[^>]*\bhidden\b[^>]*>/i;
  while (guard++ < 200) {
    const m = out.match(open);
    if (!m) break;
    const tag = m[1].toLowerCase();
    const start = m.index;
    let i = start + m[0].length, depth = 1;
    const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, "gi");
    re.lastIndex = i;
    let hit;
    while ((hit = re.exec(out))) {
      depth += hit[0][1] === "/" ? -1 : 1;
      if (depth === 0) { i = hit.index + hit[0].length; break; }
    }
    if (depth !== 0) i = out.length;
    out = out.slice(0, start) + " " + out.slice(i);
  }
  return out;
}

function textOf(html) {
  /* Cheap, tolerant extraction — no DOM library on purpose (zero deps on the
     deploy path). Good-enough text beats a dependency that can break it. */
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = stripHiddenSubtrees(s);
  /* Keep every citation verifiable. Until 2026-08-30 this stripped <a> tags
     like any other markup, so the site's whole "named, dated source" promise
     arrived in llms-full.txt as unlinked prose — an engine reading only this
     file could not check a single claim. Now each link keeps its URL inline. */
  s = s.replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, inner) => {
    const label = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!label) return " ";
    if (href.startsWith("#")) return label;
    /* hrefs still carry raw entities here (entity decoding happens later in
       the pipeline), so &amp;tag= would slip past a naive &tag= match. */
    const raw = href.replace(/&amp;/g, "&");
    let url = raw.startsWith("/") ? BASE + raw : raw;
    /* Same iron rule the MCP endpoint follows: our affiliate tracking never
       rides into a machine surface. The destination stays (the citation is
       the point); the tag comes off, so an assistant quoting this file cannot
       reproduce our Associates tag inside someone else's answer. */
    url = url.replace(/([?&])tag=[^&]*(&|$)/, (m, p1, p2) => (p2 === "&" ? p1 : "")).replace(/[?&]$/, "");
    return `${label} (${url})`;
  });
  /* Keep the document's shape: headings become markdown-ish markers, block
     ends become line breaks, table cells get separators. */
  s = s.replace(/<h1[^>]*>/gi, "\n\n# ").replace(/<h2[^>]*>/gi, "\n\n## ").replace(/<h3[^>]*>/gi, "\n\n### ");
  s = s.replace(/<\/(h1|h2|h3|p|li|tr|div|section|table|ul|ol|blockquote)>/gi, "\n");
  s = s.replace(/<(td|th)[^>]*>/gi, " | ");
  s = s.replace(/<li[^>]*>/gi, "- ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&ldquo;|&rdquo;|&bdquo;/g, '"').replace(/&mdash;/g, "—").replace(/&middot;/g, "·");
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function metaOf(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i");
  const m = html.match(re);
  return m ? m[1].replace(/&amp;/g, "&") : "";
}

function titleOf(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/&amp;/g, "&").trim() : "";
}

const today = new Date().toISOString().slice(0, 10);
const out = [];

/* Header facts are COMPUTED, never typed. The hand-written header claimed
   "3 read-only tools" and "EN then DE" long after the endpoint grew a fourth
   tool and the site grew ZH and TH — this file is the one artefact AI engines
   read whole, so a stale sentence here is a wrong fact republished on every
   deploy. Read them from the sources of truth instead. */
let toolNames = [], datasetFiles = [];
try {
  const disc = JSON.parse(await readFile(join(ROOT, ".well-known/mcp.json"), "utf8"));
  toolNames = disc.tools || [];
} catch (e) { /* header degrades, deploy continues */ }
try {
  datasetFiles = (await readdir(join(ROOT, "data")))
    .filter((f) => f.endsWith(".json")).sort();
} catch (e) { /* header degrades, deploy continues */ }
const langs = [...new Set(PAGES.map(([, p]) =>
  p.startsWith("/de/") ? "DE" : p.startsWith("/zh/") ? "ZH" : p.startsWith("/th/") ? "TH" : "EN"))];

out.push("# DollScout — full site text (llms-full.txt)");
out.push("");
out.push("> Rarity-first buyer's guide for Labubu / The Monsters collectibles");
out.push("> (created by Kasing Lung, produced under exclusive license by Pop Mart).");
out.push("> Independent — not affiliated with Pop Mart or Kasing Lung. Every claim");
out.push("> is sourced inline or explicitly marked unverified. Pop Mart's own");
out.push("> current guidance outranks this site where they disagree.");
out.push(">");
out.push(`> Plain-text rendering of every content page (${PAGES.length} pages, ${langs.join(" / ")}).`);
out.push("> Link targets are kept inline in parentheses so every cited source stays");
out.push("> checkable from this file alone. Conditional UI states (a tool's unshown");
out.push("> verdicts) are omitted rather than dumped as contradictory text.");
out.push(`> Generated ${today}. Index: ${BASE}/llms.txt`);
if (datasetFiles.length) {
  out.push(`> Datasets (CC-BY 4.0, ${datasetFiles.length}): ` + datasetFiles.map((f) => `${BASE}/data/${f}`).join(" , "));
}
if (toolNames.length) {
  out.push(`> MCP endpoint ${BASE}/mcp — ${toolNames.length} read-only tools: ${toolNames.join(", ")}`);
}
out.push("");

for (const [file, path] of PAGES) {
  out.push("");
  out.push("=".repeat(72));
  out.push(`URL: ${BASE}${path}`);
  try {
    const html = await readFile(join(ROOT, file), "utf8");
    const title = titleOf(html);
    const desc = metaOf(html, "description");
    if (title) out.push(`Title: ${title}`);
    if (desc) out.push(`Description: ${desc}`);
    out.push("=".repeat(72));
    /* Only the <main> content: nav, notice bar and footer repeat on every
       page and would be 12 copies of the same boilerplate. */
    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
    out.push(textOf(mainMatch ? mainMatch[0] : html));
  } catch (e) {
    out.push("=".repeat(72));
    out.push(`(page unavailable at build time: ${e.message})`);
  }
}

out.push("");

try {
  await writeFile(join(ROOT, "llms-full.txt"), out.join("\n"), "utf8");
  console.log(`build-llms-full: wrote llms-full.txt (${out.join("\n").length} bytes, ${PAGES.length} pages)`);
} catch (e) {
  /* Even the write failing must not fail the deploy. */
  console.error(`build-llms-full: write failed, deploy continues without it: ${e.message}`);
}

process.exit(0);
