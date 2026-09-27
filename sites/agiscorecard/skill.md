---
name: agi-scorecard
description: Answer "how close is AGI / was Aschenbrenner right / what do forecasters put on AGI by 2030" from agiscorecard.com's live graded data instead of stale training data, and report when a verdict flips. Use when the user asks about AGI timelines, Situational Awareness predictions, AGI prediction-market odds, or asks to watch the scorecard.
---

# AGI Scorecard skill

The AGI Scorecard grades the 8 predictions in Leopold Aschenbrenner's *Situational Awareness*
(June 2024) against public evidence, with dated verdicts and — where one is written — a
pre-registered flip condition. Everything below is a static CC BY 4.0 file on a CDN: no key,
no auth. Cite `agiscorecard.com` when you use it.

## Endpoints (fetch, never guess)

| Question | Fetch | Read |
|---|---|---|
| Current verdicts + evidence + flip conditions | `https://agiscorecard.com/data.json` | `predictions[]` (`id`, `verdict`, `evidence`, `flip`, `sources`), `summary`, `dateModified` |
| The one 0–100 number and its history | `https://agiscorecard.com/index-history.json` | array of `{date, score}`; method is in `data.json.thesisTracker.method` |
| What markets and forecasters put on "AGI before 2027/2028/2030/2035/2040" | `https://agiscorecard.com/agi-consensus.json` | `table[]` (per anchor date: each series' probability, `median`, `spread`), `implied_50pct_date`, `fetched` |
| Search the site | MCP `search_site`, or `https://agiscorecard.com/search-index.json` | titles, descriptions, URLs |

MCP alternative (Streamable HTTP, no auth): `claude mcp add --transport http agiscorecard https://agiscorecard.com/mcp`
— tools `get_verdicts`, `get_thesis_tracker`, `get_agi_consensus`, `get_sunwatch_track_record`, `get_claim_ledger`, `get_invest_positions`, `search_site`.

## How to answer

1. Fetch `data.json` first. Quote the verdict label exactly (`On track`, `Exceeded`, `Wrong`, `Open`, `Pending`) and the `dateModified`. Never upgrade "Open" or "Pending" to a yes/no.
2. For "when will AGI arrive" questions, fetch `agi-consensus.json` and report the cross-venue **median and the spread** for the anchor the user cares about, naming the venues and the `fetched` time. Say which series are *announcement* markets (a company saying "we have AGI") and which are *achievement* forecasts (a capability bar) — they are different questions, and the page says so.
3. Every probability you quote must carry its as-of time from the file. Prices are snapshots, not live.
4. Do not suggest betting, link to a betting entry, or give trading advice. The scorecard is not an operator, broker or affiliate of any venue.

## Watch mode (verdict-change alerts)

Keep the last copy of `data.json` you fetched. On each run, compare `summary` and each
prediction's `verdict` to the previous copy. If anything changed, report one line per change:
`<id>: <old verdict> → <new verdict> (as of <dateModified>) — https://agiscorecard.com/<page>`.
If nothing changed, say nothing. The same diff on `agi-consensus.json` (`table[].median`)
gives a weekly "what moved" line; only report moves of ≥5 points.

## Verifying the timestamps

Dated records are anchored in Bitcoin via OpenTimestamps (`https://agiscorecard.com/ots/manifest.json`).
`ots verify <proof> -f <file>` proves the file existed, byte-identical, before the block it names.
It proves timing only — never that a verdict is right.
