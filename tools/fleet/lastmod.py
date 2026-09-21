#!/usr/bin/env python3
"""Honest <lastmod> + dateModified, tied to content hashes (fleet tool, stdlib only).

Why: a sitemap <lastmod> that is the build date (every deploy "changes" every page) or a
hard-coded constant (never changes, even when the page did) is noise for Bing/IndexNow and
for AI systems that use dateModified as a trust signal. The bpj build solved this with a
content-hash manifest committed back by the runner; the four 09-18/19 sites have no
push-back rights, so this tool keeps the same idea in-repo:

  manifest.json  {loc: {hash, lastmod, published}}   -- committed with the site
  --mode update  new/changed pages get lastmod = today (or --date), others keep theirs
  --mode check   any new/changed page without a manifest update fails loudly (CI)

Either mode then (a) rewrites <lastmod> in the sitemap(s) from the manifest and (b) injects,
per page, a declared date (JSON-LD WebPage dateModified/datePublished, --inject ld) and a
visible line (<p class="updated">, --inject visible). Both live in comment-delimited blocks
that are stripped before hashing, so injection is idempotent and never changes the hash.

Module API (used by tools/discovery/build.py, which owns its own JSON-LD):
  m = Manifest(root, manifest_path, host_dirs={host: subdir}, strip=[block names])
  dates = m.sync([(loc, Path), ...], mode, date=None)   # {loc: {lastmod, published, hash}}
  m.write_sitemap(path, locs)  /  m.inject(file, loc, kinds={'ld','visible'})
"""
import argparse, datetime as dt, hashlib, json, os, re, sys, tempfile
from pathlib import Path
from urllib.parse import urlparse

LOC = re.compile(r"<loc>\s*([^<]+?)\s*</loc>")
URL = re.compile(r"<url>.*?</url>", re.S)
LASTMOD = re.compile(r"\s*<lastmod>[^<]*</lastmod>")
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]
DEFAULT_STRIP = ("lastmod", "lastmod-visible")


def block_re(name):
    # exactly the block, never surrounding whitespace: stripping must undo injection byte for byte
    return re.compile(r"<!-- %s -->.*?<!-- /%s -->" % (re.escape(name), re.escape(name)), re.S)


def strip_blocks(text, names):
    for n in names:
        text = block_re(n).sub("", text)
    return text


def content_hash(text, strip=DEFAULT_STRIP):
    return hashlib.sha256(strip_blocks(text, strip).encode("utf-8")).hexdigest()[:16]


def pretty(date, lang):
    y, m, d = (int(x) for x in date.split("-"))
    if lang.lower().startswith("zh"):
        return "%d 年 %d 月 %d 日" % (y, m, d)
    return "%d %s %d" % (d, MONTHS[m - 1], y)


def lang_of(text):
    m = re.search(r'<html[^>]*\blang\s*=\s*"([^"]*)"', text, re.I)
    return (m.group(1) if m else "en")


