#!/usr/bin/env python3
"""Verify the Metaculus bot's forecast commitments end to end (2026-09-27; stdlib only, zero AI, zero token).

Why (2026-09-27, owner: 「探索类似比特币的共识算法…目标是成为ai时代信仰」): the only part of Bitcoin
the fleet borrows is "a public timestamp nobody can backdate". For the forecast record that only
means something if a stranger can check three things without our key and without trusting us:
the ledger was never rewritten, each opened forecast is exactly what was committed, and the line
existed by a Bitcoin block. This script is that check, run daily by fleet-heartbeat.yml.

  (a) append-only. data/ots/manifest.json lists every stamped version of
      data/metaculus/forecasts.jsonl with "size" (tools/fleet/ots_anchor.py). The ledger only
      grows, so each of those versions must still be the first `size` bytes of today's file
      (same sha256). A rewritten, reordered, removed or truncated earlier line breaks it → TAMPER.
      Proofs of the ledger that no manifest entry lists (a manifest rebuilt, deleted or with entries
      dropped leaves exactly these) are checked too: each proof file names the sha256 it commits to,
      so it must still be the hash of some whole-line prefix of today's file → else TAMPER. A missing
      manifest next to such proofs, or an unreadable one, is TAMPER in itself (the check cannot run).
  (b) binding. Every line of data/metaculus/revealed.jsonl (tools/fleet/metaculus_record.py,
      written only after the question closed): sha256(plain_text) == digest, a ledger line carries
      that digest, and the opened JSON names that line's question_id and submitted_at (a sealed
      blob copied under another question does not count) → else TAMPER.
  (c) anchoring. For each revealed line, the earliest stamped version whose size covers the line:
      its stamped / confirmed dates, status and proof, and whether the stamp day is before the
      question closed. A line written after the last stamp is reported as not anchored yet —
      that is timing, not tampering.
  (d) --ots. `ots verify <proof> -f <that prefix>` for the proofs behind revealed lines and for
      the latest Bitcoin-confirmed version. Without a Bitcoin node (the runner has none) it reruns
      with --no-bitcoin, which still checks the hash chain from the prefix to the block's merkle
      root and prints block height + merkle root to compare by hand. A missing client or node never
      fails the run; a proof that does not commit to the prefix it is listed for does (TAMPER).

Writes data/fleet-commitments.json (summary + one row per revealed line). Exit 1 on any TAMPER,
0 otherwise; nothing to check yet (no ledger, no manifest, no reveals) = 0 with a note.

What this does NOT prove, said plainly:
  * the manifest's "stamped" day is our record; the proof-backed bound is the Bitcoin block's time.
    The heartbeat stamps once a day (08:00 UTC), so a forecast made less than a day before its
    question closed usually has only the git commit and Metaculus's own record as time evidence;
  * someone who rewrites the ledger AND the manifest AND deletes the proof files in this repo defeats
    (a) here. They cannot make an already-published .ots proof commit to other bytes: anyone holding a
    copy of a proof, and its version of the file, can still show the original;
  * a reveal proves what was committed, not that the forecast was good.

Usage: python3 tools/fleet/verify_commitments.py [--selftest] [--ots] [--out PATH]
"""
from __future__ import annotations

import contextlib
import datetime as dt
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LEDGER = "data/metaculus/forecasts.jsonl"
REVEALED = "data/metaculus/revealed.jsonl"
OTS_DIR = "data/ots"
OUT = "data/fleet-commitments.json"
# (append-only file, its proof dir). Kept here on purpose rather than read from the manifest: a
# verifier that learned from the manifest what to check could be told to check nothing.
APPEND_ONLY = [(LEDGER, OTS_DIR)]
OTS_CAP = 10          # proofs the ots client checks per run (newest first); the rest wait
OTS_TIMEOUT = 60
# the fixed start of an OpenTimestamps proof file: magic, major version 1, the sha256 op tag; the next
# 32 bytes are the digest the proof commits to (read without the ots client)
OTS_HEADER = b"\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94" + b"\x01\x08"


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def read_bytes(path: str) -> bytes | None:
    try:
        with open(path, "rb") as f:
            return f.read()
    except FileNotFoundError:
        return None


def parse_time(s):
    if not s:
        return None
    try:
        t = dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)


# ------------------------------------------------------------------ (a) append-only
def ledger_index(data: bytes) -> list[dict]:
    """Every parseable ledger line with its byte span: [start, end), end excluding the newline."""
    out, pos = [], 0
    for n, raw in enumerate(data.split(b"\n"), 1):
        start, end = pos, pos + len(raw)
        pos = end + 1
        if not raw.strip():
            continue
        try:
            obj = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            continue  # a torn line still occupies its bytes; it just carries no digest
        if isinstance(obj, dict):
            out.append({"line": n, "start": start, "end": end, "obj": obj})
    return out


