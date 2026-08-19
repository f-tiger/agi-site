/* Matches the same factory model across distributors.

   This is step 2 of the build order in content/strategy-cut.md, and it is the
   step that decides whether a cross-vendor price comparison can honestly
   exist. A price table is only meaningful if the two rows are the same doll.
   The rule from that document is load-bearing here: UNMATCHED ROWS STAY
   UNMATCHED. A guessed match publishes a price difference between two
   different products, which is a fabricated finding wearing a table.

   What the titles actually give us, checked against collected data rather
   than assumed:

     yourdoll          "156cm (5ft1) H-Cup Indigo, Head #233"
     perfectlovedolls  "WM Doll 156cm H Cup - Head 335"

   Height, cup and head code appear on both. The factory name appears on only
   one — yourdoll never states it. So the join key is height + cup + head
   code, and the factory is carried along as corroboration when present, never
   required. Head codes are numbered per factory, which is exactly why the
   height and cup have to agree too: a bare head number is not unique across
   manufacturers.

   Reads content/doll-specs*.json. Writes content/model-matches.json, which is
   input for an editorial decision — nothing here publishes a page. */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { FACTORIES } from "./vendors.mjs";

/* Head codes take every form a spec sheet allows: "#355", "Head 70",
   "Head SZ20", "Head GE95-1", "Movable Jaw Head M5". Normalise to the bare
   alphanumeric so "#355" and "355" are the same head, and uppercase so "n20"
   and "N20" are too. */
