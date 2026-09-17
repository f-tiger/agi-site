#!/usr/bin/env python3
"""Post-deploy assertion for the live MCP server (called by deploy-buysomething.yml).

Takes the two JSON-RPC responses the self-check just fetched from production and asserts the three
things that make this server worth calling at all:
  1. the protocol answered (initialize echoes the requested protocol version);
  2. the fact-check still returns the dated verdict — if the $800 de minimis ever stops coming back
     "false since 2026-06-24", the machine face is feeding agents the superseded 2025 answer;
  3. nothing in the output carries an affiliate or tracking parameter.
Usage: assert_mcp_live.py initialize.json toolscall.json   |   --selftest
"""
import json
import sys

TRACKERS = ["?tag=", "&tag=", "utm_", "amzn.to", "/dp/"]


def check(init_resp, call_resp):
    """Pure: returns a list of problems (empty = ok)."""
    bad = []
    try:
        if init_resp["result"]["protocolVersion"] != "2025-06-18":
            bad.append("initialize returned protocolVersion %r" % init_resp["result"].get("protocolVersion"))
    except Exception as e:
        bad.append("initialize response unusable: %s" % e)
    try:
        matched = call_resp["result"]["structuredContent"]["matched"]
        if not matched:
            bad.append("check_import_claim('under $800 is duty free') matched nothing — the dated record is not being served")
        elif "false since 2026-06-24" not in matched[0]["verdict"]:
            bad.append("de minimis verdict changed to %r" % matched[0]["verdict"])
        elif not matched[0].get("sources"):
            bad.append("verdict served without sources")
    except Exception as e:
        bad.append("tools/call response unusable: %s" % e)
    blob = json.dumps([init_resp, call_resp])
    for t in TRACKERS:
        if t in blob:
            bad.append("affiliate/tracking marker in MCP output: %s" % t)
    return bad


def selftest():
    good_init = {"result": {"protocolVersion": "2025-06-18"}}
    good_call = {"result": {"structuredContent": {"matched": [{"verdict": "false since 2026-06-24", "sources": ["https://www.federalregister.gov/x"]}]}}}
    assert check(good_init, good_call) == [], check(good_init, good_call)
    assert check({"result": {"protocolVersion": "1999-01-01"}}, good_call), "wrong protocol must fail"
    assert check(good_init, {"result": {"structuredContent": {"matched": []}}}), "empty verdict must fail"
    stale = {"result": {"structuredContent": {"matched": [{"verdict": "true, still $800", "sources": ["u"]}]}}}
    assert check(good_init, stale), "stale verdict must fail"
    dirty = {"result": {"structuredContent": {"matched": [{"verdict": "false since 2026-06-24", "sources": ["https://x?tag=foo-20"]}]}}}
    assert check(good_init, dirty), "tracking parameter must fail"
    print("assert_mcp_live selftest: OK")


def main(argv):
    if "--selftest" in argv:
        selftest()
        return 0
    if len(argv) < 3:
        print("::error::usage: assert_mcp_live.py initialize.json toolscall.json")
        return 2
    try:
        a = json.load(open(argv[1], encoding="utf-8"))
        b = json.load(open(argv[2], encoding="utf-8"))
    except Exception as e:
        print("::error::MCP self-check could not read responses: %s" % e)
        return 1
    bad = check(a, b)
    for x in bad:
        print("::error::MCP live: " + x)
    if bad:
        return 1
    print("OK    MCP live: initialize + check_import_claim($800 -> false since 2026-06-24), zero tracking params")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
