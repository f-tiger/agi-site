#!/usr/bin/env python3
"""Read-only real-ledger smoke check. Emits a scoped refresh candidate, never publishes.
The full autopilot (network measurements, IndexNow, membership jobs) is not run.
"""
import argparse
import contextlib
import copy
import datetime as dt
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch
import demand_digest
import evolution
import pain_radar

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
HEADING = "## 用户痛点雷达 → Jarvis 站点扩展"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--today", default=dt.datetime.now(dt.timezone.utc).date().isoformat())
    parser.add_argument("--emit-candidates", action="store_true")
    args = parser.parse_args()
    today = dt.date.fromisoformat(args.today)
    raw = (DATA / "user-pain-radar.json").read_bytes()
    rows = pain_radar.evaluate(json.loads(raw), today, evolution.SITE_DIRS)
    selected = pain_radar.actions(rows)
    built, _ = evolution.build(today)
    if built["latest"]["user_pain_radar"] != rows:
        raise ValueError("evolution consumed a different radar")
    actual = [a for a in built["latest"]["actions"] if a["kind"].startswith("pain_point_")]
    if actual != selected:
        raise ValueError("radar actions lost or changed in evolution")
    for action in selected:
        manifest = built["manifests"][action["site"]]
        if evolution.compact_action(action) not in manifest["actions"]:
            raise ValueError("site manifest lost a pain action")
    # Exercise the actual digest against repository data, but only write a temp file.
    with tempfile.TemporaryDirectory() as tmp:
        target = Path(tmp) / "digest.md"
        with patch.object(demand_digest, "OUT", str(target)), \
             patch.object(sys, "argv", ["demand_digest.py", "--today=" + args.today]), \
             contextlib.redirect_stdout(io.StringIO()):
            if demand_digest.main() != 0:
                raise ValueError("digest generation failed")
        generated_digest = target.read_text(encoding="utf-8")
    section = pain_radar.markdown(rows)
    if section not in generated_digest:
        raise ValueError("digest did not render the same reviewed radar")
    for row in rows:
        if row["id"] not in generated_digest:
            raise ValueError("digest dropped a radar row")

    # Scoped catch-up: preserve old unrelated counters and their observation dates.
    prior = json.loads((DATA / "fleet-evolution/latest.json").read_text())
    latest = copy.deepcopy(prior)
    latest["user_pain_radar"] = rows
    latest["actions"] = sorted(
        [a for a in prior["actions"] if not a["kind"].startswith("pain_point_")] + selected,
        key=lambda a: (-a["priority"], a["site"], a["kind"]))
    checked_at = dt.datetime.now(dt.timezone.utc).isoformat()
    latest["user_pain_radar_checked_at"] = checked_at
    digest = (DATA / "autopilot/demand-digest.md").read_text(encoding="utf-8")
    if digest.count(HEADING) > 1:
        raise ValueError("duplicate radar section needs review")
    start = digest.find(HEADING)
    if start < 0:
        start = digest.find("## ")
        if start < 0:
            raise ValueError("no digest insertion boundary")
        digest = digest[:start] + section + "\n" + digest[start:]
    else:
        end = digest.find("\n## ", start + len(HEADING))
        digest = digest[:start] + section + "\n" + (digest[end + 1:] if end >= 0 else "")

    receipt = {
        "schema_version": 1, "checked_at": checked_at, "evaluation_date": args.today,
        "execution": "read-only repository pipeline smoke; not hosted Jarvis execution",
        "radar_sha256": hashlib.sha256(raw).hexdigest(),
        "rows": len(rows), "selected_actions": selected,
        "extension_actions": sum(a["kind"] == "pain_point_extension" for a in selected),
        "consumers": {"digest": "passed", "evolution": "passed", "site_manifests": "preview passed; not published"},
        "unrelated_snapshot_as_of_preserved": prior.get("as_of"),
        "network_measurements": False, "indexnow": False, "membership_operations": False,
    }
    candidates = {
        "data/autopilot/demand-digest.md": digest,
        "data/fleet-evolution/latest.json": json.dumps(latest, ensure_ascii=False, indent=2) + "\n",
        "data/fleet-evolution/latest.md": evolution.render_markdown(latest),
        "data/fleet-evolution/pain-radar-check.json": json.dumps(receipt, ensure_ascii=False, indent=2) + "\n",
    }
    print(json.dumps(receipt, ensure_ascii=False))
    if args.emit_candidates:
        print("PAIN_RADAR_CANDIDATES=" + json.dumps(candidates, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