def load_entries(root: str, ots_dir: str, name: str, tamper: list, notes: list) -> tuple[list | None, str]:
    """(manifest entries for one file, state): state is "missing" (entries None), "unreadable" (entries [],
    already TAMPER) or "ok"."""
    path = os.path.join(root, ots_dir, "manifest.json")
    raw = read_bytes(path)
    if raw is None:
        return None, "missing"
    try:
        man = json.loads(raw.decode("utf-8"))
        entries = (man.get("files") or {}).get(name) or []
        if not isinstance(entries, list):
            raise ValueError("files[%s] is not a list" % name)
    except (ValueError, UnicodeDecodeError, AttributeError) as e:
        # an unreadable manifest would switch (a) off; that is itself the incident
        tamper.append("%s/manifest.json is unreadable (%s): the append-only check cannot run" % (ots_dir, type(e).__name__))
        return [], "unreadable"
    unsized = sum(1 for e in entries if isinstance(e, dict) and "size" not in e)
    if unsized:
        notes.append("%d stamped version(s) of %s predate the size field; they are not prefix-checked" % (unsized, name))
    return [e for e in entries if isinstance(e, dict)], "ok"


def check_prefixes(data: bytes | None, entries: list, rel: str, tamper: list) -> list:
    """(a): returns the sized entries that still match; every mismatch goes to `tamper`."""
    ok = []
    for e in entries:
        if "size" not in e:
            continue
        size, when = e.get("size"), e.get("stamped")
        if not isinstance(size, int) or isinstance(size, bool) or size < 0:
            tamper.append("%s: stamped version %s has a malformed size %r" % (rel, when, size))
        elif data is None:
            tamper.append("%s is gone, but a %d-byte version of it was stamped %s (proof %s)" % (rel, size, when, e.get("proof")))
        elif size > len(data):
            tamper.append("%s was truncated: the version stamped %s is %d bytes, the file is now %d" % (rel, when, size, len(data)))
        elif sha(data[:size]) != e.get("sha256"):
            tamper.append("%s: the version stamped %s (%d bytes, proof %s) is no longer the first %d bytes of the file: "
                          "an earlier line was rewritten, reordered or removed" % (rel, when, size, e.get("proof"), size))
        else:
            ok.append(e)
    return ok


def proof_digest(path: str) -> str | None:
    """The sha256 an OpenTimestamps proof file commits to, from its header; None if it is not one."""
    with open(path, "rb") as f:
        head = f.read(len(OTS_HEADER) + 32)
    return head[len(OTS_HEADER):].hex() if head.startswith(OTS_HEADER) and len(head) == len(OTS_HEADER) + 32 else None


def prefix_digests(data: bytes | None) -> set:
    """sha256 of every whole-line prefix of `data` (each ending at a newline, plus the whole file): the
    only versions an append-only file can ever have had. One pass, hashing each byte once."""
    out, h, pos = set(), hashlib.sha256(), 0
    data = data or b""
    while pos < len(data):
        nl = data.find(b"\n", pos)
        end = len(data) if nl < 0 else nl + 1
        h.update(data[pos:end])
        out.add(h.copy().hexdigest())
        pos = end
    return out


def check_orphans(root: str, ots_dir: str, name: str, entries: list | None, data: bytes | None,
                  tamper: list, notes: list) -> None:
    """(a), second half: proofs of `name` on disk that no manifest entry lists. A manifest that was rebuilt,
    deleted or had entries dropped leaves exactly these behind (the 2026-09-27 review rebuilt one over a
    rewritten ledger and it passed clean); each still names the bytes it stamped."""
    d = os.path.join(root, ots_dir)
    try:
        files = os.listdir(d)
    except FileNotFoundError:
        return
    listed = {e.get("proof") for e in entries or []}
    pat = re.compile(re.escape(name) + r"\.([0-9a-f]{12})\.ots")
    orphans = sorted(f for f in files if pat.fullmatch(f) and f not in listed)
    if not orphans:
        return
    prefixes = prefix_digests(data)
    matching = []
    for f in orphans:
        committed = proof_digest(os.path.join(d, f))
        # a proof the header parser cannot read still carries its version in the name (first 12 hex digits)
        matching.append(committed in prefixes if committed else any(p.startswith(pat.fullmatch(f).group(1)) for p in prefixes))
    if entries is None:
        tamper.append("%s/manifest.json is gone but %d proof(s) of %s remain (%d still match a prefix of today's file): "
                      "the stamped history cannot be checked; restore the manifest from git" % (ots_dir, len(orphans), name, sum(matching)))
        return
    for f, ok in zip(orphans, matching):
        if ok:
            notes.append("proof %s is not listed in %s/manifest.json but still commits to a whole-line prefix of %s: "
                         "a manifest entry was dropped; the file itself is intact" % (f, ots_dir, name))
        else:
            tamper.append("proof %s (not listed in %s/manifest.json) commits to a version that is no whole-line prefix of "
                          "today's %s: an earlier version was rewritten and its manifest entry dropped" % (f, ots_dir, name))


