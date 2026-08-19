# -*- coding: utf-8 -*-
"""One-command Google AdSense integration. Run AFTER the owner has an approved
AdSense account:

    python3 tools/add_adsense.py ca-pub-XXXXXXXXXXXXXXXX

What it does (idempotent — safe to re-run):
1. Writes /ads.txt  (google.com, <pub-id>, DIRECT, f08c47fec0942fa0)
2. Injects the AdSense Auto Ads loader into the <head> of every indexed page
   (skips: noindex pages, widget.html, embeds — ad scripts inside iframes/share
   pages hurt UX and violate placement policy; skips working .md files).
Auto Ads lets Google pick placements — zero per-page ad-slot markup to maintain.
Sponsor slots (clearly-labeled) coexist fine with AdSense.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"ca-pub-\d{10,20}", sys.argv[1]):
        print("usage: python3 tools/add_adsense.py ca-pub-XXXXXXXXXXXXXXXX")
        sys.exit(1)
    pub = sys.argv[1]

    # 1. ads.txt
    with open(os.path.join(ROOT, "ads.txt"), "w") as f:
        f.write(f"google.com, {pub}, DIRECT, f08c47fec0942fa0\n")
    print("wrote ads.txt")

    snippet = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/'
               f'adsbygoogle.js?client={pub}" crossorigin="anonymous"></script>')

    skipped, injected = 0, 0
    pages = []
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("tools", "share", "node_modules")]
        for fn in files:
            if fn.endswith(".html"):
                pages.append(os.path.join(base, fn))
    for p in sorted(pages):
        rel = os.path.relpath(p, ROOT)
        html = open(p, encoding="utf-8").read()
        if 'name="robots" content="noindex' in html or rel == "widget.html":
            skipped += 1
            continue
        if "adsbygoogle.js" in html:
            skipped += 1
            continue
        if "</head>" not in html:
            skipped += 1
            continue
        html = html.replace("</head>", snippet + "\n</head>", 1)
        open(p, "w", encoding="utf-8").write(html)
        injected += 1
    print(f"injected AdSense loader into {injected} pages, skipped {skipped}")
    print("NEXT: python3 tools/validate.py && ship per CLAUDE.md")

if __name__ == "__main__":
    main()
