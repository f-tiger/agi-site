/* Candidate page categories, and the tests a category must pass before it is
   allowed to exist.

   Adding a category used to mean writing a generator. That made the site's
   expansion depend on someone deciding, which is the bottleneck this removes.
   A category now qualifies — or does not — from the data, on a schedule.

   But "generate a page family for every column" is exactly how a domain gets
   classified as programmatic spam, so qualification is three tests, all
   automatic and all refusable:

     1. SAMPLE      — enough distinct values, each with enough rows. A page per
                      value where one value has three listings is a template,
                      not a finding.

     2. VARIANCE    — the metric must actually differ across the values. If
                      every WM Doll listing weighs the same, a page per factory
                      says nothing that one sentence could not, and publishing
                      it would be padding. A category that cannot surprise
                      anyone does not earn a URL.

     3. DISTINCTNESS — the grouping must not be a near-restatement of a
                      category that already exists. Height and weight-band
                      partition these rows almost identically; shipping both
                      produces two page families saying one thing in different
                      words. Measured, not guessed: if knowing the live
                      category predicts the candidate's value for most rows,
                      the candidate is refused as duplicative.

   The output of a weekly run is usually "nothing new qualifies", with the
   failing test named. That is the mechanism working. */

import { parseFactory, parseCup } from "./match-models.mjs";

export const MIN_SAMPLE = 10;      // rows per value before that value gets a page
export const MIN_VALUES = 2;       // qualifying values before the category exists
export const MIN_VARIANCE_PCT = 15; // spread across value medians, as % of the smallest
export const MAX_PREDICTABILITY = 0.8; // above this, the candidate restates a live category

/* A dimension describes how to slice the dataset and what question each slice
   answers. `live: true` means it is already published; candidates start false
   and are promoted by the qualifier, not by hand. */
export const DIMENSIONS = [
  {
    id: "height",
    live: true,
    dir: "weight",
    hubTitle: "Sex Doll Weight by Height: Real Listings, Sample Sizes Stated",
    hubHeading: "What dolls actually weigh, by height",
    extract: (r) => (r.heightCm ? String(r.heightCm) : null),
    slug: (v) => `${v}cm`,
    label: (v) => `${v} cm`,
    metric: (r) => r.weightLb,
    metricName: "weight",
    unit: "lb",
    question: (v) => `How much does a ${v}cm sex doll weigh?`,
    pageTitle: (v, s) => `How Much Does a ${v}cm Sex Doll Weigh? ${s.n} Real Listings`,
    why: "Height is the number every shop prints and the wrong one to plan around.",
  },
  {
    id: "factory",
    live: false,
    dir: "factory",
    hubTitle: "Doll Prices by Factory: What Each Manufacturer Actually Costs",
    hubHeading: "What each factory's dolls actually cost",
    /* Only one distributor names the factory in its titles, so this category
       qualifies only once enough labelled rows accumulate — which is the
       qualifier doing its job rather than a limitation to work around. */
    extract: (r) => parseFactory(r.title),
    slug: (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    label: (v) => v,
    metric: (r) => r.priceUsd,
    metricName: "price",
    unit: "USD",
    question: (v) => `How much does a ${v} doll cost?`,
    pageTitle: (v, s) => `${v} Doll Prices: ${s.n} Live Listings, Recorded`,
    why: "Buyers search the factory name long before they know a model number.",
  },
  {
    id: "cup",
    live: false,
    dir: "cup",
    hubTitle: "Doll Weight by Cup Size: Measured, Not Guessed",
    hubHeading: "What cup size does to weight",
    extract: (r) => parseCup(r.title),
    slug: (v) => `${v.toLowerCase()}-cup`,
    label: (v) => `${v} cup`,
    metric: (r) => r.weightLb,
    metricName: "weight",
    unit: "lb",
    question: (v) => `How much does a ${v}-cup doll weigh?`,
    pageTitle: (v, s) => `${v}-Cup Doll Weight: ${s.n} Listings Measured`,
    why: "Build drives weight more than height does, and cup size is the part of build a listing always states.",
  },
];

export const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export function groupBy(rows, dim) {
  const g = new Map();
  for (const r of rows) {
    const v = dim.extract(r);
    const m = dim.metric(r);
    if (v === null || v === undefined || typeof m !== "number") continue;
    if (!g.has(v)) g.set(v, []);
    g.get(v).push(r);
  }
  return g;
}

/* How well does knowing `liveDim`'s value predict `candidate`'s? Computed as
   the share of rows falling in each live group's most common candidate value.
   1.0 means the candidate is a relabelling of a category we already publish. */
export function predictability(rows, candidate, liveDim) {
  const buckets = new Map();
  let total = 0;
  for (const r of rows) {
    const lv = liveDim.extract(r);
    const cv = candidate.extract(r);
    if (lv === null || cv === null || lv === undefined || cv === undefined) continue;
    if (!buckets.has(lv)) buckets.set(lv, new Map());
    const inner = buckets.get(lv);
    inner.set(cv, (inner.get(cv) || 0) + 1);
    total++;
  }
  if (!total) return 0;
  let predicted = 0;
  for (const inner of buckets.values()) predicted += Math.max(...inner.values());
  return predicted / total;
}

/* Returns { ok, values, reasons } — reasons are printed whether it passes or
   not, because "why this category does not exist yet" is the useful half. */
export function qualify(rows, dim, liveDims) {
  const grouped = groupBy(rows, dim);
  const values = [...grouped.entries()]
    .filter(([, g]) => g.length >= MIN_SAMPLE)
    .sort((a, b) => b[1].length - a[1].length);
  const reasons = [];

  if (values.length < MIN_VALUES) {
    const best = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
    reasons.push(
      `sample: ${values.length} value(s) reach ${MIN_SAMPLE} rows, needs ${MIN_VALUES}` +
      (best.length ? ` — closest: ${best.map(([v, g]) => `${dim.label(v)} n=${g.length}`).join(", ")}` : " — no values at all")
    );
  }

  if (values.length >= MIN_VALUES) {
    const meds = values.map(([, g]) => median(g.map(dim.metric)));
    const lo = Math.min(...meds), hi = Math.max(...meds);
    const variance = lo > 0 ? Math.round(((hi - lo) / lo) * 100) : 0;
    if (variance < MIN_VARIANCE_PCT) {
      reasons.push(
        `variance: medians span only ${variance}% across values (needs ${MIN_VARIANCE_PCT}%) — ` +
        `a page per value would repeat one number in different words`
      );
    }
  }

  for (const live of liveDims) {
    if (live.id === dim.id) continue;
    const p = predictability(rows, dim, live);
    if (p > MAX_PREDICTABILITY) {
      reasons.push(
        `distinctness: ${Math.round(p * 100)}% predictable from the existing "${live.id}" category ` +
        `(limit ${Math.round(MAX_PREDICTABILITY * 100)}%) — this would restate pages we already publish`
      );
    }
  }

  return { ok: reasons.length === 0, values, reasons };
}
