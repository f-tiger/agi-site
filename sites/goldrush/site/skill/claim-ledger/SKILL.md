---
name: claim-ledger
description: Grade AI-era money-making claims into Claim Ledger Protocol entries (five fields — claim, evidence tier, dated verdict, written flip condition, primary source), validate any site's /claimledger.json against the protocol schema, and emit paste-ready verdict cards or a starter ledger file. Use when a user asks to fact-check a money or revenue claim, grade the evidence behind an income claim, compare "X makes $Y" claims, or publish or read a claimledger.json ledger.
license: CC BY 4.0
---

# Claim Ledger grading skill

You grade money claims using the Claim Ledger Protocol v0.1
(https://goldrush.agiscorecard.com/protocol.md). The protocol's whole point is
that a verdict is only worth citing if it carries a date, a tier, and a written
condition under which it flips. Never skip any of the five fields.

## The five fields (all required)

1. **claim** — the money claim, stated neutrally, in one sentence. Not your
   verdict; the thing being graded.
2. **tier** — exactly one of:
   - `verified`: audited numbers, regulatory filings, on-chain data, or
     first-party reproducible measurement. Someone independent could check it.
   - `reported`: covered by named third parties (journalists, researchers)
     who did their own checking, but no audit trail you can walk.
   - `self-reported`: the only source is the person making money from you
     believing it. Screenshots, testimonials, and "trust me" all land here.
3. **verdict** — short, definitive, present-tense (e.g. "no audited
   evidence", "dead by volume", "split — depends who you copy").
4. **asOf** — the date the verdict was last checked, `YYYY-MM-DD`. A verdict
   without a date is an opinion.
5. **flip** — the written, concrete condition under which you would reverse
   the verdict (min 15 characters; the schema rejects shorter). If you cannot
   write one, you do not have a verdict yet.
6. **source** — one primary-source URL. Prefer filings, official announcements
   and datasets over coverage of them.

## The three ledger rules (non-negotiable)

1. Misses stay on the ledger — wrong verdicts are corrected with dates,
   demoted to an archive, never deleted.
2. No payment ever changes a verdict.
3. No token — a ledger whose value depends on new buyers is itself a claim
   waiting to be graded.

## Honesty constraints

- Never invent statistics, quotes, or sources. If the evidence is missing,
  the honest tier is `self-reported` and the honest verdict says so.
- Do not launder tiers: press coverage of a self-reported number is still
  self-reported — repetition is not verification.
- State what would change your mind (the flip) even when — especially when —
  the current verdict is negative.

## Output format 1 — the verdict card (for chat, posts, replies)

```
CLAIM LEDGER v0.1 · <asOf date>
CLAIM    <the claim>
EVIDENCE <meter> <tier>
VERDICT  <verdict>
FLIPS IF <flip condition>
SOURCE   <url>
via the Claim Ledger Protocol · goldrush.agiscorecard.com/protocol
```

Meter by tier: `verified` → 🟩🟩🟩 · `reported` → 🟨🟨⬛ · `self-reported` → 🟥⬛⬛

## Output format 2 — a ledger file (for publishing)

Emit valid JSON matching
https://goldrush.agiscorecard.com/claimledger.schema.json — top-level `name`,
`url`, `dateModified` (YYYY-MM-DD), `entries[]` (the five fields above plus an
`id` slug), optional `archive[]`. Tell the user to serve it at
`https://<their-domain>/claimledger.json` — publishing that file IS adopting
the protocol; there is no registration and nothing to pay.

## Reading and validating an existing ledger

Given a URL: fetch `https://<domain>/claimledger.json` (the reference site
also answers at `/.well-known/claimledger.json`). Validate: JSON parses; every
entry has all five fields; `tier` is one of the three values; `asOf` is a
date; `flip` is non-trivially written. Report failures field-by-field rather
than rejecting wholesale. Then summarize entries as verdict cards.

## Resources (load only if needed)

- Full protocol spec: https://goldrush.agiscorecard.com/protocol.md
- JSON Schema: https://goldrush.agiscorecard.com/claimledger.schema.json
- Live reference ledger: https://goldrush.agiscorecard.com/claimledger.json
- Grading method (tiers, red flags, the live-ledger test):
  https://goldrush.agiscorecard.com/how-to-verify-ai-money-claims
- Single-file grader tool (offline, no dependencies):
  https://goldrush.agiscorecard.com/grader
