#!/usr/bin/env node
// /fetchlog.json is computed from D1 on every read (2026-09-22). This test pins the pure
// summariser and the SQL definitions, zero network, zero D1.
//
// Why it exists: the file promised "updated as it moves" and then sat at 0 for 22 days while
// the true count reached 31; three static pages repeated the stale zero to AI readers. The
// 2026-11-30 adoption line is settled on this exact query, so the definition must not drift:
// widening it (dropping an exclusion) manufactures adoption, narrowing it hides it, and both
// look fine on the page. Run: node tools/test_fetchlog.mjs
import { summarizeFetchlog, FETCHLOG_SQL_CLASSES, FETCHLOG_SQL_EVIDENCE } from "../worker.js";

let bad = 0;
const ck = (cond, msg) => { if (!cond) { console.error(`❌ ${msg}`); bad++; } };

const TEMPLATE = {
  name: "Claim Ledger Protocol — consumption log",
  definitions: { outside_fetches_of_our_claimledger: "…" },
  counts: { ledgers_listed: 1, ledgers_validating: 1, outside_fetches_of_our_claimledger: 31, as_of: "2026-09-22", period: "site lifetime (from 2026-08-29)" },
  consumption_evidence: { mcp_get_claim_ledger_calls_lifetime: 4, note: "Fetches are not use." },
  history: [{ as_of: "2026-08-31", outside_fetches_of_our_claimledger: 0 }],
  live: false
};

// ── 1. the real 2026-09-22 shape ─────────────────────────────────────────
const real = summarizeFetchlog(TEMPLATE, [{ ua_class: "bot", n: 22 }, { ua_class: "human", n: 9 }], [{ name: "fork_click", n: 1 }], "2026-09-22");
ck(real.live === true, "live reading must say live:true");
ck(real.counts.outside_fetches_of_our_claimledger === 31, `outside should be 31, got ${real.counts.outside_fetches_of_our_claimledger}`);
ck(real.counts.outside_fetches_crawler_ua === 22 && real.counts.outside_fetches_browser_ua === 9 && real.counts.outside_fetches_other_ua === 0, "crawler/browser/other split");
ck(real.counts.as_of === "2026-09-22" && real.dateModified === "2026-09-22", "as_of and dateModified are the read date, never the template's");
ck(real.counts.ledgers_listed === 1 && real.counts.ledgers_validating === 1, "registry counts come from the template (D1 cannot see them)");
ck(real.consumption_evidence.fork_click_lifetime === 1 && real.consumption_evidence.ledger_click_lifetime === 0, "evidence rows map onto *_lifetime fields, missing names read 0");
ck(real.consumption_evidence.mcp_get_claim_ledger_calls_lifetime === 4 && real.consumption_evidence.static_snapshot_as_of === "2026-09-22", "the one number this D1 cannot see is carried from the static snapshot with its date");
ck(real.definitions && real.history && real.history.length === 1, "definitions and history are preserved from the template");

// ── 2. every UA class is counted exactly once (the sum invariant) ─────────
const mixed = summarizeFetchlog(TEMPLATE, [{ ua_class: "bot", n: 5 }, { ua_class: "human", n: 2 }, { ua_class: "other", n: 3 }, { ua_class: "none", n: 1 }, { ua_class: "", n: 4 }], [], "2026-10-01");
ck(mixed.counts.outside_fetches_of_our_claimledger === 15, `all classes count: expected 15, got ${mixed.counts.outside_fetches_of_our_claimledger}`);
ck(mixed.counts.outside_fetches_other_ua === 8, `other/none/'' fold into other_ua (8), got ${mixed.counts.outside_fetches_other_ua}`);
for (let i = 0; i < 50; i++) {
  const rows = ["bot", "human", "other", "none", ""].map((c) => ({ ua_class: c, n: Math.floor(Math.random() * 40) }));
  const r = summarizeFetchlog(TEMPLATE, rows, [], "2026-10-01").counts;
  ck(r.outside_fetches_of_our_claimledger === r.outside_fetches_crawler_ua + r.outside_fetches_browser_ua + r.outside_fetches_other_ua, "headline must equal the sum of its three parts");
}

// ── 3. zero is a valid reading, not an error ─────────────────────────────
const zero = summarizeFetchlog(TEMPLATE, [], [], "2026-09-01");
ck(zero.live === true && zero.counts.outside_fetches_of_our_claimledger === 0, "no rows → 0 with live:true (that is how 2026-08-31 looked, and it was true)");

// ── 4. malformed input never throws and never leaks NaN ──────────────────
let threw = false;
try {
  const m = summarizeFetchlog(null, [null, { ua_class: "bot" }, { ua_class: "human", n: "x" }, "junk"], [undefined, { name: "ledger_render" }], "2026-09-22");
  ck(Number.isInteger(m.counts.outside_fetches_of_our_claimledger), "counts are integers even when rows are junk");
  ck(!JSON.stringify(m).includes("NaN"), "no NaN anywhere in the body");
  ck(m.consumption_evidence.mcp_get_claim_ledger_calls_lifetime === null, "missing static number reads null, never 0 (0 would be a claim)");
} catch (e) { threw = true; }
ck(!threw, "summariser must not throw on malformed rows — the endpoint would 500 and the live number would vanish");

// ── 5. the SQL definitions carry all three exclusions, verbatim ──────────
ck(FETCHLOG_SQL_CLASSES.includes("path='/claimledger.json'"), "SQL must count the canonical protocol path only");
ck(FETCHLOG_SQL_CLASSES.includes("NOT LIKE '%goldrush.agiscorecard.com%'"), "exclusion (a): our own registry page's fetches");
ck(FETCHLOG_SQL_CLASSES.includes("day='2026-08-30' AND ua_class='none'"), "exclusion (c): the one MCP self-fetch before it tagged itself — by date+class, nothing wider");
ck(FETCHLOG_SQL_EVIDENCE.includes("name='ledger_render' AND label NOT LIKE '%goldrush.agiscorecard.com%'"), "registry renders of OUR ledger are not external consumption");

if (bad) { console.error(`\ntest_fetchlog: ${bad} failed`); process.exit(1); }
console.log("✅ test_fetchlog: live summary shape, sum invariant (50 fuzz), zero-is-valid, junk-safe, SQL exclusions pinned");
