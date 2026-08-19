/* Reads the dated snapshots and reports what actually changed between them.

   It exists to answer one question honestly, and to stop us answering it
   early. Two runs a day apart found ~96% of a distributor's listings showing
   a "sale" price, with 26 of 26 repeat listings unchanged in both the price
   and the struck-through price beside it. That is suggestive. It is also
   exactly what an ordinary week-long promotion looks like over 24 hours, so
   it proves nothing on its own, and "this shop's discount is permanent" is
   an accusation of deceptive pricing that we would refuse from anyone else
   on that evidence.

   So the claim is not made from two dates. It is made — or dropped — when a
   run of observations says so. This prints the series and states plainly how
   many distinct dates support it. */

import { readdirSync, readFileSync, existsSync } from "node:fs";

const DIR = "content/snapshots";
/* Below this, a snapshot describes whichever pages a bot check let through
   rather than the catalogue, and a self-selected sample cannot support a
   claim about a shop's pricing behaviour. */
const MIN_COVERAGE = 80;
/* Distinct dates before the word "always" may appear anywhere. Consecutive
   days barely count as separate observations of a promotion, so this is
   deliberately more than a couple. */
const DATES_FOR_A_CLAIM = 4;

if (!existsSync(DIR)) {
  console.log(`No ${DIR} yet. Snapshots accumulate one per vendor per run.`);
  process.exit(0);
}

const byVendor = new Map();
for (const f of readdirSync(DIR).filter((n) => n.endsWith(".json"))) {
  const snap = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
  const vendor = snap.vendor || f.split("-")[0];
  if (!byVendor.has(vendor)) byVendor.set(vendor, []);
  byVendor.get(vendor).push({ file: f, ...snap });
}

for (const [vendor, snaps] of byVendor) {
  snaps.sort((a, b) => String(a.recorded).localeCompare(String(b.recorded)));
  console.log(`\n=== ${vendor} — ${snaps.length} snapshot(s) ===`);

  const usable = snaps.filter((s) => (s.coveragePct ?? 0) >= MIN_COVERAGE);
  for (const s of snaps) {
    const rows = s.specs || [];
    const sale = rows.filter((r) => r.priceWas).length;
    const cov = s.coveragePct ?? null;
    const flag = cov === null ? "coverage unknown" : cov >= MIN_COVERAGE ? `${cov}% coverage` : `${cov}% coverage — TOO LOW TO USE`;
    console.log(`  ${s.recorded || "(undated)"}  ${String(rows.length).padStart(3)} rows  ${String(sale).padStart(3)} discounted  (${flag})`);
  }

  if (usable.length < 2) {
    console.log(`  Not enough usable snapshots to compare. Need ${MIN_COVERAGE}%+ coverage on at least two dates.`);
    continue;
  }

  /* Per listing: on how many distinct usable dates was it seen, and on how
     many of those was the identical discount showing? */
  const seen = new Map();
  for (const s of usable) {
    for (const r of s.specs || []) {
      if (!seen.has(r.url)) seen.set(r.url, { title: r.title, obs: [] });
      seen.get(r.url).obs.push({ date: s.recorded, price: r.price, was: r.priceWas });
    }
  }

  const repeat = [...seen.values()].filter((v) => new Set(v.obs.map((o) => o.date)).size >= 2);
  const alwaysDiscounted = repeat.filter((v) => v.obs.every((o) => o.was));
  const frozen = repeat.filter((v) => new Set(v.obs.map((o) => `${o.price}/${o.was}`)).size === 1);
  const dates = [...new Set(usable.map((s) => s.recorded))].sort();

  console.log(`  Listings seen on 2+ usable dates: ${repeat.length}`);
  console.log(`    discounted on every one of those dates: ${alwaysDiscounted.length}`);
  console.log(`    price AND was-price identical throughout: ${frozen.length}`);
  console.log(`  Distinct usable dates: ${dates.length} (${dates.join(", ")})`);

  if (dates.length < DATES_FOR_A_CLAIM) {
    console.log(
      `  VERDICT: not publishable. ${dates.length} of ${DATES_FOR_A_CLAIM} dates needed before a claim about\n` +
      `           this distributor's pricing behaviour can be made. Consecutive days are\n` +
      `           barely independent observations, and a normal promotion looks identical\n` +
      `           to a permanent one over a short window.`
    );
  } else if (frozen.length && frozen.length === repeat.length) {
    console.log(
      `  VERDICT: across ${dates.length} dates spanning ${dates[0]} to ${dates[dates.length - 1]}, every repeat\n` +
      `           listing held the same price and the same struck-through price. That is a\n` +
      `           reference price nobody was charged on any observed date. Publishable —\n` +
      `           stated as what was observed, on those dates, at that coverage.`
    );
  } else {
    console.log(`  VERDICT: prices moved between dates. Whatever else is true, the discount is not frozen.`);
  }
}
