#!/usr/bin/env python3
"""PRD P0-4: every pick must declare where its numbers come from. Runs in the deploy gate; exit 1 on drift.

data.js gets a file-level DATA_PROVENANCE (basis, asOf) and picks may carry `prov` overrides. This validator
asserts the required numeric fields exist, that provenance resolves for each of them, and prints the share of
numbers that are still editorial estimates — the honest starting point is 100 %.
"""
import json
import os
import re
import sys

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
REQ = ["price1688", "priceAlibaba", "retailPrice", "tariffUS", "moq"]


def load():
    d = load_data_js()
    return d.get("DATA_PROVENANCE"), d.get("PRODUCTS") or []

def load_data_js():
    """Evaluate site/data.js with node (strings contain colons, so regex-to-JSON is unsafe)."""
    import subprocess
    js = ("const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');"
          "const f=new Function(s+';return {PRODUCTS: typeof PRODUCTS!==\"undefined\"?PRODUCTS:[], DATA_PROVENANCE: typeof DATA_PROVENANCE!==\"undefined\"?DATA_PROVENANCE:null};');"
          "process.stdout.write(JSON.stringify(f()));")
    r = subprocess.run(["node", "-e", js, os.path.join(SITE, "data.js")], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        raise RuntimeError("node failed: " + r.stderr[:200])
    return json.loads(r.stdout)


def main():
    prov, picks = load()
    if not prov or not picks:
        print("::error::data.js lacks DATA_PROVENANCE or PRODUCTS is unparsable"); return 1
    if not re.match(r"\d{4}-\d{2}-\d{2}$", str(prov.get("asOf", ""))) or prov.get("basis") not in ("editorial-estimate", "sourced"):
        print("::error::DATA_PROVENANCE needs asOf (YYYY-MM-DD) and basis"); return 1
    bad, total, sourced = [], 0, 0
    for p in picks:
        for f in REQ:
            total += 1
            if f not in p:
                bad.append(f"{p.get('id')}: missing {f}"); continue
            pv = (p.get("prov") or {}).get(f)
            if pv:
                if not (isinstance(pv, dict) and pv.get("source") and re.match(r"\d{4}-\d{2}-\d{2}$", str(pv.get("asOf", "")))):
                    bad.append(f"{p.get('id')}: prov.{f} needs source + asOf")
                else:
                    sourced += 1
    for b in bad:
        print("::error::" + b)
    print(f"picks: {len(picks)}; numeric fields {total}; sourced {sourced} ({100*sourced//max(total,1)}%); editorial-estimate {total-sourced} (asOf {prov.get('asOf')})")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
