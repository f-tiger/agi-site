/* One command that regrows the site from whatever data now exists, refuses
   whatever still cannot be defended, and reports what is one step away.

   The problem this solves: every regeneration step existed, but nobody ran
   them together. build-compare and price-history were in no workflow at all —
   the two scripts closest to the site's actual differentiator sat waiting for
   a human to remember them. A pipeline that only runs when someone types the
   command is not automation, it is a checklist.

   What it can and cannot do, stated because the difference matters:

     CAN  — expand by DATA. When a new height crosses the sample threshold, a
            page appears on its own. When a second distributor's rows make a
            model comparable, the comparison becomes publishable on its own.
     CANNOT — expand by DEMAND. Choosing what to build from what people
            actually search needs Search Console, which needs the owner's
            Google account. Until then this grows toward what we can prove,
            not toward what is most wanted, and it should not pretend
            otherwise.

   Every gate stays. Automatic expansion without gates is how a site becomes
   the programmatic spam this one exists to argue against — so the honest
   output of a weekly run is usually "nothing new qualifies", plus the reason.

   Run: node scripts/grow.mjs        (add --report to skip regeneration) */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync } from "node:fs";

const REPORT_ONLY = process.argv.includes("--report");

const run = (script, { gate = false } = {}) => {
  /* Gates are not all JavaScript. The staging bug that discarded eleven days
     of traffic lives in shell, so its test does too, and a runner that only
     knows how to invoke node would have quietly skipped it. */
  const [cmd, ...args] = script.endsWith(".sh") ? ["bash", `scripts/${script}`] : ["node", `scripts/${script}`];
  try {
    const out = execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, out };
  } catch (e) {
    /* A failing GATE is a real stop. A failing generator is worse — it means
       the site would deploy stale pages — so neither is swallowed. */
    return { ok: false, out: `${e.stdout || ""}${e.stderr || ""}`, gate };
  }
};

const line = (s = "") => console.log(s);

/* ---- 1. regenerate everything derived from data ---- */
const GENERATORS = [
  "build-dataset.mjs",
  "build-tool-datasets.mjs",
  "build-pages.mjs",
  "build-weight-pages.mjs",
  "build-category-pages.mjs",
  "build-recourse-matrix.mjs",
  "build-cost-examples.mjs",
  /* After the dataset and the calculator, because it rewrites the figures the
     pricing guide and /data/ state in prose. Those were hand-written and had
     drifted to a different scrape than the file sitting next to them. */
  "build-data-page.mjs",
  /* After every generator that writes a page head, because it is the authority
     on which pages declare themselves adult. Run it earlier and a later
     generator silently re-labels its own output. */
  "build-adult-labels.mjs",
  /* After every page generator and after the labels, because it reads the
     rendered headings — a generator that runs later would emit questions this
     never saw, and the markup would silently describe an older page. */
  "build-faq-schema.mjs",
  /* After every page generator, for the same reason as the labels: the
     generators emit .html self-references, and Cloudflare Pages 308s those
     to the extensionless path. Running last means a template nobody
     remembered to update cannot reintroduce a redirecting canonical. */
  "normalize-urls.mjs",
  "match-models.mjs",
  "build-compare.mjs",
  "build-sitemap.mjs",
  "build-search-index.mjs",
  "build-mcp-discovery.mjs",
  "build-llms.mjs",
  "build-feed.mjs",
  /* Last: it compares the snapshots the rest of the run just refreshed, and
     it retunes the crawl pacing the NEXT scrape will read. */
  "detect-trends.mjs",
];

/* ---- 2. gates. Nothing publishes if one of these fails ---- */
const GATES = [
  "test-classify.mjs",
  "test-categories.mjs",
  "test-match-models.mjs",
  "test-published-claims.mjs",
  "audit-claims.mjs",
  /* The 18+ gate must cover every page, and the SafeSearch label must not
     drift back onto the dataset and the endpoint. Both fail silently. */
  "test-adult-labels.mjs",
  /* Disallow + noindex cancel out, and the pair had put the only three URLs
     Bing indexed for this domain into the index — the three we told it not to. */
  "test-robots.mjs",
  /* Structured data is quoted somewhere we cannot correct, so markup that
     drifts from the visible page is worse than no markup at all. */
  "test-faq-schema.mjs",
  /* This run's whole output reaches the branch through one `git add`. When
     that call silently stages nothing, the report still says everything
     regenerated — which is exactly what happened on every run of this
     workflow until now. */
  "test-commit-generated.sh",
];

const failures = [];

if (!REPORT_ONLY) {
  line("=== regenerating from current data ===");
  for (const g of GENERATORS) {
    const r = run(g);
    const summary = (r.out || "").trim().split("\n").filter(Boolean).slice(-1)[0] || "(no output)";
    line(`  ${r.ok ? "ok  " : "FAIL"} ${g.padEnd(26)} ${summary.slice(0, 96)}`);
    if (!r.ok) failures.push({ what: g, out: r.out });
  }

  line("\n=== gates ===");
  for (const g of GATES) {
    const r = run(g, { gate: true });
    const last = (r.out || "").trim().split("\n").filter(Boolean).slice(-1)[0] || "";
    line(`  ${r.ok ? "ok  " : "FAIL"} ${g.padEnd(26)} ${last.slice(0, 96)}`);
    if (!r.ok) failures.push({ what: g, out: r.out, gate: true });
  }
}

