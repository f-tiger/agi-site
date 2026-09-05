# -*- coding: utf-8 -*-
"""Build the CrazyGames upload package for Block Nova.

The upload is ONE file: blocknova.html renamed index.html with window.GL_CG
pre-set (no query string exists on their CDN, same convention as cg.js).
Everything else — SDK from their CDN, first-party beacon via absolute URL with
CORS — is already handled inside the page. Output: site/downloads/cg/blocknova-cg.zip
(built in CI at deploy time, same convention as build_packages.py — zips are NOT committed).
"""
import io, os, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = io.open(os.path.join(ROOT, "site", "blocknova.html"), encoding="utf-8").read()
marker = "<script>\n\"use strict\";"
assert marker in src, "blocknova.html main script marker moved — update this packager"
out = src.replace(marker, "<script>window.GL_CG=true;</script>\n" + marker, 1)
outdir = os.path.join(ROOT, "site", "downloads", "cg")
os.makedirs(outdir, exist_ok=True)
zp = os.path.join(outdir, "blocknova-cg.zip")
with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("index.html", out)
print("wrote", zp, os.path.getsize(zp), "bytes")
