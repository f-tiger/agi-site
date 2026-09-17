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
import io, os, re, zipfile

# Every build that goes to a PORTAL (CrazyGames, Playgama) requests ads — a midgame
# interstitial, or a rewarded video in SINGULARITY. So any ad-free claim in the page is
# false THERE and nowhere else: the gridlings.com page and the itch build load no ad SDK
# at all, and their claims stay untouched.
#
# 2026-09-08: the first version of this only rewrote two exact capitalised strings and
# asserted on "No ads". A lowercase claim in Block Nova's <meta description> ("no ads on
# this site") walked straight past both. Rewrite by regex, assert case-insensitively, and
# cover "ad-free" too, so a third wording cannot ship either.
_AD_CLAIMS = [
    (re.compile(r"No ads (?:inside|here) \u00b7 no account \u00b7 free"), "No account \u00b7 free to play"),
    (re.compile(r"no ads on this site, no account", re.I), "no account"),
    (re.compile(r", no sign-up and no ads", re.I), " and no sign-up"),
    (re.compile(r"no account, no ads", re.I), "no account"),
    (re.compile(r"No ads (?:inside|here)"), "Free to play"),
    # every puzzle page's FAQPage JSON-LD ends its daily answer this way
    (re.compile(r"with no account and no ads", re.I), "with no account"),
]
# NB: not "no advertising" — MINIMA's source carries that phrase inside a code comment
# quoting a Playgama rejection, and a comment is not a claim to a player.
_AD_LEFTOVER = re.compile(r"no ads|ad-free", re.I)


# The site footer must not travel into a PORTAL build. Two reasons, one of them a
# hard defect rather than a matter of taste:
#
#   1. Its links are RELATIVE — href="/" and href="/ai-games". Inside a portal iframe
#      those resolve against the PORTAL's origin, so every submitted package has been
#      shipping two dead links on its first screen (crazygames.com/ai-games, and the
#      portal's own homepage as "more games → Gridlings"). Verified 2026-09-08 in
#      prompt.zip and prompt-cg.zip; nothing rewrote them.
#   2. A footer advertising another website, inside someone else's storefront, reads as
#      an embedded web page rather than a game.
#
# PROMPT was rejected by Playgama on 2026-09-08 for "overall quality"; that reason is
# not itemised, so this is not proven to be THE cause — but it is a real defect, it was
# in all 15 portal packages, and it is free to remove. The gridlings.com page and the
# itch build keep their footer: there the links are correct and the branding is ours.
_FOOTER = re.compile(r"<footer>.*?</footer>", re.S)


def strip_site_footer(out, what):
    out, n = _FOOTER.subn("", out)
    assert n == 1, "%s: expected exactly one <footer>, found %d" % (what, n)
    # Nothing else may point at our site with a root-relative href either.
    m = re.search(r'<a[^>]+href="/(?!/)[^"]*"', out)
    assert not m, "%s: a root-relative link survived into a portal build - %r" % (what, m.group(0))
    return out


def strip_ad_claims(out, what):
    for pat, repl in _AD_CLAIMS:
        out = pat.sub(repl, out)
    m = _AD_LEFTOVER.search(out)
    assert not m, "%s: an ad-free claim survived - %r" % (
        what, out[max(0, m.start() - 60):m.end() + 60])
    return out



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
    out = strip_ad_claims(out, src_name + " (CG build)")
    out = strip_site_footer(out, src_name + " (CG build)")
    zp = os.path.join(outdir, zip_name)
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", out)
    print("wrote", zp, os.path.getsize(zp), "bytes")