/* ---- 3. what is one step away ---- */
line("\n=== what the data would publish next ===");

/* Categories qualify or are refused on their own now, so the report shows the
   failing test by name rather than a yes/no. */
const cat = run("build-category-pages.mjs");
for (const l of (cat.out || "").split("\n")) {
  if (/^\s{2}\w|^\s{6}·/.test(l)) line("  " + l.trim().replace(/^·/, "· "));
}

const MIN_SAMPLE = 10;
const data = JSON.parse(readFileSync("data/doll-specs.json", "utf8"));
const full = data.rows.filter((r) => !r.isPartialBody && r.weightLb && r.heightCm);
const byHeight = new Map();
for (const r of full) byHeight.set(r.heightCm, (byHeight.get(r.heightCm) || 0) + 1);

const nearMiss = [...byHeight.entries()]
  .filter(([, n]) => n < MIN_SAMPLE)
  .sort((a, b) => b[1] - a[1]);

if (nearMiss.length) {
  line(`  Heights with a page: ${[...byHeight.entries()].filter(([, n]) => n >= MIN_SAMPLE).map(([h, n]) => `${h}cm (n=${n})`).join(", ") || "none"}`);
  line(`  Heights waiting on sample (need ${MIN_SAMPLE}):`);
  for (const [h, n] of nearMiss) line(`      ${h}cm — n=${n}, needs ${MIN_SAMPLE - n} more listing(s)`);
  line(`  These appear on their own once the weekly scrape reaches enough of them.`);
} else {
  line("  Every recorded height already has a page.");
}

/* Comparison is the differentiator, so its blockers are reported by name
   rather than folded into a pass/fail. */
if (existsSync("content/model-matches.json")) {
  const cmp = run("build-compare.mjs");
  const refusals = (cmp.out || "").split("\n").filter((l) => l.includes("·")).map((l) => l.trim());
  const matchedLine = (cmp.out || "").split("\n").find((l) => l.startsWith("Matched models:")) || "";
  const publishableLine = (cmp.out || "").split("\n").find((l) => l.startsWith("Publishable after gates:")) || "";
  line(`\n  Cross-distributor comparison — ${matchedLine.trim()}, ${publishableLine.trim()}`);
  if (refusals.length) {
    line("  Blocked by:");
    for (const r of [...new Set(refusals)]) line(`      ${r}`);
  }
}

/* Time-series claims need dates, not louder single observations. */
const hist = run("price-history.mjs");
const verdicts = (hist.out || "").split("\n").filter((l) => l.includes("VERDICT")).map((l) => l.trim());
if (verdicts.length) {
  line("\n  Price-history claims:");
  for (const v of verdicts) line(`      ${v.replace(/\s+/g, " ").slice(0, 150)}`);
}

/* ---- 4. what no amount of automation will do ---- */
line("\n=== needs a human, and cannot be automated away ===");
line("  · Search Console submission — until then this grows toward what we can");
line("    PROVE, not toward what people actually search for. That is the single");
line("    biggest limit on this pipeline and no script removes it.");
line("  · The brand collision (dollscout.com) — a rename is not ours to make.");
line("  · Outreach. We never post to communities; that is the owner's, as a human.");

if (failures.length) {
  line(`\n${failures.length} step(s) failed:`);
  for (const f of failures) {
    line(`\n--- ${f.what}${f.gate ? " (GATE)" : ""} ---`);
    line((f.out || "").trim().split("\n").slice(-14).join("\n"));
  }
  line("\nNothing should be committed from this run.");
  process.exit(1);
}

line("\nAll generators and gates passed. Anything newly generated is safe to publish.");

/* Owner actions go out only after the gates pass. Notifying about a run that
   should not ship would be asking someone to act on numbers we just refused
   to publish. */
const notified = run("notify-telegram.mjs");
line("");
for (const l of (notified.out || "").trim().split("\n").slice(0, 6)) line("  " + l);

/* A machine-readable trace, so a run can be compared with the previous one
   rather than re-read by eye. */
writeFileSync(
  "content/grow-status.json",
  JSON.stringify(
    {
      recorded: data.recorded,
      heightsWithPage: [...byHeight.entries()].filter(([, n]) => n >= MIN_SAMPLE).map(([h, n]) => ({ heightCm: h, n })),
      heightsWaiting: nearMiss.map(([h, n]) => ({ heightCm: h, n, needs: MIN_SAMPLE - n })),
      blockedOnOwner: ["search-console-submission", "brand-collision-decision", "human-outreach"],
    },
    null,
    2
  ) + "\n"
);
