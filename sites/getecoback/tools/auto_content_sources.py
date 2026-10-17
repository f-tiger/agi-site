#!/usr/bin/env python3
"""Bounded public manufacturer discovery and specification extraction.

No prose, ratings, savings, popularity or product endorsements are imported.
Discovery is dynamic (official sitemap and Shopify inventory), not a model list.
Every returned fact is a manufacturer statement with its stated conditions.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import ipaddress
import json
from pathlib import Path
import re
import socket
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
import xml.etree.ElementTree as ET

ALLOWED_HOSTS = frozenset({"de.trotec.com", "www.meaco.com"})
TROTEC_SITEMAP = "https://de.trotec.com/shop/sitemaps/de_DE_sitemap.xml"
MEACO_INVENTORY = "https://www.meaco.com/products.json?limit=250"
MAX_REQUESTS = 8
MAX_BYTES = 2 * 1024 * 1024
MAX_TOTAL_BYTES = 20 * 1024 * 1024
TIMEOUT = 15
MAX_PRODUCTS_PER_MARKET = 3
RETIRED = re.compile(r"growatt|solarbank|balkon|photovolta|powerstation|solarflow|batteriespeicher", re.I)
ACCESSORY = re.compile(r"\b(?:filter|filters|castors|castor|tank|tanks|spares?|hose|cover|pump|adapter|bracket|bundle|refurbished|accessories)\b", re.I)
INJECTION = re.compile(r"[<>\x00-\x08\x0b\x0c\x0e-\x1f]|ignore\s+(?:previous|all)|system\s*prompt|api[_ -]?key|(?:https?|javascript|data):", re.I)
TROTEC_PRODUCT = re.compile(r"^/shop/luftentfeuchter-ttk-(?:i-)?\d+-(?:e|hepa(?:-plus)?)\.html$")
MEACO_PRODUCT = re.compile(r"^/products/[a-z0-9][a-z0-9-]{2,150}$")


class SourceError(ValueError):
    pass


def utc(value=None):
    value = value or datetime.now(timezone.utc)
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def safe_url(url, expected_host=None, resolve=True):
    try:
        p = urlsplit(url)
        good = (p.scheme == "https" and p.hostname in ALLOWED_HOSTS
                and (expected_host is None or p.hostname == expected_host)
                and p.username is None and p.password is None and p.port is None
                and not p.fragment and "\\" not in url and not re.search(r"[\x00-\x20]", url))
    except (TypeError, ValueError):
        good = False
    if not good:
        raise SourceError("unsafe_source_url")
    if resolve:
        try:
            addresses = socket.getaddrinfo(p.hostname, 443, type=socket.SOCK_STREAM)
            if not addresses or any(not ipaddress.ip_address(row[4][0]).is_global for row in addresses):
                raise SourceError("non_public_source_address")
        except OSError as exc:
            raise SourceError("source_dns_unavailable") from exc
    return url


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Fetcher:
    def __init__(self):
        self.requests = 0
        self.bytes = 0
        self.opener = build_opener(NoRedirect())

    def get(self, url):
        host = urlsplit(safe_url(url)).hostname
        for redirect in range(3):
            safe_url(url, host)
            if self.requests >= MAX_REQUESTS:
                raise SourceError("request_budget_exhausted")
            self.requests += 1
            path = urlsplit(url).path
            accept = "application/json" if path.endswith(".json") else "application/xml,text/xml" if path.endswith(".xml") else "text/html"
            request = Request(url, headers={"User-Agent": "EcoBackSourceCheck/1.0 (+https://getecoback.com/wie-wir-empfehlen.html)",
                                            "Accept": accept, "Accept-Encoding": "identity"})
            try:
                response = self.opener.open(request, timeout=TIMEOUT)
            except HTTPError as exc:
                if exc.code in (301, 302, 303, 307, 308):
                    if redirect == 2:
                        raise SourceError("redirect_limit") from exc
                    url = urljoin(url, exc.headers.get("Location", ""))
                    safe_url(url, host)
                    continue
                raise SourceError("http_" + str(exc.code)) from exc
            with response:
                if response.status != 200:
                    raise SourceError("unexpected_status")
                if response.headers.get("Content-Encoding", "identity") != "identity":
                    raise SourceError("compressed_response_not_supported")
                remaining = min(MAX_BYTES, MAX_TOTAL_BYTES - self.bytes)
                body = response.read(remaining + 1)
                self.bytes += len(body)
                if len(body) > remaining:
                    raise SourceError("response_byte_budget_exceeded")
            return body, url
        raise SourceError("redirect_limit")


def text(value):
    value = re.sub(r"\s+", " ", str(value)).strip()
    if len(value) > 300 or INJECTION.search(value):
        raise SourceError("invalid_source_field")
    return value


class SpecHTML(HTMLParser):
    """Only table cells and Product JSON-LD; no script evaluation or prose import."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []; self.table = None; self.row = None; self.cell = None
        self.jsonld = []; self.script = False; self.in_h1 = False; self.h1 = []; self.canonicals = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "link" and attrs.get("rel") == "canonical": self.canonicals.append(attrs.get("href", ""))
        if tag == "h1": self.in_h1 = True; self.h1.append("")
        if tag == "script":
            self.script = attrs.get("type", "").lower() == "application/ld+json"
            if self.script: self.jsonld.append("")
        if tag == "table": self.table = []
        elif tag == "tr" and self.table is not None: self.row = []
        elif tag in ("td", "th") and self.row is not None: self.cell = []
        elif tag in ("br", "p", "li") and self.cell is not None: self.cell.append(" ")
    def handle_endtag(self, tag):
        if tag == "script": self.script = False
        if tag == "h1": self.in_h1 = False
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(re.sub(r"\s+", " ", "".join(self.cell)).strip()); self.cell = None
        elif tag == "tr" and self.row is not None:
            self.table.append(self.row); self.row = None
        elif tag == "table" and self.table is not None:
            self.tables.append(self.table); self.table = None
    def handle_data(self, data):
        if self.script: self.jsonld[-1] += data
        elif self.cell is not None: self.cell.append(data)
        if self.in_h1: self.h1[-1] += data


