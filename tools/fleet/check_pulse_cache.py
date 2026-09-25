#!/usr/bin/env python3
"""A failure response must never be publicly cacheable.

2026-09-25. The account hit D1's free-tier daily row-read limit and 13 of 14
/api/pulse endpoints returned 500. Every one of those 500s carried
`cache-control: public, max-age=3600`, because the header object was built once
at the top of the handler and reused for the 200, the 503 and the 500 alike. So
a momentary D1 error was handed to every intermediary cache with permission to
replay it for an hour: the session read gridlings as 200 with real numbers while
the database was in fact refusing every query, and only the `generated` field
(absent from the cached body it actually got) would have given it away.

eco's own worker had written the rule down twice already, on handleHeat and
handleDew: "never freeze a failure into the cache for an hour". The read
endpoints that feed the fleet instruments were the ones that missed it.

The rule this asserts: if a response body carries a failure marker, the
cache-control it is served with may not say `public`. It covers both shapes that
exist in the fleet — a non-2xx status, and a 200 whose body says `live: false`
or `degraded: true`, which is how goldrush's fetchlog.json and SR's /api/pop
report a dead query.

Exit 1 on any finding; it is meant to go red.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# agi's worker lives three levels down, so the obvious glob missed the fleet's biggest
# site — and it had the same fault. A coverage hole reads exactly like a clean tree.
PATTERNS = ["sites/*/worker.js", "sites/*/src/worker.js", "sites/*/functions/api/*.js",
            "sites/*/tools/*-worker/index.js", "sites/*/functions/**/*.js"]

# A body that is telling the reader the query did not work.
FAILURE = re.compile(r"""ok['"]?\s*:\s*false|live['"]?\s*:\s*false|live_error|degraded['"]?\s*:\s*true""")
# const NAME = ... — the binding whose cache-control we then resolve.
BIND = re.compile(r"""^\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*(.*)$""")
CC = re.compile(r"""['"]cache-control['"]\s*:\s*([^,}\n]+)""")
# `headers: name` and the shorthand `{ status: 500, headers }` — both are real in the fleet,
# and the shorthand is the one the first version of this check missed, so it passed a
# deliberately broken tree. Anything that matches only the pretty form is not a check.
USES_NAMED = re.compile(r"""headers\s*:\s*([A-Za-z_$][\w$]*)""")
USES_SHORT = re.compile(r"""\bheaders\b(?!\s*:)""")
# Bare `json(` counts too. The first version required a prefix, so it silently ignored
# tds's helper — the very shape that motivated this file. `JSON.stringify(` does not
# match: the token before the paren is `stringify`, and `[Jj]son` needs lowercase.
HELPER_CALL = re.compile(r"""\b((?:[A-Za-z_$][\w$]*)?[Jj]son[\w$]*)\s*\(""")


def cc_of(expr, binds):
    """The cache-control an initializer resolves to. None = unknown/absent."""
    m = CC.search(expr)
    if m:
        v = m.group(1).strip()
        # A ternary on the status is exactly the fix; it is never unconditionally public.
        if "?" in v:
            return "conditional"
        return v.strip("'\"")
    sp = re.search(r"""\.\.\.([A-Za-z_$][\w$]*)""", expr)
    if sp:
        return binds.get(sp.group(1))
    return None


def check_file(path):
    lines = open(path, encoding="utf-8").read().splitlines()
    findings = []
    binds = {}      # name -> cache-control; nearest preceding binding wins
    helper_cc = {}  # json-ish helper name -> cache-control
    failures = 0
    for i, line in enumerate(lines, 1):
        m = BIND.match(line)
        if m:
            name = m.group(1)
            # An initializer can span lines (a json() helper usually does), so resolve it
            # over a window rather than the first line only.
            window = "\n".join(lines[i - 1:i + 9])
            v = cc_of(window, binds)
            # Rebind even when the initializer carries no cache-control: `headers` is
            # redefined per handler, and keeping the previous block's value would report
            # the /sub beacon (no cache-control at all) as if it were the pulse endpoint's.
            binds[name] = v
            if v is not None and HELPER_CALL.match(name + "("):
                helper_cc[name] = v
        if not FAILURE.search(line):
            continue
        if "Response" not in line and not HELPER_CALL.search(line):
            continue
        failures += 1
        seen = set(USES_NAMED.findall(line))
        if USES_SHORT.search(line):
            seen.add("headers")
        for h in HELPER_CALL.findall(line):
            if h in helper_cc:
                seen.add(h)
        for name in sorted(seen):
            v = binds.get(name)
            if v and "public" in v:
                findings.append((i, name, v, line.strip()[:110]))
    return findings, failures


def main():
    files = []
    for pat in PATTERNS:
        files += sorted(glob.glob(os.path.join(ROOT, pat), recursive=True))
    bad, total_failures, checked = [], 0, 0
    for f in files:
        findings, failures = check_file(f)
        total_failures += failures
        if failures:
            checked += 1
        rel = os.path.relpath(f, ROOT)
        for i, name, v, src in findings:
            bad.append(f"{rel}:{i}: failure response served with cache-control \"{v}\" (via `{name}`): {src}")
    print(f"checked {len(files)} handler files; {total_failures} failure responses in {checked} of them")
    if total_failures < 20:
        print(f"❌ only {total_failures} failure responses found — the check has gone vacuous, fix the matcher")
        return 1
    for b in bad:
        print("❌ " + b)
    if bad:
        print(f"::error::{len(bad)} failure response(s) are publicly cacheable; a momentary D1 error would be "
              "replayed for the full max-age. Serve errors with cache-control: no-store.")
        return 1
    print("✅ every failure response is no-store (or conditional on status)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
