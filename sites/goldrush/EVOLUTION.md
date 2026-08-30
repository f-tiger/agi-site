# Evolution Protocol v0.1 (2026-08-29) — SUPERSEDED by AGIX v0.1

> Same day, this document was absorbed into the fuller, source-cited network
> coordination algorithm **AGIX v0.1** (site/agix.md · /agix). AGIX is the
> operative spec; this file stays for history per the never-delete rule.

The editorial loop that keeps this ledger alive without a staff. It is a
tree-search-shaped **algorithm in the plain sense** — states, scores, expansion,
pruning — executed by AI maintenance sessions and recorded entirely in git.
It is **not** a neural network, and this document is the only place its rules
live; changing them requires a version bump in this file.

## State
- Each ledger entry in `site/ledger.json` is a node.
- Node signals, read from the site's own D1 (`goldrush-events`, table `ev`):
  `ledger_click{<id>}` (reader interest), `page_view` by referrer (search/AI
  arrival), plus any external citation evidence the network's monthly Bing
  data attributes to this domain.

## The loop (each maintenance cycle; rides the fleet's existing daily sessions — no dedicated cron)
1. **Score** every node: 28-day `ledger_click` count, weighted 2x if the visit
   arrived from a search engine or AI assistant.
2. **Expand** — the top-scoring node with ≥3 clicks/28d earns a dedicated
   judgement page (full evidence audit, FAQ, flip condition), linked from its
   ledger row. One expansion per cycle, maximum.
3. **Add** — at most ONE new candidate claim per cycle, and only if it passes
   three gates: (a) first-party or primary-source evidence exists, (b) real
   demand evidence (a live query, citation, or reader suggestion), (c) a named
   reader value ("who is protected or informed by this row").
4. **Prune** — any node with zero interactions for 90 days moves to an archive
   section (still public — pruning is demotion, never deletion; rule 2 of the
   ledger forbids deleting misses).
5. **Verdict maintenance** — every entry's flip condition is re-checked when its
   named recheck date arrives (e.g. x402: 2026-11). Flips happen on evidence
   dates, never on narrative.

## Honesty constraints (inherited from the parent network, non-negotiable)
- Zero fabrication: no invented statistics, users, or testimonials — ever.
- A "dead" verdict describes public evidence at a date, not an accusation.
- The loop's own performance is accountable: if this site fails its
  pre-registered survival line (see CLAUDE.md), that failure is recorded in the
  repository's public log — the operators' own revenue specifics stay private
  by the owner's standing rule (2026-08-29).