def numbers(value):
    return [float(n.replace(",", ".")) for n in re.findall(r"(?<!\w)[+-]?\d+(?:[.,]\d+)?", value.replace("−", "-"))]


NUMBER = r"[+-]?\d+(?:[.,]\d+)?"


def quantity(value, unit_pattern, *, bare=False):
    """Accept only the unit stated by the table; never reinterpret another unit."""
    value = value.replace("−", "-").strip()
    suffix = r"(?:\s*(?:" + unit_pattern + "))" + ("?" if bare else "")
    match = re.fullmatch(r"(" + NUMBER + ")" + suffix, value, flags=re.I)
    if not match: raise SourceError("unsupported_or_missing_specification_unit")
    return float(match[1].replace(",", "."))


def add(facts, key, label, value, unit="", context=""):
    if value is None: return
    if isinstance(value, str): value = text(value)
    fact = {"key": key, "label": text(label), "value": value, "unit": unit, "context": text(context)}
    old = next((f for f in facts if f["key"] == key), None)
    if old and old != fact:
        raise SourceError("conflicting_specification_" + key)
    if not old: facts.append(fact)


def product_schema(parser):
    def walk(node):
        if isinstance(node, list):
            for item in node: yield from walk(item)
        elif isinstance(node, dict):
            typ = node.get("@type", [])
            if typ == "Product" or isinstance(typ, list) and "Product" in typ: yield node
            yield from walk(node.get("@graph", []))
    products = []
    for block in parser.jsonld:
        try: products.extend(walk(json.loads(block)))
        except (ValueError, TypeError): continue
    return products


def validate_facts(facts):
    bykey = {f["key"]: f for f in facts}
    power = bykey.get("power_watts", {}).get("value")
    if not isinstance(power, (int, float)) or isinstance(power, bool) or not 10 <= power <= 3000:
        raise SourceError("missing_or_invalid_power")
    # Min/max temperature are one independent property, not two facts.
    categories = {"operating_temperature" if k.startswith("operating_temperature_") else k for k in bykey}
    categories -= {"voltage_v", "plug"}
    if len(categories) < 4 or not {"tank_l", "noise_db", "operating_temperature"} & categories:
        raise SourceError("insufficient_independent_specifications")
    bounds = {"tank_l": (.1, 30), "weight_kg": (.5, 80), "extraction_l_per_day": (.1, 200),
              "operating_temperature_min_c": (-10, 30), "operating_temperature_max_c": (10, 60)}
    for key, (low, high) in bounds.items():
        if key in bykey and not low <= bykey[key]["value"] <= high:
            raise SourceError("implausible_" + key)
    if "operating_temperature_min_c" in bykey and "operating_temperature_max_c" in bykey:
        if bykey["operating_temperature_min_c"]["value"] >= bykey["operating_temperature_max_c"]["value"]:
            raise SourceError("reversed_temperature_range")
    return power


