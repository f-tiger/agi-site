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

import { readFile, writeFile } from "node:fs/promises";
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
  ["de/index.html", "/de/"],
  ["de/start.html", "/de/start"],
  ["de/rarity.html", "/de/rarity"],
  ["de/how-blind-boxes-work.html", "/de/how-blind-boxes-work"],
  ["de/psychology.html", "/de/psychology"],
  ["de/fake-check.html", "/de/fake-check"],
  ["de/where-to-buy.html", "/de/where-to-buy"],
  ["de/glossary.html", "/de/glossary"],
];

function textOf(html) {
  /* Cheap, tolerant extraction — no DOM library on purpose (zero deps on the
     deploy path). Good-enough text beats a dependency that can break it. */
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
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

out.push("# DollScout — full site text (llms-full.txt)");
out.push("");
out.push("> Rarity-first buyer's guide for Labubu / The Monsters collectibles");
out.push("> (created by Kasing Lung, produced under exclusive license by Pop Mart).");
out.push("> Independent — not affiliated with Pop Mart or Kasing Lung. Every claim");
out.push("> is sourced inline or explicitly marked unverified. Pop Mart's own");
out.push("> current guidance outranks this site where they disagree.");
out.push(">");
out.push("> This file is the plain-text rendering of every content page, EN then DE.");
out.push(`> Generated ${today}. Index: ${BASE}/llms.txt · Datasets (CC-BY 4.0):`);
out.push(`> ${BASE}/data/rarity-odds.json and ${BASE}/data/labubu-fake-signals.json`);
out.push(`> · MCP endpoint (3 read-only tools): ${BASE}/mcp`);
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
