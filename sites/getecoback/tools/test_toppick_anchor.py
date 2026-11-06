#!/usr/bin/env python3
"""Product shortcuts must not advertise a missing on-page model comparison."""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

import build_structure as B


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "a" and "href" in attrs:
            self.hrefs.append(attrs["href"])


def strip(html):
    return re.search(r"<!--EB_TOPPICK-->.*?<!--/EB_TOPPICK-->\n?", html, re.S)[0]


class ToppickAnchor(unittest.TestCase):
    def fixture(self, extra=""):
        return '<article><h1>Comfee MPPH-09CRN7</h1>' + extra + '<h2>Existing advice</h2></article>'

    def rebuild(self, source, en=False, slug="portable-ac-running-cost"):
        once = B.inject_toppick(source, slug, en)
        self.assertEqual(B.inject_toppick(once, slug, en), once)
        self.assertEqual(once.count("<!--EB_TOPPICK-->"), 1)
        return once

    def test_actual_model_target_keeps_jump_in_both_languages(self):
        for en in (False, True):
            for target in ('<section id="eb-models"></section>', "<section id='eb-models'></section>"):
                with self.subTest(en=en, target=target):
                    result = self.rebuild(self.fixture(target), en)
                    self.assertIn('href="#eb-models"', strip(result))
                    self.assertIn(B.TOPPICK_HEAD[en][1], strip(result))
                    self.assertIn(target, result)

    def test_missing_target_omits_only_jump_and_keeps_products(self):
        for en in (False, True):
            with self.subTest(en=en):
                source = self.fixture()
                result = self.rebuild(source, en)
                self.assertNotIn('href="#eb-models"', result)
                self.assertNotIn(B.TOPPICK_HEAD[en][1], strip(result))
                before, after = Links(), Links()
                before.feed(B.toppick_block("ac", en, "portable-ac-running-cost"))
                after.feed(strip(result))
                self.assertEqual(after.hrefs, [h for h in before.hrefs if not h.startswith("#")])
                self.assertEqual(len(after.hrefs), 3)
                self.assertEqual(re.sub(r"<!--EB_TOPPICK-->.*?<!--/EB_TOPPICK-->\n?", "", result, flags=re.S), source)

    def test_old_broken_link_is_removed_on_regeneration(self):
        for en in (False, True):
            with self.subTest(en=en):
                old = B.toppick_block("ac", en, "portable-ac-running-cost")
                result = self.rebuild(self.fixture(old), en)
                self.assertNotIn('href="#eb-models"', result)
                self.assertEqual(result.count('data-eb-tp="1"'), 3)

    def test_mentions_comments_and_script_strings_are_not_targets(self):
        for extra in ('<!--EB_MODELS-->old marker<!--/EB_MODELS-->',
                      '<!-- <section id="eb-models"></section> -->',
                      '<script>const template = \'<section id="eb-models"></section>\';</script>',
                      '<div data-id="eb-models"></div>',
                      '<div id="eb-models-other"></div>'):
            with self.subTest(extra=extra):
                result = self.rebuild(self.fixture(extra))
                self.assertNotIn('href="#eb-models"', strip(result))

    def test_existing_custom_alternatives_target_is_preserved(self):
        source = self.fixture('<h2 id="alternativen">Existing alternatives</h2>')
        result = self.rebuild(source, slug="meacodry-arete-one-test")
        self.assertIn('href="#alternativen"', strip(result))
        self.assertNotIn('href="#eb-models"', strip(result))

    def test_real_curated_de_and_en_pages_are_repaired_without_replacing_advice(self):
        site = Path(__file__).resolve().parent.parent / "site"
        for pathname, en in (("guide/luftentfeuchter-dauerbetrieb-stromkosten.html", False),
                             ("en/guide/portable-ac-running-cost.html", True)):
            with self.subTest(pathname=pathname):
                source = (site / pathname).read_text()
                result = self.rebuild(source, en, Path(pathname).stem)
                parsed = Links()
                parsed.feed(result)
                top = Links()
                top.feed(strip(result))
                for href in top.hrefs:
                    if href.startswith("#"):
                        self.assertIn(href[1:], parsed.ids)
                self.assertEqual(re.sub(r"<!--EB_TOPPICK-->.*?<!--/EB_TOPPICK-->\n?", "", result, flags=re.S),
                                 re.sub(r"<!--EB_TOPPICK-->.*?<!--/EB_TOPPICK-->\n?", "", source, flags=re.S))


if __name__ == "__main__":
    unittest.main()
