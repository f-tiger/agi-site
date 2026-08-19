#!/usr/bin/env python3
"""Fail the build if the site fires an event the Worker would silently drop.

`/api/ev` only stores names on its whitelist, so a new gtag event added to a page
would look like zero forever in the funnel — the worst kind of analytics bug,
because nothing errors and the number is simply wrong. This ties the two sides
together at build time.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
WORKER = os.path.join(ROOT, "src", "worker.js")


def used_names():
    names = set()
    files = glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)
    files += glob.glob(os.path.join(SITE, "js", "*.js"))
    for path in files:
        text = open(path, encoding="utf-8").read()
        names |= set(re.findall(r'gtag\(\s*["\']event["\']\s*,\s*["\']([a-z_0-9]+)["\']', text))
        names |= set(re.findall(r'send\(\s*["\']([a-z_0-9]+)["\']', text))
        # widgets post their beacon body directly instead of going through send()
        names |= set(re.findall(r'\bn:\s*["\']([a-z_0-9]+)["\']', text))
    return names


def whitelisted():
    text = open(WORKER, encoding="utf-8").read()
    block = re.search(r"const EV_NAMES = new Set\(\[(.*?)\]\)", text, re.S)
    if not block:
        sys.exit("check_events: EV_NAMES not found in src/worker.js")
    return set(re.findall(r'"([a-z_0-9]+)"', block.group(1)))


def main():
    used, allowed = used_names(), whitelisted()
    missing = sorted(used - allowed)
    if missing:
        print("check_events: these events are fired but would be dropped by /api/ev:")
        for name in missing:
            print(f"  - {name}")
        print("Add them to EV_NAMES in src/worker.js.")
        return 1
    unused = sorted(allowed - used)
    print(f"check_events: {len(used)} event names, all whitelisted"
          + (f" (whitelisted but unused: {', '.join(unused)})" if unused else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
