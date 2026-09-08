# -*- coding: utf-8 -*-
"""Build every distribution package for the eight canvas games.

One game, four destinations, four different sets of true statements:

  site/downloads/cg/<slug>-cg.zip        CrazyGames. window.GL_CG pre-set, their SDK
                                         from their CDN, ads on, first-party beacon on.
  site/downloads/playgama/<slug>.zip     Playgama Bridge. ONE build that the Bridge's own
                                         predicate table resolves to CrazyGames, Yandex,
                                         Y8, MSN, YouTube Playables, Discord, Telegram,
                                         GameDistribution, Lagged, Poki, TikTok, Reddit,
                                         GameSnacks, Samsung … (see the table in
                                         docs/games-distribution-2026-09.md). Ads on,
                                         beacon on.
  site/downloads/itch/<slug>.zip         itch.io. The plain page: no portal SDK, so the
                                         page's own "no ads" claim stays true.
  site/downloads/clean/<slug>.zip        Licensing grade. No ad SDK, no beacon, no link
                                         and no reference of any kind pointing back at
                                         us. This is the only build that can be offered
                                         to a platform whose rules FORBID advertising,
                                         external links and developer-side stats
                                         counters — Coolmath Games is the big one, and
                                         its rules are why this variant exists. The 11
                                         logic puzzles have had this since 2026-08-24
                                         (build_packages.py's strict flavor); the eight
                                         canvas games did not until 2026-09-08.

Everything here is built in CI at deploy time and NOT committed (same convention as
build_packages.py).

2026-09-05: per owner's call Block Nova is NOT submitted to CG (saturated-genre copy risk
= third template rejection), but its packages keep building — they cost nothing and keep
the option open.
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
# CLEAN / licensing-grade variant.
#
# Coolmath Games publishes seven rules for submitted games, and four of them are about
# what a build must NOT do (coolmathgames.com/submit-a-game, read 2026-09-08 via search —
# their site is blocked by this sandbox's egress proxy):
#     · free of advertising — "this also means no ad for your own site or company"
#     · free of any and all external links
#     · no stats counter that reports back to the developer
#     · no user data collection
# Every other build we ship breaks at least one of those on purpose. So the clean build is
# defined by a single assertion that is trivial to check and impossible to satisfy by
# accident: THE STRING "play.agiscorecard.com" DOES NOT APPEAR IN THE OUTPUT AT ALL.
# That one line covers the beacon URL, the canonical tag, og:url, the JSON-LD graph and
# the footer links in one go — the 2026-09-08 footer bug happened precisely because each
# of those was checked separately, and one of them wasn't.
#
# Note what is NOT stripped: the page's ad-free wording. In this variant it is TRUE, and
# the footer that carried it is gone anyway. Per the 2026-09-07 rule, claims are checked
# per variant, not per source file.
CLEAN_CANDIDATES = ["prompt", "mimic", "minima", "overseer", "overfit", "blocknova",
                    "singularity", "ghostline"]
SITE_HOST = "play.agiscorecard.com"
_LDJSON = re.compile(r'[ \t]*<script type="application/ld\+json">.*?</script>\n?', re.S)
_CANONICAL = re.compile(r'[ \t]*<link rel="canonical"[^>]*>\n?')
_OG_URL = re.compile(r'[ \t]*<meta property="og:url"[^>]*>\n?')
# The guard is dead code once GL_CLEAN is set, but the URL still has to go so the
# one-line assertion above can be the whole test. about:blank is inert in both branches:
# sendBeacon rejects a non-http scheme and the throw is already inside try/catch.
_BEACON_URL = re.compile(r'"https://play\.agiscorecard\.com/e"')
# Both spellings: hand-written sources are readable, the two esbuild bundles are minified.
_CLEAN_GUARD = re.compile(r"if\s*\(window\.GL_CLEAN\)\s*return")


def clean_page(src, what):
    # A game whose PRODUCT does not carry the beacon guard cannot get a clean build: the
    # guard is what makes "no request leaves this package" a property of the package. For
    # ghostline and singularity the guard lives in games/<slug>/src/main.js and only
    # reaches site/<slug>.html on the next `node build.*` — until then they are skipped
    # loudly rather than shipped hopefully.
    if not _CLEAN_GUARD.search(src):
        return None
    out = src.replace(marker, "<script>window.GL_CLEAN=true;</script>\n" + marker, 1)
    out = strip_site_footer(out, what)
    # The structured data describes a WebApplication living at OUR url and a breadcrumb
    # trail through OUR site. Served from a licensee's domain that is simply false, on top
    # of being an external reference.
    out = _LDJSON.sub("", out)
    out = _CANONICAL.sub("", out)
    out = _OG_URL.sub("", out)
    out = _BEACON_URL.sub('"about:blank"', out)
    assert SITE_HOST not in out, "%s: a reference to %s survived into the clean build - %r" % (
        what, SITE_HOST, out[max(0, out.find(SITE_HOST) - 90):out.find(SITE_HOST) + 90])
    m = re.search(r'<(?:a|link)[^>]+href="https?://', out)
    assert not m, "%s: an external link survived into the clean build - %r" % (what, m.group(0))
    for flag in ("window.GL_CG=true", "window.GL_PG=true"):
        assert flag not in out, "%s: clean build must not set %s" % (what, flag)
    return out


cleandir = os.path.join(ROOT, "site", "downloads", "clean")
os.makedirs(cleandir, exist_ok=True)
for slug in CLEAN_CANDIDATES:
    src = io.open(os.path.join(ROOT, "site", slug + ".html"), encoding="utf-8").read()
    assert marker in src, slug + ": main script marker moved — update this packager"
    out = clean_page(src, slug + " (clean build)")
    if out is None:
        print("skip  clean/%s.zip — the product has no `if (window.GL_CLEAN) return` guard; "
              "rebuild it from games/%s/ so the guard lands in site/%s.html" % (slug, slug, slug))
        continue
    zp = os.path.join(cleandir, slug + ".zip")
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
