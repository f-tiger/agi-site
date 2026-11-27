#!/usr/bin/env python3
"""Use an approved product page for a reviewed, exact model query.

Other queries stay searches, including different model suffixes, accessories,
bundles and comparisons. A model token alone inside a longer search does not
identify the offered product. Keep the site's existing affiliate tag on links
that do go directly to a German product page.
"""
import glob, os, re, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
TAG = "getecoback-21"

# Complete normalized search terms for the already verified German models.
# These include the branded forms emitted by the current page builders.
VERIFIED_QUERIES = {
    "B07KJYD1ZP": ("mpph 09crn7", "comfee mpph 09crn7"),
    "B07KJX6RDK": (
        "mddf 20den7",
        "comfee mddf 20den7",
        "comfee mddf 20den7 luftentfeuchter",
        "comfee mddf 20den7 ohne wf",
    ),
    "B07NC5CP6F": ("pac n90 eco silent", "de longhi pac n90 eco silent", "delonghi pac n90 eco silent"),
    "B08VWSP8FW": ("kraftwerk smart 12k", "klarstein kraftwerk smart 12k"),
    "B0F3XL6LK6": ("pac ap98", "pinguino gentlejet pac ap98", "de longhi pinguino gentlejet pac ap98"),
}
ASIN_BY_QUERY = {query: asin for asin, queries in VERIFIED_QUERIES.items() for query in queries}

SEARCH = re.compile(r'https://www\.amazon\.de/s\?k=([^"\'&<\s]+)&(?:amp;)?tag=' + TAG + r'(?=["\'&<\s]|$)')


def asin_for(term_raw):
    """Return the approved ASIN only for a complete reviewed query."""
    decoded = urllib.parse.unquote_plus(term_raw).lower()
    query = re.sub(r"[\W_]+", " ", decoded).strip()
    return ASIN_BY_QUERY.get(query)


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
