// Refresh data/products.json from PA-API for every term the shelves name.
//
// Rules that are not negotiable, each with its reason:
//
// TITLE MATCH. A result's ASIN and price are used only if its title contains
//   the product's model token. Amazon's top hit for "De'Longhi Pinguino PAC
//   EX105" is the newer GentleJet AP98 — the exact substitution the site
//   already closed on 2026-08-31. Without this rule the refresher would relink
//   the site's best-selling product to a different machine and print that
//   machine's price under the old name. A term whose result fails the match is
//   recorded as `unmatched`, and the page keeps its search link.
//
// CATEGORY TERMS ARE NEVER RESOLVED. "Für den Keller" has no token, so its
//   result is not a product; nothing about it is written.
//
// KEEP LAST GOOD. A term that errors keeps its previous entry, with the error
//   noted; the file is written only if at least one lookup succeeded. A dead
//   API must never blank the shelves.
//
// FRESHNESS IS THE PAGE'S PROBLEM TOO. Every entry carries fetched_at, and the
//   page generator refuses to render a price older than 24 h (Amazon's display
//   rule, and plain honesty). This script records; it does not decide display.
//
// NOTHING IS INVENTED. Terms come from shelf_terms.py, i.e. from products a page
//   already names. The refresher cannot add a product; it can only look one up.
import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PaapiClient } from "./paapi.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..");
const OUT = process.env.PRODUCTS_JSON || join(SITE, "data", "products.json");
const DRY = process.argv.includes("--dry-run");
const LIMIT = Number(process.env.PAAPI_LIMIT || 0);   // tests cap the term count
const PACE_MS = Number(process.env.PAAPI_PACE_MS || 1100); // PA-API entry rate is 1 TPS

function shelfTerms() {
  const raw = execFileSync("python3", [join(HERE, "shelf_terms.py")], { encoding: "utf8" });
  return JSON.parse(raw);
}

function loadPrevious() {
  if (!existsSync(OUT)) return { fetched: null, items: {} };
  try { return JSON.parse(readFileSync(OUT, "utf8")); } catch { return { fetched: null, items: {} }; }
}

function titleMatches(title, token) {
  if (!token) return false;
  const norm = (s) => s.toLowerCase().replace(/[\s\-–_]+/g, "");
  return norm(title).includes(norm(token));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function refresh({ client, terms, previous, now = new Date() }) {
  const items = { ...(previous.items || {}) };
  const log = [];
  let ok = 0, unmatched = 0, skipped = 0, failed = 0;
  for (const t of terms) {
    if (!t.token) { skipped++; log.push(`skip     ${t.name} (category term, never resolved)`); continue; }
    try {
      const results = await client.searchItems(t.term, { itemCount: 3 });
      const hit = results.find((r) => titleMatches(r.title, t.token));
      if (!hit) {
        unmatched++;
        items[t.term] = { ...(items[t.term] || {}), name: t.name, token: t.token, status: "unmatched",
          checked_at: now.toISOString(), top_title: (results[0] || {}).title || "" };
        log.push(`unmatch  ${t.name}: top hit "${((results[0] || {}).title || "").slice(0, 60)}" lacks "${t.token}"`);
        continue;
      }
      ok++;
      items[t.term] = {
        name: t.name, token: t.token, status: "ok", asin: hit.asin, title: hit.title,
        price_cents: hit.price_cents, currency: hit.currency, availability: hit.availability,
        fetched_at: now.toISOString(),
      };
      log.push(`ok       ${t.name} → ${hit.asin} ${hit.price_cents == null ? "(no price)" : (hit.price_cents / 100).toFixed(2) + " " + hit.currency}`);
    } catch (e) {
      failed++;
      items[t.term] = { ...(items[t.term] || {}), name: t.name, token: t.token,
        last_error: String(e.message || e).slice(0, 120), error_at: now.toISOString() };
      log.push(`error    ${t.name}: ${String(e.message || e).slice(0, 80)}`);
      if (e.status === 429) await sleep(PACE_MS * 5);
    }
    await sleep(PACE_MS);
  }
  return { items, log, ok, unmatched, skipped, failed };
}

async function main() {
  let client;
  try { client = new PaapiClient(); }
  catch (e) { console.log(`refresh: ${e.message} — nothing done, exit 0 (gate is the workflow variable)`); return 0; }
  let terms = shelfTerms();
  if (LIMIT) terms = terms.slice(0, LIMIT);
  const previous = loadPrevious();
  const r = await refresh({ client, terms, previous });
  for (const l of r.log) console.log(l);
  console.log(`\nrefresh: ok=${r.ok} unmatched=${r.unmatched} skipped=${r.skipped} failed=${r.failed} of ${terms.length}`);
  if (r.ok === 0 && r.unmatched === 0) {
    console.error("refresh: no lookup succeeded — keeping the previous file untouched");
    return 2;
  }
  const out = { fetched: new Date().toISOString(), source: "paapi5", marketplace: client.marketplace, items: r.items };
  if (DRY) { console.log("--dry-run: would write", OUT); console.log(JSON.stringify(out, null, 1).slice(0, 1500)); return 0; }
  writeFileSync(OUT + ".tmp", JSON.stringify(out, null, 1) + "\n");
  renameSync(OUT + ".tmp", OUT);
  console.log("wrote", OUT);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code)).catch((e) => { console.error(e); process.exit(1); });
}