class Manifest:
    def __init__(self, root, manifest_path, host_dirs=None, strip=DEFAULT_STRIP):
        self.root = Path(root)
        self.path = Path(manifest_path)
        self.host_dirs = host_dirs or {}
        self.strip = tuple(strip)
        self.data = json.loads(self.path.read_text()) if self.path.exists() else {}

    # -- locating --------------------------------------------------------------------
    def locate(self, loc):
        u = urlparse(loc)
        sub = self.host_dirs.get(u.netloc, "")
        p = u.path
        if p.endswith("/"):
            p += "index.html"
        rel = p.lstrip("/")
        base = self.root / sub if sub else self.root
        for cand in (base / rel, base / (rel + ".html"), base / rel / "index.html"):
            if cand.is_file():
                return cand
        raise FileNotFoundError("no file for %s under %s" % (loc, base))

    def pairs_from_sitemaps(self, sitemaps):
        pairs = []
        for sm in sitemaps:
            for loc in LOC.findall(Path(sm).read_text()):
                pairs.append((loc, self.locate(loc)))
        return pairs

    # -- core -----------------------------------------------------------------------
    def sync(self, pairs, mode, date=None):
        if mode not in ("check", "update"):
            raise ValueError("mode must be check|update")
        today = date or dt.date.today().isoformat()
        new, drift = {}, []
        for loc, file in pairs:
            h = content_hash(Path(file).read_text(), self.strip)
            prev = self.data.get(loc)
            if prev and prev.get("hash") == h:
                new[loc] = dict(prev)
            else:
                drift.append(loc + (" (changed)" if prev else " (new)"))
                new[loc] = {"hash": h, "lastmod": today,
                            "published": (prev or {}).get("published") or today}
        removed = [l for l in self.data if l not in new]
        if mode == "check" and (drift or removed):
            msg = ["lastmod manifest %s is out of date with the built pages:" % self.path]
            msg += ["  " + d for d in drift] + ["  " + r + " (removed)" for r in removed]
            msg.append("Content changed without a dated manifest update. Rebuild with "
                       "LASTMOD_MODE=update (or `lastmod.py --mode update`) and commit %s." % self.path)
            raise SystemExit("\n".join(msg))
        if mode == "update":
            self.data = {k: new[k] for k in sorted(new)}
            self.path.write_text(json.dumps(self.data, ensure_ascii=False, indent=1) + "\n")
        else:
            self.data = new
        return new

    # -- apply ----------------------------------------------------------------------
    def write_sitemap(self, path, locs=None):
        text = Path(path).read_text()
        def fix(m):
            entry = m.group(0)
            loc = LOC.search(entry)
            if not loc or loc.group(1) not in self.data:
                return entry
            entry = LASTMOD.sub("", entry)
            return entry.replace("</loc>", "</loc><lastmod>%s</lastmod>" % self.data[loc.group(1)]["lastmod"], 1)
        Path(path).write_text(URL.sub(fix, text))

    def inject(self, file, loc, kinds=("ld", "visible")):
        e = self.data[loc]
        text = Path(file).read_text()
        lang = lang_of(text)
        before = content_hash(text, self.strip)
        if "ld" in kinds:
            node = {"@context": "https://schema.org", "@graph": [{"@type": "WebPage", "@id": loc, "url": loc,
                    "datePublished": e["published"], "dateModified": e["lastmod"]}]}
            blk = ('<!-- lastmod --><script type="application/ld+json">%s</script><!-- /lastmod -->'
                   % json.dumps(node, ensure_ascii=False).replace("<", "\\u003c"))
            text = block_re("lastmod").sub("", text)
            text = text.replace("</head>", blk + "</head>", 1)
        if "visible" in kinds:
            label = "更新于" if lang.lower().startswith("zh") else "Updated"
            blk = ('<!-- lastmod-visible --><p class="updated">%s <time datetime="%s">%s</time></p><!-- /lastmod-visible -->'
                   % (label, e["lastmod"], pretty(e["lastmod"], lang)))
            text = block_re("lastmod-visible").sub("", text)
            i = text.rfind("</main>")
            if i < 0:
                i = text.rfind("</body>")
            text = text[:i] + blk + text[i:] if i >= 0 else text + blk
        assert content_hash(text, self.strip) == before, "injection must not change the content hash"
        Path(file).write_text(text)


def run(args):
    host_dirs = dict(x.split("=", 1) for x in args.host_dir)
    m = Manifest(args.root, args.manifest, host_dirs, args.strip or DEFAULT_STRIP)
    pairs = m.pairs_from_sitemaps(args.sitemap)
    m.sync(pairs, args.mode, args.date)
    for sm in args.sitemap:
        m.write_sitemap(sm)
    kinds = set(args.inject.split(",")) if args.inject else {"ld", "visible"}
    for loc, file in pairs:
        m.inject(file, loc, kinds)
    print("lastmod: %d pages, manifest %s (%s)" % (len(pairs), m.path.name, args.mode))


