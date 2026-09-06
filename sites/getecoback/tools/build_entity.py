#!/usr/bin/env python3
"""Consolidate the site's publisher entity into one node (idempotent + gate).

Found 2026-08-30 while comparing eco against the German sites that actually hold
the money SERPs (klimaanlagen-guru.de, ersatzteileshop.de, frosnir.de, Bosch,
hausjournal.net). Every one of them is a resolvable entity: a company with an
address, third-party review profiles, or an established brand. eco's honest
equivalent is its published methodology — but the markup was throwing that away.

The site DID define a canonical publisher on the homepage
(https://getecoback.com/#org, with logo/description/knowsAbout, referenced by the
WebSite node). Every other page then ignored it: 362 of 363 Organization mentions
were anonymous `{"@type":"Organization","name":"EcoBack","url":"…"}` blank nodes.
To a parser that is 362 unrelated organisations that happen to share a name, not
one publisher with 198 pages — the entity graph existed and was orphaned.

This step points every mention at the one node, and enriches that node with the
two properties eco can honestly claim and most competitors cannot: a published
recommendation methodology and an about page. Nothing is invented: each property
must resolve to a file that exists, or the build fails. No sameAs is emitted —
the site has no verified external profile, and a fabricated one would be exactly
the kind of borrowed authority this site refuses elsewhere.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
ORG_ID = "https://getecoback.com/#org"

# Anonymous publisher/author nodes, in both spacings the site emits.
ANON = re.compile(r'\{"@type": ?"Organization", ?"name": ?"EcoBack", ?"url": ?"https://getecoback\.com/"\}')

# Properties added to the canonical node. Each maps to a file that must exist —
# a claim the site cannot back with a page is not a claim it gets to make.
CANON_EXTRA = [
    ("publishingPrinciples", "https://getecoback.com/wie-wir-empfehlen.html", "wie-wir-empfehlen.html"),
    ("mainEntityOfPage", "https://getecoback.com/ueber-uns.html", "ueber-uns.html"),
]


def anon_to_ref(m):
    # Same node, now identified. Keeping name/url makes each page readable
    # standalone; the @id is what merges them into one publisher.
    return ('{"@type":"Organization","@id":"' + ORG_ID +
            '","name":"EcoBack","url":"https://getecoback.com/"}')


def main():
    for _, _, fn in CANON_EXTRA:
        if not os.path.exists(os.path.join(SITE, fn)):
            print(f"build_entity: canonical node would cite a missing page: {fn}")
            return 1

    # 1. enrich the canonical node (homepage), idempotently
    home = os.path.join(SITE, "index.html")
    s = open(home, encoding="utf-8").read()
    if f'"@id":"{ORG_ID}"' not in s:
        print("build_entity: canonical #org node not found on the homepage")
        return 1
    added = []
    for prop, url, _ in CANON_EXTRA:
        if f'"{prop}"' in s:
            continue
        anchor = f'"@id":"{ORG_ID}","name":"EcoBack","url":"https://getecoback.com/"'
        if anchor not in s:
            print(f"build_entity: cannot place {prop} — canonical node shape changed")
            return 1
        s = s.replace(anchor, anchor + f',"{prop}":"{url}"', 1)
        added.append(prop)
    if added:
        open(home, "w", encoding="utf-8").write(s)

    # 2. point every anonymous mention at it
    touched, refs = 0, 0
    for path in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
        html = open(path, encoding="utf-8").read()
        new, n = ANON.subn(anon_to_ref, html)
        if n:
            open(path, "w", encoding="utf-8").write(new)
            touched += 1
            refs += n

    # 3. gate: every JSON-LD block on the site must still parse, and no
    #    anonymous EcoBack publisher may survive anywhere.
    bad, orphans = [], 0
    for path in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
        html = open(path, encoding="utf-8").read()
        orphans += len(ANON.findall(html))
        for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
            try:
                json.loads(m.group(1))
            except Exception as e:
                bad.append(f"{os.path.relpath(path, ROOT)}: {e}")
    if bad:
        print(f"build_entity: {len(bad)} JSON-LD block(s) broke:")
        for b in bad[:10]:
            print("  " + b)
        return 1
    if orphans:
        print(f"build_entity: {orphans} anonymous EcoBack publisher node(s) still unlinked")
        return 1
    print(f"build_entity: publisher entity consolidated — {refs} references on {touched} page(s) "
          f"now resolve to {ORG_ID}"
          + (f"; canonical node gained {', '.join(added)}" if added else "; canonical node already complete"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
