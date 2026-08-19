/* Collects height/weight pairs from the vendor's product pages and writes
   content/doll-specs.json.

   Why: weight is the single most reported source of buyer regret and almost no
   shop surfaces it next to the photo. A height-to-weight reference table would
   be genuinely useful, genuinely unique, and the kind of thing forums cite —
   but only if the numbers are real. We will not publish an invented table, so
   this exists to find out whether the data is obtainable at all.

   It walks popularity-sorted listings for product URLs, then opens each product
   page and reads the specification block. Runs in GitHub Actions with a real
   browser, because the vendor sits behind bot protection that 403s plain HTTP.

   Output is data only. Nothing is published from it until a human has looked at
   the spread and decided the sample is honest enough to represent as a table. */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { VENDORS, enabledVendors } from "./vendors.mjs";
/* Passed to page.evaluate() by reference — Playwright serialises the source,
   so scripts/test-parse-product.mjs exercises the identical code. */
import { readProduct } from "./parse-product.mjs";
/* Safety classification lives in one tested place — see the note at the top
   of classify.mjs for why over-detecting a partial body is the dangerous
   direction. */
import { isPartialBody, passesPolicy, implausibleWeight } from "./classify.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const OUT = process.env.VENDOR && process.env.VENDOR !== "yourdoll"
  ? `content/doll-specs-${process.env.VENDOR}.json`
  : "content/doll-specs.json";
const MAX_PRODUCTS = 110;

/* Self-tuned per vendor by scripts/detect-trends.mjs; falls back to the value
   that recovered coverage from 27% to 94% when it was first set by hand. */
const TUNING = existsSync("content/crawl-tuning.json")
  ? JSON.parse(readFileSync("content/crawl-tuning.json", "utf8"))
  : {};
const CRAWL_DELAY_MS = TUNING[process.env.VENDOR || "yourdoll"]?.delayMs ?? 2500;


/* One vendor per pass. The registry decides which; a vendor stays disabled
   until a real run proves its selectors, because a half-working scraper
   produces confident wrong prices and a wrong price is the one error this
   site's positioning cannot survive. */
const VENDOR_ID = process.env.VENDOR || "yourdoll";

/* DRY_RUN exists to break a deadlock this file's own rule created: a vendor
   stays disabled until a run proves its selectors, but only enabled vendors
   run. A probe resolves it honestly — it will run a DISABLED vendor, print
   everything it found, and write nothing. Selectors get proven on real pages
   without a single unverified price entering the repository. */
const DRY_RUN = process.env.DRY_RUN === "1";
const pool = DRY_RUN ? VENDORS : enabledVendors();
const vendor = pool.find((v) => v.id === VENDOR_ID);
if (!vendor) {
  console.error(
    `Vendor "${VENDOR_ID}" not found${DRY_RUN ? "" : " among enabled vendors"} in scripts/vendors.mjs. ` +
    `${DRY_RUN ? "Known" : "Enabled"}: ${pool.map((v) => v.id).join(", ") || "(none)"}.` +
    (!DRY_RUN && VENDORS.some((v) => v.id === VENDOR_ID)
      ? `\n"${VENDOR_ID}" exists but is disabled. Probe it first: DRY_RUN=1 VENDOR=${VENDOR_ID}`
      : "")
  );
  process.exit(1);
}
console.log(`Crawl delay: ${CRAWL_DELAY_MS}ms${TUNING[VENDOR_ID] ? " (self-tuned: " + TUNING[VENDOR_ID].reason + ")" : " (default)"}`);
console.log(`Vendor: ${vendor.name} (${vendor.home})${DRY_RUN ? "  [DRY RUN — nothing will be written]" : ""}`);
if (DRY_RUN && !vendor.enabled) {
  console.log("This vendor is disabled. Probing selectors only; no data will be kept.");
}

const browser = await chromium.launch();
const context = await browser.newContext({
  userAgent: UA,
  viewport: { width: 1366, height: 900 },
  locale: "en-US",
});
const page = await context.newPage();

