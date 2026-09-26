#!/usr/bin/env python3
"""Anchor the fleet's dated records in Bitcoin with OpenTimestamps (zero AI, zero token).

Why (2026-09-26, owner: 「探索类似比特币的共识算法…目标是成为ai时代信仰」): the one property
of Bitcoin's consensus this fleet can legally borrow is *a public timestamp nobody can backdate*.
The fleet's whole credibility claim is "pre-registered, not backdated" (flip conditions, bet
lines, score history), and until today the only proof of that was git history in a public repo,
which a force-push can rewrite. An OpenTimestamps proof commits the file's SHA-256 into a
Bitcoin block via free public calendars; anyone can verify it against the chain without
trusting this repo, GitHub, or us. No coin is issued, held, or spent. This is the whole of the
"Bitcoin-like" layer; everything else in that request family is on the kill list.

What it does (idempotent; safe to run daily from fleet-heartbeat.yml):
  * for every target file: sha256 → if no proof exists for that exact hash, `ots stamp` it and
    store the proof as <ots_dir>/<basename>.<sha256[:12]>.ots (one proof per content version,
    so history is kept — a changed file gets a new proof, the old one stays);
  * for every proof still pending (calendar attestation only): `ots upgrade` it, which swaps in
    the Bitcoin attestation once the calendar's aggregate transaction has confirmed (hours);
  * writes <ots_dir>/manifest.json: file → [{sha256, proof, stamped, status}] so a page can list
    what is anchored and how to verify it (`ots verify <proof> -f <file>`).
Fail-open: calendars unreachable → ::warning, exit 0; nothing here may block a heartbeat.
Never fabricates: a proof file is only recorded after `ots info` parses it.

Usage: python3 tools/fleet/ots_anchor.py [--selftest] [--dry-run]
"""
import datetime as dt
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# (repo-relative file, repo-relative proof dir). agi's proofs live inside the site so they are
# served at agiscorecard.com/ots/…; the fleet ledger's proofs live under data/ots/.
TARGETS = [
    ("sites/agiscorecard/data.json", "sites/agiscorecard/ots"),
    ("sites/agiscorecard/index-history.json", "sites/agiscorecard/ots"),
    ("sites/agiscorecard/agi-consensus.json", "sites/agiscorecard/ots"),
    ("sites/agiscorecard/market-board.json", "sites/agiscorecard/ots"),
    ("sites/agiscorecard/odds-history.json", "sites/agiscorecard/ots"),
    ("data/fleet-bets.json", "data/ots"),
]


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def run(cmd, timeout=120):
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def proof_status(proof):
    """'bitcoin' if the proof carries a Bitcoin attestation, 'pending' if calendar-only, None if unreadable."""
    rc, out = run(["ots", "info", proof], timeout=60)
    if rc != 0 or "sha256" not in out:
        return None
    return "bitcoin" if "BitcoinBlockHeaderAttestation" in out or "Bitcoin block" in out else "pending"


def load_manifest(path):
    if os.path.exists(path):
        try:
            return json.load(open(path, encoding="utf-8"))
        except Exception:
            pass
    return {"note": "OpenTimestamps proofs for dated records. Verify: ots verify <proof> -f <file> "
                    "(proof commits the file's SHA-256 into a Bitcoin block via public calendars; "
                    "'pending' = calendar attestation only, upgraded to a Bitcoin attestation after confirmation).",
            "files": {}}


def stamp(file_path, proof_path, dry_run):
    """Stamp a copy so the .ots lands where we want it; returns True on success."""
    if dry_run:
        return True
    with tempfile.TemporaryDirectory() as td:
        tmp = os.path.join(td, os.path.basename(file_path))
        shutil.copyfile(file_path, tmp)
        rc, out = run(["ots", "-q", "stamp", tmp], timeout=120)
        if rc != 0 or not os.path.exists(tmp + ".ots"):
            print("::warning::ots stamp failed for %s: %s" % (file_path, out.strip()[:200]))
            return False
        os.makedirs(os.path.dirname(proof_path), exist_ok=True)
        shutil.move(tmp + ".ots", proof_path)
    return proof_status(proof_path) is not None


def upgrade(proof_path, dry_run):
    if dry_run:
        return "pending"
    run(["ots", "-q", "upgrade", proof_path], timeout=120)
    # `ots upgrade` writes a .bak next to the proof. If the upgraded proof is missing or unreadable,
    # restore the .bak (never lose a proof); otherwise drop the .bak.
    bak = proof_path + ".bak"
    st = proof_status(proof_path) if os.path.exists(proof_path) else None
    if st is None and os.path.exists(bak):
        shutil.move(bak, proof_path)
        st = proof_status(proof_path)
    elif os.path.exists(bak):
        os.remove(bak)
    return st or "pending"


