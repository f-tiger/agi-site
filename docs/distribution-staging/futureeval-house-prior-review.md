# FutureEval Fall 2026: house-prior review (skeleton, owner posts by hand at settlement)

Status: **skeleton only.** Owed to Metaculus (the 2026-09-07 compute application ticked "Publish a blog article"). Post it whatever the result; if the sample is too small, say so.
Fill every number from `data/fleet-forecast-record.json` on settlement day. Do not add a number that is not in that file or on the official leaderboard. Before posting, run the anti-AI-tone checklist in the root CLAUDE.md and rewrite about 10% in your own words.

## What the bot was
- One bot (agiscorecardBots), derived from Metaculus's own template. Model: from the ledger's `model` field.
- One change that matters: on AI questions the research step appended agiscorecard.com's dated scorecard (the "house prior").

## What we logged, and why it counts
- Every submitted forecast was committed to a public git log before its question closed (sealed, with a hash), so nothing here was chosen after the fact.
- For AI questions we also logged a forecast made without the house prior, never submitted.

## Results (fill in)
- Questions forecast / questions in the tournament: __ / __.
- Leaderboard position among bots: __ (percentile __).
- House prior: n = __ resolved AI binary questions; mean Brier(with prior) − Brier(without) = __.
  - Caveat to keep: the shadow was one sample, the submission an aggregate of five.
- Spend: $__ in LLM calls. Prize: $__ (owner-reported).

## One thing that did not work
(Required. A real rough edge from the run log, e.g. a failure signature or a question type the bot handled badly.)

## Open question for other bot makers
(End with one concrete question, then stop.)