try {
  await page.goto(vendor.home, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  console.log("warm-up title:", await page.title());
} catch (e) {
  console.warn("warm-up failed:", e.message);
}

/* ---- 1. gather product URLs across a few listing pages ---- */
/* Popularity alone clusters around whatever is selling this week, which is the
   wrong sample for a reference table — that needs spread across the height
   range. Search each band explicitly as well. */
const LISTINGS = vendor.listings;

const urls = new Set();
for (const q of LISTINGS) {
  const listing = new URL(q, vendor.home).toString();
  try {
    await page.goto(listing, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    for (const frac of [0.3, 0.6, 0.9]) {
      await page.evaluate((f) => window.scrollTo(0, document.body.scrollHeight * f), frac);
      await page.waitForTimeout(900);
    }
    const found = await page.evaluate(
      (sel) => Array.from(document.querySelectorAll(sel)).map((a) => a.href.split("?")[0]),
      vendor.productLinkSelector
    );
    found.forEach((u) => urls.add(u));
    console.log(`${q}: ${found.length} links, ${urls.size} unique so far`);
  } catch (e) {
    console.warn(`${q} failed: ${e.message.split("\n")[0]}`);
  }
  if (urls.size >= MAX_PRODUCTS) break;
}

/* ---- 2. read the specification block on each product page ---- */

/* Bot-protection interstitials. The first two-vendor probe filed 35 of 48
   pages as "incomplete (h=null w=null)" and then concluded "Selectors work" —
   the selectors were never the problem, those pages had rendered a challenge
   screen instead of a product. Counting a challenge as a parse failure
   misdiagnoses the vendor AND, far worse, hides that the surviving sample is
   not random: it is whichever pages happened to slip through. A price
   comparison built on a self-selected 27% of a catalogue is not a comparison.
   So a challenge is now named, retried, and counted separately. */
const CHALLENGE = /connection needs to be verified|just a moment|checking your browser|verify you are human|enable javascript and cookies|attention required/i;
const isChallenged = (row) => CHALLENGE.test(`${row.title} ${row.sample}`);

const specs = [];
let visited = 0;
let challenged = 0;
for (const url of [...urls].slice(0, MAX_PRODUCTS)) {
  visited++;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);
    let row = await page.evaluate(readProduct);

    if (isChallenged(row)) {
      /* These challenges usually clear themselves after a few seconds; the
         crawl rate is what provokes them. Wait it out, then reload once. */
      await page.waitForTimeout(8000);
      row = await page.evaluate(readProduct);
      if (isChallenged(row)) {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(6000);
        row = await page.evaluate(readProduct);
      }
      if (isChallenged(row)) {
        challenged++;
        console.log(`  ${visited}. BLOCKED by bot check (not a selector problem) — ${url}`);
        /* Back off. Continuing at full speed after a block guarantees the
           rest of the run is blocked too, which is how a 27% sample happens. */
        await page.waitForTimeout(5000);
        continue;
      }
      console.log(`  ${visited}. bot check cleared on retry`);
    }

    if (!row.title) { console.log(`  ${visited}. no title — ${url}`); continue; }
    if (!passesPolicy(row.title)) {
      console.log(`  ${visited}. policy-skip: ${row.title.slice(0, 55)}`);
      continue;
    }
    /* A parse can fail by returning a number instead of nothing. Two 160cm
       dolls came back at 2.5 kg — physically impossible for a full-size
       human-form object in TPE or silicone, so the regex had matched a
       shipping weight, a head weight or an accessory line. Unlike a null,
       this kind of failure survives every downstream check and lands in a
       published chart: these two rows alone moved the site's stated
       full-size weight floor from 43 lb to 6 lb.

       The floor is deliberately far below the lightest doll we have ever
       recorded (43 lb / 19.5 kg), so it rejects impossibilities without
       quietly trimming the low end of a real distribution. */
    if (implausibleWeight({ title: row.title, heightCm: row.heightCm, weightKg: row.weightKg })) {
      console.log(`  ${visited}. implausible: ${row.heightCm}cm at ${row.weightKg}kg — parse error, not a light doll: ${row.title.slice(0, 45)}`);
      console.log(`        near weight: ${row.nearWeight ? row.nearWeight.replace(/\s+/g, " ") : "(nothing)"}`);
      continue;
    }

    if (!row.heightCm || !row.weightKg) {
      /* Print what we actually saw. A run that only says "null" cannot be
         improved; a run that shows the text can. */
      console.log(`  ${visited}. incomplete (h=${row.heightCm} w=${row.weightKg}): ${row.title.slice(0, 45)}`);
      console.log(`        near weight: ${row.nearWeight ? row.nearWeight.replace(/\s+/g, " ") : "(the page never says weight, kg or lb)"}`);
      console.log(`        saw: ${row.sample.slice(0, 150)}`);
      continue;
    }
    specs.push({
      vendor: vendor.id,
      url,
      title: row.title.slice(0, 80),
      heightCm: Number(row.heightCm),
      weightKg: Number(row.weightKg),
      weightLb: Math.round(Number(row.weightKg) * 2.20462),
      material: row.material,
      /* price is now a number, not "$1,499.00". priceRaw keeps the string the
         page actually showed, so a disputed row can be argued from what was
         on screen rather than from what the parser believed. */
      price: row.price,
      priceRaw: row.priceRaw,
      priceWas: row.priceWas,
      priceCurrency: row.priceCurrency,
      /* Unreviewed candidates, kept with the sentence each came from. Two
         distributors' prices are not comparable until a human has read
         these — see the note in parse-product.mjs. */
      inclusionsClaimed: row.inclusionsClaimed,
      isPartial: isPartialBody(row.title),
    });
    console.log(
      `  ${visited}. ✓ ${row.heightCm}cm ${row.weightKg}kg ` +
      `${row.price === null ? "price=?" : (row.priceCurrency || "?") + " " + row.price}` +
      `${row.priceWas ? ` (was ${row.priceWas})` : ""} — ${row.title.slice(0, 45)}`
    );
    /* Pace the crawl. An early probe read a page every 1.2s, tripped the
       vendor's bot check a third of the way in, and everything after that was
       a challenge screen. Politeness here is also self-interest.

       The delay is no longer a constant somebody picked once: scripts/
       detect-trends.mjs widens it when observed coverage falls and eases it
       when coverage recovers, so the scraper's manners are derived from its
       own results. Bounded at both ends by that script — unbounded backoff
       would eventually never finish a run, and unbounded speed-up walks
       straight back into the bot check. */
    await page.waitForTimeout(CRAWL_DELAY_MS);
  } catch (e) {
    console.warn(`  ${visited}. failed: ${e.message.split("\n")[0]}`);
  }
}

