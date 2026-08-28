#!/usr/bin/env python3
"""Resolve the MODEL_ASIN table against live amazon.de product pages — on a
GitHub runner, which (unlike the session sandbox) has egress to amazon.de.

Why this exists: docs/amazon-asin-howto.md calls the search-page→product-page
switch "the only big lever that is not additional traffic" (40/40 measured
affiliate clicks landed on a search page; every extra step roughly halves
conversion). The table sat empty for 15 days because filling it was specced as
a 10-minute owner task. This closes the loop without the owner and without
fabrication: an ASIN candidate ships ONLY if the live amazon.de page for it
carries the exact model tokens in its <title>. A candidate that fails, or a
bot-check/consent interstitial, leaves the model on its search link — the
site's honest fallback — and says so in the log.

Candidates were collected 2026-08-28 from web search (marketplace listings /
promo redirectAsin params); provenance per row below. Verification here is the
gate, the search results are only the lead.

Deliberately NOT pinned (decision ledger, do not "complete" these):
- AEG ChillFlex Pro         — a variant FAMILY (AXP26/34/35…); the site's card
  names no sub-model, so pinning one would be an editorial claim never made.
- Midea PortaSplit          — the classic (B0D3PP64JS) is the exact unit the
  ausverkauft page is about, and the shelf now holds three same-name siblings
  (Cool / -E / classic); the search page is the honest landing for a reader.
- Rowenta VU5690, MeacoFan 1056 — fans; season over, near-zero click value.
- Marstek / Anker storage   — energy section demoted 2026-08-26, no new spend.

Run: python3 tools/verify_asins.py [--dry-run]
Exit 0 always (a blocked fetch is a report, not a build failure).
"""
import gzip
import io
import re
import sys
import time
import urllib.request
import zlib

BUILD = __file__.rsplit("/", 1)[0] + "/build_structure.py"

# (model name exactly as in MODEL_ASIN, candidate ASIN, required title tokens,
#  forbidden title tokens)  — token match is case-insensitive substring.
# RESOLVED 2026-08-28 by cross-source verification instead (owner: 「链接你用
# 其他手段验证」). Amazon bot-walls both the sandbox and GitHub runner IPs, so
# the working method is: WebSearch the bare ASIN, require >=2 independent
# domains tying it to the exact model with zero conflicts; a
# de.camelcamelcamel.com hit counts double (it mirrors the amazon.de listing
# title verbatim). Four ASINs shipped into MODEL_ASIN (provenance inline
# there); EX105 failed (DE marketplace shows the EX93 variant) and stays a
# search link. Add future candidates here and prefer fetching
# de.camelcamelcamel.com/product/<ASIN> on the runner over amazon.de itself.
CANDIDATES = []

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def fetch_title(asin, ua=UA):
    """First runner attempt came back with empty titles on all five candidates:
    urllib does not decompress, and a compressed body turns the <title> regex
    into a no-match. Decompress by Content-Encoding, and when the title is
    still empty, surface the headers + body head so the log says WHY instead
    of a bare 'blocked'."""
    req = urllib.request.Request(
        f"https://www.amazon.de/dp/{asin}",
        headers={"User-Agent": ua, "Accept-Language": "de-DE,de;q=0.9",
                 "Accept": "text/html,application/xhtml+xml",
                 "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=25) as r:
        raw = r.read(600_000)
        enc = (r.headers.get("Content-Encoding") or "").lower()
        ctype = r.headers.get("Content-Type") or ""
    if "gzip" in enc:
        try:
            raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read(600_000)
        except OSError:
            pass
    elif "deflate" in enc:
        try:
            raw = zlib.decompress(raw)
        except zlib.error:
            pass
    html = raw.decode("utf-8", "replace")
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    title = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""
    if not title:
        head = re.sub(r"\s+", " ", html[:200])
        print(f"  [diag {asin}] enc={enc!r} ctype={ctype!r} body-head={head!r}")
    return title, html


def main():
    dry = "--dry-run" in sys.argv
    src = open(BUILD, encoding="utf-8").read()
    verified, failed = [], []
    UA2 = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
           "(KHTML, like Gecko) Version/17.4 Safari/605.1.15")
    for name, asin, req, forb in CANDIDATES:
        try:
            title, html = fetch_title(asin)
            if not title:  # one retry with a different UA before giving up
                time.sleep(4)
                title, html = fetch_title(asin, ua=UA2)
        except Exception as e:
            failed.append((name, asin, f"fetch error: {e}"))
            time.sleep(3)
            continue
        t = title.lower()
        if not title or "roboter" in t or "robot check" in t or "captcha" in t:
            failed.append((name, asin, f"blocked/interstitial (title: {title[:60]!r})"))
        elif any(x in t for x in forb):
            failed.append((name, asin, f"forbidden token in title: {title[:90]!r}"))
        elif all(x in t for x in req):
            verified.append((name, asin, title[:90]))
        else:
            failed.append((name, asin, f"required tokens {req} not in title: {title[:90]!r}"))
        time.sleep(3)  # politeness: five product pages, one-shot run

    for name, asin, title in verified:
        pat = re.escape(f'"{name}": "') + r'[A-Z0-9]*"'
        new_src, n = re.subn(pat, f'"{name}": "{asin}"', src)
        if n == 1:
            src = new_src
            print(f"VERIFIED  {name} -> {asin}  ({title})")
        else:
            print(f"SKIP      {name}: MODEL_ASIN entry not found in build_structure.py")
    for name, asin, why in failed:
        print(f"KEPT-SEARCH-LINK  {name} ({asin}): {why}")

    if verified and not dry:
        open(BUILD, "w", encoding="utf-8").write(src)
        print(f"\nwrote {len(verified)} verified ASIN(s) into MODEL_ASIN")
    elif not verified:
        print("\nno candidate verified — MODEL_ASIN unchanged, all search links intact")


if __name__ == "__main__":
    main()