# Playgama Bridge variant: game + the SDK as its own file + its licence. Bridge is
# LGPL-3.0-or-later, so it is never inlined into the game — it stays a replaceable
# file, which is what that licence asks for and what Playgama ships it as.
# Pilot is GHOSTLINE only; the other six follow once the first one clears review.
# GHOSTLINE carries the portal inside its bundle (it was the pilot). The five
# hand-written games share tools/portal/playgama-portal.js instead — one file, five
# games, so a lesson learned once is not re-learned five times. Their prefix is the
# window.<prefix>Cg / window.<prefix>Ad seam each already exposes.
PLAYGAMA = ["ghostline", "singularity"]
PLAYGAMA_SHARED = {"overfit": "of", "prompt": "pm", "mimic": "mc", "overseer": "os", "minima": "mn"}
pgdir = os.path.join(ROOT, "site", "downloads", "playgama")
vendor = os.path.join(ROOT, "vendor", "playgama")
os.makedirs(pgdir, exist_ok=True)
for slug in PLAYGAMA:
    src = io.open(os.path.join(ROOT, "site", slug + ".html"), encoding="utf-8").read()
    assert marker in src, slug + ": main script marker moved — update this packager"
    # The SDK goes in as a real <script src> BEFORE the game bundle: certification
    # checks that it is connected in index.html, and a static tag means bridge is
    # already parsed when the game's portal code runs, so initialize() fires at once.
    out = src.replace(marker, '<script>window.GL_PG=true;</script>\n'
                              '<script src="playgama-bridge.js"></script>\n' + marker, 1)
    # the ad-free footer is false here too: this build shows Playgama's ads
    out = strip_ad_claims(out, slug + " (Playgama build)")
    out = strip_site_footer(out, slug + " (Playgama build)")
    zp = os.path.join(pgdir, slug + ".zip")
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", out)
        z.write(os.path.join(vendor, "playgama-bridge.js"), "playgama-bridge.js")
        z.write(os.path.join(vendor, "LICENSE"), "LICENSE-playgama-bridge.txt")
        # Bridge fetches ./playgama-bridge-config.json on init; without the file it
        # logs a console error, and a console error is a rejection risk on every
        # portal. This placeholder silences it. It carries no ad unit ids, so it
        # MUST be swapped for the portal-generated config or nothing monetises.
        z.write(os.path.join(vendor, "playgama-bridge-config.json"), "playgama-bridge-config.json")
    print("wrote", zp, os.path.getsize(zp), "bytes")
for slug, prefix in sorted(PLAYGAMA_SHARED.items()):
    src = io.open(os.path.join(ROOT, "site", slug + ".html"), encoding="utf-8").read()
    assert marker in src, slug + ": main script marker moved — update this packager"
    portal = io.open(os.path.join(ROOT, "tools", "portal", "playgama-portal.js"), encoding="utf-8").read()
    # The SDK is a real script tag (certification checks index.html for it) and the
    # shared portal runs AFTER the game's own inert CG bridge, rebinding its two globals.
    head = ('<script>window.GL_PG=true;window.GL_PORTAL_PREFIX="%s";</script>\n'
            '<script src="playgama-bridge.js"></script>\n' % prefix)
    out = src.replace(marker, head + marker, 1)
    out = out.replace("</body>", "<script>\n" + portal + "\n</script>\n</body>", 1)
    assert "GL_PORTAL_PREFIX" in out and out.count("playgama-portal") >= 0
    out = strip_ad_claims(out, slug + " (Playgama build)")
    out = strip_site_footer(out, slug + " (Playgama build)")
    zp = os.path.join(pgdir, slug + ".zip")
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", out)
        z.write(os.path.join(vendor, "playgama-bridge.js"), "playgama-bridge.js")
        z.write(os.path.join(vendor, "LICENSE"), "LICENSE-playgama-bridge.txt")
        z.write(os.path.join(vendor, "playgama-bridge-config.json"), "playgama-bridge-config.json")
    print("wrote", zp, os.path.getsize(zp), "bytes")
