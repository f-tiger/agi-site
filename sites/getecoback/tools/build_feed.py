#!/usr/bin/env python3
"""Build the German and English guide feeds from the final canonical pages."""
import datetime
import html
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

from build_household import PAGES
from build_language_nav import Head

SITE = Path(__file__).resolve().parents[1] / "site"
BASE = "https://getecoback.com"
ATOM = "http://www.w3.org/2005/Atom"
ET.register_namespace("atom", ATOM)
# Reserve this existing GA4 allowlisted combination for ECO guide-feed entries.
SOURCE = "?utm_source=getecoback&utm_medium=referral&utm_campaign=listing"
EN_LINK = '<link rel="alternate" type="application/rss+xml" title="EcoBack guides in English" href="/en/feed.xml">'
OWN_RSS = re.compile(r'<link\b(?=[^>]*\btype="application/rss\+xml")(?=[^>]*\bhref="/(?:en/)?feed\.xml")[^>]*>', re.I)


def source_date(head, field):
    found = re.search(rf'"{field}"\s*:\s*"(\d{{4}}-\d{{2}}-\d{{2}})(?:T[^"]*)?"', head)
    return datetime.date.fromisoformat(found[1]) if found else None


def rfc822(day):
    # Preserve the date representation that existing German feed readers received.
    return day.strftime("%a, %d %b %Y 08:00:00 +0000")


def guide_item(head, url):
    title = re.search(r"<title>(.*?)</title>", head, re.S | re.I)
    desc = re.search(r'<meta name="description" content="([^"]*)"', head, re.I)
    if not title or not desc:
        raise ValueError(f"Missing guide title or description: {url}")
    published = source_date(head, "datePublished")
    updated = source_date(head, "dateModified") or published
    return (updated, published, url, html.unescape(title[1]).strip(), html.unescape(desc[1]).strip())


def write_feed(home, title, description, lang, items, build_day):
    path = SITE / home.strip("/") / "feed.xml"
    root = ET.Element("rss", version="2.0")
    channel = ET.SubElement(root, "channel")
    for tag, value in (("title", title), ("link", BASE + home),
                       ("description", description), ("language", lang), ("lastBuildDate", rfc822(build_day))):
        ET.SubElement(channel, tag).text = value
    ET.SubElement(channel, f"{{{ATOM}}}link", href=BASE + "/" + path.relative_to(SITE).as_posix(),
                  rel="self", type="application/rss+xml")
    items.sort(key=lambda i: (i[0] or datetime.date.min, i[1] or datetime.date.min, i[2]), reverse=True)
    for updated, published, url, headline, desc in items[:50]:
        item = ET.SubElement(channel, "item")
        ET.SubElement(item, "title").text = headline
        ET.SubElement(item, "link").text = url + SOURCE
        ET.SubElement(item, "guid", isPermaLink="true").text = url
        if published:
            ET.SubElement(item, "pubDate").text = rfc822(published)
        if updated:
            ET.SubElement(item, f"{{{ATOM}}}updated").text = updated.isoformat() + "T08:00:00Z"
        ET.SubElement(item, "description").text = desc
    ET.indent(root)
    ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)
    print(f"{path.relative_to(SITE)}: {min(50, len(items))} of {len(items)} guides")


def build(day):
    de_items, en_items = [], []
    german = list((SITE / "guide").glob("*.html")) + [SITE / (slug + ".html") for slug in PAGES]
    for path in german + sorted((SITE / "en").rglob("*.html")):
        raw = path.read_text()
        head, closing, body = raw.partition("</head>")
        meta = Head(head)
        rel = path.relative_to(SITE)
        route = "/" + rel.as_posix()
        if path.name == "index.html":
            route = route.removesuffix("index.html")
        url = BASE + route
        if not closing or meta.noindex or meta.canonical != url:
            continue
        if rel.parts[0] == "en":
            if meta.lang.split("-")[0] != "en":
                continue
            # Some UK tools bypass the shared chrome and some older pages still
            # advertise the German feed. Normalize only our own alternate links.
            first = OWN_RSS.search(head)
            if first:
                clean = head[:first.start()] + EN_LINK + OWN_RSS.sub("", head[first.end():])
            else:
                clean = head.rstrip() + "\n" + EN_LINK + "\n"
            if clean != head:
                path.write_text(clean + closing + body)
            if rel.parent.as_posix() == "en/guide":
                en_items.append(guide_item(head, url))
        elif meta.lang.split("-")[0] == "de":
            de_items.append(guide_item(head, url))
    write_feed("/", "EcoBack – Kühlen, Heizen & Energie sparen",
               "Unabhängiger deutschsprachiger Ratgeber für Klimageräte, Heizen, Luftqualität und Energiesparen.", "de-DE", de_items, day)
    write_feed("/en/", "EcoBack guides in English",
               "Practical guides to humidity, laundry, heating and cooling at home.", "en", en_items, day)


if __name__ == "__main__":
    build(datetime.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else datetime.datetime.now(datetime.timezone.utc).date())
