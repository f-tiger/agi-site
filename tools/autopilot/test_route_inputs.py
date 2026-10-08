#!/usr/bin/env python3
"""Offline regressions for generated inputs and bounded Worker route parsing."""
import contextlib
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import config
import pagemap
import prepare_generated
import run
import sitemapfix

ZH_BRANCH = '''} else if (GEO_ZH.has(url.pathname.replace(/\\/$/, ""))) {
  assetReq = new Request(new URL(url.pathname.replace(/\\/$/, "").slice(3) + "-zh.html", url).toString(), request);
}'''
EXPLICIT = '''if (url.pathname === "/download" || url.pathname === "/download/") {
  assetReq = new Request(new URL("/downloads.html", url).toString(), request);
}'''


class RouteInputs(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.pub = self.root / "site"
        self.pub.mkdir()
        self.sitemap = self.pub / "sitemap.xml"
        self.sitemap.write_text("<urlset></urlset>")
        self.raw = {"site": "fixture", "url_base": "https://x.test",
                    "publish_root": str(self.pub), "sitemap": str(self.sitemap),
                    "max_unresolved": 0}

    def sitemap_urls(self, *urls):
        self.sitemap.write_text("<urlset>" + "".join(
            '<url><loc>https://x.test%s</loc><lastmod>2026-01-01</lastmod></url>' % u
            for u in urls) + "</urlset>")

    def worker(self, src):
        file = self.root / "worker.js"
        file.write_text(src)
        self.raw["worker_routes"] = str(file)
        return config.SiteConfig(self.raw, "fixture")

    def test_authoritative_set_and_explicit_routes(self):
        cfg = self.worker('const GEO_ZH = new Set(["/zh/6x6-rules", "/zh/new-game"]);\n'
                          + EXPLICIT + ZH_BRANCH)
        for file in ("6x6-rules-zh.html", "new-game-zh.html", "downloads.html"):
            (self.pub / file).write_text("fixture")
        for url, file in (("/zh/6x6-rules", "6x6-rules-zh.html"),
                          ("/zh/new-game/", "new-game-zh.html"),
                          ("/download", "downloads.html"), ("/download/", "downloads.html")):
            self.assertEqual(cfg.rel_for_url("https://x.test" + url), file)

    def test_no_generic_chinese_mapping_or_unrelated_set(self):
        cfg = self.worker('const GEO_ZH = new Set(["/zh/listed"]);\n'
                          'const OTHER = new Set(["/zh/unlisted"]);\n' + EXPLICIT + ZH_BRANCH)
        (self.pub / "unlisted-zh.html").write_text("exists but not routed")
        self.assertIsNone(cfg.rel_for_url("https://x.test/zh/unlisted"))
        self.assertIsNone(cfg.rel_for_url("https://x.test/zh/ai-games"))
        self.assertIsNone(cfg.rel_for_url("https://other.test/zh/listed"))
        self.assertNotIn("zh/unlisted", cfg.worker_map)

    def test_listed_route_still_requires_real_target(self):
        cfg = self.worker('const GEO_ZH = new Set(["/zh/missing"]);\n' + EXPLICIT + ZH_BRANCH)
        self.sitemap_urls("/zh/missing")
        self.assertEqual(pagemap.published_pages(cfg), ([], ["https://x.test/zh/missing"]))
        with self.assertRaises(sitemapfix.SitemapError):
            sitemapfix.apply_dates(cfg, self.sitemap.read_text(), {})

    def test_changed_or_unsupported_worker_contract_fails_closed(self):
        sources = [
            'const GEO_ZH = new Set(["/zh/listed"]);\n' + ZH_BRANCH.replace("slice(3)", "slice(4)"),
            'const GEO_ZH = makeRoutes();\n' + ZH_BRANCH,
            'const GEO_ZH = new Set(["/zh/../escape"]);\n' + ZH_BRANCH,
            'const GEO_ZH = new Set(["/zh/a", "/zh/a"]);\n' + ZH_BRANCH,
            'const GEO_ZH = new Set([123]);\n' + ZH_BRANCH,
            'const GEO_ZH = new Set(["/zh/a", computed]);\n' + ZH_BRANCH,
            'const GEO_ZH = new Set(["/zh/a"]);\n' + EXPLICIT,
            'const GEO_ZH = new Set(["/zh/a"]);\n' + ZH_BRANCH.replace('"-zh.html"', '"-zh .html"'),
            'const GEO_ZH = new Set(["/zh/a"]);\n/*' + ZH_BRANCH + '*/',
            'const GEO_ZH = new Set(["/zh/a"]);\n' + ZH_BRANCH + '\nGEO_ZH.clear();',
            'const GEO_ZH = new Set(["/zh/a"]);\n' + ZH_BRANCH + '\nGEO_ZH.add("/zh/b");',
            'const GEO_ZH = new Set(["/zh/a"]);\n' + ZH_BRANCH + '\nGEO_ZH.delete("/zh/a");',
            '/*const GEO_ZH = new Set(["/zh/a"]);*/\n' + ZH_BRANCH,
            'const GEO_ZH = new Set(["/zh/a"]);\nconst example = `' + ZH_BRANCH + '`;',
        ]
        for src in sources:
            with self.subTest(source=src), self.assertRaises(config.ConfigError):
                self.worker(src)

    def test_unrelated_worker_keeps_existing_explicit_mapping(self):
        cfg = self.worker(EXPLICIT)
        self.assertEqual(cfg.worker_map, {"download": "downloads.html"})

    def test_generated_input_copy_preserves_inventory_and_existing_bytes(self):
        self.sitemap_urls("/existing", "/workbench/tool", "/members", "/ghost")
        (self.pub / "existing.html").write_text("original homepage")
        generated = self.root / "generated"
        (generated / "workbench").mkdir(parents=True)
        for rel, body in (("existing.html", "must not overwrite"),
                          ("workbench/tool.html", "generated tool"), ("members.html", "members"),
                          ("unlisted.html", "must not add inventory"), ("private.json", "ignore")):
            (generated / rel).write_text(body)
        (generated / "sitemap.xml").write_text("builder's expanded inventory must not replace original")
        cfg = config.SiteConfig(self.raw, "fixture")
        before = self.sitemap.read_bytes()
        self.assertEqual(prepare_generated.copy_missing(cfg, generated),
                         ["workbench/tool.html", "members.html"])
        self.assertEqual(prepare_generated.copy_missing(cfg, generated), [])
        self.assertEqual(self.sitemap.read_bytes(), before)
        self.assertEqual((self.pub / "existing.html").read_text(), "original homepage")
        self.assertFalse((self.pub / "unlisted.html").exists())
        self.assertFalse((self.pub / "private.json").exists())
        self.assertEqual(pagemap.published_pages(cfg)[1], ["https://x.test/ghost"])
        with self.assertRaises(sitemapfix.SitemapError):
            sitemapfix.apply_dates(cfg, self.sitemap.read_text(), {})

    def test_builder_failure_is_not_silenced_or_partially_copied(self):
        import subprocess
        cfg = config.SiteConfig(self.raw, "fixture")
        error = subprocess.CalledProcessError(1, "node")
        with patch.object(config, "load", return_value=cfg), \
                patch.object(prepare_generated.subprocess, "run", side_effect=error), \
                patch.object(prepare_generated, "copy_missing") as copied:
            with self.assertRaises(subprocess.CalledProcessError):
                prepare_generated.main()
            copied.assert_not_called()

    def test_failed_site_reason_is_visible_and_check_writes_nothing(self):
        self.sitemap_urls("/ghost")
        cfg = config.SiteConfig(self.raw, "fixture")
        before = self.sitemap.read_bytes()
        output = io.StringIO()
        with patch.object(config, "load", return_value=cfg), \
                patch.object(sys, "argv", ["run.py", "--site", "fixture", "--today", "2026-10-08", "--check"]), \
                contextlib.redirect_stderr(output):
            self.assertEqual(run.main(), 1)
        self.assertIn("[fixture] failed: 1 sitemap <loc> resolve to no file (max_unresolved=0)", output.getvalue())
        self.assertEqual(self.sitemap.read_bytes(), before)


def verify_repository():
    for site in config.all_sites():
        cfg = config.load(site)
        pages, unresolved = pagemap.published_pages(cfg)
        if site in ("agiscorecard", "gridlings"):
            assert cfg.max_unresolved == 0, (site, "guard weakened")
        assert not unresolved, (site, unresolved)
        print("[%s] %d mapped pages; 0 unresolved" % (site, len(pages)))


if __name__ == "__main__":
    if sys.argv[1:] == ["--repository"]:
        verify_repository()
    else:
        unittest.main()
