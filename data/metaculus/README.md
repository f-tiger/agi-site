# Metaculus point-in-time forecast ledger

Written by `.github/workflows/metaculus-bot.yml` after each published run (code: `tools/metaculus-bot/ledger.py`).

- `forecasts.jsonl`: one line per forecast submitted to Metaculus FutureEval. Append-only. The probability and the shadow (no-house-prior) probability are sealed and carry a sha256 digest, so they are fixed before the question closes. They are opened only after the question closes, and today only by the key holder (see "What exists today").
- `runs.jsonl`: one line per run with LLM spend and counts. It feeds the daily spend ceiling.

Nothing here is a trading signal or advice. The bot competes in a bot-only tournament; prize amounts are reported by the owner, never inferred.

## What a forecast line commits to (`commit_v: 2`)

**Public** (readable by anyone, including rival bots, while the question is open): `question_id`, `post_id`, `tournament`, `kind`, `submitted_at`, `date`, `house_prior_used`, `shadow_logged`, `model`, `run_id`, `commit`, `commit_v`, `digest`, and, when a key exists, `sealed` + `key_id`.

**Sealed**: a JSON object with `question_id`, `prediction`, `shadow_no_prior`, `page_url`, `submitted_at` and `nonce` (64 hex characters from `secrets.token_hex(32)`, fresh for every line). It is encrypted with Fernet under a key derived from `METACULUS_TOKEN`. The Fernet plaintext is space-padded to a multiple of 512 bytes, so the ciphertext length is the same for "0.4" and "0.3712".

**Digest** = `sha256(canonical(sealed object))`, where canonical is `json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))`, UTF-8 encoded.

A commitment has to *bind* (the forecast cannot be changed afterwards) and *hide* (the forecast cannot be read before close). The digest binds either way. Before commit_v 2 it did not hide: the sealed object had no nonce, every field except the two probabilities is public or derivable (`page_url` comes from `post_id`), and the bot's binary answer is an integer percent clamped to 1..99. Guessing every percent × (no shadow or every percent) and hashing each guess finds the line. Measured on 2026-09-27 against the pre-fix `ledger.py`: a line with p = 0.37 and shadow = 0.42 came back after 3 643 guesses in 0.014 s. The digest that was meant to prove "fixed before close" also published the forecast. With the nonce, the same 9 900 guesses find nothing, because the attacker would also have to guess 256 random bits. `tools/metaculus-bot/test_ledger.py` runs both attacks: it must fail on a v2 line and must succeed on the same line rebuilt without the nonce, so the test can go red. The bot had not run live when this changed, so no v1 line exists.

The digest binds the bytes, not the line they are filed under. So opening a line (`ledger.unseal_text()`) also requires the opened object's `question_id` and `submitted_at` to equal the public line's. Otherwise a `sealed` + `digest` pair copied from another line would open, verify, and be scored under the wrong question.

## Public logs

The Actions logs of this public repo are world-readable too. In `main.py`:

- Research, reasoning and forecast values are logged only as `[sealed: N chars]`. The binary value is formatted at fixed width first, so N carries nothing.
- forecasting-tools' own logger is set to WARNING. Its value validators (`forecasting_tools.data_models.*`, e.g. the binary clamp that warns from one line below 0.001 and from another above 0.999) are dropped entirely. Every other forecasting-tools line is reduced to its level: `WARNING forecasting_tools: [library log sealed]`, with no module, line number, length or traceback.
- The library's report summary is skipped, because it prints every prediction.
- A failed question is reported by URL, exception type and HTTP status only, e.g. `ExceptionGroup → litellm.BadRequestError(400)` or `ExceptionGroup → ValueError×5`, never by message: messages can quote a parsed sample. `failure_signature` in `runs.jsonl` is built the same way (e.g. `ExceptionGroup>litellm.BadRequestError(400)`).

An AST gate in `test_ledger.py` fails on any log or print call that passes those values outside `redact()`. `BOT_LOG_PLAINTEXT=1` turns all of this off, for a private runner only. The workflow does not set it.

## What exists today, and what does not

**Exists.** `tools/fleet/metaculus_record.py` opens a sealed line only when the question's close time has passed and it has resolved, and only to score it. For resolved binary questions where the house prior was used, the submitted and shadow probabilities and their Brier scores are published in `data/fleet-forecast-record.json` (`house_prior.rows`). The time evidence for a forecast line is the git commit that added it, plus Metaculus's own record of the submitted forecast.

**Not built yet (planned; do not cite as existing):**

- a public file with the exact opened plaintext, nonce included, so anyone can re-hash it against the committed `digest` without our key;
- a script that checks such reveals against `forecasts.jsonl`;
- OpenTimestamps anchoring of `forecasts.jsonl`. `tools/fleet/ots_anchor.py` does not stamp this file.

Until those exist, only the key holder can check a line against its digest. The published scores in `fleet-forecast-record.json` are our statement of what was sealed, not something a third party can verify byte for byte.
