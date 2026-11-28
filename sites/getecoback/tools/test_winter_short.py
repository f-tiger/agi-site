"""Cold-start input, script contract and rejection cases, independent of the run date."""
import copy
from datetime import date
import json
import unittest
from unittest.mock import patch

import winter_short as short
from winter_picks import shortlist


class WinterShort(unittest.TestCase):
    def facts(self, category):
        with patch.object(short, 'shortlist', lambda data: shortlist(data, date(2026, 11, 28))):
            return short.packet(category)

    def test_writer_receives_only_the_two_complete_official_rows(self):
        for category in short.ROUTES:
            facts = self.facts(category)
            self.assertEqual(len(facts['modelle']), 2)
            self.assertNotIn('amazon.de', json.dumps(facts))
            for row in facts['modelle']:
                self.assertEqual(len(row['values']), len(facts['vergleich']))
                self.assertIn('https://', row['source'])
        data = short.dehum_catalog.load()
        for invalid in [date(2026, 11, 1), date(2027, 4, 1)]:
            self.assertTrue(all(p['url'] is None for p in shortlist(data, invalid)))
        data['products'][1]['status'] = 'unverified'
        self.assertIsNone(shortlist(data, date(2026, 11, 28))[1]['url'])
        data['products'][1]['winter_pick']['values'].pop()
        with self.assertRaisesRegex(ValueError, 'Incomplete winter'):
            shortlist(data)

    def test_valid_draft_and_rejected_edits(self):
        facts = self.facts('dehum')
        doc = {
            'title_de': 'Entfeuchter für den kalten Keller wählen',
            'hook_overlay_text': 'Wie kalt ist dein Keller?',
            'spoken_script_de': ('Kaufst du nach der Literzahl auf dem Karton? Bei zehn Grad und sechzig Prozent Luftfeuchte '
                                'zieht die Arete One mit zwanzig Litern mehr Wasser aus der Luft als die Arete Two mit zwölf Litern. '
                                'Für deinen kalten Keller nimm die One, wenn dir der Wasserentzug wichtig ist. Trocknest du Wäsche '
                                'bei zwanzig Grad und willst die niedrigere Leistungsaufnahme, schau dir die Two an. '
                                'Den kostenlosen Direktvergleich findest du auf getecoback.com.'),
            'scenes': [{'time': t, 'visual_cue': cue, 'subtitle_de': sub} for t, cue, sub in zip(short.TIMES,
                       ['Thermometer ablesen', 'Beide Messzeilen markieren', 'Die Empfehlung auswählen', 'Den Vergleich öffnen'],
                       ['Was zeigt das Thermometer?', 'Gleiche Feuchte, zwei Modelle', 'Keller oder Wäscheraum?', 'Kostenlos vergleichen'])],
            'caption_de': 'EcoBack erklärt die Herstellerangaben. Affiliate-Links auf der Website. ' + facts['ziel'] +
                          ' #Keller #Luftfeuchte #Entfeuchter #Wäsche',
        }
        short.validate(doc, facts)
        for field, value in [('spoken_script_de', 'Zu kurz.'), ('title_de', 'x' * 56),
                             ('caption_de', doc['caption_de'].replace('Affiliate-Links', 'Links')),
                             ('caption_de', doc['caption_de'].replace(facts['ziel'], facts['ziel'] + '-falsch')),
                             ('spoken_script_de', doc['spoken_script_de'].replace('Bei zehn', 'Herstellerangaben. Bei zehn')),
                             ('scenes', doc['scenes'][:-1]), ('hook_overlay_text', 'a b c d e f g')]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                short.validate({**doc, field: value}, facts)
        for key, value in [('time', '00:04-00:18'), ('subtitle_de', 'a b c d e f g h')]:
            invalid = copy.deepcopy(doc)
            invalid['scenes'][1][key] = value
            with self.assertRaises(ValueError):
                short.validate(invalid, facts)


if __name__ == '__main__':
    unittest.main()
