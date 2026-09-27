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
  * writes <ots_dir>/manifest.json: file → [{sha256, proof, stamped, status, size}] so a page can
    list what is anchored and how to verify it (`ots verify <proof> -f <file>`).

Append-only targets (2026-09-27): data/metaculus/forecasts.jsonl is the Metaculus bot's sealed
point-in-time ledger. It only ever grows, so a new stamp is taken whenever lines were appended, and
every entry added from today on records "size" = byte length of the version it stamped and
"stamped_at" = the UTC second it was stamped (entries made before that stay exactly as they were).
Because the file is append-only, the version stamped with size N is exactly the first N bytes of
today's file: `head -c N forecasts.jsonl > v && ots verify <proof> -f v` proves those lines existed
by that Bitcoin block, and tools/fleet/verify_commitments.py checks every stamped prefix still
matches (a rewritten earlier line breaks it).
Two groups, one writer per manifest (2026-09-27 integration): the default group (site records +
bet ledger) is stamped by the daily heartbeat; `--group ledger` (the forecast ledger, proofs in
data/metaculus/ots/) is stamped by metaculus-bot.yml in the same job that appends the lines, so a
forecast is anchored minutes after it is submitted instead of at the next heartbeat (a question
that opens and closes between two heartbeats would otherwise never get a pre-close anchor), and the
two workflows never rebase against each other's manifest edits.
Fail-open: calendars unreachable → ::warning, exit 0; nothing here may block a heartbeat.
Never fabricates: a proof file is only recorded after `ots info` parses it.
Fails closed on history (2026-09-27 review): a manifest.json that exists but does not parse, or is
missing while its directory still holds proofs, is never rebuilt. Rebuilding it lists only today's
versions and silently erases every earlier stamped one, which is the exact evidence the
append-only check needs (the review reproduced a rewritten ledger passing clean that way). Such a
directory is skipped with ::error until a human restores the manifest from git. For the same reason
an existing proof file is never overwritten: under a name with no manifest entry it may be the
Bitcoin-confirmed proof of that very version.

Usage: python3 tools/fleet/ots_anchor.py [--selftest] [--dry-run] [--group default|ledger]
Exit 2 when any manifest was refused (so the calling step turns red instead of only annotating).
"""
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

# (repo-relative file, repo-relative proof dir). agi's proofs live inside the site so they are
# served at agiscorecard.com/ots/…; the fleet ledger's proofs live under data/ots/.
TARGETS = [
    ("sites/agiscorecard/data.json", "sites/agiscorecard/ots"),
    ("sites/agiscorecard/index-history.json", "sites/agiscorecard/ots"),
    ("sites/agiscorecard/agi-consensus.json", "sites/agiscorecard/ots"),
    ("sites/agiscorecard/market-board.json", "sites/agiscorecard/ots"),
    ("sites/agiscorecard/odds-history.json", "sites/agiscorecard/ots"),
    ("sites/agiscorecard/independent-grades.json", "sites/agiscorecard/ots"),
    ("data/fleet-bets.json", "data/ots"),
]
# The forecast ledger has its own manifest and its own writer (metaculus-bot.yml, --group ledger).
LEDGER_TARGETS = [
    ("data/metaculus/forecasts.jsonl", "data/metaculus/ots"),
]
GROUPS = {"default": TARGETS, "ledger": LEDGER_TARGETS}

# Targets that only ever grow. Their manifest carries a one-line how-to for checking a stamped
# prefix; tools/fleet/verify_commitments.py keeps its own copy of this list on purpose (a verifier
# that learned what to check from the manifest could be told to check nothing).
APPEND_ONLY = {
    "data/metaculus/forecasts.jsonl": "append-only: the version stamped with \"size\" N is the first N bytes "
                                      "of today's file. Verify: head -c N forecasts.jsonl > v && ots verify <proof> -f v",
}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def run(cmd, timeout=120):
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def proof_info(proof):
    """(status, sha256 the proof commits to) from `ots info`. status: 'bitcoin' if the proof carries a
    Bitcoin attestation, 'pending' if calendar-only, None if unreadable; the digest is None when the
    client's output does not name it (older clients), never guessed."""
    rc, out = run(["ots", "info", proof], timeout=60)
    if rc != 0 or "sha256" not in out:
        return None, None
    m = re.search(r"File sha256 hash: ([0-9a-f]{64})", out)
    status = "bitcoin" if "BitcoinBlockHeaderAttestation" in out or "Bitcoin block" in out else "pending"
    return status, (m.group(1) if m else None)


