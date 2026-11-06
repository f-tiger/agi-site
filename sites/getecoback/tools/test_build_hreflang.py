#!/usr/bin/env python3
"""Rebuild real language groups from both compact and line-formatted HTML."""
import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_hreflang as B


class HreflangBuildTest(unittest.TestCase):
    def check_language_group(self, canonical_suffix):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            site = root / "site"
            (site / "en").mkdir(parents=True)
            routes = {"de": "/stromtarif-werkstatt.html", "en": "/en/energy-tariff-workbench.html"}
            expected_block = (
                f'<link rel="alternate" hreflang="de" href="{B.BASE}{routes["de"]}">\n'
                f'<link rel="alternate" hreflang="en" href="{B.BASE}{routes["en"]}">\n'
                f'<link rel="alternate" hreflang="x-default" href="{B.BASE}{routes["de"]}">\n'
            )
            expected = {}
            for lang, route in routes.items():
                counterpart = "en" if lang == "de" else "de"
                prefix = f'<html lang="{lang}"><head><link rel="canonical" href="{B.BASE}{route}">{canonical_suffix}'
                old_alternate = f'<link rel="alternate" hreflang="{counterpart}" href="{B.BASE}{routes[counterpart]}">'
                remainder = '<meta name="description" content="Compare household tariffs."></head><body>Calculator</body></html>'
                path = site / route.lstrip("/")
                path.write_text(prefix + old_alternate + remainder, encoding="utf-8")
                expected[path] = prefix + expected_block + remainder

            with patch.object(B, "ROOT", root), patch.object(B, "SITE", site):
                for run in range(2):
                    with self.subTest(run=run), contextlib.redirect_stdout(io.StringIO()):
                        self.assertEqual(B.main(), 0)
                    for path, html in expected.items():
                        actual = path.read_text(encoding="utf-8")
                        self.assertEqual(actual, html)
                        self.assertLess(actual.index('hreflang="x-default"'), actual.index("</head>"))

    def test_single_line_generated_pages_rebuild_twice(self):
        self.check_language_group("")

    def test_existing_canonical_line_position_is_preserved(self):
        self.check_language_group("<!-- same-line metadata stays here -->\n")


if __name__ == "__main__":
    unittest.main()
