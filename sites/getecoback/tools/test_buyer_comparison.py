"""Condition-matched evidence and safe progressive enhancement for existing guides."""
from html.parser import HTMLParser
import unittest

import moisture_decision as M


class Element:
    def __init__(self, tag, attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def find(self, tag=None, attr=None):
        result = []
        for child in self.children:
            if isinstance(child, Element):
                if (tag is None or child.tag == tag) and (attr is None or attr in child.attrs):
                    result.append(child)
                result.extend(child.find(tag, attr))
        return result

    def text(self):
        return ''.join(child.text() if isinstance(child, Element) else child for child in self.children)


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.root = Element('document')
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in {'link', 'meta', 'br', 'input', 'hr', 'img', 'source', 'wbr'}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


class BuyerComparison(unittest.TestCase):
    def documents(self):
        for en in (False, True):
            yield en, Document(M.block(en)).root

    def test_only_qualified_results_contain_the_existing_two_merchant_destinations(self):
        expected = {
            'https://www.amazon.de/dp/B07KJX6RDK?tag=getecoback-21',
            'https://www.amazon.de/s?k=MeacoDry+Arete+One+20L&tag=getecoback-21',
        }
        for en, doc in self.documents():
            answers = doc.find(attr='data-answer')
            self.assertEqual({a.attrs['data-answer'] for a in answers},
                             {'measure', 'wait', 'cause', 'cold', 'laundry', 'compare'})
            for answer in answers:
                shops = [a for a in answer.find('a') if a.attrs.get('data-choice-action') == 'shop']
                if answer.attrs['data-answer'] in {'laundry', 'compare'}:
                    self.assertEqual({a.attrs['href'] for a in shops}, expected)
                    self.assertEqual(len(shops), 2)
                    self.assertEqual(len(answer.find('details', 'data-choice-evidence')), 2)
                    for a in shops:
                        self.assertEqual(set(a.attrs['rel'].split()), {'sponsored', 'nofollow', 'noopener'})
                else:
                    self.assertEqual(shops, [], answer.attrs['data-answer'])
                self.assertIn('hidden', answer.attrs)

    def test_both_candidates_use_the_same_fields_and_distinguish_their_link_types(self):
        for en, doc in self.documents():
            result = next(a for a in doc.find(attr='data-answer') if a.attrs['data-answer'] == 'compare')
            cards = [e for e in result.find('div') if e.attrs.get('class') == 'choice-candidate']
            self.assertEqual(len(cards), 2)
            self.assertEqual([x.text() for x in cards[0].find('dt')], [x.text() for x in cards[1].find('dt')])
            self.assertIn('MDDF-20DEN7-WF', cards[0].text())
            self.assertIn('Arete Two', cards[1].text())
            self.assertIn('25L', cards[1].text())
            self.assertIn('fixed Amazon.de product page' if en else 'Feste Amazon.de-Produktseite', cards[0].text())
            self.assertIn('Amazon.de model search' if en else 'Amazon.de-Modellsuche', cards[1].text())
            for card in cards:
                check = card.find('details', 'data-choice-evidence')[0]
                self.assertEqual(len(check.find('li')), 3)
                self.assertTrue(all('amazon.' not in a.attrs['href'] for a in check.find('a')))
                self.assertTrue(check.find('a'), 'Each candidate needs its own evidence links')

    def test_static_method_keeps_comfee_condition_data_unknown_instead_of_substituting_rated_power(self):
        for en, doc in self.documents():
            method = doc.find('details', 'data-choice-method')[0]
            rows = method.find('tbody')[0].find('tr')
            self.assertEqual([r.find('th')[0].text() for r in rows], ['20 °C / 60 % RH', '10 °C / 60 % RH'])
            for row, numbers in zip(rows, [('8.5 L', '216 W'), ('3.4 L', '180 W')]):
                cells = row.find('td')
                self.assertIn('not verified' if en else 'nicht verifiziert', cells[0].text())
                self.assertNotRegex(cells[0].text(), r'\d')
                for number in numbers:
                    self.assertIn(number, cells[1].text())
            self.assertNotRegex(method.text(), r'(?:280|360|440)\s*W')
            self.assertIn('30 °C / 80 % RH' if not en else '30°C / 80% RH', method.text())
            self.assertIn('do not establish a ranking' if en else 'keine Rangfolge', method.text())

    def test_unique_static_method_is_complete_and_contains_neither_forms_nor_shopping(self):
        for en, doc in self.documents():
            methods = doc.find('details', 'data-choice-method')
            self.assertEqual(len(methods), 1)
            method = methods[0]
            self.assertEqual(method.find('form') + method.find('input') + method.find('select') + method.find('button'), [])
            urls = {a.attrs['href'] for a in method.find('a')}
            self.assertEqual(urls, {M.MEACO, M.COMFEE_PRODUCT, M.COMFEE_DATA, M.COMFEE, M.AIR})
            self.assertTrue(all('amazon.' not in u for u in urls))
            self.assertIn('6 November 2026' if en else '06.11.2026', method.text())
            self.assertIn('without WF' if en else 'ohne WF', method.text())
            self.assertIn('Arete Two', method.text())
            self.assertIn('One 25L', method.text())
            self.assertIn('not a whole-market comparison' if en else 'kein vollständiger Marktvergleich', method.text())
            self.assertIn('not our own measurements' if en else 'keine eigenen Messungen', method.text())

    def test_unenhanced_form_is_hidden_inert_and_disabled_while_help_is_readable(self):
        for en, doc in self.documents():
            forms = doc.find('form')
            self.assertEqual(len(forms), 1)
            self.assertIn('hidden', forms[0].attrs)
            self.assertIn('inert', forms[0].attrs)
            fields = forms[0].find('fieldset', 'data-choice-fields')
            self.assertEqual(len(fields), 1)
            self.assertIn('disabled', fields[0].attrs)
            self.assertEqual({s.attrs['name'] for s in fields[0].find('select')}, {'purpose', 'humidity', 'temperature', 'market'})
            fallback = doc.find(attr='data-choice-fallback')[0]
            self.assertNotIn('hidden', fallback.attrs)
            self.assertEqual(len(fallback.find('a')), 3)
            self.assertTrue(all(a.attrs['href'].startswith('/') for a in fallback.find('a')))
            self.assertEqual(fallback.find('form'), [])
            copy = doc.find('button', 'data-copy')[0]
            self.assertIn('hidden', copy.attrs)

    def test_existing_six_routes_are_idempotent_without_new_scope(self):
        expected = {False: {'luftentfeuchter-ratgeber', 'waesche-trocknen-wohnung', 'luftentfeuchter-20-qm', 'luftentfeuchter-keller'},
                    True: {'dehumidifier-20-sqm', 'dehumidifier-drying-clothes-cost'}}
        self.assertEqual(M.PATHS, expected)
        for en, slugs in expected.items():
            for slug in slugs:
                source = '<article><h1>Existing guide</h1><h2 id="advice">Keep this advice</h2><p>Authored source.</p></article>'
                once = M.inject(source, slug, en)
                self.assertEqual(M.inject(once, slug, en), once)
                self.assertEqual(once.count('data-choice-method'), 1)
                self.assertIn('<h2 id="advice">Keep this advice</h2><p>Authored source.</p>', once)
                doc = Document(once).root
                market = next(s for s in doc.find('select') if s.attrs['name'] == 'market')
                selected = [o.attrs['value'] for o in market.find('option') if 'selected' in o.attrs]
                self.assertEqual(selected, ['other' if en else 'de'])
        self.assertIsNone(M.inject('<article><h2>Other</h2></article>', 'unrelated-guide', False))


if __name__ == '__main__':
    unittest.main()
