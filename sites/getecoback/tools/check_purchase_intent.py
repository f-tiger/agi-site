#!/usr/bin/env python3
"""Fail when a non-cooling purchase sheet sends readers to a BTU calculator."""
from pathlib import Path
import re
from build_structure import device_of

root = Path(__file__).resolve().parents[1] / "site"
checked = 0
errors = []
for page in root.rglob("*.html"):
    html = page.read_text()
    match = re.search(r"<!--EB_POPUP-->.*?<!--/EB_POPUP-->", html, re.S)
    if not match:
        continue
    checked += 1
    if device_of(page.stem) != "ac" and 'data-eb-pu="calc"' in match[0]:
        errors.append(str(page.relative_to(root)))
assert not errors, "Non-cooling buying sheets link to BTU: " + ", ".join(errors)
assert checked, "No purchase sheets checked"
print(f"PASS: {checked} purchase sheets; no non-cooling BTU detours")
