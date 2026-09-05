# -*- coding: utf-8 -*-
"""Build the CrazyGames upload packages (Block Nova + OVERFIT).

Each upload is ONE file: the game html renamed index.html with window.GL_CG
pre-set (no query string exists on their CDN, same convention as cg.js).
SDK loads from their CDN; the first-party beacon already uses an absolute URL
with CORS. Output under site/downloads/cg/ — built in CI at deploy time, NOT
committed (same convention as build_packages.py).

2026-09-05 update: OVERFIT added; per owner's call Block Nova is NOT being
submitted to CG (saturated-genre copy risk = third template rejection), but
its package keeps building — it costs nothing and keeps the option open.
"""
import io, os, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES = [("blocknova.html", "blocknova-cg.zip"), ("overfit.html", "overfit-cg.zip"),
         ("mimic.html", "mimic-cg.zip"), ("overseer.html", "overseer-cg.zip"),
         ("prompt.html", "prompt-cg.zip")]
outdir = os.path.join(ROOT, "site", "downloads", "cg")
os.makedirs(outdir, exist_ok=True)
marker = "<script>\n\"use strict\";"
for src_name, zip_name in GAMES:
    src = io.open(os.path.join(ROOT, "site", src_name), encoding="utf-8").read()
    assert marker in src, src_name + ": main script marker moved — update this packager"
    out = src.replace(marker, "<script>window.GL_CG=true;</script>\n" + marker, 1)
    zp = os.path.join(outdir, zip_name)
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", out)
    print("wrote", zp, os.path.getsize(zp), "bytes")
