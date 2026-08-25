/* Bakes the homepage "Most loved right now" strip into static HTML.

   Until now the strip was rendered only by js/main.js from DS_CONFIG.hotPicks
   — which means the two audiences this site is actually betting on never saw
   it: crawlers/AI answer engines (no JS) and no-JS visitors. Same defect
   class bake-affiliate-links.mjs fixed for ordinary anchors, applied to the
   one block on the site that shows real vendor products. The JS renderer
   stays as a no-op guard (it skips when the strip is already populated), so
   behaviour for JS visitors is unchanged.

   Data: scripts/photos.json (_hotPicks), written by the weekly scraper from
   the vendor's own popularity-sorted listing — the "hottest products" claim
   is the vendor's ranking, not ours, and the on-page copy says so.
   Affiliate ref: read from js/config.js exactly like bake-affiliate-links
   (WHATWG URL, so values serialise identically to the JS path).
   Price strings are sanitised to the first $-amount — the scraper sometimes
   captures WooCommerce "Original price was:" suffixes.

   Idempotent: cards are replaced between HOTPICKS markers on every run.
   Run: node scripts/bake-hot-picks.mjs                                   */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const configSrc = readFileSync("js/config.js", "utf8");
function cfg(key) {
  const m = configSrc.match(new RegExp(`${key}:\\s*"([^"]*)"`));
  if (!m) { console.error(`FAIL js/config.js: could not read "${key}".`); process.exit(1); }
  return m[1];
}
const REF_PARAM = cfg("yourdollRefParam");
const REF = cfg("yourdollRef");

if (!existsSync("scripts/photos.json")) { console.log("bake-hot-picks: no photos.json — nothing to bake."); process.exit(0); }
const picks = (JSON.parse(readFileSync("scripts/photos.json", "utf8"))._hotPicks || []).slice(0, 8);
if (!picks.length) { console.log("bake-hot-picks: no hot picks in state — leaving page as-is."); process.exit(0); }

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const price = (s) => { const m = String(s || "").match(/\$[\d,]+(?:\.\d{2})?/); return m ? m[0] : ""; };

const cards = picks.map((p) => {
  let url;
  try { url = new URL(p.url); } catch (e) { return ""; }
  if (url.hostname !== "www.yourdoll.com" && url.hostname !== "yourdoll.com") return "";
  url.searchParams.set(REF_PARAM, REF);
  const cost = price(p.price);
  return `<a class="hot-card" href="${esc(url.toString())}" rel="sponsored nofollow noopener" target="_blank">` +
    `<div class="shot"><img src="${esc(p.img)}" alt="" loading="lazy" referrerpolicy="no-referrer"></div>` +
    `<div class="body"><span class="name">${esc(p.title)}</span>` +
    (cost ? `<span class="cost">${esc(cost)}</span>` : "") +
    `<span class="go">View at YourDoll →</span></div></a>`;
}).filter(Boolean).join("\n      ");

let html = readFileSync("index.html", "utf8");
const baked = `<div class="hot-strip" id="hot-picks"><!--HOTPICKS-->\n      ${cards}\n      <!--/HOTPICKS--></div>`;
const withMarkers = /<div class="hot-strip" id="hot-picks"><!--HOTPICKS-->[\s\S]*?<!--\/HOTPICKS--><\/div>/;
const empty = '<div class="hot-strip" id="hot-picks"></div>';

if (withMarkers.test(html)) html = html.replace(withMarkers, baked);
else if (html.includes(empty)) html = html.replace(empty, baked);
else { console.error("FAIL: #hot-picks container not found in index.html"); process.exit(1); }

writeFileSync("index.html", html);
console.log(`bake-hot-picks: ${picks.length} vendor products baked into index.html (crawler- and no-JS-visible).`);
