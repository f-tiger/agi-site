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

Sealing. The probability, the shadow (no-house-prior) probability and the
question text are sealed with Fernet (AES-128-CBC + HMAC-SHA256, `cryptography`)
under a key derived from METACULUS_TOKEN, which is already in Secrets — so the
owner adds nothing. Each line also carries sha256(plaintext) so a later reveal
can be checked against what was committed. The reader (tools/fleet/metaculus_record.py)
unseals only questions that have closed. If the token is rotated, older lines stay
sealed under the old key id; that loses the ablation for those lines, never the
submission count.

Nothing here talks to the network, so it is fully unit-tested (test_ledger.py).
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
LEDGER_DIR = Path(os.getenv("BOT_LEDGER_DIR") or REPO_ROOT / "data" / "metaculus")
FORECASTS = "forecasts.jsonl"
RUNS = "runs.jsonl"
KEY_CONTEXT = b"agi-site/metaculus-ledger/v1"


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
    """Return the public part of a ledger line. Without a key, nothing secret is stored."""
    text = canonical(plain)
    out = {"digest": hashlib.sha256(text.encode()).hexdigest()}
    if key:
        from cryptography.fernet import Fernet

        out["sealed"] = Fernet(key).encrypt(text.encode()).decode()
        out["key_id"] = key_id(key)
    return out


def unseal(line: dict, key: bytes | None) -> dict | None:
    """Plaintext of a ledger line, verified against its digest; None if it cannot be opened."""
    if not key or not line.get("sealed") or line.get("key_id") != key_id(key):
        return None
    from cryptography.fernet import Fernet, InvalidToken

    try:
        text = Fernet(key).decrypt(line["sealed"].encode()).decode()
    except InvalidToken:
        return None
    if hashlib.sha256(text.encode()).hexdigest() != line.get("digest"):
        return None
    return json.loads(text)


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

_SECRETISH = _re.compile(r"(?i)(sk-[A-Za-z0-9_\-*.]{4,}|(?:api[_-]?key|token|secret|bearer|authorization)\S*(?:\s*[:=]?\s*\S+){1,2}|[A-Za-z0-9_\-]{20,})")


def failure_signature(exc) -> str:
    """Error type + a short message with anything key-shaped removed. It lands in a PUBLIC repo."""
    msg = _SECRETISH.sub("[redacted]", str(exc))
    return (type(exc).__name__ + ":" + msg)[:80].strip()


def failure_already_reported(runs: list[dict], today: str, signature: str) -> bool:
    """One red run per UTC day per identical failure: the 09-07 lesson (12 identical mails a day
    would bury the only AI-free alarm channel the fleet has)."""
    return any(r.get("date") == today and r.get("failure_signature") == signature for r in runs)


# ------------------------------------------------------------------ lines
def forecast_line(*, question_id, post_id, tournament, kind, prediction, shadow, house_prior_used,
                  model, run_id, commit, key, when: datetime | None = None, page_url: str = "") -> dict:
    when = when or utc_now()
    plain = {
        "question_id": question_id,
        "prediction": prediction,
        "shadow_no_prior": shadow,
        "page_url": page_url,
        "submitted_at": when.isoformat(timespec="seconds"),
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