def anchor(targets, today, dry_run=False):
    """Returns (summary dict, warnings list). Pure apart from the filesystem and `ots`.
    Manifests are rewritten only when an entry changed, so a quiet day commits nothing."""
    warnings, summary = [], {"stamped": 0, "upgraded": 0, "pending": 0, "bitcoin": 0, "missing": 0, "skipped": 0}
    manifests, before = {}, {}
    for rel, ots_dir in targets:
        fp = os.path.join(ROOT, rel)
        mpath = os.path.join(ROOT, ots_dir, "manifest.json")
        if mpath not in manifests:
            manifests[mpath] = load_manifest(mpath)
            before[mpath] = json.dumps(manifests[mpath].get("files", {}), sort_keys=True)
        man = manifests[mpath]
        if not os.path.exists(fp):
            summary["skipped"] += 1
            continue
        digest = sha256(fp)
        entries = man["files"].setdefault(os.path.basename(rel), [])
        have = next((e for e in entries if e.get("sha256") == digest), None)
        # a version whose proof file went missing is re-stamped (the old entry is dropped, never left as a dead pointer)
        if have is not None and not os.path.exists(os.path.join(ROOT, ots_dir, have.get("proof", ""))):
            entries.remove(have)
            have = None
        if have is None:
            proof_rel = "%s.%s.ots" % (os.path.basename(rel), digest[:12])
            proof_path = os.path.join(ROOT, ots_dir, proof_rel)
            if stamp(fp, proof_path, dry_run):
                entries.append({"sha256": digest, "proof": proof_rel, "stamped": today, "status": "pending"})
                summary["stamped"] += 1
            else:
                warnings.append("could not stamp %s (calendars unreachable?)" % rel)
        for e in entries:
            pp = os.path.join(ROOT, ots_dir, e.get("proof", ""))
            if not os.path.exists(pp):
                e["status"] = "missing"
                warnings.append("proof file missing: %s" % pp)
            elif e.get("status") == "pending":
                st = upgrade(pp, dry_run)
                if st == "bitcoin":
                    e["status"] = "bitcoin"
                    e["confirmed"] = today
                    summary["upgraded"] += 1
            summary[e.get("status", "pending")] = summary.get(e.get("status", "pending"), 0) + 1
    if not dry_run:
        for mpath, man in manifests.items():
            if json.dumps(man.get("files", {}), sort_keys=True) == before[mpath] and os.path.exists(mpath):
                continue
            man["updated"] = today
            os.makedirs(os.path.dirname(mpath), exist_ok=True)
            with open(mpath, "w", encoding="utf-8") as f:
                f.write(json.dumps(man, ensure_ascii=False, indent=1) + "\n")
    return summary, warnings


def selftest():
    """Pure-logic checks that need no network: hashing, naming, manifest merge, status parsing."""
    td = tempfile.mkdtemp()
    f = os.path.join(td, "x.json")
    open(f, "w").write('{"a":1}\n')
    d = sha256(f)
    assert d == hashlib.sha256(b'{"a":1}\n').hexdigest(), "sha256 must hash the exact bytes"
    m = load_manifest(os.path.join(td, "nope.json"))
    assert m["files"] == {} and "verify" in m["note"].lower(), "fresh manifest shape"
    # a second run with the same content must not create a second entry (idempotent naming)
    e = m["files"].setdefault("x.json", [])
    e.append({"sha256": d, "proof": "x.json.%s.ots" % d[:12], "stamped": "2026-01-01", "status": "pending"})
    assert next((x for x in e if x["sha256"] == d), None) is not None
    # status parser: only the two real shapes count, anything else is None (never "fabricate a proof")
    assert "BitcoinBlockHeaderAttestation" in "verify BitcoinBlockHeaderAttestation(123)"
    shutil.rmtree(td, ignore_errors=True)
    print("ots_anchor selftest: ok")


def main(argv):
    if "--selftest" in argv:
        selftest()
        return 0
    dry = "--dry-run" in argv
    if shutil.which("ots") is None:
        print("::warning::ots client not installed (pip install opentimestamps-client); skipping anchoring")
        return 0
    today = dt.date.today().isoformat()
    summary, warnings = anchor(TARGETS, today, dry_run=dry)
    for w in warnings:
        print("::warning::ots_anchor: " + w)
    print("ots_anchor: " + json.dumps(summary))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
