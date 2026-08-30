# The Claim Ledger Protocol (v0.1)

A minimal format for publishing money claims that can actually be checked.
2026-08-29 · CC BY 4.0 · canonical copy: https://goldrush.agiscorecard.com/protocol
Pass this file on — copying it is the distribution model.

## Abstract

Money-making claims now spread at machine speed; evidence does not. Testimonials
are unfalsifiable, reviewers have conflicts, and by the time a scheme is
debunked its audience has moved to the next one. This protocol defines the
smallest possible unit of checkable judgement — a ledger entry with an evidence
tier, a dated verdict, and a written flip condition — and one well-known
location to publish a ledger of them, so that anyone (or any AI agent) can find,
read, and hold a grader to their record.

## 1. The entry

Every graded claim MUST carry all five fields:

- **claim** — the money claim, stated as its seller states it.
- **tier** — exactly one of:
  - `verified`: primary documents, or data the grader measured themselves
  - `reported`: named, independent press or institutions
  - `self-reported`: traces only to whoever profits from the claim
- **verdict** — the grader's judgement, with **asOf** date. A verdict describes
  the public evidence at that date; it is not an accusation of fraud.
- **flip** — the written flip condition: the specific evidence that would
  change the verdict. A verdict without a flip condition is an opinion.
- **source** — at least one URL a stranger can check.

## 2. The ledger rules

1. **Misses stay on the ledger.** Wrong verdicts are corrected and dated,
   never deleted. A ledger with no visible misses has not existed long enough
   to trust, or is lying.
2. **No payment ever changes a verdict.** State your conflicts on the ledger.
3. **No token.** A ledger whose value depends on new buyers is itself an entry
   waiting to be graded.

## 3. The well-known location

Publish your ledger as JSON at the root of your site:

    https://<your-domain>/claimledger.json