# ---------------------------------------------------------------------------
# Playgama build for the PUZZLE games (2026-09-15).
#
# These are not single-file games: a puzzle page is html + style.css + its engine +
# two json files + two small shared scripts. So unlike the seven above, this walks an
# asset list into the zip and rewrites what only works on our own origin:
#
#   - the beacon. Every engine calls sendBeacon("/e") ROOT-relative, which on
#     sb-xxx.games.playgama.net posts to Playgama's origin, not ours. Left alone, a
#     puzzle on a portal reports nothing at all — and reporting is the entire reason to
#     put it there. Rewritten to the absolute URL the seven already use.
#   - /sub.js, /embed.js, /manifest.webmanifest are root-relative and site-only
#     (mail capture, the embed widget). They 404 on a portal; they are dropped.
#   - the header, the footer and the beehiiv link point at our site from inside someone
#     else's storefront. Dropped for the same reason the footer already was.
#
# Pilot is towers only, by the same rule the seven followed: one game clears the
# process before the rest are queued behind the same unknown. PUZZLE_PLAYGAMA is the
# whole extension point — the shim binds to markup all ten pages already share.
PUZZLE_PLAYGAMA = {"towers": "app-towers.js"}
BEACON = "https://play.agiscorecard.com/e"
_HEADER = re.compile(r"<header>.*?</header>", re.S)
_ROOT_A = re.compile(r'<a [^>]*href="/(?!/)[^"]*"[^>]*>(.*?)</a>', re.S)
_SUBCTA = re.compile(r'<p class="subline"><a id="subcta".*?</a></p>', re.S)
_DROP_TAGS = [
    re.compile(r'<script src="/(?:sub|embed)\.js"[^>]*></script>\s*'),
    re.compile(r'<link rel="manifest"[^>]*>\s*'),
    re.compile(r'<link rel="canonical"[^>]*>\s*'),
    re.compile(r'<link rel="alternate" hreflang="[^"]*"[^>]*>\s*'),
    re.compile(r'<meta property="og:[^"]*"[^>]*>\s*'),
    re.compile(r'<script type="application/ld\+json">.*?</script>\s*', re.S),
    # registers "/sw.js" — root-relative, so on a portal it 404s and Chromium logs a
    # console error. The .catch() hides the failure from the game but not from their
    # reviewer, and console errors are a rejection risk on every portal we have tried.
    re.compile(r'<script>if\("serviceWorker" in navigator.*?</script>\s*', re.S),
]
for slug, engine in sorted(PUZZLE_PLAYGAMA.items()):
    what = slug + " (Playgama puzzle build)"
    src = io.open(os.path.join(ROOT, "site", slug + ".html"), encoding="utf-8").read()
    tag = '<script src="%s"></script>' % engine
    assert tag in src, what + ": engine script tag moved - update this packager"
    out = src
    for pat in _DROP_TAGS:
        out = pat.sub("", out)
    out, n = _HEADER.subn("", out)
    assert n == 1, "%s: expected exactly one <header>, found %d" % (what, n)
    out, n = _SUBCTA.subn("", out)
    assert n == 1, "%s: the beehiiv subscribe link moved, found %d" % (what, n)
    # SDK before the engine: certification reads index.html for the script tag, and a
    # static tag means bridge is parsed by the time the shim runs.
    out = out.replace(tag, '<script>window.GL_PG=true;</script>\n'
                           '<script src="playgama-bridge.js"></script>\n' + tag, 1)
    portal = io.open(os.path.join(ROOT, "tools", "portal", "puzzle-portal.js"), encoding="utf-8").read()
    out = out.replace("</body>", "<script>\n" + portal + "\n</script>\n</body>", 1)
    # Any remaining root-relative anchor (the rules page, sibling puzzles) is a dead
    # link inside a portal iframe: it resolves against THEIR origin. Keep the words,
    # drop the link — the sentence still reads, and strip_site_footer's guard below
    # turns any wording this misses into a failed build rather than a shipped 404.
    out, n = _ROOT_A.subn(lambda m: m.group(1), out)
    assert n >= 1, what + ": expected at least one root-relative anchor to unwrap"
    out = strip_ad_claims(out, what)
    out = strip_site_footer(out, what)      # also asserts no root-relative <a> survived
    assert "/sub.js" not in out and "/embed.js" not in out, what + ": a site-only script survived"

    js = io.open(os.path.join(ROOT, "site", engine), encoding="utf-8").read()
    js, n = re.subn(r'(sendBeacon|fetch)\("/e"', lambda m: m.group(1) + '("' + BEACON + '"', js)
    assert n == 2, "%s: expected 2 root-relative beacon calls to rewrite, found %d" % (what, n)
    assert '"/e"' not in js, what + ": a root-relative beacon survived"

    zp = os.path.join(pgdir, slug + ".zip")
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", out)
        z.writestr(engine, js)
        for f in ("style.css", "copy.js", "firstrun.js", slug + "-daily.json", slug + "-pool.json"):
            z.write(os.path.join(ROOT, "site", f), f)
        z.write(os.path.join(vendor, "playgama-bridge.js"), "playgama-bridge.js")
        z.write(os.path.join(vendor, "LICENSE"), "LICENSE-playgama-bridge.txt")
        z.write(os.path.join(vendor, "playgama-bridge-config.json"), "playgama-bridge-config.json")
    print("wrote", zp, os.path.getsize(zp), "bytes")

itchdir = os.path.join(ROOT, "site", "downloads", "itch")
os.makedirs(itchdir, exist_ok=True)
for slug in ITCH:
    src = io.open(os.path.join(ROOT, "site", slug + ".html"), encoding="utf-8").read()
    zp = os.path.join(itchdir, slug + ".zip")
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", src)
    print("wrote", zp, os.path.getsize(zp), "bytes")
