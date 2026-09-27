# Metaculus point-in-time forecast ledger

Written by `.github/workflows/metaculus-bot.yml` after each published run (code: `tools/metaculus-bot/ledger.py`).

- `forecasts.jsonl`: one line per forecast submitted to Metaculus FutureEval. Append-only. The probability and the shadow (no-house-prior) probability are sealed and carry a sha256 digest, so they are fixed before the question closes. They are opened only after the question closes; the opened text is then published in `revealed.jsonl` so anyone can check it.
- `runs.jsonl`: one line per run with LLM spend and counts. It feeds the daily spend ceiling.
- `ots/`: OpenTimestamps proofs of `forecasts.jsonl`, one per version, and `ots/manifest.json` (sha256, byte `size`, `stamped`, `stamped_at`, status). Written by the same workflow run that appends to the ledger (`tools/fleet/ots_anchor.py --group ledger`); nothing else writes here.
- `revealed.jsonl`: written by the daily heartbeat (`tools/fleet/metaculus_record.py`), one line per ledger line whose question has closed. Append-only.

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

## Commit → anchor → reveal → verify (what exists, 2026-09-27)

1. **Commit.** The bot appends a line whose `digest` hides the forecast (nonce, above) and binds it.
2. **Anchor.** In the same workflow run, `ots_anchor.py --group ledger` submits the new version of `forecasts.jsonl` to the OpenTimestamps calendars (free, public; the run gets a calendar receipt, and a Bitcoin block attestation follows within hours — the next bot run upgrades the proof, or the heartbeat's `--upgrade-only` pass while the bot is switched off) and records its byte `size` and `stamped_at`. The file only grows, so the version stamped with size N is exactly the first N bytes of today's file: `head -c N forecasts.jsonl > v && ots verify ots/<proof> -f v` shows those lines existed by that block, without trusting this repo or GitHub.
3. **Reveal.** Once Metaculus reports the question `closed` or `resolved` *and* its close time has passed, the heartbeat appends the exact canonical plaintext (nonce included) to `revealed.jsonl`: `{"digest", "question_id", "post_id", "submitted_at", "commit_v", "plain_text", "revealed_at", "closed_at", "resolution"}`. `plain_text` is the string whose sha256 is the committed `digest`. A line the current key cannot open is never revealed and never crashes the run. The file can be regenerated from the ledger and the key: if a line is ever corrupted, deleting it lets the next heartbeat append it again.
4. **Verify.** `python3 tools/fleet/verify_commitments.py [--ots]` (standard library only) checks that every anchored version is still an exact prefix of today's ledger (append-only), that every reveal hashes to a committed digest and names that line's `question_id` and `submitted_at`, that no proof file on disk is missing from the manifest while committing to a non-prefix, and reports for each revealed line the earliest anchored version that contains it and whether that stamp came before the close (to the second, from `stamped_at` — our runner's clock, self-reported; the proof-backed answer is whether the Bitcoin block the proof names came before the close). `--ots` also runs the OpenTimestamps client on those proofs. Any rewritten line or mismatched reveal is TAMPER: exit 1, and the heartbeat run turns red.

**What this does not prove.** `stamped` / `stamped_at` are our runner's clock; the proof-backed time is the Bitcoin block, which is at or after it (usually within hours). Someone who rewrites the ledger, the manifest and deletes the proofs in this repo together defeats the in-repo check; a copy of any published proof still shows the original bytes. A reveal shows what was committed, not that the forecast was good. And the key is derived from `METACULUS_TOKEN`: **regenerating that token before every line has been revealed makes the unrevealed lines impossible to open** (the submission count survives; the ablation for those lines does not).

The house-prior comparison (`data/fleet-forecast-record.json`, `house_prior.rows`) is computed from resolved binary questions where the prior was used; with the reveals published, anyone can recompute it from `revealed.jsonl` and Metaculus's resolutions.
