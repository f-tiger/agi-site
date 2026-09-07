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
         ("prompt.html", "prompt-cg.zip"),
         ("minima.html", "minima-cg.zip"),
         ("singularity.html", "singularity-cg.zip"),
         ("ghostline.html", "ghostline-cg.zip")]
# itch.io takes the plain page (no CG flag: the SDK must not load on itch.zone);
# one zip per game so each can be its own itch project and its own "new" slot
ITCH = ["overfit", "prompt", "mimic", "overseer", "minima", "singularity", "ghostline"]
outdir = os.path.join(ROOT, "site", "downloads", "cg")
os.makedirs(outdir, exist_ok=True)
marker = "<script>\n\"use strict\";"
for src_name, zip_name in GAMES:
    src = io.open(os.path.join(ROOT, "site", src_name), encoding="utf-8").read()
    assert marker in src, src_name + ": main script marker moved — update this packager"
    out = src.replace(marker, "<script>window.GL_CG=true;</script>\n" + marker, 1)
    # The CG build DOES show ads (a midgame interstitial every third finish, gated on
    # window.GL_CG), so the site footer's "No ads inside" is false there and nowhere
    # else. Shipping a false claim to the platform reviewing us is not a cosmetic bug.
    # Fails loudly if the footer copy is ever reworded, rather than passing it through.
    # Every CG build requests ads (midgame interstitial, or rewarded in SINGULARITY),
    # gated on window.GL_CG — so the footer's ad-free claim is false there and nowhere
    # else. It had been shipping in all eight submissions, in two wordings. Both are
    # rewritten here, and the assert stops a third wording from slipping through.
    for _claim in ("No ads inside", "No ads here"):
        out = out.replace(_claim + " \u00b7 no account \u00b7 free", "No account \u00b7 free to play")
        out = out.replace(_claim, "Free to play")
    assert "No ads" not in out, src_name + ": an ad-free claim survived into the CG build"
    zp = os.path.join(outdir, zip_name)
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", out)
    print("wrote", zp, os.path.getsize(zp), "bytes")
itchdir = os.path.join(ROOT, "site", "downloads", "itch")
os.makedirs(itchdir, exist_ok=True)
for slug in ITCH:
    src = io.open(os.path.join(ROOT, "site", slug + ".html"), encoding="utf-8").read()
    zp = os.path.join(itchdir, slug + ".zip")
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", src)
    print("wrote", zp, os.path.getsize(zp), "bytes")