def proof_status(proof):
    """'bitcoin' if the proof carries a Bitcoin attestation, 'pending' if calendar-only, None if unreadable."""
    return proof_info(proof)[0]


def load_manifest(path):
    """The manifest at `path`; a fresh one when there is no file; None when the file exists but is not a
    readable manifest (a merge-conflict marker, a truncated write). None means "leave it alone": starting
    fresh over an unreadable manifest would drop every earlier stamped version."""
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                man = json.load(f)
        except (OSError, ValueError):
            return None
        files = man.get("files") if isinstance(man, dict) else None
        if not isinstance(files, dict) or not all(isinstance(v, list) and all(isinstance(e, dict) for e in v)
                                                  for v in files.values()):
            return None
        return man
    return {"note": "OpenTimestamps proofs for dated records. Verify: ots verify <proof> -f <file> "
                    "(proof commits the file's SHA-256 into a Bitcoin block via public calendars; "
                    "'pending' = calendar attestation only, upgraded to a Bitcoin attestation after confirmation).",
            "files": {}}


def stamp(file_path, proof_path, dry_run, data=None):
    """Stamp a copy so the .ots lands where we want it; returns True on success.

    `data` = the exact bytes that were hashed (and whose length is recorded as "size"); stamping
    those rather than re-reading the file means the proof, the manifest's sha256 and its size all
    describe one version even if the file were to change in between.

    Nothing lands at `proof_path` unless it is new there and checked: the proof is parsed where the
    client wrote it and moved into place only then, so a failed or mismatched stamp leaves no file behind."""
    if os.path.exists(proof_path):
        # this version's proof name is taken but no manifest entry points at it (an entry was dropped).
        # It may be the Bitcoin-confirmed proof of these very bytes; a fresh pending one must not replace it.
        print("::warning::%s already exists with no manifest entry; left untouched and not re-stamped "
              "(re-list it with its original stamp day from git, or remove it by hand)" % proof_path)
        return False
    if dry_run:
        return True
    with tempfile.TemporaryDirectory() as td:
        tmp = os.path.join(td, os.path.basename(file_path))
        if data is None:
            shutil.copyfile(file_path, tmp)
        else:
            with open(tmp, "wb") as fh:
                fh.write(data)
        rc, out = run(["ots", "-q", "stamp", tmp], timeout=120)
        if rc != 0 or not os.path.exists(tmp + ".ots"):
            print("::warning::ots stamp failed for %s: %s" % (file_path, out.strip()[:200]))
            return False
        status, committed = proof_info(tmp + ".ots")
        if status is None:
            print("::warning::ots stamp for %s produced a proof `ots info` cannot read; discarded" % file_path)
            return False
        if data is not None and committed is not None and committed != hashlib.sha256(data).hexdigest():
            # a proof for other bytes would make the manifest lie; drop it and let tomorrow retry
            print("::warning::ots proof for %s commits to %s, not the bytes hashed; discarded" % (file_path, committed[:12]))
            return False
        os.makedirs(os.path.dirname(proof_path), exist_ok=True)
        shutil.move(tmp + ".ots", proof_path)
    return True


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


