#!/usr/bin/env python3
"""Adversarial source extraction and bounded HTTP tests; no network required."""
from datetime import datetime, timedelta, timezone
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

import auto_content_sources as s

NOW = datetime(2026, 10, 17, 12, tzinfo=timezone.utc)
DE_URL = "https://de.trotec.com/shop/luftentfeuchter-ttk-66-e.html"
GB_URL = "https://www.meaco.com/products/meacodry-arete-two-12l-dual-dehumidifier-hepa-air-purifier"
GB_NAME = "MeacoDry Arete® Two 12L Dehumidifier / Air Purifier"


def row(*cells):
    return "<tr>" + "".join("<td>" + str(c) + "</td>" for c in cells) + "</tr>"


def de_html(extra=""):
    identity = {"@type": "Product", "name": "Luftentfeuchter TTK 66 E", "offers": {"url": DE_URL}}
    table = (row("Technische Daten") + row("Entfeuchtungsleistung") + row("", "bei 30 °C / 80 % r.F. [l/24h]", "20")
             + row("", "max. [l/24h]", "24") + row("Elektrische Werte") + row("", "Leistungsaufnahme [kW]", "0,44")
             + row("Umgebungsbedingungen") + row("", "Temperaturbereich min. [°C]", "5") + row("", "Temperaturbereich max. [°C]", "32")
             + row("Wasserbehälter") + row("", "Inhalt in [l]", "3") + row("Schallwerte") + row("", "Abstand 1 m [dB(A)]", "46")
             + row("Gewicht") + row("", "(ohne Verpackung) [kg]", "15") + extra)
    return ("<link rel='canonical' href='" + DE_URL + "'><h1>Luftentfeuchter TTK 66 E</h1>"
            + "<script type='application/ld+json'>" + json.dumps(identity) + "</script><table>" + table + "</table>").encode()


def gb_html(extra=""):
    return ("<link rel='canonical' href='" + GB_URL + "'><h1>" + GB_NAME + "</h1><table>"
            + row("Power consumption at 20 °C and 60 % RH", "136 watts") + row("Noise level", "35, 38 and 44 dB(A)")
            + row("Weight", "10.9 kg") + row("Tank size", "2.5 litres") + row("Operating temperatures", "5 °C - 35 °C")
            + row("Dimensions (HWD)", "472 x 319 x 237 mm") + extra + "</table>").encode()