export function parseHeadCode(title) {
  const m = title.match(/head\s*#?\s*([A-Za-z]{0,3}\s*-?\s*\d{1,4}(?:\s*-\s*\d{1,2})?)/i);
  if (!m) return null;
  const code = m[1].replace(/[\s#]/g, "").toUpperCase();
  return code || null;
}

export function parseCup(title) {
  /* "H-Cup", "E cup", "M-Cup", "B Cup". A single letter only — "double D" and
     similar are not comparable across vendors' naming, so they stay null and
     the row stays unmatched. */
  const m = title.match(/\b([A-Z])\s*[- ]?\s*cup\b/i);
  return m ? m[1].toUpperCase() : null;
}

export function parseHeight(title) {
  const m = title.match(/(\d{2,3}(?:\.\d)?)\s*cm/i);
  return m ? Number(m[1]) : null;
}

export function parseFactory(title) {
  const hit = FACTORIES.find((f) => new RegExp(`\\b${f.replace(/\s+/g, "\\s*")}\\b`, "i").test(title));
  return hit || null;
}

export function modelKey(row) {
  const title = row.title || "";
  const heightCm = row.heightCm ?? parseHeight(title);
  const cup = parseCup(title);
  const headCode = parseHeadCode(title);
  return {
    heightCm: heightCm ?? null,
    cup,
    headCode,
    factory: parseFactory(title),
    /* All three or nothing. Two of the three identifies a body shape, not a
       model, and a comparison between body shapes is not a comparison. */
    key: heightCm && cup && headCode ? `${heightCm}|${cup}|${headCode}` : null,
  };
}

/* Variant qualifiers. Found by reading the first real matches rather than by
   anticipating them: the key matched "WM Doll 163cm H Cup - Head 198
   (Weight-Reduced)" to a plain 163cm H-cup at another distributor, and would
   have published the $200 gap between them as a price difference. It is not
   one — a weight-reduced build is a different product, and the cheaper listing
   was the one carrying the qualifier.

   Height, cup and head code identify the mould. They do not identify the
   build. So a qualifier present on one side and absent on the other blocks
   the match; the same qualifier on both sides is fine, because then the two
   listings really are the same thing. */
const VARIANTS = [
  ["weight-reduced", /weight[\s-]*reduce/i],
  ["hollow", /\bhollow\b/i],
  ["silicone head", /silicone\s*head/i],
  ["movable jaw", /movable\s*jaw/i],
  ["ROS", /\bROS\b/],
  ["gel-filled", /\bgel[\s-]*(?:filled|breast|butt)/i],
  ["implanted hair", /implant\w*\s*hair/i],
  ["EVO skeleton", /\bevo\b/i],
  ["full silicone", /full\s*silicone/i],
];

export function parseVariants(title) {
  return VARIANTS.filter(([, re]) => re.test(title)).map(([name]) => name);
}

/* Returns the qualifiers that appear on some listings in the group but not
   all of them — the ones that mean these are not the same product. */
export function variantMismatch(rows) {
  const all = new Set(rows.flatMap((r) => r.variants || []));
  const odd = [...all].filter((v) => !rows.every((r) => (r.variants || []).includes(v)));
  return odd.length ? odd : null;
}

/* Rows whose keys agree but whose stated factories contradict each other are
   NOT a match — two manufacturers reusing a head number is precisely the
   collision the key cannot rule out on its own. Reject loudly rather than
   publish. */
export function conflictingFactories(rows) {
  const named = [...new Set(rows.map((r) => r.factory).filter(Boolean))];
  return named.length > 1 ? named : null;
}

export function matchModels(rowsByVendor) {
  const buckets = new Map();
  const unkeyed = [];
  for (const [vendor, rows] of Object.entries(rowsByVendor)) {
    for (const row of rows) {
      if (row.isPartial) continue;               // torsos are not model-comparable
      const k = modelKey(row);
      const entry = { vendor, ...k, title: row.title, url: row.url, price: row.price, priceCurrency: row.priceCurrency, inclusionsClaimed: row.inclusionsClaimed || [], variants: parseVariants(row.title) };
      if (!k.key) { unkeyed.push(entry); continue; }
      if (!buckets.has(k.key)) buckets.set(k.key, []);
      buckets.get(k.key).push(entry);
    }
  }

  const matched = [];
  const rejected = [];
  for (const [key, rows] of buckets) {
    const vendors = new Set(rows.map((r) => r.vendor));
    if (vendors.size < 2) continue;              // one distributor is not a comparison
    const clash = conflictingFactories(rows);
    if (clash) { rejected.push({ key, reason: `factories disagree: ${clash.join(" vs ")}`, rows }); continue; }
    const variantOdd = variantMismatch(rows);
    if (variantOdd) {
      rejected.push({ key, reason: `not the same build — ${variantOdd.join(", ")} on one side only`, rows });
      continue;
    }
    matched.push({ key, factory: rows.find((r) => r.factory)?.factory || null, rows });
  }
  return { matched, rejected, unkeyed, bucketCount: buckets.size };
}

/* ---- run as a script ---- */
if (import.meta.url === `file://${process.argv[1]}`) {
  const rowsByVendor = {};
  for (const f of readdirSync("content").filter((n) => /^doll-specs.*\.json$/.test(n))) {
    const data = JSON.parse(readFileSync(`content/${f}`, "utf8"));
    for (const row of data.specs || []) {
      const vendor = row.vendor || f.replace(/^doll-specs-?/, "").replace(/\.json$/, "") || "yourdoll";
      (rowsByVendor[vendor] ||= []).push(row);
    }
  }

  const vendors = Object.keys(rowsByVendor);
  console.log(`Distributors with collected rows: ${vendors.length ? vendors.join(", ") : "(none)"}`);
  for (const v of vendors) console.log(`  ${v}: ${rowsByVendor[v].length} rows`);

  const { matched, rejected, unkeyed, bucketCount } = matchModels(rowsByVendor);
  console.log(`\nRows with a usable model key: ${bucketCount} distinct models`);
  console.log(`Rows without one (stay unmatched): ${unkeyed.length}`);
  console.log(`Models present at 2+ distributors: ${matched.length}`);
  if (rejected.length) {
    console.log(`Rejected (key matched but the products do not): ${rejected.length}`);
    for (const r of rejected) {
      console.log(`  ${r.key} — ${r.reason}`);
      for (const row of r.rows) console.log(`      ${row.vendor.padEnd(18)} ${row.title.slice(0, 55)}`);
    }
  }

  for (const m of matched.slice(0, 20)) {
    console.log(`\n  ${m.key}${m.factory ? ` (${m.factory})` : ""}`);
    for (const r of m.rows) console.log(`    ${r.vendor.padEnd(18)} ${String(r.price ?? "?").padStart(7)}  ${r.title.slice(0, 55)}`);
  }

  if (vendors.length < 2) {
    console.log(
      "\nOnly one distributor has been collected, so nothing can be compared yet. " +
      "This is the expected state until a second vendor's selectors are proven and enabled."
    );
  } else if (!matched.length) {
    console.log(
      "\nNo model appears at two distributors. That is a finding, not a failure — " +
      "and it means no comparison page can be published. Do not relax the key to manufacture matches."
    );
  }

  writeFileSync(
    "content/model-matches.json",
    JSON.stringify({ generated: process.env.BUILD_DATE || null, matched, rejected, unkeyedCount: unkeyed.length }, null, 2) + "\n"
  );
  console.log("\nWrote content/model-matches.json (input for review; publishes nothing).");
}