def utc_now_iso():
    """The stamp time recorded next to a new entry. Our clock, not the proof's: the Bitcoin block that
    later attests the digest is at or after it, so it is the lower bound a pre-close claim needs."""
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def anchor(targets, today, dry_run=False, root=None):
    """Returns (summary dict, warnings list). Pure apart from the filesystem and `ots`.
    Manifests are rewritten only when an entry changed, so a quiet day commits nothing.
    A manifest that is unreadable, or missing while its directory holds proofs, is never rewritten:
    its targets are skipped ("refused") with ::error, every day, until a human restores it.
    `root` defaults to the repo (the selftest points it at a temp dir)."""
    root = root or ROOT
    warnings = []
    summary = {"stamped": 0, "upgraded": 0, "pending": 0, "bitcoin": 0, "missing": 0, "skipped": 0, "refused": 0}
    manifests, before, append_only = {}, {}, {}
    for rel, ots_dir in targets:
        fp = os.path.join(root, rel)
        mpath = os.path.join(root, ots_dir, "manifest.json")
        if mpath not in manifests:
            man = load_manifest(mpath)
            mrel = os.path.join(ots_dir, "manifest.json")
            if man is None:
                print("::error::ots_anchor: %s exists but is not a readable manifest; left as is and its targets not "
                      "stamped (starting fresh would erase every earlier stamped version). Restore it from git." % mrel)
            elif not os.path.exists(mpath) and os.path.isdir(os.path.dirname(mpath)) and any(
                    f.endswith(".ots") for f in os.listdir(os.path.dirname(mpath))):
                print("::error::ots_anchor: %s is missing but %s still holds proofs; not rebuilt and its targets not "
                      "stamped (a rebuilt manifest would list only today's versions). Restore it from git." % (mrel, ots_dir))
                man = None
            manifests[mpath] = man
            before[mpath] = None if man is None else json.dumps(man.get("files", {}), sort_keys=True)
        man = manifests[mpath]
        if man is None:
            summary["refused"] += 1
            continue
        if not os.path.exists(fp):
            summary["skipped"] += 1
            continue
        if rel in APPEND_ONLY:
            append_only.setdefault(mpath, {})[os.path.basename(rel)] = APPEND_ONLY[rel]
        with open(fp, "rb") as fh:
            data = fh.read()  # hashed, measured and stamped from these same bytes
        digest = hashlib.sha256(data).hexdigest()
        entries = man["files"].setdefault(os.path.basename(rel), [])
        have = next((e for e in entries if e.get("sha256") == digest), None)
        # a version whose proof file went missing is re-stamped (the old entry is dropped, never left as a dead pointer)
        if have is not None and not os.path.exists(os.path.join(root, ots_dir, have.get("proof", ""))):
            entries.remove(have)
            have = None
        if have is None:
            proof_rel = "%s.%s.ots" % (os.path.basename(rel), digest[:12])
            proof_path = os.path.join(root, ots_dir, proof_rel)
            if stamp(fp, proof_path, dry_run, data=data):
                entries.append({"sha256": digest, "proof": proof_rel, "stamped": today, "status": "pending",
                                "size": len(data), "stamped_at": utc_now_iso()})
                summary["stamped"] += 1
            else:
                warnings.append("could not stamp %s (calendars unreachable, or see the warning above)" % rel)
        for e in entries:
            pp = os.path.join(root, ots_dir, e.get("proof", ""))
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
            if man is None:  # refused above: its bytes stay exactly as found
                continue
            if json.dumps(man.get("files", {}), sort_keys=True) == before[mpath] and os.path.exists(mpath):
                continue
            if mpath in append_only:  # only on a rewrite an entry forced; other manifests never gain the key
                man.setdefault("append_only", {}).update(append_only[mpath])
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
    # the fail-closed cases below print ::error:: / ::warning:: on purpose; captured here so a healthy
    # heartbeat log carries no annotations from its own selftest (replayed only if the selftest fails)
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            anchor_selftest()
    except BaseException:
        sys.stdout.write(out.getvalue())
        raise
    said = out.getvalue()
    assert said.count("::error::") == 2 and "is missing but" in said and "not a readable manifest" in said, \
        "a refused manifest is reported as an error, once per run"
    assert "already exists with no manifest entry" in said, "a refused re-stamp says why"
    # one writer per manifest (2026-09-27): the heartbeat's default group never touches the ledger's
    # proofs, and the ledger group touches nothing else — two workflows editing one manifest.json
    # would rebase against each other.
    dirs = lambda g: {d for _, d in GROUPS[g]}
    assert not dirs("default") & dirs("ledger"), "the two groups share no proof directory"
    assert [r for r, _ in GROUPS["ledger"]] == ["data/metaculus/forecasts.jsonl"], "the ledger group is the ledger only"
    assert all(r in dict(GROUPS["ledger"]) for r in APPEND_ONLY), "every append-only target is in the ledger group"
    iso = utc_now_iso()
    assert iso.endswith("+00:00") and dt.datetime.fromisoformat(iso).tzinfo is not None, "stamped_at is UTC, to the second"
    print("ots_anchor selftest: ok")