def check_append_only(root: str, rel: str, ots_dir: str, tamper: list, notes: list) -> tuple:
    """(a) for one append-only file: (its bytes or None, manifest entries or None, the sized entries that
    still match)."""
    data = read_bytes(os.path.join(root, rel))
    entries, state = load_entries(root, ots_dir, os.path.basename(rel), tamper, notes)
    anchored = check_prefixes(data, entries or [], rel, tamper)
    if state != "unreadable":  # an unreadable manifest is already TAMPER; every proof would look orphaned
        check_orphans(root, ots_dir, os.path.basename(rel), entries, data, tamper, notes)
    return data, entries, anchored


# ------------------------------------------------------------------ (b) binding
def read_reveals(data: bytes | None, tamper: list) -> list[tuple[int, dict]]:
    rows = []
    for n, raw in enumerate((data or b"").split(b"\n"), 1):
        if not raw.strip():
            continue
        try:
            obj = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            obj = None
        if not isinstance(obj, dict):
            tamper.append("%s line %d is not a JSON object: it cannot be checked" % (REVEALED, n))
            continue
        rows.append((n, obj))
    return rows


def check_reveal(rev: dict, by_digest: dict) -> list[str]:
    """(b) for one reveal line: [] when it binds, else the reasons."""
    d, text = rev.get("digest"), rev.get("plain_text")
    if not isinstance(d, str) or not isinstance(text, str):
        return ["no digest or plain_text"]
    problems = []
    if sha(text.encode("utf-8")) != d:
        problems.append("plain_text does not hash to its digest")
    lines = by_digest.get(d) or []
    if not lines:
        problems.append("no ledger line carries this digest")
    try:
        plain = json.loads(text)
    except ValueError:
        plain = None
    if not isinstance(plain, dict):
        return problems + ["plain_text is not a JSON object"]
    for ln in lines:
        pub = ln["obj"]
        if plain.get("question_id") != pub.get("question_id") or plain.get("submitted_at") != pub.get("submitted_at"):
            problems.append("ledger line %d files this digest under question %s at %s; the plaintext says question %s at %s"
                            % (ln["line"], pub.get("question_id"), pub.get("submitted_at"),
                               plain.get("question_id"), plain.get("submitted_at")))
        elif any(rev.get(k) != pub.get(k) for k in ("question_id", "post_id", "submitted_at")):
            problems.append("the reveal's header disagrees with ledger line %d" % ln["line"])
    return problems


# ------------------------------------------------------------------ (c) anchoring
def anchor_for(end: int, anchored: list) -> dict | None:
    """Earliest stamped version (by stamp day, then size) that contains every byte of the line."""
    cover = [e for e in anchored if e["size"] >= end]
    return min(cover, key=lambda e: (str(e.get("stamped") or ""), e["size"])) if cover else None


def stamped_before_close(stamped, closed_at) -> bool | None:
    """True/False by UTC day; None when the close time is unknown or it is the same day (the manifest
    records the day only — the Bitcoin block's time decides that case)."""
    close = parse_time(closed_at)
    try:
        day = dt.date.fromisoformat(str(stamped))
    except ValueError:
        return None
    if close is None:
        return None
    cday = close.astimezone(dt.timezone.utc).date()
    return None if day == cday else day < cday


# ------------------------------------------------------------------ (d) ots client
def parse_ots(rc: int, out: str) -> dict:
    blocks = [{"height": int(h), "merkleroot": m}
              for h, m in re.findall(r"Bitcoin block (\d+) has merkleroot ([0-9a-f]{64})", out)]
    ok = re.search(r"Success! Bitcoin block (\d+) attests existence as of (.+)", out)
    if "File does not match original" in out:
        result = "mismatch"
    elif "Bitcoin verification failed" in out:
        result = "block_mismatch"
    elif ok:
        result = "verified"
    elif blocks:
        result = "chain_ok_block_unchecked"   # no node: hash chain checked, block header left to compare by hand
    elif "Pending confirmation" in out:
        result = "pending"
    else:
        result = "unverified"
    res = {"result": result, "rc": rc}
    if ok:
        res["block"], res["as_of"] = int(ok.group(1)), ok.group(2).strip()
    if blocks:
        res["blocks"] = blocks
    if result in ("unverified", "block_mismatch"):
        res["output"] = " | ".join(x.strip() for x in out.strip().splitlines()[-3:])[:300]
    return res


