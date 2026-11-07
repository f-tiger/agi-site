"""Homepage task hierarchy without losing modules, paths or page-tail scripts."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

from build_home_order import COLD_DETAILS, DISCOVERY, FOOTER, WARM_DETAILS, compose


class HomeDOM(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.ids, self.links, self.details = [], [], []
        self.markers, self.detail_states = {}, {}
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "details":
            self.details.append(attrs.get("id"))
            self.detail_states[attrs.get("id")] = "open" in attrs
        if tag == "a":
            self.links.append(attrs.get("href"))

    def handle_endtag(self, tag):
        if tag == "details":
            self.details.pop()

    def handle_comment(self, value):
        if value.startswith("EB_"):
            self.markers[value] = tuple(self.details)


class HomeEditorialTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (Path(__file__).resolve().parents[1] / "site/index.html").read_text()

    def test_seasons_keep_every_link_id_and_script_and_are_repeatable(self):
        original = HomeDOM(self.source)
        # A generated cold homepage contains our home-cooling wrapper; composing
        # summer replaces it with home-cooling-guides and home-cold. Only these
        # declared seasonal wrappers may change. All authored ids and shared
        # wrapper ids must survive, whether the input is raw or already built.
        seasonal_wrapper_ids = {spec[1] for spec in COLD_DETAILS + WARM_DETAILS}
        preserved_ids = set(original.ids) - seasonal_wrapper_ids
        scripts = Counter(re.findall(r"<script\b.*?</script>", self.source, re.S))
        for season in ("winter", "herbst", "sommer", "fruehjahr"):
            with self.subTest(season=season):
                result = compose(self.source, season)
                parsed = HomeDOM(result)
                self.assertEqual(Counter(original.links), Counter(parsed.links))
                self.assertTrue(preserved_ids.issubset(parsed.ids))
                self.assertEqual(len(parsed.ids), len(set(parsed.ids)))
                self.assertEqual(scripts, Counter(re.findall(r"<script\b.*?</script>", result, re.S)))
                self.assertEqual(result, compose(result, season))
                # An already-composed cold homepage can become a warm one and
                # return without leaving nested wrappers or duplicate modules.
                other = "sommer" if season != "sommer" else "winter"
                self.assertEqual(result, compose(compose(result, other), season))

    def test_existing_tasks_precede_buying_and_all_discovery_precedes_footer(self):
        for season in ("winter", "sommer"):
            with self.subTest(season=season):
                result = compose(self.source, season)
                position = lambda marker: result.index("<!--" + marker + "-->")
                # The long seasonal directory must not separate the hero from
                # its main decision task; warm months keep the BTU tool first.
                self.assertLess(position("EB_HOUSEHOLD_LINK"), position("EB_UPKEEP_DISCOVERY"))
                self.assertLess(position("EB_UPKEEP_DISCOVERY"), position("EB_SEASON"))
                if season == "sommer":
                    self.assertLess(position("EB_HOMETOOL"), position("EB_HOUSEHOLD_LINK"))
                buying = position("EB_HERBST") if season == "winter" else re.search(r'<section\b[^>]*\bid="deals"', result).start()
                self.assertLess(position("EB_SEASON"), buying)
                for task in ("EB_HOUSEHOLD_LINK", "EB_UPKEEP_DISCOVERY"):
                    self.assertLess(position(task), buying)
                    self.assertLess(position(task), position("EB_TOPPICK"))
                for marker in DISCOVERY:
                    self.assertLess(position(marker), result.index(FOOTER))
                    self.assertEqual(result.count("<!--" + marker + "-->"), 1)

    def test_primary_paths_stay_visible_and_secondary_paths_use_native_details(self):
        cold = HomeDOM(compose(self.source, "winter"))
        warm = HomeDOM(compose(self.source, "sommer"))
        self.assertEqual(cold.markers["EB_HOUSEHOLD_LINK"], ())
        self.assertEqual(cold.markers["EB_HERBST"], ())
        self.assertEqual(cold.markers["EB_HOMETOOL"], ("home-cooling",))
        self.assertEqual(warm.markers["EB_HOMETOOL"], ())
        self.assertEqual(warm.markers["EB_HERBST"], ("home-cold",))
        self.assertEqual(cold.markers["EB_UPKEEP_DISCOVERY"], ("home-upkeep",))
        self.assertEqual(cold.markers["EB_FAMILY_DISCOVERY"], ("home-decisions",))
        self.assertEqual(cold.markers["EB_FAMILY_QUICK"], ("home-decisions",))
        self.assertEqual(cold.markers["EB_NEWEST"], ("home-reading",))
        self.assertEqual(cold.markers["EB_COUNTRIES"], ("home-countries",))
        self.assertFalse(any(cold.detail_states.values()))

    def test_seasonal_hero_keeps_its_task_promise_without_workshop_or_merchant_chips(self):
        result = compose(self.source, "winter")
        header_end = result.index("</header>", result.index("<body"))
        for marker in ("EB_FAMILY_QUICK", "EB_TOPPICK"):
            self.assertGreater(result.index("<!--" + marker + "-->"), header_end)
        # Existing title, subheading and primary actions stay intact.
        original_header = self.source[self.source.index("<body"):self.source.index("</header>", self.source.index("<body"))]
        for pattern in (r"<h1\b.*?</h1>", r'<p class="sub".*?</p>'):
            original = re.search(pattern, original_header, re.S)
            if original:
                self.assertIn(original.group(), result[:header_end])

    def test_late_discovery_does_not_take_account_or_consent_scripts(self):
        account = '<script id="future-account" type="module" src="/account.mjs"></script>'
        consent = '<link id="future-consent" rel="stylesheet" href="/consent.css">'
        block = re.search(r"<!--EB_PRODUCT_DISCOVERY-->.*?<!--/EB_PRODUCT_DISCOVERY-->", self.source, re.S).group()
        source = self.source.replace(block, "").replace("</body>", account + consent + block + "</body>")
        result = compose(source, "winter")
        for token in (account, consent):
            self.assertEqual(result.count(token), 1)
            self.assertGreater(result.index(token), result.index(FOOTER))
        before = re.findall(r"<(?:script|link)\b[^>]*>.*?</script>|<link\b[^>]*>", source[source.index(FOOTER):], re.S)
        after = re.findall(r"<(?:script|link)\b[^>]*>.*?</script>|<link\b[^>]*>", result[result.index(FOOTER):], re.S)
        self.assertEqual(before, after)

    def test_unknown_future_sections_survive_once_and_in_order(self):
        future = ('<section id="future-task"><h2>Future task</h2><a href="/future.html">Open</a></section>'
                  '<aside><h2>Future note</h2>Keep this too.</aside>')
        source = self.source.replace("<!--EB_DEVICE_TILES-->", future + "<!--EB_DEVICE_TILES-->")
        for season in ("winter", "sommer"):
            result = compose(source, season)
            self.assertEqual(result.count('id="future-task"'), 1)
            self.assertEqual(result.count("Future note"), 1)
            self.assertLess(result.index("Future task"), result.index("Future note"))
            self.assertIn('href="/future.html"', result)
            self.assertEqual(result, compose(result, season))

    def test_duplicate_late_and_early_modules_fail_instead_of_duplicating_ids(self):
        block = re.search(r"<!--EB_UPKEEP_DISCOVERY-->.*?<!--/EB_UPKEEP_DISCOVERY-->", self.source, re.S).group()
        duplicate = self.source.replace(FOOTER, block + FOOTER)
        with self.assertRaisesRegex(ValueError, "duplicate homepage discovery"):
            compose(duplicate, "winter")


if __name__ == "__main__":
    unittest.main()
