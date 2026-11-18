#!/usr/bin/env python3
"""Test final files without running a producer or mutating inputs."""
import unittest
from datetime import date
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from xml.etree import ElementTree as ET
from build_language_nav import Head

SITE = Path(__file__).resolve().parents[1] / "site"
BASE = "https://getecoback.com"
ATOM = "{http://www.w3.org/2005/Atom}"


class Discovery(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.alternates, self.footer_links = [], []
        self.head = self.footer = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "head":
            self.head = True
        if tag == "footer":
            self.footer = True
        if self.head and tag == "link" and a.get("type") == "application/rss+xml" and a.get("rel") == "alternate":
            self.alternates.append(a["href"])
        if self.footer and tag == "a" and a.get("type") == "application/rss+xml":
            self.footer_links.append(a["href"])

    def handle_endtag(self, tag):
        if tag == "head":
            self.head = False
        if tag == "footer":
            self.footer = False


class FeedTests(unittest.TestCase):
    def test_canonical_english_discovery(self):
        paths = set()
        for path in (SITE / "en").rglob("*.html"):
            page = path.read_text().partition("</head>")[0] + "</head>"
            meta = Head(page)
            route = "/" + path.relative_to(SITE).as_posix()
            if path.name == "index.html":
                route = route[:-len("index.html")]
            if meta.noindex or meta.canonical != BASE + route or meta.lang.split("-")[0] != "en":
                continue
            self.assertEqual(Discovery(page).alternates, ["/en/feed.xml"], route)
            paths.add(route)
        self.assertTrue({"/en/", "/en/guide/tilt-and-turn-windows-winter-condensation.html",
                         "/en/guide/heated-airer-vs-dehumidifier.html"} <= paths)

    def test_feeds_and_homepage_subscriptions(self):
        configs = [
            ("/", "de-DE", "/guide/richtig-lueften-im-winter.html", "5 °C und 90 %"),
            ("/en/", "en", "/en/guide/tilt-and-turn-windows-winter-condensation.html", "5°C and 90%"),
        ]
        for home, lang, winter, answer in configs:
            with self.subTest(home=home):
                folder = SITE / home.strip("/")
                feed = home + "feed.xml"
                discovery = Discovery((folder / "index.html").read_text())
                self.assertEqual(discovery.alternates, [feed])
                self.assertEqual(discovery.footer_links, [feed])
                channel = ET.parse(folder / "feed.xml").find("channel")
                self.assertEqual(channel.findtext("language"), lang)
                self.assertEqual(channel.findtext("link"), BASE + home)
                self.assertEqual(channel.find(ATOM + "link").get("href"), BASE + feed)
                items = channel.findall("item")
                self.assertEqual(len(items), 50)
                seen, dates = set(), []
                for item in items:
                    guid = item.findtext("guid")
                    dest = urlsplit(item.findtext("link"))
                    self.assertEqual(guid, BASE + dest.path)
                    self.assertEqual((dest.scheme, dest.netloc, dest.fragment), ("https", "getecoback.com", ""))
                    self.assertEqual(parse_qs(dest.query), {"utm_source": ["getecoback"], "utm_medium": ["referral"], "utm_campaign": ["listing"]})
                    self.assertNotIn(guid, seen)
                    seen.add(guid)
                    self.assertEqual(dest.path.startswith("/en/"), lang == "en")
                    content = (SITE / dest.path.lstrip("/")).read_text().partition("</head>")[0]
                    self.assertEqual(Head(content).canonical, guid)
                    self.assertTrue(item.findtext("description"))
                    updated = date.fromisoformat(item.findtext(ATOM + "updated")[:10])
                    self.assertGreaterEqual(updated, parsedate_to_datetime(item.findtext("pubDate")).date())
                    dates.append(updated)
                    if guid == BASE + winter:
                        self.assertIn(answer, item.findtext("description"))
                        self.assertIn(answer, content)
                self.assertEqual(dates, sorted(dates, reverse=True))
                if date(2026, 11, 18) > dates[-1]:
                    self.assertIn(BASE + winter, seen)


if __name__ == "__main__":
    unittest.main()