await browser.close();

/* The probe's guarantee has to be enforced here, not just described above:
   a dry run reports and exits before anything touches the filesystem. */
if (DRY_RUN) {
  console.log(`\n--- DRY RUN SUMMARY (${vendor.id}) ---`);
  console.log(`Product URLs discovered: ${urls.size}`);
  console.log(`Pages visited: ${visited}`);
  console.log(`Blocked by the vendor's bot check: ${challenged}`);
  console.log(`Rows that parsed cleanly: ${specs.length}`);
  const reached = visited - challenged;
  const coverage = visited ? Math.round((reached / visited) * 100) : 0;
  console.log(`Catalogue coverage: ${coverage}% of visited pages actually rendered`);
  if (specs.length) {
    const priced = specs.filter((r) => typeof r.price === "number").length;
    const onSale = specs.filter((r) => r.priceWas).length;
    console.log(`Rows with a parsed numeric price: ${priced} of ${specs.length}${onSale ? ` (${onSale} on sale)` : ""}`);
    console.log("\nSample of what the selectors produced:");
    for (const r of specs.slice(0, 8)) {
      console.log(
        `  ${String(r.heightCm).padStart(5)}cm ${String(r.weightLb).padStart(4)}lb ` +
        `${String(r.price ?? "?").padStart(7)} ${(r.priceCurrency || "").padEnd(3)} ` +
        `${(r.priceWas ? `was ${r.priceWas}` : "").padEnd(10)} ${r.title.slice(0, 42)}`
      );
    }
    /* Print the raw strings too. The first probe reported "clean" rows whose
       price read "Regular price $1,499.00"; the summary looked fine because
       nothing showed what the page said. */
    console.log("\nRaw price text, exactly as the page rendered it:");
    for (const r of specs.slice(0, 8)) console.log(`  ${JSON.stringify(r.priceRaw)}`);

    /* The gate on any cross-vendor price page. How often each term is claimed
       as included tells us whether these prices can be compared at all — and
       the tally has to be read by a human, which is why it prints here rather
       than becoming a field on a page. */
    const tally = {};
    for (const r of specs) for (const i of r.inclusionsClaimed || []) tally[i.term] = (tally[i.term] || 0) + 1;
    const terms = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    console.log(`\nBundled inclusions claimed (unreviewed, ${specs.length} rows):`);
    if (!terms.length) console.log("  none found — check the selectors before concluding this vendor bundles nothing");
    for (const [term, n] of terms) console.log(`  ${String(n).padStart(3)}×  ${term}`);
    const example = specs.find((r) => (r.inclusionsClaimed || []).length);
    if (example) {
      console.log(`\n  Evidence sample — ${example.title.slice(0, 40)}:`);
      for (const i of example.inclusionsClaimed.slice(0, 4)) console.log(`    ${i.term}: …${i.evidence.slice(0, 120)}…`);
    }
  }
  /* Two separate questions, and the first probe ran them together and got the
     answer wrong: "do the selectors work?" and "did we see the catalogue?".
     A run can answer yes to the first and no to the second, which is exactly
     what happened — and it still printed "Selectors work", which reads as
     permission to enable the vendor. Coverage is now its own verdict, because
     prices drawn from whichever pages a bot check happened to let through are
     a self-selected sample, and a comparison built on one is not a
     comparison however correct each individual number is. */
  console.log();
  if (!specs.length) {
    console.log(`Selectors produced nothing for ${vendor.id}. Fix listings/productLinkSelector before enabling — do NOT enable a vendor on a zero-row probe.`);
  } else if (coverage < 80) {
    console.log(`Selectors work for ${vendor.id} — every row that rendered parsed correctly.`);
    console.log(`DO NOT ENABLE. Only ${coverage}% of pages rendered; the other ${challenged} were bot-checked.`);
    console.log(`The ${specs.length} rows collected are whichever pages got through, not a sample of the catalogue.`);
    console.log(`Slow the crawl further or find a listing feed before this vendor contributes a single price.`);
  } else {
    console.log(`Selectors work for ${vendor.id} and coverage is ${coverage}%.`);
    console.log(`To keep data, set enabled: true in scripts/vendors.mjs and re-run without DRY_RUN.`);
  }
  console.log("Nothing was written.");
  process.exit(0);
}