def source_identifier(country, url):
    return ("trotec-de" if country == "DE" else "meaco-gb") + ":" + hashlib.sha256(url.encode()).hexdigest()[:12]


def make_product(country, name, model, url, discovery, body, facts, now):
    power = validate_facts(facts)
    name, model = text(name), text(model)
    if RETIRED.search(name + " " + model) or ACCESSORY.search(name):
        raise SourceError("not_household_dehumidifier")
    # Receipt integrity hashes the fetched document. The publication engine
    # separately hashes accepted specifications to ignore prices/footer churn.
    source_hash = hashlib.sha256(body).hexdigest()
    plug = next((f["value"] for f in facts if f["key"] == "plug"), None)
    return {"source_id": source_identifier(country, url),
            "country": country, "language": "de" if country == "DE" else "en-GB", "name": name,
            "brand": "Trotec" if country == "DE" else "Meaco", "model": model,
            "product_url": url, "source_urls": [url], "checked_at": utc(now).isoformat(),
            "source_hash": source_hash, "facts": facts, "power_watts": power,
            "market": {"currency": "EUR" if country == "DE" else "GBP", "plug": plug}}


def parse_trotec(body, url, now):
    safe_url(url, "de.trotec.com", resolve=False)
    if not TROTEC_PRODUCT.fullmatch(urlsplit(url).path): raise SourceError("unexpected_product_path")
    parser = SpecHTML(); parser.feed(body.decode("utf-8", "replace"))
    schemas = product_schema(parser)
    product = next((p for p in schemas if p.get("offers", {}).get("url") == url), None)
    if not product: raise SourceError("product_identity_missing")
    name = text(product.get("name", ""))
    if not re.fullmatch(r"Luftentfeuchter TTK(?: I)? \d+ (?:E|HEPA(?: PLUS)?)", name, re.I):
        raise SourceError("not_household_dehumidifier")
    expected_model = urlsplit(url).path.rsplit("/", 1)[1].removeprefix("luftentfeuchter-").removesuffix(".html")
    model = re.sub(r"^Luftentfeuchter\s+", "", name, flags=re.I)
    normalize = lambda value: re.sub(r"[^a-z0-9]", "", value.lower())
    if (normalize(model) != normalize(expected_model) or parser.canonicals != [url]
            or len(parser.h1) != 1 or text(parser.h1[0]) != name):
        raise SourceError("product_identity_mismatch")
    tables = [t for t in parser.tables if any(any(c in ("Leistungsaufnahme [kW]", "Leistungsaufnahme", "Leistungsaufnahme [W]") for c in r) for r in t)]
    if len(tables) != 1: raise SourceError("technical_table_missing_or_ambiguous")
    facts = []; section = ""; dimensions = {}
    for row in tables[0]:
        cells = [x.strip() for x in row if x.strip()]
        if len(cells) == 1: section = cells[0]; continue
        if len(cells) != 2: continue
        label, value = cells; nums = numbers(value)
        if not nums: continue
        n = nums[0]
        if label == "Leistungsaufnahme [kW]":
            add(facts, "power_watts", "Leistungsaufnahme", quantity(value, "kW", bare=True) * 1000, "W", "Herstellerangabe; keine gemessene mittlere Nutzung")
        elif label in ("Leistungsaufnahme", "Leistungsaufnahme [W]"):
            match = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*(kW|W)", value)
            if not match: raise SourceError("ambiguous_power")
            add(facts, "power_watts", "Leistungsaufnahme", n * (1000 if match[2] == "kW" else 1), "W", "Herstellerangabe; keine gemessene mittlere Nutzung")
        elif section == "Entfeuchtungsleistung" and "bei " in label and "l/24h" in label:
            add(facts, "extraction_l_per_day", "Entfeuchtung unter Prüfbedingungen", quantity(value, "l/24h", bare=True), "L/24h", label)
        elif section == "Wasserbehälter" and label == "Inhalt in [l]": add(facts, "tank_l", "Wasserbehälter", quantity(value, "l", bare=True), "L")
        elif label == "Wasserbehälter Kapazität [l]": add(facts, "tank_l", "Wasserbehälter", quantity(value, "l", bare=True), "L")
        elif section == "Schallwerte" and "dB(A)" in label:
            n = quantity(value, r"dB\(A\)", bare=True)
            if not 10 <= n <= 90: raise SourceError("implausible_noise")
            add(facts, "noise_db", "Geräuschangabe", n, "dB(A)", label)
        elif label == "Temperaturbereich min. [°C]": add(facts, "operating_temperature_min_c", "Betriebstemperatur mindestens", quantity(value, r"°\s*C", bare=True), "°C")
        elif label == "Temperaturbereich max. [°C]": add(facts, "operating_temperature_max_c", "Betriebstemperatur höchstens", quantity(value, r"°\s*C", bare=True), "°C")
        elif label == "(ohne Verpackung) [kg]" and section == "Gewicht": add(facts, "weight_kg", "Gewicht ohne Verpackung", quantity(value, "kg", bare=True), "kg")
        elif label == "Gewicht ohne Verpackung [kg]": add(facts, "weight_kg", "Gewicht ohne Verpackung", quantity(value, "kg", bare=True), "kg")
        elif label in ("Länge (ohne Verpackung) [mm]", "Breite (ohne Verpackung) [mm]", "Höhe (ohne Verpackung) [mm]", "Länge ohne Verpackung [mm]", "Breite ohne Verpackung [mm]", "Höhe ohne Verpackung [mm]"):
            n = quantity(value, "mm", bare=True)
            if not 50 <= n <= 2000: raise SourceError("implausible_dimension")
            dimensions[label.split()[0]] = n
        elif label == "Anschlussstecker" and re.fullmatch(r"CEE 7/[47]", value): add(facts, "plug", "Anschlussstecker", value)
    for table in parser.tables:
        if ["Temperaturbereich", "Entfeuchtungsleistung [l/24h]"] in table:
            for row in table:
                if len(row) == 2 and re.fullmatch(r"\d+(?:[.,]\d+)? °C / \d+(?:[.,]\d+)? % r\.F\.", row[0]):
                    # Multiple test conditions are valuable but not interchangeable.
                    # Keep the first explicit condition; never substitute "Max.".
                    if not any(f["key"] == "extraction_l_per_day" for f in facts):
                        add(facts, "extraction_l_per_day", "Entfeuchtung unter Prüfbedingungen", quantity(row[1], "l/24h", bare=True), "L/24h", row[0])
        if ["Abstand [m]", "Stufe/Anwendung", "Schallpegel [dB(A)]"] in table:
            for row in table:
                if len(row) == 3 and re.fullmatch(r"\d+(?:[.,]\d+)?", row[0]) and re.fullmatch(r"\d+(?:[.,]\d+)?", row[2]):
                    noise = numbers(row[2])[0]
                    if not 10 <= noise <= 90: raise SourceError("implausible_noise")
                    add(facts, "noise_db", "Geräuschangabe", noise, "dB(A)", "Abstand " + row[0] + " m" + ("; " + row[1] if row[1] else ""))
        if ["Anschlussstecker"] in table:
            for row in table:
                if len(row) == 2 and row[0] == "Bezeichnung" and re.fullmatch(r"CEE 7/[47]", row[1]):
                    add(facts, "plug", "Anschlussstecker", row[1])
    if len(dimensions) == 3:
        add(facts, "dimensions_mm", "Abmessungen L × B × H", " × ".join(f"{dimensions[k]:g}" for k in ("Länge", "Breite", "Höhe")), "mm", "ohne Verpackung")
    return make_product("DE", name, model, url, TROTEC_SITEMAP, body, facts, now)