def anchor_selftest():
    """anchor() end to end in a temp root, with `stamp`/`upgrade` swapped for offline fakes (no
    calendar, no `ots`): the "size" field, the append-only prefix property, idempotence, legacy
    entries left untouched, and the append_only how-to only where an append-only target lives."""
    global stamp, upgrade
    real_stamp, real_upgrade = stamp, upgrade
    stamped_bytes = {}

    def fake_stamp(file_path, proof_path, dry_run, data=None):
        stamped_bytes[proof_path] = data
        os.makedirs(os.path.dirname(proof_path), exist_ok=True)
        open(proof_path, "wb").write(b"fake proof")
        return True

    stamp, upgrade = fake_stamp, (lambda proof_path, dry_run: "pending")
    td = tempfile.mkdtemp()
    try:
        led_rel, bets_rel = "data/metaculus/forecasts.jsonl", "data/fleet-bets.json"
        assert led_rel in APPEND_ONLY and bets_rel not in APPEND_ONLY
        led, bets = os.path.join(td, led_rel), os.path.join(td, bets_rel)
        os.makedirs(os.path.dirname(led))
        v1 = b'{"digest":"a","question_id":1}\n'
        open(led, "wb").write(v1)
        open(bets, "wb").write(b'{"bets":[]}\n')
        # a legacy entry (no "size") already in the manifest must survive byte for byte
        legacy = {"sha256": "0" * 64, "proof": "fleet-bets.json.000000000000.ots", "stamped": "2026-09-26",
                  "status": "bitcoin", "confirmed": "2026-09-26"}
        os.makedirs(os.path.join(td, "data/ots"))
        open(os.path.join(td, "data/ots", legacy["proof"]), "wb").write(b"old proof")
        json.dump({"note": "kept as is", "files": {"fleet-bets.json": [dict(legacy)]}},
                  open(os.path.join(td, "data/ots/manifest.json"), "w"))
        targets = [(bets_rel, "data/ots"), (led_rel, "data/ots")]
        mpath = os.path.join(td, "data/ots/manifest.json")

        summary, _ = anchor(targets, "2026-10-01", root=td)
        man = json.load(open(mpath))
        e1 = man["files"]["forecasts.jsonl"]
        assert summary["stamped"] == 2 and len(e1) == 1, "one new version per changed target"
        assert e1[0]["size"] == len(v1) == os.path.getsize(led), "size = byte length of the stamped version"
        assert dt.datetime.fromisoformat(e1[0]["stamped_at"]).date().isoformat() == dt.datetime.now(dt.timezone.utc).date().isoformat(), \
            "every new entry records the UTC second it was stamped"
        assert e1[0]["sha256"] == hashlib.sha256(v1).hexdigest()
        assert stamped_bytes[os.path.join(td, "data/ots", e1[0]["proof"])] == v1, "stamp gets the hashed bytes"
        assert man["files"]["fleet-bets.json"][0] == legacy, "legacy entry untouched (no size added)"
        assert man["files"]["fleet-bets.json"][1]["size"] == len(b'{"bets":[]}\n'), "every new entry records size"
        assert man["note"] == "kept as is", "an existing manifest keeps its note"
        assert set(man.get("append_only", {})) == {"forecasts.jsonl"}, "how-to only for the append-only target"

        raw = open(mpath, "rb").read()
        summary, _ = anchor(targets, "2026-10-02", root=td)
        assert summary["stamped"] == 0 and open(mpath, "rb").read() == raw, "a quiet day rewrites nothing"

        v2 = v1 + b'{"digest":"b","question_id":2}\n'
        open(led, "wb").write(v2)
        anchor(targets, "2026-10-03", root=td)
        e2 = json.load(open(mpath))["files"]["forecasts.jsonl"]
        assert len(e2) == 2 and e2[0] == e1[0], "an append adds a version and never edits the older one"
        assert e2[1]["size"] == len(v2) and e2[1]["stamped"] == "2026-10-03"
        assert hashlib.sha256(v2[:e2[0]["size"]]).hexdigest() == e2[0]["sha256"], "old version = prefix of the new file"

        # a manifest with no append-only target never gains the key
        other = os.path.join(td, "site")
        os.makedirs(other)
        open(os.path.join(other, "x.json"), "wb").write(b"{}\n")
        anchor([("site/x.json", "site/ots")], "2026-10-03", root=td)
        mo = json.load(open(os.path.join(td, "site/ots/manifest.json")))
        assert "append_only" not in mo and mo["files"]["x.json"][0]["size"] == 3

        # fail closed (2026-09-27 review): the heartbeat anchors before anything else reads the manifest, so a
        # manifest this step rebuilt would be the only one the verifier ever sees. An earlier line rewritten
        # and the manifest broken on the same day must leave the manifest, and every proof, exactly as found.
        odir = os.path.join(td, "data/ots")
        proofs = lambda: {f: open(os.path.join(odir, f), "rb").read() for f in os.listdir(odir) if f.endswith(".ots")}
        kept = proofs()
        open(led, "wb").write(v2.replace(b'"digest":"a"', b'"digest":"z"'))
        open(mpath, "ab").write(b"<<<<<<< HEAD\n")
        broken = open(mpath, "rb").read()
        summary, _ = anchor(targets + [("site/x.json", "site/ots")], "2026-10-04", root=td)
        assert open(mpath, "rb").read() == broken, "an unreadable manifest is left byte for byte"
        assert summary["refused"] == 2 and summary["stamped"] == 0 and proofs() == kept, "nothing stamped over it"
        assert load_manifest(mpath) is None and load_manifest(os.path.join(td, "site/ots/manifest.json")) is not None
        os.remove(mpath)
        summary, _ = anchor(targets, "2026-10-04", root=td)
        assert not os.path.exists(mpath) and summary["refused"] == 2 and proofs() == kept, \
            "a missing manifest next to existing proofs is not rebuilt"
    finally:
        stamp, upgrade = real_stamp, real_upgrade
        shutil.rmtree(td, ignore_errors=True)
    stamp_selftest()