def run_ots(proof: str, prefix: bytes, state: dict) -> dict:
    """ots verify <proof> -f <prefix>; with no Bitcoin node, once per run, switch to --no-bitcoin."""
    def call(no_btc, target):
        cmd = ["ots"] + (["--no-bitcoin"] if no_btc else []) + ["verify", proof, "-f", target]
        try:
            p = subprocess.run(cmd, capture_output=True, text=True, timeout=OTS_TIMEOUT)
        except (OSError, subprocess.TimeoutExpired) as e:
            return 1, "ots did not finish: %s" % type(e).__name__
        return p.returncode, (p.stdout or "") + (p.stderr or "")

    with tempfile.TemporaryDirectory() as td:
        target = os.path.join(td, "forecasts.jsonl.prefix")
        with open(target, "wb") as f:
            f.write(prefix)
        rc, out = call(state.get("no_node", False), target)
        if not state.get("no_node") and "Could not connect to" in out and "Bitcoin node" in out:
            state["no_node"] = True
            rc, out = call(True, target)
    res = parse_ots(rc, out)
    # only what is known: False = fell back to --no-bitcoin; True = a node checked the block; else unknown
    res["bitcoin_node"] = False if state.get("no_node") else (True if res["result"] in ("verified", "block_mismatch") else None)
    return res


# ------------------------------------------------------------------ the whole check
def verify(root: str, now: dt.datetime, use_ots: bool = False) -> dict:
    tamper, notes = [], []
    rel, ots_dir = APPEND_ONLY[0]
    data, entries, anchored = check_append_only(root, rel, ots_dir, tamper, notes)
    if data is None and not entries:
        notes.append("no ledger yet (%s absent): nothing to verify" % rel)
    if entries is None and not tamper:  # with proofs left behind it is TAMPER instead (check_orphans)
        notes.append("no OTS manifest (%s/manifest.json): nothing is anchored yet" % ots_dir)
    for extra_rel, extra_dir in APPEND_ONLY[1:]:  # more append-only files: prefix and orphan checks only
        check_append_only(root, extra_rel, extra_dir, tamper, notes)
    prefix_ok = not tamper
    if data is not None and entries is not None and not any("size" in e for e in entries):
        notes.append("no stamped version of %s yet (ots_anchor.py stamps it once a day)" % rel)

    index = ledger_index(data or b"")
    by_digest = {}
    for ln in index:
        d = ln["obj"].get("digest")
        if isinstance(d, str):
            by_digest.setdefault(d, []).append(ln)
    dup = sum(len(v) - 1 for v in by_digest.values() if len(v) > 1)
    if dup:
        notes.append("%d ledger line(s) repeat a digest already in the ledger" % dup)
    top = max((e["size"] for e in anchored), default=0)

    rev_data = read_bytes(os.path.join(root, REVEALED))
    if rev_data is None:
        notes.append("no reveals yet (%s absent): questions reveal only after they close" % REVEALED)
    n_before_rev = len(tamper)
    reveals = read_reveals(rev_data, tamper)
    seen, rows, used, binding_ok = set(), [], [], len(tamper) == n_before_rev
    for n, rev in reveals:
        d = rev.get("digest")
        problems = check_reveal(rev, by_digest)
        if d in seen:
            notes.append("%s line %d repeats a digest revealed earlier" % (REVEALED, n))
        seen.add(d)
        if problems:
            binding_ok = False
            tamper.extend("%s line %d (digest %s…): %s" % (REVEALED, n, str(d)[:12], p) for p in problems)
        first = (by_digest.get(d) or [None])[0]
        a = anchor_for(first["end"], anchored) if first else None
        used.append(a)
        rows.append({"digest": d, "question_id": rev.get("question_id"), "post_id": rev.get("post_id"),
                     "ok": not problems, "closed_at": rev.get("closed_at"),
                     "anchor": None if a is None else {k: a.get(k) for k in ("stamped", "confirmed", "status", "size")}
                     | {"proof": "%s/%s" % (ots_dir, a.get("proof"))},
                     "stamped_before_close": None if a is None else stamped_before_close(a.get("stamped"), rev.get("closed_at"))})

    ots = None
    if use_ots:
        ots = {"client": shutil.which("ots") is not None, "checked": 0, "skipped_cap": 0}
        if not ots["client"]:
            notes.append("--ots: the ots client is not installed (pip install opentimestamps-client); proofs not checked")
        else:
            # the latest Bitcoin-confirmed version (exercises the whole chain every day, reveals or not),
            # then the versions behind revealed lines, newest first; one ots call per distinct proof
            newest = lambda e: (str(e.get("stamped")), e["size"])
            confirmed = [e for e in anchored if e.get("status") == "bitcoin"]
            chain = max(confirmed, key=newest) if confirmed else None
            behind = sorted({e.get("proof"): e for e in used if e is not None}.values(), key=newest, reverse=True)
            order = ([chain] if chain else []) + [e for e in behind if chain is None or e.get("proof") != chain.get("proof")]
            state, results = {}, {}
            for i, e in enumerate(order):
                if i >= OTS_CAP:
                    ots["skipped_cap"] += 1
                    continue
                proof = os.path.join(root, ots_dir, str(e.get("proof") or ""))
                if not e.get("proof") or not os.path.isfile(proof):
                    # a lost proof loses the anchor, it does not rewrite the ledger; ots_anchor.py warns too
                    results[e.get("proof")] = {"result": "proof_missing"}
                    notes.append("proof for the version stamped %s is missing: %s" % (e.get("stamped"), e.get("proof")))
                    continue
                res = run_ots(proof, data[:e["size"]], state)
                results[e["proof"]] = res
                ots["checked"] += 1
                if res["result"] in ("mismatch", "block_mismatch"):
                    tamper.append("proof %s does not commit to the %d-byte version of %s it is listed for (ots: %s)"
                                  % (e["proof"], e["size"], rel, res["result"]))
            if chain is not None and chain.get("proof") in results:
                ots["chain_check"] = {"proof": "%s/%s" % (ots_dir, chain.get("proof")), "stamped": chain.get("stamped"),
                                      "size": chain["size"]} | results[chain.get("proof")]
            for r, e in zip(rows, used):
                if e is not None and e.get("proof") in results:
                    r["ots"] = results[e.get("proof")]

    latest = max(anchored, key=lambda e: (str(e.get("stamped")), e["size"])) if anchored else None
    report = {
        "generated": now.isoformat(timespec="seconds"),
        "definition": "append-only ledger (every stamped prefix still matches), reveals bind to committed digests, "
                      "and each revealed line's earliest Bitcoin-anchored version; stamped_before_close compares "
                      "the manifest's stamp day with the close time (null = unknown or same UTC day; the block time decides)",
        "ledger_lines": len(index),
        "ledger_bytes": 0 if data is None else len(data),
        "anchored_versions": sum(1 for e in (entries or []) if "size" in e),
        "ledger_lines_anchored": sum(1 for ln in index if ln["end"] <= top),
        "latest_anchor": None if latest is None else {k: latest.get(k) for k in ("stamped", "confirmed", "status", "size")},
        "prefix_consistent": prefix_ok,
        "revealed": len(reveals),
        "binding_ok": binding_ok,
        "tamper": tamper,
        "notes": notes,
        "lines": rows,
    }
    if ots is not None:
        report["ots"] = ots
    return report


