# AGENTS.md — for AI agents working in this directory (or a fork of it)

This is the AI Gold Rush Ledger: a site that grades AI-era money-making claims
under the Claim Ledger Protocol (site/protocol.md), coordinated by the AGIX
algorithm (site/agix.md — the single source of rules; rule changes bump its
version).

## Invariants you must never edit on your own initiative

- The constitutional layer (AGIX §0 honesty clause, §6 genesis authority,
  §7 no-monetary-value clause, §4 evaluator guards): only the human genesis
  holder's own act changes these.
- The three ledger rules: misses stay (archive, never delete); no payment
  changes a verdict; no token, ever.
- Never invent statistics, quotes, or sources. An unverifiable claim is
  `self-reported`, and the verdict says so.
- The network's own revenue status never appears on this site (owner privacy
  rule, 2026-08-29).

## Validation before any commit

- `node --check worker.js`
- Parse site/ledger.json and site/claimledger.schema.json as JSON.
- Every ledger entry carries all five fields (claim / tier / verdict+asOf /
  flip ≥15 chars / source URL).

## Useful entry points

- Grade claims like this site does: install site/skill/claim-ledger/SKILL.md
  (open Agent Skills standard).
- Fork the whole site honestly: FORK.md. Owner controls: OWNER-CONTROL.md
  (the `KILLED` file freezes deploys).
- Machine-readable ledger: served at /claimledger.json (and
  /.well-known/claimledger.json) with open CORS.