def parse_meaco(body, url, item, now):
    safe_url(url, "www.meaco.com", resolve=False)
    if not MEACO_PRODUCT.fullmatch(urlsplit(url).path): raise SourceError("unexpected_product_path")
    parser = SpecHTML(); parser.feed(body.decode("utf-8", "replace"))
    schemas = product_schema(parser)
    expected = text(item["title"])
    # Shopify often includes ProductGroup. The product's canonical title is also
    # repeated in its own JSON object, but a product spec table is mandatory.
    if parser.canonicals != [url] or len(parser.h1) != 1 or text(parser.h1[0]) != expected:
        raise SourceError("product_identity_mismatch")
    if schemas and not any(text(p.get("name", "")) == expected for p in schemas):
        raise SourceError("product_identity_mismatch")
    tables = [t for t in parser.tables if any("power consumption" in " ".join(r).lower() for r in t)]
    if len(tables) != 1: raise SourceError("technical_table_missing_or_ambiguous")
    facts = []
    for row in tables[0]:
        cells = [x.strip() for x in row if x.strip()]
        if len(cells) != 2: continue
        label, value = cells; nums = numbers(value)
        if not nums: continue
        n = nums[0]
        if label.lower().startswith("power consumption"):
            if not re.fullmatch(r"\d+(?:[.,]\d+)?\s*(?:W|watts?)", value, re.I): raise SourceError("ambiguous_power")
            add(facts, "power_watts", "Manufacturer power consumption", n, "W", label)
        elif label.lower() == "tank size": add(facts, "tank_l", "Water tank", quantity(value, r"l|litres?|liters?"), "L")
        elif label.lower() in ("noise level", "noise levels"):
            match = re.fullmatch(r"(\d+(?:\.\d+)?(?:\s*(?:,|and|/|[-–])\s*\d+(?:\.\d+)?)*)(?:\s*)dB\(A\)(\s+at\s+(?:one|\d+(?:\.\d+)?)\s+met(?:re|er)s?)?", value, re.I)
            if not match: raise SourceError("unsupported_or_missing_noise_unit")
            levels = [float(v) for v in re.findall(r"\d+(?:\.\d+)?", match[1])]
            if not all(10 <= v <= 90 for v in levels): raise SourceError("implausible_noise")
            context = "Manufacturer operating modes; " + ("measurement " + match[2].strip() if match[2] else "measurement distance not stated in this table")
            add(facts, "noise_db", "Manufacturer noise levels", match[1].strip(), "dB(A)", context)
        elif label.lower() in ("operating temperatures", "operating temperature"):
            match = re.fullmatch(r"(" + NUMBER + r")\s*°\s*C\s*(?:[-–]|to)\s*(" + NUMBER + r")\s*°\s*C", value.replace("−", "-"), re.I)
            if not match: raise SourceError("unsupported_or_missing_temperature_unit")
            add(facts, "operating_temperature_min_c", "Minimum operating temperature", float(match[1].replace(",", ".")), "°C")
            add(facts, "operating_temperature_max_c", "Maximum operating temperature", float(match[2].replace(",", ".")), "°C")
        elif label.lower() == "weight": add(facts, "weight_kg", "Weight", quantity(value, "kgs?"), "kg")
        elif label.lower() == "dimensions (hwd)":
            match = re.fullmatch(r"(" + NUMBER + r")\s*[x×]\s*(" + NUMBER + r")\s*[x×]\s*(" + NUMBER + r")\s*mm", value, re.I)
            if not match: raise SourceError("unsupported_or_missing_dimension_unit")
            dimensions = [float(v.replace(",", ".")) for v in match.groups()]
            if not all(50 <= v <= 2000 for v in dimensions): raise SourceError("implausible_dimension")
            add(facts, "dimensions_mm", "Dimensions H × W × D", " × ".join(f"{v:g}" for v in dimensions), "mm")
    model = re.sub(r"\s*(?:Dehumidifier|Low Energy Dehumidifier).*", "", expected, flags=re.I).strip()
    return make_product("GB", expected, model, url, MEACO_INVENTORY, body, facts, now)


