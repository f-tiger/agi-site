#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dump every product the shelves name, as JSON, for the price refresher.

One source of truth: DEVICE_MODELS and CONTEXT_MODELS in build_structure.py.
The refresher must never invent a term — it may only look up what a page
already sells. Each entry carries a `token`: the model designation the API
result's title must contain before its ASIN or price is trusted (see
refresh.mjs, TITLE MATCH). Category terms ("Für den Keller") have no token and
are looked up for price context only, never resolved to a /dp/ link.
"""
import json, os, re, sys, urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import build_structure as B  # noqa: E402

# A model designation is the part of a name that identifies one product:
# a letter/digit code (EX105, MPPH-09CRN7, NTH20-17BR, VU5690, 12K) or, for
# lines sold under a plain name, the full name. Categories yield nothing.
CODE = re.compile(r"\b(?=[A-Z0-9-]{3,}\b)(?=[A-Z0-9-]*\d)[A-Z0-9-]+\b")
CATEGORY_HINT = re.compile(r"^(für|fuer|for|klima mit|heizlüfter \d|standventilator|hitzeschutz|luftreiniger|dehumidif|space heater|tower fan)", re.I)

def token_for(name):
    """The shortest string that identifies exactly this product in a listing
    title. Wrong in either direction is costly: too loose ("Arete One" for both
    the 20 L and the 25 L) links the wrong size; too strict never matches and
    the shelf keeps the search link for ever. Rules, in order:
      - categories get no token (never resolved to a product page);
      - a code with letters AND digits wins (EX105, MPPH-09CRN7, NTH20-17BR);
      - a bare 4+ digit number is a model number (MeacoFan 1056, Cool 5000);
      - a size/capacity suffix (20L, 25L, 12K) is kept together with the word
        before it, because alone it matches half the catalogue;
      - a plain-name line (AEG ChillFlex Pro) uses its two distinctive words.
    """
    if CATEGORY_HINT.search(name):
        return ""
    words = name.split()
    cands = []
    for i, w in enumerate(words):
        core = w.strip("(),")
        if re.fullmatch(r"\d+ ?W", core) or (core.isdigit() and len(core) <= 3):
            continue                       # wattage, not identity
        if re.fullmatch(r"\d{1,3}[LK]", core):
            # A size alone matches half the catalogue; it must carry its word.
            if i > 0:
                cands.append((1, words[i-1].strip("(),") + " " + core))
            continue
        if re.fullmatch(r"[A-Z0-9]+(?:-[A-Z0-9]+)+", core) or re.fullmatch(r"(?=.*[A-Z])(?=.*\d)[A-Z0-9]{3,}", core):
            cands.append((3, core))          # letter+digit code
        elif core.isdigit() and len(core) >= 4 and i > 0:
            cands.append((2, words[i-1].strip("(),") + " " + core))   # model number with its word
    if cands:
        best = max(cands, key=lambda c: (c[0], len(c[1])))
        tok = best[1]
        # A size suffix present in the name must always be part of the token,
        # or the 20 L and 25 L collapse into one product.
        size = [w for w in words if re.fullmatch(r"\d{1,3}[LK]", w.strip("(),"))]
        if size and size[0] not in tok:
            tok = tok + " " + size[0]
        return tok
    plain = [w for w in re.findall(r"[A-Za-z][A-Za-z0-9'+]+", name) if len(w) > 2]
    return " ".join(plain[-2:]) if len(plain) >= 2 else (plain[0] if plain else "")

def main():
    seen, out = set(), []
    for fam, rows in B.DEVICE_MODELS.items():
        for r in rows:
            name, q = r[0], r[4]
            term = urllib.parse.unquote_plus(q)
            if term in seen: continue
            seen.add(term)
            out.append({"term": term, "name": name, "token": token_for(name), "family": fam, "shelf": "device"})
    for slug, rows in B.CONTEXT_MODELS.items():
        for r in rows:
            name, q = r[0], r[4]
            term = urllib.parse.unquote_plus(q)
            if term in seen: continue
            seen.add(term)
            out.append({"term": term, "name": name, "token": token_for(name), "family": r[5], "shelf": slug})
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