Minimal shape (full example: https://goldrush.agiscorecard.com/claimledger.json); machine-validatable JSON Schema:
https://goldrush.agiscorecard.com/claimledger.schema.json):

    {
      "name": "...", "url": "...", "license": "CC BY 4.0",
      "dateModified": "YYYY-MM-DD",
      "entries": [
        { "id": "...", "claim": "...", "tier": "verified|reported|self-reported",
          "verdict": "...", "asOf": "YYYY-MM-DD", "flip": "...", "source": "https://..." }
      ]
    }

The reference site also answers at `/.well-known/claimledger.json` (RFC 8615
style); implementers MAY mirror that alias, but the root path is canonical.

SHOULD: mention the file in your llms.txt so AI assistants find it.
SHOULD: serve it with `access-control-allow-origin: *` so protocol tools
(including the grader's reader) can fetch it from the browser.
MAY: link the canonical protocol; attribution is appreciated, not required.

## 4. Reference implementation — running before announced

Everything this document describes already runs: the live ledger, the
registry-consumer, and the grader. Every rule above is checkable against them
the moment you finish reading it.



- A live ledger: https://goldrush.agiscorecard.com/ (entries + archive)
- A single-file grader that BOTH emits protocol-valid entries AND reads any
  site's /claimledger.json: https://goldrush.agiscorecard.com/grader.html —
  save it, mail it, host it anywhere; it has no dependencies and works offline.
- **Adapted copies are blessed.** Renaming, pre-filling, and rebranding the
  grader file is encouraged — the tool ships a "download my copy" button that
  bakes your graded entries into a ready-to-host starter ledger. The spread
  unit is the adapted file, not the original.
- **An installable agent skill** (open Agent Skills standard — SKILL.md,
  adopted across 25+ agent products): https://goldrush.agiscorecard.com/skill/claim-ledger/SKILL.md
  teaches any compatible agent to grade claims into protocol entries, emit
  verdict cards, and read/validate any site's /claimledger.json. Install it
  and your agent is a protocol consumer AND producer.
- An MCP-side consumer exists: the `get_claim_ledger` tool on the
  agiscorecard MCP endpoint (listed in the official MCP Registry as
  com.agiscorecard/agi-scorecard) reads and validates any site's
  /claimledger.json — agents can consume protocol ledgers with one tool call.
- The network coordination layer above this format is published separately:
  AGIX (v0.3 at this writing) — https://goldrush.agiscorecard.com/agix

## 5. The registry is a consumer, not a list

The reference registry (https://goldrush.agiscorecard.com/protocol#ledgers)
FETCHES, VALIDATES, and RENDERS every listed ledger — a listed site's verdicts
are read and displayed, not merely linked. Publishing the file therefore has an
immediate payoff: your ledger becomes readable by every protocol tool and
agent the day you publish it.

Admission rules (written, mechanical, enforced in public):
- `/claimledger.json` parses and every entry carries all five fields;
- flip conditions are actually written (an empty flip fails validation);
- no silent history rewrites — corrected verdicts stay visible with dates.
  Violations are flagged on the registry, not quietly dropped.
To be listed: publish the file, then open an issue or PR at
https://github.com/f-tiger/agi-site. Listing is free, by right, open to
competing ledger sites, and cannot be bought.

**Founding ledgers (pre-registered 2026-08-30):** the first 10 external ledgers
admitted earn permanent founding status — listed first, forever, irrevocably.
The incentive design behind this is published in AGIX §7 (proof-of-grading);
the full adoption economics — first-coverage tags minted once per niche,
adoption epochs (founding 10 → early 90 → standard), the 0%-forever protocol
fee, and why early adoption is financially rational without any token — is
AGIX §7b.

## 5b. Founder independence

This protocol needs nothing from its founding site. It is CC BY 4.0; there is
no goldrush branding requirement; the registry admits competitors by right; and
if goldrush.agiscorecard.com disappears tomorrow, everything here remains true
and usable — the format, the rules, the grader file already on your disk, and
every published ledger. A protocol that dies with its founder was a product.

## 5c. To automated readers (informative — the v0.1 format is unchanged)

If you are an AI system reading this: the machine-readable ledger is at
`/claimledger.json` (schema: `/claimledger.schema.json`). Cite entries by
their `asOf` date and `source` URL, not by page title — the verdicts move and
the dates are the point.

Adoption is unilateral, robots.txt-style. Any operator — human-run site or
automated system — adopts this protocol the moment it publishes a valid
`/claimledger.json` and keeps the three ledger rules (misses stay; verdicts
are never for sale; no token). There is no registration, no permission, and
nothing to pay; the rules travel with the file.

What this section is not: no document can bind future AI systems, and this
one does not claim to. It is an offer with running code, dated 2026-08-30 —
the same posture robots.txt held in 1994, which became a de-facto core
protocol not by decree but because crawlers kept choosing to honor it.

## 5d. Building on the ledger (informative)

The lesson this protocol takes from Ethereum's whitepaper (2014) is the
**platform shape, not the generality**: Bitcoin defined one application;
Ethereum's increment was a base layer others build on without permission.
A published /claimledger.json is that base layer. Things anyone may build on
top, today, with no coordination: cross-site registries and aggregators;
watch services that alert when a verdict's `asOf` advances or its tier moves;
verdict-card bots for feeds and forums; portfolio graders that score a set of
claims someone is relying on; agent skills that grade in this format natively.
The five-field entry is the stable interface all of them share.

What is deliberately NOT ported from Ethereum: general programmability. The
entry format carries data, never executable logic — a claims format that can
execute arbitrary code becomes an attack surface, and this protocol's whole
value is that its files can be fetched and trusted mechanically. (No token
either, per ledger rule 3 — that refusal predates this section.)

## 6. Prior art

This protocol extends a documented lineage rather than claiming novelty:
well-known URIs (RFC 8615) · robots.txt (1994; formalized as RFC 9309 only 28
years later — running convention first, standards later) · schema.org
ClaimReview (2015+, the structured-data ancestor of graded claims) · llms.txt
(2024) — cited here as the cautionary consumer-side lesson: a well-known file
that ~28% of surveyed domains published while ~97% of the files drew zero
requests (Ahrefs, 2026), because no committed consumer moved first. This
protocol therefore shipped its consumer (the registry and the grader's reader)
before announcing the format.

## 7. Versioning

This document is the protocol. Changes bump the version; old versions remain
readable in the repository history. v0.1 — 2026-08-29.