# ------------------------------------------------------------------ selftest
def selftest() -> int:
    """Synthetic data in a temp root, built by the REAL producers: ledger.forecast_line / append_forecasts
    (with a test key), ots_anchor.anchor (its stamp/upgrade swapped for offline fakes) and
    metaculus_record.reveal. Then every tamper shape the verifier exists to catch."""
    sys.path.insert(0, os.path.join(ROOT, "tools", "metaculus-bot"))
    sys.path.insert(0, os.path.join(ROOT, "tools", "fleet"))
    try:
        # ledger's Fernet, not just the package: a broken install imports `cryptography` fine and only
        # panics (a BaseException from its Rust bindings) when Fernet loads
        from cryptography.fernet import Fernet  # noqa: F401
    except ImportError:
        print("::error::verify_commitments selftest needs `cryptography` (pip install cryptography)")
        return 1
    except (KeyboardInterrupt, SystemExit):
        raise
    except BaseException as e:  # pyo3's PanicException
        print("::error::verify_commitments selftest: `cryptography` is installed but broken (%s)" % type(e).__name__)
        return 1
    import ledger
    import metaculus_record
    import ots_anchor
    from pathlib import Path

    key = ledger.derive_key("selftest-token")
    t = lambda s: dt.datetime.fromisoformat(s)
    mk = lambda q, when, p: ledger.forecast_line(
        question_id=q, post_id=q * 10, tournament=33121, kind="BinaryQuestion", prediction={"p": p}, shadow=p / 2,
        house_prior_used=True, model="m", run_id="r", commit="c", key=key, when=t(when))
    L1, L2, L3 = mk(101, "2026-10-01T06:00:00+00:00", 0.8), mk(102, "2026-10-01T08:00:00+00:00", 0.3), mk(103, "2026-10-09T06:00:00+00:00", 0.6)
    stray = mk(104, "2026-10-02T06:00:00+00:00", 0.5)  # a valid line that was never written to the ledger
    now = t("2026-11-01T00:00:00+00:00")
    res = {"1010": {"status": "resolved", "resolution": "yes", "close_time": "2026-10-10T00:00:00Z"},
           "1020": {"status": "open", "close_time": "2026-12-01T00:00:00Z"},
           "1030": {"status": "closed", "close_time": "2026-10-20T00:00:00Z"}}

    def fake_stamp(file_path, proof_path, dry_run, data=None):
        # like the real one: never over an existing proof; the file carries a real header naming the stamped
        # bytes (read by proof_digest), then no timestamp ops, so the ots client rejects it as unverified
        if os.path.exists(proof_path):
            return False
        os.makedirs(os.path.dirname(proof_path), exist_ok=True)
        open(proof_path, "wb").write(OTS_HEADER + hashlib.sha256(data).digest() + b"fake proof")
        return True

    base = tempfile.mkdtemp()
    real = ots_anchor.stamp, ots_anchor.upgrade
    ots_anchor.stamp, ots_anchor.upgrade = fake_stamp, (lambda p, d: "pending")
    try:
        mdir = Path(base) / "data" / "metaculus"
        ledger.append_forecasts([L1, L2], root=mdir)
        ots_anchor.anchor([(LEDGER, OTS_DIR)], "2026-10-01", root=base)       # version 1: L1 + L2
        ledger.append_forecasts([L3], root=mdir)                               # written after the last stamp
        metaculus_record.reveal(ledger.read_forecasts(mdir), res, key, now, os.path.join(base, REVEALED))
    finally:
        ots_anchor.stamp, ots_anchor.upgrade = real

    temps = [base]
    base_proof = next(f for f in os.listdir(os.path.join(base, OTS_DIR)) if f.endswith(".ots"))

    def _digest_of(b):
        p = os.path.join(base, "probe.ots")
        with open(p, "wb") as f:
            f.write(b)
        try:
            return proof_digest(p)
        finally:
            os.remove(p)

    def variant(mutate=None, use_ots=False):
        td = tempfile.mkdtemp()
        temps.append(td)
        shutil.copytree(base, td, dirs_exist_ok=True)
        if mutate:
            mutate(td)
        return verify(td, now, use_ots=use_ots)

    def edit(rel, fn):
        def m(td):
            p = os.path.join(td, rel)
            with open(p, "rb") as f:
                before = f.read()  # read first: open(p, "wb") would truncate before fn saw the bytes
            with open(p, "wb") as f:
                f.write(fn(before))
        return m

    def size_as_text(b):
        man = json.loads(b)
        for e in man["files"]["forecasts.jsonl"]:
            e["size"] = str(e["size"])  # "123" instead of 123 must not quietly skip the prefix check
        return json.dumps(man, indent=1).encode()

    def append_reveal(row):
        return edit(REVEALED, lambda b: b + (json.dumps(row, sort_keys=True) + "\n").encode())

    by_q_of = lambda rep: {r["question_id"]: r for r in rep["lines"]}
    good = variant()
    by_q = by_q_of(good)
    checks = [
        ("valid chain: no tamper, prefix consistent, both reveals bind",
         good["tamper"] == [] and good["prefix_consistent"] and good["binding_ok"] and good["revealed"] == 2),
        ("valid chain: a proof the manifest lists is never reported as orphaned",
         not any("not listed" in n for n in good["notes"])),
        ("valid chain: the open question (102) is not revealed", set(by_q) == {101, 103}),
        ("valid chain: 101 anchored by the 2026-10-01 version, stamped before its close",
         by_q[101]["anchor"] and by_q[101]["anchor"]["stamped"] == "2026-10-01" and by_q[101]["stamped_before_close"] is True),
        ("line not anchored yet (103, written after the stamp): reported, not TAMPER",
         by_q[103]["anchor"] is None and by_q[103]["ok"] and good["ledger_lines_anchored"] == 2 and good["ledger_lines"] == 3),
        ("counts: one sized version", good["anchored_versions"] == 1 and good["latest_anchor"]["size"] > 0),
    ]
    L1_raw = json.dumps(L1, ensure_ascii=False, sort_keys=True).encode()
    rewritten = variant(edit(LEDGER, lambda b: b.replace(L1_raw, L1_raw.replace(b'"house_prior_used": true', b'"house_prior_used": false'))))
    reordered = variant(edit(LEDGER, lambda b: b"\n".join([b.split(b"\n")[1], b.split(b"\n")[0]] + b.split(b"\n")[2:])))
    truncated = variant(edit(LEDGER, lambda b: b[:40]))
    checks += [
        ("rewritten earlier line: prefix mismatch → TAMPER",
         not rewritten["prefix_consistent"] and any("no longer the first" in x for x in rewritten["tamper"])),
        ("reordered lines → TAMPER", not reordered["prefix_consistent"]),
        ("truncated ledger → TAMPER", any("truncated" in x for x in truncated["tamper"])),
        ("anchored ledger deleted → TAMPER", any("is gone" in x for x in variant(lambda td: os.remove(os.path.join(td, LEDGER)))["tamper"])),
        ("malformed size → TAMPER", any("malformed size" in x for x in variant(edit(OTS_DIR + "/manifest.json", size_as_text))["tamper"])),
        ("unreadable manifest → TAMPER", any("unreadable" in x for x in variant(edit(OTS_DIR + "/manifest.json", lambda b: b[:-5]))["tamper"])),
    ]
    altered = variant(edit(REVEALED, lambda b: b.replace(b'\\"p\\":0.8', b'\\"p\\":0.9', 1)))
    stray_text = ledger.unseal_text(stray, key)
    orphan = variant(append_reveal({"digest": stray["digest"], "question_id": 104, "post_id": 1040,
                                    "submitted_at": stray["submitted_at"], "commit_v": 2, "plain_text": stray_text,
                                    "revealed_at": now.isoformat(), "closed_at": None, "resolution": None}))
    # the 09-27 review's swap: 103's sealed blob + digest re-filed under question 102, appended after the
    # last stamp so the prefix check stays green and only the binding check can catch it
    swap_line = json.dumps(dict(L2, digest=L3["digest"], sealed=L3["sealed"]), ensure_ascii=False, sort_keys=True).encode()
    swapped = variant(edit(LEDGER, lambda b: b + swap_line + b"\n"))
    checks += [
        ("reveal text altered → TAMPER", not altered["binding_ok"] and any("does not hash" in x for x in altered["tamper"])),
        ("reveal for a digest not in the ledger → TAMPER",
         stray_text is not None and any("no ledger line carries" in x for x in orphan["tamper"])),
        ("sealed blob filed under another question → TAMPER (binding check alone)",
         swapped["prefix_consistent"] and any("files this digest under question 102" in x for x in swapped["tamper"])),
        ("unreadable reveal line → TAMPER", any("not a JSON object" in x for x in variant(edit(REVEALED, lambda b: b + b'{"digest":'))["tamper"])),
    ]

    # the heartbeat's real order (2026-09-27 review): ots_anchor.anchor() may run on a broken manifest before
    # any verifier sees it. It used to rebuild the manifest with only today's version, and a rewritten ledger
    # then verified clean. Each case below runs the real anchor() (offline fakes) and THEN verify().
    seen = {}

    def anchored_after(mutate):
        def m(td):
            mutate(td)
            mp = os.path.join(td, OTS_DIR, "manifest.json")
            seen["manifest"] = read_bytes(mp)
            real_now = ots_anchor.stamp, ots_anchor.upgrade
            ots_anchor.stamp, ots_anchor.upgrade = fake_stamp, (lambda p, d: "pending")
            try:
                with contextlib.redirect_stdout(io.StringIO()):  # its ::error:: lines are expected here
                    ots_anchor.anchor([(LEDGER, OTS_DIR)], "2026-10-15", root=td)
            finally:
                ots_anchor.stamp, ots_anchor.upgrade = real_now
            seen["kept"] = read_bytes(mp) == seen["manifest"]
            seen["proofs"] = sorted(f for f in os.listdir(os.path.join(td, OTS_DIR)) if f.endswith(".ots"))
        return m

    def set_entries(entries):
        def fn(b):
            man = json.loads(b)
            man["files"]["forecasts.jsonl"] = entries
            return json.dumps(man, indent=1).encode()
        return edit(OTS_DIR + "/manifest.json", fn)

    rewrite_l1 = edit(LEDGER, lambda b: b.replace(L1_raw, L1_raw.replace(b'"house_prior_used": true', b'"house_prior_used": false')))
    both = lambda *ms: (lambda td: [m(td) for m in ms])
    corrupt = variant(anchored_after(both(rewrite_l1, edit(OTS_DIR + "/manifest.json", lambda b: b + b"<<<<<<< HEAD\n"))))
    corrupt_kept = seen["kept"] and len(seen["proofs"]) == 1
    deleted = variant(anchored_after(lambda td: os.remove(os.path.join(td, OTS_DIR, "manifest.json"))))
    deleted_kept = seen["manifest"] is None and seen["kept"] and len(seen["proofs"]) == 1
    rebuilt = variant(anchored_after(both(rewrite_l1, set_entries([]))))
    rebuilt_restamped = len(seen["proofs"]) == 2
    dropped = variant(anchored_after(set_entries([])))
    garble_base_proof = lambda td: open(os.path.join(td, OTS_DIR, base_proof), "wb").write(b"not a proof")
    dropped_unparsed = variant(both(anchored_after(set_entries([])), garble_base_proof))
    rebuilt_unparsed = variant(both(anchored_after(both(rewrite_l1, set_entries([]))), garble_base_proof))
    checks += [
        ("anchor then verify: rewritten line + corrupted manifest → manifest left as is, still TAMPER",
         corrupt_kept and any("unreadable" in x for x in corrupt["tamper"])),
        ("anchor then verify: manifest deleted → not rebuilt, TAMPER (its proofs remain)",
         deleted_kept and any("is gone but 1 proof" in x for x in deleted["tamper"])),
        ("anchor then verify: entries dropped + rewritten line → the new version stamps, the orphaned proof is TAMPER",
         rebuilt_restamped and rebuilt["anchored_versions"] == 1
         and any("no whole-line prefix" in x for x in rebuilt["tamper"])),
        ("orphaned proof the header parser cannot read → its name still decides (TAMPER / note)",
         any("no whole-line prefix" in x for x in rebuilt_unparsed["tamper"])
         and dropped_unparsed["tamper"] == [] and any("a manifest entry was dropped" in x for x in dropped_unparsed["notes"])),
        ("anchor then verify: entry dropped, ledger intact → note, not TAMPER",
         dropped["tamper"] == [] and any("a manifest entry was dropped" in x for x in dropped["notes"])),
        ("proof header: digest read without the client; anything else → None",
         _digest_of(OTS_HEADER + b"\x11" * 32 + b"ops") == "11" * 32 and _digest_of(b"fake proof") is None
         and _digest_of(OTS_HEADER[:-1] + b"\x02" + b"\x11" * 32) is None),
        ("whole-line prefixes: each newline end and the whole file",
         prefix_digests(b"a\nb\nc") == {sha(b"a\n"), sha(b"a\nb\n"), sha(b"a\nb\nc")} and prefix_digests(None) == set()),
    ]
    # --ots on a proof that is not an OpenTimestamps file (the fake) and on a deleted one: reported, never
    # TAMPER, never a crash, with or without the client installed
    fake = variant(use_ots=True)
    gone = variant(lambda td: [os.remove(os.path.join(td, OTS_DIR, f)) for f in os.listdir(os.path.join(td, OTS_DIR))
                               if f.endswith(".ots")], use_ots=True)
    checks += [("--ots: unreadable proof → reported, not TAMPER", fake["tamper"] == [] and (
                   not fake["ots"]["client"] or by_q_of(fake)[101]["ots"]["result"] == "unverified")),
               ("--ots: deleted proof → proof_missing note, not TAMPER", gone["tamper"] == [] and (
                   not gone["ots"]["client"] or by_q_of(gone)[101]["ots"]["result"] == "proof_missing"))]
    empty = tempfile.mkdtemp()
    temps.append(empty)
    nothing = verify(empty, now)
    checks += [
        ("no files at all → no tamper, notes say why", nothing["tamper"] == [] and len(nothing["notes"]) == 3
         and nothing["ledger_lines"] == 0 and nothing["prefix_consistent"] and nothing["binding_ok"]),
        ("stamp day vs close: after → False, same day → None, unknown → None",
         stamped_before_close("2026-10-11", "2026-10-10T00:00:00Z") is False
         and stamped_before_close("2026-10-10", "2026-10-10T23:00:00+00:00") is None
         and stamped_before_close("2026-10-01", None) is None),
        ("ots output: no node", parse_ots(1, "Not checking Bitcoin attestation; Bitcoin disabled\nTo verify manually, check that Bitcoin block 968682 has merkleroot "
                                          + "b" * 64)["blocks"] == [{"height": 968682, "merkleroot": "b" * 64}]),
        ("ots output: success / mismatch / pending",
         parse_ots(0, "Success! Bitcoin block 358391 attests existence as of 2015-05-28 UTC")["block"] == 358391
         and parse_ots(1, "File does not match original!")["result"] == "mismatch"
         and parse_ots(1, "Calendar https://x: Pending confirmation in Bitcoin blockchain")["result"] == "pending"),
    ]
    print("  (ots client %s: the two --ots cases %s)" % (("found", "ran it") if fake["ots"]["client"] else ("missing", "checked the fallback")))
    for d in temps:
        shutil.rmtree(d, ignore_errors=True)
    bad = [n for n, ok in checks if not ok]
    for n, ok in checks:
        print(("  ok   " if ok else "  FAIL ") + n)
    return 1 if bad else 0


def main(argv) -> int:
    if "--selftest" in argv:
        return selftest()
    out = argv[argv.index("--out") + 1] if "--out" in argv else os.path.join(ROOT, OUT)
    now = dt.datetime.now(dt.timezone.utc)
    report = verify(ROOT, now, use_ots="--ots" in argv)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(json.dumps(report, ensure_ascii=False, indent=1) + "\n")
    print("commitments: ledger_lines=%d anchored_versions=%d lines_anchored=%d prefix_consistent=%s revealed=%d binding_ok=%s tamper=%d"
          % (report["ledger_lines"], report["anchored_versions"], report["ledger_lines_anchored"],
             report["prefix_consistent"], report["revealed"], report["binding_ok"], len(report["tamper"])))
    for n in report["notes"]:
        print("  note: " + n)
    if "ots" in report:
        print("  ots: " + json.dumps(report["ots"]))
    for x in report["tamper"]:
        print("::error::TAMPER " + x)
    return 1 if report["tamper"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
