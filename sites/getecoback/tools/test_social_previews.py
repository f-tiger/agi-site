#!/usr/bin/env python3
"""Release contracts for topic previews, independent head parsing and scope."""
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
import json
import shutil
import tempfile
import unittest

import build_social_previews as preview


class Head(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.meta = defaultdict(list)
        self.properties = defaultdict(list)
        self.names = defaultdict(list)
        self.titles = []
        self.title_parts = None
        self.links = defaultdict(list)
        self.schemas = []
        self.in_schema = False
        self.buffer = ""
        self.feed(source.split("</head>")[0])

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            content = attrs.get("content")
            self.meta[attrs.get("name") or attrs.get("property")].append(content)
            if "property" in attrs:
                self.properties[attrs["property"]].append(content)
            if "name" in attrs:
                self.names[attrs["name"]].append(content)
        elif tag == "title":
            self.title_parts = []
        elif tag == "link":
            self.links[attrs.get("rel")].append(attrs.get("href"))
        elif tag == "script" and attrs.get("type") == "application/ld+json":
            self.in_schema = True
            self.buffer = ""

    def handle_data(self, data):
        if self.title_parts is not None:
            self.title_parts.append(data)
        if self.in_schema:
            self.buffer += data

    def handle_endtag(self, tag):
        if tag == "title" and self.title_parts is not None:
            self.titles.append("".join(self.title_parts))
            self.title_parts = None
        if tag == "script" and self.in_schema:
            self.schemas.append(json.loads(self.buffer))
            self.in_schema = False


def nodes(data):
    if isinstance(data, list):
        for value in data:
            yield from nodes(value)
    elif isinstance(data, dict):
        yield data
        for value in data.values():
            if isinstance(value, (dict, list)):
                yield from nodes(value)


class PreviewContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = preview.load_config()

    def test_real_routes_have_valid_unique_previews_and_preserve_content(self):
        for route, key in self.config["pages"].items():
            with self.subTest(route=route):
                file = "index.html" if route == "/" else route.lstrip("/")
                original = (preview.ROOT / "site" / file).read_text()
                card = self.config["cards"][key]
                result = preview.transform(original, route, card)
                head = Head(result)
                before = Head(original)
                image = "https://getecoback.com" + card["image"]
                self.assertEqual(head.links["canonical"], ["https://getecoback.com" + route])
                self.assertEqual(head.meta["og:image"], [image])
                self.assertEqual(head.meta["twitter:image"], [image])
                self.assertEqual(head.meta["og:image:width"], ["1200"])
                self.assertEqual(head.meta["og:image:height"], ["630"])
                self.assertEqual(head.meta["og:image:type"], ["image/png"])
                self.assertEqual(head.meta["og:image:alt"], [card["alt"]])
                self.assertEqual(head.meta["twitter:image:alt"], [card["alt"]])
                self.assertEqual(head.meta["twitter:card"], ["summary_large_image"])
                self.assertEqual(head.titles, before.titles)
                self.assertEqual(head.meta["description"], before.meta["description"])
                self.assertEqual(result.split("</head>", 1)[1], original.split("</head>", 1)[1])
                self.assertEqual(preview.transform(result, route, card), result)
                articles = [n for n in nodes(head.schemas) if n.get("@type") == "Article"]
                for article in articles:
                    self.assertEqual(article["image"]["url"], image)
                before_dates = [(n.get("datePublished"), n.get("dateModified"))
                                for n in nodes(before.schemas) if "datePublished" in n or "dateModified" in n]
                after_dates = [(n.get("datePublished"), n.get("dateModified"))
                               for n in nodes(head.schemas) if "datePublished" in n or "dateModified" in n]
                self.assertEqual(after_dates, before_dates)
                if route in ("/", "/waeschetrockner-oder-luftentfeuchter.html"):
                    self.assertEqual(articles, [], "Tools/home must not become fake Articles")

    def test_cooling_guide_routes_have_their_own_social_copy_and_card(self):
        routes = ("/guide/delonghi-pac-n90-test.html",
                  "/guide/midea-portasplit-ausverkauft-alternativen.html")
        images = []
        for route in routes:
            with self.subTest(route=route):
                self.assertIn(route, self.config["pages"])
                card = self.config["cards"][self.config["pages"][route]]
                images.append(card["image"])
                source = (preview.ROOT / "site" / route.lstrip("/")).read_text()
                before = Head(source)
                after = Head(preview.transform(source, route, card))

                self.assertEqual(after.links["canonical"], ["https://getecoback.com" + route])
                self.assertEqual(after.properties["og:url"], after.links["canonical"])
                self.assertEqual(after.titles, before.titles)
                self.assertEqual(after.names["description"], before.names["description"])
                for suffix in ("title", "description"):
                    copy = card["social_" + suffix]
                    self.assertTrue(copy.strip())
                    og, twitter = "og:" + suffix, "twitter:" + suffix
                    self.assertEqual(after.properties[og], [copy])
                    self.assertEqual(after.names[twitter], [copy])
                    self.assertEqual(after.meta[og], [copy])
                    self.assertEqual(after.meta[twitter], [copy])
        self.assertEqual(len(set(images)), len(routes))

    def test_social_fields_only_replace_the_corresponding_platform_tags(self):
        source = """<html><head><link rel="canonical" href="https://getecoback.com/">
        <title>Original for search &amp; browsers</title>
        <meta name="description" content="Original search description">
        <meta property="og:title" content="Inherited Open Graph title">
        <meta property="og:description" content="Inherited Open Graph description">
        <meta name="twitter:title" content="Inherited Twitter title">
        <meta name="twitter:description" content="Inherited Twitter description">
        </head><body>Keep me</body></html>"""
        card = self.config["cards"]["climate"]
        before = Head(source)
        social_title = 'Passt es & bleibt die "Messung" korrekt?'
        social_description = 'Vergleiche "Original" & Zubehör für <dein Modell>.'
        for overrides in ({}, {"social_title": social_title}, {"social_description": social_description},
                          {"social_title": social_title, "social_description": social_description}):
            with self.subTest(overrides=overrides):
                result = preview.transform(source, "/", {**card, **overrides})
                after = Head(result)
                self.assertEqual(after.titles, ["Original for search & browsers"])
                self.assertEqual(after.names["description"], ["Original search description"])
                for suffix in ("title", "description"):
                    key = "social_" + suffix
                    for prefix in ("og:", "twitter:"):
                        field = prefix + suffix
                        expected = [overrides[key]] if key in overrides else before.meta[field]
                        self.assertEqual(after.meta[field], expected)
                self.assertEqual(preview.transform(result, "/", {**card, **overrides}), result)

    def test_preserves_robot_restrictions_after_repeated_builds(self):
        source = """<html><head><link rel='canonical' href='https://getecoback.com/'>
        <meta name='robots' content='nofollow, max-snippet:80, max-image-preview:standard'>
        <meta name='googlebot' content='noimageindex'>
        <meta name='twitter:card' content='summary'></head><body>Keep me</body></html>"""
        card = self.config["cards"]["climate"]
        result = preview.transform(source, "/", card)
        self.assertEqual(preview.transform(result, "/", card), result)
        self.assertEqual(Head(result).meta["robots"], ["nofollow, max-snippet:80, max-image-preview:large"])
        self.assertEqual(Head(result).meta["googlebot"], ["noimageindex"])

    def test_refuses_noindex_or_wrong_canonical(self):
        card = self.config["cards"]["climate"]
        for source in [
            '<head><link rel="canonical" href="https://getecoback.com/other.html"></head>',
            '<head><link rel="canonical" href="https://getecoback.com/"><meta name="robots" content="noindex,follow"></head>',
            '<head><link rel="canonical" href="https://getecoback.com/"><meta name="googlebot" content="none"></head>',
        ]:
            with self.subTest(source=source), self.assertRaises(ValueError):
                preview.transform(source, "/", card)

    def test_existing_authored_article_image_is_not_silently_overwritten(self):
        source = '<head><link rel="canonical" href="https://getecoback.com/"><script type="application/ld+json">{"@type":"Article","image":"https://example.invalid/authored.jpg"}</script></head>'
        with self.assertRaisesRegex(ValueError, "authored image"):
            preview.transform(source, "/", self.config["cards"]["climate"])

    def test_build_does_not_touch_unselected_pages_and_fails_before_partial_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            for route in self.config["pages"]:
                name = "index.html" if route == "/" else route.lstrip("/")
                target = site / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(preview.ROOT / "site" / name, target)
            shutil.copytree(preview.ROOT / "site/assets/social", site / "assets/social")
            unselected = site / "unrelated.html"
            unselected.write_text('<head><meta name="robots" content="noindex"></head>Private sentinel')
            preview.build(site)
            self.assertEqual(unselected.read_text(), '<head><meta name="robots" content="noindex"></head>Private sentinel')
            before = {path: path.read_bytes() for path in site.rglob("*.html")}
            preview.build(site, check=True)
            self.assertEqual(before, {path: path.read_bytes() for path in site.rglob("*.html")})
            missing = site / "guide/luftentfeuchter-keller.html"
            missing.unlink()
            home = site / "index.html"
            home_before = home.read_bytes()
            with self.assertRaises(FileNotFoundError):
                preview.build(site)
            self.assertEqual(home.read_bytes(), home_before)

    def test_all_assets_are_small_actual_1200_by_630_pngs(self):
        for card in self.config["cards"].values():
            asset = preview.ROOT / "site" / card["image"].lstrip("/")
            with self.subTest(asset=asset):
                self.assertEqual(preview.png_dimensions(asset), (1200, 630))
                self.assertLess(asset.stat().st_size, 300_000)


if __name__ == "__main__":
    unittest.main()
