# Metaculus point-in-time forecast ledger

Written by `.github/workflows/metaculus-bot.yml` after each published run (code: `tools/metaculus-bot/ledger.py`).

- `forecasts.jsonl`: one line per forecast submitted to Metaculus FutureEval. Public fields are the question id, tournament, submission time, question kind, whether the agiscorecard house prior was used, and whether a shadow forecast was logged. The probability and the shadow (no-house-prior) probability are sealed and carry a sha256 digest, so they are fixed before the question closes and revealed only after it closes (`tools/fleet/metaculus_record.py`).
- `runs.jsonl`: one line per run with LLM spend and counts. It feeds the daily spend ceiling.

Nothing here is a trading signal or advice. The bot competes in a bot-only tournament; prize amounts are reported by the owner, never inferred.
