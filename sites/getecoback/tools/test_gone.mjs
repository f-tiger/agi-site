// Removed pages answer 410 (2026-09-27). Imports the self-contained GONE PAGES
// block from src/worker.js and checks both directions: every listed page and its
// .md mirror is 410 with a noindex header, and nothing else is caught — a page
// that merely starts with "balkon" (balkon-terrasse-beschatten, a shade guide)
// must still be served.
//
// Run: node tools/test_gone.mjs
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const a = src.indexOf("// --- GONE PAGES");
const b = src.indexOf("// --- /GONE PAGES");
if (a < 0 || b < 0) {
  console.error("FAIL: GONE PAGES block not found in src/worker.js");
  process.exit(1);
}
const mod = src.slice(a, b) + "\nexport { GONE_PAGES, goneResponse };\n";
const { GONE_PAGES, goneResponse } = await import(
  "data:text/javascript;base64," + Buffer.from(mod).toString("base64"));

const listed = readFileSync(new URL("./gone_pages.txt", import.meta.url), "utf8")
  .split("\n").map((l) => l.split("#")[0].trim()).filter(Boolean);

let bad = 0;
const fail = (m) => { console.error("FAIL:", m); bad++; };

if (listed.length === 0) fail("tools/gone_pages.txt lists no pages");
const inWorker = [...GONE_PAGES].sort().join(",");
if (inWorker !== [...listed].sort().join(",")) {
  fail(`worker list != tools/gone_pages.txt\n  worker: ${inWorker}\n  file:   ${[...listed].sort().join(",")}`);
}

for (const slug of listed) {
  for (const ext of ["html", "md"]) {
    const r = goneResponse(`/guide/${slug}.${ext}`);
    if (!r) { fail(`/guide/${slug}.${ext} is not 410`); continue; }
    if (r.status !== 410) fail(`/guide/${slug}.${ext} status ${r.status}`);
    if (r.headers.get("x-robots-tag") !== "noindex") fail(`/guide/${slug}.${ext} lacks noindex`);
  }
}

for (const p of ["/guide/balkon-terrasse-beschatten.html", "/guide/strompreis-radar.html",
                 "/kategorie/energie-sparen.html", "/", "/guide/klimaanlage-20-qm.md",
                 "/en/guide/balkonkraftwerk-mieter-recht.html"]) {
  if (goneResponse(p)) fail(`${p} was caught but is not a removed page`);
}

if (bad) process.exit(1);
console.log(`test_gone OK — ${listed.length} pages × (.html, .md) answer 410; 6 live paths untouched`);
