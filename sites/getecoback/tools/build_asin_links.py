#!/usr/bin/env python3
"""Send verified models to their product page, not to a search page (gate).

Found 2026-08-31 from D1: of 102 affiliate clicks in 30 days that carry a
link_url, 101 land on an amazon.de SEARCH page and exactly 1 on a /dp/ page.
The site's own docs/amazon-asin-howto.md records why that costs money — every
extra step between the click and the buy box roughly halves conversion.

Four ASINs were cross-verified on 2026-08-28 and baked into MODEL_ASIN, and
amazon_url() does use them — but only on the surfaces that call it. 43 links
sitewide still name one of those four models and still point at s?k=:
hand-written body links on the single-model test pages and the EN cluster,
plus two card builders in build_structure.py that concatenate their own URL.
This is the same class of bug as the sizer one fixed on 2026-08-30: the ASIN
table is right, the producing surfaces never learned about it.

Rewriting at the HTML level rather than chasing每 producer is deliberate — it
covers the hand-written links too, and the gate below means a new producer
that forgets amazon_url() fails the build instead of silently leaking.

Deliberately NOT rewritten (verification failed or was never attempted — an
invented ASIN sends the reader to the wrong product, which is worse than a
search page): De'Longhi Pinguino PAC EX105, AEG ChillFlex Pro, Midea
PortaSplit, MeacoFan 1056, Rowenta VU5690. Category searches
("mobile klimaanlage 14000 BTU", "Klarstein mobile Klimaanlage 12000 BTU")
are not model links and stay searches: no single product answers them.
"""
import glob, os, re, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
TAG = "getecoback-21"

# Distinctive model token -> verified ASIN. The token must be specific enough
# that no category search can contain it by accident; each is a manufacturer
# part number or a full product name, never a bare brand.
VERIFIED = [
    ("mpph-09crn7",              "B07KJYD1ZP"),   # Comfee MPPH-09CRN7
    ("mddf-20den7",              "B07KJX6RDK"),   # Comfee MDDF-20DEN7
    ("pac n90 eco silent",       "B07NC5CP6F"),   # De'Longhi PAC N90 ECO Silent
    ("kraftwerk smart 12k",      "B08VWSP8FW"),   # Klarstein Kraftwerk Smart 12K
]

SEARCH = re.compile(r'https://www\.amazon\.de/s\?k=([^"\'&<\s]+)&(?:amp;)?tag=' + TAG)


def asin_for(term_raw):
    """Return the ASIN if this search term names one verified model, else None."""
    t = urllib.parse.unquote_plus(term_raw).lower()
    t = re.sub(r"[^a-z0-9]+", " ", t).strip()
    hits = {a for tok, a in VERIFIED if re.sub(r"[^a-z0-9]+", " ", tok) in t}
    # A term that somehow matched two models is ambiguous — leave it a search.
    return hits.pop() if len(hits) == 1 else None


def rewrite(html):
    def sub(m):
        asin = asin_for(m.group(1))
        return f"https://www.amazon.de/dp/{asin}?tag={TAG}" if asin else m.group(0)
    return SEARCH.subn(sub, html)


def main():
    touched, links = 0, 0
    for path in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
        html = open(path, encoding="utf-8").read()
        new, _ = rewrite(html)
        n = sum(1 for _ in SEARCH.finditer(html)) - sum(1 for _ in SEARCH.finditer(new))
        if new != html:
            open(path, "w", encoding="utf-8").write(new)
            touched += 1
            links += n

    # Gate: no verified model may be left pointing at a search page, and every
    # dp link must carry the tag (an untagged direct link earns nothing).
    leaks, untagged = [], []
    for path in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
        html = open(path, encoding="utf-8").read()
        rel = os.path.relpath(path, ROOT)
        for m in SEARCH.finditer(html):
            if asin_for(m.group(1)):
                leaks.append(f"{rel}: {urllib.parse.unquote_plus(m.group(1))}")
        for m in re.finditer(r'https://www\.amazon\.de/dp/([A-Z0-9]{10})(\?tag=([\w-]+))?', html):
            if m.group(3) != TAG:
                untagged.append(f"{rel}: /dp/{m.group(1)}")
    if leaks:
        print(f"build_asin_links: {len(leaks)} verified model(s) still sent to a search page:")
        for l in leaks[:10]:
            print("  " + l)
        return 1
    if untagged:
        print(f"build_asin_links: {len(untagged)} direct link(s) missing tag={TAG}:")
        for u in untagged[:10]:
            print("  " + u)
        return 1
    dp = sum(len(re.findall(r'amazon\.de/dp/[A-Z0-9]{10}', open(p, encoding="utf-8").read()))
             for p in glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True))
    print(f"build_asin_links: {links} search link(s) on {touched} page(s) repointed to a product page; "
          f"{dp} direct links sitewide, all tagged")
    return 0


if __name__ == "__main__":
    sys.exit(main())
