"""
Point-in-time forecast ledger for the fleet's Metaculus bot (2026-09-27).

Why it exists (docs/ai-era-founder-2026-09-25.md §三): the wedge is "a scored
track record first". A record only proves anything if each forecast was logged
before the question closed, and the house prior (agiscorecard llms.txt) is only
evidence if its effect is measured against a forecast made without it. Metaculus
keeps our submitted forecasts; it does not keep the counterfactual. This module
keeps both, in the public repo, without publishing a live forecast before close.

Files (repo-relative, committed by the workflow after each non-dry run):
  data/metaculus/forecasts.jsonl  one line per submitted forecast
  data/metaculus/runs.jsonl       one line per run (spend, counts) — feeds the daily cap

Sealing. The probability and the shadow (no-house-prior) probability are sealed
with Fernet (AES-128-CBC + HMAC-SHA256, `cryptography`) under a key derived from
METACULUS_TOKEN, which is already in Secrets — so the owner adds nothing. Each line
also carries sha256(plaintext) so a later reveal can be checked against what was
committed. The reader (tools/fleet/metaculus_record.py) unseals only questions that
have closed and resolved, and only to score them. A public reveal file with the exact
plaintext, a reveal verifier and OpenTimestamps anchoring of forecasts.jsonl are
planned, NOT built (data/metaculus/README.md says what exists). If the token is
rotated, older lines stay sealed under the old key id; that loses the ablation for
those lines, never the submission count.

Hiding (commit_v 2, 2026-09-27). A digest is only a commitment if it binds AND hides.
v1 hashed the plaintext with no salt, and every field of it except the two
probabilities is public or derivable (question_id, submitted_at, page_url from
post_id); the bot's binary answer is an integer percent clamped to 1..99. So the
sealed forecast and shadow came back by brute force in ~3.6k guesses / 14 ms — the
digest published the forecast it was meant to hide. v2 puts a fresh 256-bit nonce
(secrets.token_hex(32)) inside the sealed plaintext: the digest still binds (it is
sha256 over the nonce-bearing text, and a reveal must reproduce it byte for byte),
and it no longer hides behind a guessable grid. unseal_text() also checks that the
opened text belongs to the line it is filed under (question_id, submitted_at), so a
sealed+digest pair copied from another line does not verify. The Fernet plaintext is also padded
with spaces to a multiple of SEAL_BLOCK bytes before encryption, so the ciphertext
length does not tell a 3-character "0.4" from a 6-character "0.3712". Public lines
carry "commit_v": 2. The bot has never run live, so no v1 line exists.

Logs. GitHub Actions logs of this repo are world-readable, so research, reasoning
and forecast values go through redact() before they reach a log line (main.py;
AST-gated in test_ledger.py). BOT_LOG_PLAINTEXT=1 turns that off for a private runner.
A failure is described by exception type and HTTP status only (failure_leaves(),
failure_signature()): exception messages can quote a parsed sample.

Nothing here talks to the network, so it is fully unit-tested (test_ledger.py).
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
LEDGER_DIR = Path(os.getenv("BOT_LEDGER_DIR") or REPO_ROOT / "data" / "metaculus")
FORECASTS = "forecasts.jsonl"
RUNS = "runs.jsonl"
KEY_CONTEXT = b"agi-site/metaculus-ledger/v1"
COMMIT_V = 2          # 1 = unsalted digest (brute-forceable, never written live); 2 = nonce inside the sealed plaintext
SEAL_BLOCK = 512      # Fernet plaintext is space-padded to a multiple of this, so ciphertext length says nothing about p


# ------------------------------------------------------------------ sealing
def derive_key(token: str) -> bytes | None:
    """Fernet key (urlsafe-b64 of 32 bytes) derived from the Metaculus token; None if no token."""
    token = (token or "").strip()
    if not token:
        return None
    raw = hashlib.sha256(KEY_CONTEXT + b"\0" + token.encode()).digest()
    return base64.urlsafe_b64encode(raw)


def key_id(key: bytes | None) -> str:
    return hashlib.sha256(key).hexdigest()[:8] if key else ""


def canonical(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def seal(plain: dict, key: bytes | None) -> dict:
    """Return the public part of a ledger line. Without a key, nothing secret is stored.

    The digest is over canonical(plain) exactly as given: hiding comes from the nonce that
    forecast_line() puts into `plain`, not from here (seal() on a nonce-free dict is how the
    tests rebuild a v1 line and prove the brute force still works on it)."""
    text = canonical(plain)
    out = {"digest": hashlib.sha256(text.encode()).hexdigest()}
    if key:
        from cryptography.fernet import Fernet

        raw = text.encode()
        raw += b" " * (-len(raw) % SEAL_BLOCK)  # canonical JSON never ends in a space, so unseal can strip it
        out["sealed"] = Fernet(key).encrypt(raw).decode()
        out["key_id"] = key_id(key)
    return out


def unseal_text(line: dict, key: bytes | None) -> str | None:
    """The exact canonical plaintext of a ledger line — the string whose sha256 is line["digest"] —
    or None if it cannot be opened with this key, does not match its digest, or belongs to another
    line. This is what a reveal would publish, so a reader can re-hash it without trusting us.

    The digest binds the bytes, not the line they are filed under: a sealed+digest pair copied from
    line B onto line A opens and hashes fine, and would then be scored under A's post_id, kind and
    house_prior_used. So the opened text must also name the public line's question_id and
    submitted_at (both are in every sealed plaintext, v1 and v2)."""
    if not key or not line.get("sealed") or line.get("key_id") != key_id(key):
        return None
    from cryptography.fernet import Fernet, InvalidToken

    try:
        text = Fernet(key).decrypt(str(line["sealed"]).encode()).decode().rstrip(" ")
    except (InvalidToken, ValueError):
        return None
    if hashlib.sha256(text.encode()).hexdigest() != line.get("digest"):
        return None
    try:
        plain = json.loads(text)
    except ValueError:
        return None
    if not isinstance(plain, dict):
        return None
    if plain.get("question_id") != line.get("question_id") or plain.get("submitted_at") != line.get("submitted_at"):
        return None
    return text


def unseal(line: dict, key: bytes | None) -> dict | None:
    """Plaintext of a ledger line, verified against its digest; None if it cannot be opened."""
    text = unseal_text(line, key)
    return None if text is None else json.loads(text)


# ------------------------------------------------------------------ public logs
def log_plaintext() -> bool:
    """True only when BOT_LOG_PLAINTEXT=1 (a private runner). Read at call time, never cached."""
    return os.environ.get("BOT_LOG_PLAINTEXT") == "1"


def redact(value) -> str:
    """What a log line may show of research, reasoning or a forecast value.

    Actions logs of this public repo are world-readable while the question is still open, so by
    default only the length survives: "[sealed: N chars]". The length is not nothing — main.py
    formats the binary value at fixed width before redacting it so N carries no information
    there. BOT_LOG_PLAINTEXT=1 returns str(value) unchanged."""
    text = str(value)
    if log_plaintext():
        return text
    return f"[sealed: {len(text)} chars]"


# ------------------------------------------------------------------ files
def _read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if raw:
            try:
                out.append(json.loads(raw))
            except json.JSONDecodeError:
                continue  # a torn line never blocks a run
    return out


def _append_jsonl(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n")


def read_forecasts(root: Path | None = None) -> list[dict]:
    return _read_jsonl((root or LEDGER_DIR) / FORECASTS)


def read_runs(root: Path | None = None) -> list[dict]:
    return _read_jsonl((root or LEDGER_DIR) / RUNS)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ------------------------------------------------------------------ daily cap
def spent_on(day: str, runs: list[dict]) -> float:
    return round(sum(float(r.get("spend_usd") or 0) for r in runs if r.get("date") == day and r.get("published")), 4)


def budget_for_run(per_run: float, per_day: float, runs: list[dict], today: str) -> float:
    """Cap for this run = min(per-run cap, what is left of today's cap). 0 means: do not run."""
    left = per_day - spent_on(today, runs)
    return max(0.0, round(min(per_run, left), 4))


import re as _re


# ------------------------------------------------------------------ failures (public)
# Why a run failed has to be readable in a PUBLIC log and a PUBLIC runs.jsonl, and an exception's
# message is not safe there: structure_output's ValueError quotes the parsed samples ("First Sample:
# … Sample 2: …"), a pydantic ValidationError quotes the model's output. forecasting-tools also buries
# the real cause two or three ExceptionGroups deep behind a prefix that is mostly the question url, so
# the first 200 characters of str(e) said the same thing for every cause (2026-09-27 review). What is
# safe and still diagnostic: the type of each leaf exception and the HTTP status it carries.
def exception_leaves(exc, _path: frozenset = frozenset(), _depth: int = 0) -> list:
    """The exceptions at the bottom of `exc`: every sub-exception of an ExceptionGroup, then each one's
    explicit __cause__ (raise … from …), down to the ones that wrap nothing. Cycle- and depth-safe (a
    cycle is an exception reached again on its own path; the same instance twice in one group counts twice)."""
    if exc is None or id(exc) in _path or _depth > 20:
        return []
    path = _path | {id(exc)}
    subs = getattr(exc, "exceptions", None)
    if isinstance(subs, (list, tuple)) and subs and all(isinstance(x, BaseException) for x in subs):
        out = [leaf for sub in subs for leaf in exception_leaves(sub, path, _depth + 1)]
        return out or [exc]
    cause = getattr(exc, "__cause__", None)
    if isinstance(cause, BaseException):
        return exception_leaves(cause, path, _depth + 1) or [exc]
    return [exc]


def http_status(exc) -> int | None:
    """The HTTP status an exception carries as an attribute (litellm/openai `status_code`, requests/httpx
    `response.status_code`); never parsed out of the message, where a number can be a forecast value."""
    for obj in (exc, getattr(exc, "response", None)):
        v = getattr(obj, "status_code", None)
        if isinstance(v, int) and not isinstance(v, bool) and 100 <= v <= 599:
            return v
    return None


def exception_label(exc) -> str:
    """'ValueError', 'litellm.BadRequestError(400)': the type (package-qualified unless builtin) and the
    HTTP status. No message text."""
    t = type(exc)
    pkg = (getattr(t, "__module__", "") or "").split(".")[0]
    name = t.__name__ if pkg in ("", "builtins", "exceptiongroup") else f"{pkg}.{t.__name__}"
    status = http_status(exc)
    return f"{name}({status})" if status else name


def failure_leaves(exc) -> str:
    """One public log line's worth: leaf labels in first-seen order with counts, e.g. 'ValueError×5' or
    'litellm.BadRequestError(400)'."""
    counts: dict[str, int] = {}
    for leaf in exception_leaves(exc):
        label = exception_label(leaf)
        counts[label] = counts.get(label, 0) + 1
    return ", ".join(label if n == 1 else f"{label}×{n}" for label, n in counts.items())


def failure_signature(exc) -> str:
    """What runs.jsonl records for a red run (it lands in a PUBLIC repo): the top type and the distinct
    leaf labels, sorted, no message text and no counts — so the same cause gives the same signature
    whatever question url, sample count or wording came with it (one red run per cause per day), and a
    different cause gives a different one."""
    leaves = exception_leaves(exc)
    if leaves == [exc]:
        return exception_label(exc)[:80]
    labels = sorted({exception_label(leaf) for leaf in leaves})
    return (type(exc).__name__ + ">" + ",".join(labels))[:80]


def failure_already_reported(runs: list[dict], today: str, signature: str) -> bool:
    """One red run per UTC day per identical failure: the 09-07 lesson (12 identical mails a day
    would bury the only AI-free alarm channel the fleet has)."""
    return any(r.get("date") == today and r.get("failure_signature") == signature for r in runs)


# ------------------------------------------------------------------ lines
_NONCE = _re.compile(r"[0-9a-f]{64}")


def forecast_line(*, question_id, post_id, tournament, kind, prediction, shadow, house_prior_used,
                  model, run_id, commit, key, when: datetime | None = None, page_url: str = "",
                  nonce: str | None = None) -> dict:
    """One ledger line (commit_v 2). `nonce` exists for deterministic tests and reveals; left as
    None it is a fresh secrets.token_hex(32), which is the only thing that makes the digest hiding."""
    when = when or utc_now()
    if nonce is None:
        nonce = secrets.token_hex(32)
    elif not isinstance(nonce, str) or not _NONCE.fullmatch(nonce):
        raise ValueError("nonce must be 64 lowercase hex characters (secrets.token_hex(32))")
    plain = {
        "question_id": question_id,
        "prediction": prediction,
        "shadow_no_prior": shadow,
        "page_url": page_url,
        "submitted_at": when.isoformat(timespec="seconds"),
        "nonce": nonce,
    }
    public = {
        "question_id": question_id,
        "post_id": post_id,
        "tournament": tournament,
        "kind": kind,
        "submitted_at": when.isoformat(timespec="seconds"),
        "date": when.date().isoformat(),
        "house_prior_used": bool(house_prior_used),
        "shadow_logged": shadow is not None,
        "model": model,
        "run_id": run_id,
        "commit": commit,
        "commit_v": COMMIT_V,
    }
    public.update(seal(plain, key))
    return public


def run_line(*, run_id, mode, published, spend_usd, touched_main, touched_mini, ok, failed,
             failure_signature: str = "", when: datetime | None = None, skipped: str = "") -> dict:
    when = when or utc_now()
    return {
        "run_id": run_id,
        "date": when.date().isoformat(),
        "at": when.isoformat(timespec="seconds"),
        "mode": mode,
        "published": bool(published),
        "spend_usd": None if spend_usd is None else round(float(spend_usd), 4),
        "touched_main": touched_main,
        "touched_mini": touched_mini,
        "ok": ok,
        "failed": failed,
        "failure_signature": failure_signature,
        "skipped": skipped,
    }


def append_forecasts(rows: list[dict], root: Path | None = None) -> None:
    _append_jsonl((root or LEDGER_DIR) / FORECASTS, rows)


def append_run(row: dict, root: Path | None = None) -> None:
    _append_jsonl((root or LEDGER_DIR) / RUNS, [row])


def summarize_prediction(pred):
    """A JSON-safe summary of whatever forecasting-tools returned (binary float, MC option list,
    numeric/date percentiles). Never raises: an unknown shape is recorded as its type name."""
    try:
        if isinstance(pred, (int, float)):
            return {"p": round(float(pred), 4)}
        opts = getattr(pred, "predicted_options", None)
        if opts is not None:
            return {"options": {str(o.option_name): round(float(o.probability), 4) for o in opts}}
        pct = getattr(pred, "declared_percentiles", None)
        if pct is not None:
            return {"percentiles": [[round(float(p.percentile), 3), float(p.value) if not hasattr(p.value, "isoformat") else p.value.isoformat()] for p in pct]}
    except Exception:
        pass
    return {"type": type(pred).__name__}