def discover_trotec(body, now):
    if len(body) > MAX_BYTES or b"<!DOCTYPE" in body.upper() or b"<!ENTITY" in body.upper():
        raise SourceError("unsafe_sitemap")
    root = ET.fromstring(body)
    results = []
    for row in root.findall("{*}url"):
        url = row.findtext("{*}loc", "")
        try: safe_url(url, "de.trotec.com", resolve=False)
        except SourceError: continue
        if not TROTEC_PRODUCT.fullmatch(urlsplit(url).path) or urlsplit(url).query: continue
        results.append({"url": url, "modified": row.findtext("{*}lastmod", "")})
    return sorted({r["url"]: r for r in results}.values(), key=lambda r: r["url"])


def discover_meaco(body, now):
    data = json.loads(body)
    if not isinstance(data, dict) or not isinstance(data.get("products"), list): raise SourceError("invalid_product_inventory")
    results = []
    for p in data["products"][:250]:
        try:
            name = text(p.get("title", "")); handle = p.get("handle", "")
            if not isinstance(handle, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,150}", handle): continue
            if "dehumidifier" not in name.lower() or ACCESSORY.search(name) or RETIRED.search(name): continue
            if "dehumidifier" not in p.get("product_type", "").lower(): continue
            if not p.get("vendor", "").lower().startswith("meaco"): continue
            if not isinstance(p.get("variants"), list) or not p["variants"]: continue
            results.append({"url": "https://www.meaco.com/products/" + handle, "item": {"title": name}, "modified": p.get("published_at", "")})
        except (SourceError, TypeError, AttributeError): continue
    return sorted({r["url"]: r for r in results}.values(), key=lambda r: r["url"])