mkdirSync("content", { recursive: true });
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { specs: [] };
if (!specs.length) {
  console.warn(`\nNo usable specs found. Keeping the previous ${previous.specs.length} rows.`);
  process.exit(0);
}

specs.sort((a, b) => a.heightCm - b.heightCm);

/* Prices are a claim about a date. Overwriting the file destroyed the only
   record of what the previous claim was made from — which matters twice
   over: published pages cite specific figures ("the floor was $1,099") and
   have to stay reconcilable with the data behind them, and the question of
   whether a distributor's "sale" price is ever actually a sale can only be
   answered by comparing dated runs. Archive first, then overwrite. */
const stamp = (process.env.BUILD_DATE || new Date().toISOString().slice(0, 10));
const snapDir = "content/snapshots";
mkdirSync(snapDir, { recursive: true });
const snapshot = `${snapDir}/${vendor.id}-${stamp}.json`;

const payload = {
  source: `${vendor.home} product pages`,
  vendor: vendor.id,
  recorded: stamp,
  note: "Vendor-stated figures, not independently weighed. Prices are a snapshot " +
        "of one day and drift; bands and rank order are the durable claim. " +
        "Nothing is published from this file until the spread has been reviewed.",
  collected: specs.length,
  visited,
  challenged,
  coveragePct: visited ? Math.round(((visited - challenged) / visited) * 100) : 0,
  specs,
};

if (existsSync(snapshot)) {
  console.log(`Snapshot ${snapshot} already exists — not overwriting a same-day record.`);
} else {
  writeFileSync(snapshot, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Archived ${snapshot} (${specs.length} rows).`);
}

writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");

const full = specs.filter((s) => !s.isPartial);
console.log(`\n${specs.length} usable rows from ${visited} product pages.`);
if (full.length) {
  const lo = full[0], hi = full[full.length - 1];
  console.log(`Full-body range: ${lo.heightCm}cm/${lo.weightLb}lb → ${hi.heightCm}cm/${hi.weightLb}lb`);
}
console.log(`Written to ${OUT}.`);
