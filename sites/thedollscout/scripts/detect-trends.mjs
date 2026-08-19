/* Compares dated snapshots, emits signals, and splits them into the two
   things a signal can become.

   The honest framing first, because "trend prediction" is where this kind of
   feature usually starts lying. We have no external market feed and no search
   query data. What we have is our own weekly snapshots. So this detects
   CHANGE IN WHAT WE RECORDED, states how many observations support each
   signal, and refuses to extrapolate from two points. A direction is not a
   rate, and two consecutive observations are not a trend.

   It also refuses to compare against a snapshot whose coverage is unknown.
   The early archives predate the coverage field, and a "price rose" signal
   computed against a partial crawl is an artefact of what the bot check let
   through, not a movement in the market.

   Every signal lands in exactly one of two buckets:

     SELF-IMPROVING — the site can act on it without a human, so it does.
                      Falling scrape coverage widens the crawl delay. A page
                      whose numbers drifted gets regenerated. These close
                      their own loop.

     OWNER ACTION   — needs judgement, money, or an account we do not hold.
                      These are the only ones worth interrupting someone for,
                      and they are what the Telegram notification carries.

   The split matters more than the detection. A system that notifies about
   things it could have fixed is training its owner to ignore it. */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const DIR = "content/snapshots";
const MIN_COVERAGE = 80;
/* A direction needs two comparable observations. Calling something a rate,
   or projecting an arrival date from it, needs more. */
const OBS_FOR_DIRECTION = 2;
const OBS_FOR_RATE = 4;

const selfImproving = [];
const ownerActions = [];
const notComparable = [];

const snaps = new Map();
if (existsSync(DIR)) {
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".json"))) {
    const s = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
    const vendor = s.vendor || f.split("-")[0];
    if (!snaps.has(vendor)) snaps.set(vendor, []);
    snaps.get(vendor).push({ file: f, ...s });
  }
}

for (const [vendor, all] of snaps) {
  all.sort((a, b) => String(a.recorded).localeCompare(String(b.recorded)));
  const usable = all.filter((s) => (s.coveragePct ?? -1) >= MIN_COVERAGE);
  const skipped = all.filter((s) => (s.coveragePct ?? -1) < MIN_COVERAGE);

  for (const s of skipped) {
    notComparable.push(
      `${vendor} ${s.recorded}: coverage ${s.coveragePct === null || s.coveragePct === undefined ? "unrecorded" : s.coveragePct + "%"} — ` +
      `excluded, because a change measured against a partial crawl is an artefact of what got through, not a movement`
    );
  }

  if (usable.length < OBS_FOR_DIRECTION) {
    notComparable.push(
      `${vendor}: ${usable.length} usable snapshot(s), need ${OBS_FOR_DIRECTION} for a direction. ` +
      `The weekly scrape supplies the next one.`
    );
    continue;
  }

  const prev = usable[usable.length - 2];
  const curr = usable[usable.length - 1];
  const byUrl = (s) => new Map((s.specs || []).map((r) => [r.url, r]));
  const a = byUrl(prev), b = byUrl(curr);

  /* ---- price movement ---- */
  const moved = [];
  for (const [url, now] of b) {
    const was = a.get(url);
    if (!was || typeof now.price !== "number" || typeof was.price !== "number") continue;
    if (now.price !== was.price) moved.push({ url, title: now.title, from: was.price, to: now.price });
  }
  if (moved.length) {
    const drops = moved.filter((m) => m.to < m.from);
    ownerActions.push({
      signal: "price-movement",
      observations: usable.length,
      confidence: usable.length >= OBS_FOR_RATE ? "rate" : "direction only",
      summary: `${vendor}: ${moved.length} listing(s) changed price between ${prev.recorded} and ${curr.recorded} (${drops.length} down)`,
      detail: moved.slice(0, 5).map((m) => `${m.title.slice(0, 42)} $${m.from} → $${m.to}`),
      action: "Check whether any published price band still holds. The claims gate blocks a deploy if it does not.",
    });
  }

  /* ---- catalogue movement ---- */
  const added = [...b.keys()].filter((u) => !a.has(u)).length;
  const gone = [...a.keys()].filter((u) => !b.has(u)).length;
  if (added || gone) {
    selfImproving.push({
      signal: "catalogue-movement",
      observations: usable.length,
      summary: `${vendor}: ${added} listing(s) appeared, ${gone} disappeared since ${prev.recorded}`,
      handled: "The dataset, the entity pages and the search index all regenerate from this automatically.",
    });
  }

  /* ---- coverage direction: the site tuning its own politeness ---- */
  const covs = usable.map((s) => s.coveragePct);
  const delta = covs[covs.length - 1] - covs[covs.length - 2];
  if (delta <= -5) {
    selfImproving.push({
      signal: "coverage-falling",
      observations: usable.length,
      summary: `${vendor}: coverage ${covs[covs.length - 2]}% → ${covs[covs.length - 1]}% (${delta}pp)`,
      handled: "Crawl delay widened for this vendor — see content/crawl-tuning.json. The scraper reads it on the next run.",
      tune: { vendor, direction: "slower" },
    });
  } else if (delta >= 5 && covs[covs.length - 1] >= 95) {
    selfImproving.push({
      signal: "coverage-recovered",
      observations: usable.length,
      summary: `${vendor}: coverage back to ${covs[covs.length - 1]}%`,
      handled: "Crawl delay eased slightly — the loop closes in both directions or it only ever gets slower.",
      tune: { vendor, direction: "faster" },
    });
  }
}