def selftest():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "index.html").write_text('<html lang="en"><head><title>A</title>\n</head><body><main>one\n</main>\n</body></html>')
        (root / "zh").mkdir()
        (root / "zh" / "index.html").write_text('<html lang="zh-CN"><head></head><body><main>二</main></body></html>')
        (root / "sitemap.xml").write_text('<urlset><url><loc>https://x.test/</loc></url><url><loc>https://x.test/zh/</loc><lastmod>2000-01-01</lastmod></url></urlset>')
        man = root / "lastmod.json"
        m = Manifest(root, man)
        pairs = m.pairs_from_sitemaps([root / "sitemap.xml"])
        m.sync(pairs, "update", "2026-09-01"); m.write_sitemap(root / "sitemap.xml")
        for loc, f in pairs: m.inject(f, loc)
        sm = (root / "sitemap.xml").read_text(); idx = (root / "index.html").read_text(); zh = (root / "zh" / "index.html").read_text()
        cases = [
            ("bootstrap date used for both pages", sm.count("<lastmod>2026-09-01</lastmod>") == 2),
            ("stale hard-coded lastmod replaced", "2000-01-01" not in sm),
            ("ld dateModified injected", '"dateModified": "2026-09-01"'.replace(" ", "") in idx.replace(" ", "")),
            ("visible english date", "Updated <time datetime=\"2026-09-01\">1 September 2026</time>" in idx),
            ("visible chinese date", "更新于 <time datetime=\"2026-09-01\">2026 年 9 月 1 日</time>" in zh),
            ("visible line sits inside main", idx.index("lastmod-visible") < idx.index("</main>")),
        ]
        # idempotent: re-running check + inject leaves files byte-identical
        m2 = Manifest(root, man); m2.sync(pairs, "check"); m2.write_sitemap(root / "sitemap.xml")
        for loc, f in pairs: m2.inject(f, loc)
        cases.append(("re-run is byte-identical", (root / "index.html").read_text() == idx and (root / "sitemap.xml").read_text() == sm))
        # content change → check fails, update moves only that page
        (root / "index.html").write_text(idx.replace("one", "one more"))
        failed = False
        try: Manifest(root, man).sync(pairs, "check")
        except SystemExit as e: failed = "changed" in str(e)
        cases.append(("check fails on changed content", failed))
        m3 = Manifest(root, man); d = m3.sync(pairs, "update", "2026-09-21")
        cases.append(("changed page moves, unchanged keeps date", d["https://x.test/"]["lastmod"] == "2026-09-21" and d["https://x.test/zh/"]["lastmod"] == "2026-09-01"))
        cases.append(("published never moves", d["https://x.test/"]["published"] == "2026-09-01"))
        # a removed page is drift too
        (root / "sitemap.xml").write_text('<urlset><url><loc>https://x.test/</loc></url></urlset>')
        failed = False
        try: Manifest(root, man).sync(Manifest(root, man).pairs_from_sitemaps([root / "sitemap.xml"]), "check")
        except SystemExit as e: failed = "removed" in str(e)
        cases.append(("check fails on removed page", failed))
        ok = True
        for label, cond in cases:
            print(("ok   " if cond else "FAIL ") + label); ok = ok and bool(cond)
        print("selftest:", "ok" if ok else "FAILED")
        return 0 if ok else 1


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--root"); ap.add_argument("--manifest"); ap.add_argument("--sitemap", action="append", default=[])
    ap.add_argument("--host-dir", action="append", default=[], help="host=subdir under root")
    ap.add_argument("--mode", default=os.environ.get("LASTMOD_MODE", "check"), choices=["check", "update"])
    ap.add_argument("--date", default=os.environ.get("LASTMOD_DATE"), help="YYYY-MM-DD for new/changed pages (default today)")
    ap.add_argument("--inject", default="ld,visible"); ap.add_argument("--strip", action="append")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args(argv)
    if a.selftest:
        return selftest()
    if not (a.root and a.manifest and a.sitemap):
        ap.error("--root, --manifest and at least one --sitemap are required")
    return run(a)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
