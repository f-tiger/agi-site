#!/usr/bin/env python3
"""Attach original topic-specific previews to five existing acquisition routes.

Run after page generators. This pass changes head metadata only: it neither
updates editorial dates nor adds a page, tracking call or visible download.
Assets are committed; normal builds need only the Python standard library.
"""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
import argparse
import json
import re
import struct

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "data/social-previews.json"
ORIGIN = "https://getecoback.com"
START = "<!--EB_SOCIAL_PREVIEW-->"
END = "<!--/EB_SOCIAL_PREVIEW-->"
OWNED = {"og:image", "og:image:width", "og:image:height", "og:image:type", "og:image:alt",
         "twitter:card", "twitter:image", "twitter:image:alt"}
ARTICLE_TYPES = {"Article", "NewsArticle", "BlogPosting"}


class Tag(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.attrs = {}
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.attrs = dict(attrs)


def png_dimensions(path):
    with path.open("rb") as asset:
        data = asset.read(24)
    if len(data) != 24 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise ValueError(f"Not a PNG: {path}")
    return struct.unpack(">II", data[16:24])


def load_config(path=CONFIG):
    config = json.loads(path.read_text())
    if config.get("origin") != ORIGIN or config.get("version") != 1:
        raise ValueError("Unexpected social preview configuration")
    for route, card in config["pages"].items():
        if not re.fullmatch(r"/(?:[a-z0-9/-]+\.html)?", route) or ".." in route:
            raise ValueError(f"Not a canonical HTML route: {route}")
        if card not in config["cards"]:
            raise ValueError(f"Missing preview card for {route}")
    for card in config["cards"].values():
        if not re.fullmatch(r"/assets/social/[a-z0-9-]+\.png", card["image"]):
            raise ValueError("Preview must use a local versioned PNG")
        if not card.get("alt"):
            raise ValueError("Preview needs a meaningful text alternative")
    return config


def article_image(data, card):
    """Only describe an illustration for an actual existing Article node."""
    if isinstance(data, list):
        for item in data:
            article_image(item, card)
    elif isinstance(data, dict):
        types = data.get("@type", [])
        types = [types] if isinstance(types, str) else types
        if ARTICLE_TYPES.intersection(types):
            current = data.get("image")
            expected = {"@type": "ImageObject", "url": ORIGIN + card["image"],
                        "width": 1200, "height": 630, "caption": card["alt"]}
            if current and current != expected:
                raise ValueError("Article has an authored image; review the preview mapping first")
            data["image"] = expected
        # Iterate over a copy because this node may have just gained image.
        for value in list(data.values()):
            if isinstance(value, (dict, list)):
                article_image(value, card)


def transform(source, route, card):
    split = re.search(r"</head\s*>", source, re.I)
    if not split:
        raise ValueError(f"No head on {route}")
    head, tail = source[:split.start()], source[split.start():]
    canonicals = [Tag(m.group()).attrs.get("href")
                  for m in re.finditer(r"<link\b[^>]*>", head, re.I)
                  if Tag(m.group()).attrs.get("rel", "").lower() == "canonical"]
    if canonicals != [ORIGIN + route]:
        raise ValueError(f"Preview canonical mismatch on {route}: {canonicals}")
    robots = []
    # Capture existing restrictions before removing our previous block, because
    # that block carries the original robots directives on subsequent builds.
    for match in re.finditer(r"<meta\b[^>]*>", head, re.I):
        attrs = Tag(match.group()).attrs
        name = (attrs.get("name") or "").lower()
        if name in ("robots", "googlebot"):
            content = attrs.get("content", "")
            if re.search(r"(?:^|[,;\s])(?:noindex|none)(?:$|[,;\s])", content, re.I):
                raise ValueError(f"Preview target is noindex: {route}")
            if name == "robots":
                robots.extend(part.strip() for part in content.split(","))
    head = re.sub(r"\n?<!--EB_SOCIAL_PREVIEW-->.*?<!--/EB_SOCIAL_PREVIEW-->\n?",
                  "", head, flags=re.S)

    def remove_owned(match):
        attrs = Tag(match.group()).attrs
        name = (attrs.get("property") or attrs.get("name") or "").lower()
        if name in OWNED:
            return ""
        if name == "robots":
            return ""
        return match.group()

    head = re.sub(r"<meta\b[^>]*>\n?", remove_owned, head, flags=re.I)
    directives = []
    for directive in robots:
        if directive and not directive.lower().startswith("max-image-preview:"):
            if directive.lower() not in [v.lower() for v in directives]:
                directives.append(directive)
    directives.append("max-image-preview:large")

    def schema(match):
        attrs = Tag("<script " + match.group(1) + ">").attrs
        if attrs.get("type", "").lower() != "application/ld+json":
            return match.group()
        data = json.loads(match.group(2))
        before = json.dumps(data, ensure_ascii=False)
        article_image(data, card)
        if before == json.dumps(data, ensure_ascii=False):
            return match.group()
        payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        return "<script" + match.group(1) + ">" + payload + "</script>"

    head = re.sub(r"<script\b([^>]*)>(.*?)</script\s*>", schema, head, flags=re.S | re.I)
    url, alt = escape(ORIGIN + card["image"], quote=True), escape(card["alt"], quote=True)
    block = "\n".join([
        START,
        f'<meta name="robots" content="{escape(", ".join(directives), quote=True)}">',
        f'<meta property="og:image" content="{url}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:type" content="image/png">',
        f'<meta property="og:image:alt" content="{alt}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:image" content="{url}">',
        f'<meta name="twitter:image:alt" content="{alt}">',
        END,
    ])
    return head.rstrip() + "\n" + block + "\n" + tail


def build(site, check=False):
    config = load_config()
    for card in config["cards"].values():
        path = site / card["image"].lstrip("/")
        if png_dimensions(path) != (1200, 630) or path.stat().st_size > 300_000:
            raise ValueError(f"Preview must be 1200x630 and at most 300 KB: {path}")
    changed = []
    # Validate all targets first; a missing page must not produce a partial pass.
    output = {}
    for route, key in config["pages"].items():
        path = site / ("index.html" if route == "/" else route.lstrip("/"))
        original = path.read_text()
        result = transform(original, route, config["cards"][key])
        output[path] = result
        if result != original:
            changed.append(route)
    if check and changed:
        raise ValueError("Preview metadata needs rebuilding: " + ", ".join(changed))
    if not check:
        for path, result in output.items():
            if path.read_text() != result:
                path.write_text(result)
    print(f"Social previews: {len(output)} canonical pages, {len(config['cards'])} original PNGs; "
          f"{len(changed)} changed; dates preserved")
    return changed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, default=ROOT / "site")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    build(args.site, args.check)