# the fixed part of every OpenTimestamps proof file: magic, major version 1, then the sha256 op tag;
# the 32 bytes after it are the digest the proof commits to
OTS_HEADER = b"\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94" + b"\x01\x08"


def stamp_selftest():
    """The real stamp() (and anchor() around it) with `run` swapped for an offline fake client: a proof lands
    only when its name is free and it commits to the hashed bytes; an existing proof is never replaced, even
    when the manifest entry pointing at it was dropped; a failed or mismatched stamp leaves nothing behind."""
    global run
    real_run = run
    mode, calls = {"commit_to": None, "garbled": False}, []

    def fake_run(cmd, timeout=120):
        calls.append(cmd[1:3])
        if cmd[:3] == ["ots", "-q", "stamp"]:
            body = open(cmd[3], "rb").read()
            open(cmd[3] + ".ots", "wb").write(OTS_HEADER + hashlib.sha256(mode["commit_to"] or body).digest() + b"ops")
            return 0, ""
        if cmd[:2] == ["ots", "info"]:
            b = open(cmd[2], "rb").read()
            if mode["garbled"] or not b.startswith(OTS_HEADER):
                return 1, "Error! '%s' is not a timestamp file." % cmd[2]
            return 0, "File sha256 hash: %s\nTimestamp:\nverify PendingAttestation('https://a.pool')\n" % \
                b[len(OTS_HEADER):len(OTS_HEADER) + 32].hex()
        return 1, "offline"  # `ots upgrade`: nothing to upgrade

    run = fake_run
    td = tempfile.mkdtemp()
    try:
        f, p = os.path.join(td, "f.json"), os.path.join(td, "ots", "f.json.a.ots")
        assert stamp(f, p, False, data=b"v1") and open(p, "rb").read()[len(OTS_HEADER):][:32] == hashlib.sha256(b"v1").digest()
        held, calls[:] = open(p, "rb").read(), []
        assert not stamp(f, p, False, data=b"v1") and not stamp(f, p, True, data=b"v1"), "a taken name is refused, dry run too"
        assert open(p, "rb").read() == held and calls == [], "an existing proof is never replaced, no calendar asked"
        mode["commit_to"] = b"other bytes"
        assert not stamp(f, p + "2", False, data=b"v1") and not os.path.exists(p + "2"), "a mismatched proof leaves nothing"
        mode["commit_to"], mode["garbled"] = None, True
        assert not stamp(f, p + "3", False, data=b"v1") and not os.path.exists(p + "3"), "an unreadable proof leaves nothing"
        mode["garbled"] = False

        # the manifest entry of the current version was dropped by hand while its proof stayed: anchor() must
        # not re-stamp over that proof (it may be the Bitcoin-confirmed one), only warn
        rel = "data/metaculus/forecasts.jsonl"
        os.makedirs(os.path.join(td, "data/metaculus"))
        open(os.path.join(td, rel), "wb").write(b'{"digest":"a"}\n')
        anchor([(rel, "data/ots")], "2026-10-01", root=td)
        mp = os.path.join(td, "data/ots/manifest.json")
        man = json.load(open(mp))
        proof = os.path.join(td, "data/ots", man["files"]["forecasts.jsonl"][0]["proof"])
        held = open(proof, "rb").read()
        man["files"]["forecasts.jsonl"] = []
        open(mp, "w").write(json.dumps(man))
        summary, warns = anchor([(rel, "data/ots")], "2026-10-02", root=td)
        assert summary["stamped"] == 0 and open(proof, "rb").read() == held and warns, "an orphaned proof is kept, with a warning"
    finally:
        run = real_run
        shutil.rmtree(td, ignore_errors=True)


def main(argv):
    if "--selftest" in argv:
        selftest()
        return 0
    dry = "--dry-run" in argv
    if shutil.which("ots") is None:
        print("::warning::ots client not installed (pip install opentimestamps-client); skipping anchoring")
        return 0
    group = argv[argv.index("--group") + 1] if "--group" in argv else "default"
    if group not in GROUPS:
        print("::error::ots_anchor: unknown --group %r (known: %s)" % (group, ", ".join(sorted(GROUPS))))
        return 2
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    summary, warnings = anchor(GROUPS[group], today, dry_run=dry)
    for w in warnings:
        print("::warning::ots_anchor: " + w)
    print("ots_anchor[%s]: %s" % (group, json.dumps(summary)))
    # a refused manifest is history that can no longer be extended; say so with the exit code too
    return 2 if summary.get("refused") else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
