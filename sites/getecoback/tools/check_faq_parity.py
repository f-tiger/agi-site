#!/usr/bin/env python3
"""Build gate: every FAQPage JSON-LD entry must exist verbatim in the page's
visible text. Schema whose content is invisible on the page is the shape search
engines treat as deceptive markup — and this drift happened silently on 18 pages
(found 2026-08-28, including the site's most-cited page and a page published the
same day), because visible copy gets polished while the JSON-LD copy does not.
Like check_events/check_adlabel: if this fails, the build fails.

Check is text-level, not markup-level, so any FAQ markup shape passes as long as
the words are really on the page. Comparison normalises whitespace and entities
only — wording differences fail on purpose."""
import glob, html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")

def visible_text(s):
    v = re.sub(r'<script type="application/ld\+json">.*?</script>', '', s, flags=re.S)
    v = re.sub(r'<script\b.*?</script>', '', v, flags=re.S)
    v = re.sub(r'<style\b.*?</style>', '', v, flags=re.S)
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', v)))

def main():
    bad = []
    files = glob.glob(os.path.join(SITE, "guide", "*.html")) + \
            glob.glob(os.path.join(SITE, "en", "guide", "*.html"))
    checked = 0
    for f in sorted(files):
        s = open(f, encoding="utf-8").read()
        faq = None
        for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
            try:
                d = json.loads(m.group(1))
            except Exception:
                bad.append((f, "JSON-LD does not parse")); continue
            for n in (d.get("@graph") or [d]):
                if n.get("@type") == "FAQPage":
                    faq = n
        if not faq:
            continue
        checked += 1
        vtxt = visible_text(s)
        for it in faq.get("mainEntity", []):
            q = it.get("name", "")
            a = " ".join(it.get("acceptedAnswer", {}).get("text", "").split())
            if q not in vtxt:
                bad.append((f, f"question not visible: {q[:70]}"))
            elif a not in vtxt:
                bad.append((f, f"answer drifted: {q[:70]}"))
    rel = lambda p: os.path.relpath(p, ROOT)
    if bad:
        print(f"check_faq_parity: {len(bad)} violation(s) on {len(set(f for f,_ in bad))} page(s):")
        for f, msg in bad[:30]:
            print(f"  {rel(f)}: {msg}")
        sys.exit(1)
    print(f"check_faq_parity: {checked} FAQ pages, all JSON-LD entries visible verbatim")

if __name__ == "__main__":
    main()