/* ---- self-tuning crawl pacing ----
   This is the part that makes the loop emergent rather than scheduled: the
   scraper's politeness is derived from its own observed coverage instead of a
   constant somebody picked once. Bounded at both ends — an unbounded backoff
   would eventually never finish a run, and an unbounded speed-up would walk
   straight back into the bot check that cost us a 27% crawl. */
const TUNING_FILE = "content/crawl-tuning.json";
const DEFAULT_DELAY = 2500, MIN_DELAY = 1500, MAX_DELAY = 9000;
const tuning = existsSync(TUNING_FILE) ? JSON.parse(readFileSync(TUNING_FILE, "utf8")) : {};
let tuned = false;
for (const s of selfImproving) {
  if (!s.tune) continue;
  const cur = tuning[s.tune.vendor]?.delayMs ?? DEFAULT_DELAY;
  const next = s.tune.direction === "slower"
    ? Math.min(MAX_DELAY, Math.round(cur * 1.5))
    : Math.max(MIN_DELAY, Math.round(cur * 0.85));
  if (next !== cur) {
    tuning[s.tune.vendor] = { delayMs: next, reason: s.summary, changed: null };
    tuned = true;
  }
}
if (tuned) writeFileSync(TUNING_FILE, JSON.stringify(tuning, null, 2) + "\n");

/* ---- owner actions that no signal can resolve ---- */
if (existsSync("content/grow-status.json")) {
  const g = JSON.parse(readFileSync("content/grow-status.json", "utf8"));
  if ((g.blockedOnOwner || []).length) {
    ownerActions.push({
      signal: "blocked-on-owner",
      observations: null,
      confidence: "n/a",
      summary: "Three things the pipeline cannot do for you",
      detail: [
        "Search Console: until it is connected the site grows toward what we can prove, not toward what people search for",
        "Brand collision with dollscout.com — a rename is not ours to make",
        "Outreach — we never post to communities",
      ],
      action: "These are the only real limits left. Everything else regenerates itself weekly.",
    });
  }
}

const out = {
  generated: null,
  minCoverage: MIN_COVERAGE,
  selfImproving,
  ownerActions,
  notComparable,
};
writeFileSync("content/trends.json", JSON.stringify(out, null, 2) + "\n");

console.log("=== self-improving (already handled, no action needed) ===");
if (!selfImproving.length) console.log("  none this run");
for (const s of selfImproving) {
  console.log(`  ${s.signal}: ${s.summary}`);
  console.log(`      → ${s.handled}`);
}

console.log("\n=== owner action items ===");
if (!ownerActions.length) console.log("  none this run");
for (const s of ownerActions) {
  console.log(`  ${s.signal} [${s.confidence}${s.observations ? `, ${s.observations} observations` : ""}]: ${s.summary}`);
  for (const d of s.detail || []) console.log(`      · ${d}`);
  console.log(`      → ${s.action}`);
}

if (notComparable.length) {
  console.log("\n=== not comparable yet, and why ===");
  for (const n of notComparable) console.log(`  · ${n}`);
}
console.log(`\ncontent/trends.json written.${tuned ? " Crawl pacing tuned." : ""}`);