def choose(rows, now, seen, country="DE", known_source_ids=None):
    # Revisit the least recently inspected items. With an ephemeral cache,
    # rotate through dynamic inventory by UTC day instead of exhausting a seed.
    if not rows: return []
    known = set(known_source_ids or ())
    def rotated(items):
        if not items: return []
        if seen: return sorted(items, key=lambda r: (seen.get(r["url"], ""), r["url"]))
        offset = (utc(now).date().toordinal() * MAX_PRODUCTS_PER_MARKET) % len(items)
        return items[offset:] + items[:offset]
    fresh = rotated([r for r in rows if source_identifier(country, r["url"]) not in known])
    old = rotated([r for r in rows if source_identifier(country, r["url"]) in known])
    # A weekly slot revisits existing facts, even while discovery keeps growing.
    if old and utc(now).weekday() == 0:
        return (fresh[:MAX_PRODUCTS_PER_MARKET - 1] + old)[:MAX_PRODUCTS_PER_MARKET]
    return (fresh + old)[:MAX_PRODUCTS_PER_MARKET]


def collect_sources(now=None, cache_dir=None, known_source_ids=None):
    now = utc(now); stamp = now.isoformat(); fetcher = Fetcher()
    products, receipts, discoveries = [], [], []
    cache = Path(cache_dir) if cache_dir else None
    seen = {}
    if cache:
        cache.mkdir(parents=True, exist_ok=True)
        file = cache / "source-seen.json"
        if file.exists() and file.stat().st_size < 500_000:
            try:
                value = json.loads(file.read_text())
                if isinstance(value, dict): seen = {k: v for k, v in value.items() if isinstance(k, str) and isinstance(v, str)}
            except (ValueError, OSError): pass
    for source, country, url, parser in (("trotec-de", "DE", TROTEC_SITEMAP, discover_trotec), ("meaco-gb", "GB", MEACO_INVENTORY, discover_meaco)):
        receipt = {"source": source, "country": country, "url": url, "captured_at": stamp, "count": 0}
        try:
            body, final = fetcher.get(url)
            if final != url: raise SourceError("inventory_canonical_changed")
            rows = parser(body, now); receipt.update(status="ok" if rows else "empty", count=len(rows))
            discoveries.append((source, country, choose(rows, now, seen, country, known_source_ids)))
        except Exception as exc:
            receipt.update(status="failed", error=str(exc)[:160] if isinstance(exc, SourceError) else type(exc).__name__)
        receipts.append(receipt)
    # Interleave markets so a redirect or failed source cannot starve the UK.
    pending = [(source, country, row) for i in range(MAX_PRODUCTS_PER_MARKET) for source, country, rows in discoveries for row in rows[i:i + 1]]
    for source, country, row in pending:
        url = row["url"]; receipt = {"source": source, "country": country, "url": url, "captured_at": stamp, "count": 0}
        try:
            body, final = fetcher.get(url)
            if final != url: raise SourceError("product_canonical_changed")
            product = parse_trotec(body, url, now) if country == "DE" else parse_meaco(body, url, row["item"], now)
            products.append(product); receipt.update(status="ok", count=1, source_hash=product["source_hash"])
            if cache: (cache / (hashlib.sha256(url.encode()).hexdigest()[:16] + ".json")).write_text(json.dumps(product, indent=2, ensure_ascii=False) + "\n")
        except Exception as exc:
            receipt.update(status="failed", error=str(exc)[:160] if isinstance(exc, SourceError) else type(exc).__name__)
        seen[url] = stamp; receipts.append(receipt)
    if cache:
        (cache / "source-seen.json").write_text(json.dumps(seen, indent=2) + "\n")
    return {"products": products, "receipts": receipts,
            "budget": {"requests": fetcher.requests, "bytes": fetcher.bytes, "max_requests": MAX_REQUESTS,
                       "max_bytes_per_response": MAX_BYTES, "max_total_bytes": MAX_TOTAL_BYTES},
            "limitations": ["Manufacturer specifications, not independent measurements or demand evidence.",
                            "Inventory discovery and successful fetching do not prove popularity or UK plug/delivery eligibility.",
                            "Missing or changed tables are skipped; no stale factual fallback is published."]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path)
    args = parser.parse_args()
    result = collect_sources(cache_dir=args.cache_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"products": len(result["products"]), "markets": sorted({p["country"] for p in result["products"]}), "budget": result["budget"]}))