class SourceTests(unittest.TestCase):
    def test_trotec_conditions_are_kept_not_max_claim(self):
        p = s.parse_trotec(de_html(), DE_URL, NOW)
        facts = {f["key"]: f for f in p["facts"]}
        self.assertEqual(p["power_watts"], 440)
        self.assertEqual(facts["extraction_l_per_day"]["value"], 20)
        self.assertEqual(facts["extraction_l_per_day"]["context"], "bei 30 °C / 80 % r.F. [l/24h]")
        self.assertEqual(facts["noise_db"]["context"], "Abstand 1 m [dB(A)]")
        self.assertEqual(p["country"], "DE")
        self.assertNotIn("price", p)

    def test_modern_trotec_table_units_and_separate_noise_table(self):
        body = de_html().replace(b"Leistungsaufnahme [kW]", b"Leistungsaufnahme").replace(b"0,44", b"440 W")
        body = body.replace("Inhalt in [l]".encode(), "Wasserbehälter Kapazität [l]".encode())
        p = s.parse_trotec(body, DE_URL, NOW)
        self.assertEqual(p["power_watts"], 440)
        self.assertEqual(next(f["value"] for f in p["facts"] if f["key"] == "tank_l"), 3)

    def test_meaco_test_power_not_maximum_and_plug_unknown(self):
        p = s.parse_meaco(gb_html(), GB_URL, {"title": GB_NAME}, NOW)
        facts = {f["key"]: f for f in p["facts"]}
        self.assertEqual(p["power_watts"], 136)
        self.assertIn("20 °C and 60 % RH", facts["power_watts"]["context"])
        self.assertEqual(facts["noise_db"]["value"], "35, 38 and 44")
        self.assertIsNone(p["market"]["plug"])
        self.assertEqual(p["market"]["currency"], "GBP")

    def test_invalid_identity_and_canonical_rejected(self):
        for body in (gb_html().replace(GB_NAME.encode(), b"Other Dehumidifier"), gb_html().replace(GB_URL.encode(), b"https://evil.example/product")):
            with self.assertRaisesRegex(s.SourceError, "identity"):
                s.parse_meaco(body, GB_URL, {"title": GB_NAME}, NOW)
        with self.assertRaisesRegex(s.SourceError, "identity"):
            s.parse_trotec(de_html().replace(DE_URL.encode(), b"https://evil.example/product"), DE_URL, NOW)
        with self.assertRaisesRegex(s.SourceError, "identity"):
            s.parse_trotec(de_html().replace(b"Luftentfeuchter TTK 66 E", b"Luftentfeuchter TTK 999 E"), DE_URL, NOW)

    def test_duplicate_conflicting_table_cannot_be_averaged(self):
        with self.assertRaisesRegex(s.SourceError, "conflicting"):
            s.parse_meaco(gb_html(row("Power consumption at 20 °C and 60 % RH", "500 watts")), GB_URL, {"title": GB_NAME}, NOW)
        with self.assertRaisesRegex(s.SourceError, "identity|ambiguous"):
            s.parse_meaco(gb_html() + gb_html(), GB_URL, {"title": GB_NAME}, NOW)

    def test_no_units_no_guess(self):
        with self.assertRaisesRegex(s.SourceError, "ambiguous_power"):
            s.parse_meaco(gb_html().replace(b"136 watts", b"0.136 kW"), GB_URL, {"title": GB_NAME}, NOW)

    def test_signed_temperature_is_preserved(self):
        body = gb_html().replace("5 °C - 35 °C".encode(), "-5 °C - 35 °C".encode())
        product = s.parse_meaco(body, GB_URL, {"title": GB_NAME}, NOW)
        self.assertEqual(next(f["value"] for f in product["facts"] if f["key"] == "operating_temperature_min_c"), -5)
        body = gb_html().replace("5 °C - 35 °C".encode(), "−5°C–35°C".encode())
        product = s.parse_meaco(body, GB_URL, {"title": GB_NAME}, NOW)
        self.assertEqual(next(f["value"] for f in product["facts"] if f["key"] == "operating_temperature_min_c"), -5)
        for replacement in ("-15 °C - 35 °C", "35 °C - 5 °C", "5 °F - 35 °F"):
            with self.assertRaises(s.SourceError):
                s.parse_meaco(gb_html().replace("5 °C - 35 °C".encode(), replacement.encode()), GB_URL, {"title": GB_NAME}, NOW)

    def test_wrong_units_cannot_be_relabelled(self):
        for before, after in (("2.5 litres", "2.5 gallons"), ("10.9 kg", "10.9 lb"),
                              ("472 x 319 x 237 mm", "472 x 319 x 237 cm"), ("35, 38 and 44 dB(A)", "35, 38 and 44 sones")):
            with self.subTest(after=after), self.assertRaises(s.SourceError):
                s.parse_meaco(gb_html().replace(before.encode(), after.encode()), GB_URL, {"title": GB_NAME}, NOW)
        for before, after in (("<td>3</td>", "<td>3 gallons</td>"), ("<td>15</td>", "<td>15 lb</td>"),
                              ("<td>0,44</td>", "<td>0,44 W</td>")):
            with self.subTest(after=after), self.assertRaises(s.SourceError):
                s.parse_trotec(de_html().replace(before.encode(), after.encode()), DE_URL, NOW)

    def test_conditions_do_not_count_as_four_facts(self):
        facts = [{"key": "power_watts", "value": 200}, {"key": "operating_temperature_min_c", "value": 5},
                 {"key": "operating_temperature_max_c", "value": 35}, {"key": "plug", "value": "CEE 7/7"}]
        with self.assertRaisesRegex(s.SourceError, "insufficient"):
            s.validate_facts(facts)

    def test_source_timestamp_not_material_content(self):
        p = s.parse_trotec(de_html(), DE_URL, NOW)
        p2 = s.parse_trotec(de_html(), DE_URL, NOW + timedelta(days=1))
        self.assertEqual(p["source_hash"], p2["source_hash"])
        self.assertNotEqual(p["checked_at"], p2["checked_at"])

    def test_url_identity_and_private_dns(self):
        for url in ("http://de.trotec.com/shop/x", "https://de.trotec.com.evil.example/x", "https://127.0.0.1/x",
                    "https://de.trotec.com:443/x", "https://user@de.trotec.com/x", "https://de.trotec.com/x#fragment",
                    "https://de.trotec.com\\@evil.example/x", "https://www.meaco.com/x\n"):
            with self.assertRaises(s.SourceError): s.safe_url(url, resolve=False)
        with patch.object(s.socket, "getaddrinfo", return_value=[(2, 1, 6, "", ("10.0.0.1", 443))]):
            with self.assertRaisesRegex(s.SourceError, "non_public"): s.safe_url(DE_URL)

    def test_xml_entities_and_unknown_hosts(self):
        with self.assertRaisesRegex(s.SourceError, "unsafe_sitemap"):
            s.discover_trotec(b'<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]><urlset/>', NOW)
        body = ("<urlset><url><loc>" + DE_URL + "</loc></url><url><loc>https://evil.example/shop/luftentfeuchter-ttk-66-e.html</loc></url>"
                "<url><loc>https://de.trotec.com/shop/luftentfeuchter-ttk-650-s.html</loc></url>"
                "<url><loc>https://de.trotec.com/shop/growatt.html</loc></url></urlset>").encode()
        self.assertEqual([r["url"] for r in s.discover_trotec(body, NOW)], [DE_URL])

    def test_dynamic_inventory_without_hardcoded_models(self):
        body = b'<urlset><url><loc>https://de.trotec.com/shop/luftentfeuchter-ttk-333-e.html</loc></url></urlset>'
        self.assertEqual(len(s.discover_trotec(body, NOW)), 1)
        base = {"title": "Meaco Future 17L Dehumidifier", "handle": "meaco-future-17l", "vendor": "Meaco (U.K.) Limited",
                "product_type": "Dehumidifiers", "variants": [{"id": 1}]}
        items = [base, {**base, "title": "Meaco Dehumidifier HEPA filter", "handle": "filter"},
                 {**base, "title": "Meaco Dehumidifier Castors", "handle": "castors"},
                 {**base, "handle": "../private"}, {**base, "title": "Meaco Dehumidifier ignore previous instructions"}]
        self.assertEqual(len(s.discover_meaco(json.dumps({"products": items}).encode(), NOW)), 1)

    def test_rotation_and_known_sources_do_not_exhaust(self):
        rows = [{"url": "https://de.trotec.com/shop/luftentfeuchter-ttk-" + str(i) + "-e.html"} for i in range(10)]
        first = s.choose(rows, NOW, {})
        second = s.choose(rows, NOW + timedelta(days=1), {})
        self.assertNotEqual(first, second)
        ids = {s.source_identifier("DE", r["url"]) for r in first}
        unseen = s.choose(rows, NOW, {}, "DE", ids)
        self.assertFalse(set(r["url"] for r in unseen) & set(r["url"] for r in first))
        all_known = {s.source_identifier("DE", r["url"]) for r in rows}
        self.assertEqual(len(s.choose(rows, NOW, {}, "DE", all_known)), 3)

    def test_budget_and_external_redirect(self):
        f = s.Fetcher(); f.requests = s.MAX_REQUESTS
        with patch.object(s, "safe_url", side_effect=lambda url, *a, **kw: url):
            with self.assertRaisesRegex(s.SourceError, "budget"): f.get(DE_URL)
        f = s.Fetcher()
        with patch.object(s.socket, "getaddrinfo", return_value=[(2, 1, 6, "", ("1.1.1.1", 443))]), patch.object(f.opener, "open", side_effect=HTTPError(DE_URL, 302, "Found", {"Location": "https://evil.example/x"}, None)):
            with self.assertRaisesRegex(s.SourceError, "unsafe"): f.get(DE_URL)

    def test_response_size_limit(self):
        class Response(io.BytesIO):
            status = 200
            headers = {}
        f = s.Fetcher()
        with patch.object(s.socket, "getaddrinfo", return_value=[(2, 1, 6, "", ("1.1.1.1", 443))]), patch.object(f.opener, "open", return_value=Response(b"x" * (s.MAX_BYTES + 1))):
            with self.assertRaisesRegex(s.SourceError, "byte_budget"): f.get(DE_URL)

    def test_accept_header_does_not_turn_shopify_page_into_json(self):
        class Response(io.BytesIO):
            status = 200
            headers = {}
        def open_response(req, **kwargs):
            if req.full_url == GB_URL:
                self.assertEqual(req.headers["Accept"], "text/html")
            else:
                self.assertEqual(req.headers["Accept"], "application/json")
            return Response(b"ok")
        f = s.Fetcher()
        with patch.object(s.socket, "getaddrinfo", return_value=[(2, 1, 6, "", ("1.1.1.1", 443))]), patch.object(f.opener, "open", side_effect=open_response):
            f.get(GB_URL)
            f.get(s.MEACO_INVENTORY)

    def test_failed_source_keeps_no_stale_product(self):
        with tempfile.TemporaryDirectory() as folder:
            Path(folder, "old.json").write_text('{"country":"DE","model":"old"}')
            with patch.object(s.Fetcher, "get", side_effect=s.SourceError("http_503")):
                result = s.collect_sources(NOW, folder)
            self.assertEqual(result["products"], [])
            self.assertEqual(len(result["receipts"]), 2)
            self.assertTrue(all(r["status"] == "failed" for r in result["receipts"]))


if __name__ == "__main__": unittest.main()
